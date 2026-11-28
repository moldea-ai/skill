import { z } from 'zod';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
  projectCodexEvaluationExecutionEvidence,
  GitInvocationEventSchema,
  CliInvocationEventSchema,
  correlateToolInvocations,
  type ICliInvocationEvent,
  type ICliInvocation,
  type IGitInvocationEvidence,
  type ICodexEvaluationCommandPolicyEvidence,
} from '../../execution/host/index.ts';
import {
  createMoldeaResourceEvidence,
  hasValidActorExecutionEvidence,
  projectActorExecutionEvidenceEvent,
  projectCapturedChildEvidence,
  projectCliInvocationEvidence,
  projectManagedAgentsInvocationEvidence,
} from './actor-evidence.ts';
import type {
  IMoldeaResourceEvidence,
  ISemanticActorExecutionEvidence,
  ISemanticActorExecutionEvidenceOptions,
} from './types.ts';

const HostEventSchema = z.looseObject({ type: z.string() });
const GitCaptureCommandSchema = z.looseObject({
  type: z.literal('item.completed'),
  item: z.looseObject({ type: z.literal('command_execution'), aggregated_output: z.string() }),
});

const AgentMessageEventSchema = z.looseObject({
  type: z.literal('item.completed'),
  item: z.looseObject({ type: z.literal('agent_message'), text: z.string() }),
});

/** Retains a captured call's resource charge without awarding unplaced method evidence. */
const projectUnplacedCliInvocation = (
  invocation: ICliInvocation,
  options: ISemanticActorExecutionEvidenceOptions,
): ISemanticActorExecutionEvidence => {
  const entry = projectCliInvocationEvidence(invocation, options);
  entry.item.outputEvidence.facts = [];
  if (entry.item.outputEvidence.disposition === 'projected')
    entry.item.outputEvidence.disposition =
      entry.item.outputEvidence.byteCount === 0 ? 'empty' : 'unrecognized';
  return entry;
};

/** Keeps supplemental observations separate from chargeable CLI calls. */
const projectCapturedInvocation = (
  invocation: ICliInvocation,
  options: ISemanticActorExecutionEvidenceOptions,
  isPlaced: boolean,
): ISemanticActorExecutionEvidence | null => {
  switch (invocation.entrypoint) {
    case undefined:
    case 'cli':
      return isPlaced
        ? projectCliInvocationEvidence(invocation, options)
        : projectUnplacedCliInvocation(invocation, options);
    case 'managed-agents':
      return isPlaced ? projectManagedAgentsInvocationEvidence(invocation, options) : null;
    default:
      return projectCapturedChildEvidence(invocation, options, isPlaced);
  }
};

export interface ISemanticHostOutput {
  actorExecutionEvidence: ISemanticActorExecutionEvidence[];
  gitInvocationEvidence: IGitInvocationEvidence;
  actorResourceEvidence: IMoldeaResourceEvidence;
  commandPolicyEvidence: ICodexEvaluationCommandPolicyEvidence;
  response: string;
  usage: {
    cachedInputTokens: number;
    inputTokens: number;
    outputTokens: number;
  } | null;
}

/**
 * Parses one successful JSONL host stream into bounded semantic evidence.
 * @param output Complete host output.
 * @param options Exact CLI envelope identity accepted by the evaluator.
 * @param sessionUsageBeforeRequest The cumulative usage preceding this resumed request.
 * @returns The final response and content-free execution evidence.
 * @throws If the stream, usage counters, command evidence or resource consumption is invalid.
 */
export const parseSemanticEvaluationHostOutput = (
  output: string,
  options: ISemanticActorExecutionEvidenceOptions,
  sessionUsageBeforeRequest: ISemanticHostOutput['usage'] = null,
): ISemanticHostOutput => {
  const { commandPolicy, usage } = projectCodexEvaluationExecutionEvidence(
    output,
    sessionUsageBeforeRequest,
  );
  const nativeCommands: Array<{ event: unknown; command: unknown }> = [];
  const actorExecutionEvidence: ISemanticActorExecutionEvidence[] = [];
  let hasOperationalFailureEvent = false;
  let gitCaptureFailureCount = 0;
  let blockedGitInvocationCount = 0;
  let response: string | null = null;
  let gitInvocationEvidence: IGitInvocationEvidence | null = null;
  let capture: ICliInvocationEvent | null = null;
  const hostEvents: unknown[] = [];

  for (const line of output.split('\n')) {
    if (line.trim() === '') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch (error) {
      throw new Error('The Codex evaluation host returned malformed JSONL output.', {
        cause: error,
      });
    }
    const event = HostEventSchema.parse(parsed);
    hostEvents.push(parsed);
    const invocationFailure = GitCaptureCommandSchema.safeParse(parsed);
    if (invocationFailure.success) {
      nativeCommands.push({ event: parsed, command: invocationFailure.data.item['command'] });
      const output = invocationFailure.data.item.aggregated_output;
      gitCaptureFailureCount += [
        ...output.matchAll(/(?:^|\n)MOLDEA_GIT_CAPTURE_FAILED(?=\r?\n|$)/gu),
      ].length;
      if (/(?:^|\n)MOLDEA_CLI_CAPTURE_FAILED(?:\r?\n|$)/u.test(output))
        throw new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.EvidenceIntegrity,
          'CLI invocation evidence is incomplete.',
        );
    }
    if (event.type === 'moldea.git-invocations') {
      if (gitInvocationEvidence !== null) throw new Error('Git invocation capture is duplicated.');
      const gitCapture = GitInvocationEventSchema.parse(parsed);
      gitInvocationEvidence = gitCapture.evidence;
      blockedGitInvocationCount = gitCapture.blockedInvocationCount ?? 0;
    }
    if (event.type === 'moldea.cli-invocations') {
      if (capture !== null) throw new Error('CLI invocation capture is duplicated.');
      capture = CliInvocationEventSchema.parse(parsed);
    }
    if (event.type === 'error' || event.type === 'turn.failed') {
      hasOperationalFailureEvent = true;
    }
    const messageEvent = AgentMessageEventSchema.safeParse(event);
    if (messageEvent.success) response = messageEvent.data.item.text;
  }
  if (gitCaptureFailureCount > blockedGitInvocationCount)
    throw new CodexEvaluationHostError(
      CODEX_EVALUATION_HOST_FAILURE_KINDS.EvidenceIntegrity,
      'Git invocation evidence is incomplete.',
    );
  const correspondingInvocations = correlateToolInvocations(
    nativeCommands.map(({ command }) => command),
    capture?.invocations ?? [],
    { commandInstances: capture?.commandInstances ?? [], events: hostEvents },
  );
  const placedInvocations = new Set(correspondingInvocations.flatMap((group) => group ?? []));
  for (const [index, { event }] of nativeCommands.entries()) {
    const group = correspondingInvocations[index] ?? [];
    const hasCapturedHelper = group.some(
      ({ entrypoint }) =>
        entrypoint === 'managed-readme' ||
        entrypoint === 'relevance-gate' ||
        entrypoint === 'repair-git',
    );
    const executionEvidence = projectActorExecutionEvidenceEvent(
      event,
      options,
      false,
      false,
      !hasCapturedHelper,
    );
    if (executionEvidence !== null) {
      actorExecutionEvidence.push(executionEvidence);
    }
    for (const invocation of group) {
      const child = projectCapturedInvocation(invocation, options, true);
      if (child !== null) actorExecutionEvidence.push(child);
    }
    if (!hasValidActorExecutionEvidence(actorExecutionEvidence, options))
      throw new Error('Codex actor execution evidence exceeded its item limit.');
  }
  actorExecutionEvidence.push(
    ...(capture?.invocations ?? [])
      .filter((invocation) => !placedInvocations.has(invocation))
      .flatMap((invocation) => {
        const child = projectCapturedInvocation(invocation, options, false);
        return child === null ? [] : [child];
      }),
  );
  if (!hasValidActorExecutionEvidence(actorExecutionEvidence, options))
    throw new Error('Codex actor execution evidence exceeded its item limit.');

  if (response === null || response.trim() === '') {
    if (hasOperationalFailureEvent) {
      throw new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
        'The Codex evaluation host reported an operational failure.',
      );
    }
    throw new Error('The Codex evaluation host did not return a final agent message event.');
  }

  if (gitInvocationEvidence === null) throw new Error('Git invocation capture is missing.');
  if (capture === null) throw new Error('CLI invocation capture is missing.');
  return {
    actorExecutionEvidence,
    gitInvocationEvidence,
    actorResourceEvidence: createMoldeaResourceEvidence(actorExecutionEvidence, options),
    commandPolicyEvidence: commandPolicy,
    response,
    usage,
  };
};
