import type {
  IActorOutput,
  IDeterministicVerification,
  IJudgeOutput,
  IQualificationAttemptResult,
  IQualificationBaselineCheck,
  IQualificationCoverageResult,
  IQualificationExecutionError,
  IQualificationJudgeSkipped,
  IQualificationProfileCaseModel,
  IQualificationSourceStateResult,
  IWorkspaceAssertionResult,
} from './types.ts';

const OFFICIAL_EGRESS_HOSTS = ['api.openai.com', 'auth.openai.com', 'chatgpt.com'] as const;

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

const haveSameMembers = (left: readonly string[], right: readonly string[]): boolean => {
  const sortedLeft = [...new Set(left)].sort((first, second) => first.localeCompare(second, 'en'));
  const sortedRight = [...new Set(right)].sort((first, second) =>
    first.localeCompare(second, 'en'),
  );

  return JSON.stringify(sortedLeft) === JSON.stringify(sortedRight);
};

const assertPassingDeterministicEvidence = (
  verification: IDeterministicVerification,
  expectedInspectionStatus: 'invalid' | 'valid',
  label: string,
): void => {
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
    throw new Error(`Passing qualification case has contradictory ${label} evidence.`);
  }
};

/** Validates one case result against its declared scenario and full evidence artifacts. */
export const assertQualificationCaseEvidence = (options: {
  actor: IActorOutput;
  deterministicAfter: IDeterministicVerification;
  deterministicBefore: IDeterministicVerification;
  judge: IJudgeOutput | null;
  judgeSkipped: IQualificationJudgeSkipped | null;
  profileCase: IQualificationProfileCaseModel;
  result: IQualificationAttemptResult['cases'][number];
  workspaceAssertions: IWorkspaceAssertionResult;
}): void => {
  const { actor, deterministicAfter, deterministicBefore, judge, profileCase, result } = options;
  const expectedRequirementIds = profileCase.scenario.judgeRequirements.map(({ id }) => id);
  const actualRequirementIds = judge?.requirements.map(({ id }) => id) ?? [];

  if (result.title !== profileCase.title) {
    throw new Error(`Qualification case ${result.caseId} contradicts its profile title.`);
  }

  if (result.judgeStatus === 'completed' && (judge === null || options.judgeSkipped !== null)) {
    throw new Error(
      `Qualification case ${result.caseId} has inconsistent completed judge evidence.`,
    );
  }

  if (result.judgeStatus === 'skipped' && (judge !== null || options.judgeSkipped === null)) {
    throw new Error(`Qualification case ${result.caseId} has inconsistent skipped judge evidence.`);
  }

  if (
    judge !== null &&
    (new Set(actualRequirementIds).size !== actualRequirementIds.length ||
      !haveSameMembers(actualRequirementIds, expectedRequirementIds))
  ) {
    throw new Error(`Qualification case ${result.caseId} has inconsistent judge requirements.`);
  }

  const hasFailedRequirement =
    judge?.requirements.some(({ verdict }) => verdict === 'fail') ?? false;

  if (
    judge !== null &&
    ((judge.verdict === 'pass' && (hasFailedRequirement || judge.failures.length > 0)) ||
      (judge.verdict === 'fail' && judge.failures.length === 0))
  ) {
    throw new Error(`Qualification case ${result.caseId} has a contradictory judge verdict.`);
  }

  if (result.status === 'failed' && result.failures.length === 0) {
    throw new Error(`Failed qualification case ${result.caseId} has no recorded failure.`);
  }

  if (result.status !== 'passed') return;

  assertPassingDeterministicEvidence(
    deterministicBefore,
    profileCase.scenario.inspection.before,
    'pre-actor deterministic',
  );
  assertPassingDeterministicEvidence(
    deterministicAfter,
    profileCase.scenario.inspection.after,
    'post-actor deterministic',
  );

  if (
    actor.outcome !== profileCase.scenario.expectedActorOutcome ||
    !options.workspaceAssertions.passed ||
    options.workspaceAssertions.failures.length > 0 ||
    judge?.verdict !== 'pass' ||
    result.judgeStatus !== 'completed' ||
    result.failures.length > 0
  ) {
    throw new Error(`Passing qualification case ${result.caseId} has contradictory evidence.`);
  }
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

  if (sourceState) {
    if (
      sourceState.packagesRepositoryDirty !== result.provenance.packagesRepositoryDirty ||
      sourceState.qualificationRepositoryDirty !== result.provenance.qualificationRepositoryDirty ||
      sourceState.skillRepositoryDirty !== result.provenance.skillRepositoryDirty
    ) {
      throw new Error(`Qualification attempt ${result.attemptId} contradicts its source state.`);
    }
  }

  if (
    result.status === 'failed' &&
    sourceState?.passed !== false &&
    coverage?.passed !== false &&
    !result.cases.some(({ status }) => status === 'failed')
  ) {
    throw new Error(`Failed qualification attempt ${result.attemptId} has no failing evidence.`);
  }

  if (result.status !== 'passed') return;

  const passingCaseIds = result.cases
    .filter(({ status }) => status === 'passed')
    .map(({ caseId }) => caseId);
  const endpointOrigin = result.provenance.modelEndpoint?.origin ?? null;
  const expectedStageIds = createExpectedStageIds([...profileCaseIds]);

  if (
    !haveSameMembers(passingCaseIds, [...profileCaseIds]) ||
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
    result.provenance.sslCertificateFileSha256 !== null ||
    JSON.stringify(result.stages.map(({ id }) => id)) !== JSON.stringify(expectedStageIds) ||
    result.stages.some(
      ({ cacheKey, cacheSourceAttemptId, status }) =>
        (status !== 'cached' && status !== 'passed') ||
        (status === 'cached' && (cacheKey === null || cacheSourceAttemptId === null)) ||
        (cacheSourceAttemptId !== null && cacheKey === null),
    )
  ) {
    throw new Error(`Passing qualification attempt ${result.attemptId} is incomplete.`);
  }
};
