// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import {
  MAX_RELEASE_EVIDENCE_REASON_BYTES,
  parseReleaseEvidenceEnvelope,
  serializeReleaseEvidenceEnvelope,
} from './release-evidence-envelope.mjs';

const SHA256 = 'a'.repeat(64);

const createFreshEnvelope = () => ({
  mode: 'fresh',
  qualification: {
    protocolVersion: 7,
    resourceStatus: 'passed',
    targets: [
      {
        adapterId: 'custom',
        attemptId: 'qualification-attempt',
        attemptKey: 'a-0123456789abcdef0123456789abcdef',
        attemptSha256: SHA256,
        implementationId: 'custom',
        key: 't1',
        latestSha256: SHA256,
        storageSha256: SHA256,
      },
    ],
  },
  schemaVersion: 1,
  semantic: {
    attemptId: '20260905T000000000Z-semantic-12345678',
    attemptSha256: SHA256,
    evidenceSha256: SHA256,
    latestSha256: SHA256,
    protocolVersion: 23,
    resourceStatus: 'passed',
    resultSha256: SHA256,
  },
  target: {
    dependencyClosureSha256: SHA256,
    portableSkillSha256: SHA256,
    version: '5.0.0',
  },
});

test('round-trips only canonical strict fresh evidence', () => {
  const source = serializeReleaseEvidenceEnvelope(createFreshEnvelope());
  assert.deepEqual(parseReleaseEvidenceEnvelope(source), createFreshEnvelope());
  assert.throws(
    () => parseReleaseEvidenceEnvelope(source.replace('  "mode"', ' "mode"')),
    /canonical JSON serialization/,
  );
  assert.throws(
    () =>
      parseReleaseEvidenceEnvelope(
        serializeReleaseEvidenceEnvelope({ ...createFreshEnvelope(), unsupported: true }),
      ),
    /unsupported field inventory/,
  );
});

test('requires compact reasoned pinned provenance', () => {
  const pinned = {
    mode: 'pinned',
    reason: 'The CLI-only fix cannot affect portable skill behavior.',
    schemaVersion: 1,
    source: {
      commit: 'b'.repeat(40),
      evidenceSha256: SHA256,
      qualificationSha256: SHA256,
      semanticSha256: SHA256,
      tag: 'v5.0.0',
    },
    target: {
      portableSkillSha256: SHA256,
      version: '6.0.0',
    },
  };
  assert.deepEqual(parseReleaseEvidenceEnvelope(serializeReleaseEvidenceEnvelope(pinned)), pinned);
  assert.throws(
    () => parseReleaseEvidenceEnvelope(serializeReleaseEvidenceEnvelope({ ...pinned, reason: '' })),
    /Pinned evidence reason/,
  );
  assert.throws(
    () =>
      parseReleaseEvidenceEnvelope(
        serializeReleaseEvidenceEnvelope({
          ...pinned,
          reason: 'r'.repeat(MAX_RELEASE_EVIDENCE_REASON_BYTES + 1),
        }),
      ),
    /Pinned evidence reason/,
  );
});

test('selects evidence mode before current-only verification in release scripts and CI', () => {
  const packageManifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(
    packageManifest.scripts['release:check'],
    'npm test && node --experimental-strip-types tooling/release-identity/check-release.mjs',
  );
  assert.equal(packageManifest.scripts['release:check'].includes('eval:semantic:verify'), false);
  assert.equal(packageManifest.scripts['release:check'].includes('qualification:verify'), false);
  const workflow = readFileSync(resolve('.github/workflows/conformance.yml'), 'utf8');
  assert.match(workflow, /fetch-depth: 0/u);
  assert.match(workflow, /Check tagged release identity and selected evidence/u);
});
