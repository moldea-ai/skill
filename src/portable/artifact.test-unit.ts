// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseIntegrationBlock } from '@moldea.ai/core';
import { afterEach, test } from 'vitest';

import {
  createPortableSkillArtifactDigest,
  createPortableSkillBehaviorDigest,
} from './artifact.ts';

const temporaryRoots: string[] = [];

const createRepository = ({
  validationVersion = '5.0.0',
  metadataVersion = '5.0.0',
  metadataVersionSource,
}: {
  validationVersion?: string;
  metadataVersion?: string;
  metadataVersionSource?: string;
} = {}): string => {
  const resolvedMetadataVersionSource = metadataVersionSource ?? `'${metadataVersion}'`;
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-portable-identity-'));
  temporaryRoots.push(repositoryRoot);
  mkdirSync(join(repositoryRoot, 'moldea', 'references'), { recursive: true });
  writeFileSync(
    join(repositoryRoot, 'moldea', 'SKILL.md'),
    `---\nname: moldea\nmetadata:\n  # prettier-ignore\n  version: ${resolvedMetadataVersionSource}\n---\n\n# moldea\n`,
  );
  writeFileSync(
    join(repositoryRoot, 'moldea', 'references', 'validating.md'),
    `# Validating\n\nSkill ${validationVersion} supports Git >=2.32.0 and the bundled CLI.\n`,
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
    validationVersion: '5.0.1',
    metadataVersion: '5.0.1',
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
  const doubleQuotedRoot = createRepository({ metadataVersionSource: '"5.0.0"' });
  assert.notEqual(
    createPortableSkillBehaviorDigest(singleQuotedRoot),
    createPortableSkillBehaviorDigest(doubleQuotedRoot),
  );
});

test('rejects missing, duplicate, malformed, and disagreeing release versions', () => {
  const missingSentenceRoot = createRepository();
  writeFileSync(
    join(missingSentenceRoot, 'moldea', 'references', 'validating.md'),
    '# Validating\n',
  );
  assert.throws(
    () => createPortableSkillBehaviorDigest(missingSentenceRoot),
    /exactly one authoritative release sentence/u,
  );

  const duplicateSentenceRoot = createRepository();
  writeFileSync(
    join(duplicateSentenceRoot, 'moldea', 'references', 'validating.md'),
    '# Validating\n\nSkill 5.0.0 supports Git >=2.30.0.\nSkill 5.0.0 supports Git >=2.30.0.\n',
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
    () => createPortableSkillBehaviorDigest(createRepository({ validationVersion: '5.0.1' })),
    /does not match metadata.version/u,
  );
});

test('the integration asset parses to its installed path and names existing contract files', () => {
  const skillRoot = resolve(import.meta.dirname, '../../moldea');
  const skillPath = '.agents/skills/moldea';
  const block = readFileSync(join(skillRoot, 'assets/managed-agents-block.md'), 'utf8').replaceAll(
    '{{skill-path}}',
    skillPath,
  );
  assert.ok(Buffer.byteLength(block, 'utf8') <= 4_096);
  assert.match(block, / --adoption-only$/mu);
  assert.match(block, / --path "<file>" \[--path "<file>" \.\.\.\]$/mu);
  assert.deepEqual(parseIntegrationBlock(block), { kind: 'found', skillPath });
  for (const file of ['SKILL.md', 'scripts/relevance-gate.mjs', 'assets/managed-agents-block.md']) {
    assert.equal(statSync(join(skillRoot, file)).isFile(), true, file);
  }
});
