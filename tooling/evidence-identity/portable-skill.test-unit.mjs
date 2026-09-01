import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  createPortableSkillArtifactDigest,
  createPortableSkillBehaviorDigest,
} from './portable-skill.mjs';

const temporaryRoots = [];

const createRepository = ({
  localToolingVersion = '4.0.0',
  metadataVersion = '4.0.0',
  metadataVersionSource = `'${metadataVersion}'`,
  skillReleaseVersion = '4.0.0',
} = {}) => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-portable-identity-'));
  temporaryRoots.push(repositoryRoot);
  mkdirSync(join(repositoryRoot, 'moldea', 'references'), { recursive: true });
  writeFileSync(
    join(repositoryRoot, 'moldea', 'SKILL.md'),
    `---\nname: moldea\nmetadata:\n  # prettier-ignore\n  version: ${metadataVersionSource}\n---\n\nSkill release \`${skillReleaseVersion}\` supports exactly:\n`,
  );
  writeFileSync(
    join(repositoryRoot, 'moldea', 'references', 'local-tooling.md'),
    `# Local tooling\n\nRelease \`${localToolingVersion}\` supports:\n`,
  );
  writeFileSync(join(repositoryRoot, 'moldea', 'references', 'behavior.md'), 'behavior\n');
  return repositoryRoot;
};

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('release metadata changes preserve only the portable behavior digest', () => {
  const firstRoot = createRepository();
  const secondRoot = createRepository({
    localToolingVersion: '4.0.1',
    metadataVersion: '4.0.1',
    skillReleaseVersion: '4.0.1',
  });

  assert.notEqual(
    createPortableSkillArtifactDigest(firstRoot),
    createPortableSkillArtifactDigest(secondRoot),
  );
  assert.equal(
    createPortableSkillBehaviorDigest(firstRoot),
    createPortableSkillBehaviorDigest(secondRoot),
  );
});

test('non-version path or content changes invalidate the behavior digest', () => {
  const repositoryRoot = createRepository();
  const originalDigest = createPortableSkillBehaviorDigest(repositoryRoot);
  writeFileSync(join(repositoryRoot, 'moldea', 'references', 'behavior.md'), 'changed behavior\n');

  assert.notEqual(createPortableSkillBehaviorDigest(repositoryRoot), originalDigest);

  const singleQuotedRoot = createRepository();
  const doubleQuotedRoot = createRepository({ metadataVersionSource: '"4.0.0"' });
  assert.notEqual(
    createPortableSkillBehaviorDigest(singleQuotedRoot),
    createPortableSkillBehaviorDigest(doubleQuotedRoot),
  );
});

test('rejects missing, duplicate, malformed, and disagreeing release versions', () => {
  const missingSentenceRoot = createRepository();
  writeFileSync(
    join(missingSentenceRoot, 'moldea', 'references', 'local-tooling.md'),
    '# Local tooling\n',
  );
  assert.throws(
    () => createPortableSkillBehaviorDigest(missingSentenceRoot),
    /exactly one authoritative release sentence/u,
  );

  const duplicateSentenceRoot = createRepository();
  writeFileSync(
    join(duplicateSentenceRoot, 'moldea', 'references', 'local-tooling.md'),
    '# Local tooling\n\nRelease `4.0.0` supports:\nRelease `4.0.0` supports:\n',
  );
  assert.throws(
    () => createPortableSkillBehaviorDigest(duplicateSentenceRoot),
    /exactly one authoritative release sentence/u,
  );

  assert.throws(
    () => createPortableSkillBehaviorDigest(createRepository({ metadataVersion: 'next' })),
    /Expected a stable exact semantic version/u,
  );
  assert.throws(
    () => createPortableSkillBehaviorDigest(createRepository({ localToolingVersion: '4.0.1' })),
    /does not match metadata.version/u,
  );
});
