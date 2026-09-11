import { createHash } from 'node:crypto';

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const canonicalizeJson = (value) => {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!isPlainRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, 'en'))
      .map((key) => [key, canonicalizeJson(value[key])]),
  );
};

/** Hashes one JSON-compatible value independently of object key insertion order. */
export const createSemanticStageValueDigest = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonicalizeJson(value)))
    .digest('hex');

const requireSha256 = (value, label) => {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a SHA-256 digest.`);
  }
  return value;
};

const requireHostIdentity = (host, label, role) => {
  if (
    !isPlainRecord(host) ||
    typeof host.developerInstructionsSha256 !== 'string' ||
    !SHA256_PATTERN.test(host.developerInstructionsSha256) ||
    typeof host.model !== 'string' ||
    typeof host.name !== 'string' ||
    typeof host.reasoningEffort !== 'string' ||
    host.role !== role ||
    typeof host.version !== 'string' ||
    [host.model, host.name, host.reasoningEffort, host.version].some(
      (part) => part.trim().length === 0,
    )
  ) {
    throw new Error(`${label} must be a complete model-host identity.`);
  }
  return host;
};

const requireProtocolVersion = (value) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('Semantic stage identity requires a positive protocol version.');
  }
  return value;
};

/** Projects deterministic repository fixture identity without ephemeral commit timestamps. */
const createRepositoryFixtureIdentity = (repositoryControlBefore) => {
  for (const key of ['indexDigest', 'installedSkillDigest', 'localConfigDigest']) {
    requireSha256(repositoryControlBefore[key], `Repository fixture ${key}`);
  }
  return {
    indexDigest: repositoryControlBefore.indexDigest,
    installedSkillDigest: repositoryControlBefore.installedSkillDigest,
    localConfigDigest: repositoryControlBefore.localConfigDigest,
  };
};

/** Projects exact pre-actor related-repository state without host filesystem paths. */
const createReadOnlyMountFixtureIdentity = (readOnlyMountControlEvidence) => {
  if (!Array.isArray(readOnlyMountControlEvidence)) {
    throw new Error('Semantic actor identity requires related-repository control evidence.');
  }

  return readOnlyMountControlEvidence.map((evidence) => {
    if (
      !isPlainRecord(evidence) ||
      !isPlainRecord(evidence.before) ||
      !isPlainRecord(evidence.after) ||
      typeof evidence.before.mount !== 'string' ||
      evidence.before.mount !== evidence.after.mount ||
      !SHA256_PATTERN.test(evidence.before.treeDigest) ||
      evidence.before.treeDigest !== evidence.after.treeDigest ||
      !Array.isArray(evidence.violations) ||
      evidence.violations.length !== 0
    ) {
      throw new Error('Semantic actor identity requires unchanged related-repository evidence.');
    }
    return evidence.before;
  });
};

/** Creates the exact behavior-bearing identity for one semantic actor stage. */
export const createSemanticActorStageIdentity = ({
  actorHost,
  actorPrompt,
  artifactDigest,
  caseDefinitionDigest,
  cli,
  evaluationProtocolVersion,
  readOnlyMountControlEvidence,
  repositoryControlBefore,
  resourceProfileDigest,
  scenarioEvidence,
}) => {
  if (typeof actorPrompt !== 'string' || actorPrompt.trim().length === 0) {
    throw new Error('Semantic actor identity requires the exact natural actor prompt.');
  }
  if (!isPlainRecord(cli) || !isPlainRecord(repositoryControlBefore)) {
    throw new Error('Semantic actor identity requires CLI and repository-control evidence.');
  }
  if (!Array.isArray(scenarioEvidence)) {
    throw new Error('Semantic actor identity requires ordered scenario evidence.');
  }

  const contract = {
    actorHost: requireHostIdentity(actorHost, 'Actor host', 'actor'),
    actorPromptSha256: createSemanticStageValueDigest(actorPrompt),
    artifactDigest: requireSha256(artifactDigest, 'Portable skill artifact'),
    caseDefinitionDigest: requireSha256(caseDefinitionDigest, 'Semantic case definition'),
    cli,
    evaluationProtocolVersion: requireProtocolVersion(evaluationProtocolVersion),
    readOnlyMountsSha256: createSemanticStageValueDigest(
      createReadOnlyMountFixtureIdentity(readOnlyMountControlEvidence),
    ),
    repositoryFixtureSha256: createSemanticStageValueDigest(
      createRepositoryFixtureIdentity(repositoryControlBefore),
    ),
    resourceProfileDigest: requireSha256(resourceProfileDigest, 'Semantic resource profile'),
    scenarioEvidenceSha256: createSemanticStageValueDigest(scenarioEvidence),
    schemaVersion: 1,
    stage: 'actor',
  };
  return {
    contract,
    sha256: createSemanticStageValueDigest(contract),
  };
};

/** Creates the exact identity for one judge stage and the actor evidence it assessed. */
export const createSemanticJudgeStageIdentity = ({
  actorEvidence,
  actorIdentitySha256,
  caseDefinitionDigest,
  evaluationProtocolVersion,
  judgeHost,
  judgePrompt,
}) => {
  if (!isPlainRecord(actorEvidence)) {
    throw new Error('Semantic judge identity requires complete actor evidence.');
  }
  if (typeof judgePrompt !== 'string' || judgePrompt.trim().length === 0) {
    throw new Error('Semantic judge identity requires the exact judge prompt.');
  }
  const contract = {
    actorEvidenceSha256: createSemanticStageValueDigest(actorEvidence),
    actorIdentitySha256: requireSha256(actorIdentitySha256, 'Semantic actor identity'),
    caseDefinitionDigest: requireSha256(caseDefinitionDigest, 'Semantic case definition'),
    evaluationProtocolVersion: requireProtocolVersion(evaluationProtocolVersion),
    judgeHost: requireHostIdentity(judgeHost, 'Judge host', 'judge'),
    judgePromptSha256: createSemanticStageValueDigest(judgePrompt),
    schemaVersion: 1,
    stage: 'judge',
  };
  return {
    contract,
    sha256: createSemanticStageValueDigest(contract),
  };
};
