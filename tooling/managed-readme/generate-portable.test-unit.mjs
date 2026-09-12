// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createPortableManagedReadmeSource,
  generatePortableManagedReadme,
} from './generate-portable.mjs';

const CANONICAL_BLOCK = '<!-- moldea:start -->\n\nCanonical context.\n<!-- moldea:end -->\n';
const RESERVED_LITERAL = '__MOLDEA_MANAGED_README_BLOCK_JSON__';

const withTemporaryDirectory = async (operation) => {
  const directoryPath = await mkdtemp(join(tmpdir(), 'moldea-generate-'));

  try {
    await operation(directoryPath);
  } finally {
    await rm(directoryPath, { recursive: true, force: true });
  }
};

test('portable source replaces exactly one reserved literal', () => {
  const templateSource = `const block = '${RESERVED_LITERAL}';\n`;
  const result = createPortableManagedReadmeSource(templateSource, CANONICAL_BLOCK);

  assert.equal(result, `const block = ${JSON.stringify(CANONICAL_BLOCK)};\n`);
  assert.equal(result.includes(RESERVED_LITERAL), false);
});

test('portable source rejects missing or duplicate reserved literals', () => {
  assert.throws(
    () => createPortableManagedReadmeSource('const block = "missing";\n', CANONICAL_BLOCK),
    /exactly one reserved literal/u,
  );
  assert.throws(
    () =>
      createPortableManagedReadmeSource(
        `'${RESERVED_LITERAL}'\n'${RESERVED_LITERAL}'\n`,
        CANONICAL_BLOCK,
      ),
    /exactly one reserved literal/u,
  );
});

test('portable generation writes exact bytes and detects drift in check mode', async () => {
  await withTemporaryDirectory(async (directoryPath) => {
    const templatePath = join(directoryPath, 'template.mjs');
    const assetPath = join(directoryPath, 'block.md');
    const outputPath = join(directoryPath, 'managed-readme.mjs');
    await writeFile(templatePath, `export const block = '${RESERVED_LITERAL}';\n`);
    await writeFile(assetPath, CANONICAL_BLOCK);

    assert.equal(
      await generatePortableManagedReadme({
        templatePath,
        assetPath,
        outputPath,
      }),
      'generated',
    );
    assert.equal(
      await readFile(outputPath, 'utf8'),
      `export const block = ${JSON.stringify(CANONICAL_BLOCK)};\n`,
    );
    assert.equal(
      await generatePortableManagedReadme({
        check: true,
        templatePath,
        assetPath,
        outputPath,
      }),
      'current',
    );

    await writeFile(outputPath, 'stale\n');
    await assert.rejects(
      generatePortableManagedReadme({
        check: true,
        templatePath,
        assetPath,
        outputPath,
      }),
      /is stale/u,
    );
  });
});

test('portable generation rejects malformed and invalid UTF-8 assets', async () => {
  await withTemporaryDirectory(async (directoryPath) => {
    const templatePath = join(directoryPath, 'template.mjs');
    const assetPath = join(directoryPath, 'block.md');
    const outputPath = join(directoryPath, 'managed-readme.mjs');
    await writeFile(templatePath, `export const block = '${RESERVED_LITERAL}';\n`);
    await writeFile(assetPath, Buffer.from([0xc3, 0x28]));

    await assert.rejects(
      generatePortableManagedReadme({
        templatePath,
        assetPath,
        outputPath,
      }),
      /valid UTF-8/u,
    );

    await writeFile(assetPath, '<!-- moldea:start -->\nNo end marker\n');
    await assert.rejects(
      generatePortableManagedReadme({
        templatePath,
        assetPath,
        outputPath,
      }),
      /canonical managed README block/u,
    );
  });
});
