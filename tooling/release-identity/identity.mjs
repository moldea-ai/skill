import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseDocument } from 'yaml';

import { CLI_PACKAGE_NAME, RELEASE_PATHS } from './constants.mjs';

const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

const parsePositiveInteger = (input, name) => {
  if (!Number.isInteger(input) || input < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return input;
};

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

const parseSkillVersion = (skill) => {
  const match = skill.match(/^---\n([\s\S]*?)\n---\n/u);
  if (!match) throw new Error('moldea/SKILL.md must begin with YAML frontmatter.');

  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join('\n'));
  }

  const frontmatter = document.toJS();
  return parseStableVersion(frontmatter?.metadata?.version);
};

/** Reads the canonical release version and exact CLI identity from repository manifests. */
export const readReleaseIdentity = (repositoryRoot) => {
  const packageManifest = readJson(repositoryRoot, RELEASE_PATHS.packageManifest);
  const packageLock = readJson(repositoryRoot, RELEASE_PATHS.packageLock);
  const cliVersion = parseStableVersion(packageManifest.devDependencies?.[CLI_PACKAGE_NAME]);
  const cliJsonSchemaVersion = parsePositiveInteger(
    packageManifest.moldeaRelease?.cliJsonSchemaVersion,
    'package.json moldeaRelease.cliJsonSchemaVersion',
  );
  const releaseVersion = parseStableVersion(packageManifest.version);
  const lockCliPackage = packageLock.packages?.[`node_modules/${CLI_PACKAGE_NAME}`];

  if (!lockCliPackage || lockCliPackage.version !== cliVersion) {
    throw new Error(`package-lock.json does not contain ${CLI_PACKAGE_NAME}@${cliVersion}.`);
  }
  if (typeof lockCliPackage.integrity !== 'string' || lockCliPackage.integrity.length === 0) {
    throw new Error(
      `package-lock.json does not record registry integrity for ${CLI_PACKAGE_NAME}.`,
    );
  }

  return {
    cliDependencies: lockCliPackage.dependencies ?? {},
    cliIntegrity: lockCliPackage.integrity,
    cliJsonSchemaVersion,
    cliVersion,
    packageLock,
    packageLockSha256: createHash('sha256')
      .update(readText(repositoryRoot, RELEASE_PATHS.packageLock))
      .digest('hex'),
    packageManifest,
    releaseVersion,
  };
};

/** Creates the exact CLI evidence boundary recorded by semantic evaluation. */
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

const requireText = (issues, content, expected, path) => {
  if (!content.includes(expected)) issues.push(`${path} is missing: ${expected}`);
};

const areStringRecordsEqual = (left, right) => {
  const normalize = (record) =>
    Object.entries(record)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => [key, value]);

  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
};

/** Inspects every maintained copy of the current release identity. */
export const inspectReleaseIdentity = (repositoryRoot) => {
  const issues = [];
  let identity;

  try {
    identity = readReleaseIdentity(repositoryRoot);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const {
    cliDependencies,
    cliJsonSchemaVersion,
    cliVersion,
    packageLock,
    packageManifest,
    releaseVersion,
  } = identity;
  const skill = readText(repositoryRoot, RELEASE_PATHS.skill);
  const localTooling = readText(repositoryRoot, RELEASE_PATHS.skillLocalTooling);
  const readme = readText(repositoryRoot, RELEASE_PATHS.readme);
  const compatibility = readText(repositoryRoot, 'docs/compatibility-and-local-tooling.md');
  const qualificationReadme = readText(repositoryRoot, RELEASE_PATHS.qualificationReadme);
  const gettingStarted = readText(repositoryRoot, RELEASE_PATHS.gettingStarted);
  const workflow = readText(repositoryRoot, RELEASE_PATHS.conformanceWorkflow);
  const semanticCliManifest = readJson(repositoryRoot, RELEASE_PATHS.semanticCliManifest);
  const skillVersion = parseSkillVersion(skill);
  const rootLockPackage = packageLock.packages?.[''];

  if (skillVersion !== releaseVersion) {
    issues.push(`moldea/SKILL.md declares ${skillVersion}, expected ${releaseVersion}.`);
  }
  if (rootLockPackage?.version !== releaseVersion) {
    issues.push(`package-lock.json root version is not ${releaseVersion}.`);
  }
  if (rootLockPackage?.devDependencies?.[CLI_PACKAGE_NAME] !== cliVersion) {
    issues.push(`package-lock.json root CLI declaration is not ${cliVersion}.`);
  }
  if (packageManifest.devDependencies?.[CLI_PACKAGE_NAME] !== cliVersion) {
    issues.push(`package.json must declare ${CLI_PACKAGE_NAME}@${cliVersion} exactly.`);
  }

  requireText(issues, skill, `version: '${releaseVersion}'`, RELEASE_PATHS.skill);
  requireText(
    issues,
    skill,
    `Skill release \`${releaseVersion}\` supports exactly:`,
    RELEASE_PATHS.skill,
  );
  requireText(issues, skill, `- \`${CLI_PACKAGE_NAME}: ${cliVersion}\``, RELEASE_PATHS.skill);
  requireText(issues, skill, `- CLI JSON schema: \`${cliJsonSchemaVersion}\``, RELEASE_PATHS.skill);
  requireText(
    issues,
    localTooling,
    `Release \`${releaseVersion}\` supports:`,
    RELEASE_PATHS.skillLocalTooling,
  );
  requireText(
    issues,
    localTooling,
    `- \`${CLI_PACKAGE_NAME} ${cliVersion}\``,
    RELEASE_PATHS.skillLocalTooling,
  );
  requireText(
    issues,
    localTooling,
    `- CLI JSON schema \`${cliJsonSchemaVersion}\``,
    RELEASE_PATHS.skillLocalTooling,
  );
  requireText(
    issues,
    readme,
    `The current release is \`${releaseVersion}\`.`,
    RELEASE_PATHS.readme,
  );
  requireText(issues, readme, `#v${releaseVersion}`, RELEASE_PATHS.readme);
  requireText(issues, readme, `- \`${CLI_PACKAGE_NAME} ${cliVersion}\``, RELEASE_PATHS.readme);
  requireText(
    issues,
    readme,
    `- CLI JSON schema \`${cliJsonSchemaVersion}\``,
    RELEASE_PATHS.readme,
  );
  requireText(
    issues,
    compatibility,
    `- \`${CLI_PACKAGE_NAME} ${cliVersion}\``,
    'docs/compatibility-and-local-tooling.md',
  );
  requireText(
    issues,
    compatibility,
    `- CLI JSON schema \`${cliJsonSchemaVersion}\``,
    'docs/compatibility-and-local-tooling.md',
  );
  requireText(issues, gettingStarted, `#v${releaseVersion}`, RELEASE_PATHS.gettingStarted);
  requireText(
    issues,
    qualificationReadme,
    `strict CLI schema \`${cliJsonSchemaVersion}\` envelope`,
    RELEASE_PATHS.qualificationReadme,
  );

  if (/cli_version:|MOLDEA_TEST_CLI_VERSION/u.test(workflow)) {
    issues.push('The conformance workflow must derive the exact CLI from package.json.');
  }
  if (semanticCliManifest.version !== cliVersion) {
    issues.push(`The semantic CLI fixture version is not ${cliVersion}.`);
  }
  if (semanticCliManifest.moldeaRelease?.cliJsonSchemaVersion !== cliJsonSchemaVersion) {
    issues.push(`The semantic CLI fixture JSON schema version is not ${cliJsonSchemaVersion}.`);
  }
  if (!areStringRecordsEqual(semanticCliManifest.dependencies ?? {}, cliDependencies)) {
    issues.push('The semantic CLI fixture dependency inventory does not match package-lock.json.');
  }

  return issues;
};

/** Requires every maintained release identity to agree. */
export const assertReleaseIdentity = (repositoryRoot) => {
  const issues = inspectReleaseIdentity(repositoryRoot);
  if (issues.length > 0) throw new Error(issues.join('\n'));

  return readReleaseIdentity(repositoryRoot);
};
