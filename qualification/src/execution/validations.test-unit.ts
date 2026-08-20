// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { IJudgeOutput, IQualificationCaseScenario } from '../contracts/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import {
  haveQualificationInputsChanged,
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
  workspace: {
    expectation: 'unchanged',
    mustPreservePaths: [],
    mustChangePaths: [],
    mustExistPaths: [],
    mustNotExistPaths: [],
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
        isDryRun: false,
        ...inputState,
      }),
    ).toStrictEqual({
      passed: true,
      requiresCleanInputs: true,
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
        isDryRun: true,
        packagesState: createRepositoryState(true),
        qualificationState: createRepositoryState(true),
        skillState: createRepositoryState(true),
      }),
    ).toStrictEqual({
      passed: true,
      requiresCleanInputs: false,
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
});
