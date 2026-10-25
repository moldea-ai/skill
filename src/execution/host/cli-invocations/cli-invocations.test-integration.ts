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
import { readCliInvocationCapture, readCliInvocations } from './cli-invocations.ts';

const { cliVersion } = readReleaseIdentity(process.cwd());

test('distinct parallel commands retain method provenance without canonical chronology', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-parallel-proof-'));
  try {
    const path = join(root, 'capture.jsonl');
    const ids = [randomUUID(), randomUUID()];
    const commands = [
      [
        'node',
        '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs',
        '--repository',
        '/mnt',
        '--',
        'validate',
        '--json',
        '--max-output-bytes',
        '65536',
      ],
      [
        'node',
        '/mnt/.agents/skills/moldea/scripts/managed-agents.mjs',
        '--repository',
        '/mnt',
        '--print',
      ],
    ];
    const callers = commands.map((command) => ['/bin/bash', '-c', command.join(' ')]);
    const identities = ['101:1', '102:1'];
    const records = [
      ...identities.map((identity, index) => ({
        kind: 'command',
        identity,
        arguments: callers[index],
      })),
      ...ids.map((id, index) => ({
        kind: 'start',
        id,
        arguments: commands[index]!.slice(2),
        entrypoint: index === 0 ? 'cli' : 'managed-agents',
        callers: [callers[index]],
        callerIdentities: [identities[index]],
        canonicalBefore: 'a'.repeat(64),
      })),
      ...ids.map((id) => ({
        kind: 'exit',
        id,
        exitCode: 0,
        outputByteCount: 0,
        stdout: '',
        canonicalAfter: 'a'.repeat(64),
      })),
    ];
    await writeFile(path, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
    const captured = await readCliInvocationCapture(path);
    expect(captured.invocations.map((invocation) => invocation.overlapping)).toStrictEqual([
      true,
      true,
    ]);
    expect(captured.invocations.map((invocation) => invocation.callers)).toStrictEqual(
      callers.map((caller) => [caller]),
    );
    expect(captured.invocations.map((invocation) => invocation.callerIdentities)).toStrictEqual(
      identities.map((identity) => [identity]),
    );
    expect(
      captured.invocations.every(
        (invocation) => invocation.canonicalBefore === null && invocation.canonicalAfter === null,
      ),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

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
    expect(captured.map((invocation) => invocation.callers)).toStrictEqual([[], []]);
    expect(
      captured.every(
        (invocation) => invocation.canonicalBefore === null && invocation.canonicalAfter === null,
      ),
    ).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('overlapping calls retain method provenance but lose only their canonical chronology', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-cli-intervals-'));
  try {
    const path = join(root, 'capture.jsonl');
    const ids = Array.from({ length: 5 }, () => randomUUID());
    const args = ['--repository', '/mnt', '--', 'validate', '--json'];
    const callers = ids.map((_, index) => ['/bin/bash', '-lc', `launcher-${index}`]);
    const identities = ids.map((_, index) => `${100 + index}:1`);
    const starts = ids.map((id, index) => ({
      kind: 'start',
      id,
      arguments: args,
      callers: [callers[index]],
      callerIdentities: [identities[index]],
      canonicalBefore: 'a'.repeat(64),
    }));
    const exits = ids.map((id) => ({
      kind: 'exit',
      id,
      exitCode: 0,
      outputByteCount: 0,
      stdout: '',
      canonicalAfter: 'b'.repeat(64),
    }));
    const records = [
      starts[0],
      exits[0],
      starts[1],
      starts[2],
      exits[1],
      starts[3],
      exits[2],
      exits[3],
      starts[4],
      exits[4],
    ];
    await writeFile(path, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
    const captured = await readCliInvocations(path);
    expect(captured.map((invocation) => invocation.callers)).toStrictEqual(
      callers.map((caller) => [caller]),
    );
    expect(captured.map((invocation) => invocation.callerIdentities)).toStrictEqual(
      identities.map((identity) => [identity]),
    );
    expect(captured.map((invocation) => invocation.canonicalBefore)).toStrictEqual([
      'a'.repeat(64),
      null,
      null,
      null,
      'a'.repeat(64),
    ]);
    expect(captured.map((invocation) => invocation.canonicalAfter)).toStrictEqual([
      'b'.repeat(64),
      null,
      null,
      null,
      'b'.repeat(64),
    ]);
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
          // the fake Codex supervisor launches the same /opt/node used by actual actor commands
          command: [
            'codex',
            '-e',
            `const r=require('node:child_process').spawnSync('/opt/node',${JSON.stringify(command)},{stdio:'inherit'});process.exitCode=r.status??1;`,
          ],
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
                : `/opt/node -e ${JSON.stringify(script)}`,
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
              command: `/opt/node ${commandArguments.map((argument) => `'${argument.replaceAll("'", "'\\''")}'`).join(' ')}`,
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
          {
            type: 'moldea.cli-invocations',
            observesManagedAgents: true,
            invocations: attempt.invocations,
          },
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
      operations: [
        {
          kind: 'cli',
          operation: 'composition',
          outputByteCount: failed.invocations[0]!.outputByteCount,
        },
      ],
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
      operations: [
        {
          kind: 'cli',
          operation: 'validate',
          outputByteCount: failedValidation.invocations[0]!.outputByteCount,
        },
      ],
      ownership: 'cli',
      outputByteCount: Buffer.byteLength(
        failedValidation.result.stdout + failedValidation.result.stderr,
      ),
    });
    expect(
      validationEvidence.commandPolicyEvidence.moldeaEvents.some(
        (event) =>
          event.kind === 'command' &&
          event.operations?.some(
            (operation) => operation.kind === 'cli' && operation.operation === 'composition',
          ),
      ),
    ).toBe(false);
    for (const method of ['spawnSync', 'execFileSync'] as const) {
      const compositionArgs = [launcher, '--repository', '/mnt', '--', 'composition', '--json'];
      const wrapperArgs = [
        '-e',
        `const cp = require('node:child_process'); try { const result = cp.${method}(process.execPath, ${JSON.stringify(compositionArgs)}, {stdio:'pipe'}); process.exitCode = result.status ?? 0; } catch (error) { process.exitCode = error.status ?? 1; }`,
      ];
      const wrappedFailure = await run(wrapperArgs, false);
      expect(wrappedFailure.result.status).not.toBe(0);
      expect(wrappedFailure.invocations).toHaveLength(1);
      expect(wrappedFailure.invocations[0]).toMatchObject({
        arguments: compositionArgs.slice(1),
        stdout: '',
      });
      expect(wrappedFailure.invocations[0]?.exitCode).not.toBe(0);
      const projected = projectFailedAttempt(wrapperArgs, wrappedFailure);
      expect(projected.commandPolicyEvidence.moldeaEvents).toContainEqual({
        kind: 'command',
        operations: [
          {
            kind: 'cli',
            operation: 'composition',
            outputByteCount: wrappedFailure.invocations[0]!.outputByteCount,
          },
        ],
        ownership: 'cli',
        outputByteCount: 0,
      });
      expect(
        projected.actorExecutionEvidence.filter(({ item }) => item.commandKind === 'moldea'),
      ).toMatchObject([{ item: { status: 'failed', outputEvidence: { facts: [] } } }]);
      const unmatched = projectFailedAttempt(['-e', 'different wrapper'], wrappedFailure);
      expect(
        unmatched.commandPolicyEvidence.moldeaEvents.some(
          (event) =>
            event.kind === 'command' &&
            event.operations?.some(
              (operation) => operation.kind === 'cli' && operation.operation === 'composition',
            ),
        ),
      ).toBe(false);
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
  'caller-identities',
  'process-identity',
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
                  : scenario === 'caller-identities'
                    ? [{ ...start, callers: [], callerIdentities: ['1:1'] }, exit]
                    : scenario === 'process-identity'
                      ? [
                          {
                            kind: 'command',
                            identity: 'invalid',
                            arguments: ['/bin/bash', '-c', 'true'],
                          },
                          start,
                          exit,
                        ]
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
