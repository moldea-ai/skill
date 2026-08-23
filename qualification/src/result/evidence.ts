import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { QualificationBaselineCheckSchema } from '../baseline/types.ts';
import { QualificationCoverageResultSchema } from '../coverage/index.ts';
import {
  ActorOutputSchema,
  DeterministicVerificationArtifactSchema,
  JudgeOutputSchema,
  QualificationCaseResultSchema,
  QualificationCaseScenarioSchema,
  QualificationExecutionErrorSchema,
  QualificationJudgeSkippedSchema,
  QualificationModelStageEvidenceSchema,
  QualificationProbesSchema,
  QualificationProfileSchema,
  QualificationSourceStateResultSchema,
  WorkspaceAssertionResultSchema,
  type IActorOutput,
  type IDeterministicVerificationArtifact,
  type IJudgeOutput,
  type IQualificationAttemptResult,
  type IQualificationCaseResult,
  type IQualificationCaseScenario,
  type IQualificationModelStageEvidence,
  type IQualificationStageCheckpoint,
  type IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  readJsonFile,
  readYamlFile,
  resolveContainedPath,
  type IBoundarySchema,
} from '../filesystem/index.ts';
import { matchesWorkspacePathContract } from '../project-fixture/index.ts';

const JsonObjectSchema = z.record(z.string(), z.unknown());

const hasPath = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const haveSameMembers = (left: readonly string[], right: readonly string[]): boolean => {
  const normalizedLeft = [...new Set(left)].sort((first, second) =>
    first.localeCompare(second, 'en'),
  );
  const normalizedRight = [...new Set(right)].sort((first, second) =>
    first.localeCompare(second, 'en'),
  );

  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
};

const requireUniqueMembers = (members: readonly string[], label: string): void => {
  if (new Set(members).size !== members.length) {
    throw new Error(`${label} must be unique.`);
  }
};

const createExpectedStageIds = (caseIds: readonly string[]): string[] => [
  'source-state',
  'coverage',
  'candidate',
  'baseline',
  ...caseIds.flatMap((caseId) => [
    `case:${caseId}:prepare`,
    `case:${caseId}:deterministic-before`,
    `case:${caseId}:actor`,
    `case:${caseId}:deterministic-after`,
    `case:${caseId}:assertions`,
    `case:${caseId}:judge`,
    `case:${caseId}:result`,
  ]),
];

const createExpectedCaseArtifactPaths = (caseId: string): string[] => {
  const caseRoot = `cases/${caseId}`;

  return [
    `${caseRoot}/actor-evidence.json`,
    `${caseRoot}/actor-events.jsonl`,
    `${caseRoot}/actor-output.json`,
    `${caseRoot}/actor-output.schema.json`,
    `${caseRoot}/actor-prompt.md`,
    `${caseRoot}/case-result.json`,
    `${caseRoot}/deterministic-after.json`,
    `${caseRoot}/deterministic-before.json`,
    `${caseRoot}/judge-evidence.json`,
    `${caseRoot}/judge-events.jsonl`,
    `${caseRoot}/judge-output.json`,
    `${caseRoot}/judge-output.schema.json`,
    `${caseRoot}/judge-prompt.md`,
    `${caseRoot}/workspace-assertions.json`,
    `${caseRoot}/workspace.patch`,
  ];
};

const createExpectedPassingArtifactPaths = (caseIds: readonly string[]): string[] =>
  [
    'baseline.json',
    'coverage.json',
    'source-state.json',
    ...caseIds.flatMap(createExpectedCaseArtifactPaths),
  ].sort((left, right) => left.localeCompare(right, 'en'));

const requireArtifact = <TResult>(
  attemptDirectory: string,
  result: IQualificationAttemptResult,
  relativePath: string,
  schema: IBoundarySchema<TResult>,
): Promise<TResult> => {
  if (result.artifactDigests[relativePath] === undefined) {
    throw new Error(`Qualification evidence is missing artifact ${relativePath}.`);
  }

  return readJsonFile(resolveContainedPath(attemptDirectory, relativePath), schema);
};

const readOptionalArtifact = async <TResult>(
  attemptDirectory: string,
  relativePath: string,
  schema: IBoundarySchema<TResult>,
): Promise<TResult | null> => {
  const artifactPath = resolveContainedPath(attemptDirectory, relativePath);
  return (await hasPath(artifactPath)) ? readJsonFile(artifactPath, schema) : null;
};

/** Validates every JSON and JSON Lines artifact against its protocol-owned syntax and schema. */
const validateArtifactSchemas = async (
  attemptDirectory: string,
  result: IQualificationAttemptResult,
): Promise<void> => {
  for (const relativePath of Object.keys(result.artifactDigests)) {
    const artifactPath = resolveContainedPath(attemptDirectory, relativePath);

    if (relativePath.endsWith('.jsonl')) {
      const source = await readFile(artifactPath, 'utf8');

      for (const eventLine of source.split('\n')) {
        if (eventLine.trim() !== '') {
          JSON.parse(eventLine) as unknown;
        }
      }
      continue;
    }

    if (!relativePath.endsWith('.json')) {
      if (!relativePath.endsWith('.md') && !relativePath.endsWith('.patch')) {
        throw new Error(`Qualification evidence contains unsupported artifact ${relativePath}.`);
      }
      continue;
    }

    if (relativePath === 'baseline.json') {
      await readJsonFile(artifactPath, QualificationBaselineCheckSchema);
    } else if (relativePath === 'coverage.json') {
      await readJsonFile(artifactPath, QualificationCoverageResultSchema);
    } else if (relativePath === 'source-state.json') {
      await readJsonFile(artifactPath, QualificationSourceStateResultSchema);
    } else if (relativePath === 'error.json' || relativePath === 'interruption.json') {
      await readJsonFile(artifactPath, QualificationExecutionErrorSchema);
    } else if (/^cases\/[^/]+\/actor-output\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, ActorOutputSchema);
    } else if (/^cases\/[^/]+\/judge-output\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, JudgeOutputSchema);
    } else if (/^cases\/[^/]+\/deterministic-(?:after|before)\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, DeterministicVerificationArtifactSchema);
    } else if (/^cases\/[^/]+\/workspace-assertions\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, WorkspaceAssertionResultSchema);
    } else if (/^cases\/[^/]+\/judge-skipped\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, QualificationJudgeSkippedSchema);
    } else if (/^cases\/[^/]+\/case-result\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, QualificationCaseResultSchema);
    } else if (/^cases\/[^/]+\/(?:actor|judge)-evidence\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, QualificationModelStageEvidenceSchema);
    } else if (/^cases\/[^/]+\/(?:actor|judge)-output\.schema\.json$/u.test(relativePath)) {
      await readJsonFile(artifactPath, JsonObjectSchema);
    } else {
      throw new Error(`Qualification evidence contains unsupported JSON artifact ${relativePath}.`);
    }
  }
};

const assertPassingDeterministicEvidence = (
  artifact: IDeterministicVerificationArtifact,
  expectedInspectionStatus: 'invalid' | 'valid',
  label: string,
): void => {
  const verification = artifact.summary;

  if (
    !verification.passed ||
    verification.inspectionStatus !== expectedInspectionStatus ||
    !verification.repositoryFilesystemValid ||
    !verification.memoryRepositoryEquivalent ||
    !verification.coreValid ||
    !verification.cliCompatibilityValid ||
    !verification.cliIdentityValid ||
    !verification.cliPackageInventoryValid ||
    !verification.cliAdapterInventoryValid ||
    !verification.cliEnvelopeValid ||
    verification.cliValidateStatus !== expectedInspectionStatus ||
    verification.cliInspectStatus !== expectedInspectionStatus ||
    !verification.typecheckPassed ||
    !verification.repositoryUnchanged ||
    verification.failures.length > 0
  ) {
    throw new Error(`Passing qualification evidence has contradictory ${label}.`);
  }
};

const findWorkspaceEntry = (entries: IWorkspaceAssertionResult['after'], expectedPath: string) =>
  entries.find(({ path: candidatePath }) => candidatePath === expectedPath);

const areWorkspaceEntriesEqual = (
  before: IWorkspaceAssertionResult['before'][number] | undefined,
  after: IWorkspaceAssertionResult['after'][number] | undefined,
): boolean =>
  before !== undefined &&
  after !== undefined &&
  before.kind === after.kind &&
  before.mode === after.mode &&
  before.sha256 === after.sha256;

const calculateChangedPaths = (assertions: IWorkspaceAssertionResult): string[] => {
  requireUniqueMembers(
    assertions.before.map(({ path: entryPath }) => entryPath),
    'Workspace before paths',
  );
  requireUniqueMembers(
    assertions.after.map(({ path: entryPath }) => entryPath),
    'Workspace after paths',
  );
  const beforeByPath = new Map(assertions.before.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(assertions.after.map((entry) => [entry.path, entry]));

  return [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])]
    .filter(
      (relativePath) =>
        !areWorkspaceEntriesEqual(beforeByPath.get(relativePath), afterByPath.get(relativePath)),
    )
    .sort((left, right) => left.localeCompare(right, 'en'));
};

const containsWorkspacePath = (
  entries: IWorkspaceAssertionResult['after'],
  expectedPath: string,
): boolean =>
  entries.some(
    ({ path: candidatePath }) =>
      candidatePath === expectedPath || candidatePath.startsWith(`${expectedPath}/`),
  );

const assertPassingWorkspaceEvidence = (
  actor: IActorOutput,
  assertions: IWorkspaceAssertionResult,
  scenario: IQualificationCaseScenario,
): void => {
  if (!assertions.passed || assertions.failures.length > 0) {
    throw new Error(`Passing case ${scenario.id} has failing workspace assertions.`);
  }

  requireUniqueMembers(assertions.changedPaths, `Case ${scenario.id} changed paths`);
  requireUniqueMembers(actor.changedFiles, `Case ${scenario.id} actor changed files`);
  const observedChangedPaths = calculateChangedPaths(assertions);

  if (
    JSON.stringify(assertions.changedPaths) !== JSON.stringify(observedChangedPaths) ||
    !haveSameMembers(actor.changedFiles, assertions.changedPaths)
  ) {
    throw new Error(`Case ${scenario.id} actor output contradicts observed workspace changes.`);
  }

  if (
    assertions.changedPaths.some(
      (changedPath) =>
        !matchesWorkspacePathContract(
          changedPath,
          scenario.workspace.allowedChangePaths,
          scenario.workspace.allowedChangePathPatterns,
        ),
    ) ||
    scenario.workspace.mustChangePaths.some(
      (requiredPath) => !assertions.changedPaths.includes(requiredPath),
    ) ||
    scenario.workspace.mustChangePathPatterns.some(
      (requiredPattern) =>
        !assertions.changedPaths.some((changedPath) =>
          matchesWorkspacePathContract(changedPath, [], [requiredPattern]),
        ),
    ) ||
    (scenario.workspace.expectation === 'unchanged' && assertions.changedPaths.length > 0) ||
    (scenario.workspace.expectation === 'changed' && assertions.changedPaths.length === 0)
  ) {
    throw new Error(`Case ${scenario.id} changed paths contradict its workspace contract.`);
  }

  for (const preservedPath of scenario.workspace.mustPreservePaths) {
    const before = findWorkspaceEntry(assertions.before, preservedPath);
    const after = findWorkspaceEntry(assertions.after, preservedPath);

    if (!areWorkspaceEntriesEqual(before, after)) {
      throw new Error(`Case ${scenario.id} did not preserve ${preservedPath}.`);
    }
  }

  if (
    scenario.workspace.mustExistPaths.some(
      (expectedPath) => !containsWorkspacePath(assertions.after, expectedPath),
    ) ||
    scenario.workspace.mustNotExistPaths.some((expectedPath) =>
      containsWorkspacePath(assertions.after, expectedPath),
    )
  ) {
    throw new Error(`Case ${scenario.id} has contradictory workspace existence evidence.`);
  }
};

const assertModelEvidence = (options: {
  attemptId: string;
  caseResult: IQualificationCaseResult;
  evidence: IQualificationModelStageEvidence;
  role: 'actor' | 'judge';
  stage: IQualificationStageCheckpoint;
}): void => {
  const expectedCreatedAt =
    options.role === 'actor'
      ? options.caseResult.actorEvidenceCreatedAt
      : options.caseResult.judgeEvidenceCreatedAt;
  const expectedUsage =
    options.role === 'actor' ? options.caseResult.actorUsage : options.caseResult.judgeUsage;
  const expectedCacheSourceAttemptId =
    options.role === 'actor'
      ? options.caseResult.actorCacheSourceAttemptId
      : options.caseResult.judgeCacheSourceAttemptId;
  const isCached = expectedCacheSourceAttemptId !== null;

  if (
    options.evidence.role !== options.role ||
    options.evidence.createdAt !== expectedCreatedAt ||
    JSON.stringify(options.evidence.usage) !== JSON.stringify(expectedUsage) ||
    options.evidence.cacheSourceAttemptId !== expectedCacheSourceAttemptId ||
    options.evidence.sourceAttemptId !== (expectedCacheSourceAttemptId ?? options.attemptId) ||
    options.stage.cacheKey !== options.evidence.cacheKey ||
    options.stage.cacheSourceAttemptId !== expectedCacheSourceAttemptId ||
    options.stage.status !== (isCached ? 'cached' : 'passed')
  ) {
    throw new Error(
      `Case ${options.caseResult.caseId} has contradictory ${options.role} provenance.`,
    );
  }
};

const assertJudgeOutput = (judge: IJudgeOutput, scenario: IQualificationCaseScenario): void => {
  const expectedIds = scenario.judgeRequirements.map(({ id }) => id);
  const actualIds = judge.requirements.map(({ id }) => id);
  requireUniqueMembers(actualIds, `Case ${scenario.id} judge requirement ids`);

  if (
    !haveSameMembers(actualIds, expectedIds) ||
    judge.verdict !== 'pass' ||
    judge.requirements.some(({ verdict }) => verdict !== 'pass') ||
    judge.failures.length > 0
  ) {
    throw new Error(`Passing case ${scenario.id} has contradictory judge evidence.`);
  }
};

const assertPassingCaseEvidence = async (options: {
  attemptDirectory: string;
  result: IQualificationAttemptResult;
  caseResult: IQualificationCaseResult;
  scenario: IQualificationCaseScenario;
  stages: ReadonlyMap<string, IQualificationStageCheckpoint>;
}): Promise<void> => {
  const { caseResult, scenario } = options;
  const caseRoot = `cases/${caseResult.caseId}`;
  const expectedPaths = {
    actorOutput: `${caseRoot}/actor-output.json`,
    deterministicAfter: `${caseRoot}/deterministic-after.json`,
    deterministicBefore: `${caseRoot}/deterministic-before.json`,
    judgeOutput: `${caseRoot}/judge-output.json`,
    patch: `${caseRoot}/workspace.patch`,
    workspaceAssertions: `${caseRoot}/workspace-assertions.json`,
  };

  if (
    caseResult.title !== scenario.title ||
    caseResult.status !== 'passed' ||
    caseResult.failures.length > 0 ||
    caseResult.deterministicBeforePath !== expectedPaths.deterministicBefore ||
    caseResult.deterministicAfterPath !== expectedPaths.deterministicAfter ||
    caseResult.actorOutputPath !== expectedPaths.actorOutput ||
    caseResult.judgeStatus !== 'completed' ||
    caseResult.judgeOutputPath !== expectedPaths.judgeOutput ||
    caseResult.judgeSkippedPath !== null ||
    caseResult.workspaceAssertionsPath !== expectedPaths.workspaceAssertions ||
    caseResult.patchPath !== expectedPaths.patch
  ) {
    throw new Error(`Passing case ${caseResult.caseId} has contradictory result references.`);
  }

  const [
    actor,
    actorEvidence,
    deterministicAfter,
    deterministicBefore,
    judge,
    judgeEvidence,
    assertions,
  ] = await Promise.all([
    requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.actorOutput,
      ActorOutputSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      `${caseRoot}/actor-evidence.json`,
      QualificationModelStageEvidenceSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.deterministicAfter,
      DeterministicVerificationArtifactSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.deterministicBefore,
      DeterministicVerificationArtifactSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.judgeOutput,
      JudgeOutputSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      `${caseRoot}/judge-evidence.json`,
      QualificationModelStageEvidenceSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.workspaceAssertions,
      WorkspaceAssertionResultSchema,
    ),
  ]);
  const recordedCaseResult = await requireArtifact(
    options.attemptDirectory,
    options.result,
    `${caseRoot}/case-result.json`,
    QualificationCaseResultSchema,
  );

  if (JSON.stringify(recordedCaseResult) !== JSON.stringify(caseResult)) {
    throw new Error(`Case ${caseResult.caseId} summary contradicts case-result.json.`);
  }

  if (actor.outcome !== scenario.expectedActorOutcome) {
    throw new Error(`Passing case ${caseResult.caseId} has the wrong actor outcome.`);
  }

  assertPassingDeterministicEvidence(
    deterministicBefore,
    scenario.inspection.before,
    `${caseResult.caseId} pre-actor deterministic evidence`,
  );
  assertPassingDeterministicEvidence(
    deterministicAfter,
    scenario.inspection.after,
    `${caseResult.caseId} post-actor deterministic evidence`,
  );
  assertPassingWorkspaceEvidence(actor, assertions, scenario);
  assertJudgeOutput(judge, scenario);

  const expectedActorOutputSchema = z.toJSONSchema(ActorOutputSchema);
  const expectedJudgeOutputSchema = z.toJSONSchema(JudgeOutputSchema);
  const [actorOutputSchema, judgeOutputSchema] = await Promise.all([
    requireArtifact(
      options.attemptDirectory,
      options.result,
      `${caseRoot}/actor-output.schema.json`,
      JsonObjectSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      `${caseRoot}/judge-output.schema.json`,
      JsonObjectSchema,
    ),
  ]);

  if (
    JSON.stringify(actorOutputSchema) !== JSON.stringify(expectedActorOutputSchema) ||
    JSON.stringify(judgeOutputSchema) !== JSON.stringify(expectedJudgeOutputSchema)
  ) {
    throw new Error(`Case ${caseResult.caseId} has contradictory model output schemas.`);
  }

  const actorStage = options.stages.get(`case:${caseResult.caseId}:actor`);
  const judgeStage = options.stages.get(`case:${caseResult.caseId}:judge`);

  if (actorStage === undefined || judgeStage === undefined) {
    throw new Error(`Case ${caseResult.caseId} is missing model-stage provenance.`);
  }

  assertModelEvidence({
    attemptId: options.result.attemptId,
    caseResult,
    evidence: actorEvidence,
    role: 'actor',
    stage: actorStage,
  });
  assertModelEvidence({
    attemptId: options.result.attemptId,
    caseResult,
    evidence: judgeEvidence,
    role: 'judge',
    stage: judgeStage,
  });
};

const assertPassingStages = (
  result: IQualificationAttemptResult,
  expectedStageIds: readonly string[],
): Map<string, IQualificationStageCheckpoint> => {
  const actualStageIds = result.stages.map(({ id }) => id);

  if (JSON.stringify(actualStageIds) !== JSON.stringify(expectedStageIds)) {
    throw new Error('Passing qualification evidence has an incomplete stage inventory.');
  }

  const stages = new Map(result.stages.map((stage) => [stage.id, stage]));

  for (const stage of result.stages) {
    const isModelStage = stage.id.endsWith(':actor') || stage.id.endsWith(':judge');
    const hasCompletedState =
      stage.startedAt !== null &&
      stage.completedAt !== null &&
      stage.durationMs !== null &&
      stage.error === null;
    const hasValidStatus = isModelStage
      ? stage.status === 'cached' || stage.status === 'passed'
      : stage.status === 'passed';
    const hasValidCacheState = isModelStage
      ? stage.cacheKey !== null &&
        (stage.status === 'cached'
          ? stage.cacheSourceAttemptId !== null
          : stage.cacheSourceAttemptId === null)
      : stage.cacheKey === null && stage.cacheSourceAttemptId === null;

    if (!hasCompletedState || !hasValidStatus || !hasValidCacheState) {
      throw new Error(`Passing qualification stage ${stage.id} has contradictory state.`);
    }
  }

  return stages;
};

/** Validates one passing attempt against the exact profile, scenario, and artifact contracts. */
const validatePassingAttempt = async (
  attemptDirectory: string,
  result: IQualificationAttemptResult,
  resultsRoot: string,
): Promise<void> => {
  const profilesRoot = path.resolve(resultsRoot, '..', 'profiles');
  const profileDirectory = path.join(
    profilesRoot,
    result.selection.adapterId,
    result.selection.implementationId,
  );
  const profile = await readYamlFile(
    path.join(profileDirectory, 'profile.yaml'),
    QualificationProfileSchema,
  );

  if (
    profile.adapterId !== result.selection.adapterId ||
    profile.implementationId !== result.selection.implementationId ||
    result.provenance.profileDigest !== (await calculateDirectoryFingerprint(profileDirectory))
  ) {
    throw new Error('Passing qualification evidence does not match its current profile.');
  }

  const profileCaseIds = profile.cases.map(({ id }) => id);
  const resultCaseIds = result.cases.map(({ caseId }) => caseId);
  requireUniqueMembers(profileCaseIds, 'Qualification profile case ids');
  requireUniqueMembers(resultCaseIds, 'Qualification result case ids');

  if (JSON.stringify(resultCaseIds) !== JSON.stringify(profileCaseIds)) {
    throw new Error('Passing qualification evidence does not contain every profile case in order.');
  }

  const expectedArtifactPaths = createExpectedPassingArtifactPaths(profileCaseIds);
  const actualArtifactPaths = Object.keys(result.artifactDigests).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );

  if (JSON.stringify(actualArtifactPaths) !== JSON.stringify(expectedArtifactPaths)) {
    throw new Error('Passing qualification evidence has an incomplete artifact inventory.');
  }

  const [baseline, coverage, probes, sourceState] = await Promise.all([
    requireArtifact(attemptDirectory, result, 'baseline.json', QualificationBaselineCheckSchema),
    requireArtifact(attemptDirectory, result, 'coverage.json', QualificationCoverageResultSchema),
    readYamlFile(
      resolveContainedPath(profileDirectory, profile.probesFile),
      QualificationProbesSchema,
    ),
    requireArtifact(
      attemptDirectory,
      result,
      'source-state.json',
      QualificationSourceStateResultSchema,
    ),
  ]);
  const declaredClaims = probes.probes.map(({ matrixPath }) => matrixPath);
  const hasPassingCoverage =
    probes.adapterId === result.selection.adapterId &&
    probes.implementationId === result.selection.implementationId &&
    coverage.passed &&
    coverage.missingClaims.length === 0 &&
    coverage.unknownClaims.length === 0 &&
    coverage.uncoveredCaseIds.length === 0 &&
    haveSameMembers(coverage.requiredClaims, coverage.declaredClaims) &&
    haveSameMembers(coverage.declaredClaims, declaredClaims);
  const hasPassingSourceState =
    sourceState.passed &&
    sourceState.requiresCleanInputs &&
    sourceState.isExecutionHostTrusted &&
    !sourceState.packagesRepositoryDirty &&
    !sourceState.qualificationRepositoryDirty &&
    !sourceState.skillRepositoryDirty &&
    sourceState.failures.length === 0 &&
    !result.provenance.packagesRepositoryDirty &&
    !result.provenance.qualificationRepositoryDirty &&
    !result.provenance.skillRepositoryDirty;
  const hasPassingBaseline =
    result.selection.adapterId === 'custom'
      ? !baseline.required &&
        baseline.passed &&
        baseline.status === 'not-required' &&
        baseline.baselineAttemptId === null &&
        result.provenance.baselineAttemptId === null &&
        baseline.failures.length === 0
      : baseline.required &&
        baseline.passed &&
        baseline.status === 'passed' &&
        baseline.baselineAttemptId === result.provenance.baselineAttemptId &&
        baseline.failures.length === 0;

  if (!hasPassingCoverage || !hasPassingSourceState || !hasPassingBaseline) {
    throw new Error('Passing qualification evidence has contradictory control artifacts.');
  }

  const stages = assertPassingStages(result, createExpectedStageIds(profileCaseIds));
  const evidenceTimestamps: string[] = [];

  for (const [index, profileCase] of profile.cases.entries()) {
    const scenario = await readYamlFile(
      resolveContainedPath(
        resolveContainedPath(profileDirectory, profileCase.projectDirectory),
        profileCase.scenarioFile,
      ),
      QualificationCaseScenarioSchema,
    );
    const caseResult = result.cases[index];

    if (scenario.id !== profileCase.id || caseResult === undefined) {
      throw new Error(`Qualification case ${profileCase.id} contradicts its profile identity.`);
    }

    await assertPassingCaseEvidence({
      attemptDirectory,
      result,
      caseResult,
      scenario,
      stages,
    });
    evidenceTimestamps.push(
      caseResult.actorEvidenceCreatedAt,
      ...(caseResult.judgeEvidenceCreatedAt === null ? [] : [caseResult.judgeEvidenceCreatedAt]),
    );
  }

  const evidenceGeneratedAt = evidenceTimestamps
    .sort((left, right) => left.localeCompare(right, 'en'))
    .at(0);

  if (
    result.completedAt === null ||
    result.evidenceGeneratedAt !== evidenceGeneratedAt ||
    (await hasPath(path.join(attemptDirectory, 'error.json'))) ||
    (await hasPath(path.join(attemptDirectory, 'interruption.json')))
  ) {
    throw new Error('Passing qualification evidence has contradictory completion state.');
  }
};

/** Validates the public artifacts and status contract for one committed attempt. */
export const validateQualificationAttemptEvidence = async (options: {
  attemptDirectory: string;
  result: IQualificationAttemptResult;
  resultsRoot: string;
}): Promise<void> => {
  await validateArtifactSchemas(options.attemptDirectory, options.result);
  const executionError = await readOptionalArtifact(
    options.attemptDirectory,
    'error.json',
    QualificationExecutionErrorSchema,
  );
  const interruption = await readOptionalArtifact(
    options.attemptDirectory,
    'interruption.json',
    QualificationExecutionErrorSchema,
  );

  if (
    (options.result.status === 'errored' && (executionError === null || interruption !== null)) ||
    (options.result.status === 'incomplete' &&
      (interruption === null || executionError !== null)) ||
    ((options.result.status === 'failed' || options.result.status === 'passed') &&
      (executionError !== null || interruption !== null)) ||
    (options.result.status === 'incomplete') !== (options.result.completedAt === null)
  ) {
    throw new Error('Qualification attempt has contradictory error or completion evidence.');
  }

  if (options.result.status === 'passed') {
    await validatePassingAttempt(options.attemptDirectory, options.result, options.resultsRoot);
  }
};
