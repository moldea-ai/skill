import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseDocument } from 'yaml';

import {
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_PACKAGE_NAME,
  CLI_VERSION_TEXT_PATHS,
  RELEASE_PATHS,
} from './constants.mjs';

const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Parses one stable exact semantic version. */
export const parseStableVersion = (version) => {
  if (typeof version !== 'string' || !STABLE_VERSION_PATTERN.test(version)) {
    throw new Error(`Expected a stable exact semantic version, received ${String(version)}.`);
  }
  return version;
};

const readText = (repositoryRoot, relativePath) =>
  readFileSync(join(repositoryRoot, relativePath), 'utf8');

const readJson = (repositoryRoot, relativePath) =>
  JSON.parse(readText(repositoryRoot, relativePath));

const parsePositiveInteger = (input, label) => {
  if (!Number.isSafeInteger(input) || input < 1) throw new Error(`${label} must be positive.`);
  return input;
};

const parseSkillMetadata = (source) => {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/u);
  if (match === null) throw new Error('moldea/SKILL.md must begin with YAML frontmatter.');
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map(({ message }) => message).join('\n'));
  }
  const frontmatter = document.toJS();
  return {
    name: frontmatter?.name,
    version: parseStableVersion(frontmatter?.metadata?.version),
    cliVersion: parseStableVersion(frontmatter?.metadata?.cliVersion),
    cliJsonSchemaVersion: parsePositiveInteger(
      frontmatter?.metadata?.cliJsonSchemaVersion,
      'Skill CLI JSON schema version',
    ),
  };
};

/** Reads the exact release, CLI, schema, lock, and registry-integrity identity. */
export const readReleaseIdentity = (repositoryRoot) => {
  const packageManifest = readJson(repositoryRoot, RELEASE_PATHS.packageManifest);
  const packageLockText = readText(repositoryRoot, RELEASE_PATHS.packageLock);
  const packageLock = JSON.parse(packageLockText);
  const cliVersion = parseStableVersion(packageManifest.devDependencies?.[CLI_PACKAGE_NAME]);
  const releaseVersion = parseStableVersion(packageManifest.version);
  const cliJsonSchemaVersion = parsePositiveInteger(
    packageManifest.moldeaRelease?.cliJsonSchemaVersion,
    'package.json CLI JSON schema version',
  );
  const lockedCli = packageLock.packages?.[`node_modules/${CLI_PACKAGE_NAME}`];
  if (lockedCli?.version !== cliVersion || typeof lockedCli.integrity !== 'string') {
    throw new Error(`package-lock.json does not bind ${CLI_PACKAGE_NAME}@${cliVersion}.`);
  }
  return {
    cliDependencies: lockedCli.dependencies ?? {},
    cliIntegrity: lockedCli.integrity,
    cliJsonSchemaVersion,
    cliVersion,
    packageLock,
    packageLockSha256: createHash('sha256').update(packageLockText).digest('hex'),
    packageManifest,
    releaseVersion,
  };
};

/** Creates the CLI identity recorded by semantic evidence. */
export const createSemanticCliIdentity = (repositoryRoot) => {
  const identity = readReleaseIdentity(repositoryRoot);
  return {
    integrity: identity.cliIntegrity,
    jsonSchemaVersion: identity.cliJsonSchemaVersion,
    name: CLI_PACKAGE_NAME,
    packageLockSha256: identity.packageLockSha256,
    version: identity.cliVersion,
  };
};

const areStringRecordsEqual = (left, right) =>
  JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort());

/** Inspects every maintained current-release identity. */
export const inspectReleaseIdentity = (repositoryRoot) => {
  const issues = [];
  let identity;
  try {
    identity = readReleaseIdentity(repositoryRoot);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const skill = readText(repositoryRoot, RELEASE_PATHS.skill);
  const skillMetadata = parseSkillMetadata(skill);
  const rootLockPackage = identity.packageLock.packages?.[''];
  const semanticCliManifest = readJson(repositoryRoot, RELEASE_PATHS.semanticCliManifest);
  const relevanceGate = readText(repositoryRoot, RELEASE_PATHS.skillRelevanceGate);

  if (
    skillMetadata.name !== 'moldea' ||
    skillMetadata.version !== identity.releaseVersion ||
    skillMetadata.cliVersion !== identity.cliVersion ||
    skillMetadata.cliJsonSchemaVersion !== identity.cliJsonSchemaVersion
  ) {
    issues.push('Portable skill metadata does not match the exact current release identity.');
  }
  if (
    rootLockPackage?.version !== identity.releaseVersion ||
    rootLockPackage?.devDependencies?.[CLI_PACKAGE_NAME] !== identity.cliVersion
  ) {
    issues.push('The package-lock root identity does not match package.json.');
  }
  if (semanticCliManifest.version !== identity.cliVersion) {
    issues.push(`The semantic CLI fixture version is not ${identity.cliVersion}.`);
  }
  if (semanticCliManifest.moldeaRelease?.cliJsonSchemaVersion !== identity.cliJsonSchemaVersion) {
    issues.push(
      `The semantic CLI fixture JSON schema version is not ${identity.cliJsonSchemaVersion}.`,
    );
  }
  if (!areStringRecordsEqual(semanticCliManifest.dependencies ?? {}, identity.cliDependencies)) {
    issues.push(
      'The semantic CLI fixture dependency inventory does not match the locked CLI closure.',
    );
  }
  if (
    !relevanceGate.includes(`EXPECTED_CLI_VERSION = '${identity.cliVersion}'`) ||
    !relevanceGate.includes(
      `EXPECTED_CORE_VERSION = '${identity.cliDependencies['@moldea.ai/core']}'`,
    )
  ) {
    issues.push('The relevance gate does not match the exact CLI/Core release closure.');
  }

  for (const relativePath of CLI_VERSION_TEXT_PATHS) {
    if (!readText(repositoryRoot, relativePath).includes(identity.cliVersion)) {
      issues.push(`${relativePath} does not name CLI ${identity.cliVersion}.`);
    }
  }
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    if (
      !readText(repositoryRoot, relativePath).includes(`schema ${identity.cliJsonSchemaVersion}`)
    ) {
      issues.push(
        `${relativePath} does not name CLI JSON schema ${identity.cliJsonSchemaVersion}.`,
      );
    }
  }

  const publicReleaseText = [
    RELEASE_PATHS.readme,
    RELEASE_PATHS.gettingStarted,
    'docs/compatibility-and-local-tooling.md',
    RELEASE_PATHS.qualificationReadme,
    RELEASE_PATHS.skill,
    RELEASE_PATHS.skillLocalTooling,
  ]
    .map((relativePath) => readText(repositoryRoot, relativePath))
    .join('\n');
  if (/\bMoldea\b/u.test(publicReleaseText)) {
    issues.push('Current user-facing release text must use the lowercase moldea name.');
  }
  if (/\b4\.0\.[0-2]\b/u.test(publicReleaseText)) {
    issues.push('Current user-facing release text contains an obsolete release reference.');
  }
  if (
    /^\s{2}package-managers:/mu.test(readText(repositoryRoot, RELEASE_PATHS.conformanceWorkflow))
  ) {
    issues.push('The conformance workflow still contains the obsolete package-manager matrix.');
  }
  return issues;
};

/** Requires the complete current release identity to agree. */
export const assertReleaseIdentity = (repositoryRoot) => {
  const issues = inspectReleaseIdentity(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));
  return readReleaseIdentity(repositoryRoot);
};
