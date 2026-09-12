// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { serializeReleaseEvidenceEnvelope } from '../../../../tooling/release-identity/release-evidence-envelope.mjs';
import { createDependencyClosureSha256 } from '../../../../tooling/release-identity/release-evidence-current.mjs';
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
      join(releaseRoot, 'package.json'),
      `${JSON.stringify({
        devDependencies: { '@moldea.ai/cli': '8.0.0' },
        moldeaRelease: { cliJsonSchemaVersion: 4, coreVersionRange: '^4.0.1' },
        name: '@moldea.ai/skill-conformance',
        version: '5.0.0',
      })}\n`,
      'utf8',
    );
    writeFileSync(
      join(releaseRoot, 'package-lock.json'),
      `${JSON.stringify({
        lockfileVersion: 3,
        name: '@moldea.ai/skill-conformance',
        packages: {
          '': {
            devDependencies: { '@moldea.ai/cli': '8.0.0' },
            name: '@moldea.ai/skill-conformance',
            version: '5.0.0',
          },
          'node_modules/@moldea.ai/cli': {
            dependencies: { '@moldea.ai/core': '^4.0.0' },
            integrity: 'sha512-cli',
            version: '8.0.0',
          },
          'node_modules/@moldea.ai/core': {
            integrity: 'sha512-core',
            version: '4.0.1',
          },
        },
        version: '5.0.0',
      })}\n`,
      'utf8',
    );
    writeFileSync(
      join(releaseRoot, 'fixtures', 'release-evidence.json'),
      serializeReleaseEvidenceEnvelope({
        qualification: {
          evidence: {
            protocolVersion: 10,
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
          mode: 'fresh',
        },
        schemaVersion: 2,
        semantic: {
          evidence: {
            attemptId: '20260905T000000000Z-semantic-12345678',
            attemptSha256: SHA256,
            evidenceSha256: SHA256,
            latestSha256: SHA256,
            protocolVersion: 24,
            resourceStatus: 'passed',
            resultSha256: SHA256,
          },
          mode: 'fresh',
        },
        target: {
          dependencyClosureSha256: createDependencyClosureSha256(releaseRoot),
          portableSkillSha256: createPortableSkillDigest(releaseRoot),
          version: '5.0.0',
        },
      }),
      'utf8',
    );

    expect(loadReleaseEvidenceModel(releaseRoot, '5.0.0')).toStrictEqual({
      mode: 'recorded',
      qualification: {
        mode: 'fresh',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v5.0.0',
      },
      semantic: {
        mode: 'fresh',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v5.0.0',
      },
      targetVersion: '5.0.0',
    });
    expect(() => loadReleaseEvidenceModel(releaseRoot, '6.0.0')).toThrow(
      'Public release evidence does not match the current skill version.',
    );
    writeFileSync(join(releaseRoot, 'moldea', 'SKILL.md'), '# drifted test skill\n', 'utf8');
    expect(() => loadReleaseEvidenceModel(releaseRoot, '5.0.0')).toThrow(
      'Public release evidence does not match the current portable skill bytes.',
    );
  });
});
