const ADAPTER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const IMPLEMENTATION_STATUSES = new Set([
  'available',
  'deprecated',
  'in-development',
  'planned',
]);
const TARGET_KINDS = new Set(['custom', 'package']);
const TARGET_MATURITIES = new Set(['experimental', 'supported']);

/** The artifact name shared by candidate construction and verification. */
export const RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME =
  'runtime-compatibility-publication.json';

const isPlainRecord = (input) => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
};

const isNonEmptyString = (input) => typeof input === 'string' && input.trim() !== '';

const hasValidOptionalString = (record, key) =>
  record[key] === undefined || typeof record[key] === 'string';

const hasValidPositiveIntegerArray = (input) =>
  Array.isArray(input) &&
  input.length > 0 &&
  input.every((entry) => Number.isInteger(entry) && entry > 0) &&
  new Set(input).size === input.length;

const hasValidRuntimeGuidance = (input) =>
  input === undefined ||
  (isPlainRecord(input) &&
    ['optional', 'recommended', 'required'].includes(input.expectation) &&
    hasValidOptionalString(input, 'notes'));

const hasValidPackageRequirement = (input) =>
  isPlainRecord(input) &&
  input.ecosystem === 'npm' &&
  isNonEmptyString(input.name) &&
  ['companion', 'primary'].includes(input.role) &&
  isNonEmptyString(input.versionRange);

const hasValidTarget = (input) =>
  isPlainRecord(input) &&
  isNonEmptyString(input.id) &&
  ADAPTER_ID_PATTERN.test(input.id) &&
  TARGET_KINDS.has(input.kind) &&
  isNonEmptyString(input.language) &&
  typeof input.lastVerifiedAt === 'string' &&
  DATE_PATTERN.test(input.lastVerifiedAt) &&
  TARGET_MATURITIES.has(input.maturity) &&
  (input.packages === undefined ||
    (Array.isArray(input.packages) && input.packages.every(hasValidPackageRequirement)));

const hasValidAdapter = (input) => {
  if (
    !isPlainRecord(input) ||
    !IMPLEMENTATION_STATUSES.has(input.implementationStatus) ||
    !isPlainRecord(input.implementation) ||
    !['private', 'public'].includes(input.implementation.distribution) ||
    !['built-in', 'package'].includes(input.implementation.kind) ||
    !isNonEmptyString(input.implementation.package) ||
    !hasValidRuntimeGuidance(input.runtimeGuidance) ||
    (input.supportedRepositoryFormatVersions !== undefined &&
      !hasValidPositiveIntegerArray(input.supportedRepositoryFormatVersions)) ||
    (input.targets !== undefined && !Array.isArray(input.targets))
  ) {
    return false;
  }

  if (input.targets === undefined) return true;
  const targetIds = input.targets.map((target) => target?.id);
  return input.targets.every(hasValidTarget) && new Set(targetIds).size === targetIds.length;
};

/**
 * Validates the packages website publication fields consumed by Skill release 4.
 * @param input The untrusted parsed publication value.
 * @returns The validated publication value.
 * @throws
 * - If the publication does not satisfy schema version 1 and matrix version 2
 */
export const validateRuntimeCompatibilityPublication = (input) => {
  if (
    !isPlainRecord(input) ||
    input.schemaVersion !== 1 ||
    input.matrixVersion !== 2 ||
    !isPlainRecord(input.adapters)
  ) {
    throw new Error('The runtime compatibility publication has an unsupported root contract.');
  }

  for (const [adapterId, adapter] of Object.entries(input.adapters)) {
    if (!ADAPTER_ID_PATTERN.test(adapterId) || !hasValidAdapter(adapter)) {
      throw new Error(`The runtime compatibility publication has an invalid ${adapterId} adapter.`);
    }
  }

  return input;
};

/**
 * Parses and validates one untrusted runtime compatibility publication response.
 * @param source The complete publication response text.
 * @returns The validated publication value.
 * @throws
 * - If the response is malformed JSON or violates the publication contract
 */
export const parseRuntimeCompatibilityPublication = (source) => {
  let publication;
  try {
    publication = JSON.parse(source);
  } catch (error) {
    throw new Error('The runtime compatibility publication is not valid JSON.', {
      cause: error,
    });
  }

  return validateRuntimeCompatibilityPublication(publication);
};
