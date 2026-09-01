import { hasPassingCodexEvaluationCommandPolicy } from '../../../tooling/codex-evaluation-host/index.mjs';

import type {
  IActorOutput,
  IJudgeOutput,
  ICandidateClosure,
  IDeterministicVerification,
  IQualificationAttemptCheckpoint,
  IQualificationCaseScenario,
  IQualificationCommandPolicyEvidence,
  IQualificationExecutionEnvironment,
  IQualificationRequirementAssessment,
  IQualificationSourceStateResult,
  IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import {
  QUALIFICATION_ALLOWED_EGRESS_HOSTS,
  QUALIFICATION_MODEL_ENDPOINT_ORIGINS,
} from '../constants/index.ts';

import type { IQualificationInputState } from './types.ts';

const formatIds = (ids: readonly string[]): string => ids.join(', ');

/**
 * Inspects whether repository inputs are publishable before an official qualification run.
 * @returns The transparent source-state decision persisted with the attempt.
 */
export const inspectQualificationSourceState = (
  options: {
    executionEnvironment: IQualificationExecutionEnvironment;
    isDryRun: boolean;
  } & Pick<IQualificationInputState, 'packagesState' | 'qualificationState' | 'skillState'>,
): IQualificationSourceStateResult => {
  const failures: string[] = [];
  const isModelEndpointTrusted =
    options.executionEnvironment.modelEndpoint === null ||
    QUALIFICATION_MODEL_ENDPOINT_ORIGINS.some(
      (origin) => origin === options.executionEnvironment.modelEndpoint?.origin,
    );
  const isEgressRestricted =
    JSON.stringify([...options.executionEnvironment.allowedEgressHosts].sort()) ===
    JSON.stringify(QUALIFICATION_ALLOWED_EGRESS_HOSTS);
  const isTlsConfigurationTrusted = options.executionEnvironment.sslCertificateFileSha256 === null;
  const isExecutionHostTrusted =
    isModelEndpointTrusted && isEgressRestricted && isTlsConfigurationTrusted;

  if (!options.isDryRun && !isModelEndpointTrusted) {
    failures.push(
      'Official qualification requires the default Codex model transport or the canonical OpenAI API origin.',
    );
  }

  if (!options.isDryRun && !isEgressRestricted) {
    failures.push(
      'Official qualification cannot expose additional network hosts beyond the fixed evaluation allowlist.',
    );
  }

  if (!options.isDryRun && !isTlsConfigurationTrusted) {
    failures.push('Official qualification cannot use a custom TLS certificate file.');
  }

  if (!options.isDryRun && options.packagesState.isDirty) {
    failures.push(
      'The packages repository has uncommitted changes. Commit the tested package source before an official qualification run.',
    );
  }

  if (!options.isDryRun && options.qualificationState.isDirty) {
    failures.push(
      'The qualification suite has uncommitted changes. Commit the tested qualification source before an official qualification run.',
    );
  }

  if (!options.isDryRun && options.skillState.isDirty) {
    failures.push(
      'The portable skill has uncommitted changes. Commit the tested skill source before an official qualification run.',
    );
  }

  return {
    passed: failures.length === 0,
    requiresCleanInputs: !options.isDryRun,
    isExecutionHostTrusted,
    packagesRepositoryDirty: options.packagesState.isDirty,
    qualificationRepositoryDirty: options.qualificationState.isDirty,
    skillRepositoryDirty: options.skillState.isDirty,
    failures,
  };
};

/**
 * Compares current source fingerprints with the attempt checkpoint.
 * @returns Whether any qualification input changed.
 */
export const haveQualificationInputsChanged = (
  checkpoint: Pick<
    IQualificationAttemptCheckpoint,
    'packagesDigest' | 'qualificationDigest' | 'skillDigest'
  >,
  inputState: IQualificationInputState,
): boolean =>
  checkpoint.qualificationDigest !== inputState.qualificationDigest ||
  checkpoint.skillDigest !== inputState.skillState.fingerprint ||
  checkpoint.packagesDigest !== inputState.packagesDigest;

/** Returns whether a resumed attempt would use a different local execution host identity. */
export const haveQualificationExecutionInputsChanged = (
  expected: IQualificationExecutionEnvironment,
  current: IQualificationExecutionEnvironment,
): boolean => JSON.stringify(expected) !== JSON.stringify(current);

/** Returns whether reconstructed candidate artifacts differ from the checkpointed closure. */
export const haveCandidateClosuresChanged = (
  expected: ICandidateClosure,
  current: ICandidateClosure,
): boolean => JSON.stringify(expected) !== JSON.stringify(current);

/**
 * Validates one judge decision against the exact requirements declared by its scenario.
 * @returns The validated judge output.
 * @throws
 * - If requirement identities or verdict and failure states are inconsistent
 */
export const validateJudgeOutput = (
  scenario: IQualificationCaseScenario,
  output: IJudgeOutput,
): IJudgeOutput => {
  const declaredIds = scenario.judgeRequirements
    .filter((requirement) => requirement.evaluation.kind === 'judge')
    .map(({ id }) => id);
  const outputIds = output.requirements.map(({ id }) => id);
  const outputIdSet = new Set(outputIds);
  const duplicateIds = [
    ...new Set(outputIds.filter((id, index) => outputIds.indexOf(id) !== index)),
  ];
  const missingIds = declaredIds.filter((id) => !outputIdSet.has(id));
  const declaredIdSet = new Set(declaredIds);
  const unknownIds = [...outputIdSet].filter((id) => !declaredIdSet.has(id));

  if (duplicateIds.length > 0) {
    throw new Error(`Judge output contains duplicate requirement ids: ${formatIds(duplicateIds)}.`);
  }

  if (missingIds.length > 0) {
    throw new Error(`Judge output is missing declared requirement ids: ${formatIds(missingIds)}.`);
  }

  if (unknownIds.length > 0) {
    throw new Error(`Judge output contains unknown requirement ids: ${formatIds(unknownIds)}.`);
  }

  const failedRequirementIds = output.requirements
    .filter(({ verdict }) => verdict === 'fail')
    .map(({ id }) => id);

  if (output.verdict === 'pass' && failedRequirementIds.length > 0) {
    throw new Error(
      `Judge output passed despite failed requirements: ${formatIds(failedRequirementIds)}.`,
    );
  }

  if (output.verdict === 'pass' && output.failures.length > 0) {
    throw new Error('Judge output passed while reporting actionable failures.');
  }

  if (output.verdict === 'fail' && output.failures.length === 0) {
    throw new Error('Judge output failed without reporting an actionable failure.');
  }

  return output;
};

/** Derives mandatory trial failures from actor and judge command-policy evidence. */
export const deriveQualificationCommandPolicyFailures = (options: {
  actorCommandPolicy: IQualificationCommandPolicyEvidence;
  judgeCommandPolicy: IQualificationCommandPolicyEvidence | null;
}): string[] => [
  ...(hasPassingCodexEvaluationCommandPolicy(options.actorCommandPolicy)
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
];

/** Creates deterministic assessments for every runner-owned scenario requirement. */
export const createRunnerRequirementAssessments = (options: {
  actorCommandPolicy: IQualificationCommandPolicyEvidence;
  actorOutput: IActorOutput;
  deterministicAfter: IDeterministicVerification;
  scenario: IQualificationCaseScenario;
  workspaceAssertions: IWorkspaceAssertionResult;
}): IQualificationRequirementAssessment[] =>
  options.scenario.judgeRequirements.flatMap((requirement) => {
    if (requirement.evaluation.kind !== 'runner') return [];

    const checkResults = requirement.evaluation.checks.map((check) => {
      switch (check) {
        case 'actor-command-policy':
          return {
            check,
            passed: hasPassingCodexEvaluationCommandPolicy(options.actorCommandPolicy),
          };
        case 'deterministic-after':
          return { check, passed: options.deterministicAfter.passed };
        case 'expected-actor-outcome':
          return {
            check,
            passed: options.actorOutput.outcome === options.scenario.expectedActorOutcome,
          };
        case 'workspace-assertions':
          return { check, passed: options.workspaceAssertions.passed };
      }
    });
    const failedChecks = checkResults.filter(({ passed }) => !passed).map(({ check }) => check);
    return [
      {
        id: requirement.id,
        evaluator: 'runner' as const,
        verdict: failedChecks.length === 0 ? ('pass' as const) : ('fail' as const),
        evidence:
          failedChecks.length === 0
            ? `Runner checks passed: ${requirement.evaluation.checks.join(', ')}.`
            : `Runner checks failed: ${failedChecks.join(', ')}.`,
      },
    ];
  });

/** Creates explicit unevaluated assessments for model-owned dry-run requirements. */
export const createDryRunJudgeRequirementAssessments = (
  scenario: IQualificationCaseScenario,
): IQualificationRequirementAssessment[] =>
  scenario.judgeRequirements.flatMap((requirement) =>
    requirement.evaluation.kind === 'judge'
      ? [
          {
            id: requirement.id,
            evaluator: 'judge' as const,
            verdict: 'not-evaluated' as const,
            evidence: 'The skipped judge stage did not evaluate this semantic requirement.',
          },
        ]
      : [],
  );

/** Merges runner and judge decisions into exact scenario order. */
export const mergeQualificationRequirementAssessments = (options: {
  judgeOutput: IJudgeOutput | null;
  runnerAssessments: readonly IQualificationRequirementAssessment[];
  scenario: IQualificationCaseScenario;
  isJudgeEvaluated: boolean;
}): IQualificationRequirementAssessment[] => {
  const judgeAssessments = options.isJudgeEvaluated
    ? (options.judgeOutput?.requirements.map(({ evidence, id, verdict }) => ({
        id,
        evaluator: 'judge' as const,
        verdict,
        evidence,
      })) ?? [])
    : createDryRunJudgeRequirementAssessments(options.scenario);
  const assessments = [...options.runnerAssessments, ...judgeAssessments];
  const byId = new Map(assessments.map((assessment) => [assessment.id, assessment]));

  if (byId.size !== assessments.length) {
    throw new Error('Qualification requirement assessments contain duplicate ids.');
  }

  return options.scenario.judgeRequirements.map((requirement) => {
    const assessment = byId.get(requirement.id);
    if (assessment === undefined || assessment.evaluator !== requirement.evaluation.kind) {
      throw new Error(`Qualification requirement ${requirement.id} is missing its evaluator.`);
    }
    return assessment;
  });
};
