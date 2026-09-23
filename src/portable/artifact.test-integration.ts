// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';
import { parseDocument } from 'yaml';
import { z } from 'zod';

const SKILL_PATH = resolve(import.meta.dirname, '..', '..', 'moldea', 'SKILL.md');
const FrontmatterSchema = z.object({ metadata: z.record(z.string(), z.unknown()) });

test('distributed skill metadata uses string values', () => {
  const source = readFileSync(SKILL_PATH, 'utf8');
  const frontmatter = /^---\n([\s\S]*?)\n---\n/u.exec(source)?.[1];
  assert.ok(frontmatter !== undefined);

  const document = parseDocument(frontmatter, { uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  const { metadata } = FrontmatterSchema.parse(document.toJS());
  assert.ok(Object.keys(metadata).length > 0);
  for (const metadataValue of Object.values(metadata)) {
    assert.equal(typeof metadataValue, 'string');
  }
});
