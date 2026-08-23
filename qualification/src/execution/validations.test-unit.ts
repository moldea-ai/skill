// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type {
  ICandidateClosure,
  IJudgeOutput,
  IQualificationCaseScenario,
  IQualificationExecutionEnvironment,
} from '../contracts/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import {
  haveQualificationInputsChanged,
  haveCandidateClosuresChanged,
  haveQualificationExecutionInputsChanged,
  inspectQualificationSourceState,
  validateJudgeOutput,
} from './validations.ts';

const createRepositoryState = (isDirty: boolean): IGitRepositoryState => ({
  commit: 'fixture-commit',
  fingerprint: 'a'.repeat(64),
  isDirty,
  entries: [],
});

const scenario = {
  version: 1,
  id: 'test-case',
  title: 'Test case',
  purpose: 'Exercise exact judge requirements.',
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
  judgeRequirements: [
    { id: 'requirement-one', description: 'The first requirement passes.' },
    { id: 'requirement-two', description: 'The second requirement passes.' },
  ],
} satisfies IQualificationCaseScenario;

const createRequirement = (
  id: string,
  verdict: 'fail' | 'pass' = 'pass',
): IJudgeOutput['requirements'][number] => ({
  id,
  verdict,
  evidence: `Evidence for ${id}.`,
});

const createPassingOutput = (): IJudgeOutput => ({
  verdict: 'pass',
  summary: 'Every declared requirement passed.',
  requirements: scenario.judgeRequirements.map(({ id }) => createRequirement(id)),
  failures: [],
});

const executionEnvironment: IQualificationExecutionEnvironment = {
  model: 'gpt-5.6-terra',
  reasoningEffort: 'medium',
  codexVersion: 'codex-cli 1',
  nodeVersion: 'v24.15.0',
  pnpmVersion: '11.9.0',
  gitVersion: 'git version 2.51.0',
  allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
  hostTimeoutMs: 120_000,
  modelEndpoint: null,
  sslCertificateFileSha256: null,
};

describe('judge output validation', () => {
  test('accepts an exact and internally consistent pass', () => {
    const output = createPassingOutput();

    expect(validateJudgeOutput(scenario, output)).toBe(output);
  });

  test.each([
    [
      'missing requirement',
      { ...createPassingOutput(), requirements: createPassingOutput().requirements.slice(0, 1) },
      'missing declared requirement ids: requirement-two',
    ],
    [
      'duplicate requirement',
      {
        ...createPassingOutput(),
        requirements: [
          createRequirement('requirement-one'),
          createRequirement('requirement-one'),
          createRequirement('requirement-two'),
        ],
      },
      'duplicate requirement ids: requirement-one',
    ],
    [
      'unknown requirement',
      {
        ...createPassingOutput(),
        requirements: [...createPassingOutput().requirements, createRequirement('unknown')],
      },
      'unknown requirement ids: unknown',
    ],
    [
      'failed requirement under a pass',
      {
        ...createPassingOutput(),
        requirements: [
          createRequirement('requirement-one', 'fail'),
          createRequirement('requirement-two'),
        ],
      },
      'passed despite failed requirements: requirement-one',
    ],
    [
      'reported failure under a pass',
      { ...createPassingOutput(), failures: ['Unexpected failure.'] },
      'passed while reporting actionable failures',
    ],
    [
      'failure without an explanation',
      { ...createPassingOutput(), verdict: 'fail' as const },
      'failed without reporting an actionable failure',
    ],
  ] satisfies ReadonlyArray<readonly [string, IJudgeOutput, string]>)(
    'rejects %s',
    (_description, output, expectedMessage) => {
      expect(() => validateJudgeOutput(scenario, output)).toThrow(expectedMessage);
    },
  );
});

describe('qualification source-state validation', () => {
  test('accepts clean inputs for an official run', () => {
    const inputState = {
      packagesDigest: 'a'.repeat(64),
      packagesState: createRepositoryState(false),
      qualificationDigest: 'a'.repeat(64),
      qualificationState: createRepositoryState(false),
      skillState: createRepositoryState(false),
    };

    expect(
      inspectQualificationSourceState({
        executionEnvironment,
        isDryRun: false,
        ...inputState,
      }),
    ).toStrictEqual({
      passed: true,
      requiresCleanInputs: true,
      isExecutionHostTrusted: true,
      packagesRepositoryDirty: false,
      qualificationRepositoryDirty: false,
      skillRepositoryDirty: false,
      failures: [],
    });
    expect(
      haveQualificationInputsChanged(
        {
          packagesRepositoryFingerprint: 'a'.repeat(64),
          qualificationDigest: 'a'.repeat(64),
          skillDigest: 'a'.repeat(64),
        },
        inputState,
      ),
    ).toBe(false);
  });

  test('permits dirty inputs only for model-free dry runs', () => {
    expect(
      inspectQualificationSourceState({
        executionEnvironment,
        isDryRun: true,
        packagesState: createRepositoryState(true),
        qualificationState: createRepositoryState(true),
        skillState: createRepositoryState(true),
      }),
    ).toStrictEqual({
      passed: true,
      requiresCleanInputs: false,
      isExecutionHostTrusted: true,
      packagesRepositoryDirty: true,
      qualificationRepositoryDirty: true,
      skillRepositoryDirty: true,
      failures: [],
    });
  });

  test.each([
    [true, false, 'packages repository has uncommitted changes'],
    [false, true, 'portable skill has uncommitted changes'],
    [true, true, 'packages repository has uncommitted changes'],
  ])(
    'rejects official inputs with packages dirty=%s and skill dirty=%s',
    (isPackagesDirty, isSkillDirty, expectedFailure) => {
      const result = inspectQualificationSourceState({
        executionEnvironment,
        isDryRun: false,
        packagesState: createRepositoryState(isPackagesDirty),
        qualificationState: createRepositoryState(false),
        skillState: createRepositoryState(isSkillDirty),
      });

      expect(result.passed).toBe(false);
      expect(result.requiresCleanInputs).toBe(true);
      expect(result.failures.join(' ')).toContain(expectedFailure);
    },
  );

  test('rejects an official run from a dirty qualification suite', () => {
    const result = inspectQualificationSourceState({
      executionEnvironment,
      isDryRun: false,
      packagesState: createRepositoryState(false),
      qualificationState: createRepositoryState(true),
      skillState: createRepositoryState(false),
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toStrictEqual([
      'The qualification suite has uncommitted changes. Commit the tested qualification source before an official qualification run.',
    ]);
  });

  test.each([
    ['packages', { packagesRepositoryFingerprint: 'b'.repeat(64) }],
    ['qualification', { qualificationDigest: 'b'.repeat(64) }],
    ['skill', { skillDigest: 'b'.repeat(64) }],
  ])('detects a changed %s fingerprint before publication', (_source, changedDigest) => {
    const inputState = {
      packagesDigest: 'a'.repeat(64),
      packagesState: createRepositoryState(false),
      qualificationDigest: 'a'.repeat(64),
      qualificationState: createRepositoryState(false),
      skillState: createRepositoryState(false),
    };
    const checkpointDigests = {
      packagesRepositoryFingerprint: 'a'.repeat(64),
      qualificationDigest: 'a'.repeat(64),
      skillDigest: 'a'.repeat(64),
      ...changedDigest,
    };

    expect(haveQualificationInputsChanged(checkpointDigests, inputState)).toBe(true);
  });

  test('rejects resume when exact package source changes but its cache digest remains reusable', () => {
    const inputState = {
      packagesDigest: 'a'.repeat(64),
      packagesState: {
        ...createRepositoryState(false),
        fingerprint: 'b'.repeat(64),
      },
      qualificationDigest: 'a'.repeat(64),
      qualificationState: createRepositoryState(false),
      skillState: createRepositoryState(false),
    };

    expect(
      haveQualificationInputsChanged(
        {
          packagesRepositoryFingerprint: 'a'.repeat(64),
          qualificationDigest: 'a'.repeat(64),
          skillDigest: 'a'.repeat(64),
        },
        inputState,
      ),
    ).toBe(true);
  });

  test.each([
    [
      'a custom model endpoint',
      {
        modelEndpoint: {
          origin: 'https://model-gateway.example.com',
          sha256: 'b'.repeat(64),
        },
      },
      'default Codex model transport',
    ],
    [
      'additional egress',
      {
        allowedEgressHosts: [...executionEnvironment.allowedEgressHosts, 'registry.example.com'],
      },
      'cannot expose additional network hosts',
    ],
    [
      'a custom TLS certificate file',
      { sslCertificateFileSha256: 'b'.repeat(64) },
      'cannot use a custom TLS certificate file',
    ],
  ])(
    'rejects official execution through %s',
    (_description, environmentChange, expectedFailure) => {
      const result = inspectQualificationSourceState({
        executionEnvironment: { ...executionEnvironment, ...environmentChange },
        isDryRun: false,
        packagesState: createRepositoryState(false),
        qualificationState: createRepositoryState(false),
        skillState: createRepositoryState(false),
      });

      expect(result.passed).toBe(false);
      expect(result.isExecutionHostTrusted).toBe(false);
      expect(result.failures.join(' ')).toContain(expectedFailure);
    },
  );
});

describe('qualification resume identity validation', () => {
  const candidate: ICandidateClosure = {
    cliJsonSchemaVersion: 2,
    cliVersion: '4.0.0',
    fingerprint: 'a'.repeat(64),
    packages: [
      {
        name: '@moldea.ai/cli',
        version: '1.0.0',
        registryIntegrity: `sha512-${'a'.repeat(86)}`,
        registryShasum: 'c'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-1.0.0.tgz',
        tarballPath: '/cache/cli.tgz',
        tarballName: 'moldea-cli.tgz',
        sha256: 'b'.repeat(64),
      },
    ],
    typeScriptPackage: {
      name: 'typescript',
      version: '6.0.3',
      registryIntegrity: `sha512-${'d'.repeat(86)}`,
      registryShasum: 'e'.repeat(40),
      registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
      tarballPath: '/cache/typescript.tgz',
      tarballName: 'typescript-6.0.3.tgz',
      sha256: 'f'.repeat(64),
    },
    runtimeDirectory: '/attempt/runtime',
  };

  test('rejects changed host tooling while accepting the exact checkpoint identity', () => {
    expect(
      haveQualificationExecutionInputsChanged(executionEnvironment, executionEnvironment),
    ).toBe(false);
    for (const environmentChange of [
      { codexVersion: 'codex-cli 2' },
      { hostTimeoutMs: 240_000 },
      { modelEndpoint: { origin: 'https://api.openai.com', sha256: 'b'.repeat(64) } },
      { allowedEgressHosts: [...executionEnvironment.allowedEgressHosts, 'example.com'] },
      { sslCertificateFileSha256: 'b'.repeat(64) },
    ]) {
      expect(
        haveQualificationExecutionInputsChanged(executionEnvironment, {
          ...executionEnvironment,
          ...environmentChange,
        }),
      ).toBe(true);
    }
  });

  test('rejects changed candidate packages while accepting exact reconstruction', () => {
    expect(haveCandidateClosuresChanged(candidate, candidate)).toBe(false);
    expect(
      haveCandidateClosuresChanged(candidate, {
        ...candidate,
        packages: candidate.packages.map((candidatePackage) => ({
          ...candidatePackage,
          sha256: 'c'.repeat(64),
        })),
      }),
    ).toBe(true);
  });
});
