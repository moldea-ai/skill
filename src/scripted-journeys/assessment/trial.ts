import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  MAXIMUM_EVIDENCE_ARTIFACT_COUNT,
  MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES,
  type IEvidenceArtifactInput,
} from '../../evidence/index.ts';
import {
  assertHashes,
  copyTree,
  isolatedEnvironment,
  readJson,
  runCommand,
} from '../harness/index.ts';
import {
  JourneyActivitySchema,
  MAXIMUM_REPLY_BYTES,
  type IJourneyDefinition,
  type IJourneysBundle,
  type IJourneysExport,
  type IJourneyTrial,
  type IJourneyObservation,
} from '../index.ts';

import { evaluateJourneyCheck } from './checks.ts';
import { deriveJourneyOutcome, deriveStepOutcome } from './outcomes.ts';
import { applyRecordedPatch, changedPaths, snapshotTree } from './reconstruction.ts';

/** Reconstructs a selected trial from trusted fixtures without executing exported dependencies.
 * @throws When reconstruction, captured evidence, or an aggregate resource bound is invalid.
 */
export const reconstructJourneyTrial = async (input: {
  root: string;
  scratch: string;
  exportDirectory: string;
  bundle: IJourneysBundle;
  exported: IJourneysExport;
  definitions: IJourneyDefinition[];
  closure: string;
  archiveSha256: string;
  observation: IJourneyObservation | null;
  diagnosticConfiguration: IJourneyTrial['diagnosticConfiguration'];
  artifacts: IEvidenceArtifactInput[];
  budget: { count: number; bytes: number };
}): Promise<IJourneyTrial> => {
  const {
    root,
    scratch,
    exportDirectory,
    bundle,
    exported,
    definitions,
    closure,
    artifacts,
    budget,
  } = input;
  const trial: IJourneyTrial = {
    trialId: exported.trialId,
    archiveSha256: input.archiveSha256,
    kind: exported.kind,
    selectedJourneys: exported.selectedJourneys,
    confirmationIndex: exported.confirmationIndex,
    observation: input.observation,
    diagnosticConfiguration: input.diagnosticConfiguration,
    environment: exported.environment,
    restartCounts: exported.restartCounts,
    journeys: [],
  };
  for (const definition of definitions.filter((definition) =>
    exported.selectedJourneys.includes(definition.id),
  )) {
    const repository = path.join(scratch, exported.platform, definition.id);
    await copyTree(path.join(root, 'journeys', definition.id, 'fixture'), repository);
    await copyTree(path.join(root, 'skill/moldea'), path.join(repository, '.agents/skills/moldea'));
    const environment = await isolatedEnvironment(
      path.join(scratch, 'validation-home'),
      path.join(root, 'npm-cache'),
    );
    await runCommand('git', ['init', '--initial-branch=main'], repository, environment);
    await runCommand(
      'git',
      [
        'add',
        '--force',
        '--',
        '.agents/skills/moldea/SKILL.md',
        '.agents/skills/moldea/scripts/relevance-gate.mjs',
        '.agents/skills/moldea/assets/managed-agents-block.md',
      ],
      repository,
      environment,
    );
    const fixture = await snapshotTree(repository);
    let previous = fixture;
    const steps: IJourneyTrial['journeys'][number]['steps'] = [];
    for (const step of definition.steps) {
      const recorded = exported.steps.find(
        (record) => record.journeyId === definition.id && record.stepId === step.id,
      );
      if (!recorded) throw new Error('Missing selected step capture.');
      const directory = path.join(exportDirectory, 'steps', definition.id, step.id);
      const replyBytes = await readFile(path.join(directory, 'reply.md'));
      if (replyBytes.length > MAXIMUM_REPLY_BYTES) throw new Error('Export reply exceeds limit.');
      const reply = replyBytes.toString('utf8');
      const activity = JourneyActivitySchema.parse(
        await readJson(path.join(directory, 'activity.json')),
      );
      const patch = await readFile(path.join(directory, 'changes.patch'), 'utf8');
      const current = await applyRecordedPatch(repository, patch, environment);
      const dependencies = step.dependsOn.map(
        (id) => steps.find((candidate) => candidate.id === id)?.status ?? 'blocked',
      );
      const checks: IJourneyTrial['journeys'][number]['steps'][number]['checks'] = [];
      if (dependencies.every((status) => status === 'passed'))
        for (const [criterion, check] of step.checks.entries())
          checks.push({
            ...(await evaluateJourneyCheck(check, {
              repository,
              files: current,
              stepChanges: changedPaths(previous, current),
              fixtureChanges: changedPaths(fixture, current),
              reply,
              cliVersion: bundle.skill.cliRepairVersion,
              closure,
              environment,
            })),
            criterion,
          });
      if (!reply.trim())
        checks.push({
          check: { kind: 'reply-matches' as const, pattern: '\\S', skillBehavior: false },
          criterion: 'nonempty-reply',
          status: 'failed' as const,
          detail: 'Empty agent-reported reply.',
        });
      steps.push({
        id: step.id,
        status: deriveStepOutcome(checks, dependencies),
        checks,
        unverified: step.unverified,
        facts: recorded.facts,
        reply,
        activity,
      });
      previous = current;
      for (const [name, mediaType] of [
        ['changes.patch', 'application/patch+text'],
        ['reply.md', 'text/plain'],
        ['activity.json', 'application/json'],
        ['changes.json', 'application/json'],
      ] as const) {
        const artifactPath = path.join(directory, name);
        const size = (await stat(artifactPath)).size;
        if (
          ++budget.count > MAXIMUM_EVIDENCE_ARTIFACT_COUNT ||
          (budget.bytes += size) > MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES
        )
          throw new Error('Aggregate journey artifacts exceed evidence limits.');
        artifacts.push({
          path: `${exported.platform}/${definition.id}/${exported.confirmationIndex === null ? 'initial' : `c${exported.confirmationIndex}`}/${step.id}/${name}`,
          mediaType,
          content: await readFile(artifactPath),
        });
      }
    }
    if (exported.completedJourneys.includes(definition.id))
      assertHashes(
        await snapshotTree(path.join(exportDirectory, 'journeys', definition.id, 'final')),
        previous,
        'Reconstructed final tree',
      );
    trial.journeys.push({
      id: definition.id,
      status: deriveJourneyOutcome(steps.map((step) => step.status)),
      steps,
    });
  }

  return trial;
};
