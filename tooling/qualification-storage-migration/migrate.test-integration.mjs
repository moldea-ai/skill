import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, test } from 'node:test';

import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
} from '../../qualification/src/contracts/index.ts';
import { calculateQualificationProfileDigest } from '../../qualification/src/execution/fingerprints.ts';
import {
  calculateFileSha256,
  copyDirectory,
  ensureDirectory,
  listDirectoryFiles,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../../qualification/src/filesystem/index.ts';
import { createQualificationAttemptKey } from '../../qualification/src/storage/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../qualification/vitest/evidence-fixture.ts';
import { migrateQualificationStorage } from './migrate.mjs';

const executeFile = promisify(execFile);
const TEST_TARGETS = [{ key: 't1', adapterId: 'custom', implementationId: 'custom' }];
const temporaryDirectories = [];

const runGit = async (repositoryRoot, arguments_) => {
  const { stdout } = await executeFile('git', arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return stdout.trim();
};

const writeFixtureSource = async (repositoryRoot) => {
  const files = new Map([
    [
      'package.json',
      `${JSON.stringify({
        name: 'qualification-storage-fixture',
        version: '4.0.0',
        type: 'module',
        devDependencies: { semver: '7.8.5' },
      })}\n`,
    ],
    [
      'package-lock.json',
      `${JSON.stringify({
        name: 'qualification-storage-fixture',
        version: '4.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: 'qualification-storage-fixture',
            version: '4.0.0',
            devDependencies: { semver: '7.8.5' },
          },
          'node_modules/semver': {
            version: '7.8.5',
            integrity: 'sha512-semver-fixture',
          },
        },
      })}\n`,
    ],
    [
      'qualification/package.json',
      `${JSON.stringify({
        name: 'qualification-fixture',
        version: '0.0.0',
        type: 'module',
        engines: { node: '^24.15.0' },
        scripts: { qualification: 'node src/bin/index.ts' },
        dependencies: { yaml: '2.9.0' },
      })}\n`,
    ],
    [
      'qualification/package-lock.json',
      `${JSON.stringify({
        name: 'qualification-fixture',
        version: '0.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: 'qualification-fixture',
            version: '0.0.0',
            dependencies: { yaml: '2.9.0' },
            engines: { node: '^24.15.0' },
          },
          'node_modules/yaml': {
            version: '2.9.0',
            integrity: 'sha512-yaml-fixture',
          },
        },
      })}\n`,
    ],
    [
      'qualification/cases/cases.yaml',
      [
        'version: 2',
        'cases:',
        '  - id: release-case',
        '    title: Release case',
        '    layer: universal-baseline',
        '    description: Verify complete passing evidence.',
        '    challenge: Exercise the reusable Custom baseline.',
        '',
      ].join('\n'),
    ],
    ['qualification/src/execution/executor.ts', 'export const executorVersion = 1;\n'],
    ['tooling/codex-evaluation-host/host.mjs', 'export const hostVersion = 1;\n'],
    ['tooling/package-candidate/index.mjs', 'export const candidateVersion = 1;\n'],
  ]);

  for (const [relativePath, source] of files) {
    const filePath = path.join(repositoryRoot, relativePath);
    await ensureDirectory(path.dirname(filePath));
    await writeFile(filePath, source, 'utf8');
  }
};

const createSourceRepository = async () => {
  const repositoryRoot = await mkdtemp(
    path.join(os.tmpdir(), 'moldea-storage-migration-repository-'),
  );
  const artifactDirectory = await mkdtemp(
    path.join(os.tmpdir(), 'moldea-storage-migration-artifacts-'),
  );
  temporaryDirectories.push(repositoryRoot, artifactDirectory);
  await writeFixtureSource(repositoryRoot);
  const resultsRoot = path.join(repositoryRoot, 'qualification', 'results');
  const fixtureResult = await seedPassingQualificationEvidenceFixture({
    artifactDirectory,
    attemptId: 'custom-source-attempt',
    resultsRoot,
  });
  const profilesRoot = path.join(repositoryRoot, 'qualification', 'profiles');
  const shortProfileRoot = path.join(profilesRoot, 't1');
  const expandedProfileRoot = path.join(profilesRoot, 'custom', 'custom');
  await ensureDirectory(path.dirname(expandedProfileRoot));
  await rename(shortProfileRoot, expandedProfileRoot);
  await rm(path.join(profilesRoot, 'index.yaml'));
  const shortCaseRoot = path.join(expandedProfileRoot, 'cases', 'c1');
  const expandedCaseRoot = path.join(expandedProfileRoot, 'projects', 'release-case');
  await ensureDirectory(path.dirname(expandedCaseRoot));
  await rename(shortCaseRoot, expandedCaseRoot);
  await rm(path.join(expandedProfileRoot, 'cases'), { recursive: true });
  const profilePath = path.join(expandedProfileRoot, 'profile.yaml');
  await writeFile(
    profilePath,
    (await readFile(profilePath, 'utf8')).replace(
      '    projectDirectory: cases/c1',
      '    projectDirectory: projects/release-case',
    ),
    'utf8',
  );

  await runGit(repositoryRoot, ['init', '--initial-branch=main']);
  await runGit(repositoryRoot, ['add', '-A']);
  await runGit(repositoryRoot, [
    '-c',
    'commit.gpgsign=false',
    '-c',
    'user.name=moldea qualification',
    '-c',
    'user.email=qualification@moldea.local',
    'commit',
    '-m',
    'test: seed qualification inputs',
  ]);
  const qualificationRepositoryCommit = await runGit(repositoryRoot, ['rev-parse', 'HEAD']);
  const artifactPaths = await listDirectoryFiles(artifactDirectory);
  const artifactDigests = Object.fromEntries(
    await Promise.all(
      artifactPaths.map(async (artifactPath) => [
        artifactPath,
        await calculateFileSha256(path.join(artifactDirectory, artifactPath)),
      ]),
    ),
  );
  const result = QualificationAttemptResultSchema.parse({
    ...fixtureResult,
    provenance: {
      ...fixtureResult.provenance,
      qualificationRepositoryCommit,
      profileDigest: await calculateQualificationProfileDigest(expandedProfileRoot),
    },
    artifactDigests,
  });
  const attemptDirectory = path.join(resultsRoot, 'custom', 'custom', 'attempts', result.attemptId);
  await copyDirectory(artifactDirectory, attemptDirectory);
  await writeJsonFileAtomically(path.join(attemptDirectory, 'attempt.json'), result);
  await writeJsonFileAtomically(
    path.join(resultsRoot, 'custom', 'custom', 'latest.json'),
    QualificationLatestResultSchema.parse({
      protocolVersion: 6,
      adapterId: 'custom',
      implementationId: 'custom',
      latestAttemptId: result.attemptId,
      latestStatus: 'passed',
      lastPassingAttemptId: result.attemptId,
      updatedAt: '2026-09-01T00:00:00.000Z',
    }),
  );
  await runGit(repositoryRoot, ['add', '-A']);
  await runGit(repositoryRoot, [
    '-c',
    'commit.gpgsign=false',
    '-c',
    'user.name=moldea qualification',
    '-c',
    'user.email=qualification@moldea.local',
    'commit',
    '-m',
    'test: seed qualification evidence',
  ]);
  const sourceCommit = await runGit(repositoryRoot, ['rev-parse', 'HEAD']);
  await runGit(repositoryRoot, ['tag', 'v4.0.0']);

  return { artifactDirectory, repositoryRoot, result, sourceCommit };
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directoryPath) => rm(directoryPath, { force: true, recursive: true })),
  );
});

test('migrates once and then verifies an exact idempotent no-op', async () => {
  const fixture = await createSourceRepository();
  const options = {
    repositoryRoot: fixture.repositoryRoot,
    expectedSourceCommit: fixture.sourceCommit,
    targets: TEST_TARGETS,
  };

  assert.deepEqual(await migrateQualificationStorage(options), {
    sourceCommit: fixture.sourceCommit,
    status: 'migrated',
  });
  assert.equal(
    await readFile(
      path.join(fixture.repositoryRoot, 'qualification', 'profiles', 't1', 'profile.yaml'),
      'utf8',
    ).then((source) => source.includes('projectDirectory: cases/c1')),
    true,
  );
  assert.equal(
    await accessPath(
      path.join(fixture.repositoryRoot, 'qualification', 'profiles', 'custom', 'custom'),
    ),
    false,
  );
  assert.deepEqual(await migrateQualificationStorage(options), {
    sourceCommit: fixture.sourceCommit,
    status: 'already-migrated',
  });
});

test('rejects migrated storage whose compatibility identity no longer matches its source', async () => {
  const fixture = await createSourceRepository();
  const options = {
    repositoryRoot: fixture.repositoryRoot,
    expectedSourceCommit: fixture.sourceCommit,
    targets: TEST_TARGETS,
  };
  await migrateQualificationStorage(options);
  const storagePath = path.join(
    fixture.repositoryRoot,
    'qualification',
    'results',
    't1',
    'attempts',
    createQualificationAttemptKey(fixture.result.attemptId),
    'storage.json',
  );
  const storage = JSON.parse(await readFile(storagePath, 'utf8'));
  storage.compatibility.qualificationLogicalInputDigest = 'f'.repeat(64);
  await writeJsonFileAtomically(storagePath, storage);

  await assert.rejects(
    migrateQualificationStorage(options),
    /storage lacks its exact carry-forward source binding/u,
  );
});

test('rejects source tampering and missing or mismatched artifacts without deleting source paths', async () => {
  for (const failureKind of ['profile-tamper', 'missing-artifact', 'digest-mismatch']) {
    const fixture = await createSourceRepository();
    const expandedProfileRoot = path.join(
      fixture.repositoryRoot,
      'qualification',
      'profiles',
      'custom',
      'custom',
    );
    const artifactPath = path.join(
      fixture.repositoryRoot,
      'qualification',
      'results',
      'custom',
      'custom',
      'attempts',
      fixture.result.attemptId,
      'coverage.json',
    );

    if (failureKind === 'profile-tamper') {
      await writeTextFileAtomically(
        path.join(expandedProfileRoot, 'unexpected.md'),
        'Uncommitted input.\n',
      );
    } else if (failureKind === 'missing-artifact') {
      await unlink(artifactPath);
    } else {
      await writeFile(artifactPath, 'tampered\n', 'utf8');
    }

    await assert.rejects(
      migrateQualificationStorage({
        repositoryRoot: fixture.repositoryRoot,
        expectedSourceCommit: fixture.sourceCommit,
        targets: TEST_TARGETS,
      }),
      /do not match the immutable source release/u,
    );
    assert.equal(await accessPath(expandedProfileRoot), true);
  }
});

test('rejects target-key collisions and traversal before deleting expanded source', async () => {
  for (const targets of [
    [
      { key: 't1', adapterId: 'custom', implementationId: 'custom' },
      { key: 't2', adapterId: 'custom', implementationId: 'custom' },
    ],
    [{ key: '../escape', adapterId: 'custom', implementationId: 'custom' }],
  ]) {
    const fixture = await createSourceRepository();
    const expandedProfileRoot = path.join(
      fixture.repositoryRoot,
      'qualification',
      'profiles',
      'custom',
      'custom',
    );
    await assert.rejects(
      migrateQualificationStorage({
        repositoryRoot: fixture.repositoryRoot,
        expectedSourceCommit: fixture.sourceCommit,
        targets,
      }),
    );
    assert.equal(await accessPath(expandedProfileRoot), true);
  }
});

const accessPath = async (candidatePath) => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};
