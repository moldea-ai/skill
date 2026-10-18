import { hasValidCodexEvaluationCommandPolicy } from '../../execution/host/index.ts';
import {
  createMoldeaResourceEvidence,
  hasValidActorExecutionEvidence,
  hasValidMoldeaResourceEvidence,
} from './actor-evidence.ts';
import { serializeSemanticStageValue } from '../stages/index.ts';
import type { ISemanticHostOutput } from './host-output.ts';
import type { ISemanticCycleEvidence } from './types.ts';

const mergeCounts = <T extends string>(
  left: Array<{ code: T; count: number }>,
  right: Array<{ code: T; count: number }>,
): Array<{ code: T; count: number }> => {
  const counts = new Map<T, number>();
  for (const { code, count } of [...left, ...right]) {
    counts.set(code, (counts.get(code) ?? 0) + count);
  }
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([code, count]) => ({ code, count }));
};

/**
 * Adds already-validated invocations for display, without applying a single-cycle limit to totals.
 * @returns The aggregate host evidence; cycles retain the enforceable boundaries.
 * @throws If no completed cycle exists.
 */
export const summarizeSemanticCycles = (
  cycles: readonly ISemanticCycleEvidence[],
): ISemanticHostOutput => {
  const first = cycles[0];
  if (first === undefined)
    throw new Error('Semantic session requires at least one completed cycle.');
  const summary: ISemanticHostOutput = structuredClone({
    actorExecutionEvidence: first.actorExecutionEvidence,
    actorResourceEvidence: first.actorResourceEvidence,
    commandPolicyEvidence: first.commandPolicyEvidence,
    gitInvocationEvidence: first.gitInvocationEvidence,
    response: first.response,
    usage: first.usage,
  });
  for (const cycle of cycles.slice(1)) {
    summary.actorExecutionEvidence.push(...cycle.actorExecutionEvidence);
    summary.response = cycle.response;
    const total = summary.commandPolicyEvidence;
    const next = cycle.commandPolicyEvidence;
    total.completedCommandCount += next.completedCommandCount;
    total.maximumCommandOutputByteCount = Math.max(
      total.maximumCommandOutputByteCount,
      next.maximumCommandOutputByteCount,
    );
    total.modelVisibleToolOutputByteCount += next.modelVisibleToolOutputByteCount;
    total.moldeaCommandCount += next.moldeaCommandCount;
    total.moldeaOutputByteCount += next.moldeaOutputByteCount;
    for (const [ownership, totals] of Object.entries(total.commandOwnership) as Array<
      [keyof typeof total.commandOwnership, (typeof total.commandOwnership)['cli']]
    >) {
      const nextTotals = next.commandOwnership[ownership];
      totals.commandCount += nextTotals.commandCount;
      totals.outputByteCount += nextTotals.outputByteCount;
      totals.maximumOutputByteCount = Math.max(
        totals.maximumOutputByteCount,
        nextTotals.maximumOutputByteCount,
      );
    }
    total.moldeaEvents.push(...next.moldeaEvents);
    total.moldeaLauncherMissReasons = mergeCounts(
      total.moldeaLauncherMissReasons,
      next.moldeaLauncherMissReasons,
    );
    total.credentialExposure.observedCount += next.credentialExposure.observedCount;
    total.credentialExposure.reasons = mergeCounts(
      total.credentialExposure.reasons,
      next.credentialExposure.reasons,
    );
    total.credentialExposure.status =
      total.credentialExposure.observedCount > 0 ? 'observed' : 'not-observed';
    for (const key of ['networkAccess', 'sensitiveAccess'] as const) {
      total[key].observedCount += next[key].observedCount;
      total[key].indeterminateCount += next[key].indeterminateCount;
      total[key].reasons = mergeCounts(total[key].reasons, next[key].reasons);
      total[key].status =
        total[key].observedCount > 0
          ? 'observed'
          : total[key].indeterminateCount > 0
            ? 'indeterminate'
            : 'not-observed';
    }
    const resource = summary.actorResourceEvidence;
    resource.commandCount += cycle.actorResourceEvidence.commandCount;
    resource.maximumInvocationByteCount = Math.max(
      resource.maximumInvocationByteCount,
      cycle.actorResourceEvidence.maximumInvocationByteCount,
    );
    resource.modelVisibleToolOutputByteCount +=
      cycle.actorResourceEvidence.modelVisibleToolOutputByteCount;
    resource.operations.push(...cycle.actorResourceEvidence.operations);
    resource.stdoutByteCount += cycle.actorResourceEvidence.stdoutByteCount;
    const git = summary.gitInvocationEvidence;
    git.invocationCount += cycle.gitInvocationEvidence.invocationCount;
    git.hostInvocationCount += cycle.gitInvocationEvidence.hostInvocationCount;
    for (const key of ['compliantCount', 'noncompliantCount', 'unverifiedCount'] as const) {
      git.repair[key] += cycle.gitInvocationEvidence.repair[key];
    }
    git.repair.reasons = mergeCounts(
      git.repair.reasons,
      cycle.gitInvocationEvidence.repair.reasons,
    );
    if (summary.usage === null || cycle.usage === null) summary.usage = null;
    else {
      summary.usage.cachedInputTokens += cycle.usage.cachedInputTokens;
      summary.usage.inputTokens += cycle.usage.inputTokens;
      summary.usage.outputTokens += cycle.usage.outputTokens;
    }
  }
  return summary;
};

/** Validates evidence at each request boundary rather than treating a session as one allowance. */
export const hasValidSemanticCycles = (
  cycles: readonly ISemanticCycleEvidence[],
  options: { cliVersion: string; jsonSchemaVersion: number },
): boolean =>
  cycles.length > 0 &&
  cycles.every(
    (cycle, index) =>
      cycle.requestIndex === index &&
      cycle.developerRequest.trim().length > 0 &&
      hasValidCodexEvaluationCommandPolicy(cycle.commandPolicyEvidence) &&
      hasValidMoldeaResourceEvidence(cycle.actorResourceEvidence) &&
      hasValidActorExecutionEvidence(cycle.actorExecutionEvidence, options) &&
      cycle.actorExecutionEvidence.filter(({ item }) => item.commandKind === 'other').length ===
        cycle.commandPolicyEvidence.completedCommandCount &&
      cycle.actorResourceEvidence.commandCount === cycle.commandPolicyEvidence.moldeaCommandCount &&
      cycle.actorResourceEvidence.stdoutByteCount ===
        cycle.commandPolicyEvidence.moldeaOutputByteCount &&
      serializeSemanticStageValue(
        createMoldeaResourceEvidence(cycle.actorExecutionEvidence, options),
      ) === serializeSemanticStageValue(cycle.actorResourceEvidence) &&
      (cycle.usage === null ||
        (Object.values(cycle.usage).every((count) => Number.isSafeInteger(count) && count >= 0) &&
          cycle.usage.cachedInputTokens <= cycle.usage.inputTokens &&
          Number.isSafeInteger(cycle.usage.inputTokens + cycle.usage.outputTokens))),
  );
