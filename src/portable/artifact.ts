import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { parseDocument } from 'yaml';
import { z } from 'zod';

import { EXCLUDED_DIRECTORY_NAMES } from '../filesystem/index.ts';
import { parseStableVersion } from '../release/index.ts';

const NORMALIZED_RELEASE_VERSION = '<release-version>';
const SKILL_FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/u;
const LOCAL_TOOLING_RELEASE_PATTERN = /^Skill ([0-9]+\.[0-9]+\.[0-9]+) supports Git /gmu;
const SkillFrontmatterSchema = z.object({
  metadata: z.object({ version: z.string() }),
});

const hasSourceRange = (value: unknown): value is { range: [number, number, ...number[]] } =>
  value !== null &&
  typeof value === 'object' &&
  'range' in value &&
  Array.isArray(value.range) &&
  value.range.length >= 2 &&
  value.range.every((offset) => typeof offset === 'number' && Number.isSafeInteger(offset));

const collectPortableSkillPaths = (portableSkillRoot: string): string[] => {
  const paths: string[] = [];

  const collect = (directoryPath: string): void => {
    const entries = readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
          throw new Error(`Portable skill contains an excluded directory: ${absolutePath}.`);
        }
        collect(absolutePath);
      } else if (entry.isFile()) paths.push(absolutePath);
      else throw new Error(`Portable skill contains an unsupported path: ${absolutePath}.`);
    }
  };

  collect(portableSkillRoot);
  return paths.sort((left, right) => left.localeCompare(right, 'en'));
};

const replaceSingleReleaseSentence = (
  source: string,
  pattern: RegExp,
  expectedVersion: string,
  relativePath: string,
): string => {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`${relativePath} must contain exactly one authoritative release sentence.`);
  }

  const match = matches[0]!;
  const releaseVersion = parseStableVersion(match[1]);
  if (releaseVersion !== expectedVersion) {
    throw new Error(`${relativePath} release sentence does not match metadata.version.`);
  }

  const matchedVersion = match[1]!;
  const versionStart = match.index + match[0].indexOf(matchedVersion);
  const versionEnd = versionStart + matchedVersion.length;
  return `${source.slice(0, versionStart)}${NORMALIZED_RELEASE_VERSION}${source.slice(versionEnd)}`;
};

const normalizeSkillSource = (source: string): { releaseVersion: string; source: string } => {
  const frontmatterMatch = source.match(SKILL_FRONTMATTER_PATTERN);
  if (frontmatterMatch === null) {
    throw new Error('moldea/SKILL.md must begin with YAML frontmatter.');
  }

  const frontmatter = frontmatterMatch[1]!;
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join('\n'));
  }

  const parsedFrontmatter = SkillFrontmatterSchema.parse(document.toJS() as unknown);
  const releaseVersion = parseStableVersion(parsedFrontmatter.metadata.version);
  const versionNode = document.getIn(['metadata', 'version'], true);
  if (!hasSourceRange(versionNode)) {
    throw new Error('moldea/SKILL.md metadata.version must be one scalar value.');
  }

  const frontmatterOffset = (frontmatterMatch.index ?? 0) + '---\n'.length;
  const versionStart = frontmatterOffset + versionNode.range[0];
  const versionEnd = frontmatterOffset + versionNode.range[1];
  const versionScalarSource = source.slice(versionStart, versionEnd);
  const versionValueOffset = versionScalarSource.indexOf(releaseVersion);
  if (
    versionValueOffset === -1 ||
    versionScalarSource.indexOf(releaseVersion, versionValueOffset + releaseVersion.length) !== -1
  ) {
    throw new Error('moldea/SKILL.md metadata.version must contain one exact release value.');
  }
  const versionValueStart = versionStart + versionValueOffset;
  const versionValueEnd = versionValueStart + releaseVersion.length;
  const normalizedMetadata = `${source.slice(0, versionValueStart)}${NORMALIZED_RELEASE_VERSION}${source.slice(versionValueEnd)}`;

  return { releaseVersion, source: normalizedMetadata };
};

const normalizeLocalToolingSource = (source: string, expectedVersion: string): string =>
  replaceSingleReleaseSentence(
    source,
    LOCAL_TOOLING_RELEASE_PATTERN,
    expectedVersion,
    'moldea/references/local-tooling.md',
  );

/** Hashes every distributed skill path and byte without normalization. */
export const createPortableSkillArtifactDigest = (repositoryRoot: string): string => {
  collectPortableSkillPaths(join(repositoryRoot, 'moldea'));
  return createPortableSkillDigest(repositoryRoot);
};

/** Hashes the distributed skill while normalizing its two release-version occurrences. */
export const createPortableSkillBehaviorDigest = (repositoryRoot: string): string => {
  const portableSkillRoot = join(repositoryRoot, 'moldea');
  const paths = collectPortableSkillPaths(portableSkillRoot);
  const skillPath = join(portableSkillRoot, 'SKILL.md');
  const localToolingPath = join(portableSkillRoot, 'references', 'local-tooling.md');
  const normalizedSkill = normalizeSkillSource(readFileSync(skillPath, 'utf8'));
  const normalizedLocalTooling = normalizeLocalToolingSource(
    readFileSync(localToolingPath, 'utf8'),
    normalizedSkill.releaseVersion,
  );
  const hash = createHash('sha256');

  for (const absolutePath of paths) {
    const relativePath = relative(portableSkillRoot, absolutePath).replaceAll('\\', '/');
    const content =
      absolutePath === skillPath
        ? Buffer.from(normalizedSkill.source)
        : absolutePath === localToolingPath
          ? Buffer.from(normalizedLocalTooling)
          : readFileSync(absolutePath);
    hash.update(relativePath);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }

  return hash.digest('hex');
};

/** Hashes every distributed skill path and byte in deterministic relative-path order. */
export const createPortableSkillDigest = (repositoryRoot: string): string => {
  const portableSkillRoot = join(repositoryRoot, 'moldea');
  const paths = collectPortableSkillPaths(portableSkillRoot);
  const hash = createHash('sha256');

  for (const absolutePath of paths) {
    const relativePath = relative(portableSkillRoot, absolutePath).replaceAll('\\', '/');
    if (/\.test-(?:bench|e2e|integration|unit)\.[^/]+$/u.test(relativePath)) {
      throw new Error(`Portable skill contains a test artifact: moldea/${relativePath}`);
    }
    hash.update(relativePath);
    hash.update('\0');
    hash.update(readFileSync(absolutePath));
    hash.update('\0');
  }

  return hash.digest('hex');
};
