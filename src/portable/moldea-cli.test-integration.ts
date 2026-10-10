// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, test, vi } from 'vitest';

import { readReleaseIdentity } from '../release/index.ts';

const { cliJsonSchemaVersion, cliVersion, cliVersionRange, coreVersion, coreVersionRange } =
  readReleaseIdentity(resolve(import.meta.dirname, '../..'));

const LAUNCHER_PATH = resolve(import.meta.dirname, '../../moldea/scripts/moldea-cli.mjs');
const SUCCESS_OUTPUT = `${JSON.stringify({ schemaVersion: cliJsonSchemaVersion, cliVersion, command: 'validate', status: 'valid', error: null, result: { valid: true, diagnosticCount: 0, errorCount: 0, warningCount: 0 } })}\n`;
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
    JSON.stringify({ devDependencies: { '@moldea.ai/cli': cliVersionRange } }),
  );
  writeFileSync(
    join(cliRoot, 'package.json'),
    JSON.stringify({
      name: '@moldea.ai/cli',
      version: cliVersion,
      type: 'module',
      bin: { moldea: './dist/moldea.js' },
      dependencies: { '@moldea.ai/core': coreVersionRange },
    }),
  );
  writeFileSync(
    join(coreRoot, 'package.json'),
    JSON.stringify({ name: '@moldea.ai/core', version: coreVersion }),
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

const runScope = (root: string, paths: string[] | Buffer | string, cwd = root) => {
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
    { cwd, encoding: 'utf8', ...(input === undefined ? {} : { input }), timeout: 15_000 },
  );
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

afterEach(() => {
  for (const root of scopeFixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('the gate and launcher resolve a mixed Git path batch through the published CLI', () => {
  const { root } = createScopeFixture();
  const paths = [
    'src/refund.ts',
    '/src/other.ts',
    './src/Éclair plan.ts',
    join(root, 'src/refund.ts'),
  ];
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
  const canonical = runScope(root, [
    '/src/refund.ts',
    '/src/other.ts',
    '/src/Éclair plan.ts',
    '/src/refund.ts',
  ]);
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

test('normalizes every scope spelling in argv and stdin from a nested cwd', () => {
  const { root } = createScopeFixture();
  const cwd = join(root, 'nested');
  mkdirSync(cwd);
  const canonical = runScope(root, '/src/refund.ts');
  assert.equal(canonical.status, 0, canonical.stderr || canonical.stdout);
  assert.equal(
    (JSON.parse(canonical.stdout) as { result: { relevant: boolean } }).result.relevant,
    true,
  );
  for (const path of [
    'src/refund.ts',
    '/src/refund.ts',
    './src/refund.ts',
    join(root, 'src/refund.ts'),
  ]) {
    assert.deepEqual(runScope(root, path, cwd), canonical);
    assert.deepEqual(runScope(root, [path], cwd), canonical);
  }
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

test.each(['moldea/project.md', 'moldea/context/Éclair plan.md'])(
  'normalizes content path %s through the published CLI',
  (path) => {
    const { root } = createScopeFixture();
    mkdirSync(join(root, 'moldea/context'));
    writeFileSync(join(root, 'moldea/context/Éclair plan.md'), '# Éclair plan\n');
    const cwd = join(root, 'nested');
    mkdirSync(cwd);
    const canonical = runPage(root, 'content', ['--path', `/${path}`]);
    assert.equal(canonical.status, 0, canonical.stderr || canonical.stdout);
    for (const spelling of [path, `/${path}`, `./${path}`, join(root, path)]) {
      assert.deepEqual(runPage(root, 'content', ['--path', spelling], cwd), canonical);
    }
  },
);

test.each([
  'C:project.md',
  '\\\\host\\share',
  'moldea\\project.md',
  'moldea/../README.md',
  '//host/share',
])('rejects unsafe content path %s before repository code', (path) => {
  const { root, invokedPath } = createScopeFixture();
  const result = runPage(root, 'content', ['--path', path]);
  assert.equal(result.status, 3);
  assert.equal(result.stdout, '');
  assert.equal(existsSync(invokedPath), false);
});

test('retains CLI rejection for noncanonical content', () => {
  const { root, invokedPath } = createScopeFixture();
  const result = runPage(root, 'content', ['--path', 'README.md']);
  assert.equal(result.status, 3, result.stdout);
  assert.equal(existsSync(invokedPath), true);
  assert.equal((JSON.parse(result.stdout) as { status: string }).status, 'error');
  assert.equal(result.stderr, '');
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

test.each(['src/../refund.ts', 'src/./refund.ts', 'src\\refund.ts', '//host/share', './'])(
  'rejects unsafe scope paths before repository code for %s',
  (path) => {
    const { root, invokedPath } = createScopeFixture();
    for (const paths of [path, [path]]) {
      const result = runScope(root, paths);
      assert.equal(result.status, 3);
      assert.equal(result.stdout, '');
      assert.notEqual(result.stderr, '');
      assert.equal(existsSync(invokedPath), false);
    }
  },
);

test('normalizes supplied and resolved root spellings through the real CLI', () => {
  const { root } = createScopeFixture();
  const parent = mkdtempSync(join(tmpdir(), 'moldea-scope-link-'));
  scopeFixtureRoots.push(parent);
  const linkedRoot = join(parent, 'repository');
  symlinkSync(root, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
  const scope = runScope(root, '/src/refund.ts');
  const content = runPage(root, 'content', ['--path', '/moldea/project.md']);
  assert.equal(scope.status, 0, scope.stderr || scope.stdout);
  assert.equal(content.status, 0, content.stderr || content.stdout);
  for (const spelling of [root, linkedRoot]) {
    assert.deepEqual(runScope(linkedRoot, join(spelling, 'src/refund.ts')), scope);
    assert.deepEqual(runScope(linkedRoot, [join(spelling, 'src/refund.ts')]), scope);
    assert.deepEqual(
      runPage(linkedRoot, 'content', ['--path', join(spelling, 'moldea/project.md')]),
      content,
    );
  }
});

test('rejects repository-root-only selections before repository code', () => {
  const { root, invokedPath } = createScopeFixture();
  for (const result of [
    runScope(root, root),
    runScope(root, [root]),
    runPage(root, 'content', ['--path', root]),
  ]) {
    assert.equal(result.status, 3);
    assert.equal(result.stdout, '');
    assert.notEqual(result.stderr, '');
  }
  assert.equal(existsSync(invokedPath), false);
});

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
    JSON.stringify({ devDependencies: { '@moldea.ai/cli': cliVersionRange } }),
  );
  writeFileSync(
    join(cliRoot, 'package.json'),
    JSON.stringify({
      name: '@moldea.ai/cli',
      version: cliVersion,
      bin: { moldea: './dist/moldea.js' },
      dependencies: { '@moldea.ai/core': coreVersionRange },
    }),
  );
  writeFileSync(
    join(coreRoot, 'package.json'),
    JSON.stringify({ name: '@moldea.ai/core', version: coreVersion }),
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
  launcher.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });
  launcher.stderr?.on('data', (chunk: Buffer) => {
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

const runPage = (root: string, command: string, options: string[], cwd = root) => {
  const result = spawnSync(
    process.execPath,
    [
      LAUNCHER_PATH,
      '--repository',
      root,
      '--',
      command,
      '--json',
      ...(command === 'composition' ? [] : ['--max-output-bytes', '4096']),
      ...options,
    ],
    { cwd, encoding: 'utf8', timeout: 15_000 },
  );
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

test.each(['composition', 'content', 'inspect', 'scope', 'validate'])(
  'preserves the real %s CLI response without capture',
  (command) => {
    const { root, cliRoot } = createScopeFixture();
    const options =
      command === 'content'
        ? ['--path', '/moldea/project.md']
        : command === 'scope'
          ? ['--path', '/src/unrelated.ts']
          : [];
    const result = runPage(root, command, options);
    const direct = spawnSync(
      process.execPath,
      [
        join(cliRoot, 'dist/moldea.js'),
        command,
        ...(command === 'composition' ? [] : ['--repository', root]),
        '--json',
        ...(command === 'composition' ? [] : ['--max-output-bytes', '4096']),
        ...options,
      ],
      { cwd: root, encoding: 'utf8', timeout: 15_000 },
    );
    if (direct.error) throw direct.error;
    assert.ok(result.status === 0 || result.status === 1, result.stderr || result.stdout);
    assert.equal(result.status, direct.status);
    assert.equal(result.stdout, direct.stdout);
    assert.equal(result.stderr, direct.stderr);
    if (command === 'scope')
      assert.equal(
        (JSON.parse(result.stdout) as { result: { relevant: boolean } }).result.relevant,
        false,
      );
  },
);

test.each(['composition', 'content', 'inspect', 'scope', 'validate'])(
  'suppresses malformed uncaptured %s output',
  (command) => {
    const { root, cliRoot } = createScopeFixture();
    writeFileSync(
      join(cliRoot, 'dist/moldea.js'),
      'process.stdout.write(\'{"private":"sensitive\');',
    );
    const options =
      command === 'content'
        ? ['--path', 'moldea/project.md']
        : command === 'scope'
          ? ['--path', 'src/unrelated.ts']
          : [];
    const result = runPage(root, command, options);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Moldea response is not complete UTF-8 JSON.\n');
  },
);

test.each([1, 2, 3])('preserves raw diagnostic/error output with exit %d', (exitCode) => {
  const { root, cliRoot } = createScopeFixture();
  const raw = ` ${JSON.stringify({
    schemaVersion: cliJsonSchemaVersion,
    cliVersion,
    command: 'validate',
    status: exitCode === 1 ? 'invalid' : 'error',
    error: exitCode === 1 ? null : { code: 'RESOURCE_LIMIT_EXCEEDED' },
    result:
      exitCode === 1
        ? {
            valid: false,
            diagnosticCount: 2,
            errorCount: 1,
            warningCount: 1,
            page: { cursor: null, records: [] },
          }
        : null,
    future: 'preserved',
  })}\n`;
  writeFileSync(
    join(cliRoot, 'dist/moldea.js'),
    `process.stdout.write(${JSON.stringify(raw)}); process.exitCode = ${exitCode};`,
  );
  const result = runPage(root, 'validate', []);
  assert.equal(result.status, exitCode);
  assert.equal(result.stdout, raw);
  assert.equal(result.stderr, '');
});

test('continues real Unicode content one page at a time and preserves CLI snapshot/filter errors', () => {
  const { root, cliRoot } = createScopeFixture();
  const scratch = mkdtempSync(join(tmpdir(), 'moldea-pages-'));
  scopeFixtureRoots.push(scratch);
  const checkpoint = join(scratch, 'page.json');
  const content = `# Project\n\n${'Éclair 🌍 中文\n'.repeat(500)}`;
  writeFileSync(join(root, 'moldea/project.md'), content);
  const countPath = join(root, 'calls.txt');
  writeFileSync(
    join(cliRoot, 'dist/moldea.js'),
    `import { appendFileSync } from 'node:fs';\nappendFileSync(${JSON.stringify(countPath)}, '1');\nawait import(${JSON.stringify(PUBLISHED_CLI_URL)});\n`,
  );
  const paths = ['--path', '/moldea/project.md'];
  let result = runPage(root, 'content', [...paths, '--save-response', checkpoint]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFileSync(checkpoint, 'utf8'), result.stdout);
  const first = result.stdout;
  let accumulated = '';
  let byteEnd = 0;
  let calls = 0;
  for (;;) {
    const page = JSON.parse(result.stdout) as {
      result: {
        cursor: string | null;
        content: string;
        chunk: { content: string; byteStart: number; byteEnd: number };
      };
    };
    assert.equal(page.result.chunk.byteStart, byteEnd);
    byteEnd = page.result.chunk.byteEnd;
    accumulated += page.result.chunk.content;
    calls += 1;
    assert.equal(readFileSync(countPath, 'utf8'), '1'.repeat(calls));
    if (page.result.cursor === null) break;
    assert.ok(calls < 16, 'bounded test traversal');
    result = runPage(root, 'content', [
      ...paths,
      '--cursor-from-response',
      checkpoint,
      '--save-response',
      checkpoint,
    ]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(readFileSync(checkpoint, 'utf8'), result.stdout);
  }
  assert.equal(accumulated, content);
  assert.equal(byteEnd, Buffer.byteLength(content));
  assert.ok(calls > 1);
  const final = runPage(root, 'content', [...paths, '--cursor-from-response', checkpoint]);
  assert.equal(final.status, 3);
  assert.equal(readFileSync(countPath, 'utf8'), '1'.repeat(calls));
  writeFileSync(checkpoint, first);
  const changedFilter = runPage(root, 'content', [
    '--path',
    '/moldea/moldea.yaml',
    '--cursor-from-response',
    checkpoint,
    '--save-response',
    checkpoint,
  ]);
  assert.equal(changedFilter.status, 3);
  assert.equal(
    (JSON.parse(changedFilter.stdout) as { error: { code: string } }).error.code,
    'CURSOR_INVALID',
  );
  assert.equal(readFileSync(checkpoint, 'utf8'), first);
  writeFileSync(join(root, 'moldea/project.md'), `${content}\nchanged\n`);
  const stale = runPage(root, 'content', [
    ...paths,
    '--cursor-from-response',
    checkpoint,
    '--save-response',
    checkpoint,
  ]);
  assert.equal(stale.status, 3);
  assert.equal(
    (JSON.parse(stale.stdout) as { error: { code: string } }).error.code,
    'CURSOR_SNAPSHOT_CHANGED',
  );
  assert.equal(readFileSync(checkpoint, 'utf8'), first);
});

test.each(['composition', 'duplicate', 'conflicting'] as const)(
  'rejects %s capture options before child execution',
  (mode) => {
    const { root, invokedPath } = createScopeFixture();
    const scratch = mkdtempSync(join(tmpdir(), 'moldea-options-'));
    scopeFixtureRoots.push(scratch);
    const path = join(scratch, 'page.json');
    const options =
      mode === 'conflicting'
        ? ['--cursor', 'raw', '--cursor-from-response', path]
        : ['--save-response', path, ...(mode === 'duplicate' ? ['--save-response', path] : [])];
    const result = runPage(root, mode === 'composition' ? 'composition' : 'validate', options);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, '');
    assert.equal(existsSync(invokedPath), false);
  },
);

// use a native-I/O boundary hook to pause capture deterministically after the child has closed
const runCaptureCancellation = async (
  signal: 'SIGINT' | 'SIGTERM',
  phase: 'write' | 'commit' | 'rename',
) => {
  const { root, cliRoot } = createScopeFixture();
  const scratch = mkdtempSync(join(tmpdir(), 'moldea-capture-'));
  scopeFixtureRoots.push(scratch);
  const checkpoint = join(scratch, 'page.json');
  const oldPage = JSON.stringify({
    schemaVersion: cliJsonSchemaVersion,
    cliVersion,
    command: 'validate',
    status: 'valid',
    error: null,
    result: {
      valid: true,
      diagnosticCount: 0,
      errorCount: 0,
      warningCount: 0,
      page: { cursor: 'old' },
    },
  });
  const newPage = oldPage.replace('"old"', 'null');
  writeFileSync(checkpoint, oldPage);
  writeFileSync(
    join(cliRoot, 'dist/moldea.js'),
    `process.stdout.write(${JSON.stringify(newPage)});`,
  );
  const preloadPath = join(scratch, 'preload.mjs');
  writeFileSync(
    preloadPath,
    `
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { watch, existsSync, writeFileSync } from 'node:fs';
const original = fs.${phase === 'rename' ? 'rename' : 'writeFile'};
fs.${phase === 'rename' ? 'rename' : 'writeFile'} = async (...args) => {
  ${phase === 'write' ? '' : 'const result = await original(...args);'}
  writeFileSync(${JSON.stringify(join(scratch, 'ready'))}, 'ready');
  await new Promise(resolve => {
    const watcher = watch(${JSON.stringify(scratch)}, () => {
      if (existsSync(${JSON.stringify(join(scratch, 'resume'))})) { watcher.close(); resolve(); }
    });
  });
  ${phase === 'write' ? 'return original(...args);' : 'return result;'}
};
process.once('${signal}', () => writeFileSync(${JSON.stringify(join(scratch, 'cancelled'))}, 'cancelled'));
syncBuiltinESMExports();
`,
  );
  const launcher = spawn(
    process.execPath,
    [
      '--import',
      pathToFileURL(preloadPath).href,
      LAUNCHER_PATH,
      '--repository',
      root,
      '--',
      'validate',
      '--json',
      '--max-output-bytes',
      '65536',
      '--cursor-from-response',
      checkpoint,
      '--save-response',
      checkpoint,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let stdout = '';
  let stderr = '';
  launcher.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  launcher.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const completion = new Promise<number | null>((resolveCompletion, rejectCompletion) => {
    launcher.once('error', rejectCompletion);
    launcher.once('close', resolveCompletion);
  });
  const timeout = setTimeout(() => launcher.kill('SIGKILL'), 15_000);
  try {
    await vi.waitFor(() => assert.equal(existsSync(join(scratch, 'ready')), true), {
      timeout: 5000,
    });
    launcher.kill(signal);
    await vi.waitFor(() => assert.equal(existsSync(join(scratch, 'cancelled')), true), {
      timeout: 5000,
    });
    writeFileSync(join(scratch, 'resume'), 'resume');
    assert.equal(await completion, 3);
    assert.equal(stdout, '');
    assert.notEqual(stderr, '');
    assert.equal(readFileSync(checkpoint, 'utf8'), phase === 'rename' ? newPage : oldPage);
    assert.deepEqual((await (await import('node:fs/promises')).readdir(scratch)).sort(), [
      'cancelled',
      'page.json',
      'preload.mjs',
      'ready',
      'resume',
    ]);
  } finally {
    clearTimeout(timeout);
    if (launcher.exitCode === null && launcher.signalCode === null) launcher.kill('SIGKILL');
    await completion;
  }
};

test.skipIf(process.platform === 'win32').each([
  ['SIGINT', 'write'],
  ['SIGTERM', 'write'],
  ['SIGINT', 'commit'],
  ['SIGTERM', 'commit'],
  ['SIGINT', 'rename'],
  ['SIGTERM', 'rename'],
] as const)('cancels capture after child close with %s at %s submission', async (signal, phase) => {
  await runCaptureCancellation(signal, phase);
});

test('captures and continues real paged invalid inspection diagnostics', () => {
  const { root } = createScopeFixture();
  const scratch = mkdtempSync(join(tmpdir(), 'moldea-metadata-'));
  scopeFixtureRoots.push(scratch);
  const checkpoint = join(scratch, 'page.json');
  writeFileSync(
    join(root, 'moldea/moldea.yaml'),
    `version: 1\ncontext:\n${Array.from({ length: 64 }, (_, index) => `  /moldea/context/missing-${index}.md: {}\n`).join('')}`,
  );
  const first = runPage(root, 'inspect', ['--save-response', checkpoint]);
  assert.equal(first.status, 1, first.stderr || first.stdout);
  assert.equal(readFileSync(checkpoint, 'utf8'), first.stdout);
  const envelope = JSON.parse(first.stdout) as {
    result: { page: { cursor: string | null; records: unknown[] } };
  };
  assert.notEqual(envelope.result.page.cursor, null);
  assert.ok(envelope.result.page.records.length > 0);
  const next = runPage(root, 'inspect', [
    '--cursor-from-response',
    checkpoint,
    '--save-response',
    checkpoint,
  ]);
  assert.equal(next.status, 1, next.stderr || next.stdout);
  assert.notEqual(next.stdout, first.stdout);
  assert.equal(readFileSync(checkpoint, 'utf8'), next.stdout);
});

test('suppresses over-limit capture and preserves the previous checkpoint', () => {
  const { root, cliRoot } = createScopeFixture();
  const scratch = mkdtempSync(join(tmpdir(), 'moldea-limit-'));
  scopeFixtureRoots.push(scratch);
  const checkpoint = join(scratch, 'page.json');
  const previous = JSON.stringify({
    schemaVersion: cliJsonSchemaVersion,
    cliVersion,
    command: 'validate',
    status: 'valid',
    error: null,
    result: {
      valid: true,
      diagnosticCount: 0,
      errorCount: 0,
      warningCount: 0,
      page: { cursor: 'old' },
    },
  });
  writeFileSync(checkpoint, previous);
  writeFileSync(join(cliRoot, 'dist/moldea.js'), "process.stdout.write('x'.repeat(5000));");
  const result = runPage(root, 'validate', [
    '--cursor-from-response',
    checkpoint,
    '--save-response',
    checkpoint,
  ]);
  assert.equal(result.status, 3);
  assert.equal(result.stdout, '');
  assert.equal(readFileSync(checkpoint, 'utf8'), previous);
});
