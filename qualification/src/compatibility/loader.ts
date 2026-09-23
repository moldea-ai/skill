import semver from 'semver';

import { QUALIFICATION_PROFILES_ROOT } from '../constants/index.ts';
import { QualificationSelectionSchema, type IQualificationSelection } from '../contracts/index.ts';
import {
  calculateQualificationProfileDigest,
  calculateQualificationTargetDigest,
} from '../execution/fingerprints.ts';
import { loadQualificationCaseCatalog, loadQualificationProfile } from '../profiles/index.ts';
import {
  findQualificationProfileTarget,
  loadQualificationProfileIndex,
  resolveQualificationProfileDirectory,
} from '../storage/index.ts';
import {
  type IQualificationImplementation,
  type IResolvedQualificationTarget,
  type IRuntimeCompatibilityMatrix,
} from './types.ts';
import { getRuntimeCompatibilityMatrix, readRuntimeCompatibilitySnapshot } from './snapshot.ts';

/** Reads the strict qualification matrix from the reviewed local publication snapshot. */
export const loadRuntimeCompatibilityMatrix = async (): Promise<IRuntimeCompatibilityMatrix> =>
  getRuntimeCompatibilityMatrix(await readRuntimeCompatibilitySnapshot());

/** Reads the complete reviewed publication snapshot. */
export const loadRuntimeCompatibilitySnapshot = readRuntimeCompatibilitySnapshot;

/** Lists every matrix adapter and implementation with an explicit local availability reason. */
export const listQualificationImplementations = async (): Promise<
  IQualificationImplementation[]
> => {
  const matrix = await loadRuntimeCompatibilityMatrix();
  const profileIndex = await loadQualificationProfileIndex();
  const implementations: IQualificationImplementation[] = [];

  for (const [adapterId, adapter] of Object.entries(matrix.adapters)) {
    if (adapter.targets === undefined || adapter.targets.length === 0) {
      implementations.push({
        adapterId,
        implementationId: null,
        implementationPackage: adapter.implementation.package,
        implementationStatus: adapter.implementationStatus,
        hasProfile: false,
        disabledReason: 'No available compatibility target is defined.',
      });
      continue;
    }

    for (const target of adapter.targets) {
      const hasProfile =
        findQualificationProfileTarget(profileIndex, {
          adapterId,
          implementationId: target.id,
        }) !== null;
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
  compatibilityMatrix?: IRuntimeCompatibilityMatrix,
): Promise<IResolvedQualificationTarget> => {
  const selection = QualificationSelectionSchema.parse(candidateSelection);
  const matrix = compatibilityMatrix ?? (await loadRuntimeCompatibilityMatrix());
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

  const profileDirectory = await resolveQualificationProfileDirectory(
    selection,
    QUALIFICATION_PROFILES_ROOT,
  );
  const profile = await loadQualificationProfile(profileDirectory);

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

  const requiredRuntimePackageNames = (target.packages ?? [])
    .filter(({ ecosystem }) => ecosystem === 'npm')
    .map(({ name }) => name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const declaredRuntimePackageNames = (profile.runtimePackages ?? [])
    .map(({ name }) => name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const declaredRuntimePackages = new Map(
    (profile.runtimePackages ?? []).map((runtimePackage) => [runtimePackage.name, runtimePackage]),
  );

  if (new Set(declaredRuntimePackageNames).size !== declaredRuntimePackageNames.length) {
    throw new Error('Qualification profile runtime package names must be unique.');
  }

  const missingRuntimePackageNames = requiredRuntimePackageNames.filter(
    (packageName) => !declaredRuntimePackageNames.includes(packageName),
  );

  if (missingRuntimePackageNames.length > 0) {
    throw new Error(
      `Qualification profile is missing exact target runtime packages: ${missingRuntimePackageNames.join(', ')}.`,
    );
  }

  const incompatibleRuntimePackages = (target.packages ?? [])
    .filter(({ ecosystem }) => ecosystem === 'npm')
    .flatMap(({ name, versionRange }) => {
      const runtimePackage = declaredRuntimePackages.get(name);

      return runtimePackage !== undefined && !semver.satisfies(runtimePackage.version, versionRange)
        ? [`${name}@${runtimePackage.version} does not satisfy ${versionRange}`]
        : [];
    });

  if (incompatibleRuntimePackages.length > 0) {
    throw new Error(
      `Qualification profile has incompatible target runtime packages: ${incompatibleRuntimePackages.join(', ')}.`,
    );
  }

  const caseCatalog = await loadQualificationCaseCatalog(QUALIFICATION_PROFILES_ROOT);
  const catalogCasesById = new Map(
    caseCatalog.cases.map((catalogCase) => [catalogCase.id, catalogCase]),
  );
  const universalCaseIds = caseCatalog.cases
    .filter(({ layer }) => layer === 'universal-baseline')
    .map(({ id }) => id);
  const selectedUniversalCaseIds = caseIds.filter((caseId) => universalCaseIds.includes(caseId));
  const isCustom = selection.adapterId === 'custom' && selection.implementationId === 'custom';

  if (isCustom && selectedUniversalCaseIds.length !== universalCaseIds.length) {
    throw new Error('The Custom qualification profile must own every universal-baseline case.');
  }

  if (!isCustom && selectedUniversalCaseIds.length > 0) {
    throw new Error('Adapter qualification profiles must not duplicate universal-baseline cases.');
  }

  for (const caseId of caseIds) {
    if (!catalogCasesById.has(caseId)) {
      throw new Error(`Qualification profile references undiscovered case ${caseId}.`);
    }
  }

  return {
    selection,
    adapter,
    target,
    matrix,
    profile,
    profileDirectory,
    profileDigest: await calculateQualificationProfileDigest(profileDirectory),
    targetDigest: calculateQualificationTargetDigest(adapter, target),
    caseCatalog,
  };
};
