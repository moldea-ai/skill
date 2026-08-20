import { access } from 'node:fs/promises';
import path from 'node:path';

import {
  DEFAULT_PACKAGES_REPOSITORY,
  QUALIFICATION_CASES_PATH,
  QUALIFICATION_PROFILES_ROOT,
} from '../constants/index.ts';
import {
  QualificationCaseCatalogSchema,
  QualificationProfileSchema,
  QualificationSelectionSchema,
  type IQualificationSelection,
} from '../contracts/index.ts';
import { calculateDirectoryFingerprint, readYamlFile } from '../filesystem/index.ts';
import {
  RuntimeCompatibilityMatrixSchema,
  type IQualificationImplementation,
  type IResolvedQualificationTarget,
  type IRuntimeCompatibilityMatrix,
} from './types.ts';

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

/** Reads the canonical strict runtime compatibility matrix. */
export const loadRuntimeCompatibilityMatrix = async (
  packagesRepository: string = DEFAULT_PACKAGES_REPOSITORY,
): Promise<IRuntimeCompatibilityMatrix> =>
  readYamlFile(
    path.join(packagesRepository, 'compatibility', 'runtimes.yaml'),
    RuntimeCompatibilityMatrixSchema,
  );

/** Lists every matrix adapter and implementation with an explicit local availability reason. */
export const listQualificationImplementations = async (): Promise<
  IQualificationImplementation[]
> => {
  const matrix = await loadRuntimeCompatibilityMatrix();
  const implementations: IQualificationImplementation[] = [];

  for (const [adapterId, adapter] of Object.entries(matrix.adapters)) {
    if (adapter.targets === undefined || adapter.targets.length === 0) {
      implementations.push({
        adapterId,
        implementationId: null,
        implementationPackage: adapter.implementation.package,
        implementationStatus: adapter.implementationStatus,
        supportLevel: null,
        hasProfile: false,
        disabledReason: 'No available compatibility target is defined.',
      });
      continue;
    }

    for (const target of adapter.targets) {
      const profileDirectory = path.join(QUALIFICATION_PROFILES_ROOT, adapterId, target.id);
      const hasProfile = await pathExists(path.join(profileDirectory, 'profile.yaml'));
      const disabledReason =
        adapter.implementationStatus !== 'available'
          ? `Adapter implementation is ${adapter.implementationStatus}.`
          : hasProfile
            ? null
            : 'Qualification profile has not been implemented yet.';

      implementations.push({
        adapterId,
        implementationId: target.id,
        implementationPackage: adapter.implementation.package,
        implementationStatus: adapter.implementationStatus,
        supportLevel: target.supportLevel,
        hasProfile,
        disabledReason,
      });
    }
  }

  return implementations;
};

/** Resolves one exact adapter target and validates its committed profile and case catalog. */
export const resolveQualificationTarget = async (
  candidateSelection: IQualificationSelection,
  packagesRepository: string = DEFAULT_PACKAGES_REPOSITORY,
): Promise<IResolvedQualificationTarget> => {
  const selection = QualificationSelectionSchema.parse(candidateSelection);
  const matrix = await loadRuntimeCompatibilityMatrix(packagesRepository);
  const adapter = matrix.adapters[selection.adapterId];

  if (adapter === undefined) {
    throw new Error(`Unknown runtime adapter: ${selection.adapterId}`);
  }

  if (adapter.implementationStatus !== 'available') {
    throw new Error(
      `Adapter ${selection.adapterId} is ${adapter.implementationStatus} and cannot be qualified.`,
    );
  }

  const target = adapter.targets?.find(({ id }) => id === selection.implementationId);

  if (target === undefined) {
    throw new Error(
      `Adapter ${selection.adapterId} has no implementation target ${selection.implementationId}.`,
    );
  }

  const profileDirectory = path.join(
    QUALIFICATION_PROFILES_ROOT,
    selection.adapterId,
    selection.implementationId,
  );
  const profile = await readYamlFile(
    path.join(profileDirectory, 'profile.yaml'),
    QualificationProfileSchema,
  );

  if (
    profile.adapterId !== selection.adapterId ||
    profile.implementationId !== selection.implementationId
  ) {
    throw new Error('Qualification profile identity does not match its selected matrix target.');
  }

  const caseIds = profile.cases.map(({ id }) => id);

  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error('Qualification profile case ids must be unique.');
  }

  const caseCatalog = await readYamlFile(QUALIFICATION_CASES_PATH, QualificationCaseCatalogSchema);
  const catalogCaseIds = new Set(caseCatalog.cases.map(({ id }) => id));
  const missingCaseIds = caseCatalog.cases
    .map(({ id }) => id)
    .filter((caseId) => !caseIds.includes(caseId));

  if (missingCaseIds.length > 0) {
    throw new Error(
      `Qualification profile is missing required semantic cases: ${missingCaseIds.join(', ')}.`,
    );
  }

  for (const caseId of caseIds) {
    if (!catalogCaseIds.has(caseId)) {
      throw new Error(`Qualification profile references uncataloged case ${caseId}.`);
    }
  }

  return {
    selection,
    adapter,
    target,
    matrix,
    profile,
    profileDirectory,
    profileDigest: await calculateDirectoryFingerprint(profileDirectory),
    caseCatalog,
  };
};
