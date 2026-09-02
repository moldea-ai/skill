import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { z } from 'zod';

import {
  createQualificationArtifactStorageEntries,
  createQualificationAttemptKey,
  QualificationAttemptStorageSchema,
  QualificationProfileIndexSchema,
  resolveQualificationArtifactPath,
  type IQualificationAttemptStorage,
  type IQualificationProfileIndexTarget,
} from '../../../../qualification/src/storage/index.ts';

import {
  ActorOutputSchema,
  DeterministicVerificationArtifactSchema,
  JudgeOutputSchema,
  QualificationAttemptResultSchema,
  QualificationBaselineCheckSchema,
  QualificationCaseCatalogSchema,
  QualificationCoverageResultSchema,
  QualificationCurrentCaseResultSchema,
  QualificationExecutionErrorSchema,
  QualificationLatestResultSchema,
  QualificationJudgeSkippedSchema,
  QualificationModelStageEvidenceSchema,
  QualificationProbesSchema,
  QualificationProjectedExecutionEventSchema,
  QualificationProfileSchema,
  QualificationScenarioSchema,
  QualificationSourceStateResultSchema,
  QualificationTrialResultSchema,
  WorkspaceAssertionResultSchema,
  type IDeterministicVerification,
  type IQualificationArtifactModel,
  type IQualificationAttemptCaseModel,
  type IQualificationAttemptModel,
  type IQualificationAttemptResult,
  type IQualificationCurrentCaseResult,
  type IQualificationEvidenceSourceModel,
  type IQualificationLatestResult,
  type IQualificationProjectedExecutionEvent,
  type IQualificationProfileCaseModel,
  type IQualificationProfileModel,
  type IQualificationWebsiteModel,
} from './types.ts';
import { readRecordedQualificationContract } from './contract-reader.ts';
import {
  readHistoricalQualificationTargets,
  type IHistoricalQualificationAttemptSource,
} from './historical-reader.ts';
import { assertMigratedCustomDuplicate } from './history-validations.ts';
import { createQualificationReplay } from './replay-transformers.ts';
import {
  calculateFileSha256,
  createRawSourceUrl,
  createSourceUrl,
  getRepositoryRelativePath,
  listDirectories,
  listFiles,
  readJsonFile,
  readYamlFile,
  resolveContainedPath,
} from './utilities.ts';
import {
  assertQualificationAttemptEvidence,
  assertQualificationCaseEvidence,
  assertQualificationTrialModelEvidence,
} from './validations.ts';

const QUALIFICATION_ROUTE = '/evidence/qualification/';
// immutable protocol 6 actor-prompt boundary retained by current evidence
const QUALIFICATION_ACTOR_PROMPT_PREFIX =
  'Complete the project task below in the current Git working tree:\n\n';
const QUALIFICATION_ACTOR_PROMPT_SUFFIX = `

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
`;

type ICaseCatalogEntry = ReturnType<typeof QualificationCaseCatalogSchema.parse>['cases'][number];
type IProfile = ReturnType<typeof QualificationProfileSchema.parse>;
type IReadAttemptArtifact = (logicalPath: string) => Buffer | undefined;

interface IQualificationAttemptSource {
  artifactModels: IQualificationArtifactModel[];
  artifactSources: ReadonlyMap<string, Buffer>;
  attemptPath: string;
  attemptSource: Buffer;
  carryForward:
    | {
        sourceCommit: string;
        sourceRelease: string;
        sourceAttemptDigest: string;
      }
    | undefined;
  evidenceSource: IQualificationEvidenceSourceModel;
  result: IQualificationAttemptResult;
}

interface ILoadedQualificationAttempt {
  model: IQualificationAttemptModel;
  source: IQualificationAttemptSource;
}

interface ILoadedQualificationProfile {
  currentAttempts: ILoadedQualificationAttempt[];
  currentLatest: IQualificationProfileModel['latest'];
  model: IQualificationProfileModel;
  targetKey: string;
}

const createExpectedCurrentTrialArtifactPaths = (
  caseId: string,
  trial: IQualificationCurrentCaseResult['trials'][number],
): string[] => {
  const trialRoot = `cases/${caseId}/trials/${trial.trialId}`;
  const judgePaths =
    trial.judgeStatus === 'completed'
      ? [
          `${trialRoot}/judge-evidence.json`,
          `${trialRoot}/judge-events.jsonl`,
          `${trialRoot}/judge-output.json`,
          `${trialRoot}/judge-output.schema.json`,
          `${trialRoot}/judge-prompt.md`,
        ]
      : [`${trialRoot}/judge-skipped.json`];

  return [
    `${trialRoot}/actor-evidence.json`,
    `${trialRoot}/actor-events.jsonl`,
    `${trialRoot}/actor-output.json`,
    `${trialRoot}/actor-output.schema.json`,
    `${trialRoot}/actor-prompt.md`,
    `${trialRoot}/deterministic-after.json`,
    `${trialRoot}/deterministic-before.json`,
    ...judgePaths,
    `${trialRoot}/trial-result.json`,
    `${trialRoot}/workspace-assertions.json`,
    `${trialRoot}/workspace.patch`,
  ];
};

const createExpectedCurrentArtifactPaths = (
  caseResults: readonly IQualificationCurrentCaseResult[],
): string[] =>
  [
    'baseline.json',
    'coverage.json',
    'source-state.json',
    ...caseResults.flatMap((caseResult) => [
      `cases/${caseResult.caseId}/case-result.json`,
      ...caseResult.trials.flatMap((trial) =>
        createExpectedCurrentTrialArtifactPaths(caseResult.caseId, trial),
      ),
    ]),
  ].sort((left, right) => left.localeCompare(right, 'en'));

const assertCurrentArtifactInventory = (
  result: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>,
): void => {
  const expectedPaths = createExpectedCurrentArtifactPaths(result.cases);
  const actualPaths = Object.keys(result.artifactDigests).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );

  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error('Qualification evidence has an incomplete protocol 6 artifact inventory.');
  }
};

const requireFile = (path: string): void => {
  if (!existsSync(path)) throw new Error(`Required qualification source is missing: ${path}`);
};

const assertUnique = (identities: string[], label: string): void => {
  if (new Set(identities).size !== identities.length) {
    throw new Error(`${label} must be unique.`);
  }
};

const removeLeadingMarkdownTitle = (source: string): string => {
  return source.trim().replace(/^# .+\n+/u, '');
};

const toArtifactPath = (repositoryRoot: string, path: string): string =>
  getRepositoryRelativePath(repositoryRoot, path);

const createArtifactModel = (
  repositoryRoot: string,
  path: string,
  sha256: string | null,
  logicalPath?: string,
  revision = 'main',
): IQualificationArtifactModel => {
  const sourcePath = toArtifactPath(repositoryRoot, path);

  return {
    path: logicalPath ?? sourcePath,
    rawUrl: createRawSourceUrl(sourcePath, revision),
    sha256,
  };
};

const createHistoricalArtifactModel = (
  source: IHistoricalQualificationAttemptSource,
  logicalPath: string,
  sha256: string,
): IQualificationArtifactModel => {
  const attemptRoot = source.attemptPath.slice(0, -'/attempt.json'.length);

  return {
    path: logicalPath,
    rawUrl: createRawSourceUrl(`${attemptRoot}/${logicalPath}`, source.sourceCommit),
    sha256,
  };
};

const loadProfileCase = (
  repositoryRoot: string,
  profileDirectory: string,
  profileCase: IProfile['cases'][number],
  catalogCase: ICaseCatalogEntry,
): IQualificationProfileCaseModel => {
  const projectDirectory = resolveContainedPath(profileDirectory, profileCase.projectDirectory);
  const scenarioPath = resolveContainedPath(projectDirectory, profileCase.scenarioFile);
  const scenario = readYamlFile(scenarioPath, QualificationScenarioSchema);

  if (scenario.id !== profileCase.id || scenario.title !== catalogCase.title) {
    throw new Error(`Qualification case ${profileCase.id} contradicts its catalog identity.`);
  }

  const taskPath = resolveContainedPath(projectDirectory, scenario.taskFile);
  const projectReadmePath = join(projectDirectory, 'README.md');
  requireFile(taskPath);
  requireFile(projectReadmePath);

  return {
    catalogChallenge: catalogCase.challenge,
    catalogDescription: catalogCase.description,
    id: profileCase.id,
    projectExplanation: removeLeadingMarkdownTitle(readFileSync(projectReadmePath, 'utf8')),
    projectSourceUrl: createSourceUrl(
      getRepositoryRelativePath(repositoryRoot, projectDirectory),
      'tree',
    ),
    purpose: scenario.purpose,
    scenario,
    scenarioSourceUrl: createSourceUrl(getRepositoryRelativePath(repositoryRoot, scenarioPath)),
    task: removeLeadingMarkdownTitle(readFileSync(taskPath, 'utf8')),
    taskSourceUrl: createSourceUrl(getRepositoryRelativePath(repositoryRoot, taskPath)),
    title: catalogCase.title,
  };
};

const verifyArtifactDigests = (
  repositoryRoot: string,
  attemptDirectory: string,
  result: IQualificationAttemptResult,
  storage: IQualificationAttemptStorage,
): {
  artifactModels: IQualificationArtifactModel[];
  artifactSources: ReadonlyMap<string, Buffer>;
} => {
  const attemptPath = join(attemptDirectory, 'attempt.json');
  const expectedArtifacts = createQualificationArtifactStorageEntries(result.artifactDigests);
  const actualPaths = listFiles(attemptDirectory)
    .map((path) => getRepositoryRelativePath(attemptDirectory, path))
    .sort();
  const expectedPaths = [
    'attempt.json',
    'storage.json',
    ...expectedArtifacts.map(({ physicalPath }) => physicalPath),
  ].sort();

  if (
    storage.attemptKey !== createQualificationAttemptKey(result.attemptId) ||
    basename(attemptDirectory) !== storage.attemptKey ||
    storage.attemptId !== result.attemptId ||
    storage.attemptIdDigest !== createHash('sha256').update(result.attemptId).digest('hex') ||
    storage.attemptDigest !== calculateFileSha256(attemptPath) ||
    storage.sourceCommit !== result.provenance.qualificationRepositoryCommit
  ) {
    throw new Error('Qualification short-storage identity does not match attempt.json.');
  }

  if (JSON.stringify(storage.artifacts) !== JSON.stringify(expectedArtifacts)) {
    throw new Error('Qualification short-storage artifact mapping does not match attempt.json.');
  }

  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error('Qualification short-storage file inventory is incomplete.');
  }

  const artifactSources = new Map<string, Buffer>();
  const artifactModels = storage.artifacts.map(({ logicalPath, physicalPath, sha256 }) => {
    const artifactPath = resolveQualificationArtifactPath(attemptDirectory, storage, logicalPath);
    const artifactSource = readFileSync(artifactPath);
    const actualDigest = createHash('sha256').update(artifactSource).digest('hex');

    if (actualDigest !== sha256) {
      throw new Error(`Qualification artifact digest does not match: ${logicalPath}`);
    }

    if (getRepositoryRelativePath(attemptDirectory, artifactPath) !== physicalPath) {
      throw new Error(`Qualification artifact mapping does not match: ${logicalPath}`);
    }

    artifactSources.set(logicalPath, artifactSource);
    return createArtifactModel(repositoryRoot, artifactPath, actualDigest, logicalPath);
  });

  return { artifactModels, artifactSources };
};

const readAttemptArtifact = <Output>(
  readArtifact: IReadAttemptArtifact,
  relativePath: string,
  schema: z.ZodType<Output>,
): Output => {
  const source = readArtifact(relativePath);

  if (source === undefined) {
    throw new Error(`Required qualification artifact is missing: ${relativePath}`);
  }

  try {
    return schema.parse(JSON.parse(source.toString('utf8')) as unknown);
  } catch (error) {
    throw new Error(`Invalid qualification JSON artifact ${relativePath}.`, { cause: error });
  }
};

const readDeterministicArtifactSummary = (
  readArtifact: IReadAttemptArtifact,
  relativePath: string,
): IDeterministicVerification =>
  readAttemptArtifact(readArtifact, relativePath, DeterministicVerificationArtifactSchema).summary;

const readProjectedExecutionEvents = (
  readArtifact: IReadAttemptArtifact,
  relativePath: string,
): IQualificationProjectedExecutionEvent[] => {
  const source = readArtifact(relativePath);

  if (source === undefined) {
    throw new Error(`Required qualification artifact is missing: ${relativePath}`);
  }

  return source
    .toString('utf8')
    .split('\n')
    .filter((eventLine) => eventLine.trim() !== '')
    .map((eventLine) =>
      QualificationProjectedExecutionEventSchema.parse(JSON.parse(eventLine) as unknown),
    );
};

const readRecordedDeveloperTask = (
  readArtifact: IReadAttemptArtifact,
  relativePath: string,
): string => {
  const source = readArtifact(relativePath);

  if (source === undefined) {
    throw new Error(`Required qualification artifact is missing: ${relativePath}`);
  }

  const prompt = source.toString('utf8');
  const taskEndIndex = prompt.length - QUALIFICATION_ACTOR_PROMPT_SUFFIX.length;
  const developerTask = removeLeadingMarkdownTitle(
    prompt.slice(QUALIFICATION_ACTOR_PROMPT_PREFIX.length, taskEndIndex),
  );

  if (
    !prompt.startsWith(QUALIFICATION_ACTOR_PROMPT_PREFIX) ||
    !prompt.endsWith(QUALIFICATION_ACTOR_PROMPT_SUFFIX) ||
    taskEndIndex <= QUALIFICATION_ACTOR_PROMPT_PREFIX.length ||
    developerTask.length === 0
  ) {
    throw new Error(
      `Qualification actor prompt does not retain a recorded developer task: ${relativePath}`,
    );
  }

  return developerTask;
};

const loadCurrentAttemptCase = (
  readArtifact: IReadAttemptArtifact,
  attemptResult: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>,
  result: IQualificationCurrentCaseResult,
  artifacts: IQualificationArtifactModel[],
  profileCase: Pick<IQualificationProfileCaseModel, 'id' | 'scenario'>,
): IQualificationAttemptCaseModel => {
  const casePrefix = `cases/${result.caseId}/`;
  const recordedCaseResult = readAttemptArtifact(
    readArtifact,
    `cases/${result.caseId}/case-result.json`,
    QualificationCurrentCaseResultSchema,
  );

  if (JSON.stringify(recordedCaseResult) !== JSON.stringify(result)) {
    throw new Error(`Qualification case ${result.caseId} contradicts case-result.json.`);
  }

  const stageById = new Map(attemptResult.stages.map((stage) => [stage.id, stage]));
  const trials = result.trials.map((trial) => {
    const trialRoot = `cases/${result.caseId}/trials/${trial.trialId}`;
    const actorEvidencePath = `${trialRoot}/actor-evidence.json`;
    const actorEventsPath = `${trialRoot}/actor-events.jsonl`;
    const actorPromptPath = `${trialRoot}/actor-prompt.md`;
    const judgeEvidencePath = `${trialRoot}/judge-evidence.json`;
    const trialResultPath = `${trialRoot}/trial-result.json`;
    const referencedPaths = [
      trial.deterministicBeforePath,
      trial.deterministicAfterPath,
      trial.actorOutputPath,
      actorEvidencePath,
      actorEventsPath,
      actorPromptPath,
      trialResultPath,
      trial.workspaceAssertionsPath,
      trial.patchPath,
      ...(trial.judgeOutputPath === null ? [] : [trial.judgeOutputPath]),
      ...(trial.judgeStatus === 'completed' ? [judgeEvidencePath] : []),
      ...(trial.judgeSkippedPath === null ? [] : [trial.judgeSkippedPath]),
    ];

    if (
      new Set(referencedPaths).size !== referencedPaths.length ||
      referencedPaths.some((relativePath) => !relativePath.startsWith(`${trialRoot}/`))
    ) {
      throw new Error(
        `Qualification case ${result.caseId} trial ${trial.trialId} has invalid artifact references.`,
      );
    }

    for (const relativePath of referencedPaths) {
      if (
        readArtifact(relativePath) === undefined ||
        !artifacts.some(({ path }) => path === relativePath)
      ) {
        throw new Error(
          `Qualification case ${result.caseId} trial ${trial.trialId} references an unrecorded artifact.`,
        );
      }
    }

    const recordedTrialResult = readAttemptArtifact(
      readArtifact,
      trialResultPath,
      QualificationTrialResultSchema,
    );

    if (JSON.stringify(recordedTrialResult) !== JSON.stringify(trial)) {
      throw new Error(
        `Qualification case ${result.caseId} trial ${trial.trialId} contradicts trial-result.json.`,
      );
    }

    const actorStage = stageById.get(`case:${result.caseId}:trial:${trial.trialId}:actor`);
    const judgeStage = stageById.get(`case:${result.caseId}:trial:${trial.trialId}:judge`);
    const actorEvidence = readAttemptArtifact(
      readArtifact,
      actorEvidencePath,
      QualificationModelStageEvidenceSchema,
    );
    const judgeEvidence =
      trial.judgeStatus === 'completed'
        ? readAttemptArtifact(
            readArtifact,
            judgeEvidencePath,
            QualificationModelStageEvidenceSchema,
          )
        : null;

    if (
      actorStage === undefined ||
      (trial.judgeStatus === 'completed' && judgeStage === undefined)
    ) {
      throw new Error(
        `Qualification case ${result.caseId} trial ${trial.trialId} is missing model-stage provenance.`,
      );
    }

    assertQualificationTrialModelEvidence({
      attemptId: attemptResult.attemptId,
      evidence: actorEvidence,
      role: 'actor',
      stage: actorStage,
      trial,
    });

    if (judgeEvidence !== null && judgeStage !== undefined) {
      assertQualificationTrialModelEvidence({
        attemptId: attemptResult.attemptId,
        evidence: judgeEvidence,
        role: 'judge',
        stage: judgeStage,
        trial,
      });
    }
    const trialEvidence = {
      actor: readAttemptArtifact(readArtifact, trial.actorOutputPath, ActorOutputSchema),
      actorCommandPolicy: actorEvidence.commandPolicy,
      actorExecutionEvents: readProjectedExecutionEvents(readArtifact, actorEventsPath),
      artifacts: artifacts.filter(({ path }) =>
        path.startsWith(`${casePrefix}trials/${trial.trialId}/`),
      ),
      deterministicAfter: readDeterministicArtifactSummary(
        readArtifact,
        trial.deterministicAfterPath,
      ),
      deterministicBefore: readDeterministicArtifactSummary(
        readArtifact,
        trial.deterministicBeforePath,
      ),
      developerTask: readRecordedDeveloperTask(readArtifact, actorPromptPath),
      judge:
        trial.judgeOutputPath === null
          ? null
          : readAttemptArtifact(readArtifact, trial.judgeOutputPath, JudgeOutputSchema),
      judgeSkipped:
        trial.judgeSkippedPath === null
          ? null
          : readAttemptArtifact(
              readArtifact,
              trial.judgeSkippedPath,
              QualificationJudgeSkippedSchema,
            ),
      result: trial,
      retries: {
        actor: actorStage?.operationalRetries ?? [],
        judge: judgeStage?.operationalRetries ?? [],
      },
      workspaceAssertions: readAttemptArtifact(
        readArtifact,
        trial.workspaceAssertionsPath,
        WorkspaceAssertionResultSchema,
      ),
    };
    assertQualificationCaseEvidence({
      ...trialEvidence,
      judgeCommandPolicy: judgeEvidence?.commandPolicy ?? null,
      profileCase,
    });
    return trialEvidence;
  });

  const replay = createQualificationReplay(result, trials);

  return {
    artifacts: artifacts.filter(({ path }) => path.startsWith(casePrefix)),
    replay,
    result,
    trials,
  };
};

const readOptionalArtifact = <Output>(
  readArtifact: IReadAttemptArtifact,
  relativePath: string,
  schema: z.ZodType<Output>,
): Output | null => {
  return readArtifact(relativePath) === undefined
    ? null
    : readAttemptArtifact(readArtifact, relativePath, schema);
};

const createCurrentAttemptSource = (
  repositoryRoot: string,
  attemptDirectory: string,
): IQualificationAttemptSource => {
  const attemptPath = join(attemptDirectory, 'attempt.json');
  const result = readJsonFile(attemptPath, QualificationAttemptResultSchema);
  const storage = readJsonFile(
    join(attemptDirectory, 'storage.json'),
    QualificationAttemptStorageSchema,
  );
  const { artifactModels, artifactSources } = verifyArtifactDigests(
    repositoryRoot,
    attemptDirectory,
    result,
    storage,
  );

  return {
    artifactModels,
    artifactSources,
    attemptPath: getRepositoryRelativePath(repositoryRoot, attemptPath),
    attemptSource: readFileSync(attemptPath),
    carryForward: storage.carryForward,
    evidenceSource: { commit: null, kind: 'current', release: null },
    result,
  };
};

const createHistoricalAttemptSource = (
  source: IHistoricalQualificationAttemptSource,
): IQualificationAttemptSource => ({
  artifactModels: Object.entries(source.result.artifactDigests)
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([logicalPath, sha256]) => createHistoricalArtifactModel(source, logicalPath, sha256)),
  artifactSources: source.artifactSources,
  attemptPath: source.attemptPath,
  attemptSource: source.attemptSource,
  carryForward: undefined,
  evidenceSource: {
    commit: source.sourceCommit,
    kind: 'historical',
    release: source.sourceRelease,
  },
  result: source.result,
});

const loadAttempt = (
  repositoryRoot: string,
  qualificationRoot: string,
  source: IQualificationAttemptSource,
  targetKey: string,
  adapterId: string,
  implementationId: string,
): ILoadedQualificationAttempt => {
  const { artifactModels: artifacts, result } = source;
  const readArtifact: IReadAttemptArtifact = (logicalPath) =>
    source.artifactSources.get(logicalPath);

  if (
    result.selection.adapterId !== adapterId ||
    result.selection.implementationId !== implementationId
  ) {
    throw new Error(`Qualification attempt directory identity does not match attempt.json.`);
  }

  assertUnique(
    result.cases.map(({ caseId }) => caseId),
    `Qualification attempt ${result.attemptId} case ids`,
  );

  const recordedContract = readRecordedQualificationContract({
    adapterId,
    implementationId,
    ...(source.evidenceSource.kind === 'current' && source.carryForward === undefined
      ? { profileKey: targetKey }
      : {}),
    qualificationRepositoryCommit: result.provenance.qualificationRepositoryCommit,
    qualificationRoot,
    repositoryRoot,
  });

  for (const caseResult of result.cases) {
    if (!recordedContract.caseScenarios.has(caseResult.caseId)) {
      throw new Error(`Qualification attempt ${result.attemptId} references an unknown case.`);
    }
  }

  if (result.status === 'passed' || (result.status === 'failed' && result.cases.length > 0)) {
    assertCurrentArtifactInventory(result);
  }

  for (const artifact of artifacts.filter(({ path }) => path.endsWith('-events.jsonl'))) {
    const eventSource = readArtifact(artifact.path);

    if (eventSource === undefined) {
      throw new Error(`Required qualification artifact is missing: ${artifact.path}`);
    }

    for (const eventLine of eventSource.toString('utf8').split('\n')) {
      if (eventLine.trim() !== '') {
        QualificationProjectedExecutionEventSchema.parse(JSON.parse(eventLine) as unknown);
      }
    }
  }
  const coverage = readOptionalArtifact(
    readArtifact,
    'coverage.json',
    QualificationCoverageResultSchema,
  );
  const sourceState = readOptionalArtifact(
    readArtifact,
    'source-state.json',
    QualificationSourceStateResultSchema,
  );
  const baseline = readOptionalArtifact(
    readArtifact,
    'baseline.json',
    QualificationBaselineCheckSchema,
  );
  const executionError = readOptionalArtifact(
    readArtifact,
    'error.json',
    QualificationExecutionErrorSchema,
  );
  const interruption = readOptionalArtifact(
    readArtifact,
    'interruption.json',
    QualificationExecutionErrorSchema,
  );

  if (executionError && interruption) {
    throw new Error(`Qualification attempt ${result.attemptId} has multiple error artifacts.`);
  }

  const error = executionError ?? interruption;
  const cases = result.cases.map((caseResult) => {
    const recordedScenario = recordedContract.caseScenarios.get(caseResult.caseId);

    if (!recordedScenario) {
      throw new Error(`Qualification attempt ${result.attemptId} references an unknown case.`);
    }

    const profileCase = { id: caseResult.caseId, scenario: recordedScenario };

    return loadCurrentAttemptCase(readArtifact, result, caseResult, artifacts, profileCase);
  });

  assertUnique(
    result.stages.map(({ id }) => id),
    `Qualification attempt ${result.attemptId} stage ids`,
  );
  assertQualificationAttemptEvidence({
    baseline,
    coverage,
    error,
    errorArtifactKind: executionError ? 'error' : interruption ? 'interruption' : null,
    profileCaseIds: new Set(recordedContract.profileCaseIds),
    probeMatrixPaths: recordedContract.probeMatrixPaths,
    result,
    sourceState,
  });

  const revision = source.evidenceSource.commit ?? 'main';
  const model: IQualificationAttemptModel = {
    artifacts: [
      {
        path: source.attemptPath,
        rawUrl: createRawSourceUrl(source.attemptPath, revision),
        sha256: null,
      },
      ...artifacts,
    ],
    baseline,
    cases,
    coverage,
    error,
    evidenceSource: source.evidenceSource,
    rawAttemptUrl: createRawSourceUrl(source.attemptPath, revision),
    result,
    route: `${QUALIFICATION_ROUTE}${adapterId}/${implementationId}/attempts/${result.attemptId}/`,
    sourceState,
  };

  return { model, source };
};

const loadAttempts = (
  repositoryRoot: string,
  qualificationRoot: string,
  resultsRoot: string,
  targetKey: string,
  adapterId: string,
  implementationId: string,
): {
  attempts: ILoadedQualificationAttempt[];
  latest: IQualificationProfileModel['latest'];
} => {
  const targetRoot = resolveContainedPath(resultsRoot, targetKey);
  const attemptsRoot = join(targetRoot, 'attempts');
  const latestPath = join(targetRoot, 'latest.json');
  const attempts = listDirectories(attemptsRoot)
    .map((entry) =>
      loadAttempt(
        repositoryRoot,
        qualificationRoot,
        createCurrentAttemptSource(repositoryRoot, join(attemptsRoot, entry.name)),
        targetKey,
        adapterId,
        implementationId,
      ),
    )
    .sort(
      (left, right) =>
        left.model.result.createdAt.localeCompare(right.model.result.createdAt, 'en') ||
        left.model.result.attemptId.localeCompare(right.model.result.attemptId, 'en'),
    );

  if (attempts.length === 0) {
    if (existsSync(latestPath)) {
      throw new Error(`Qualification latest pointer exists without attempt history.`);
    }

    return { attempts, latest: null };
  }

  requireFile(latestPath);
  const latest = readJsonFile(latestPath, QualificationLatestResultSchema);
  const expectedLatest = attempts.at(-1)?.model.result;
  const expectedPassing = attempts.filter(({ model }) => model.result.status === 'passed').at(-1)
    ?.model.result;

  if (
    latest.adapterId !== adapterId ||
    latest.implementationId !== implementationId ||
    latest.protocolVersion !== expectedLatest?.protocolVersion ||
    latest.latestAttemptId !== expectedLatest?.attemptId ||
    latest.latestStatus !== expectedLatest.status ||
    latest.lastPassingAttemptId !== (expectedPassing?.attemptId ?? null)
  ) {
    throw new Error(`Qualification latest pointer does not match attempt history.`);
  }

  return { attempts, latest };
};

const loadProfile = (
  repositoryRoot: string,
  qualificationRoot: string,
  profileDirectory: string,
  catalog: Map<string, ICaseCatalogEntry>,
  resultsRoot: string,
  target: IQualificationProfileIndexTarget,
): ILoadedQualificationProfile => {
  const profilePath = join(profileDirectory, 'profile.yaml');
  const profile = readYamlFile(profilePath, QualificationProfileSchema);

  if (
    basename(profileDirectory) !== target.key ||
    profile.adapterId !== target.adapterId ||
    profile.implementationId !== target.implementationId
  ) {
    throw new Error(`Qualification profile identity does not match its directory.`);
  }

  assertUnique(
    profile.cases.map(({ id }) => id),
    `Qualification profile ${profile.adapterId}/${profile.implementationId} case ids`,
  );
  const profileCaseIds = new Set(profile.cases.map(({ id }) => id));
  const missingUniversalCaseIds = [...catalog.values()]
    .filter(({ layer }) => layer === 'universal-baseline')
    .map(({ id }) => id)
    .filter((caseId) => !profileCaseIds.has(caseId));

  if (missingUniversalCaseIds.length > 0) {
    throw new Error(
      `Qualification profile is missing universal baseline cases: ${missingUniversalCaseIds.join(', ')}.`,
    );
  }

  for (const caseId of profileCaseIds) {
    if (!catalog.has(caseId)) {
      throw new Error(`Qualification profile references an unknown catalog case.`);
    }
  }

  const probesPath = resolveContainedPath(profileDirectory, profile.probesFile);
  const probes = readYamlFile(probesPath, QualificationProbesSchema);

  if (
    probes.adapterId !== profile.adapterId ||
    probes.implementationId !== profile.implementationId
  ) {
    throw new Error(`Qualification probe identity does not match its profile.`);
  }

  assertUnique(
    probes.probes.map(({ id }) => id),
    `Qualification profile ${profile.adapterId}/${profile.implementationId} probe ids`,
  );

  for (const probe of probes.probes) {
    if (probe.coveredBy.some((caseId) => !profileCaseIds.has(caseId))) {
      throw new Error(`Qualification probe ${probe.id} references an unknown case.`);
    }
  }

  const cases = profile.cases.map((profileCase) => {
    const catalogCase = catalog.get(profileCase.id);

    if (!catalogCase) throw new Error(`Qualification profile references an unknown catalog case.`);

    return loadProfileCase(repositoryRoot, profileDirectory, profileCase, catalogCase);
  });
  const { attempts, latest } = loadAttempts(
    repositoryRoot,
    qualificationRoot,
    resultsRoot,
    target.key,
    profile.adapterId,
    profile.implementationId,
  );
  const currentAttemptModels = attempts.map(({ model }) => model);
  const model: IQualificationProfileModel = {
    adapterId: profile.adapterId,
    attempts: currentAttemptModels,
    cases,
    currentLastPassing:
      currentAttemptModels.filter(({ result }) => result.status === 'passed').at(-1) ?? null,
    currentLatest: currentAttemptModels.at(-1) ?? null,
    description: profile.description,
    implementationId: profile.implementationId,
    latest,
    probes: probes.probes,
    probesSourceUrl: createSourceUrl(getRepositoryRelativePath(repositoryRoot, probesPath)),
    route: `${QUALIFICATION_ROUTE}${profile.adapterId}/${profile.implementationId}/`,
    sourceUrl: createSourceUrl(getRepositoryRelativePath(repositoryRoot, profilePath)),
    title: profile.title,
  };

  return {
    currentAttempts: attempts,
    currentLatest: latest,
    model,
    targetKey: target.key,
  };
};

const verifyResultTargetsHaveProfiles = (
  resultsRoot: string,
  profileKeys: ReadonlySet<string>,
): void => {
  for (const targetEntry of listDirectories(resultsRoot)) {
    if (!profileKeys.has(targetEntry.name)) {
      throw new Error(`Qualification results have no committed profile: ${targetEntry.name}`);
    }
  }
};

const createCombinedLatestPointer = (
  attempts: readonly ILoadedQualificationAttempt[],
  currentLatest: IQualificationProfileModel['latest'],
  historicalLatest: IQualificationProfileModel['latest'],
): IQualificationLatestResult | null => {
  const expectedLatest = attempts.at(-1)?.model.result;

  if (expectedLatest === undefined) return null;

  const expectedPassing = attempts.filter(({ model }) => model.result.status === 'passed').at(-1)
    ?.model.result;
  const updatedAt = [currentLatest?.updatedAt, historicalLatest?.updatedAt]
    .filter((candidate): candidate is string => candidate !== undefined)
    .sort((left, right) => left.localeCompare(right, 'en'))
    .at(-1);

  if (updatedAt === undefined) {
    throw new Error('Qualification history has attempts without a validated latest pointer.');
  }

  return QualificationLatestResultSchema.parse({
    protocolVersion: expectedLatest.protocolVersion,
    adapterId: expectedLatest.selection.adapterId,
    implementationId: expectedLatest.selection.implementationId,
    latestAttemptId: expectedLatest.attemptId,
    latestStatus: expectedLatest.status,
    lastPassingAttemptId: expectedPassing?.attemptId ?? null,
    updatedAt,
  });
};

const combineQualificationHistory = (
  repositoryRoot: string,
  qualificationRoot: string,
  loadedProfiles: ILoadedQualificationProfile[],
): IQualificationProfileModel[] => {
  const carriedAttempts = loadedProfiles.flatMap(({ currentAttempts }) =>
    currentAttempts.filter(({ source }) => source.carryForward !== undefined),
  );

  if (carriedAttempts.length === 0) return loadedProfiles.map(({ model }) => model);

  if (
    carriedAttempts.length !== 1 ||
    carriedAttempts[0]?.model.result.selection.adapterId !== 'custom' ||
    carriedAttempts[0].model.result.selection.implementationId !== 'custom'
  ) {
    throw new Error(
      'Historical qualification history requires exactly one carried Custom attempt.',
    );
  }

  const sourceIdentities = new Set(
    carriedAttempts.map(({ source }) => {
      const carryForward = source.carryForward;

      if (carryForward === undefined)
        throw new Error('Missing qualification carry-forward source.');

      return `${carryForward.sourceRelease}\0${carryForward.sourceCommit}`;
    }),
  );

  if (sourceIdentities.size !== 1) {
    throw new Error('Current qualification storage references multiple historical sources.');
  }

  const carryForward = carriedAttempts[0]?.source.carryForward;

  if (carryForward === undefined) throw new Error('Missing qualification carry-forward source.');

  const historicalTargets = readHistoricalQualificationTargets({
    repositoryRoot,
    sourceCommit: carryForward.sourceCommit,
    sourceRelease: carryForward.sourceRelease,
  });
  const profileByTarget = new Map(
    loadedProfiles.map((profile) => [
      `${profile.model.adapterId}\0${profile.model.implementationId}`,
      profile,
    ]),
  );
  const historicalTargetByIdentity = new Map(
    historicalTargets.map((target) => [`${target.adapterId}\0${target.implementationId}`, target]),
  );

  for (const historicalTarget of historicalTargets) {
    const identity = `${historicalTarget.adapterId}\0${historicalTarget.implementationId}`;

    if (!profileByTarget.has(identity)) {
      throw new Error(
        `Historical qualification target has no current profile: ${historicalTarget.adapterId}/${historicalTarget.implementationId}`,
      );
    }
  }

  return loadedProfiles.map((profile): IQualificationProfileModel => {
    const identity = `${profile.model.adapterId}\0${profile.model.implementationId}`;
    const historicalTarget = historicalTargetByIdentity.get(identity);

    if (historicalTarget === undefined) return profile.model;

    const historicalAttempts = historicalTarget.attempts.map((historicalSource) =>
      loadAttempt(
        repositoryRoot,
        qualificationRoot,
        createHistoricalAttemptSource(historicalSource),
        profile.targetKey,
        profile.model.adapterId,
        profile.model.implementationId,
      ),
    );
    const currentByAttemptId = new Map(
      profile.currentAttempts.map((attempt) => [attempt.model.result.attemptId, attempt]),
    );
    const combinedAttempts = historicalAttempts.map((historicalAttempt) => {
      const currentAttempt = currentByAttemptId.get(historicalAttempt.model.result.attemptId);

      if (currentAttempt === undefined) return historicalAttempt;

      const currentResult = currentAttempt.model.result;
      const historicalResult = historicalAttempt.model.result;

      if (historicalAttempt.source.evidenceSource.kind !== 'historical') {
        throw new Error('Historical qualification attempt has no immutable source identity.');
      }

      assertMigratedCustomDuplicate(
        {
          adapterId: currentResult.selection.adapterId,
          artifactSources: currentAttempt.source.artifactSources,
          attemptId: currentResult.attemptId,
          attemptSource: currentAttempt.source.attemptSource,
          carryForward: currentAttempt.source.carryForward,
          implementationId: currentResult.selection.implementationId,
        },
        {
          adapterId: historicalResult.selection.adapterId,
          artifactSources: historicalAttempt.source.artifactSources,
          attemptId: historicalResult.attemptId,
          attemptSource: historicalAttempt.source.attemptSource,
          implementationId: historicalResult.selection.implementationId,
          sourceCommit: historicalAttempt.source.evidenceSource.commit,
          sourceRelease: historicalAttempt.source.evidenceSource.release,
        },
      );
      currentByAttemptId.delete(historicalAttempt.model.result.attemptId);
      return historicalAttempt;
    });
    const unmatchedCarriedAttempt = [...currentByAttemptId.values()].find(
      ({ source }) => source.carryForward !== undefined,
    );

    if (unmatchedCarriedAttempt !== undefined) {
      throw new Error(
        `Carried Custom attempt ${unmatchedCarriedAttempt.model.result.attemptId} has no byte-identical historical source.`,
      );
    }

    combinedAttempts.push(...currentByAttemptId.values());
    combinedAttempts.sort(
      (left, right) =>
        left.model.result.createdAt.localeCompare(right.model.result.createdAt, 'en') ||
        left.model.result.attemptId.localeCompare(right.model.result.attemptId, 'en'),
    );
    const latest = createCombinedLatestPointer(
      combinedAttempts,
      profile.currentLatest,
      historicalTarget.latest,
    );
    const attemptModels = combinedAttempts.map(({ model }) => model);

    return {
      ...profile.model,
      attempts: attemptModels,
      currentLastPassing:
        attemptModels.filter(({ result }) => result.status === 'passed').at(-1) ?? null,
      currentLatest: attemptModels.at(-1) ?? null,
      latest,
    };
  });
};

/** Loads every transparent profile and validates all committed result history for static pages. */
export const loadQualificationWebsiteModel = (
  repositoryRoot: string,
): IQualificationWebsiteModel => {
  const qualificationRoot = join(repositoryRoot, 'qualification');
  const profilesRoot = join(qualificationRoot, 'profiles');
  const resultsRoot = join(qualificationRoot, 'results');
  const catalogSource = readYamlFile(
    join(qualificationRoot, 'cases', 'cases.yaml'),
    QualificationCaseCatalogSchema,
  );
  assertUnique(
    catalogSource.cases.map(({ id }) => id),
    'Qualification catalog case ids',
  );
  const catalog = new Map(catalogSource.cases.map((catalogCase) => [catalogCase.id, catalogCase]));
  const profileIndex = readYamlFile(
    join(profilesRoot, 'index.yaml'),
    QualificationProfileIndexSchema,
  );
  const loadedProfiles = profileIndex.targets
    .map((target) =>
      loadProfile(
        repositoryRoot,
        qualificationRoot,
        resolveContainedPath(profilesRoot, target.key),
        catalog,
        resultsRoot,
        target,
      ),
    )
    .sort(
      (left, right) =>
        left.model.adapterId.localeCompare(right.model.adapterId, 'en') ||
        left.model.implementationId.localeCompare(right.model.implementationId, 'en'),
    );
  const profileKeys = new Set(profileIndex.targets.map(({ key }) => key));

  if (
    JSON.stringify(listDirectories(profilesRoot).map(({ name }) => name)) !==
    JSON.stringify([...profileKeys].sort((left, right) => left.localeCompare(right, 'en')))
  ) {
    throw new Error('Qualification profile index does not match its physical directories.');
  }

  verifyResultTargetsHaveProfiles(resultsRoot, profileKeys);

  const profiles = combineQualificationHistory(repositoryRoot, qualificationRoot, loadedProfiles);

  return { profiles, route: QUALIFICATION_ROUTE };
};

/** Requires every recorded profile history to point to its current validated terminal attempt. */
export const assertPublishableQualificationEvidence = (
  qualification: IQualificationWebsiteModel,
): void => {
  if (qualification.profiles.length === 0) {
    throw new Error('Qualification evidence must contain at least one public profile.');
  }

  for (const profile of qualification.profiles) {
    if (profile.attempts.length === 0 && profile.latest === null) {
      continue;
    }

    const expectedLatest = profile.attempts.at(-1)?.result;
    const expectedPassing = profile.attempts
      .filter(({ result }) => result.status === 'passed')
      .at(-1)?.result;

    if (
      profile.latest === null ||
      expectedLatest === undefined ||
      profile.latest.latestAttemptId !== expectedLatest.attemptId ||
      profile.latest.latestStatus !== expectedLatest.status ||
      profile.latest.lastPassingAttemptId !== (expectedPassing?.attemptId ?? null)
    ) {
      throw new Error(
        `Qualification profile ${profile.adapterId}/${profile.implementationId} has no current validated evidence.`,
      );
    }
  }
};
