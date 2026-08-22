import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMANTIC_CRITERION_KEYS = new Set(['criterion', 'label']);
const PORTABLE_RELEASE_VERSION_PLACEHOLDER = '<portable-release-version>';
const PORTABLE_RELEASE_VERSION_PATHS = new Set(['SKILL.md', 'references/local-tooling.md']);
const PORTABLE_RELEASE_CARRY_FORWARD_REASON =
  'Release-version declarations changed without changing semantic skill content.';

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Hashes one JSON-compatible semantic-evaluation contract exactly. */
const createJsonDigest = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Returns the stable behavior labels declared by evaluator-only criteria. */
export const getSemanticCriterionLabels = (criteria) => criteria.map(({ label }) => label);

/** Validates one strict semantic case before it can be evaluated or published. */
export const validateSemanticCaseDefinition = (caseDefinition) => {
  const hasStandalonePrompt =
    isPlainRecord(caseDefinition) &&
    typeof caseDefinition.prompt === 'string' &&
    caseDefinition.prompt.trim().length > 0;
  const hasStructuredScenario =
    isPlainRecord(caseDefinition) &&
    typeof caseDefinition.scenario === 'string' &&
    caseDefinition.scenario.trim().length > 0 &&
    typeof caseDefinition.operation === 'string' &&
    caseDefinition.operation.trim().length > 0 &&
    isPlainRecord(caseDefinition.input);
  if (
    !isPlainRecord(caseDefinition) ||
    typeof caseDefinition.id !== 'string' ||
    !STABLE_ID_PATTERN.test(caseDefinition.id) ||
    (!hasStandalonePrompt && !hasStructuredScenario) ||
    !Array.isArray(caseDefinition.expected) ||
    caseDefinition.expected.length === 0 ||
    !Array.isArray(caseDefinition.forbidden) ||
    caseDefinition.forbidden.length === 0
  ) {
    throw new Error('Semantic evaluation cases require an ID and non-empty criteria.');
  }

  const criteria = [...caseDefinition.expected, ...caseDefinition.forbidden];
  if (
    !criteria.every(
      (entry) =>
        isPlainRecord(entry) &&
        Object.keys(entry).length === SEMANTIC_CRITERION_KEYS.size &&
        Object.keys(entry).every((key) => SEMANTIC_CRITERION_KEYS.has(key)) &&
        typeof entry.label === 'string' &&
        STABLE_ID_PATTERN.test(entry.label) &&
        typeof entry.criterion === 'string' &&
        entry.criterion.length > 0 &&
        entry.criterion === entry.criterion.trim(),
    )
  ) {
    throw new Error(`Semantic case ${caseDefinition.id} has invalid evaluator criteria.`);
  }

  const expectedLabels = getSemanticCriterionLabels(caseDefinition.expected);
  const forbiddenLabels = getSemanticCriterionLabels(caseDefinition.forbidden);
  const allLabels = [...expectedLabels, ...forbiddenLabels];
  if (new Set(allLabels).size !== allLabels.length) {
    throw new Error(`Semantic case ${caseDefinition.id} has duplicate evaluator labels.`);
  }

  return caseDefinition;
};

/** Hashes one case definition independently of fixture order. */
export const createSemanticCaseDefinitionDigest = (caseDefinition) => {
  validateSemanticCaseDefinition(caseDefinition);
  return createJsonDigest(caseDefinition);
};

/** Hashes the complete case suite in stable case-ID order. */
export const createSemanticCaseSuiteDigest = (caseDefinitions) => {
  const definitionsById = [...caseDefinitions]
    .map((caseDefinition) => ({
      digest: createSemanticCaseDefinitionDigest(caseDefinition),
      id: caseDefinition.id,
    }))
    .sort(({ id: left }, { id: right }) => left.localeCompare(right));
  const uniqueIds = new Set(definitionsById.map(({ id }) => id));
  if (uniqueIds.size !== definitionsById.length) {
    throw new Error('Semantic evaluation case IDs must be unique.');
  }

  return createJsonDigest(definitionsById);
};

/** Normalizes release declarations while preserving behavior-relevant skill content. */
export const normalizePortableSkillSemanticEvidence = (relativePath, content) => {
  if (relativePath === 'SKILL.md') {
    return content
      .replace(
        /^(\s*version:\s*['"])[^'"]+(['"]\s*)$/m,
        `$1${PORTABLE_RELEASE_VERSION_PLACEHOLDER}$2`,
      )
      .replace(
        /Skill release `[^`]+` supports exactly:/,
        `Skill release \`${PORTABLE_RELEASE_VERSION_PLACEHOLDER}\` supports exactly:`,
      );
  }

  if (relativePath === 'references/local-tooling.md') {
    return content.replace(
      /Release `[^`]+` supports:/,
      `Release \`${PORTABLE_RELEASE_VERSION_PLACEHOLDER}\` supports:`,
    );
  }

  return content;
};

/** Hashes distributed paths with a caller-provided content transformation. */
const createPortableSkillContentDigest = (transformContent, portableSkillRoot) => {
  const paths = [];

  const collect = (directoryPath) => {
    const entries = readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directoryPath, entry.name);
      if (entry.isDirectory()) collect(absolutePath);
      else if (entry.isFile()) paths.push(absolutePath);
    }
  };

  collect(portableSkillRoot);
  paths.sort((left, right) => left.localeCompare(right));

  const hash = createHash('sha256');
  for (const absolutePath of paths) {
    const relativePath = relative(portableSkillRoot, absolutePath).replaceAll('\\', '/');
    const content = readFileSync(absolutePath);
    hash.update(relativePath);
    hash.update('\0');
    hash.update(transformContent(relativePath, content));
    hash.update('\0');
  }

  return hash.digest('hex');
};

/** Hashes every distributed path and byte in deterministic relative-path order. */
export const createPortableSkillDigest = (repositoryRoot = DEFAULT_REPOSITORY_ROOT) =>
  createPortableSkillContentDigest(
    (_relativePath, content) => content,
    join(repositoryRoot, 'moldea'),
  );

/** Hashes semantic skill content while excluding only release-version declarations. */
export const createPortableSkillSemanticDigest = (repositoryRoot = DEFAULT_REPOSITORY_ROOT) =>
  createPortableSkillContentDigest(
    (relativePath, content) => {
      if (!PORTABLE_RELEASE_VERSION_PATHS.has(relativePath)) return content;
      return normalizePortableSkillSemanticEvidence(relativePath, content.toString('utf8'));
    },
    join(repositoryRoot, 'moldea'),
  );

/** Validates release-only carry-forward against the current portable skill. */
export const hasValidPortableSkillSemanticCarryForward = (
  carryForward,
  fromArtifactDigest,
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
) =>
  isPlainRecord(carryForward) &&
  carryForward.fromArtifactDigest === fromArtifactDigest &&
  carryForward.toArtifactDigest === createPortableSkillDigest(repositoryRoot) &&
  JSON.stringify(carryForward.changedPortablePaths) ===
    JSON.stringify([...PORTABLE_RELEASE_VERSION_PATHS]) &&
  typeof carryForward.fromSemanticDigest === 'string' &&
  carryForward.fromSemanticDigest === carryForward.toSemanticDigest &&
  carryForward.toSemanticDigest === createPortableSkillSemanticDigest(repositoryRoot) &&
  carryForward.reason === PORTABLE_RELEASE_CARRY_FORWARD_REASON &&
  typeof carryForward.carriedForwardAt === 'string' &&
  /^\d{4}-\d{2}-\d{2}T/u.test(carryForward.carriedForwardAt);
