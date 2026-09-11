import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { createSemanticInputDigest } from './semantic-inputs.mjs';

const temporaryRoots = [];

const createRepository = () => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-semantic-inputs-'));
  temporaryRoots.push(repositoryRoot);
  for (const relativePath of [
    'fixtures/conformance-cases.json',
    'fixtures/semantic-evaluation-coverage.json',
    'tests/semantic-evaluation-runner.mjs',
    'tooling/codex-evaluation-host/index.mjs',
    'tooling/release-identity/constants.mjs',
    'tooling/release-identity/identity.mjs',
    'tooling/resource-calibration/profiles.mjs',
    'tooling/semantic-evaluation/index.mjs',
  ]) {
    const absolutePath = join(repositoryRoot, ...relativePath.split('/'));
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, `${relativePath}\n`);
  }
  return repositoryRoot;
};

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('every semantic behavior input invalidates the semantic input digest', () => {
  for (const relativePath of [
    'fixtures/conformance-cases.json',
    'fixtures/semantic-evaluation-coverage.json',
    'tests/semantic-evaluation-runner.mjs',
    'tooling/codex-evaluation-host/index.mjs',
    'tooling/release-identity/constants.mjs',
    'tooling/release-identity/identity.mjs',
    'tooling/resource-calibration/profiles.mjs',
    'tooling/semantic-evaluation/index.mjs',
  ]) {
    const repositoryRoot = createRepository();
    const originalDigest = createSemanticInputDigest(repositoryRoot);
    writeFileSync(join(repositoryRoot, ...relativePath.split('/')), 'changed\n');
    assert.notEqual(createSemanticInputDigest(repositoryRoot), originalDigest);
  }
});

test('production additions invalidate while tests, declarations, and excluded context do not', () => {
  const repositoryRoot = createRepository();
  const originalDigest = createSemanticInputDigest(repositoryRoot);
  const semanticRoot = join(repositoryRoot, 'tooling/semantic-evaluation');
  writeFileSync(join(semanticRoot, 'new.test-unit.mjs'), 'test\n');
  writeFileSync(join(semanticRoot, 'new.test-e2e.mjs'), 'test\n');
  writeFileSync(join(semanticRoot, 'new.test-bench.mjs'), 'test\n');
  writeFileSync(join(semanticRoot, 'index.d.mts'), 'declaration\n');
  mkdirSync(join(semanticRoot, '_archive'), { recursive: true });
  writeFileSync(join(semanticRoot, '_archive', 'ignored.mjs'), 'ignored\n');
  assert.equal(createSemanticInputDigest(repositoryRoot), originalDigest);

  writeFileSync(join(semanticRoot, 'new-input.mjs'), 'production\n');
  assert.notEqual(createSemanticInputDigest(repositoryRoot), originalDigest);
});

test('rejects links and other unsupported semantic input path types', () => {
  const repositoryRoot = createRepository();
  symlinkSync('index.mjs', join(repositoryRoot, 'tooling/semantic-evaluation/linked.mjs'));
  assert.throws(() => createSemanticInputDigest(repositoryRoot), /unsupported path type/u);
});
