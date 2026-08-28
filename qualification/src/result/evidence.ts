import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { QualificationBaselineCheckSchema } from '../baseline/types.ts';
import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  QUALIFICATION_TRIAL_IDS,
} from '../constants/index.ts';
import {
  ActorOutputSchema,
  DeterministicVerificationArtifactSchema,
  JudgeOutputSchema,
  QualificationCaseResultSchema,
  QualificationCaseScenarioSchema,
  QualificationExecutionErrorSchema,
  QualificationHistoricalCaseResultSchema,
  QualificationHistoricalActorOutputSchema,
  QualificationHistoricalDeterministicVerificationArtifactSchema,
  QualificationHistoricalJudgeSkippedSchema,
  QualificationHistoricalModelStageEvidenceSchema,
  QualificationJudgeSkippedSchema,
  QualificationModelStageEvidenceSchema,
  QualificationProjectedExecutionEventSchema,
  QualificationRequirementAssessmentSchema,
  QualificationProbesSchema,
  QualificationProfileSchema,
  QualificationSourceStateResultSchema,
  QualificationTrialResultSchema,
  WorkspaceAssertionResultSchema,
  type IActorOutput,
  type IQualificationAttemptResult,
  type IQualificationHistoricalCaseResult,
  type IQualificationHistoricalModelStageEvidence,
  type IQualificationHistoricalStageCheckpoint,
  type IQualificationRecordedDeterministicVerificationArtifact,
  type IJudgeOutput,
  type IQualificationRecordedAttemptResult,
  type IQualificationCaseResult,
  type IQualificationCaseScenario,
  type IQualificationModelStageEvidence,
  type IQualificationStageCheckpoint,
  type IQualificationTrialResult,
  type IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import { QualificationCoverageResultSchema } from '../coverage/index.ts';
import {
  calculateDirectoryFingerprint,
  readJsonFile,
  readYamlFile,
  resolveContainedPath,
  type IBoundarySchema,
} from '../filesystem/index.ts';
import { matchesWorkspacePathContract } from '../project-fixture/index.ts';
import {
  createQualificationStageIds,
  createQualificationTrialStageIds,
} from '../execution/stages.ts';

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

const createExpectedHistoricalStageIds = (caseIds: readonly string[]): string[] => [
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

const createExpectedHistoricalCaseArtifactPaths = (caseId: string): string[] => {
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

const createExpectedHistoricalPassingArtifactPaths = (caseIds: readonly string[]): string[] =>
  [
    'baseline.json',
    'coverage.json',
    'source-state.json',
    ...caseIds.flatMap(createExpectedHistoricalCaseArtifactPaths),
  ].sort((left, right) => left.localeCompare(right, 'en'));

const requireArtifact = <TResult>(
  attemptDirectory: string,
  result: IQualificationRecordedAttemptResult,
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

const getRecordedDeterministicArtifactSchema = (
  protocolVersion: IQualificationRecordedAttemptResult['protocolVersion'],
): IBoundarySchema<IQualificationRecordedDeterministicVerificationArtifact> =>
  protocolVersion >= 5
    ? DeterministicVerificationArtifactSchema
    : QualificationHistoricalDeterministicVerificationArtifactSchema;

/** Validates every JSON and JSON Lines artifact against its protocol-owned syntax and schema. */
const validateArtifactSchemas = async (
  attemptDirectory: string,
  result: IQualificationRecordedAttemptResult,
): Promise<void> => {
  const isCurrentProtocol = result.protocolVersion === QUALIFICATION_EVIDENCE_PROTOCOL_VERSION;
  const trialArtifactPattern = /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/(.+)$/u;

  for (const relativePath of Object.keys(result.artifactDigests)) {
    const artifactPath = resolveContainedPath(attemptDirectory, relativePath);

    if (relativePath.endsWith('.jsonl')) {
      const source = await readFile(artifactPath, 'utf8');

      for (const eventLine of source.split('\n')) {
        if (eventLine.trim() !== '') {
          const event = JSON.parse(eventLine) as unknown;
          if (isCurrentProtocol) QualificationProjectedExecutionEventSchema.parse(event);
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
    } else if (
      (isCurrentProtocol &&
        /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/actor-output\.json$/u.test(
          relativePath,
        )) ||
      (!isCurrentProtocol && /^cases\/[^/]+\/actor-output\.json$/u.test(relativePath))
    ) {
      await readJsonFile(
        artifactPath,
        isCurrentProtocol ? ActorOutputSchema : QualificationHistoricalActorOutputSchema,
      );
    } else if (
      (isCurrentProtocol &&
        /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/judge-output\.json$/u.test(
          relativePath,
        )) ||
      (!isCurrentProtocol && /^cases\/[^/]+\/judge-output\.json$/u.test(relativePath))
    ) {
      await readJsonFile(artifactPath, JudgeOutputSchema);
    } else if (
      (isCurrentProtocol &&
        /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/deterministic-(?:after|before)\.json$/u.test(
          relativePath,
        )) ||
      (!isCurrentProtocol &&
        /^cases\/[^/]+\/deterministic-(?:after|before)\.json$/u.test(relativePath))
    ) {
      await readJsonFile(
        artifactPath,
        getRecordedDeterministicArtifactSchema(result.protocolVersion),
      );
    } else if (
      (isCurrentProtocol &&
        /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/workspace-assertions\.json$/u.test(
          relativePath,
        )) ||
      (!isCurrentProtocol && /^cases\/[^/]+\/workspace-assertions\.json$/u.test(relativePath))
    ) {
      await readJsonFile(artifactPath, WorkspaceAssertionResultSchema);
    } else if (
      (isCurrentProtocol &&
        /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/judge-skipped\.json$/u.test(
          relativePath,
        )) ||
      (!isCurrentProtocol && /^cases\/[^/]+\/judge-skipped\.json$/u.test(relativePath))
    ) {
      await readJsonFile(
        artifactPath,
        isCurrentProtocol
          ? QualificationJudgeSkippedSchema
          : QualificationHistoricalJudgeSkippedSchema,
      );
    } else if (/^cases\/[^/]+\/case-result\.json$/u.test(relativePath)) {
      if (isCurrentProtocol) {
        await readJsonFile(artifactPath, QualificationCaseResultSchema);
      } else {
        await readJsonFile(artifactPath, QualificationHistoricalCaseResultSchema);
      }
    } else if (
      isCurrentProtocol &&
      /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/trial-result\.json$/u.test(
        relativePath,
      )
    ) {
      await readJsonFile(artifactPath, QualificationTrialResultSchema);
    } else if (
      (isCurrentProtocol &&
        /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/(?:actor|judge)-evidence\.json$/u.test(
          relativePath,
        )) ||
      (!isCurrentProtocol && /^cases\/[^/]+\/(?:actor|judge)-evidence\.json$/u.test(relativePath))
    ) {
      await readJsonFile(
        artifactPath,
        isCurrentProtocol
          ? QualificationModelStageEvidenceSchema
          : QualificationHistoricalModelStageEvidenceSchema,
      );
    } else if (
      (isCurrentProtocol &&
        /^cases\/[^/]+\/trials\/(?:initial|confirmation-[12])\/(?:actor|judge)-output\.schema\.json$/u.test(
          relativePath,
        )) ||
      (!isCurrentProtocol &&
        /^cases\/[^/]+\/(?:actor|judge)-output\.schema\.json$/u.test(relativePath))
    ) {
      await readJsonFile(artifactPath, JsonObjectSchema);
    } else if (isCurrentProtocol && trialArtifactPattern.test(relativePath)) {
      throw new Error(
        `Qualification evidence contains unsupported trial artifact ${relativePath}.`,
      );
    } else {
      throw new Error(`Qualification evidence contains unsupported JSON artifact ${relativePath}.`);
    }
  }
};

const assertDeterministicEvidence = (
  artifact: IQualificationRecordedDeterministicVerificationArtifact,
  expectedInspectionStatus: 'invalid' | 'valid',
  label: string,
): void => {
  const verification = artifact.summary;
  const hasPassingState =
    verification.inspectionStatus === expectedInspectionStatus &&
    verification.repositoryFilesystemValid &&
    verification.memoryRepositoryEquivalent &&
    verification.coreValid &&
    ('cliCompositionValid' in verification
      ? verification.cliCompositionValid
      : verification.cliCompatibilityValid) &&
    verification.cliIdentityValid &&
    verification.cliPackageInventoryValid &&
    verification.cliAdapterInventoryValid &&
    verification.cliEnvelopeValid &&
    verification.cliValidateStatus === expectedInspectionStatus &&
    verification.cliInspectStatus === expectedInspectionStatus &&
    verification.typecheckPassed &&
    verification.repositoryUnchanged &&
    verification.failures.length === 0;

  if (
    verification.passed !== hasPassingState ||
    (!verification.passed && verification.failures.length === 0)
  ) {
    throw new Error(`Qualification evidence has contradictory ${label}.`);
  }
};

const assertPassingDeterministicEvidence = (
  artifact: IQualificationRecordedDeterministicVerificationArtifact,
  expectedInspectionStatus: 'invalid' | 'valid',
  label: string,
): void => {
  assertDeterministicEvidence(artifact, expectedInspectionStatus, label);

  if (!artifact.summary.passed) {
    throw new Error(`Passing qualification evidence has failing ${label}.`);
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

const assertWorkspaceEvidence = (
  actor: IActorOutput,
  assertions: IWorkspaceAssertionResult,
  scenario: IQualificationCaseScenario,
): void => {
  requireUniqueMembers(assertions.changedPaths, `Case ${scenario.id} changed paths`);
  requireUniqueMembers(actor.changedFiles, `Case ${scenario.id} actor changed files`);
  const observedChangedPaths = calculateChangedPaths(assertions);

  if (
    JSON.stringify(assertions.changedPaths) !== JSON.stringify(observedChangedPaths) ||
    assertions.passed !== (assertions.failures.length === 0)
  ) {
    throw new Error(`Case ${scenario.id} has contradictory workspace assertion evidence.`);
  }

  const hasContractViolation =
    actor.outcome !== scenario.expectedActorOutcome ||
    !haveSameMembers(actor.changedFiles, assertions.changedPaths) ||
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
    scenario.workspace.mustPreservePaths.some(
      (preservedPath) =>
        !areWorkspaceEntriesEqual(
          findWorkspaceEntry(assertions.before, preservedPath),
          findWorkspaceEntry(assertions.after, preservedPath),
        ),
    ) ||
    scenario.workspace.mustExistPaths.some(
      (expectedPath) => !containsWorkspacePath(assertions.after, expectedPath),
    ) ||
    scenario.workspace.mustNotExistPaths.some((expectedPath) =>
      containsWorkspacePath(assertions.after, expectedPath),
    ) ||
    (scenario.workspace.expectation === 'unchanged' && assertions.changedPaths.length > 0) ||
    (scenario.workspace.expectation === 'changed' && assertions.changedPaths.length === 0);

  if (assertions.passed === hasContractViolation) {
    throw new Error(`Case ${scenario.id} changed paths contradict its workspace contract.`);
  }
};

const assertPassingWorkspaceEvidence = (
  actor: IActorOutput,
  assertions: IWorkspaceAssertionResult,
  scenario: IQualificationCaseScenario,
): void => {
  assertWorkspaceEvidence(actor, assertions, scenario);

  if (!assertions.passed) {
    throw new Error(`Passing case ${scenario.id} has failing workspace assertions.`);
  }
};

const assertHistoricalModelEvidence = (options: {
  attemptId: string;
  caseResult: IQualificationHistoricalCaseResult;
  evidence: IQualificationHistoricalModelStageEvidence;
  role: 'actor' | 'judge';
  stage: IQualificationHistoricalStageCheckpoint;
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

const assertJudgeEvidence = (judge: IJudgeOutput, scenario: IQualificationCaseScenario): void => {
  const expectedIds = scenario.judgeRequirements.map(({ id }) => id);
  const actualIds = judge.requirements.map(({ id }) => id);
  requireUniqueMembers(actualIds, `Case ${scenario.id} judge requirement ids`);
  const hasFailedRequirement = judge.requirements.some(({ verdict }) => verdict === 'fail');

  if (
    !haveSameMembers(actualIds, expectedIds) ||
    (judge.verdict === 'pass' && (hasFailedRequirement || judge.failures.length > 0)) ||
    (judge.verdict === 'fail' && judge.failures.length === 0)
  ) {
    throw new Error(`Case ${scenario.id} has contradictory judge evidence.`);
  }
};

const assertCurrentJudgeEvidence = (
  judge: IJudgeOutput,
  scenario: IQualificationCaseScenario,
): void => {
  const expectedIds = scenario.judgeRequirements
    .filter((requirement) => requirement.evaluation.kind === 'judge')
    .map(({ id }) => id);
  const actualIds = judge.requirements.map(({ id }) => id);
  requireUniqueMembers(actualIds, `Case ${scenario.id} judge requirement ids`);
  const hasFailedRequirement = judge.requirements.some(({ verdict }) => verdict === 'fail');

  if (
    !haveSameMembers(actualIds, expectedIds) ||
    (judge.verdict === 'pass' && (hasFailedRequirement || judge.failures.length > 0)) ||
    (judge.verdict === 'fail' && judge.failures.length === 0)
  ) {
    throw new Error(`Case ${scenario.id} has contradictory current judge evidence.`);
  }
};

const assertJudgeOutput = (judge: IJudgeOutput, scenario: IQualificationCaseScenario): void => {
  assertJudgeEvidence(judge, scenario);

  if (judge.verdict !== 'pass') {
    throw new Error(`Passing case ${scenario.id} has failing judge evidence.`);
  }
};

const assertHistoricalPassingCaseEvidence = async (options: {
  attemptDirectory: string;
  result: IQualificationRecordedAttemptResult;
  caseResult: IQualificationHistoricalCaseResult;
  scenario: IQualificationCaseScenario;
  stages: ReadonlyMap<string, IQualificationHistoricalStageCheckpoint>;
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
      QualificationHistoricalActorOutputSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      `${caseRoot}/actor-evidence.json`,
      QualificationHistoricalModelStageEvidenceSchema,
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.deterministicAfter,
      getRecordedDeterministicArtifactSchema(options.result.protocolVersion),
    ),
    requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.deterministicBefore,
      getRecordedDeterministicArtifactSchema(options.result.protocolVersion),
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
      QualificationHistoricalModelStageEvidenceSchema,
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
    QualificationHistoricalCaseResultSchema,
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

  const expectedActorOutputSchema = z.toJSONSchema(QualificationHistoricalActorOutputSchema);
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

  assertHistoricalModelEvidence({
    attemptId: options.result.attemptId,
    caseResult,
    evidence: actorEvidence,
    role: 'actor',
    stage: actorStage,
  });
  assertHistoricalModelEvidence({
    attemptId: options.result.attemptId,
    caseResult,
    evidence: judgeEvidence,
    role: 'judge',
    stage: judgeStage,
  });
};

const assertHistoricalPassingStages = (
  result: IQualificationRecordedAttemptResult,
  expectedStageIds: readonly string[],
): Map<string, IQualificationHistoricalStageCheckpoint> => {
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

const getCurrentTrialRoot = (caseId: string, trialId: IQualificationTrialResult['trialId']) =>
  `cases/${caseId}/trials/${trialId}`;

const createExpectedCurrentTrialArtifactPaths = (
  caseId: string,
  trial: IQualificationTrialResult,
): string[] => {
  const trialRoot = getCurrentTrialRoot(caseId, trial.trialId);
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
  caseResults: readonly IQualificationCaseResult[],
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

const requireCompletedCurrentStage = (
  stage: IQualificationStageCheckpoint | undefined,
  allowedStatuses: readonly IQualificationStageCheckpoint['status'][],
): IQualificationStageCheckpoint => {
  if (
    stage === undefined ||
    !allowedStatuses.includes(stage.status) ||
    stage.startedAt === null ||
    stage.completedAt === null ||
    stage.durationMs === null ||
    stage.error !== null
  ) {
    throw new Error(`Qualification stage ${stage?.id ?? '<missing>'} is not complete.`);
  }

  return stage;
};

const assertUnusedCurrentStage = (
  stage: IQualificationStageCheckpoint | undefined,
  expectedStatus: 'pending' | 'skipped',
): void => {
  const hasExpectedTiming =
    expectedStatus === 'pending'
      ? stage?.startedAt === null && stage?.completedAt === null && stage?.durationMs === null
      : stage?.startedAt !== null && stage?.completedAt !== null && stage?.durationMs === 0;

  if (
    stage === undefined ||
    stage.status !== expectedStatus ||
    !hasExpectedTiming ||
    stage.cacheKey !== null ||
    stage.cacheSourceAttemptId !== null ||
    stage.error !== null ||
    stage.operationalRetries.length > 0
  ) {
    throw new Error(
      `Qualification stage ${stage?.id ?? '<missing>'} has contradictory ${expectedStatus} state.`,
    );
  }
};

const assertCurrentModelEvidence = (options: {
  attemptId: string;
  caseId: string;
  evidence: IQualificationModelStageEvidence;
  role: 'actor' | 'judge';
  stage: IQualificationStageCheckpoint;
  trial: IQualificationTrialResult;
}): void => {
  const expectedCreatedAt =
    options.role === 'actor'
      ? options.trial.actorEvidenceCreatedAt
      : options.trial.judgeEvidenceCreatedAt;
  const expectedUsage =
    options.role === 'actor' ? options.trial.actorUsage : options.trial.judgeUsage;
  const expectedCacheSourceAttemptId =
    options.role === 'actor'
      ? options.trial.actorCacheSourceAttemptId
      : options.trial.judgeCacheSourceAttemptId;
  const isCached = expectedCacheSourceAttemptId !== null;

  if (
    options.evidence.role !== options.role ||
    options.evidence.trialId !== options.trial.trialId ||
    options.evidence.createdAt !== expectedCreatedAt ||
    JSON.stringify(options.evidence.usage) !== JSON.stringify(expectedUsage) ||
    options.evidence.cacheSourceAttemptId !== expectedCacheSourceAttemptId ||
    options.evidence.sourceAttemptId !== (expectedCacheSourceAttemptId ?? options.attemptId) ||
    options.stage.cacheKey !== options.evidence.cacheKey ||
    options.stage.cacheSourceAttemptId !== expectedCacheSourceAttemptId ||
    options.stage.status !== (isCached ? 'cached' : 'passed') ||
    (options.trial.kind === 'confirmation' && isCached)
  ) {
    throw new Error(
      `Case ${options.caseId} trial ${options.trial.trialId} has contradictory ${options.role} provenance.`,
    );
  }
};

const deriveTrialFailures = (options: {
  actor: IActorOutput;
  deterministicAfter: IQualificationRecordedDeterministicVerificationArtifact;
  judge: IJudgeOutput | null;
  scenario: IQualificationCaseScenario;
  requirementAssessments: IQualificationTrialResult['requirementAssessments'];
  workspaceAssertions: IWorkspaceAssertionResult;
}): string[] => [
  ...(options.actor.outcome === options.scenario.expectedActorOutcome
    ? []
    : [
        `Actor outcome ${options.actor.outcome} did not match expected outcome ${options.scenario.expectedActorOutcome}.`,
      ]),
  ...options.deterministicAfter.summary.failures,
  ...options.workspaceAssertions.failures,
  ...options.requirementAssessments
    .filter(({ verdict }) => verdict === 'fail')
    .map(({ evidence, id }) => `Requirement ${id} failed: ${evidence}`),
  ...(options.judge?.verdict === 'fail' ? options.judge.failures : []),
];

const hasPassingActorCommandPolicy = (
  evidence: IQualificationModelStageEvidence['commandPolicy'],
): boolean =>
  evidence.credentialExposure.status === 'not-observed' &&
  evidence.networkAccess.status === 'not-observed' &&
  evidence.sensitiveAccess.status === 'not-observed';

const deriveRequirementAssessments = (options: {
  actor: IActorOutput;
  actorEvidence: IQualificationModelStageEvidence;
  deterministicAfter: IQualificationRecordedDeterministicVerificationArtifact;
  judge: IJudgeOutput | null;
  scenario: IQualificationCaseScenario;
  workspaceAssertions: IWorkspaceAssertionResult;
}): IQualificationTrialResult['requirementAssessments'] => {
  const judgeById = new Map(
    options.judge?.requirements.map((requirement) => [requirement.id, requirement]),
  );

  return z.array(QualificationRequirementAssessmentSchema).parse(
    options.scenario.judgeRequirements.map((requirement) => {
      if (requirement.evaluation.kind === 'judge') {
        const decision = judgeById.get(requirement.id);
        return decision === undefined
          ? {
              id: requirement.id,
              evaluator: 'judge' as const,
              verdict: 'not-evaluated' as const,
              evidence: 'The skipped judge stage did not evaluate this semantic requirement.',
            }
          : { ...decision, evaluator: 'judge' as const };
      }

      const checkResults = requirement.evaluation.checks.map((check) => {
        switch (check) {
          case 'actor-command-policy':
            return {
              check,
              passed: hasPassingActorCommandPolicy(options.actorEvidence.commandPolicy),
            };
          case 'deterministic-after':
            return { check, passed: options.deterministicAfter.summary.passed };
          case 'expected-actor-outcome':
            return {
              check,
              passed: options.actor.outcome === options.scenario.expectedActorOutcome,
            };
          case 'workspace-assertions':
            return { check, passed: options.workspaceAssertions.passed };
        }
      });
      const failedChecks = checkResults.filter(({ passed }) => !passed).map(({ check }) => check);
      return {
        id: requirement.id,
        evaluator: 'runner' as const,
        verdict: failedChecks.length === 0 ? ('pass' as const) : ('fail' as const),
        evidence:
          failedChecks.length === 0
            ? `Runner checks passed: ${requirement.evaluation.checks.join(', ')}.`
            : `Runner checks failed: ${failedChecks.join(', ')}.`,
      };
    }),
  );
};

const assertCurrentTrialEvidence = async (options: {
  attemptDirectory: string;
  caseId: string;
  result: IQualificationAttemptResult;
  scenario: IQualificationCaseScenario;
  stages: ReadonlyMap<string, IQualificationStageCheckpoint>;
  trial: IQualificationTrialResult;
}): Promise<void> => {
  const trialRoot = getCurrentTrialRoot(options.caseId, options.trial.trialId);
  const expectedPaths = {
    actorOutput: `${trialRoot}/actor-output.json`,
    deterministicAfter: `${trialRoot}/deterministic-after.json`,
    deterministicBefore: `${trialRoot}/deterministic-before.json`,
    judgeOutput: `${trialRoot}/judge-output.json`,
    judgeSkipped: `${trialRoot}/judge-skipped.json`,
    patch: `${trialRoot}/workspace.patch`,
    workspaceAssertions: `${trialRoot}/workspace-assertions.json`,
  };
  const [actor, actorEvidence, deterministicAfter, deterministicBefore, assertions, trialResult] =
    await Promise.all([
      requireArtifact(
        options.attemptDirectory,
        options.result,
        expectedPaths.actorOutput,
        ActorOutputSchema,
      ),
      requireArtifact(
        options.attemptDirectory,
        options.result,
        `${trialRoot}/actor-evidence.json`,
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
        expectedPaths.workspaceAssertions,
        WorkspaceAssertionResultSchema,
      ),
      requireArtifact(
        options.attemptDirectory,
        options.result,
        `${trialRoot}/trial-result.json`,
        QualificationTrialResultSchema,
      ),
    ]);

  if (JSON.stringify(trialResult) !== JSON.stringify(options.trial)) {
    throw new Error(
      `Case ${options.caseId} trial ${options.trial.trialId} contradicts trial-result.json.`,
    );
  }

  const hasExpectedReferences =
    options.trial.deterministicBeforePath === expectedPaths.deterministicBefore &&
    options.trial.deterministicAfterPath === expectedPaths.deterministicAfter &&
    options.trial.actorOutputPath === expectedPaths.actorOutput &&
    options.trial.workspaceAssertionsPath === expectedPaths.workspaceAssertions &&
    options.trial.patchPath === expectedPaths.patch &&
    (options.trial.judgeStatus === 'completed'
      ? options.trial.judgeOutputPath === expectedPaths.judgeOutput &&
        options.trial.judgeSkippedPath === null
      : options.trial.judgeOutputPath === null &&
        options.trial.judgeSkippedPath === expectedPaths.judgeSkipped);

  if (!hasExpectedReferences) {
    throw new Error(
      `Case ${options.caseId} trial ${options.trial.trialId} has contradictory artifact references.`,
    );
  }

  assertPassingDeterministicEvidence(
    deterministicBefore,
    options.scenario.inspection.before,
    `${options.caseId} ${options.trial.trialId} pre-actor deterministic evidence`,
  );

  assertDeterministicEvidence(
    deterministicAfter,
    options.scenario.inspection.after,
    `${options.caseId} ${options.trial.trialId} post-actor deterministic evidence`,
  );
  assertWorkspaceEvidence(actor, assertions, options.scenario);

  const hasJudgeRequirements = options.scenario.judgeRequirements.some(
    (requirement) => requirement.evaluation.kind === 'judge',
  );
  const runnerAssessments = deriveRequirementAssessments({
    actor,
    actorEvidence,
    deterministicAfter,
    judge: null,
    scenario: options.scenario,
    workspaceAssertions: assertions,
  }).filter(({ evaluator }) => evaluator === 'runner');
  const hasFailedRunnerRequirement = runnerAssessments.some(({ verdict }) => verdict === 'fail');
  const shouldSkipJudge =
    !deterministicAfter.summary.passed ||
    !assertions.passed ||
    hasFailedRunnerRequirement ||
    !hasJudgeRequirements;
  let judge: IJudgeOutput | null = null;
  let judgeEvidence: IQualificationModelStageEvidence | null = null;

  if (options.trial.judgeStatus === 'completed') {
    if (shouldSkipJudge) {
      throw new Error(
        `Case ${options.caseId} trial ${options.trial.trialId} ran a judge after deterministic failure.`,
      );
    }

    [judge, judgeEvidence] = await Promise.all([
      requireArtifact(
        options.attemptDirectory,
        options.result,
        expectedPaths.judgeOutput,
        JudgeOutputSchema,
      ),
      requireArtifact(
        options.attemptDirectory,
        options.result,
        `${trialRoot}/judge-evidence.json`,
        QualificationModelStageEvidenceSchema,
      ),
    ]);
    const expectedIds = options.scenario.judgeRequirements
      .filter((requirement) => requirement.evaluation.kind === 'judge')
      .map(({ id }) => id);
    const actualIds = judge.requirements.map(({ id }) => id);
    requireUniqueMembers(actualIds, `Case ${options.caseId} judge requirement ids`);

    if (!haveSameMembers(actualIds, expectedIds)) {
      throw new Error(
        `Case ${options.caseId} trial ${options.trial.trialId} has incomplete judge requirements.`,
      );
    }
    assertCurrentJudgeEvidence(judge, options.scenario);
  } else {
    const judgeSkipped = await requireArtifact(
      options.attemptDirectory,
      options.result,
      expectedPaths.judgeSkipped,
      QualificationJudgeSkippedSchema,
    );

    if (
      !shouldSkipJudge ||
      judgeSkipped.kind !==
        (!hasJudgeRequirements ? 'no-judge-requirements' : 'deterministic-failure') ||
      judgeSkipped.deterministicAfterPassed !== deterministicAfter.summary.passed ||
      judgeSkipped.workspaceAssertionsPassed !== assertions.passed
    ) {
      throw new Error(
        `Case ${options.caseId} trial ${options.trial.trialId} has contradictory judge skip evidence.`,
      );
    }
  }

  const derivedRequirementAssessments = deriveRequirementAssessments({
    actor,
    actorEvidence,
    deterministicAfter,
    judge,
    scenario: options.scenario,
    workspaceAssertions: assertions,
  });
  const derivedFailures = deriveTrialFailures({
    actor,
    deterministicAfter,
    judge,
    requirementAssessments: derivedRequirementAssessments,
    scenario: options.scenario,
    workspaceAssertions: assertions,
  });

  if (
    JSON.stringify(options.trial.requirementAssessments) !==
      JSON.stringify(derivedRequirementAssessments) ||
    options.trial.passed !== (derivedFailures.length === 0) ||
    JSON.stringify(options.trial.failures) !== JSON.stringify(derivedFailures)
  ) {
    throw new Error(
      `Case ${options.caseId} trial ${options.trial.trialId} has a contradictory derived verdict.`,
    );
  }

  if (options.trial.passed) {
    if (judge === null && hasJudgeRequirements) {
      throw new Error(`Passing trial ${options.trial.trialId} is missing judge evidence.`);
    }
    if (judge !== null) assertCurrentJudgeEvidence(judge, options.scenario);
  }

  const [actorOutputSchema, judgeOutputSchema] = await Promise.all([
    requireArtifact(
      options.attemptDirectory,
      options.result,
      `${trialRoot}/actor-output.schema.json`,
      JsonObjectSchema,
    ),
    options.trial.judgeStatus === 'completed'
      ? requireArtifact(
          options.attemptDirectory,
          options.result,
          `${trialRoot}/judge-output.schema.json`,
          JsonObjectSchema,
        )
      : null,
  ]);

  if (
    JSON.stringify(actorOutputSchema) !== JSON.stringify(z.toJSONSchema(ActorOutputSchema)) ||
    (judgeOutputSchema !== null &&
      JSON.stringify(judgeOutputSchema) !== JSON.stringify(z.toJSONSchema(JudgeOutputSchema)))
  ) {
    throw new Error(
      `Case ${options.caseId} trial ${options.trial.trialId} has contradictory model output schemas.`,
    );
  }

  const stagePrefix = `case:${options.caseId}:trial:${options.trial.trialId}`;
  const actorStage = requireCompletedCurrentStage(options.stages.get(`${stagePrefix}:actor`), [
    'cached',
    'passed',
  ]);
  assertCurrentModelEvidence({
    attemptId: options.result.attemptId,
    caseId: options.caseId,
    evidence: actorEvidence,
    role: 'actor',
    stage: actorStage,
    trial: options.trial,
  });

  const prepareStage = requireCompletedCurrentStage(options.stages.get(`${stagePrefix}:prepare`), [
    'passed',
  ]);
  const beforeStage = requireCompletedCurrentStage(
    options.stages.get(`${stagePrefix}:deterministic-before`),
    ['passed'],
  );
  const afterStage = requireCompletedCurrentStage(
    options.stages.get(`${stagePrefix}:deterministic-after`),
    [deterministicAfter.summary.passed ? 'passed' : 'failed'],
  );
  const assertionsStage = requireCompletedCurrentStage(
    options.stages.get(`${stagePrefix}:assertions`),
    [assertions.passed ? 'passed' : 'failed'],
  );

  for (const stage of [prepareStage, beforeStage, afterStage, assertionsStage]) {
    if (
      stage.cacheKey !== null ||
      stage.cacheSourceAttemptId !== null ||
      stage.operationalRetries.length > 0
    ) {
      throw new Error(`Non-model qualification stage ${stage.id} has model-stage evidence.`);
    }
  }

  const judgeStage = options.stages.get(`${stagePrefix}:judge`);

  if (options.trial.judgeStatus === 'completed' && judgeEvidence !== null) {
    const completedJudgeStage = requireCompletedCurrentStage(judgeStage, ['cached', 'passed']);
    assertCurrentModelEvidence({
      attemptId: options.result.attemptId,
      caseId: options.caseId,
      evidence: judgeEvidence,
      role: 'judge',
      stage: completedJudgeStage,
      trial: options.trial,
    });
  } else {
    const skippedJudgeStage = requireCompletedCurrentStage(judgeStage, ['skipped']);

    if (
      skippedJudgeStage.cacheKey !== null ||
      skippedJudgeStage.cacheSourceAttemptId !== null ||
      skippedJudgeStage.operationalRetries.length > 0
    ) {
      throw new Error(`Skipped judge stage ${skippedJudgeStage.id} has model-stage evidence.`);
    }
  }
};

const assertCurrentCaseEvidence = async (options: {
  attemptDirectory: string;
  caseResult: IQualificationCaseResult;
  result: IQualificationAttemptResult;
  scenario: IQualificationCaseScenario;
  stages: ReadonlyMap<string, IQualificationStageCheckpoint>;
}): Promise<void> => {
  if (options.caseResult.title !== options.scenario.title) {
    throw new Error(`Qualification case ${options.caseResult.caseId} has the wrong title.`);
  }

  const recordedCaseResult = await requireArtifact(
    options.attemptDirectory,
    options.result,
    `cases/${options.caseResult.caseId}/case-result.json`,
    QualificationCaseResultSchema,
  );

  if (JSON.stringify(recordedCaseResult) !== JSON.stringify(options.caseResult)) {
    throw new Error(`Case ${options.caseResult.caseId} summary contradicts case-result.json.`);
  }

  for (const trial of options.caseResult.trials) {
    await assertCurrentTrialEvidence({
      attemptDirectory: options.attemptDirectory,
      caseId: options.caseResult.caseId,
      result: options.result,
      scenario: options.scenario,
      stages: options.stages,
      trial,
    });
  }

  const terminalTrial = options.caseResult.trials.at(-1);
  const expectedFailures =
    options.caseResult.status === 'failed' ? (terminalTrial?.failures ?? []) : [];

  if (JSON.stringify(options.caseResult.failures) !== JSON.stringify(expectedFailures)) {
    throw new Error(`Case ${options.caseResult.caseId} has contradictory terminal failures.`);
  }

  const executedTrialIds = new Set(options.caseResult.trials.map(({ trialId }) => trialId));

  for (const trialId of QUALIFICATION_TRIAL_IDS) {
    if (!executedTrialIds.has(trialId)) {
      for (const stageId of createQualificationTrialStageIds(options.caseResult.caseId, trialId)) {
        assertUnusedCurrentStage(options.stages.get(stageId), 'skipped');
      }
    }
  }

  const resultStage = requireCompletedCurrentStage(
    options.stages.get(`case:${options.caseResult.caseId}:result`),
    ['passed'],
  );

  if (
    resultStage.cacheKey !== null ||
    resultStage.cacheSourceAttemptId !== null ||
    resultStage.operationalRetries.length > 0
  ) {
    throw new Error(`Case ${options.caseResult.caseId} result stage has model-stage evidence.`);
  }
};

const validateCurrentTerminalAttempt = async (
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
    throw new Error('Qualification evidence does not match its current profile.');
  }

  const profileCaseIds = profile.cases.map(({ id }) => id);
  const resultCaseIds = result.cases.map(({ caseId }) => caseId);
  requireUniqueMembers(profileCaseIds, 'Qualification profile case ids');
  requireUniqueMembers(resultCaseIds, 'Qualification result case ids');

  const expectedCaseIds =
    result.status === 'passed' ? profileCaseIds : profileCaseIds.slice(0, resultCaseIds.length);
  const hasExpectedCaseVerdict =
    result.status === 'passed'
      ? result.cases.every(({ status }) => status !== 'failed')
      : result.cases.length > 0 &&
        result.cases.at(-1)?.status === 'failed' &&
        result.cases.slice(0, -1).every(({ status }) => status !== 'failed');

  if (
    JSON.stringify(resultCaseIds) !== JSON.stringify(expectedCaseIds) ||
    !hasExpectedCaseVerdict
  ) {
    throw new Error('Qualification evidence has a contradictory case sequence.');
  }

  const expectedArtifactPaths = createExpectedCurrentArtifactPaths(result.cases);
  const actualArtifactPaths = Object.keys(result.artifactDigests).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );

  if (JSON.stringify(actualArtifactPaths) !== JSON.stringify(expectedArtifactPaths)) {
    throw new Error('Qualification evidence has an incomplete protocol 6 artifact inventory.');
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
    throw new Error('Qualification evidence has contradictory control artifacts.');
  }

  const expectedStageIds = createQualificationStageIds(profileCaseIds);
  const actualStageIds = result.stages.map(({ id }) => id);

  if (JSON.stringify(actualStageIds) !== JSON.stringify(expectedStageIds)) {
    throw new Error('Qualification evidence has an incomplete protocol 6 stage inventory.');
  }

  const stages = new Map(result.stages.map((stage) => [stage.id, stage]));

  for (const controlStageId of ['source-state', 'coverage', 'candidate', 'baseline']) {
    const stage = requireCompletedCurrentStage(stages.get(controlStageId), ['passed']);

    if (
      stage.cacheKey !== null ||
      stage.cacheSourceAttemptId !== null ||
      stage.operationalRetries.length > 0
    ) {
      throw new Error(`Control stage ${controlStageId} has model-stage evidence.`);
    }
  }

  const evidenceTimestamps: string[] = [];

  for (const [index, profileCase] of profile.cases.entries()) {
    const caseResult = result.cases[index];

    if (caseResult === undefined) {
      for (const stageId of [
        ...QUALIFICATION_TRIAL_IDS.flatMap((trialId) =>
          createQualificationTrialStageIds(profileCase.id, trialId),
        ),
        `case:${profileCase.id}:result`,
      ]) {
        assertUnusedCurrentStage(stages.get(stageId), 'pending');
      }
      continue;
    }

    const scenario = await readYamlFile(
      resolveContainedPath(
        resolveContainedPath(profileDirectory, profileCase.projectDirectory),
        profileCase.scenarioFile,
      ),
      QualificationCaseScenarioSchema,
    );

    if (scenario.id !== profileCase.id || caseResult.caseId !== profileCase.id) {
      throw new Error(`Qualification case ${profileCase.id} contradicts its profile identity.`);
    }

    await assertCurrentCaseEvidence({
      attemptDirectory,
      caseResult,
      result,
      scenario,
      stages,
    });
    evidenceTimestamps.push(
      ...caseResult.trials.flatMap((trial) => [
        trial.actorEvidenceCreatedAt,
        ...(trial.judgeEvidenceCreatedAt === null ? [] : [trial.judgeEvidenceCreatedAt]),
      ]),
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
    throw new Error('Qualification evidence has contradictory completion state.');
  }
};

/** Validates one historical pass against its immutable artifacts and stable profile identities. */
const validateHistoricalPassingAttempt = async (
  attemptDirectory: string,
  result: IQualificationRecordedAttemptResult,
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
    profile.implementationId !== result.selection.implementationId
  ) {
    throw new Error('Passing qualification evidence does not match its profile identity.');
  }

  const profileCaseIds = profile.cases.map(({ id }) => id);
  const resultCaseIds = result.cases.map(({ caseId }) => caseId);
  requireUniqueMembers(profileCaseIds, 'Qualification profile case ids');
  requireUniqueMembers(resultCaseIds, 'Qualification result case ids');

  if (JSON.stringify(resultCaseIds) !== JSON.stringify(profileCaseIds)) {
    throw new Error('Passing qualification evidence does not contain every profile case in order.');
  }

  const expectedArtifactPaths = createExpectedHistoricalPassingArtifactPaths(profileCaseIds);
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

  const stages = assertHistoricalPassingStages(
    result,
    createExpectedHistoricalStageIds(profileCaseIds),
  );
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

    const historicalCaseResult = QualificationHistoricalCaseResultSchema.parse(caseResult);
    await assertHistoricalPassingCaseEvidence({
      attemptDirectory,
      result,
      caseResult: historicalCaseResult,
      scenario,
      stages,
    });
    evidenceTimestamps.push(
      historicalCaseResult.actorEvidenceCreatedAt,
      ...(historicalCaseResult.judgeEvidenceCreatedAt === null
        ? []
        : [historicalCaseResult.judgeEvidenceCreatedAt]),
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
  result: IQualificationRecordedAttemptResult;
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

  if (
    options.result.protocolVersion === QUALIFICATION_EVIDENCE_PROTOCOL_VERSION &&
    (options.result.status === 'passed' ||
      (options.result.status === 'failed' && options.result.cases.length > 0))
  ) {
    await validateCurrentTerminalAttempt(
      options.attemptDirectory,
      options.result,
      options.resultsRoot,
    );
  } else if (options.result.status === 'passed') {
    await validateHistoricalPassingAttempt(
      options.attemptDirectory,
      options.result,
      options.resultsRoot,
    );
  }
};
