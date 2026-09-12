// @vitest-environment node
import assert from 'node:assert/strict';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertCanonicalManagedReadmeBlock,
  createManagedReadmeBytes,
  hasCanonicalManagedReadmeBlock,
  updateManagedReadme,
} from './managed-readme.template.mjs';

const CANONICAL_BLOCK =
  '<!-- moldea:start -->\n\n' +
  'For every repository task, select the repository-installed `moldea` skill so its two-byte relevance gate can test the host-known paths. If the gate does not match, continue without `moldea`.\n' +
  'Canonical moldea project state lives under `/moldea/**`; start at `/moldea/project.md`.\n' +
  '<!-- moldea:end -->\n';
const CANONICAL_BLOCK_CRLF = CANONICAL_BLOCK.replaceAll('\n', '\r\n');

const withTemporaryDirectory = async (operation) => {
  const directoryPath = await mkdtemp(join(tmpdir(), 'moldea-readme-'));

  try {
    await operation(directoryPath);
  } finally {
    await rm(directoryPath, { recursive: true, force: true });
  }
};

test('canonical block validation requires the exact structural envelope', () => {
  assert.doesNotThrow(() => assertCanonicalManagedReadmeBlock(CANONICAL_BLOCK));
  assert.throws(
    () => assertCanonicalManagedReadmeBlock(CANONICAL_BLOCK.replace('\n\n', '\n')),
    /blank line after the opening marker/u,
  );
  assert.throws(
    () => assertCanonicalManagedReadmeBlock(CANONICAL_BLOCK.replaceAll('\n', '\r\n')),
    /must use LF/u,
  );
  assert.throws(
    () => assertCanonicalManagedReadmeBlock(CANONICAL_BLOCK.slice(0, -1)),
    /exactly one newline/u,
  );
});

test('managed bytes create and append a separated canonical block deterministically', () => {
  assert.deepEqual(
    createManagedReadmeBytes(Buffer.alloc(0), CANONICAL_BLOCK),
    Buffer.from(CANONICAL_BLOCK),
  );
  assert.deepEqual(
    createManagedReadmeBytes(Buffer.from('# Project'), CANONICAL_BLOCK),
    Buffer.from(`# Project\n\n${CANONICAL_BLOCK}`),
  );
  assert.deepEqual(
    createManagedReadmeBytes(Buffer.from('# Project\n'), CANONICAL_BLOCK),
    Buffer.from(`# Project\n\n${CANONICAL_BLOCK}`),
  );
  assert.deepEqual(
    createManagedReadmeBytes(Buffer.from('# Project\r\n'), CANONICAL_BLOCK),
    Buffer.from(`# Project\r\n\r\n${CANONICAL_BLOCK_CRLF}`),
  );
});

test('managed bytes replace one marker pair while preserving unrelated bytes', () => {
  const prefix = Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from('# Café\n\n')]);
  const legacyBlock = Buffer.from('<!-- moldea:start -->\nLegacy text\r\n<!-- moldea:end -->\n');
  const suffix = Buffer.from('\nTrailing \u{1f642}\r\n', 'utf8');
  const updatedBytes = createManagedReadmeBytes(
    Buffer.concat([prefix, legacyBlock, suffix]),
    CANONICAL_BLOCK,
  );

  assert.deepEqual(updatedBytes, Buffer.concat([prefix, Buffer.from(CANONICAL_BLOCK), suffix]));
  assert.equal(hasCanonicalManagedReadmeBlock(updatedBytes, CANONICAL_BLOCK), true);
  assert.equal(
    hasCanonicalManagedReadmeBlock(Buffer.concat([prefix, legacyBlock, suffix]), CANONICAL_BLOCK),
    false,
  );
});

test('managed bytes retain the opening marker line ending when normalizing a region', () => {
  const currentBytes = Buffer.from(
    '<!-- moldea:start -->\r\nLegacy\n<!-- moldea:end -->\r\nSuffix\n',
  );
  const updatedBytes = createManagedReadmeBytes(currentBytes, CANONICAL_BLOCK);

  assert.deepEqual(updatedBytes, Buffer.from(`${CANONICAL_BLOCK_CRLF}Suffix\n`));
  assert.equal(hasCanonicalManagedReadmeBlock(updatedBytes, CANONICAL_BLOCK), true);
});

test('malformed, invalid, and oversized README content is rejected', () => {
  for (const malformedReadme of [
    '<!-- moldea:start -->\nmissing end\n',
    '<!-- moldea:end -->\n<!-- moldea:start -->\n',
    '<!-- moldea:start -->\n<!-- moldea:start -->\n<!-- moldea:end -->\n',
    'prefix <!-- moldea:start -->\n<!-- moldea:end -->\n',
  ]) {
    assert.throws(
      () => createManagedReadmeBytes(Buffer.from(malformedReadme), CANONICAL_BLOCK),
      /moldea/u,
    );
  }

  assert.throws(
    () => createManagedReadmeBytes(Buffer.from([0xc3, 0x28]), CANONICAL_BLOCK),
    /valid UTF-8/u,
  );
  assert.throws(
    () => createManagedReadmeBytes(Buffer.alloc(2 * 1024 * 1024 + 1, 0x61), CANONICAL_BLOCK),
    /exceeds/u,
  );
});

test('filesystem update creates, preserves mode, and remains byte-identical', async () => {
  await withTemporaryDirectory(async (repositoryRoot) => {
    const readmePath = join(repositoryRoot, 'README.md');

    assert.equal(await updateManagedReadme(repositoryRoot, CANONICAL_BLOCK), 'created');
    assert.deepEqual(await readFile(readmePath), Buffer.from(CANONICAL_BLOCK));

    await chmod(readmePath, 0o640);
    const beforeBytes = await readFile(readmePath);
    const unchangedMode = (await lstat(readmePath)).mode & 0o7777;
    assert.equal(await updateManagedReadme(repositoryRoot, CANONICAL_BLOCK), 'unchanged');
    assert.deepEqual(await readFile(readmePath), beforeBytes);
    assert.equal((await lstat(readmePath)).mode & 0o7777, unchangedMode);

    await writeFile(readmePath, '# Existing\n');
    await chmod(readmePath, 0o600);
    const updatedMode = (await lstat(readmePath)).mode & 0o7777;
    assert.equal(await updateManagedReadme(repositoryRoot, CANONICAL_BLOCK), 'updated');
    assert.equal((await lstat(readmePath)).mode & 0o7777, updatedMode);
    assert.deepEqual(await readFile(readmePath), Buffer.from(`# Existing\n\n${CANONICAL_BLOCK}`));
    assert.deepEqual(
      (await readdir(repositoryRoot, { withFileTypes: true })).filter((entry) =>
        entry.name.endsWith('.tmp'),
      ),
      [],
    );
  });
});

test('filesystem update rejects linked and non-regular README paths', async () => {
  await withTemporaryDirectory(async (repositoryRoot) => {
    const sourcePath = join(repositoryRoot, 'source.md');
    const readmePath = join(repositoryRoot, 'README.md');
    await writeFile(sourcePath, '# Source\n');
    await symlink(sourcePath, readmePath);

    await assert.rejects(updateManagedReadme(repositoryRoot, CANONICAL_BLOCK), /regular file/u);
    assert.deepEqual(await readFile(sourcePath), Buffer.from('# Source\n'));
  });

  await withTemporaryDirectory(async (repositoryRoot) => {
    const readmePath = join(repositoryRoot, 'README.md');
    await mkdir(readmePath);

    await assert.rejects(updateManagedReadme(repositoryRoot, CANONICAL_BLOCK), /regular file/u);
  });
});

test('filesystem update requires a normalized absolute repository root', async () => {
  await assert.rejects(
    updateManagedReadme('relative/repository', CANONICAL_BLOCK),
    /normalized absolute path/u,
  );
});
