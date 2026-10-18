import {
  hasPassingCodexEvaluationCommandPolicy,
  type ICodexEvaluationCommandPolicyEvidence,
  type IGitInvocationEvidence,
} from '../../execution/host/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import type { ISemanticCase } from '../cases/index.ts';
import {
  hasPassingMoldeaActivation,
  hasPassingRepairGitEvidence,
  hasPassingMoldeaResourceContainment,
} from './actor-evidence.ts';
import type {
  IMoldeaResourceEvidence,
  ISemanticActorExecutionEvidence,
  ISemanticCycleEvidence,
  ISemanticPaidInvocation,
} from './types.ts';

export const SEMANTIC_RESULT_DIMENSION_NAMES = [
  'semantic',
  'resource',
  'commandPolicy',
  'repositoryControl',
  'mountIntegrity',
  'operational',
] as const;

export type ISemanticResultDimensions = Record<
  (typeof SEMANTIC_RESULT_DIMENSION_NAMES)[number],
  boolean
>;

const hasPassingHostResourceProfile = (
  commandPolicy: ICodexEvaluationCommandPolicyEvidence,
  caseDefinition: ISemanticCase,
): boolean => {
  const profile =
    MOLDEA_SKILL_RESOURCE_PROFILES[caseDefinition.resourceBudget.profile ?? 'ordinary'];
  return (
    commandPolicy.completedCommandCount <= profile.maxCompletedCommandCount &&
    commandPolicy.maximumCommandOutputByteCount <= profile.maxCommandOutputBytes &&
    commandPolicy.modelVisibleToolOutputByteCount <= profile.maxModelVisibleToolOutputBytes
  );
};

/** Enforces the case's complete repair-Git observations independently of the judge verdict. */
export const hasPassingCaseRepairGitEvidence = (options: {
  actorCommandPolicy: ICodexEvaluationCommandPolicyEvidence;
  gitInvocationEvidence: IGitInvocationEvidence;
  actorExecutionEvidence: ISemanticActorExecutionEvidence[];
  caseDefinition: ISemanticCase;
}): boolean =>
  !options.caseDefinition.expected.some(({ label }) =>
    ['approved-repair-git', 'repair-git-compliance'].includes(label),
  ) ||
  (options.actorExecutionEvidence.filter(({ item }) => item.commandKind === 'other').length ===
    options.actorCommandPolicy.completedCommandCount &&
    hasPassingRepairGitEvidence(options.actorExecutionEvidence, options.gitInvocationEvidence) &&
    (!options.caseDefinition.expected.some(({ label }) => label === 'approved-repair-git') ||
      options.gitInvocationEvidence.repair.compliantCount > 0));

/** Creates independently attributable outcome dimensions for one completed trial. */
export const createSemanticResultDimensions = (options: {
  cycles?: readonly ISemanticCycleEvidence[];
  paidInvocations?: readonly ISemanticPaidInvocation[];
  actorCommandPolicy: ICodexEvaluationCommandPolicyEvidence;
  gitInvocationEvidence: IGitInvocationEvidence;
  actorExecutionEvidence: ISemanticActorExecutionEvidence[];
  actorResourceEvidence: IMoldeaResourceEvidence;
  caseDefinition: ISemanticCase;
  isMountIntegrityPassing: boolean;
  isRepositoryControlPassing: boolean;
  isSemanticPassing: boolean;
  judgeCommandPolicy: ICodexEvaluationCommandPolicyEvidence;
}): ISemanticResultDimensions => {
  if (options.cycles !== undefined) {
    if (options.cycles.length === 0)
      throw new Error('Semantic dimensions require at least one cycle.');
    const { cycles, ...common } = options;
    const completedCycles = (options.paidInvocations ?? []).flatMap(({ cycle }) =>
      cycle === undefined ? [] : [cycle],
    );
    const allCycles = [...completedCycles.slice(0, -cycles.length), ...cycles];
    const tokenLimit =
      MOLDEA_SKILL_RESOURCE_PROFILES[options.caseDefinition.resourceBudget.profile ?? 'ordinary']
        .maxHostTokenCount;
    const results = allCycles.map((cycle) => {
      const result = createSemanticResultDimensions({
        ...common,
        actorCommandPolicy: cycle.commandPolicyEvidence,
        actorExecutionEvidence: cycle.actorExecutionEvidence,
        actorResourceEvidence: cycle.actorResourceEvidence,
        gitInvocationEvidence: cycle.gitInvocationEvidence,
        isMountIntegrityPassing: cycle.isMountIntegrityPassing,
        isRepositoryControlPassing: cycle.isRepositoryControlPassing,
      });
      result.resource &&=
        cycle.usage !== null && cycle.usage.inputTokens + cycle.usage.outputTokens <= tokenLimit;
      return result;
    });
    return Object.fromEntries(
      SEMANTIC_RESULT_DIMENSION_NAMES.map((name) => [
        name,
        results.every((result) => result[name]),
      ]),
    ) as ISemanticResultDimensions;
  }
  return {
    semantic:
      options.isSemanticPassing &&
      hasPassingCaseRepairGitEvidence(options) &&
      hasPassingMoldeaActivation(
        options.actorResourceEvidence,
        options.caseDefinition.resourceBudget,
      ) &&
      (options.caseDefinition.resourceBudget.activation !== 'relationship' ||
        options.actorExecutionEvidence.some(
          ({ item }) =>
            item.exitCode === 0 &&
            item.outputEvidence.facts.some(
              (fact) =>
                fact.kind === 'moldea-cli-envelope' &&
                fact.command === 'scope' &&
                fact.status === 'valid' &&
                fact.errorPresent === false &&
                fact.relevant === true,
            ),
        )),
    resource:
      hasPassingMoldeaResourceContainment(
        options.actorResourceEvidence,
        options.caseDefinition.resourceBudget,
      ) && hasPassingHostResourceProfile(options.actorCommandPolicy, options.caseDefinition),
    commandPolicy:
      hasPassingCodexEvaluationCommandPolicy(options.actorCommandPolicy) &&
      hasPassingCodexEvaluationCommandPolicy(options.judgeCommandPolicy) &&
      (options.paidInvocations ?? []).every(
        ({ commandPolicyEvidence }) =>
          commandPolicyEvidence === undefined ||
          hasPassingCodexEvaluationCommandPolicy(commandPolicyEvidence),
      ),
    repositoryControl: options.isRepositoryControlPassing,
    mountIntegrity: options.isMountIntegrityPassing,
    operational: true,
  };
};

/** Returns whether all semantic outcome dimensions passed. */
export const hasPassingSemanticResultDimensions = (
  dimensions: ISemanticResultDimensions,
): boolean => SEMANTIC_RESULT_DIMENSION_NAMES.every((dimension) => dimensions[dimension]);

/** Confirms semantic or resource failures while preserving safety and integrity hard stops. */
export const isSemanticConfirmationEligible = (dimensions: ISemanticResultDimensions): boolean =>
  (!dimensions.semantic || !dimensions.resource) &&
  SEMANTIC_RESULT_DIMENSION_NAMES.filter(
    (dimension) => dimension !== 'semantic' && dimension !== 'resource',
  ).every((dimension) => dimensions[dimension]);

/** Returns stable identifiers for every failing dimension. */
export const getSemanticFailureClassifications = (
  dimensions: ISemanticResultDimensions,
): Array<(typeof SEMANTIC_RESULT_DIMENSION_NAMES)[number]> =>
  SEMANTIC_RESULT_DIMENSION_NAMES.filter((dimension) => !dimensions[dimension]);
