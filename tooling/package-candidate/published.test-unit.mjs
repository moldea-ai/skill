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
  selectPublishedPackageClosure,
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
  if (metadata !== undefined) return new Response(JSON.stringify(metadata));

  const packageName = [...metadataByIdentity.values()].find(({ name }) =>
    decodedUrl.endsWith(`/${name}`),
  )?.name;
  const versions = Object.fromEntries(
    [...metadataByIdentity.values()]
      .filter(({ name }) => name === packageName)
      .map((manifest) => [manifest.version, manifest]),
  );
  const packument = packageName === undefined ? undefined : { name: packageName, versions };

  return new Response(packument === undefined ? null : JSON.stringify(packument), {
    status: packument === undefined ? 404 : 200,
  });
};

test('resolves the newest stable compatible dependency-first closure from the CLI', async () => {
  const metadata = new Map([
    [
      '@moldea.ai/cli/6.0.0',
      createMetadata('@moldea.ai/cli', '6.0.0', {
        '@moldea.ai/adapter-example': '^1.0.0',
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-example/1.0.0',
      createMetadata('@moldea.ai/adapter-example', '1.0.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-example/1.9.0',
      createMetadata('@moldea.ai/adapter-example', '1.9.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    ['@moldea.ai/adapter-example/2.0.0', createMetadata('@moldea.ai/adapter-example', '2.0.0')],
    ['@moldea.ai/core/2.0.0', createMetadata('@moldea.ai/core', '2.0.0')],
    ['@moldea.ai/core/2.8.0', createMetadata('@moldea.ai/core', '2.8.0')],
    ['@moldea.ai/core/3.0.0', createMetadata('@moldea.ai/core', '3.0.0')],
  ]);

  const closure = await resolvePublishedPackageClosure({
    cliVersion: '6.0.0',
    fetchResource: createRegistryFetch(metadata),
    selectedPackageName: '@moldea.ai/adapter-example',
  });

  assert.deepEqual(
    closure.map(({ name, version }) => `${name}@${version}`),
    ['@moldea.ai/core@2.8.0', '@moldea.ai/adapter-example@1.9.0', '@moldea.ai/cli@6.0.0'],
  );
});

test('selects shared CLI packages without retaining sibling adapters', async () => {
  const metadata = new Map([
    [
      '@moldea.ai/cli/6.0.0',
      createMetadata('@moldea.ai/cli', '6.0.0', {
        '@moldea.ai/adapter-selected': '^1.0.0',
        '@moldea.ai/adapter-sibling': '^1.0.0',
        '@moldea.ai/core': '^2.0.0',
        '@moldea.ai/repository': '^1.0.0',
        '@moldea.ai/repository-fs': '^1.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-selected/1.0.0',
      createMetadata('@moldea.ai/adapter-selected', '1.0.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-sibling/1.0.0',
      createMetadata('@moldea.ai/adapter-sibling', '1.0.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    [
      '@moldea.ai/core/2.0.0',
      createMetadata('@moldea.ai/core', '2.0.0', {
        '@moldea.ai/repository': '^1.0.0',
      }),
    ],
    ['@moldea.ai/repository/1.0.0', createMetadata('@moldea.ai/repository', '1.0.0')],
    [
      '@moldea.ai/repository-fs/1.0.0',
      createMetadata('@moldea.ai/repository-fs', '1.0.0', {
        '@moldea.ai/repository': '^1.0.0',
      }),
    ],
  ]);
  const closure = await resolvePublishedPackageClosure({
    cliVersion: '6.0.0',
    fetchResource: createRegistryFetch(metadata),
    selectedPackageName: '@moldea.ai/adapter-selected',
  });

  assert.deepEqual(
    selectPublishedPackageClosure(closure, '@moldea.ai/adapter-selected').map(({ name }) => name),
    [
      '@moldea.ai/repository',
      '@moldea.ai/core',
      '@moldea.ai/adapter-selected',
      '@moldea.ai/repository-fs',
      '@moldea.ai/cli',
    ],
  );
});

test('rejects incomplete and duplicate selected package closures', () => {
  const cliManifest = createMetadata('@moldea.ai/cli', '6.0.0', {
    '@moldea.ai/adapter-selected': '^1.0.0',
    '@moldea.ai/core': '^2.0.0',
  });
  const selectedManifest = createMetadata('@moldea.ai/adapter-selected', '1.0.0', {
    '@moldea.ai/core': '^2.0.0',
  });

  assert.throws(
    () => selectPublishedPackageClosure([cliManifest], '@moldea.ai/adapter-selected'),
    /missing @moldea\.ai\/adapter-selected/u,
  );
  assert.throws(
    () =>
      selectPublishedPackageClosure(
        [cliManifest, selectedManifest, selectedManifest],
        '@moldea.ai/adapter-selected',
      ),
    /duplicate @moldea\.ai\/adapter-selected/u,
  );
  assert.throws(
    () =>
      selectPublishedPackageClosure([cliManifest, selectedManifest], '@moldea.ai/adapter-selected'),
    /missing @moldea\.ai\/core/u,
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

test('accepts exact external prerelease versions without accepting ranges or tags', async () => {
  const metadata = new Map([
    ['@ai-sdk/workflow/2.0.7-beta.1', createMetadata('@ai-sdk/workflow', '2.0.7-beta.1')],
  ]);
  const manifest = await resolvePublishedPackageManifest({
    fetchResource: createRegistryFetch(metadata),
    packageName: '@ai-sdk/workflow',
    version: '2.0.7-beta.1',
  });

  assert.equal(manifest.version, '2.0.7-beta.1');

  for (const version of ['^2.0.7', 'v2.0.7', 'latest']) {
    await assert.rejects(
      resolvePublishedPackageManifest({
        fetchResource: createRegistryFetch(metadata),
        packageName: '@ai-sdk/workflow',
        version,
      }),
      /must be an exact semantic version/u,
    );
  }
});

test('downloads one exact artifact only when both registry digests match', async (context) => {
  const artifactDirectory = await mkdtemp(join(tmpdir(), 'moldea-published-artifact-'));
  context.after(async () => rm(artifactDirectory, { force: true, recursive: true }));
  const archive = Buffer.from('fixture archive');
  const manifest = createMetadata('typescript', '6.0.3');
  manifest.dist.integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`;
  manifest.dist.shasum = createHash('sha1').update(archive).digest('hex');
  const fetchResource = async () => new Response(archive);

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

test('forwards caller cancellation to registry requests', async () => {
  const abortController = new AbortController();
  const request = resolvePublishedPackageManifest({
    fetchResource: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), {
          once: true,
        });
      }),
    packageName: 'typescript',
    signal: abortController.signal,
    version: '6.0.3',
  });
  const cancellation = new Error('Operator cancelled registry acquisition.');

  abortController.abort(cancellation);

  await assert.rejects(request, cancellation);
});

test('times out stalled registry requests', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const request = resolvePublishedPackageManifest({
    fetchResource: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), {
          once: true,
        });
      }),
    packageName: 'typescript',
    version: '6.0.3',
  });

  await Promise.resolve();
  context.mock.timers.tick(300_000);

  await assert.rejects(request, /npm registry request exceeded 300000 milliseconds/u);
});

test('rejects registry bodies that exceed the bounded archive capacity', async (context) => {
  const artifactDirectory = await mkdtemp(join(tmpdir(), 'moldea-published-artifact-bound-'));
  context.after(async () => rm(artifactDirectory, { force: true, recursive: true }));
  const manifest = createMetadata('typescript', '6.0.3');
  const oversizedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(16 * 1024 * 1024 + 1));
      controller.close();
    },
  });

  await assert.rejects(
    downloadPublishedPackageArtifact({
      artifactDirectory,
      fetchResource: async () => new Response(oversizedBody),
      manifest,
    }),
    /npm registry response exceeded 16777216 bytes/u,
  );
});

test('rejects non-compatible CLI ranges and unreachable selected packages', async () => {
  const exactMetadata = new Map([
    [
      '@moldea.ai/cli/6.0.0',
      createMetadata('@moldea.ai/cli', '6.0.0', {
        '@moldea.ai/core': '2.0.0',
      }),
    ],
  ]);
  await assert.rejects(
    resolvePublishedPackageClosure({
      cliVersion: '6.0.0',
      fetchResource: createRegistryFetch(exactMetadata),
      selectedPackageName: '@moldea.ai/core',
    }),
    /must use a compatible-major dependency range/u,
  );

  const reachableMetadata = new Map([
    ['@moldea.ai/cli/6.0.0', createMetadata('@moldea.ai/cli', '6.0.0')],
  ]);
  await assert.rejects(
    resolvePublishedPackageClosure({
      cliVersion: '6.0.0',
      fetchResource: createRegistryFetch(reachableMetadata),
      selectedPackageName: '@moldea.ai/adapter-example',
    }),
    /is not reachable/u,
  );
});

test('rejects conflicting versions for one package identity', async () => {
  const metadata = new Map([
    [
      '@moldea.ai/cli/6.0.0',
      createMetadata('@moldea.ai/cli', '6.0.0', {
        '@moldea.ai/adapter-a': '^1.0.0',
        '@moldea.ai/adapter-b': '^1.0.0',
        '@moldea.ai/core': '^2.0.0',
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
      cliVersion: '6.0.0',
      fetchResource: createRegistryFetch(metadata),
      selectedPackageName: '@moldea.ai/adapter-a',
    }),
    /does not satisfy published dependency range \^3\.0\.0/u,
  );
});

test('rejects a compatible published package dependency cycle', async () => {
  const metadata = new Map([
    [
      '@moldea.ai/cli/6.0.0',
      createMetadata('@moldea.ai/cli', '6.0.0', {
        '@moldea.ai/adapter-example': '^1.0.0',
      }),
    ],
    [
      '@moldea.ai/adapter-example/1.0.0',
      createMetadata('@moldea.ai/adapter-example', '1.0.0', {
        '@moldea.ai/core': '^2.0.0',
      }),
    ],
    [
      '@moldea.ai/core/2.0.0',
      createMetadata('@moldea.ai/core', '2.0.0', {
        '@moldea.ai/adapter-example': '^1.0.0',
      }),
    ],
  ]);

  await assert.rejects(
    resolvePublishedPackageClosure({
      cliVersion: '6.0.0',
      fetchResource: createRegistryFetch(metadata),
      selectedPackageName: '@moldea.ai/adapter-example',
    }),
    /dependency cycle includes @moldea\.ai\/adapter-example@1\.0\.0/u,
  );
});
