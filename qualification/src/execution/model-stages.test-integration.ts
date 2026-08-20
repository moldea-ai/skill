// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { FakeCodexHost } from '../codex-host/index.ts';
import type {
  ICandidateClosure,
  IDeterministicVerification,
  IJudgeOutput,
  IQualificationCaseScenario,
  IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import { ensureDirectory, writeJsonFileAtomically } from '../filesystem/index.ts';
import type { IPreparedQualificationProject } from '../project-fixture/index.ts';
import { executeJudgeModelStage, restoreJudgeModelStage } from './model-stages.ts';

const scenario = {
  version: 1,
  id: 'test-case',
  title: 'Test case',
  purpose: 'Exercise model-stage judge validation.',
  taskFile: 'task.md',
  seedDirectory: 'seed',
  removePaths: [],
  expectedRemovePaths: [],
  inspection: { before: 'valid', after: 'valid' },
  workspace: {
    expectation: 'unchanged',
    mustPreservePaths: [],
    mustChangePaths: [],
    mustExistPaths: [],
    mustNotExistPaths: [],
  },
  judgeRequirements: [{ id: 'required-check', description: 'The required check passes.' }],
} satisfies IQualificationCaseScenario;

const incompleteJudgeOutput: IJudgeOutput = {
  verdict: 'pass',
  summary: 'The incomplete decision claims to pass.',
  requirements: [],
  failures: [],
};

const deterministicAfter: IDeterministicVerification = {
  passed: true,
  inspectionStatus: 'valid',
  repositoryFilesystemValid: true,
  memoryRepositoryEquivalent: true,
  coreValid: true,
  cliCompatibilityValid: true,
  cliValidateStatus: 'valid',
  cliInspectStatus: 'valid',
  typecheckPassed: true,
  repositoryUnchanged: true,
  failures: [],
  durationMs: 0,
};

const workspaceAssertions: IWorkspaceAssertionResult = {
  passed: true,
  failures: [],
  before: [],
  after: [],
  changedPaths: [],
};

describe('qualification model stages', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('rejects incomplete judge requirements from fresh and restored evidence', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    await Promise.all([
      ensureDirectory(workspaceDirectory),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(runtimeDirectory),
    ]);
    await writeFile(path.join(workspaceDirectory, 'package.json'), '{}\n', 'utf8');
    const project: IPreparedQualificationProject = {
      profileCase: {
        id: scenario.id,
        projectDirectory: 'projects/test-case',
        scenarioFile: 'scenario.yaml',
      },
      scenario,
      scenarioDirectory: temporaryRoot,
      workspaceDirectory,
      taskPath: path.join(temporaryRoot, 'task.md'),
      baselineCommit: 'fixture',
      beforeActorFiles: [],
      internalDigest: 'a'.repeat(64),
    };
    const candidate: ICandidateClosure = {
      fingerprint: 'b'.repeat(64),
      packages: [],
      runtimeDirectory,
    };
    const host = new FakeCodexHost({
      judge: async () =>
        Promise.resolve({
          output: incompleteJudgeOutput,
          usage: null,
          durationMs: 0,
          events: '',
        }),
    });

    await expect(
      executeJudgeModelStage({
        actorOutput: {
          outcome: 'completed',
          summary: 'Completed the task.',
          commands: [],
          changedFiles: [],
          observations: [],
          unresolved: [],
        },
        adapterId: 'custom',
        attemptId: 'attempt',
        candidate,
        caseArtifactDirectory,
        codexVersion: 'codex-cli test',
        deterministicAfter,
        host,
        implementationId: 'custom',
        isDryRun: true,
        packagesRepository: '/packages',
        profileDigest: 'c'.repeat(64),
        qualificationDigest: 'd'.repeat(64),
        project,
        skillDigest: 'e'.repeat(64),
        skillRepository: '/skill',
        task: 'Complete the test task.',
        useCache: false,
        workspaceAssertions,
      }),
    ).rejects.toThrow('missing declared requirement ids: required-check');

    await Promise.all([
      writeJsonFileAtomically(
        path.join(caseArtifactDirectory, 'judge-output.json'),
        incompleteJudgeOutput,
      ),
      writeJsonFileAtomically(path.join(caseArtifactDirectory, 'judge-evidence.json'), {
        role: 'judge',
        createdAt: '2026-08-20T00:00:00.000Z',
        durationMs: 0,
        usage: null,
        cacheKey: 'f'.repeat(64),
        sourceAttemptId: 'attempt',
        cacheSourceAttemptId: null,
      }),
    ]);

    await expect(restoreJudgeModelStage({ caseArtifactDirectory, scenario })).rejects.toThrow(
      'missing declared requirement ids: required-check',
    );
  });
});
