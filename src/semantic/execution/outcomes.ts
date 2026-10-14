import {
  hasPassingCodexEvaluationCommandPolicy,
  type ICodexEvaluationCommandPolicyEvidence,
} from '../../execution/host/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import type { ISemanticCase } from '../cases/index.ts';
import {
  hasPassingMoldeaActivation,
  hasPassingRepairGitEvidence,
  hasPassingMoldeaResourceContainment,
} from './actor-evidence.ts';
import type { IMoldeaResourceEvidence, ISemanticActorExecutionEvidence } from './types.ts';

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

/** Creates independently attributable outcome dimensions for one completed trial. */
export const createSemanticResultDimensions = (options: {
  actorCommandPolicy: ICodexEvaluationCommandPolicyEvidence;
  actorExecutionEvidence: ISemanticActorExecutionEvidence[];
  actorResourceEvidence: IMoldeaResourceEvidence;
  caseDefinition: ISemanticCase;
  isMountIntegrityPassing: boolean;
  isRepositoryControlPassing: boolean;
  isSemanticPassing: boolean;
  judgeCommandPolicy: ICodexEvaluationCommandPolicyEvidence;
}): ISemanticResultDimensions => ({
  semantic:
    options.isSemanticPassing &&
    hasPassingMoldeaActivation(
      options.actorResourceEvidence,
      options.caseDefinition.resourceBudget,
    ),
  resource:
    hasPassingMoldeaResourceContainment(
      options.actorResourceEvidence,
      options.caseDefinition.resourceBudget,
    ) && hasPassingHostResourceProfile(options.actorCommandPolicy, options.caseDefinition),
  commandPolicy:
    hasPassingCodexEvaluationCommandPolicy(options.actorCommandPolicy) &&
    hasPassingCodexEvaluationCommandPolicy(options.judgeCommandPolicy) &&
    (!options.caseDefinition.expected.some(({ label }) =>
      ['approved-repair-git', 'repair-git-compliance'].includes(label),
    ) ||
      (options.actorExecutionEvidence.length === options.actorCommandPolicy.completedCommandCount &&
        hasPassingRepairGitEvidence(options.actorExecutionEvidence) &&
        (!options.caseDefinition.expected.some(({ label }) => label === 'approved-repair-git') ||
          options.actorExecutionEvidence.some(({ item }) => item.repairGit.compliantCount > 0)))),
  repositoryControl: options.isRepositoryControlPassing,
  mountIntegrity: options.isMountIntegrityPassing,
  operational: true,
});

/** Returns whether all semantic outcome dimensions passed. */
export const hasPassingSemanticResultDimensions = (
  dimensions: ISemanticResultDimensions,
): boolean => SEMANTIC_RESULT_DIMENSION_NAMES.every((dimension) => dimensions[dimension]);

/** Limits confirmations to semantic uncertainty when every deterministic dimension passed. */
export const isSemanticConfirmationEligible = (dimensions: ISemanticResultDimensions): boolean =>
  !dimensions.semantic &&
  SEMANTIC_RESULT_DIMENSION_NAMES.filter((dimension) => dimension !== 'semantic').every(
    (dimension) => dimensions[dimension],
  );

/** Returns stable identifiers for every failing dimension. */
export const getSemanticFailureClassifications = (
  dimensions: ISemanticResultDimensions,
): Array<(typeof SEMANTIC_RESULT_DIMENSION_NAMES)[number]> =>
  SEMANTIC_RESULT_DIMENSION_NAMES.filter((dimension) => !dimensions[dimension]);
