import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';

import {
  QualificationProbesSchema,
  QualificationProfileSchema,
  QualificationScenarioSchema,
} from './types.ts';
import { getRepositoryRelativePath, readYamlFile, resolveContainedPath } from './utilities.ts';

const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

// exact profile contract used to validate one immutable attempt
export interface IRecordedQualificationContract {
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
 * Reads one qualification contract from the exact commit recorded by an attempt.
 * Non-repository test fixtures keep using their adjacent contract files.
 * @param options The repository, result root, recorded commit, contract path, and schema.
 * @returns The validated qualification contract.
 * @throws If repository evidence lacks an exact commit or the recorded contract cannot be read.
 */
const readRecordedQualificationYaml = <TResult>(options: {
  qualificationRepositoryCommit: string;
  relativePath: string;
  repositoryRoot: string;
  resultsRoot: string;
  schema: z.ZodType<TResult>;
}): TResult => {
  assertAllowedContractPath(options.relativePath);
  const qualificationRoot = resolve(options.resultsRoot, '..');
  const contractPath = resolveContainedPath(qualificationRoot, options.relativePath);
  const hasRepository = existsSync(join(options.repositoryRoot, '.git'));

  if (!hasRepository) {
    return readYamlFile(contractPath, options.schema);
  }

  if (!GIT_COMMIT_PATTERN.test(options.qualificationRepositoryCommit)) {
    throw new Error('Published qualification evidence lacks an exact source commit.');
  }

  const repositoryRelativePath = getRepositoryRelativePath(options.repositoryRoot, contractPath);

  try {
    const source = execFileSync(
      'git',
      ['cat-file', 'blob', `${options.qualificationRepositoryCommit}:${repositoryRelativePath}`],
      {
        cwd: options.repositoryRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    return options.schema.parse(parseYaml(source) as unknown);
  } catch (error) {
    throw new Error(
      `Unable to read recorded qualification contract ${options.relativePath} from commit ${options.qualificationRepositoryCommit}.`,
      { cause: error },
    );
  }
};

const assertUnique = (identities: string[], label: string): void => {
  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} must be unique.`);
  }
};

/**
 * Loads the complete profile, probe, and scenario contract recorded by one attempt.
 * @param options The selected target, recorded commit, repository, and results root.
 * @returns The case sequence, probe claims, and scenarios used by the attempt.
 * @throws If the recorded contracts are unavailable, invalid, or internally inconsistent.
 */
export const readRecordedQualificationContract = (options: {
  adapterId: string;
  implementationId: string;
  profileKey?: string;
  qualificationRepositoryCommit: string;
  repositoryRoot: string;
  resultsRoot: string;
}): IRecordedQualificationContract => {
  const profileRelativeDirectory = join(
    'profiles',
    options.profileKey ?? join(options.adapterId, options.implementationId),
  );
  const readRecordedYaml = <TResult>(
    relativePath: string,
    schema: Parameters<typeof readRecordedQualificationYaml<TResult>>[0]['schema'],
  ): TResult =>
    readRecordedQualificationYaml({
      qualificationRepositoryCommit: options.qualificationRepositoryCommit,
      relativePath,
      repositoryRoot: options.repositoryRoot,
      resultsRoot: options.resultsRoot,
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
  const profileCaseIdSet = new Set(profileCaseIds);

  for (const probe of probes.probes) {
    if (probe.coveredBy.some((caseId) => !profileCaseIdSet.has(caseId))) {
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

  return {
    caseScenarios,
    probeMatrixPaths: probes.probes.map(({ matrixPath }) => matrixPath),
    profileCaseIds,
  };
};
