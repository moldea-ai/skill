// @vitest-environment node
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'vitest';
import { z } from 'zod';

import { CLI_JSON_SCHEMA_VERSION_TEXT_PATHS, RELEASE_PATHS } from './constants.ts';
import { inspectReleaseIdentity, readReleaseIdentity } from './identity.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..');
const IDENTITY_PATHS = [
  ...new Set([
    ...Object.values(RELEASE_PATHS),
    ...CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
    'docs/compatibility-and-local-tooling.md',
  ]),
];
const SemanticCliManifestSchema = z.looseObject({
  dependencies: z.record(z.string(), z.string()),
});

test('release identity inspection detects a stale maintained copy', () => {
  assert.deepEqual(inspectReleaseIdentity(REPOSITORY_ROOT), []);
  const { cliVersionRange, cliVersion, cliJsonSchemaVersion, coreVersionRange, coreVersion } =
    readReleaseIdentity(REPOSITORY_ROOT);
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-release-identity-'));

  try {
    for (const relativePath of IDENTITY_PATHS) {
      const sourcePath = join(REPOSITORY_ROOT, relativePath);
      const destinationPath = join(temporaryRoot, relativePath);
      mkdirSync(dirname(destinationPath), { recursive: true });
      cpSync(sourcePath, destinationPath);
    }

    const skillPath = join(temporaryRoot, RELEASE_PATHS.skill);
    const skillSource = readFileSync(skillPath, 'utf8');
    writeFileSync(
      skillPath,
      skillSource.replace(
        `cliJsonSchemaVersion: '${cliJsonSchemaVersion}'`,
        `cliJsonSchemaVersion: ${cliJsonSchemaVersion}`,
      ),
      'utf8',
    );
    assert.throws(() => inspectReleaseIdentity(temporaryRoot), /invalid_type/u);
    writeFileSync(
      skillPath,
      skillSource.replace(
        `cliJsonSchemaVersion: '${cliJsonSchemaVersion}'`,
        "cliJsonSchemaVersion: '0'",
      ),
      'utf8',
    );
    assert.throws(() => inspectReleaseIdentity(temporaryRoot), /invalid_format/u);
    writeFileSync(skillPath, skillSource, 'utf8');

    const repairMetadata = `cliRepairVersion: '${cliVersion}'`;
    for (const replacement of [
      '',
      'cliRepairVersion: 10',
      `cliRepairVersion: ${cliVersion}`,
      `cliRepairVersion: '${cliVersionRange}'`,
      `cliRepairVersion: '${cliVersion}-preview.1'`,
    ]) {
      writeFileSync(skillPath, skillSource.replace(repairMetadata, replacement), 'utf8');
      assert.throws(() => inspectReleaseIdentity(temporaryRoot));
    }
    for (const version of [`${cliVersion.split('.')[0]}.999.0`, '999.0.0']) {
      writeFileSync(
        skillPath,
        skillSource.replace(repairMetadata, `cliRepairVersion: '${version}'`),
        'utf8',
      );
      assert.deepEqual(inspectReleaseIdentity(temporaryRoot), [
        'Portable skill metadata does not match the exact current release identity.',
      ]);
    }
    writeFileSync(skillPath, skillSource, 'utf8');

    const lockPath = join(temporaryRoot, RELEASE_PATHS.packageLock);
    const lockSource = readFileSync(lockPath, 'utf8');
    const semanticCliManifestPath = join(
      temporaryRoot,
      'fixtures',
      'tooling',
      'semantic-cli',
      'package.json',
    );
    const semanticCliManifestSource = readFileSync(semanticCliManifestPath, 'utf8');
    const matchingSemanticCliManifest = SemanticCliManifestSchema.parse(
      JSON.parse(semanticCliManifestSource) as unknown,
    );
    matchingSemanticCliManifest.dependencies['@moldea.ai/core'] = coreVersionRange;
    writeFileSync(
      semanticCliManifestPath,
      `${JSON.stringify(matchingSemanticCliManifest, null, 2)}\n`,
      'utf8',
    );
    const packageLock = JSON.parse(lockSource) as {
      packages: Record<string, { dependencies?: Record<string, string> }>;
    };
    const lockedCli = packageLock.packages['node_modules/@moldea.ai/cli'];
    assert.ok(lockedCli?.dependencies !== undefined);
    lockedCli.dependencies['@moldea.ai/core'] = coreVersionRange;
    writeFileSync(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`, 'utf8');
    assert.equal(readReleaseIdentity(temporaryRoot).cliCoreVersionRange, coreVersionRange);
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);

    const sourcePath = join(temporaryRoot, RELEASE_PATHS.sourceRepositoryPackage);
    const sourceContent = readFileSync(sourcePath, 'utf8');
    writeFileSync(sourcePath, sourceContent.replace(cliVersionRange, '^999.0.0'));
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), [
      'The repository package source does not match the compatible CLI/Core closure.',
      `${RELEASE_PATHS.sourceRepositoryPackage} does not name CLI range ${cliVersionRange}.`,
    ]);
    writeFileSync(sourcePath, sourceContent);

    lockedCli.dependencies['@moldea.ai/core'] = `^${Number(coreVersion.split('.')[0]) + 1}.0.0`;
    writeFileSync(lockPath, `${JSON.stringify(packageLock, null, 2)}\n`, 'utf8');
    assert.throws(() => readReleaseIdentity(temporaryRoot), /does not bind a Core release/u);
    writeFileSync(lockPath, lockSource, 'utf8');
    writeFileSync(semanticCliManifestPath, semanticCliManifestSource, 'utf8');
    const semanticCliManifest = SemanticCliManifestSchema.parse(
      JSON.parse(readFileSync(semanticCliManifestPath, 'utf8')) as unknown,
    );
    const reorderedSemanticCliManifest = {
      ...semanticCliManifest,
      dependencies: Object.fromEntries(Object.entries(semanticCliManifest.dependencies).reverse()),
    };
    writeFileSync(
      semanticCliManifestPath,
      `${JSON.stringify(reorderedSemanticCliManifest, null, 2)}\n`,
      'utf8',
    );
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);

    writeFileSync(
      semanticCliManifestPath,
      `${JSON.stringify(
        {
          ...reorderedSemanticCliManifest,
          moldeaRelease: { cliJsonSchemaVersion: 999 },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), [
      `The semantic CLI fixture JSON schema version is not ${readReleaseIdentity(REPOSITORY_ROOT).cliJsonSchemaVersion}.`,
    ]);
    writeFileSync(
      semanticCliManifestPath,
      `${JSON.stringify(reorderedSemanticCliManifest, null, 2)}\n`,
      'utf8',
    );

    const compatibilityPath = join(temporaryRoot, 'docs', 'compatibility-and-local-tooling.md');
    const compatibilitySource = readFileSync(compatibilityPath, 'utf8');
    writeFileSync(
      compatibilityPath,
      compatibilitySource.replaceAll(cliVersionRange, '^999.0.0'),
      'utf8',
    );

    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), [
      `docs/compatibility-and-local-tooling.md does not name CLI range ${cliVersionRange}.`,
    ]);

    writeFileSync(
      compatibilityPath,
      `${compatibilitySource}\nCLI v4.0.2 is unsupported.\n`,
      'utf8',
    );
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);

    writeFileSync(compatibilityPath, `${compatibilitySource}\nSkill 4.0.2 is supported.\n`, 'utf8');
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), [
      'Current user-facing release text contains an obsolete release reference.',
    ]);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
