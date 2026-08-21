// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from './constants.mjs';
import { inspectReleaseEvidence } from './evidence.mjs';
import { createSemanticCliIdentity } from './identity.mjs';

const writeFile = (root, relativePath, content) => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
};

const seedReleaseManifests = (root) => {
  writeFile(
    root,
    'package.json',
    `${JSON.stringify({ devDependencies: { '@moldea.ai/cli': '3.3.7' }, version: '3.1.0' })}\n`,
  );
  writeFile(
    root,
    'package-lock.json',
    `${JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { devDependencies: { '@moldea.ai/cli': '3.3.7' }, version: '3.1.0' },
        'node_modules/@moldea.ai/cli': {
          integrity: 'sha512-release-integrity',
          version: '3.3.7',
        },
      },
    })}\n`,
  );
  writeFile(
    root,
    'qualification/profiles/custom/custom/profile.yaml',
    'version: 1\nadapterId: custom\nimplementationId: custom\n',
  );
};

test('release evidence inspection requires fresh passing semantic and qualification results', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-release-evidence-'));

  try {
    seedReleaseManifests(temporaryRoot);
    assert.deepEqual(inspectReleaseEvidence(temporaryRoot), [
      'fixtures/semantic-evaluation-result.json is missing fresh semantic evidence.',
      'qualification/results/custom/custom/latest.json is missing qualification evidence.',
    ]);

    writeFile(
      temporaryRoot,
      'fixtures/semantic-evaluation-result.json',
      `${JSON.stringify({
        cli: createSemanticCliIdentity(temporaryRoot),
        evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
      })}\n`,
    );
    writeFile(
      temporaryRoot,
      'qualification/results/custom/custom/latest.json',
      `${JSON.stringify({ latestStatus: 'passed' })}\n`,
    );

    assert.deepEqual(inspectReleaseEvidence(temporaryRoot), []);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
