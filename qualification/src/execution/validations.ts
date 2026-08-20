import type {
  IJudgeOutput,
  IQualificationAttemptCheckpoint,
  IQualificationCaseScenario,
  IQualificationSourceStateResult,
} from '../contracts/index.ts';

import type { IQualificationInputState } from './types.ts';

const formatIds = (ids: readonly string[]): string => ids.join(', ');

/**
 * Inspects whether repository inputs are publishable before an official qualification run.
 * @returns The transparent source-state decision persisted with the attempt.
 */
export const inspectQualificationSourceState = (
  options: {
    isDryRun: boolean;
  } & Pick<IQualificationInputState, 'packagesState' | 'qualificationState' | 'skillState'>,
): IQualificationSourceStateResult => {
  const failures: string[] = [];

  if (!options.isDryRun && options.packagesState.isDirty) {
    failures.push(
      'The packages repository has uncommitted changes. Commit the tested package source before an official qualification run.',
    );
  }

  if (!options.isDryRun && options.qualificationState.isDirty) {
    failures.push(
      'The qualification suite has uncommitted changes. Commit the tested qualification source before an official qualification run.',
    );
  }

  if (!options.isDryRun && options.skillState.isDirty) {
    failures.push(
      'The portable skill has uncommitted changes. Commit the tested skill source before an official qualification run.',
    );
  }

  return {
    passed: failures.length === 0,
    requiresCleanInputs: !options.isDryRun,
    packagesRepositoryDirty: options.packagesState.isDirty,
    qualificationRepositoryDirty: options.qualificationState.isDirty,
    skillRepositoryDirty: options.skillState.isDirty,
    failures,
  };
};

/**
 * Compares current source fingerprints with the attempt checkpoint.
 * @returns Whether any qualification input changed.
 */
export const haveQualificationInputsChanged = (
  checkpoint: Pick<
    IQualificationAttemptCheckpoint,
    'packagesDigest' | 'qualificationDigest' | 'skillDigest'
  >,
  inputState: IQualificationInputState,
): boolean =>
  checkpoint.qualificationDigest !== inputState.qualificationDigest ||
  checkpoint.skillDigest !== inputState.skillState.fingerprint ||
  checkpoint.packagesDigest !== inputState.packagesState.fingerprint;

/**
 * Validates one judge decision against the exact requirements declared by its scenario.
 * @returns The validated judge output.
 * @throws
 * - If requirement identities or verdict and failure states are inconsistent
 */
export const validateJudgeOutput = (
  scenario: IQualificationCaseScenario,
  output: IJudgeOutput,
): IJudgeOutput => {
  const declaredIds = scenario.judgeRequirements.map(({ id }) => id);
  const outputIds = output.requirements.map(({ id }) => id);
  const outputIdSet = new Set(outputIds);
  const duplicateIds = [
    ...new Set(outputIds.filter((id, index) => outputIds.indexOf(id) !== index)),
  ];
  const missingIds = declaredIds.filter((id) => !outputIdSet.has(id));
  const declaredIdSet = new Set(declaredIds);
  const unknownIds = [...outputIdSet].filter((id) => !declaredIdSet.has(id));

  if (duplicateIds.length > 0) {
    throw new Error(`Judge output contains duplicate requirement ids: ${formatIds(duplicateIds)}.`);
  }

  if (missingIds.length > 0) {
    throw new Error(`Judge output is missing declared requirement ids: ${formatIds(missingIds)}.`);
  }

  if (unknownIds.length > 0) {
    throw new Error(`Judge output contains unknown requirement ids: ${formatIds(unknownIds)}.`);
  }

  const failedRequirementIds = output.requirements
    .filter(({ verdict }) => verdict === 'fail')
    .map(({ id }) => id);

  if (output.verdict === 'pass' && failedRequirementIds.length > 0) {
    throw new Error(
      `Judge output passed despite failed requirements: ${formatIds(failedRequirementIds)}.`,
    );
  }

  if (output.verdict === 'pass' && output.failures.length > 0) {
    throw new Error('Judge output passed while reporting actionable failures.');
  }

  if (output.verdict === 'fail' && output.failures.length === 0) {
    throw new Error('Judge output failed without reporting an actionable failure.');
  }

  return output;
};
