// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import { createAssessorFingerprint, createFixtureFingerprint } from './index.ts';

test('source identity binds both maintained assessor and shared confirmation sources', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-identity-'));
  try {
    for (const name of ['src/scripted-journeys', 'src/execution/confirmation'])
      await mkdir(path.join(scratch, name), { recursive: true });
    await writeFile(path.join(scratch, 'src/scripted-journeys/source.ts'), 'first');
    const first = await createAssessorFingerprint(scratch);
    await writeFile(path.join(scratch, 'src/execution/confirmation/source.ts'), 'policy');
    const second = await createAssessorFingerprint(scratch);
    expect(second).not.toBe(first);
    await writeFile(path.join(scratch, 'unrelated.md'), 'unrelated');
    expect(await createAssessorFingerprint(scratch)).toBe(second);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('fixture identity is local to a journey and independent of inventory insertion order', () => {
  const files = {
    'journeys/first/fixture/policy.md': 'a'.repeat(64),
    'journeys/second/fixture/policy.md': 'b'.repeat(64),
  };
  const initial = createFixtureFingerprint(files, 'first');
  files['journeys/second/fixture/policy.md'] = 'c'.repeat(64);
  expect(createFixtureFingerprint(files, 'first')).toBe(initial);
  expect(
    createFixtureFingerprint(Object.fromEntries(Object.entries(files).reverse()), 'first'),
  ).toBe(initial);
  files['journeys/first/fixture/policy.md'] = 'd'.repeat(64);
  expect(createFixtureFingerprint(files, 'first')).not.toBe(initial);
  expect(() => createFixtureFingerprint(files, 'absent')).toThrow();
});
