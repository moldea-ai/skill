#!/usr/bin/env node

const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');

const command = process.argv[2];
const FIXTURE_MANIFEST = require('../package.json');
const CLI_VERSION = FIXTURE_MANIFEST.version;
const CLI_JSON_SCHEMA_VERSION = FIXTURE_MANIFEST.moldeaRelease.cliJsonSchemaVersion;
const CLI_DEPENDENCIES = FIXTURE_MANIFEST.dependencies;
const ADAPTER_PACKAGE_PREFIX = '@moldea.ai/adapter-';
const AVAILABLE_ADAPTER_IDS = [
  'custom',
  ...Object.keys(CLI_DEPENDENCIES)
    .filter((name) => name.startsWith(ADAPTER_PACKAGE_PREFIX))
    .map((name) => name.slice(ADAPTER_PACKAGE_PREFIX.length)),
].sort((left, right) => left.localeCompare(right));
const COMPATIBILITY_PACKAGES = Object.entries(CLI_DEPENDENCIES)
  .filter(([name]) => name.startsWith('@moldea.ai/'))
  .map(([name, version]) => ({ name, version }))
  .sort(({ name: left }, { name: right }) => left.localeCompare(right));

/** Reads one text asset using the repository-format digest and length semantics. */
const readTextAsset = (logicalPath) => {
  const content = readFileSync(`.${logicalPath}`, 'utf8');

  return {
    path: logicalPath,
    content,
    digest: `sha256:${createHash('sha256').update(content).digest('hex')}`,
    utf8ByteLength: Buffer.byteLength(content),
    scalarLength: [...content].length,
  };
};

/** Builds the minimal indexed agents represented by the synthetic manifest. */
const readIndexedAgents = (manifestContent) => {
  const declarations = new Map();
  let currentDeclaration = null;
  let isInAgents = false;
  let isInMirrors = false;

  for (const line of manifestContent.split('\n')) {
    if (line === 'agents:') {
      isInAgents = true;
      continue;
    }
    if (isInAgents && /^\S/.test(line)) break;

    const agentMatch = line.match(/^  ([a-z0-9]+(?:-[a-z0-9]+)*):$/);
    if (isInAgents && agentMatch) {
      currentDeclaration = { id: agentMatch[1], runtime: null, mirrors: [] };
      declarations.set(currentDeclaration.id, currentDeclaration);
      isInMirrors = false;
      continue;
    }
    if (currentDeclaration && line === '    mirrors:') {
      isInMirrors = true;
      continue;
    }

    const runtimeMatch = currentDeclaration ? line.match(/^      id: ([a-z0-9-]+)$/) : null;
    if (currentDeclaration && runtimeMatch) {
      currentDeclaration.runtime = { id: runtimeMatch[1] };
      isInMirrors = false;
      continue;
    }

    const mirrorMatch = isInMirrors ? line.match(/^      - (\/.+)$/) : null;
    if (currentDeclaration && mirrorMatch) currentDeclaration.mirrors.push(mirrorMatch[1]);
  }

  return [...declarations.values()].map(({ id, mirrors, runtime }) => {
    const agentDirectory = `/moldea/agents/${id}`;
    const instruction = readTextAsset(`${agentDirectory}/instruction.md`);

    return {
      id,
      declaration: { runtime, ...(mirrors.length > 0 ? { mirrors } : {}) },
      description: readTextAsset(`${agentDirectory}/description.md`),
      instruction,
      handoffDescription: null,
      context: [],
      decisions: [],
      mirrors: mirrors.map((path) => ({
        path,
        digest: readTextAsset(path).digest,
        canonicalDigest: instruction.digest,
      })),
    };
  });
};

/** Lists the active adapters represented by the synthetic CLI package closure. */
const readCompatibilityAdapters = () =>
  AVAILABLE_ADAPTER_IDS.map((id) => ({ id, repositoryFormatVersions: [1] }));

/** Lists the complete package composition represented by the adapter inventory. */
const readCompatibilityPackages = () => COMPATIBILITY_PACKAGES;

if (command === '--version') {
  process.stdout.write(`${CLI_VERSION}\n`);
} else if (command === 'inspect' && process.argv.includes('--json')) {
  const manifest = readTextAsset('/moldea/moldea.yaml');
  const project = readTextAsset('/moldea/project.md');
  const agents = readIndexedAgents(manifest.content);
  const compatibilityAdapters = readCompatibilityAdapters();
  const availableAdapterIds = new Set(compatibilityAdapters.map(({ id }) => id));
  const unavailableAgent = agents.find(({ declaration }) => {
    return !availableAdapterIds.has(declaration.runtime.id);
  });
  const inspection = unavailableAgent
    ? {
        valid: false,
        formatVersion: 1,
        project: null,
        evidence: [],
        diagnostics: [
          {
            source: 'core',
            code: 'MOLDEA_RUNTIME_ADAPTER_UNAVAILABLE',
            message: `Runtime adapter ${unavailableAgent.declaration.runtime.id} is unavailable.`,
            path: '/moldea/moldea.yaml',
            pointer: `/agents/${unavailableAgent.id}/runtime/id`,
            range: null,
            entity: {
              agentId: unavailableAgent.id,
              adapterId: unavailableAgent.declaration.runtime.id,
            },
            details: {},
          },
        ],
      }
    : {
        valid: true,
        formatVersion: 1,
        project: {
          formatVersion: 1,
          manifest: {
            asset: manifest,
            value: {
              version: 1,
              context: {
                '/moldea/project.md': { affectedBy: ['/src/**'] },
              },
              agents: Object.fromEntries(agents.map(({ declaration, id }) => [id, declaration])),
            },
          },
          project,
          context: [],
          decisions: [],
          runtimes: [],
          agents,
          unresolved: {},
        },
        evidence: [],
        diagnostics: [],
      };

  process.stdout.write(
    `${JSON.stringify({
      cliVersion: CLI_VERSION,
      command: 'inspect',
      error: null,
      result: {
        source: { kind: 'git-working-tree' },
        inspection,
      },
      schemaVersion: CLI_JSON_SCHEMA_VERSION,
      status: unavailableAgent ? 'invalid' : 'valid',
    })}\n`,
  );
  if (unavailableAgent) process.exitCode = 1;
} else if (command === 'compatibility' && process.argv.includes('--json')) {
  const adapters = readCompatibilityAdapters();
  process.stdout.write(
    `${JSON.stringify({
      cliVersion: CLI_VERSION,
      command: 'compatibility',
      error: null,
      result: {
        minimumGitVersion: '2.30.0',
        supportedNodeRange: '^22.11.0 || ^24.11.0',
        packages: readCompatibilityPackages(),
        repositoryFormatVersions: [1],
        adapters,
      },
      schemaVersion: CLI_JSON_SCHEMA_VERSION,
      status: 'valid',
    })}\n`,
  );
} else {
  process.stdout.write('fixture moldea CLI\n');
}
