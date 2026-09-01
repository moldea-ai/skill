import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, matchesGlob, resolve } from 'node:path';

import { parseDocument } from 'yaml';

import { QualificationBaselineCheckSchema } from '../../qualification/src/baseline/index.ts';
import { loadRuntimeCompatibilityMatrix } from '../../qualification/src/compatibility/index.ts';
import {
  QualificationAttemptResultSchema,
  ActorOutputSchema,
  DeterministicVerificationArtifactSchema,
  JudgeOutputSchema,
  QualificationCaseScenarioSchema,
  QualificationJudgeSkippedSchema,
  QualificationLatestResultSchema,
  QualificationModelStageEvidenceSchema,
  QualificationProfileSchema,
  QualificationSourceStateResultSchema,
  WorkspaceAssertionResultSchema,
} from '../../qualification/src/contracts/index.ts';
import {
  calculateQualificationExecutionDigest,
  calculateQualificationProfileDigest,
  calculateQualificationTargetDigest,
} from '../../qualification/src/execution/fingerprints.ts';
import {
  calculateDirectoryFingerprint,
  resolveContainedPath,
} from '../../qualification/src/filesystem/index.ts';
import { inspectGitRepositoryState } from '../../qualification/src/repository-state/index.ts';
import { verifyQualificationResults } from '../../qualification/src/result/index.ts';
import {
  createQualificationAttemptKey,
  QualificationProfileIndexSchema,
  resolveQualificationArtifactPath,
  verifyQualificationAttemptStorage,
} from '../../qualification/src/storage/index.ts';
import {
  CODEX_EVALUATION_MODEL,
  CODEX_EVALUATION_REASONING_EFFORT,
  hasPassingCodexEvaluationCommandPolicy,
} from '../codex-evaluation-host/index.mjs';
import {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  hasValidActorCommandPolicyEvidence,
  hasValidRepositoryControlEvidence,
  hasValidScenarioEvidence,
  loadVerifiedSemanticEvaluationAttempts,
} from '../semantic-evaluation/index.mjs';
import {
  downloadPublishedPackageArtifact,
  downloadPublishedPackageClosure,
  resolvePublishedPackageClosure,
  resolvePublishedPackageManifest,
  selectPublishedPackageClosure,
} from '../package-candidate/index.mjs';
import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  RELEASE_PATHS,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from './constants.mjs';
import { createSemanticCliIdentity, parseStableVersion } from './identity.mjs';

const SEMANTIC_RESULTS_PATH = 'fixtures/semantic-evaluation-results';

const SEMANTIC_HOST_CONTRACT = {
  model: CODEX_EVALUATION_MODEL,
  name: 'codex',
  reasoningEffort: CODEX_EVALUATION_REASONING_EFFORT,
};

// exact top-level fields owned by the current canonical semantic result
const SEMANTIC_RESULT_KEYS = new Set([
  'artifact',
  'artifactDigest',
  'artifactSha256',
  'cases',
  'caseHistories',
  'caseSuiteDigest',
  'cli',
  'confirmationPolicy',
  'coverageDigest',
  'evaluatedAt',
  'evaluationProtocolVersion',
  'generatedAt',
  'hostContract',
  'results',
  'schemaVersion',
  'semanticAttemptId',
  'skillDigest',
]);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const readYaml = (path, schema) => {
  const document = parseDocument(readFileSync(path, 'utf8'), {
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join('\n'));
  }
  return schema.parse(document.toJS());
};

const hasSemanticHostIdentity = (host) =>
  host?.model === SEMANTIC_HOST_CONTRACT.model &&
  host?.name === SEMANTIC_HOST_CONTRACT.name &&
  host?.reasoningEffort === SEMANTIC_HOST_CONTRACT.reasoningEffort &&
  typeof host?.version === 'string' &&
  host.version.trim().length > 0 &&
  host.version !== 'unavailable';

const createCanonicalTrialProvenance = (semanticResult) =>
  (Array.isArray(semanticResult.caseHistories) ? semanticResult.caseHistories : [])
    .map((history) => ({
      id: history.id,
      trials: [
        {
          actorCommandPolicyEvidence: history.initial?.actorCommandPolicyEvidence,
          actorHost: history.initial?.actorHost,
          confirmationIndex: null,
          evaluatedAt: history.initial?.evaluatedAt,
          judgeHost: history.initial?.judgeHost,
          kind: 'initial',
        },
        ...(Array.isArray(history.confirmations) ? history.confirmations : []).map(
          (confirmation) => ({
            actorCommandPolicyEvidence: confirmation.actorCommandPolicyEvidence,
            actorHost: confirmation.actorHost,
            confirmationIndex: confirmation.confirmationIndex,
            evaluatedAt: confirmation.evaluatedAt,
            judgeHost: confirmation.judgeHost,
            kind: 'confirmation',
          }),
        ),
      ],
    }))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));

const createAttemptTrialProvenance = (attempt) =>
  attempt.cases.map(({ id, trials }) => ({
    id,
    trials: trials.map(
      ({
        actorCommandPolicyEvidence,
        actorHost,
        confirmationIndex,
        evaluatedAt,
        judgeHost,
        kind,
      }) => ({
        actorCommandPolicyEvidence,
        actorHost,
        confirmationIndex,
        evaluatedAt,
        judgeHost,
        kind,
      }),
    ),
  }));

const listQualificationProfiles = (repositoryRoot) => {
  const profilesRoot = join(repositoryRoot, 'qualification', 'profiles');
  const index = readYaml(join(profilesRoot, 'index.yaml'), QualificationProfileIndexSchema);

  return index.targets.map((target) => {
    const profileDirectory = resolveContainedPath(profilesRoot, target.key);
    const profile = readYaml(join(profileDirectory, 'profile.yaml'), QualificationProfileSchema);

    if (
      profile.adapterId !== target.adapterId ||
      profile.implementationId !== target.implementationId
    ) {
      throw new Error(`Qualification profile ${target.key} contradicts its indexed identity.`);
    }

    return {
      adapterId: profile.adapterId,
      caseIds: profile.cases.map(({ id }) => id),
      cases: profile.cases,
      implementationId: profile.implementationId,
      profileDirectory,
      runtimePackages: profile.runtimePackages ?? [],
      targetKey: target.key,
    };
  });
};

const createQualificationStageIds = (caseIds) => [
  'source-state',
  'coverage',
  'candidate',
  'baseline',
  ...caseIds.flatMap((caseId) => [
    ...['initial', 'confirmation-1', 'confirmation-2'].flatMap((trialId) => [
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

const getQualificationTrialRoot = (caseId, trialId) => `cases/${caseId}/trials/${trialId}`;

const createQualificationTrialArtifactPaths = (caseId, trial) => {
  const trialRoot = getQualificationTrialRoot(caseId, trial.trialId);
  return [
    `${trialRoot}/actor-evidence.json`,
    `${trialRoot}/actor-events.jsonl`,
    `${trialRoot}/actor-output.json`,
    `${trialRoot}/actor-output.schema.json`,
    `${trialRoot}/actor-prompt.md`,
    `${trialRoot}/deterministic-after.json`,
    `${trialRoot}/deterministic-before.json`,
    ...(trial.judgeStatus === 'completed'
      ? [
          `${trialRoot}/judge-evidence.json`,
          `${trialRoot}/judge-events.jsonl`,
          `${trialRoot}/judge-output.json`,
          `${trialRoot}/judge-output.schema.json`,
          `${trialRoot}/judge-prompt.md`,
        ]
      : [`${trialRoot}/judge-skipped.json`]),
    `${trialRoot}/trial-result.json`,
    `${trialRoot}/workspace-assertions.json`,
    `${trialRoot}/workspace.patch`,
  ];
};

const haveSameMembers = (left, right) =>
  JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());

const areWorkspaceEntriesEqual = (before, after) =>
  before !== undefined &&
  after !== undefined &&
  before.kind === after.kind &&
  before.mode === after.mode &&
  before.sha256 === after.sha256;

const calculateChangedPaths = (assertions) => {
  const beforePaths = assertions.before.map(({ path }) => path);
  const afterPaths = assertions.after.map(({ path }) => path);
  if (
    new Set(beforePaths).size !== beforePaths.length ||
    new Set(afterPaths).size !== afterPaths.length
  ) {
    return null;
  }
  const beforeByPath = new Map(assertions.before.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(assertions.after.map((entry) => [entry.path, entry]));
  return [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])]
    .filter((path) => !areWorkspaceEntriesEqual(beforeByPath.get(path), afterByPath.get(path)))
    .sort((left, right) => left.localeCompare(right, 'en'));
};

const hasValidDeterministicEvidence = (artifact, expectedInspectionStatus) => {
  const verification = artifact.summary;
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
  return (
    verification.passed === hasPassingState &&
    (verification.passed || verification.failures.length > 0)
  );
};

const containsWorkspacePath = (entries, expectedPath) =>
  entries.some(({ path }) => path === expectedPath || path.startsWith(`${expectedPath}/`));

const matchesWorkspaceContract = (candidatePath, exactPaths, pathPatterns) =>
  exactPaths.includes(candidatePath) ||
  pathPatterns.some((pathPattern) => matchesGlob(candidatePath, pathPattern));

const hasValidWorkspaceEvidence = (actor, assertions, scenario) => {
  const observedChangedPaths = calculateChangedPaths(assertions);
  if (
    observedChangedPaths === null ||
    new Set(assertions.changedPaths).size !== assertions.changedPaths.length ||
    new Set(actor.changedFiles).size !== actor.changedFiles.length ||
    JSON.stringify(assertions.changedPaths) !== JSON.stringify(observedChangedPaths) ||
    assertions.passed !== (assertions.failures.length === 0)
  ) {
    return false;
  }

  const beforeByPath = new Map(assertions.before.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(assertions.after.map((entry) => [entry.path, entry]));
  const hasContractViolation =
    actor.outcome !== scenario.expectedActorOutcome ||
    !haveSameMembers(actor.changedFiles, assertions.changedPaths) ||
    assertions.changedPaths.some(
      (changedPath) =>
        !matchesWorkspaceContract(
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
          matchesWorkspaceContract(changedPath, [], [requiredPattern]),
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
  return assertions.passed !== hasContractViolation;
};

const hasValidJudgeEvidence = (judge, scenario) => {
  const expectedRequirementIds = scenario.judgeRequirements
    .filter((requirement) => requirement.evaluation.kind === 'judge')
    .map(({ id }) => id);
  const actualRequirementIds = judge.requirements.map(({ id }) => id);
  const hasFailedRequirement = judge.requirements.some(({ verdict }) => verdict === 'fail');
  return (
    new Set(actualRequirementIds).size === actualRequirementIds.length &&
    haveSameMembers(actualRequirementIds, expectedRequirementIds) &&
    (judge.verdict === 'pass'
      ? !hasFailedRequirement && judge.failures.length === 0
      : judge.failures.length > 0)
  );
};

const deriveQualificationRequirementAssessments = (
  actor,
  actorEvidence,
  deterministicAfter,
  assertions,
  judge,
  scenario,
) => {
  const judgeById = new Map(
    judge?.requirements.map((requirement) => [requirement.id, requirement]),
  );

  return scenario.judgeRequirements.map((requirement) => {
    if (requirement.evaluation.kind === 'judge') {
      const decision = judgeById.get(requirement.id);
      return decision === undefined
        ? {
            id: requirement.id,
            evaluator: 'judge',
            verdict: 'not-evaluated',
            evidence: 'The skipped judge stage did not evaluate this semantic requirement.',
          }
        : {
            id: decision.id,
            evaluator: 'judge',
            verdict: decision.verdict,
            evidence: decision.evidence,
          };
    }

    const failedChecks = requirement.evaluation.checks.filter((check) => {
      switch (check) {
        case 'actor-command-policy':
          return !hasPassingCodexEvaluationCommandPolicy(actorEvidence.commandPolicy);
        case 'deterministic-after':
          return !deterministicAfter.summary.passed;
        case 'expected-actor-outcome':
          return actor.outcome !== scenario.expectedActorOutcome;
        case 'workspace-assertions':
          return !assertions.passed;
      }
    });
    return {
      id: requirement.id,
      evaluator: 'runner',
      verdict: failedChecks.length === 0 ? 'pass' : 'fail',
      evidence:
        failedChecks.length === 0
          ? `Runner checks passed: ${requirement.evaluation.checks.join(', ')}.`
          : `Runner checks failed: ${failedChecks.join(', ')}.`,
    };
  });
};

const deriveQualificationTrialFailures = (
  actor,
  actorEvidence,
  deterministicAfter,
  assertions,
  judge,
  judgeEvidence,
  requirementAssessments,
  scenario,
) => [
  ...(actor.outcome === scenario.expectedActorOutcome
    ? []
    : [
        `Actor outcome ${actor.outcome} did not match expected outcome ${scenario.expectedActorOutcome}.`,
      ]),
  ...(hasPassingCodexEvaluationCommandPolicy(actorEvidence.commandPolicy)
    ? []
    : [
        'Actor command policy observed prohibited credential, network, or sensitive evaluator access.',
      ]),
  ...(judgeEvidence === null || hasPassingCodexEvaluationCommandPolicy(judgeEvidence.commandPolicy)
    ? []
    : [
        'Judge command policy observed prohibited credential, network, or sensitive evaluator access.',
      ]),
  ...deterministicAfter.summary.failures,
  ...assertions.failures,
  ...requirementAssessments
    .filter(({ verdict }) => verdict === 'fail')
    .map(({ evidence, id }) => `Requirement ${id} failed: ${evidence}`),
  ...(judge?.verdict === 'fail' ? judge.failures : []),
];

const hasValidModelEvidence = (attempt, trial, role, stage, evidence) => {
  const cacheSourceAttemptId =
    role === 'actor' ? trial.actorCacheSourceAttemptId : trial.judgeCacheSourceAttemptId;
  const createdAt = role === 'actor' ? trial.actorEvidenceCreatedAt : trial.judgeEvidenceCreatedAt;
  const usage = role === 'actor' ? trial.actorUsage : trial.judgeUsage;
  const isCached = cacheSourceAttemptId !== null;
  return (
    evidence.role === role &&
    evidence.trialId === trial.trialId &&
    evidence.createdAt === createdAt &&
    JSON.stringify(evidence.usage) === JSON.stringify(usage) &&
    evidence.cacheSourceAttemptId === cacheSourceAttemptId &&
    evidence.sourceAttemptId === (cacheSourceAttemptId ?? attempt.attemptId) &&
    stage?.cacheKey === evidence.cacheKey &&
    stage.cacheSourceAttemptId === cacheSourceAttemptId &&
    stage.status === (isCached ? 'cached' : 'passed') &&
    (trial.kind !== 'confirmation' || !isCached)
  );
};

const hasValidArtifactDigest = (resolveArtifactPath, attempt, relativePath) => {
  const expectedDigest = attempt.artifactDigests[relativePath];
  if (expectedDigest === undefined) return false;
  const artifactPath = resolveArtifactPath(relativePath);
  return (
    existsSync(artifactPath) &&
    createHash('sha256').update(readFileSync(artifactPath)).digest('hex') === expectedDigest
  );
};

const hasCompletePassingQualificationCases = (resolveArtifactPath, attempt, profileCases) => {
  const caseIds = profileCases.map(({ id }) => id);
  if (attempt.cases.length !== caseIds.length) return false;
  const expectedArtifactPaths = ['baseline.json', 'coverage.json', 'source-state.json'];

  const hasPassingCases = caseIds.every((caseId, index) => {
    const result = attempt.cases[index];
    const scenario = profileCases[index]?.scenario;
    const hasInitialPass =
      result?.status === 'passed' &&
      result.confirmationStatus === 'not-required' &&
      result.trials.length === 1 &&
      result.trials[0]?.trialId === 'initial' &&
      result.trials[0].passed;
    const hasRecoveredPass =
      result?.status === 'recovered' &&
      result.confirmationStatus === 'passed' &&
      result.trials.length === 3 &&
      result.trials[0]?.trialId === 'initial' &&
      !result.trials[0].passed &&
      result.trials[1]?.trialId === 'confirmation-1' &&
      result.trials[1].passed &&
      result.trials[2]?.trialId === 'confirmation-2' &&
      result.trials[2].passed;

    if (
      result?.caseId !== caseId ||
      scenario?.id !== caseId ||
      result.failures.length > 0 ||
      (!hasInitialPass && !hasRecoveredPass)
    ) {
      return false;
    }

    expectedArtifactPaths.push(`cases/${caseId}/case-result.json`);

    return result.trials.every((trial) => {
      const trialRoot = getQualificationTrialRoot(caseId, trial.trialId);
      const expectedReferences =
        trial.deterministicBeforePath === `${trialRoot}/deterministic-before.json` &&
        trial.deterministicAfterPath === `${trialRoot}/deterministic-after.json` &&
        trial.actorOutputPath === `${trialRoot}/actor-output.json` &&
        trial.workspaceAssertionsPath === `${trialRoot}/workspace-assertions.json` &&
        trial.patchPath === `${trialRoot}/workspace.patch` &&
        (trial.judgeStatus === 'completed'
          ? trial.judgeOutputPath === `${trialRoot}/judge-output.json` &&
            trial.judgeSkippedPath === null
          : trial.judgeOutputPath === null &&
            trial.judgeSkippedPath === `${trialRoot}/judge-skipped.json`) &&
        (trial.kind !== 'confirmation' ||
          (trial.actorCacheSourceAttemptId === null && trial.judgeCacheSourceAttemptId === null));
      const trialArtifactPaths = createQualificationTrialArtifactPaths(caseId, trial);
      expectedArtifactPaths.push(...trialArtifactPaths);

      if (!expectedReferences) return false;

      try {
        const recordedTrial = readJson(resolveArtifactPath(`${trialRoot}/trial-result.json`));
        const actorEvidence = QualificationModelStageEvidenceSchema.parse(
          readJson(resolveArtifactPath(`${trialRoot}/actor-evidence.json`)),
        );
        const actor = ActorOutputSchema.parse(
          readJson(resolveArtifactPath(`${trialRoot}/actor-output.json`)),
        );
        const deterministicBefore = DeterministicVerificationArtifactSchema.parse(
          readJson(resolveArtifactPath(`${trialRoot}/deterministic-before.json`)),
        );
        const deterministicAfter = DeterministicVerificationArtifactSchema.parse(
          readJson(resolveArtifactPath(`${trialRoot}/deterministic-after.json`)),
        );
        const assertions = WorkspaceAssertionResultSchema.parse(
          readJson(resolveArtifactPath(`${trialRoot}/workspace-assertions.json`)),
        );
        const hasJudgeRequirements = scenario.judgeRequirements.some(
          (requirement) => requirement.evaluation.kind === 'judge',
        );
        const judgeEvidence =
          trial.judgeStatus === 'completed'
            ? QualificationModelStageEvidenceSchema.parse(
                readJson(resolveArtifactPath(`${trialRoot}/judge-evidence.json`)),
              )
            : null;
        const judge =
          trial.judgeStatus === 'completed'
            ? JudgeOutputSchema.parse(
                readJson(resolveArtifactPath(`${trialRoot}/judge-output.json`)),
              )
            : null;
        const judgeSkipped =
          trial.judgeStatus === 'skipped'
            ? QualificationJudgeSkippedSchema.parse(
                readJson(resolveArtifactPath(`${trialRoot}/judge-skipped.json`)),
              )
            : null;
        const stages = new Map(attempt.stages.map((stage) => [stage.id, stage]));
        const actorStage = stages.get(`case:${caseId}:trial:${trial.trialId}:actor`);
        const judgeStage = stages.get(`case:${caseId}:trial:${trial.trialId}:judge`);
        const deterministicAfterStage = stages.get(
          `case:${caseId}:trial:${trial.trialId}:deterministic-after`,
        );
        const assertionsStage = stages.get(`case:${caseId}:trial:${trial.trialId}:assertions`);
        const runnerRequirementAssessments = deriveQualificationRequirementAssessments(
          actor,
          actorEvidence,
          deterministicAfter,
          assertions,
          null,
          scenario,
        ).filter(({ evaluator }) => evaluator === 'runner');
        const hasFailedRunnerRequirement = runnerRequirementAssessments.some(
          ({ verdict }) => verdict === 'fail',
        );
        const hasFailedActorCommandPolicy = !hasPassingCodexEvaluationCommandPolicy(
          actorEvidence.commandPolicy,
        );
        const shouldSkipJudge =
          !deterministicAfter.summary.passed ||
          !assertions.passed ||
          hasFailedRunnerRequirement ||
          hasFailedActorCommandPolicy ||
          !hasJudgeRequirements;
        const derivedRequirementAssessments = deriveQualificationRequirementAssessments(
          actor,
          actorEvidence,
          deterministicAfter,
          assertions,
          judge,
          scenario,
        );
        const derivedFailures = deriveQualificationTrialFailures(
          actor,
          actorEvidence,
          deterministicAfter,
          assertions,
          judge,
          judgeEvidence,
          derivedRequirementAssessments,
          scenario,
        );
        return (
          JSON.stringify(recordedTrial) === JSON.stringify(trial) &&
          trialArtifactPaths.every((artifactPath) =>
            hasValidArtifactDigest(resolveArtifactPath, attempt, artifactPath),
          ) &&
          deterministicBefore.summary.passed &&
          hasValidDeterministicEvidence(deterministicBefore, scenario.inspection.before) &&
          hasValidDeterministicEvidence(deterministicAfter, scenario.inspection.after) &&
          hasValidWorkspaceEvidence(actor, assertions, scenario) &&
          deterministicAfterStage?.status ===
            (deterministicAfter.summary.passed ? 'passed' : 'failed') &&
          assertionsStage?.status === (assertions.passed ? 'passed' : 'failed') &&
          hasValidModelEvidence(attempt, trial, 'actor', actorStage, actorEvidence) &&
          (judge === null
            ? judgeSkipped !== null &&
              shouldSkipJudge &&
              judgeSkipped.kind ===
                (!hasJudgeRequirements ? 'no-judge-requirements' : 'deterministic-failure') &&
              judgeSkipped.deterministicAfterPassed === deterministicAfter.summary.passed &&
              judgeSkipped.workspaceAssertionsPassed === assertions.passed &&
              judgeStage?.status === 'skipped'
            : !shouldSkipJudge &&
              judgeEvidence !== null &&
              hasValidJudgeEvidence(judge, scenario) &&
              hasValidModelEvidence(attempt, trial, 'judge', judgeStage, judgeEvidence)) &&
          JSON.stringify(trial.requirementAssessments) ===
            JSON.stringify(derivedRequirementAssessments) &&
          trial.passed === (derivedFailures.length === 0) &&
          JSON.stringify(trial.failures) === JSON.stringify(derivedFailures)
        );
      } catch {
        return false;
      }
    });
  });
  const actualArtifactPaths = Object.keys(attempt.artifactDigests).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );

  return (
    hasPassingCases &&
    expectedArtifactPaths.every((artifactPath) =>
      hasValidArtifactDigest(resolveArtifactPath, attempt, artifactPath),
    ) &&
    JSON.stringify(actualArtifactPaths) ===
      JSON.stringify(expectedArtifactPaths.sort((left, right) => left.localeCompare(right, 'en')))
  );
};

const hasCompletePassingQualificationStages = (attempt, caseIds) => {
  const expectedStageIds = createQualificationStageIds(caseIds);
  if (
    attempt.stages.length !== expectedStageIds.length ||
    !expectedStageIds.every((stageId, index) => attempt.stages[index]?.id === stageId)
  ) {
    return false;
  }

  const stages = new Map(attempt.stages.map((stage) => [stage.id, stage]));
  const hasCompletedState = (stage, allowedStatuses) =>
    stage !== undefined &&
    allowedStatuses.includes(stage.status) &&
    stage.startedAt !== null &&
    stage.completedAt !== null &&
    stage.durationMs !== null &&
    stage.error === null;
  const hasValidNonModelState = (stage, allowedStatuses) =>
    hasCompletedState(stage, allowedStatuses) &&
    stage.cacheKey === null &&
    stage.cacheSourceAttemptId === null &&
    stage.operationalRetries.length === 0;
  const hasValidModelState = (stage, isConfirmation) =>
    hasCompletedState(stage, isConfirmation ? ['passed'] : ['cached', 'passed']) &&
    stage.cacheKey !== null &&
    (stage.status === 'cached'
      ? stage.cacheSourceAttemptId !== null && stage.operationalRetries.length === 0
      : stage.cacheSourceAttemptId === null);
  const hasValidSkippedState = (stage) => hasValidNonModelState(stage, ['skipped']);
  const hasValidUnexecutedState = (stage) => hasValidSkippedState(stage) && stage.durationMs === 0;
  const controlsPass = ['source-state', 'coverage', 'candidate', 'baseline'].every((stageId) =>
    hasValidNonModelState(stages.get(stageId), ['passed']),
  );

  return (
    controlsPass &&
    attempt.cases.every((caseResult) => {
      const executedTrialIds = new Set(caseResult.trials.map(({ trialId }) => trialId));
      const trialsAreValid = ['initial', 'confirmation-1', 'confirmation-2'].every((trialId) => {
        const stagePrefix = `case:${caseResult.caseId}:trial:${trialId}`;
        if (!executedTrialIds.has(trialId)) {
          return [
            'prepare',
            'deterministic-before',
            'actor',
            'deterministic-after',
            'assertions',
            'judge',
          ].every((stageName) =>
            hasValidUnexecutedState(stages.get(`${stagePrefix}:${stageName}`)),
          );
        }

        const actor = stages.get(`${stagePrefix}:actor`);
        const judge = stages.get(`${stagePrefix}:judge`);
        const trial = caseResult.trials.find(({ trialId: candidateId }) => candidateId === trialId);
        const isConfirmation = trialId !== 'initial';
        return (
          trial !== undefined &&
          hasValidNonModelState(stages.get(`${stagePrefix}:prepare`), ['passed']) &&
          hasValidNonModelState(stages.get(`${stagePrefix}:deterministic-before`), ['passed']) &&
          hasValidModelState(actor, isConfirmation) &&
          hasValidNonModelState(stages.get(`${stagePrefix}:deterministic-after`), [
            'failed',
            'passed',
          ]) &&
          hasValidNonModelState(stages.get(`${stagePrefix}:assertions`), ['failed', 'passed']) &&
          (trial.judgeStatus === 'completed'
            ? hasValidModelState(judge, isConfirmation)
            : hasValidSkippedState(judge))
        );
      });
      return (
        trialsAreValid &&
        hasValidNonModelState(stages.get(`case:${caseResult.caseId}:result`), ['passed'])
      );
    })
  );
};

const inspectQualificationControlEvidence = (
  resolveArtifactPath,
  attempt,
  adapterId,
  relativeLatestPath,
) => {
  const requiredControlPaths = ['baseline.json', 'coverage.json', 'source-state.json'];
  if (
    !requiredControlPaths.every(
      (artifactPath) => attempt.artifactDigests[artifactPath] !== undefined,
    )
  ) {
    return {
      baseline: null,
      issue: `${relativeLatestPath} does not include every release-gate control artifact.`,
    };
  }

  const baseline = QualificationBaselineCheckSchema.parse(
    readJson(resolveArtifactPath('baseline.json')),
  );
  const sourceState = QualificationSourceStateResultSchema.parse(
    readJson(resolveArtifactPath('source-state.json')),
  );
  const coverage = readJson(resolveArtifactPath('coverage.json'));
  const hasCleanTrustedSource =
    sourceState.passed &&
    sourceState.requiresCleanInputs &&
    sourceState.isExecutionHostTrusted &&
    !sourceState.packagesRepositoryDirty &&
    !sourceState.qualificationRepositoryDirty &&
    !sourceState.skillRepositoryDirty &&
    sourceState.failures.length === 0;
  const hasCompleteCoverage =
    coverage.passed === true &&
    Array.isArray(coverage.missingClaims) &&
    coverage.missingClaims.length === 0 &&
    Array.isArray(coverage.unknownClaims) &&
    coverage.unknownClaims.length === 0 &&
    Array.isArray(coverage.uncoveredCaseIds) &&
    coverage.uncoveredCaseIds.length === 0;
  const hasCompatibleBaseline =
    adapterId === 'custom'
      ? !baseline.required &&
        baseline.passed &&
        baseline.status === 'not-required' &&
        baseline.baselineAttemptId === null &&
        baseline.failures.length === 0
      : baseline.required &&
        baseline.passed &&
        baseline.status === 'passed' &&
        baseline.baselineAttemptId === attempt.provenance.baselineAttemptId &&
        baseline.failures.length === 0;

  if (!hasCleanTrustedSource || !hasCompleteCoverage || !hasCompatibleBaseline) {
    return {
      baseline,
      issue: `${relativeLatestPath} does not contain passing source, coverage, and baseline controls.`,
    };
  }

  return { baseline, issue: null };
};

const createRecordedPackageIdentity = (candidatePackage) => ({
  name: candidatePackage.name,
  version: candidatePackage.version,
  registryIntegrity: candidatePackage.registryIntegrity,
  registryShasum: candidatePackage.registryShasum,
  registryTarballUrl: candidatePackage.registryTarballUrl,
  tarballName: candidatePackage.tarballName,
  sha256: candidatePackage.sha256,
});

const sortPackageIdentities = (packages) =>
  [...packages].sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'));

const readQualificationTypeScriptVersion = (repositoryRoot) => {
  const qualificationManifest = readJson(join(repositoryRoot, 'qualification', 'package.json'));
  return parseStableVersion(qualificationManifest.devDependencies?.typescript);
};

/** Resolves the current package source and independently verifies every published archive. */
const resolveCurrentQualificationInputs = async ({
  downloadPublishedArtifact,
  downloadPublishedClosure,
  packagesRepository,
  repositoryRoot,
  releaseCli,
  resolvePublishedManifest,
  resolvePublishedClosure,
}) => {
  const [matrix, packagesState, publishedManifests, typeScriptManifest] = await Promise.all([
    loadRuntimeCompatibilityMatrix(packagesRepository),
    inspectGitRepositoryState(packagesRepository),
    resolvePublishedClosure({
      cliVersion: releaseCli.version,
      selectedPackageName: '@moldea.ai/cli',
    }),
    resolvePublishedManifest({
      packageName: 'typescript',
      version: readQualificationTypeScriptVersion(repositoryRoot),
    }),
  ]);

  const artifactDirectory = mkdtempSync(join(tmpdir(), 'moldea-release-packages-'));

  try {
    const publishedPackages = await downloadPublishedClosure({
      artifactDirectory,
      manifests: publishedManifests,
      selectedPackageName: '@moldea.ai/cli',
    });
    const typeScriptPackage = await downloadPublishedArtifact({
      artifactDirectory: join(artifactDirectory, 'fixture-tools'),
      manifest: typeScriptManifest,
    });

    return {
      matrix,
      packagesState,
      publishedManifests,
      publishedPackages: sortPackageIdentities(
        [...publishedPackages, typeScriptPackage].map(createRecordedPackageIdentity),
      ),
      typeScriptPackage: createRecordedPackageIdentity(typeScriptPackage),
    };
  } finally {
    rmSync(artifactDirectory, { force: true, recursive: true });
  }
};

/** Resolves the exact published closure used by one selected qualification profile. */
const resolveCurrentQualificationPackageIdentities = async ({
  adapterPackage,
  downloadPublishedArtifact,
  publishedManifests,
  publishedPackages,
  resolvePublishedManifest,
  runtimePackages,
  typeScriptPackage,
}) => {
  const selectedPackageNames = new Set(
    selectPublishedPackageClosure(publishedManifests, adapterPackage).map(({ name }) => name),
  );
  const selectedPackages = publishedPackages.filter(({ name }) => selectedPackageNames.has(name));
  const runtimePackageManifests = await Promise.all(
    runtimePackages.map(({ name, version }) =>
      resolvePublishedManifest({ packageName: name, version }),
    ),
  );
  const artifactDirectory = mkdtempSync(join(tmpdir(), 'moldea-release-profile-packages-'));

  try {
    const runtimePackageArtifacts = await Promise.all(
      runtimePackageManifests.map((manifest) =>
        downloadPublishedArtifact({
          artifactDirectory,
          manifest,
        }),
      ),
    );

    return sortPackageIdentities([
      ...selectedPackages,
      ...runtimePackageArtifacts.map(createRecordedPackageIdentity),
      typeScriptPackage,
    ]);
  } finally {
    rmSync(artifactDirectory, { force: true, recursive: true });
  }
};

const inspectSemanticEvidence = (repositoryRoot) => {
  const issues = [];
  const semanticResultPath = join(repositoryRoot, RELEASE_PATHS.semanticResult);

  if (!existsSync(semanticResultPath)) {
    return [`${RELEASE_PATHS.semanticResult} is missing fresh semantic evidence.`];
  }

  const semanticResult = readJson(semanticResultPath);
  if (
    semanticResult === null ||
    typeof semanticResult !== 'object' ||
    Array.isArray(semanticResult)
  ) {
    return [`${RELEASE_PATHS.semanticResult} is not a semantic result object.`];
  }
  const expectedCli = createSemanticCliIdentity(repositoryRoot);
  const conformanceCases = readJson(join(repositoryRoot, RELEASE_PATHS.conformanceCases));
  const semanticCases = conformanceCases.semanticCases ?? [];
  const expectedCaseSuiteDigest = createSemanticCaseSuiteDigest(semanticCases);
  const expectedSkillDigest = createPortableSkillDigest(repositoryRoot);
  const semanticCoveragePath = join(repositoryRoot, RELEASE_PATHS.semanticCoverage);
  let expectedCoverageDigest = null;
  if (!existsSync(semanticCoveragePath)) {
    issues.push(`${RELEASE_PATHS.semanticCoverage} is missing.`);
  } else {
    try {
      expectedCoverageDigest = createSemanticCoverageDigest(
        readJson(semanticCoveragePath),
        semanticCases,
      );
    } catch (error) {
      issues.push(
        `${RELEASE_PATHS.semanticCoverage} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const semanticResultKeys = Object.keys(semanticResult);
  if (
    semanticResultKeys.length !== SEMANTIC_RESULT_KEYS.size ||
    semanticResultKeys.some((key) => !SEMANTIC_RESULT_KEYS.has(key))
  ) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not use the exact semantic result fields.`);
  }
  if (semanticResult.schemaVersion !== 6) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not use semantic result schema 6.`);
  }
  if (JSON.stringify(semanticResult.hostContract) !== JSON.stringify(SEMANTIC_HOST_CONTRACT)) {
    issues.push(
      `${RELEASE_PATHS.semanticResult} does not use the official semantic host contract.`,
    );
  }
  if (
    semanticResult.confirmationPolicy?.version !== 1 ||
    semanticResult.confirmationPolicy?.requiredPassingConfirmations !== 2
  ) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not use confirmation policy 1.`);
  }

  if (semanticResult.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION) {
    issues.push(
      `${RELEASE_PATHS.semanticResult} does not use semantic protocol ${SEMANTIC_EVALUATION_PROTOCOL_VERSION}.`,
    );
  }
  if (JSON.stringify(semanticResult.cli) !== JSON.stringify(expectedCli)) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not match the exact release CLI identity.`);
  }
  const hasConsistentRecordedArtifact =
    semanticResult.artifact?.sha256 === semanticResult.skillDigest &&
    semanticResult.artifactDigest === semanticResult.skillDigest &&
    semanticResult.artifactSha256 === semanticResult.skillDigest;
  const hasCurrentArtifact = semanticResult.skillDigest === expectedSkillDigest;
  if (!hasConsistentRecordedArtifact || !hasCurrentArtifact) {
    issues.push(
      `${RELEASE_PATHS.semanticResult} does not match the exact portable skill artifact.`,
    );
  }
  if (semanticResult.caseSuiteDigest !== expectedCaseSuiteDigest) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not match the current semantic case suite.`);
  }
  if (expectedCoverageDigest === null || semanticResult.coverageDigest !== expectedCoverageDigest) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not match the semantic coverage contract.`);
  }

  try {
    const history = loadVerifiedSemanticEvaluationAttempts(
      join(repositoryRoot, SEMANTIC_RESULTS_PATH),
    );
    const latestAttempt = history.attempts.find(
      ({ attemptId }) => attemptId === history.latest?.latestAttemptId,
    );
    const hasMatchingLatestPass =
      latestAttempt?.status === 'passed' &&
      semanticResult.semanticAttemptId === latestAttempt.attemptId &&
      history.latest?.lastPassingAttemptId === latestAttempt.attemptId &&
      latestAttempt.artifactDigest === semanticResult.skillDigest &&
      latestAttempt.caseSuiteDigest === semanticResult.caseSuiteDigest &&
      latestAttempt.coverageDigest === semanticResult.coverageDigest &&
      JSON.stringify(latestAttempt.cli) === JSON.stringify(semanticResult.cli) &&
      latestAttempt.schemaVersion === 4 &&
      JSON.stringify(latestAttempt.hostContract) === JSON.stringify(semanticResult.hostContract) &&
      JSON.stringify(createAttemptTrialProvenance(latestAttempt)) ===
        JSON.stringify(createCanonicalTrialProvenance(semanticResult));
    if (!hasMatchingLatestPass) {
      issues.push(
        `${RELEASE_PATHS.semanticResult} does not match the newest immutable passing semantic attempt.`,
      );
    }
  } catch (error) {
    issues.push(
      `${SEMANTIC_RESULTS_PATH} is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const results = Array.isArray(semanticResult.results) ? semanticResult.results : [];
  const resultsById = new Map(results.map((result) => [result.id, result]));
  const publicCases = Array.isArray(semanticResult.cases) ? semanticResult.cases : [];
  const publicCasesById = new Map(publicCases.map((result) => [result.id, result]));
  const caseHistories = Array.isArray(semanticResult.caseHistories)
    ? semanticResult.caseHistories
    : [];
  const caseHistoriesById = new Map(caseHistories.map((history) => [history.id, history]));
  const hasCompletePassingCases =
    results.length === semanticCases.length &&
    publicCases.length === semanticCases.length &&
    caseHistories.length === semanticCases.length &&
    semanticCases.every((caseDefinition) => {
      const result = resultsById.get(caseDefinition.id);
      const publicCase = publicCasesById.get(caseDefinition.id);
      const history = caseHistoriesById.get(caseDefinition.id);
      const hasPassingInitial =
        history?.resolution === 'passed' &&
        history.initial?.passed === true &&
        hasValidActorCommandPolicyEvidence(history.initial?.actorCommandPolicyEvidence) &&
        hasSemanticHostIdentity(history.initial?.actorHost) &&
        hasSemanticHostIdentity(history.initial?.judgeHost) &&
        Array.isArray(history.confirmations) &&
        history.confirmations.length === 0;
      const hasRecoveredFailure =
        history?.resolution === 'recovered' &&
        history.initial?.passed === false &&
        hasValidActorCommandPolicyEvidence(history.initial?.actorCommandPolicyEvidence) &&
        hasSemanticHostIdentity(history.initial?.actorHost) &&
        hasSemanticHostIdentity(history.initial?.judgeHost) &&
        Array.isArray(history.confirmations) &&
        history.confirmations.length === 2 &&
        history.confirmations.every(
          (confirmation, index) =>
            confirmation.confirmationIndex === index + 1 &&
            confirmation.passed === true &&
            hasValidActorCommandPolicyEvidence(confirmation.actorCommandPolicyEvidence) &&
            hasSemanticHostIdentity(confirmation.actorHost) &&
            hasSemanticHostIdentity(confirmation.judgeHost),
        );
      const selectedHistoryTrial = hasPassingInitial
        ? history.initial
        : hasRecoveredFailure
          ? history.confirmations.at(-1)
          : null;
      return (
        result?.passed === true &&
        hasValidActorCommandPolicyEvidence(result.actorCommandPolicyEvidence) &&
        hasSemanticHostIdentity(result.actorHost) &&
        hasSemanticHostIdentity(result.judgeHost) &&
        JSON.stringify(result.actorHost) === JSON.stringify(selectedHistoryTrial?.actorHost) &&
        JSON.stringify(result.judgeHost) === JSON.stringify(selectedHistoryTrial?.judgeHost) &&
        result.evaluatedAt === selectedHistoryTrial?.evaluatedAt &&
        JSON.stringify(result.actorCommandPolicyEvidence) ===
          JSON.stringify(selectedHistoryTrial?.actorCommandPolicyEvidence) &&
        result.caseDefinitionDigest === createSemanticCaseDefinitionDigest(caseDefinition) &&
        hasValidScenarioEvidence(result.scenarioEvidence, caseDefinition) &&
        hasValidRepositoryControlEvidence(result.repositoryControlEvidence) &&
        result.repositoryControlEvidence.violations.length === 0 &&
        publicCase?.passed === true &&
        hasValidActorCommandPolicyEvidence(publicCase.actorCommandPolicyEvidence) &&
        JSON.stringify(publicCase.actorHost) === JSON.stringify(result.actorHost) &&
        JSON.stringify(publicCase.judgeHost) === JSON.stringify(result.judgeHost) &&
        publicCase.evaluatedAt === result.evaluatedAt &&
        publicCase.caseDefinitionDigest === result.caseDefinitionDigest &&
        JSON.stringify(publicCase.actorCommandPolicyEvidence) ===
          JSON.stringify(result.actorCommandPolicyEvidence) &&
        (hasPassingInitial || hasRecoveredFailure) &&
        JSON.stringify(publicCase.scenarioEvidence) === JSON.stringify(result.scenarioEvidence) &&
        JSON.stringify(publicCase.repositoryControlEvidence) ===
          JSON.stringify(result.repositoryControlEvidence)
      );
    });

  if (!hasCompletePassingCases) {
    issues.push(`${RELEASE_PATHS.semanticResult} does not contain every current passing case.`);
  }

  return issues;
};

/**
 * Inspects whether fresh semantic and qualification evidence completes the release gate.
 * @param repositoryRoot The skill repository whose release is being checked.
 * @param options Optional release-input overrides used by isolated verification.
 * @returns A promise resolving to every blocking release-evidence issue.
 */
export const inspectReleaseEvidence = async (
  repositoryRoot,
  {
    downloadPublishedArtifact = downloadPublishedPackageArtifact,
    downloadPublishedClosure = downloadPublishedPackageClosure,
    packagesRepository = resolve(repositoryRoot, '..', 'packages'),
    resolvePublishedManifest = resolvePublishedPackageManifest,
    resolvePublishedClosure = resolvePublishedPackageClosure,
  } = {},
) => {
  const issues = inspectSemanticEvidence(repositoryRoot);
  const resultsRoot = join(repositoryRoot, 'qualification', 'results');
  const resultVerification = await verifyQualificationResults(resultsRoot);

  for (const verificationIssue of resultVerification.issues) {
    issues.push(
      `qualification/results/${verificationIssue.path} is invalid: ${verificationIssue.message}`,
    );
  }

  const skillDigest = await calculateDirectoryFingerprint(join(repositoryRoot, 'moldea'));
  const releaseCli = createSemanticCliIdentity(repositoryRoot);
  let currentInputs = null;

  try {
    currentInputs = await resolveCurrentQualificationInputs({
      downloadPublishedArtifact,
      downloadPublishedClosure,
      packagesRepository,
      repositoryRoot,
      releaseCli,
      resolvePublishedManifest,
      resolvePublishedClosure,
    });
    const publishedCli = currentInputs.publishedPackages.find(
      ({ name }) => name === '@moldea.ai/cli',
    );
    if (
      publishedCli?.version !== releaseCli.version ||
      publishedCli.registryIntegrity !== releaseCli.integrity
    ) {
      issues.push('The root release CLI identity does not match the published npm package.');
    }
    if (currentInputs.packagesState.isDirty) {
      issues.push('The packages repository used for release evidence has uncommitted changes.');
    }
  } catch (error) {
    issues.push(
      `Unable to resolve current qualification release inputs: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const passingEvidence = new Map();
  const qualificationProfiles = listQualificationProfiles(repositoryRoot);

  for (const {
    adapterId,
    caseIds,
    cases,
    implementationId,
    profileDirectory,
    runtimePackages,
    targetKey,
  } of qualificationProfiles) {
    const relativeLatestPath = join('qualification', 'results', targetKey, 'latest.json');
    const latestPath = join(repositoryRoot, relativeLatestPath);
    if (!existsSync(latestPath)) {
      issues.push(`${relativeLatestPath} is missing qualification evidence.`);
      continue;
    }

    let latest;
    try {
      latest = QualificationLatestResultSchema.parse(readJson(latestPath));
    } catch (error) {
      issues.push(
        `${relativeLatestPath} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    if (
      latest.protocolVersion !== QUALIFICATION_EVIDENCE_PROTOCOL_VERSION ||
      latest.latestStatus !== 'passed' ||
      latest.lastPassingAttemptId !== latest.latestAttemptId
    ) {
      issues.push(
        `${relativeLatestPath} must point to a latest passing protocol ${QUALIFICATION_EVIDENCE_PROTOCOL_VERSION} attempt.`,
      );
      continue;
    }

    const attemptDirectory = join(
      repositoryRoot,
      'qualification',
      'results',
      targetKey,
      'attempts',
      createQualificationAttemptKey(latest.latestAttemptId),
    );
    const attemptPath = join(attemptDirectory, 'attempt.json');
    if (!existsSync(attemptPath)) {
      issues.push(`${relativeLatestPath} points to a missing attempt.`);
      continue;
    }

    let attempt;
    try {
      attempt = QualificationAttemptResultSchema.parse(readJson(attemptPath));
    } catch (error) {
      issues.push(
        `${relativeLatestPath} points to an invalid attempt: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    let storage;
    try {
      storage = await verifyQualificationAttemptStorage({
        attemptDirectory,
        result: attempt,
      });
    } catch (error) {
      issues.push(
        `${relativeLatestPath} points to invalid short storage: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const resolveArtifactPath = (logicalPath) =>
      resolveQualificationArtifactPath(attemptDirectory, storage, logicalPath);
    const adapter = currentInputs?.matrix.adapters[adapterId];
    const target = adapter?.targets?.find(({ id }) => id === implementationId);
    const hasCurrentTarget =
      adapter !== undefined && adapter.implementationStatus === 'available' && target !== undefined;
    let profileDigest = null;
    let qualificationDigest = null;
    let currentProfilePackages = null;

    try {
      [profileDigest, qualificationDigest] = await Promise.all([
        calculateQualificationProfileDigest(profileDirectory),
        calculateQualificationExecutionDigest({
          caseIds,
          profileDirectory,
          roots: {
            evaluationHostRoot: join(repositoryRoot, 'tooling/codex-evaluation-host'),
            packageCandidateRoot: join(repositoryRoot, 'tooling/package-candidate'),
            qualificationRoot: join(repositoryRoot, 'qualification'),
            repositoryRoot,
          },
        }),
      ]);
      if (hasCurrentTarget && currentInputs !== null) {
        currentProfilePackages = await resolveCurrentQualificationPackageIdentities({
          adapterPackage: adapter.implementation.package,
          downloadPublishedArtifact,
          publishedManifests: currentInputs.publishedManifests,
          publishedPackages: currentInputs.publishedPackages,
          resolvePublishedManifest,
          runtimePackages,
          typeScriptPackage: currentInputs.typeScriptPackage,
        });
      }
    } catch (error) {
      issues.push(
        `${relativeLatestPath} cannot resolve its current scoped inputs: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const targetDigest =
      hasCurrentTarget && adapter !== undefined && target !== undefined
        ? calculateQualificationTargetDigest(adapter, target)
        : null;
    const currentProfilePackageNames = new Set(
      currentProfilePackages?.map(({ name }) => name) ?? [],
    );
    const recordedPackages = sortPackageIdentities(
      attempt.provenance.packages
        .filter(({ name }) => currentProfilePackageNames.has(name))
        .map(createRecordedPackageIdentity),
    );
    const hasExactPublishedClosure =
      currentProfilePackages !== null &&
      JSON.stringify(recordedPackages) === JSON.stringify(currentProfilePackages);
    const hasSelectedPackage =
      adapter !== undefined &&
      currentProfilePackages?.some(({ name }) => name === adapter.implementation.package) === true;
    if (
      attempt.protocolVersion !== QUALIFICATION_EVIDENCE_PROTOCOL_VERSION ||
      attempt.status !== 'passed' ||
      attempt.provenance?.model !== CODEX_EVALUATION_MODEL ||
      attempt.provenance?.reasoningEffort !== CODEX_EVALUATION_REASONING_EFFORT ||
      attempt.selection?.adapterId !== adapterId ||
      attempt.selection?.implementationId !== implementationId ||
      attempt.provenance?.qualificationDigest !== qualificationDigest ||
      attempt.provenance?.skillRepositoryFingerprint !== skillDigest ||
      attempt.provenance?.profileDigest !== profileDigest ||
      currentInputs === null ||
      attempt.provenance?.packagesRepositoryDirty ||
      targetDigest === null ||
      attempt.provenance?.targetDigest !== targetDigest ||
      !hasExactPublishedClosure ||
      !hasSelectedPackage
    ) {
      issues.push(`${relativeLatestPath} does not match the current release inputs.`);
      continue;
    }

    const hasPassingStages = hasCompletePassingQualificationStages(attempt, caseIds);
    let profileCases;
    try {
      profileCases = cases.map(({ id, projectDirectory, scenarioFile }) => ({
        id,
        scenario: readYaml(
          resolveContainedPath(
            resolveContainedPath(profileDirectory, projectDirectory),
            scenarioFile,
          ),
          QualificationCaseScenarioSchema,
        ),
      }));
    } catch (error) {
      issues.push(
        `${relativeLatestPath} references an invalid qualification scenario: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const hasPassingCases = hasCompletePassingQualificationCases(
      resolveArtifactPath,
      attempt,
      profileCases,
    );
    if (!hasPassingStages) {
      issues.push(`${relativeLatestPath} does not contain every current passing stage.`);
    }
    if (!hasPassingCases) {
      issues.push(`${relativeLatestPath} does not contain every current passing case artifact.`);
    }

    try {
      const controlEvidence = inspectQualificationControlEvidence(
        resolveArtifactPath,
        attempt,
        adapterId,
        relativeLatestPath,
      );
      if (controlEvidence.issue !== null) issues.push(controlEvidence.issue);
      if (hasPassingStages && hasPassingCases && controlEvidence.issue === null) {
        passingEvidence.set(`${adapterId}/${implementationId}`, {
          attempt,
          baseline: controlEvidence.baseline,
          relativeLatestPath,
        });
      }
    } catch (error) {
      issues.push(
        `${relativeLatestPath} contains invalid release-gate control evidence: ${error.message}`,
      );
    }
  }

  const customEvidence = passingEvidence.get('custom/custom');
  const customTargetKey = qualificationProfiles.find(
    ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
  )?.targetKey;
  for (const [selectionKey, evidence] of passingEvidence) {
    if (selectionKey === 'custom/custom') continue;
    const baselineAttemptId = evidence.attempt.provenance.baselineAttemptId;
    let hasRecordedPassingBaseline = false;
    if (baselineAttemptId !== null && customTargetKey !== undefined) {
      const recordedBaselineDirectory = join(
        resultsRoot,
        customTargetKey,
        'attempts',
        createQualificationAttemptKey(baselineAttemptId),
      );
      const recordedBaselinePath = join(recordedBaselineDirectory, 'attempt.json');

      if (existsSync(recordedBaselinePath)) {
        try {
          const recordedBaseline = QualificationAttemptResultSchema.parse(
            readJson(recordedBaselinePath),
          );
          await verifyQualificationAttemptStorage({
            attemptDirectory: recordedBaselineDirectory,
            result: recordedBaseline,
          });
          hasRecordedPassingBaseline =
            recordedBaseline.attemptId === baselineAttemptId &&
            recordedBaseline.protocolVersion === QUALIFICATION_EVIDENCE_PROTOCOL_VERSION &&
            recordedBaseline.status === 'passed' &&
            recordedBaseline.selection.adapterId === 'custom' &&
            recordedBaseline.selection.implementationId === 'custom';
        } catch {
          hasRecordedPassingBaseline = false;
        }
      }
    }
    if (customEvidence === undefined) {
      issues.push(
        `${evidence.relativeLatestPath} requires current passing Custom qualification evidence.`,
      );
    } else if (!hasRecordedPassingBaseline) {
      issues.push(
        `${evidence.relativeLatestPath} does not reference a committed passing Custom baseline.`,
      );
    }
  }

  return issues;
};

/** Requires complete fresh semantic and qualification evidence for release. */
export const assertReleaseEvidence = async (repositoryRoot) => {
  const issues = await inspectReleaseEvidence(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
};
