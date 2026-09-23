import { z } from 'zod';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
  projectCodexEvaluationExecutionEvidence,
  type ICodexEvaluationCommandPolicyEvidence,
} from '../../execution/host/index.ts';
import {
  createMoldeaResourceEvidence,
  hasValidActorExecutionEvidence,
  projectActorExecutionEvidenceEvent,
} from './actor-evidence.ts';
import type {
  IMoldeaResourceEvidence,
  ISemanticActorExecutionEvidence,
  ISemanticActorExecutionEvidenceOptions,
} from './types.ts';

const HostEventSchema = z.looseObject({ type: z.string() });
const AgentMessageEventSchema = z.looseObject({
  type: z.literal('item.completed'),
  item: z.looseObject({ type: z.literal('agent_message'), text: z.string() }),
});

export interface ISemanticHostOutput {
  actorExecutionEvidence: ISemanticActorExecutionEvidence[];
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
 * @returns The final response and content-free execution evidence.
 */
export const parseSemanticEvaluationHostOutput = (
  output: string,
  options: ISemanticActorExecutionEvidenceOptions,
): ISemanticHostOutput => {
  const { commandPolicy, usage } = projectCodexEvaluationExecutionEvidence(output);
  const actorExecutionEvidence: ISemanticActorExecutionEvidence[] = [];
  let hasOperationalFailureEvent = false;
  let response: string | null = null;

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
    if (event.type === 'error' || event.type === 'turn.failed') {
      hasOperationalFailureEvent = true;
    }
    const messageEvent = AgentMessageEventSchema.safeParse(event);
    if (messageEvent.success) response = messageEvent.data.item.text;

    const executionEvidence = projectActorExecutionEvidenceEvent(event, options);
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

  return {
    actorExecutionEvidence,
    actorResourceEvidence: createMoldeaResourceEvidence(actorExecutionEvidence, options),
    commandPolicyEvidence: commandPolicy,
    response,
    usage,
  };
};
