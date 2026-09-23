// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, test } from 'vitest';

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
    process.execPath,
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

test('a damaged README or manifest fails closed without a diagnostic leak', () => {
  const root = createAdoptedRepository();
  const readmePath = join(root, 'README.md');
  const originalReadme = readFileSync(readmePath, 'utf8');
  writeFileSync(
    readmePath,
    originalReadme.replace('<!-- moldea:start -->\n\n', '<!-- moldea:start -->\n'),
  );
  assertGateResult(root, ['/src/refund.js'], '0\n');
  assertGateResult(root, [], '0\n', true);

  writeFileSync(readmePath, originalReadme);
  writeFileSync(join(root, 'moldea', 'moldea.yaml'), 'version: [\n');
  assertGateResult(root, ['/src/refund.js'], '0\n');
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
