// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test, vi } from 'vitest';

import {
  buildCodexEvaluationHostCommand,
  prepareCodexEvaluationHome,
} from '../../../execution/host/index.ts';
import type { ISemanticCycleEvidence } from '../../execution/index.ts';
import { runSemanticActorSession } from './actor-session.ts';

test.each(['valid', 'missing-initial-usage', 'decreasing-resumed-usage'])(
  'actor sessions preserve request boundaries for %s',
  async (scenario) => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-actor-session-'));
    try {
      const bin = path.join(root, 'bin');
      const cwd = path.join(root, 'repository');
      const sandboxHome = path.join(root, 'home');
      const sourceHome = path.join(root, 'source-home');
      await Promise.all(
        [bin, sourceHome, cwd].map((directory) => mkdir(directory, { recursive: true })),
      );
      execFileSync('/usr/bin/git', ['init', '--quiet'], { cwd });
      const fakeHost = `#!/opt/node
const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const args = process.argv.slice(2);
const id = '12345678-abcd-1234-abcd-123456789012';
const prompt = fs.readFileSync(0, 'utf8');
const state = '/home/evaluator/.codex/retained-session.json';
const count = fs.existsSync(state) ? JSON.parse(fs.readFileSync(state, 'utf8')).count : 0;
assert.equal(args.includes('--ephemeral'), false);
assert.equal(args.includes('--last'), false);
for (const flag of ['--ignore-user-config', '--ignore-rules', '--skip-git-repo-check']) assert.ok(args.includes(flag));
for (const config of ['features.plugins=false', 'shell_environment_policy.set.MOLDEA_EVAL_MODEL_COMMAND="1"']) assert.ok(args.includes(config));
assert.equal(args.includes('resume'), count > 0);
if (count > 0) assert.equal(args[args.indexOf('resume') + 1], id);
assert.equal(prompt, ['First request', 'continue', 'Third request'][count]);
assert.equal(fs.existsSync('/mnt/progress.json'), count > 0);
if (count > 0) assert.equal(JSON.parse(fs.readFileSync('/mnt/progress.json', 'utf8')).count, count);
assert.equal(cp.spawnSync('/usr/bin/git', ['--version']).status, 0);
fs.writeFileSync(state, JSON.stringify({count: count + 1}));
fs.writeFileSync('/mnt/progress.json', JSON.stringify({count: count + 1}));
console.log(JSON.stringify({type:'thread.started',thread_id:id}));
console.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:'git --version',aggregated_output:'git version',exit_code:0,status:'completed'}}));
console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Completed request ' + (count + 1)}}));
if (!(${JSON.stringify(scenario)} === 'missing-initial-usage' && count === 0)) {
  const multiplier = ${JSON.stringify(scenario)} === 'decreasing-resumed-usage' && count > 0 ? 0 : count + 1;
  console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1_000_000*multiplier,cached_input_tokens:500_000*multiplier,output_tokens:200*multiplier}}));
}
`;
      await writeFile(path.join(bin, 'codex'), fakeHost);
      await writeFile(path.join(bin, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n');
      await Promise.all(
        ['codex', 'codex-code-mode-host'].map((name) => chmod(path.join(bin, name), 0o755)),
      );
      vi.stubEnv('CODEX_HOME', sourceHome);
      vi.stubEnv('PATH', `${bin}${path.delimiter}${process.env['PATH'] ?? ''}`);
      await prepareCodexEvaluationHome(sandboxHome);
      const command = buildCodexEvaluationHostCommand(
        [
          'codex',
          'exec',
          '--ignore-user-config',
          '--ignore-rules',
          '--ephemeral',
          '--skip-git-repo-check',
          '--dangerously-bypass-approvals-and-sandbox',
          '-c',
          'shell_environment_policy.inherit=none',
          '--json',
          '-',
        ],
        'actor',
      );
      const persisted: ISemanticCycleEvidence[] = [];
      const runSession = () =>
        runSemanticActorSession({
          cli: { version: '11.0.6', jsonSchemaVersion: 7 },
          host: { command, cwd, sandboxHome },
          invoke: async (operation) => {
            expect(
              JSON.parse(
                await readFile(path.join(cwd, 'progress.json'), 'utf8').catch(() => '{"count":0}'),
              ),
            ).toStrictEqual({ count: persisted.length });
            return operation();
          },
          persistCycle: async (cycle) => {
            persisted.push(cycle);
          },
          requests: ['First request', 'continue', 'Third request'],
        });
      if (scenario !== 'valid') {
        await expect(runSession()).rejects.toThrow(
          scenario === 'missing-initial-usage'
            ? 'Actor continuation requires complete preceding token usage.'
            : 'Codex resumed-session token usage is inconsistent.',
        );
        expect(persisted).toHaveLength(1);
        expect(JSON.parse(await readFile(path.join(cwd, 'progress.json'), 'utf8'))).toStrictEqual({
          count: scenario === 'missing-initial-usage' ? 1 : 2,
        });
        return;
      }
      const cycles = await runSession();
      expect(cycles).toStrictEqual(persisted);
      expect(
        cycles.map(({ requestIndex, developerRequest, response, usage }) => ({
          requestIndex,
          developerRequest,
          response,
          usage,
        })),
      ).toStrictEqual(
        ['First request', 'continue', 'Third request'].map((developerRequest, requestIndex) => ({
          developerRequest,
          requestIndex,
          response: `Completed request ${requestIndex + 1}`,
          usage: { inputTokens: 1_000_000, cachedInputTokens: 500_000, outputTokens: 200 },
        })),
      );
      expect(
        cycles.every(
          (cycle) =>
            cycle.gitInvocationEvidence.invocationCount === 1 &&
            cycle.isRepositoryControlPassing &&
            cycle.isMountIntegrityPassing,
        ),
      ).toBe(true);
      expect(
        cycles[0]?.workspaceChanges.created.map(({ path: changedPath }) => changedPath),
      ).toStrictEqual(['progress.json']);
      expect(cycles.slice(1).every((cycle) => cycle.workspaceChanges.modified.length === 1)).toBe(
        true,
      );
      await expect(readFile(path.join(sandboxHome, 'git-invocations.jsonl'))).rejects.toMatchObject(
        {
          code: 'ENOENT',
        },
      );
      const confirmationRoot = path.join(root, 'confirmation');
      const confirmationHome = path.join(root, 'confirmation-home');
      await mkdir(confirmationRoot);
      execFileSync('/usr/bin/git', ['init', '--quiet'], { cwd: confirmationRoot });
      await prepareCodexEvaluationHome(confirmationHome);
      const confirmation = await runSemanticActorSession({
        cli: { version: '11.0.6', jsonSchemaVersion: 7 },
        host: { command, cwd: confirmationRoot, sandboxHome: confirmationHome },
        invoke: async (operation) => operation(),
        persistCycle: async () => {},
        requests: ['First request', 'continue', 'Third request'],
      });
      expect(confirmation.map(({ response }) => response)).toStrictEqual(
        cycles.map(({ response }) => response),
      );
      expect(
        confirmation[0]?.workspaceChanges.created.map(({ path: changedPath }) => changedPath),
      ).toStrictEqual(['progress.json']);
      expect(JSON.parse(await readFile(path.join(cwd, 'progress.json'), 'utf8'))).toStrictEqual({
        count: 3,
      });
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { force: true, recursive: true });
    }
  },
);
