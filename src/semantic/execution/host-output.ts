import { z } from 'zod';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
  projectCodexEvaluationExecutionEvidence,
  GitInvocationEventSchema,
  CliInvocationEventSchema,
  type IGitInvocationEvidence,
  type ICodexEvaluationCommandPolicyEvidence,
} from '../../execution/host/index.ts';
import {
  createMoldeaResourceEvidence,
  hasValidActorExecutionEvidence,
  projectActorExecutionEvidenceEvent,
  projectCliInvocationEvidence,
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
  const actorExecutionEvidence: ISemanticActorExecutionEvidence[] = [];
  let hasOperationalFailureEvent = false;
  let response: string | null = null;
  let gitInvocationEvidence: IGitInvocationEvidence | null = null;
  let hasCliCapture = false;

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
    const invocationFailure = GitCaptureCommandSchema.safeParse(parsed);
    if (
      invocationFailure.success &&
      /(?:^|\n)MOLDEA_(?:GIT|CLI)_CAPTURE_FAILED(?:\r?\n|$)/u.test(
        invocationFailure.data.item.aggregated_output,
      )
    )
      throw new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
        'Invocation capture failed during actor execution.',
      );
    if (event.type === 'moldea.git-invocations') {
      if (gitInvocationEvidence !== null) throw new Error('Git invocation capture is duplicated.');
      gitInvocationEvidence = GitInvocationEventSchema.parse(parsed).evidence;
    }
    if (event.type === 'moldea.cli-invocations') {
      if (hasCliCapture) throw new Error('CLI invocation capture is duplicated.');
      hasCliCapture = true;
      actorExecutionEvidence.push(
        ...CliInvocationEventSchema.parse(parsed).invocations.map((invocation) =>
          projectCliInvocationEvidence(invocation, options),
        ),
      );
      if (!hasValidActorExecutionEvidence(actorExecutionEvidence, options))
        throw new Error('Codex actor execution evidence exceeded its item limit.');
    }
    if (event.type === 'error' || event.type === 'turn.failed') {
      hasOperationalFailureEvent = true;
    }
    const messageEvent = AgentMessageEventSchema.safeParse(event);
    if (messageEvent.success) response = messageEvent.data.item.text;

    const executionEvidence = projectActorExecutionEvidenceEvent(event, options, false);
    if (executionEvidence !== null) {
      actorExecutionEvidence.push(executionEvidence);
      if (!hasValidActorExecutionEvidence(actorExecutionEvidence, options)) {
        throw new Error('Codex actor execution evidence exceeded its item limit.');
      }
    }
  }

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
  if (!hasCliCapture) throw new Error('CLI invocation capture is missing.');
  return {
    actorExecutionEvidence,
    gitInvocationEvidence,
    actorResourceEvidence: createMoldeaResourceEvidence(actorExecutionEvidence, options),
    commandPolicyEvidence: commandPolicy,
    response,
    usage,
  };
};
