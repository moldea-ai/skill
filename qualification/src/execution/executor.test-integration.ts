// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { FakeCodexHost } from '../codex-host/index.ts';
import { DEFAULT_SKILL_REPOSITORY } from '../constants/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationSourceStateResultSchema,
} from '../contracts/index.ts';
import { copyDirectory, ensureDirectory, readJsonFile } from '../filesystem/index.ts';
import { readAttemptCheckpoint } from '../checkpoint/index.ts';
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
            outcome: 'completed',
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.scenario.workspace.mustChangePaths,
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
      interruptedOutcome.result.stages.find(({ id }) => id === 'case:maintain-dirty-project:actor')
        ?.status,
    ).toBe('pending');

    let resumedActorCalls = 0;
    let resumedJudgeCalls = 0;
    const resumedHost = new FakeCodexHost({
      actor: (input) => {
        resumedActorCalls += 1;
        return Promise.resolve({
          output: {
            outcome: 'completed',
            summary: `Completed ${input.caseId}.`,
            commands: [],
            changedFiles: input.scenario.workspace.mustChangePaths,
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
    expect(resumedActorCalls).toBe(2);
    expect(resumedJudgeCalls).toBe(2);

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
});
