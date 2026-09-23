// @vitest-environment node
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { z } from 'zod';

import {
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_VERSION_RANGE_TEXT_PATHS,
  RELEASE_PATHS,
} from './constants.ts';
import { createCliReleaseUpdate } from './updater.ts';

const ConformanceCasesSchema = z.object({
  cliEnvelopeCases: z.array(
    z.object({
      input: z.object({
        output: z.object({ cliVersion: z.string(), schemaVersion: z.number() }),
      }),
    }),
  ),
  packageManagerCases: z.array(
    z.object({
      input: z.object({
        cli: z.object({ declaration: z.string(), installedVersion: z.string() }),
      }),
    }),
  ),
});

test('createCliReleaseUpdate synchronizes every CLI-owned release file', () => {
  const currentFiles = new Map<string, string>(
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
    RELEASE_PATHS.skill,
    `${currentFiles.get(RELEASE_PATHS.skill)}cliJsonSchemaVersion: '3'\n`,
  );
  currentFiles.set(
    RELEASE_PATHS.skillRepositoryPackage,
    "const EXPECTED_CLI_RANGE = '^6.0.0';\nconst SUPPORTED_CORE_RANGE = '^2.0.1';\n",
  );
  currentFiles.set(
    RELEASE_PATHS.packageManifest,
    '{"moldeaRelease":{"cliJsonSchemaVersion":3,"coreVersionRange":"^2.0.1"}}\n',
  );
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
      dependencies: { '@moldea.ai/core': '^3.0.1' },
      jsonSchemaVersion: 4,
      version: '7.0.0',
    },
    updatedRootManifests: {
      packageLock: '{"lockfileVersion":3}\n',
      packageManifest: '{"version":"3.1.0"}\n',
    },
  });

  const getUpdated = (relativePath: string): string => {
    const content = updatedFiles.get(relativePath);
    if (content === undefined) throw new Error(`Missing updated file ${relativePath}.`);
    return content;
  };

  for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
    if (relativePath === RELEASE_PATHS.skillRepositoryPackage) continue;
    assert.match(getUpdated(relativePath), /@moldea\.ai\/cli \^7\.0\.0/u);
    assert.match(getUpdated(relativePath), /CLI 7/u);
    assert.match(getUpdated(relativePath), /@moldea\.ai\/core \^3\.0\.1/u);
    assert.match(getUpdated(relativePath), new RegExp(`${relativePath}: Yarn 6\\.0\\.0`));
    assert.match(getUpdated(relativePath), /unrelated-package \^6\.0\.0/u);
  }
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    assert.match(getUpdated(relativePath), /CLI JSON schema `4`/u);
  }
  assert.match(getUpdated(RELEASE_PATHS.skill), /cliJsonSchemaVersion: '4'/u);
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageLock), '{"lockfileVersion":3}\n');
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageManifest), '{"version":"3.1.0"}\n');
  assert.equal(
    updatedFiles.get(RELEASE_PATHS.skillRepositoryPackage),
    "const EXPECTED_CLI_RANGE = '^7.0.0';\nconst SUPPORTED_CORE_RANGE = '^3.0.1';\n",
  );
  const conformanceCases = ConformanceCasesSchema.parse(
    JSON.parse(getUpdated(RELEASE_PATHS.conformanceCases)) as unknown,
  );
  const packageManagerCase = conformanceCases.packageManagerCases[0];
  const schemaCase = conformanceCases.cliEnvelopeCases[0];
  const versionCase = conformanceCases.cliEnvelopeCases[1];
  assert.ok(
    packageManagerCase !== undefined && schemaCase !== undefined && versionCase !== undefined,
  );
  assert.deepEqual(packageManagerCase.input.cli, {
    declaration: '^7.0.0',
    installedVersion: '7.0.0',
  });
  assert.equal(schemaCase.input.output.schemaVersion, 1);
  assert.equal(versionCase.input.output.cliVersion, '8.0.0');
  assert.deepEqual(JSON.parse(getUpdated(RELEASE_PATHS.semanticCliManifest)), {
    bin: { moldea: 'bin/moldea.js' },
    dependencies: { '@moldea.ai/core': '^3.0.1' },
    moldeaRelease: { cliJsonSchemaVersion: 4 },
    name: '@moldea.ai/cli',
    private: true,
    version: '7.0.0',
  });

  const malformedFiles = new Map(currentFiles);
  const originalSkillContent = currentFiles.get(RELEASE_PATHS.skill);
  assert.ok(originalSkillContent !== undefined);
  malformedFiles.set(
    RELEASE_PATHS.skill,
    originalSkillContent.replace("cliJsonSchemaVersion: '3'", 'cliJsonSchemaVersion: 3'),
  );
  assert.throws(
    () =>
      createCliReleaseUpdate({
        currentFiles: malformedFiles,
        previousCliVersion: '6.0.0',
        publishedManifest: {
          dependencies: { '@moldea.ai/core': '^3.0.1' },
          jsonSchemaVersion: 4,
          version: '7.0.0',
        },
        updatedRootManifests: {
          packageLock: '{"lockfileVersion":3}\n',
          packageManifest: '{"version":"3.1.0"}\n',
        },
      }),
    /metadata must be one quoted string/u,
  );
});

test('createCliReleaseUpdate preserves portable ranges for a same-major patch', () => {
  const portableText = '@moldea.ai/cli ^7.0.0\nCLI 7\n@moldea.ai/core ^3.0.0\n';
  const currentFiles = new Map<string, string>(
    CLI_VERSION_RANGE_TEXT_PATHS.map((relativePath) => [relativePath, portableText]),
  );
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    currentFiles.set(relativePath, `${currentFiles.get(relativePath)}CLI JSON schema \`4\`\n`);
  }
  currentFiles.set(
    RELEASE_PATHS.skill,
    `${currentFiles.get(RELEASE_PATHS.skill)}cliJsonSchemaVersion: '4'\n`,
  );
  currentFiles.set(
    RELEASE_PATHS.packageManifest,
    '{"moldeaRelease":{"cliJsonSchemaVersion":4,"coreVersionRange":"^3.0.1"}}\n',
  );
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
      dependencies: { '@moldea.ai/core': '^3.0.1' },
      jsonSchemaVersion: 4,
      version: '7.0.1',
    },
    updatedRootManifests: {
      packageLock: '{"lockfileVersion":3}\n',
      packageManifest: '{"version":"5.0.0"}\n',
    },
  });

  const getUpdated = (relativePath: string): string => {
    const content = updatedFiles.get(relativePath);
    if (content === undefined) throw new Error(`Missing updated file ${relativePath}.`);
    return content;
  };

  for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
    assert.match(getUpdated(relativePath), /@moldea\.ai\/core \^3\.0\.1/u);
  }
  const cases = ConformanceCasesSchema.parse(
    JSON.parse(getUpdated(RELEASE_PATHS.conformanceCases)) as unknown,
  );
  const packageManagerCase = cases.packageManagerCases[0];
  const envelopeCase = cases.cliEnvelopeCases[0];
  assert.ok(packageManagerCase !== undefined && envelopeCase !== undefined);
  assert.equal(packageManagerCase.input.cli.declaration, '^7.0.0');
  assert.equal(packageManagerCase.input.cli.installedVersion, '7.0.1');
  assert.equal(envelopeCase.input.output.cliVersion, '7.0.1');
});
