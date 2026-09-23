// @vitest-environment node
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { parseRepositoryPath } from '@moldea.ai/repository';
import { test } from 'vitest';

import { matchManifestScope, type IManifestScopeInput } from './manifest-scope.ts';

const require = createRequire(import.meta.url);
const { matchManifestScope: bundledMatch } = require('../../moldea/scripts/manifest-scope.cjs') as {
  matchManifestScope: typeof matchManifestScope;
};

const manifestWithPattern = (pattern: string): string =>
  `version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - ${pattern}\n`;

const createInput = (content: string, paths: string[]): IManifestScopeInput => ({
  manifest: { path: parseRepositoryPath('/moldea/moldea.yaml'), content },
  paths: paths.map((repositoryPath) => parseRepositoryPath(repositoryPath)),
});

const cases: Array<[string, string, string[], boolean]> = [
  ['exact', manifestWithPattern('/src/agent.ts'), ['/src/agent.ts'], true],
  ['unrelated', manifestWithPattern('/src/agent.ts'), ['/docs/branding.md'], false],
  ['glob descendants', manifestWithPattern('/src/**'), ['/src/nested/agent.ts'], true],
  ['glob segment', manifestWithPattern('/src/*.ts'), ['/src/nested/agent.ts'], false],
  ['empty', 'version: 1\n', ['/src/a.ts'], false],
  ['duplicate YAML', 'version: 1\nversion: 1\n', ['/src/a.ts'], false],
  ['invalid YAML', 'version: [\n', ['/src/a.ts'], false],
  [
    'binding',
    'version: 1\nagents:\n  assistant:\n    runtime:\n      id: custom\n    bindings:\n      runtimeAgent:\n        path: /src/agent.ts\n        symbol: agent\n',
    ['/src/agent.ts'],
    true,
  ],
  [
    'large path set',
    manifestWithPattern('/src/**'),
    Array.from({ length: 4096 }, (_, index) => `/src/a${index}.ts`),
    true,
  ],
];

for (const [name, content, paths, relevant] of cases) {
  test(`bundled matcher preserves Core results: ${name}`, async () => {
    const input = createInput(content, paths);
    const expected = await matchManifestScope(input);
    const actual = await bundledMatch(input);
    assert.deepStrictEqual(actual, expected);
    assert.equal(actual.relevant, relevant);
  });
}

test('bundled matcher rejects traversal and preserves the Core error code', async () => {
  const input = {
    manifest: { path: '/moldea/moldea.yaml', content: 'version: 1\n' },
    paths: ['/src/../secret'],
  } as unknown as IManifestScopeInput;
  await assert.rejects(() => bundledMatch(input), { code: 'INVALID_REPOSITORY_PATH' });
  await assert.rejects(() => matchManifestScope(input), { code: 'INVALID_REPOSITORY_PATH' });
});
