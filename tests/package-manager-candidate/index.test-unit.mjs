// @vitest-environment node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  createCandidatePackageMetadata,
  registerCandidateArtifact,
  validateCandidateArtifacts,
} from './index.mjs';

const PACKAGE_NAMES = [
  '@moldea.ai/cli',
  '@moldea.ai/core',
  '@moldea.ai/repository',
  '@moldea.ai/repository-fs',
];

/** Builds one complete synthetic candidate closure with independently configurable versions. */
const createArtifacts = (
  versions = {
    '@moldea.ai/cli': '1.0.1',
    '@moldea.ai/core': '1.0.1',
    '@moldea.ai/repository': '1.0.1',
    '@moldea.ai/repository-fs': '1.0.1',
  },
) =>
  new Map(
    PACKAGE_NAMES.map((packageName) => {
      const archive = Buffer.from(packageName);
      const manifest = {
        name: packageName,
        version: versions[packageName],
      };

      if (packageName === '@moldea.ai/cli') {
        manifest.dependencies = {
          '@moldea.ai/core': versions['@moldea.ai/core'],
          '@moldea.ai/repository': versions['@moldea.ai/repository'],
          '@moldea.ai/repository-fs': versions['@moldea.ai/repository-fs'],
          semver: '7.8.5',
        };
        manifest.preferUnplugged = true;
      }

      return [
        packageName,
        {
          archive,
          archiveName: `${packageName.split('/').at(-1)}-${versions[packageName]}.tgz`,
          manifest,
        },
      ];
    }),
  );

test('validates the current published package composition', () => {
  const artifacts = createArtifacts();

  assert.deepEqual(validateCandidateArtifacts(artifacts), {
    artifacts,
    cliVersion: '1.0.1',
  });
});

test('supports independently versioned candidate packages', () => {
  const artifacts = createArtifacts({
    '@moldea.ai/cli': '1.0.5',
    '@moldea.ai/core': '1.0.3',
    '@moldea.ai/repository': '1.0.2',
    '@moldea.ai/repository-fs': '1.0.4',
  });

  assert.equal(validateCandidateArtifacts(artifacts).cliVersion, '1.0.5');
});

test('rejects incomplete and mismatched candidate closures', () => {
  const incompleteArtifacts = createArtifacts();
  incompleteArtifacts.delete('@moldea.ai/repository-fs');
  assert.throws(() => validateCandidateArtifacts(incompleteArtifacts));

  const mismatchedArtifacts = createArtifacts();
  mismatchedArtifacts.get('@moldea.ai/cli').manifest.dependencies['@moldea.ai/core'] = '1.0.0';
  assert.throws(
    () => validateCandidateArtifacts(mismatchedArtifacts),
    /@moldea\.ai\/core must be exact-pinned/,
  );
});

test('rejects duplicate and unexpected candidate identities', () => {
  const artifacts = createArtifacts();
  const duplicateArtifact = artifacts.get('@moldea.ai/cli');

  assert.throws(
    () => registerCandidateArtifact(artifacts, duplicateArtifact),
    /Duplicate @moldea\.ai\/cli tarball/,
  );
  assert.throws(
    () =>
      registerCandidateArtifact(new Map(), {
        ...duplicateArtifact,
        manifest: { ...duplicateArtifact.manifest, name: '@moldea.ai/unexpected' },
      }),
    /Unexpected @moldea\.ai\/unexpected tarball/,
  );
});

test('derives registry metadata from each artifact manifest', () => {
  const artifact = createArtifacts().get('@moldea.ai/cli');
  const { archivePath, metadata } = createCandidatePackageMetadata(
    artifact,
    'http://127.0.0.1:4321',
  );

  assert.equal(archivePath, '/@moldea.ai/cli/-/cli-1.0.1.tgz');
  assert.deepEqual(metadata['dist-tags'], { latest: '1.0.1' });
  assert.deepEqual(Object.keys(metadata.versions), ['1.0.1']);
  assert.equal(
    metadata.versions['1.0.1'].dist.integrity,
    `sha512-${createHash('sha512').update(artifact.archive).digest('base64')}`,
  );
  assert.equal(
    metadata.versions['1.0.1'].dist.tarball,
    'http://127.0.0.1:4321/@moldea.ai/cli/-/cli-1.0.1.tgz',
  );
});
