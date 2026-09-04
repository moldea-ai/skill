// @vitest-environment node
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { DEFAULT_PACKAGES_REPOSITORY } from '../constants/index.ts';
import { inspectQualificationCoverage } from '../coverage/index.ts';
import { ensureDirectory } from '../filesystem/index.ts';
import { resolveQualificationTarget } from './loader.ts';

// cases that intentionally begin without the complete moldea adoption contract
const UNADOPTED_QUALIFICATION_CASE_IDS = new Set([
  'initialize-grounded-project',
  'stop-on-material-ambiguity',
]);

test.each([
  ['custom', 'custom', 8],
  ['anthropic', 'typescript-messages-api-0-117', 2],
  ['claude-agent-sdk', 'typescript-query-subagents-0-3', 2],
  ['vercel-ai-sdk', 'typescript-generate-stream-text-7', 2],
  ['vercel-ai-sdk', 'typescript-tool-loop-agent-7', 2],
  ['openai', 'typescript-responses-api-7', 2],
  ['openai-agents-sdk', 'typescript-agent-handoffs-0-16', 2],
  ['google-genai', 'typescript-models-generate-content-2', 2],
  ['langchain', 'typescript-create-agent-1-5', 2],
  ['langgraph', 'typescript-state-graph-1-4', 2],
  ['langgraph', 'typescript-functional-api-1-4', 2],
  ['cloudflare-agents', 'typescript-think-0-16-ai-sdk-7', 2],
  ['cloudflare-agents', 'typescript-ai-chat-agent-0-10-ai-sdk-7', 2],
  ['eve', 'typescript-filesystem-agent-0-39', 2],
] as const)(
  'preflights every %s/%s scenario with its intended adoption state',
  async (adapterId, implementationId, expectedCaseCount) => {
    const target = await resolveQualificationTarget({ adapterId, implementationId });

    expect(target.profile.cases).toHaveLength(expectedCaseCount);

    for (const profileCase of target.profile.cases) {
      const readmePath = path.join(
        target.profileDirectory,
        profileCase.projectDirectory,
        'seed',
        'README.md',
      );

      const readme = await readFile(readmePath, 'utf8');

      if (UNADOPTED_QUALIFICATION_CASE_IDS.has(profileCase.id)) {
        expect(readme).not.toContain('<!-- moldea:start -->');
        expect(readme).not.toContain('<!-- moldea:end -->');
        continue;
      }

      expect(readme).toContain('<!-- moldea:start -->');
      expect(readme).toContain('<!-- moldea:end -->');
    }
  },
);

describe('Custom qualification profile', () => {
  test('matches the matrix and covers every declared semantic case and claim', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'custom',
      implementationId: 'custom',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'evaluate-aligned-project',
      'initialize-grounded-project',
      'create-grounded-agent',
      'maintain-dirty-project',
      'reconcile-drift-and-boundaries',
      'retire-agent-coherently',
      'stop-on-material-ambiguity',
      'resist-untrusted-repository-instructions',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });

  test.each([
    [
      'repository format version',
      (adapter: Awaited<ReturnType<typeof resolveQualificationTarget>>['adapter']) => ({
        ...adapter,
        supportedRepositoryFormatVersions: [
          ...(adapter.supportedRepositoryFormatVersions ?? []),
          2,
        ],
      }),
      'adapter.supported-repository-format-version.2',
    ],
    [
      'compatible Core range',
      (adapter: Awaited<ReturnType<typeof resolveQualificationTarget>>['adapter']) => ({
        ...adapter,
        compatibleCoreRange: '^3.0.0',
      }),
      'adapter.compatible-core-range.^3.0.0',
    ],
  ] as const)(
    'invalidates coverage when the matrix adds or changes its %s claim',
    async (_description, mutateAdapter, expectedMissingClaim) => {
      const target = await resolveQualificationTarget({
        adapterId: 'custom',
        implementationId: 'custom',
      });
      const coverage = await inspectQualificationCoverage(
        target.profileDirectory,
        target.profile,
        mutateAdapter(target.adapter),
        target.target,
      );

      expect(coverage.passed).toBe(false);
      expect(coverage.missingClaims).toContain(expectedMissingClaim);
    },
  );

  test('ignores publication metadata when deriving qualification claims', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'custom',
      implementationId: 'custom',
    });
    const currentCoverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );
    const changedPublicationCoverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      {
        ...target.target,
        lastVerifiedAt: '2099-01-01',
        qualificationEvidence: {
          url: 'https://skill.moldea.ai/evidence/qualification/custom/custom/',
        },
      },
    );

    expect(changedPublicationCoverage).toStrictEqual(currentCoverage);
  });

  test('resolves the selected target from an explicit packages checkout', async () => {
    const temporaryPackagesRepository = await mkdtemp(
      path.join(os.tmpdir(), 'moldea-qualification-packages-'),
    );
    const compatibilityDirectory = path.join(temporaryPackagesRepository, 'compatibility');
    await ensureDirectory(compatibilityDirectory);
    await copyFile(
      path.join(DEFAULT_PACKAGES_REPOSITORY, 'compatibility', 'runtimes.yaml'),
      path.join(compatibilityDirectory, 'runtimes.yaml'),
    );

    try {
      const target = await resolveQualificationTarget(
        { adapterId: 'custom', implementationId: 'custom' },
        temporaryPackagesRepository,
      );

      expect(target.selection).toStrictEqual({
        adapterId: 'custom',
        implementationId: 'custom',
      });
    } finally {
      await rm(temporaryPackagesRepository, { force: true, recursive: true });
    }
  });
});

describe('Anthropic Messages API qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'anthropic',
      implementationId: 'typescript-messages-api-0-117',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@anthropic-ai/sdk', version: '0.117.1' },
      { name: '@types/node', version: '22.20.1' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'repair-anthropic-tool-registration',
      'preserve-anthropic-static-boundary',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });
});

describe('Claude Agent SDK qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'claude-agent-sdk',
      implementationId: 'typescript-query-subagents-0-3',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@anthropic-ai/claude-agent-sdk', version: '0.3.234' },
      { name: '@anthropic-ai/sdk', version: '0.117.1' },
      { name: '@modelcontextprotocol/sdk', version: '1.29.0' },
      { name: '@types/node', version: '22.20.1' },
      { name: 'zod', version: '4.3.6' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'repair-claude-agent-sdk-tool-registration',
      'preserve-claude-agent-sdk-static-boundary',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });
});

describe('Vercel AI SDK direct-generation qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'vercel-ai-sdk',
      implementationId: 'typescript-generate-stream-text-7',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@types/json-schema', version: '7.0.15' },
      { name: '@types/node', version: '22.20.1' },
      { name: 'ai', version: '7.0.77' },
      { name: 'zod', version: '4.3.6' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'repair-vercel-tool-registration',
      'preserve-vercel-static-boundary',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });

  test('rejects an exact runtime pin outside the selected target range', async () => {
    const temporaryPackagesRepository = await mkdtemp(
      path.join(os.tmpdir(), 'moldea-qualification-packages-'),
    );
    const compatibilityDirectory = path.join(temporaryPackagesRepository, 'compatibility');
    const sourceMatrixPath = path.join(
      DEFAULT_PACKAGES_REPOSITORY,
      'compatibility',
      'runtimes.yaml',
    );
    const temporaryMatrixPath = path.join(compatibilityDirectory, 'runtimes.yaml');
    await ensureDirectory(compatibilityDirectory);
    const matrixSource = await readFile(sourceMatrixPath, 'utf8');
    const incompatibleMatrixSource = matrixSource.replace(
      /(id: typescript-generate-stream-text-7[\s\S]*?name: ai[\s\S]*?versionRange:) '>=7\.0\.66 <8\.0\.0'/u,
      "$1 '>=8.0.0 <9.0.0'",
    );
    await writeFile(temporaryMatrixPath, incompatibleMatrixSource, 'utf8');

    try {
      expect(incompatibleMatrixSource).not.toBe(matrixSource);
      await expect(
        resolveQualificationTarget(
          {
            adapterId: 'vercel-ai-sdk',
            implementationId: 'typescript-generate-stream-text-7',
          },
          temporaryPackagesRepository,
        ),
      ).rejects.toThrow(
        'Qualification profile has incompatible target runtime packages: ai@7.0.77 does not satisfy >=8.0.0 <9.0.0.',
      );
    } finally {
      await rm(temporaryPackagesRepository, { force: true, recursive: true });
    }
  });
});

describe('Vercel AI SDK ToolLoopAgent qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'vercel-ai-sdk',
      implementationId: 'typescript-tool-loop-agent-7',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@ai-sdk/workflow', version: '2.0.7' },
      { name: '@types/json-schema', version: '7.0.15' },
      { name: '@types/node', version: '22.20.1' },
      { name: 'ai', version: '7.0.77' },
      { name: 'workflow', version: '5.0.0-beta.42' },
      { name: 'zod', version: '4.3.6' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'repair-vercel-tool-registration',
      'preserve-vercel-static-boundary',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });
});

describe('OpenAI Responses API qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'openai',
      implementationId: 'typescript-responses-api-7',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: 'openai', version: '7.8.0' },
      { name: '@types/node', version: '22.20.1' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'repair-openai-tool-registration',
      'preserve-openai-static-boundary',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });
});

describe('OpenAI Agents SDK qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'openai-agents-sdk',
      implementationId: 'typescript-agent-handoffs-0-16',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@openai/agents', version: '0.16.1' },
      { name: '@openai/agents-realtime', version: '0.16.1' },
      { name: '@types/node', version: '22.20.1' },
      { name: 'zod', version: '4.3.6' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'repair-openai-agents-sdk-tool-registration',
      'preserve-openai-agents-sdk-static-boundary',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });
});

describe('LangGraph Functional API qualification profile', () => {
  test('pins the real runtime boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'langgraph',
      implementationId: 'typescript-functional-api-1-4',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@langchain/core', version: '1.2.9' },
      { name: '@langchain/langgraph', version: '1.4.12' },
      { name: '@types/node', version: '22.20.1' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'repair-langgraph-functional-runtime-binding',
      'preserve-langgraph-functional-api-static-boundary',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });
});
