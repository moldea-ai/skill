#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
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
import { dirname, isAbsolute, join, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

import {
  CandidatePackageSchema,
  QualificationAttemptResultSchema,
  QualificationExecutionEnvironmentSchema,
  QualificationLatestResultSchema,
  QualificationProfileSchema,
  QualificationSelectionSchema,
} from '../../qualification/src/contracts/index.ts';
import { loadRuntimeCompatibilityMatrix } from '../../qualification/src/compatibility/index.ts';
import { RuntimeCompatibilityMatrixSchema } from '../../qualification/src/compatibility/types.ts';
import {
  createQualificationCompatibilityIdentity,
  createQualificationCompatibilityIdentityAtCommit,
  isQualificationEvaluatorSourcePath,
  QualificationCompatibilityIdentitySchema,
} from '../../qualification/src/evidence-identity/index.ts';
import {
  calculateQualificationExecutionDigest,
  calculateQualificationProfileDigest,
  calculateQualificationTargetDigest,
} from '../../qualification/src/execution/fingerprints.ts';
import {
  calculateDirectoryFingerprint,
  calculateSha256,
} from '../../qualification/src/filesystem/index.ts';
import { validateQualificationAttemptEvidence } from '../../qualification/src/result/evidence.ts';
import {
  createQualificationAttemptKey,
  createQualificationAttemptStorage,
  QualificationAttemptStorageSchema,
  resolveQualificationArtifactPath,
} from '../../qualification/src/storage/index.ts';
import {
  createCliClosureDigest,
  createPortableSkillArtifactDigest,
  createPortableSkillBehaviorDigest,
  createSemanticCompatibilityDigest,
} from '../evidence-identity/index.mjs';
import { parseStableVersion } from './identity.mjs';

// immutable source and one-version bridge identity
export const CARRY_FORWARD_401_SCHEMA_VERSION = 1;
export const CARRY_FORWARD_401_SOURCE_COMMIT = 'fcbc34f60b12b1b66cd9ebb28b1865979a259429';
export const CARRY_FORWARD_401_SOURCE_RELEASE = 'v4.0.0';
export const CARRY_FORWARD_401_TARGET_RELEASE = '4.0.1';
export const CARRY_FORWARD_401_PATH = 'fixtures/release-evidence/carry-forward-4.0.1.json';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const GIT_MODE_PATTERN = /^(?:100644|100755|120000)$/u;
const SOURCE_RESULTS_PREFIX = 'qualification/results/';
const ATTESTATION_PATH = CARRY_FORWARD_401_PATH;
const MAX_GIT_OUTPUT_BYTES = 512 * 1024 * 1024;
const MAX_GIT_BLOB_BYTES = 64 * 1024 * 1024;
const MAX_MATERIALIZED_PATH_LENGTH = 160;
const MAX_PATH_COMPONENT_LENGTH = 64;
const HISTORICAL_REGULAR_MODE = 0o100664;
const HISTORICAL_EXECUTABLE_MODE = 0o100755;
const HISTORICAL_SYMLINK_MODE = 0o120777;
const LEGACY_GLOBAL_FINGERPRINT_BLOB = 'f8d87134acbeb9d1551dee12ceeab9685141cf35';
const MAX_GIT_TREE_ENTRY_COUNT = 16_384;
const CARRY_FORWARD_ATTESTATION_ID_PATTERN = /^v4\.0\.0-(?:custom|qualification)-[a-f0-9]{64}$/u;
const RecordedCandidatePackageSchema = CandidatePackageSchema.omit({
  tarballPath: true,
});

// reviewed non-result surfaces that the one-time migration may change
const ALLOWED_CHANGED_FILES = new Set([
  '.gitignore',
  '.github/workflows/conformance.yml',
  '.github/workflows/release-candidate.yml',
  'README.md',
  'docs/adapter-qualification.md',
  'docs/getting-started.md',
  'docs/semantic-evaluation.md',
  'fixtures/semantic-evaluation-results/README.md',
  'moldea/SKILL.md',
  'moldea/references/local-tooling.md',
  'package-lock.json',
  'package.json',
  'qualification/README.md',
  'qualification/src/cli/runner.ts',
  'qualification/src/compatibility/loader.ts',
  'qualification/src/result/contract-reader.ts',
  'qualification/src/result/evidence.ts',
  'qualification/src/result/index.ts',
  'qualification/src/result/recorder.ts',
  'website/scripts/generate-qualification-current-e2e-fixture.ts',
]);
const ALLOWED_CHANGED_PREFIXES = [
  'coding-agent-planning/',
  'qualification/profiles/',
  'qualification/src/baseline/',
  'qualification/src/evidence-identity/',
  'qualification/src/storage/',
  'tooling/evidence-identity/',
  'tooling/path-portability/',
  'tooling/qualification-storage-migration/',
  'tooling/release-identity/',
  'website/src/lib/qualification/',
  'website/src/pages/evidence/',
];

const sha256 = (content) => createHash('sha256').update(content).digest('hex');

const normalizeCompatibilityInput = (input) => {
  if (Array.isArray(input)) return input.map(normalizeCompatibilityInput);
  if (input === null || typeof input !== 'object') return input;
  return Object.fromEntries(
    Object.entries(input)
      .filter(([fieldName]) => !['lastVerifiedAt', 'qualificationEvidence'].includes(fieldName))
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([fieldName, fieldValue]) => [fieldName, normalizeCompatibilityInput(fieldValue)]),
  );
};

const calculateLegacyTargetDigest = (adapter, target) =>
  sha256(`${JSON.stringify(normalizeCompatibilityInput({ adapter, target }))}\n`);

const normalizeJson = (input) => `${JSON.stringify(input, null, 2)}\n`;

const hasExcludedDirectory = (relativePath) =>
  relativePath.split('/').some((component) => EXCLUDED_DIRECTORY_NAMES.has(component));

const assertSafeHistoricalPath = (relativePath) => {
  if (
    relativePath === '' ||
    relativePath.includes('\0') ||
    relativePath.startsWith('/') ||
    win32.isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath
      .split('/')
      .some((component) => component === '' || component === '.' || component === '..')
  ) {
    throw new Error(`Historical Git path is not a contained POSIX path: ${relativePath}`);
  }
  if (hasExcludedDirectory(relativePath)) {
    throw new Error(`Historical Git path enters an excluded directory: ${relativePath}`);
  }
};

const assertPortableMaterializedPath = (relativePath) => {
  assertSafeHistoricalPath(relativePath);
  const components = relativePath.split('/');
  const invalidComponent = components.find(
    (component) => component.length > MAX_PATH_COMPONENT_LENGTH,
  );
  if (invalidComponent !== undefined || relativePath.length > MAX_MATERIALIZED_PATH_LENGTH) {
    throw new Error(
      `Historical source input exceeds the portable temporary path budget: ${relativePath}`,
    );
  }
};

const runGit = (repositoryRoot, arguments_, input) => {
  const result = spawnSync('git', arguments_, {
    cwd: repositoryRoot,
    encoding: null,
    input,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    windowsHide: true,
  });
  if (result.error !== undefined || result.status !== 0) {
    const detail = result.stderr?.toString('utf8').trim();
    throw new Error(
      `Git ${arguments_[0] ?? 'command'} failed${detail === '' || detail === undefined ? '.' : `: ${detail}`}`,
      result.error === undefined ? undefined : { cause: result.error },
    );
  }
  return result.stdout ?? Buffer.alloc(0);
};

const resolveSourceReleaseCommit = (repositoryRoot, operation) => {
  let resolvedSourceCommit;
  try {
    resolvedSourceCommit = runGit(repositoryRoot, [
      'rev-parse',
      `${CARRY_FORWARD_401_SOURCE_RELEASE}^{commit}`,
    ])
      .toString('utf8')
      .trim();
  } catch (error) {
    throw new Error(
      `Cannot ${operation} without immutable ${CARRY_FORWARD_401_SOURCE_RELEASE} history. Fetch the v4.0.0 tag and full history, then retry.`,
      { cause: error },
    );
  }
  if (resolvedSourceCommit !== CARRY_FORWARD_401_SOURCE_COMMIT) {
    throw new Error(
      `${CARRY_FORWARD_401_SOURCE_RELEASE} must resolve to ${CARRY_FORWARD_401_SOURCE_COMMIT}. Fetch the immutable v4.0.0 tag and full history before ${operation}.`,
    );
  }
};

const parseGitTree = (source) =>
  source
    .toString('utf8')
    .split('\0')
    .filter((record) => record !== '')
    .map((record) => {
      const separator = record.indexOf('\t');
      const [mode, objectType, objectId] = record.slice(0, separator).split(' ');
      const path = record.slice(separator + 1);
      if (
        separator === -1 ||
        !GIT_MODE_PATTERN.test(mode) ||
        objectType !== 'blob' ||
        !COMMIT_PATTERN.test(objectId) ||
        path === ''
      ) {
        throw new Error('Historical Git tree contains an unsupported entry.');
      }
      assertSafeHistoricalPath(path);
      return { mode, objectId, path };
    });

const listGitTree = (repositoryRoot, commit, pathPrefixes = []) => {
  if (!COMMIT_PATTERN.test(commit)) {
    throw new Error('Historical evidence requires one exact Git commit.');
  }
  const entries = parseGitTree(
    runGit(repositoryRoot, [
      'ls-tree',
      '-r',
      '-z',
      commit,
      ...(pathPrefixes.length === 0 ? [] : ['--', ...pathPrefixes]),
    ]),
  );
  if (entries.length > MAX_GIT_TREE_ENTRY_COUNT) {
    throw new Error('Historical Git tree exceeds the supported entry count.');
  }
  return entries;
};

const parseBatchBlobs = (source, requestedObjectIds) => {
  const blobs = new Map();
  let offset = 0;

  for (const expectedObjectId of requestedObjectIds) {
    const headerEnd = source.indexOf(0x0a, offset);
    if (headerEnd === -1) throw new Error('Git batch output ended before its object header.');
    const [objectId, objectType, sizeSource] = source
      .subarray(offset, headerEnd)
      .toString('utf8')
      .split(' ');
    const size = Number.parseInt(sizeSource ?? '', 10);
    if (
      objectId !== expectedObjectId ||
      objectType !== 'blob' ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > MAX_GIT_BLOB_BYTES
    ) {
      throw new Error(`Git batch output contradicted object ${expectedObjectId}.`);
    }
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (contentEnd >= source.length || source[contentEnd] !== 0x0a) {
      throw new Error(`Git batch output truncated object ${expectedObjectId}.`);
    }
    blobs.set(objectId, source.subarray(contentStart, contentEnd));
    offset = contentEnd + 1;
  }

  if (offset !== source.length) throw new Error('Git batch output contains trailing bytes.');
  return blobs;
};

const readGitBlobs = (repositoryRoot, entries) => {
  const objectIds = [...new Set(entries.map(({ objectId }) => objectId))];
  const blobs = new Map();

  for (let index = 0; index < objectIds.length; index += 128) {
    const batch = objectIds.slice(index, index + 128);
    const input = Buffer.from(`${batch.join('\n')}\n`);
    const output = runGit(repositoryRoot, ['cat-file', '--batch'], input);
    for (const [objectId, content] of parseBatchBlobs(output, batch)) {
      blobs.set(objectId, content);
    }
  }

  return blobs;
};

const readGitBlob = (repositoryRoot, commit, relativePath) => {
  assertSafeHistoricalPath(relativePath);
  const content = runGit(repositoryRoot, ['cat-file', 'blob', `${commit}:${relativePath}`]);
  if (content.byteLength > MAX_GIT_BLOB_BYTES) {
    throw new Error(`Historical Git blob exceeds the supported size: ${relativePath}`);
  }
  return content;
};

const materializeGitEntries = (repositoryRoot, entries, destinationRoot, mapPath) => {
  const blobs = readGitBlobs(repositoryRoot, entries);

  for (const entry of entries) {
    const destinationRelativePath = mapPath(entry.path);
    assertPortableMaterializedPath(destinationRelativePath);
    const destinationPath = join(destinationRoot, ...destinationRelativePath.split('/'));
    const content = blobs.get(entry.objectId);
    if (content === undefined) throw new Error(`Git object is missing: ${entry.objectId}`);
    mkdirSync(dirname(destinationPath), { recursive: true });

    if (entry.mode === '120000') {
      const target = content.toString('utf8');
      const resolvedTarget = resolve(dirname(destinationPath), target);
      const targetRelativePath = relative(destinationRoot, resolvedTarget);
      if (
        target.includes('\0') ||
        target.includes('\\') ||
        isAbsolute(target) ||
        win32.isAbsolute(target) ||
        targetRelativePath === '' ||
        targetRelativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
        targetRelativePath === '..' ||
        isAbsolute(targetRelativePath)
      ) {
        throw new Error(`Historical symlink escapes its temporary root: ${entry.path}`);
      }
      symlinkSync(target, destinationPath);
      continue;
    }

    writeFileSync(destinationPath, content);
    chmodSync(destinationPath, entry.mode === '100755' ? 0o755 : 0o664);
  }
};

const createHistoricalFingerprint = (entries) => {
  const fingerprintEntries = entries
    .map(({ mode, objectId, path }) => ({
      path,
      kind: mode === '120000' ? 'symlink' : 'file',
      mode:
        mode === '120000'
          ? HISTORICAL_SYMLINK_MODE
          : mode === '100755'
            ? HISTORICAL_EXECUTABLE_MODE
            : HISTORICAL_REGULAR_MODE,
      sha256: objectId,
    }))
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));

  return fingerprintEntries;
};

const calculateLegacyQualificationDigest = (repositoryRoot, commit) => {
  const entries = listGitTree(repositoryRoot, commit, [
    'qualification',
    'tooling/codex-evaluation-host',
    'tooling/package-candidate',
  ]).filter(
    ({ path }) =>
      !path.startsWith('qualification/results/') && !path.split('/').includes('node_modules'),
  );
  const blobs = readGitBlobs(repositoryRoot, entries);
  const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
  const fingerprintEntries = createHistoricalFingerprint(entries).map((entry) => {
    const sourceEntry = entriesByPath.get(entry.path);
    const content = sourceEntry === undefined ? undefined : blobs.get(sourceEntry.objectId);
    if (content === undefined) throw new Error(`Legacy source input is missing: ${entry.path}`);
    return { ...entry, sha256: sha256(content) };
  });
  return calculateSha256(`${JSON.stringify(fingerprintEntries)}\n`);
};

const createGitContentEntries = (entries, blobs) =>
  entries
    .map(({ mode, objectId, path }) => {
      const content = blobs.get(objectId);
      if (content === undefined) throw new Error(`Git object is missing: ${objectId}`);
      return { mode, path, sha256: sha256(content) };
    })
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));

const readCandidateEntries = (repositoryRoot) => {
  const relativePaths = runGit(repositoryRoot, [
    'ls-files',
    '-z',
    '--cached',
    '--others',
    '--exclude-standard',
  ])
    .toString('utf8')
    .split('\0')
    .filter((candidatePath) => candidatePath !== '')
    .sort((left, right) => left.localeCompare(right, 'en'));
  const entries = [];

  for (const candidatePath of relativePaths) {
    assertSafeHistoricalPath(candidatePath);
    if (candidatePath === ATTESTATION_PATH) continue;
    const absolutePath = join(repositoryRoot, ...candidatePath.split('/'));
    let stats;
    try {
      stats = lstatSync(absolutePath);
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    if (!stats.isFile() && !stats.isSymbolicLink()) {
      throw new Error(`Candidate inventory contains an unsupported path: ${candidatePath}`);
    }
    if (stats.size > MAX_GIT_BLOB_BYTES) {
      throw new Error(`Candidate inventory contains an oversized file: ${candidatePath}`);
    }
    entries.push({
      mode: stats.isSymbolicLink() ? '120000' : (stats.mode & 0o111) === 0 ? '100644' : '100755',
      path: candidatePath,
      sha256: sha256(
        stats.isSymbolicLink() ? readlinkSync(absolutePath) : readFileSync(absolutePath),
      ),
    });
  }

  return entries;
};

const createChangedPathInventory = (repositoryRoot) => {
  const sourceEntries = listGitTree(repositoryRoot, CARRY_FORWARD_401_SOURCE_COMMIT).filter(
    ({ path }) => !path.startsWith(SOURCE_RESULTS_PREFIX) && path !== ATTESTATION_PATH,
  );
  const sourceBlobs = readGitBlobs(repositoryRoot, sourceEntries);
  const sourceByPath = new Map(
    createGitContentEntries(sourceEntries, sourceBlobs).map((entry) => [entry.path, entry]),
  );
  const candidateByPath = new Map(
    readCandidateEntries(repositoryRoot)
      .filter(({ path }) => !path.startsWith(SOURCE_RESULTS_PREFIX))
      .map((entry) => [entry.path, entry]),
  );
  return [...new Set([...sourceByPath.keys(), ...candidateByPath.keys()])]
    .sort((left, right) => left.localeCompare(right, 'en'))
    .flatMap((path) => {
      const source = sourceByPath.get(path) ?? null;
      const candidate = candidateByPath.get(path) ?? null;
      return JSON.stringify(source) === JSON.stringify(candidate)
        ? []
        : [{ path, source, candidate }];
    });
};

const assertProtectedSourceIdentity = (changedPaths) => {
  const protectedPaths = changedPaths.filter(
    ({ path }) =>
      isQualificationEvaluatorSourcePath(path) ||
      path === 'tests/semantic-evaluation-runner.mjs' ||
      path === 'fixtures/conformance-cases.json' ||
      path === 'fixtures/semantic-evaluation-coverage.json' ||
      path.startsWith('tooling/semantic-evaluation/') ||
      path.startsWith('tooling/codex-evaluation-host/') ||
      path.startsWith('tooling/package-candidate/'),
  );
  if (protectedPaths.length > 0) {
    throw new Error(
      `The 4.0.1 bridge cannot change protected evaluator input: ${protectedPaths[0].path}`,
    );
  }
  const unlistedChange = changedPaths.find(
    ({ path }) =>
      !path.includes('.test-') &&
      !path.startsWith('qualification/vitest/') &&
      !ALLOWED_CHANGED_FILES.has(path) &&
      !ALLOWED_CHANGED_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
  if (unlistedChange !== undefined) {
    throw new Error(
      `The 4.0.1 bridge cannot attest an unlisted migration change: ${unlistedChange.path}`,
    );
  }
};

const createSourceSemanticEnvelope = async (repositoryRoot) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'mc401-sem-'));
  const prefixes = [
    'package.json',
    'package-lock.json',
    'moldea',
    'fixtures/conformance-cases.json',
    'fixtures/semantic-evaluation-coverage.json',
    'fixtures/semantic-evaluation-result.json',
    'fixtures/semantic-evaluation-results',
    'tests/semantic-evaluation-runner.mjs',
    'tooling/codex-evaluation-host',
    'tooling/release-identity/constants.mjs',
    'tooling/release-identity/identity.mjs',
    'tooling/semantic-evaluation',
  ];

  try {
    const entries = listGitTree(repositoryRoot, CARRY_FORWARD_401_SOURCE_COMMIT, prefixes);
    materializeGitEntries(repositoryRoot, entries, temporaryRoot, (sourcePath) => sourcePath);
    const { inspectSemanticEvidence } = await import('./evidence.mjs');
    const issues = inspectSemanticEvidence(temporaryRoot);
    if (issues.length > 0) {
      throw new Error(`Immutable v4.0.0 semantic evidence is invalid: ${issues.join(' ')}`);
    }
    const latest = JSON.parse(
      readFileSync(join(temporaryRoot, 'fixtures/semantic-evaluation-results/latest.json'), 'utf8'),
    );
    const attemptRelativePath = `fixtures/semantic-evaluation-results/attempts/${latest.lastPassingAttemptId}/attempt.json`;
    const evidenceRelativePath = `fixtures/semantic-evaluation-results/attempts/${latest.lastPassingAttemptId}/evidence.json`;
    const attemptSource = readFileSync(join(temporaryRoot, ...attemptRelativePath.split('/')));
    const evidenceSource = readFileSync(join(temporaryRoot, ...evidenceRelativePath.split('/')));
    const attempt = JSON.parse(attemptSource.toString('utf8'));
    const sourceLock = readFileSync(join(temporaryRoot, 'package-lock.json'));
    if (attempt.cli?.packageLockSha256 !== sha256(sourceLock)) {
      throw new Error('The source semantic attempt does not match its exact whole lockfile.');
    }

    return {
      attemptId: attempt.attemptId,
      attemptSha256: sha256(attemptSource),
      evidenceSha256: sha256(evidenceSource),
      resultSha256: sha256(
        readFileSync(join(temporaryRoot, 'fixtures/semantic-evaluation-result.json')),
      ),
      artifactDigest: attempt.artifactDigest,
      sourceLockSha256: sha256(sourceLock),
      cliClosureDigest: createCliClosureDigest(temporaryRoot),
      portableSkillArtifactDigest: createPortableSkillArtifactDigest(temporaryRoot),
      portableSkillBehaviorDigest: createPortableSkillBehaviorDigest(temporaryRoot),
      semanticCompatibilityDigest: createSemanticCompatibilityDigest(temporaryRoot),
    };
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

const createSourceQualificationIdentities = async (repositoryRoot, attempts) => {
  const attemptsByCommit = new Map();

  for (const attempt of attempts) {
    const commit = attempt.result.provenance.qualificationRepositoryCommit;
    const commitAttempts = attemptsByCommit.get(commit) ?? [];
    commitAttempts.push(attempt);
    attemptsByCommit.set(commit, commitAttempts);
  }
  const identities = new Map();

  for (const [commit, commitAttempts] of attemptsByCommit) {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'mc401-qual-'));
    try {
      const selections = [
        ...new Map(
          commitAttempts.map(({ result }) => [
            `${result.selection.adapterId}/${result.selection.implementationId}`,
            result.selection,
          ]),
        ).values(),
      ];
      const commonPrefixes = [
        'package.json',
        'package-lock.json',
        'moldea',
        'qualification/package.json',
        'qualification/package-lock.json',
        'qualification/cases/cases.yaml',
        'qualification/src',
        'tooling/codex-evaluation-host',
        'tooling/package-candidate',
      ];
      const profileMappings = selections.map((selection, index) => ({
        destination: `profiles/p${index + 1}`,
        selection,
        source: `qualification/profiles/${selection.adapterId}/${selection.implementationId}`,
      }));
      const entries = listGitTree(repositoryRoot, commit, [
        ...commonPrefixes,
        ...profileMappings.map(({ source }) => source),
      ]);
      const fingerprintEntry = entries.find(
        ({ path }) => path === 'qualification/src/execution/fingerprints.ts',
      );
      const usesLegacyGlobalFingerprint =
        fingerprintEntry?.objectId === LEGACY_GLOBAL_FINGERPRINT_BLOB;
      materializeGitEntries(repositoryRoot, entries, temporaryRoot, (sourcePath) => {
        const profileMapping = profileMappings.find(
          ({ source }) => sourcePath === source || sourcePath.startsWith(`${source}/`),
        );
        return profileMapping === undefined
          ? sourcePath
          : `${profileMapping.destination}${sourcePath.slice(profileMapping.source.length)}`;
      });
      const portableSkillBehaviorDigest = createPortableSkillBehaviorDigest(temporaryRoot);
      const cliClosureDigest = createCliClosureDigest(temporaryRoot);
      const skillRepositoryFingerprint = await calculateDirectoryFingerprint(
        join(temporaryRoot, 'moldea'),
      );
      const legacyQualificationDigest = usesLegacyGlobalFingerprint
        ? calculateLegacyQualificationDigest(repositoryRoot, commit)
        : null;

      for (const profileMapping of profileMappings) {
        const selectionKey = `${profileMapping.selection.adapterId}/${profileMapping.selection.implementationId}`;
        const profileDirectory = join(temporaryRoot, ...profileMapping.destination.split('/'));
        const matchingAttempt = commitAttempts.find(
          ({ result }) =>
            result.selection.adapterId === profileMapping.selection.adapterId &&
            result.selection.implementationId === profileMapping.selection.implementationId,
        );
        if (matchingAttempt === undefined) {
          throw new Error(`Historical source grouping lost selection ${selectionKey}.`);
        }
        const profile = QualificationProfileSchema.parse(
          parseYaml(readFileSync(join(profileDirectory, 'profile.yaml'), 'utf8')),
        );
        const caseIds = profile.cases.map(({ id }) => id);
        const [compatibility, profileDigest, qualificationDigest] = await Promise.all([
          createQualificationCompatibilityIdentityAtCommit({
            commit,
            repositoryRoot,
            selection: profileMapping.selection,
          }),
          usesLegacyGlobalFingerprint
            ? calculateDirectoryFingerprint(profileDirectory)
            : calculateQualificationProfileDigest(profileDirectory),
          usesLegacyGlobalFingerprint
            ? legacyQualificationDigest
            : calculateQualificationExecutionDigest({
                caseIds,
                profileDirectory,
                roots: {
                  evaluationHostRoot: join(temporaryRoot, 'tooling/codex-evaluation-host'),
                  packageCandidateRoot: join(temporaryRoot, 'tooling/package-candidate'),
                  qualificationRoot: join(temporaryRoot, 'qualification'),
                  repositoryRoot: temporaryRoot,
                },
              }),
        ]);
        identities.set(`${commit}/${selectionKey}`, {
          cliClosureDigest,
          compatibility,
          exactFingerprintKind: usesLegacyGlobalFingerprint ? 'legacy-global' : 'scoped',
          portableSkillBehaviorDigest,
          profileDigest,
          qualificationDigest,
          skillRepositoryFingerprint,
        });
      }
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  }

  return identities;
};

const createPackagesSourceIdentities = (packagesRepository, attempts) => {
  const commits = [
    ...new Set(attempts.map(({ result }) => result.provenance.packagesRepositoryCommit)),
  ];
  const identities = new Map();

  for (const commit of commits) {
    const entries = listGitTree(packagesRepository, commit);
    const blobs = readGitBlobs(packagesRepository, entries);
    const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
    const fingerprintEntries = createHistoricalFingerprint(entries).map((entry) => {
      const sourceEntry = entriesByPath.get(entry.path);
      const content = sourceEntry === undefined ? undefined : blobs.get(sourceEntry.objectId);
      if (content === undefined) throw new Error(`Packages source ${commit} has a missing blob.`);
      return { ...entry, sha256: sha256(content) };
    });
    const matrixEntry = entries.find(({ path }) => path === 'compatibility/runtimes.yaml');
    if (matrixEntry === undefined) {
      throw new Error(`Packages source ${commit} lacks compatibility/runtimes.yaml.`);
    }
    const matrixSource = blobs.get(matrixEntry.objectId);
    if (matrixSource === undefined)
      throw new Error(`Packages source ${commit} lacks its matrix blob.`);
    identities.set(commit, {
      fingerprint: calculateSha256(`${JSON.stringify(fingerprintEntries)}\n`),
      matrix: RuntimeCompatibilityMatrixSchema.parse(parseYaml(matrixSource.toString('utf8'))),
    });
  }

  return identities;
};

const createEnvironment = (provenance) => ({
  model: provenance.model,
  reasoningEffort: provenance.reasoningEffort,
  codexVersion: provenance.codexVersion,
  nodeVersion: provenance.nodeVersion,
  pnpmVersion: provenance.pnpmVersion,
  gitVersion: provenance.gitVersion,
  allowedEgressHosts: provenance.allowedEgressHosts,
  hostTimeoutMs: provenance.hostTimeoutMs,
  modelEndpoint: provenance.modelEndpoint,
  sslCertificateFileSha256: provenance.sslCertificateFileSha256,
});

/*
 * Historical adapter retries could increase only their host timeout. Replay still requires the
 * exact model, toolchain, network, endpoint, and TLS identities plus no lower adapter timeout.
 */
const hasCompatibleHistoricalBaselineEnvironment = (baseline, adapter) =>
  baseline.model === adapter.model &&
  baseline.reasoningEffort === adapter.reasoningEffort &&
  baseline.codexVersion === adapter.codexVersion &&
  baseline.nodeVersion === adapter.nodeVersion &&
  baseline.pnpmVersion === adapter.pnpmVersion &&
  baseline.gitVersion === adapter.gitVersion &&
  hasSameJsonIdentity(baseline.allowedEgressHosts, adapter.allowedEgressHosts) &&
  baseline.hostTimeoutMs <= adapter.hostTimeoutMs &&
  hasSameJsonIdentity(baseline.modelEndpoint, adapter.modelEndpoint) &&
  baseline.sslCertificateFileSha256 === adapter.sslCertificateFileSha256;

const sortPackages = (packages) =>
  [...packages].sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'));

const createQualificationSourceAttempts = (repositoryRoot) => {
  const resultEntries = listGitTree(repositoryRoot, CARRY_FORWARD_401_SOURCE_COMMIT, [
    'qualification/results',
  ]);
  const blobs = readGitBlobs(repositoryRoot, resultEntries);
  const attemptEntries = resultEntries.filter(({ path }) => path.endsWith('/attempt.json'));
  if (attemptEntries.length !== 60) {
    throw new Error(
      `The immutable v4.0.0 tree must contain exactly 60 attempts, found ${attemptEntries.length}.`,
    );
  }
  const attempts = attemptEntries.map((entry) => {
    const source = blobs.get(entry.objectId);
    if (source === undefined) throw new Error(`Historical attempt blob is missing: ${entry.path}`);
    const result = QualificationAttemptResultSchema.parse(JSON.parse(source.toString('utf8')));
    const expectedSuffix = `/${result.selection.adapterId}/${result.selection.implementationId}/attempts/${result.attemptId}/attempt.json`;
    if (!entry.path.endsWith(expectedSuffix)) {
      throw new Error(`Historical attempt path contradicts ${result.attemptId}.`);
    }
    return { entry, result, source };
  });
  const accountedPaths = new Set();

  for (const attempt of attempts) {
    const attemptRoot = attempt.entry.path.slice(0, -'/attempt.json'.length);
    accountedPaths.add(attempt.entry.path);
    for (const [logicalPath, expectedDigest] of Object.entries(attempt.result.artifactDigests)) {
      const artifactPath = `${attemptRoot}/${logicalPath}`;
      const artifactEntry = resultEntries.find(({ path }) => path === artifactPath);
      const artifactSource =
        artifactEntry === undefined ? undefined : blobs.get(artifactEntry.objectId);
      if (
        artifactEntry === undefined ||
        artifactSource === undefined ||
        sha256(artifactSource) !== expectedDigest
      ) {
        throw new Error(
          `Historical attempt ${attempt.result.attemptId} has invalid artifact ${logicalPath}.`,
        );
      }
      accountedPaths.add(artifactPath);
    }
  }
  const selections = new Map(
    attempts.map(({ result }) => [
      `${result.selection.adapterId}/${result.selection.implementationId}`,
      result.selection,
    ]),
  );
  for (const selection of selections.values()) {
    const latestPath = `qualification/results/${selection.adapterId}/${selection.implementationId}/latest.json`;
    if (!resultEntries.some(({ path }) => path === latestPath)) {
      throw new Error(`Historical qualification target lacks ${latestPath}.`);
    }
    accountedPaths.add(latestPath);
  }
  const resultsReadmePath = 'qualification/results/README.md';
  if (!resultEntries.some(({ path }) => path === resultsReadmePath)) {
    throw new Error('Historical qualification results lack their README.md contract.');
  }
  accountedPaths.add(resultsReadmePath);
  const unaccountedEntry = resultEntries.find(({ path }) => !accountedPaths.has(path));
  if (unaccountedEntry !== undefined) {
    throw new Error(
      `Historical qualification results contain unaccounted evidence: ${unaccountedEntry.path}`,
    );
  }

  return { attempts, blobs, resultEntries };
};

const validateHistoricalQualificationArtifacts = async (
  repositoryRoot,
  sourceAttempts,
  sourceIdentities,
) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'mc401-art-'));
  try {
    for (const attempt of sourceAttempts.attempts) {
      const attemptDirectory = join(
        temporaryRoot,
        createQualificationAttemptKey(attempt.result.attemptId),
      );
      mkdirSync(attemptDirectory, { recursive: true });
      const selectionKey = `${attempt.result.selection.adapterId}/${attempt.result.selection.implementationId}`;
      const sourceIdentity = sourceIdentities.get(
        `${attempt.result.provenance.qualificationRepositoryCommit}/${selectionKey}`,
      );
      if (sourceIdentity === undefined) {
        throw new Error(`Historical attempt lacks source identity ${attempt.result.attemptId}.`);
      }
      const storage = createQualificationAttemptStorage({
        attemptDigest: sha256(attempt.source),
        cliClosureDigest: sourceIdentity.cliClosureDigest,
        compatibility: sourceIdentity.compatibility,
        portableSkillBehaviorDigest: sourceIdentity.portableSkillBehaviorDigest,
        result: attempt.result,
      });
      writeFileSync(join(attemptDirectory, 'attempt.json'), attempt.source);
      writeFileSync(join(attemptDirectory, 'storage.json'), normalizeJson(storage));
      const attemptRoot = attempt.entry.path.slice(0, -'/attempt.json'.length);
      for (const artifact of storage.artifacts) {
        const sourceEntry = sourceAttempts.resultEntries.find(
          ({ path }) => path === `${attemptRoot}/${artifact.logicalPath}`,
        );
        const source =
          sourceEntry === undefined ? undefined : sourceAttempts.blobs.get(sourceEntry.objectId);
        if (source === undefined)
          throw new Error(`Historical artifact is missing: ${artifact.logicalPath}`);
        const destination = resolveQualificationArtifactPath(
          attemptDirectory,
          storage,
          artifact.logicalPath,
        );
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, source);
      }
      await validateQualificationAttemptEvidence({
        attemptDirectory,
        contractSource: 'recorded',
        result: attempt.result,
        resultsRoot: join(repositoryRoot, 'qualification/results'),
      });
      rmSync(attemptDirectory, { force: true, recursive: true });
    }
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

const createBaselineReplay = ({ attempt, envelope }, envelopesByAttemptId) => {
  if (attempt.result.selection.adapterId === 'custom') return 'not-required';
  const baselineAttemptId = attempt.result.provenance.baselineAttemptId;
  if (baselineAttemptId === null) return 'not-recorded';
  const baseline = envelopesByAttemptId.get(baselineAttemptId);
  if (
    baseline === undefined ||
    baseline.status !== 'passed' ||
    baseline.selection.adapterId !== 'custom' ||
    baseline.selection.implementationId !== 'custom' ||
    baseline.compatibility.qualificationBaselineEvaluatorDigest !==
      envelope.compatibility.qualificationBaselineEvaluatorDigest ||
    baseline.portableSkillBehaviorDigest !== envelope.portableSkillBehaviorDigest ||
    baseline.cliClosureDigest !== envelope.cliClosureDigest ||
    !hasCompatibleHistoricalBaselineEnvironment(baseline.environment, envelope.environment)
  ) {
    throw new Error(`Historical baseline replay failed for ${attempt.result.attemptId}.`);
  }
  const adapterPackages = new Map(
    envelope.packages.map((candidatePackage) => [candidatePackage.name, candidatePackage]),
  );
  if (
    baseline.packages.some(
      (baselinePackage) =>
        JSON.stringify(adapterPackages.get(baselinePackage.name)) !==
        JSON.stringify(baselinePackage),
    )
  ) {
    throw new Error(`Historical shared package replay failed for ${attempt.result.attemptId}.`);
  }
  return 'passed';
};

/** Lists every regular file in current qualification results without trusting Git tracking state. */
const listCurrentQualificationResultFiles = (repositoryRoot) => {
  const resultsRoot = join(repositoryRoot, 'qualification', 'results');
  const resultFiles = [];
  const collect = (directoryPath) => {
    for (const entry of readdirSync(directoryPath, {
      withFileTypes: true,
    }).sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'))) {
      const absolutePath = join(directoryPath, entry.name);
      const relativePath = relative(repositoryRoot, absolutePath).replaceAll('\\', '/');
      assertSafeHistoricalPath(relativePath);
      if (entry.isDirectory()) {
        collect(absolutePath);
      } else if (entry.isFile()) {
        resultFiles.push(relativePath);
      } else {
        throw new Error(
          `Current qualification results contain an unsupported path: ${relativePath}`,
        );
      }
    }
  };
  collect(resultsRoot);
  return resultFiles;
};

/** Requires the current result tree to contain exactly the migrated Custom attempt and artifacts. */
const inspectMigratedCustom = (repositoryRoot) => {
  const resultFiles = listCurrentQualificationResultFiles(repositoryRoot);
  const attemptPaths = resultFiles.filter((path) => path.endsWith('/attempt.json'));
  if (attemptPaths.length !== 1) {
    throw new Error('The candidate must contain exactly one migrated Custom attempt.');
  }
  const currentAttemptPath = attemptPaths[0];
  const currentAttemptSource = readFileSync(join(repositoryRoot, ...currentAttemptPath.split('/')));
  const currentAttempt = QualificationAttemptResultSchema.parse(
    JSON.parse(currentAttemptSource.toString('utf8')),
  );
  const currentAttemptDirectory = dirname(join(repositoryRoot, ...currentAttemptPath.split('/')));
  const currentStorage = QualificationAttemptStorageSchema.parse(
    JSON.parse(readFileSync(join(currentAttemptDirectory, 'storage.json'), 'utf8')),
  );
  const targetDirectory = dirname(dirname(currentAttemptDirectory));
  const latest = QualificationLatestResultSchema.parse(
    JSON.parse(readFileSync(join(targetDirectory, 'latest.json'), 'utf8')),
  );
  if (
    latest.adapterId !== 'custom' ||
    latest.implementationId !== 'custom' ||
    latest.latestAttemptId !== currentAttempt.attemptId ||
    latest.lastPassingAttemptId !== currentAttempt.attemptId ||
    latest.latestStatus !== 'passed'
  ) {
    throw new Error('The migrated Custom latest pointer contradicts its attempt.');
  }
  const expectedFiles = new Set([
    currentAttemptPath,
    relative(repositoryRoot, join(currentAttemptDirectory, 'storage.json')).replaceAll('\\', '/'),
    relative(repositoryRoot, join(targetDirectory, 'latest.json')).replaceAll('\\', '/'),
    ...currentStorage.artifacts.map((artifact) =>
      relative(
        repositoryRoot,
        resolveQualificationArtifactPath(
          currentAttemptDirectory,
          currentStorage,
          artifact.logicalPath,
        ),
      ).replaceAll('\\', '/'),
    ),
  ]);
  if (
    resultFiles.length !== expectedFiles.size ||
    resultFiles.some((path) => !expectedFiles.has(path))
  ) {
    throw new Error(
      'Current qualification results contain files outside the migrated Custom attempt.',
    );
  }
  return {
    currentAttempt,
    currentAttemptDirectory,
    currentAttemptSource,
    currentStorage,
  };
};

const verifyMigratedCustom = (repositoryRoot, sourceAttempts, envelopes, migratedCustom) => {
  const carriedEnvelope = envelopes.find(
    ({ attemptId }) => attemptId === '20260901T003008810Z-custom-custom-cac39aa1',
  );
  if (carriedEnvelope === undefined)
    throw new Error('The bridge lacks the migrated Custom envelope.');
  const { currentAttempt, currentAttemptDirectory, currentAttemptSource, currentStorage } =
    migratedCustom;
  if (
    currentAttempt.attemptId !== carriedEnvelope.attemptId ||
    sha256(currentAttemptSource) !== carriedEnvelope.attemptSha256 ||
    !hasSameJsonIdentity(currentStorage.compatibility, carriedEnvelope.compatibility) ||
    currentStorage.portableSkillBehaviorDigest !== carriedEnvelope.portableSkillBehaviorDigest ||
    currentStorage.cliClosureDigest !== carriedEnvelope.cliClosureDigest ||
    currentStorage.carryForward?.attestationId !== carriedEnvelope.attestationId ||
    currentStorage.carryForward.sourceRelease !== CARRY_FORWARD_401_SOURCE_RELEASE ||
    currentStorage.carryForward.sourceCommit !== CARRY_FORWARD_401_SOURCE_COMMIT ||
    currentStorage.carryForward.sourceAttemptDigest !== carriedEnvelope.attemptSha256
  ) {
    throw new Error('The migrated Custom attempt or storage does not match source evidence.');
  }
  const sourceAttempt = sourceAttempts.attempts.find(
    ({ result }) => result.attemptId === currentAttempt.attemptId,
  );
  if (sourceAttempt === undefined || !sourceAttempt.source.equals(currentAttemptSource)) {
    throw new Error('The migrated Custom logical attempt changed bytes.');
  }
  const sourceAttemptRoot = sourceAttempt.entry.path.slice(0, -'/attempt.json'.length);

  for (const artifact of currentStorage.artifacts) {
    const sourceEntry = sourceAttempts.resultEntries.find(
      ({ path }) => path === `${sourceAttemptRoot}/${artifact.logicalPath}`,
    );
    const source =
      sourceEntry === undefined ? undefined : sourceAttempts.blobs.get(sourceEntry.objectId);
    const current = readFileSync(
      resolveQualificationArtifactPath(
        currentAttemptDirectory,
        currentStorage,
        artifact.logicalPath,
      ),
    );
    if (source === undefined || !source.equals(current) || sha256(current) !== artifact.sha256) {
      throw new Error(`The migrated Custom artifact changed bytes: ${artifact.logicalPath}`);
    }
  }
};

const requireExactKeys = (input, keys, label) => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(input).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} does not use its exact fields.`);
  }
  return input;
};

const requireSha256 = (input, label) => {
  if (typeof input !== 'string' || !SHA256_PATTERN.test(input)) {
    throw new Error(`${label} must be one lowercase SHA-256 digest.`);
  }
  return input;
};

const requireCompatibility = (input, label) => {
  try {
    return QualificationCompatibilityIdentitySchema.parse(input);
  } catch (error) {
    throw new Error(`${label} is invalid.`, { cause: error });
  }
};

const requireIsoTimestamp = (input, label, isNullable = false) => {
  if (isNullable && input === null) return null;
  if (typeof input !== 'string' || !Number.isFinite(Date.parse(input))) {
    throw new Error(`${label} must be an ISO timestamp${isNullable ? ' or null' : ''}.`);
  }
  return input;
};

const hasSameJsonIdentity = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const parseCandidateEntry = (input, label) => {
  if (input === null) return null;
  const entry = requireExactKeys(input, ['mode', 'path', 'sha256'], label);
  if (!GIT_MODE_PATTERN.test(entry.mode) || typeof entry.path !== 'string' || entry.path === '') {
    throw new Error(`${label} has an invalid path or mode.`);
  }
  assertSafeHistoricalPath(entry.path);
  requireSha256(entry.sha256, `${label} sha256`);
  return entry;
};

/** Parses the local bridge artifact without reading Git history. */
export const parseCarryForward401Attestation = (input) => {
  const attestation = requireExactKeys(
    input,
    [
      'schemaVersion',
      'sourceRelease',
      'sourceCommit',
      'targetRelease',
      'modelRunsPerformed',
      'candidate',
      'semantic',
      'qualification',
      'changedPaths',
    ],
    'Carry-forward attestation',
  );
  if (
    attestation.schemaVersion !== CARRY_FORWARD_401_SCHEMA_VERSION ||
    attestation.sourceRelease !== CARRY_FORWARD_401_SOURCE_RELEASE ||
    attestation.sourceCommit !== CARRY_FORWARD_401_SOURCE_COMMIT ||
    attestation.targetRelease !== CARRY_FORWARD_401_TARGET_RELEASE ||
    attestation.modelRunsPerformed !== false
  ) {
    throw new Error('Carry-forward attestation does not use the exact 4.0.1 bridge identity.');
  }
  requireExactKeys(
    attestation.candidate,
    [
      'portableSkillArtifactDigest',
      'portableSkillBehaviorDigest',
      'cliClosureDigest',
      'semanticCompatibilityDigest',
    ],
    'Carry-forward candidate',
  );
  requireSha256(
    attestation.candidate.portableSkillArtifactDigest,
    'Carry-forward candidate artifact digest',
  );
  requireSha256(
    attestation.candidate.portableSkillBehaviorDigest,
    'Carry-forward candidate behavior digest',
  );
  requireSha256(attestation.candidate.cliClosureDigest, 'Carry-forward candidate CLI digest');
  requireSha256(
    attestation.candidate.semanticCompatibilityDigest,
    'Carry-forward candidate semantic compatibility digest',
  );
  const semantic = requireExactKeys(
    attestation.semantic,
    [
      'attemptId',
      'attemptSha256',
      'evidenceSha256',
      'resultSha256',
      'artifactDigest',
      'sourceLockSha256',
      'cliClosureDigest',
      'portableSkillArtifactDigest',
      'portableSkillBehaviorDigest',
      'semanticCompatibilityDigest',
    ],
    'Carry-forward semantic evidence',
  );
  if (typeof semantic.attemptId !== 'string' || semantic.attemptId === '') {
    throw new Error('Carry-forward semantic evidence has an invalid attempt id.');
  }
  for (const [fieldName, fieldValue] of Object.entries(semantic)) {
    if (fieldName !== 'attemptId') {
      requireSha256(fieldValue, `Carry-forward semantic ${fieldName}`);
    }
  }
  if (semantic.semanticCompatibilityDigest !== attestation.candidate.semanticCompatibilityDigest) {
    throw new Error('Carry-forward semantic evidence contradicts candidate semantic inputs.');
  }
  const qualification = requireExactKeys(
    attestation.qualification,
    ['attemptCount', 'deletedResults', 'envelopes'],
    'Carry-forward qualification evidence',
  );
  const deletedResults = requireExactKeys(
    qualification.deletedResults,
    ['fileCount', 'digest', 'entries'],
    'Carry-forward deleted-result inventory',
  );
  if (
    qualification.attemptCount !== 60 ||
    !Array.isArray(qualification.envelopes) ||
    qualification.envelopes.length !== 60 ||
    !Number.isSafeInteger(deletedResults.fileCount) ||
    deletedResults.fileCount < 1 ||
    !Array.isArray(deletedResults.entries) ||
    deletedResults.entries.length !== deletedResults.fileCount
  ) {
    throw new Error('Carry-forward qualification evidence must contain exactly 60 envelopes.');
  }
  requireSha256(deletedResults.digest, 'Carry-forward deleted-result digest');
  const deletedResultPaths = new Set();
  let previousDeletedResultPath = null;
  for (const [index, entry] of deletedResults.entries.entries()) {
    const parsedEntry = parseCandidateEntry(
      entry,
      `Carry-forward deleted-result entry ${index + 1}`,
    );
    if (
      parsedEntry === null ||
      !parsedEntry.path.startsWith(SOURCE_RESULTS_PREFIX) ||
      deletedResultPaths.has(parsedEntry.path) ||
      (previousDeletedResultPath !== null &&
        previousDeletedResultPath.localeCompare(parsedEntry.path, 'en') >= 0)
    ) {
      throw new Error('Carry-forward deleted-result entries must be unique sorted result paths.');
    }
    deletedResultPaths.add(parsedEntry.path);
    previousDeletedResultPath = parsedEntry.path;
  }
  if (sha256(`${JSON.stringify(deletedResults.entries)}\n`) !== deletedResults.digest) {
    throw new Error('Carry-forward deleted-result inventory digest does not match its entries.');
  }
  const attemptIds = new Set();
  const attestationIds = new Set();
  const sourcePaths = new Set();
  let previousSourcePath = null;
  for (const envelope of qualification.envelopes) {
    requireExactKeys(
      envelope,
      [
        'attestationId',
        'sourcePath',
        'attemptId',
        'attemptSha256',
        'status',
        'createdAt',
        'completedAt',
        'selection',
        'compatibility',
        'candidateCompatibility',
        'isCompatible',
        'portableSkillBehaviorDigest',
        'cliClosureDigest',
        'environment',
        'packages',
        'packagesDigest',
        'packagesRepositoryCommit',
        'packagesRepositoryFingerprint',
        'qualificationRepositoryCommit',
        'skillRepositoryCommit',
        'skillRepositoryFingerprint',
        'profileDigest',
        'qualificationDigest',
        'targetDigest',
        'targetCompatibilityDigest',
        'candidateTargetCompatibilityDigest',
        'baselineAttemptId',
        'baselineReplay',
      ],
      'Carry-forward qualification envelope',
    );
    if (
      typeof envelope?.attemptId !== 'string' ||
      !SHA256_PATTERN.test(envelope?.attemptSha256) ||
      !SHA256_PATTERN.test(envelope?.portableSkillBehaviorDigest) ||
      !SHA256_PATTERN.test(envelope?.cliClosureDigest) ||
      typeof envelope?.attestationId !== 'string' ||
      !CARRY_FORWARD_ATTESTATION_ID_PATTERN.test(envelope.attestationId)
    ) {
      throw new Error('Carry-forward qualification envelope has an invalid identity.');
    }
    if (
      typeof envelope.sourcePath !== 'string' ||
      !envelope.sourcePath.startsWith(SOURCE_RESULTS_PREFIX) ||
      typeof envelope.isCompatible !== 'boolean' ||
      !['errored', 'failed', 'incomplete', 'passed'].includes(envelope.status) ||
      !['not-recorded', 'not-required', 'passed'].includes(envelope.baselineReplay)
    ) {
      throw new Error('Carry-forward qualification envelope has an invalid source contract.');
    }
    let selection;
    let environment;
    let packages;
    try {
      selection = QualificationSelectionSchema.parse(envelope.selection);
      environment = QualificationExecutionEnvironmentSchema.parse(envelope.environment);
      packages = RecordedCandidatePackageSchema.array().parse(envelope.packages);
    } catch (error) {
      throw new Error('Carry-forward qualification envelope has invalid recorded inputs.', {
        cause: error,
      });
    }
    requireIsoTimestamp(envelope.createdAt, 'Carry-forward envelope createdAt');
    requireIsoTimestamp(envelope.completedAt, 'Carry-forward envelope completedAt', true);
    if (
      envelope.sourcePath !==
      `${SOURCE_RESULTS_PREFIX}${selection.adapterId}/${selection.implementationId}/attempts/${envelope.attemptId}/attempt.json`
    ) {
      throw new Error('Carry-forward qualification envelope path contradicts its selection.');
    }
    requireCompatibility(envelope.compatibility, 'Carry-forward source compatibility');
    requireCompatibility(envelope.candidateCompatibility, 'Carry-forward candidate compatibility');
    for (const fieldName of [
      'portableSkillBehaviorDigest',
      'cliClosureDigest',
      'packagesDigest',
      'packagesRepositoryFingerprint',
      'skillRepositoryFingerprint',
      'profileDigest',
      'qualificationDigest',
      'targetDigest',
      'targetCompatibilityDigest',
      'candidateTargetCompatibilityDigest',
    ]) {
      requireSha256(envelope[fieldName], `Carry-forward envelope ${fieldName}`);
    }
    for (const fieldName of [
      'packagesRepositoryCommit',
      'qualificationRepositoryCommit',
      'skillRepositoryCommit',
    ]) {
      if (typeof envelope[fieldName] !== 'string' || !COMMIT_PATTERN.test(envelope[fieldName])) {
        throw new Error(`Carry-forward envelope ${fieldName} must be one exact commit.`);
      }
    }
    const packageNames = packages.map(({ name }) => name);
    if (
      hasSameJsonIdentity(packages, sortPackages(packages)) === false ||
      new Set(packageNames).size !== packageNames.length ||
      sha256(`${JSON.stringify(packages)}\n`) !== envelope.packagesDigest
    ) {
      throw new Error('Carry-forward qualification envelope has an invalid package closure.');
    }
    if (
      (selection.adapterId === 'custom' &&
        (envelope.baselineAttemptId !== null || envelope.baselineReplay !== 'not-required')) ||
      (selection.adapterId !== 'custom' &&
        ((envelope.status === 'passed' &&
          (typeof envelope.baselineAttemptId !== 'string' || envelope.baselineAttemptId === '')) ||
          (envelope.baselineAttemptId === null
            ? envelope.baselineReplay !== 'not-recorded'
            : envelope.baselineReplay !== 'passed')))
    ) {
      throw new Error('Carry-forward qualification envelope has an invalid baseline relationship.');
    }
    if (
      envelope.isCompatible &&
      (!hasSameJsonIdentity(envelope.compatibility, envelope.candidateCompatibility) ||
        envelope.targetCompatibilityDigest !== envelope.candidateTargetCompatibilityDigest ||
        envelope.portableSkillBehaviorDigest !==
          attestation.candidate.portableSkillBehaviorDigest ||
        envelope.cliClosureDigest !== attestation.candidate.cliClosureDigest)
    ) {
      throw new Error('Carry-forward compatible envelope contradicts candidate inputs.');
    }
    if (
      attemptIds.has(envelope.attemptId) ||
      attestationIds.has(envelope.attestationId) ||
      sourcePaths.has(envelope.sourcePath) ||
      (previousSourcePath !== null &&
        previousSourcePath.localeCompare(envelope.sourcePath, 'en') >= 0)
    ) {
      throw new Error('Carry-forward qualification envelopes must have unique identities.');
    }
    attemptIds.add(envelope.attemptId);
    attestationIds.add(envelope.attestationId);
    sourcePaths.add(envelope.sourcePath);
    previousSourcePath = envelope.sourcePath;
  }
  if (!Array.isArray(attestation.changedPaths)) {
    throw new Error('Carry-forward changedPaths must be an array.');
  }
  const changedPathNames = new Set();
  for (const [index, changedPath] of attestation.changedPaths.entries()) {
    const change = requireExactKeys(
      changedPath,
      ['path', 'source', 'candidate'],
      `Carry-forward changed path ${index + 1}`,
    );
    if (typeof change.path !== 'string' || change.path === '') {
      throw new Error('Carry-forward changed path has an invalid path.');
    }
    assertSafeHistoricalPath(change.path);
    if (changedPathNames.has(change.path)) {
      throw new Error('Carry-forward changed paths must be unique.');
    }
    changedPathNames.add(change.path);
    const source = parseCandidateEntry(change.source, 'Carry-forward changed-path source');
    const candidate = parseCandidateEntry(change.candidate, 'Carry-forward changed-path candidate');
    if (
      (source !== null && source.path !== change.path) ||
      (candidate !== null && candidate.path !== change.path) ||
      (source === null && candidate === null)
    ) {
      throw new Error('Carry-forward changed-path entry contradicts its path.');
    }
  }
  assertProtectedSourceIdentity(attestation.changedPaths);
  return attestation;
};

/** Reads the optional checked-in bridge artifact without requiring historical Git objects. */
export const readCarryForward401Attestation = (repositoryRoot) => {
  const attestationPath = join(repositoryRoot, ...ATTESTATION_PATH.split('/'));
  return existsSync(attestationPath)
    ? parseCarryForward401Attestation(JSON.parse(readFileSync(attestationPath, 'utf8')))
    : null;
};

/** Returns whether one migrated Custom attempt is authorized by a parsed bridge artifact. */
export const hasCarryForward401Qualification = (attestation, options) => {
  if (options.storage.carryForward === undefined) return false;
  const envelope = attestation.qualification.envelopes.find(
    ({ attemptId }) => attemptId === options.result.attemptId,
  );
  if (envelope === undefined) return false;
  return (
    options.result.status === 'passed' &&
    options.result.selection.adapterId === 'custom' &&
    options.result.selection.implementationId === 'custom' &&
    envelope.status === options.result.status &&
    hasSameJsonIdentity(envelope.selection, options.result.selection) &&
    envelope.attestationId === options.storage.carryForward.attestationId &&
    envelope.attemptSha256 === options.storage.carryForward.sourceAttemptDigest &&
    options.storage.attemptDigest === envelope.attemptSha256 &&
    options.storage.carryForward.sourceRelease === CARRY_FORWARD_401_SOURCE_RELEASE &&
    options.storage.carryForward.sourceCommit === CARRY_FORWARD_401_SOURCE_COMMIT &&
    envelope.qualificationRepositoryCommit ===
      options.result.provenance.qualificationRepositoryCommit &&
    envelope.skillRepositoryCommit === options.result.provenance.skillRepositoryCommit &&
    envelope.skillRepositoryFingerprint === options.result.provenance.skillRepositoryFingerprint &&
    envelope.targetDigest === options.result.provenance.targetDigest &&
    envelope.packagesDigest ===
      sha256(`${JSON.stringify(sortPackages(options.result.provenance.packages))}\n`) &&
    options.storage.portableSkillBehaviorDigest === envelope.portableSkillBehaviorDigest &&
    options.storage.cliClosureDigest === envelope.cliClosureDigest &&
    hasSameJsonIdentity(envelope.packages, sortPackages(options.result.provenance.packages)) &&
    hasSameJsonIdentity(envelope.environment, createEnvironment(options.result.provenance)) &&
    envelope.isCompatible === true &&
    hasSameJsonIdentity(envelope.compatibility, options.storage.compatibility) &&
    hasSameJsonIdentity(envelope.candidateCompatibility, options.storage.compatibility) &&
    envelope.targetCompatibilityDigest === envelope.candidateTargetCompatibilityDigest &&
    envelope.portableSkillBehaviorDigest ===
      createPortableSkillBehaviorDigest(options.repositoryRoot) &&
    envelope.cliClosureDigest === createCliClosureDigest(options.repositoryRoot) &&
    attestation.candidate.portableSkillBehaviorDigest === envelope.portableSkillBehaviorDigest &&
    attestation.candidate.cliClosureDigest === envelope.cliClosureDigest
  );
};

/** Returns whether one migrated Custom attempt is authorized by the local bridge artifact. */
export const hasLocalCarryForward401Qualification = (options) => {
  const attestation = readCarryForward401Attestation(options.repositoryRoot);
  return attestation === null ? false : hasCarryForward401Qualification(attestation, options);
};

const createHistoricalQualificationSourceEvidence = async (repositoryRoot, packagesRepository) => {
  const sourceAttempts = createQualificationSourceAttempts(repositoryRoot);
  const sourceIdentities = await createSourceQualificationIdentities(
    repositoryRoot,
    sourceAttempts.attempts,
  );
  const packagesIdentities = createPackagesSourceIdentities(
    packagesRepository,
    sourceAttempts.attempts,
  );
  await validateHistoricalQualificationArtifacts(repositoryRoot, sourceAttempts, sourceIdentities);
  const envelopeWork = sourceAttempts.attempts.map((attempt) => {
    const selectionKey = `${attempt.result.selection.adapterId}/${attempt.result.selection.implementationId}`;
    const sourceIdentity = sourceIdentities.get(
      `${attempt.result.provenance.qualificationRepositoryCommit}/${selectionKey}`,
    );
    const packagesIdentity = packagesIdentities.get(
      attempt.result.provenance.packagesRepositoryCommit,
    );
    if (sourceIdentity === undefined || packagesIdentity === undefined) {
      throw new Error(
        `Historical attempt lacks complete source inputs: ${attempt.result.attemptId}`,
      );
    }
    const adapter = packagesIdentity.matrix.adapters[attempt.result.selection.adapterId];
    const target = adapter?.targets?.find(
      ({ id }) => id === attempt.result.selection.implementationId,
    );
    const exactTargetDigest =
      adapter === undefined || target === undefined
        ? null
        : sourceIdentity.exactFingerprintKind === 'legacy-global'
          ? calculateLegacyTargetDigest(adapter, target)
          : calculateQualificationTargetDigest(adapter, target);
    const provenanceFailures = [
      ...(packagesIdentity.fingerprint === attempt.result.provenance.packagesRepositoryFingerprint
        ? []
        : ['packages repository']),
      ...(sourceIdentity.profileDigest === attempt.result.provenance.profileDigest
        ? []
        : ['profile']),
      ...(sourceIdentity.qualificationDigest === attempt.result.provenance.qualificationDigest
        ? []
        : ['qualification execution']),
      ...(sourceIdentity.skillRepositoryFingerprint ===
      attempt.result.provenance.skillRepositoryFingerprint
        ? []
        : ['skill repository']),
      ...(exactTargetDigest === null
        ? ['runtime target']
        : exactTargetDigest === attempt.result.provenance.targetDigest
          ? []
          : ['target digest']),
    ];
    if (provenanceFailures.length > 0) {
      throw new Error(
        `Historical attempt exact provenance failed for ${attempt.result.attemptId}: ${provenanceFailures.join(', ')}.`,
      );
    }
    if (adapter === undefined || target === undefined) {
      throw new Error(
        `Historical target compatibility is unavailable: ${attempt.result.attemptId}`,
      );
    }
    const packages = sortPackages(attempt.result.provenance.packages);
    const envelope = {
      attestationId:
        attempt.result.selection.adapterId === 'custom' &&
        attempt.result.selection.implementationId === 'custom'
          ? `v4.0.0-custom-${sha256(attempt.source)}`
          : `v4.0.0-qualification-${sha256(attempt.source)}`,
      sourcePath: attempt.entry.path,
      attemptId: attempt.result.attemptId,
      attemptSha256: sha256(attempt.source),
      status: attempt.result.status,
      createdAt: attempt.result.createdAt,
      completedAt: attempt.result.completedAt,
      selection: attempt.result.selection,
      compatibility: sourceIdentity.compatibility,
      portableSkillBehaviorDigest: sourceIdentity.portableSkillBehaviorDigest,
      cliClosureDigest: sourceIdentity.cliClosureDigest,
      environment: createEnvironment(attempt.result.provenance),
      packages,
      packagesDigest: sha256(`${JSON.stringify(packages)}\n`),
      packagesRepositoryCommit: attempt.result.provenance.packagesRepositoryCommit,
      packagesRepositoryFingerprint: attempt.result.provenance.packagesRepositoryFingerprint,
      qualificationRepositoryCommit: attempt.result.provenance.qualificationRepositoryCommit,
      skillRepositoryCommit: attempt.result.provenance.skillRepositoryCommit,
      skillRepositoryFingerprint: attempt.result.provenance.skillRepositoryFingerprint,
      profileDigest: attempt.result.provenance.profileDigest,
      qualificationDigest: attempt.result.provenance.qualificationDigest,
      targetDigest: attempt.result.provenance.targetDigest,
      targetCompatibilityDigest: calculateQualificationTargetDigest(adapter, target),
      baselineAttemptId: attempt.result.provenance.baselineAttemptId,
      baselineReplay: null,
    };
    return { attempt, envelope };
  });
  const envelopesByAttemptId = new Map(
    envelopeWork.map(({ envelope }) => [envelope.attemptId, envelope]),
  );
  const envelopes = envelopeWork
    .map((entry) => ({
      ...entry.envelope,
      baselineReplay: createBaselineReplay(entry, envelopesByAttemptId),
    }))
    .sort(({ sourcePath: left }, { sourcePath: right }) => left.localeCompare(right, 'en'));
  const deletedResultEntries = createGitContentEntries(
    sourceAttempts.resultEntries,
    sourceAttempts.blobs,
  );

  return {
    deletedResults: {
      fileCount: deletedResultEntries.length,
      digest: sha256(`${JSON.stringify(deletedResultEntries)}\n`),
      entries: deletedResultEntries,
    },
    envelopes,
    sourceAttempts,
  };
};

const SOURCE_ENVELOPE_FIELDS = [
  'attestationId',
  'sourcePath',
  'attemptId',
  'attemptSha256',
  'status',
  'createdAt',
  'completedAt',
  'selection',
  'compatibility',
  'portableSkillBehaviorDigest',
  'cliClosureDigest',
  'environment',
  'packages',
  'packagesDigest',
  'packagesRepositoryCommit',
  'packagesRepositoryFingerprint',
  'qualificationRepositoryCommit',
  'skillRepositoryCommit',
  'skillRepositoryFingerprint',
  'profileDigest',
  'qualificationDigest',
  'targetDigest',
  'targetCompatibilityDigest',
  'baselineAttemptId',
  'baselineReplay',
];

const projectSourceEnvelope = (envelope) =>
  Object.fromEntries(SOURCE_ENVELOPE_FIELDS.map((fieldName) => [fieldName, envelope[fieldName]]));

/** Creates the deterministic one-version bridge from exact source and candidate inputs. */
export const createCarryForward401Attestation = async ({ packagesRepository, repositoryRoot }) => {
  const resolvedRepositoryRoot = resolve(repositoryRoot);
  const resolvedPackagesRepository = resolve(packagesRepository);
  const targetRelease = parseStableVersion(
    JSON.parse(readFileSync(join(resolvedRepositoryRoot, 'package.json'), 'utf8')).version,
  );
  if (targetRelease !== CARRY_FORWARD_401_TARGET_RELEASE) {
    throw new Error(
      `The carry-forward bridge applies only to ${CARRY_FORWARD_401_TARGET_RELEASE}.`,
    );
  }
  resolveSourceReleaseCommit(resolvedRepositoryRoot, 'generate release evidence');
  const changedPaths = createChangedPathInventory(resolvedRepositoryRoot);
  assertProtectedSourceIdentity(changedPaths);
  const migratedCustom = inspectMigratedCustom(resolvedRepositoryRoot);
  const sourceSemantic = await createSourceSemanticEnvelope(resolvedRepositoryRoot);
  const candidate = {
    portableSkillArtifactDigest: createPortableSkillArtifactDigest(resolvedRepositoryRoot),
    portableSkillBehaviorDigest: createPortableSkillBehaviorDigest(resolvedRepositoryRoot),
    cliClosureDigest: createCliClosureDigest(resolvedRepositoryRoot),
    semanticCompatibilityDigest: createSemanticCompatibilityDigest(resolvedRepositoryRoot),
  };
  if (
    sourceSemantic.portableSkillBehaviorDigest !== candidate.portableSkillBehaviorDigest ||
    sourceSemantic.cliClosureDigest !== candidate.cliClosureDigest ||
    sourceSemantic.semanticCompatibilityDigest !== candidate.semanticCompatibilityDigest
  ) {
    throw new Error(
      'The 4.0.1 candidate changed portable-skill behavior, the CLI closure, or semantic inputs.',
    );
  }
  const sourceEvidence = await createHistoricalQualificationSourceEvidence(
    resolvedRepositoryRoot,
    resolvedPackagesRepository,
  );
  const candidateCompatibility = new Map();
  const candidateMatrix = await loadRuntimeCompatibilityMatrix(resolvedPackagesRepository);
  for (const envelope of sourceEvidence.envelopes) {
    const key = `${envelope.selection.adapterId}/${envelope.selection.implementationId}`;
    if (!candidateCompatibility.has(key)) {
      candidateCompatibility.set(
        key,
        await createQualificationCompatibilityIdentity({
          qualificationRoot: join(resolvedRepositoryRoot, 'qualification'),
          repositoryRoot: resolvedRepositoryRoot,
          selection: envelope.selection,
        }),
      );
    }
  }
  const envelopes = sourceEvidence.envelopes.map((sourceEnvelope) => {
    const selectionKey = `${sourceEnvelope.selection.adapterId}/${sourceEnvelope.selection.implementationId}`;
    const currentCompatibility = candidateCompatibility.get(selectionKey);
    if (currentCompatibility === undefined) {
      throw new Error(
        `Historical attempt lacks candidate compatibility inputs: ${sourceEnvelope.attemptId}`,
      );
    }
    const candidateAdapter = candidateMatrix.adapters[sourceEnvelope.selection.adapterId];
    const candidateTarget = candidateAdapter?.targets?.find(
      ({ id }) => id === sourceEnvelope.selection.implementationId,
    );
    if (candidateAdapter === undefined || candidateTarget === undefined) {
      throw new Error(`Candidate target compatibility is unavailable: ${sourceEnvelope.attemptId}`);
    }
    const candidateTargetCompatibilityDigest = calculateQualificationTargetDigest(
      candidateAdapter,
      candidateTarget,
    );
    return {
      ...sourceEnvelope,
      candidateCompatibility: currentCompatibility,
      isCompatible:
        hasSameJsonIdentity(sourceEnvelope.compatibility, currentCompatibility) &&
        sourceEnvelope.portableSkillBehaviorDigest === candidate.portableSkillBehaviorDigest &&
        sourceEnvelope.cliClosureDigest === candidate.cliClosureDigest &&
        sourceEnvelope.targetCompatibilityDigest === candidateTargetCompatibilityDigest,
      candidateTargetCompatibilityDigest,
    };
  });
  verifyMigratedCustom(
    resolvedRepositoryRoot,
    sourceEvidence.sourceAttempts,
    envelopes,
    migratedCustom,
  );
  const attestation = {
    schemaVersion: CARRY_FORWARD_401_SCHEMA_VERSION,
    sourceRelease: CARRY_FORWARD_401_SOURCE_RELEASE,
    sourceCommit: CARRY_FORWARD_401_SOURCE_COMMIT,
    targetRelease: CARRY_FORWARD_401_TARGET_RELEASE,
    modelRunsPerformed: false,
    candidate,
    semantic: sourceSemantic,
    qualification: {
      attemptCount: envelopes.length,
      deletedResults: sourceEvidence.deletedResults,
      envelopes,
    },
    changedPaths,
  };
  return parseCarryForward401Attestation(attestation);
};

/** Reopens immutable source history and verifies the attested source evidence only. */
export const verifyCarryForward401SourceAttestation = async ({
  packagesRepository,
  repositoryRoot,
}) => {
  const recorded = readCarryForward401Attestation(repositoryRoot);
  if (recorded === null) {
    throw new Error(`${ATTESTATION_PATH} is missing.`);
  }
  resolveSourceReleaseCommit(repositoryRoot, 'verify historical release evidence');
  const [semantic, qualification] = await Promise.all([
    createSourceSemanticEnvelope(resolve(repositoryRoot)),
    createHistoricalQualificationSourceEvidence(
      resolve(repositoryRoot),
      resolve(packagesRepository),
    ),
  ]);
  const sourceEnvelopes = recorded.qualification.envelopes.map(projectSourceEnvelope);
  if (
    !hasSameJsonIdentity(recorded.semantic, semantic) ||
    !hasSameJsonIdentity(recorded.qualification.deletedResults, qualification.deletedResults) ||
    !hasSameJsonIdentity(sourceEnvelopes, qualification.envelopes)
  ) {
    throw new Error('The checked-in 4.0.1 carry-forward source evidence is stale or modified.');
  }
  return recorded;
};

/** Recomputes and compares the checked-in bridge against exact Git and candidate inputs. */
export const verifyCarryForward401Attestation = async (options) => {
  const recorded = readCarryForward401Attestation(options.repositoryRoot);
  if (recorded === null) {
    throw new Error(`${ATTESTATION_PATH} is missing.`);
  }
  const expected = await createCarryForward401Attestation(options);
  if (JSON.stringify(recorded) !== JSON.stringify(expected)) {
    throw new Error('The checked-in 4.0.1 carry-forward attestation is stale or was modified.');
  }
  return recorded;
};

/** Atomically writes the deterministic bridge after the candidate tree is otherwise stable. */
export const writeCarryForward401Attestation = async (options) => {
  const attestation = await createCarryForward401Attestation(options);
  const destinationPath = join(options.repositoryRoot, ...ATTESTATION_PATH.split('/'));
  const temporaryPath = `${destinationPath}.tmp`;
  mkdirSync(dirname(destinationPath), { recursive: true });
  if (existsSync(destinationPath) || existsSync(temporaryPath)) {
    throw new Error(
      `Refusing to overwrite existing carry-forward evidence at ${ATTESTATION_PATH}.`,
    );
  }
  try {
    writeFileSync(temporaryPath, normalizeJson(attestation), { flag: 'wx' });
    renameSync(temporaryPath, destinationPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return attestation;
};

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const allowedArguments = new Set(['--write']);
  const unsupportedArgument = process.argv
    .slice(2)
    .find((argument) => !allowedArguments.has(argument));
  if (unsupportedArgument !== undefined || !process.argv.includes('--write')) {
    process.stderr.write('Usage: carry-forward-4-0-1.mjs --write\n');
    process.exitCode = 1;
  } else {
    const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
    try {
      const attestation = await writeCarryForward401Attestation({
        packagesRepository: resolve(repositoryRoot, '..', 'packages'),
        repositoryRoot,
      });
      process.stdout.write(
        `Recorded ${attestation.qualification.attemptCount} historical qualification envelopes.\n`,
      );
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}
