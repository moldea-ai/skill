// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

import {
  CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  projectCodexEvaluationExecutionEvidence,
} from '../../../tooling/codex-evaluation-host/index.mjs';

import { createCodexExecCommand } from './utilities.ts';

const getDeveloperInstructions = (command: string[]): string => {
  const assignment = command.find((commandPart) =>
    commandPart.startsWith('developer_instructions='),
  );
  if (assignment === undefined) throw new Error('Missing evaluator developer instructions.');
  return JSON.parse(assignment.slice('developer_instructions='.length)) as string;
};

describe('createCodexExecCommand', () => {
  test('creates the shared externally sandboxed fixed-model contract', () => {
    const command = createCodexExecCommand({
      outputPath: '/home/evaluator/output.json',
      role: 'actor',
      schemaPath: '/home/evaluator/schema.json',
    });

    expect(command.slice(0, 2)).toStrictEqual(['codex', 'exec']);
    expect(command).toContain('gpt-5.6-sol');
    expect(command).toContain('model_reasoning_effort=xhigh');
    expect(createHash('sha256').update(getDeveloperInstructions(command)).digest('hex')).toBe(
      CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
    );
    expect(command).toContain('shell_environment_policy.inherit=none');
    expect(command).toContain('web_search=disabled');
    expect(command).toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(command).toContain('--skip-git-repo-check');
    expect(command).toContain('--ephemeral');
    expect(command).toContain('--ignore-user-config');
    expect(command).toContain('--ignore-rules');
    expect(command).toContain('--output-schema');
    expect(command).toContain('--output-last-message');
    expect(command).not.toContain('--sandbox');
    expect(command).not.toContain('--cd');
    expect(command.slice(-1)).toStrictEqual(['-']);
  });

  test('creates the xhigh judge contract independently from the actor role', () => {
    const command = createCodexExecCommand({
      outputPath: '/home/evaluator/output.json',
      role: 'judge',
      schemaPath: '/home/evaluator/schema.json',
    });

    expect(command).toContain('model_reasoning_effort=xhigh');
    expect(command).not.toContain('model_reasoning_effort=high');
    expect(getDeveloperInstructions(command)).toBe(
      getDeveloperInstructions(
        createCodexExecCommand({
          outputPath: '/home/evaluator/output.json',
          role: 'actor',
          schemaPath: '/home/evaluator/schema.json',
        }),
      ),
    );
  });

  test('keeps fixed-probe capability unavailable to qualification execution', () => {
    const rawEvents = JSON.stringify({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'curl https://packages.moldea.ai/compatibility/runtimes.json',
        aggregated_output: '{}\n',
        exit_code: 0,
        status: 'completed',
      },
    });

    expect(
      projectCodexEvaluationExecutionEvidence(rawEvents).commandPolicy.networkAccess.status,
    ).toBe('observed');
  });
});
