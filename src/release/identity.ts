import { readFileSync } from 'node:fs';
import path from 'node:path';

import { hashValue } from 'jg-crypto';
import { parseDocument } from 'yaml';
import { z } from 'zod';

import { CLI_PACKAGE_NAME, RELEASE_PATHS } from './constants.ts';
import { readPortableCliIdentity, verifyPortableCli } from './portable-cli.ts';
import type { IReleaseIdentity } from './types.ts';
import { parseStableVersion } from './versions.ts';

const PackageManifestSchema = z.object({
  devDependencies: z.record(z.string(), z.string()),
  version: z.string(),
});
const PackageLockSchema = z.object({
  packages: z.record(
    z.string(),
    z.object({
      devDependencies: z.record(z.string(), z.string()).optional(),
      integrity: z.string().optional(),
      version: z.string().optional(),
    }),
  ),
});
const SkillMetadataSchema = z.object({
  metadata: z.strictObject({ version: z.string() }),
  name: z.literal('moldea'),
});

/** Reads the skill version, npm lock identity, and composition of the shipped CLI. */
export const readReleaseIdentity = (repositoryRoot: string): IReleaseIdentity => {
  const packageManifest = PackageManifestSchema.parse(
    JSON.parse(
      readFileSync(path.join(repositoryRoot, RELEASE_PATHS.packageManifest), 'utf8'),
    ) as unknown,
  );
  const packageLockText = readFileSync(
    path.join(repositoryRoot, RELEASE_PATHS.packageLock),
    'utf8',
  );
  const packageLock = PackageLockSchema.parse(JSON.parse(packageLockText) as unknown);
  const releaseVersion = parseStableVersion(packageManifest.version);
  const cliVersion = parseStableVersion(packageManifest.devDependencies[CLI_PACKAGE_NAME]);
  const lockedCli = packageLock.packages[`node_modules/${CLI_PACKAGE_NAME}`];
  if (
    lockedCli?.version !== cliVersion ||
    typeof lockedCli.integrity !== 'string' ||
    packageLock.packages['']?.version !== releaseVersion ||
    packageLock.packages['']?.devDependencies?.[CLI_PACKAGE_NAME] !== cliVersion
  ) {
    throw new Error(
      `package-lock.json does not bind ${CLI_PACKAGE_NAME}@${cliVersion} for this skill.`,
    );
  }

  const identity = readPortableCliIdentity(path.join(repositoryRoot, RELEASE_PATHS.portableCli));
  if (identity.cliVersion !== cliVersion) {
    throw new Error('The shipped portable CLI does not match the exact development CLI version.');
  }

  return {
    ...identity,
    cliIntegrity: lockedCli.integrity,
    packageLockSha256: hashValue(packageLockText),
    releaseVersion,
  };
};

/** Creates the CLI identity recorded by semantic evidence. */
export const createSemanticCliIdentity = (
  repositoryRoot: string,
): {
  integrity: string;
  jsonSchemaVersion: number;
  name: typeof CLI_PACKAGE_NAME;
  packageLockSha256: string;
  version: string;
} => {
  const identity = readReleaseIdentity(repositoryRoot);
  return {
    integrity: identity.cliIntegrity,
    jsonSchemaVersion: identity.cliJsonSchemaVersion,
    name: CLI_PACKAGE_NAME,
    packageLockSha256: identity.packageLockSha256,
    version: identity.cliVersion,
  };
};

/** Checks the published artifact bytes and the generated manifest matcher against the lock. */
export const assertReleaseIdentity = (repositoryRoot: string): IReleaseIdentity => {
  const distribution = path.join(repositoryRoot, RELEASE_PATHS.portableCli);
  const installed = path.join(repositoryRoot, RELEASE_PATHS.installedPortableCli);
  if (verifyPortableCli(distribution) !== verifyPortableCli(installed)) {
    throw new Error('The shipped portable CLI does not match the locked npm artifact.');
  }

  const identity = readReleaseIdentity(repositoryRoot);
  const skill = readFileSync(path.join(repositoryRoot, RELEASE_PATHS.skill), 'utf8');
  const frontmatter = /^---\n([\s\S]*?)\n---\n/u.exec(skill)?.[1];
  if (frontmatter === undefined)
    throw new Error('moldea/SKILL.md must begin with YAML frontmatter.');
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map(({ message }) => message).join('\n'));
  }
  if (
    parseStableVersion(SkillMetadataSchema.parse(document.toJS()).metadata.version) !==
    identity.releaseVersion
  ) {
    throw new Error('The skill metadata version does not match the release version.');
  }

  const matcher = readFileSync(path.join(repositoryRoot, RELEASE_PATHS.manifestScope), 'utf8');
  const embeddedCore = [...matcher.matchAll(/^module\.exports\.coreVersion = "([^"\n]+)";$/gmu)];
  if (embeddedCore.length !== 1 || embeddedCore[0]?.[1] !== identity.coreVersion) {
    throw new Error('The manifest scope and portable CLI must embed the same Core version.');
  }
  return identity;
};
