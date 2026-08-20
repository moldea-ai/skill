import type { ILocalPackageManifest } from './types.ts';

const isMoldeaPackage = (packageName: string): boolean => packageName.startsWith('@moldea.ai/');

/** Resolves local runtime dependencies in deterministic dependency-first order. */
export const resolveRuntimeClosure = (
  manifests: ReadonlyMap<string, ILocalPackageManifest>,
  rootPackageNames: readonly string[],
): ILocalPackageManifest[] => {
  const visited = new Set<string>();
  const ordered: ILocalPackageManifest[] = [];

  const visitPackage = (packageName: string): void => {
    if (visited.has(packageName)) {
      return;
    }

    const manifest = manifests.get(packageName);

    if (manifest === undefined) {
      throw new Error(`Candidate closure requires missing local package ${packageName}.`);
    }

    visited.add(packageName);

    for (const dependencyName of Object.keys(manifest.dependencies)
      .filter(isMoldeaPackage)
      .sort((left, right) => left.localeCompare(right, 'en'))) {
      visitPackage(dependencyName);
    }

    ordered.push(manifest);
  };

  for (const rootPackageName of [...new Set(rootPackageNames)].sort((left, right) =>
    left.localeCompare(right, 'en'),
  )) {
    visitPackage(rootPackageName);
  }

  return ordered;
};

/** Extends a runtime closure with local build-only dependencies in dependency-first order. */
export const resolveBuildClosure = (
  manifests: ReadonlyMap<string, ILocalPackageManifest>,
  runtimeClosure: readonly ILocalPackageManifest[],
): ILocalPackageManifest[] => {
  const visited = new Set<string>();
  const ordered: ILocalPackageManifest[] = [];

  const visitPackage = (manifest: ILocalPackageManifest): void => {
    if (visited.has(manifest.name)) {
      return;
    }

    visited.add(manifest.name);
    const dependencyNames = [
      ...Object.keys(manifest.dependencies),
      ...Object.keys(manifest.devDependencies),
    ]
      .filter(isMoldeaPackage)
      .sort((left, right) => left.localeCompare(right, 'en'));

    for (const dependencyName of dependencyNames) {
      const dependency = manifests.get(dependencyName);

      if (dependency !== undefined) {
        visitPackage(dependency);
      }
    }

    ordered.push(manifest);
  };

  runtimeClosure.forEach(visitPackage);
  return ordered;
};
