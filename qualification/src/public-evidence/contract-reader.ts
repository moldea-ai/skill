import {
  assertRecordedQualificationCompatibility,
  RecordedQualificationContractSchema,
} from '../result/index.ts';

import {
  QualificationResourceCalibrationSchema,
  QualificationScenarioSchema,
  type IQualificationAttemptResult,
} from './types.ts';

// exact recorded contracts used to validate one immutable attempt
export interface IRecordedQualificationContract {
  caseScenarios: ReadonlyMap<string, ReturnType<typeof QualificationScenarioSchema.parse>>;
  probeMatrixPaths: string[];
  profileCaseIds: string[];
  resourceProfiles: ReturnType<typeof QualificationResourceCalibrationSchema.parse>['profiles'];
}

type IReadAttemptArtifact = (logicalPath: string) => Buffer | undefined;

const assertUnique = (identities: string[], label: string): void => {
  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} must be unique.`);
  }
};

/**
 * Loads the profile, probe, scenario, and resource contract stored with one attempt.
 * @param options The selected target and immutable attempt-artifact reader.
 * @returns The case sequence, probe claims, scenarios, and limits used by the attempt.
 * @throws If the recorded contract is unavailable, invalid, or internally inconsistent.
 */
export const readRecordedQualificationContract = (options: {
  adapterId: string;
  implementationId: string;
  provenance: Pick<
    IQualificationAttemptResult['provenance'],
    'compatibilitySnapshot' | 'targetDigest'
  >;
  readArtifact: IReadAttemptArtifact;
}): IRecordedQualificationContract => {
  const source = options.readArtifact('recorded-contract.json');
  if (source === undefined) {
    throw new Error('Qualification evidence is missing its recorded contract.');
  }

  let input: unknown;
  try {
    input = JSON.parse(source.toString('utf8')) as unknown;
  } catch (error) {
    throw new Error('Qualification evidence has an invalid recorded contract.', { cause: error });
  }

  const contract = RecordedQualificationContractSchema.parse(input);
  assertRecordedQualificationCompatibility({
    contract,
    provenance: options.provenance,
    selection: { adapterId: options.adapterId, implementationId: options.implementationId },
  });
  const selectedProfile = contract.profiles.find(
    ({ profile }) =>
      profile.adapterId === options.adapterId &&
      profile.implementationId === options.implementationId,
  );
  const customProfile = contract.profiles.find(
    ({ profile }) => profile.adapterId === 'custom' && profile.implementationId === 'custom',
  );
  if (selectedProfile === undefined || customProfile === undefined) {
    throw new Error('Qualification evidence does not contain its required recorded profiles.');
  }

  const selectedCaseIds = selectedProfile.profile.cases.map(({ id }) => id);
  const customCaseIds = customProfile.profile.cases.map(({ id }) => id);
  assertUnique(
    selectedCaseIds,
    `Recorded qualification profile ${options.adapterId}/${options.implementationId} case ids`,
  );
  assertUnique(customCaseIds, 'Recorded Custom qualification profile case ids');

  const isCustomProfile = options.adapterId === 'custom' && options.implementationId === 'custom';
  const customCaseIdSet = new Set(customCaseIds);
  const knownCaseIds = new Set([...selectedCaseIds, ...customCaseIds]);
  if (!isCustomProfile && selectedCaseIds.some((caseId) => customCaseIdSet.has(caseId))) {
    throw new Error('Recorded adapter qualification duplicates universal cases.');
  }

  assertUnique(
    selectedProfile.probes.probes.map(({ id }) => id),
    `Recorded qualification profile ${options.adapterId}/${options.implementationId} probe ids`,
  );
  for (const probe of selectedProfile.probes.probes) {
    if (probe.coveredBy.some((caseId) => !knownCaseIds.has(caseId))) {
      throw new Error(`Recorded qualification probe ${probe.id} references an unknown case.`);
    }
  }

  const scenariosById = new Map(
    selectedProfile.scenarios.map((scenario) => {
      const parsedScenario = QualificationScenarioSchema.parse(scenario);
      return [parsedScenario.id, parsedScenario] as const;
    }),
  );
  if (
    scenariosById.size !== selectedCaseIds.length ||
    selectedCaseIds.some((caseId) => !scenariosById.has(caseId))
  ) {
    throw new Error('Qualification evidence contradicts its recorded profile case sequence.');
  }

  return {
    caseScenarios: scenariosById,
    probeMatrixPaths: selectedProfile.probes.probes.map(({ matrixPath }) => matrixPath),
    profileCaseIds: selectedCaseIds,
    resourceProfiles: QualificationResourceCalibrationSchema.parse(contract.resourceCalibration)
      .profiles,
  };
};
