import { lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

import { QUALIFICATION_PROFILES_ROOT } from '../constants/index.ts';
import {
  QualificationCaseCatalogSchema,
  QualificationCaseScenarioSchema,
  QualificationProfileSchema,
  QualificationProfileSourceSchema,
  type IQualificationCaseCatalog,
  type IQualificationCaseScenario,
  type IQualificationProfile,
  type IQualificationProfileCase,
} from '../contracts/index.ts';
import { loadQualificationProfileIndex } from '../storage/index.ts';
import {
  EXCLUDED_DIRECTORY_NAMES,
  readYamlFile,
  resolveContainedPath,
} from '../../../src/filesystem/index.ts';

const QUALIFICATION_CASE_DIRECTORY_PATTERN = /^c(?<position>[1-9][0-9]*)$/u;
const QUALIFICATION_SCENARIO_FILE = 'scenario.yaml';

type IDiscoveredQualificationCase = {
  profileCase: IQualificationProfileCase;
  scenario: IQualificationCaseScenario;
};

const compareCaseDirectories = (left: string, right: string): number => {
  const leftPosition = Number.parseInt(
    QUALIFICATION_CASE_DIRECTORY_PATTERN.exec(left)?.groups?.['position'] ?? '',
    10,
  );
  const rightPosition = Number.parseInt(
    QUALIFICATION_CASE_DIRECTORY_PATTERN.exec(right)?.groups?.['position'] ?? '',
    10,
  );

  return leftPosition - rightPosition;
};

/** Discovers and validates the case modules owned by one qualification profile. */
export const discoverQualificationProfileCases = async (
  profileDirectory: string,
): Promise<IDiscoveredQualificationCase[]> => {
  const casesDirectory = path.join(profileDirectory, 'cases');
  const entries = await readdir(casesDirectory, { withFileTypes: true });
  const caseDirectoryNames = entries
    .filter(({ name }) => !EXCLUDED_DIRECTORY_NAMES.has(name))
    .map((entry) => {
      if (!entry.isDirectory() || !QUALIFICATION_CASE_DIRECTORY_PATTERN.test(entry.name)) {
        throw new Error(`Qualification case entries must be c-prefixed directories: ${entry.name}`);
      }

      return entry.name;
    })
    .sort(compareCaseDirectories);

  if (caseDirectoryNames.length === 0) {
    throw new Error(`Qualification profile has no discovered cases: ${profileDirectory}`);
  }

  const discoveredCases = await Promise.all(
    caseDirectoryNames.map(async (caseDirectoryName) => {
      const projectDirectory = path.posix.join('cases', caseDirectoryName);
      const scenarioPath = resolveContainedPath(
        profileDirectory,
        path.posix.join(projectDirectory, QUALIFICATION_SCENARIO_FILE),
      );
      const scenarioStats = await lstat(scenarioPath);

      if (!scenarioStats.isFile()) {
        throw new Error(`Qualification scenario must be a regular file: ${scenarioPath}`);
      }

      const scenario = await readYamlFile(scenarioPath, QualificationCaseScenarioSchema);

      return {
        profileCase: {
          id: scenario.id,
          projectDirectory,
          scenarioFile: QUALIFICATION_SCENARIO_FILE,
        },
        scenario,
      };
    }),
  );
  const caseIds = discoveredCases.map(({ scenario }) => scenario.id);

  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error(`Qualification profile contains duplicate case ids: ${profileDirectory}`);
  }

  return discoveredCases;
};

/** Loads one profile and derives its case references from the filesystem. */
export const loadQualificationProfile = async (
  profileDirectory: string,
): Promise<IQualificationProfile> => {
  const [profileSource, discoveredCases] = await Promise.all([
    readYamlFile(path.join(profileDirectory, 'profile.yaml'), QualificationProfileSourceSchema),
    discoverQualificationProfileCases(profileDirectory),
  ]);

  return QualificationProfileSchema.parse({
    ...profileSource,
    cases: discoveredCases.map(({ profileCase }) => profileCase),
  });
};

/** Derives the public qualification case catalog from every discovered scenario. */
export const loadQualificationCaseCatalog = async (
  profilesRoot: string = QUALIFICATION_PROFILES_ROOT,
): Promise<IQualificationCaseCatalog> => {
  const profileIndex = await loadQualificationProfileIndex(profilesRoot);
  const discoveredProfiles = await Promise.all(
    profileIndex.targets.map(async ({ key }) =>
      discoverQualificationProfileCases(resolveContainedPath(profilesRoot, key)),
    ),
  );
  const casesById = new Map<string, IQualificationCaseCatalog['cases'][number]>();

  for (const discoveredCase of discoveredProfiles.flat()) {
    const { challenge, description, id, layer, title } = discoveredCase.scenario;
    const catalogCase = { id, title, layer, description, challenge };
    const existingCase = casesById.get(id);

    if (
      existingCase !== undefined &&
      JSON.stringify(existingCase) !== JSON.stringify(catalogCase)
    ) {
      throw new Error(`Qualification case ${id} has conflicting presentation metadata.`);
    }

    casesById.set(id, catalogCase);
  }

  return QualificationCaseCatalogSchema.parse({
    version: 2,
    cases: [...casesById.values()].sort((left, right) => left.id.localeCompare(right.id, 'en')),
  });
};
