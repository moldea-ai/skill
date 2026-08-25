import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ATTEMPT_EVIDENCE_FILENAME = 'evidence.json';
const ATTEMPT_RECORD_FILENAME = 'attempt.json';
const ATTEMPT_SCHEMA_VERSION = 1;
const LATEST_SCHEMA_VERSION = 1;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const STATUS_VALUES = new Set(['failed', 'incomplete', 'passed']);
const STOP_REASON_VALUES = new Set([
  'case-failure',
  'complete',
  'confirmation-failure',
  'confirmations-passed',
  'operator-recorded',
]);

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const createSha256 = (content) => createHash('sha256').update(content).digest('hex');

const writeJsonAtomically = async (path, value) => {
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

const requireIsoDate = (value, label) => {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO date.`);
  }

  return value;
};

const requireSha256 = (value, label) => {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a SHA-256 digest.`);
  }

  return value;
};

const getEvidenceArtifactDigest = (evidence) =>
  evidence.artifactDigest ?? evidence.skillDigest ?? evidence.artifact?.sha256;

const getEvidenceUpdatedAt = (evidence) =>
  requireIsoDate(
    evidence.updatedAt ?? evidence.evaluatedAt ?? evidence.generatedAt,
    'Evidence date',
  );

const createAttemptId = (updatedAt, evidenceSha256) => {
  const timestamp = new Date(updatedAt).toISOString().replaceAll(/[-:.]/gu, '');
  return `${timestamp}-semantic-${evidenceSha256.slice(0, 8)}`;
};

const createTrialSummary = (result, kind, confirmationIndex) => {
  if (
    !isPlainRecord(result) ||
    typeof result.id !== 'string' ||
    typeof result.passed !== 'boolean' ||
    !Array.isArray(result.observed) ||
    !Array.isArray(result.forbidden) ||
    typeof result.rationale !== 'string'
  ) {
    throw new Error('Semantic attempt evidence contains an invalid case trial.');
  }

  return {
    confirmationIndex,
    evaluatedAt: requireIsoDate(result.evaluatedAt, `Trial ${result.id} evaluation date`),
    forbidden: result.forbidden,
    kind,
    observed: result.observed,
    passed: result.passed,
    rationale: result.rationale,
  };
};

const collectCaseTrials = (evidence) => {
  const initialResults = Array.isArray(evidence.results) ? evidence.results : [];
  const confirmations = Array.isArray(evidence.confirmations) ? evidence.confirmations : [];
  const trialsByCaseId = new Map();

  for (const result of initialResults) {
    const trials = trialsByCaseId.get(result.id) ?? [];
    if (trials.length > 0) {
      throw new Error(`Semantic attempt contains duplicate initial evidence for ${result.id}.`);
    }
    trials.push(createTrialSummary(result, 'initial', null));
    trialsByCaseId.set(result.id, trials);
  }

  for (const confirmation of confirmations) {
    if (
      !isPlainRecord(confirmation) ||
      !Number.isInteger(confirmation.confirmationIndex) ||
      confirmation.confirmationIndex < 1 ||
      confirmation.confirmationIndex > 2
    ) {
      throw new Error('Semantic attempt contains an invalid confirmation identity.');
    }
    const trials = trialsByCaseId.get(confirmation.id);
    if (trials === undefined || trials[0]?.passed !== false) {
      throw new Error(`Semantic confirmation for ${confirmation.id} has no failed initial trial.`);
    }
    if (
      trials.some(({ confirmationIndex }) => confirmationIndex === confirmation.confirmationIndex)
    ) {
      throw new Error(
        `Semantic attempt contains duplicate confirmation evidence for ${confirmation.id}.`,
      );
    }
    trials.push(createTrialSummary(confirmation, 'confirmation', confirmation.confirmationIndex));
  }

  return trialsByCaseId;
};

const deriveCaseResult = (id, trials) => {
  const [initialTrial, ...confirmationTrials] = trials;
  if (initialTrial === undefined || initialTrial.kind !== 'initial') {
    throw new Error(`Semantic case ${id} has no initial trial.`);
  }

  const sortedConfirmations = [...confirmationTrials].sort(
    (left, right) => left.confirmationIndex - right.confirmationIndex,
  );
  if (
    sortedConfirmations.some(
      (trial, index) => trial.kind !== 'confirmation' || trial.confirmationIndex !== index + 1,
    )
  ) {
    throw new Error(`Semantic case ${id} has a non-contiguous confirmation sequence.`);
  }
  if (initialTrial.passed && sortedConfirmations.length > 0) {
    throw new Error(`Passing semantic case ${id} must not have confirmation trials.`);
  }
  if (sortedConfirmations.length > 2) {
    throw new Error(`Semantic case ${id} exceeds the two-confirmation limit.`);
  }

  let confirmationStatus = 'not-required';
  let status = 'passed';
  if (!initialTrial.passed) {
    const hasFailedConfirmation = sortedConfirmations.some(({ passed }) => !passed);
    const hasTwoPassingConfirmations =
      sortedConfirmations.length === 2 && sortedConfirmations.every(({ passed }) => passed);

    if (hasFailedConfirmation) {
      confirmationStatus = 'rejected';
      status = 'failed';
    } else if (hasTwoPassingConfirmations) {
      confirmationStatus = 'passed';
      status = 'recovered';
    } else {
      confirmationStatus = 'required';
      status = 'failed';
    }
  }

  return {
    confirmationStatus,
    id,
    status,
    trials: [initialTrial, ...sortedConfirmations],
  };
};

/** Builds one immutable public summary from a semantic checkpoint or canonical result. */
export const createSemanticAttemptRecord = ({
  evidence,
  evidenceKind,
  evidenceSha256,
  recordedAt,
  stopReason,
  totalCaseCount,
}) => {
  if (!isPlainRecord(evidence) || !['candidate', 'result'].includes(evidenceKind)) {
    throw new Error('Semantic attempt evidence has an unsupported source.');
  }
  if (!Number.isInteger(totalCaseCount) || totalCaseCount < 0) {
    throw new Error('Semantic attempt total case count must be non-negative.');
  }
  if (!STOP_REASON_VALUES.has(stopReason)) {
    throw new Error(`Unsupported semantic attempt stop reason: ${stopReason}`);
  }

  const generatedAt = requireIsoDate(evidence.generatedAt, 'Evidence generation date');
  const updatedAt = getEvidenceUpdatedAt(evidence);
  const trialsByCaseId = collectCaseTrials(evidence);
  const cases = [...trialsByCaseId.entries()]
    .map(([id, trials]) => deriveCaseResult(id, trials))
    .sort((left, right) => left.id.localeCompare(right.id, 'en'));
  if (cases.length > totalCaseCount) {
    throw new Error('Semantic attempt evaluates more cases than its declared suite contains.');
  }

  const passedCaseCount = cases.filter(({ status }) => status === 'passed').length;
  const recoveredCaseCount = cases.filter(({ status }) => status === 'recovered').length;
  const failedCaseCount = cases.filter(({ status }) => status === 'failed').length;
  const pendingCaseCount = totalCaseCount - cases.length;
  const status = failedCaseCount > 0 ? 'failed' : pendingCaseCount > 0 ? 'incomplete' : 'passed';
  const hasRejectedConfirmation = cases.some(
    ({ confirmationStatus }) => confirmationStatus === 'rejected',
  );
  const hasUnconfirmedInitialFailure = cases.some(
    ({ confirmationStatus, trials }) => confirmationStatus === 'required' && trials.length === 1,
  );
  const hasValidStopReason =
    stopReason === 'operator-recorded' ||
    (stopReason === 'complete' && status === 'passed') ||
    (stopReason === 'case-failure' && hasUnconfirmedInitialFailure) ||
    (stopReason === 'confirmation-failure' && hasRejectedConfirmation) ||
    (stopReason === 'confirmations-passed' && failedCaseCount === 0 && recoveredCaseCount > 0);
  if (!hasValidStopReason) {
    throw new Error(`Semantic attempt stop reason ${stopReason} does not match its case evidence.`);
  }
  const digest = requireSha256(evidenceSha256, 'Semantic attempt evidence');
  const artifactDigest = requireSha256(
    getEvidenceArtifactDigest(evidence),
    'Semantic attempt artifact',
  );

  return {
    actorHost: evidence.actorHost ?? evidence.host,
    artifactDigest,
    attemptId: createAttemptId(updatedAt, digest),
    caseSuiteDigest: requireSha256(evidence.caseSuiteDigest, 'Semantic attempt case suite'),
    cases,
    cli: evidence.cli,
    coverageDigest:
      evidence.coverageDigest === undefined
        ? null
        : requireSha256(evidence.coverageDigest, 'Semantic attempt coverage'),
    createdAt: generatedAt,
    evidence: {
      evaluationProtocolVersion: evidence.evaluationProtocolVersion,
      kind: evidenceKind,
      path: ATTEMPT_EVIDENCE_FILENAME,
      schemaVersion: evidence.schemaVersion,
      sha256: digest,
    },
    failedCaseCount,
    judgeHost: evidence.judgeHost,
    passedCaseCount,
    pendingCaseCount,
    recordedAt: requireIsoDate(recordedAt, 'Semantic attempt recording date'),
    recoveredCaseCount,
    schemaVersion: ATTEMPT_SCHEMA_VERSION,
    status,
    stopReason,
    totalCaseCount,
    updatedAt,
  };
};

const readRecordedAttempts = async (resultsRoot) => {
  const attemptsRoot = join(resultsRoot, 'attempts');
  if (!existsSync(attemptsRoot)) return [];

  const entries = await readdir(attemptsRoot, { withFileTypes: true });
  const attempts = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const attempt = JSON.parse(
      await readFile(join(attemptsRoot, entry.name, ATTEMPT_RECORD_FILENAME), 'utf8'),
    );
    if (attempt.attemptId !== entry.name || !STATUS_VALUES.has(attempt.status)) {
      throw new Error(`Semantic attempt ${entry.name} has an invalid directory identity.`);
    }
    attempts.push(attempt);
  }

  return attempts.sort(
    (left, right) =>
      left.updatedAt.localeCompare(right.updatedAt, 'en') ||
      left.attemptId.localeCompare(right.attemptId, 'en'),
  );
};

const updateLatest = async (resultsRoot) => {
  const attempts = await readRecordedAttempts(resultsRoot);
  const latestAttempt = attempts.at(-1);
  if (latestAttempt === undefined) return null;

  const lastPassingAttempt = attempts.filter(({ status }) => status === 'passed').at(-1);
  const latest = {
    lastPassingAttemptId: lastPassingAttempt?.attemptId ?? null,
    latestAttemptId: latestAttempt.attemptId,
    latestStatus: latestAttempt.status,
    schemaVersion: LATEST_SCHEMA_VERSION,
    updatedAt: latestAttempt.updatedAt,
  };
  await writeJsonAtomically(join(resultsRoot, 'latest.json'), latest);
  return latest;
};

/** Records exact semantic evidence and its derived summary without overwriting history. */
export const recordSemanticEvaluationAttempt = async ({
  evidenceKind,
  evidenceText,
  recordedAt = new Date().toISOString(),
  resultsRoot,
  stopReason,
  totalCaseCount,
}) => {
  const evidence = JSON.parse(evidenceText);
  const evidenceSha256 = createSha256(evidenceText);
  const attempt = createSemanticAttemptRecord({
    evidence,
    evidenceKind,
    evidenceSha256,
    recordedAt,
    stopReason,
    totalCaseCount,
  });
  const attemptsRoot = join(resultsRoot, 'attempts');
  const attemptDirectory = join(attemptsRoot, attempt.attemptId);
  const stagingDirectory = join(
    attemptsRoot,
    `.${attempt.attemptId}.${process.pid}.${randomUUID()}.tmp`,
  );
  await mkdir(attemptsRoot, { recursive: true });

  if (existsSync(attemptDirectory)) {
    const existingEvidence = await readFile(
      join(attemptDirectory, ATTEMPT_EVIDENCE_FILENAME),
      'utf8',
    );
    if (createSha256(existingEvidence) !== evidenceSha256) {
      throw new Error(`Semantic attempt ${attempt.attemptId} already contains different evidence.`);
    }
    const existingAttempt = JSON.parse(
      await readFile(join(attemptDirectory, ATTEMPT_RECORD_FILENAME), 'utf8'),
    );
    const expectedAttempt = createSemanticAttemptRecord({
      evidence,
      evidenceKind,
      evidenceSha256,
      recordedAt: existingAttempt.recordedAt,
      stopReason,
      totalCaseCount,
    });
    if (JSON.stringify(existingAttempt) !== JSON.stringify(expectedAttempt)) {
      throw new Error(
        `Semantic attempt ${attempt.attemptId} already exists with different recording metadata.`,
      );
    }
    await updateLatest(resultsRoot);
    return existingAttempt;
  }

  try {
    await rm(stagingDirectory, { force: true, recursive: true });
    await mkdir(stagingDirectory, { recursive: true });
    await writeFile(join(stagingDirectory, ATTEMPT_EVIDENCE_FILENAME), evidenceText, 'utf8');
    await writeFile(
      join(stagingDirectory, ATTEMPT_RECORD_FILENAME),
      `${JSON.stringify(attempt, null, 2)}\n`,
      'utf8',
    );
    await rename(stagingDirectory, attemptDirectory);
    await updateLatest(resultsRoot);
    return attempt;
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
};

/** Loads semantic attempt history and its current pointers in chronological order. */
export const loadSemanticEvaluationAttempts = async (resultsRoot) => {
  const attempts = await readRecordedAttempts(resultsRoot);
  const latest = existsSync(join(resultsRoot, 'latest.json'))
    ? JSON.parse(await readFile(join(resultsRoot, 'latest.json'), 'utf8'))
    : null;
  return { attempts, latest };
};

/** Loads and verifies immutable semantic history for synchronous website generation. */
export const loadVerifiedSemanticEvaluationAttempts = (resultsRoot) => {
  const attemptsRoot = join(resultsRoot, 'attempts');
  if (!existsSync(attemptsRoot)) return { attempts: [], latest: null };

  const attempts = readdirSync(attemptsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => {
      const attemptDirectory = join(attemptsRoot, entry.name);
      const attempt = JSON.parse(
        readFileSync(join(attemptDirectory, ATTEMPT_RECORD_FILENAME), 'utf8'),
      );
      const evidenceText = readFileSync(join(attemptDirectory, ATTEMPT_EVIDENCE_FILENAME), 'utf8');
      const expected = createSemanticAttemptRecord({
        evidence: JSON.parse(evidenceText),
        evidenceKind: attempt.evidence.kind,
        evidenceSha256: createSha256(evidenceText),
        recordedAt: attempt.recordedAt,
        stopReason: attempt.stopReason,
        totalCaseCount: attempt.totalCaseCount,
      });
      if (
        entry.name !== attempt.attemptId ||
        JSON.stringify(expected) !== JSON.stringify(attempt)
      ) {
        throw new Error(`Semantic attempt ${entry.name} does not match its immutable evidence.`);
      }
      return attempt;
    })
    .sort(
      (left, right) =>
        left.updatedAt.localeCompare(right.updatedAt, 'en') ||
        left.attemptId.localeCompare(right.attemptId, 'en'),
    );
  const latestPath = join(resultsRoot, 'latest.json');
  const latest = existsSync(latestPath) ? JSON.parse(readFileSync(latestPath, 'utf8')) : null;
  const expectedLatest = attempts.at(-1);
  const expectedPassing = attempts.filter(({ status }) => status === 'passed').at(-1);
  if (
    (expectedLatest === undefined && latest !== null) ||
    (expectedLatest !== undefined &&
      (latest === null ||
        latest.schemaVersion !== LATEST_SCHEMA_VERSION ||
        latest.latestAttemptId !== expectedLatest.attemptId ||
        latest.latestStatus !== expectedLatest.status ||
        latest.lastPassingAttemptId !== (expectedPassing?.attemptId ?? null) ||
        latest.updatedAt !== expectedLatest.updatedAt))
  ) {
    throw new Error('Semantic latest pointer does not match immutable attempt history.');
  }

  return { attempts, latest };
};

/** Verifies every immutable semantic attempt, evidence digest, summary, and latest pointer. */
export const verifySemanticEvaluationAttempts = async (resultsRoot) => {
  const issues = [];
  let attempts;
  try {
    attempts = await readRecordedAttempts(resultsRoot);
  } catch (error) {
    return {
      attempts: 0,
      issues: [error instanceof Error ? error.message : String(error)],
      passed: false,
    };
  }

  for (const attempt of attempts) {
    const attemptDirectory = join(resultsRoot, 'attempts', attempt.attemptId);
    try {
      const evidenceText = await readFile(
        join(attemptDirectory, ATTEMPT_EVIDENCE_FILENAME),
        'utf8',
      );
      const expected = createSemanticAttemptRecord({
        evidence: JSON.parse(evidenceText),
        evidenceKind: attempt.evidence.kind,
        evidenceSha256: createSha256(evidenceText),
        recordedAt: attempt.recordedAt,
        stopReason: attempt.stopReason,
        totalCaseCount: attempt.totalCaseCount,
      });
      if (JSON.stringify(expected) !== JSON.stringify(attempt)) {
        issues.push(`Semantic attempt ${attempt.attemptId} does not match its evidence.`);
      }
    } catch (error) {
      issues.push(
        `Semantic attempt ${attempt.attemptId} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const expectedLatestAttempt = attempts.at(-1);
  const expectedPassingAttempt = attempts.filter(({ status }) => status === 'passed').at(-1);
  const latestPath = join(resultsRoot, 'latest.json');
  if (expectedLatestAttempt === undefined) {
    if (existsSync(latestPath)) issues.push('Semantic latest pointer exists without attempts.');
  } else if (!existsSync(latestPath)) {
    issues.push('Semantic latest pointer is missing.');
  } else {
    try {
      const latest = JSON.parse(await readFile(latestPath, 'utf8'));
      if (
        latest.schemaVersion !== LATEST_SCHEMA_VERSION ||
        latest.latestAttemptId !== expectedLatestAttempt.attemptId ||
        latest.latestStatus !== expectedLatestAttempt.status ||
        latest.lastPassingAttemptId !== (expectedPassingAttempt?.attemptId ?? null) ||
        latest.updatedAt !== expectedLatestAttempt.updatedAt
      ) {
        issues.push('Semantic latest pointer does not match immutable attempt history.');
      }
    } catch (error) {
      issues.push(
        `Semantic latest pointer is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { attempts: attempts.length, issues, passed: issues.length === 0 };
};
