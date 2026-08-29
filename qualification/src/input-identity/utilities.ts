import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { QualificationCaseCatalogSchema } from '../contracts/index.ts';

const TEST_FILE_PATTERN = /\.test-(?:bench|e2e|integration|unit)\.[^/]+$/u;
const TYPE_DECLARATION_FILE_PATTERN = /\.d\.[^/]+$/u;
const NON_BEHAVIORAL_LOCK_FIELDS = new Set(['dev', 'funding', 'license', 'resolved']);

const isPlainRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Recursively orders record fields so formatting and property order cannot affect identity. */
const normalizeRecord = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map(normalizeRecord);
  }
  if (!isPlainRecord(input)) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([fieldName, fieldValue]) => [fieldName, normalizeRecord(fieldValue)]),
  );
};

/** Returns whether a path names a qualification test file. */
export const isQualificationTestFilePath = (relativePath: string): boolean =>
  TEST_FILE_PATTERN.test(relativePath);

/** Returns whether shared evaluator source can change runtime behavior. */
export const isQualificationBehaviorBearingSourcePath = (relativePath: string): boolean =>
  !isQualificationTestFilePath(relativePath) && !TYPE_DECLARATION_FILE_PATTERN.test(relativePath);

/**
 * Keeps only production-resolved packages from the qualification npm lockfile.
 * @throws If the lockfile package inventory is malformed.
 */
export const normalizeQualificationRuntimePackageLock = (input: unknown): unknown => {
  if (!isPlainRecord(input) || !isPlainRecord(input['packages'])) {
    throw new Error('Qualification package lock does not contain a packages object.');
  }

  const runtimePackages = Object.fromEntries(
    Object.entries(input['packages'])
      .filter(([packagePath, packageRecord]) => {
        if (packagePath === '') return true;
        if (!isPlainRecord(packageRecord)) {
          throw new Error(`Qualification package lock entry ${packagePath} is invalid.`);
        }
        return packageRecord['dev'] !== true;
      })
      .map(([packagePath, packageRecord]) => {
        if (packagePath !== '' || !isPlainRecord(packageRecord)) {
          return [packagePath, packageRecord];
        }

        return [
          packagePath,
          Object.fromEntries(
            Object.entries(packageRecord).filter(([fieldName]) => fieldName !== 'devDependencies'),
          ),
        ];
      }),
  );

  return normalizeRecord({
    lockfileVersion: input['lockfileVersion'],
    name: input['name'],
    packages: runtimePackages,
    requires: input['requires'],
    version: input['version'],
  });
};

/**
 * Keeps manifest fields that can change how the qualification runtime resolves or starts code.
 * @throws If the package manifest is malformed.
 */
export const normalizeQualificationRuntimePackageManifest = (input: unknown): unknown => {
  if (!isPlainRecord(input)) {
    throw new Error('Qualification package manifest is invalid.');
  }
  const scripts = input['scripts'];

  return normalizeRecord({
    dependencies: input['dependencies'],
    engines: input['engines'],
    scripts: isPlainRecord(scripts) ? { qualification: scripts['qualification'] } : undefined,
    type: input['type'],
  });
};

/**
 * Keeps universal cases and the cases selected by one adapter profile.
 * @throws If the case catalog does not satisfy the qualification contract.
 */
export const normalizeQualificationCaseCatalog = (
  source: string,
  selectedCaseIds: readonly string[],
): unknown => {
  const catalog = QualificationCaseCatalogSchema.parse(parseYaml(source) as unknown);
  const selectedCaseIdSet = new Set(selectedCaseIds);

  return normalizeRecord({
    version: catalog.version,
    cases: catalog.cases.filter(
      ({ id, layer }) => layer === 'universal-baseline' || selectedCaseIdSet.has(id),
    ),
  });
};

const resolveLockedPackagePath = (
  packages: Record<string, unknown>,
  requesterPath: string,
  packageName: string,
): string | null => {
  let searchPath = requesterPath;

  while (true) {
    const candidatePath = path.posix.join(searchPath, 'node_modules', packageName);
    if (packages[candidatePath] !== undefined) {
      return candidatePath;
    }
    if (searchPath === '') {
      return null;
    }

    const parentDependencyIndex = searchPath.lastIndexOf('/node_modules/');
    searchPath = parentDependencyIndex === -1 ? '' : searchPath.slice(0, parentDependencyIndex);
  }
};

const listLockedPackageDependencyNames = (packageRecord: Record<string, unknown>): string[] => {
  const dependencyNames = new Set<string>();

  for (const fieldName of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    const dependencies = packageRecord[fieldName];
    if (!isPlainRecord(dependencies)) continue;
    for (const packageName of Object.keys(dependencies)) dependencyNames.add(packageName);
  }

  return [...dependencyNames].sort((left, right) => left.localeCompare(right, 'en'));
};

/**
 * Keeps the exact installed closure for root packages imported by shared evaluator tooling.
 * @throws If the root lockfile or a selected package entry is malformed.
 */
export const normalizeQualificationToolingPackageLock = (
  input: unknown,
  selectedPackageNames: readonly string[],
): unknown => {
  if (!isPlainRecord(input) || !isPlainRecord(input['packages'])) {
    throw new Error('Qualification tooling package lock does not contain a packages object.');
  }
  const packages = input['packages'];
  const rootPackage = packages[''];
  if (!isPlainRecord(rootPackage)) {
    throw new Error('Qualification tooling package lock does not contain its root package.');
  }

  const selectedPackagePaths = new Set<string>();
  const pendingPackagePaths = selectedPackageNames.map((packageName) => {
    const packagePath = resolveLockedPackagePath(packages, '', packageName);
    if (packagePath === null) {
      throw new Error(`Qualification tooling package lock is missing ${packageName}.`);
    }
    return packagePath;
  });

  while (pendingPackagePaths.length > 0) {
    const packagePath = pendingPackagePaths.shift();
    if (packagePath === undefined || selectedPackagePaths.has(packagePath)) continue;
    const packageRecord = packages[packagePath];
    if (!isPlainRecord(packageRecord)) {
      throw new Error(`Qualification tooling package lock entry ${packagePath} is invalid.`);
    }
    selectedPackagePaths.add(packagePath);

    for (const packageName of listLockedPackageDependencyNames(packageRecord)) {
      const dependencyPath = resolveLockedPackagePath(packages, packagePath, packageName);
      if (dependencyPath !== null && !selectedPackagePaths.has(dependencyPath)) {
        pendingPackagePaths.push(dependencyPath);
      }
    }
  }

  const declaredPackages = Object.fromEntries(
    [...selectedPackageNames]
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((packageName) => {
        const dependencies = isPlainRecord(rootPackage['dependencies'])
          ? rootPackage['dependencies']
          : {};
        const devDependencies = isPlainRecord(rootPackage['devDependencies'])
          ? rootPackage['devDependencies']
          : {};
        const declaredVersion = dependencies[packageName] ?? devDependencies[packageName];
        if (declaredVersion === undefined) {
          throw new Error(`Qualification tooling package lock is missing ${packageName}.`);
        }
        return [packageName, declaredVersion];
      }),
  );
  const selectedPackages = Object.fromEntries(
    [...selectedPackagePaths]
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((packagePath) => {
        const packageRecord = packages[packagePath];
        if (!isPlainRecord(packageRecord)) {
          throw new Error(`Qualification tooling package lock entry ${packagePath} is invalid.`);
        }
        return [
          packagePath,
          Object.fromEntries(
            Object.entries(packageRecord).filter(
              ([fieldName]) => !NON_BEHAVIORAL_LOCK_FIELDS.has(fieldName),
            ),
          ),
        ];
      }),
  );

  return normalizeRecord({
    lockfileVersion: input['lockfileVersion'],
    packages: { '': { packages: declaredPackages }, ...selectedPackages },
  });
};

/**
 * Keeps the declared root package specs imported by shared evaluator tooling.
 * @throws If the root manifest or a selected package declaration is malformed.
 */
export const normalizeQualificationToolingPackageManifest = (
  input: unknown,
  selectedPackageNames: readonly string[],
): unknown => {
  if (!isPlainRecord(input)) {
    throw new Error('Qualification tooling package manifest is invalid.');
  }
  const dependencies = isPlainRecord(input['dependencies']) ? input['dependencies'] : {};
  const devDependencies = isPlainRecord(input['devDependencies']) ? input['devDependencies'] : {};
  const selectedPackages = Object.fromEntries(
    [...selectedPackageNames]
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((packageName) => {
        const declaredVersion = dependencies[packageName] ?? devDependencies[packageName];
        if (declaredVersion === undefined) {
          throw new Error(`Qualification tooling package manifest is missing ${packageName}.`);
        }
        return [packageName, declaredVersion];
      }),
  );

  return normalizeRecord({ packages: selectedPackages });
};
