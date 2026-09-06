import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import type { z } from 'zod';
import { parse as parseYaml } from 'yaml';

import {
  QualificationCaseCatalogSchema,
  QualificationProbesSchema,
  QualificationProfileSchema,
  QualificationResourceCalibrationSchema,
  QualificationScenarioSchema,
} from './types.ts';
import { resolveContainedPath } from './utilities.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/u;

// exact recorded contracts used to validate one immutable attempt
export interface IRecordedQualificationContract {
  caseScenarios: ReadonlyMap<string, ReturnType<typeof QualificationScenarioSchema.parse>>;
  probeMatrixPaths: string[];
  profileCaseIds: string[];
  resourceProfiles: ReturnType<typeof QualificationResourceCalibrationSchema.parse>['profiles'];
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
 * Reads one contract source from the exact qualification commit retained by an attempt.
 * Synthetic repository fixtures without Git continue to use their adjacent source files.
 * @param options The recorded commit, contract root, qualification root, and relative path.
 * @returns The recorded or synthetic contract source.
 * @throws If the contract path is unsafe or the recorded source cannot be read.
 */
const readRecordedQualificationSource = (options: {
  contractRoot?: 'qualification' | 'repository';
  qualificationRepositoryCommit: string;
  qualificationRoot: string;
  relativePath: string;
}): string => {
  assertAllowedContractPath(options.relativePath);
  const repositoryRoot = dirname(options.qualificationRoot);
  const contractPath = resolveContainedPath(
    options.contractRoot === 'repository' ? repositoryRoot : options.qualificationRoot,
    options.relativePath,
  );

  if (
    !GIT_COMMIT_PATTERN.test(options.qualificationRepositoryCommit) ||
    !existsSync(join(repositoryRoot, '.git'))
  ) {
    return readFileSync(contractPath, 'utf8');
  }

  const repositoryRelativePath = relative(repositoryRoot, contractPath).split(sep).join('/');
  const result = spawnSync(
    'git',
    ['cat-file', 'blob', `${options.qualificationRepositoryCommit}:${repositoryRelativePath}`],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 1_048_576,
      shell: false,
    },
  );

  if (result.error !== undefined || result.status !== 0) {
    throw new Error(
      `Unable to read recorded qualification contract ${options.relativePath} from commit ${options.qualificationRepositoryCommit}.`,
      { cause: result.error ?? new Error(result.stderr) },
    );
  }

  return result.stdout;
};

/** Reads and validates one recorded YAML qualification contract. */
const readRecordedQualificationYaml = <TResult>(options: {
  qualificationRepositoryCommit: string;
  qualificationRoot: string;
  relativePath: string;
  schema: z.ZodType<TResult>;
}): TResult => options.schema.parse(parseYaml(readRecordedQualificationSource(options)) as unknown);

/** Reads and validates one recorded JSON qualification contract. */
const readRecordedQualificationJson = <TResult>(options: {
  contractRoot?: 'qualification' | 'repository';
  qualificationRepositoryCommit: string;
  qualificationRoot: string;
  relativePath: string;
  schema: z.ZodType<TResult>;
}): TResult => {
  const source = readRecordedQualificationSource(options);

  try {
    return options.schema.parse(JSON.parse(source) as unknown);
  } catch (error) {
    throw new Error(`Invalid qualification JSON contract ${options.relativePath}.`, {
      cause: error,
    });
  }
};

const assertUnique = (identities: string[], label: string): void => {
  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} must be unique.`);
  }
};

/**
 * Loads the complete recorded profile, probe, scenario, and resource contract for one attempt.
 * @param options The recorded commit, selected target, and qualification root.
 * @returns The case sequence, probe claims, and scenarios used by the attempt.
 * @throws If the recorded contracts are unavailable, invalid, or internally inconsistent.
 */
export const readRecordedQualificationContract = (options: {
  adapterId: string;
  implementationId: string;
  profileKey: string;
  qualificationRepositoryCommit: string;
  qualificationRoot: string;
}): IRecordedQualificationContract => {
  const profileRelativeDirectory = join('profiles', options.profileKey);
  const readRecordedYaml = <TResult>(
    relativePath: string,
    schema: Parameters<typeof readRecordedQualificationYaml<TResult>>[0]['schema'],
  ): TResult =>
    readRecordedQualificationYaml({
      qualificationRepositoryCommit: options.qualificationRepositoryCommit,
      qualificationRoot: options.qualificationRoot,
      relativePath,
      schema,
    });
  const profile = readRecordedYaml(
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
    `Recorded qualification profile ${options.adapterId}/${options.implementationId} case ids`,
  );
  const profileCaseIds = profile.cases.map(({ id }) => id);
  const profileCaseIdSet = new Set(profileCaseIds);
  const caseCatalog = readRecordedYaml('cases/cases.yaml', QualificationCaseCatalogSchema);
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
  const probes = readRecordedYaml(
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
    `Recorded qualification profile ${options.adapterId}/${options.implementationId} probe ids`,
  );

  for (const probe of probes.probes) {
    if (probe.coveredBy.some((caseId) => !knownCaseIds.has(caseId))) {
      throw new Error(`Recorded qualification probe ${probe.id} references an unknown case.`);
    }
  }

  const caseScenarios = new Map(
    profile.cases.map((profileCase) => {
      const scenario = readRecordedYaml(
        join(profileRelativeDirectory, profileCase.projectDirectory, profileCase.scenarioFile),
        QualificationScenarioSchema,
      );

      if (scenario.id !== profileCase.id) {
        throw new Error(`Qualification case ${profileCase.id} contradicts its recorded profile.`);
      }

      return [profileCase.id, scenario] as const;
    }),
  );
  const resourceCalibration = readRecordedQualificationJson({
    contractRoot: 'repository',
    qualificationRepositoryCommit: options.qualificationRepositoryCommit,
    qualificationRoot: options.qualificationRoot,
    relativePath: join('fixtures', 'resource-calibration.json'),
    schema: QualificationResourceCalibrationSchema,
  });

  return {
    caseScenarios,
    probeMatrixPaths: probes.probes.map(({ matrixPath }) => matrixPath),
    profileCaseIds,
    resourceProfiles: resourceCalibration.profiles,
  };
};
