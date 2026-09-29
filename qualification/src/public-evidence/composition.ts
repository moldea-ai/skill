import { createHash } from 'node:crypto';
import path from 'node:path';

import { z } from 'zod';

import {
  createEvidenceBundle,
  type IEvidenceArtifactInput,
  type IEvidenceBundle,
} from '../../../src/evidence/index.ts';
import type {
  IQualificationAttemptCaseModel,
  IQualificationAttemptModel,
  IQualificationJourneyModel,
  IQualificationProfileCaseModel,
  IQualificationProfileModel,
  IQualificationWebsiteModel,
} from './types.ts';
import { parseQualificationWebsiteModel } from './validation.ts';

const CaseKeySchema = z.strictObject({
  adapterId: z.string().min(1),
  caseId: z.string().min(1),
  implementationId: z.string().min(1),
});

/** Optional manual case choices for a collection of recorded qualification bundles. */
export const QualificationCompositionReviewSchema = z.strictObject({
  caseSources: z
    .array(
      CaseKeySchema.extend({ attemptId: z.string().min(1).optional(), runId: z.string().min(1) }),
    )
    .default([]),
  formatVersion: z.literal(1),
  includeCases: z.array(CaseKeySchema).nullable().default(null),
});

export type IQualificationCompositionReview = z.infer<typeof QualificationCompositionReviewSchema>;

type ISource = { bundle: IEvidenceBundle; model: IQualificationWebsiteModel };
type ICaseKey = z.infer<typeof CaseKeySchema>;
type IPickedCase = {
  attempt: IQualificationAttemptModel;
  evidence: IQualificationAttemptCaseModel;
  profileCase: IQualificationProfileCaseModel;
  sourceIndex: number;
};

const profileKey = ({ adapterId, implementationId }: Omit<ICaseKey, 'caseId'>): string =>
  `${adapterId}/${implementationId}`;
const caseKey = (key: ICaseKey): string => `${profileKey(key)}/${key.caseId}`;

const isPassingCase = (evidence: IQualificationAttemptCaseModel): boolean =>
  evidence.result.status === 'passed' || evidence.result.status === 'recovered';

const findCase = (
  source: ISource,
  key: ICaseKey,
  attemptId?: string,
): Omit<IPickedCase, 'sourceIndex'> | null => {
  const profile = source.model.profiles.find(
    (candidate) => profileKey(candidate) === profileKey(key),
  );
  const profileCase = profile?.cases.find(({ id }) => id === key.caseId);
  if (profileCase === undefined || profile === undefined) return null;
  const selectedJourney = profile.selectedJourneys?.find(
    ({ evidence }) => evidence.result.caseId === key.caseId,
  );
  if (profile.selectedJourneys !== undefined && selectedJourney === undefined) return null;
  const availableAttempts = profile.selectedAttempts ?? profile.attempts;
  for (const attempt of [...availableAttempts].reverse()) {
    if (attemptId !== undefined && attempt.result.attemptId !== attemptId) continue;
    if (selectedJourney !== undefined && selectedJourney.sourceAttemptUrl !== attempt.rawAttemptUrl)
      continue;
    const evidence = attempt.cases.find(({ result }) => result.caseId === key.caseId);
    if (evidence !== undefined)
      return {
        attempt,
        evidence: selectedJourney?.evidence ?? evidence,
        profileCase: selectedJourney?.profileCase ?? profileCase,
      };
  }
  return null;
};

const chooseCase = (
  sources: readonly ISource[],
  key: ICaseKey,
  review: IQualificationCompositionReview,
): IPickedCase | null => {
  const selected = review.caseSources.find((candidate) => caseKey(candidate) === caseKey(key));
  const choices = sources.flatMap((source, sourceIndex) => {
    if (selected !== undefined && source.bundle.run.attemptId !== selected.runId) return [];
    const found = findCase(source, key, selected?.attemptId);
    return found === null ? [] : [{ ...found, sourceIndex }];
  });
  if (selected !== undefined) return choices[0] ?? null;
  return choices.find(({ evidence }) => isPassingCase(evidence)) ?? choices[0] ?? null;
};

const distinctAttempts = (picks: readonly IPickedCase[]): IPickedCase[] => [
  ...new Map(
    picks.map((picked) => [`${picked.sourceIndex}/${picked.attempt.result.attemptId}`, picked]),
  ).values(),
];

const createAssetMapper = (sources: readonly ISource[]) => {
  const assets = new Map<string, IEvidenceArtifactInput>();
  const assetPrefix = '/evidence-assets/qualification/';
  const sourceFiles = sources.map(
    ({ bundle }) => new Map(bundle.artifacts.files.map((file) => [file.path, file])),
  );
  const sourceBlobs = sources.map(
    ({ bundle }) => new Map(bundle.artifacts.blobs.map((blob) => [blob.sha256, blob])),
  );
  const mapString = (sourceIndex: number, input: string): string => {
    if (!input.startsWith(assetPrefix)) return input;
    const sourcePath = input.slice(assetPrefix.length);
    const file = sourceFiles[sourceIndex]?.get(sourcePath);
    const blob = file === undefined ? undefined : sourceBlobs[sourceIndex]?.get(file.sha256);
    if (file === undefined || blob === undefined) {
      throw new Error(`Qualification selection lacks referenced artifact ${sourcePath}.`);
    }
    const suffix = path.posix.extname(sourcePath).slice(0, 8);
    const fileName = `${createHash('sha256').update(sourcePath).digest('hex').slice(0, 32)}${suffix}`;
    const destinationPath = `s/${sourceIndex}/${fileName}`;
    assets.set(destinationPath, {
      content: Buffer.from(blob.contentBase64, 'base64'),
      mediaType: file.mediaType,
      path: destinationPath,
    });
    return `${assetPrefix}${destinationPath}`;
  };
  const mapUnknown = (sourceIndex: number, input: unknown): unknown => {
    if (typeof input === 'string') return mapString(sourceIndex, input);
    if (Array.isArray(input))
      return (input as unknown[]).map((item) => mapUnknown(sourceIndex, item));
    if (input === null || typeof input !== 'object') return input;
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, mapUnknown(sourceIndex, value)]),
    );
  };
  const map = <T>(sourceIndex: number, input: T): T => mapUnknown(sourceIndex, input) as T;
  return { assets, map };
};

/** Combines explicitly selected recorded cases without imposing current skill or profile identity. */
export const composeQualificationEvidenceBundle = (options: {
  attemptId: string;
  review: IQualificationCompositionReview;
  sources: readonly IEvidenceBundle[];
}): IEvidenceBundle => {
  const { attemptId, review } = options;
  if (options.sources.length === 0) throw new Error('Qualification selection needs source runs.');
  const runIds = options.sources.map(({ run }) => run.attemptId);
  if (new Set(runIds).size !== runIds.length) {
    throw new Error('Qualification selection requires distinct source runs.');
  }
  const sources: ISource[] = options.sources.map((bundle) => {
    if (bundle.kind !== 'qualification' || bundle.classification !== 'official') {
      throw new Error('Qualification selection requires recorded official sources.');
    }
    const payload = bundle.payload as { websiteModel?: unknown };
    return { bundle, model: parseQualificationWebsiteModel(payload.websiteModel) };
  });
  const selectedKeys =
    review.includeCases === null ? null : new Set(review.includeCases.map(caseKey));
  if (selectedKeys !== null && selectedKeys.size !== review.includeCases?.length) {
    throw new Error('Qualification included cases must be unique.');
  }
  const sourceChoices = new Map(review.caseSources.map((choice) => [caseKey(choice), choice]));
  if (sourceChoices.size !== review.caseSources.length) {
    throw new Error('Qualification case source choices must be unique.');
  }
  const availableKeys = new Map<string, ICaseKey>();
  const primaryProfiles = new Map<
    string,
    { profile: IQualificationProfileModel; sourceIndex: number }
  >();
  for (const [sourceIndex, source] of sources.entries()) {
    for (const profile of source.model.profiles) {
      const targetKey = profileKey(profile);
      if (!primaryProfiles.has(targetKey)) primaryProfiles.set(targetKey, { profile, sourceIndex });
      for (const profileCase of profile.cases) {
        const key = {
          adapterId: profile.adapterId,
          implementationId: profile.implementationId,
          caseId: profileCase.id,
        };
        availableKeys.set(caseKey(key), key);
      }
    }
  }
  for (const key of [...(selectedKeys ?? []), ...sourceChoices.keys()]) {
    if (!availableKeys.has(key) || (selectedKeys !== null && !selectedKeys.has(key))) {
      throw new Error(`Qualification selection names an unavailable case ${key}.`);
    }
  }
  const picks = new Map<string, IPickedCase>();
  for (const [key, caseIdentity] of availableKeys) {
    if (selectedKeys !== null && !selectedKeys.has(key)) continue;
    const picked = chooseCase(sources, caseIdentity, review);
    if (picked === null) {
      if (selectedKeys !== null || sourceChoices.has(key)) {
        throw new Error(`Qualification case ${key} has no selected recorded result.`);
      }
      continue;
    }
    picks.set(key, picked);
  }
  if (picks.size === 0) throw new Error('Qualification selection has no recorded cases.');
  const { assets, map } = createAssetMapper(sources);
  const customKey = 'custom/custom';
  const customPicks = [...picks.entries()]
    .filter(([key]) => key.startsWith(`${customKey}/`))
    .map(([, picked]) => picked);
  const profiles: IQualificationProfileModel[] = [];
  for (const [targetKey, { profile: primary, sourceIndex }] of primaryProfiles) {
    const direct = [...picks.entries()]
      .filter(([key]) => key.startsWith(`${targetKey}/`))
      .map(([, picked]) => picked);
    if (review.includeCases !== null && direct.length === 0) continue;
    const shared = targetKey === customKey ? [] : customPicks;
    const journeys: IQualificationJourneyModel[] = [...direct, ...shared].map((picked) => ({
      evidence: map(picked.sourceIndex, picked.evidence),
      origin:
        targetKey === customKey
          ? 'Core behavior'
          : direct.includes(picked)
            ? 'Adapter-specific'
            : 'Shared foundation',
      presentation: { summary: picked.profileCase.purpose },
      profileCase: map(picked.sourceIndex, picked.profileCase),
      sourceAttemptUrl: map(picked.sourceIndex, picked.attempt.rawAttemptUrl),
    }));
    const attempts = distinctAttempts(direct).map((picked) =>
      map(picked.sourceIndex, picked.attempt),
    );
    const selectedAttempts = distinctAttempts([...direct, ...shared]).map((picked) =>
      map(picked.sourceIndex, picked.attempt),
    );
    const status =
      direct.length === 0
        ? 'not-recorded'
        : direct.some(({ evidence }) => !isPassingCase(evidence))
          ? 'failed'
          : 'passed';
    profiles.push({
      adapterId: primary.adapterId,
      attempts,
      boundBaseline: null,
      cases: direct.map((picked) => map(picked.sourceIndex, picked.profileCase)),
      currentAssurance: null,
      currentLastPassing:
        attempts.filter(({ result }) => result.status === 'passed').at(-1) ?? null,
      currentLatest: attempts.at(-1) ?? null,
      currentStatus: status,
      description: primary.description,
      implementationId: primary.implementationId,
      latest: null,
      probes: map(sourceIndex, primary.probes),
      probesSourceUrl: map(sourceIndex, primary.probesSourceUrl),
      route: primary.route,
      runtimePackages: primary.runtimePackages,
      selectedAttempts,
      selectedJourneys: journeys,
      sharedCases: shared.map((picked) => map(picked.sourceIndex, picked.profileCase)),
      sourceUrl: map(sourceIndex, primary.sourceUrl),
      title: primary.title,
    });
  }
  profiles.sort((left, right) => profileKey(left).localeCompare(profileKey(right), 'en'));
  const websiteModel: IQualificationWebsiteModel = {
    profiles,
    route: '/evidence/qualification/',
    uniqueJourneyCount: profiles.reduce((count, profile) => count + profile.cases.length, 0),
  };
  parseQualificationWebsiteModel(websiteModel);
  const statuses = profiles.map(({ currentStatus }) => currentStatus);
  const status = statuses.every((value) => value === 'passed')
    ? 'passed'
    : statuses.some((value) => value === 'failed')
      ? 'failed'
      : 'incomplete';
  const evaluatedAt = [...picks.values()]
    .map(({ attempt }) => attempt.result.completedAt ?? attempt.result.createdAt)
    .sort()
    .at(-1);
  if (evaluatedAt === undefined) throw new Error('Qualification selection has no evaluation time.');
  const versions = [...new Set(options.sources.map(({ run }) => run.version))];
  const selectionRecord = {
    formatVersion: 1,
    review,
    sources: options.sources.map(({ run }) => ({ attemptId: run.attemptId, version: run.version })),
  };
  return createEvidenceBundle({
    artifacts: [
      ...assets.values(),
      {
        content: Buffer.from(`${JSON.stringify(selectionRecord, null, 2)}\n`),
        mediaType: 'application/json',
        path: 'composition.json',
      },
    ],
    classification: 'official',
    kind: 'qualification',
    payload: { websiteModel },
    run: {
      attemptId,
      evaluatedAt,
      provenance: {
        composition: 'selected-recorded-cases',
        sourceUrl: 'https://github.com/moldea-ai/skill',
      },
      status,
      version: versions.length === 1 ? versions[0]! : 'multiple releases',
    },
  });
};
