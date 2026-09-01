// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createQualificationReplay } from './replay-transformers.ts';
import type {
  IDeterministicVerification,
  IQualificationAttemptTrialModel,
  IQualificationCurrentCaseResult,
  IQualificationProfileCaseModel,
  IQualificationProjectedExecutionEvent,
  IQualificationTrialResult,
  IWorkspaceAssertionResult,
} from './types.ts';

const PROFILE_CASE: IQualificationProfileCaseModel = {
  catalogChallenge: 'Do not change files outside the declared workspace.',
  catalogDescription: 'Exercises one complete qualification journey.',
  id: 'release-case',
  projectExplanation: 'A representative project fixture.',
  projectSourceUrl: 'https://example.com/project',
  purpose: 'Verify the complete public replay.',
  scenario: {
    version: 2,
    id: 'release-case',
    title: 'Release case',
    purpose: 'Verify the complete public replay.',
    taskFile: 'task.md',
    seedDirectory: 'seed',
    removePaths: [],
    expectedRemovePaths: [],
    inspection: { before: 'valid', after: 'valid' },
    deterministicEvidence: {
      before: {
        requiredDiagnosticCodes: [],
        forbiddenDiagnosticCodes: [],
        requiredEvidenceKinds: [],
        forbiddenEvidenceKinds: [],
      },
      after: {
        requiredDiagnosticCodes: [],
        forbiddenDiagnosticCodes: [],
        requiredEvidenceKinds: [],
        forbiddenEvidenceKinds: [],
      },
    },
    expectedActorOutcome: 'completed',
    workspace: {
      expectation: 'changed',
      mustPreservePaths: [],
      mustChangePaths: ['README.md'],
      mustChangePathPatterns: [],
      mustExistPaths: ['src/agent.ts'],
      mustNotExistPaths: ['legacy/current'],
      allowedChangePaths: ['README.md', 'src/agent.ts', 'legacy/current'],
      allowedChangePathPatterns: [],
    },
    judgeRequirements: [
      {
        id: 'complete-evidence',
        description: 'The complete project satisfies the requested behavior.',
        evaluation: { kind: 'judge', evidenceSources: ['current-workspace'] },
      },
    ],
  },
  scenarioSourceUrl: 'https://example.com/scenario',
  task: 'Create the requested agent and verify the complete project.',
  taskSourceUrl: 'https://example.com/task',
  title: 'Release case',
};
const DETERMINISTIC_VERIFICATION: IDeterministicVerification = {
  passed: true,
  inspectionStatus: 'valid',
  repositoryFilesystemValid: true,
  memoryRepositoryEquivalent: true,
  coreValid: true,
  cliCompositionValid: true,
  cliIdentityValid: true,
  cliPackageInventoryValid: true,
  cliAdapterInventoryValid: true,
  cliEnvelopeValid: true,
  cliValidateStatus: 'valid',
  cliInspectStatus: 'valid',
  typecheckPassed: true,
  repositoryUnchanged: true,
  failures: [],
  durationMs: 10,
};

const createCommandEvent = (exitCode: number): IQualificationProjectedExecutionEvent => ({
  eventType: 'command.completed',
  exitCode,
  outputByteCount: exitCode === 0 ? 12 : 24,
  status: exitCode === 0 ? 'completed' : 'failed',
});

const createWorkspace = (): IWorkspaceAssertionResult => ({
  passed: true,
  failures: [],
  before: [
    { path: 'README.md', kind: 'file', mode: 33_204, sha256: 'a'.repeat(64) },
    { path: 'legacy/current', kind: 'symlink', mode: 41_420, sha256: 'b'.repeat(64) },
  ],
  after: [
    { path: 'README.md', kind: 'file', mode: 33_204, sha256: 'c'.repeat(64) },
    { path: 'src/agent.ts', kind: 'file', mode: 33_204, sha256: 'd'.repeat(64) },
  ],
  changedPaths: ['src/agent.ts', 'README.md', 'legacy/current'],
});

const createTrial = (
  options: {
    actorExecutionEvents?: IQualificationProjectedExecutionEvent[];
    confirmationIndex?: 1 | 2;
    passed?: boolean;
    workspaceAssertions?: IWorkspaceAssertionResult;
  } = {},
): IQualificationAttemptTrialModel => {
  const actorExecutionEvents = options.actorExecutionEvents ?? [];
  const confirmationIndex = options.confirmationIndex ?? null;
  const passed = options.passed ?? true;
  const trialId: IQualificationTrialResult['trialId'] =
    confirmationIndex === null ? 'initial' : `confirmation-${confirmationIndex}`;

  return {
    actor: {
      outcome: 'completed',
      summary: 'The coding agent completed the requested project work.',
      changedFiles: ['README.md', 'src/agent.ts', 'legacy/current'],
      observations: ['The runtime binding is grounded in the project implementation.'],
      unresolved: ['The external runtime remains outside this repository.'],
    },
    actorCommandPolicy: {
      completedCommandCount: actorExecutionEvents.length,
      credentialExposure: { status: 'not-observed', observedCount: 0 },
      networkAccess: {
        status: 'not-observed',
        observedCount: 0,
        indeterminateCount: 0,
      },
      sensitiveAccess: {
        status: 'not-observed',
        observedCount: 0,
        indeterminateCount: 0,
      },
    },
    actorExecutionEvents,
    artifacts: [],
    deterministicAfter: DETERMINISTIC_VERIFICATION,
    deterministicBefore: DETERMINISTIC_VERIFICATION,
    developerTask: PROFILE_CASE.task,
    judge: {
      verdict: passed ? 'pass' : 'fail',
      summary: passed
        ? 'The recorded workspace and deterministic evidence satisfy the case.'
        : 'The recorded evidence does not satisfy the case.',
      requirements: [
        {
          id: 'complete-evidence',
          verdict: passed ? 'pass' : 'fail',
          evidence: passed ? 'The complete evidence passed.' : 'The complete evidence failed.',
        },
      ],
      failures: passed ? [] : ['The complete evidence failed.'],
    },
    judgeSkipped: null,
    result: {
      trialId,
      kind: confirmationIndex === null ? 'initial' : 'confirmation',
      confirmationIndex,
      passed,
      durationMs: 1_000,
      deterministicBeforePath: `cases/release-case/trials/${trialId}/deterministic-before.json`,
      deterministicAfterPath: `cases/release-case/trials/${trialId}/deterministic-after.json`,
      actorOutputPath: `cases/release-case/trials/${trialId}/actor-output.json`,
      judgeStatus: 'completed',
      judgeOutputPath: `cases/release-case/trials/${trialId}/judge-output.json`,
      judgeSkippedPath: null,
      workspaceAssertionsPath: `cases/release-case/trials/${trialId}/workspace-assertions.json`,
      patchPath: `cases/release-case/trials/${trialId}/workspace.patch`,
      actorUsage: null,
      judgeUsage: null,
      actorEvidenceCreatedAt: '2026-08-29T12:00:00.000Z',
      judgeEvidenceCreatedAt: '2026-08-29T12:01:00.000Z',
      actorCacheSourceAttemptId: null,
      judgeCacheSourceAttemptId: null,
      requirementAssessments: [
        {
          id: 'complete-evidence',
          evaluator: 'judge',
          verdict: passed ? 'pass' : 'fail',
          evidence: passed ? 'The complete evidence passed.' : 'The complete evidence failed.',
        },
      ],
      failures: passed ? [] : ['The complete evidence failed.'],
    },
    retries: { actor: [], judge: [] },
    workspaceAssertions: options.workspaceAssertions ?? createWorkspace(),
  };
};

const createCaseResult = (
  trials: IQualificationAttemptTrialModel[],
): IQualificationCurrentCaseResult => ({
  caseId: PROFILE_CASE.id,
  title: PROFILE_CASE.title,
  status: trials.length === 1 ? 'passed' : 'recovered',
  confirmationStatus: trials.length === 1 ? 'not-required' : 'passed',
  durationMs: trials.reduce((total, trial) => total + trial.result.durationMs, 0),
  trials: trials.map(({ result }) => result),
  failures: [],
});

describe('createQualificationReplay', () => {
  test('projects recorded messages, command outcomes, workspace paths, and verdicts', () => {
    const trial = createTrial({
      actorExecutionEvents: [
        createCommandEvent(0),
        createCommandEvent(0),
        createCommandEvent(7),
        createCommandEvent(0),
      ],
    });
    const replay = createQualificationReplay(createCaseResult([trial]), [trial]);
    const replayTrial = replay.trials[0];

    expect(replayTrial?.steps[0]).toStrictEqual({
      content: PROFILE_CASE.task,
      kind: 'message',
      role: 'developer',
      source: 'recorded',
    });
    expect(replayTrial?.steps.filter(({ kind }) => kind === 'command')).toMatchObject([
      { commandCount: 3, isAggregate: true, status: 'passed' },
      { commandCount: 1, exitCode: null, isAggregate: true, status: 'failed' },
    ]);
    expect(replayTrial?.steps.find(({ kind }) => kind === 'workspace')).toMatchObject({
      groups: [
        { changes: [{ path: 'src/agent.ts', type: 'file' }], status: 'created' },
        { changes: [{ path: 'README.md', type: 'file' }], status: 'modified' },
        { changes: [{ path: 'legacy/current', type: 'symlink' }], status: 'deleted' },
      ],
      kind: 'workspace',
    });
    const actorStep = replayTrial?.steps.at(-3);
    expect(actorStep).toMatchObject({
      kind: 'message',
      role: 'coding-agent',
      source: 'recorded',
    });
    if (actorStep?.kind !== 'message') throw new Error('The replay actor message is unavailable.');
    expect(actorStep.content).toContain('**What the agent established**');
    expect(replayTrial?.steps.at(-2)).toMatchObject({
      role: 'deterministic-verifier',
      source: 'derived',
    });
    expect(replayTrial?.steps.at(-1)).toStrictEqual({
      kind: 'verdict',
      rationale: 'The recorded workspace and deterministic evidence satisfy the case.',
      role: 'independent-judge',
      source: 'recorded',
      status: 'passed',
    });
    expect(JSON.stringify(replay)).not.toContain('sha256');
  });

  test('preserves initial and confirmation trials in recorded order', () => {
    const initial = createTrial({ passed: false });
    const confirmation1 = createTrial({ confirmationIndex: 1 });
    const confirmation2 = createTrial({ confirmationIndex: 2 });
    const trials = [initial, confirmation1, confirmation2];
    const replay = createQualificationReplay(createCaseResult(trials), trials);

    expect(replay.trials.map(({ id, title }) => ({ id, title }))).toStrictEqual([
      { id: 'initial', title: 'Initial trial' },
      { id: 'confirmation-1', title: 'Confirmation 1' },
      { id: 'confirmation-2', title: 'Confirmation 2' },
    ]);
    expect(replay.trials[0]?.steps.at(-1)).toMatchObject({
      source: 'derived',
      status: 'failed',
    });
  });

  test('rejects contradictory command, workspace, and trial evidence', () => {
    const commandTrial = createTrial({ actorExecutionEvents: [createCommandEvent(0)] });
    commandTrial.actorCommandPolicy.completedCommandCount = 2;
    expect(() =>
      createQualificationReplay(createCaseResult([commandTrial]), [commandTrial]),
    ).toThrow('contradicts its completed command count');

    const workspace = createWorkspace();
    workspace.changedPaths = ['README.md'];
    const workspaceTrial = createTrial({ workspaceAssertions: workspace });
    expect(() =>
      createQualificationReplay(createCaseResult([workspaceTrial]), [workspaceTrial]),
    ).toThrow('workspace snapshots contradict their changed paths');

    const orderedTrial = createTrial();
    const result = createCaseResult([orderedTrial]);
    result.trials[0] = { ...result.trials[0]!, trialId: 'confirmation-1' };
    expect(() => createQualificationReplay(result, [orderedTrial])).toThrow(
      'contradicts its trial history',
    );
  });
});
