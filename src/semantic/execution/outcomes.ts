import {
  hasPassingCodexEvaluationCommandPolicy,
  type ICodexEvaluationCommandOwnership,
  type ICodexEvaluationCommandPolicyEvidence,
  type IGitInvocationEvidence,
} from '../../execution/host/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import type { ISemanticCase } from '../cases/index.ts';
import type { ISemanticWorkspaceChanges } from '../workspace/index.ts';
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

type IResourceProfileName = 'largeTraversal' | 'ordinary';

/*
 * command owners whose host commands and output count as moldea's own work; explicit repair and
 * initialization also count the source reads made for their assessment
 */
const OWNED_COMMAND_OWNERSHIPS: Readonly<
  Record<IResourceProfileName, readonly ICodexEvaluationCommandOwnership[]>
> = {
  ordinary: ['canonical', 'cli', 'helper'],
  largeTraversal: ['canonical', 'cli', 'helper', 'source'],
};

// the exempt final validation may emit at most one ordinary output page
const FINAL_VALIDATION_MAXIMUM_OUTPUT_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxOutputPageBytes;

// the moldea work one cycle consumed, measured against its resource profile
export interface IOwnedResourceUsage {
  aggregateMoldeaOutputByteCount: number;
  completedCommandCount: number;
  maximumCommandOutputByteCount: number;
  modelVisibleToolOutputByteCount: number;
}

/**
 * Measures the profile's owned host commands and output, plus the aggregate moldea output:
 * captured launcher output and helper and moldea/ read output, never source reads.
 * @param options One cycle's command policy, launcher captures, profile and exempt validation.
 * @returns The owned totals the profile limits apply to.
 */
export const measureOwnedResourceUsage = (options: {
  commandPolicy: ICodexEvaluationCommandPolicyEvidence;
  exemptValidationByteCount: number | null;
  profileName: IResourceProfileName;
  resourceEvidence: IMoldeaResourceEvidence;
}): IOwnedResourceUsage => {
  const { commandOwnership } = options.commandPolicy;
  const ownedTotals = OWNED_COMMAND_OWNERSHIPS[options.profileName].map(
    (ownership) => commandOwnership[ownership],
  );
  return {
    aggregateMoldeaOutputByteCount:
      options.resourceEvidence.stdoutByteCount -
      (options.exemptValidationByteCount ?? 0) +
      commandOwnership.helper.outputByteCount +
      commandOwnership.canonical.outputByteCount,
    completedCommandCount: ownedTotals.reduce((total, { commandCount }) => total + commandCount, 0),
    maximumCommandOutputByteCount: Math.max(
      0,
      ...ownedTotals.map(({ maximumOutputByteCount }) => maximumOutputByteCount),
    ),
    modelVisibleToolOutputByteCount: ownedTotals.reduce(
      (total, { outputByteCount }) => total + outputByteCount,
      0,
    ),
  };
};

/** Checks one cycle's owned usage against its resource profile. */
const hasPassingResourceProfile = (
  usage: IOwnedResourceUsage,
  profileName: IResourceProfileName,
): boolean => {
  const profile = MOLDEA_SKILL_RESOURCE_PROFILES[profileName];
  return (
    usage.completedCommandCount <= profile.maxCompletedCommandCount &&
    usage.maximumCommandOutputByteCount <= profile.maxCommandOutputBytes &&
    usage.modelVisibleToolOutputByteCount <= profile.maxModelVisibleToolOutputBytes &&
    usage.aggregateMoldeaOutputByteCount <= profile.maxAggregateMoldeaOutputBytes
  );
};

/**
 * Finds the one ordinary-profile `validate` exempt from the aggregate allowance and the scenario's
 * CLI limits: it follows a known patch to moldea/ and any later patch that may have touched it, is
 * the only validation since the last such patch, and nothing moldea-owned follows it. Missing or
 * unplaceable evidence, including an unreadable patch on its own, never earns the exemption.
 * @param options One cycle's ordered events, launcher captures and net workspace changes.
 * @returns The exempt call's launcher output bytes, or null when no call qualifies.
 */
export const identifyFinalValidationExemption = (options: {
  actorExecutionEvidence: readonly ISemanticActorExecutionEvidence[];
  commandPolicy: ICodexEvaluationCommandPolicyEvidence;
  profileName: IResourceProfileName;
  resourceEvidence: IMoldeaResourceEvidence;
  workspaceChanges: ISemanticWorkspaceChanges | undefined;
}): number | null => {
  if (options.profileName !== 'ordinary' || options.workspaceChanges === undefined) return null;
  const events = options.commandPolicy.moldeaEvents;
  // every captured launcher call must have a placed command event with the same operation
  const cliOperations = events.flatMap((event) =>
    event.kind === 'command' && event.ownership === 'cli' ? [event.operation] : [],
  );
  const capturedOperations = options.resourceEvidence.operations;
  if (
    cliOperations.length !== capturedOperations.length ||
    cliOperations.some((operation, index) => operation !== capturedOperations[index])
  ) {
    return null;
  }
  // an unreadable patch may have touched moldea/, so the validate must follow it, but only a
  // patch positively touching moldea/ at or before that point earns the exemption
  const lastWriteIndex = events.findLastIndex(
    (event) => event.kind === 'file-change' && event.moldeaPath !== 'not-touching',
  );
  const hasKnownWrite = events
    .slice(0, lastWriteIndex + 1)
    .some((event) => event.kind === 'file-change' && event.moldeaPath === 'touching');
  if (!hasKnownWrite) return null;
  const laterCommands = events
    .slice(lastWriteIndex + 1)
    .flatMap((event) => (event.kind === 'command' ? [event] : []));
  const validations = laterCommands.filter(
    (event) => event.ownership === 'cli' && event.operation === 'validate',
  );
  const finalCommand = laterCommands.at(-1);
  const finalInvocation = options.actorExecutionEvidence
    .filter(({ item }) => item.commandKind === 'moldea')
    .at(-1);
  if (
    validations.length !== 1 ||
    finalCommand === undefined ||
    finalCommand !== validations[0] ||
    finalInvocation === undefined ||
    capturedOperations.at(-1) !== 'validate' ||
    Math.max(finalCommand.outputByteCount, finalInvocation.item.outputEvidence.byteCount) >
      FINAL_VALIDATION_MAXIMUM_OUTPUT_BYTES
  ) {
    return null;
  }
  // the ordered stream proves the order; the net diff only confirms moldea/ still changed
  const { created, deleted, modified } = options.workspaceChanges;
  const hasNetMoldeaChange = [...created, ...deleted, ...modified].some(
    ({ path }) => path === 'moldea' || path.startsWith('moldea/'),
  );
  return hasNetMoldeaChange ? finalInvocation.item.outputEvidence.byteCount : null;
};

/** Enforces helper-only Git compliance for explicitly labelled repair cases, independently of the judge. */
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

/** Rejects observed repair Git work in cases explicitly limited to structural validation. */
const hasPassingValidationBoundary = (options: {
  actorCommandPolicy: ICodexEvaluationCommandPolicyEvidence;
  actorExecutionEvidence: ISemanticActorExecutionEvidence[];
  caseDefinition: ISemanticCase;
  gitInvocationEvidence: IGitInvocationEvidence;
}): boolean =>
  !options.caseDefinition.expected.some(({ label }) => label === 'standalone-validation-only') ||
  (options.actorExecutionEvidence.filter(({ item }) => item.commandKind === 'other').length ===
    options.actorCommandPolicy.completedCommandCount &&
    options.gitInvocationEvidence.repair.compliantCount === 0 &&
    options.actorExecutionEvidence.every(
      ({ item }) =>
        item.repairGit.compliantCount === 0 &&
        item.outputEvidence.facts.every(({ kind }) => kind !== 'repair-git-result'),
    ) &&
    hasPassingRepairGitEvidence(options.actorExecutionEvidence, options.gitInvocationEvidence));

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
  // one cycle's net changes; without them no final validation is exempt
  workspaceChanges?: ISemanticWorkspaceChanges;
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
        workspaceChanges: cycle.workspaceChanges,
      });
      // resumed requests exclude cached history from grading, but retain it in paid usage
      result.resource &&=
        cycle.usage !== null &&
        cycle.usage.inputTokens -
          (cycle.requestIndex > 0 ? cycle.usage.cachedInputTokens : 0) +
          cycle.usage.outputTokens <=
          tokenLimit;
      return result;
    });
    return Object.fromEntries(
      SEMANTIC_RESULT_DIMENSION_NAMES.map((name) => [
        name,
        results.every((result) => result[name]),
      ]),
    ) as ISemanticResultDimensions;
  }
  const profileName = options.caseDefinition.resourceBudget.profile ?? 'ordinary';
  const exemptValidationByteCount = identifyFinalValidationExemption({
    actorExecutionEvidence: options.actorExecutionEvidence,
    commandPolicy: options.actorCommandPolicy,
    profileName,
    resourceEvidence: options.actorResourceEvidence,
    workspaceChanges: options.workspaceChanges,
  });
  return {
    semantic:
      options.isSemanticPassing &&
      hasPassingCaseRepairGitEvidence(options) &&
      hasPassingValidationBoundary(options) &&
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
        exemptValidationByteCount,
      ) &&
      hasPassingResourceProfile(
        measureOwnedResourceUsage({
          commandPolicy: options.actorCommandPolicy,
          exemptValidationByteCount,
          profileName,
          resourceEvidence: options.actorResourceEvidence,
        }),
        profileName,
      ) &&
      (options.paidInvocations ?? []).every(
        ({ stage, usage }) =>
          stage !== 'judge' ||
          usage === null ||
          usage.inputTokens + usage.outputTokens <=
            MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount,
      ),
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
