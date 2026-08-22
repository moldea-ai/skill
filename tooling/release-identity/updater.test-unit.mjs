// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_VERSION_TEXT_PATHS,
  RELEASE_PATHS,
} from './constants.mjs';
import { createCliReleaseUpdate } from './updater.mjs';

test('createCliReleaseUpdate synchronizes every CLI-owned release file', () => {
  const currentFiles = new Map(
    CLI_VERSION_TEXT_PATHS.map((relativePath) => [relativePath, `${relativePath}: 3.3.7\n`]),
  );
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    currentFiles.set(
      relativePath,
      `${currentFiles.get(relativePath) ?? ''}CLI JSON schema \`1\`\n`,
    );
  }
  currentFiles.set(RELEASE_PATHS.packageManifest, '{"moldeaRelease":{"cliJsonSchemaVersion":1}}\n');
  currentFiles.set(RELEASE_PATHS.packageLock, '{}\n');
  currentFiles.set(
    RELEASE_PATHS.conformanceCases,
    `${JSON.stringify(
      {
        packageManagerCases: [
          {
            id: 'exact-cli',
            input: { cli: { declaration: '3.3.7', installedVersion: '3.3.7' } },
            scenario: 'Use exact CLI 3.3.7.',
          },
        ],
        cliEnvelopeCases: [
          {
            id: 'schema-mismatch',
            input: {
              declaredCliVersion: '3.3.7',
              installedCliVersion: '3.3.7',
              output: { cliVersion: '3.3.7', schemaVersion: 2 },
            },
            scenario: 'Unsupported schema 2 with CLI 3.3.7.',
          },
          {
            id: 'version-mismatch',
            input: {
              declaredCliVersion: '3.3.7',
              installedCliVersion: '3.3.7',
              output: { cliVersion: '4.0.0', schemaVersion: 1 },
            },
            scenario: 'Unsupported CLI 4.0.0 with CLI 3.3.7.',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  currentFiles.set(
    RELEASE_PATHS.semanticCliManifest,
    `${JSON.stringify(
      {
        bin: { moldea: 'bin/moldea.js' },
        moldeaRelease: { cliJsonSchemaVersion: 1 },
        name: '@moldea.ai/cli',
        private: true,
        version: '3.3.7',
      },
      null,
      2,
    )}\n`,
  );

  const updatedFiles = createCliReleaseUpdate({
    currentFiles,
    previousCliVersion: '3.3.7',
    publishedManifest: {
      dependencies: { '@moldea.ai/core': '2.0.2' },
      jsonSchemaVersion: 2,
      version: '3.3.8',
    },
    updatedRootManifests: {
      packageLock: '{"lockfileVersion":3}\n',
      packageManifest: '{"version":"3.1.0"}\n',
    },
  });

  for (const relativePath of CLI_VERSION_TEXT_PATHS) {
    assert.match(updatedFiles.get(relativePath), new RegExp(`${relativePath}: 3\\.3\\.8`));
  }
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    assert.match(updatedFiles.get(relativePath), /CLI JSON schema `2`/u);
  }
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageLock), '{"lockfileVersion":3}\n');
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageManifest), '{"version":"3.1.0"}\n');
  const conformanceCases = JSON.parse(updatedFiles.get(RELEASE_PATHS.conformanceCases));
  assert.deepEqual(conformanceCases.packageManagerCases[0].input.cli, {
    declaration: '3.3.8',
    installedVersion: '3.3.8',
  });
  assert.equal(conformanceCases.cliEnvelopeCases[0].input.output.schemaVersion, 1);
  assert.equal(conformanceCases.cliEnvelopeCases[1].input.output.cliVersion, '4.0.0');
  assert.deepEqual(JSON.parse(updatedFiles.get(RELEASE_PATHS.semanticCliManifest)), {
    bin: { moldea: 'bin/moldea.js' },
    dependencies: { '@moldea.ai/core': '2.0.2' },
    moldeaRelease: { cliJsonSchemaVersion: 2 },
    name: '@moldea.ai/cli',
    private: true,
    version: '3.3.8',
  });
});
