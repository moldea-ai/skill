// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, test, vi } from 'vitest';

const LAUNCHER_PATH = resolve(import.meta.dirname, '../../moldea/scripts/moldea-cli.mjs');
const SUCCESS_OUTPUT =
  '{"command":"validate","status":"valid","error":null,"result":{"valid":true}}\n';
const GATE_PATH = resolve(import.meta.dirname, '../../moldea/scripts/relevance-gate.mjs');
const PUBLISHED_CLI_URL = pathToFileURL(
  resolve(import.meta.dirname, '../../node_modules/@moldea.ai/cli/dist/moldea.js'),
).href;
const scopeFixtureRoots: string[] = [];

const createScopeFixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-scope-'));
  scopeFixtureRoots.push(root);
  const git = spawnSync('git', ['init', '--quiet', root], { encoding: 'utf8' });
  if (git.error) throw git.error;
  assert.equal(git.status, 0, git.stderr);
  const cliRoot = join(root, 'node_modules', '@moldea.ai', 'cli');
  const coreRoot = join(root, 'node_modules', '@moldea.ai', 'core');
  const invokedPath = join(root, 'cli-invoked.txt');
  mkdirSync(join(cliRoot, 'dist'), { recursive: true });
  mkdirSync(join(coreRoot, 'dist'), { recursive: true });
  mkdirSync(join(root, 'moldea'));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ devDependencies: { '@moldea.ai/cli': '^9.0.0' } }),
  );
  writeFileSync(
    join(cliRoot, 'package.json'),
    JSON.stringify({
      name: '@moldea.ai/cli',
      version: '9.0.1',
      type: 'module',
      bin: { moldea: './dist/moldea.js' },
      dependencies: { '@moldea.ai/core': '^5.0.1' },
    }),
  );
  writeFileSync(
    join(coreRoot, 'package.json'),
    JSON.stringify({ name: '@moldea.ai/core', version: '5.0.1' }),
  );
  writeFileSync(join(coreRoot, 'dist', 'index.js'), 'module.exports = {};\n');
  // retain the real published CLI parser, Core matcher, and filesystem reads behind the fixture entry
  writeFileSync(
    join(cliRoot, 'dist', 'moldea.js'),
    `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(invokedPath)}, 'invoked');\nawait import(${JSON.stringify(PUBLISHED_CLI_URL)});\n`,
  );
  const managedBlock = readFileSync(
    resolve(import.meta.dirname, '../../moldea/assets/managed-readme-block.md'),
    'utf8',
  );
  writeFileSync(join(root, 'README.md'), `# Project\n\n${managedBlock}`);
  writeFileSync(join(root, 'moldea', 'project.md'), '# Project\n');
  writeFileSync(
    join(root, 'moldea', 'moldea.yaml'),
    'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/refund.ts\n      - /src/Éclair plan.ts\n',
  );
  return { root, invokedPath, cliRoot };
};

const runScope = (root: string, paths: string[] | Buffer | string) => {
  const input =
    typeof paths === 'string'
      ? undefined
      : Buffer.isBuffer(paths)
        ? paths
        : Buffer.from(`${paths.join('\0')}\0`);
  const result = spawnSync(
    process.execPath,
    [
      LAUNCHER_PATH,
      '--repository',
      root,
      '--',
      'scope',
      ...(typeof paths === 'string' ? ['--path', paths] : ['--paths-stdin']),
      '--json',
      '--max-output-bytes',
      '65536',
    ],
    { encoding: 'utf8', ...(input === undefined ? {} : { input }), timeout: 15_000 },
  );
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

afterEach(() => {
  for (const root of scopeFixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('the gate and launcher resolve a mixed Git path batch through the published CLI', () => {
  const { root } = createScopeFixture();
  const paths = ['src/refund.ts', '/src/other.ts', 'src/Éclair plan.ts'];
  const gate = spawnSync(process.execPath, [GATE_PATH, '--repository', root], {
    encoding: 'utf8',
    input: Buffer.from(`${paths.join('\0')}\0`),
    timeout: 15_000,
  });
  if (gate.error) throw gate.error;
  assert.equal(gate.status, 0, gate.stderr);
  assert.equal(gate.stdout, '1\n');
  assert.equal(gate.stderr, '');
  const mixed = runScope(root, paths);
  const canonical = runScope(
    root,
    paths.map((path) => (path.startsWith('/') ? path : `/${path}`)),
  );
  assert.equal(mixed.status, 0, mixed.stderr || mixed.stdout);
  assert.deepEqual(mixed, canonical);
  const envelope = JSON.parse(mixed.stdout) as {
    status: string;
    result: { relevant: boolean; counts: { inputPaths: number; matchedPaths: number } };
  };
  assert.equal(envelope.status, 'valid');
  assert.equal(envelope.result.relevant, true);
  assert.equal(envelope.result.counts.inputPaths, 3);
  assert.equal(envelope.result.counts.matchedPaths, 2);
});

test('normalizes one scope --path without changing the published CLI result', () => {
  const { root } = createScopeFixture();
  const relative = runScope(root, 'src/refund.ts');
  assert.equal(relative.status, 0, relative.stderr || relative.stdout);
  assert.deepEqual(relative, runScope(root, '/src/refund.ts'));
});

test.each([
  ['empty', Buffer.alloc(0)],
  ['unterminated', Buffer.from('src/refund.ts')],
  ['leading delimiter', Buffer.from('\0src/refund.ts\0')],
  ['empty entry', Buffer.from('src/refund.ts\0\0')],
  ['invalid UTF-8', Buffer.from([0xff, 0])],
  ['drive-relative', Buffer.from('C:refund.ts\0')],
  ['UNC', Buffer.from('\\\\host\\share\0')],
  ['oversized', Buffer.alloc(2_097_153, 0x61)],
])('rejects %s scope stdin before invoking repository code', (_description, input) => {
  const { root, invokedPath } = createScopeFixture();
  const result = runScope(root, input);
  assert.equal(result.status, 3);
  assert.equal(result.stdout, '');
  assert.notEqual(result.stderr, '');
  assert.equal(existsSync(invokedPath), false);
});

test('rejects relative content paths without invoking repository code', () => {
  const { root, invokedPath } = createScopeFixture();
  const result = spawnSync(
    process.execPath,
    [
      LAUNCHER_PATH,
      '--repository',
      root,
      '--',
      'content',
      '--path',
      'moldea/project.md',
      '--json',
      '--max-output-bytes',
      '65536',
    ],
    { encoding: 'utf8', timeout: 15_000 },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 3);
  assert.equal(result.stdout, '');
  assert.equal(existsSync(invokedPath), false);
});

test('suppresses success when the child closes its scope input pipe early', () => {
  const { root, cliRoot } = createScopeFixture();
  writeFileSync(
    join(cliRoot, 'dist', 'moldea.js'),
    `import { closeSync } from 'node:fs';\ncloseSync(0);\nprocess.stdout.write(${JSON.stringify(SUCCESS_OUTPUT)});\nsetTimeout(() => process.exit(0), 1000);\n`,
  );
  const input = Buffer.alloc(2_097_152, 0x61);
  input[input.length - 1] = 0;
  const result = runScope(root, input);
  assert.equal(result.status, 3);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'moldea CLI scope input could not be delivered.\n');
});

test.each(['src/../refund.ts', 'src\\refund.ts', '//host/share'])(
  'leaves unsafe path rejection to the published CLI for %s',
  (path) => {
    const { root } = createScopeFixture();
    const result = runScope(root, [path]);
    assert.equal(result.status, 3);
    const envelope = JSON.parse(result.stdout) as { status: string; error: { code: string } };
    assert.equal(envelope.status, 'error');
    assert.equal(envelope.error.code, 'PATH_INPUT_INVALID');
  },
);

const stopFixtureChild = (pid: number): void => {
  try {
    process.kill(pid, 'SIGKILL');
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error;
  }
};

/** Exercises the generated launcher against a real child with controlled termination behavior. */
const runFixture = async (
  signal?: 'SIGINT' | 'SIGTERM',
  ignoresSignal = false,
  scopeMode = false,
) => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-launcher-'));
  const cliRoot = join(root, 'node_modules', '@moldea.ai', 'cli');
  const coreRoot = join(root, 'node_modules', '@moldea.ai', 'core');
  const readyPath = join(root, 'ready.json');
  const receivedPath = join(root, 'received-signal.txt');
  mkdirSync(join(cliRoot, 'dist'), { recursive: true });
  mkdirSync(join(coreRoot, 'dist'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ devDependencies: { '@moldea.ai/cli': '^9.0.0' } }),
  );
  writeFileSync(
    join(cliRoot, 'package.json'),
    JSON.stringify({
      name: '@moldea.ai/cli',
      version: '9.0.1',
      bin: { moldea: './dist/moldea.js' },
      dependencies: { '@moldea.ai/core': '^5.0.1' },
    }),
  );
  writeFileSync(
    join(coreRoot, 'package.json'),
    JSON.stringify({ name: '@moldea.ai/core', version: '5.0.2' }),
  );
  writeFileSync(join(coreRoot, 'dist', 'index.js'), 'module.exports = {};\n');
  writeFileSync(
    join(cliRoot, 'dist', 'moldea.js'),
    `
const fs = require('node:fs');
if (${scopeMode}) process.stdin.resume();
const finish = () => { process.stdout.write(${JSON.stringify(SUCCESS_OUTPUT)}); process.exit(0); };
if (${signal !== undefined}) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      fs.writeFileSync(${JSON.stringify(receivedPath)}, signal);
      if (!${ignoresSignal}) finish();
    });
  }
  fs.writeFileSync(${JSON.stringify(readyPath)}, JSON.stringify({ pid: process.pid }));
  setInterval(() => {}, 1000);
} else finish();
`,
  );
  const launcherArguments = [
    LAUNCHER_PATH,
    '--repository',
    root,
    '--',
    ...(scopeMode ? ['scope', '--paths-stdin'] : ['validate']),
    '--json',
    '--max-output-bytes',
    '65536',
  ];
  const launcher = scopeMode
    ? spawn(process.execPath, launcherArguments, { stdio: ['pipe', 'pipe', 'pipe'] })
    : spawn(process.execPath, launcherArguments, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (scopeMode) launcher.stdin?.end('src/refund.ts\0');
  let stdout = '';
  let stderr = '';
  launcher.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });
  launcher.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  const completion = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolveCompletion, rejectCompletion) => {
      launcher.once('error', rejectCompletion);
      launcher.once('close', (code, signal) => resolveCompletion({ code, signal }));
    },
  );
  const timeout = setTimeout(() => launcher.kill('SIGKILL'), 15_000);
  try {
    if (signal !== undefined) {
      await vi.waitFor(() => assert.equal(existsSync(readyPath), true), { timeout: 5_000 });
      assert.equal(launcher.kill(signal), true);
    }
    const result = await completion;
    const receivedSignal = existsSync(receivedPath) ? readFileSync(receivedPath, 'utf8') : null;
    return { ...result, stdout, stderr, receivedSignal };
  } finally {
    clearTimeout(timeout);
    const needsChildCleanup =
      launcher.signalCode === 'SIGKILL' ||
      (launcher.exitCode === null && launcher.signalCode === null);
    if (needsChildCleanup) launcher.kill('SIGKILL');
    if (needsChildCleanup && existsSync(readyPath)) {
      const { pid } = JSON.parse(readFileSync(readyPath, 'utf8')) as { pid: number };
      stopFixtureChild(pid);
    }
    await completion;
    rmSync(root, { recursive: true, force: true });
  }
};

test('preserves successful output and status without cancellation', async () => {
  assert.deepEqual(await runFixture(), {
    code: 0,
    signal: null,
    stdout: SUCCESS_OUTPUT,
    stderr: '',
    receivedSignal: null,
  });
});

// Windows process.kill terminates the parent directly instead of delivering these POSIX signals.
test.skipIf(process.platform === 'win32').each([
  ['SIGINT', false],
  ['SIGTERM', false],
  ['SIGINT', true],
  ['SIGTERM', true],
] as const)(
  'returns failure after handled %s cancellation with scope stdin %s',
  async (signal, scopeMode) => {
    assert.deepEqual(await runFixture(signal, false, scopeMode), {
      code: 3,
      signal: null,
      stdout: '',
      stderr: `moldea CLI terminated by ${signal}.\n`,
      receivedSignal: signal,
    });
  },
);

test.skipIf(process.platform === 'win32')(
  'force-terminates a child that ignores cancellation',
  async () => {
    assert.deepEqual(await runFixture('SIGTERM', true), {
      code: 3,
      signal: null,
      stdout: '',
      stderr: 'moldea CLI terminated by SIGTERM.\n',
      receivedSignal: 'SIGTERM',
    });
  },
);
