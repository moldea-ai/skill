import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync } from 'node:fs';
import { link, mkdir, open, readFile, rm } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

import { createCliClosureDigest } from './cli-closure.mjs';
import { createPortableSkillBehaviorDigest } from './portable-skill.mjs';
import { createSemanticInputDigest } from './semantic-inputs.mjs';

const ATTEMPT_ID_PATTERN = /^\d{8}T\d{9}Z-semantic-[a-f0-9]{8}$/u;
const EXCLUDED_CONTEXT_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const GIT_COMMIT_PATTERN = /^[a-f0-9]{40,64}$/u;
const RECEIPT_CONSUMPTION_SUFFIX = '.consumed';
const SIDECAR_TEMPORARY_SUFFIX = '.tmp';
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u;
const SOURCE_PATHS = [
  'fixtures/conformance-cases.json',
  'fixtures/semantic-evaluation-coverage.json',
  'fixtures/tooling',
  'moldea',
  'package-lock.json',
  'package.json',
  'tests/semantic-evaluation-runner.mjs',
  'tooling/codex-evaluation-host',
  'tooling/evidence-identity',
  'tooling/release-identity',
  'tooling/resource-calibration/profiles.mjs',
  'tooling/semantic-evaluation',
];
const SOURCE_PATH_EXCLUSIONS = [
  ':(top,exclude,glob)**/*.d.mts',
  ':(top,exclude,glob)**/*.test-integration.mjs',
  ':(top,exclude,glob)**/*.test-unit.mjs',
];
const REQUIRED_SOURCE_PATHS = new Set([
  'fixtures/conformance-cases.json',
  'fixtures/semantic-evaluation-coverage.json',
  'moldea/SKILL.md',
  'package-lock.json',
  'package.json',
  'tests/semantic-evaluation-runner.mjs',
  'tooling/codex-evaluation-host/index.mjs',
  'tooling/evidence-identity/cli-closure.mjs',
  'tooling/evidence-identity/portable-skill.mjs',
  'tooling/evidence-identity/semantic-evaluation-child.mjs',
  'tooling/evidence-identity/semantic-evaluation.mjs',
  'tooling/evidence-identity/semantic-inputs.mjs',
  'tooling/evidence-identity/semantic-identity.mjs',
  'tooling/release-identity/constants.mjs',
  'tooling/release-identity/identity.mjs',
  'tooling/release-identity/index.mjs',
  'tooling/resource-calibration/profiles.mjs',
  'tooling/semantic-evaluation/index.mjs',
]);

// versioned semantic identity contract and repository paths
export const SEMANTIC_IDENTITY_SCHEMA_VERSION = 1;
export const SEMANTIC_IDENTITY_RECEIPT_PATH = 'fixtures/.semantic-evaluation-identity-receipt.json';
export const SEMANTIC_RESULTS_PATH = 'fixtures/semantic-evaluation-results';

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const createSha256 = (content) => createHash('sha256').update(content).digest('hex');

const createJsonDigest = (input) => createSha256(`${JSON.stringify(input)}\n`);

const hasExactKeys = (input, expectedKeys) => {
  const actualKeys = Object.keys(input).sort((left, right) => left.localeCompare(right, 'en'));
  return JSON.stringify(actualKeys) === JSON.stringify([...expectedKeys].sort());
};

const requireSha256 = (input, label) => {
  if (typeof input !== 'string' || !SHA256_PATTERN.test(input)) {
    throw new Error(`${label} must be a SHA-256 digest.`);
  }

  return input;
};

const requireProcessId = (input, label) => {
  if (!Number.isSafeInteger(input) || input < 1) {
    throw new Error(`${label} must be a positive process ID.`);
  }

  return input;
};

const requireSafeRelativePath = (input, label) => {
  if (
    typeof input !== 'string' ||
    input.length === 0 ||
    input.includes('\0') ||
    input.includes('\\') ||
    isAbsolute(input)
  ) {
    throw new Error(`${label} must be a safe repository-relative path.`);
  }

  const segments = input.split('/');
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === '.' ||
        segment === '..' ||
        EXCLUDED_CONTEXT_DIRECTORY_NAMES.has(segment),
    )
  ) {
    throw new Error(`${label} contains a forbidden path segment.`);
  }

  return input;
};

const runGit = (repositoryRoot, arguments_) => {
  try {
    return execFileSync('git', arguments_, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail =
      error && typeof error === 'object' && 'stderr' in error
        ? String(error.stderr).trim()
        : 'unknown Git failure';
    throw new Error(`Unable to inspect semantic source state: ${detail}`, {
      cause: error,
    });
  }
};

const getSourcePathspecs = () => [...SOURCE_PATHS, ...SOURCE_PATH_EXCLUSIONS];

const readGitHead = (repositoryRoot) => {
  const sourceCommit = runGit(repositoryRoot, ['rev-parse', '--verify', 'HEAD']).trim();
  if (!GIT_COMMIT_PATTERN.test(sourceCommit)) {
    throw new Error('Semantic source HEAD is not an exact Git commit.');
  }

  return sourceCommit;
};

const assertRelevantSourceClean = (repositoryRoot) => {
  const status = runGit(repositoryRoot, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
    '--',
    ...getSourcePathspecs(),
  ]);
  if (status.length > 0) {
    throw new Error(
      'Semantic recording requires every relevant skill, runner, fixture, host, protocol, and CLI source path to match HEAD.',
    );
  }
};

const parseTrackedSourceEntries = (output) => {
  const entries = [];
  for (const record of output.split('\0')) {
    if (record.length === 0) continue;
    const match = record.match(/^([0-7]{6}) [a-f0-9]{40,64} ([0-3])\t([\s\S]+)$/u);
    if (match === null || match[2] !== '0') {
      throw new Error('Semantic source inventory contains an unsupported Git index record.');
    }
    entries.push({
      mode: match[1],
      path: requireSafeRelativePath(match[3], 'Source path'),
    });
  }

  entries.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  if (new Set(entries.map(({ path }) => path)).size !== entries.length) {
    throw new Error('Semantic source inventory contains duplicate paths.');
  }
  for (const requiredPath of REQUIRED_SOURCE_PATHS) {
    if (!entries.some(({ path }) => path === requiredPath)) {
      throw new Error(`Semantic source inventory is missing ${requiredPath}.`);
    }
  }

  return entries;
};

const readSourceContent = (repositoryRoot, sourceEntry) => {
  const absolutePath = resolve(repositoryRoot, sourceEntry.path);
  const relativePath = relative(repositoryRoot, absolutePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Semantic source path escapes the repository: ${sourceEntry.path}.`);
  }

  const pathStats = lstatSync(absolutePath);
  if (sourceEntry.mode === '120000') {
    const target = pathStats.isSymbolicLink()
      ? readlinkSync(absolutePath, 'utf8')
      : readFileSync(absolutePath, 'utf8');
    if (target.includes('\0') || target.includes('\\') || isAbsolute(target)) {
      throw new Error(`Semantic source symlink is unsafe: ${sourceEntry.path}.`);
    }
    const targetPath = resolve(dirname(absolutePath), target);
    const targetRelativePath = relative(repositoryRoot, targetPath).replaceAll('\\', '/');
    requireSafeRelativePath(targetRelativePath, `Source symlink ${sourceEntry.path}`);
    return Buffer.from(target);
  }
  if (!['100644', '100755'].includes(sourceEntry.mode) || !pathStats.isFile()) {
    throw new Error(`Semantic source path has an unsupported type: ${sourceEntry.path}.`);
  }

  return readFileSync(absolutePath);
};

const validateSourceEntries = (sourceEntries) => {
  if (!Array.isArray(sourceEntries) || sourceEntries.length === 0) {
    throw new Error('Semantic source entries must be a non-empty array.');
  }

  let previousPath = '';
  for (const sourceEntry of sourceEntries) {
    if (
      !isPlainRecord(sourceEntry) ||
      !hasExactKeys(sourceEntry, ['mode', 'path', 'sha256']) ||
      !['100644', '100755', '120000'].includes(sourceEntry.mode)
    ) {
      throw new Error('Semantic source inventory contains an invalid entry.');
    }
    requireSafeRelativePath(sourceEntry.path, 'Source path');
    requireSha256(sourceEntry.sha256, `Source ${sourceEntry.path}`);
    if (sourceEntry.path.localeCompare(previousPath, 'en') <= 0) {
      throw new Error('Semantic source inventory must use unique sorted paths.');
    }
    previousPath = sourceEntry.path;
  }

  return sourceEntries;
};

/** Captures one exact, clean, relevant semantic source inventory at HEAD. */
export const captureSemanticSourceIdentity = (repositoryRoot) => {
  assertRelevantSourceClean(repositoryRoot);
  const sourceCommit = readGitHead(repositoryRoot);
  const trackedEntries = parseTrackedSourceEntries(
    runGit(repositoryRoot, ['ls-files', '--stage', '-z', '--', ...getSourcePathspecs()]),
  );
  const sourceEntries = trackedEntries.map((entry) => ({
    ...entry,
    sha256: createSha256(readSourceContent(repositoryRoot, entry)),
  }));
  const sourceDigest = createJsonDigest(sourceEntries);

  assertRelevantSourceClean(repositoryRoot);
  if (readGitHead(repositoryRoot) !== sourceCommit) {
    throw new Error('Semantic source HEAD changed while its identity was being captured.');
  }
  const recapturedEntries = parseTrackedSourceEntries(
    runGit(repositoryRoot, ['ls-files', '--stage', '-z', '--', ...getSourcePathspecs()]),
  ).map((entry) => ({
    ...entry,
    sha256: createSha256(readSourceContent(repositoryRoot, entry)),
  }));
  if (createJsonDigest(recapturedEntries) !== sourceDigest) {
    throw new Error('Semantic source changed while its identity was being captured.');
  }

  return { sourceCommit, sourceDigest, sourceEntries };
};

const validateAttemptIdentity = (identity, attemptEntry, receipt = null) => {
  if (
    !isPlainRecord(identity) ||
    !hasExactKeys(identity, [
      'argumentDigest',
      'attemptId',
      'attemptSha256',
      'cliClosureDigest',
      'evidenceSha256',
      'invocationId',
      'portableSkillBehaviorDigest',
      'schemaVersion',
      'semanticInputDigest',
      'sourceCommit',
      'sourceDigest',
    ]) ||
    identity.schemaVersion !== SEMANTIC_IDENTITY_SCHEMA_VERSION ||
    identity.attemptId !== attemptEntry.attemptId ||
    identity.attemptSha256 !== attemptEntry.attemptSha256 ||
    identity.evidenceSha256 !== attemptEntry.evidenceSha256 ||
    !GIT_COMMIT_PATTERN.test(identity.sourceCommit) ||
    typeof identity.invocationId !== 'string' ||
    identity.invocationId.length === 0
  ) {
    throw new Error(`Semantic attempt ${attemptEntry.attemptId} has an invalid identity sidecar.`);
  }
  requireSha256(identity.argumentDigest, 'Semantic identity argument digest');
  requireSha256(identity.cliClosureDigest, 'Semantic identity CLI closure digest');
  requireSha256(
    identity.portableSkillBehaviorDigest,
    'Semantic identity portable-skill behavior digest',
  );
  requireSha256(identity.semanticInputDigest, 'Semantic identity input digest');
  requireSha256(identity.sourceDigest, 'Semantic identity source digest');

  if (
    receipt !== null &&
    (identity.argumentDigest !== receipt.argumentDigest ||
      identity.cliClosureDigest !== receipt.cliClosureDigest ||
      identity.invocationId !== receipt.invocationId ||
      identity.portableSkillBehaviorDigest !== receipt.portableSkillBehaviorDigest ||
      identity.semanticInputDigest !== receipt.semanticInputDigest ||
      identity.sourceCommit !== receipt.sourceCommit ||
      identity.sourceDigest !== receipt.sourceDigest)
  ) {
    throw new Error(
      `Semantic attempt ${attemptEntry.attemptId} identity does not match the active receipt.`,
    );
  }

  return identity;
};

const readAttemptEntry = (attemptsRoot, entry) => {
  if (
    !entry.isDirectory() ||
    !ATTEMPT_ID_PATTERN.test(entry.name) ||
    EXCLUDED_CONTEXT_DIRECTORY_NAMES.has(entry.name)
  ) {
    throw new Error(`Semantic attempt history contains an invalid entry: ${entry.name}.`);
  }

  const attemptDirectory = join(attemptsRoot, entry.name);
  const attemptFilenames = readdirSync(attemptDirectory).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
  if (
    attemptFilenames.some(
      (filename) => !['attempt.json', 'evidence.json', 'identity.json'].includes(filename),
    )
  ) {
    throw new Error(`Semantic attempt ${entry.name} contains an unsupported artifact.`);
  }
  const attemptPath = join(attemptDirectory, 'attempt.json');
  const evidencePath = join(attemptDirectory, 'evidence.json');
  const identityPath = join(attemptDirectory, 'identity.json');
  for (const requiredPath of [attemptPath, evidencePath]) {
    if (!lstatSync(requiredPath).isFile()) {
      throw new Error(`Semantic attempt ${entry.name} is missing an immutable record.`);
    }
  }
  const attemptContent = readFileSync(attemptPath);
  const evidenceContent = readFileSync(evidencePath);
  const attempt = JSON.parse(attemptContent.toString('utf8'));
  const evidenceSha256 = createSha256(evidenceContent);
  if (
    !isPlainRecord(attempt) ||
    attempt.attemptId !== entry.name ||
    !isPlainRecord(attempt.evidence) ||
    attempt.evidence.path !== 'evidence.json' ||
    attempt.evidence.sha256 !== evidenceSha256
  ) {
    throw new Error(`Semantic attempt ${entry.name} does not bind its exact evidence bytes.`);
  }

  return {
    attemptId: entry.name,
    attemptSha256: createSha256(attemptContent),
    evidenceSha256,
    identitySha256: existsSync(identityPath) ? createSha256(readFileSync(identityPath)) : null,
  };
};

const validateAttemptInventory = (attemptInventory) => {
  if (!Array.isArray(attemptInventory)) {
    throw new Error('Semantic attempt inventory must be an array.');
  }

  let previousAttemptId = '';
  for (const attemptEntry of attemptInventory) {
    if (
      !isPlainRecord(attemptEntry) ||
      !hasExactKeys(attemptEntry, [
        'attemptId',
        'attemptSha256',
        'evidenceSha256',
        'identitySha256',
      ]) ||
      !ATTEMPT_ID_PATTERN.test(attemptEntry.attemptId) ||
      (attemptEntry.identitySha256 !== null && !SHA256_PATTERN.test(attemptEntry.identitySha256))
    ) {
      throw new Error('Semantic attempt inventory contains an invalid entry.');
    }
    requireSha256(attemptEntry.attemptSha256, `Attempt ${attemptEntry.attemptId}`);
    requireSha256(attemptEntry.evidenceSha256, `Evidence ${attemptEntry.attemptId}`);
    if (attemptEntry.attemptId.localeCompare(previousAttemptId, 'en') <= 0) {
      throw new Error('Semantic attempt inventory must use unique sorted attempt IDs.');
    }
    previousAttemptId = attemptEntry.attemptId;
  }

  return attemptInventory;
};

/** Captures the exact immutable semantic attempt records and optional identity sidecars. */
export const captureSemanticAttemptInventory = (repositoryRoot) => {
  const attemptsRoot = join(repositoryRoot, SEMANTIC_RESULTS_PATH, 'attempts');
  if (!existsSync(attemptsRoot)) return [];
  const entries = readdirSync(attemptsRoot, { withFileTypes: true })
    .filter(({ name }) => !name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  return validateAttemptInventory(entries.map((entry) => readAttemptEntry(attemptsRoot, entry)));
};

/** Reads and validates the optional identity sidecar for one immutable semantic attempt. */
export const readSemanticAttemptIdentity = (repositoryRoot, attemptId) => {
  if (typeof attemptId !== 'string' || !ATTEMPT_ID_PATTERN.test(attemptId)) {
    throw new Error('Semantic identity lookup requires one exact attempt ID.');
  }
  const attemptsRoot = join(repositoryRoot, SEMANTIC_RESULTS_PATH, 'attempts');
  if (!existsSync(attemptsRoot)) return null;
  const attemptEntry = readdirSync(attemptsRoot, { withFileTypes: true }).find(
    ({ name }) => name === attemptId,
  );
  if (attemptEntry === undefined) {
    throw new Error(`Semantic identity references missing attempt ${attemptId}.`);
  }
  const inventoryEntry = readAttemptEntry(attemptsRoot, attemptEntry);
  if (inventoryEntry.identitySha256 === null) return null;
  const identityPath = join(attemptsRoot, attemptId, 'identity.json');
  return validateAttemptIdentity(JSON.parse(readFileSync(identityPath, 'utf8')), inventoryEntry);
};

const validateReceipt = (receipt) => {
  if (
    !isPlainRecord(receipt) ||
    !hasExactKeys(receipt, [
      'argumentDigest',
      'attemptInventory',
      'cliClosureDigest',
      'evaluatorProcessId',
      'invocationId',
      'ownerProcessId',
      'portableSkillBehaviorDigest',
      'recordingKind',
      'schemaVersion',
      'semanticInputDigest',
      'sourceCommit',
      'sourceDigest',
      'sourceEntries',
    ]) ||
    receipt.schemaVersion !== SEMANTIC_IDENTITY_SCHEMA_VERSION ||
    !['record', 'record-checkpoint'].includes(receipt.recordingKind) ||
    typeof receipt.invocationId !== 'string' ||
    receipt.invocationId.length === 0 ||
    !GIT_COMMIT_PATTERN.test(receipt.sourceCommit)
  ) {
    throw new Error('Semantic identity receipt has an invalid contract.');
  }
  requireSha256(receipt.argumentDigest, 'Semantic receipt argument digest');
  requireSha256(receipt.cliClosureDigest, 'Semantic receipt CLI closure digest');
  if (receipt.evaluatorProcessId !== null) {
    requireProcessId(receipt.evaluatorProcessId, 'Semantic receipt evaluator');
  }
  requireProcessId(receipt.ownerProcessId, 'Semantic receipt owner');
  requireSha256(
    receipt.portableSkillBehaviorDigest,
    'Semantic receipt portable-skill behavior digest',
  );
  requireSha256(receipt.semanticInputDigest, 'Semantic receipt input digest');
  requireSha256(receipt.sourceDigest, 'Semantic receipt source digest');
  validateSourceEntries(receipt.sourceEntries);
  validateAttemptInventory(receipt.attemptInventory);
  if (createJsonDigest(receipt.sourceEntries) !== receipt.sourceDigest) {
    throw new Error('Semantic identity receipt source digest does not match its inventory.');
  }

  return receipt;
};

/** Creates a receipt for one recording invocation after exact source capture. */
export const createSemanticIdentityReceipt = (repositoryRoot, arguments_) => {
  if (
    !Array.isArray(arguments_) ||
    !arguments_.every((argument) => typeof argument === 'string') ||
    (!arguments_.includes('--record') && !arguments_.includes('--record-checkpoint'))
  ) {
    throw new Error('Semantic identity receipts require exact recording arguments.');
  }
  const sourceIdentity = captureSemanticSourceIdentity(repositoryRoot);
  const receipt = {
    argumentDigest: createJsonDigest(arguments_),
    attemptInventory: captureSemanticAttemptInventory(repositoryRoot),
    cliClosureDigest: createCliClosureDigest(repositoryRoot),
    evaluatorProcessId: null,
    invocationId: randomUUID(),
    ownerProcessId: process.pid,
    portableSkillBehaviorDigest: createPortableSkillBehaviorDigest(repositoryRoot),
    recordingKind: arguments_.includes('--record-checkpoint') ? 'record-checkpoint' : 'record',
    schemaVersion: SEMANTIC_IDENTITY_SCHEMA_VERSION,
    semanticInputDigest: createSemanticInputDigest(repositoryRoot),
    ...sourceIdentity,
  };
  const recapturedSource = captureSemanticSourceIdentity(repositoryRoot);
  if (
    recapturedSource.sourceCommit !== receipt.sourceCommit ||
    recapturedSource.sourceDigest !== receipt.sourceDigest
  ) {
    throw new Error('Semantic source changed while the recording receipt was being created.');
  }

  return validateReceipt(receipt);
};

const writeJsonExclusively = async (path, value, temporaryPathPrefix = path) => {
  const temporaryPath = `${temporaryPathPrefix}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporaryPath, 'wx');
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await link(temporaryPath, path);
  } finally {
    await handle?.close();
    await rm(temporaryPath, { force: true });
  }
};

const isProcessActive = (processId) => {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH') {
      return false;
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EPERM') {
      return true;
    }
    throw new Error(`Unable to verify semantic recording process ${processId}.`, { cause: error });
  }
};

const getSidecarTemporaryPathPrefix = (repositoryRoot) =>
  join(repositoryRoot, `${SEMANTIC_IDENTITY_RECEIPT_PATH}.sidecar`);

const listSidecarTemporaryFiles = (repositoryRoot) => {
  const temporaryPathPrefix = getSidecarTemporaryPathPrefix(repositoryRoot);
  const temporaryDirectory = dirname(temporaryPathPrefix);
  if (!existsSync(temporaryDirectory)) return [];
  const temporaryFilenamePrefix = `${basename(temporaryPathPrefix)}.`;

  return readdirSync(temporaryDirectory)
    .filter(
      (filename) =>
        filename.startsWith(temporaryFilenamePrefix) && filename.endsWith(SIDECAR_TEMPORARY_SUFFIX),
    )
    .sort((left, right) => left.localeCompare(right, 'en'));
};

const parseSidecarTemporaryFile = (repositoryRoot, filename) => {
  const temporaryPathPrefix = getSidecarTemporaryPathPrefix(repositoryRoot);
  const temporaryFilenamePrefix = `${basename(temporaryPathPrefix)}.`;
  const temporaryIdentity = filename.slice(
    temporaryFilenamePrefix.length,
    filename.length - SIDECAR_TEMPORARY_SUFFIX.length,
  );
  const separatorIndex = temporaryIdentity.indexOf('.');
  const processIdText = temporaryIdentity.slice(0, separatorIndex);
  const temporaryId = temporaryIdentity.slice(separatorIndex + 1);
  if (!/^\d+$/u.test(processIdText) || !UUID_PATTERN.test(temporaryId)) {
    throw new Error(`Semantic identity sidecar has an invalid temporary file: ${filename}.`);
  }

  return {
    processId: requireProcessId(Number(processIdText), 'Semantic sidecar writer'),
    temporaryPath: join(dirname(temporaryPathPrefix), filename),
  };
};

/** Removes unpublished sidecar staging files only after their writer is inactive. */
const reconcileSidecarTemporaryFiles = async (repositoryRoot) => {
  for (const filename of listSidecarTemporaryFiles(repositoryRoot)) {
    const { processId, temporaryPath } = parseSidecarTemporaryFile(repositoryRoot, filename);
    if (!lstatSync(temporaryPath).isFile()) {
      throw new Error(`Semantic identity sidecar temporary path is not a file: ${filename}.`);
    }
    if (isProcessActive(processId)) {
      throw new Error(`Semantic identity sidecar is being published by process ${processId}.`);
    }
    await rm(temporaryPath, { force: true });
  }
};

const listReceiptConsumptionClaims = (repositoryRoot) => {
  const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  const receiptDirectory = dirname(receiptPath);
  if (!existsSync(receiptDirectory)) return [];
  const receiptFilenamePrefix = `${basename(receiptPath)}.`;

  return readdirSync(receiptDirectory)
    .filter(
      (filename) =>
        filename.startsWith(receiptFilenamePrefix) && filename.endsWith(RECEIPT_CONSUMPTION_SUFFIX),
    )
    .sort((left, right) => left.localeCompare(right, 'en'));
};

const assertNoReceiptConsumptionClaims = (repositoryRoot) => {
  const claims = listReceiptConsumptionClaims(repositoryRoot);
  if (claims.length > 0) {
    throw new Error(`Semantic identity receipt consumption is unresolved: ${claims.join(', ')}.`);
  }
};

const parseReceiptConsumptionClaim = (receiptPath, claimFilename) => {
  const prefix = `${basename(receiptPath)}.`;
  const claimIdentity = claimFilename.slice(
    prefix.length,
    claimFilename.length - RECEIPT_CONSUMPTION_SUFFIX.length,
  );
  const separatorIndex = claimIdentity.indexOf('.');
  const processIdText = claimIdentity.slice(0, separatorIndex);
  const receiptSha256 = claimIdentity.slice(separatorIndex + 1);
  if (!/^\d+$/u.test(processIdText) || !SHA256_PATTERN.test(receiptSha256)) {
    throw new Error(
      `Semantic identity receipt has an invalid consumption claim: ${claimFilename}.`,
    );
  }

  return {
    claimPath: join(dirname(receiptPath), claimFilename),
    consumerProcessId: requireProcessId(Number(processIdText), 'Semantic receipt consumer'),
    receiptSha256,
  };
};

const reconcileReceiptConsumptionClaim = async (repositoryRoot) => {
  const claims = listReceiptConsumptionClaims(repositoryRoot);
  if (claims.length === 0) return;
  if (claims.length > 1) {
    throw new Error(
      `Semantic identity receipt has multiple consumption claims: ${claims.join(', ')}.`,
    );
  }

  const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  const { claimPath, consumerProcessId, receiptSha256 } = parseReceiptConsumptionClaim(
    receiptPath,
    claims[0],
  );
  if (!lstatSync(claimPath).isFile()) {
    throw new Error(`Semantic identity receipt consumption claim is not a file: ${claims[0]}.`);
  }
  if (isProcessActive(consumerProcessId)) {
    throw new Error(
      `Semantic identity receipt is being consumed by active process ${consumerProcessId}.`,
    );
  }

  const claimText = await readFile(claimPath, 'utf8');
  validateReceipt(JSON.parse(claimText));
  const claimSha256 = createSha256(claimText);
  if (claimSha256 !== receiptSha256) {
    throw new Error('Semantic identity receipt consumption claim has an invalid digest.');
  }
  if (existsSync(receiptPath)) {
    if (createSha256(await readFile(receiptPath, 'utf8')) !== claimSha256) {
      throw new Error('Semantic identity receipt does not match its consumption claim.');
    }
  } else {
    try {
      await link(claimPath, receiptPath);
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) {
        throw error;
      }
    }
    if (createSha256(await readFile(receiptPath, 'utf8')) !== claimSha256) {
      throw new Error('Restored semantic identity receipt does not match its consumption claim.');
    }
  }

  await rm(claimPath);
  if (createSha256(await readFile(receiptPath, 'utf8')) !== claimSha256) {
    throw new Error(
      'Semantic identity receipt changed while its consumption claim was reconciled.',
    );
  }
};

/** Writes one receipt atomically without replacing unresolved recovery state. */
export const writeSemanticIdentityReceipt = async (repositoryRoot, receipt) => {
  validateReceipt(receipt);
  if (receipt.evaluatorProcessId === null) {
    throw new Error('Semantic identity receipt requires an evaluator process before publication.');
  }
  assertSourceMatchesReceipt(repositoryRoot, receipt);
  assertNoReceiptConsumptionClaims(repositoryRoot);
  if (
    JSON.stringify(captureSemanticAttemptInventory(repositoryRoot)) !==
    JSON.stringify(receipt.attemptInventory)
  ) {
    throw new Error('Semantic attempt history changed before receipt creation completed.');
  }
  const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  await mkdir(dirname(receiptPath), { recursive: true });
  try {
    await writeJsonExclusively(receiptPath, receipt);
    assertNoReceiptConsumptionClaims(repositoryRoot);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
      throw new Error('An unresolved semantic identity receipt already exists.', { cause: error });
    }
    throw error;
  }
};

const loadSemanticIdentityReceipt = async (repositoryRoot) => {
  await reconcileReceiptConsumptionClaim(repositoryRoot);
  await reconcileSidecarTemporaryFiles(repositoryRoot);
  const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  if (!existsSync(receiptPath)) return null;
  const receiptText = await readFile(receiptPath, 'utf8');
  return {
    receipt: validateReceipt(JSON.parse(receiptText)),
    receiptSha256: createSha256(receiptText),
  };
};

const assertReceiptRecoveryOwner = (receipt, expectedInvocationId) => {
  if (expectedInvocationId !== null) {
    if (expectedInvocationId !== receipt.invocationId || receipt.ownerProcessId !== process.pid) {
      throw new Error('Semantic identity receipt is owned by another recording invocation.');
    }
    return;
  }

  if (isProcessActive(receipt.ownerProcessId)) {
    throw new Error(
      `Semantic identity receipt belongs to active recording process ${receipt.ownerProcessId}.`,
    );
  }
  if (receipt.evaluatorProcessId !== null && isProcessActive(receipt.evaluatorProcessId)) {
    throw new Error(
      `Semantic identity receipt belongs to active evaluator process ${receipt.evaluatorProcessId}.`,
    );
  }
};

const assertSourceMatchesReceipt = (repositoryRoot, receipt) => {
  const currentSource = captureSemanticSourceIdentity(repositoryRoot);
  if (
    currentSource.sourceCommit !== receipt.sourceCommit ||
    currentSource.sourceDigest !== receipt.sourceDigest ||
    JSON.stringify(currentSource.sourceEntries) !== JSON.stringify(receipt.sourceEntries)
  ) {
    throw new Error('Semantic source no longer matches the unresolved identity receipt.');
  }
};

const readAttemptIdentity = (repositoryRoot, attemptEntry) => {
  if (attemptEntry.identitySha256 === null) return null;
  const identityPath = join(
    repositoryRoot,
    SEMANTIC_RESULTS_PATH,
    'attempts',
    attemptEntry.attemptId,
    'identity.json',
  );
  const identityText = readFileSync(identityPath, 'utf8');
  if (createSha256(identityText) !== attemptEntry.identitySha256) {
    throw new Error(`Semantic attempt ${attemptEntry.attemptId} identity changed during recovery.`);
  }
  return validateAttemptIdentity(JSON.parse(identityText), attemptEntry);
};

const findReceiptIdentity = (repositoryRoot, attemptInventory, receipt) => {
  const matches = [];
  for (const attemptEntry of attemptInventory) {
    const identity = readAttemptIdentity(repositoryRoot, attemptEntry);
    if (identity?.invocationId === receipt.invocationId) {
      validateAttemptIdentity(identity, attemptEntry, receipt);
      matches.push(attemptEntry);
    }
  }
  if (matches.length > 1) {
    throw new Error('One semantic identity receipt is bound to multiple attempts.');
  }

  return matches[0] ?? null;
};

const compareAttemptInventories = (before, after) => {
  const beforeById = new Map(before.map((entry) => [entry.attemptId, entry]));
  const afterById = new Map(after.map((entry) => [entry.attemptId, entry]));
  const newAttempts = after.filter(({ attemptId }) => !beforeById.has(attemptId));

  for (const beforeEntry of before) {
    const afterEntry = afterById.get(beforeEntry.attemptId);
    if (afterEntry === undefined) {
      throw new Error(
        `Semantic attempt ${beforeEntry.attemptId} disappeared after receipt capture.`,
      );
    }
    if (JSON.stringify(afterEntry) !== JSON.stringify(beforeEntry)) {
      throw new Error(`Semantic attempt ${beforeEntry.attemptId} changed after receipt capture.`);
    }
  }
  if (newAttempts.length > 1) {
    throw new Error('A semantic identity receipt cannot attribute multiple new attempts.');
  }

  return newAttempts;
};

const readCandidateEvidenceSha256 = (repositoryRoot) => {
  const candidatePath = join(repositoryRoot, 'fixtures', '.semantic-evaluation-candidate.json');
  return existsSync(candidatePath) ? createSha256(readFileSync(candidatePath)) : null;
};

const readResultAttemptId = (repositoryRoot) => {
  const resultPath = join(repositoryRoot, 'fixtures', 'semantic-evaluation-result.json');
  if (!existsSync(resultPath)) return null;
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  if (!isPlainRecord(result) || !ATTEMPT_ID_PATTERN.test(result.semanticAttemptId)) {
    throw new Error('Semantic evaluation result has an invalid attempt reference.');
  }

  return result.semanticAttemptId;
};

const findReferencedAttempt = (repositoryRoot, attemptInventory, recordingKind) => {
  if (recordingKind === 'record-checkpoint') {
    const candidateEvidenceSha256 = readCandidateEvidenceSha256(repositoryRoot);
    if (candidateEvidenceSha256 === null) return null;
    const matches = attemptInventory.filter(
      ({ evidenceSha256 }) => evidenceSha256 === candidateEvidenceSha256,
    );
    if (matches.length > 1) {
      throw new Error('Semantic checkpoint matches multiple immutable attempts.');
    }
    return matches[0] ?? null;
  }

  const candidateEvidenceSha256 = readCandidateEvidenceSha256(repositoryRoot);
  if (candidateEvidenceSha256 !== null) {
    const matches = attemptInventory.filter(
      ({ evidenceSha256 }) => evidenceSha256 === candidateEvidenceSha256,
    );
    if (matches.length > 1) {
      throw new Error('Semantic candidate matches multiple immutable attempts.');
    }
    return matches[0] ?? null;
  }
  const resultAttemptId = readResultAttemptId(repositoryRoot);
  if (resultAttemptId === null) return null;
  const referencedAttempt = attemptInventory.find(({ attemptId }) => attemptId === resultAttemptId);
  if (referencedAttempt === undefined) {
    throw new Error(`Semantic result references missing attempt ${resultAttemptId}.`);
  }

  return referencedAttempt;
};

const createAttemptIdentity = (receipt, attemptEntry) => ({
  argumentDigest: receipt.argumentDigest,
  attemptId: attemptEntry.attemptId,
  attemptSha256: attemptEntry.attemptSha256,
  cliClosureDigest: receipt.cliClosureDigest,
  evidenceSha256: attemptEntry.evidenceSha256,
  invocationId: receipt.invocationId,
  portableSkillBehaviorDigest: receipt.portableSkillBehaviorDigest,
  schemaVersion: SEMANTIC_IDENTITY_SCHEMA_VERSION,
  semanticInputDigest: receipt.semanticInputDigest,
  sourceCommit: receipt.sourceCommit,
  sourceDigest: receipt.sourceDigest,
});

const writeAttemptIdentity = async (repositoryRoot, receipt, attemptEntry, wasNewAttempt) => {
  const identityPath = join(
    repositoryRoot,
    SEMANTIC_RESULTS_PATH,
    'attempts',
    attemptEntry.attemptId,
    'identity.json',
  );
  const identity = createAttemptIdentity(receipt, attemptEntry);
  if (existsSync(identityPath)) {
    const existingIdentity = validateAttemptIdentity(
      JSON.parse(await readFile(identityPath, 'utf8')),
      attemptEntry,
    );
    if (existingIdentity.invocationId === receipt.invocationId) {
      validateAttemptIdentity(existingIdentity, attemptEntry, receipt);
      return { attemptId: attemptEntry.attemptId, status: 'finalized' };
    }
    if (wasNewAttempt) {
      throw new Error(
        `New semantic attempt ${attemptEntry.attemptId} already has another identity.`,
      );
    }
    return { attemptId: attemptEntry.attemptId, status: 'already-identified' };
  }

  try {
    const temporaryPathPrefix = getSidecarTemporaryPathPrefix(repositoryRoot);
    await writeJsonExclusively(identityPath, identity, temporaryPathPrefix);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
      const existingIdentity = validateAttemptIdentity(
        JSON.parse(await readFile(identityPath, 'utf8')),
        attemptEntry,
      );
      validateAttemptIdentity(existingIdentity, attemptEntry, receipt);
    } else {
      throw error;
    }
  }
  return { attemptId: attemptEntry.attemptId, status: 'finalized' };
};

const consumeReceipt = async (repositoryRoot, receiptSha256) => {
  const receiptPath = join(repositoryRoot, SEMANTIC_IDENTITY_RECEIPT_PATH);
  if (!existsSync(receiptPath)) {
    throw new Error('Semantic identity receipt disappeared before it could be consumed.');
  }
  const currentReceiptText = await readFile(receiptPath, 'utf8');
  if (createSha256(currentReceiptText) !== receiptSha256) {
    throw new Error('Semantic identity receipt changed before it could be consumed.');
  }
  const consumedPath = `${receiptPath}.${process.pid}.${receiptSha256}${RECEIPT_CONSUMPTION_SUFFIX}`;
  await link(receiptPath, consumedPath);
  if (createSha256(await readFile(consumedPath, 'utf8')) !== receiptSha256) {
    throw new Error('Semantic identity receipt changed while it was being claimed.');
  }

  await rm(receiptPath);
  if (createSha256(await readFile(consumedPath, 'utf8')) !== receiptSha256) {
    if (!existsSync(receiptPath)) {
      try {
        await link(consumedPath, receiptPath);
      } catch (error) {
        if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) {
          throw error;
        }
      }
    }
    throw new Error('Semantic identity receipt changed while it was being consumed.');
  }

  await rm(consumedPath);
};

/**
 * Finalizes or safely retires the active semantic identity receipt without invoking a model.
 * @param repositoryRoot The repository containing the receipt and attempt history.
 * @param options Recovery controls available only to the live wrapper after its child exits.
 * @returns A promise resolving to the recovery result.
 */
export const recoverSemanticIdentity = async (
  repositoryRoot,
  { allowExistingAttempt = false, expectedInvocationId = null } = {},
) => {
  if (expectedInvocationId !== null && typeof expectedInvocationId !== 'string') {
    throw new Error('Expected semantic invocation ID must be a string.');
  }
  const loadedReceipt = await loadSemanticIdentityReceipt(repositoryRoot);
  if (loadedReceipt === null) return { attemptId: null, status: 'no-receipt' };
  const { receipt, receiptSha256 } = loadedReceipt;
  assertReceiptRecoveryOwner(receipt, expectedInvocationId);
  assertSourceMatchesReceipt(repositoryRoot, receipt);
  const attemptInventory = captureSemanticAttemptInventory(repositoryRoot);
  const finalizedAttempt = findReceiptIdentity(repositoryRoot, attemptInventory, receipt);
  if (finalizedAttempt !== null) {
    await consumeReceipt(repositoryRoot, receiptSha256);
    return { attemptId: finalizedAttempt.attemptId, status: 'finalized' };
  }

  const newAttempts = compareAttemptInventories(receipt.attemptInventory, attemptInventory);
  let attemptEntry = newAttempts[0] ?? null;
  if (attemptEntry !== null) {
    const referencedAttempt = findReferencedAttempt(
      repositoryRoot,
      attemptInventory,
      receipt.recordingKind,
    );
    if (referencedAttempt?.attemptId !== attemptEntry.attemptId) {
      throw new Error(
        `New semantic attempt ${attemptEntry.attemptId} is not attributable to the active receipt.`,
      );
    }
  } else if (allowExistingAttempt) {
    attemptEntry = findReferencedAttempt(repositoryRoot, attemptInventory, receipt.recordingKind);
  }

  if (attemptEntry === null) {
    await consumeReceipt(repositoryRoot, receiptSha256);
    return { attemptId: null, status: 'retired' };
  }

  const result = await writeAttemptIdentity(
    repositoryRoot,
    receipt,
    attemptEntry,
    newAttempts.length === 1,
  );
  await consumeReceipt(repositoryRoot, receiptSha256);
  return result;
};
