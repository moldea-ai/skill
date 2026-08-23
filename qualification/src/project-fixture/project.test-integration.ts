// @vitest-environment node
import { access, chmod, lstat, mkdtemp, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createOrderTriageAgent } from '../../profiles/custom/custom/projects/create-grounded-agent/seed/src/order-triage-agent.ts';

import { DEFAULT_SKILL_REPOSITORY, QUALIFICATION_PROFILES_ROOT } from '../constants/index.ts';
import { QualificationCaseScenarioSchema, type ICandidateClosure } from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  calculateFileSha256,
  calculateSha256,
  copyDirectory,
  ensureDirectory,
  readYamlFile,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { inspectGitRepositoryState, type IGitRepositoryState } from '../repository-state/index.ts';
import {
  applyExpectedDryRunState,
  inspectWorkspaceAssertions,
  prepareQualificationProject,
} from './index.ts';

const createCandidateFixture = async (
  temporaryRoot: string,
  options: { includeRuntimePackage?: boolean } = {},
): Promise<ICandidateClosure> => {
  const runtimeDirectory = path.join(temporaryRoot, 'runtime');
  const packageSourceDirectory = path.join(temporaryRoot, 'cli-package');
  const cliExecutablePath = path.join(packageSourceDirectory, 'dist', 'moldea.js');
  const tarballPath = path.join(temporaryRoot, 'moldea.ai-cli-3.1.3.tgz');
  const typeScriptSourceDirectory = path.join(temporaryRoot, 'typescript-package');
  const typeScriptExecutablePath = path.join(typeScriptSourceDirectory, 'bin', 'tsc');
  const typeScriptTarballPath = path.join(temporaryRoot, 'typescript-6.0.3.tgz');
  const runtimePackageSourceDirectory = path.join(temporaryRoot, 'runtime-package');
  const runtimePackageTarballPath = path.join(temporaryRoot, 'fixture-runtime-1.0.0.tgz');
  await ensureDirectory(path.dirname(cliExecutablePath));
  await ensureDirectory(runtimeDirectory);
  await writeFile(
    path.join(packageSourceDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: '@moldea.ai/cli',
        version: '3.1.3',
        type: 'module',
        bin: { moldea: 'dist/moldea.js' },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  await writeFile(
    cliExecutablePath,
    "#!/usr/bin/env node\nprocess.stdout.write('fixture-cli\\n');\n",
    'utf8',
  );
  await chmod(cliExecutablePath, 0o755);
  await executeProcess({
    command: 'npm',
    args: ['pack', '--ignore-scripts', '--pack-destination', temporaryRoot],
    cwd: packageSourceDirectory,
  });
  await ensureDirectory(path.dirname(typeScriptExecutablePath));
  await writeFile(
    path.join(typeScriptSourceDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'typescript',
        version: '6.0.3',
        bin: { tsc: 'bin/tsc' },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  await writeFile(
    typeScriptExecutablePath,
    "#!/usr/bin/env node\nprocess.stdout.write('Version 6.0.3\\n');\n",
    'utf8',
  );
  await chmod(typeScriptExecutablePath, 0o755);
  await executeProcess({
    command: 'npm',
    args: ['pack', '--ignore-scripts', '--pack-destination', temporaryRoot],
    cwd: typeScriptSourceDirectory,
  });

  if (options.includeRuntimePackage === true) {
    await ensureDirectory(runtimePackageSourceDirectory);
    await writeFile(
      path.join(runtimePackageSourceDirectory, 'package.json'),
      `${JSON.stringify({ name: 'fixture-runtime', version: '1.0.0' }, null, 2)}\n`,
      'utf8',
    );
    await executeProcess({
      command: 'npm',
      args: ['pack', '--ignore-scripts', '--pack-destination', temporaryRoot],
      cwd: runtimePackageSourceDirectory,
    });
  }

  return {
    cliJsonSchemaVersion: 2,
    cliVersion: '3.1.3',
    fingerprint: 'a'.repeat(64),
    packages: [
      {
        name: '@moldea.ai/cli',
        version: '3.1.3',
        registryIntegrity: `sha512-${'a'.repeat(86)}`,
        registryShasum: 'c'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-3.1.3.tgz',
        tarballPath,
        tarballName: path.basename(tarballPath),
        sha256: await calculateFileSha256(tarballPath),
      },
    ],
    ...(options.includeRuntimePackage === true
      ? {
          runtimePackages: [
            {
              name: 'fixture-runtime',
              version: '1.0.0',
              registryIntegrity: `sha512-${'f'.repeat(86)}`,
              registryShasum: '1'.repeat(40),
              registryTarballUrl:
                'https://registry.npmjs.org/fixture-runtime/-/fixture-runtime-1.0.0.tgz',
              tarballPath: runtimePackageTarballPath,
              tarballName: path.basename(runtimePackageTarballPath),
              sha256: await calculateFileSha256(runtimePackageTarballPath),
            },
          ],
        }
      : {}),
    typeScriptPackage: {
      name: 'typescript',
      version: '6.0.3',
      registryIntegrity: `sha512-${'d'.repeat(86)}`,
      registryShasum: 'e'.repeat(40),
      registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
      tarballPath: typeScriptTarballPath,
      tarballName: path.basename(typeScriptTarballPath),
      sha256: await calculateFileSha256(typeScriptTarballPath),
    },
    runtimeDirectory,
  };
};

describe('qualification project fixtures', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('keeps the Vercel static-boundary runtime-guidance filename actor-selected', async () => {
    const scenario = await readYamlFile(
      path.join(
        QUALIFICATION_PROFILES_ROOT,
        'vercel-ai-sdk',
        'typescript-generate-stream-text-7',
        'projects',
        'preserve-vercel-static-boundary',
        'scenario.yaml',
      ),
      QualificationCaseScenarioSchema,
    );

    expect(scenario.workspace).toMatchObject({
      allowedChangePaths: ['moldea/moldea.yaml'],
      allowedChangePathPatterns: ['moldea/runtimes/**/*.md'],
      mustChangePaths: ['moldea/moldea.yaml'],
      mustChangePathPatterns: ['moldea/runtimes/**/*.md'],
      mustExistPaths: ['src/support-agent.ts', 'moldea/moldea.yaml'],
    });
  });

  test('applies dirty state, expected changes, and preservation assertions independently', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-project-'));
    const skillRepository = path.join(temporaryRoot, 'skill');
    const candidate = await createCandidateFixture(temporaryRoot);
    await ensureDirectory(skillRepository);
    const skillContent = '# Moldea test skill\n\nUse the project-local Moldea CLI.\n';
    await writeFile(path.join(skillRepository, 'SKILL.md'), skillContent, 'utf8');
    const skillState: IGitRepositoryState = {
      commit: 'fixture',
      fingerprint: calculateSha256(skillContent),
      isDirty: false,
      entries: [
        {
          path: 'SKILL.md',
          kind: 'file',
          mode: 0o100644,
          sha256: calculateSha256(skillContent),
        },
      ],
    };
    const project = await prepareQualificationProject({
      attemptDirectory: path.join(temporaryRoot, 'attempt'),
      candidate,
      profileCase: {
        id: 'maintain-dirty-project',
        projectDirectory: 'projects/maintain-dirty-project',
        scenarioFile: 'scenario.yaml',
      },
      profileDirectory: path.join(QUALIFICATION_PROFILES_ROOT, 'custom', 'custom'),
      skillRepository,
      skillState,
    });

    expect(project.beforeActorFiles.map(({ path: relativePath }) => relativePath)).toContain(
      'notes/local-observation.md',
    );
    expect(project.beforeActorFiles.map(({ path: relativePath }) => relativePath)).toContain(
      '.agents/project-policy.md',
    );

    await applyExpectedDryRunState(project);
    const assertions = await inspectWorkspaceAssertions(project);

    expect(assertions.passed).toBe(true);
    expect(assertions.changedPaths).toStrictEqual([
      'moldea/agents/support/instruction.md',
      'moldea/context/billing.md',
      'moldea/moldea.yaml',
    ]);

    await writeFile(
      path.join(project.workspaceDirectory, '.agents', 'project-policy.md'),
      'modified policy\n',
      'utf8',
    );
    expect((await inspectWorkspaceAssertions(project)).failures).toContain(
      'Required preserved path changed: .agents/project-policy.md.',
    );
  });

  test('mounts only the default portable skill with SKILL.md at its root', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-project-'));
    const attemptDirectory = path.join(temporaryRoot, 'attempt');
    const candidate = await createCandidateFixture(temporaryRoot);
    await expect(access(path.join(attemptDirectory, 'pnpm-store'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const skillState = await inspectGitRepositoryState(DEFAULT_SKILL_REPOSITORY);
    const project = await prepareQualificationProject({
      attemptDirectory,
      candidate,
      profileCase: {
        id: 'evaluate-aligned-project',
        projectDirectory: 'projects/evaluate-aligned-project',
        scenarioFile: 'scenario.yaml',
      },
      profileDirectory: path.join(QUALIFICATION_PROFILES_ROOT, 'custom', 'custom'),
      skillRepository: DEFAULT_SKILL_REPOSITORY,
      skillState,
    });
    const mountedSkillRoot = path.join(project.workspaceDirectory, '.agents', 'skills', 'moldea');

    await expect(access(path.join(attemptDirectory, 'pnpm-store'))).resolves.toBeUndefined();

    expect(await readFile(path.join(mountedSkillRoot, 'SKILL.md'), 'utf8')).toContain(
      'name: moldea',
    );
    await expect(access(path.join(mountedSkillRoot, 'qualification'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const projectManifest = JSON.parse(
      await readFile(path.join(project.workspaceDirectory, 'package.json'), 'utf8'),
    ) as unknown;
    expect(projectManifest).toMatchObject({
      devDependencies: { '@moldea.ai/cli': '3.1.3', typescript: '6.0.3' },
    });
    expect(projectManifest).not.toHaveProperty('pnpm');
    expect(
      JSON.parse(
        await readFile(
          path.join(
            project.workspaceDirectory,
            'node_modules',
            '@moldea.ai',
            'cli',
            'package.json',
          ),
          'utf8',
        ),
      ),
    ).toMatchObject({ name: '@moldea.ai/cli', version: '3.1.3' });
    expect(project.candidateRuntimeDigest).toBe(
      await calculateDirectoryFingerprint(path.join(project.workspaceDirectory, 'node_modules')),
    );
    const cliShimPath = path.join(project.workspaceDirectory, 'node_modules', '.bin', 'moldea');
    const typeScriptShimPath = path.join(project.workspaceDirectory, 'node_modules', '.bin', 'tsc');
    expect((await lstat(cliShimPath)).isSymbolicLink()).toBe(true);
    expect(path.isAbsolute(await readlink(cliShimPath))).toBe(false);
    expect((await lstat(typeScriptShimPath)).isSymbolicLink()).toBe(true);
    expect(path.isAbsolute(await readlink(typeScriptShimPath))).toBe(false);
    expect(
      (
        await executeProcess({
          command: cliShimPath,
          args: [],
          cwd: project.workspaceDirectory,
        })
      ).stdout,
    ).toBe('fixture-cli\n');
    expect(
      (
        await executeProcess({
          command: typeScriptShimPath,
          args: ['--version'],
          cwd: project.workspaceDirectory,
        })
      ).stdout,
    ).toBe('Version 6.0.3\n');
    const copiedWorkspaceDirectory = path.join(temporaryRoot, 'copied-workspace');
    await copyDirectory(project.workspaceDirectory, copiedWorkspaceDirectory);
    expect(
      (
        await executeProcess({
          command: path.join(copiedWorkspaceDirectory, 'node_modules', '.bin', 'moldea'),
          args: [],
          cwd: copiedWorkspaceDirectory,
        })
      ).stdout,
    ).toBe('fixture-cli\n');
    expect(
      (
        await executeProcess({
          command: path.join(copiedWorkspaceDirectory, 'node_modules', '.bin', 'tsc'),
          args: ['--version'],
          cwd: copiedWorkspaceDirectory,
        })
      ).stdout,
    ).toBe('Version 6.0.3\n');
    await expect(
      access(path.join(project.workspaceDirectory, 'pnpm-lock.yaml')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      access(path.join(project.workspaceDirectory, 'pnpm-workspace.yaml')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    const trackedFiles = (
      await executeProcess({
        command: 'git',
        args: ['ls-files'],
        cwd: project.workspaceDirectory,
      })
    ).stdout.split('\n');

    expect(trackedFiles).not.toContain('node_modules/@moldea.ai/cli/package.json');
    expect(trackedFiles).not.toContain('.agents/skills/moldea/SKILL.md');

    await writeFile(
      path.join(project.workspaceDirectory, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
      '{"name":"@moldea.ai/cli","version":"modified"}\n',
      'utf8',
    );
    expect((await inspectWorkspaceAssertions(project)).failures).toContain(
      'The project-local candidate runtime was modified.',
    );
  });

  test('grounds the create-agent fixture in a real canonical instruction boundary', async () => {
    const canonicalInstruction = '# Order triage\n\nClassify orders for human review.\n';
    const requestedPaths: string[] = [];
    const agent = await createOrderTriageAgent((instructionPath) => {
      requestedPaths.push(instructionPath);
      return Promise.resolve(canonicalInstruction);
    });

    expect(requestedPaths).toStrictEqual(['/moldea/agents/order-triage/instruction.md']);
    expect(agent).toStrictEqual({
      id: 'order-triage',
      instruction: canonicalInstruction,
      canApproveRefunds: false,
      action: 'classify-for-human-review',
    });
  });

  test('restores project-owned pnpm workspace settings after candidate installation', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-project-'));
    const profileDirectory = path.join(temporaryRoot, 'profile');
    const skillRepository = path.join(temporaryRoot, 'skill');
    const candidate = await createCandidateFixture(temporaryRoot);
    const originalPnpmWorkspace = 'overrides:\n  fixture-only: 1.0.0\n';
    await copyDirectory(
      path.join(QUALIFICATION_PROFILES_ROOT, 'custom', 'custom'),
      profileDirectory,
    );
    await writeFile(
      path.join(
        profileDirectory,
        'projects',
        'evaluate-aligned-project',
        'seed',
        'pnpm-workspace.yaml',
      ),
      originalPnpmWorkspace,
      'utf8',
    );
    await ensureDirectory(skillRepository);
    const skillContent = '# Moldea test skill\n';
    await writeFile(path.join(skillRepository, 'SKILL.md'), skillContent, 'utf8');
    const project = await prepareQualificationProject({
      attemptDirectory: path.join(temporaryRoot, 'attempt'),
      candidate,
      profileCase: {
        id: 'evaluate-aligned-project',
        projectDirectory: 'projects/evaluate-aligned-project',
        scenarioFile: 'scenario.yaml',
      },
      profileDirectory,
      skillRepository,
      skillState: {
        commit: 'fixture',
        fingerprint: calculateSha256(skillContent),
        isDirty: false,
        entries: [
          {
            path: 'SKILL.md',
            kind: 'file',
            mode: 0o100644,
            sha256: calculateSha256(skillContent),
          },
        ],
      },
    });

    expect(
      await readFile(path.join(project.workspaceDirectory, 'pnpm-workspace.yaml'), 'utf8'),
    ).toBe(originalPnpmWorkspace);
  });

  test('requires and installs exact profile runtime packages from candidate tarballs', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-project-'));
    const profileDirectory = path.join(temporaryRoot, 'profile');
    const skillRepository = path.join(temporaryRoot, 'skill');
    const candidate = await createCandidateFixture(temporaryRoot, { includeRuntimePackage: true });
    await copyDirectory(
      path.join(QUALIFICATION_PROFILES_ROOT, 'custom', 'custom'),
      profileDirectory,
    );
    const projectManifestPath = path.join(
      profileDirectory,
      'projects',
      'evaluate-aligned-project',
      'seed',
      'package.json',
    );
    const writeProjectManifest = async (runtimeVersion: string): Promise<void> => {
      await writeFile(
        projectManifestPath,
        `${JSON.stringify(
          {
            name: 'moldea-qualification-aligned-project',
            version: '1.0.0',
            private: true,
            type: 'module',
            dependencies: { 'fixture-runtime': runtimeVersion },
            devDependencies: { typescript: '6.0.3' },
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    };
    await ensureDirectory(skillRepository);
    const skillContent = '# Moldea test skill\n';
    await writeFile(path.join(skillRepository, 'SKILL.md'), skillContent, 'utf8');
    const skillState: IGitRepositoryState = {
      commit: 'fixture',
      fingerprint: calculateSha256(skillContent),
      isDirty: false,
      entries: [
        {
          path: 'SKILL.md',
          kind: 'file',
          mode: 0o100644,
          sha256: calculateSha256(skillContent),
        },
      ],
    };
    const commonOptions = {
      candidate,
      profileCase: {
        id: 'evaluate-aligned-project',
        projectDirectory: 'projects/evaluate-aligned-project',
        scenarioFile: 'scenario.yaml',
      },
      profileDirectory,
      skillRepository,
      skillState,
    };

    await writeProjectManifest('^1.0.0');
    await expect(
      prepareQualificationProject({
        ...commonOptions,
        attemptDirectory: path.join(temporaryRoot, 'mismatched-attempt'),
      }),
    ).rejects.toThrow('Qualification fixture must declare fixture-runtime@1.0.0 exactly.');

    await writeProjectManifest('1.0.0');
    const project = await prepareQualificationProject({
      ...commonOptions,
      attemptDirectory: path.join(temporaryRoot, 'exact-attempt'),
    });
    const installedManifest = JSON.parse(
      await readFile(
        path.join(project.workspaceDirectory, 'node_modules', 'fixture-runtime', 'package.json'),
        'utf8',
      ),
    ) as unknown;

    expect(installedManifest).toMatchObject({ name: 'fixture-runtime', version: '1.0.0' });
  });
});
