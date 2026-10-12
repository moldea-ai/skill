import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  createEvidenceBundle,
  storeCompletedEvidenceRun,
  type IEvidenceArtifactInput,
} from '../../evidence/index.ts';
import { extractArchive } from '../bundle/index.ts';
import { MAXIMUM_REPLY_BYTES } from '../index.ts';
import {
  assertHashes,
  assertCheckpointIdentity,
  copyTree,
  isolatedEnvironment,
  readJson,
  runCommand,
  sha256,
  treeHashes,
  verifyBundle,
  verifyExport,
} from '../harness/index.ts';
import { createJourneyDefinitionDigest, loadScriptedJourneys } from '../journeys/index.ts';
import {
  JourneyActivitySchema,
  JourneyAssessmentSchema,
  type IJourneyAssessment,
  type IJourneyDefinition,
  type IJourneyOperatorRecord,
} from '../index.ts';

import { evaluateJourneyCheck } from './checks.ts';
import { prepareAssessmentClosure } from './closure.ts';
import { deriveJourneyOutcome, deriveRunOutcome, deriveStepOutcome } from './outcomes.ts';
import { applyRecordedPatch, changedPaths, snapshotTree } from './reconstruction.ts';

/** Reconstructs and assesses a bounded export without executing any exported dependency closure. */
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
  if (sha256(await readFile(input.bundlePath)) !== input.sha256)
    throw new Error('Bundle zip SHA-256 mismatch.');
  if (!input.exportPaths.length || input.exportPaths.length > 2)
    throw new Error('Assessment requires one or two platform exports.');
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-assess-'));
  try {
    const root = await extractArchive(input.bundlePath, path.join(scratch, 'bundle'), true);
    const bundle = await verifyBundle(root);
    const definitions =
      input.definitions ??
      (await loadScriptedJourneys(
        path.join(input.repositoryRoot, 'src/scripted-journeys/journeys'),
      ));
    if (bundle.journeys.length !== definitions.length)
      throw new Error('Journey definition inventory mismatch.');
    for (const [index, definition] of definitions.entries())
      if (
        bundle.journeys[index]?.id !== definition.id ||
        bundle.journeys[index]?.definitionDigest !== createJourneyDefinitionDigest(definition) ||
        bundle.journeys[index]?.stepCount !== definition.steps.length
      )
        throw new Error(`Journey definition digest mismatch: ${definition.id}`);
    const closure = await prepareAssessmentClosure({
      directory: path.join(scratch, 'closure'),
      skillDirectory: path.join(root, 'skill/moldea'),
      cache: path.join(root, 'npm-cache'),
      cliVersion: bundle.skill.cliRepairVersion,
      ...(input.installedClosure ? { installedClosure: input.installedClosure } : {}),
    });
    const platforms: IJourneyAssessment['platforms'] = [];
    const artifacts: IEvidenceArtifactInput[] = [];
    for (const [platformIndex, exportPath] of input.exportPaths.entries()) {
      const exportDirectory = await extractArchive(
        exportPath,
        path.join(scratch, `export-${platformIndex}`),
      );
      const exported = await verifyExport(exportDirectory);
      assertCheckpointIdentity(bundle, exported, definitions);
      if (platforms.some((platform) => platform.platform === exported.platform))
        throw new Error(`Duplicate platform export: ${exported.platform}`);
      const platform: IJourneyAssessment['platforms'][number] = {
        platform: exported.platform,
        configuration: input.operatorRecord?.[exported.platform] ?? {
          model: null,
          settings: {},
          interventions: [],
        },
        environment: exported.environment,
        restartCounts: exported.restartCounts,
        journeys: [],
      };
      for (const definition of definitions) {
        const repository = path.join(scratch, exported.platform, definition.id);
        await copyTree(path.join(root, 'journeys', definition.id, 'fixture'), repository);
        await copyTree(
          path.join(root, 'skill/moldea'),
          path.join(repository, '.agents/skills/moldea'),
        );
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
        const steps: IJourneyAssessment['platforms'][number]['journeys'][number]['steps'] = [];
        for (const step of definition.steps) {
          const recorded = exported.steps.find(
            (record) => record.journeyId === definition.id && record.stepId === step.id,
          );
          if (!recorded) {
            steps.push({
              id: step.id,
              status: 'blocked',
              checks: [],
              unverified: step.unverified,
              facts: null,
              reply: '',
              activity: null,
            });
            continue;
          }
          const directory = path.join(exportDirectory, 'steps', definition.id, step.id);
          const replyBytes = await readFile(path.join(directory, 'reply.md'));
          if (replyBytes.length > MAXIMUM_REPLY_BYTES)
            throw new Error('Export reply exceeds limit.');
          const reply = replyBytes.toString('utf8');
          const activity = JourneyActivitySchema.parse(
            await readJson(path.join(directory, 'activity.json')),
          );
          const patch = await readFile(path.join(directory, 'changes.patch'), 'utf8');
          const current = await applyRecordedPatch(repository, patch, environment);
          const dependencies = step.dependsOn.map(
            (id) => steps.find((candidate) => candidate.id === id)?.status ?? 'blocked',
          );
          const checks = [];
          if (dependencies.every((status) => status === 'passed'))
            for (const check of step.checks)
              checks.push(
                await evaluateJourneyCheck(check, {
                  repository,
                  files: current,
                  stepChanges: changedPaths(previous, current),
                  fixtureChanges: changedPaths(fixture, current),
                  reply,
                  cliVersion: bundle.skill.cliRepairVersion,
                  closure,
                  environment,
                }),
              );
          if (!reply.trim())
            checks.push({
              check: { kind: 'reply-matches' as const, pattern: '\\S', skillBehavior: false },
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
          ] as const)
            artifacts.push({
              path: `${exported.platform}/${definition.id}/${step.id}/${name}`,
              mediaType,
              content: await readFile(path.join(directory, name)),
            });
        }
        if (exported.completedJourneys.includes(definition.id))
          assertHashes(
            await snapshotTree(path.join(exportDirectory, 'journeys', definition.id, 'final')),
            previous,
            'Reconstructed final tree',
          );
        platform.journeys.push({
          id: definition.id,
          status: deriveJourneyOutcome(steps.map((step) => step.status)),
          steps,
        });
      }
      platforms.push(platform);
    }
    const assessorSources = await treeHashes(
      path.join(input.repositoryRoot, 'src/scripted-journeys'),
    );
    const assessment = JourneyAssessmentSchema.parse({
      runId: bundle.runId,
      status: deriveRunOutcome(platforms),
      evaluatedAt: new Date().toISOString(),
      assessor: {
        commit: (
          await runCommand('git', ['rev-parse', 'HEAD'], input.repositoryRoot)
        ).stdout.trim(),
        sourceSha256: sha256(JSON.stringify(assessorSources)),
      },
      bundleSha256: input.sha256,
      platforms,
    });
    if (input.persist !== false)
      await storeCompletedEvidenceRun(
        input.repositoryRoot,
        createEvidenceBundle({
          classification: 'official',
          kind: 'journeys',
          run: {
            attemptId: bundle.runId,
            evaluatedAt: assessment.evaluatedAt,
            status: assessment.status,
            version: bundle.skill.version,
            provenance: {
              skillCommit: bundle.skill.commit,
              bundleSha256: input.sha256,
              assessorCommit: assessment.assessor.commit,
              assessorSourceSha256: assessment.assessor.sourceSha256,
            },
          },
          payload: {
            assessment,
            definitions,
            skill: bundle.skill,
            instructions: bundle.instructions,
          },
          artifacts,
        }),
      );
    return assessment;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
};
