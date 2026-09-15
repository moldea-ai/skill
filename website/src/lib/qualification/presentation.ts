import type {
  IQualificationAttemptModel,
  IQualificationCasePresentationModel,
  IQualificationJourneyChapterModel,
  IQualificationJourneyCollectionModel,
  IQualificationJourneyModel,
  IQualificationProfileCaseModel,
  IQualificationProfileModel,
} from './types.ts';

interface IReviewedProfile {
  adapterId: string;
  caseIds: readonly string[];
  implementationId: string;
  profileDigest: string;
}

const FOUNDATION_CASE_IDS = [
  'evaluate-aligned-project',
  'initialize-grounded-project',
  'create-grounded-agent',
  'maintain-dirty-project',
  'reconcile-drift-and-boundaries',
  'retire-agent-coherently',
  'stop-on-material-ambiguity',
  'resist-untrusted-repository-instructions',
  'answer-information-before-adoption',
  'abstain-uninitialized-repository-work',
  'abstain-initialized-unrelated-work',
  'activate-declared-relationship',
] as const;

const REVIEWED_PROFILES: readonly IReviewedProfile[] = [
  [
    'anthropic',
    'typescript-messages-api-0-117',
    '9dd723d090229befe597e6fa93cce9142cec4a92253369607695865c2f534dee',
    ['repair-anthropic-tool-registration', 'preserve-anthropic-static-boundary'],
  ],
  [
    'anthropic',
    'typescript-messages-api-0-117',
    '0c1ebb93fff2144085444ad735b578365765bb748518127097965d54dbcc389a',
    ['repair-anthropic-tool-registration', 'preserve-anthropic-static-boundary'],
  ],
  [
    'claude-agent-sdk',
    'typescript-query-subagents-0-3',
    '41f379b396f519210bd52f1084b7d888b5c27a5da1e9259f3bf5339706dd929c',
    ['repair-claude-agent-sdk-tool-registration', 'preserve-claude-agent-sdk-static-boundary'],
  ],
  [
    'cloudflare-agents',
    'typescript-ai-chat-agent-0-10-ai-sdk-7',
    '01cc5f7e9b69a637c9f45fbde62a2cdb23612272524d46dab1a544c224b6ced2',
    ['repair-cloudflare-ai-chat-output-schema', 'preserve-cloudflare-ai-chat-static-boundary'],
  ],
  [
    'cloudflare-agents',
    'typescript-think-0-16-ai-sdk-7',
    'c407975dd38ebc3729d520d8ee47479ad222bce585757f8c25da95b6786f2dff',
    ['repair-cloudflare-think-tool-registration', 'preserve-cloudflare-think-static-boundary'],
  ],
  [
    'custom',
    'custom',
    '725961fea2c2e1b4c74f4f5c0a83276bef3a90c7ab14a182421cfce31dc752b4',
    FOUNDATION_CASE_IDS,
  ],
  [
    'eve',
    'typescript-filesystem-agent-0-39',
    '872c1f86d0fd9e46693dd128313a190cd70bb4c7975cb1d4973fb75415f46639',
    ['repair-eve-tool-registration', 'preserve-eve-static-boundary'],
  ],
  [
    'google-genai',
    'typescript-models-generate-content-2',
    'bf1d5a19977d69f9cdf36b50012578a6338f6a7ae10e0a7de07a214d51a4ceab',
    ['repair-google-genai-tool-registration', 'preserve-google-genai-static-boundary'],
  ],
  [
    'langchain',
    'typescript-create-agent-1-5',
    '93f03737e21c742b9488be1bd4ba889942ab890f9947e995297eee5d83853bca',
    ['repair-langchain-tool-registration', 'preserve-langchain-static-boundary'],
  ],
  [
    'langgraph',
    'typescript-functional-api-1-4',
    '95634405f361d1b9eca4ffb9363c5c7b281c656578e4c51de65e6ce62d9f78a2',
    [
      'repair-langgraph-functional-runtime-binding',
      'preserve-langgraph-functional-api-static-boundary',
    ],
  ],
  [
    'langgraph',
    'typescript-state-graph-1-4',
    '08d505b0f5c4e6eb89506471fb8b8f7be5ed3dc57be27bd5b5c4ad3e8003abce',
    ['repair-langgraph-state-schema', 'preserve-langgraph-state-graph-static-boundary'],
  ],
  [
    'openai',
    'typescript-responses-api-7',
    '72ca0e1329ef8a616c67d27a457c009fa9805213c1b941c38f14b6258fc6bb62',
    ['repair-openai-tool-registration', 'preserve-openai-static-boundary'],
  ],
  [
    'openai-agents-sdk',
    'typescript-agent-handoffs-0-16',
    '2524c260d1ed0661e2a3ea9a296bbe03c25b72da5cb9046b7cb6e466a1828b3d',
    ['repair-openai-agents-sdk-tool-registration', 'preserve-openai-agents-sdk-static-boundary'],
  ],
  [
    'vercel-ai-sdk',
    'typescript-generate-stream-text-7',
    '6288623481473163c467f55326725c0c4e3d85cd1d6903a1d33e2eb0a182886d',
    ['repair-vercel-tool-registration', 'preserve-vercel-static-boundary'],
  ],
  [
    'vercel-ai-sdk',
    'typescript-tool-loop-agent-7',
    '16e0686c20c3572a8f306440d5f78d244883eca8b05610451400b7c500aa794d',
    ['repair-vercel-tool-registration', 'preserve-vercel-static-boundary'],
  ],
].map(([adapterId, implementationId, profileDigest, caseIds]) => ({
  adapterId,
  caseIds,
  implementationId,
  profileDigest,
})) as readonly IReviewedProfile[];

/** Resolves visitor copy only when its complete source and evidence identity still match. */
export const resolveQualificationCasePresentation = (
  adapterId: string,
  implementationId: string,
  profileCase: IQualificationProfileCaseModel,
  attemptProfileDigest: string | null,
): IQualificationCasePresentationModel | null => {
  const reviewed = REVIEWED_PROFILES.find(
    (candidate) =>
      candidate.adapterId === adapterId &&
      candidate.implementationId === implementationId &&
      candidate.profileDigest === profileCase.sourceProfileDigest,
  );
  if (
    reviewed === undefined ||
    (attemptProfileDigest !== null && attemptProfileDigest !== reviewed.profileDigest) ||
    !reviewed.caseIds.includes(profileCase.id)
  )
    return null;

  if (profileCase.id === 'repair-anthropic-tool-registration') {
    return {
      summary:
        'Checks whether the saved Anthropic tool name is repaired to match the project source.',
      toolNameRepair: {
        correctedName: 'lookup_order',
        declaredName: 'find_order',
        manifestPath: 'moldea/moldea.yaml',
        sourcePath: 'src/tools.ts',
      },
    };
  }
  return { summary: profileCase.purpose };
};

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
