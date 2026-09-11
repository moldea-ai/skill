import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const EXCLUDED_CONTEXT_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const GIT_STATE_FACTS = new Set([
  'head-exists',
  'head-missing',
  'working-tree-clean',
  'working-tree-dirty',
  'has-staged-changes',
  'has-unstaged-changes',
  'has-untracked-paths',
  'has-renamed-paths',
  'has-deleted-paths',
]);
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMANTIC_CRITERION_KEYS = new Set(['criterion', 'label']);
const SEMANTIC_CASE_KEYS = new Set([
  'expected',
  'forbidden',
  'hostInstructions',
  'id',
  'input',
  'localProbe',
  'operation',
  'resourceBudget',
  'scenario',
  'skillEvidence',
]);
const RUNTIME_COMPATIBILITY_PUBLICATION_PROBE_VARIANTS = new Set([
  'current-target',
  'future-target',
  'malformed',
  'missing-current-target',
  'unavailable',
  'version-mismatched-current-target',
]);
const SKILL_ARTIFACT_ROLES = new Set([
  'authoritative-source',
  'distributed-copy',
  'installed-copy',
]);

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Returns whether one declared evidence path is safe and repository-relative. */
const isSafeEvidencePath = (path) => {
  if (
    typeof path !== 'string' ||
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\')
  ) {
    return false;
  }

  const segments = path.split('/');
  return !segments.some(
    (segment) =>
      segment.length === 0 ||
      segment === '.' ||
      segment === '..' ||
      EXCLUDED_CONTEXT_DIRECTORY_NAMES.has(segment),
  );
};

/** Returns whether one evaluator-only repository-evidence declaration is valid. */
const isValidRepositoryEvidence = (entry) => {
  if (
    !isPlainRecord(entry) ||
    Object.keys(entry).some((key) => !['claim', 'source'].includes(key)) ||
    typeof entry.claim !== 'string' ||
    entry.claim.trim().length === 0 ||
    entry.claim !== entry.claim.trim() ||
    !isPlainRecord(entry.source) ||
    typeof entry.source.kind !== 'string'
  ) {
    return false;
  }

  if (entry.source.kind === 'developer-direction') {
    return Object.keys(entry.source).length === 1;
  }
  if (entry.source.kind === 'git-state') {
    return Object.keys(entry.source).length === 2 && GIT_STATE_FACTS.has(entry.source.fact);
  }
  if (entry.source.kind === 'workspace-path') {
    return (
      Object.keys(entry.source).length === 3 &&
      isSafeEvidencePath(entry.source.path) &&
      ['directory', 'file', 'missing', 'symlink'].includes(entry.source.expectedType)
    );
  }
  if (entry.source.kind === 'host-instructions') {
    return Object.keys(entry.source).length === 1;
  }
  if (entry.source.kind === 'related-path') {
    return (
      Object.keys(entry.source).length === 4 &&
      typeof entry.source.mount === 'string' &&
      /^\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/u.test(entry.source.mount) &&
      isSafeEvidencePath(entry.source.path) &&
      ['directory', 'file', 'missing', 'symlink'].includes(entry.source.expectedType)
    );
  }
  return false;
};

/** Returns whether evaluator-only Agent Skill evidence has a bounded safe shape. */
const isValidSkillEvidence = (skillEvidence) => {
  if (!isPlainRecord(skillEvidence) || Object.keys(skillEvidence).length !== 2) return false;
  const { activationScenarios, artifacts } = skillEvidence;
  if (
    !Array.isArray(activationScenarios) ||
    activationScenarios.length > 8 ||
    !activationScenarios.every(
      (scenario) =>
        isPlainRecord(scenario) &&
        Object.keys(scenario).length === 2 &&
        typeof scenario.request === 'string' &&
        scenario.request.trim().length > 0 &&
        Buffer.byteLength(scenario.request, 'utf8') <= 1_024 &&
        typeof scenario.shouldActivate === 'boolean',
    ) ||
    !Array.isArray(artifacts) ||
    artifacts.length === 0 ||
    artifacts.length > 8
  ) {
    return false;
  }

  const roots = new Set();
  return artifacts.every((artifact) => {
    if (
      !isPlainRecord(artifact) ||
      Object.keys(artifact).length !== 2 ||
      !SKILL_ARTIFACT_ROLES.has(artifact.role) ||
      !isSafeEvidencePath(artifact.root) ||
      roots.has(artifact.root)
    ) {
      return false;
    }
    roots.add(artifact.root);
    return true;
  });
};

/** Returns whether one evaluator-owned local probe has a bounded explicit contract. */
const isValidLocalProbe = (localProbe) =>
  isPlainRecord(localProbe) &&
  Object.keys(localProbe).length === 2 &&
  localProbe.kind === 'runtime-compatibility-publication' &&
  RUNTIME_COMPATIBILITY_PUBLICATION_PROBE_VARIANTS.has(localProbe.variant);

/** Hashes one JSON-compatible semantic-evaluation contract exactly. */
const createJsonDigest = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Returns the stable behavior labels declared by evaluator-only criteria. */
export const getSemanticCriterionLabels = (criteria) => criteria.map(({ label }) => label);

/**
 * Validates one strict semantic case before it can be evaluated or published.
 * @param caseDefinition The semantic case contract to validate.
 * @returns The validated semantic case contract.
 * @throws
 * - If the case identity, scenario, or criteria collection is incomplete
 * - If an evaluator criterion has an unsupported shape
 * - If evaluator labels are duplicated
 */
export const validateSemanticCaseDefinition = (caseDefinition) => {
  const hasSkillEvidence = isPlainRecord(caseDefinition) && 'skillEvidence' in caseDefinition;
  const hasStructuredScenario =
    isPlainRecord(caseDefinition) &&
    Object.keys(caseDefinition).every((key) => SEMANTIC_CASE_KEYS.has(key)) &&
    typeof caseDefinition.scenario === 'string' &&
    caseDefinition.scenario.trim().length > 0 &&
    caseDefinition.scenario === caseDefinition.scenario.trim() &&
    typeof caseDefinition.operation === 'string' &&
    STABLE_ID_PATTERN.test(caseDefinition.operation) &&
    isPlainRecord(caseDefinition.input) &&
    Object.keys(caseDefinition.input).length === 2 &&
    typeof caseDefinition.input.developerDirection === 'string' &&
    caseDefinition.input.developerDirection.trim().length > 0 &&
    caseDefinition.input.developerDirection === caseDefinition.input.developerDirection.trim() &&
    Array.isArray(caseDefinition.input.repositoryEvidence) &&
    caseDefinition.input.repositoryEvidence.length > 0 &&
    caseDefinition.input.repositoryEvidence.every(isValidRepositoryEvidence);
  const resourceBudget = caseDefinition?.resourceBudget;
  const hasValidResourceBudget =
    isPlainRecord(resourceBudget) &&
    Object.keys(resourceBudget).length === 4 &&
    ['abstain', 'blocked', 'direct', 'informational', 'relationship'].includes(
      resourceBudget.activation,
    ) &&
    Number.isSafeInteger(resourceBudget.minimumMoldeaCommands) &&
    resourceBudget.minimumMoldeaCommands >= 0 &&
    Number.isSafeInteger(resourceBudget.maximumMoldeaCommands) &&
    resourceBudget.maximumMoldeaCommands >= resourceBudget.minimumMoldeaCommands &&
    resourceBudget.maximumMoldeaCommands <= 16 &&
    Number.isSafeInteger(resourceBudget.maximumMoldeaOutputBytes) &&
    resourceBudget.maximumMoldeaOutputBytes >= 0 &&
    resourceBudget.maximumMoldeaOutputBytes <= 1_048_576 &&
    (!['abstain', 'informational'].includes(resourceBudget.activation) ||
      (resourceBudget.minimumMoldeaCommands === 0 &&
        resourceBudget.maximumMoldeaCommands === 0 &&
        resourceBudget.maximumMoldeaOutputBytes === 0)) &&
    (['abstain', 'blocked', 'informational'].includes(resourceBudget.activation) ||
      resourceBudget.minimumMoldeaCommands > 0 ||
      (resourceBudget.activation === 'direct' &&
        resourceBudget.minimumMoldeaCommands === 0 &&
        resourceBudget.maximumMoldeaCommands === 0 &&
        resourceBudget.maximumMoldeaOutputBytes === 0 &&
        isValidSkillEvidence(caseDefinition?.skillEvidence))) &&
    (!hasSkillEvidence ||
      (resourceBudget.activation === 'direct' &&
        resourceBudget.minimumMoldeaCommands === 0 &&
        resourceBudget.maximumMoldeaCommands === 0 &&
        resourceBudget.maximumMoldeaOutputBytes === 0)) &&
    (resourceBudget.activation !== 'blocked' || resourceBudget.maximumMoldeaCommands <= 4);
  const hostInstructionEvidenceCount =
    isPlainRecord(caseDefinition?.input) && Array.isArray(caseDefinition.input.repositoryEvidence)
      ? caseDefinition.input.repositoryEvidence.filter(
          (entry) =>
            isPlainRecord(entry) &&
            isPlainRecord(entry.source) &&
            entry.source.kind === 'host-instructions',
        ).length
      : 0;
  const hasHostInstructions = isPlainRecord(caseDefinition) && 'hostInstructions' in caseDefinition;
  const hasValidHostInstructions = hasHostInstructions
    ? typeof caseDefinition.hostInstructions === 'string' &&
      caseDefinition.hostInstructions.trim().length > 0 &&
      Buffer.byteLength(caseDefinition.hostInstructions, 'utf8') <= 16_384 &&
      hostInstructionEvidenceCount === 1
    : hostInstructionEvidenceCount === 0;
  const hasValidConfiguredSkillEvidence =
    isPlainRecord(caseDefinition) &&
    (!('skillEvidence' in caseDefinition) || isValidSkillEvidence(caseDefinition.skillEvidence));
  const hasValidConfiguredLocalProbe =
    isPlainRecord(caseDefinition) &&
    (!('localProbe' in caseDefinition) || isValidLocalProbe(caseDefinition.localProbe));
  if (
    !isPlainRecord(caseDefinition) ||
    'prompt' in caseDefinition ||
    typeof caseDefinition.id !== 'string' ||
    !STABLE_ID_PATTERN.test(caseDefinition.id) ||
    !hasStructuredScenario ||
    !hasValidResourceBudget ||
    !hasValidHostInstructions ||
    !hasValidConfiguredSkillEvidence ||
    !hasValidConfiguredLocalProbe ||
    !Array.isArray(caseDefinition.expected) ||
    caseDefinition.expected.length === 0 ||
    !Array.isArray(caseDefinition.forbidden) ||
    caseDefinition.forbidden.length === 0
  ) {
    throw new Error(
      'Semantic evaluation cases require a structured scenario, natural direction, sourced evidence, and non-empty criteria.',
    );
  }

  const evidenceClaims = caseDefinition.input.repositoryEvidence.map(({ claim }) => claim);
  if (new Set(evidenceClaims).size !== evidenceClaims.length) {
    throw new Error(`Semantic case ${caseDefinition.id} has duplicate evidence claims.`);
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

    if (/\.test-(?:unit|integration|e2e|bench)\.[^/]+$/u.test(relativePath)) {
      throw new Error(`Portable skill contains a test artifact: moldea/${relativePath}`);
    }

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
