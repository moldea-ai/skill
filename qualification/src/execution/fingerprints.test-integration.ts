// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { calculateSha256, ensureDirectory } from '../filesystem/index.ts';
import {
  calculatePackagesQualificationDigest,
  calculateQualificationDigest,
} from './fingerprints.ts';

describe('qualification input fingerprint', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('excludes installed dependencies and public results while retaining source inputs', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-fingerprint-'));
    const sourcePath = path.join(temporaryRoot, 'src', 'runner.ts');
    const dependencyPath = path.join(temporaryRoot, 'node_modules', 'dependency', 'index.js');
    const resultPath = path.join(temporaryRoot, 'results', 'custom', 'latest.json');
    await Promise.all([
      ensureDirectory(path.dirname(sourcePath)),
      ensureDirectory(path.dirname(dependencyPath)),
      ensureDirectory(path.dirname(resultPath)),
    ]);
    await Promise.all([
      writeFile(sourcePath, 'export const version = 1;\n', 'utf8'),
      writeFile(dependencyPath, 'export const dependency = 1;\n', 'utf8'),
      writeFile(resultPath, '{"status":"passed"}\n', 'utf8'),
    ]);
    const digestRoots = [
      {
        pathPrefix: 'qualification',
        rootDirectory: temporaryRoot,
        excludedDirectoryNames: new Set(['node_modules']),
        excludedRelativePathPrefixes: ['results'],
      },
    ];
    const initialDigest = await calculateQualificationDigest(digestRoots);

    await Promise.all([
      writeFile(dependencyPath, 'export const dependency = 2;\n', 'utf8'),
      writeFile(resultPath, '{"status":"failed"}\n', 'utf8'),
    ]);

    expect(await calculateQualificationDigest(digestRoots)).toBe(initialDigest);

    await writeFile(sourcePath, 'export const version = 2;\n', 'utf8');
    expect(await calculateQualificationDigest(digestRoots)).not.toBe(initialDigest);
  });

  test('binds the shared evaluation host and package candidate source into the engine digest', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-engine-'));
    const qualificationPath = path.join(temporaryRoot, 'qualification', 'src', 'executor.ts');
    const hostPath = path.join(temporaryRoot, 'tooling', 'codex-evaluation-host', 'host.mjs');
    const candidatePath = path.join(temporaryRoot, 'tooling', 'package-candidate', 'index.mjs');
    await Promise.all([
      ensureDirectory(path.dirname(qualificationPath)),
      ensureDirectory(path.dirname(hostPath)),
      ensureDirectory(path.dirname(candidatePath)),
    ]);
    await Promise.all([
      writeFile(qualificationPath, 'export const executor = 1;\n', 'utf8'),
      writeFile(hostPath, 'export const host = 1;\n', 'utf8'),
      writeFile(candidatePath, 'export const candidate = 1;\n', 'utf8'),
    ]);
    const digestRoots = [
      {
        pathPrefix: 'qualification',
        rootDirectory: path.join(temporaryRoot, 'qualification'),
      },
      {
        pathPrefix: 'tooling/codex-evaluation-host',
        rootDirectory: path.join(temporaryRoot, 'tooling', 'codex-evaluation-host'),
      },
      {
        pathPrefix: 'tooling/package-candidate',
        rootDirectory: path.join(temporaryRoot, 'tooling', 'package-candidate'),
      },
    ];
    const initialDigest = await calculateQualificationDigest(digestRoots);

    await writeFile(hostPath, 'export const host = 2;\n', 'utf8');
    const changedHostDigest = await calculateQualificationDigest(digestRoots);
    expect(changedHostDigest).not.toBe(initialDigest);

    await writeFile(candidatePath, 'export const candidate = 2;\n', 'utf8');
    expect(await calculateQualificationDigest(digestRoots)).not.toBe(changedHostDigest);
  });

  test('excludes publication metadata while retaining compatibility behavior', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-packages-fingerprint-'));
    const matrixPath = path.join(temporaryRoot, 'compatibility', 'runtimes.yaml');
    await ensureDirectory(path.dirname(matrixPath));
    const repositoryEntries = [
      {
        path: 'compatibility/runtimes.yaml',
        kind: 'file' as const,
        mode: 0o100644,
        sha256: calculateSha256('source matrix'),
      },
      {
        path: 'projects/core/src/index.ts',
        kind: 'file' as const,
        mode: 0o100644,
        sha256: calculateSha256('core source'),
      },
    ];
    await writeFile(
      matrixPath,
      'version: 2\nadapters:\n  custom:\n    targets:\n      - id: custom\n        language: any\n        lastVerifiedAt: 2026-08-20\n        qualificationEvidence:\n          url: https://skill.moldea.ai/qualification/custom/custom/\n',
      'utf8',
    );
    const initialDigest = await calculatePackagesQualificationDigest(
      temporaryRoot,
      repositoryEntries,
    );

    await writeFile(
      matrixPath,
      'version: 2\nadapters:\n  custom:\n    targets:\n      - id: custom\n        language: any\n        lastVerifiedAt: 2026-08-21\n        qualificationEvidence:\n          url: https://skill.moldea.ai/qualification/custom/custom/latest/\n',
      'utf8',
    );
    expect(await calculatePackagesQualificationDigest(temporaryRoot, repositoryEntries)).toBe(
      initialDigest,
    );
    expect(
      await calculatePackagesQualificationDigest(temporaryRoot, [
        repositoryEntries[0]!,
        { ...repositoryEntries[1]!, sha256: calculateSha256('changed core source') },
      ]),
    ).not.toBe(initialDigest);

    await writeFile(
      matrixPath,
      'version: 2\nadapters:\n  custom:\n    targets:\n      - id: custom\n        language: typescript\n        lastVerifiedAt: 2026-08-21\n',
      'utf8',
    );
    expect(await calculatePackagesQualificationDigest(temporaryRoot, repositoryEntries)).not.toBe(
      initialDigest,
    );
  });
});
