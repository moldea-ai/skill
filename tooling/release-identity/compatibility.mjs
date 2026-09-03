import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import semver from 'semver';

const COMPATIBILITY_FIELD_NAMES = [
  'skillVersion',
  'cliVersion',
  'cliJsonSchemaVersion',
  'nodeRange',
  'npmRange',
  'pnpmRange',
  'yarnRange',
];
const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const RELEASE_COMPATIBILITY_HEADING = '## Release compatibility';

// immutable source and planned target contracts for the 4.0.2 bridge
export const COMPATIBILITY_401 = Object.freeze({
  skillVersion: '4.0.1',
  cliVersion: '5.0.0',
  cliJsonSchemaVersion: 2,
  nodeRange: '^22.11.0 || ^24.11.0',
  npmRange: '>=10.9.0 <12.0.0',
  pnpmRange: '>=11.20.0 <12.0.0',
  yarnRange: '>=4.0.0 <5.0.0',
});

export const COMPATIBILITY_402 = Object.freeze({
  skillVersion: '4.0.2',
  cliVersion: '5.0.1',
  cliJsonSchemaVersion: 2,
  nodeRange: '>=22.11.0',
  npmRange: '>=7.0.0',
  pnpmRange: '>=8.3.1',
  yarnRange: '>=4.14.1',
});

/** Parses one canonical stable semantic version without coercion. */
const parseExactVersion = (input, fieldName) => {
  if (typeof input !== 'string' || !STABLE_VERSION_PATTERN.test(input)) {
    throw new Error(`${fieldName} must be a stable exact semantic version.`);
  }

  return input;
};

/** Parses one non-empty stable node-semver range without prerelease comparators. */
const parseStableRange = (input, fieldName) => {
  if (typeof input !== 'string' || input.length === 0 || input.trim() !== input) {
    throw new Error(`${fieldName} must be a non-empty canonical semantic version range.`);
  }

  let parsedRange;
  try {
    parsedRange = new semver.Range(input);
  } catch {
    throw new Error(`${fieldName} must be a valid semantic version range.`);
  }

  if (/\d+\.\d+\.\d+-[0-9A-Za-z]/u.test(input)) {
    throw new Error(`${fieldName} must not contain prerelease comparators.`);
  }

  return input;
};

/** Validates and returns one explicit compatibility contract. */
export const validateCompatibilityContract = (input) => {
  assert.ok(input !== null && typeof input === 'object' && !Array.isArray(input));
  assert.deepEqual(
    Object.keys(input).sort((left, right) => left.localeCompare(right, 'en')),
    [...COMPATIBILITY_FIELD_NAMES].sort((left, right) => left.localeCompare(right, 'en')),
    'The compatibility contract fields are incomplete or unsupported.',
  );
  if (!Number.isInteger(input.cliJsonSchemaVersion) || input.cliJsonSchemaVersion < 1) {
    throw new Error('cliJsonSchemaVersion must be a positive integer.');
  }

  return {
    skillVersion: parseExactVersion(input.skillVersion, 'skillVersion'),
    cliVersion: parseExactVersion(input.cliVersion, 'cliVersion'),
    cliJsonSchemaVersion: input.cliJsonSchemaVersion,
    nodeRange: parseStableRange(input.nodeRange, 'nodeRange'),
    npmRange: parseStableRange(input.npmRange, 'npmRange'),
    pnpmRange: parseStableRange(input.pnpmRange, 'pnpmRange'),
    yarnRange: parseStableRange(input.yarnRange, 'yarnRange'),
  };
};

/** Extracts the one release-compatibility section from a portable skill document. */
const extractCompatibilitySection = (content) => {
  assert.equal(typeof content, 'string');
  const headingOffsets = [...content.matchAll(/^## Release compatibility$/gmu)].map(
    ({ index }) => index,
  );
  if (headingOffsets.length !== 1) {
    throw new Error('Expected exactly one Release compatibility section.');
  }

  const sectionStart = headingOffsets[0] + RELEASE_COMPATIBILITY_HEADING.length;
  const remainingContent = content.slice(sectionStart).replace(/^\r?\n/u, '');
  const nextHeadingOffset = remainingContent.search(/^## /mu);
  return (
    nextHeadingOffset === -1 ? remainingContent : remainingContent.slice(0, nextHeadingOffset)
  ).trim();
};

/** Parses the canonical portable-skill compatibility section from explicit content. */
export const parseCompatibility = (content) => {
  const section = extractCompatibilitySection(content);
  const match =
    /^Skill release `(?<skillVersion>[^`\r\n]+)` supports exactly:\r?\n\r?\n- `@moldea\.ai\/cli: (?<cliVersion>[^`\r\n]+)`\r?\n- CLI JSON schema: `(?<cliJsonSchemaVersion>[^`\r\n]+)`\r?\n- Node\.js: `(?<nodeRange>[^`\r\n]+)`\r?\n- npm: `(?<npmRange>[^`\r\n]+)`\r?\n- pnpm: `(?<pnpmRange>[^`\r\n]+)`\r?\n- yarn: `(?<yarnRange>[^`\r\n]+)`\r?\n\r?\nThe CLI is an exact root development dependency; other entries retain their ranges\.$/u.exec(
      section,
    );
  if (match?.groups === undefined || !/^\d+$/u.test(match.groups.cliJsonSchemaVersion)) {
    throw new Error('The Release compatibility section is malformed or contains duplicate fields.');
  }

  return validateCompatibilityContract({
    skillVersion: match.groups.skillVersion,
    cliVersion: match.groups.cliVersion,
    cliJsonSchemaVersion: Number(match.groups.cliJsonSchemaVersion),
    nodeRange: match.groups.nodeRange,
    npmRange: match.groups.npmRange,
    pnpmRange: match.groups.pnpmRange,
    yarnRange: match.groups.yarnRange,
  });
};

/** Returns whether one exact stable version satisfies a validated range. */
export const isCompatibilityVersionSupported = (range, version) => {
  parseStableRange(range, 'range');
  if (typeof version !== 'string') throw new Error('version must be a semantic version.');
  const parsedVersion = semver.parse(version);
  if (parsedVersion === null || parsedVersion.raw !== version || version.startsWith('v')) {
    throw new Error('version must be a semantic version.');
  }
  if (parsedVersion.prerelease.length > 0) return false;
  return semver.satisfies(version, range);
};

/** Requires an open lower-bound range with the exact intended stable floor. */
const assertOpenRange = (range, expectedFloor, fieldName) => {
  const parsedRange = new semver.Range(parseStableRange(range, fieldName));
  const minimumVersion = semver.minVersion(parsedRange);
  assert.equal(minimumVersion?.version, expectedFloor, `${fieldName} has the wrong floor.`);
  assert.equal(
    parsedRange.set.some((comparators) =>
      comparators.some(({ operator }) => operator === '<' || operator === '<='),
    ),
    false,
    `${fieldName} must not contain an upper comparator.`,
  );
  assert.equal(
    semver.satisfies('999.0.0', parsedRange),
    true,
    `${fieldName} must admit compatible future stable majors.`,
  );
};

/** Proves the exact old-to-new compatibility expansion used by release 4.0.2. */
export const assertCompatibility402Expansion = (sourceInput, candidateInput) => {
  const source = validateCompatibilityContract(sourceInput);
  const candidate = validateCompatibilityContract(candidateInput);
  assert.deepEqual(source, COMPATIBILITY_401, 'The source compatibility contract is not 4.0.1.');
  assert.deepEqual(
    candidate,
    COMPATIBILITY_402,
    'The candidate compatibility contract is not planned release 4.0.2.',
  );
  assert.equal(source.cliJsonSchemaVersion, candidate.cliJsonSchemaVersion);

  for (const [fieldName, expectedFloor, preservedSourceRange] of [
    ['nodeRange', '22.11.0', source.nodeRange],
    ['npmRange', '7.0.0', source.npmRange],
    ['pnpmRange', '8.3.1', source.pnpmRange],
    // releases below 4.14.1 are excluded by the corrected executable floor proved in milestone 1
    ['yarnRange', '4.14.1', '>=4.14.1 <5.0.0'],
  ]) {
    assertOpenRange(candidate[fieldName], expectedFloor, fieldName);
    assert.equal(
      semver.subset(preservedSourceRange, candidate[fieldName]),
      true,
      `${fieldName} removes support from release 4.0.1.`,
    );
  }

  return { candidate, source };
};

/** Reads one text file beneath an explicit repository root. */
const readText = (repositoryRoot, relativePath) =>
  readFileSync(join(repositoryRoot, ...relativePath.split('/')), 'utf8');

/** Extracts one exact capture from a synchronized public compatibility document. */
const extractSingleValue = (content, pattern, label, path) => {
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1 || matches[0]?.groups?.value === undefined) {
    throw new Error(`${path} must contain exactly one ${label} compatibility value.`);
  }
  return matches[0].groups.value;
};

/** Parses one synchronized README-style compatibility copy. */
const parsePublicCompatibilityCopy = (content, path, expectedSkillVersion, requiresRelease) => {
  const releaseMatches = [...content.matchAll(/^Release `(?<value>[^`\r\n]+)` supports:$/gmu)];
  if (releaseMatches.length > 1 || (requiresRelease && releaseMatches.length !== 1)) {
    throw new Error(`${path} must contain one skill release compatibility value.`);
  }
  const contract = {
    skillVersion: releaseMatches[0]?.groups?.value ?? expectedSkillVersion,
    cliVersion: extractSingleValue(
      content,
      /^- `@moldea\.ai\/cli (?<value>[^`\r\n]+)`$/gmu,
      'CLI',
      path,
    ),
    cliJsonSchemaVersion: Number(
      extractSingleValue(
        content,
        /^- CLI JSON schema `(?<value>[^`\r\n]+)`$/gmu,
        'CLI JSON schema',
        path,
      ),
    ),
    nodeRange: extractSingleValue(
      content,
      /^- Node\.js `(?<value>[^`\r\n]+)`$/gmu,
      'Node.js',
      path,
    ),
    npmRange: extractSingleValue(content, /^- npm `(?<value>[^`\r\n]+)`$/gmu, 'npm', path),
    pnpmRange: extractSingleValue(content, /^- pnpm `(?<value>[^`\r\n]+)`$/gmu, 'pnpm', path),
    yarnRange: extractSingleValue(content, /^- Yarn `(?<value>[^`\r\n]+)`$/gmu, 'Yarn', path),
  };
  return contract;
};

/** Requires every maintained public copy to equal an explicit compatibility contract. */
export const assertRepositoryCompatibility = (repositoryRoot, expectedInput) => {
  const expected = validateCompatibilityContract(expectedInput);
  const packageManifest = JSON.parse(readText(repositoryRoot, 'package.json'));
  assert.equal(packageManifest.version, expected.skillVersion);
  assert.equal(packageManifest.engines?.node, expected.nodeRange);
  assert.equal(packageManifest.devDependencies?.['@moldea.ai/cli'], expected.cliVersion);
  assert.equal(packageManifest.moldeaRelease?.cliJsonSchemaVersion, expected.cliJsonSchemaVersion);
  assert.deepEqual(parseCompatibility(readText(repositoryRoot, 'moldea/SKILL.md')), expected);

  for (const path of [
    'README.md',
    'docs/compatibility-and-local-tooling.md',
    'moldea/references/local-tooling.md',
  ]) {
    const parsed = parsePublicCompatibilityCopy(
      readText(repositoryRoot, path),
      path,
      expected.skillVersion,
      path !== 'docs/compatibility-and-local-tooling.md',
    );
    assert.deepEqual(parsed, expected, `${path} is not synchronized with the expected contract.`);
  }

  return expected;
};
