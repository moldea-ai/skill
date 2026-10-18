// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { writeJsonFileAtomically } from '../../filesystem/index.ts';
import { parseSemanticEvaluationHostOutput, summarizeSemanticCycles } from '../execution/index.ts';
import {
  archiveSemanticDiagnosticCheckpoint,
  getSemanticCheckpointPath,
  readSemanticCheckpoint,
  writeSemanticCheckpoint,
} from './checkpoint.ts';
import type { ISemanticCandidateCheckpoint } from './types.ts';

const temporaryRoots: string[] = [];
const SHA256 = 'a'.repeat(64);

const createCheckpoint = (): ISemanticCandidateCheckpoint => ({
  actorHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'actor',
    version: '1.0.0',
  },
  artifactDigest: SHA256,
  attemptId: 'semantic-attempt',
  caseCheckpoints: {},
  cases: [],
  caseSuiteDigest: SHA256,
  cli: {
    integrity: 'sha512-synthetic',
    jsonSchemaVersion: 4,
    name: '@moldea.ai/cli',
    packageLockSha256: SHA256,
    version: '7.0.0',
  },
  coverageDigest: SHA256,
  createdAt: '2026-09-19T12:00:00.000Z',
  judgeHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'judge',
    version: '1.0.0',
  },
  mode: 'official',
  schemaVersion: 3,
  selectedCaseIds: ['case-one', 'case-two'],
  updatedAt: '2026-09-19T12:00:00.000Z',
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('semantic checkpoint storage', () => {
  test('round trips a session above one invocation allowance and rejects mismatched or missing cycles', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-cycle-checkpoint-'));
    temporaryRoots.push(root);
    const checkpoint = createCheckpoint();
    const evidence = parseSemanticEvaluationHostOutput(
      [
        { type: 'moldea.cli-invocations', invocations: [] },
        { type: 'item.completed', item: { type: 'agent_message', text: ' Complete.\n' } },
        {
          type: 'turn.completed',
          usage: { input_tokens: 1_000_000, cached_input_tokens: 800_000, output_tokens: 100 },
        },
        {
          type: 'moldea.git-invocations',
          evidence: {
            invocationCount: 0,
            hostInvocationCount: 0,
            repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
          },
        },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n'),
      { cliVersion: checkpoint.cli.version, jsonSchemaVersion: checkpoint.cli.jsonSchemaVersion },
    );
    const cycles = [0, 1, 2].map((requestIndex) => ({
      ...structuredClone(evidence),
      developerRequest: requestIndex === 1 ? 'continue' : ` Request ${requestIndex + 1}\n`,
      requestIndex,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    }));
    checkpoint.caseCheckpoints['case-one'] = {
      caseId: 'case-one',
      caseDefinitionDigest: SHA256,
      completedCase: null,
      trials: [],
      activeTrial: {
        actorCycles: cycles,
        paidInvocations: cycles.map((cycle) => ({ stage: 'actor', usage: cycle.usage, cycle })),
        actorEvidence: {
          ...summarizeSemanticCycles(cycles),
          cycles,
          actorStageIdentitySha256: SHA256,
          isMountIntegrityPassing: true,
          isRepositoryControlPassing: true,
          workspaceChanges: { created: [], deleted: [], modified: [] },
        },
        confirmationIndex: null,
        operationalRetries: { actorFailureCount: 0, judgeFailureCount: 0, lastFailure: null },
        phase: 'judge-pending',
        recordedTrial: null,
        startedAt: checkpoint.createdAt,
        updatedAt: checkpoint.updatedAt,
      },
    };
    await writeSemanticCheckpoint(root, checkpoint);
    expect(await readSemanticCheckpoint(root)).toStrictEqual(checkpoint);
    const malformed = structuredClone(checkpoint);
    malformed.caseCheckpoints[
      'case-one'
    ]!.activeTrial!.actorEvidence!.commandPolicyEvidence.completedCommandCount = 1;
    await writeJsonFileAtomically(getSemanticCheckpointPath(root), malformed);
    await expect(readSemanticCheckpoint(root)).rejects.toThrow('invalid actor execution evidence');
    const mismatched = structuredClone(checkpoint);
    mismatched.caseCheckpoints['case-one']!.activeTrial!.actorCycles = cycles.map((cycle) => ({
      ...cycle,
      developerRequest: 'Different request',
    }));
    await writeJsonFileAtomically(getSemanticCheckpointPath(root), mismatched);
    await expect(readSemanticCheckpoint(root)).rejects.toThrow(
      'active cycle evidence does not match',
    );
    const missing = structuredClone(checkpoint);
    missing.caseCheckpoints['case-one']!.activeTrial!.actorEvidence!.cycles = [];
    await writeJsonFileAtomically(getSemanticCheckpointPath(root), missing);
    await expect(readSemanticCheckpoint(root)).rejects.toThrow();
    const reordered = structuredClone(checkpoint);
    reordered.caseCheckpoints['case-one']!.activeTrial!.actorEvidence!.cycles.reverse();
    await writeJsonFileAtomically(getSemanticCheckpointPath(root), reordered);
    await expect(readSemanticCheckpoint(root)).rejects.toThrow('invalid actor execution evidence');
    await writeJsonFileAtomically(getSemanticCheckpointPath(root), {
      ...checkpoint,
      schemaVersion: 2,
    });
    await expect(readSemanticCheckpoint(root)).rejects.toThrow();
  });

  test.each(['../escape', '/absolute', 'sem-test/child', 'sem-test\\child', 'sem-test.', 'con'])(
    'rejects unsafe diagnostic archive identity %s without removing active state',
    async (attemptId) => {
      const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
      temporaryRoots.push(root);
      const checkpoint = { ...createCheckpoint(), attemptId, mode: 'diagnostic' as const };
      await writeSemanticCheckpoint(root, checkpoint);

      await expect(archiveSemanticDiagnosticCheckpoint(root, checkpoint)).rejects.toThrow(
        'safe archive component',
      );
      await expect(readSemanticCheckpoint(root)).resolves.toStrictEqual(checkpoint);
    },
  );

  test('refuses to archive incomplete diagnostic selections', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
    temporaryRoots.push(root);
    const checkpoint = {
      ...createCheckpoint(),
      attemptId: 'sem-incomplete',
      mode: 'diagnostic' as const,
    };
    await writeSemanticCheckpoint(root, checkpoint);
    await expect(archiveSemanticDiagnosticCheckpoint(root, checkpoint)).rejects.toThrow(
      'complete terminal selection',
    );
    await expect(readSemanticCheckpoint(root)).resolves.toStrictEqual(checkpoint);
  });

  test('round trips exact run identity for interrupted-run recovery', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
    temporaryRoots.push(root);
    const checkpoint = createCheckpoint();

    await writeSemanticCheckpoint(root, checkpoint);

    await expect(readSemanticCheckpoint(root)).resolves.toStrictEqual(checkpoint);
  });

  test('rejects duplicate selected ids before resuming', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
    temporaryRoots.push(root);
    await writeJsonFileAtomically(getSemanticCheckpointPath(root), {
      ...createCheckpoint(),
      selectedCaseIds: ['case-one', 'case-one'],
    });

    await expect(readSemanticCheckpoint(root)).rejects.toThrow(/unique/u);
  });

  test('retains a terminally stopped actor boundary for explicit recovery', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
    temporaryRoots.push(root);
    const checkpoint = createCheckpoint();
    checkpoint.caseCheckpoints['case-one'] = {
      activeTrial: {
        actorEvidence: null,
        actorCycles: [],
        paidInvocations: [],
        confirmationIndex: null,
        operationalRetries: {
          actorFailureCount: 2,
          judgeFailureCount: 0,
          lastFailure: {
            category: 'timed-out',
            failedAt: '2026-09-19T12:01:00.000Z',
            isExhausted: true,
            stage: 'actor',
          },
        },
        phase: 'actor-pending',
        recordedTrial: null,
        startedAt: '2026-09-19T12:00:30.000Z',
        updatedAt: '2026-09-19T12:01:00.000Z',
      },
      caseDefinitionDigest: SHA256,
      caseId: 'case-one',
      completedCase: null,
      trials: [],
    };

    await writeSemanticCheckpoint(root, checkpoint);

    await expect(readSemanticCheckpoint(root)).resolves.toStrictEqual(checkpoint);
  });
});

test('round trips projected Git and print evidence and rejects malformed command metadata', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
  temporaryRoots.push(root);
  const checkpoint = createCheckpoint();
  const output = [
    JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'git status --short',
        aggregated_output: '',
        exit_code: 128,
        status: 'failed',
      },
    }),
    JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command:
          'node /mnt/.agents/skills/moldea/scripts/managed-agents.mjs --repository /mnt --print',
        aggregated_output: '<!-- moldea:start -->\n\nUse this skill.\n<!-- moldea:end -->\n',
        exit_code: 0,
        status: 'completed',
      },
    }),
    JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command:
          '/custom/node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt -- inspect --json --max-output-bytes 65536',
        aggregated_output: '',
        exit_code: 1,
        status: 'failed',
      },
    }),
    JSON.stringify({
      type: 'item.completed',
      item: { type: 'agent_message', text: 'Git evidence unavailable.' },
    }),
  ].join('\n');
  const evidence = parseSemanticEvaluationHostOutput(
    output +
      '\n' +
      JSON.stringify({ type: 'moldea.cli-invocations', invocations: [] }) +
      '\n' +
      JSON.stringify({
        type: 'moldea.git-invocations',
        evidence: {
          invocationCount: 0,
          hostInvocationCount: 0,
          repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
        },
      }),
    {
      cliVersion: checkpoint.cli.version,
      jsonSchemaVersion: checkpoint.cli.jsonSchemaVersion,
    },
  );
  const cycles = [
    {
      ...evidence,
      developerRequest: 'Review the fixture.',
      requestIndex: 0,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    },
  ];
  checkpoint.caseCheckpoints['case-one'] = {
    activeTrial: {
      actorCycles: cycles,
      paidInvocations: [{ stage: 'actor', usage: evidence.usage }],
      actorEvidence: {
        cycles,
        ...evidence,
        actorStageIdentitySha256: SHA256,
        isMountIntegrityPassing: true,
        isRepositoryControlPassing: true,
        workspaceChanges: { created: [], deleted: [], modified: [] },
      },
      confirmationIndex: null,
      operationalRetries: { actorFailureCount: 0, judgeFailureCount: 0, lastFailure: null },
      phase: 'judge-pending',
      recordedTrial: null,
      startedAt: checkpoint.createdAt,
      updatedAt: checkpoint.updatedAt,
    },
    caseDefinitionDigest: SHA256,
    caseId: 'case-one',
    completedCase: null,
    trials: [],
  };
  await writeSemanticCheckpoint(root, checkpoint);
  expect(await readSemanticCheckpoint(root)).toStrictEqual(checkpoint);
  expect(evidence.commandPolicyEvidence.moldeaLauncherMissReasons).toStrictEqual([
    { code: 'unrecognized-node-path', count: 1 },
  ]);
  const [entry, printed] = evidence.actorExecutionEvidence;
  const printFact = printed?.item.outputEvidence.facts[0];
  expect(printFact?.kind).toBe('managed-agents-print-result');
  expect(
    printFact?.kind === 'managed-agents-print-result' ? printFact.blockSha256 : undefined,
  ).toMatch(/^[a-f0-9]{64}$/u);
  expect(entry?.item.repairGit).toStrictEqual({
    compliantCount: 0,
    noncompliantCount: 1,
    unverifiedCount: 0,
    reasons: [{ code: 'git-status-arguments', count: 1 }],
  });
  if (entry === undefined) throw new Error('Expected captured command.');
  const item: Record<string, unknown> = { ...entry.item };
  delete item['repairGit'];
  await writeJsonFileAtomically(getSemanticCheckpointPath(root), {
    ...checkpoint,
    caseCheckpoints: {
      'case-one': {
        ...checkpoint.caseCheckpoints['case-one'],
        activeTrial: {
          ...checkpoint.caseCheckpoints['case-one'].activeTrial,
          actorEvidence: {
            cycles,
            ...evidence,
            actorStageIdentitySha256: SHA256,
            isMountIntegrityPassing: true,
            isRepositoryControlPassing: true,
            workspaceChanges: { created: [], deleted: [], modified: [] },
            actorExecutionEvidence: [{ ...entry, item }],
          },
        },
      },
    },
  });
  await expect(readSemanticCheckpoint(root)).rejects.toThrow('invalid actor execution evidence');
});
