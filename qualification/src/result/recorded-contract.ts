import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import {
  QualificationCaseScenarioSchema,
  QualificationProbesSchema,
  QualificationProfileSchema,
  QualificationResourceCalibrationSchema,
  type IQualificationSelection,
} from '../contracts/index.ts';
import { loadQualificationProfile } from '../profiles/index.ts';
import {
  findQualificationProfileTarget,
  loadQualificationProfileIndex,
  resolveQualificationProfilesRootForResults,
} from '../storage/index.ts';
import {
  calculateSha256,
  listDirectoryFiles,
  readJsonFile,
  readYamlFile,
  resolveContainedPath,
} from '../../../src/filesystem/index.ts';

const RecordedProfileFileSchema = z.strictObject({
  content: z.string(),
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

const RecordedProfileSchema = z.strictObject({
  key: z.string().regex(/^t[1-9][0-9]*$/u),
  files: z.array(RecordedProfileFileSchema),
  profile: QualificationProfileSchema,
  probes: QualificationProbesSchema,
  scenarios: z.array(QualificationCaseScenarioSchema).min(1),
});

/** Self-contained qualification inputs captured with one completed local run. */
export const RecordedQualificationContractSchema = z.strictObject({
  version: z.literal(1),
  profiles: z.array(RecordedProfileSchema).min(1).max(2),
  resourceCalibration: QualificationResourceCalibrationSchema,
});

export type IRecordedQualificationContract = z.infer<typeof RecordedQualificationContractSchema>;

const captureProfile = async (
  profilesRoot: string,
  key: string,
): Promise<z.infer<typeof RecordedProfileSchema>> => {
  const profileDirectory = resolveContainedPath(profilesRoot, key);
  const profile = await loadQualificationProfile(profileDirectory);
  const probes = await readYamlFile(
    resolveContainedPath(profileDirectory, profile.probesFile),
    QualificationProbesSchema,
  );
  const scenarios = await Promise.all(
    profile.cases.map(({ projectDirectory, scenarioFile }) =>
      readYamlFile(
        resolveContainedPath(profileDirectory, path.posix.join(projectDirectory, scenarioFile)),
        QualificationCaseScenarioSchema,
      ),
    ),
  );
  const files = await Promise.all(
    (await listDirectoryFiles(profileDirectory)).map(async (relativePath) => {
      const content = await readFile(resolveContainedPath(profileDirectory, relativePath), 'utf8');
      return { content, path: relativePath, sha256: calculateSha256(content) };
    }),
  );

  return RecordedProfileSchema.parse({ files, key, probes, profile, scenarios });
};

/**
 * Captures the selected profile, Custom baseline profile, and resource limits for one run.
 * @returns The validated self-contained contract stored beside the completed evidence.
 */
export const createRecordedQualificationContract = async (options: {
  resultsRoot: string;
  selection: IQualificationSelection;
}): Promise<IRecordedQualificationContract> => {
  const profilesRoot = await resolveQualificationProfilesRootForResults(options.resultsRoot);
  const qualificationRoot = path.resolve(profilesRoot, '..');
  const repositoryRoot = path.resolve(qualificationRoot, '..');
  const profileIndex = await loadQualificationProfileIndex(profilesRoot);
  const selectedTarget = findQualificationProfileTarget(profileIndex, options.selection);
  const customTarget = findQualificationProfileTarget(profileIndex, {
    adapterId: 'custom',
    implementationId: 'custom',
  });
  if (selectedTarget === null || customTarget === null) {
    throw new Error('Qualification recording requires selected and Custom profile definitions.');
  }
  const profileKeys = [...new Set([selectedTarget.key, customTarget.key])];
  const [profiles, resourceCalibration] = await Promise.all([
    Promise.all(profileKeys.map((key) => captureProfile(profilesRoot, key))),
    readJsonFile(
      path.join(repositoryRoot, 'fixtures', 'resource-calibration.json'),
      QualificationResourceCalibrationSchema,
    ),
  ]);

  return RecordedQualificationContractSchema.parse({
    version: 1,
    profiles,
    resourceCalibration,
  });
};
