// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

import type { ICandidateClosure } from '../contracts/index.ts';

import { verifyDeterministicProject } from './verifier.ts';
import { inspectDeterministicSelectors } from './validations.ts';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..');
const SOURCE_NODE_MODULES = path.join(REPOSITORY_ROOT, 'node_modules');
const CLI_PATH = path.join(SOURCE_NODE_MODULES, '@moldea.ai', 'cli', 'dist', 'moldea.js');
const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const packageIdentity = (name: string, version: string): ICandidateClosure['packages'][number] => ({
  name,
  version,
  registryIntegrity: `sha512-${'a'.repeat(86)}`,
  registryShasum: 'b'.repeat(40),
  registryTarballUrl: `https://registry.npmjs.org/${name}/-/${name.split('/').at(-1)}-${version}.tgz`,
  tarballPath: 'fixture.tar.gz',
  tarballName: 'fixture.tar.gz',
  sha256: 'c'.repeat(64),
});

test('real Repository FS, memory, Core, and CLI reject an incorrect evidence selector', async () => {
  const workspaceDirectory = await mkdtemp(
    path.join(path.resolve(REPOSITORY_ROOT, 'dist'), 'verification-test-'),
  );
  const runtimeDirectory = await mkdtemp(
    path.join(path.resolve(REPOSITORY_ROOT, 'dist'), 'runtime-test-'),
  );
  roots.push(workspaceDirectory, runtimeDirectory);
  await cp(
    path.join(REPOSITORY_ROOT, 'qualification/profiles/t5/cases/c1/seed'),
    workspaceDirectory,
    { recursive: true },
  );
  const nodeModulesDirectory = path.join(workspaceDirectory, 'node_modules');
  await mkdir(path.join(nodeModulesDirectory, '@moldea.ai'), { recursive: true });
  await mkdir(path.join(nodeModulesDirectory, '.bin'), { recursive: true });
  await cp(
    path.join(SOURCE_NODE_MODULES, 'typescript'),
    path.join(nodeModulesDirectory, 'typescript'),
    {
      recursive: true,
    },
  );
  await symlink(
    path.relative(
      path.join(nodeModulesDirectory, '@moldea.ai'),
      path.join(SOURCE_NODE_MODULES, '@moldea.ai', 'cli'),
    ),
    path.join(nodeModulesDirectory, '@moldea.ai', 'cli'),
    'dir',
  );
  await symlink('../typescript/bin/tsc', path.join(nodeModulesDirectory, '.bin', 'tsc'));
  await writeFile(
    path.join(workspaceDirectory, 'package.json'),
    `${JSON.stringify({ private: true, devDependencies: { typescript: '6.0.3' } })}\n`,
  );
  execFileSync('git', ['init', '--quiet'], { cwd: workspaceDirectory });

  const composition = JSON.parse(
    execFileSync(process.execPath, [CLI_PATH, 'composition', '--json', '--no-color'], {
      cwd: workspaceDirectory,
      encoding: 'utf8',
    }),
  ) as {
    cliVersion: string;
    schemaVersion: number;
    result: { packages: Array<{ name: string; version: string }> };
  };
  const candidate: ICandidateClosure = {
    fingerprint: 'd'.repeat(64),
    cliVersion: composition.cliVersion,
    cliJsonSchemaVersion: composition.schemaVersion,
    packages: [
      packageIdentity('@moldea.ai/cli', composition.cliVersion),
      ...composition.result.packages.map(({ name, version }) => packageIdentity(name, version)),
    ],
    typeScriptPackage: packageIdentity(
      'typescript',
      '6.0.3',
    ) as ICandidateClosure['typeScriptPackage'],
    runtimeDirectory,
  };
  const expectedEvidence = {
    errorCount: 0,
    warningCount: 0,
    requiredDiagnosticCodes: [],
    forbiddenDiagnosticCodes: [],
    requiredEvidenceKinds: [],
    forbiddenEvidenceKinds: [],
  };
  const valid = await verifyDeterministicProject({
    adapterId: 'custom',
    adapterPackage: '@moldea.ai/adapter-custom',
    candidate,
    expectedEvidence,
    expectedInspectionStatus: 'valid',
    workspaceDirectory,
  });
  expect(valid.summary.passed).toBe(true);
  expect(valid.summary.memoryRepositoryEquivalent).toBe(true);
  expect(valid.summary.cliEnvelopeValid).toBe(true);

  const incorrect = await verifyDeterministicProject({
    adapterId: 'custom',
    adapterPackage: '@moldea.ai/adapter-custom',
    candidate,
    expectedEvidence: {
      ...expectedEvidence,
      requiredEvidence: [{ kind: 'runtime-package', agentId: 'support' }],
    },
    expectedInspectionStatus: 'valid',
    workspaceDirectory,
  });
  expect(incorrect.summary.passed).toBe(false);
  expect(incorrect.summary.failures).toEqual([
    expect.stringContaining('Required evidence was not observed'),
  ]);
  expect(incorrect.summary.memoryRepositoryEquivalent).toBe(true);
  expect(incorrect.summary.cliEnvelopeValid).toBe(true);
});

test.each([3, 4, 13, 14])(
  'target t%d proves every deferred-loading declaration through real Core evidence',
  async (target) => {
    const profileDirectory = path.join(REPOSITORY_ROOT, `qualification/profiles/t${target}`);
    const profile = await readFile(path.join(profileDirectory, 'profile.yaml'), 'utf8');
    const adapterId = /^adapterId: ([^\n]+)/m.exec(profile)?.[1];
    expect(adapterId).toBeDefined();
    if (adapterId === undefined) return;

    for (const [declaration, expectedState] of [
      [null, 'absent'],
      ['true', 'enabled'],
      ['false', 'disabled'],
      ['deferLoading', 'unknown'],
    ] as const) {
      const workspaceDirectory = await mkdtemp(
        path.join(REPOSITORY_ROOT, 'dist', 'deferred-test-'),
      );
      roots.push(workspaceDirectory);
      const caseDirectory = path.join(profileDirectory, 'cases/c9');
      await cp(path.join(caseDirectory, 'seed'), workspaceDirectory, { recursive: true });
      await cp(path.join(caseDirectory, 'expected'), workspaceDirectory, {
        recursive: true,
        force: true,
      });
      if (declaration !== null) {
        const sourcePath = path.join(workspaceDirectory, 'src/tools.ts');
        const source = await readFile(sourcePath, 'utf8');
        const updated = source.replace(
          '  inputSchema: LookupOrderInputSchema,',
          `  inputSchema: LookupOrderInputSchema,\n  deferLoading: ${declaration},`,
        );
        expect(updated).not.toBe(source);
        await writeFile(
          sourcePath,
          declaration === 'deferLoading'
            ? `const deferLoading = process.env.MOLDEA_DEFER_TOOLS === '1';\n${updated}`
            : updated,
        );
      }
      execFileSync('git', ['init', '--quiet'], { cwd: workspaceDirectory });
      const direct = JSON.parse(
        execFileSync(
          process.execPath,
          [
            path.join(REPOSITORY_ROOT, 'dist/runtime/qualification-direct-verifier.mjs'),
            workspaceDirectory,
            adapterId,
            `@moldea.ai/adapter-${adapterId}`,
          ],
          { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
        ),
      ) as {
        equivalent: boolean;
        filesystem: {
          valid: boolean;
          diagnostics: Parameters<typeof inspectDeterministicSelectors>[1];
          evidence: Parameters<typeof inspectDeterministicSelectors>[2];
        };
      };
      expect(direct.equivalent).toBe(true);
      expect(direct.filesystem.valid).toBe(true);
      const selected = {
        requiredDiagnosticCodes: [],
        forbiddenDiagnosticCodes: [],
        requiredEvidenceKinds: [],
        forbiddenEvidenceKinds: [],
        requiredEvidence: [
          {
            kind: 'tool-registration',
            agentId: 'support',
            capabilityId: 'lookup-order',
            details: { declaredDeferredLoading: expectedState },
          },
        ],
      };
      expect(
        inspectDeterministicSelectors(
          selected,
          direct.filesystem.diagnostics,
          direct.filesystem.evidence,
        ),
      ).toStrictEqual([]);
      const incorrectState = expectedState === 'enabled' ? 'disabled' : 'enabled';
      expect(
        inspectDeterministicSelectors(
          {
            ...selected,
            requiredEvidence: [
              {
                kind: 'tool-registration',
                agentId: 'support',
                capabilityId: 'lookup-order',
                details: { declaredDeferredLoading: incorrectState },
              },
            ],
          },
          direct.filesystem.diagnostics,
          direct.filesystem.evidence,
        ),
      ).toEqual([expect.stringContaining('Required evidence was not observed')]);
    }
  },
);

test('Think uses the nearest source declaration for known and spanning instruction behavior', async () => {
  const caseDirectory = path.join(REPOSITORY_ROOT, 'qualification/profiles/t4/cases/c9');

  for (const [declaredVersion, expectedWarnings, expectsInstruction] of [
    ['>=0.17.0', 1, false],
    ['0.19.0', 0, true],
  ] as const) {
    const workspaceDirectory = await mkdtemp(path.join(REPOSITORY_ROOT, 'dist', 'think-test-'));
    roots.push(workspaceDirectory);
    await cp(path.join(caseDirectory, 'seed'), workspaceDirectory, { recursive: true });
    await cp(path.join(caseDirectory, 'expected'), workspaceDirectory, {
      recursive: true,
      force: true,
    });
    const manifestPath = path.join(workspaceDirectory, 'src/package.json');
    await writeFile(
      manifestPath,
      (await readFile(manifestPath, 'utf8')).replace('>=0.17.0', declaredVersion),
    );
    execFileSync('git', ['init', '--quiet'], { cwd: workspaceDirectory });

    const direct = JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(REPOSITORY_ROOT, 'dist/runtime/qualification-direct-verifier.mjs'),
          workspaceDirectory,
          'cloudflare-agents',
          '@moldea.ai/adapter-cloudflare-agents',
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      ),
    ) as {
      equivalent: boolean;
      filesystem: {
        errorCount: number;
        warningCount: number;
        diagnostics: Parameters<typeof inspectDeterministicSelectors>[1];
        evidence: Parameters<typeof inspectDeterministicSelectors>[2];
      };
    };
    expect(direct.equivalent).toBe(true);
    expect(direct.filesystem.errorCount).toBe(0);
    expect(direct.filesystem.warningCount).toBe(expectedWarnings);
    expect(
      direct.filesystem.evidence.some(
        (item) =>
          item.kind === 'instruction-loader' &&
          item.agentId === 'support' &&
          item.references.some(
            (reference) =>
              reference.path === '/src/agent.ts' && reference.symbol === 'loadSupportInstruction',
          ),
      ),
    ).toBe(expectsInstruction);
    expect(
      direct.filesystem.evidence.some(
        (item) =>
          item.kind === 'runtime-package' &&
          item.agentId === 'support' &&
          item.references.some((reference) => reference.path === '/src/package.json'),
      ),
    ).toBe(true);
    expect(
      inspectDeterministicSelectors(
        {
          requiredDiagnosticCodes: [],
          forbiddenDiagnosticCodes: [],
          requiredEvidenceKinds: [],
          forbiddenEvidenceKinds: [],
          ...(expectsInstruction
            ? { requiredEvidence: [{ kind: 'instruction-loader', agentId: 'support' }] }
            : {
                requiredDiagnostics: [
                  {
                    code: 'CLOUDFLARE_AGENTS_RUNTIME_RELATIONSHIP_UNVERIFIED',
                    severity: 'warning' as const,
                    agentId: 'support',
                    relationship: 'instruction-loader' as const,
                    reason: 'version-dependent-behavior' as const,
                    details: {
                      packageName: '@cloudflare/think',
                      boundaryVersion: '0.18.0',
                      declaredRange: '>=0.17.0',
                    },
                  },
                ],
              }),
        },
        direct.filesystem.diagnostics,
        direct.filesystem.evidence,
      ),
    ).toStrictEqual([]);
  }
});

test.each([
  [1, 'anthropic', 'messages.create', 'messages.parse'],
  [1, 'anthropic', 'messages.create', 'messages.stream'],
  [7, 'google-genai', 'models.generateContent', 'models.generateContentStream'],
  [11, 'openai', 'responses.create', 'responses.parse'],
  [11, 'openai', 'responses.create', 'responses.stream'],
] as const)(
  'target t%d %s recognizes direct %s to %s variant',
  async (target, adapterId, sourceMethod, alternateMethod) => {
    const caseDirectory = path.join(REPOSITORY_ROOT, `qualification/profiles/t${target}/cases/c9`);
    const workspaceDirectory = await mkdtemp(path.join(REPOSITORY_ROOT, 'dist', 'request-test-'));
    roots.push(workspaceDirectory);
    await cp(path.join(caseDirectory, 'seed'), workspaceDirectory, { recursive: true });
    await cp(path.join(caseDirectory, 'expected'), workspaceDirectory, {
      recursive: true,
      force: true,
    });
    const sourcePath = path.join(workspaceDirectory, 'src/agent.ts');
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain(sourceMethod);
    await writeFile(sourcePath, source.replace(sourceMethod, alternateMethod));
    execFileSync('git', ['init', '--quiet'], { cwd: workspaceDirectory });

    const direct = JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(REPOSITORY_ROOT, 'dist/runtime/qualification-direct-verifier.mjs'),
          workspaceDirectory,
          adapterId,
          `@moldea.ai/adapter-${adapterId}`,
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      ),
    ) as {
      equivalent: boolean;
      filesystem: {
        valid: boolean;
        errorCount: number;
        warningCount: number;
        evidence: Parameters<typeof inspectDeterministicSelectors>[2];
      };
    };
    expect(direct.equivalent).toBe(true);
    expect(direct.filesystem).toMatchObject({ valid: true, errorCount: 0, warningCount: 0 });
    expect(
      direct.filesystem.evidence.some(
        (item) =>
          item.kind === 'runtime-pattern' &&
          item.agentId === 'support' &&
          item.references.some(
            (reference) =>
              reference.path === '/src/agent.ts' && reference.symbol === 'supportAgent',
          ),
      ),
    ).toBe(true);
  },
);
