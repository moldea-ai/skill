// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { QUALIFICATION_EVIDENCE_PROTOCOL_VERSION } from './constants.mjs';
import {
  createReleaseEvidenceSha256,
  MAX_RELEASE_EVIDENCE_REASON_BYTES,
  parseReleaseEvidenceEnvelope,
  serializeReleaseEvidenceEnvelope,
} from './release-evidence-envelope.mjs';

const SHA256 = 'a'.repeat(64);

const createQualificationEvidence = () => ({
  protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
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
});

const createSemanticEvidence = () => ({
  attemptId: '20260905T000000000Z-semantic-12345678',
  attemptSha256: SHA256,
  evidenceSha256: SHA256,
  latestSha256: SHA256,
  protocolVersion: 24,
  resourceStatus: 'passed',
  resultSha256: SHA256,
});

const createFreshEnvelope = () => ({
  qualification: {
    evidence: createQualificationEvidence(),
    mode: 'fresh',
  },
  schemaVersion: 2,
  semantic: {
    evidence: createSemanticEvidence(),
    mode: 'fresh',
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
    () => parseReleaseEvidenceEnvelope(source.replace('  "qualification"', ' "qualification"')),
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

test('requires compact reasoned provenance only on the selected section', () => {
  const semanticEvidence = createSemanticEvidence();
  const pinned = {
    qualification: {
      evidence: createQualificationEvidence(),
      mode: 'fresh',
    },
    schemaVersion: 2,
    semantic: {
      mode: 'pinned',
      reason: 'The package-only fix cannot affect portable skill behavior.',
      source: {
        commit: 'b'.repeat(40),
        evidence: semanticEvidence,
        evidenceSha256: createReleaseEvidenceSha256(JSON.stringify(semanticEvidence)),
        portableSkillSha256: SHA256,
        tag: null,
      },
    },
    target: {
      dependencyClosureSha256: SHA256,
      portableSkillSha256: SHA256,
      version: '6.0.0',
    },
  };
  assert.deepEqual(parseReleaseEvidenceEnvelope(serializeReleaseEvidenceEnvelope(pinned)), pinned);
  assert.throws(
    () =>
      parseReleaseEvidenceEnvelope(
        serializeReleaseEvidenceEnvelope({
          ...pinned,
          semantic: { ...pinned.semantic, reason: '' },
        }),
      ),
    /Pinned evidence reason/,
  );
  assert.throws(
    () =>
      parseReleaseEvidenceEnvelope(
        serializeReleaseEvidenceEnvelope({
          ...pinned,
          semantic: {
            ...pinned.semantic,
            reason: 'r'.repeat(MAX_RELEASE_EVIDENCE_REASON_BYTES + 1),
          },
        }),
      ),
    /Pinned evidence reason/,
  );
});

test('rejects the superseded all-or-nothing schema', () => {
  assert.throws(
    () =>
      parseReleaseEvidenceEnvelope(
        serializeReleaseEvidenceEnvelope({
          mode: 'fresh',
          qualification: createQualificationEvidence(),
          schemaVersion: 1,
          semantic: createSemanticEvidence(),
          target: createFreshEnvelope().target,
        }),
      ),
    /schema 2/,
  );
});

test('selects evidence mode before current-only verification in release scripts and CI', () => {
  const packageManifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  assert.equal(
    packageManifest.scripts['release:check'],
    'npm run managed-readme:check && npm test && node --experimental-strip-types tooling/release-identity/check-release.mjs',
  );
  assert.equal(packageManifest.scripts['release:check'].includes('eval:semantic:verify'), false);
  assert.equal(packageManifest.scripts['release:check'].includes('qualification:verify'), false);
  const workflow = readFileSync(resolve('.github/workflows/conformance.yml'), 'utf8');
  assert.match(workflow, /fetch-depth: 0/u);
  assert.match(workflow, /Check tagged release identity and selected evidence/u);
});
