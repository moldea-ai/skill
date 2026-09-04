import { join } from 'node:path';

import type { z } from 'zod';

import {
  QualificationCaseCatalogSchema,
  QualificationProbesSchema,
  QualificationProfileSchema,
  QualificationScenarioSchema,
} from './types.ts';
import { readYamlFile, resolveContainedPath } from './utilities.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

// exact current profile contract used to validate one attempt
export interface ICurrentQualificationContract {
  caseScenarios: ReadonlyMap<string, ReturnType<typeof QualificationScenarioSchema.parse>>;
  probeMatrixPaths: string[];
  profileCaseIds: string[];
}

const assertAllowedContractPath = (relativePath: string): void => {
  const excludedSegment = relativePath
    .split(/[\\/]/u)
    .find((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment));

  if (excludedSegment !== undefined) {
    throw new Error(`Qualification contract path enters excluded directory ${excludedSegment}.`);
  }
};

/**
 * Reads one qualification contract from the current release tree.
 * @param options The qualification root, contract path, and schema.
 * @returns The validated qualification contract.
 * @throws If the current contract path is unsafe or cannot be read.
 */
const readCurrentQualificationYaml = <TResult>(options: {
  qualificationRoot: string;
  relativePath: string;
  schema: z.ZodType<TResult>;
}): TResult => {
  assertAllowedContractPath(options.relativePath);
  const contractPath = resolveContainedPath(options.qualificationRoot, options.relativePath);
  return readYamlFile(contractPath, options.schema);
};

const assertUnique = (identities: string[], label: string): void => {
  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} must be unique.`);
  }
};

/**
 * Loads the complete current profile, probe, and scenario contract for one attempt.
 * @param options The selected target and qualification root.
 * @returns The case sequence, probe claims, and scenarios used by the attempt.
 * @throws If the current contracts are unavailable, invalid, or internally inconsistent.
 */
export const readCurrentQualificationContract = (options: {
  adapterId: string;
  implementationId: string;
  profileKey?: string;
  qualificationRoot: string;
}): ICurrentQualificationContract => {
  const profileRelativeDirectory = join(
    'profiles',
    options.profileKey ?? join(options.adapterId, options.implementationId),
  );
  const readCurrentYaml = <TResult>(
    relativePath: string,
    schema: Parameters<typeof readCurrentQualificationYaml<TResult>>[0]['schema'],
  ): TResult =>
    readCurrentQualificationYaml({
      qualificationRoot: options.qualificationRoot,
      relativePath,
      schema,
    });
  const profile = readCurrentYaml(
    join(profileRelativeDirectory, 'profile.yaml'),
    QualificationProfileSchema,
  );

  if (
    profile.adapterId !== options.adapterId ||
    profile.implementationId !== options.implementationId
  ) {
    throw new Error('Qualification evidence does not match its recorded profile.');
  }

  assertUnique(
    profile.cases.map(({ id }) => id),
    `Current qualification profile ${options.adapterId}/${options.implementationId} case ids`,
  );
  const profileCaseIds = profile.cases.map(({ id }) => id);
  const profileCaseIdSet = new Set(profileCaseIds);
  const caseCatalog = readCurrentYaml('cases/cases.yaml', QualificationCaseCatalogSchema);
  const universalCaseIds = caseCatalog.cases
    .filter(({ layer }) => layer === 'universal-baseline')
    .map(({ id }) => id);
  const isCustomProfile = options.adapterId === 'custom' && options.implementationId === 'custom';
  const knownCaseIds = new Set([...(isCustomProfile ? [] : universalCaseIds), ...profileCaseIds]);
  const invalidUniversalCaseIds = universalCaseIds.filter((caseId) =>
    isCustomProfile ? !profileCaseIdSet.has(caseId) : profileCaseIdSet.has(caseId),
  );

  if (invalidUniversalCaseIds.length > 0) {
    throw new Error(
      isCustomProfile
        ? `Custom qualification is missing universal cases: ${invalidUniversalCaseIds.join(', ')}.`
        : `Adapter qualification duplicates universal cases: ${invalidUniversalCaseIds.join(', ')}.`,
    );
  }
  const probes = readCurrentYaml(
    join(profileRelativeDirectory, profile.probesFile),
    QualificationProbesSchema,
  );

  if (
    probes.adapterId !== options.adapterId ||
    probes.implementationId !== options.implementationId
  ) {
    throw new Error('Qualification evidence does not match its recorded probes.');
  }

  assertUnique(
    probes.probes.map(({ id }) => id),
    `Current qualification profile ${options.adapterId}/${options.implementationId} probe ids`,
  );

  for (const probe of probes.probes) {
    if (probe.coveredBy.some((caseId) => !knownCaseIds.has(caseId))) {
      throw new Error(`Current qualification probe ${probe.id} references an unknown case.`);
    }
  }

  const caseScenarios = new Map(
    profile.cases.map((profileCase) => {
      const scenario = readCurrentYaml(
        join(profileRelativeDirectory, profileCase.projectDirectory, profileCase.scenarioFile),
        QualificationScenarioSchema,
      );

      if (scenario.id !== profileCase.id) {
        throw new Error(`Qualification case ${profileCase.id} contradicts its current profile.`);
      }

      return [profileCase.id, scenario] as const;
    }),
  );

  return {
    caseScenarios,
    probeMatrixPaths: probes.probes.map(({ matrixPath }) => matrixPath),
    profileCaseIds,
  };
};
