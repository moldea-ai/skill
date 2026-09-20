import { createHash } from 'node:crypto';

import type {
  ISemanticModelHostIdentity,
  ISemanticStageIdentity,
  ISemanticStageName,
} from './types.ts';

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const isPlainRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Canonicalizes one JSON-compatible value without mutating the caller's object. */
const canonicalizeJson = (input: unknown): unknown => {
  if (Array.isArray(input)) return input.map(canonicalizeJson);
  if (!isPlainRecord(input)) return input;
  return Object.fromEntries(
    Object.keys(input)
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((key) => [key, canonicalizeJson(input[key])]),
  );
};

/** Hashes one JSON-compatible value independently of object key insertion order. */
export const createSemanticStageValueDigest = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalizeJson(value)))
    .digest('hex');

const requireSha256 = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a SHA-256 digest.`);
  }
  return value;
};

const requireHostIdentity = (
  host: unknown,
  label: string,
  role: ISemanticStageName,
): ISemanticModelHostIdentity => {
  if (
    !isPlainRecord(host) ||
    typeof host['developerInstructionsSha256'] !== 'string' ||
    !SHA256_PATTERN.test(host['developerInstructionsSha256']) ||
    typeof host['model'] !== 'string' ||
    typeof host['name'] !== 'string' ||
    typeof host['reasoningEffort'] !== 'string' ||
    host['role'] !== role ||
    typeof host['version'] !== 'string' ||
    [host['model'], host['name'], host['reasoningEffort'], host['version']].some(
      (part) => part.trim().length === 0,
    )
  ) {
    throw new Error(`${label} must be a complete model-host identity.`);
  }
  return host as ISemanticModelHostIdentity;
};

const requireProtocolVersion = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('Semantic stage identity requires a positive protocol version.');
  }
  return value;
};

/** Creates the exact behavior-bearing identity for one semantic actor stage. */
export const createSemanticActorStageIdentity = (options: {
  actorCommand: readonly string[];
  actorHost: unknown;
  actorPrompt: string;
  artifactDigest: string;
  caseDefinitionDigest: string;
  cli: unknown;
  confirmationIndex: 1 | 2 | 3 | null;
  evaluationProtocolVersion: number;
  readOnlyMountFixtures: unknown;
  repositoryFixture: unknown;
  resourceProfiles: unknown;
}): ISemanticStageIdentity => {
  if (options.actorPrompt.trim().length === 0) {
    throw new Error('Semantic actor identity requires the exact natural actor prompt.');
  }
  if (options.actorCommand.length === 0 || options.actorCommand.some((part) => part.length === 0)) {
    throw new Error('Semantic actor identity requires the exact host command.');
  }
  if (!isPlainRecord(options.cli) || !Array.isArray(options.repositoryFixture)) {
    throw new Error('Semantic actor identity requires CLI and repository fixture evidence.');
  }
  if (!Array.isArray(options.readOnlyMountFixtures) || !isPlainRecord(options.resourceProfiles)) {
    throw new Error('Semantic actor identity requires mount and resource-profile evidence.');
  }

  const contract: Record<string, unknown> = {
    actorCommandSha256: createSemanticStageValueDigest(options.actorCommand),
    actorHost: requireHostIdentity(options.actorHost, 'Actor host', 'actor'),
    actorPromptSha256: createSemanticStageValueDigest(options.actorPrompt),
    artifactDigest: requireSha256(options.artifactDigest, 'Portable skill artifact'),
    caseDefinitionDigest: requireSha256(options.caseDefinitionDigest, 'Semantic case definition'),
    cli: options.cli,
    confirmationIndex: options.confirmationIndex,
    evaluationProtocolVersion: requireProtocolVersion(options.evaluationProtocolVersion),
    readOnlyMountsSha256: createSemanticStageValueDigest(options.readOnlyMountFixtures),
    repositoryFixtureSha256: createSemanticStageValueDigest(options.repositoryFixture),
    resourceProfilesSha256: createSemanticStageValueDigest(options.resourceProfiles),
    schemaVersion: 1,
    stage: 'actor',
  };
  return { contract, sha256: createSemanticStageValueDigest(contract) };
};

/** Creates the exact identity for one judge stage and the actor evidence it assessed. */
export const createSemanticJudgeStageIdentity = (options: {
  actorEvidence: unknown;
  actorIdentitySha256: string;
  caseDefinitionDigest: string;
  evaluationProtocolVersion: number;
  judgeCommand: readonly string[];
  judgeHost: unknown;
  judgePrompt: string;
}): ISemanticStageIdentity => {
  if (!isPlainRecord(options.actorEvidence)) {
    throw new Error('Semantic judge identity requires complete actor evidence.');
  }
  if (options.judgePrompt.trim().length === 0) {
    throw new Error('Semantic judge identity requires the exact judge prompt.');
  }
  if (options.judgeCommand.length === 0 || options.judgeCommand.some((part) => part.length === 0)) {
    throw new Error('Semantic judge identity requires the exact host command.');
  }
  const contract: Record<string, unknown> = {
    actorEvidenceSha256: createSemanticStageValueDigest(options.actorEvidence),
    actorIdentitySha256: requireSha256(options.actorIdentitySha256, 'Semantic actor identity'),
    caseDefinitionDigest: requireSha256(options.caseDefinitionDigest, 'Semantic case definition'),
    evaluationProtocolVersion: requireProtocolVersion(options.evaluationProtocolVersion),
    judgeCommandSha256: createSemanticStageValueDigest(options.judgeCommand),
    judgeHost: requireHostIdentity(options.judgeHost, 'Judge host', 'judge'),
    judgePromptSha256: createSemanticStageValueDigest(options.judgePrompt),
    schemaVersion: 1,
    stage: 'judge',
  };
  return { contract, sha256: createSemanticStageValueDigest(contract) };
};
