import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import {
  ModelUsageSchema,
  type IActorOutput,
  type IJudgeOutput,
  type IModelUsage,
} from '../contracts/index.ts';
import { executeProcess } from '../process/index.ts';
import { writeJsonFileAtomically } from '../filesystem/index.ts';
import type {
  IActorExecutionInput,
  ICodexHost,
  ICodexRoleExecutionInput,
  ICodexRoleExecutionResult,
  IJudgeExecutionInput,
} from './types.ts';
import { createCodexExecArgs } from './utilities.ts';

const extractUsageCandidate = (candidate: unknown): IModelUsage | null => {
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const record = candidate as Readonly<Record<string, unknown>>;
  const usageResult = ModelUsageSchema.safeParse({
    inputTokens: record['input_tokens'] ?? record['inputTokens'],
    cachedInputTokens: record['cached_input_tokens'] ?? record['cachedInputTokens'] ?? 0,
    outputTokens: record['output_tokens'] ?? record['outputTokens'],
  });

  if (usageResult.success) {
    return usageResult.data;
  }

  for (const nestedValue of Object.values(record)) {
    const nestedUsage = extractUsageCandidate(nestedValue);

    if (nestedUsage !== null) {
      return nestedUsage;
    }
  }

  return null;
};

const extractLatestUsage = (events: string): IModelUsage | null => {
  let latestUsage: IModelUsage | null = null;

  for (const eventLine of events.split('\n')) {
    if (eventLine.trim() === '') {
      continue;
    }

    try {
      const usage = extractUsageCandidate(JSON.parse(eventLine) as unknown);

      if (usage !== null) {
        latestUsage = usage;
      }
    } catch {
      continue;
    }
  }

  return latestUsage;
};

/** Production Codex CLI host fixed to the Terra floor and structured-output protocol. */
export class CodexCliHost implements ICodexHost {
  public async getVersion(): Promise<string> {
    const result = await executeProcess({
      command: 'codex',
      args: ['--version'],
      cwd: process.cwd(),
    });

    return result.stdout.trim();
  }

  public runActor(input: IActorExecutionInput): Promise<ICodexRoleExecutionResult<IActorOutput>> {
    return this.__runRole('actor', input, 'workspace-write');
  }

  public runJudge(input: IJudgeExecutionInput): Promise<ICodexRoleExecutionResult<IJudgeOutput>> {
    return this.__runRole('judge', input, 'read-only');
  }

  private async __runRole<TResult>(
    role: 'actor' | 'judge',
    input: ICodexRoleExecutionInput<TResult>,
    sandbox: 'read-only' | 'workspace-write',
  ): Promise<ICodexRoleExecutionResult<TResult>> {
    const outputPath = path.join(input.artifactDirectory, `${role}-output.json`);
    const schemaPath = path.join(input.artifactDirectory, `${role}-output.schema.json`);
    await writeJsonFileAtomically(schemaPath, z.toJSONSchema(input.schema));
    const execution = await executeProcess({
      command: 'codex',
      args: createCodexExecArgs({
        outputPath,
        sandbox,
        schemaPath,
        workspaceDirectory: input.workspaceDirectory,
      }),
      cwd: input.workspaceDirectory,
      environment: input.environment,
      input: input.prompt,
      signal: input.signal,
    });
    const output = input.schema.parse(JSON.parse(await readFile(outputPath, 'utf8')) as unknown);

    return {
      output,
      usage: extractLatestUsage(execution.stdout),
      durationMs: execution.durationMs,
      events: execution.stdout,
    };
  }
}
