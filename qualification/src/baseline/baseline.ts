import path from 'node:path';

import { createPublicCandidatePackage } from '../candidate-closure/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  type ICandidateClosure,
  type IQualificationExecutionEnvironment,
  type IQualificationSelection,
} from '../contracts/index.ts';
import { readJsonFile } from '../filesystem/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import { verifyQualificationResults } from '../result/index.ts';
import { QualificationBaselineCheckSchema, type IQualificationBaselineCheck } from './types.ts';

const CUSTOM_SELECTION = {
  adapterId: 'custom',
  implementationId: 'custom',
} as const;

const createFailure = (
  status: 'incompatible' | 'missing',
  failure: string,
): IQualificationBaselineCheck =>
  QualificationBaselineCheckSchema.parse({
    required: true,
    passed: false,
    status,
    baselineAttemptId: null,
    failures: [failure],
  });

const getPublicPackageIdentity = (
  candidate: ICandidateClosure,
): Array<{
  name: string;
  registryIntegrity: string;
  registryShasum: string;
  registryTarballUrl: string;
  sha256: string;
  tarballName: string;
  version: string;
}> =>
  candidate.packages
    .map(createPublicCandidatePackage)
    .sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'));

/**
 * Verifies that adapter qualification is anchored to a passing Custom attempt with identical universal inputs.
 * @returns The baseline decision and immutable attempt identity.
 */
export const inspectQualificationBaseline = async (options: {
  candidate: ICandidateClosure;
  executionEnvironment: IQualificationExecutionEnvironment;
  packagesState: IGitRepositoryState;
  qualificationDigest: string;
  resultsRoot: string;
  selection: IQualificationSelection;
  skillState: IGitRepositoryState;
}): Promise<IQualificationBaselineCheck> => {
  if (
    options.selection.adapterId === CUSTOM_SELECTION.adapterId &&
    options.selection.implementationId === CUSTOM_SELECTION.implementationId
  ) {
    return QualificationBaselineCheckSchema.parse({
      required: false,
      passed: true,
      status: 'not-required',
      baselineAttemptId: null,
      failures: [],
    });
  }

  const verification = await verifyQualificationResults(options.resultsRoot);

  if (!verification.passed) {
    return createFailure(
      'incompatible',
      `Committed qualification evidence is invalid: ${verification.issues.map(({ message, path: issuePath }) => `${issuePath}: ${message}`).join(' ')}`,
    );
  }

  let latest;

  try {
    latest = await readJsonFile(
      path.join(options.resultsRoot, 'custom', 'custom', 'latest.json'),
      QualificationLatestResultSchema,
    );
  } catch {
    return createFailure('missing', 'No committed Custom qualification baseline is available.');
  }

  if (latest.lastPassingAttemptId === null) {
    return createFailure('missing', 'Custom qualification has no passing baseline attempt.');
  }

  const baselineAttemptId = latest.lastPassingAttemptId;
  let baseline;

  try {
    baseline = await readJsonFile(
      path.join(
        options.resultsRoot,
        'custom',
        'custom',
        'attempts',
        baselineAttemptId,
        'attempt.json',
      ),
      QualificationAttemptResultSchema,
    );
  } catch {
    return createFailure(
      'incompatible',
      `Custom baseline attempt ${baselineAttemptId} is missing or invalid.`,
    );
  }

  const expectedPackages = getPublicPackageIdentity(options.candidate);
  const actualPackages = [...baseline.provenance.packages].sort(({ name: left }, { name: right }) =>
    left.localeCompare(right, 'en'),
  );
  const hasCompatibleIdentity =
    baseline.status === 'passed' &&
    baseline.selection.adapterId === CUSTOM_SELECTION.adapterId &&
    baseline.selection.implementationId === CUSTOM_SELECTION.implementationId &&
    baseline.provenance.qualificationDigest === options.qualificationDigest &&
    baseline.provenance.packagesRepositoryCommit === options.packagesState.commit &&
    baseline.provenance.packagesRepositoryFingerprint === options.packagesState.fingerprint &&
    baseline.provenance.skillRepositoryFingerprint === options.skillState.fingerprint &&
    baseline.provenance.model === options.executionEnvironment.model &&
    baseline.provenance.reasoningEffort === options.executionEnvironment.reasoningEffort &&
    baseline.provenance.codexVersion === options.executionEnvironment.codexVersion &&
    baseline.provenance.nodeVersion === options.executionEnvironment.nodeVersion &&
    baseline.provenance.pnpmVersion === options.executionEnvironment.pnpmVersion &&
    baseline.provenance.gitVersion === options.executionEnvironment.gitVersion &&
    JSON.stringify(actualPackages) === JSON.stringify(expectedPackages);

  if (!hasCompatibleIdentity) {
    return createFailure(
      'incompatible',
      `Custom baseline attempt ${baselineAttemptId} does not match the current suite, repositories, execution environment, and published candidate closure.`,
    );
  }

  return QualificationBaselineCheckSchema.parse({
    required: true,
    passed: true,
    status: 'passed',
    baselineAttemptId,
    failures: [],
  });
};
