// @vitest-environment node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  createCandidatePackageMetadata,
  registerCandidateArtifact,
  validateCandidateArtifacts,
} from './artifacts.mjs';

/** Builds one dynamic synthetic candidate closure with independent package versions. */
const createArtifacts = () => {
  const manifests = [
    {
      dependencies: {
        '@moldea.ai/adapter-anthropic': '2.0.4',
        '@moldea.ai/adapter-next': '1.0.0',
        '@moldea.ai/core': '2.0.3',
        '@moldea.ai/repository': '1.0.4',
      },
      name: '@moldea.ai/cli',
      preferUnplugged: true,
      version: '3.1.5',
    },
    {
      dependencies: { '@moldea.ai/core': '^2.0.0' },
      name: '@moldea.ai/adapter-anthropic',
      version: '2.0.4',
    },
    {
      dependencies: { '@moldea.ai/core': '^2.0.0' },
      name: '@moldea.ai/adapter-next',
      version: '1.0.0',
    },
    {
      dependencies: { '@moldea.ai/repository': '^1.0.0' },
      name: '@moldea.ai/core',
      version: '2.0.3',
    },
    { name: '@moldea.ai/repository', version: '1.0.4' },
  ];

  return new Map(
    manifests.map((manifest) => {
      const archive = Buffer.from(manifest.name);
      return [
        manifest.name,
        {
          archive,
          archiveName: `${manifest.name.split('/').at(-1)}-${manifest.version}.tgz`,
          manifest,
        },
      ];
    }),
  );
};

test('validates independently versioned packages and newly added CLI adapters', () => {
  const artifacts = createArtifacts();

  assert.deepEqual(validateCandidateArtifacts(artifacts), {
    artifacts,
    cliVersion: '3.1.5',
  });
});

test('accepts an additional reachable selected package root', () => {
  const artifacts = createArtifacts();
  const rootArtifact = {
    archive: Buffer.from('@moldea.ai/adapter-selected'),
    archiveName: 'adapter-selected-1.0.0.tgz',
    manifest: {
      dependencies: { '@moldea.ai/core': '^2.0.0' },
      name: '@moldea.ai/adapter-selected',
      version: '1.0.0',
    },
  };
  artifacts.set(rootArtifact.manifest.name, rootArtifact);

  assert.equal(
    validateCandidateArtifacts(artifacts, ['@moldea.ai/adapter-selected']).cliVersion,
    '3.1.5',
  );
});

test('rejects missing dependencies and incorrect CLI exact pins', () => {
  const incompleteArtifacts = createArtifacts();
  incompleteArtifacts.delete('@moldea.ai/repository');
  assert.throws(
    () => validateCandidateArtifacts(incompleteArtifacts),
    /missing package @moldea\.ai\/repository/,
  );

  const rangedArtifacts = createArtifacts();
  rangedArtifacts.get('@moldea.ai/cli').manifest.dependencies['@moldea.ai/core'] = '^2.0.0';
  assert.throws(
    () => validateCandidateArtifacts(rangedArtifacts),
    /@moldea\.ai\/cli must exact-pin @moldea\.ai\/core/,
  );

  const mismatchedArtifacts = createArtifacts();
  mismatchedArtifacts.get('@moldea.ai/cli').manifest.dependencies['@moldea.ai/core'] = '2.0.2';
  assert.throws(
    () => validateCandidateArtifacts(mismatchedArtifacts),
    /@moldea\.ai\/core must be exact-pinned/,
  );
});

test('rejects duplicate, unexpected, and unreachable candidate identities', () => {
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
        manifest: { ...duplicateArtifact.manifest, name: 'unexpected' },
      }),
    /Unexpected unexpected tarball/,
  );

  const unreachableArtifacts = createArtifacts();
  unreachableArtifacts.set('@moldea.ai/orphan', {
    archive: Buffer.from('orphan'),
    archiveName: 'orphan-1.0.0.tgz',
    manifest: { name: '@moldea.ai/orphan', version: '1.0.0' },
  });
  assert.throws(
    () => validateCandidateArtifacts(unreachableArtifacts),
    /Unreachable candidate artifacts: @moldea\.ai\/orphan/,
  );
});

test('derives registry metadata from each artifact manifest', () => {
  const artifact = createArtifacts().get('@moldea.ai/cli');
  const { archivePath, metadata } = createCandidatePackageMetadata(
    artifact,
    'http://127.0.0.1:4321',
  );

  assert.equal(archivePath, '/@moldea.ai/cli/-/cli-3.1.5.tgz');
  assert.deepEqual(metadata['dist-tags'], { latest: '3.1.5' });
  assert.deepEqual(Object.keys(metadata.versions), ['3.1.5']);
  assert.equal(
    metadata.versions['3.1.5'].dist.integrity,
    `sha512-${createHash('sha512').update(artifact.archive).digest('base64')}`,
  );
  assert.equal(
    metadata.versions['3.1.5'].dist.tarball,
    'http://127.0.0.1:4321/@moldea.ai/cli/-/cli-3.1.5.tgz',
  );
});
