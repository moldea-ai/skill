import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { spawnSync } from 'node:child_process';

import { parse } from 'yaml';

import { hasPassingMoldeaResourceBudget } from '../semantic-evaluation/index.mjs';
import { QualificationModelStageEvidenceSchema } from '../../qualification/src/contracts/index.ts';

import { CLI_PACKAGE_NAME, RELEASE_PATHS } from './constants.mjs';
import { createFreshEvidenceSectionSha256 } from './release-evidence-current.mjs';
import {
  createReleaseEvidenceSha256,
  parseReleaseEvidenceEnvelope,
} from './release-evidence-envelope.mjs';

const MAX_GIT_JSON_BYTES = 16 * 1_048_576;
const MAX_MATERIALIZED_FILE_BYTES = 32 * 1_048_576;
const MAX_PIN_SOURCE_DEPTH = 64;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const runGit = (repositoryRoot, arguments_, options = {}) => {
  const result = spawnSync('git', arguments_, {
    cwd: repositoryRoot,
    encoding: options.encoding,
    maxBuffer: options.maxBuffer ?? MAX_GIT_JSON_BYTES,
    windowsHide: true,
  });
  if (result.error?.code === 'ENOBUFS') {
    throw new Error(
      `Git evidence output exceeded the ${options.maxBuffer ?? MAX_GIT_JSON_BYTES}-byte read limit.`,
      { cause: result.error },
    );
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const diagnostic = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString('utf8').trim()
      : String(result.stderr ?? '').trim();
    throw new Error(diagnostic || `Git ${arguments_[0]} failed with status ${result.status}.`);
  }
  return result.stdout;
};

const requireRepositoryPath = (path, label) => {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.includes('\\') ||
    posix.isAbsolute(path) ||
    path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error(`${label} is not a safe repository-relative path.`);
  }
  return path;
};

/** Resolves one exact stable tag to its full commit object id. */
export const resolveReleaseTagCommit = (repositoryRoot, tag) => {
  if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u.test(tag)) {
    throw new Error('Release evidence source must be an exact stable v<version> tag.');
  }
  return String(
    runGit(repositoryRoot, ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`], {
      encoding: 'utf8',
    }),
  ).trim();
};

/** Requires an optional CI release tag to identify the exact checked-out target commit. */
export const assertTargetReleaseTagIdentity = (repositoryRoot, releaseVersion, releaseTag) => {
  if (releaseTag === undefined || releaseTag === '') return;
  const expectedTag = `v${releaseVersion}`;
  if (releaseTag !== expectedTag) {
    throw new Error(`Target release tag must be ${expectedTag}, received ${releaseTag}.`);
  }
  const tagCommit = resolveReleaseTagCommit(repositoryRoot, releaseTag);
  const headCommit = String(
    runGit(repositoryRoot, ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }),
  ).trim();
  if (tagCommit !== headCommit) {
    throw new Error(`Target release tag ${releaseTag} does not identify the checked-out commit.`);
  }
};

const readGitFile = (repositoryRoot, commit, relativePath, maximumBytes = MAX_GIT_JSON_BYTES) => {
  requireRepositoryPath(relativePath, 'Git evidence path');
  return runGit(repositoryRoot, ['show', `${commit}:${relativePath}`], {
    encoding: null,
    maxBuffer: maximumBytes,
  });
};

const readGitText = (repositoryRoot, commit, relativePath) =>
  readGitFile(repositoryRoot, commit, relativePath).toString('utf8');

const readGitJson = (repositoryRoot, commit, relativePath) => {
  try {
    return JSON.parse(readGitText(repositoryRoot, commit, relativePath));
  } catch (error) {
    throw new Error(`Release evidence JSON is invalid at ${relativePath}.`, {
      cause: error,
    });
  }
};

const hashGitFile = (repositoryRoot, commit, relativePath) =>
  createReleaseEvidenceSha256(readGitFile(repositoryRoot, commit, relativePath));

const assertGitFileDigest = (repositoryRoot, commit, relativePath, expectedSha256) => {
  if (hashGitFile(repositoryRoot, commit, relativePath) !== expectedSha256) {
    throw new Error(`Release evidence digest does not match ${relativePath}.`);
  }
};

const createGitPortableSkillDigest = (repositoryRoot, commit) => {
  const listing = String(
    runGit(repositoryRoot, ['ls-tree', '-rz', commit, '--', 'moldea'], {
      encoding: 'utf8',
    }),
  );
  const records = listing.split('\0').filter(Boolean);
  const files = records
    .map((record) => {
      const match = /^(\d{6}) blob [a-f0-9]+\t(.+)$/u.exec(record);
      return match === null ? null : { mode: match[1], path: match[2] };
    })
    .filter((entry) => entry !== null && (entry.mode === '100644' || entry.mode === '100755'))
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));
  if (files.length === 0) throw new Error('Pinned source tag has no portable moldea skill files.');
  const hash = createHash('sha256');
  for (const { path } of files) {
    hash.update(path.slice('moldea/'.length));
    hash.update('\0');
    hash.update(readGitFile(repositoryRoot, commit, path));
    hash.update('\0');
  }
  return hash.digest('hex');
};

const createGitDependencyClosureSha256 = (repositoryRoot, commit, envelope) => {
  const packageManifestText = readGitText(repositoryRoot, commit, RELEASE_PATHS.packageManifest);
  const packageLockText = readGitText(repositoryRoot, commit, RELEASE_PATHS.packageLock);
  const packageManifest = JSON.parse(packageManifestText);
  const packageLock = JSON.parse(packageLockText);
  const cliVersion = packageManifest.devDependencies?.[CLI_PACKAGE_NAME];
  const cliJsonSchemaVersion = packageManifest.moldeaRelease?.cliJsonSchemaVersion;
  const lockedCli = packageLock.packages?.[`node_modules/${CLI_PACKAGE_NAME}`];
  if (
    packageManifest.version !== envelope.target.version ||
    packageLock.packages?.['']?.version !== envelope.target.version ||
    typeof cliVersion !== 'string' ||
    lockedCli?.version !== cliVersion ||
    typeof lockedCli.integrity !== 'string' ||
    !Number.isSafeInteger(cliJsonSchemaVersion)
  ) {
    throw new Error('Pinned source dependency closure is incomplete.');
  }
  return createReleaseEvidenceSha256(
    JSON.stringify({
      cli: {
        integrity: lockedCli.integrity,
        jsonSchemaVersion: cliJsonSchemaVersion,
        name: CLI_PACKAGE_NAME,
        packageLockSha256: createReleaseEvidenceSha256(packageLockText),
        version: cliVersion,
      },
      qualificationProtocolVersion: envelope.qualification.protocolVersion,
      semanticProtocolVersion: envelope.semantic.protocolVersion,
    }),
  );
};

const assertSemanticResourceEvidence = (repositoryRoot, commit, result) => {
  const cases = readGitJson(repositoryRoot, commit, RELEASE_PATHS.conformanceCases).semanticCases;
  const definitions = new Map(cases.map((definition) => [definition.id, definition]));
  if (!Array.isArray(result.cases) || result.cases.length !== definitions.size) {
    throw new Error('Pinned semantic result has an incomplete case inventory.');
  }
  for (const caseResult of result.cases) {
    const definition = definitions.get(caseResult.id);
    if (
      definition === undefined ||
      caseResult.passed !== true ||
      !hasPassingMoldeaResourceBudget(caseResult.actorResourceEvidence, definition.resourceBudget)
    ) {
      throw new Error(`Pinned semantic case ${String(caseResult.id)} is failed or over budget.`);
    }
  }
};

const assertSemanticSource = (repositoryRoot, commit, semantic) => {
  const result = readGitJson(repositoryRoot, commit, RELEASE_PATHS.semanticResult);
  const latestPath = 'fixtures/semantic-evaluation-results/latest.json';
  const attemptPath = `fixtures/semantic-evaluation-results/attempts/${semantic.attemptId}/attempt.json`;
  const attempt = readGitJson(repositoryRoot, commit, attemptPath);
  const latest = readGitJson(repositoryRoot, commit, latestPath);
  if (
    result.semanticAttemptId !== semantic.attemptId ||
    result.evaluationProtocolVersion !== semantic.protocolVersion ||
    attempt.attemptId !== semantic.attemptId ||
    attempt.status !== 'passed' ||
    latest.latestStatus !== 'passed' ||
    latest.latestAttemptId !== semantic.attemptId ||
    latest.lastPassingAttemptId !== semantic.attemptId
  ) {
    throw new Error('Pinned semantic evidence is not one self-consistent passing attempt.');
  }
  assertGitFileDigest(repositoryRoot, commit, RELEASE_PATHS.semanticResult, semantic.resultSha256);
  assertGitFileDigest(repositoryRoot, commit, attemptPath, semantic.attemptSha256);
  assertGitFileDigest(repositoryRoot, commit, latestPath, semantic.latestSha256);
  const evidencePath = `${posix.dirname(attemptPath)}/${requireRepositoryPath(
    attempt.evidence?.path,
    'Semantic raw evidence path',
  )}`;
  if (attempt.evidence?.sha256 !== semantic.evidenceSha256) {
    throw new Error('Pinned semantic attempt does not match its envelope evidence digest.');
  }
  assertGitFileDigest(repositoryRoot, commit, evidencePath, semantic.evidenceSha256);
  assertSemanticResourceEvidence(repositoryRoot, commit, result);
};

const assertQualificationResourceEvidence = (artifact, relativePath) => {
  if (!/(?:actor|judge)-evidence\.json$/u.test(relativePath)) return;
  let evidence;
  try {
    evidence = JSON.parse(artifact.toString('utf8'));
  } catch (error) {
    throw new Error(`Qualification resource evidence is invalid at ${relativePath}.`, {
      cause: error,
    });
  }
  if (!QualificationModelStageEvidenceSchema.safeParse(evidence).success) {
    throw new Error(
      `Qualification resource evidence is invalid or over budget at ${relativePath}.`,
    );
  }
};

const assertQualificationSource = (repositoryRoot, commit, qualification) => {
  const profileIndex = parse(
    readGitText(repositoryRoot, commit, 'qualification/profiles/index.yaml'),
  );
  const sourceTargets = profileIndex?.targets;
  if (
    profileIndex?.version !== 1 ||
    !Array.isArray(sourceTargets) ||
    JSON.stringify(
      sourceTargets
        .map(({ adapterId, implementationId, key }) => ({
          adapterId,
          implementationId,
          key,
        }))
        .sort((left, right) => left.key.localeCompare(right.key, 'en')),
    ) !==
      JSON.stringify(
        qualification.targets.map(({ adapterId, implementationId, key }) => ({
          adapterId,
          implementationId,
          key,
        })),
      )
  ) {
    throw new Error('Pinned qualification evidence does not match its complete target index.');
  }
  for (const target of qualification.targets) {
    const targetRoot = `qualification/results/${target.key}`;
    const profile = parse(
      readGitText(repositoryRoot, commit, `qualification/profiles/${target.key}/profile.yaml`),
    );
    const latestPath = `${targetRoot}/latest.json`;
    const attemptRoot = `${targetRoot}/attempts/${target.attemptKey}`;
    const attemptPath = `${attemptRoot}/attempt.json`;
    const storagePath = `${attemptRoot}/storage.json`;
    const latest = readGitJson(repositoryRoot, commit, latestPath);
    const attempt = readGitJson(repositoryRoot, commit, attemptPath);
    const storage = readGitJson(repositoryRoot, commit, storagePath);
    if (
      latest.adapterId !== target.adapterId ||
      latest.implementationId !== target.implementationId ||
      latest.protocolVersion !== qualification.protocolVersion ||
      latest.latestStatus !== 'passed' ||
      latest.latestAttemptId !== target.attemptId ||
      latest.lastPassingAttemptId !== target.attemptId ||
      attempt.attemptId !== target.attemptId ||
      attempt.protocolVersion !== qualification.protocolVersion ||
      attempt.selection?.adapterId !== target.adapterId ||
      attempt.selection?.implementationId !== target.implementationId ||
      profile?.version !== 2 ||
      profile.adapterId !== target.adapterId ||
      profile.implementationId !== target.implementationId ||
      !Array.isArray(profile.cases) ||
      JSON.stringify(attempt.cases?.map(({ caseId }) => caseId)) !==
        JSON.stringify(profile.cases.map(({ id }) => id)) ||
      attempt.status !== 'passed' ||
      attempt.mode !== 'official' ||
      attempt.provenance?.packagesRepositoryDirty !== false ||
      attempt.provenance?.qualificationRepositoryDirty !== false ||
      attempt.provenance?.skillRepositoryDirty !== false ||
      !Array.isArray(attempt.cases) ||
      attempt.cases.some(({ status }) => status !== 'passed' && status !== 'recovered') ||
      storage.version !== 1 ||
      storage.attemptId !== target.attemptId ||
      storage.attemptKey !== target.attemptKey ||
      !Array.isArray(storage.artifacts)
    ) {
      throw new Error(
        `Pinned qualification target ${target.key} is not self-consistent and passing.`,
      );
    }
    assertGitFileDigest(repositoryRoot, commit, latestPath, target.latestSha256);
    assertGitFileDigest(repositoryRoot, commit, attemptPath, target.attemptSha256);
    assertGitFileDigest(repositoryRoot, commit, storagePath, target.storageSha256);
    if (storage.attemptDigest !== target.attemptSha256) {
      throw new Error(`Pinned qualification target ${target.key} has a stale attempt digest.`);
    }
    if (typeof attempt.artifactDigests !== 'object' || attempt.artifactDigests === null) {
      throw new Error(`Pinned qualification target ${target.key} has no artifact manifest.`);
    }
    const expectedStorageArtifacts = Object.entries(attempt.artifactDigests)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([logicalPath, sha256], index) => ({
        logicalPath,
        physicalPath: `artifacts/f${index + 1}${posix.extname(logicalPath).toLowerCase()}`,
        sha256,
      }));
    if (JSON.stringify(storage.artifacts) !== JSON.stringify(expectedStorageArtifacts)) {
      throw new Error(`Pinned qualification target ${target.key} has an incomplete storage map.`);
    }
    const storageByLogicalPath = new Map(
      storage.artifacts.map((artifact) => [artifact.logicalPath, artifact]),
    );
    let resourceEvidenceCount = 0;
    for (const [logicalPath, expectedSha256] of Object.entries(attempt.artifactDigests)) {
      requireRepositoryPath(logicalPath, 'Qualification artifact path');
      if (typeof expectedSha256 !== 'string' || !SHA256_PATTERN.test(expectedSha256)) {
        throw new Error(`Qualification artifact digest is invalid for ${logicalPath}.`);
      }
      const storageArtifact = storageByLogicalPath.get(logicalPath);
      if (storageArtifact === undefined || storageArtifact.sha256 !== expectedSha256) {
        throw new Error(`Qualification storage does not match ${logicalPath}.`);
      }
      const physicalPath = requireRepositoryPath(
        storageArtifact.physicalPath,
        'Qualification physical artifact path',
      );
      const artifactPath = `${attemptRoot}/${physicalPath}`;
      const artifact = readGitFile(
        repositoryRoot,
        commit,
        artifactPath,
        MAX_MATERIALIZED_FILE_BYTES,
      );
      if (createReleaseEvidenceSha256(artifact) !== expectedSha256) {
        throw new Error(`Qualification artifact digest does not match ${logicalPath}.`);
      }
      assertQualificationResourceEvidence(artifact, logicalPath);
      if (/(?:actor|judge)-evidence\.json$/u.test(logicalPath)) resourceEvidenceCount += 1;
    }
    if (resourceEvidenceCount === 0) {
      throw new Error(`Pinned qualification target ${target.key} has no resource evidence.`);
    }
  }
};

const assertFreshSource = (repositoryRoot, tag, commit, source, envelope) => {
  if (tag !== `v${envelope.target.version}`) {
    throw new Error('Pinned source tag does not match the fresh envelope version.');
  }
  if (
    createGitPortableSkillDigest(repositoryRoot, commit) !== envelope.target.portableSkillSha256
  ) {
    throw new Error('Pinned source portable skill digest does not match its tag.');
  }
  if (
    createGitDependencyClosureSha256(repositoryRoot, commit, envelope) !==
    envelope.target.dependencyClosureSha256
  ) {
    throw new Error('Pinned source dependency closure does not match its tag.');
  }
  assertSemanticSource(repositoryRoot, commit, envelope.semantic);
  assertQualificationSource(repositoryRoot, commit, envelope.qualification);
  return {
    commit,
    envelope,
    envelopeSha256: createReleaseEvidenceSha256(source),
    tag,
  };
};

const resolveFreshReleaseEvidenceSourceInternal = (repositoryRoot, tag, visitedTags, depth) => {
  if (depth > MAX_PIN_SOURCE_DEPTH) {
    throw new Error(`Release evidence pin chain exceeds ${MAX_PIN_SOURCE_DEPTH} tags.`);
  }
  if (visitedTags.has(tag)) throw new Error(`Release evidence pin cycle includes ${tag}.`);
  visitedTags.add(tag);
  const commit = resolveReleaseTagCommit(repositoryRoot, tag);
  const source = readGitText(repositoryRoot, commit, RELEASE_PATHS.releaseEvidence);
  const envelope = parseReleaseEvidenceEnvelope(source);
  if (envelope.mode === 'fresh') {
    return assertFreshSource(repositoryRoot, tag, commit, source, envelope);
  }
  if (
    tag !== `v${envelope.target.version}` ||
    createGitPortableSkillDigest(repositoryRoot, commit) !== envelope.target.portableSkillSha256
  ) {
    throw new Error(`Pinned release ${tag} does not match its target identity.`);
  }
  if (envelope.source.tag === tag || envelope.source.commit === commit) {
    throw new Error('Pinned release evidence cannot refer to itself.');
  }
  const resolved = resolveFreshReleaseEvidenceSourceInternal(
    repositoryRoot,
    envelope.source.tag,
    visitedTags,
    depth + 1,
  );
  if (
    resolved.commit !== envelope.source.commit ||
    resolved.envelopeSha256 !== envelope.source.evidenceSha256 ||
    createFreshEvidenceSectionSha256(resolved.envelope.semantic) !==
      envelope.source.semanticSha256 ||
    createFreshEvidenceSectionSha256(resolved.envelope.qualification) !==
      envelope.source.qualificationSha256
  ) {
    throw new Error(`Pinned release ${tag} does not match its original fresh source.`);
  }
  return resolved;
};

/** Resolves a tag through compact pin provenance to the original valid fresh evidence. */
export const resolveFreshReleaseEvidenceSource = (repositoryRoot, tag) =>
  resolveFreshReleaseEvidenceSourceInternal(repositoryRoot, tag, new Set(), 1);

/** Verifies one current pinned envelope against its original immutable fresh source. */
export const assertPinnedReleaseEvidenceSource = (repositoryRoot, envelope) => {
  const resolved = resolveFreshReleaseEvidenceSource(repositoryRoot, envelope.source.tag);
  if (
    resolved.commit !== envelope.source.commit ||
    resolved.envelopeSha256 !== envelope.source.evidenceSha256 ||
    createFreshEvidenceSectionSha256(resolved.envelope.semantic) !==
      envelope.source.semanticSha256 ||
    createFreshEvidenceSectionSha256(resolved.envelope.qualification) !==
      envelope.source.qualificationSha256
  ) {
    throw new Error('Pinned release evidence provenance does not match its original fresh source.');
  }
  return resolved;
};
