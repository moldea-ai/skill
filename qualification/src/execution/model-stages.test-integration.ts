// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
} from '../../../tooling/codex-evaluation-host/index.mjs';

import { FakeCodexHost } from '../codex-host/index.ts';
import type {
  ICandidateClosure,
  IDeterministicVerification,
  IJudgeOutput,
  IQualificationCaseScenario,
  IQualificationExecutionEnvironment,
  IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  collectDirectoryFingerprintEntries,
  ensureDirectory,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import {
  captureQualificationProjectSnapshot,
  captureQualificationWorkspaceSnapshot,
  MOUNTED_SKILL_RELATIVE_PATH,
  QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES,
  restoreQualificationWorkspaceSnapshot,
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
    allowedChangePathPatterns: [],
    mustChangePathPatterns: [],
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

  test('reports the observed expected-fixture paths for pattern-based dry runs', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const scenarioDirectory = path.join(temporaryRoot, 'scenario');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const snapshotDirectory = path.join(temporaryRoot, 'snapshot');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    const candidateDirectory = path.join(workspaceDirectory, 'node_modules', 'candidate');
    const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
    const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
    const manifestPath = path.join(workspaceDirectory, 'moldea', 'moldea.yaml');
    const expectedManifestPath = path.join(scenarioDirectory, 'expected', 'moldea', 'moldea.yaml');
    const expectedGuidancePath = path.join(
      scenarioDirectory,
      'expected',
      'moldea',
      'runtimes',
      'actor-selected.md',
    );
    await Promise.all([
      ensureDirectory(candidateDirectory),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(internalDirectory),
      ensureDirectory(skillDirectory),
      ensureDirectory(path.dirname(manifestPath)),
      ensureDirectory(path.dirname(expectedGuidancePath)),
      ensureDirectory(runtimeDirectory),
    ]);
    await Promise.all([
      writeFile(path.join(candidateDirectory, 'index.js'), 'candidate runtime\n', 'utf8'),
      writeFile(path.join(internalDirectory, 'task.md'), 'Runner-owned task\n', 'utf8'),
      writeFile(path.join(skillDirectory, 'SKILL.md'), '# Mounted skill\n', 'utf8'),
      writeFile(manifestPath, 'version: 1\nagents: {}\n', 'utf8'),
      writeFile(
        expectedManifestPath,
        'version: 1\nagents:\n  support:\n    runtime:\n      guidance: /moldea/runtimes/actor-selected.md\n',
        'utf8',
      ),
      writeFile(expectedGuidancePath, '# Actor-selected guidance\n', 'utf8'),
    ]);
    const patternedScenario = {
      ...scenario,
      expectedDirectory: 'expected',
      workspace: {
        ...scenario.workspace,
        expectation: 'changed',
        mustChangePaths: ['moldea/moldea.yaml'],
        allowedChangePaths: ['moldea/moldea.yaml'],
        allowedChangePathPatterns: ['moldea/runtimes/**/*.md'],
        mustChangePathPatterns: ['moldea/runtimes/**/*.md'],
      },
    } satisfies IQualificationCaseScenario;
    const project: IPreparedQualificationProject = {
      profileCase: {
        id: patternedScenario.id,
        projectDirectory: 'projects/test-case',
        scenarioFile: 'scenario.yaml',
      },
      scenario: patternedScenario,
      scenarioDirectory,
      workspaceDirectory,
      taskPath: path.join(internalDirectory, 'task.md'),
      baselineCommit: 'fixture',
      beforeActorFiles: await collectDirectoryFingerprintEntries(workspaceDirectory, {
        excludedDirectoryNames: new Set(QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES),
        excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
      }),
      candidateRuntimeDigest: await calculateDirectoryFingerprint(
        path.join(workspaceDirectory, 'node_modules'),
      ),
      internalDigest: await calculateDirectoryFingerprint(internalDirectory),
      skillDigest: await calculateDirectoryFingerprint(skillDirectory),
    };
    const candidate: ICandidateClosure = {
      cliJsonSchemaVersion: 2,
      cliVersion: '4.0.0',
      fingerprint: 'c'.repeat(64),
      packages: [],
      typeScriptPackage: {
        name: 'typescript',
        version: '6.0.3',
        registryIntegrity: `sha512-${'d'.repeat(86)}`,
        registryShasum: 'e'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
        tarballPath: '/candidate/typescript.tgz',
        tarballName: 'typescript-6.0.3.tgz',
        sha256: 'f'.repeat(64),
      },
      runtimeDirectory,
    };

    const result = await executeActorModelStage({
      adapterId: 'vercel-ai-sdk',
      approvePaidExecution: () => Promise.reject(new Error('Dry runs must not request approval.')),
      attemptDirectory: temporaryRoot,
      attemptId: 'attempt',
      candidate,
      caseArtifactDirectory,
      executionEnvironment: {
        model: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        codexVersion: 'codex-cli fake',
        nodeVersion: process.version,
        pnpmVersion: '11.9.0',
        gitVersion: 'git version test',
        allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
        hostTimeoutMs: 120_000,
        modelEndpoint: null,
        sslCertificateFileSha256: null,
      },
      host: new FakeCodexHost(),
      implementationId: 'typescript-generate-stream-text-7',
      isDryRun: true,
      packagesRepository: '/packages',
      profileDigest: 'd'.repeat(64),
      qualificationDigest: 'e'.repeat(64),
      project,
      skillDigest: 'f'.repeat(64),
      targetDigest: '1'.repeat(64),
      skillRepository: '/skill',
      snapshotDirectory,
      task: 'Record the static-analysis boundary.',
      trialId: 'initial',
      useCache: false,
      verifyExecutionInputs: () => Promise.resolve(),
    });

    expect(result.output.changedFiles).toStrictEqual([
      'moldea/moldea.yaml',
      'moldea/runtimes/actor-selected.md',
    ]);
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
      typeScriptPackage: {
        name: 'typescript',
        version: '6.0.3',
        registryIntegrity: `sha512-${'d'.repeat(86)}`,
        registryShasum: 'e'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
        tarballPath: '/candidate/typescript.tgz',
        tarballName: 'typescript-6.0.3.tgz',
        sha256: 'f'.repeat(64),
      },
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
          model: 'gpt-5.6-sol',
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
        trialId: 'initial',
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
        trialId: 'initial',
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
      typeScriptPackage: {
        name: 'typescript',
        version: '6.0.3',
        registryIntegrity: `sha512-${'d'.repeat(86)}`,
        registryShasum: 'e'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
        tarballPath: '/candidate/typescript.tgz',
        tarballName: 'typescript-6.0.3.tgz',
        sha256: 'f'.repeat(64),
      },
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
          model: 'gpt-5.6-sol',
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
        trialId: 'initial',
        useCache: false,
        verifyExecutionInputs: () => {
          callOrder.push('verify');
          return Promise.resolve();
        },
      }),
    ).rejects.toThrow('The project-local candidate runtime was modified after preparation.');
    expect(callOrder).toStrictEqual(['verify', 'approval', 'actor', 'verify']);
  });

  test('restores pristine pre-actor state before retrying a safe host failure', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-retry-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const preActorSnapshotDirectory = path.join(temporaryRoot, 'pre-actor');
    const postActorSnapshotDirectory = path.join(temporaryRoot, 'post-actor');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    const candidateDirectory = path.join(workspaceDirectory, 'node_modules', 'candidate');
    const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
    const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
    const projectFile = path.join(workspaceDirectory, 'project.txt');
    await Promise.all([
      ensureDirectory(candidateDirectory),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(internalDirectory),
      ensureDirectory(runtimeDirectory),
      ensureDirectory(skillDirectory),
    ]);
    await Promise.all([
      writeFile(path.join(candidateDirectory, 'index.js'), 'candidate runtime\n', 'utf8'),
      writeFile(path.join(internalDirectory, 'task.md'), 'Runner-owned task\n', 'utf8'),
      writeFile(path.join(skillDirectory, 'SKILL.md'), '# Mounted skill\n', 'utf8'),
      writeFile(projectFile, 'pristine\n', 'utf8'),
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
      beforeActorFiles: await collectDirectoryFingerprintEntries(workspaceDirectory, {
        excludedDirectoryNames: new Set(QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES),
        excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
      }),
      candidateRuntimeDigest: await calculateDirectoryFingerprint(
        path.join(workspaceDirectory, 'node_modules'),
      ),
      internalDigest: await calculateDirectoryFingerprint(internalDirectory),
      skillDigest: await calculateDirectoryFingerprint(skillDirectory),
    };
    await captureQualificationWorkspaceSnapshot(workspaceDirectory, preActorSnapshotDirectory);
    const observedStates: string[] = [];
    const retryFailureCounts: number[] = [];
    const retryDelays: number[] = [];
    let actorCalls = 0;
    const host = new FakeCodexHost({
      actor: async () => {
        actorCalls += 1;
        observedStates.push(await readFile(projectFile, 'utf8'));

        if (actorCalls === 1) {
          await writeFile(projectFile, 'failed attempt mutation\n', 'utf8');
          throw new CodexEvaluationHostError(
            CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
            'Retryable fixture failure.',
          );
        }

        return {
          output: {
            outcome: 'completed',
            summary: 'Completed after retry.',
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

    const result = await executeActorModelStage({
      adapterId: 'custom',
      approvePaidExecution: () => Promise.resolve(),
      attemptDirectory: temporaryRoot,
      attemptId: 'attempt',
      candidate: {
        cliJsonSchemaVersion: 2,
        cliVersion: '4.0.0',
        fingerprint: 'c'.repeat(64),
        packages: [],
        typeScriptPackage: {
          name: 'typescript',
          version: '6.0.3',
          registryIntegrity: `sha512-${'d'.repeat(86)}`,
          registryShasum: 'e'.repeat(40),
          registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
          tarballPath: '/candidate/typescript.tgz',
          tarballName: 'typescript-6.0.3.tgz',
          sha256: 'f'.repeat(64),
        },
        runtimeDirectory,
      },
      caseArtifactDirectory,
      executionEnvironment: {
        model: 'gpt-5.6-sol',
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
      isDryRun: true,
      onOperationalRetry: (retry) => {
        retryFailureCounts.push(retry.failureCount);
        return Promise.resolve();
      },
      operationalRetry: {
        now: () => '2026-08-27T16:00:00.000Z',
        random: () => 1,
        wait: (delayMs) => {
          retryDelays.push(delayMs);
          return Promise.resolve();
        },
      },
      packagesRepository: '/packages',
      profileDigest: 'd'.repeat(64),
      qualificationDigest: 'e'.repeat(64),
      project,
      restorePreActorState: () =>
        restoreQualificationWorkspaceSnapshot(workspaceDirectory, preActorSnapshotDirectory),
      skillDigest: 'f'.repeat(64),
      targetDigest: '1'.repeat(64),
      skillRepository: '/skill',
      snapshotDirectory: postActorSnapshotDirectory,
      task: 'Complete the test task.',
      trialId: 'initial',
      useCache: false,
      verifyExecutionInputs: () => Promise.resolve(),
    });

    expect(result.output.summary).toBe('Completed after retry.');
    expect(observedStates).toStrictEqual(['pristine\n', 'pristine\n']);
    expect(retryFailureCounts).toStrictEqual([1]);
    expect(retryDelays).toStrictEqual([5_000]);
  });

  test('recreates the independent judge workspace before retrying a safe host failure', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-judge-stage-retry-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const judgeWorkspaceDirectory = path.join(temporaryRoot, 'judge-workspace');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    const candidateDirectory = path.join(workspaceDirectory, 'node_modules', 'candidate');
    const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
    const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
    const projectFile = path.join(workspaceDirectory, 'project.txt');
    await Promise.all([
      ensureDirectory(candidateDirectory),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(internalDirectory),
      ensureDirectory(runtimeDirectory),
      ensureDirectory(skillDirectory),
    ]);
    await Promise.all([
      writeFile(path.join(candidateDirectory, 'index.js'), 'candidate runtime\n', 'utf8'),
      writeFile(path.join(internalDirectory, 'task.md'), 'Runner-owned task\n', 'utf8'),
      writeFile(path.join(skillDirectory, 'SKILL.md'), '# Mounted skill\n', 'utf8'),
      writeFile(projectFile, 'pristine\n', 'utf8'),
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
      beforeActorFiles: await collectDirectoryFingerprintEntries(workspaceDirectory, {
        excludedDirectoryNames: new Set(QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES),
        excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
      }),
      candidateRuntimeDigest: await calculateDirectoryFingerprint(
        path.join(workspaceDirectory, 'node_modules'),
      ),
      internalDigest: await calculateDirectoryFingerprint(internalDirectory),
      skillDigest: await calculateDirectoryFingerprint(skillDirectory),
    };
    const observedStates: string[] = [];
    const retryFailureCounts: number[] = [];
    const retryDelays: number[] = [];
    let judgeCalls = 0;
    const host = new FakeCodexHost({
      judge: async (input) => {
        judgeCalls += 1;
        const independentProjectFile = path.join(input.workspaceDirectory, 'project.txt');
        observedStates.push(await readFile(independentProjectFile, 'utf8'));

        if (judgeCalls === 1) {
          await writeFile(independentProjectFile, 'failed judge mutation\n', 'utf8');
          throw new CodexEvaluationHostError(
            CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
            'Retryable judge fixture failure.',
          );
        }

        return {
          output: {
            verdict: 'pass',
            summary: 'Accepted after retry.',
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'pass',
              evidence: 'The recreated independent workspace is pristine.',
            })),
            failures: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        };
      },
    });

    const result = await executeJudgeModelStage({
      actorOutput: {
        outcome: 'completed',
        summary: 'Completed the test task.',
        commands: [],
        changedFiles: [],
        observations: [],
        unresolved: [],
      },
      adapterId: 'custom',
      approvePaidExecution: () => Promise.resolve(),
      attemptDirectory: temporaryRoot,
      attemptId: 'attempt',
      candidate: {
        cliJsonSchemaVersion: 2,
        cliVersion: '4.0.0',
        fingerprint: 'c'.repeat(64),
        packages: [],
        typeScriptPackage: {
          name: 'typescript',
          version: '6.0.3',
          registryIntegrity: `sha512-${'d'.repeat(86)}`,
          registryShasum: 'e'.repeat(40),
          registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
          tarballPath: '/candidate/typescript.tgz',
          tarballName: 'typescript-6.0.3.tgz',
          sha256: 'f'.repeat(64),
        },
        runtimeDirectory,
      },
      caseArtifactDirectory,
      deterministicAfter,
      executionEnvironment: {
        model: 'gpt-5.6-sol',
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
      isDryRun: true,
      judgeWorkspaceDirectory,
      onOperationalRetry: (retry) => {
        retryFailureCounts.push(retry.failureCount);
        return Promise.resolve();
      },
      operationalRetry: {
        now: () => '2026-08-27T16:00:00.000Z',
        random: () => 1,
        wait: (delayMs) => {
          retryDelays.push(delayMs);
          return Promise.resolve();
        },
      },
      packagesRepository: '/packages',
      profileDigest: 'd'.repeat(64),
      qualificationDigest: 'e'.repeat(64),
      project,
      skillDigest: 'f'.repeat(64),
      targetDigest: '1'.repeat(64),
      skillRepository: '/skill',
      task: 'Complete the test task.',
      trialId: 'initial',
      useCache: false,
      verifyExecutionInputs: () => Promise.resolve(),
      workspaceAssertions,
    });

    expect(result.output.summary).toBe('Accepted after retry.');
    expect(observedStates).toStrictEqual(['pristine\n', 'pristine\n']);
    expect(await readFile(projectFile, 'utf8')).toBe('pristine\n');
    expect(retryFailureCounts).toStrictEqual([1]);
    expect(retryDelays).toStrictEqual([5_000]);
  });

  test('restores failed initial model evidence from cache while keeping confirmations fresh', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-cache-recovery-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const cacheRoot = path.join(temporaryRoot, 'cache');
    const sourceArtifactDirectory = path.join(temporaryRoot, 'source-artifacts');
    const cachedArtifactDirectory = path.join(temporaryRoot, 'cached-artifacts');
    const confirmationArtifactDirectory = path.join(temporaryRoot, 'confirmation-artifacts');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    const candidateDirectory = path.join(workspaceDirectory, 'node_modules', 'candidate');
    const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
    const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
    await Promise.all([
      ensureDirectory(candidateDirectory),
      ensureDirectory(sourceArtifactDirectory),
      ensureDirectory(cachedArtifactDirectory),
      ensureDirectory(confirmationArtifactDirectory),
      ensureDirectory(internalDirectory),
      ensureDirectory(runtimeDirectory),
      ensureDirectory(skillDirectory),
    ]);
    await Promise.all([
      writeFile(path.join(candidateDirectory, 'index.js'), 'candidate runtime\n', 'utf8'),
      writeFile(path.join(internalDirectory, 'task.md'), 'Runner-owned task\n', 'utf8'),
      writeFile(path.join(skillDirectory, 'SKILL.md'), '# Mounted skill\n', 'utf8'),
      writeFile(path.join(workspaceDirectory, 'project.txt'), 'pristine\n', 'utf8'),
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
      beforeActorFiles: await collectDirectoryFingerprintEntries(workspaceDirectory, {
        excludedDirectoryNames: new Set(QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES),
        excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
      }),
      candidateRuntimeDigest: await calculateDirectoryFingerprint(
        path.join(workspaceDirectory, 'node_modules'),
      ),
      internalDigest: await calculateDirectoryFingerprint(internalDirectory),
      skillDigest: await calculateDirectoryFingerprint(skillDirectory),
    };
    const candidate: ICandidateClosure = {
      cliJsonSchemaVersion: 2,
      cliVersion: '4.0.0',
      fingerprint: 'c'.repeat(64),
      packages: [],
      typeScriptPackage: {
        name: 'typescript',
        version: '6.0.3',
        registryIntegrity: `sha512-${'d'.repeat(86)}`,
        registryShasum: 'e'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
        tarballPath: '/candidate/typescript.tgz',
        tarballName: 'typescript-6.0.3.tgz',
        sha256: 'f'.repeat(64),
      },
      runtimeDirectory,
    };
    const executionEnvironment: IQualificationExecutionEnvironment = {
      model: 'gpt-5.6-sol',
      reasoningEffort: 'medium',
      codexVersion: 'codex-cli test',
      nodeVersion: process.version,
      pnpmVersion: '11.9.0',
      gitVersion: 'git version test',
      allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
      hostTimeoutMs: 120_000,
      modelEndpoint: null,
      sslCertificateFileSha256: null,
    };
    const commonOptions = {
      adapterId: 'custom',
      approvePaidExecution: () => Promise.resolve(),
      attemptDirectory: temporaryRoot,
      cacheRoot,
      candidate,
      executionEnvironment,
      implementationId: 'custom',
      isDryRun: false,
      packagesRepository: '/packages',
      profileDigest: 'd'.repeat(64),
      qualificationDigest: 'e'.repeat(64),
      project,
      skillDigest: 'f'.repeat(64),
      targetDigest: '1'.repeat(64),
      skillRepository: '/skill',
      task: 'Complete the test task.',
      verifyExecutionInputs: () => Promise.resolve(),
    };
    let sourceActorCalls = 0;
    let sourceJudgeCalls = 0;
    const sourceHost = new FakeCodexHost({
      actor: (input) => {
        sourceActorCalls += 1;
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: 'Completed the initial trial.',
            commands: [],
            changedFiles: [],
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: (input) => {
        sourceJudgeCalls += 1;
        return Promise.resolve({
          output: {
            verdict: 'fail',
            summary: 'The cached initial semantic decision failed.',
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'fail',
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
    const sourceActor = await executeActorModelStage({
      ...commonOptions,
      attemptId: 'source-attempt',
      caseArtifactDirectory: sourceArtifactDirectory,
      host: sourceHost,
      snapshotDirectory: path.join(temporaryRoot, 'source-actor-snapshot'),
      trialId: 'initial',
      useCache: true,
    });
    const sourceJudge = await executeJudgeModelStage({
      ...commonOptions,
      actorOutput: sourceActor.output,
      attemptId: 'source-attempt',
      caseArtifactDirectory: sourceArtifactDirectory,
      deterministicAfter,
      host: sourceHost,
      judgeWorkspaceDirectory: path.join(temporaryRoot, 'source-judge-workspace'),
      trialId: 'initial',
      useCache: true,
      workspaceAssertions,
    });
    let unexpectedCachedCalls = 0;
    const cachedHost = new FakeCodexHost({
      actor: () => {
        unexpectedCachedCalls += 1;
        return Promise.reject(new Error('Cached initial actor evidence should avoid execution.'));
      },
      judge: () => {
        unexpectedCachedCalls += 1;
        return Promise.reject(new Error('Cached initial judge evidence should avoid execution.'));
      },
    });
    const cachedActor = await executeActorModelStage({
      ...commonOptions,
      attemptId: 'current-attempt',
      caseArtifactDirectory: cachedArtifactDirectory,
      host: cachedHost,
      snapshotDirectory: path.join(temporaryRoot, 'cached-actor-snapshot'),
      trialId: 'initial',
      useCache: true,
    });
    const cachedJudge = await executeJudgeModelStage({
      ...commonOptions,
      actorOutput: cachedActor.output,
      attemptId: 'current-attempt',
      caseArtifactDirectory: cachedArtifactDirectory,
      deterministicAfter,
      host: cachedHost,
      judgeWorkspaceDirectory: path.join(temporaryRoot, 'cached-judge-workspace'),
      trialId: 'initial',
      useCache: true,
      workspaceAssertions,
    });
    let confirmationActorCalls = 0;
    let confirmationJudgeCalls = 0;
    const confirmationHost = new FakeCodexHost({
      actor: (input) => {
        confirmationActorCalls += 1;
        return Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: 'Completed the fresh confirmation.',
            commands: [],
            changedFiles: [],
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
      judge: (input) => {
        confirmationJudgeCalls += 1;
        return Promise.resolve({
          output: {
            verdict: 'pass',
            summary: 'The fresh confirmation passed.',
            requirements: input.scenario.judgeRequirements.map(({ id }) => ({
              id,
              verdict: 'pass',
              evidence: 'The fresh confirmation passed.',
            })),
            failures: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        });
      },
    });
    const confirmationActor = await executeActorModelStage({
      ...commonOptions,
      attemptId: 'current-attempt',
      caseArtifactDirectory: confirmationArtifactDirectory,
      host: confirmationHost,
      snapshotDirectory: path.join(temporaryRoot, 'confirmation-actor-snapshot'),
      trialId: 'confirmation-1',
      useCache: false,
    });
    const confirmationJudge = await executeJudgeModelStage({
      ...commonOptions,
      actorOutput: confirmationActor.output,
      attemptId: 'current-attempt',
      caseArtifactDirectory: confirmationArtifactDirectory,
      deterministicAfter,
      host: confirmationHost,
      judgeWorkspaceDirectory: path.join(temporaryRoot, 'confirmation-judge-workspace'),
      trialId: 'confirmation-1',
      useCache: false,
      workspaceAssertions,
    });

    expect(sourceActorCalls).toBe(1);
    expect(sourceJudgeCalls).toBe(1);
    expect(sourceJudge.output.verdict).toBe('fail');
    expect(unexpectedCachedCalls).toBe(0);
    expect(cachedActor.evidence.cacheSourceAttemptId).toBe('source-attempt');
    expect(cachedJudge.evidence.cacheSourceAttemptId).toBe('source-attempt');
    expect(cachedJudge.output.verdict).toBe('fail');
    expect(confirmationActorCalls).toBe(1);
    expect(confirmationJudgeCalls).toBe(1);
    expect(confirmationActor.evidence.cacheSourceAttemptId).toBeNull();
    expect(confirmationJudge.evidence.cacheSourceAttemptId).toBeNull();
    expect(confirmationJudge.output.verdict).toBe('pass');
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
        trialId: 'initial',
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
