import assert from 'node:assert/strict';
import { test } from 'node:test';

import { matchManifestScope as bundledMatch } from '../../moldea/scripts/manifest-scope.cjs';
import { matchManifestScope } from './matcher.mjs';

const manifestWithPattern = (pattern) =>
  `version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - ${pattern}\n`;

for (const [name, content, paths, relevant] of [
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
]) {
  test(`bundled matcher preserves Core results: ${name}`, async () => {
    const input = { manifest: { path: '/moldea/moldea.yaml', content }, paths };
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
  };
  await assert.rejects(() => bundledMatch(input), { code: 'INVALID_REPOSITORY_PATH' });
  await assert.rejects(() => matchManifestScope(input), { code: 'INVALID_REPOSITORY_PATH' });
});
