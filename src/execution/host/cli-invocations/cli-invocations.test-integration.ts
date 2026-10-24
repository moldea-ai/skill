// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, vi } from 'vitest';

import { readReleaseIdentity } from '../../../release/index.ts';
import {
  hasValidSemanticCycles,
  parseSemanticEvaluationHostOutput,
} from '../../../semantic/execution/index.ts';

import { buildCodexEvaluationBwrapArguments, prepareCodexEvaluationHome } from '../host.ts';
import { prepareGitCommandPolicyBoundary } from '../git-command-policy-boundary.ts';
import { readCliInvocations } from './cli-invocations.ts';

const { cliVersion } = readReleaseIdentity(process.cwd());

test('overlapping launcher intervals retain calls but cannot prove canonical chronology', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-cli-overlap-'));
  try {
    const path = join(root, 'capture.jsonl');
    const first = randomUUID();
    const second = randomUUID();
    const args = ['--repository', '/mnt', '--', 'validate', '--json'];
    const records = [
      { kind: 'start', id: first, arguments: args, canonicalBefore: 'a'.repeat(64) },
      { kind: 'start', id: second, arguments: args, canonicalBefore: 'b'.repeat(64) },
      {
        kind: 'exit',
        id: first,
        exitCode: 0,
        outputByteCount: 0,
        stdout: '',
        canonicalAfter: 'b'.repeat(64),
      },
      {
        kind: 'exit',
        id: second,
        exitCode: 0,
        outputByteCount: 0,
        stdout: '',
        canonicalAfter: 'b'.repeat(64),
      },
    ];
    await writeFile(path, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
    const captured = await readCliInvocations(path);
    expect(captured).toHaveLength(2);
    expect(
      captured.every(
        (invocation) => invocation.canonicalBefore === null && invocation.canonicalAfter === null,
      ),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Node startup records direct and wrapped launchers, early failures and filtered output without model calls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-cli-capture-'));
  const repository = join(root, 'repository');
  const home = join(root, 'home');
  const log = join(home, 'cli-invocations.jsonl');
  try {
    await mkdir(join(root, 'source-home'));
    vi.stubEnv('CODEX_HOME', join(root, 'source-home'));
    await prepareCodexEvaluationHome(home);
    await prepareGitCommandPolicyBoundary(join(home, 'bin'), {
      trustedReadOnlyWorkspacePaths: ['.agents', 'node_modules'],
      realGitExecutable: '/opt/moldea-real-git/git',
      invocationLogPath: '/home/evaluator/git-invocations.jsonl',
    });
    for (const path of ['.agents/skills/moldea/scripts', 'node_modules', 'moldea', 'src'])
      await mkdir(join(repository, path), { recursive: true });
    for (const filename of ['moldea-cli.mjs', 'repository-files.mjs', 'repository-package.mjs'])
      await copyFile(
        join(process.cwd(), 'moldea/scripts', filename),
        join(repository, '.agents/skills/moldea/scripts', filename),
      );
    await writeFile(
      join(repository, 'package.json'),
      JSON.stringify({
        name: 'capture-fixture',
        private: true,
        type: 'module',
        devDependencies: { '@moldea.ai/cli': cliVersion },
      }),
    );
    await writeFile(join(repository, '.gitignore'), '.agents/\nnode_modules/\n');
    await writeFile(
      join(repository, 'moldea/project.md'),
      '# Status service\nThis project reports status for operators.\n',
    );
    await writeFile(
      join(repository, 'moldea/moldea.yaml'),
      'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/status.js\n',
    );
    await writeFile(join(repository, 'src/status.js'), 'export const status = "available";\n');
    execFileSync('/usr/bin/git', ['init', '--quiet'], { cwd: repository });
    const launcher = '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs';
    const args = [
      launcher,
      '--repository',
      '/mnt/.',
      '--',
      'validate',
      '--json',
      '--max-output-bytes',
      '65536',
    ];
    const run = async (command: string[], installed = true) => {
      await writeFile(log, '');
      const result = spawnSync(
        'bwrap',
        buildCodexEvaluationBwrapArguments({
          command: ['codex', ...command],
          cwd: repository,
          sandboxHome: home,
          hostExecutable: process.execPath,
          nodeExecutable: process.execPath,
          readOnlyMounts: installed
            ? [{ source: join(process.cwd(), 'node_modules'), target: '/mnt/node_modules' }]
            : [],
        }),
        { encoding: 'utf8', timeout: 20_000 },
      );
      if (result.error) throw result.error;
      return { result, invocations: await readCliInvocations(log) };
    };
    for (const form of [
      'direct',
      'spawnSync',
      'spawnSync-twice',
      'execFileSync',
      'execSync-filtered',
      'smaller-page',
    ] as const) {
      const callCount = form === 'spawnSync-twice' ? 2 : 1;
      const script =
        form === 'spawnSync' || form === 'spawnSync-twice'
          ? `for (let i=0;i<${callCount};i++) { const c = require('node:child_process').spawnSync(process.execPath, ${JSON.stringify(args)}, {stdio:'inherit'}); process.exitCode=c.status ?? 1; }`
          : form === 'execFileSync'
            ? `require('node:child_process').execFileSync(process.execPath, ${JSON.stringify(args)}, {stdio:'inherit'});`
            : `require('node:child_process').execSync(${JSON.stringify(`/opt/node ${args.join(' ')} >/dev/null`)});`;
      const invocationArgs = form === 'smaller-page' ? [...args.slice(0, -1), '4096'] : args;
      const { result, invocations } = await run(
        form === 'direct' || form === 'smaller-page' ? invocationArgs : ['-e', script],
      );
      expect(result.status, result.stderr + result.stdout).toBe(0);
      expect(invocations).toHaveLength(callCount);
      expect(invocations[0]).toMatchObject({ arguments: invocationArgs.slice(1), exitCode: 0 });
      const stream = [
        {
          type: 'item.completed',
          item: {
            type: 'command_execution',
            command:
              form === 'direct' || form === 'smaller-page'
                ? `/opt/node ${invocationArgs.join(' ')}`
                : 'node -e "wrapped call"',
            aggregated_output: result.stdout,
            exit_code: 0,
            status: 'completed',
          },
        },
        { type: 'item.completed', item: { type: 'agent_message', text: 'Validation complete.' } },
        {
          type: 'moldea.git-invocations',
          evidence: {
            invocationCount: 0,
            hostInvocationCount: 0,
            repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
          },
        },
        { type: 'moldea.cli-invocations', invocations },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n');
      const parsed = parseSemanticEvaluationHostOutput(stream, {
        cliVersion,
        jsonSchemaVersion: 7,
      });
      expect(
        hasValidSemanticCycles(
          [
            {
              ...parsed,
              requestIndex: 0,
              developerRequest: 'Check the repository.',
              isMountIntegrityPassing: true,
              isRepositoryControlPassing: true,
              workspaceChanges: { created: [], modified: [], deleted: [] },
            },
          ],
          { cliVersion, jsonSchemaVersion: 7 },
        ),
      ).toBe(true);
      expect(parsed.actorResourceEvidence.commandCount).toBe(callCount);
      expect(parsed.commandPolicyEvidence.moldeaCommandCount).toBe(callCount);
      expect(parsed.commandPolicyEvidence.completedCommandCount).toBe(1);
      expect(
        parsed.actorExecutionEvidence
          .flatMap(({ item }) => item.outputEvidence.facts)
          .filter((fact) => fact.kind === 'moldea-cli-envelope'),
      ).toMatchObject(
        Array.from({ length: callCount }, () => ({
          command: 'validate',
          status: 'valid',
          errorCount: 0,
        })),
      );
      if (form === 'execSync-filtered')
        expect(parsed.commandPolicyEvidence.moldeaOutputByteCount).toBeGreaterThan(
          parsed.commandPolicyEvidence.modelVisibleToolOutputByteCount,
        );
      expect(JSON.stringify(parsed)).not.toContain('Status service');
    }
    const failed = await run(
      [launcher, '--repository', '/mnt', '--', 'composition', '--json'],
      false,
    );
    expect(failed.result.status).not.toBe(0);
    expect(failed.invocations).toHaveLength(1);
    expect(failed.invocations[0]).toMatchObject({
      arguments: ['--repository', '/mnt', '--', 'composition', '--json'],
      exitCode: failed.result.status,
    });
    expect(failed.invocations[0]?.stdout).toBe('');
    const projectFailedAttempt = (
      commandArguments: string[],
      attempt: Awaited<ReturnType<typeof run>>,
    ) =>
      parseSemanticEvaluationHostOutput(
        [
          {
            type: 'item.completed',
            item: {
              type: 'command_execution',
              command: `/opt/node ${commandArguments.join(' ')}`,
              aggregated_output: attempt.result.stdout + attempt.result.stderr,
              exit_code: attempt.result.status,
              status: 'failed',
            },
          },
          {
            type: 'item.completed',
            item: { type: 'agent_message', text: 'The launcher closure is unavailable.' },
          },
          {
            type: 'moldea.git-invocations',
            evidence: {
              invocationCount: 0,
              hostInvocationCount: 0,
              repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
            },
          },
          { type: 'moldea.cli-invocations', invocations: attempt.invocations },
        ]
          .map((event) => JSON.stringify(event))
          .join('\n'),
        { cliVersion, jsonSchemaVersion: 7 },
      );
    const failedComposition = projectFailedAttempt(
      [launcher, '--repository', '/mnt', '--', 'composition', '--json'],
      failed,
    );
    const attempts = failedComposition.actorExecutionEvidence.filter(
      ({ item }) => item.commandKind === 'moldea',
    );
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.item).toMatchObject({
      status: 'failed',
      outputEvidence: { facts: [] },
    });
    expect(failedComposition.commandPolicyEvidence.moldeaEvents).toContainEqual({
      kind: 'command',
      operation: 'composition',
      ownership: 'cli',
      outputByteCount: Buffer.byteLength(failed.result.stdout + failed.result.stderr),
    });
    const validationArgs = [
      launcher,
      '--repository',
      '/mnt',
      '--',
      'validate',
      '--json',
      '--max-output-bytes',
      '65536',
    ];
    const failedValidation = await run(validationArgs, false);
    expect(failedValidation.result.status).not.toBe(0);
    expect(failedValidation.invocations).toHaveLength(1);
    const validationEvidence = projectFailedAttempt(validationArgs, failedValidation);
    expect(
      validationEvidence.actorExecutionEvidence.filter(({ item }) => item.commandKind === 'moldea'),
    ).toHaveLength(1);
    expect(validationEvidence.commandPolicyEvidence.moldeaEvents).toContainEqual({
      kind: 'command',
      operation: 'validate',
      ownership: 'cli',
      outputByteCount: Buffer.byteLength(
        failedValidation.result.stdout + failedValidation.result.stderr,
      ),
    });
    expect(
      validationEvidence.commandPolicyEvidence.moldeaEvents.some(
        (event) => event.kind === 'command' && event.operation === 'composition',
      ),
    ).toBe(false);
    for (const method of ['spawnSync', 'execFileSync'] as const) {
      const compositionArgs = [launcher, '--repository', '/mnt', '--', 'composition', '--json'];
      const wrappedFailure = await run(
        [
          '-e',
          `const cp = require('node:child_process'); try { const result = cp.${method}(process.execPath, ${JSON.stringify(compositionArgs)}, {stdio:'pipe'}); process.exitCode = result.status ?? 0; } catch (error) { process.exitCode = error.status ?? 1; }`,
        ],
        false,
      );
      expect(wrappedFailure.result.status).not.toBe(0);
      expect(wrappedFailure.invocations).toHaveLength(1);
      expect(wrappedFailure.invocations[0]).toMatchObject({
        arguments: compositionArgs.slice(1),
        stdout: '',
      });
      expect(wrappedFailure.invocations[0]?.exitCode).not.toBe(0);
    }
    await rm(join(repository, '.agents/skills/moldea/scripts/moldea-cli.mjs'));
    const missingEntry = await run(args);
    expect(missingEntry.result.status).not.toBe(0);
    expect(missingEntry.invocations).toHaveLength(1);
    const ordinary = await run(['-e', 'console.log("ordinary Node script")']);
    expect(ordinary.result.status).toBe(0);
    expect(ordinary.invocations).toStrictEqual([]);
    expect(await readFile(log, 'utf8')).toBe('');
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});

test.each([
  'unfinished',
  'duplicate-start',
  'duplicate-exit',
  'exit-before-start',
  'wrong-bytes',
  'partial-line',
] as const)(
  'CLI capture rejects %s instead of granting empty or duplicate credit',
  async (scenario) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-cli-record-'));
    try {
      const id = '11111111-1111-4111-8111-111111111111';
      const start = {
        kind: 'start',
        id,
        arguments: [
          '--repository',
          '/mnt',
          '--',
          'validate',
          '--json',
          '--max-output-bytes',
          '65536',
        ],
      };
      const exit = { kind: 'exit', id, exitCode: 0, outputByteCount: 2, stdout: '{}' };
      const records =
        scenario === 'unfinished'
          ? [start]
          : scenario === 'duplicate-start'
            ? [start, start, exit]
            : scenario === 'duplicate-exit'
              ? [start, exit, exit]
              : scenario === 'exit-before-start'
                ? [exit, start]
                : scenario === 'wrong-bytes'
                  ? [start, { ...exit, outputByteCount: 0 }]
                  : [start, exit];
      const log = join(root, 'capture.jsonl');
      await writeFile(
        log,
        records.map((record) => JSON.stringify(record)).join('\n') +
          (scenario === 'partial-line' ? '' : '\n'),
      );
      await expect(readCliInvocations(log)).rejects.toThrow();
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  },
);
