// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
import {
  calculateDirectoryFingerprint,
  ensureDirectory,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import {
  captureQualificationProjectSnapshot,
  MOUNTED_SKILL_RELATIVE_PATH,
  type IPreparedQualificationProject,
} from '../project-fixture/index.ts';
import {
  executeActorModelStage,
  executeJudgeModelStage,
  restoreActorModelStage,
  restoreJudgeModelStage,
} from './model-stages.ts';

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
    expectation: 'unchanged',
    mustPreservePaths: [],
    mustChangePaths: [],
    mustExistPaths: [],
    mustNotExistPaths: [],
    allowedChangePaths: [],
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
  cliIdentityValid: true,
  cliPackageInventoryValid: true,
  cliAdapterInventoryValid: true,
  cliEnvelopeValid: true,
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
      candidateRuntimeDigest: '0'.repeat(64),
      internalDigest: 'a'.repeat(64),
      skillDigest: 'b'.repeat(64),
    };
    const candidate: ICandidateClosure = {
      cliJsonSchemaVersion: 2,
      cliVersion: '4.0.0',
      fingerprint: 'c'.repeat(64),
      packages: [],
      runtimeDirectory,
    };
    const callOrder: string[] = [];
    let observedJudgeWorkspace: string | null = null;
    const host = new FakeCodexHost({
      judge: async (input) => {
        callOrder.push('judge');
        observedJudgeWorkspace = input.workspaceDirectory;
        return Promise.resolve({
          output: incompleteJudgeOutput,
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
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
        approvePaidExecution: () => {
          callOrder.push('approval');
          return Promise.resolve();
        },
        attemptDirectory: temporaryRoot,
        attemptId: 'attempt',
        candidate,
        caseArtifactDirectory,
        executionEnvironment: {
          model: 'gpt-5.6-terra',
          reasoningEffort: 'medium',
          codexVersion: 'codex-cli test',
          nodeVersion: process.version,
          pnpmVersion: '11.9.0',
          gitVersion: 'git version test',
          allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
          hostTimeoutMs: 120_000,
          modelEndpoint: null,
          sslCertificateFileSha256: null,
        },
        deterministicAfter,
        host,
        implementationId: 'custom',
        isDryRun: false,
        judgeWorkspaceDirectory: path.join(temporaryRoot, 'judge-workspace'),
        packagesRepository: '/packages',
        profileDigest: 'd'.repeat(64),
        qualificationDigest: 'e'.repeat(64),
        project,
        skillDigest: 'f'.repeat(64),
        targetDigest: '1'.repeat(64),
        skillRepository: '/skill',
        task: 'Complete the test task.',
        useCache: false,
        verifyExecutionInputs: () => {
          callOrder.push('verify');
          return Promise.resolve();
        },
        workspaceAssertions,
      }),
    ).rejects.toThrow('missing declared requirement ids: required-check');
    expect(callOrder).toStrictEqual(['verify', 'approval', 'judge', 'verify']);
    expect(observedJudgeWorkspace).toBe(path.join(temporaryRoot, 'judge-workspace'));
    expect(observedJudgeWorkspace).not.toBe(workspaceDirectory);

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
        cacheKey: '0'.repeat(64),
        sourceAttemptId: 'attempt',
        cacheSourceAttemptId: null,
      }),
    ]);

    await expect(restoreJudgeModelStage({ caseArtifactDirectory, scenario })).rejects.toThrow(
      'missing declared requirement ids: required-check',
    );
  });

  test('rejects actor changes to the project-local candidate before accepting evidence', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    const candidateFile = path.join(workspaceDirectory, 'node_modules', 'candidate', 'index.js');
    await Promise.all([
      ensureDirectory(path.dirname(candidateFile)),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(runtimeDirectory),
    ]);
    await writeFile(path.join(workspaceDirectory, 'package.json'), '{}\n', 'utf8');
    await writeFile(candidateFile, 'export const candidate = true;\n', 'utf8');
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
      candidateRuntimeDigest: await calculateDirectoryFingerprint(
        path.join(workspaceDirectory, 'node_modules'),
      ),
      internalDigest: 'a'.repeat(64),
      skillDigest: 'b'.repeat(64),
    };
    const candidate: ICandidateClosure = {
      cliJsonSchemaVersion: 2,
      cliVersion: '4.0.0',
      fingerprint: 'c'.repeat(64),
      packages: [],
      runtimeDirectory,
    };
    const callOrder: string[] = [];
    const host = new FakeCodexHost({
      actor: async () => {
        callOrder.push('actor');
        await writeFile(candidateFile, 'export const candidate = false;\n', 'utf8');
        return {
          output: {
            outcome: 'completed',
            summary: 'Changed the candidate runtime.',
            commands: [],
            changedFiles: [],
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        };
      },
    });

    await expect(
      executeActorModelStage({
        adapterId: 'custom',
        approvePaidExecution: () => {
          callOrder.push('approval');
          return Promise.resolve();
        },
        attemptDirectory: temporaryRoot,
        attemptId: 'attempt',
        candidate,
        caseArtifactDirectory,
        executionEnvironment: {
          model: 'gpt-5.6-terra',
          reasoningEffort: 'medium',
          codexVersion: 'codex-cli test',
          nodeVersion: process.version,
          pnpmVersion: '11.9.0',
          gitVersion: 'git version test',
          allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
          hostTimeoutMs: 120_000,
          modelEndpoint: null,
          sslCertificateFileSha256: null,
        },
        host,
        implementationId: 'custom',
        isDryRun: false,
        packagesRepository: '/packages',
        profileDigest: 'd'.repeat(64),
        qualificationDigest: 'e'.repeat(64),
        project,
        skillDigest: 'f'.repeat(64),
        targetDigest: '1'.repeat(64),
        skillRepository: '/skill',
        snapshotDirectory: path.join(temporaryRoot, 'snapshot'),
        task: 'Complete the test task.',
        useCache: false,
        verifyExecutionInputs: () => {
          callOrder.push('verify');
          return Promise.resolve();
        },
      }),
    ).rejects.toThrow('The project-local candidate runtime was modified after preparation.');
    expect(callOrder).toStrictEqual(['verify', 'approval', 'actor', 'verify']);
  });

  test('restores a completed actor stage and exact post-actor workspace on resume', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const snapshotDirectory = path.join(temporaryRoot, 'snapshot');
    const candidateDirectory = path.join(workspaceDirectory, 'node_modules', 'candidate');
    const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
    const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
    await Promise.all([
      ensureDirectory(candidateDirectory),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(internalDirectory),
      ensureDirectory(skillDirectory),
    ]);
    await Promise.all([
      writeFile(path.join(candidateDirectory, 'index.js'), 'candidate runtime\n', 'utf8'),
      writeFile(path.join(internalDirectory, 'task.md'), 'Runner-owned task\n', 'utf8'),
      writeFile(path.join(skillDirectory, 'SKILL.md'), '# Mounted skill\n', 'utf8'),
      writeFile(path.join(workspaceDirectory, 'project.txt'), 'post-actor state\n', 'utf8'),
    ]);
    const project: IPreparedQualificationProject = {
      profileCase: {
        id: scenario.id,
        projectDirectory: 'projects/test-case',
        scenarioFile: 'scenario.yaml',
      },
      scenario,
      scenarioDirectory: temporaryRoot,
      workspaceDirectory,
      taskPath: path.join(internalDirectory, 'task.md'),
      baselineCommit: 'fixture',
      beforeActorFiles: [],
      candidateRuntimeDigest: await calculateDirectoryFingerprint(
        path.join(workspaceDirectory, 'node_modules'),
      ),
      internalDigest: await calculateDirectoryFingerprint(internalDirectory),
      skillDigest: await calculateDirectoryFingerprint(skillDirectory),
    };
    await captureQualificationProjectSnapshot(project, snapshotDirectory);
    await Promise.all([
      writeJsonFileAtomically(path.join(caseArtifactDirectory, 'actor-output.json'), {
        outcome: 'completed',
        summary: 'Completed the task.',
        commands: [],
        changedFiles: ['project.txt'],
        observations: [],
        unresolved: [],
      }),
      writeJsonFileAtomically(path.join(caseArtifactDirectory, 'actor-evidence.json'), {
        role: 'actor',
        createdAt: '2026-08-20T00:00:00.000Z',
        durationMs: 10,
        usage: null,
        cacheKey: '0'.repeat(64),
        sourceAttemptId: 'attempt',
        cacheSourceAttemptId: null,
      }),
    ]);
    await writeFile(path.join(workspaceDirectory, 'project.txt'), 'interrupted state\n', 'utf8');
    await writeFile(path.join(workspaceDirectory, 'unexpected.txt'), 'remove me\n', 'utf8');

    const restored = await restoreActorModelStage({
      caseArtifactDirectory,
      project,
      snapshotDirectory,
    });

    expect(restored.output.changedFiles).toStrictEqual(['project.txt']);
    expect(await readFile(path.join(workspaceDirectory, 'project.txt'), 'utf8')).toBe(
      'post-actor state\n',
    );
    await expect(readFile(path.join(workspaceDirectory, 'unexpected.txt'), 'utf8')).rejects.toThrow(
      /ENOENT/u,
    );
  });
});
