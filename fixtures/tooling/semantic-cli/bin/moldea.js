#!/usr/bin/env node

const { createHash } = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');

const command = process.argv[2];
const OFFICIAL_ADAPTER_IDS = [
  'anthropic',
  'claude-agent-sdk',
  'cloudflare-agents',
  'custom',
  'eve',
  'google-genai',
  'langchain',
  'langgraph',
  'openai',
  'openai-agents-sdk',
  'pydantic-ai',
  'vercel-ai-sdk',
];
const BASE_COMPATIBILITY_PACKAGES = [
  { name: '@moldea.ai/core', version: '1.0.1' },
  { name: '@moldea.ai/repository', version: '1.0.1' },
  { name: '@moldea.ai/repository-fs', version: '1.0.1' },
];

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

/** Builds the active built-in custom compatibility contract. */
const createCustomCompatibility = () => ({
  id: 'custom',
  active: true,
  bundledVersion: '1.0.1',
  matrix: {
    implementation: {
      kind: 'built-in',
      package: '@moldea.ai/core',
      distribution: 'public',
    },
    implementationStatus: 'available',
    supportedRepositoryFormatVersions: [1],
    compatibleCoreRange: '^1.0.0',
    runtimeGuidance: {
      expectation: 'required',
      notes: 'Project-local guidance defines the custom runtime integration.',
    },
    targets: [
      {
        id: 'custom',
        kind: 'custom',
        supportLevel: 'supported',
        language: 'any',
        patterns: [
          {
            id: 'explicit-repository-relationships',
            kind: 'runtime',
            support: 'full',
            description: 'Core validates explicit repository relationships.',
          },
        ],
        lastVerifiedAt: '2026-08-12',
      },
    ],
    lastVerifiedAt: '2026-08-12',
  },
});

/** Builds the active experimental OpenAI adapter contract bundled by CLI 1.1.1. */
const createOpenAiCompatibility = () => ({
  id: 'openai',
  active: true,
  bundledVersion: '1.0.1',
  matrix: {
    implementation: {
      kind: 'package',
      package: '@moldea.ai/adapter-openai',
      versionRange: '^1.0.0',
      distribution: 'public',
    },
    implementationStatus: 'available',
    supportedRepositoryFormatVersions: [1],
    compatibleCoreRange: '^1.0.0',
    runtimeGuidance: {
      expectation: 'recommended',
      notes:
        'Document project-specific model selection, tool execution, streaming, retry, and error behavior that static inspection cannot establish.',
    },
    targets: [
      {
        id: 'typescript-responses-api-7',
        kind: 'package',
        supportLevel: 'experimental',
        language: 'typescript',
        packages: [
          {
            ecosystem: 'npm',
            name: 'openai',
            role: 'primary',
            versionRange: '>=7.4.0 <8.0.0',
          },
        ],
        evidenceKinds: [
          'instruction-loader',
          'language',
          'runtime-package',
          'runtime-pattern',
          'schema',
          'tool-registration',
        ],
        lastVerifiedAt: '2026-08-15',
      },
    ],
    lastVerifiedAt: '2026-08-15',
  },
});

/** Builds one inactive planned package-backed adapter contract. */
const createPlannedCompatibility = (id) => ({
  id,
  active: false,
  bundledVersion: null,
  matrix: {
    implementation: {
      kind: 'package',
      package: `@moldea.ai/adapter-${id}`,
      distribution: 'public',
    },
    implementationStatus: 'planned',
  },
});

/** Reads case-specific overrides into one complete official adapter inventory. */
const readCompatibilityAdapters = () => {
  const fixturePath = './runtime-compatibility-fixture.json';
  const overrides = existsSync(fixturePath)
    ? JSON.parse(readFileSync(fixturePath, 'utf8')).adapters
    : [];
  const overridesById = new Map(overrides.map((adapter) => [adapter.id, adapter]));

  return OFFICIAL_ADAPTER_IDS.map((id) => {
    if (overridesById.has(id)) return overridesById.get(id);
    if (id === 'custom') return createCustomCompatibility();
    if (id === 'openai') return createOpenAiCompatibility();
    return createPlannedCompatibility(id);
  });
};

/** Lists the complete package composition represented by the adapter inventory. */
const readCompatibilityPackages = (adapters) => {
  const packages = [...BASE_COMPATIBILITY_PACKAGES];
  for (const adapter of adapters) {
    if (!adapter.active || adapter.id === 'custom') continue;
    packages.push({
      name: adapter.matrix.implementation.package,
      version: adapter.bundledVersion,
    });
  }

  return packages.sort(({ name: left }, { name: right }) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
};

if (command === '--version') {
  process.stdout.write('1.1.1\n');
} else if (command === 'inspect' && process.argv.includes('--json')) {
  const manifest = readTextAsset('/moldea/moldea.yaml');
  const project = readTextAsset('/moldea/project.md');
  const agents = readIndexedAgents(manifest.content);
  const compatibilityAdapters = readCompatibilityAdapters();
  const unavailableAgent = agents.find(({ declaration }) => {
    if (declaration.runtime.id === 'custom') return false;
    const adapter = compatibilityAdapters.find(({ id }) => id === declaration.runtime.id);
    return adapter && !adapter.active;
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
              agents: Object.fromEntries(
                agents.map(({ declaration, id }) => [id, declaration]),
              ),
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
      cliVersion: '1.1.1',
      command: 'inspect',
      error: null,
      result: {
        source: { kind: 'git-working-tree' },
        inspection,
      },
      schemaVersion: 1,
      status: unavailableAgent ? 'invalid' : 'valid',
    })}\n`,
  );
  if (unavailableAgent) process.exitCode = 1;
} else if (command === 'compatibility' && process.argv.includes('--json')) {
  const adapters = readCompatibilityAdapters();
  process.stdout.write(
    `${JSON.stringify({
      cliVersion: '1.1.1',
      command: 'compatibility',
      error: null,
      result: {
        matrixVersion: 1,
        minimumGitVersion: '2.30.0',
        outputSchemaVersion: 1,
        supportedNodeRange: '^22.11.0 || ^24.11.0',
        packages: readCompatibilityPackages(adapters),
        repositoryFormatVersions: [1],
        adapters,
      },
      schemaVersion: 1,
      status: 'valid',
    })}\n`,
  );
} else {
  process.stdout.write('fixture moldea CLI\n');
}
