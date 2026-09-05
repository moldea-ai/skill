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
    CLI_VERSION_TEXT_PATHS.map((relativePath) => [
      relativePath,
      `${relativePath}: @moldea.ai/cli 6.0.0\n${relativePath}: exact CLI version is 6.0.0\n${relativePath}: Yarn 6.0.0\n`,
    ]),
  );
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    currentFiles.set(
      relativePath,
      `${currentFiles.get(relativePath) ?? ''}CLI JSON schema \`3\`\n`,
    );
  }
  currentFiles.set(
    RELEASE_PATHS.skillRelevanceGate,
    "const EXPECTED_CLI_VERSION = '6.0.0';\nconst EXPECTED_CORE_VERSION = '2.0.2';\n",
  );
  currentFiles.set(RELEASE_PATHS.packageManifest, '{"moldeaRelease":{"cliJsonSchemaVersion":3}}\n');
  currentFiles.set(RELEASE_PATHS.packageLock, '{}\n');
  currentFiles.set(
    RELEASE_PATHS.conformanceCases,
    `${JSON.stringify(
      {
        packageManagerCases: [
          {
            id: 'exact-cli',
            input: { cli: { declaration: '6.0.0', installedVersion: '6.0.0' } },
            scenario: 'Use exact CLI 6.0.0.',
          },
        ],
        cliEnvelopeCases: [
          {
            id: 'schema-mismatch',
            input: {
              declaredCliVersion: '6.0.0',
              installedCliVersion: '6.0.0',
              output: { cliVersion: '6.0.0', schemaVersion: 2 },
            },
            scenario: 'Unsupported schema 2 with CLI 6.0.0.',
          },
          {
            id: 'version-mismatch',
            input: {
              declaredCliVersion: '6.0.0',
              installedCliVersion: '6.0.0',
              output: { cliVersion: '7.0.0', schemaVersion: 3 },
            },
            scenario: 'Unsupported CLI 7.0.0 with CLI 6.0.0.',
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
        moldeaRelease: { cliJsonSchemaVersion: 3 },
        name: '@moldea.ai/cli',
        private: true,
        version: '6.0.0',
      },
      null,
      2,
    )}\n`,
  );

  const updatedFiles = createCliReleaseUpdate({
    currentFiles,
    previousCliVersion: '6.0.0',
    publishedManifest: {
      dependencies: { '@moldea.ai/core': '3.0.0' },
      jsonSchemaVersion: 4,
      version: '7.0.0',
    },
    updatedRootManifests: {
      packageLock: '{"lockfileVersion":3}\n',
      packageManifest: '{"version":"3.1.0"}\n',
    },
  });

  for (const relativePath of CLI_VERSION_TEXT_PATHS) {
    if (relativePath === RELEASE_PATHS.skillRelevanceGate) continue;
    assert.match(
      updatedFiles.get(relativePath),
      new RegExp(`${relativePath}: @moldea\\.ai/cli 7\\.0\\.0`),
    );
    assert.match(
      updatedFiles.get(relativePath),
      new RegExp(`${relativePath}: exact CLI version is 7\\.0\\.0`),
    );
    assert.match(updatedFiles.get(relativePath), new RegExp(`${relativePath}: Yarn 6\\.0\\.0`));
  }
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    assert.match(updatedFiles.get(relativePath), /CLI JSON schema `4`/u);
  }
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageLock), '{"lockfileVersion":3}\n');
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageManifest), '{"version":"3.1.0"}\n');
  assert.equal(
    updatedFiles.get(RELEASE_PATHS.skillRelevanceGate),
    "const EXPECTED_CLI_VERSION = '7.0.0';\nconst EXPECTED_CORE_VERSION = '3.0.0';\n",
  );
  const conformanceCases = JSON.parse(updatedFiles.get(RELEASE_PATHS.conformanceCases));
  assert.deepEqual(conformanceCases.packageManagerCases[0].input.cli, {
    declaration: '7.0.0',
    installedVersion: '7.0.0',
  });
  assert.equal(conformanceCases.cliEnvelopeCases[0].input.output.schemaVersion, 1);
  assert.equal(conformanceCases.cliEnvelopeCases[1].input.output.cliVersion, '8.0.0');
  assert.deepEqual(JSON.parse(updatedFiles.get(RELEASE_PATHS.semanticCliManifest)), {
    bin: { moldea: 'bin/moldea.js' },
    dependencies: { '@moldea.ai/core': '3.0.0' },
    moldeaRelease: { cliJsonSchemaVersion: 4 },
    name: '@moldea.ai/cli',
    private: true,
    version: '7.0.0',
  });
});
