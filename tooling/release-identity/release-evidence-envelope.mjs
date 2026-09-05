import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { RELEASE_PATHS } from './constants.mjs';
import { parseStableVersion } from './identity.mjs';

export const RELEASE_EVIDENCE_SCHEMA_VERSION = 1;
export const MAX_RELEASE_EVIDENCE_BYTES = 65_536;
export const MAX_RELEASE_EVIDENCE_REASON_BYTES = 1_024;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const STABLE_TAG_PATTERN = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const STABLE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/u;
const SEMANTIC_ATTEMPT_ID_PATTERN = /^\d{8}T\d{9}Z-semantic-[a-f0-9]{8}$/u;

const isPlainRecord = (input) =>
  typeof input === 'object' && input !== null && !Array.isArray(input);

const assertExactKeys = (input, expectedKeys, label) => {
  if (!isPlainRecord(input)) throw new Error(`${label} must be an object.`);
  const actualKeys = Object.keys(input).sort((left, right) => left.localeCompare(right, 'en'));
  const sortedExpectedKeys = [...expectedKeys].sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
  if (JSON.stringify(actualKeys) !== JSON.stringify(sortedExpectedKeys)) {
    throw new Error(`${label} has an unsupported field inventory.`);
  }
};

const requireSha256 = (input, label) => {
  if (typeof input !== 'string' || !SHA256_PATTERN.test(input)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  }
  return input;
};

const requireBoundedString = (input, label, maximumBytes = 256) => {
  if (
    typeof input !== 'string' ||
    input.trim() !== input ||
    input.length === 0 ||
    Buffer.byteLength(input, 'utf8') > maximumBytes
  ) {
    throw new Error(
      `${label} must contain 1 to ${maximumBytes} UTF-8 bytes without outer whitespace.`,
    );
  }
  return input;
};

/** Validates the concise public reason required by an explicit evidence pin. */
export const validateReleaseEvidenceReason = (reason) => {
  const validated = requireBoundedString(
    reason,
    'Pinned evidence reason',
    MAX_RELEASE_EVIDENCE_REASON_BYTES,
  );
  if (/[\u0000-\u001f\u007f]/u.test(validated)) {
    throw new Error('Pinned evidence reason must be one line of printable text.');
  }
  return validated;
};

const requirePositiveInteger = (input, label) => {
  if (!Number.isSafeInteger(input) || input < 1) throw new Error(`${label} must be positive.`);
  return input;
};

const requireStableId = (input, label) => {
  const stableId = requireBoundedString(input, label, 128);
  if (!STABLE_ID_PATTERN.test(stableId)) throw new Error(`${label} is not a portable stable id.`);
  return stableId;
};

const requireSemanticAttemptId = (input) => {
  const attemptId = requireBoundedString(input, 'Semantic attempt id');
  if (!SEMANTIC_ATTEMPT_ID_PATTERN.test(attemptId)) {
    throw new Error('Semantic attempt id does not use the stable release format.');
  }
  return attemptId;
};

const parseTarget = (input, isFresh) => {
  assertExactKeys(
    input,
    isFresh
      ? ['dependencyClosureSha256', 'portableSkillSha256', 'version']
      : ['portableSkillSha256', 'version'],
    'Release evidence target',
  );
  return {
    ...(isFresh
      ? {
          dependencyClosureSha256: requireSha256(
            input.dependencyClosureSha256,
            'Target dependency closure',
          ),
        }
      : {}),
    portableSkillSha256: requireSha256(input.portableSkillSha256, 'Target portable skill'),
    version: parseStableVersion(input.version),
  };
};

const parseSemanticEvidence = (input) => {
  assertExactKeys(
    input,
    [
      'attemptId',
      'attemptSha256',
      'evidenceSha256',
      'latestSha256',
      'protocolVersion',
      'resourceStatus',
      'resultSha256',
    ],
    'Semantic release evidence',
  );
  if (input.resourceStatus !== 'passed') {
    throw new Error('Semantic release evidence must have passing resource status.');
  }
  return {
    attemptId: requireSemanticAttemptId(input.attemptId),
    attemptSha256: requireSha256(input.attemptSha256, 'Semantic attempt'),
    evidenceSha256: requireSha256(input.evidenceSha256, 'Semantic raw evidence'),
    latestSha256: requireSha256(input.latestSha256, 'Semantic latest pointer'),
    protocolVersion: requirePositiveInteger(input.protocolVersion, 'Semantic protocol version'),
    resourceStatus: 'passed',
    resultSha256: requireSha256(input.resultSha256, 'Semantic result'),
  };
};

const parseQualificationTarget = (input) => {
  assertExactKeys(
    input,
    [
      'adapterId',
      'attemptId',
      'attemptKey',
      'attemptSha256',
      'implementationId',
      'key',
      'latestSha256',
      'storageSha256',
    ],
    'Qualification release target',
  );
  return {
    adapterId: requireStableId(input.adapterId, 'Qualification adapter id'),
    attemptId: requireBoundedString(input.attemptId, 'Qualification attempt id'),
    attemptKey: requireStableId(input.attemptKey, 'Qualification attempt key'),
    attemptSha256: requireSha256(input.attemptSha256, 'Qualification attempt'),
    implementationId: requireStableId(input.implementationId, 'Qualification implementation id'),
    key: requireStableId(input.key, 'Qualification target key'),
    latestSha256: requireSha256(input.latestSha256, 'Qualification latest pointer'),
    storageSha256: requireSha256(input.storageSha256, 'Qualification storage manifest'),
  };
};

const parseQualificationEvidence = (input) => {
  assertExactKeys(
    input,
    ['protocolVersion', 'resourceStatus', 'targets'],
    'Qualification release evidence',
  );
  if (input.resourceStatus !== 'passed') {
    throw new Error('Qualification release evidence must have passing resource status.');
  }
  if (!Array.isArray(input.targets) || input.targets.length === 0) {
    throw new Error('Qualification release evidence must name at least one target.');
  }
  const targets = input.targets.map(parseQualificationTarget);
  const keys = targets.map(({ key }) => key);
  if (new Set(keys).size !== keys.length) {
    throw new Error('Qualification release target keys must be unique.');
  }
  const expectedOrder = [...keys].sort((left, right) => left.localeCompare(right, 'en'));
  if (JSON.stringify(keys) !== JSON.stringify(expectedOrder)) {
    throw new Error('Qualification release targets must use deterministic key order.');
  }
  return {
    protocolVersion: requirePositiveInteger(
      input.protocolVersion,
      'Qualification protocol version',
    ),
    resourceStatus: 'passed',
    targets,
  };
};

const parsePinnedSource = (input) => {
  assertExactKeys(
    input,
    ['commit', 'evidenceSha256', 'qualificationSha256', 'semanticSha256', 'tag'],
    'Pinned release source',
  );
  const tag = requireBoundedString(input.tag, 'Pinned source tag', 128);
  if (!STABLE_TAG_PATTERN.test(tag))
    throw new Error('Pinned source tag must be an exact stable v<version> tag.');
  const commit = requireBoundedString(input.commit, 'Pinned source commit', 64);
  if (!COMMIT_PATTERN.test(commit))
    throw new Error('Pinned source commit must be a full Git object id.');
  return {
    commit,
    evidenceSha256: requireSha256(input.evidenceSha256, 'Pinned source envelope'),
    qualificationSha256: requireSha256(input.qualificationSha256, 'Pinned qualification evidence'),
    semanticSha256: requireSha256(input.semanticSha256, 'Pinned semantic evidence'),
    tag,
  };
};

/** Creates a SHA-256 digest for bytes or text. */
export const createReleaseEvidenceSha256 = (input) =>
  createHash('sha256').update(input).digest('hex');

const sortJsonValue = (input) => {
  if (Array.isArray(input)) return input.map(sortJsonValue);
  if (!isPlainRecord(input)) return input;
  return Object.fromEntries(
    Object.entries(input)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([key, value]) => [key, sortJsonValue(value)]),
  );
};

/** Serializes one release evidence envelope in its canonical bounded form. */
export const serializeReleaseEvidenceEnvelope = (envelope) => {
  const source = `${JSON.stringify(sortJsonValue(envelope), null, 2)}\n`;
  const byteLength = Buffer.byteLength(source, 'utf8');
  if (byteLength > MAX_RELEASE_EVIDENCE_BYTES) {
    throw new Error(
      `Release evidence requires ${byteLength} bytes, exceeding the ${MAX_RELEASE_EVIDENCE_BYTES}-byte envelope limit.`,
    );
  }
  return source;
};

/** Parses and strictly validates one canonical fresh or pinned envelope. */
export const parseReleaseEvidenceEnvelope = (source) => {
  if (typeof source !== 'string') throw new Error('Release evidence must be UTF-8 text.');
  if (Buffer.byteLength(source, 'utf8') > MAX_RELEASE_EVIDENCE_BYTES) {
    throw new Error(`Release evidence exceeds ${MAX_RELEASE_EVIDENCE_BYTES} bytes.`);
  }
  let unknownEnvelope;
  try {
    unknownEnvelope = JSON.parse(source);
  } catch (error) {
    throw new Error('Release evidence is not valid JSON.', { cause: error });
  }
  if (!isPlainRecord(unknownEnvelope)) throw new Error('Release evidence must be an object.');
  if (unknownEnvelope.schemaVersion !== RELEASE_EVIDENCE_SCHEMA_VERSION) {
    throw new Error(`Release evidence must use schema ${RELEASE_EVIDENCE_SCHEMA_VERSION}.`);
  }
  let envelope;
  if (unknownEnvelope.mode === 'fresh') {
    assertExactKeys(
      unknownEnvelope,
      ['mode', 'qualification', 'schemaVersion', 'semantic', 'target'],
      'Fresh release evidence',
    );
    envelope = {
      mode: 'fresh',
      qualification: parseQualificationEvidence(unknownEnvelope.qualification),
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      semantic: parseSemanticEvidence(unknownEnvelope.semantic),
      target: parseTarget(unknownEnvelope.target, true),
    };
  } else if (unknownEnvelope.mode === 'pinned') {
    assertExactKeys(
      unknownEnvelope,
      ['mode', 'reason', 'schemaVersion', 'source', 'target'],
      'Pinned release evidence',
    );
    const reason = validateReleaseEvidenceReason(unknownEnvelope.reason);
    envelope = {
      mode: 'pinned',
      reason,
      schemaVersion: RELEASE_EVIDENCE_SCHEMA_VERSION,
      source: parsePinnedSource(unknownEnvelope.source),
      target: parseTarget(unknownEnvelope.target, false),
    };
  } else {
    throw new Error('Release evidence mode must be fresh or pinned.');
  }
  if (serializeReleaseEvidenceEnvelope(envelope) !== source) {
    throw new Error('Release evidence must use canonical JSON serialization.');
  }
  return envelope;
};

/** Reads the current release evidence envelope when it exists. */
export const readReleaseEvidenceEnvelope = (repositoryRoot) => {
  const path = join(repositoryRoot, RELEASE_PATHS.releaseEvidence);
  if (!existsSync(path)) return null;
  return parseReleaseEvidenceEnvelope(readFileSync(path, 'utf8'));
};
