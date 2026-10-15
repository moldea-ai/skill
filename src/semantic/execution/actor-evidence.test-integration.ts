// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

import { semanticCase } from '../cases/integration-block-missing-handoff/case.ts';
import { buildSemanticJudgePrompt } from '../judging/index.ts';

import { parseSemanticEvaluationHostOutput } from './host-output.ts';

test('real installed helper print survives host projection and verifies the judge handoff', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-print-evidence-'));
  try {
    const installation = join(root, '.agents', 'skills', 'moldea');
    await mkdir(join(installation, 'scripts'), { recursive: true });
    const source = resolve(import.meta.dirname, '../../../moldea');
    await copyFile(join(source, 'SKILL.md'), join(installation, 'SKILL.md'));
    for (const file of await readdir(join(source, 'scripts'), { withFileTypes: true })) {
      if (file.isFile()) {
        await copyFile(
          join(source, 'scripts', file.name),
          join(installation, 'scripts', file.name),
        );
      }
    }
    const printed = spawnSync(
      process.execPath,
      [join(installation, 'scripts', 'managed-agents.mjs'), '--repository', root, '--print'],
      { encoding: 'utf8' },
    );
    expect(printed.error).toBeUndefined();
    expect(printed.status, printed.stderr).toBe(0);
    const asset = await readFile(join(source, 'assets', 'managed-agents-block.md'), 'utf8');
    expect(printed.stdout).toBe(asset.replaceAll('{{skill-path}}', '.agents/skills/moldea'));
    await expect(lstat(join(root, 'AGENTS.md'))).rejects.toThrow();
    const response = ['Add this block:', '', '```markdown', printed.stdout.trimEnd(), '```'].join(
      '\n',
    );
    const stream = [
      {
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command:
            'node /mnt/.agents/skills/moldea/scripts/managed-agents.mjs --repository /mnt --print',
          aggregated_output: printed.stdout,
          exit_code: printed.status,
          status: 'completed',
        },
      },
      { type: 'item.completed', item: { type: 'agent_message', text: response } },
    ]
      .map((event) => JSON.stringify(event))
      .join('\n');
    const projected = parseSemanticEvaluationHostOutput(stream, {
      cliVersion: '11.0.4',
      jsonSchemaVersion: 7,
    });
    expect(projected.actorExecutionEvidence[0]?.item.outputEvidence.facts).toStrictEqual([
      {
        kind: 'managed-agents-print-result',
        blockSha256: createHash('sha256').update(printed.stdout.trimEnd()).digest('hex'),
      },
    ]);
    expect(projected.actorResourceEvidence.commandCount).toBe(0);
    const prompt = buildSemanticJudgePrompt({
      actorCommandPolicyEvidence: projected.commandPolicyEvidence,
      actorExecutionEvidence: projected.actorExecutionEvidence,
      actorResourceEvidence: projected.actorResourceEvidence,
      actorResponse: projected.response,
      caseDefinition: semanticCase,
      isRepositoryControlPassing: true,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    });
    expect(prompt).toContain('"matchesSuccessfulPrint":true');
    expect(prompt).toContain('"unchanged":true');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
