import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import {
  identifyCodexEvaluationHost,
  prepareCodexEvaluationHome,
  runCodexEvaluationHost,
  type ICodexEvaluationWorkspaceAccess,
} from '../../../tooling/codex-evaluation-host/index.mjs';

import {
  ModelUsageSchema,
  type IActorOutput,
  type IJudgeOutput,
  type IModelUsage,
} from '../contracts/index.ts';
import { writeJsonFileAtomically } from '../filesystem/index.ts';
import type {
  IActorExecutionInput,
  ICodexHost,
  ICodexRoleExecutionInput,
  ICodexRoleExecutionResult,
  IJudgeExecutionInput,
} from './types.ts';
import { createCodexExecCommand } from './utilities.ts';

const SANDBOX_OUTPUT_PATH = '/home/evaluator/output.json';
const SANDBOX_SCHEMA_PATH = '/home/evaluator/output.schema.json';

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
  /** Returns the exact local Codex CLI version used for checkpoint identity. */
  public async getVersion(): Promise<string> {
    return Promise.resolve(
      identifyCodexEvaluationHost(
        createCodexExecCommand({
          outputPath: SANDBOX_OUTPUT_PATH,
          schemaPath: SANDBOX_SCHEMA_PATH,
        }),
      ).version,
    );
  }

  /** Executes one actor in its writable isolated project workspace. */
  public runActor(input: IActorExecutionInput): Promise<ICodexRoleExecutionResult<IActorOutput>> {
    return this.__runRole('actor', input, 'read-write');
  }

  /** Executes one judge in an independent read-only project workspace. */
  public runJudge(input: IJudgeExecutionInput): Promise<ICodexRoleExecutionResult<IJudgeOutput>> {
    return this.__runRole('judge', input, 'read-only');
  }

  private async __runRole<TResult>(
    role: 'actor' | 'judge',
    input: ICodexRoleExecutionInput<TResult>,
    workspaceAccess: ICodexEvaluationWorkspaceAccess,
  ): Promise<ICodexRoleExecutionResult<TResult>> {
    const executionPrefix = path.join(os.tmpdir(), `moldea-qualification-${role}-`);
    const executionRoot = await mkdtemp(executionPrefix);

    if (!executionRoot.startsWith(executionPrefix)) {
      throw new Error('Qualification host created a path outside its temporary prefix.');
    }

    const sandboxHome = path.join(executionRoot, 'home');
    const outputPath = path.join(sandboxHome, 'output.json');
    const schemaPath = path.join(sandboxHome, 'output.schema.json');

    try {
      await prepareCodexEvaluationHome(sandboxHome);
      await writeJsonFileAtomically(schemaPath, z.toJSONSchema(input.schema));
      const command = createCodexExecCommand({
        outputPath: SANDBOX_OUTPUT_PATH,
        schemaPath: SANDBOX_SCHEMA_PATH,
      });
      const startedAt = performance.now();
      const events = await runCodexEvaluationHost({
        command,
        cwd: input.workspaceDirectory,
        includeWorkspaceBinaryDirectory: role === 'actor',
        prompt: input.prompt,
        sandboxHome,
        ...(input.signal === undefined ? {} : { signal: input.signal }),
        workspaceAccess,
      });
      const output = input.schema.parse(JSON.parse(await readFile(outputPath, 'utf8')) as unknown);

      return {
        output,
        usage: extractLatestUsage(events),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        events,
      };
    } finally {
      await rm(executionRoot, { force: true, recursive: true });
    }
  }
}
