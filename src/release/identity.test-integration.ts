// @vitest-environment node
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from 'vitest';

import { RELEASE_PATHS } from './constants.ts';
import { assertReleaseIdentity, createSemanticCliIdentity } from './identity.ts';

const repository = path.resolve(import.meta.dirname, '../..');

test('the pinned distribution and manifest scope identify one release', () => {
  const release = assertReleaseIdentity(repository);
  expect(release).toMatchObject({
    releaseVersion: '11.0.1',
    cliVersion: '15.0.0',
    cliJsonSchemaVersion: 9,
    coreVersion: '10.0.1',
  });
  expect(createSemanticCliIdentity(repository)).toStrictEqual({
    integrity: release.cliIntegrity,
    jsonSchemaVersion: 9,
    name: '@moldea.ai/cli',
    packageLockSha256: release.packageLockSha256,
    version: '15.0.0',
  });
});

test.each([
  [RELEASE_PATHS.manifestScope, 'module.exports.coreVersion = "101.0.0";', /same Core version/u],
  [`${RELEASE_PATHS.portableCli}/LICENSES.md`, 'Altered notices.\n', /checksum manifest/u],
  [
    RELEASE_PATHS.skill,
    '---\nname: moldea\nmetadata:\n  version: "101.0.0"\n---\n',
    /metadata version/u,
  ],
] as const)('refuses inconsistent release bytes at %s', async (file, replacement, error) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-release-identity-'));
  try {
    for (const name of Object.values(RELEASE_PATHS)) {
      const destination = path.join(temporaryRoot, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(repository, name), destination, { recursive: true });
    }
    const destination = path.join(temporaryRoot, file);
    const source = await readFile(destination, 'utf8');
    const content =
      file === RELEASE_PATHS.manifestScope
        ? source.replace(/^module\.exports\.coreVersion = "[^"\n]+";$/mu, replacement)
        : replacement;
    expect(content).not.toBe(source);
    await writeFile(destination, content);
    expect(() => assertReleaseIdentity(temporaryRoot)).toThrow(error);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
