// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, test } from 'vitest';

const TEST_NODE_EXECUTABLE = process.env['MOLDEA_TEST_NODE'] ?? process.execPath;
const GATE_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'moldea',
  'scripts',
  'relevance-gate.mjs',
);
const MANAGED_BLOCK = readFileSync(
  resolve(import.meta.dirname, '..', '..', 'moldea', 'assets', 'managed-readme-block.md'),
  'utf8',
);
const temporaryRoots: string[] = [];

const createAdoptedRepository = (): string => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-gate-'));
  temporaryRoots.push(repositoryRoot);
  mkdirSync(join(repositoryRoot, 'moldea'));
  writeFileSync(join(repositoryRoot, 'README.md'), `# Project\n\n${MANAGED_BLOCK}`);
  writeFileSync(join(repositoryRoot, 'moldea', 'project.md'), '# Project\n');
  writeFileSync(
    join(repositoryRoot, 'moldea', 'moldea.yaml'),
    'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/refund.js\n',
  );
  return repositoryRoot;
};

const runGate = (
  repositoryRoot: string,
  paths: string[] | Buffer,
  isAdoptionOnly = false,
): { status: number | null; stderr: string; stdout: string } => {
  const input = Buffer.isBuffer(paths) ? paths : Buffer.from(`${paths.join('\0')}\0`);
  const result = spawnSync(
    TEST_NODE_EXECUTABLE,
    [GATE_PATH, '--repository', repositoryRoot, ...(isAdoptionOnly ? ['--adoption-only'] : [])],
    { encoding: 'utf8', input },
  );
  if (result.error) throw result.error;
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
};

const assertGateResult = (
  repositoryRoot: string,
  paths: string[] | Buffer,
  expected: '0\n' | '1\n',
  isAdoptionOnly = false,
): void => {
  assert.deepEqual(runGate(repositoryRoot, paths, isAdoptionOnly), {
    status: 0,
    stderr: '',
    stdout: expected,
  });
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

test('adoption and exact relationship checks return only two bytes', () => {
  const root = createAdoptedRepository();
  assertGateResult(root, [], '1\n', true);
  assertGateResult(root, ['/src/refund.js'], '1\n');
  assertGateResult(root, ['src/refund.js'], '1\n');
  assertGateResult(root, ['/src/other.js'], '0\n');
  assertGateResult(root, Buffer.alloc(0), '0\n');
});

test.each(['argv', 'stdin'])(
  'normalizes all supported path spellings in %s mode from a nested cwd',
  (mode) => {
    const root = createAdoptedRepository();
    const cwd = join(root, 'nested');
    mkdirSync(cwd);
    for (const path of [
      'src/refund.js',
      '/src/refund.js',
      './src/refund.js',
      join(root, 'src/refund.js'),
    ]) {
      const result = spawnSync(
        TEST_NODE_EXECUTABLE,
        [GATE_PATH, '--repository', root, ...(mode === 'argv' ? ['--path', path] : [])],
        {
          cwd,
          encoding: 'utf8',
          ...(mode === 'stdin' ? { input: Buffer.from(`${path}\0`) } : {}),
          timeout: 5_000,
        },
      );
      assert.ifError(result.error);
      assert.deepEqual(
        { status: result.status, stdout: result.stdout, stderr: result.stderr },
        { status: 0, stdout: '1\n', stderr: '' },
      );
    }
    const outsideSpelling = join(`${root}-other`, 'src/refund.js');
    const miss = spawnSync(
      TEST_NODE_EXECUTABLE,
      [GATE_PATH, '--repository', root, '--diagnose', '--path', outsideSpelling],
      { cwd, encoding: 'utf8', timeout: 5_000 },
    );
    assert.ifError(miss.error);
    if (process.platform === 'win32') {
      assert.equal(miss.status, 1);
      assert.equal(miss.stdout, '');
      assert.notEqual(miss.stderr, '');
    } else {
      assert.equal(miss.status, 0);
      assert.equal(miss.stdout, '0\n');
      assert.equal(miss.stderr, '');
    }
  },
);

test.each(['absent', 'drift', 'markers', 'linked'])(
  'README %s does not control canonical adoption or relationship matching',
  (condition) => {
    const root = createAdoptedRepository();
    const readme = join(root, 'README.md');
    rmSync(readme);
    if (condition === 'drift') writeFileSync(readme, '# Other information\n');
    if (condition === 'markers') writeFileSync(readme, '<!-- moldea:start -->\nbroken');
    if (condition === 'linked') symlinkSync(join(root, 'moldea', 'project.md'), readme);
    assertGateResult(root, [], '1\n', true);
    assertGateResult(root, ['src/refund.js'], '1\n');
  },
);

test('an invalid manifest fails closed without diagnostic leakage', () => {
  const root = createAdoptedRepository();
  writeFileSync(join(root, 'moldea', 'moldea.yaml'), 'version: [\n');
  assertGateResult(root, ['/src/refund.js'], '0\n');
});

test.each(['internal', 'outside'])(
  'rejects a %s canonical directory link in both modes',
  (location) => {
    const root = createAdoptedRepository();
    const outsideRoot = mkdtempSync(join(tmpdir(), 'moldea-gate-outside-'));
    temporaryRoots.push(outsideRoot);
    const targetPath = join(location === 'internal' ? root : outsideRoot, 'canonical');
    renameSync(join(root, 'moldea'), targetPath);
    symlinkSync(
      targetPath,
      join(root, 'moldea'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    assertGateResult(root, [], '0\n', true);
    assertGateResult(root, ['/src/refund.js'], '0\n');
  },
);

test.each(['moldea.yaml', 'project.md'])(
  'rejects a linked canonical file %s in both modes',
  (fileName) => {
    const root = createAdoptedRepository();
    const filePath = join(root, 'moldea', fileName);
    const targetPath = join(root, fileName);
    renameSync(filePath, targetPath);
    symlinkSync(targetPath, filePath);

    assertGateResult(root, [], '0\n', true);
    assertGateResult(root, ['/src/refund.js'], '0\n');
  },
);

test('accepts a repository root reached through a directory link', () => {
  const root = createAdoptedRepository();
  const parent = mkdtempSync(join(tmpdir(), 'moldea-gate-root-'));
  temporaryRoots.push(parent);
  const linkedRoot = join(parent, 'repository');
  symlinkSync(root, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');

  assertGateResult(linkedRoot, [], '1\n', true);
  assertGateResult(linkedRoot, ['/src/refund.js'], '1\n');
  for (const path of [join(root, 'src/refund.js'), join(linkedRoot, 'src/refund.js')]) {
    assertGateResult(linkedRoot, [path], '1\n');
    const result = spawnSync(
      TEST_NODE_EXECUTABLE,
      [GATE_PATH, '--repository', linkedRoot, '--path', path],
      { encoding: 'utf8', timeout: 5_000 },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '1\n');
    assert.equal(result.stderr, '');
  }
});

test('malformed, unsafe, and oversized inputs fail closed', () => {
  const root = createAdoptedRepository();
  for (const paths of [
    Buffer.from('/src/refund.js'),
    Buffer.from('\0/src/refund.js\0'),
    Buffer.from('/src/refund.js\0\0'),
    Buffer.from([0xff, 0]),
    Buffer.from('/src/../refund.js\0'),
    Buffer.from('C:refund.js\0'),
    Buffer.from('\\\\host\\share\0'),
    Buffer.alloc(2_097_153, 0x61),
  ]) {
    assertGateResult(root, paths, '0\n');
  }

  writeFileSync(join(root, 'moldea', 'moldea.yaml'), Buffer.alloc(2_097_153, 0x61));
  assertGateResult(root, ['/src/refund.js'], '0\n');
});

test('new path batches can change relevance without repeating an old scope', () => {
  const root = createAdoptedRepository();
  assertGateResult(root, ['/src/checkout.js'], '0\n');
  assertGateResult(root, ['/src/refund.js'], '1\n');
  assertGateResult(root, ['/src/notes.js'], '0\n');
  assertGateResult(root, ['/src/refund.js', '/src/notes.js'], '1\n');

  writeFileSync(
    join(root, 'moldea', 'moldea.yaml'),
    'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/checkout.js\n',
  );
  assertGateResult(root, ['/src/refund.js'], '0\n');
  assertGateResult(root, ['/src/refund.js', '/src/checkout.js'], '1\n');
});

test('the gate never executes repository dependencies', () => {
  const root = createAdoptedRepository();
  const packageRoot = join(root, 'node_modules', '@moldea.ai', 'core');
  const markerPath = join(root, 'dependency-invoked.txt');
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(
    join(packageRoot, 'package.json'),
    '{"name":"@moldea.ai/core","main":"index.js"}\n',
  );
  writeFileSync(
    join(packageRoot, 'index.js'),
    `require('node:fs').writeFileSync(${JSON.stringify(markerPath)}, 'executed');\n`,
  );

  assertGateResult(root, ['/src/refund.js'], '1\n');
  assert.equal(readFileSync(join(root, 'moldea', 'project.md'), 'utf8'), '# Project\n');
  assert.throws(() => readFileSync(markerPath), /ENOENT/u);
});

test('argv batches use repository-root-relative paths from a nested cwd without stdin', () => {
  const root = createAdoptedRepository();
  mkdirSync(join(root, 'nested'));
  writeFileSync(
    join(root, 'moldea', 'moldea.yaml'),
    'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/éclair plan.js\n',
  );
  for (const cwd of [root, join(root, 'nested')]) {
    const result = spawnSync(
      TEST_NODE_EXECUTABLE,
      [GATE_PATH, '--repository', root, '--path', 'src/other.js', '--path', 'src/éclair plan.js'],
      { cwd, encoding: 'utf8', timeout: 5_000 },
    );
    assert.ifError(result.error);
    assert.equal(result.stdout, '1\n');
    assert.equal(result.stderr, '');
    assert.equal(result.status, 0);
  }
});

test.each([
  ['--path', ''],
  ['--path'],
  ['--path', 'C:refund.js'],
  ['--path', '//host/share'],
  ['--path', 'src/../refund.js'],
  ['--path', 'src/./refund.js'],
  ['--path', './'],
  ['--adoption-only', '--path', 'src/refund.js'],
  ['--unknown'],
  ['--diagnose', '--diagnose'],
  ['--adoption-only', '--adoption-only'],
])('invalid argv %o fails silently or explicitly in diagnostic mode', (...arguments_) => {
  const root = createAdoptedRepository();
  const normal = spawnSync(TEST_NODE_EXECUTABLE, [GATE_PATH, '--repository', root, ...arguments_], {
    encoding: 'utf8',
    timeout: 5_000,
  });
  if (!arguments_.includes('--diagnose')) {
    assert.equal(normal.status, 0);
    assert.equal(normal.stdout, '0\n');
    assert.equal(normal.stderr, '');
  }
  const diagnostic = spawnSync(
    TEST_NODE_EXECUTABLE,
    [GATE_PATH, '--repository', root, '--diagnose', ...arguments_],
    { encoding: 'utf8', timeout: 5_000 },
  );
  assert.equal(diagnostic.status, 1);
  assert.equal(diagnostic.stdout, '');
  assert.match(diagnostic.stderr, /gate failed/u);
});

test('diagnostic misses complete successfully, while unsafe foundation or invalid manifest fails', () => {
  const root = createAdoptedRepository();
  const run = () =>
    spawnSync(
      TEST_NODE_EXECUTABLE,
      [GATE_PATH, '--repository', root, '--diagnose', '--path', 'README.md'],
      { encoding: 'utf8' },
    );
  assert.equal(run().stdout, '0\n');
  assert.equal(run().status, 0);
  writeFileSync(join(root, 'moldea', 'moldea.yaml'), 'version: [\n');
  assert.equal(run().status, 1);
  rmSync(join(root, 'moldea', 'project.md'));
  assert.equal(run().status, 0);
  assert.equal(run().stdout, '0\n');
  mkdirSync(join(root, 'moldea', 'project.md'));
  assert.equal(run().status, 1);
});
