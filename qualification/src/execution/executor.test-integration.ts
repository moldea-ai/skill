// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { FakeCodexHost } from '../codex-host/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationSourceStateResultSchema,
} from '../contracts/index.ts';
import { ensureDirectory, readJsonFile } from '../filesystem/index.ts';
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
});
