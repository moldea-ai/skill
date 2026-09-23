import type {
  IQualificationAttemptModel,
  IQualificationCasePresentationModel,
  IQualificationJourneyChapterModel,
  IQualificationJourneyCollectionModel,
  IQualificationJourneyModel,
  IQualificationProfileCaseModel,
  IQualificationProfileModel,
} from './types.ts';

/** Uses presentation metadata recorded directly with the case definition. */
export const resolveQualificationCasePresentation = (
  _adapterId: string,
  _implementationId: string,
  profileCase: IQualificationProfileCaseModel,
  _attemptProfileDigest: string | null,
): IQualificationCasePresentationModel => ({ summary: profileCase.purpose });

const pairAttempt = (
  attempt: IQualificationAttemptModel,
  profileCases: IQualificationProfileCaseModel[],
  adapterId: string,
  implementationId: string,
  origin: IQualificationJourneyModel['origin'],
): IQualificationJourneyModel[] => {
  const casesById = new Map(profileCases.map((profileCase) => [profileCase.id, profileCase]));
  return attempt.cases.map((evidence) => {
    const profileCase = casesById.get(evidence.result.caseId);
    if (profileCase === undefined)
      throw new Error(`Qualification case ${evidence.result.caseId} has no profile definition.`);
    return {
      evidence,
      origin,
      presentation: resolveQualificationCasePresentation(
        adapterId,
        implementationId,
        profileCase,
        attempt.result.provenance.profileDigest,
      ),
      profileCase,
    };
  });
};

/** Builds ordered adapter and shared-foundation chapters from effective evidence. */
export const createQualificationJourneyCollection = (
  profile: IQualificationProfileModel,
): IQualificationJourneyCollectionModel => {
  const isCustom = profile.adapterId === 'custom' && profile.implementationId === 'custom';
  const directAttempt = profile.currentAssurance?.directAttempt ?? profile.currentLatest;
  const baselineAttempt = profile.currentAssurance?.baselineAttempt ?? null;
  const chapters: IQualificationJourneyChapterModel[] = [];
  const attempts =
    directAttempt === null
      ? []
      : baselineAttempt === null
        ? [directAttempt]
        : [baselineAttempt, directAttempt];
  if (directAttempt !== null) {
    const journeys = pairAttempt(
      directAttempt,
      profile.cases,
      profile.adapterId,
      profile.implementationId,
      isCustom ? 'Core behavior' : 'Adapter-specific',
    );
    chapters.push({
      description: isCustom
        ? 'Project-wide behavior every integration relies on.'
        : 'Checks specific to this adapter and its project files.',
      id: isCustom ? 'foundation-journeys' : 'adapter-journeys',
      journeys,
      title: isCustom ? 'Foundation journeys' : 'Adapter journeys',
    });
  }
  if (baselineAttempt !== null && !isCustom) {
    const journeys = pairAttempt(
      baselineAttempt,
      profile.sharedCases,
      'custom',
      'custom',
      'Shared foundation',
    );
    chapters.push({
      description: 'Shared project behavior checked for every adapter.',
      id: 'foundation-journeys',
      journeys,
      title: 'Shared foundation',
    });
  }
  return { attempts, chapters, journeys: chapters.flatMap(({ journeys }) => journeys) };
};
