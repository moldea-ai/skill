import path from 'node:path';

import { z } from 'zod';

import {
  CodexEvaluationHostError,
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  runCodexEvaluationHost,
  type ICodexEvaluationHostRunOptions,
} from '../../../execution/host/index.ts';
import {
  parseSemanticEvaluationHostOutput,
  type ISemanticHostOutput,
  type ISemanticCycleEvidence,
} from '../../execution/index.ts';
import {
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
} from '../../workspace/index.ts';

const SessionEventSchema = z.looseObject({
  type: z.literal('thread.started'),
  thread_id: z.guid(),
});

/**
 * Reads the exact runner-host event, never a session identifier from actor prose.
 * @returns The validated host session UUID.
 * @throws If the host did not identify exactly one valid session.
 */
export const readSemanticActorSessionId = (output: string): string => {
  try {
    const events = output
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line): unknown => JSON.parse(line));
    const sessions = events.filter(
      (event) =>
        typeof event === 'object' &&
        event !== null &&
        'type' in event &&
        event.type === 'thread.started',
    );
    if (sessions.length !== 1) throw new Error('Expected one host session event.');
    return SessionEventSchema.parse(sessions[0]).thread_id;
  } catch (error) {
    throw new CodexEvaluationHostError(
      CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
      'Actor session requires exactly one valid host thread.started UUID.',
      { cause: error },
    );
  }
};

/**
 * Executes authored requests in one workspace and exact session, persisting each cycle before continuing.
 * @returns The ordered completed cycles.
 * @throws If requests are empty, session identity or usage is invalid, or host execution fails.
 */
export const runSemanticActorSession = async (options: {
  host: Omit<ICodexEvaluationHostRunOptions, 'actorSession' | 'prompt' | 'role'>;
  requests: readonly string[];
  cli: { version: string; jsonSchemaVersion: number };
  invoke: (operation: () => Promise<ISemanticHostOutput>) => Promise<ISemanticHostOutput>;
  persistCycle: (cycle: ISemanticCycleEvidence) => Promise<void>;
}): Promise<ISemanticCycleEvidence[]> => {
  if (options.requests.length === 0 || options.requests.some((request) => request.trim() === '')) {
    throw new Error('Actor session requires nonempty authored developer requests.');
  }
  let sessionId: string | null = null;
  let sessionUsageBeforeRequest: ISemanticHostOutput['usage'] = null;
  const cycles: ISemanticCycleEvidence[] = [];
  const integrityPaths = [
    { source: path.join(options.host.cwd, '.git'), isGit: true },
    ...(options.host.readOnlyMounts ?? [])
      .filter(({ target }) => target !== '/home/evaluator/bin')
      .map(({ source }) => ({ source, isGit: false })),
  ];
  for (const [requestIndex, developerRequest] of options.requests.entries()) {
    if (requestIndex > 0 && sessionUsageBeforeRequest === null) {
      throw new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
        'Actor continuation requires complete preceding token usage.',
      );
    }
    const before = await snapshotSemanticWorkspace(options.host.cwd);
    const integrityBefore = await Promise.all(
      integrityPaths.map(({ source }) => snapshotSemanticWorkspace(source)),
    );
    const evidence = await options.invoke(async () => {
      const output = await runCodexEvaluationHost({
        ...options.host,
        ...(options.host.privateTrace === undefined
          ? {}
          : {
              privateTrace: {
                ...options.host.privateTrace,
                invocation: `${options.host.privateTrace.invocation}-r${requestIndex}`,
              },
            }),
        ...(options.requests.length === 1
          ? {}
          : {
              actorSession:
                sessionId === null
                  ? { kind: 'start' as const }
                  : { kind: 'resume' as const, sessionId },
            }),
        prompt: developerRequest,
        role: 'actor',
      });
      if (options.requests.length > 1) {
        const reportedId = readSemanticActorSessionId(output);
        if (sessionId !== null && reportedId !== sessionId)
          throw new CodexEvaluationHostError(
            CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
            'Actor continuation returned a different host session UUID.',
          );
        sessionId = reportedId;
      }
      return parseSemanticEvaluationHostOutput(
        output,
        { cliVersion: options.cli.version, jsonSchemaVersion: options.cli.jsonSchemaVersion },
        sessionUsageBeforeRequest,
      );
    });
    const integrityAfter = await Promise.all(
      integrityPaths.map(({ source }) => snapshotSemanticWorkspace(source)),
    );
    const isUnchanged = (index: number): boolean =>
      JSON.stringify([...(integrityBefore[index] ?? [])]) ===
      JSON.stringify([...(integrityAfter[index] ?? [])]);
    const cycle: ISemanticCycleEvidence = {
      ...evidence,
      developerRequest,
      requestIndex,
      isMountIntegrityPassing: integrityPaths.every(
        ({ isGit }, index) => isGit || isUnchanged(index),
      ),
      isRepositoryControlPassing: isUnchanged(0),
      workspaceChanges: diffSemanticWorkspaceSnapshots(
        before,
        await snapshotSemanticWorkspace(options.host.cwd),
      ),
    };
    await options.persistCycle(cycle);
    cycles.push(cycle);
    if (evidence.usage === null) sessionUsageBeforeRequest = null;
    else if (sessionUsageBeforeRequest === null) sessionUsageBeforeRequest = evidence.usage;
    else {
      sessionUsageBeforeRequest = {
        inputTokens: sessionUsageBeforeRequest.inputTokens + evidence.usage.inputTokens,
        cachedInputTokens:
          sessionUsageBeforeRequest.cachedInputTokens + evidence.usage.cachedInputTokens,
        outputTokens: sessionUsageBeforeRequest.outputTokens + evidence.usage.outputTokens,
      };
    }
  }
  return cycles;
};
