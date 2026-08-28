// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
} from '../../../tooling/codex-evaluation-host/index.mjs';

import { FakeCodexHost } from '../codex-host/index.ts';
import { DEFAULT_SKILL_REPOSITORY } from '../constants/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationJudgeSkippedSchema,
  QualificationModelStageEvidenceSchema,
  QualificationSourceStateResultSchema,
  QualificationTrialResultSchema,
} from '../contracts/index.ts';
import {
  copyDirectory,
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import { readAttemptCheckpoint, writeAttemptCheckpoint } from '../checkpoint/index.ts';
import { executeProcess } from '../process/index.ts';
import { verifyQualificationResults } from '../result/index.ts';
import { runQualification } from './executor.ts';

describe('qualification execution', () => {
  let temporaryAttemptDirectory: string | null = null;
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryAttemptDirectory !== null) {
      await rm(temporaryAttemptDirectory, { force: true, recursive: true });
    }

    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('records dirty official input before candidate or model execution', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-execution-'));
    const skillRepository = path.join(temporaryRoot, 'skill-repository');
    const skillPath = path.join(skillRepository, 'SKILL.md');
    const resultsRoot = path.join(temporaryRoot, 'results');
    await ensureDirectory(skillRepository);
    await writeFile(skillPath, '# Committed skill\n', 'utf8');
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: skillRepository,
    });
    await executeProcess({
      command: 'git',
      args: ['add', '-A'],
      cwd: skillRepository,
    });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=Moldea Qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: establish skill fixture',
      ],
      cwd: skillRepository,
    });
    await writeFile(skillPath, '# Dirty skill\n', 'utf8');

    let actorCalls = 0;
    let judgeCalls = 0;
    const host = new FakeCodexHost({
      actor: () => {
        actorCalls += 1;
        return Promise.reject(new Error('Actor must not run after source-state failure.'));
      },
      judge: () => {
        judgeCalls += 1;
        return Promise.reject(new Error('Judge must not run after source-state failure.'));
      },
    });
    const outcome = await runQualification({
      host,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      skillRepository,
      isDryRun: false,
      resultsRoot,
    });
    temporaryAttemptDirectory = outcome.attemptDirectory;

    expect(outcome.result.status).toBe('failed');
    expect(outcome.wasRecorded).toBe(true);
    expect(actorCalls).toBe(0);
    expect(judgeCalls).toBe(0);
    expect(outcome.result.stages.find(({ id }) => id === 'source-state')?.status).toBe('failed');
    expect(outcome.result.stages.find(({ id }) => id === 'candidate')?.status).toBe('pending');
    expect(
      outcome.result.stages
        .filter(({ id }) => id.endsWith(':actor') || id.endsWith(':judge'))
        .every(({ status }) => status === 'pending'),
    ).toBe(true);

    expect(
      await readJsonFile(
        path.join(outcome.attemptDirectory, 'public', 'source-state.json'),
        QualificationSourceStateResultSchema,
      ),
    ).toMatchObject({
      passed: false,
      requiresCleanInputs: true,
      skillRepositoryDirty: true,
    });
    expect(
      await readJsonFile(
        path.join(
          resultsRoot,
          'custom',
          'custom',
          'attempts',
          outcome.result.attemptId,
          'attempt.json',
        ),
        QualificationAttemptResultSchema,
      ),
    ).toMatchObject({
      attemptId: outcome.result.attemptId,
      status: 'failed',
      provenance: { skillRepositoryDirty: true },
    });
    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: true,
      attempts: 1,
      issues: [],
    });
  });

  test('resumes the complete Custom state machine without repeating completed cases', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-resume-'));
    const skillRepository = path.join(temporaryRoot, 'skill-repository');
    const resultsRoot = path.join(temporaryRoot, 'results');
    await copyDirectory(DEFAULT_SKILL_REPOSITORY, skillRepository);
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: skillRepository,
    });
    await executeProcess({ command: 'git', args: ['add', '-A'], cwd: skillRepository });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=Moldea Qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: establish resumable skill fixture',
      ],
      cwd: skillRepository,
    });

    const abortController = new AbortController();
    let initialActorCalls = 0;
    let initialJudgeCalls = 0;
    const interruptedHost = new FakeCodexHost({
      actor: (input) => {
        initialActorCalls += 1;

        if (initialActorCalls === 2) {
          abortController.abort();
          return Promise.reject(new Error('Fixture interruption.'));
        }

        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.scenario.workspace.allowedChangePaths,
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: (input) => {
        initialJudgeCalls += 1;
        return Promise.resolve({
          output: {
            verdict: 'pass',
            summary: `Accepted ${input.caseId}.`,
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'pass' as const,
              evidence: 'The deterministic fixture evidence passed.',
            })),
            failures: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
    });
    const interruptedOutcome = await runQualification({
      host: interruptedHost,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      skillRepository,
      isDryRun: true,
      resultsRoot,
      signal: abortController.signal,
    });
    temporaryAttemptDirectory = interruptedOutcome.attemptDirectory;
    const attemptBackup = path.join(temporaryRoot, 'attempt-backup');
    await copyDirectory(interruptedOutcome.attemptDirectory, attemptBackup);

    expect(interruptedOutcome.result.status).toBe('incomplete');
    expect(interruptedOutcome.wasRecorded).toBe(false);
    expect(initialActorCalls).toBe(2);
    expect(initialJudgeCalls).toBe(1);
    expect(
      interruptedOutcome.result.stages.find(
        ({ id }) => id === 'case:evaluate-aligned-project:result',
      )?.status,
    ).toBe('passed');
    expect(
      interruptedOutcome.result.stages.find(
        ({ id }) => id === 'case:initialize-grounded-project:trial:initial:actor',
      )?.status,
    ).toBe('pending');

    let resumedActorCalls = 0;
    let resumedJudgeCalls = 0;
    const resumedHost = new FakeCodexHost({
      actor: (input) => {
        resumedActorCalls += 1;
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.scenario.workspace.allowedChangePaths,
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: (input) => {
        resumedJudgeCalls += 1;
        return Promise.resolve({
          output: {
            verdict: 'pass',
            summary: `Accepted ${input.caseId}.`,
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'pass' as const,
              evidence: 'The deterministic fixture evidence passed.',
            })),
            failures: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
    });
    const resumedOutcome = await runQualification({
      host: resumedHost,
      resumeAttemptId: interruptedOutcome.result.attemptId,
      resultsRoot,
    });

    expect(resumedOutcome.result.status).toBe('passed');
    expect(resumedOutcome.wasRecorded).toBe(false);
    expect(resumedActorCalls).toBe(7);
    expect(resumedJudgeCalls).toBe(7);

    await rm(interruptedOutcome.attemptDirectory, { force: true, recursive: true });
    await copyDirectory(attemptBackup, interruptedOutcome.attemptDirectory);
    await writeFile(path.join(skillRepository, 'SKILL.md'), '# Changed skill\n', 'utf8');

    await expect(
      runQualification({
        host: new FakeCodexHost(),
        resumeAttemptId: interruptedOutcome.result.attemptId,
        resultsRoot,
      }),
    ).rejects.toThrow('Attempt inputs changed after checkpoint creation.');
    expect((await readAttemptCheckpoint(interruptedOutcome.attemptDirectory)).status).toBe(
      'incomplete',
    );
  }, 120_000);

  test('resumes retry backoff with contiguous counts without repeating completed model stages', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-retry-resume-'));
    const skillRepository = path.join(temporaryRoot, 'skill-repository');
    const resultsRoot = path.join(temporaryRoot, 'results');
    await copyDirectory(DEFAULT_SKILL_REPOSITORY, skillRepository);
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: skillRepository,
    });
    await executeProcess({ command: 'git', args: ['add', '-A'], cwd: skillRepository });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=Moldea Qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: establish retry resume fixture',
      ],
      cwd: skillRepository,
    });

    const abortController = new AbortController();
    let initialActorCalls = 0;
    let initialJudgeCalls = 0;
    const interruptedHost = new FakeCodexHost({
      actor: (input) => {
        initialActorCalls += 1;
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.dryRunChangedFiles ?? input.scenario.workspace.allowedChangePaths,
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: () => {
        initialJudgeCalls += 1;
        return Promise.reject(
          new CodexEvaluationHostError(
            CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
            'Retryable judge timeout.',
          ),
        );
      },
    });
    const interruptedOutcome = await runQualification({
      host: interruptedHost,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      skillRepository,
      isDryRun: true,
      operationalRetry: {
        now: () => '2026-08-28T12:00:00.000Z',
        random: () => 1,
        wait: (_delayMs, signal) => {
          abortController.abort(new Error('Stop during retry backoff.'));
          signal?.throwIfAborted();
          return Promise.resolve();
        },
      },
      resultsRoot,
      signal: abortController.signal,
    });
    temporaryAttemptDirectory = interruptedOutcome.attemptDirectory;
    const judgeStageId = 'case:evaluate-aligned-project:trial:initial:judge';
    const interruptedJudgeStage = interruptedOutcome.result.stages.find(
      ({ id }) => id === judgeStageId,
    );

    expect(interruptedOutcome.result.status).toBe('incomplete');
    expect(interruptedOutcome.wasRecorded).toBe(false);
    expect(initialActorCalls).toBe(1);
    expect(initialJudgeCalls).toBe(1);
    expect(interruptedJudgeStage).toMatchObject({
      status: 'pending',
      operationalRetries: [
        {
          category: 'timed-out',
          failureCount: 1,
          retryDelayMs: 5_000,
        },
      ],
    });

    const resumedActorCallsByCase = new Map<string, number>();
    const resumedJudgeCallsByCase = new Map<string, number>();
    const resumedHost = new FakeCodexHost({
      actor: (input) => {
        resumedActorCallsByCase.set(
          input.caseId,
          (resumedActorCallsByCase.get(input.caseId) ?? 0) + 1,
        );
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.dryRunChangedFiles ?? input.scenario.workspace.allowedChangePaths,
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: (input) => {
        const callCount = (resumedJudgeCallsByCase.get(input.caseId) ?? 0) + 1;
        resumedJudgeCallsByCase.set(input.caseId, callCount);

        if (input.caseId === 'evaluate-aligned-project' && callCount === 1) {
          return Promise.reject(
            new CodexEvaluationHostError(
              CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
              'Retryable judge proxy failure.',
            ),
          );
        }

        return Promise.resolve({
          output: {
            verdict: 'pass',
            summary: `Accepted ${input.caseId}.`,
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'pass' as const,
              evidence: 'The deterministic fixture evidence passed.',
            })),
            failures: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
    });
    const resumedOutcome = await runQualification({
      host: resumedHost,
      resumeAttemptId: interruptedOutcome.result.attemptId,
      operationalRetry: {
        now: () => '2026-08-28T12:01:00.000Z',
        random: () => 1,
        wait: () => Promise.resolve(),
      },
      resultsRoot,
    });
    const resumedJudgeStage = resumedOutcome.result.stages.find(({ id }) => id === judgeStageId);

    expect(resumedOutcome.result.status).toBe('passed');
    expect(resumedActorCallsByCase.get('evaluate-aligned-project') ?? 0).toBe(0);
    expect(resumedJudgeCallsByCase.get('evaluate-aligned-project')).toBe(2);
    expect(
      resumedJudgeStage?.operationalRetries.map(({ failureCount, retryDelayMs }) => ({
        failureCount,
        retryDelayMs,
      })),
    ).toStrictEqual([
      { failureCount: 1, retryDelayMs: 5_000 },
      { failureCount: 2, retryDelayMs: 10_000 },
    ]);
    expect(
      resumedOutcome.result.stages
        .filter(({ id }) => id.includes('evaluate-aligned-project:trial:confirmation-'))
        .every(({ status }) => status === 'skipped'),
    ).toBe(true);
  }, 120_000);

  test('resumes a cache-derived initial failure with two fresh confirmations', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-cache-resume-'));
    const skillRepository = path.join(temporaryRoot, 'skill-repository');
    const resultsRoot = path.join(temporaryRoot, 'results');
    await copyDirectory(DEFAULT_SKILL_REPOSITORY, skillRepository);
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: skillRepository,
    });
    await executeProcess({ command: 'git', args: ['add', '-A'], cwd: skillRepository });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=Moldea Qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: establish cached recovery fixture',
      ],
      cwd: skillRepository,
    });

    const abortController = new AbortController();
    let interruptedActorCalls = 0;
    let interruptedJudgeCalls = 0;
    const interruptedHost = new FakeCodexHost({
      actor: (input) => {
        interruptedActorCalls += 1;
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.dryRunChangedFiles ?? input.scenario.workspace.allowedChangePaths,
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: (input) => {
        interruptedJudgeCalls += 1;
        return Promise.resolve({
          output: {
            verdict: 'fail',
            summary: 'The cached initial decision failed.',
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'fail' as const,
              evidence: 'The initial trial intentionally failed.',
            })),
            failures: ['The initial trial intentionally failed.'],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
    });
    const interruptedOutcome = await runQualification({
      host: interruptedHost,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      skillRepository,
      isDryRun: true,
      onProgress: (progress) => {
        if (
          progress.kind === 'trial' &&
          progress.caseId === 'evaluate-aligned-project' &&
          progress.trialId === 'initial' &&
          progress.status === 'completed'
        ) {
          abortController.abort(new Error('Stop after the initial cached trial.'));
        } else if (abortController.signal.aborted) {
          abortController.signal.throwIfAborted();
        }
      },
      resultsRoot,
      signal: abortController.signal,
    });
    temporaryAttemptDirectory = interruptedOutcome.attemptDirectory;

    expect(interruptedOutcome.result.status).toBe('incomplete');
    expect(interruptedActorCalls).toBe(1);
    expect(interruptedJudgeCalls).toBe(1);

    const sourceAttemptId = 'cached-source-attempt';
    const caseRoot = path.join(
      interruptedOutcome.attemptDirectory,
      'public',
      'cases',
      'evaluate-aligned-project',
      'trials',
      'initial',
    );
    const actorEvidencePath = path.join(caseRoot, 'actor-evidence.json');
    const judgeEvidencePath = path.join(caseRoot, 'judge-evidence.json');
    const trialResultPath = path.join(caseRoot, 'trial-result.json');
    const actorEvidence = await readJsonFile(
      actorEvidencePath,
      QualificationModelStageEvidenceSchema,
    );
    const judgeEvidence = await readJsonFile(
      judgeEvidencePath,
      QualificationModelStageEvidenceSchema,
    );
    const trialResult = await readJsonFile(trialResultPath, QualificationTrialResultSchema);
    await Promise.all([
      writeJsonFileAtomically(actorEvidencePath, {
        ...actorEvidence,
        sourceAttemptId,
        cacheSourceAttemptId: sourceAttemptId,
      }),
      writeJsonFileAtomically(judgeEvidencePath, {
        ...judgeEvidence,
        sourceAttemptId,
        cacheSourceAttemptId: sourceAttemptId,
      }),
      writeJsonFileAtomically(trialResultPath, {
        ...trialResult,
        actorCacheSourceAttemptId: sourceAttemptId,
        judgeCacheSourceAttemptId: sourceAttemptId,
      }),
    ]);
    const checkpoint = await readAttemptCheckpoint(interruptedOutcome.attemptDirectory);
    const actorStageId = 'case:evaluate-aligned-project:trial:initial:actor';
    const judgeStageId = 'case:evaluate-aligned-project:trial:initial:judge';
    const actorStage = checkpoint.stages[actorStageId];
    const judgeStage = checkpoint.stages[judgeStageId];

    if (actorStage === undefined || judgeStage === undefined) {
      throw new Error('Missing completed initial model stages.');
    }

    await writeAttemptCheckpoint(interruptedOutcome.attemptDirectory, {
      ...checkpoint,
      stages: {
        ...checkpoint.stages,
        [actorStageId]: {
          ...actorStage,
          status: 'cached',
          cacheSourceAttemptId: sourceAttemptId,
        },
        [judgeStageId]: {
          ...judgeStage,
          status: 'cached',
          cacheSourceAttemptId: sourceAttemptId,
        },
      },
    });

    const resumedActorCallsByCase = new Map<string, number>();
    const resumedJudgeCallsByCase = new Map<string, number>();
    const resumedHost = new FakeCodexHost({
      actor: (input) => {
        resumedActorCallsByCase.set(
          input.caseId,
          (resumedActorCallsByCase.get(input.caseId) ?? 0) + 1,
        );
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.dryRunChangedFiles ?? input.scenario.workspace.allowedChangePaths,
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: (input) => {
        resumedJudgeCallsByCase.set(
          input.caseId,
          (resumedJudgeCallsByCase.get(input.caseId) ?? 0) + 1,
        );
        return Promise.resolve({
          output: {
            verdict: 'pass',
            summary: `Accepted ${input.caseId}.`,
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'pass' as const,
              evidence: 'The deterministic fixture evidence passed.',
            })),
            failures: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
    });
    const resumedOutcome = await runQualification({
      host: resumedHost,
      resumeAttemptId: interruptedOutcome.result.attemptId,
      resultsRoot,
    });
    const recoveredCase = resumedOutcome.result.cases[0];

    expect(resumedOutcome.result.status).toBe('passed');
    expect(recoveredCase).toMatchObject({
      caseId: 'evaluate-aligned-project',
      confirmationStatus: 'passed',
      status: 'recovered',
    });
    expect(
      recoveredCase?.trials.map(
        ({ actorCacheSourceAttemptId, judgeCacheSourceAttemptId, trialId }) => ({
          actorCacheSourceAttemptId,
          judgeCacheSourceAttemptId,
          trialId,
        }),
      ),
    ).toStrictEqual([
      {
        actorCacheSourceAttemptId: sourceAttemptId,
        judgeCacheSourceAttemptId: sourceAttemptId,
        trialId: 'initial',
      },
      {
        actorCacheSourceAttemptId: null,
        judgeCacheSourceAttemptId: null,
        trialId: 'confirmation-1',
      },
      {
        actorCacheSourceAttemptId: null,
        judgeCacheSourceAttemptId: null,
        trialId: 'confirmation-2',
      },
    ]);
    expect(resumedActorCallsByCase.get('evaluate-aligned-project')).toBe(2);
    expect(resumedJudgeCallsByCase.get('evaluate-aligned-project')).toBe(2);
    expect(resumedOutcome.result.stages.find(({ id }) => id === actorStageId)).toMatchObject({
      status: 'cached',
      cacheSourceAttemptId: sourceAttemptId,
    });
    expect(
      resumedOutcome.result.stages
        .filter(({ id }) => id.includes('evaluate-aligned-project:trial:confirmation-'))
        .filter(({ id }) => id.endsWith(':actor') || id.endsWith(':judge'))
        .every(
          ({ cacheSourceAttemptId, status }) =>
            cacheSourceAttemptId === null && status === 'passed',
        ),
    ).toBe(true);
  }, 120_000);

  test('recovers one initial semantic failure only after two fresh passing confirmations', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-recovery-'));
    const skillRepository = path.join(temporaryRoot, 'skill-repository');
    const resultsRoot = path.join(temporaryRoot, 'results');
    await copyDirectory(DEFAULT_SKILL_REPOSITORY, skillRepository);
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: skillRepository,
    });
    await executeProcess({ command: 'git', args: ['add', '-A'], cwd: skillRepository });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=Moldea Qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: establish recovery skill fixture',
      ],
      cwd: skillRepository,
    });

    const judgeCallsByCase = new Map<string, number>();
    const host = new FakeCodexHost({
      judge: (input) => {
        const callCount = (judgeCallsByCase.get(input.caseId) ?? 0) + 1;
        judgeCallsByCase.set(input.caseId, callCount);
        const isInitialFailure = input.caseId === 'evaluate-aligned-project' && callCount === 1;

        return Promise.resolve({
          output: {
            verdict: isInitialFailure ? ('fail' as const) : ('pass' as const),
            summary: isInitialFailure
              ? 'The initial semantic decision failed.'
              : `Accepted ${input.caseId}.`,
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: isInitialFailure ? ('fail' as const) : ('pass' as const),
              evidence: isInitialFailure
                ? 'The initial trial intentionally failed.'
                : 'The deterministic fixture evidence passed.',
            })),
            failures: isInitialFailure ? ['The initial trial intentionally failed.'] : [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
    });
    const outcome = await runQualification({
      host,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      skillRepository,
      isDryRun: true,
      resultsRoot,
    });
    temporaryAttemptDirectory = outcome.attemptDirectory;
    const recoveredCase = outcome.result.cases[0];

    expect(outcome.result.status).toBe('passed');
    expect(outcome.wasRecorded).toBe(false);
    expect(recoveredCase).toMatchObject({
      caseId: 'evaluate-aligned-project',
      status: 'recovered',
      confirmationStatus: 'passed',
      failures: [],
    });
    expect(recoveredCase?.trials.map(({ trialId, passed }) => ({ trialId, passed }))).toStrictEqual(
      [
        { trialId: 'initial', passed: false },
        { trialId: 'confirmation-1', passed: true },
        { trialId: 'confirmation-2', passed: true },
      ],
    );
    expect(
      recoveredCase?.trials
        .slice(1)
        .every(
          ({ actorCacheSourceAttemptId, judgeCacheSourceAttemptId }) =>
            actorCacheSourceAttemptId === null && judgeCacheSourceAttemptId === null,
        ),
    ).toBe(true);
    expect(judgeCallsByCase.get('evaluate-aligned-project')).toBe(3);
    expect(
      outcome.result.stages
        .filter(({ id }) => id.includes('evaluate-aligned-project:trial:confirmation-'))
        .every(({ status }) => status === 'passed'),
    ).toBe(true);
  }, 120_000);

  test.each([
    ['confirmation-1', 2, [false, false]],
    ['confirmation-2', 3, [false, true, false]],
  ] as const)(
    'rejects recovery when %s produces the terminal semantic failure',
    async (terminalTrialId, terminalJudgeCall, expectedTrialResults) => {
      temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-rejection-'));
      const skillRepository = path.join(temporaryRoot, 'skill-repository');
      const resultsRoot = path.join(temporaryRoot, 'results');
      await copyDirectory(DEFAULT_SKILL_REPOSITORY, skillRepository);
      await executeProcess({
        command: 'git',
        args: ['init', '--initial-branch=main'],
        cwd: skillRepository,
      });
      await executeProcess({ command: 'git', args: ['add', '-A'], cwd: skillRepository });
      await executeProcess({
        command: 'git',
        args: [
          '-c',
          'commit.gpgsign=false',
          '-c',
          'user.name=Moldea Qualification',
          '-c',
          'user.email=qualification@moldea.local',
          'commit',
          '-m',
          `test: establish ${terminalTrialId} fixture`,
        ],
        cwd: skillRepository,
      });

      let judgeCalls = 0;
      const host = new FakeCodexHost({
        judge: (input) => {
          judgeCalls += 1;
          const hasFailed = judgeCalls === 1 || judgeCalls === terminalJudgeCall;

          return Promise.resolve({
            output: {
              verdict: hasFailed ? ('fail' as const) : ('pass' as const),
              summary: hasFailed
                ? 'The semantic decision failed.'
                : 'The semantic decision passed.',
              requirements: input.scenario.judgeRequirements.map(({ id }) => ({
                id,
                verdict: hasFailed ? ('fail' as const) : ('pass' as const),
                evidence: hasFailed
                  ? 'The trial intentionally failed.'
                  : 'The deterministic fixture evidence passed.',
              })),
              failures: hasFailed ? ['The trial intentionally failed.'] : [],
            },
            usage: null,
            durationMs: 0,
            events: '',
          });
        },
      });
      const outcome = await runQualification({
        host,
        selection: { adapterId: 'custom', implementationId: 'custom' },
        skillRepository,
        isDryRun: true,
        resultsRoot,
      });
      temporaryAttemptDirectory = outcome.attemptDirectory;
      const failedCase = outcome.result.cases[0];

      expect(outcome.result.status).toBe('failed');
      expect(failedCase).toMatchObject({
        caseId: 'evaluate-aligned-project',
        status: 'failed',
        confirmationStatus: 'rejected',
      });
      expect(failedCase?.trials.map(({ passed }) => passed)).toStrictEqual(expectedTrialResults);
      expect(failedCase?.trials.at(-1)?.trialId).toBe(terminalTrialId);
      expect(judgeCalls).toBe(terminalJudgeCall);
      expect(outcome.result.cases).toHaveLength(1);
      expect(
        outcome.result.stages
          .filter(({ id }) => id.includes('evaluate-aligned-project:trial:confirmation-2'))
          .every(
            ({ status }) =>
              status === (terminalTrialId === 'confirmation-1' ? 'skipped' : 'passed'),
          ),
      ).toBe(true);
      expect(
        outcome.result.stages
          .filter(({ id }) => id.startsWith('case:repair-broken-adapter:'))
          .every(({ status }) => status === 'pending'),
      ).toBe(true);
    },
    120_000,
  );

  test('skips every judge call after deterministic or workspace failure', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-judge-skip-'));
    const skillRepository = path.join(temporaryRoot, 'skill-repository');
    const resultsRoot = path.join(temporaryRoot, 'results');
    await copyDirectory(DEFAULT_SKILL_REPOSITORY, skillRepository);
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: skillRepository,
    });
    await executeProcess({ command: 'git', args: ['add', '-A'], cwd: skillRepository });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'commit.gpgsign=false',
        '-c',
        'user.name=Moldea Qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: establish judge-skip skill fixture',
      ],
      cwd: skillRepository,
    });

    let actorCalls = 0;
    let judgeCalls = 0;
    const host = new FakeCodexHost({
      actor: (input) => {
        actorCalls += 1;
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Intentionally failed ${input.caseId}.`,
            commands: [],
            changedFiles: ['README.md'],
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: () => {
        judgeCalls += 1;
        return Promise.reject(new Error('Judge must not run after deterministic failure.'));
      },
    });
    const outcome = await runQualification({
      host,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      skillRepository,
      isDryRun: true,
      resultsRoot,
    });
    temporaryAttemptDirectory = outcome.attemptDirectory;

    expect(outcome.result.status).toBe('failed');
    expect(outcome.wasRecorded).toBe(false);
    expect(actorCalls).toBe(2);
    expect(judgeCalls).toBe(0);
    expect(
      outcome.result.stages
        .filter(
          ({ id }) => id.startsWith('case:evaluate-aligned-project:') && id.endsWith(':judge'),
        )
        .every(({ status }) => status === 'skipped'),
    ).toBe(true);
    expect(
      outcome.result.cases.every(({ trials }) =>
        trials.every(({ judgeStatus }) => judgeStatus === 'skipped'),
      ),
    ).toBe(true);
    expect(
      await readJsonFile(
        path.join(
          outcome.attemptDirectory,
          'public',
          'cases',
          'evaluate-aligned-project',
          'trials',
          'initial',
          'judge-skipped.json',
        ),
        QualificationJudgeSkippedSchema,
      ),
    ).toMatchObject({
      deterministicAfterPassed: true,
      workspaceAssertionsPassed: false,
    });
  }, 120_000);
});
