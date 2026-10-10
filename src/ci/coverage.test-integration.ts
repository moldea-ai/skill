// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, test } from 'vitest';

import { checkQualificationCoverage, collectIntegrationTests } from './index.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const createSuite = async (executorSource: string) => {
  const root = await mkdtemp(resolve(import.meta.dirname, '../../.ci-collection-'));
  roots.push(root);
  await mkdir(join(root, 'vitest'));
  await mkdir(join(root, 'src/execution'), { recursive: true });
  await writeFile(
    join(root, 'vitest/test-integration.config.ts'),
    `export default { test: { include: ['src/**/*.test-integration.ts'], tags: [1,2,3,4].map(n => ({name: 'ci-executor-' + n})) } };`,
  );
  const header = `import { test } from ${JSON.stringify(pathToFileURL(resolve(import.meta.dirname, '../../node_modules/vitest/dist/index.js')).href)};\n`;
  await writeFile(
    join(root, 'src/execution/executor.test-integration.ts'),
    header + executorSource,
  );
  await writeFile(
    join(root, 'src/remaining.test-integration.ts'),
    header + `test('remaining', () => { throw new Error('must not execute'); });`,
  );
  return root;
};

test('audits actual tag/exclude selections without executing bodies', async () => {
  const root = await createSuite(
    [1, 2, 3, 4]
      .map(
        (n) =>
          `test('partition ${n}', {tags: ['ci-executor-${n}']}, () => { throw new Error('must not execute'); });`,
      )
      .join('\n'),
  );
  await expect(checkQualificationCoverage(root)).resolves.toBeUndefined();
  const selected = await collectIntegrationTests(root, {
    name: 'one',
    filters: ['src/execution/executor.test-integration.ts'],
    tagsFilter: ['ci-executor-1'],
  });
  expect(selected).toHaveLength(1);
  expect(selected[0]?.tags).toStrictEqual(['ci-executor-1']);
}, 60_000);

test.each([
  "test('untagged', () => {});",
  "test('duplicate tags', {tags: ['ci-executor-1', 'ci-executor-2']}, () => {});",
  "test('unknown tag', {tags: ['ci-executor-9']}, () => {});",
  "throw new Error('collection failure');",
])(
  'rejects invalid real collection %s',
  async (source) => {
    const root = await createSuite(source);
    await expect(checkQualificationCoverage(root)).rejects.toThrow();
  },
  60_000,
);
