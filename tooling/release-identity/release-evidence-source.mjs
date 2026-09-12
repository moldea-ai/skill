import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { spawnSync } from 'node:child_process';

import { parse } from 'yaml';

import {
  QualificationAttemptResultSchema,
  QualificationModelStageEvidenceSchema,
} from '../../qualification/src/contracts/index.ts';
import { createQualificationAttemptKey } from '../../qualification/src/storage/index.ts';

import { CLI_PACKAGE_NAME, RELEASE_PATHS } from './constants.mjs';
import { createFreshEvidenceSectionSha256 } from './release-evidence-current.mjs';
import {
  createReleaseEvidenceSha256,
  parseReleaseEvidenceEnvelope,
} from './release-evidence-envelope.mjs';

const MAX_GIT_JSON_BYTES = 16 * 1_048_576;
const MAX_MATERIALIZED_FILE_BYTES = 32 * 1_048_576;
const MAX_SELECTED_EVIDENCE_FILE_BYTES = 16 * 1_048_576;
const MAX_SELECTED_EVIDENCE_FILE_COUNT = 8_192;
const MAX_SELECTED_EVIDENCE_TOTAL_BYTES = 64 * 1_048_576;
const MAX_SELECTED_EVIDENCE_LISTING_BYTES = 4 * 1_048_576;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const STABLE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/u;
const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const WINDOWS_RESERVED_PATH_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const SELECTED_EVIDENCE_LIMITS = {
  maximumFileByteCount: MAX_SELECTED_EVIDENCE_FILE_BYTES,
  maximumFileCount: MAX_SELECTED_EVIDENCE_FILE_COUNT,
  maximumTotalByteCount: MAX_SELECTED_EVIDENCE_TOTAL_BYTES,
};

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const createJsonDigest = (input) =>
  createHash('sha256').update(JSON.stringify(input)).digest('hex');

const hasInvalidPathCharacter = (segment) =>
  [...segment].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint <= 31 || codePoint === 127 || '<>:"|?*'.includes(character);
  });

const runGit = (repositoryRoot, arguments_, options = {}) => {
  const result = spawnSync('git', arguments_, {
    cwd: repositoryRoot,
    encoding: options.encoding,
    input: options.input,
    maxBuffer: options.maxBuffer ?? MAX_GIT_JSON_BYTES,
    shell: false,
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
  const segments = typeof path === 'string' ? path.split('/') : [];
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    Buffer.byteLength(path, 'utf8') > 160 ||
    path.includes('\\') ||
    posix.isAbsolute(path) ||
    segments.some(
      (segment) =>
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        Buffer.byteLength(segment, 'utf8') > 64 ||
        hasInvalidPathCharacter(segment) ||
        /[. ]$/u.test(segment) ||
        WINDOWS_RESERVED_PATH_PATTERN.test(segment),
    )
  ) {
    throw new Error(`${label} is not a safe repository-relative path.`);
  }
  return path;
};

const hasExcludedDirectory = (path) =>
  path.split('/').some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment));

const isWithinRepositoryPrefix = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

const readGitEvidenceBatch = (repositoryRoot, entries) => {
  const output = runGit(repositoryRoot, ['cat-file', '--batch'], {
    encoding: null,
    input: Buffer.from(`${entries.map(({ objectId }) => objectId).join('\n')}\n`, 'utf8'),
    maxBuffer: MAX_SELECTED_EVIDENCE_TOTAL_BYTES + MAX_SELECTED_EVIDENCE_LISTING_BYTES,
  });
  const files = new Map();
  let cursor = 0;

  for (const entry of entries) {
    const headerEnd = output.indexOf(0x0a, cursor);
    if (headerEnd === -1) {
      throw new Error(`Git evidence batch ended before ${entry.path}.`);
    }
    const header = output.subarray(cursor, headerEnd).toString('utf8');
    const match = /^([a-f0-9]{40}|[a-f0-9]{64}) blob (\d+)$/u.exec(header);
    if (match === null || match[1] !== entry.objectId || Number(match[2]) !== entry.byteCount) {
      throw new Error(`Git evidence batch returned an invalid object for ${entry.path}.`);
    }
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + entry.byteCount;
    if (contentEnd >= output.length || output[contentEnd] !== 0x0a) {
      throw new Error(`Git evidence batch returned a truncated object for ${entry.path}.`);
    }
    files.set(entry.path, Buffer.from(output.subarray(contentStart, contentEnd)));
    cursor = contentEnd + 1;
  }

  if (cursor !== output.length) {
    throw new Error('Git evidence batch returned unrequested object data.');
  }
  return files;
};

/** Validates one content-free Git tree listing before any selected blob is read. */
export const parseSelectedEvidenceListing = (
  listing,
  isAllowedPath,
  limits = SELECTED_EVIDENCE_LIMITS,
) => {
  const records = String(listing).split('\0').filter(Boolean);
  if (records.length === 0) {
    throw new Error('Pinned evidence source selection is empty.');
  }
  if (records.length > limits.maximumFileCount) {
    throw new Error(
      `Pinned evidence source exceeds the ${limits.maximumFileCount}-file limit.`,
    );
  }

  const entries = records.map((record) => {
    const match = /^(\d{6}) (\S+) ([a-f0-9]{40}|[a-f0-9]{64})\s+(\d+)\t(.+)$/u.exec(record);
    if (match === null) {
      throw new Error('Pinned evidence source contains an invalid Git tree record.');
    }
    const path = requireRepositoryPath(match[5], 'Git evidence path');
    const byteCount = Number(match[4]);
    if (match[1] !== '100644' && match[1] !== '100755') {
      throw new Error(`Pinned evidence source contains unsupported mode ${match[1]} at ${path}.`);
    }
    if (match[2] !== 'blob') {
      throw new Error(`Pinned evidence source contains unsupported object type at ${path}.`);
    }
    if (hasExcludedDirectory(path) || !isAllowedPath(path)) {
      throw new Error(`Pinned evidence source selected an unapproved path: ${path}.`);
    }
    if (!Number.isSafeInteger(byteCount) || byteCount > limits.maximumFileByteCount) {
      throw new Error(
        `Pinned evidence source file ${path} exceeds the ${limits.maximumFileByteCount}-byte limit.`,
      );
    }
    return {
      byteCount,
      mode: match[1],
      objectId: match[3],
      path,
    };
  });
  const orderedEntries = [...entries].sort((left, right) =>
    left.path.localeCompare(right.path, 'en'),
  );
  if (new Set(orderedEntries.map(({ path }) => path)).size !== orderedEntries.length) {
    throw new Error('Pinned evidence source contains duplicate paths.');
  }
  const totalByteCount = orderedEntries.reduce((total, { byteCount }) => total + byteCount, 0);
  if (totalByteCount > limits.maximumTotalByteCount) {
    throw new Error(
      `Pinned evidence source exceeds the ${limits.maximumTotalByteCount}-byte total limit.`,
    );
  }

  return { entries: orderedEntries, totalByteCount };
};

const loadGitEvidenceSnapshot = (repositoryRoot, commit, pathspecs, isAllowedPath) => {
  const listing = runGit(
    repositoryRoot,
    ['ls-tree', '-r', '-z', '-l', '--full-tree', commit, '--', ...pathspecs],
    {
      encoding: 'utf8',
      maxBuffer: MAX_SELECTED_EVIDENCE_LISTING_BYTES,
    },
  );
  const { entries, totalByteCount } = parseSelectedEvidenceListing(listing, isAllowedPath);

  return {
    entries,
    files: readGitEvidenceBatch(repositoryRoot, entries),
    totalByteCount,
  };
};

const createSemanticSourceSnapshot = (repositoryRoot, commit, semantic) => {
  const attemptRoot = `fixtures/semantic-evaluation-results/attempts/${requireRepositoryPath(
    semantic.attemptId,
    'Semantic attempt identity',
  )}`;
  const exactPaths = new Set([
    RELEASE_PATHS.packageManifest,
    RELEASE_PATHS.packageLock,
    RELEASE_PATHS.conformanceCases,
    RELEASE_PATHS.semanticCoverage,
    RELEASE_PATHS.semanticResult,
    'fixtures/semantic-evaluation-results/latest.json',
  ]);
  const pathspecs = [...exactPaths, 'moldea', attemptRoot];
  const snapshot = loadGitEvidenceSnapshot(
    repositoryRoot,
    commit,
    pathspecs,
    (path) =>
      exactPaths.has(path) ||
      isWithinRepositoryPrefix(path, 'moldea') ||
      isWithinRepositoryPrefix(path, attemptRoot),
  );
  for (const requiredPath of exactPaths) {
    if (!snapshot.files.has(requiredPath)) {
      throw new Error(`Pinned semantic source is missing ${requiredPath}.`);
    }
  }
  return snapshot;
};

const createQualificationSourceSnapshot = (repositoryRoot, commit, qualification) => {
  const exactPaths = new Set(['fixtures/resource-calibration.json']);
  const attemptRoots = [];
  for (const target of qualification.targets) {
    const targetKey = requireRepositoryPath(target.key, 'Qualification target key');
    const attemptKey = requireRepositoryPath(target.attemptKey, 'Qualification attempt key');
    exactPaths.add(`qualification/results/${targetKey}/latest.json`);
    attemptRoots.push(`qualification/results/${targetKey}/attempts/${attemptKey}`);
  }
  const pathspecs = [
    ...exactPaths,
    'moldea',
    'qualification/cases',
    'qualification/profiles',
    ...attemptRoots,
  ];
  const snapshot = loadGitEvidenceSnapshot(
    repositoryRoot,
    commit,
    pathspecs,
    (path) =>
      exactPaths.has(path) ||
      isWithinRepositoryPrefix(path, 'moldea') ||
      isWithinRepositoryPrefix(path, 'qualification/cases') ||
      isWithinRepositoryPrefix(path, 'qualification/profiles') ||
      attemptRoots.some((attemptRoot) => isWithinRepositoryPrefix(path, attemptRoot)),
  );
  for (const requiredPath of [
    'fixtures/resource-calibration.json',
    'qualification/cases/cases.yaml',
    'qualification/profiles/index.yaml',
    ...qualification.targets.flatMap(({ key, attemptKey }) => [
      `qualification/profiles/${key}/profile.yaml`,
      `qualification/results/${key}/latest.json`,
      `qualification/results/${key}/attempts/${attemptKey}/attempt.json`,
      `qualification/results/${key}/attempts/${attemptKey}/storage.json`,
    ]),
  ]) {
    if (!snapshot.files.has(requiredPath)) {
      throw new Error(`Pinned qualification source is missing ${requiredPath}.`);
    }
  }
  return snapshot;
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
    runGit(repositoryRoot, ['rev-parse', '--verify', 'HEAD'], {
      encoding: 'utf8',
    }),
  ).trim();
  if (tagCommit !== headCommit) {
    throw new Error(`Target release tag ${releaseTag} does not identify the checked-out commit.`);
  }
};

const readGitFile = (
  repositoryRoot,
  commit,
  relativePath,
  maximumBytes = MAX_GIT_JSON_BYTES,
  selectedFiles = null,
) => {
  requireRepositoryPath(relativePath, 'Git evidence path');
  if (selectedFiles !== null) {
    const source = selectedFiles.get(relativePath);
    if (source === undefined) {
      throw new Error(`Pinned evidence source did not select ${relativePath}.`);
    }
    if (source.byteLength > maximumBytes) {
      throw new Error(`Pinned evidence file ${relativePath} exceeds its read limit.`);
    }
    return source;
  }
  return runGit(repositoryRoot, ['show', `${commit}:${relativePath}`], {
    encoding: null,
    maxBuffer: maximumBytes,
  });
};

const readGitText = (repositoryRoot, commit, relativePath, selectedFiles = null) =>
  readGitFile(repositoryRoot, commit, relativePath, MAX_GIT_JSON_BYTES, selectedFiles).toString(
    'utf8',
  );

const readGitJson = (repositoryRoot, commit, relativePath, selectedFiles = null) => {
  try {
    return JSON.parse(readGitText(repositoryRoot, commit, relativePath, selectedFiles));
  } catch (error) {
    throw new Error(`Release evidence JSON is invalid at ${relativePath}.`, {
      cause: error,
    });
  }
};

const hashGitFile = (repositoryRoot, commit, relativePath, selectedFiles = null) =>
  createReleaseEvidenceSha256(
    readGitFile(repositoryRoot, commit, relativePath, MAX_GIT_JSON_BYTES, selectedFiles),
  );

const assertGitFileDigest = (
  repositoryRoot,
  commit,
  relativePath,
  expectedSha256,
  selectedFiles = null,
) => {
  if (hashGitFile(repositoryRoot, commit, relativePath, selectedFiles) !== expectedSha256) {
    throw new Error(`Release evidence digest does not match ${relativePath}.`);
  }
};

const createGitPortableSkillDigest = (repositoryRoot, commit, selectedFiles = null) => {
  if (selectedFiles !== null) {
    const paths = [...selectedFiles.keys()]
      .filter((path) => path.startsWith('moldea/'))
      .sort((left, right) => left.localeCompare(right, 'en'));
    if (paths.length === 0) {
      throw new Error('Pinned source commit has no portable moldea skill files.');
    }
    const hash = createHash('sha256');
    for (const path of paths) {
      hash.update(path.slice('moldea/'.length));
      hash.update('\0');
      hash.update(selectedFiles.get(path));
      hash.update('\0');
    }
    return hash.digest('hex');
  }
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
  if (files.length === 0) {
    throw new Error('Pinned source commit has no portable moldea skill files.');
  }
  const hash = createHash('sha256');
  for (const { path } of files) {
    hash.update(path.slice('moldea/'.length));
    hash.update('\0');
    hash.update(readGitFile(repositoryRoot, commit, path));
    hash.update('\0');
  }
  return hash.digest('hex');
};

const createGitSemanticCliIdentity = (repositoryRoot, commit, selectedFiles = null) => {
  const packageManifest = JSON.parse(
    readGitText(repositoryRoot, commit, RELEASE_PATHS.packageManifest, selectedFiles),
  );
  const packageLockText = readGitText(
    repositoryRoot,
    commit,
    RELEASE_PATHS.packageLock,
    selectedFiles,
  );
  const packageLock = JSON.parse(packageLockText);
  const cliVersion = packageManifest.devDependencies?.[CLI_PACKAGE_NAME];
  const cliJsonSchemaVersion = packageManifest.moldeaRelease?.cliJsonSchemaVersion;
  const lockedCli = packageLock.packages?.[`node_modules/${CLI_PACKAGE_NAME}`];
  if (
    typeof cliVersion !== 'string' ||
    lockedCli?.version !== cliVersion ||
    typeof lockedCli.integrity !== 'string' ||
    !Number.isSafeInteger(cliJsonSchemaVersion)
  ) {
    throw new Error('Pinned semantic source CLI closure is incomplete.');
  }
  return {
    integrity: lockedCli.integrity,
    jsonSchemaVersion: cliJsonSchemaVersion,
    name: CLI_PACKAGE_NAME,
    packageLockSha256: createReleaseEvidenceSha256(packageLockText),
    version: cliVersion,
  };
};

/*
 * Source evidence is authenticated through stable result invariants. Applying the current
 * evaluator schema here would reinterpret an immutable source after its protocol evolves.
 */
const createSemanticSourceCaseSuiteDigest = (caseDefinitions) => {
  if (!Array.isArray(caseDefinitions) || caseDefinitions.length === 0) {
    throw new Error('Pinned semantic source has no case definitions.');
  }
  const definitionsById = caseDefinitions
    .map((definition) => {
      if (!isPlainRecord(definition) || !STABLE_ID_PATTERN.test(definition.id)) {
        throw new Error('Pinned semantic source has an invalid case definition identity.');
      }
      return { digest: createJsonDigest(definition), id: definition.id };
    })
    .sort(({ id: left }, { id: right }) => left.localeCompare(right));
  const identifiers = definitionsById.map(({ id }) => id);
  if (new Set(identifiers).size !== identifiers.length) {
    throw new Error('Pinned semantic source case IDs must be unique.');
  }
  return createJsonDigest(definitionsById);
};

const createSemanticSourceCoverageDigest = (coverage) => {
  if (!isPlainRecord(coverage)) {
    throw new Error('Pinned semantic source coverage must be an object.');
  }
  return createJsonDigest(coverage);
};

const hasPassingSemanticSourceActivation = (evidence, budget) => {
  if (evidence.commandCount < budget.minimumMoldeaCommands) return false;
  if (budget.activation === 'abstain' || budget.activation === 'informational') {
    return evidence.commandCount === 0;
  }
  if (budget.activation === 'relationship') {
    return evidence.operations[0] === 'scope' && !evidence.operations.includes('inspect');
  }
  if (budget.activation === 'direct') return true;
  if (budget.activation === 'blocked') return evidence.operations[0] !== 'scope';
  return false;
};

const hasPassingSemanticSourceResourceBudget = (evidence, budget) => {
  const hasValidStructure =
    isPlainRecord(evidence) &&
    isPlainRecord(budget) &&
    typeof budget.activation === 'string' &&
    Number.isSafeInteger(budget.minimumMoldeaCommands) &&
    budget.minimumMoldeaCommands >= 0 &&
    Number.isSafeInteger(budget.maximumMoldeaCommands) &&
    budget.maximumMoldeaCommands >= budget.minimumMoldeaCommands &&
    Number.isSafeInteger(budget.maximumMoldeaOutputBytes) &&
    budget.maximumMoldeaOutputBytes >= 0 &&
    Number.isSafeInteger(evidence.commandCount) &&
    evidence.commandCount >= budget.minimumMoldeaCommands &&
    evidence.commandCount <= budget.maximumMoldeaCommands &&
    Number.isSafeInteger(evidence.maximumInvocationByteCount) &&
    evidence.maximumInvocationByteCount >= 0 &&
    evidence.maximumInvocationByteCount <= budget.maximumMoldeaOutputBytes &&
    Number.isSafeInteger(evidence.modelVisibleToolOutputByteCount) &&
    evidence.modelVisibleToolOutputByteCount >= 0 &&
    evidence.modelVisibleToolOutputByteCount <= budget.maximumMoldeaOutputBytes &&
    Number.isSafeInteger(evidence.stdoutByteCount) &&
    evidence.stdoutByteCount >= 0 &&
    evidence.stdoutByteCount <= budget.maximumMoldeaOutputBytes &&
    evidence.modelVisibleToolOutputByteCount === evidence.stdoutByteCount &&
    evidence.maximumInvocationByteCount <= evidence.stdoutByteCount &&
    Array.isArray(evidence.operations) &&
    evidence.operations.length === evidence.commandCount &&
    evidence.operations.every((operation) => typeof operation === 'string' && operation.length > 0);

  return hasValidStructure && hasPassingSemanticSourceActivation(evidence, budget);
};

const assertSemanticResourceEvidence = (caseDefinitions, result) => {
  const definitions = new Map(caseDefinitions.map((definition) => [definition.id, definition]));
  if (!Array.isArray(result.cases) || result.cases.length !== definitions.size) {
    throw new Error('Pinned semantic result has an incomplete case inventory.');
  }
  const resultIdentifiers = new Set();
  for (const caseResult of result.cases) {
    const definition = definitions.get(caseResult.id);
    if (
      !isPlainRecord(caseResult) ||
      definition === undefined ||
      resultIdentifiers.has(caseResult.id) ||
      caseResult.passed !== true ||
      !hasPassingSemanticSourceResourceBudget(
        caseResult.actorResourceEvidence,
        definition.resourceBudget,
      ) ||
      ('caseDefinitionDigest' in caseResult &&
        caseResult.caseDefinitionDigest !== createJsonDigest(definition))
    ) {
      throw new Error(`Pinned semantic case ${String(caseResult.id)} is failed or over budget.`);
    }
    resultIdentifiers.add(caseResult.id);
  }
};

const createSemanticSourceProjection = (attempt, caseDefinitions) => {
  const expectedCaseIdentifiers = new Set(caseDefinitions.map(({ id }) => id));
  const cases = Array.isArray(attempt.cases) ? attempt.cases : [];
  const attemptCaseIdentifiers = new Set();
  let hasInvalidCaseInventory = false;
  let passedCaseCount = 0;
  let recoveredCaseCount = 0;
  let failedCaseCount = 0;
  for (const caseResult of cases) {
    if (
      !isPlainRecord(caseResult) ||
      typeof caseResult.id !== 'string' ||
      !expectedCaseIdentifiers.has(caseResult.id) ||
      attemptCaseIdentifiers.has(caseResult.id)
    ) {
      hasInvalidCaseInventory = true;
      continue;
    }
    attemptCaseIdentifiers.add(caseResult.id);
    if (caseResult.status === 'passed') passedCaseCount += 1;
    else if (caseResult.status === 'recovered') recoveredCaseCount += 1;
    else if (caseResult.status === 'failed') failedCaseCount += 1;
    else hasInvalidCaseInventory = true;
  }
  const caseCount = caseDefinitions.length;
  const pendingCaseCount = caseCount - cases.length;
  const createdAt = Date.parse(attempt.createdAt);
  const updatedAt = Date.parse(attempt.updatedAt);
  if (
    typeof attempt.createdAt !== 'string' ||
    typeof attempt.updatedAt !== 'string' ||
    Number.isNaN(createdAt) ||
    Number.isNaN(updatedAt) ||
    updatedAt < createdAt ||
    hasInvalidCaseInventory ||
    attemptCaseIdentifiers.size !== caseCount ||
    attempt.totalCaseCount !== caseCount ||
    attempt.passedCaseCount !== passedCaseCount ||
    attempt.recoveredCaseCount !== recoveredCaseCount ||
    attempt.failedCaseCount !== failedCaseCount ||
    attempt.pendingCaseCount !== pendingCaseCount ||
    attempt.status !== 'passed' ||
    failedCaseCount !== 0 ||
    pendingCaseCount !== 0 ||
    cases.some(
      (caseResult) =>
        !isPlainRecord(caseResult) ||
        (caseResult.status !== 'passed' && caseResult.status !== 'recovered'),
    )
  ) {
    throw new Error('Pinned semantic attempt has a contradictory result summary.');
  }
  return {
    artifactDigest: attempt.artifactDigest,
    attemptId: attempt.attemptId,
    createdAt: attempt.createdAt,
    failedCaseCount,
    passedCaseCount,
    pendingCaseCount,
    recoveredCaseCount,
    status: 'passed',
    totalCaseCount: caseCount,
    updatedAt: attempt.updatedAt,
  };
};

const assertSemanticSource = (
  repositoryRoot,
  commit,
  semantic,
  portableSkillSha256,
  selectedFiles = null,
) => {
  const result = readGitJson(repositoryRoot, commit, RELEASE_PATHS.semanticResult, selectedFiles);
  const caseDefinitions = readGitJson(
    repositoryRoot,
    commit,
    RELEASE_PATHS.conformanceCases,
    selectedFiles,
  ).semanticCases;
  const coverage = readGitJson(
    repositoryRoot,
    commit,
    RELEASE_PATHS.semanticCoverage,
    selectedFiles,
  );
  const caseSuiteDigest = createSemanticSourceCaseSuiteDigest(caseDefinitions);
  const coverageDigest = createSemanticSourceCoverageDigest(coverage);
  const latestPath = 'fixtures/semantic-evaluation-results/latest.json';
  const attemptPath = `fixtures/semantic-evaluation-results/attempts/${semantic.attemptId}/attempt.json`;
  const attempt = readGitJson(repositoryRoot, commit, attemptPath, selectedFiles);
  const latest = readGitJson(repositoryRoot, commit, latestPath, selectedFiles);
  if (
    result.semanticAttemptId !== semantic.attemptId ||
    result.evaluationProtocolVersion !== semantic.protocolVersion ||
    result.artifactDigest !== portableSkillSha256 ||
    result.artifactSha256 !== portableSkillSha256 ||
    result.caseSuiteDigest !== caseSuiteDigest ||
    result.coverageDigest !== coverageDigest ||
    JSON.stringify(result.cli) !==
      JSON.stringify(createGitSemanticCliIdentity(repositoryRoot, commit, selectedFiles)) ||
    attempt.attemptId !== semantic.attemptId ||
    attempt.artifactDigest !== portableSkillSha256 ||
    attempt.status !== 'passed' ||
    latest.latestStatus !== 'passed' ||
    latest.latestAttemptId !== semantic.attemptId ||
    latest.lastPassingAttemptId !== semantic.attemptId
  ) {
    throw new Error('Pinned semantic evidence is not one self-consistent passing attempt.');
  }
  assertGitFileDigest(
    repositoryRoot,
    commit,
    RELEASE_PATHS.semanticResult,
    semantic.resultSha256,
    selectedFiles,
  );
  assertGitFileDigest(repositoryRoot, commit, attemptPath, semantic.attemptSha256, selectedFiles);
  assertGitFileDigest(repositoryRoot, commit, latestPath, semantic.latestSha256, selectedFiles);
  const evidencePath = `${posix.dirname(attemptPath)}/${requireRepositoryPath(
    attempt.evidence?.path,
    'Semantic raw evidence path',
  )}`;
  if (attempt.evidence?.sha256 !== semantic.evidenceSha256) {
    throw new Error('Pinned semantic attempt does not match its envelope evidence digest.');
  }
  assertGitFileDigest(repositoryRoot, commit, evidencePath, semantic.evidenceSha256, selectedFiles);
  assertSemanticResourceEvidence(caseDefinitions, result);
  return createSemanticSourceProjection(attempt, caseDefinitions);
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

const assertQualificationSource = (repositoryRoot, commit, qualification, selectedFiles = null) => {
  const profileIndex = parse(
    readGitText(repositoryRoot, commit, 'qualification/profiles/index.yaml', selectedFiles),
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
  const targetProjections = [];
  for (const target of qualification.targets) {
    const targetRoot = `qualification/results/${target.key}`;
    const profile = parse(
      readGitText(
        repositoryRoot,
        commit,
        `qualification/profiles/${target.key}/profile.yaml`,
        selectedFiles,
      ),
    );
    const latestPath = `${targetRoot}/latest.json`;
    const attemptRoot = `${targetRoot}/attempts/${target.attemptKey}`;
    const attemptPath = `${attemptRoot}/attempt.json`;
    const storagePath = `${attemptRoot}/storage.json`;
    const latest = readGitJson(repositoryRoot, commit, latestPath, selectedFiles);
    const attemptInput = readGitJson(repositoryRoot, commit, attemptPath, selectedFiles);
    const parsedAttempt = QualificationAttemptResultSchema.safeParse(attemptInput);
    if (!parsedAttempt.success) {
      throw new Error(`Pinned qualification target ${target.key} has an invalid attempt record.`);
    }
    const attempt = parsedAttempt.data;
    const storage = readGitJson(repositoryRoot, commit, storagePath, selectedFiles);
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
    assertGitFileDigest(repositoryRoot, commit, latestPath, target.latestSha256, selectedFiles);
    assertGitFileDigest(repositoryRoot, commit, attemptPath, target.attemptSha256, selectedFiles);
    assertGitFileDigest(repositoryRoot, commit, storagePath, target.storageSha256, selectedFiles);
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
        selectedFiles,
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
    if (attempt.completedAt === null) {
      throw new Error(`Pinned qualification target ${target.key} has no completion time.`);
    }
    targetProjections.push({
      adapterId: target.adapterId,
      attemptId: target.attemptId,
      completedAt: attempt.completedAt,
      createdAt: attempt.createdAt,
      implementationId: target.implementationId,
      packages: attempt.provenance.packages.map(({ name, version }) => ({
        name,
        version,
      })),
    });
  }
  return targetProjections;
};

const createSemanticEvidenceAtCommit = (repositoryRoot, commit, portableSkillSha256) => {
  const result = readGitJson(repositoryRoot, commit, RELEASE_PATHS.semanticResult);
  const semanticAttemptId = result.semanticAttemptId;
  const latestPath = 'fixtures/semantic-evaluation-results/latest.json';
  const attemptPath = `fixtures/semantic-evaluation-results/attempts/${semanticAttemptId}/attempt.json`;
  const attempt = readGitJson(repositoryRoot, commit, attemptPath);
  const evidence = {
    attemptId: semanticAttemptId,
    attemptSha256: hashGitFile(repositoryRoot, commit, attemptPath),
    evidenceSha256: attempt.evidence?.sha256,
    latestSha256: hashGitFile(repositoryRoot, commit, latestPath),
    protocolVersion: result.evaluationProtocolVersion,
    resourceStatus: 'passed',
    resultSha256: hashGitFile(repositoryRoot, commit, RELEASE_PATHS.semanticResult),
  };
  assertSemanticSource(repositoryRoot, commit, evidence, portableSkillSha256);
  return evidence;
};

const createQualificationEvidenceAtCommit = (repositoryRoot, commit) => {
  const profileIndex = parse(
    readGitText(repositoryRoot, commit, 'qualification/profiles/index.yaml'),
  );
  if (
    profileIndex?.version !== 1 ||
    !Array.isArray(profileIndex.targets) ||
    profileIndex.targets.length === 0
  ) {
    throw new Error('Pinned qualification source has no valid target index.');
  }
  const targets = profileIndex.targets
    .map((target) => {
      const targetRoot = `qualification/results/${target.key}`;
      const latestPath = `${targetRoot}/latest.json`;
      const latest = readGitJson(repositoryRoot, commit, latestPath);
      const attemptKey = createQualificationAttemptKey(latest.latestAttemptId);
      const attemptPath = `${targetRoot}/attempts/${attemptKey}/attempt.json`;
      const storagePath = `${targetRoot}/attempts/${attemptKey}/storage.json`;
      return {
        adapterId: target.adapterId,
        attemptId: latest.latestAttemptId,
        attemptKey,
        attemptSha256: hashGitFile(repositoryRoot, commit, attemptPath),
        implementationId: target.implementationId,
        key: target.key,
        latestSha256: hashGitFile(repositoryRoot, commit, latestPath),
        storageSha256: hashGitFile(repositoryRoot, commit, storagePath),
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key, 'en'));
  const evidence = {
    protocolVersion: readGitJson(
      repositoryRoot,
      commit,
      `qualification/results/${targets[0].key}/latest.json`,
    ).protocolVersion,
    resourceStatus: 'passed',
    targets,
  };
  assertQualificationSource(repositoryRoot, commit, evidence);
  return evidence;
};

const createPinnedSectionSource = (repositoryRoot, commit, tag, kind) => {
  const portableSkillSha256 = createGitPortableSkillDigest(repositoryRoot, commit);
  const evidence =
    kind === 'semantic'
      ? createSemanticEvidenceAtCommit(repositoryRoot, commit, portableSkillSha256)
      : createQualificationEvidenceAtCommit(repositoryRoot, commit);
  return {
    commit,
    evidence,
    evidenceSha256: createFreshEvidenceSectionSha256(evidence),
    portableSkillSha256,
    tag,
  };
};

/** Loads and verifies one bounded pinned evidence source from immutable Git objects. */
export const loadPinnedReleaseEvidenceSection = (repositoryRoot, section, kind) => {
  const { source } = section;
  if (
    source.tag !== null &&
    resolveReleaseTagCommit(repositoryRoot, source.tag) !== source.commit
  ) {
    throw new Error(`Pinned ${kind} source tag does not match its recorded commit.`);
  }
  if (createFreshEvidenceSectionSha256(source.evidence) !== source.evidenceSha256) {
    throw new Error(`Pinned ${kind} evidence descriptor digest does not match.`);
  }
  const snapshot =
    kind === 'semantic'
      ? createSemanticSourceSnapshot(repositoryRoot, source.commit, source.evidence)
      : createQualificationSourceSnapshot(repositoryRoot, source.commit, source.evidence);
  if (
    createGitPortableSkillDigest(repositoryRoot, source.commit, snapshot.files) !==
    source.portableSkillSha256
  ) {
    throw new Error(`Pinned ${kind} source portable skill digest does not match its commit.`);
  }
  const projection =
    kind === 'semantic'
      ? assertSemanticSource(
          repositoryRoot,
          source.commit,
          source.evidence,
          source.portableSkillSha256,
          snapshot.files,
        )
      : assertQualificationSource(repositoryRoot, source.commit, source.evidence, snapshot.files);

  return {
    commit: source.commit,
    fileCount: snapshot.entries.length,
    files: snapshot.files,
    projection,
    totalByteCount: snapshot.totalByteCount,
  };
};

/** Verifies one pinned semantic or qualification section against immutable Git evidence. */
export const assertPinnedReleaseEvidenceSection = (repositoryRoot, section, kind) => {
  return loadPinnedReleaseEvidenceSection(repositoryRoot, section, kind).projection;
};

/** Resolves one exact commit or stable tag to a direct immutable evidence source. */
export const resolveReleaseEvidenceSectionSource = (
  repositoryRoot,
  { commit = null, kind, tag = null },
) => {
  if ((tag === null) === (commit === null)) {
    throw new Error('Select exactly one pinned evidence source commit or tag.');
  }
  if (kind !== 'semantic' && kind !== 'qualification') {
    throw new Error('Pinned evidence kind must be semantic or qualification.');
  }
  const resolvedCommit = tag === null ? commit : resolveReleaseTagCommit(repositoryRoot, tag);
  if (
    typeof resolvedCommit !== 'string' ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(resolvedCommit)
  ) {
    throw new Error('Pinned evidence source commit must be a full Git object id.');
  }
  if (tag === null) return createPinnedSectionSource(repositoryRoot, resolvedCommit, null, kind);

  const envelope = parseReleaseEvidenceEnvelope(
    readGitText(repositoryRoot, resolvedCommit, RELEASE_PATHS.releaseEvidence),
  );
  if (tag !== `v${envelope.target.version}`) {
    throw new Error('Pinned source tag does not match its release envelope version.');
  }
  const section = envelope[kind];
  if (section.mode === 'pinned') {
    assertPinnedReleaseEvidenceSection(repositoryRoot, section, kind);
    return section.source;
  }
  const source = {
    commit: resolvedCommit,
    evidence: section.evidence,
    evidenceSha256: createFreshEvidenceSectionSha256(section.evidence),
    portableSkillSha256: envelope.target.portableSkillSha256,
    tag,
  };
  assertPinnedReleaseEvidenceSection(
    repositoryRoot,
    { mode: 'pinned', reason: 'source', source },
    kind,
  );
  return source;
};
