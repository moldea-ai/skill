import path from 'node:path';

import {
  createCliClosureDigest,
  createPortableSkillBehaviorDigest,
} from '../../../tooling/evidence-identity/index.mjs';
import { hasLocalCarryForward401Qualification } from '../../../tooling/release-identity/carry-forward-4-0-1.mjs';

import { createPublicCandidatePackage } from '../candidate-closure/index.ts';
import { QUALIFICATION_EVIDENCE_PROTOCOL_VERSION } from '../constants/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  type ICandidateClosure,
  type IQualificationExecutionEnvironment,
  type IQualificationSelection,
} from '../contracts/index.ts';
import { readJsonFile } from '../filesystem/index.ts';
import { createQualificationCompatibilityIdentity } from '../evidence-identity/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import { verifyQualificationResults } from '../result/index.ts';
import {
  createQualificationAttemptKey,
  readQualificationAttemptStorage,
  resolveQualificationResultTargetDirectory,
  verifyQualificationAttemptStorage,
} from '../storage/index.ts';
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
  [...candidate.packages, candidate.typeScriptPackage]
    .map(createPublicCandidatePackage)
    .sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'));

const selectExecutionEnvironment = (
  environment: IQualificationExecutionEnvironment,
): IQualificationExecutionEnvironment => ({
  model: environment.model,
  reasoningEffort: environment.reasoningEffort,
  codexVersion: environment.codexVersion,
  nodeVersion: environment.nodeVersion,
  pnpmVersion: environment.pnpmVersion,
  gitVersion: environment.gitVersion,
  allowedEgressHosts: environment.allowedEgressHosts,
  hostTimeoutMs: environment.hostTimeoutMs,
  modelEndpoint: environment.modelEndpoint,
  sslCertificateFileSha256: environment.sslCertificateFileSha256,
});

/**
 * Verifies that adapter qualification is anchored to a passing Custom attempt with identical universal inputs.
 * @returns The baseline decision and immutable attempt identity.
 */
export const inspectQualificationBaseline = async (options: {
  candidate: ICandidateClosure;
  customTargetDigest: string;
  executionEnvironment: IQualificationExecutionEnvironment;
  isDryRun: boolean;
  qualificationBaselineDigest: string;
  resultsRoot: string;
  selection: IQualificationSelection;
  skillState: IGitRepositoryState;
}): Promise<IQualificationBaselineCheck> => {
  if (
    options.isDryRun ||
    (options.selection.adapterId === CUSTOM_SELECTION.adapterId &&
      options.selection.implementationId === CUSTOM_SELECTION.implementationId)
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
  const customTargetRoot = await resolveQualificationResultTargetDirectory(
    options.resultsRoot,
    CUSTOM_SELECTION,
  );

  try {
    latest = await readJsonFile(
      path.join(customTargetRoot, 'latest.json'),
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
  let baselineStorage;
  const baselineAttemptDirectory = path.join(
    customTargetRoot,
    'attempts',
    createQualificationAttemptKey(baselineAttemptId),
  );

  try {
    baseline = await readJsonFile(
      path.join(baselineAttemptDirectory, 'attempt.json'),
      QualificationAttemptResultSchema,
    );
    baselineStorage = await readQualificationAttemptStorage(baselineAttemptDirectory);
    await verifyQualificationAttemptStorage({
      attemptDirectory: baselineAttemptDirectory,
      result: baseline,
      storage: baselineStorage,
    });
  } catch {
    return createFailure(
      'incompatible',
      `Custom baseline attempt ${baselineAttemptId} is missing or invalid.`,
    );
  }

  const expectedPackages = new Map(
    getPublicPackageIdentity(options.candidate).map((candidatePackage) => [
      candidatePackage.name,
      candidatePackage,
    ]),
  );
  const actualPackages = [...baseline.provenance.packages].sort(({ name: left }, { name: right }) =>
    left.localeCompare(right, 'en'),
  );
  let currentCompatibility;
  let currentCliClosureDigest;
  let currentPortableSkillBehaviorDigest;

  try {
    const repositoryRoot = path.resolve(options.resultsRoot, '..', '..');
    currentCompatibility = await createQualificationCompatibilityIdentity({
      qualificationRoot: path.resolve(options.resultsRoot, '..'),
      repositoryRoot,
      selection: baseline.selection,
    });
    currentCliClosureDigest = createCliClosureDigest(repositoryRoot);
    currentPortableSkillBehaviorDigest = createPortableSkillBehaviorDigest(repositoryRoot);
  } catch {
    return createFailure(
      'incompatible',
      `Custom baseline attempt ${baselineAttemptId} cannot resolve current compatibility inputs.`,
    );
  }

  let isCarryForwardAuthorized = baselineStorage.carryForward === undefined;

  if (baselineStorage.carryForward !== undefined) {
    try {
      isCarryForwardAuthorized = hasLocalCarryForward401Qualification({
        repositoryRoot: path.resolve(options.resultsRoot, '..', '..'),
        result: baseline,
        storage: baselineStorage,
      });
    } catch {
      isCarryForwardAuthorized = false;
    }
  }
  const hasSharedPublishedClosure = actualPackages.every(
    (recordedPackage) =>
      JSON.stringify(expectedPackages.get(recordedPackage.name)) ===
      JSON.stringify(recordedPackage),
  );
  const baselineExecutionEnvironment = selectExecutionEnvironment(baseline.provenance);

  const hasCompatibleIdentity =
    latest.protocolVersion === QUALIFICATION_EVIDENCE_PROTOCOL_VERSION &&
    baseline.protocolVersion === QUALIFICATION_EVIDENCE_PROTOCOL_VERSION &&
    baseline.status === 'passed' &&
    baseline.selection.adapterId === CUSTOM_SELECTION.adapterId &&
    baseline.selection.implementationId === CUSTOM_SELECTION.implementationId &&
    JSON.stringify(baselineStorage.compatibility) === JSON.stringify(currentCompatibility) &&
    currentCompatibility.qualificationBaselineEvaluatorDigest ===
      options.qualificationBaselineDigest &&
    baseline.provenance.targetDigest === options.customTargetDigest &&
    baselineStorage.portableSkillBehaviorDigest === currentPortableSkillBehaviorDigest &&
    baselineStorage.cliClosureDigest === currentCliClosureDigest &&
    isCarryForwardAuthorized &&
    JSON.stringify(baselineExecutionEnvironment) === JSON.stringify(options.executionEnvironment) &&
    hasSharedPublishedClosure;

  if (!hasCompatibleIdentity) {
    return createFailure(
      'incompatible',
      `Custom baseline attempt ${baselineAttemptId} does not match the current universal suite, Custom target, portable skill, execution environment, and published candidate closure.`,
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
