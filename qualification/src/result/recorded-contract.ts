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
import {
  getRuntimeCompatibilityMatrix,
  readAttemptCompatibilitySnapshot,
  RuntimeCompatibilitySnapshotSchema,
  validateRuntimeCompatibilitySnapshot,
  type IRuntimeCompatibilitySnapshot,
} from '../compatibility/index.ts';
import { deriveRequiredQualificationClaims } from '../coverage/index.ts';
import { calculateQualificationTargetDigest } from '../execution/fingerprints.ts';
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
  version: z.literal(2),
  compatibilitySnapshot: RuntimeCompatibilitySnapshotSchema,
  profiles: z.array(RecordedProfileSchema).min(1).max(2),
  resourceCalibration: QualificationResourceCalibrationSchema,
});

export type IRecordedQualificationContract = z.infer<typeof RecordedQualificationContractSchema>;

/**
 * Checks an embedded publication against the attempt's selected target and probe contract.
 * @throws
 * - Recorded compatibility snapshot contradicts attempt provenance.
 * - Recorded compatibility snapshot lacks the selected target.
 * - Recorded compatibility target contradicts attempt provenance.
 * - Recorded compatibility target has no selected profile.
 * - Recorded compatibility claims contradict the selected profile probes.
 */
export const assertRecordedQualificationCompatibility = (options: {
  contract: IRecordedQualificationContract;
  provenance: {
    compatibilitySnapshot: Pick<IRuntimeCompatibilitySnapshot, 'sourceUrl' | 'sha256'>;
    targetDigest: string;
  };
  selection: IQualificationSelection;
}): void => {
  const snapshot = validateRuntimeCompatibilitySnapshot(options.contract.compatibilitySnapshot);
  if (
    snapshot.sourceUrl !== options.provenance.compatibilitySnapshot.sourceUrl ||
    snapshot.sha256 !== options.provenance.compatibilitySnapshot.sha256
  ) {
    throw new Error('Recorded compatibility snapshot contradicts attempt provenance.');
  }
  const matrix = getRuntimeCompatibilityMatrix(snapshot);
  const adapter = matrix.adapters[options.selection.adapterId];
  const target = adapter?.targets?.find(({ id }) => id === options.selection.implementationId);
  if (adapter?.implementationStatus !== 'available' || target === undefined) {
    throw new Error('Recorded compatibility snapshot lacks the selected target.');
  }
  if (calculateQualificationTargetDigest(adapter, target) !== options.provenance.targetDigest) {
    throw new Error('Recorded compatibility target contradicts attempt provenance.');
  }
  const profile = options.contract.profiles.find(
    ({ profile: candidate }) =>
      candidate.adapterId === options.selection.adapterId &&
      candidate.implementationId === options.selection.implementationId,
  );
  if (profile === undefined) {
    throw new Error('Recorded compatibility target has no selected profile.');
  }
  const expectedClaims = deriveRequiredQualificationClaims(adapter, target);
  const recordedClaims = profile.probes.probes.map(({ matrixPath }) => matrixPath).sort();
  if (JSON.stringify(expectedClaims) !== JSON.stringify(recordedClaims)) {
    throw new Error('Recorded compatibility claims contradict the selected profile probes.');
  }
};

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
 * @throws
 * - Qualification recording requires selected and Custom profile definitions.
 * - Captured compatibility snapshot does not match the attempt identity.
 */
export const createRecordedQualificationContract = async (options: {
  attemptDirectory: string;
  compatibilitySnapshot: Pick<IRuntimeCompatibilitySnapshot, 'sourceUrl' | 'sha256'>;
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
  const compatibilitySnapshot = await readAttemptCompatibilitySnapshot(
    options.attemptDirectory,
    options.compatibilitySnapshot,
  );

  return RecordedQualificationContractSchema.parse({
    version: 2,
    compatibilitySnapshot,
    profiles,
    resourceCalibration,
  });
};
