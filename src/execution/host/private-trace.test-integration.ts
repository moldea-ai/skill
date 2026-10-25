import { execFile } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  open,
  readdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { hashValue } from 'jg-crypto';
import { expect, test, vi } from 'vitest';

import { createEvidenceBundle } from '../../evidence/index.ts';

import { prepareGitCommandPolicyBoundary } from './git-command-policy-boundary.ts';
import { createPrivateTrace as openPrivateTrace } from './private-trace.ts';
import {
  buildCodexEvaluationHostCommand,
  CodexEvaluationHostError,
  prepareCodexEvaluationHome,
  runCodexEvaluationHost,
} from './host.ts';

const execute = promisify(execFile);

const withFixture = async (
  operation: (root: string, createPrivateTrace: typeof openPrivateTrace) => Promise<void>,
): Promise<void> => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-trace-'));
  const active = new Set<Awaited<ReturnType<typeof openPrivateTrace>>>();
  const createPrivateTrace: typeof openPrivateTrace = async (...argumentsList) => {
    const trace = await openPrivateTrace(...argumentsList);
    const finish = trace.finish;
    trace.finish = async (...finishArguments) => {
      active.delete(trace);
      await finish(...finishArguments);
    };
    active.add(trace);
    return trace;
  };
  try {
    await operation(root, createPrivateTrace);
  } finally {
    for (const trace of active) await trace.finish('failed', -1).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
};

const options = (root: string, invocation = 't0-a-r0') => ({
  repositoryRoot: root,
  attemptId: 'attempt',
  caseId: 'case',
  invocation,
});
const readTraces = async (root: string) => {
  const directory = join(root, '.evidence/private-semantic/attempt/case');
  const names = await readdir(directory);
  return Promise.all(
    names.map(async (name) => ({
      name,
      path: join(directory, name),
      text: await readFile(join(directory, name), 'utf8'),
    })),
  );
};

test.each(['open-command', 'missing-runtime'] as const)(
  'incomplete cancellation capture (%s) blocks stage completion and retains an incomplete footer',
  async (scenario) =>
    withFixture(async (root, createPrivateTrace) => {
      const trace = await createPrivateTrace(options(root), join(root, 'trace.sock'));
      if (scenario === 'open-command')
        trace.capture(
          Buffer.from(
            JSON.stringify({
              type: 'item.started',
              item: { id: 'command-one', type: 'command_execution', command: 'cat README.md' },
            }) + '\n',
          ),
        );
      else trace.markIncomplete();
      await expect(trace.finish('failed', 0)).rejects.toThrow('incomplete');
      for (const { text } of await readTraces(root))
        expect(JSON.parse(text.trim().split('\n').at(-1)!)).toMatchObject({
          complete: false,
          outcome: 'failed',
        });
    }),
);

test('retains an invalid command-start event while marking its capture incomplete', async () =>
  withFixture(async (root, createPrivateTrace) => {
    const trace = await createPrivateTrace(options(root), join(root, 'trace.sock'));
    const event = {
      type: 'item.started',
      item: { type: 'command_execution', command: 'cat README.md' },
    };
    expect(() => trace.capture(Buffer.from(JSON.stringify(event) + '\n'))).toThrow('malformed');
    await expect(trace.finish('failed', 0)).rejects.toThrow('malformed');
    const events = (await readTraces(root)).find(({ name }) => !name.endsWith('.git.jsonl'))!;
    expect(
      events.text
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as unknown),
    ).toContainEqual(event);
    expect(JSON.parse(events.text.trim().split('\n').at(-1)!)).toMatchObject({ complete: false });
  }));

test('host refuses observer storage inside the workspace or related mounts before starting', async () =>
  withFixture(async (root) => {
    const command = buildCodexEvaluationHostCommand(
      [
        'codex',
        'exec',
        '--ephemeral',
        '--ignore-rules',
        '--ignore-user-config',
        '--skip-git-repo-check',
        '--dangerously-bypass-approvals-and-sandbox',
        '-c',
        'shell_environment_policy.inherit=none',
        '-',
      ],
      'actor',
    );
    for (const isRelatedMount of [false, true]) {
      await expect(
        runCodexEvaluationHost({
          command,
          cwd: isRelatedMount ? join(root, 'workspace') : root,
          sandboxHome: join(root, 'home'),
          role: 'actor',
          prompt: 'test',
          privateTrace: options(root),
          readOnlyMounts: isRelatedMount ? [{ source: root, target: '/related' }] : [],
        }),
      ).rejects.toThrow('Private diagnostic files must be outside every sandbox mount.');
    }
    expect(await readdir(root)).toStrictEqual([]);
  }));

test('streams split events and usage observations, isolates concurrent invocations and rejects packing', async () =>
  withFixture(async (root, createPrivateTrace) => {
    const traces = await Promise.all(
      ['t0-a-r0', 't0-j'].map((invocation, index) =>
        createPrivateTrace(options(root, invocation), join(root, `git-${index}.sock`)),
      ),
    );
    for (const trace of traces) {
      const source = `${JSON.stringify({ type: 'usage', usage: { input_tokens: 4 } })}\n${JSON.stringify({ type: 'usage', usage: { input_tokens: 8 } })}\n`;
      trace.capture(Buffer.from(source.slice(0, 12)));
      trace.capture(Buffer.from(source.slice(12)));
    }
    await Promise.all(traces.map((trace) => trace.finish('completed', 0)));
    const files = await readTraces(root);
    expect(files).toHaveLength(4);
    for (const file of files) {
      expect((await stat(file.path)).mode & 0o777).toBe(0o600);
      expect(file.text).toContain('"complete":true');
      expect(() =>
        createEvidenceBundle({
          kind: 'semantic',
          classification: 'official',
          payload: {},
          run: {
            attemptId: 'test',
            evaluatedAt: '2026-10-24T00:00:00.000Z',
            provenance: { source: 'synthetic-test' },
            status: 'passed',
            version: '10.0.3',
          },
          artifacts: [
            { path: 'renamed.txt', content: Buffer.from(file.text), mediaType: 'text/plain' },
          ],
        }),
      ).toThrow(/private diagnostic/u);
      if (!file.name.includes('.git.')) {
        const events = file.text
          .trim()
          .split('\n')
          .map((line: string) => JSON.parse(line) as { usage?: { input_tokens: number } });
        expect(
          events.flatMap((event) => (event.usage ? [event.usage.input_tokens] : [])),
        ).toStrictEqual([4, 8]);
      }
    }
    expect((await stat(join(root, '.evidence/private-semantic/attempt/case'))).mode & 0o777).toBe(
      0o700,
    );
  }));

test.each(['malformed', 'partial', 'overflow', 'missing-git', 'invalid-utf8'] as const)(
  'marks %s capture incomplete and stops',
  async (scenario) =>
    withFixture(async (root, createPrivateTrace) => {
      const trace = await createPrivateTrace(options(root), join(root, 'git.sock'));
      if (scenario === 'malformed')
        expect(() => trace.capture(Buffer.from('not-json\n'))).toThrow(/malformed/u);
      if (scenario === 'partial') trace.capture(Buffer.from('{"type":'));
      if (scenario === 'invalid-utf8')
        expect(() => trace.capture(Buffer.from([255]))).toThrow(/UTF-8/u);
      if (scenario === 'overflow')
        expect(() =>
          trace.capture(
            Buffer.from(
              `${JSON.stringify({ type: 'event', text: 'x'.repeat(16 * 1024 * 1024) })}\n`,
            ),
          ),
        ).toThrow(/byte limit/u);
      await expect(trace.finish('failed', scenario === 'missing-git' ? 1 : 0)).rejects.toThrow(
        /Private/u,
      );
      for (const file of await readTraces(root)) expect(file.text).toContain('"complete":false');
    }),
);

test('rejects traversal, linked roots and nonprivate destinations', async () =>
  withFixture(async (root, createPrivateTrace) => {
    await expect(
      createPrivateTrace({ ...options(root), attemptId: '../escape' }, join(root, 'git.sock')),
    ).rejects.toThrow(/identifiers/u);
    await mkdir(join(root, 'outside'));
    await mkdir(join(root, '.evidence'));
    await symlink(join(root, 'outside'), join(root, '.evidence/private-semantic'));
    await expect(createPrivateTrace(options(root), join(root, 'git.sock'))).rejects.toThrow();
    await rm(join(root, '.evidence/private-semantic'));
    await mkdir(join(root, '.evidence/private-semantic/attempt/case'), {
      recursive: true,
      mode: 0o755,
    });
    await expect(createPrivateTrace(options(root), join(root, 'git.sock'))).rejects.toThrow();
  }));

test('missing files and filesystem write failures cannot report complete capture', async () =>
  withFixture(async (root, createPrivateTrace) => {
    const missing = await createPrivateTrace(options(root, 'missing'), join(root, 'missing.sock'));
    const file = (await readTraces(root))[0];
    await rm(file!.path);
    await expect(missing.finish('completed', 0)).rejects.toThrow(/Private diagnostic/u);

    const probe = await open(join(root, 'probe'), 'wx');
    const write = vi
      .spyOn(Object.getPrototypeOf(probe) as typeof probe, 'writeFile')
      .mockRejectedValue(new Error('controlled I/O failure'));
    try {
      const failing = await createPrivateTrace(
        options(root, 'failure'),
        join(root, 'failure.sock'),
      );
      await expect(failing.finish('completed', 0)).rejects.toThrow(/could not be written/u);
    } finally {
      write.mockRestore();
      await probe.close();
    }
  }));

test('split UTF-8 event text survives capture and credential-bearing Git stderr is marked redacted', async () =>
  withFixture(async (root, createPrivateTrace) => {
    const socket = join(root, 'git.sock');
    const trace = await createPrivateTrace(options(root), socket);
    const source = Buffer.from('{"type":"message","text":"café"}\n');
    const split = source.indexOf(Buffer.from('é')) + 1;
    trace.capture(source.subarray(0, split));
    trace.capture(source.subarray(split));
    const executable = join(root, 'real-git');
    await writeFile(
      executable,
      `#!${process.execPath}\nprocess.stderr.write('Basic dXNlcjpwYXNzd29yZA== ghp_abcdefghijklmnopqrstuvwxyz');\n`,
      { mode: 0o700 },
    );
    const wrapper = await prepareGitCommandPolicyBoundary(join(root, 'bin'), {
      realGitExecutable: executable,
      invocationLogPath: join(root, 'invocations.jsonl'),
      diagnosticSocketPath: socket,
    });
    await execute(process.execPath, [wrapper, '--version'], { cwd: root, timeout: 10000 });
    await trace.finish('completed', 1);
    const files = await readTraces(root);
    expect(files.find(({ name }) => !name.includes('.git.'))?.text).toContain('café');
    const record = files
      .find(({ name }) => name.includes('.git.'))!
      .text.trim()
      .split('\n')[1]!;
    const retained = JSON.parse(record) as { calls: Array<{ stderr: string; redacted: boolean }> };
    expect(retained.calls[0]?.redacted).toBe(true);
    expect(Buffer.from(retained.calls[0]!.stderr, 'base64').toString()).toBe(
      '[redacted] [redacted]',
    );
  }));

test('Codex and Git sidecars share one aggregate byte bound', async () =>
  withFixture(async (root, createPrivateTrace) => {
    const socket = join(root, 'git.sock');
    const trace = await createPrivateTrace(options(root), socket);
    trace.capture(
      Buffer.from(`${JSON.stringify({ type: 'message', text: 'x'.repeat(8 * 1024 * 1024) })}\n`),
    );
    const executable = join(root, 'real-git');
    await writeFile(
      executable,
      `#!${process.execPath}\nprocess.stderr.write(Buffer.alloc(8*1024*1024,120));\n`,
      { mode: 0o700 },
    );
    const wrapper = await prepareGitCommandPolicyBoundary(join(root, 'bin'), {
      realGitExecutable: executable,
      invocationLogPath: join(root, 'invocations.jsonl'),
      diagnosticSocketPath: socket,
    });
    const result = await execute(process.execPath, [wrapper, '--version'], {
      cwd: root,
      timeout: 10000,
      maxBuffer: 16 * 1024 * 1024,
    });
    expect(result.stderr.length).toBe(8 * 1024 * 1024);
    await expect(trace.finish('completed', 1)).rejects.toThrow(/byte limit/u);
    const files = await readTraces(root);
    expect(
      files.reduce((total, { text }) => total + Buffer.byteLength(text), 0),
    ).toBeLessThanOrEqual(16 * 1024 * 1024);
    for (const file of files) expect(file.text).toContain('"complete":false');
  }));

test('retains Node wrapper warnings as well as real Git subprocess stderr', async () =>
  withFixture(async (root, createPrivateTrace) => {
    const trace = await createPrivateTrace(options(root), join(root, 'git.sock'));
    const executable = join(root, 'real-git');
    const preload = join(root, 'warning.cjs');
    await writeFile(
      executable,
      `#!${process.execPath}\nprocess.stdout.write('git version fixture\\n');\n`,
      { mode: 0o700 },
    );
    await writeFile(
      preload,
      "if(process.argv[1].endsWith('/git'))process.emitWarning('controlled-wrapper-warning');\n",
    );
    const wrapper = await prepareGitCommandPolicyBoundary(join(root, 'bin'), {
      realGitExecutable: executable,
      invocationLogPath: join(root, 'invocations.jsonl'),
      diagnosticSocketPath: join(root, 'git.sock'),
    });
    const result = await execute(process.execPath, [wrapper, '--version'], {
      cwd: root,
      timeout: 10000,
      env: { ...process.env, NODE_OPTIONS: `--require=${preload}` },
    });
    await trace.finish('completed', 1);
    const git = (await readTraces(root)).find(({ name }) => name.includes('.git.'))!;
    const record = JSON.parse(git.text.trim().split('\n')[1]!) as {
      calls: Array<{ kind: string; stderr: string }>;
    };
    const warning = record.calls.find(({ kind }) => kind === 'wrapper')!;
    expect(Buffer.from(warning.stderr, 'base64').toString()).toBe(result.stderr);
    expect(result.stderr).toContain('controlled-wrapper-warning');
    expect(record.calls.find(({ kind }) => kind === 'subprocess')?.stderr).toBe('');
  }));

test.each([0, 7])(
  'retains exact Git stderr and forwards stdout, stderr and exit %d',
  async (status) =>
    withFixture(async (root, createPrivateTrace) => {
      const socket = join(root, 'git.sock');
      const trace = await createPrivateTrace(options(root), socket);
      const stderr = Buffer.from([119, 97, 114, 110, 0, 255, 10]);
      const executable = join(root, 'real-git');
      await writeFile(
        executable,
        `#!${process.execPath}\nprocess.stdout.write('git version fixture\\n');process.stderr.write(Buffer.from('${stderr.toString('base64')}','base64'));process.exitCode=${status};\n`,
        { mode: 0o700 },
      );
      const wrapper = await prepareGitCommandPolicyBoundary(join(root, 'bin'), {
        realGitExecutable: executable,
        invocationLogPath: join(root, 'invocations.jsonl'),
        diagnosticSocketPath: socket,
      });
      let stdout: Buffer;
      let actualStderr: Buffer;
      try {
        const result = await execute(process.execPath, [wrapper, '--version'], {
          cwd: root,
          encoding: 'buffer',
          timeout: 10000,
        });
        stdout = result.stdout;
        actualStderr = result.stderr;
        expect(status).toBe(0);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !('stdout' in error) ||
          !('stderr' in error) ||
          !('code' in error)
        )
          throw error;
        expect(error.code).toBe(status);
        stdout = Buffer.from(error.stdout as Uint8Array);
        actualStderr = Buffer.from(error.stderr as Uint8Array);
      } finally {
        await trace.finish('completed', 1);
      }
      expect(stdout.toString()).toBe('git version fixture\n');
      expect(actualStderr).toStrictEqual(stderr);
      const git = (await readTraces(root)).find(({ name }) => name.includes('.git.'));
      expect(git?.text).toContain(`"stderr":"${stderr.toString('base64')}"`);
      expect(git?.text).toContain(`"sha256":"${hashValue(stderr)}"`);
      expect(git?.text).toContain('"redacted":false');
    }),
);

test.each(['completed', 'failed', 'cancelled', 'timed-out', 'malformed'] as const)(
  'real sandbox preserves private traces when %s',
  async (scenario) =>
    withFixture(async (root) => {
      const executableDirectory = join(root, 'bin');
      const repository = join(root, 'workspace');
      const home = join(root, 'home');
      const sourceHome = join(root, 'source-home');
      await Promise.all([mkdir(executableDirectory), mkdir(repository), mkdir(sourceHome)]);
      vi.stubEnv('PATH', `${executableDirectory}:${process.env['PATH'] ?? ''}`);
      vi.stubEnv('CODEX_HOME', sourceHome);
      vi.stubEnv('MOLDEA_EVAL_HOST_TIMEOUT_MS', '1000');
      await prepareCodexEvaluationHome(home);
      const hostBody =
        `#!${process.execPath}\n` +
        `const {spawnSync}=require('node:child_process');const {existsSync}=require('node:fs');\n` +
        `const result=spawnSync('/home/evaluator/bin/git',['--version'],{encoding:'utf8'});\n` +
        `if(existsSync(${JSON.stringify(join(root, '.evidence'))}))throw new Error('observer files accessible');\n` +
        `process.stdout.write(JSON.stringify({type:'item.completed',item:{id:'command-1',type:'command_execution',command:'git --version',exit_code:result.status,aggregated_output:result.stdout+result.stderr}})+'\\n');\n` +
        `process.stdout.write(JSON.stringify({type:'turn.completed',usage:{input_tokens:8,cached_input_tokens:4,output_tokens:2}})+'\\n');\n` +
        (scenario === 'malformed' ? `process.stdout.write('broken\\n');` : '') +
        (scenario === 'failed' ? 'process.exitCode=7;' : '') +
        (['cancelled', 'timed-out'].includes(scenario) ? 'setInterval(()=>{},1000);' : '');
      // the same executable is mounted as /opt/codex; its interpreter must use the mounted Node
      await writeFile(
        join(executableDirectory, 'codex'),
        hostBody.replace(`#!${process.execPath}`, '#!/opt/node'),
        { mode: 0o700 },
      );
      await writeFile(join(executableDirectory, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n', {
        mode: 0o700,
      });
      const controller = new AbortController();
      const result = runCodexEvaluationHost({
        command: buildCodexEvaluationHostCommand(
          [
            'codex',
            'exec',
            '--ephemeral',
            '--ignore-rules',
            '--ignore-user-config',
            '--skip-git-repo-check',
            '--dangerously-bypass-approvals-and-sandbox',
            '-c',
            'shell_environment_policy.inherit=none',
            '-',
          ],
          'actor',
        ),
        cwd: repository,
        sandboxHome: home,
        role: 'actor',
        prompt: 'synthetic test',
        privateTrace: options(root),
        signal: controller.signal,
      }).then(
        (output) => ({ output, error: null }),
        (error: unknown) => ({ output: null, error }),
      );
      if (scenario === 'cancelled') {
        await expect
          .poll(async () =>
            (await readTraces(root)).some(({ text }) => text.includes('turn.completed')),
          )
          .toBe(true);
        controller.abort();
      }
      const observed = await result;
      if (scenario === 'completed') {
        expect(observed.error).toBeNull();
        expect(observed.output).toContain('moldea.git-invocations');
        expect(observed.output).not.toContain('moldeaPrivateTrace');
        expect(observed.output).not.toContain('private-semantic');
      } else {
        expect(observed.error).toBeInstanceOf(Error);
        if (scenario === 'malformed')
          expect(observed.error).not.toBeInstanceOf(CodexEvaluationHostError);
      }
      const files = await readTraces(root);
      expect(files).toHaveLength(2);
      for (const file of files) {
        expect(file.text).toContain(`"complete":${scenario !== 'malformed'}`);
        expect(file.text).not.toContain('git version ');
      }
      const events = files.find(({ name }) => !name.includes('.git.'));
      expect(events?.text).toContain('turn.completed');
      expect(events?.text).toContain('"input_tokens":8');
      expect(await readdir(home)).not.toContain('git.sock');
    }),
);
