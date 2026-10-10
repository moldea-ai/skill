// @vitest-environment node
import { createHash } from 'node:crypto';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import type { IPublishedPackageManifest } from '../../../src/packages/index.ts';

import { loadVerifiedCachedPackage, withCandidateCachePreparation } from './cache.ts';
import type { ICachedCandidatePackage } from './types.ts';

const createBarrier = () => {
  let release = (): void => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, resolve: () => release() };
};

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

  test('concurrent cold-cache workers publish one archive before another worker reads it', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-candidate-cache-'));
    const archivePath = path.join(temporaryRoot, 'package.tgz');
    const firstEntered = createBarrier();
    const releaseFirst = createBarrier();
    let creationCount = 0;
    const prepare = async (): Promise<string> => {
      if (
        await access(archivePath).then(
          () => true,
          () => false,
        )
      ) {
        return readFile(archivePath, 'utf8');
      }
      creationCount += 1;
      firstEntered.resolve();
      await releaseFirst.promise;
      await writeFile(archivePath, 'verified archive', { flag: 'wx' });
      return readFile(archivePath, 'utf8');
    };
    const first = withCandidateCachePreparation(temporaryRoot, prepare);
    await firstEntered.promise;
    const second = withCandidateCachePreparation(temporaryRoot, prepare);
    releaseFirst.resolve();

    expect(await Promise.all([first, second])).toStrictEqual([
      'verified archive',
      'verified archive',
    ]);
    expect(creationCount).toBe(1);
  });

  test('failed preparation releases queued workers and unrelated cache keys remain independent', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-candidate-cache-'));
    const firstEntered = createBarrier();
    const releaseFirst = createBarrier();
    const first = withCandidateCachePreparation(temporaryRoot, async () => {
      firstEntered.resolve();
      await releaseFirst.promise;
      throw new Error('Archive download failed.');
    });
    const rejection = expect(first).rejects.toThrow('Archive download failed.');
    await firstEntered.promise;
    const retry = withCandidateCachePreparation(temporaryRoot, () => Promise.resolve('retried'));

    try {
      expect(
        await withCandidateCachePreparation(path.join(temporaryRoot, 'other'), () =>
          Promise.resolve('other'),
        ),
      ).toBe('other');
    } finally {
      releaseFirst.resolve();
    }

    await rejection;
    expect(await retry).toBe('retried');
    expect(await withCandidateCachePreparation(temporaryRoot, () => Promise.resolve('warm'))).toBe(
      'warm',
    );
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
