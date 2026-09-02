// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import {
  createCarryForward401Attestation,
  hasCarryForward401Qualification,
  hasLocalCarryForward401Qualification,
  parseCarryForward401Attestation,
} from './carry-forward-4-0-1.mjs';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..');
const PACKAGES_REPOSITORY = resolve(REPOSITORY_ROOT, '..', 'packages');
const HAS_PACKAGES_REPOSITORY = existsSync(join(PACKAGES_REPOSITORY, '.git'));
const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const ATTESTATION_PATH = 'fixtures/release-evidence/carry-forward-4.0.1.json';

const writeJson = (path, input) => {
  writeFileSync(path, `${JSON.stringify(input, null, 2)}\n`, 'utf8');
};

/** Links installed packages into an ignored real directory for one disposable CLI copy. */
const linkInstalledPackages = (sourceDirectory, destinationDirectory) => {
  mkdirSync(destinationDirectory, { recursive: true });

  for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const sourcePath = join(sourceDirectory, entry.name);
    const destinationPath = join(destinationDirectory, entry.name);

    if (entry.name.startsWith('@') && entry.isDirectory()) {
      mkdirSync(destinationPath, { recursive: true });
      for (const packageEntry of readdirSync(sourcePath, { withFileTypes: true })) {
        symlinkSync(
          join(sourcePath, packageEntry.name),
          join(destinationPath, packageEntry.name),
          packageEntry.isDirectory() ? 'dir' : 'file',
        );
      }
      continue;
    }

    symlinkSync(sourcePath, destinationPath, entry.isDirectory() ? 'dir' : 'file');
  }
};

/** Copies only tracked and non-ignored candidate files into one disposable worktree. */
const copyCandidateTree = (destinationRoot) => {
  const result = spawnSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: REPOSITORY_ROOT,
      encoding: null,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error !== undefined || result.status !== 0) {
    throw new Error('Unable to list the candidate files for the bridge fixture.', {
      cause: result.error,
    });
  }

  for (const relativePath of (result.stdout ?? Buffer.alloc(0))
    .toString('utf8')
    .split('\0')
    .filter((candidatePath) => candidatePath !== '')) {
    if (relativePath === ATTESTATION_PATH) continue;
    if (relativePath.split('/').some((component) => EXCLUDED_DIRECTORY_NAMES.has(component))) {
      continue;
    }
    const sourcePath = join(REPOSITORY_ROOT, ...relativePath.split('/'));
    const destinationPath = join(destinationRoot, ...relativePath.split('/'));
    const stats = lstatSync(sourcePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    if (stats.isSymbolicLink()) {
      symlinkSync(readlinkSync(sourcePath), destinationPath);
    } else {
      copyFileSync(sourcePath, destinationPath);
      chmodSync(destinationPath, stats.mode & 0o777);
    }
  }

  writeFileSync(join(destinationRoot, '.git'), `gitdir: ${join(REPOSITORY_ROOT, '.git')}\n`);
};

const setCandidateVersion = (repositoryRoot, version) => {
  const packagePath = join(repositoryRoot, 'package.json');
  const packageLockPath = join(repositoryRoot, 'package-lock.json');
  const packageManifest = JSON.parse(readFileSync(packagePath, 'utf8'));
  const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8'));
  packageManifest.version = version;
  packageLock.version = version;
  packageLock.packages[''].version = version;
  writeJson(packagePath, packageManifest);
  writeJson(packageLockPath, packageLock);
};

test(
  'the exact 4.0.1 bridge proves every immutable envelope without model execution',
  { skip: !HAS_PACKAGES_REPOSITORY, timeout: 240_000 },
  async () => {
    const temporaryParent = mkdtempSync(join(tmpdir(), 'moldea-cf401-test-'));
    const temporaryRoot = join(temporaryParent, 'skill');

    try {
      mkdirSync(temporaryRoot, { recursive: true });
      symlinkSync(PACKAGES_REPOSITORY, join(temporaryParent, 'packages'), 'dir');
      copyCandidateTree(temporaryRoot);
      linkInstalledPackages(
        join(REPOSITORY_ROOT, 'node_modules'),
        join(temporaryRoot, 'node_modules'),
      );
      linkInstalledPackages(
        join(REPOSITORY_ROOT, 'qualification', 'node_modules'),
        join(temporaryRoot, 'qualification', 'node_modules'),
      );
      setCandidateVersion(temporaryRoot, '4.0.1');
      const generation = spawnSync(
        process.execPath,
        [
          '--experimental-strip-types',
          join(temporaryRoot, 'tooling/release-identity/carry-forward-4-0-1.mjs'),
          '--write',
        ],
        {
          cwd: temporaryRoot,
          encoding: 'utf8',
          timeout: 240_000,
        },
      );
      assert.equal(generation.error, undefined);
      assert.equal(generation.status, 0, generation.stderr);
      assert.match(generation.stdout, /Recorded 60 historical qualification envelopes\./u);
      const attestation = parseCarryForward401Attestation(
        JSON.parse(readFileSync(join(temporaryRoot, ...ATTESTATION_PATH.split('/')), 'utf8')),
      );
      const compatibleEnvelopes = attestation.qualification.envelopes.filter(
        ({ isCompatible }) => isCompatible,
      );
      const compatiblePassingEnvelopes = compatibleEnvelopes.filter(
        ({ isCompatible, status }) => isCompatible && status === 'passed',
      );
      const compatibleTargets = new Set(
        compatiblePassingEnvelopes.map(
          ({ selection }) => `${selection.adapterId}/${selection.implementationId}`,
        ),
      );

      assert.equal(attestation.modelRunsPerformed, false);
      assert.equal(attestation.qualification.attemptCount, 60);
      assert.equal(attestation.qualification.envelopes.length, 60);
      assert.equal(attestation.qualification.deletedResults.fileCount, 8_084);
      assert.equal(
        attestation.semantic.semanticCompatibilityDigest,
        attestation.candidate.semanticCompatibilityDigest,
      );
      assert.equal(compatibleEnvelopes.length, 15);
      assert.equal(compatiblePassingEnvelopes.length, 14);
      assert.equal(compatibleTargets.size, 14);
      assert.ok(
        compatiblePassingEnvelopes.every(
          ({ baselineReplay, selection }) =>
            baselineReplay === (selection.adapterId === 'custom' ? 'not-required' : 'passed'),
        ),
      );

      const unexpectedAttemptDirectory = join(
        temporaryRoot,
        'qualification/results/t6/attempts/a-untracked',
      );
      mkdirSync(unexpectedAttemptDirectory, { recursive: true });
      writeFileSync(join(unexpectedAttemptDirectory, 'attempt.json'), '{}\n');
      await assert.rejects(
        createCarryForward401Attestation({
          packagesRepository: PACKAGES_REPOSITORY,
          repositoryRoot: temporaryRoot,
        }),
        /exactly one migrated Custom attempt/u,
      );
      rmSync(join(temporaryRoot, 'qualification/results/t6'), {
        force: true,
        recursive: true,
      });

      const migratedCustomDirectory = join(
        temporaryRoot,
        'qualification/results/t5/attempts/a-dd590aa850b9142da1fdbe85cb1d5b0a',
      );
      const migratedCustomResult = JSON.parse(
        readFileSync(join(migratedCustomDirectory, 'attempt.json'), 'utf8'),
      );
      const migratedCustomStorage = JSON.parse(
        readFileSync(join(migratedCustomDirectory, 'storage.json'), 'utf8'),
      );
      assert.equal(
        hasCarryForward401Qualification(attestation, {
          repositoryRoot: temporaryRoot,
          result: migratedCustomResult,
          storage: migratedCustomStorage,
        }),
        true,
      );
      const attestationPath = join(
        temporaryRoot,
        'fixtures/release-evidence/carry-forward-4.0.1.json',
      );
      mkdirSync(dirname(attestationPath), { recursive: true });
      writeJson(attestationPath, attestation);
      const gitPath = join(temporaryRoot, '.git');
      const unavailableGitPath = join(temporaryRoot, '.git-unavailable');
      renameSync(gitPath, unavailableGitPath);
      try {
        assert.equal(
          hasLocalCarryForward401Qualification({
            repositoryRoot: temporaryRoot,
            result: migratedCustomResult,
            storage: migratedCustomStorage,
          }),
          true,
        );
      } finally {
        renameSync(unavailableGitPath, gitPath);
      }
      const modifiedAttempt = structuredClone(migratedCustomResult);
      modifiedAttempt.summary = `${modifiedAttempt.summary} modified`;
      const modifiedAttemptStorage = structuredClone(migratedCustomStorage);
      modifiedAttemptStorage.attemptDigest = createHash('sha256')
        .update(`${JSON.stringify(modifiedAttempt, null, 2)}\n`)
        .digest('hex');
      assert.notEqual(
        modifiedAttemptStorage.attemptDigest,
        modifiedAttemptStorage.carryForward.sourceAttemptDigest,
      );
      assert.equal(
        hasCarryForward401Qualification(attestation, {
          repositoryRoot: temporaryRoot,
          result: modifiedAttempt,
          storage: modifiedAttemptStorage,
        }),
        false,
      );
      const invalidCompatibilityStorage = structuredClone(migratedCustomStorage);
      invalidCompatibilityStorage.compatibility.qualificationEvaluatorDigest = '0'.repeat(64);
      assert.equal(
        hasCarryForward401Qualification(attestation, {
          repositoryRoot: temporaryRoot,
          result: migratedCustomResult,
          storage: invalidCompatibilityStorage,
        }),
        false,
      );
      const invalidTargetResult = structuredClone(migratedCustomResult);
      invalidTargetResult.provenance.targetDigest = '0'.repeat(64);
      assert.equal(
        hasCarryForward401Qualification(attestation, {
          repositoryRoot: temporaryRoot,
          result: invalidTargetResult,
          storage: migratedCustomStorage,
        }),
        false,
      );
      for (const environmentChange of [
        { codexVersion: 'changed-codex' },
        {
          allowedEgressHosts: [
            ...migratedCustomResult.provenance.allowedEgressHosts,
            'example.com',
          ],
        },
        { hostTimeoutMs: migratedCustomResult.provenance.hostTimeoutMs + 1 },
        {
          modelEndpoint: {
            origin: 'https://example.com',
            sha256: '0'.repeat(64),
          },
        },
        { sslCertificateFileSha256: '0'.repeat(64) },
      ]) {
        const invalidEnvironmentResult = structuredClone(migratedCustomResult);
        Object.assign(invalidEnvironmentResult.provenance, environmentChange);
        assert.equal(
          hasCarryForward401Qualification(attestation, {
            repositoryRoot: temporaryRoot,
            result: invalidEnvironmentResult,
            storage: migratedCustomStorage,
          }),
          false,
        );
      }
      const invalidPackageResult = structuredClone(migratedCustomResult);
      invalidPackageResult.provenance.packages[0].sha256 = '0'.repeat(64);
      assert.equal(
        hasCarryForward401Qualification(attestation, {
          repositoryRoot: temporaryRoot,
          result: invalidPackageResult,
          storage: migratedCustomStorage,
        }),
        false,
      );

      const missingEnvelope = structuredClone(attestation);
      missingEnvelope.qualification.envelopes.pop();
      assert.throws(
        () => parseCarryForward401Attestation(missingEnvelope),
        /exactly 60 envelopes/u,
      );

      const incompatibleSemanticInputs = structuredClone(attestation);
      incompatibleSemanticInputs.candidate.semanticCompatibilityDigest = '0'.repeat(64);
      assert.throws(
        () => parseCarryForward401Attestation(incompatibleSemanticInputs),
        /contradicts candidate semantic inputs/u,
      );

      const protectedChange = structuredClone(attestation);
      protectedChange.changedPaths.push({
        path: 'qualification/src/execution/executor.ts',
        source: null,
        candidate: {
          mode: '100644',
          path: 'qualification/src/execution/executor.ts',
          sha256: '0'.repeat(64),
        },
      });
      assert.throws(
        () => parseCarryForward401Attestation(protectedChange),
        /cannot change protected evaluator input/u,
      );

      setCandidateVersion(temporaryRoot, '4.0.2');
      await assert.rejects(
        createCarryForward401Attestation({
          packagesRepository: PACKAGES_REPOSITORY,
          repositoryRoot: temporaryRoot,
        }),
        /applies only to 4\.0\.1/u,
      );
      setCandidateVersion(temporaryRoot, '4.0.1');

      const executorPath = join(temporaryRoot, 'qualification/src/execution/executor.ts');
      const exactExecutor = readFileSync(executorPath);
      writeFileSync(executorPath, Buffer.concat([exactExecutor, Buffer.from('\n')]));
      await assert.rejects(
        createCarryForward401Attestation({
          packagesRepository: PACKAGES_REPOSITORY,
          repositoryRoot: temporaryRoot,
        }),
        /cannot change protected evaluator input/u,
      );
      writeFileSync(executorPath, exactExecutor);

      writeFileSync(join(temporaryRoot, 'unexpected.txt'), 'unlisted migration input\n');
      await assert.rejects(
        createCarryForward401Attestation({
          packagesRepository: PACKAGES_REPOSITORY,
          repositoryRoot: temporaryRoot,
        }),
        /cannot attest an unlisted migration change/u,
      );
      rmSync(join(temporaryRoot, 'unexpected.txt'));

      renameSync(gitPath, unavailableGitPath);
      try {
        await assert.rejects(
          createCarryForward401Attestation({
            packagesRepository: PACKAGES_REPOSITORY,
            repositoryRoot: temporaryRoot,
          }),
          /Fetch the v4\.0\.0 tag and full history/u,
        );
      } finally {
        renameSync(unavailableGitPath, gitPath);
      }
    } finally {
      rmSync(temporaryParent, { force: true, recursive: true });
    }
  },
);
