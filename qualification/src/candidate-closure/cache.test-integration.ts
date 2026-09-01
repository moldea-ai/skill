// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import type { IPublishedPackageManifest } from '../../../tooling/package-candidate/index.mjs';

import { loadVerifiedCachedPackage } from './cache.ts';
import type { ICachedCandidatePackage } from './types.ts';

const createManifest = (archive: Buffer): IPublishedPackageManifest => ({
  dependencies: {},
  dist: {
    integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}`,
    shasum: createHash('sha1').update(archive).digest('hex'),
    tarball: 'https://registry.npmjs.org/fixture-runtime/-/fixture-runtime-1.0.0.tgz',
  },
  name: 'fixture-runtime',
  optionalDependencies: {},
  version: '1.0.0',
});

const createCachedPackage = (
  archive: Buffer,
  manifest: IPublishedPackageManifest,
): ICachedCandidatePackage => ({
  name: manifest.name,
  registryIntegrity: manifest.dist.integrity,
  registryShasum: manifest.dist.shasum,
  registryTarballUrl: manifest.dist.tarball,
  sha256: createHash('sha256').update(archive).digest('hex'),
  tarballName: 'fixture-runtime-1.0.0.tgz',
  version: manifest.version,
});

describe('candidate package cache', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
      temporaryRoot = null;
    }
  });

  test('accepts only the registry-verified archive at the canonical contained path', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-candidate-cache-'));
    const archive = Buffer.from('official archive');
    const manifest = createManifest(archive);
    const cachedPackage = createCachedPackage(archive, manifest);
    const packageDirectory = path.join(temporaryRoot, 'fixture-runtime');
    await mkdir(packageDirectory);
    await writeFile(path.join(packageDirectory, cachedPackage.tarballName), archive);

    const verifiedPackage = await loadVerifiedCachedPackage({
      cacheDirectory: temporaryRoot,
      cachedPackage,
      manifest,
      relativeDirectory: 'fixture-runtime',
    });

    expect(verifiedPackage).toStrictEqual({
      ...cachedPackage,
      tarballPath: path.join(packageDirectory, cachedPackage.tarballName),
    });
  });

  test('rejects coordinated archive and cached SHA-256 tampering', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-candidate-cache-'));
    const archive = Buffer.from('official archive');
    const tamperedArchive = Buffer.from('tampered archive');
    const manifest = createManifest(archive);
    const cachedPackage = createCachedPackage(tamperedArchive, manifest);
    const packageDirectory = path.join(temporaryRoot, 'fixture-runtime');
    await mkdir(packageDirectory);
    await writeFile(path.join(packageDirectory, cachedPackage.tarballName), tamperedArchive);

    await expect(
      loadVerifiedCachedPackage({
        cacheDirectory: temporaryRoot,
        cachedPackage,
        manifest,
        relativeDirectory: 'fixture-runtime',
      }),
    ).resolves.toBeNull();
  });

  test('rejects a cache-controlled path even when it contains official bytes', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-candidate-cache-'));
    const archive = Buffer.from('official archive');
    const manifest = createManifest(archive);
    const cachedPackage = {
      ...createCachedPackage(archive, manifest),
      tarballName: '../../fixture-runtime-1.0.0.tgz',
    };
    await writeFile(path.join(temporaryRoot, 'fixture-runtime-1.0.0.tgz'), archive);

    await expect(
      loadVerifiedCachedPackage({
        cacheDirectory: temporaryRoot,
        cachedPackage,
        manifest,
        relativeDirectory: 'fixture-runtime',
      }),
    ).resolves.toBeNull();
  });
});
