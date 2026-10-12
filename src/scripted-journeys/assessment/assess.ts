import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  getCompletedEvidenceRunPath,
  readCompletedEvidenceRun,
  storeCompletedEvidenceRun,
  MAXIMUM_EVIDENCE_BUNDLE_BYTES,
  type IEvidenceArtifactInput,
} from '../../evidence/index.ts';
import { extractArchive } from '../bundle/index.ts';
import {
  assertRetainedTrials,
  deriveCampaignStatus,
  resolveJourneyTrials,
} from '../confirmation/index.ts';
import { createAssessorFingerprint, createFixtureFingerprint } from '../identity/index.ts';
import {
  assertCheckpointIdentity,
  runCommand,
  sha256,
  verifyBundle,
  verifyExport,
} from '../harness/index.ts';
import { createJourneyDefinitionDigest, loadScriptedJourneys } from '../journeys/index.ts';
import {
  createJourneysEvidenceBundle,
  parseJourneysEvidenceRecord,
} from '../public-evidence/index.ts';
import {
  JourneyAssessmentSchema,
  JourneyCampaignSchema,
  JourneyOperatorRecordSchema,
  MAXIMUM_ARCHIVE_BYTES,
  type IJourneyAssessment,
  type IJourneyDefinition,
  type IJourneyOperatorRecord,
  type IJourneyTrial,
  type IJourneyPlatform,
} from '../index.ts';

import { prepareAssessmentClosure } from './closure.ts';
import { reconstructJourneyTrial } from './trial.ts';

/** Reconstructs selected final exports and admits only observation-complete immutable trials.
 * @throws When exchange integrity, identities, observations, sequencing, or resource limits are invalid.
 */
export const assessJourneys = async (input: {
  repositoryRoot: string;
  bundlePath: string;
  sha256: string;
  exportPaths: string[];
  installedClosure?: string;
  definitions?: IJourneyDefinition[];
  persist?: boolean;
  operatorRecord?: IJourneyOperatorRecord;
}): Promise<IJourneyAssessment> => {
  const diagnostic = input.persist === false;
  const observations = JourneyOperatorRecordSchema.parse(input.operatorRecord ?? {});
  if (!diagnostic && (observations.chatgpt || observations.claude))
    throw new Error(
      'Persistent admission requires digest-keyed trials; legacy model flags require --diagnostic.',
    );
  if (
    (await stat(input.bundlePath)).size > MAXIMUM_ARCHIVE_BYTES ||
    sha256(await readFile(input.bundlePath)) !== input.sha256
  )
    throw new Error('Bundle zip SHA-256 mismatch or size limit exceeded.');
  if (!input.exportPaths.length) throw new Error('Assessment requires at least one final export.');
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-assess-'));
  try {
    const root = await extractArchive(input.bundlePath, path.join(scratch, 'bundle'), true);
    const bundle = await verifyBundle(root);
    const sourceSha256 = await createAssessorFingerprint(input.repositoryRoot);
    if (bundle.assessorSourceSha256 !== sourceSha256)
      throw new Error('Assessor source identity changed; use a new campaign bundle.');
    const definitions =
      input.definitions ??
      (await loadScriptedJourneys(
        path.join(input.repositoryRoot, 'src/scripted-journeys/journeys'),
      ));
    if (bundle.journeys.length !== definitions.length)
      throw new Error('Journey definition inventory mismatch.');
    for (const [index, definition] of definitions.entries()) {
      const identity = bundle.journeys[index];
      if (
        identity?.id !== definition.id ||
        identity.definitionDigest !== createJourneyDefinitionDigest(definition) ||
        identity.stepCount !== definition.steps.length ||
        identity.fixtureSha256 !== createFixtureFingerprint(bundle.files, definition.id)
      )
        throw new Error(`Journey definition digest or fixture identity mismatch: ${definition.id}`);
    }
    if (input.exportPaths.length > bundle.journeys.length * 8)
      throw new Error('Assessment exceeds the 8N export bound.');
    const digests: string[] = [];
    for (const file of input.exportPaths) {
      if ((await stat(file)).size > MAXIMUM_ARCHIVE_BYTES)
        throw new Error('Export archive exceeds limit.');
      digests.push(sha256(await readFile(file)));
    }
    if (new Set(digests).size !== digests.length)
      throw new Error('Duplicate export archive bytes.');
    const missingObservations = digests.filter((digest) => !observations.trials?.[digest]);
    if (!diagnostic && missingObservations.length)
      throw new Error(
        `No record changed. Missing trial observations for ${missingObservations.join(', ')}. Complete --operator-record with configuration, observedAt (or null), and freshChat: true; or use --diagnostic.`,
      );
    const closure = await prepareAssessmentClosure({
      directory: path.join(scratch, 'closure'),
      skillDirectory: path.join(root, 'skill/moldea'),
      cache: path.join(root, 'npm-cache'),
      cliVersion: bundle.skill.cliRepairVersion,
      ...(input.installedClosure ? { installedClosure: input.installedClosure } : {}),
    });
    const byPlatform = new Map<IJourneyPlatform, IJourneyTrial[]>();
    const artifacts: IEvidenceArtifactInput[] = [];
    const budget = { count: 0, bytes: 0 };
    const trialIds = new Set<string>();
    const slots = new Set<string>();
    let metadataBytes = 0;
    for (const [index, exportPath] of input.exportPaths.entries()) {
      const trialScratch = path.join(scratch, `trial-${index}`);
      try {
        const exportDirectory = await extractArchive(exportPath, path.join(trialScratch, 'export'));
        const exported = await verifyExport(exportDirectory);
        assertCheckpointIdentity(bundle, exported, definitions);
        if (!exported.complete)
          throw new Error('Admission requires a complete final selected export.');
        if (trialIds.has(exported.trialId)) throw new Error('Duplicate trial ID.');
        trialIds.add(exported.trialId);
        for (const id of exported.selectedJourneys) {
          const slot = `${exported.platform}/${id}/${exported.confirmationIndex ?? 'initial'}`;
          if (slots.has(slot)) throw new Error('Overlapping trial slot.');
          slots.add(slot);
        }
        if (diagnostic && exported.kind !== 'initial')
          throw new Error('Diagnostic mode accepts initial exports only.');
        metadataBytes += Buffer.byteLength(JSON.stringify(exported));
        if (metadataBytes > MAXIMUM_EVIDENCE_BUNDLE_BYTES)
          throw new Error('Aggregate export metadata exceeds limit.');
        const trial = await reconstructJourneyTrial({
          root,
          scratch: trialScratch,
          exportDirectory,
          bundle,
          exported,
          definitions,
          closure,
          archiveSha256: digests[index]!,
          observation: diagnostic ? null : observations.trials![digests[index]!]!,
          diagnosticConfiguration: diagnostic
            ? (observations.trials?.[digests[index]!]?.configuration ??
              observations[exported.platform] ?? { model: null, settings: {}, interventions: [] })
            : null,
          artifacts,
          budget,
        });
        const trials = byPlatform.get(exported.platform) ?? [];
        trials.push(trial);
        byPlatform.set(exported.platform, trials);
      } finally {
        await rm(trialScratch, { recursive: true, force: true });
      }
    }
    const platforms = [...byPlatform].map(([platform, trials]) => ({ platform, trials }));
    const base = {
      assessmentFormatVersion: 2,
      runId: bundle.runId,
      evaluatedAt: new Date().toISOString(),
      assessor: {
        commit: (
          await runCommand('git', ['rev-parse', 'HEAD'], input.repositoryRoot)
        ).stdout.trim(),
        sourceSha256,
      },
      bundleSha256: input.sha256,
      bundle,
      definitions,
    };
    if (diagnostic)
      return JourneyAssessmentSchema.parse({
        ...base,
        mode: 'diagnostic',
        status: 'incomplete',
        platforms,
        missingObservations,
      });
    const admitted = platforms.map((platform) => ({
      ...platform,
      resolutions: resolveJourneyTrials(platform.trials),
    }));
    const assessment = JourneyCampaignSchema.parse({
      ...base,
      mode: 'campaign',
      status: deriveCampaignStatus(admitted.flatMap((platform) => platform.resolutions)),
      platforms: admitted,
    });
    const recordPath = getCompletedEvidenceRunPath(input.repositoryRoot, 'journeys', bundle.runId);
    let previousExists = false;
    try {
      await stat(recordPath);
      previousExists = true;
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    if (previousExists) {
      const previous = await readCompletedEvidenceRun(
        input.repositoryRoot,
        'journeys',
        bundle.runId,
      );
      const { model } = parseJourneysEvidenceRecord(previous);
      const source = model.sources.find((source) => source.id === model.currentSourceId);
      if (source?.kind !== 'campaign' || model.sources.length !== 1)
        throw new Error('Existing record is not an admitted campaign.');
      assertRetainedTrials(source.assessment, assessment);
    }
    await storeCompletedEvidenceRun(
      input.repositoryRoot,
      createJourneysEvidenceBundle({
        assessment,
        definitions,
        skill: bundle.skill,
        instructions: bundle.instructions,
        artifacts,
      }),
    );
    return assessment;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
};
