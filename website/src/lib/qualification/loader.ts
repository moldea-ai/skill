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
  QualificationExecutionErrorSchema,
  QualificationLatestResultSchema,
  QualificationJudgeSkippedSchema,
  QualificationProbesSchema,
  QualificationProfileSchema,
  QualificationScenarioSchema,
  QualificationSourceStateResultSchema,
  WorkspaceAssertionResultSchema,
  type IDeterministicVerification,
  type IQualificationArtifactModel,
  type IQualificationAttemptCaseModel,
  type IQualificationAttemptModel,
  type IQualificationProfileCaseModel,
  type IQualificationProfileModel,
  type IQualificationWebsiteModel,
} from './types.ts';
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
} from './validations.ts';

const QUALIFICATION_ROUTE = '/evidence/qualification/';

type ICaseCatalogEntry = ReturnType<typeof QualificationCaseCatalogSchema.parse>['cases'][number];
type IProfile = ReturnType<typeof QualificationProfileSchema.parse>;

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

const loadAttemptCase = (
  repositoryRoot: string,
  attemptDirectory: string,
  result: ReturnType<typeof QualificationAttemptResultSchema.parse>['cases'][number],
  artifacts: IQualificationArtifactModel[],
  profileCase: IQualificationProfileCaseModel,
): IQualificationAttemptCaseModel => {
  const referencedPaths = [
    result.deterministicBeforePath,
    result.deterministicAfterPath,
    result.actorOutputPath,
    result.workspaceAssertionsPath,
    result.patchPath,
    ...(result.judgeOutputPath === null ? [] : [result.judgeOutputPath]),
    ...(result.judgeSkippedPath === null ? [] : [result.judgeSkippedPath]),
  ];
  const expectedPathPrefix = `cases/${result.caseId}/`;

  if (
    new Set(referencedPaths).size !== referencedPaths.length ||
    referencedPaths.some((relativePath) => !relativePath.startsWith(expectedPathPrefix))
  ) {
    throw new Error(`Qualification case ${result.caseId} has invalid artifact references.`);
  }

  for (const relativePath of referencedPaths) {
    const artifactPath = resolveContainedPath(attemptDirectory, relativePath);
    requireFile(artifactPath);

    if (
      !artifacts.some(
        ({ path }) => path === getRepositoryRelativePath(repositoryRoot, artifactPath),
      )
    ) {
      throw new Error(`Qualification case ${result.caseId} references an unrecorded artifact.`);
    }
  }

  const casePrefix = `${getRepositoryRelativePath(
    repositoryRoot,
    join(attemptDirectory, 'cases', result.caseId),
  )}/`;

  if (
    (result.judgeStatus === 'completed' &&
      (result.judgeOutputPath === null || result.judgeSkippedPath !== null)) ||
    (result.judgeStatus === 'skipped' &&
      (result.judgeOutputPath !== null || result.judgeSkippedPath === null))
  ) {
    throw new Error(`Qualification case ${result.caseId} has inconsistent judge artifacts.`);
  }

  const caseEvidence: IQualificationAttemptCaseModel = {
    actor: readAttemptArtifact(attemptDirectory, result.actorOutputPath, ActorOutputSchema),
    artifacts: artifacts.filter(({ path }) => path.startsWith(casePrefix)),
    deterministicAfter: readDeterministicArtifactSummary(
      attemptDirectory,
      result.deterministicAfterPath,
    ),
    deterministicBefore: readDeterministicArtifactSummary(
      attemptDirectory,
      result.deterministicBeforePath,
    ),
    judge:
      result.judgeOutputPath === null
        ? null
        : readAttemptArtifact(attemptDirectory, result.judgeOutputPath, JudgeOutputSchema),
    judgeSkipped:
      result.judgeSkippedPath === null
        ? null
        : readAttemptArtifact(
            attemptDirectory,
            result.judgeSkippedPath,
            QualificationJudgeSkippedSchema,
          ),
    result,
    workspaceAssertions: readAttemptArtifact(
      attemptDirectory,
      result.workspaceAssertionsPath,
      WorkspaceAssertionResultSchema,
    ),
  };

  assertQualificationCaseEvidence({ ...caseEvidence, profileCase });

  return caseEvidence;
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

  const artifacts = verifyArtifactDigests(repositoryRoot, attemptDirectory, result.artifactDigests);
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

    return loadAttemptCase(repositoryRoot, attemptDirectory, caseResult, artifacts, profileCase);
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

/** Requires every published profile to point to its current validated terminal attempt. */
export const assertPublishableQualificationEvidence = (
  qualification: IQualificationWebsiteModel,
): void => {
  if (qualification.profiles.length === 0) {
    throw new Error('Qualification evidence must contain at least one public profile.');
  }

  for (const profile of qualification.profiles) {
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
