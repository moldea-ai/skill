import path from 'node:path';

import { hasPassingCodexEvaluationCommandPolicy } from '../../../../tooling/codex-evaluation-host/index.mjs';

import type {
  IActorOutput,
  IDeterministicVerification,
  IJudgeOutput,
  IQualificationAttemptResult,
  IQualificationAttemptTrialModel,
  IQualificationBaselineCheck,
  IQualificationCoverageResult,
  IQualificationExecutionError,
  IQualificationJudgeSkipped,
  IQualificationModelStageEvidence,
  IQualificationProfileCaseModel,
  IQualificationSourceStateResult,
  IWorkspaceAssertionResult,
} from './types.ts';

const OFFICIAL_EGRESS_HOSTS = ['api.openai.com', 'auth.openai.com', 'chatgpt.com'] as const;
const TRIAL_IDS = ['initial', 'confirmation-1', 'confirmation-2'] as const;

const createExpectedCurrentStageIds = (caseIds: readonly string[]): string[] => [
  'source-state',
  'coverage',
  'candidate',
  'baseline',
  ...caseIds.flatMap((caseId) => [
    ...TRIAL_IDS.flatMap((trialId) => [
      `case:${caseId}:trial:${trialId}:prepare`,
      `case:${caseId}:trial:${trialId}:deterministic-before`,
      `case:${caseId}:trial:${trialId}:actor`,
      `case:${caseId}:trial:${trialId}:deterministic-after`,
      `case:${caseId}:trial:${trialId}:assertions`,
      `case:${caseId}:trial:${trialId}:judge`,
    ]),
    `case:${caseId}:result`,
  ]),
];

const haveSameMembers = (left: readonly string[], right: readonly string[]): boolean => {
  const sortedLeft = [...new Set(left)].sort((first, second) => first.localeCompare(second, 'en'));
  const sortedRight = [...new Set(right)].sort((first, second) =>
    first.localeCompare(second, 'en'),
  );

  return JSON.stringify(sortedLeft) === JSON.stringify(sortedRight);
};

const assertDeterministicEvidence = (
  verification: IDeterministicVerification,
  expectedInspectionStatus: 'invalid' | 'valid',
  label: string,
): void => {
  const hasPassingState =
    verification.inspectionStatus === expectedInspectionStatus &&
    verification.repositoryFilesystemValid &&
    verification.memoryRepositoryEquivalent &&
    verification.coreValid &&
    verification.cliCompositionValid &&
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
    throw new Error(`Qualification case has contradictory ${label} evidence.`);
  }
};

const assertPassingDeterministicEvidence = (
  verification: IDeterministicVerification,
  expectedInspectionStatus: 'invalid' | 'valid',
  label: string,
): void => {
  assertDeterministicEvidence(verification, expectedInspectionStatus, label);

  if (!verification.passed) {
    throw new Error(`Passing qualification case has failing ${label} evidence.`);
  }
};

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
  const beforePaths = assertions.before.map(({ path: relativePath }) => relativePath);
  const afterPaths = assertions.after.map(({ path: relativePath }) => relativePath);

  if (
    new Set(beforePaths).size !== beforePaths.length ||
    new Set(afterPaths).size !== afterPaths.length
  ) {
    throw new Error('Qualification workspace evidence contains duplicate paths.');
  }

  const beforeByPath = new Map(assertions.before.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(assertions.after.map((entry) => [entry.path, entry]));
  return [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])]
    .filter(
      (relativePath) =>
        !areWorkspaceEntriesEqual(beforeByPath.get(relativePath), afterByPath.get(relativePath)),
    )
    .sort((left, right) => left.localeCompare(right, 'en'));
};

const matchesWorkspacePathContract = (
  candidatePath: string,
  exactPaths: readonly string[],
  pathPatterns: readonly string[],
): boolean =>
  exactPaths.includes(candidatePath) ||
  pathPatterns.some((pathPattern) => path.matchesGlob(candidatePath, pathPattern));

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
  profileCase: IQualificationProfileCaseModel,
): void => {
  const { scenario } = profileCase;
  const observedChangedPaths = calculateChangedPaths(assertions);
  const beforeByPath = new Map(assertions.before.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(assertions.after.map((entry) => [entry.path, entry]));

  if (
    new Set(assertions.changedPaths).size !== assertions.changedPaths.length ||
    new Set(actor.changedFiles).size !== actor.changedFiles.length ||
    JSON.stringify(assertions.changedPaths) !== JSON.stringify(observedChangedPaths) ||
    assertions.passed !== (assertions.failures.length === 0)
  ) {
    throw new Error(`Qualification case ${profileCase.id} has contradictory workspace evidence.`);
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
        !areWorkspaceEntriesEqual(beforeByPath.get(preservedPath), afterByPath.get(preservedPath)),
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
    throw new Error(`Qualification case ${profileCase.id} contradicts its workspace contract.`);
  }
};

const deriveCurrentTrialFailures = (options: {
  actor: IActorOutput;
  actorCommandPolicy: IQualificationModelStageEvidence['commandPolicy'] | null;
  deterministicAfter: IDeterministicVerification;
  judge: IJudgeOutput | null;
  judgeCommandPolicy: IQualificationModelStageEvidence['commandPolicy'] | null;
  profileCase: IQualificationProfileCaseModel;
  requirementAssessments: Extract<
    IQualificationAttemptResult,
    { protocolVersion: 6 }
  >['cases'][number]['trials'][number]['requirementAssessments'];
  workspaceAssertions: IWorkspaceAssertionResult;
}): string[] => [
  ...(options.actor.outcome === options.profileCase.scenario.expectedActorOutcome
    ? []
    : [
        `Actor outcome ${options.actor.outcome} did not match expected outcome ${options.profileCase.scenario.expectedActorOutcome}.`,
      ]),
  ...(options.actorCommandPolicy !== null &&
  hasPassingCodexEvaluationCommandPolicy(options.actorCommandPolicy)
    ? []
    : [
        'Actor command policy observed prohibited credential, network, or sensitive evaluator access.',
      ]),
  ...(options.judgeCommandPolicy === null ||
  hasPassingCodexEvaluationCommandPolicy(options.judgeCommandPolicy)
    ? []
    : [
        'Judge command policy observed prohibited credential, network, or sensitive evaluator access.',
      ]),
  ...options.deterministicAfter.failures,
  ...options.workspaceAssertions.failures,
  ...options.requirementAssessments
    .filter(({ verdict }) => verdict === 'fail')
    .map(({ evidence, id }) => `Requirement ${id} failed: ${evidence}`),
  ...(options.judge?.verdict === 'fail' ? options.judge.failures : []),
];

/** Validates one current trial against its scenario and evidence artifacts. */
export const assertQualificationCaseEvidence = (options: {
  actor: IActorOutput;
  actorCommandPolicy: IQualificationModelStageEvidence['commandPolicy'] | null;
  deterministicAfter: IDeterministicVerification;
  deterministicBefore: IDeterministicVerification;
  judge: IJudgeOutput | null;
  judgeCommandPolicy: IQualificationModelStageEvidence['commandPolicy'] | null;
  judgeSkipped: IQualificationJudgeSkipped | null;
  profileCase: IQualificationProfileCaseModel;
  result: IQualificationAttemptTrialModel['result'];
  workspaceAssertions: IWorkspaceAssertionResult;
}): void => {
  const { actor, deterministicAfter, deterministicBefore, judge, profileCase, result } = options;
  const expectedRequirementIds = profileCase.scenario.judgeRequirements
    .filter((requirement) => requirement.evaluation.kind === 'judge')
    .map(({ id }) => id);
  const actualRequirementIds = judge?.requirements.map(({ id }) => id) ?? [];
  const caseId = profileCase.id;

  if (result.judgeStatus === 'completed' && (judge === null || options.judgeSkipped !== null)) {
    throw new Error(`Qualification case ${caseId} has inconsistent completed judge evidence.`);
  }

  if (result.judgeStatus === 'skipped' && (judge !== null || options.judgeSkipped === null)) {
    throw new Error(`Qualification case ${caseId} has inconsistent skipped judge evidence.`);
  }

  if (
    judge !== null &&
    (new Set(actualRequirementIds).size !== actualRequirementIds.length ||
      !haveSameMembers(actualRequirementIds, expectedRequirementIds))
  ) {
    throw new Error(`Qualification case ${caseId} has inconsistent judge requirements.`);
  }

  const hasFailedRequirement =
    judge?.requirements.some(({ verdict }) => verdict === 'fail') ?? false;

  if (
    judge !== null &&
    ((judge.verdict === 'pass' && (hasFailedRequirement || judge.failures.length > 0)) ||
      (judge.verdict === 'fail' && judge.failures.length === 0))
  ) {
    throw new Error(`Qualification case ${caseId} has a contradictory judge verdict.`);
  }

  const hasPassed = result.passed;

  assertPassingDeterministicEvidence(
    deterministicBefore,
    profileCase.scenario.inspection.before,
    'pre-actor deterministic',
  );
  assertDeterministicEvidence(
    deterministicAfter,
    profileCase.scenario.inspection.after,
    'post-actor deterministic',
  );
  assertWorkspaceEvidence(actor, options.workspaceAssertions, profileCase);

  const hasJudgeRequirements = profileCase.scenario.judgeRequirements.some(
    (requirement) => requirement.evaluation.kind === 'judge',
  );
  const hasFailedRunnerRequirement = result.requirementAssessments.some(
    ({ evaluator, verdict }) => evaluator === 'runner' && verdict === 'fail',
  );
  const hasFailedActorCommandPolicy =
    options.actorCommandPolicy === null ||
    !hasPassingCodexEvaluationCommandPolicy(options.actorCommandPolicy);
  const shouldSkipCurrentJudge =
    !deterministicAfter.passed ||
    !options.workspaceAssertions.passed ||
    hasFailedRunnerRequirement ||
    hasFailedActorCommandPolicy ||
    !hasJudgeRequirements;

  if (
    result.judgeStatus === 'skipped' &&
    (options.judgeSkipped?.deterministicAfterPassed !== deterministicAfter.passed ||
      options.judgeSkipped.workspaceAssertionsPassed !== options.workspaceAssertions.passed ||
      !shouldSkipCurrentJudge ||
      options.judgeSkipped.kind !==
        (!hasJudgeRequirements ? 'no-judge-requirements' : 'deterministic-failure'))
  ) {
    throw new Error(`Qualification case ${caseId} has contradictory judge skip evidence.`);
  }

  const judgeById = new Map(
    judge?.requirements.map((requirement) => [requirement.id, requirement]),
  );
  const derivedAssessments = profileCase.scenario.judgeRequirements.map((requirement) => {
    if (requirement.evaluation.kind === 'judge') {
      const decision = judgeById.get(requirement.id);
      return decision === undefined
        ? {
            id: requirement.id,
            evaluator: 'judge' as const,
            verdict: 'not-evaluated' as const,
            evidence: 'The skipped judge stage did not evaluate this semantic requirement.',
          }
        : {
            id: decision.id,
            evaluator: 'judge' as const,
            verdict: decision.verdict,
            evidence: decision.evidence,
          };
    }

    const commandPolicyPassed =
      options.actorCommandPolicy !== null &&
      hasPassingCodexEvaluationCommandPolicy(options.actorCommandPolicy);
    const failedChecks = requirement.evaluation.checks.filter((check) => {
      switch (check) {
        case 'actor-command-policy':
          return !commandPolicyPassed;
        case 'deterministic-after':
          return !deterministicAfter.passed;
        case 'expected-actor-outcome':
          return actor.outcome !== profileCase.scenario.expectedActorOutcome;
        case 'workspace-assertions':
          return !options.workspaceAssertions.passed;
      }
    });
    return {
      id: requirement.id,
      evaluator: 'runner' as const,
      verdict: failedChecks.length === 0 ? ('pass' as const) : ('fail' as const),
      evidence:
        failedChecks.length === 0
          ? `Runner checks passed: ${requirement.evaluation.checks.join(', ')}.`
          : `Runner checks failed: ${failedChecks.join(', ')}.`,
    };
  });
  const derivedFailures = deriveCurrentTrialFailures({
    actor,
    actorCommandPolicy: options.actorCommandPolicy,
    deterministicAfter,
    judge,
    judgeCommandPolicy: options.judgeCommandPolicy,
    profileCase,
    requirementAssessments: derivedAssessments,
    workspaceAssertions: options.workspaceAssertions,
  });

  if (
    JSON.stringify(result.requirementAssessments) !== JSON.stringify(derivedAssessments) ||
    result.passed !== (derivedFailures.length === 0) ||
    JSON.stringify(result.failures) !== JSON.stringify(derivedFailures)
  ) {
    throw new Error(`Qualification case ${caseId} has a contradictory derived trial verdict.`);
  }

  if (!hasPassed && result.failures.length === 0) {
    throw new Error(`Failed qualification case ${caseId} has no recorded failure.`);
  }

  if (!hasPassed) return;

  if (
    actor.outcome !== profileCase.scenario.expectedActorOutcome ||
    !options.workspaceAssertions.passed ||
    options.workspaceAssertions.failures.length > 0 ||
    (expectedRequirementIds.length > 0 && judge?.verdict !== 'pass') ||
    (expectedRequirementIds.length > 0 && result.judgeStatus !== 'completed') ||
    result.failures.length > 0
  ) {
    throw new Error(`Passing qualification case ${caseId} has contradictory evidence.`);
  }
};

/** Validates one current model artifact against its trial and checkpoint provenance. */
export const assertQualificationTrialModelEvidence = (options: {
  attemptId: string;
  evidence: IQualificationModelStageEvidence;
  role: 'actor' | 'judge';
  stage: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>['stages'][number];
  trial: Extract<
    IQualificationAttemptResult,
    { protocolVersion: 6 }
  >['cases'][number]['trials'][number];
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
      `Qualification trial ${options.trial.trialId} has contradictory ${options.role} provenance.`,
    );
  }
};

const hasValidCurrentCaseHistory = (
  caseResult: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>['cases'][number],
): boolean => {
  const [initial, confirmation1, confirmation2] = caseResult.trials;

  if (initial?.trialId !== 'initial') return false;
  if (initial.passed) {
    return (
      caseResult.trials.length === 1 &&
      caseResult.status === 'passed' &&
      caseResult.confirmationStatus === 'not-required'
    );
  }

  if (confirmation1?.trialId !== 'confirmation-1') return false;
  if (!confirmation1.passed) {
    return (
      caseResult.trials.length === 2 &&
      caseResult.status === 'failed' &&
      caseResult.confirmationStatus === 'rejected'
    );
  }

  return (
    confirmation2?.trialId === 'confirmation-2' &&
    caseResult.trials.length === 3 &&
    (confirmation2.passed
      ? caseResult.status === 'recovered' && caseResult.confirmationStatus === 'passed'
      : caseResult.status === 'failed' && caseResult.confirmationStatus === 'rejected')
  );
};

const hasCompletedStageState = (
  stage: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>['stages'][number] | undefined,
  allowedStatuses: readonly Extract<
    IQualificationAttemptResult,
    { protocolVersion: 6 }
  >['stages'][number]['status'][],
): boolean =>
  stage !== undefined &&
  allowedStatuses.includes(stage.status) &&
  stage.startedAt !== null &&
  stage.completedAt !== null &&
  stage.durationMs !== null &&
  stage.error === null;

const hasValidNonModelStage = (
  stage: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>['stages'][number] | undefined,
  allowedStatuses: readonly Extract<
    IQualificationAttemptResult,
    { protocolVersion: 6 }
  >['stages'][number]['status'][],
): boolean =>
  hasCompletedStageState(stage, allowedStatuses) &&
  stage?.cacheKey === null &&
  stage.cacheSourceAttemptId === null &&
  stage.operationalRetries.length === 0;

const hasValidModelStage = (
  stage: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>['stages'][number] | undefined,
  isConfirmation: boolean,
): boolean => {
  if (
    stage === undefined ||
    !hasCompletedStageState(stage, isConfirmation ? ['passed'] : ['cached', 'passed'])
  ) {
    return false;
  }

  return (
    stage.cacheKey !== null &&
    (stage.status === 'cached'
      ? stage.cacheSourceAttemptId !== null && stage.operationalRetries.length === 0
      : stage.cacheSourceAttemptId === null)
  );
};

const hasValidUnusedCurrentStage = (
  stage: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>['stages'][number] | undefined,
  expectedStatus: 'pending' | 'skipped',
): boolean => {
  const hasExpectedTiming =
    stage !== undefined &&
    (expectedStatus === 'pending'
      ? stage.startedAt === null && stage.completedAt === null && stage.durationMs === null
      : stage.startedAt !== null && stage.completedAt !== null && stage.durationMs === 0);

  return (
    stage !== undefined &&
    stage.status === expectedStatus &&
    hasExpectedTiming &&
    stage.cacheKey === null &&
    stage.cacheSourceAttemptId === null &&
    stage.error === null &&
    stage.operationalRetries.length === 0
  );
};

const hasValidCurrentStages = (
  result: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>,
  profileCaseIds: readonly string[],
): boolean => {
  const expectedStageIds = createExpectedCurrentStageIds(profileCaseIds);
  if (JSON.stringify(result.stages.map(({ id }) => id)) !== JSON.stringify(expectedStageIds)) {
    return false;
  }

  const stages = new Map(result.stages.map((stage) => [stage.id, stage]));
  const controlsPass = ['source-state', 'coverage', 'candidate', 'baseline'].every((stageId) =>
    hasValidNonModelStage(stages.get(stageId), ['passed']),
  );

  if (!controlsPass) return false;

  return profileCaseIds.every((caseId, caseIndex) => {
    const caseResult = result.cases[caseIndex];
    const stageNames = [
      'prepare',
      'deterministic-before',
      'actor',
      'deterministic-after',
      'assertions',
      'judge',
    ];

    if (caseResult === undefined) {
      return [
        ...TRIAL_IDS.flatMap((trialId) =>
          stageNames.map((stageName) => `case:${caseId}:trial:${trialId}:${stageName}`),
        ),
        `case:${caseId}:result`,
      ].every((stageId) => hasValidUnusedCurrentStage(stages.get(stageId), 'pending'));
    }

    if (caseResult.caseId !== caseId || !hasValidCurrentCaseHistory(caseResult)) return false;
    const executedTrialIds = new Set(caseResult.trials.map(({ trialId }) => trialId));
    const trialsAreValid = TRIAL_IDS.every((trialId) => {
      const prefix = `case:${caseId}:trial:${trialId}`;

      if (!executedTrialIds.has(trialId)) {
        return stageNames.every((stageName) =>
          hasValidUnusedCurrentStage(stages.get(`${prefix}:${stageName}`), 'skipped'),
        );
      }

      const actor = stages.get(`${prefix}:actor`);
      const judge = stages.get(`${prefix}:judge`);
      const trial = caseResult.trials.find(
        ({ trialId: candidateTrialId }) => candidateTrialId === trialId,
      );
      const isConfirmation = trialId !== 'initial';
      return (
        trial !== undefined &&
        hasValidNonModelStage(stages.get(`${prefix}:prepare`), ['passed']) &&
        hasValidNonModelStage(stages.get(`${prefix}:deterministic-before`), ['passed']) &&
        hasValidModelStage(actor, isConfirmation) &&
        hasValidNonModelStage(stages.get(`${prefix}:deterministic-after`), ['failed', 'passed']) &&
        hasValidNonModelStage(stages.get(`${prefix}:assertions`), ['failed', 'passed']) &&
        (trial.judgeStatus === 'completed'
          ? hasValidModelStage(judge, isConfirmation)
          : hasValidNonModelStage(judge, ['skipped']))
      );
    });

    return (
      trialsAreValid &&
      hasValidNonModelStage(stages.get(`case:${caseResult.caseId}:result`), ['passed'])
    );
  });
};

const hasValidCurrentCaseSequence = (
  result: Extract<IQualificationAttemptResult, { protocolVersion: 6 }>,
  profileCaseIds: readonly string[],
): boolean => {
  const resultCaseIds = result.cases.map(({ caseId }) => caseId);
  const expectedCaseIds =
    result.status === 'passed' ? profileCaseIds : profileCaseIds.slice(0, resultCaseIds.length);
  const hasExpectedVerdicts =
    result.status === 'passed'
      ? result.cases.every(({ status }) => status !== 'failed')
      : result.status === 'failed' &&
        result.cases.length > 0 &&
        result.cases.at(-1)?.status === 'failed' &&
        result.cases.slice(0, -1).every(({ status }) => status !== 'failed');

  return JSON.stringify(resultCaseIds) === JSON.stringify(expectedCaseIds) && hasExpectedVerdicts;
};

/** Validates one attempt's status against its profile, preflight decision, and public artifacts. */
export const assertQualificationAttemptEvidence = (options: {
  baseline: IQualificationBaselineCheck | null;
  coverage: IQualificationCoverageResult | null;
  error: IQualificationExecutionError | null;
  errorArtifactKind: 'error' | 'interruption' | null;
  profileCaseIds: ReadonlySet<string>;
  probeMatrixPaths: readonly string[];
  result: IQualificationAttemptResult;
  sourceState: IQualificationSourceStateResult | null;
}): void => {
  const { baseline, coverage, error, errorArtifactKind, profileCaseIds, result, sourceState } =
    options;
  const expectedErrorKind =
    result.status === 'errored' ? 'error' : result.status === 'incomplete' ? 'interruption' : null;

  if (
    errorArtifactKind !== expectedErrorKind ||
    (errorArtifactKind === null) !== (error === null)
  ) {
    throw new Error(`Qualification attempt ${result.attemptId} has inconsistent error evidence.`);
  }

  if (
    sourceState &&
    (sourceState.packagesRepositoryDirty !== result.provenance.packagesRepositoryDirty ||
      sourceState.qualificationRepositoryDirty !== result.provenance.qualificationRepositoryDirty ||
      sourceState.skillRepositoryDirty !== result.provenance.skillRepositoryDirty)
  ) {
    throw new Error(`Qualification attempt ${result.attemptId} contradicts its source state.`);
  }

  if (
    result.status === 'failed' &&
    sourceState?.passed !== false &&
    coverage?.passed !== false &&
    baseline?.passed !== false &&
    !result.cases.some(({ status }) => status === 'failed')
  ) {
    throw new Error(`Failed qualification attempt ${result.attemptId} has no failing evidence.`);
  }

  const profileIds = [...profileCaseIds];
  const isCurrentTerminalAttempt =
    result.status === 'passed' || (result.status === 'failed' && result.cases.length > 0);

  if (
    isCurrentTerminalAttempt &&
    (!hasValidCurrentCaseSequence(result, profileIds) ||
      !result.cases.every(hasValidCurrentCaseHistory) ||
      !hasValidCurrentStages(result, profileIds))
  ) {
    const statusLabel = result.status === 'passed' ? 'Passing' : 'Failed';
    throw new Error(`${statusLabel} qualification attempt ${result.attemptId} is incomplete.`);
  }

  if (result.status !== 'passed') return;

  const passingCaseIds = result.cases
    .filter(({ status }) => status === 'passed' || status === 'recovered')
    .map(({ caseId }) => caseId);
  const endpointOrigin = result.provenance.modelEndpoint?.origin ?? null;
  if (
    !haveSameMembers(passingCaseIds, profileIds) ||
    coverage?.passed !== true ||
    coverage.missingClaims.length > 0 ||
    coverage.unknownClaims.length > 0 ||
    coverage.uncoveredCaseIds.length > 0 ||
    !haveSameMembers(coverage.requiredClaims, coverage.declaredClaims) ||
    !haveSameMembers(coverage.declaredClaims, options.probeMatrixPaths) ||
    sourceState?.passed !== true ||
    baseline?.passed !== true ||
    (result.selection.adapterId === 'custom'
      ? baseline.status !== 'not-required' || result.provenance.baselineAttemptId !== null
      : baseline.status !== 'passed' ||
        baseline.baselineAttemptId !== result.provenance.baselineAttemptId) ||
    !sourceState.requiresCleanInputs ||
    !sourceState.isExecutionHostTrusted ||
    sourceState.failures.length > 0 ||
    result.provenance.packagesRepositoryDirty ||
    result.provenance.qualificationRepositoryDirty ||
    result.provenance.skillRepositoryDirty ||
    result.provenance.allowedEgressHosts.length !== OFFICIAL_EGRESS_HOSTS.length ||
    !haveSameMembers(result.provenance.allowedEgressHosts, OFFICIAL_EGRESS_HOSTS) ||
    (endpointOrigin !== null && endpointOrigin !== 'https://api.openai.com') ||
    result.provenance.sslCertificateFileSha256 !== null
  ) {
    throw new Error(`Passing qualification attempt ${result.attemptId} is incomplete.`);
  }
};
