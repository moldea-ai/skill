import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

import {
  assertCompatibility402Expansion,
  assertRepositoryCompatibility,
  COMPATIBILITY_401,
  COMPATIBILITY_402,
  isCompatibilityVersionSupported,
  parseCompatibility,
  validateCompatibilityContract,
} from './compatibility.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');

/** Creates one explicit portable compatibility fixture. */
const createCompatibilityFixture = (contract) => `---
name: fixture
---

# Fixture

## Release compatibility

Skill release \`${contract.skillVersion}\` supports exactly:

- \`@moldea.ai/cli: ${contract.cliVersion}\`
- CLI JSON schema: \`${contract.cliJsonSchemaVersion}\`
- Node.js: \`${contract.nodeRange}\`
- npm: \`${contract.npmRange}\`
- pnpm: \`${contract.pnpmRange}\`
- yarn: \`${contract.yarnRange}\`

The CLI is an exact root development dependency; other entries retain their ranges.

## Next section
`;

test('parses immutable 4.0.1 and planned 4.0.2 compatibility from explicit content', () => {
  assert.deepEqual(parseCompatibility(createCompatibilityFixture(COMPATIBILITY_401)), {
    ...COMPATIBILITY_401,
  });
  assert.deepEqual(parseCompatibility(createCompatibilityFixture(COMPATIBILITY_402)), {
    ...COMPATIBILITY_402,
  });
});

test('keeps the ambient 4.0.2 repository synchronized with the frozen contract', () => {
  assert.deepEqual(assertRepositoryCompatibility(repositoryRoot, COMPATIBILITY_402), {
    ...COMPATIBILITY_402,
  });
});

test('validates a planned 4.0.2 repository through explicit synchronized fixtures', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'moldea-compatibility-'));
  const publicCopy = `Release \`4.0.2\` supports:
- Node.js \`>=22.11.0\`
- \`@moldea.ai/cli 5.0.3\`
- CLI JSON schema \`2\`
- npm \`>=7.0.0\`
- pnpm \`>=8.3.1\`
- Yarn \`>=4.14.1\`
`;
  try {
    mkdirSync(join(fixtureRoot, 'moldea/references'), { recursive: true });
    mkdirSync(join(fixtureRoot, 'docs'), { recursive: true });
    writeFileSync(
      join(fixtureRoot, 'package.json'),
      `${JSON.stringify({
        version: '4.0.2',
        engines: { node: '>=22.11.0' },
        moldeaRelease: { cliJsonSchemaVersion: 2 },
        devDependencies: { '@moldea.ai/cli': '5.0.3' },
      })}\n`,
    );
    writeFileSync(
      join(fixtureRoot, 'moldea/SKILL.md'),
      createCompatibilityFixture(COMPATIBILITY_402),
    );
    writeFileSync(join(fixtureRoot, 'README.md'), publicCopy);
    writeFileSync(join(fixtureRoot, 'moldea/references/local-tooling.md'), publicCopy);
    writeFileSync(
      join(fixtureRoot, 'docs/compatibility-and-local-tooling.md'),
      publicCopy.replace('Release `4.0.2` supports:\n', ''),
    );
    assert.deepEqual(assertRepositoryCompatibility(fixtureRoot, COMPATIBILITY_402), {
      ...COMPATIBILITY_402,
    });
    writeFileSync(join(fixtureRoot, 'README.md'), `${publicCopy}- npm \`>=7.0.0\`\n`);
    assert.throws(
      () => assertRepositoryCompatibility(fixtureRoot, COMPATIBILITY_402),
      /exactly one npm compatibility value/u,
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test('rejects missing, duplicate, malformed, and prerelease compatibility fields', () => {
  const fixture = createCompatibilityFixture(COMPATIBILITY_402);
  assert.throws(
    () => parseCompatibility(fixture.replace('- npm:', '- npm: `>=7.0.0`\n- npm:')),
    /malformed or contains duplicate fields/u,
  );
  assert.throws(
    () => parseCompatibility(fixture.replace('- pnpm: `>=8.3.1`\n', '')),
    /malformed or contains duplicate fields/u,
  );
  assert.throws(
    () => parseCompatibility(fixture.replace('>=22.11.0', 'definitely-not-semver')),
    /valid semantic version range/u,
  );
  assert.throws(
    () => parseCompatibility(fixture.replace('>=7.0.0', '>=7.0.0-beta.1')),
    /prerelease comparators/u,
  );
  assert.throws(
    () => parseCompatibility(`${fixture}\n## Release compatibility\n`),
    /exactly one Release compatibility section/u,
  );
  assert.throws(
    () =>
      validateCompatibilityContract({
        ...COMPATIBILITY_402,
        unsupported: true,
      }),
    /incomplete or unsupported/u,
  );
});

test('proves corrected open floors and preserves every valid prior supported range', () => {
  const result = assertCompatibility402Expansion(COMPATIBILITY_401, COMPATIBILITY_402);
  assert.deepEqual(result, {
    source: { ...COMPATIBILITY_401 },
    candidate: { ...COMPATIBILITY_402 },
  });

  for (const [range, supportedVersions, rejectedVersions] of [
    [COMPATIBILITY_402.nodeRange, ['22.11.0', '23.0.0', '24.11.0', '999.0.0'], ['22.10.0']],
    [COMPATIBILITY_402.npmRange, ['7.0.0', '12.0.2', '999.0.0'], ['6.14.18']],
    [COMPATIBILITY_402.pnpmRange, ['8.3.1', '12.3.1', '999.0.0'], ['8.3.0']],
    [COMPATIBILITY_402.yarnRange, ['4.14.1', '5.0.0', '999.0.0'], ['4.14.0']],
  ]) {
    for (const version of supportedVersions) {
      assert.equal(isCompatibilityVersionSupported(range, version), true, `${range} ${version}`);
    }
    for (const version of rejectedVersions) {
      assert.equal(isCompatibilityVersionSupported(range, version), false, `${range} ${version}`);
    }
  }
  assert.equal(isCompatibilityVersionSupported(COMPATIBILITY_402.nodeRange, '24.0.0-rc.1'), false);
});

test('rejects narrowed, upper-bounded, and incorrect-floor target contracts', () => {
  for (const candidate of [
    { ...COMPATIBILITY_402, nodeRange: '>=24.0.0' },
    { ...COMPATIBILITY_402, npmRange: '>=7.0.0 <13.0.0' },
    { ...COMPATIBILITY_402, pnpmRange: '>=8.3.0' },
    { ...COMPATIBILITY_402, yarnRange: '>=4.14.0' },
  ]) {
    assert.throws(
      () => assertCompatibility402Expansion(COMPATIBILITY_401, candidate),
      /candidate compatibility contract/u,
    );
  }
});
