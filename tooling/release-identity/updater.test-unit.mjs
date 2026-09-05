// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_VERSION_RANGE_TEXT_PATHS,
  RELEASE_PATHS,
} from './constants.mjs';
import { createCliReleaseUpdate } from './updater.mjs';

test('createCliReleaseUpdate synchronizes every CLI-owned release file', () => {
  const currentFiles = new Map(
    CLI_VERSION_RANGE_TEXT_PATHS.map((relativePath) => [
      relativePath,
      `${relativePath}: @moldea.ai/cli ^6.0.0\n${relativePath}: CLI 6\n${relativePath}: Yarn 6.0.0\n${relativePath}: @moldea.ai/core ^2.0.0\n${relativePath}: unrelated-package ^6.0.0\n`,
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
    "const EXPECTED_CLI_RANGE = '^6.0.0';\nconst EXPECTED_CORE_RANGE = '^2.0.0';\n",
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
            input: {
              cli: { declaration: '^6.0.0', installedVersion: '6.0.0' },
            },
            scenario: 'Use compatible CLI 6.0.0.',
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
        dependencies: { '@moldea.ai/core': '^2.0.0' },
      },
      null,
      2,
    )}\n`,
  );

  const updatedFiles = createCliReleaseUpdate({
    currentFiles,
    previousCliVersion: '6.0.0',
    publishedManifest: {
      dependencies: { '@moldea.ai/core': '^3.0.0' },
      jsonSchemaVersion: 4,
      version: '7.0.0',
    },
    updatedRootManifests: {
      packageLock: '{"lockfileVersion":3}\n',
      packageManifest: '{"version":"3.1.0"}\n',
    },
  });

  for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
    if (relativePath === RELEASE_PATHS.skillRelevanceGate) continue;
    assert.match(updatedFiles.get(relativePath), /@moldea\.ai\/cli \^7\.0\.0/u);
    assert.match(updatedFiles.get(relativePath), /CLI 7/u);
    assert.match(updatedFiles.get(relativePath), /@moldea\.ai\/core \^3\.0\.0/u);
    assert.match(updatedFiles.get(relativePath), new RegExp(`${relativePath}: Yarn 6\\.0\\.0`));
    assert.match(updatedFiles.get(relativePath), /unrelated-package \^6\.0\.0/u);
  }
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    assert.match(updatedFiles.get(relativePath), /CLI JSON schema `4`/u);
  }
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageLock), '{"lockfileVersion":3}\n');
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageManifest), '{"version":"3.1.0"}\n');
  assert.equal(
    updatedFiles.get(RELEASE_PATHS.skillRelevanceGate),
    "const EXPECTED_CLI_RANGE = '^7.0.0';\nconst EXPECTED_CORE_RANGE = '^3.0.0';\n",
  );
  const conformanceCases = JSON.parse(updatedFiles.get(RELEASE_PATHS.conformanceCases));
  assert.deepEqual(conformanceCases.packageManagerCases[0].input.cli, {
    declaration: '^7.0.0',
    installedVersion: '7.0.0',
  });
  assert.equal(conformanceCases.cliEnvelopeCases[0].input.output.schemaVersion, 1);
  assert.equal(conformanceCases.cliEnvelopeCases[1].input.output.cliVersion, '8.0.0');
  assert.deepEqual(JSON.parse(updatedFiles.get(RELEASE_PATHS.semanticCliManifest)), {
    bin: { moldea: 'bin/moldea.js' },
    dependencies: { '@moldea.ai/core': '^3.0.0' },
    moldeaRelease: { cliJsonSchemaVersion: 4 },
    name: '@moldea.ai/cli',
    private: true,
    version: '7.0.0',
  });
});

test('createCliReleaseUpdate preserves portable ranges for a same-major patch', () => {
  const portableText = '@moldea.ai/cli ^7.0.0\nCLI 7\n@moldea.ai/core ^3.0.0\n';
  const currentFiles = new Map(
    CLI_VERSION_RANGE_TEXT_PATHS.map((relativePath) => [relativePath, portableText]),
  );
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    currentFiles.set(relativePath, `${currentFiles.get(relativePath)}CLI JSON schema \`4\`\n`);
  }
  currentFiles.set(RELEASE_PATHS.packageManifest, '{"moldeaRelease":{"cliJsonSchemaVersion":4}}\n');
  currentFiles.set(RELEASE_PATHS.packageLock, '{}\n');
  currentFiles.set(
    RELEASE_PATHS.conformanceCases,
    `${JSON.stringify(
      {
        packageManagerCases: [
          {
            id: 'compatible-cli',
            input: {
              cli: { declaration: '^7.0.0', installedVersion: '7.0.0' },
            },
            scenario: 'Use CLI 7.0.0.',
          },
        ],
        cliEnvelopeCases: [
          {
            id: 'schema-mismatch',
            input: {
              declaredCliVersion: '7.0.0',
              installedCliVersion: '7.0.0',
              output: { cliVersion: '7.0.0', schemaVersion: 3 },
            },
            scenario: 'Unsupported schema 3 with CLI 7.0.0.',
          },
          {
            id: 'version-mismatch',
            input: {
              declaredCliVersion: '7.0.0',
              installedCliVersion: '7.0.0',
              output: { cliVersion: '8.0.0', schemaVersion: 4 },
            },
            scenario: 'Unsupported CLI 8.0.0 with CLI 7.0.0.',
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
        dependencies: { '@moldea.ai/core': '^3.0.0' },
        moldeaRelease: { cliJsonSchemaVersion: 4 },
        version: '7.0.0',
      },
      null,
      2,
    )}\n`,
  );

  const updatedFiles = createCliReleaseUpdate({
    currentFiles,
    previousCliVersion: '7.0.0',
    publishedManifest: {
      dependencies: { '@moldea.ai/core': '^3.0.0' },
      jsonSchemaVersion: 4,
      version: '7.0.1',
    },
    updatedRootManifests: {
      packageLock: '{"lockfileVersion":3}\n',
      packageManifest: '{"version":"5.0.0"}\n',
    },
  });

  for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
    assert.equal(updatedFiles.get(relativePath).startsWith(portableText), true);
  }
  const cases = JSON.parse(updatedFiles.get(RELEASE_PATHS.conformanceCases));
  assert.equal(cases.packageManagerCases[0].input.cli.declaration, '^7.0.0');
  assert.equal(cases.packageManagerCases[0].input.cli.installedVersion, '7.0.1');
  assert.equal(cases.cliEnvelopeCases[0].input.output.cliVersion, '7.0.1');
});
