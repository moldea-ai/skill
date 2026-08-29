import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

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
  type IQualificationProjectedExecutionEvent,
  type IQualificationProfileCaseModel,
  type IQualificationProfileModel,
  type IQualificationWebsiteModel,
} from './types.ts';
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

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under \`.agents/skills/moldea/\` or \`.moldea-qualification/\`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
`;

type ICaseCatalogEntry = ReturnType<typeof QualificationCaseCatalogSchema.parse>['cases'][number];
type IProfile = ReturnType<typeof QualificationProfileSchema.parse>;

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
): IQualificationArtifactModel => {
  const sourcePath = toArtifactPath(repositoryRoot, path);

  return {
    path: sourcePath,
    rawUrl: createRawSourceUrl(sourcePath),
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
  artifactDigests: Record<string, string>,
): IQualificationArtifactModel[] => {
  const artifactFiles = listFiles(attemptDirectory)
    .filter((path) => path !== join(attemptDirectory, 'attempt.json'))
    .map((path) => ({
      path,
      relativePath: getRepositoryRelativePath(attemptDirectory, path),
    }));
  const actualPaths = artifactFiles.map(({ relativePath }) => relativePath).sort();
  const expectedPaths = Object.keys(artifactDigests).sort();

  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(`Qualification artifact inventory does not match attempt.json.`);
  }

  return artifactFiles.map(({ path, relativePath }) => {
    const actualDigest = calculateFileSha256(path);
    const expectedDigest = artifactDigests[relativePath];

    if (actualDigest !== expectedDigest) {
      throw new Error(`Qualification artifact digest does not match: ${relativePath}`);
    }

    return createArtifactModel(repositoryRoot, path, actualDigest);
  });
};

const readAttemptArtifact = <Output>(
  attemptDirectory: string,
  relativePath: string,
  schema: Parameters<typeof readJsonFile<Output>>[1],
): Output => {
  const path = resolveContainedPath(attemptDirectory, relativePath);
  requireFile(path);
  return readJsonFile(path, schema);
};

const readDeterministicArtifactSummary = (
  attemptDirectory: string,
  relativePath: string,
): IDeterministicVerification =>
  readAttemptArtifact(attemptDirectory, relativePath, DeterministicVerificationArtifactSchema)
    .summary;

const readProjectedExecutionEvents = (
  attemptDirectory: string,
  relativePath: string,
): IQualificationProjectedExecutionEvent[] => {
  const path = resolveContainedPath(attemptDirectory, relativePath);
  requireFile(path);

  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((eventLine) => eventLine.trim() !== '')
    .map((eventLine) =>
      QualificationProjectedExecutionEventSchema.parse(JSON.parse(eventLine) as unknown),
    );
};

const readRecordedDeveloperTask = (attemptDirectory: string, relativePath: string): string => {
  const path = resolveContainedPath(attemptDirectory, relativePath);
  requireFile(path);
  const prompt = readFileSync(path, 'utf8');
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
  repositoryRoot: string,
  attemptDirectory: string,
  attemptResult: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>,
  result: IQualificationCurrentCaseResult,
  artifacts: IQualificationArtifactModel[],
  profileCase: IQualificationProfileCaseModel,
): IQualificationAttemptCaseModel => {
  const caseDirectory = join(attemptDirectory, 'cases', result.caseId);
  const casePrefix = `${getRepositoryRelativePath(repositoryRoot, caseDirectory)}/`;
  const recordedCaseResult = readAttemptArtifact(
    attemptDirectory,
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
      const artifactPath = resolveContainedPath(attemptDirectory, relativePath);
      requireFile(artifactPath);

      if (
        !artifacts.some(
          ({ path }) => path === getRepositoryRelativePath(repositoryRoot, artifactPath),
        )
      ) {
        throw new Error(
          `Qualification case ${result.caseId} trial ${trial.trialId} references an unrecorded artifact.`,
        );
      }
    }

    const recordedTrialResult = readAttemptArtifact(
      attemptDirectory,
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
      attemptDirectory,
      actorEvidencePath,
      QualificationModelStageEvidenceSchema,
    );
    const judgeEvidence =
      trial.judgeStatus === 'completed'
        ? readAttemptArtifact(
            attemptDirectory,
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
      actor: readAttemptArtifact(attemptDirectory, trial.actorOutputPath, ActorOutputSchema),
      actorCommandPolicy: actorEvidence.commandPolicy,
      actorExecutionEvents: readProjectedExecutionEvents(attemptDirectory, actorEventsPath),
      artifacts: artifacts.filter(({ path }) =>
        path.startsWith(
          `${getRepositoryRelativePath(repositoryRoot, join(caseDirectory, 'trials', trial.trialId))}/`,
        ),
      ),
      deterministicAfter: readDeterministicArtifactSummary(
        attemptDirectory,
        trial.deterministicAfterPath,
      ),
      deterministicBefore: readDeterministicArtifactSummary(
        attemptDirectory,
        trial.deterministicBeforePath,
      ),
      developerTask: readRecordedDeveloperTask(attemptDirectory, actorPromptPath),
      judge:
        trial.judgeOutputPath === null
          ? null
          : readAttemptArtifact(attemptDirectory, trial.judgeOutputPath, JudgeOutputSchema),
      judgeSkipped:
        trial.judgeSkippedPath === null
          ? null
          : readAttemptArtifact(
              attemptDirectory,
              trial.judgeSkippedPath,
              QualificationJudgeSkippedSchema,
            ),
      result: trial,
      retries: {
        actor: actorStage?.operationalRetries ?? [],
        judge: judgeStage?.operationalRetries ?? [],
      },
      workspaceAssertions: readAttemptArtifact(
        attemptDirectory,
        trial.workspaceAssertionsPath,
        WorkspaceAssertionResultSchema,
      ),
    };
    assertQualificationCaseEvidence({ ...trialEvidence, profileCase });
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
  attemptDirectory: string,
  relativePath: string,
  schema: Parameters<typeof readJsonFile<Output>>[1],
): Output | null => {
  const path = resolveContainedPath(attemptDirectory, relativePath);
  return existsSync(path) ? readJsonFile(path, schema) : null;
};

const loadAttempt = (
  repositoryRoot: string,
  attemptDirectory: string,
  adapterId: string,
  implementationId: string,
  profileCases: ReadonlyMap<string, IQualificationProfileCaseModel>,
  probeMatrixPaths: readonly string[],
): IQualificationAttemptModel => {
  const attemptPath = join(attemptDirectory, 'attempt.json');
  const result = readJsonFile(attemptPath, QualificationAttemptResultSchema);

  if (
    result.attemptId !== basename(attemptDirectory) ||
    result.selection.adapterId !== adapterId ||
    result.selection.implementationId !== implementationId
  ) {
    throw new Error(`Qualification attempt directory identity does not match attempt.json.`);
  }

  assertUnique(
    result.cases.map(({ caseId }) => caseId),
    `Qualification attempt ${result.attemptId} case ids`,
  );

  for (const caseResult of result.cases) {
    if (!profileCases.has(caseResult.caseId)) {
      throw new Error(`Qualification attempt ${result.attemptId} references an unknown case.`);
    }
  }

  if (result.status === 'passed' || (result.status === 'failed' && result.cases.length > 0)) {
    assertCurrentArtifactInventory(result);
  }

  const artifacts = verifyArtifactDigests(repositoryRoot, attemptDirectory, result.artifactDigests);
  for (const artifact of artifacts.filter(({ path }) => path.endsWith('-events.jsonl'))) {
    const eventPath = join(repositoryRoot, artifact.path);
    for (const eventLine of readFileSync(eventPath, 'utf8').split('\n')) {
      if (eventLine.trim() !== '') {
        QualificationProjectedExecutionEventSchema.parse(JSON.parse(eventLine) as unknown);
      }
    }
  }
  const coverage = readOptionalArtifact(
    attemptDirectory,
    'coverage.json',
    QualificationCoverageResultSchema,
  );
  const sourceState = readOptionalArtifact(
    attemptDirectory,
    'source-state.json',
    QualificationSourceStateResultSchema,
  );
  const baseline = readOptionalArtifact(
    attemptDirectory,
    'baseline.json',
    QualificationBaselineCheckSchema,
  );
  const executionError = readOptionalArtifact(
    attemptDirectory,
    'error.json',
    QualificationExecutionErrorSchema,
  );
  const interruption = readOptionalArtifact(
    attemptDirectory,
    'interruption.json',
    QualificationExecutionErrorSchema,
  );

  if (executionError && interruption) {
    throw new Error(`Qualification attempt ${result.attemptId} has multiple error artifacts.`);
  }

  const error = executionError ?? interruption;
  const cases = result.cases.map((caseResult) => {
    const profileCase = profileCases.get(caseResult.caseId);

    if (!profileCase) {
      throw new Error(`Qualification attempt ${result.attemptId} references an unknown case.`);
    }

    return loadCurrentAttemptCase(
      repositoryRoot,
      attemptDirectory,
      result,
      caseResult,
      artifacts,
      profileCase,
    );
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
    profileCaseIds: new Set(profileCases.keys()),
    probeMatrixPaths,
    result,
    sourceState,
  });

  return {
    artifacts: [createArtifactModel(repositoryRoot, attemptPath, null), ...artifacts],
    baseline,
    cases,
    coverage,
    error,
    rawAttemptUrl: createRawSourceUrl(getRepositoryRelativePath(repositoryRoot, attemptPath)),
    result,
    route: `${QUALIFICATION_ROUTE}${adapterId}/${implementationId}/attempts/${result.attemptId}/`,
    sourceState,
  };
};

const loadAttempts = (
  repositoryRoot: string,
  resultsRoot: string,
  adapterId: string,
  implementationId: string,
  profileCases: ReadonlyMap<string, IQualificationProfileCaseModel>,
  probeMatrixPaths: readonly string[],
): { attempts: IQualificationAttemptModel[]; latest: IQualificationProfileModel['latest'] } => {
  const targetRoot = join(resultsRoot, adapterId, implementationId);
  const attemptsRoot = join(targetRoot, 'attempts');
  const latestPath = join(targetRoot, 'latest.json');
  const attempts = listDirectories(attemptsRoot)
    .map((entry) =>
      loadAttempt(
        repositoryRoot,
        join(attemptsRoot, entry.name),
        adapterId,
        implementationId,
        profileCases,
        probeMatrixPaths,
      ),
    )
    .sort(
      (left, right) =>
        left.result.createdAt.localeCompare(right.result.createdAt, 'en') ||
        left.result.attemptId.localeCompare(right.result.attemptId, 'en'),
    );

  if (attempts.length === 0) {
    if (existsSync(latestPath)) {
      throw new Error(`Qualification latest pointer exists without attempt history.`);
    }

    return { attempts, latest: null };
  }

  requireFile(latestPath);
  const latest = readJsonFile(latestPath, QualificationLatestResultSchema);
  const expectedLatest = attempts.at(-1)?.result;
  const expectedPassing = attempts
    .filter(({ result }) => result.status === 'passed')
    .at(-1)?.result;

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
  profileDirectory: string,
  catalog: Map<string, ICaseCatalogEntry>,
  resultsRoot: string,
): IQualificationProfileModel => {
  const profilePath = join(profileDirectory, 'profile.yaml');
  const profile = readYamlFile(profilePath, QualificationProfileSchema);
  const directoryParts = getRepositoryRelativePath(
    join(repositoryRoot, 'qualification', 'profiles'),
    profileDirectory,
  ).split('/');

  if (
    directoryParts.length !== 2 ||
    profile.adapterId !== directoryParts[0] ||
    profile.implementationId !== directoryParts[1]
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
    resultsRoot,
    profile.adapterId,
    profile.implementationId,
    new Map(cases.map((profileCase) => [profileCase.id, profileCase])),
    probes.probes.map(({ matrixPath }) => matrixPath),
  );
  return {
    adapterId: profile.adapterId,
    attempts,
    cases,
    currentLastPassing: attempts.filter(({ result }) => result.status === 'passed').at(-1) ?? null,
    currentLatest: attempts.at(-1) ?? null,
    description: profile.description,
    implementationId: profile.implementationId,
    latest,
    probes: probes.probes,
    probesSourceUrl: createSourceUrl(getRepositoryRelativePath(repositoryRoot, probesPath)),
    route: `${QUALIFICATION_ROUTE}${profile.adapterId}/${profile.implementationId}/`,
    sourceUrl: createSourceUrl(getRepositoryRelativePath(repositoryRoot, profilePath)),
    title: profile.title,
  };
};

const verifyResultTargetsHaveProfiles = (
  resultsRoot: string,
  profileKeys: ReadonlySet<string>,
): void => {
  for (const adapterEntry of listDirectories(resultsRoot)) {
    for (const implementationEntry of listDirectories(join(resultsRoot, adapterEntry.name))) {
      const key = `${adapterEntry.name}/${implementationEntry.name}`;

      if (!profileKeys.has(key)) {
        throw new Error(`Qualification results have no committed profile: ${key}`);
      }
    }
  }
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
  const profiles = listDirectories(profilesRoot)
    .flatMap((adapterEntry) =>
      listDirectories(join(profilesRoot, adapterEntry.name)).map((implementationEntry) =>
        loadProfile(
          repositoryRoot,
          join(profilesRoot, adapterEntry.name, implementationEntry.name),
          catalog,
          resultsRoot,
        ),
      ),
    )
    .sort(
      (left, right) =>
        left.adapterId.localeCompare(right.adapterId, 'en') ||
        left.implementationId.localeCompare(right.implementationId, 'en'),
    );
  const profileKeys = new Set(
    profiles.map(({ adapterId, implementationId }) => `${adapterId}/${implementationId}`),
  );

  verifyResultTargetsHaveProfiles(resultsRoot, profileKeys);

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
