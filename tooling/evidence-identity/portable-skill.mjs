import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { parseDocument } from 'yaml';

import { parseStableVersion } from '../release-identity/index.mjs';
import { createPortableSkillDigest } from '../semantic-evaluation/index.mjs';

const NORMALIZED_RELEASE_VERSION = '<release-version>';
const SKILL_FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n/u;
const SKILL_RELEASE_PATTERN = /Skill release `([^`]+)` supports exactly:/gu;
const LOCAL_TOOLING_RELEASE_PATTERN = /Release `([^`]+)` supports:/gu;

const collectPortableSkillPaths = (portableSkillRoot) => {
  const paths = [];

  const collect = (directoryPath) => {
    const entries = readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directoryPath, entry.name);
      if (entry.isDirectory()) collect(absolutePath);
      else if (entry.isFile()) paths.push(absolutePath);
      else throw new Error(`Portable skill contains an unsupported path: ${absolutePath}.`);
    }
  };

  collect(portableSkillRoot);
  return paths.sort((left, right) => left.localeCompare(right, 'en'));
};

const replaceSingleReleaseSentence = (source, pattern, expectedVersion, relativePath) => {
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`${relativePath} must contain exactly one authoritative release sentence.`);
  }

  const releaseVersion = parseStableVersion(matches[0][1]);
  if (releaseVersion !== expectedVersion) {
    throw new Error(`${relativePath} release sentence does not match metadata.version.`);
  }

  const versionStart = matches[0].index + matches[0][0].indexOf(matches[0][1]);
  const versionEnd = versionStart + matches[0][1].length;
  return `${source.slice(0, versionStart)}${NORMALIZED_RELEASE_VERSION}${source.slice(versionEnd)}`;
};

const normalizeSkillSource = (source) => {
  const frontmatterMatch = source.match(SKILL_FRONTMATTER_PATTERN);
  if (frontmatterMatch === null) {
    throw new Error('moldea/SKILL.md must begin with YAML frontmatter.');
  }

  const frontmatter = frontmatterMatch[1];
  const document = parseDocument(frontmatter, { uniqueKeys: true });
  if (document.errors.length > 0) {
    throw new Error(document.errors.map((error) => error.message).join('\n'));
  }

  const releaseVersion = parseStableVersion(document.toJS()?.metadata?.version);
  const versionNode = document.getIn(['metadata', 'version'], true);
  if (!versionNode || !Array.isArray(versionNode.range) || versionNode.range.length < 2) {
    throw new Error('moldea/SKILL.md metadata.version must be one scalar value.');
  }

  const frontmatterOffset = frontmatterMatch.index + '---\n'.length;
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

  return {
    releaseVersion,
    source: replaceSingleReleaseSentence(
      normalizedMetadata,
      SKILL_RELEASE_PATTERN,
      releaseVersion,
      'moldea/SKILL.md',
    ),
  };
};

const normalizeLocalToolingSource = (source, expectedVersion) =>
  replaceSingleReleaseSentence(
    source,
    LOCAL_TOOLING_RELEASE_PATTERN,
    expectedVersion,
    'moldea/references/local-tooling.md',
  );

/** Hashes every distributed skill path and byte without normalization. */
export const createPortableSkillArtifactDigest = (repositoryRoot) => {
  collectPortableSkillPaths(join(repositoryRoot, 'moldea'));
  return createPortableSkillDigest(repositoryRoot);
};

/** Hashes the distributed skill while normalizing only its three release-version occurrences. */
export const createPortableSkillBehaviorDigest = (repositoryRoot) => {
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
