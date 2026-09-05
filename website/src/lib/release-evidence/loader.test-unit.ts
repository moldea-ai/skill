// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { serializeReleaseEvidenceEnvelope } from '../../../../tooling/release-identity/release-evidence-envelope.mjs';
import { createPortableSkillDigest } from '../../../../tooling/semantic-evaluation/index.mjs';

import { loadReleaseEvidenceModel } from './loader.ts';

const SHA256 = 'a'.repeat(64);
let temporaryRoot: string | null = null;

afterEach(() => {
  if (temporaryRoot !== null) rmSync(temporaryRoot, { force: true, recursive: true });
  temporaryRoot = null;
});

describe('loadReleaseEvidenceModel', () => {
  test('reports an unselected candidate without inventing evidence', () => {
    temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-website-release-evidence-'));
    expect(loadReleaseEvidenceModel(temporaryRoot, '5.0.0')).toStrictEqual({
      mode: 'not-recorded',
      targetVersion: '5.0.0',
    });
  });

  test('loads canonical fresh provenance and rejects a target mismatch', () => {
    const releaseRoot = mkdtempSync(join(tmpdir(), 'moldea-website-release-evidence-'));
    temporaryRoot = releaseRoot;
    mkdirSync(join(releaseRoot, 'fixtures'), { recursive: true });
    mkdirSync(join(releaseRoot, 'moldea'), { recursive: true });
    writeFileSync(join(releaseRoot, 'moldea', 'SKILL.md'), '# test skill\n', 'utf8');
    writeFileSync(
      join(releaseRoot, 'fixtures', 'release-evidence.json'),
      serializeReleaseEvidenceEnvelope({
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
          portableSkillSha256: createPortableSkillDigest(releaseRoot),
          version: '5.0.0',
        },
      }),
      'utf8',
    );

    expect(loadReleaseEvidenceModel(releaseRoot, '5.0.0')).toStrictEqual({
      mode: 'fresh',
      sourceUrl: 'https://github.com/moldea-ai/skill/tree/v5.0.0',
      targetVersion: '5.0.0',
    });
    expect(() => loadReleaseEvidenceModel(releaseRoot, '6.0.0')).toThrow(
      'Public release evidence does not match the current skill version.',
    );
  });
});
