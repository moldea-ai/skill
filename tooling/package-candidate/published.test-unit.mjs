// @vitest-environment node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  downloadPublishedPackageArtifact,
  resolvePublishedPackageClosure,
  resolvePublishedPackageManifest,
} from './published.mjs';

const createMetadata = (name, version, dependencies = {}) => ({
  dependencies,
  dist: {
    integrity: `sha512-${Buffer.from(`${name}@${version}`).toString('base64')}`,
    shasum: 'a'.repeat(40),
    tarball: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz`,
  },
  name,
  preferUnplugged: name === '@moldea.ai/cli' ? true : undefined,
  version,
});

const createRegistryFetch = (metadataByIdentity) => async (url) => {
  const decodedUrl = decodeURIComponent(url);
  const metadata = [...metadataByIdentity.entries()].find(([identity]) =>
    decodedUrl.endsWith(`/${identity}`),
  )?.[1];

  return {
    json: async () => metadata,
    ok: metadata !== undefined,
    status: metadata === undefined ? 404 : 200,
  };
};

test('resolves the exact dependency-first published closure from the CLI', async () => {
  const metadata = new Map([
    [
      '@moldea.ai/cli/4.0.0',
      createMetadata('@moldea.ai/cli', '4.0.0', {
        '@moldea.ai/adapter-example': '1.0.0',
        '@moldea.ai/core': '2.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-example/1.0.0',
      createMetadata('@moldea.ai/adapter-example', '1.0.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    ['@moldea.ai/core/2.0.0', createMetadata('@moldea.ai/core', '2.0.0')],
  ]);

  const closure = await resolvePublishedPackageClosure({
    cliVersion: '4.0.0',
    fetchResource: createRegistryFetch(metadata),
    selectedPackageName: '@moldea.ai/adapter-example',
  });

  assert.deepEqual(
    closure.map(({ name, version }) => `${name}@${version}`),
    ['@moldea.ai/core@2.0.0', '@moldea.ai/adapter-example@1.0.0', '@moldea.ai/cli@4.0.0'],
  );
});

test('resolves one exact external tool package from the canonical registry', async () => {
  const metadata = new Map([['typescript/6.0.3', createMetadata('typescript', '6.0.3')]]);

  const manifest = await resolvePublishedPackageManifest({
    fetchResource: createRegistryFetch(metadata),
    packageName: 'typescript',
    version: '6.0.3',
  });

  assert.equal(manifest.name, 'typescript');
  assert.equal(manifest.version, '6.0.3');
  assert.equal(
    manifest.dist.tarball,
    'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
  );
});

test('downloads one exact artifact only when both registry digests match', async (context) => {
  const artifactDirectory = await mkdtemp(join(tmpdir(), 'moldea-published-artifact-'));
  context.after(async () => rm(artifactDirectory, { force: true, recursive: true }));
  const archive = Buffer.from('fixture archive');
  const manifest = createMetadata('typescript', '6.0.3');
  manifest.dist.integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`;
  manifest.dist.shasum = createHash('sha1').update(archive).digest('hex');
  const fetchResource = async () => ({
    arrayBuffer: async () => archive,
    ok: true,
    status: 200,
  });

  const artifact = await downloadPublishedPackageArtifact({
    artifactDirectory,
    fetchResource,
    manifest,
  });

  assert.equal(artifact.name, 'typescript');
  assert.equal(artifact.sha256, createHash('sha256').update(archive).digest('hex'));
  assert.deepEqual(await readFile(artifact.tarballPath), archive);

  await assert.rejects(
    downloadPublishedPackageArtifact({
      artifactDirectory: join(artifactDirectory, 'invalid'),
      fetchResource,
      manifest: {
        ...manifest,
        dist: { ...manifest.dist, shasum: '0'.repeat(40) },
      },
    }),
    /Registry integrity mismatch/u,
  );
});

test('rejects non-exact CLI pins and unreachable selected packages', async () => {
  const nonExactMetadata = new Map([
    [
      '@moldea.ai/cli/4.0.0',
      createMetadata('@moldea.ai/cli', '4.0.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
  ]);
  await assert.rejects(
    resolvePublishedPackageClosure({
      cliVersion: '4.0.0',
      fetchResource: createRegistryFetch(nonExactMetadata),
      selectedPackageName: '@moldea.ai/core',
    }),
    /must pin @moldea\.ai\/core to an exact version/u,
  );

  const reachableMetadata = new Map([
    ['@moldea.ai/cli/4.0.0', createMetadata('@moldea.ai/cli', '4.0.0')],
  ]);
  await assert.rejects(
    resolvePublishedPackageClosure({
      cliVersion: '4.0.0',
      fetchResource: createRegistryFetch(reachableMetadata),
      selectedPackageName: '@moldea.ai/adapter-example',
    }),
    /is not reachable/u,
  );
});

test('rejects conflicting versions for one package identity', async () => {
  const metadata = new Map([
    [
      '@moldea.ai/cli/4.0.0',
      createMetadata('@moldea.ai/cli', '4.0.0', {
        '@moldea.ai/adapter-a': '1.0.0',
        '@moldea.ai/adapter-b': '1.0.0',
        '@moldea.ai/core': '2.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-a/1.0.0',
      createMetadata('@moldea.ai/adapter-a', '1.0.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-b/1.0.0',
      createMetadata('@moldea.ai/adapter-b', '1.0.0', {
        '@moldea.ai/core': '^3.0.0',
      }),
    ],
    ['@moldea.ai/core/2.0.0', createMetadata('@moldea.ai/core', '2.0.0')],
  ]);

  await assert.rejects(
    resolvePublishedPackageClosure({
      cliVersion: '4.0.0',
      fetchResource: createRegistryFetch(metadata),
      selectedPackageName: '@moldea.ai/adapter-a',
    }),
    /does not satisfy published dependency range \^3\.0\.0/u,
  );
});
