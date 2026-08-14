import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const CANDIDATE_PACKAGE_NAMES = [
  '@moldea.ai/cli',
  '@moldea.ai/core',
  '@moldea.ai/repository',
  '@moldea.ai/repository-fs',
];

/**
 * Reads one regular entry from a gzip-compressed USTAR-compatible package archive.
 * @param tarball The complete package archive bytes.
 * @param entryPath The exact archive path to read.
 * @returns The selected entry bytes.
 */
const readTarEntry = (tarball, entryPath) => {
  const archive = gunzipSync(tarball);
  let offset = 0;

  while (offset + 512 <= archive.byteLength) {
    const header = archive.subarray(offset, offset + 512);
    const nameEnd = header.indexOf(0);

    if (nameEnd === 0) break;

    const name = header.subarray(0, nameEnd).toString('utf8');
    const sizeText = header.subarray(124, 136).toString('ascii').replaceAll('\0', '').trim();
    const size = Number.parseInt(sizeText, 8);
    assert.ok(Number.isSafeInteger(size) && size >= 0, `Invalid tar entry size for ${name}.`);
    const contentOffset = offset + 512;

    if (name === entryPath) {
      return archive.subarray(contentOffset, contentOffset + size);
    }

    offset = contentOffset + Math.ceil(size / 512) * 512;
  }

  throw new Error(`The candidate archive is missing ${entryPath}.`);
};

/**
 * Loads and validates the exact four-package CLI candidate closure.
 * @param artifactDirectory The directory containing the packed candidate artifacts.
 * @returns The artifacts keyed by package name.
 */
export const loadCandidateArtifacts = (artifactDirectory) => {
  const artifacts = new Map();

  for (const archiveName of readdirSync(artifactDirectory).filter((name) => name.endsWith('.tgz'))) {
    const archive = readFileSync(join(artifactDirectory, archiveName));
    const manifest = JSON.parse(readTarEntry(archive, 'package/package.json').toString('utf8'));

    assert.ok(CANDIDATE_PACKAGE_NAMES.includes(manifest.name), `Unexpected ${manifest.name} tarball.`);
    assert.equal(manifest.version, '1.0.0');
    assert.equal(artifacts.has(manifest.name), false, `Duplicate ${manifest.name} tarball.`);
    artifacts.set(manifest.name, { archive, archiveName, manifest });
  }

  assert.deepEqual([...artifacts.keys()].sort(), [...CANDIDATE_PACKAGE_NAMES].sort());
  assert.deepEqual(artifacts.get('@moldea.ai/cli').manifest.dependencies, {
    '@moldea.ai/core': '1.0.0',
    '@moldea.ai/repository': '1.0.0',
    '@moldea.ai/repository-fs': '1.0.0',
    semver: '7.8.5',
  });
  assert.equal(artifacts.get('@moldea.ai/cli').manifest.preferUnplugged, true);
  assert.equal(
    artifacts.get('@moldea.ai/core').manifest.dependencies['@moldea.ai/repository'],
    '^1.0.0',
  );
  assert.equal(
    artifacts.get('@moldea.ai/repository-fs').manifest.dependencies['@moldea.ai/repository'],
    '^1.0.0',
  );
  return artifacts;
};

/**
 * Serves actual candidate manifests and tarballs through a loopback scoped registry.
 * @param artifacts The validated candidate artifacts keyed by package name.
 * @returns A promise resolving to the loopback registry URL and server.
 */
export const createCandidateRegistry = async (artifacts) => {
  let registryUrl;
  const archivePaths = new Map();
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, registryUrl).pathname);
    const archive = archivePaths.get(pathname);

    if (archive !== undefined) {
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.end(archive);
      return;
    }

    const packageName = pathname.slice(1);
    const artifact = artifacts.get(packageName);

    if (artifact !== undefined) {
      const archivePath = `/${packageName}/-/${basename(artifact.archiveName)}`;
      archivePaths.set(archivePath, artifact.archive);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          name: packageName,
          'dist-tags': { latest: '1.0.0' },
          // fixed past timestamps remain valid across Yarn metadata-age policies
          time: {
            created: '2025-01-01T00:00:00.000Z',
            modified: '2025-01-01T00:00:00.000Z',
            '1.0.0': '2025-01-01T00:00:00.000Z',
          },
          versions: {
            '1.0.0': {
              ...artifact.manifest,
              dist: {
                integrity: `sha512-${createHash('sha512').update(artifact.archive).digest('base64')}`,
                shasum: createHash('sha1').update(artifact.archive).digest('hex'),
                tarball: `${registryUrl}${archivePath}`,
              },
            },
          },
        }),
      );
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  registryUrl = `http://127.0.0.1:${address.port}`;
  return { registryUrl, server };
};
