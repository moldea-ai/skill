import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { pathExists } from 'jg-fs';
import { isMainModule, resolvePackageManagerCommand } from 'jg-process';
import { z } from 'zod';
import { parseAllDocuments } from 'yaml';

import { executeProcess } from '../process/index.ts';
import { assertReleaseIdentity } from '../release/index.ts';
import { createCandidateRegistry, loadCandidateArtifacts } from './artifacts.ts';
import type { ICandidateRegistry } from './types.ts';

const EnvironmentSchema = z.strictObject({
  artifactDirectory: z.string().trim().min(1),
  existingVitestVersion: z.string().trim().min(1).optional(),
  manager: z.enum(['npm', 'pnpm', 'yarn']),
  skillRoot: z.string().trim().min(1),
  managerVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
});

type IConformanceEnvironment = z.infer<typeof EnvironmentSchema>;

// ordinary lockfile written by each package manager
const LOCKFILE_NAMES = {
  npm: 'package-lock.json',
  pnpm: 'pnpm-lock.yaml',
  yarn: 'yarn.lock',
} as const;

/*
 * The unrelated local dependency whose declaration and lock entries must survive CLI recovery.
 * Its directory carries the package name, because npm 8 and 10 otherwise add a `name` field to
 * its lock entry when another dependency is removed and re-added.
 */
const UNRELATED_DEPENDENCY_NAME = 'moldea-lifecycle-dependency';

/** Reads every lockfile document, including pnpm's multi-document format. */
const readLockedGraph = (source: string): unknown[] =>
  parseAllDocuments(source).map((document) => {
    assert.deepEqual(document.errors, []);
    return document.toJS() as unknown;
  });

/** Reads the exact package-manager matrix selection supplied by release-candidate CI. */
const readConformanceEnvironment = (): IConformanceEnvironment =>
  EnvironmentSchema.parse({
    artifactDirectory: process.env['MOLDEA_CLI_ARTIFACT_DIRECTORY'],
    existingVitestVersion: process.env['MOLDEA_TEST_EXISTING_VITEST_VERSION'] || undefined,
    manager: process.env['MOLDEA_TEST_MANAGER'],
    skillRoot: process.env['MOLDEA_CANDIDATE_SKILL_ROOT'],
    managerVersion: process.env['MOLDEA_TEST_MANAGER_VERSION'],
  });

/** Distinguishes Yarn Classic from Yarn 3 and later; Yarn 2 cannot skip dependency builds while adding. */
const isYarnClassic = (
  manager: IConformanceEnvironment['manager'],
  managerVersion: string,
): boolean => {
  if (manager !== 'yarn') return false;
  const major = Number(managerVersion.split('.')[0]);
  if (major === 2) throw new Error('Yarn 2 is not a supported conformance target.');
  return major === 1;
};

/** Builds the shell-free command for the package manager the workflow matrix installed. */
const createManagerCommand = (
  manager: IConformanceEnvironment['manager'],
  args: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env,
): { args: string[]; command: string } =>
  resolvePackageManagerCommand([...args], { packageManager: manager, env: environment, cwd });

/** Runs one bounded shell-free command and returns trimmed standard output. */
const runCommand = async (options: {
  args: readonly string[];
  command: string;
  cwd: string;
  environment?: NodeJS.ProcessEnv;
  expectedExitCodes?: number[];
}): Promise<{ stderr: string; stdout: string }> => {
  const result = await executeProcess(options);
  return { stderr: result.stderr, stdout: result.stdout.trim() };
};

/** Runs the matrix package manager like runCommand. */
const runManagerCommand = (
  manager: IConformanceEnvironment['manager'],
  options: { args: readonly string[]; cwd: string; environment?: NodeJS.ProcessEnv },
): Promise<{ stderr: string; stdout: string }> =>
  runCommand({
    ...options,
    ...createManagerCommand(manager, options.args, options.cwd, options.environment),
  });

/** Writes manager-specific local registry configuration without changing global state. */
const configureCandidateRegistry = async (
  clientDirectory: string,
  manager: IConformanceEnvironment['manager'],
  managerVersion: string,
  registryUrl: string,
): Promise<void> => {
  if (manager === 'yarn' && !isYarnClassic(manager, managerVersion)) {
    await writeFile(path.join(clientDirectory, 'yarn.lock'), '', { flag: 'a' });
    await writeFile(
      path.join(clientDirectory, '.yarnrc.yml'),
      `nodeLinker: node-modules\nenableGlobalCache: false\nnpmScopes:\n  moldea.ai:\n    npmRegistryServer: "${registryUrl}"\nunsafeHttpWhitelist:\n  - 127.0.0.1\n`,
      'utf8',
    );
    return;
  }

  await writeFile(
    path.join(clientDirectory, '.npmrc'),
    `@moldea.ai:registry=${registryUrl}/\n${manager === 'pnpm' ? 'store-dir=.manager-home/store\n' : ''}`,
    'utf8',
  );
  if (manager === 'pnpm') {
    await writeFile(
      path.join(clientDirectory, 'pnpm-workspace.yaml'),
      "packages:\n  - 'packages/*'\n",
      'utf8',
    );
  }
};

/** Creates exact lifecycle-safe dependency arguments for one package manager. */
const createInstallArguments = (options: {
  manager: IConformanceEnvironment['manager'];
  managerVersion: string;
  packageIdentity: string;
}): string[] => {
  if (options.manager === 'npm') {
    return ['install', '--save-dev', '--save-exact', '--ignore-scripts', options.packageIdentity];
  }
  if (options.manager === 'pnpm') {
    return [
      'add',
      '--workspace-root',
      '--save-dev',
      '--save-exact',
      '--ignore-scripts',
      options.packageIdentity,
    ];
  }
  if (isYarnClassic(options.manager, options.managerVersion)) {
    return ['add', '-W', '--dev', '--exact', '--ignore-scripts', options.packageIdentity];
  }
  return ['add', '--dev', '--exact', '--mode=skip-build', options.packageIdentity];
};

/** Creates the targeted lifecycle-safe CLI removal arguments for one package manager. */
const createRemoveArguments = (
  manager: IConformanceEnvironment['manager'],
  managerVersion: string,
): string[] => {
  if (manager === 'npm') return ['uninstall', '--ignore-scripts', '@moldea.ai/cli'];
  if (manager === 'pnpm') return ['remove', '--workspace-root', '@moldea.ai/cli'];
  if (isYarnClassic(manager, managerVersion))
    return ['remove', '-W', '--ignore-scripts', '@moldea.ai/cli'];
  return ['remove', '--mode=skip-build', '@moldea.ai/cli'];
};

/** Disables scripts through configuration; pnpm removal accepts no flag on every supported version. */
const createScriptlessEnvironment = (environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv => ({
  ...environment,
  npm_config_ignore_scripts: 'true',
  PNPM_CONFIG_IGNORE_SCRIPTS: 'true',
});

/** Collects every lockfile value whose key names the unrelated dependency or its path. */
const collectUnrelatedLockEntries = (
  value: unknown,
  keyPath: readonly string[] = [],
): Array<[string, unknown]> => {
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key.includes(UNRELATED_DEPENDENCY_NAME)
      ? [[[...keyPath, key].join(' > '), child] as [string, unknown]]
      : collectUnrelatedLockEntries(child, [...keyPath, key]),
  );
};

/** Reads the unrelated dependency's lock entries; Yarn Classic's lockfile is compared as text blocks. */
const readUnrelatedLockEntries = (source: string, yarnClassic: boolean): unknown[] =>
  yarnClassic
    ? source
        .split(/\n{2,}/u)
        .filter((block) => block.split('\n', 1)[0]!.includes(UNRELATED_DEPENDENCY_NAME))
    : readLockedGraph(source).flatMap((document) => collectUnrelatedLockEntries(document));

/** Creates a minimal valid Custom-runtime project for real CLI execution. */
const seedConformanceProject = async (clientDirectory: string): Promise<void> => {
  await Promise.all([
    mkdir(path.join(clientDirectory, 'moldea', 'agents', 'custom-agent'), { recursive: true }),
    mkdir(path.join(clientDirectory, 'moldea', 'runtimes'), { recursive: true }),
    mkdir(path.join(clientDirectory, 'src'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(clientDirectory, 'moldea', 'moldea.yaml'),
      'version: 1\nagents:\n  custom-agent:\n    runtime:\n      id: custom\n      guidance: /moldea/runtimes/custom.md\n    bindings:\n      runtimeAgent:\n        path: /src/custom-agent.ts\n        symbol: customAgent\n    affectedBy:\n      - /src/**\n',
      'utf8',
    ),
    writeFile(
      path.join(clientDirectory, 'moldea', 'project.md'),
      '# CLI conformance project\n',
      'utf8',
    ),
    writeFile(
      path.join(clientDirectory, 'moldea', 'agents', 'custom-agent', 'description.md'),
      'A custom conformance agent.\n',
      'utf8',
    ),
    writeFile(
      path.join(clientDirectory, 'moldea', 'agents', 'custom-agent', 'instruction.md'),
      'You are the `custom-agent` agent.\n',
      'utf8',
    ),
    writeFile(
      path.join(clientDirectory, 'moldea', 'runtimes', 'custom.md'),
      'Use the project-local custom runtime.\n',
      'utf8',
    ),
    writeFile(
      path.join(clientDirectory, 'src', 'custom-agent.ts'),
      'export const customAgent = {};\n',
      'utf8',
    ),
  ]);
};

/** Exercises the shipped closed launcher without a manager or binary-shim provider. */
const runCli = async (options: {
  argumentsList: readonly string[];
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  expectedExitCodes?: number[];
  skillRoot: string;
}): Promise<{ stderr: string; stdout: string }> =>
  runCommand({
    args: [
      path.join(options.skillRoot, 'scripts/moldea-cli.mjs'),
      '--repository',
      options.clientDirectory,
      '--',
      ...options.argumentsList,
    ],
    command: process.execPath,
    cwd: options.clientDirectory,
    environment: options.environment,
    ...(options.expectedExitCodes === undefined
      ? {}
      : { expectedExitCodes: options.expectedExitCodes }),
  });

/** Checks that damaged metadata is rejected before any candidate code can execute. */
const verifyIneligibleMetadata = async (options: {
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  skillRoot: string;
  cliVersion: string;
}): Promise<void> => {
  const cliRoot = await realpath(path.join(options.clientDirectory, 'node_modules/@moldea.ai/cli'));
  const cliManifestPath = path.join(cliRoot, 'package.json');
  const cliManifestSource = await readFile(cliManifestPath, 'utf8');
  const cliManifest = JSON.parse(cliManifestSource) as { name: string; version: string };
  const binaryPath = path.join(cliRoot, 'dist/moldea.js');
  const binarySource = await readFile(binaryPath);
  const sentinelPath = path.join(options.clientDirectory, 'ineligible-cli-ran.txt');
  try {
    await writeFile(
      binaryPath,
      `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(sentinelPath)}, 'executed');`,
    );
    for (const metadata of [
      { ...cliManifest, name: '@moldea.ai/not-cli' },
      { ...cliManifest, version: `${Number(options.cliVersion.split('.')[0]) - 1}.0.0` },
      { ...cliManifest, version: `${Number(options.cliVersion.split('.')[0]) + 1}.0.0` },
    ]) {
      await writeFile(cliManifestPath, JSON.stringify(metadata));
      const result = await runCli({
        ...options,
        argumentsList: ['composition', '--json'],
        expectedExitCodes: [3],
      });
      assert.equal(result.stdout, '');
      assert.equal(await pathExists(sentinelPath), false);
    }
    await writeFile(cliManifestPath, cliManifestSource);
    const resolver = (await import(
      pathToFileURL(path.join(options.skillRoot, 'scripts/repository-package.mjs')).href
    )) as {
      resolveRepositoryCli: (repositoryRoot: string) => Promise<{ cliRoot: string }>;
    };
    // the real resolver establishes eligibility before this fixture damages Core
    await resolver.resolveRepositoryCli(options.clientDirectory);
    const { createRequire } = await import('node:module');
    const requireCli = createRequire(cliManifestPath);
    const coreSearchRoots = requireCli.resolve.paths('@moldea.ai/core') ?? [];
    let coreRoot: string | undefined;
    for (const searchRoot of coreSearchRoots) {
      const candidateRoot = path.join(searchRoot, '@moldea.ai/core');
      if (await pathExists(path.join(candidateRoot, 'package.json'))) {
        coreRoot = await realpath(candidateRoot);
        break;
      }
    }
    assert.ok(coreRoot);
    const coreManifestPath = path.join(coreRoot, 'package.json');
    const coreManifestSource = await readFile(coreManifestPath, 'utf8');
    try {
      const coreManifest = JSON.parse(coreManifestSource) as { version: string };
      await writeFile(coreManifestPath, JSON.stringify({ ...coreManifest, version: '0.0.0' }));
      const result = await runCli({
        ...options,
        argumentsList: ['composition', '--json'],
        expectedExitCodes: [3],
      });
      assert.equal(result.stdout, '');
      assert.equal(await pathExists(sentinelPath), false);
    } finally {
      await writeFile(coreManifestPath, coreManifestSource);
    }
  } finally {
    await writeFile(cliManifestPath, cliManifestSource);
    await writeFile(binaryPath, binarySource);
  }
};

/** Recovers a proven missing CLI binary through the real manager's targeted remove/add path. */
const verifyBrokenInstallation = async (options: {
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  manager: IConformanceEnvironment['manager'];
  managerVersion: string;
  skillRoot: string;
  targetVersion: string;
}): Promise<void> => {
  const cliRoot = await realpath(path.join(options.clientDirectory, 'node_modules/@moldea.ai/cli'));
  await rm(path.join(cliRoot, 'dist/moldea.js'));
  const rejected = await runCli({
    ...options,
    argumentsList: ['composition', '--json'],
    expectedExitCodes: [3],
  });
  assert.equal(rejected.stdout, '');
  const recoveryEnvironment = createScriptlessEnvironment(options.environment);
  await runManagerCommand(options.manager, {
    args: createRemoveArguments(options.manager, options.managerVersion),
    cwd: options.clientDirectory,
    environment: recoveryEnvironment,
  });
  // this fixture has no extraneous application packages; pruning removes only the removed CLI closure
  if (options.manager === 'pnpm') {
    await runManagerCommand(options.manager, {
      args: ['prune'],
      cwd: options.clientDirectory,
      environment: recoveryEnvironment,
    });
  }
  const reinstallArguments = createInstallArguments({
    manager: options.manager,
    managerVersion: options.managerVersion,
    packageIdentity: `@moldea.ai/cli@${options.targetVersion}`,
  });
  // some pnpm versions reuse damaged materialization even after scoped cleanup.
  if (options.manager === 'pnpm') reinstallArguments.push('--force');
  await runManagerCommand(options.manager, {
    args: reinstallArguments,
    cwd: options.clientDirectory,
    environment: recoveryEnvironment,
  });
  const repaired = await runCli({ ...options, argumentsList: ['composition', '--json'] });
  z.object({ cliVersion: z.literal(options.targetVersion), status: z.literal('valid') }).parse(
    JSON.parse(repaired.stdout) as unknown,
  );
};

/** Interrupts a real manager at the registry boundary and preserves its partial state. */
const verifyInterruptedInstallation = async (options: {
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  manager: IConformanceEnvironment['manager'];
  managerVersion: string;
  registry: ICandidateRegistry;
  targetVersion: string;
}): Promise<void> => {
  const interruptedDirectory = path.join(options.clientDirectory, 'interrupted-project');
  await mkdir(interruptedDirectory);
  await writeFile(
    path.join(interruptedDirectory, 'package.json'),
    JSON.stringify({
      name: 'moldea-interrupted-tooling-fixture',
      private: true,
      scripts: { preinstall: 'node -e "process.exit(99)"' },
    }),
  );
  const preservedPath = path.join(interruptedDirectory, 'policy.ts');
  const preservedBytes = 'export const applicationPolicy = "retain existing work";\n';
  await writeFile(preservedPath, preservedBytes);
  await configureCandidateRegistry(
    interruptedDirectory,
    options.manager,
    options.managerVersion,
    options.registry.registryUrl,
  );
  const controller = new AbortController();
  let reachedRegistry = false;
  const interrupt = (): void => {
    reachedRegistry = true;
    controller.abort();
  };
  options.registry.server.once('request', interrupt);
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const interruptedEnvironment = {
    ...options.environment,
    npm_config_cache: path.join(interruptedDirectory, '.npm-cache'),
    XDG_CACHE_HOME: path.join(interruptedDirectory, '.cache'),
  };
  try {
    await assert.rejects(
      executeProcess({
        ...createManagerCommand(
          options.manager,
          createInstallArguments({
            manager: options.manager,
            managerVersion: options.managerVersion,
            packageIdentity: `@moldea.ai/cli@${options.targetVersion}`,
          }),
          interruptedDirectory,
          interruptedEnvironment,
        ),
        cwd: interruptedDirectory,
        environment: interruptedEnvironment,
        signal: controller.signal,
      }),
      /aborted/u,
    );
    assert.equal(
      reachedRegistry,
      true,
      'The interrupted real manager must reach the candidate registry.',
    );
    assert.equal(await readFile(preservedPath, 'utf8'), preservedBytes);
    assert.equal(await pathExists(path.join(interruptedDirectory, 'moldea')), false);
    // no reinstall or rollback follows interruption; the outer fixture owns final disposal
  } finally {
    clearTimeout(timeout);
    options.registry.server.off('request', interrupt);
  }
};

/** Verifies an older real installation can be replaced without executing its CLI. */
const verifyOlderInstallation = async (options: {
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  manager: IConformanceEnvironment['manager'];
  managerVersion: string;
  registryUrl: string;
  skillRoot: string;
  targetVersion: string;
}): Promise<void> => {
  const olderDirectory = path.join(options.clientDirectory, 'older-project');
  await mkdir(olderDirectory);
  const unrelatedSource = 'export const projectPolicy = "preserve this application";\n';
  await writeFile(path.join(olderDirectory, 'policy.ts'), unrelatedSource);
  await writeFile(
    path.join(olderDirectory, 'package.json'),
    JSON.stringify({
      name: 'moldea-older-tooling-fixture',
      private: true,
      scripts: { preinstall: 'node -e "process.exit(99)"' },
      description: 'An existing application whose tooling needs recovery.',
    }),
  );
  await configureCandidateRegistry(
    olderDirectory,
    options.manager,
    options.managerVersion,
    'https://registry.npmjs.org',
  );
  // this exact historical package is installation input only, never execution evidence
  await runManagerCommand(options.manager, {
    args: createInstallArguments({
      manager: options.manager,
      managerVersion: options.managerVersion,
      packageIdentity: '@moldea.ai/cli@9.0.1',
    }),
    cwd: olderDirectory,
    environment: options.environment,
  });
  const before = JSON.parse(await readFile(path.join(olderDirectory, 'package.json'), 'utf8')) as {
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
    description: string;
  };
  assert.equal(before.devDependencies['@moldea.ai/cli'], '9.0.1');
  await configureCandidateRegistry(
    olderDirectory,
    options.manager,
    options.managerVersion,
    options.registryUrl,
  );
  // only this fixture switches registries; pnpm install recreates its registry metadata.
  if (options.manager === 'pnpm') {
    await runManagerCommand(options.manager, {
      args: ['install', '--force', '--ignore-scripts'],
      cwd: olderDirectory,
      environment: options.environment,
    });
  }
  await runManagerCommand(options.manager, {
    args: createInstallArguments({
      manager: options.manager,
      managerVersion: options.managerVersion,
      packageIdentity: `@moldea.ai/cli@${options.targetVersion}`,
    }),
    cwd: olderDirectory,
    environment: options.environment,
  });
  const after = JSON.parse(
    await readFile(path.join(olderDirectory, 'package.json'), 'utf8'),
  ) as typeof before;
  assert.equal(after.devDependencies['@moldea.ai/cli'], options.targetVersion);
  assert.deepEqual(after.scripts, before.scripts);
  assert.equal(after.description, before.description);
  assert.equal(await readFile(path.join(olderDirectory, 'policy.ts'), 'utf8'), unrelatedSource);
  const result = await runCli({
    ...options,
    clientDirectory: olderDirectory,
    argumentsList: ['composition', '--json'],
  });
  const composition = z
    .object({ cliVersion: z.literal(options.targetVersion), status: z.literal('valid') })
    .parse(JSON.parse(result.stdout) as unknown);
  assert.equal(composition.status, 'valid');
};

/** Moves a CLI declared in `dependencies` to an exact root development dependency by removal and re-add. */
const verifyDeclarationMigration = async (options: {
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  lifecycleSentinelPath: string;
  manager: IConformanceEnvironment['manager'];
  managerVersion: string;
  registryUrl: string;
  skillRoot: string;
  targetVersion: string;
}): Promise<void> => {
  const migrationDirectory = path.join(options.clientDirectory, 'migration-project');
  await mkdir(migrationDirectory);
  const unrelatedSource = 'export const projectPolicy = "keep unrelated dependencies";\n';
  await writeFile(path.join(migrationDirectory, 'policy.ts'), unrelatedSource);
  const unrelatedDeclaration = {
    [UNRELATED_DEPENDENCY_NAME]: `file:../${UNRELATED_DEPENDENCY_NAME}`,
  };
  await writeFile(
    path.join(migrationDirectory, 'package.json'),
    JSON.stringify({
      name: 'moldea-migration-fixture',
      private: true,
      scripts: { preinstall: 'node -e "process.exit(99)"' },
      dependencies: unrelatedDeclaration,
    }),
  );
  await configureCandidateRegistry(
    migrationDirectory,
    options.manager,
    options.managerVersion,
    options.registryUrl,
  );
  const packageIdentity = `@moldea.ai/cli@${options.targetVersion}`;
  // the same exact scriptless add without the development flag declares a regular dependency
  await runManagerCommand(options.manager, {
    args: createInstallArguments({
      manager: options.manager,
      managerVersion: options.managerVersion,
      packageIdentity,
    }).filter((argument) => argument !== '--save-dev' && argument !== '--dev'),
    cwd: migrationDirectory,
    environment: options.environment,
  });
  const readManifest = async () =>
    JSON.parse(await readFile(path.join(migrationDirectory, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  assert.equal((await readManifest()).dependencies?.['@moldea.ai/cli'], options.targetVersion);
  const rejected = await runCli({
    ...options,
    clientDirectory: migrationDirectory,
    argumentsList: ['composition', '--json'],
    expectedExitCodes: [3],
  });
  assert.equal(rejected.stdout, '');
  const yarnClassic = isYarnClassic(options.manager, options.managerVersion);
  const lockPath = path.join(migrationDirectory, LOCKFILE_NAMES[options.manager]);
  const lockedBefore = readUnrelatedLockEntries(await readFile(lockPath, 'utf8'), yarnClassic);
  assert.notDeepEqual(lockedBefore, []);

  const scriptlessEnvironment = createScriptlessEnvironment(options.environment);
  await runManagerCommand(options.manager, {
    args: createRemoveArguments(options.manager, options.managerVersion),
    cwd: migrationDirectory,
    environment: scriptlessEnvironment,
  });
  await runManagerCommand(options.manager, {
    args: createInstallArguments({
      manager: options.manager,
      managerVersion: options.managerVersion,
      packageIdentity,
    }),
    cwd: migrationDirectory,
    environment: scriptlessEnvironment,
  });

  const migrated = await readManifest();
  assert.deepEqual(migrated.dependencies ?? {}, unrelatedDeclaration);
  assert.deepEqual(migrated.devDependencies, { '@moldea.ai/cli': options.targetVersion });
  assert.deepEqual(
    readUnrelatedLockEntries(await readFile(lockPath, 'utf8'), yarnClassic),
    lockedBefore,
  );
  assert.equal(await readFile(path.join(migrationDirectory, 'policy.ts'), 'utf8'), unrelatedSource);
  assert.equal(await pathExists(options.lifecycleSentinelPath), false);
  const result = await runCli({
    ...options,
    clientDirectory: migrationDirectory,
    argumentsList: ['composition', '--json'],
  });
  z.object({ cliVersion: z.literal(options.targetVersion), status: z.literal('valid') }).parse(
    JSON.parse(result.stdout) as unknown,
  );
};

/** Exercises the real managed writer and adoption gate after successful tooling establishment. */
const verifyFoundationMechanics = async (options: {
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  skillRoot: string;
}): Promise<void> => {
  const readmePath = path.join(options.clientDirectory, 'README.md');
  const outside = '# Existing application\n\nKeep these project-owned bytes.\n';
  const adoption = {
    command: process.execPath,
    args: [
      path.join(options.skillRoot, 'scripts/relevance-gate.mjs'),
      '--repository',
      options.clientDirectory,
      '--adoption-only',
    ],
    cwd: options.clientDirectory,
    environment: options.environment,
  };
  assert.equal((await runCommand(adoption)).stdout, '1');
  await writeFile(readmePath, outside);
  const writer = {
    command: process.execPath,
    args: [
      path.join(options.skillRoot, 'scripts/managed-readme.mjs'),
      '--repository',
      options.clientDirectory,
    ],
    cwd: options.clientDirectory,
    environment: options.environment,
  };
  await runCommand(writer);
  const first = await readFile(readmePath, 'utf8');
  assert.ok(first.startsWith(outside));
  await runCommand(writer);
  assert.equal(await readFile(readmePath, 'utf8'), first);
  await writeFile(readmePath, '# Informational README drift\n');
  assert.equal((await runCommand(adoption)).stdout, '1');
  await writeFile(readmePath, first);
};

/** Exercises one exact candidate closure through the selected real package manager. */
export const verifyPackageManagerCandidate = async (
  input: IConformanceEnvironment,
): Promise<void> => {
  const environment = EnvironmentSchema.parse(input);
  const yarnClassic = isYarnClassic(environment.manager, environment.managerVersion);
  const skillIdentity = assertReleaseIdentity(path.dirname(path.resolve(environment.skillRoot)));
  const artifactDirectory = path.resolve(environment.artifactDirectory);
  const candidate = loadCandidateArtifacts(artifactDirectory);
  assert.equal(skillIdentity.cliVersion, candidate.cliVersion);
  const clientDirectory = await mkdtemp(
    path.join(tmpdir(), `moldea-candidate-${environment.manager}-`),
  );
  const managerHomeDirectory = path.join(clientDirectory, '.manager-home');
  const lifecycleSentinelPath = path.join(clientDirectory, 'lifecycle-ran.txt');
  const lifecycleSentinelSource =
    "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.MOLDEA_LIFECYCLE_SENTINEL, `${process.argv[2] ?? 'unknown'}\\n`);\n";
  const lifecycleDependencyDirectory = path.join(clientDirectory, UNRELATED_DEPENDENCY_NAME);
  const managerEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: managerHomeDirectory,
    npm_config_cache: path.join(managerHomeDirectory, '.npm'),
    MOLDEA_LIFECYCLE_SENTINEL: lifecycleSentinelPath,
    XDG_CACHE_HOME: path.join(managerHomeDirectory, '.cache'),
    XDG_CONFIG_HOME: path.join(managerHomeDirectory, '.config'),
    npm_config_audit: 'false',
    npm_config_fund: 'false',
  };

  let registry: ICandidateRegistry | undefined;
  try {
    registry = await createCandidateRegistry(candidate.artifacts);
    await mkdir(managerHomeDirectory, { recursive: true });
    // a local dependency whose install scripts would record any dependency lifecycle execution
    await mkdir(lifecycleDependencyDirectory);
    await writeFile(
      path.join(lifecycleDependencyDirectory, 'package.json'),
      `${JSON.stringify(
        {
          name: UNRELATED_DEPENDENCY_NAME,
          version: '1.0.0',
          scripts: {
            install: 'node lifecycle-sentinel.mjs dependency-install',
            postinstall: 'node lifecycle-sentinel.mjs dependency-postinstall',
            preinstall: 'node lifecycle-sentinel.mjs dependency-preinstall',
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      path.join(lifecycleDependencyDirectory, 'lifecycle-sentinel.mjs'),
      lifecycleSentinelSource,
      'utf8',
    );
    await writeFile(
      path.join(clientDirectory, 'package.json'),
      `${JSON.stringify(
        {
          name: 'moldea-cli-candidate-client',
          devDependencies: { [UNRELATED_DEPENDENCY_NAME]: `file:./${UNRELATED_DEPENDENCY_NAME}` },
          packageManager: `${environment.manager}@${environment.managerVersion}`,
          private: true,
          scripts: {
            install: 'node lifecycle-sentinel.mjs install',
            postinstall: 'node lifecycle-sentinel.mjs postinstall',
            preinstall: 'node lifecycle-sentinel.mjs preinstall',
          },
          // Yarn installs at a real workspace root; pnpm's root comes from pnpm-workspace.yaml
          ...(environment.manager === 'yarn' ? { workspaces: ['packages/*'] } : {}),
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    if (environment.manager === 'yarn') {
      await mkdir(path.join(clientDirectory, 'packages', 'app'), { recursive: true });
      await writeFile(
        path.join(clientDirectory, 'packages', 'app', 'package.json'),
        `${JSON.stringify({ name: 'moldea-workspace-app', private: true, version: '1.0.0' }, null, 2)}\n`,
        'utf8',
      );
    }
    await writeFile(
      path.join(clientDirectory, 'lifecycle-sentinel.mjs'),
      lifecycleSentinelSource,
      'utf8',
    );
    await configureCandidateRegistry(
      clientDirectory,
      environment.manager,
      environment.managerVersion,
      registry.registryUrl,
    );

    const versionResult = await runManagerCommand(environment.manager, {
      args: ['--version'],
      cwd: clientDirectory,
      environment: managerEnvironment,
    });
    assert.equal(versionResult.stdout, environment.managerVersion);

    if (environment.existingVitestVersion !== undefined) {
      assert.equal(environment.manager, 'pnpm');
      await runManagerCommand(environment.manager, {
        args: createInstallArguments({
          manager: environment.manager,
          managerVersion: environment.managerVersion,
          packageIdentity: `vitest@${environment.existingVitestVersion}`,
        }),
        cwd: clientDirectory,
        environment: managerEnvironment,
      });
    }

    const installation = await runManagerCommand(environment.manager, {
      args: createInstallArguments({
        manager: environment.manager,
        managerVersion: environment.managerVersion,
        packageIdentity: `@moldea.ai/cli@${candidate.cliVersion}`,
      }),
      cwd: clientDirectory,
      environment: managerEnvironment,
    });
    assert.doesNotMatch(
      `${installation.stdout}\n${installation.stderr}`,
      /(?:warn(?:ing)?[^\n]*(?:peer|vitest)|(?:unmet|missing|conflicting)[^\n]*peer)/iu,
    );
    assert.equal(await pathExists(lifecycleSentinelPath), false);
    // the dependency was installed, so its scripts had the chance to run
    assert.equal(
      await pathExists(
        path.join(
          clientDirectory,
          'node_modules/moldea-lifecycle-dependency/lifecycle-sentinel.mjs',
        ),
      ),
      true,
    );

    const clientManifest = JSON.parse(
      await readFile(path.join(clientDirectory, 'package.json'), 'utf8'),
    ) as { devDependencies?: Record<string, string> };
    assert.equal(clientManifest.devDependencies?.['@moldea.ai/cli'], candidate.cliVersion);
    assert.equal(clientManifest.devDependencies?.['vitest'], environment.existingVitestVersion);

    await seedConformanceProject(clientDirectory);
    await verifyFoundationMechanics({
      clientDirectory,
      environment: managerEnvironment,
      skillRoot: environment.skillRoot,
    });
    await runCommand({ command: 'git', args: ['init', '--quiet'], cwd: clientDirectory });
    await runCommand({
      command: 'git',
      args: ['add', '--', 'README.md', 'moldea', 'src'],
      cwd: clientDirectory,
    });
    await verifyIneligibleMetadata({
      clientDirectory,
      environment: managerEnvironment,
      skillRoot: environment.skillRoot,
      cliVersion: candidate.cliVersion,
    });
    const lockName = LOCKFILE_NAMES[environment.manager];
    const preservedPaths = [
      'package.json',
      lockName,
      'src/custom-agent.ts',
      'moldea/moldea.yaml',
      'README.md',
    ];
    const before = new Map(
      await Promise.all(
        preservedPaths.map(
          async (relativePath) =>
            [relativePath, await readFile(path.join(clientDirectory, relativePath))] as const,
        ),
      ),
    );

    for (const command of ['composition', 'validate', 'inspect'] as const) {
      const execution = await runCli({
        argumentsList:
          command === 'composition'
            ? [command, '--json']
            : [command, '--json', '--max-output-bytes', '65536'],
        clientDirectory,
        environment: managerEnvironment,
        skillRoot: environment.skillRoot,
      });
      assert.equal(execution.stderr, '');
      assert.equal(execution.stdout.includes(`${String.fromCharCode(27)}[`), false);
      const envelope = z
        .looseObject({
          cliVersion: z.literal(candidate.cliVersion),
          schemaVersion: z.literal(skillIdentity.cliJsonSchemaVersion),
          command: z.literal(command),
          status: z.literal('valid'),
        })
        .parse(JSON.parse(execution.stdout) as unknown);
      assert.equal(envelope.command, command);
    }
    for (const [relativePath, bytes] of before) {
      assert.deepEqual(await readFile(path.join(clientDirectory, relativePath)), bytes);
    }
    assert.equal(await pathExists(lifecycleSentinelPath), false);
    await verifyBrokenInstallation({
      clientDirectory,
      environment: managerEnvironment,
      manager: environment.manager,
      managerVersion: environment.managerVersion,
      skillRoot: environment.skillRoot,
      targetVersion: candidate.cliVersion,
    });
    const repairedManifest = JSON.parse(
      await readFile(path.join(clientDirectory, 'package.json'), 'utf8'),
    ) as { devDependencies?: Record<string, string> };
    assert.deepEqual(repairedManifest.devDependencies, clientManifest.devDependencies);
    const lockedAfterRecovery = await readFile(path.join(clientDirectory, lockName));
    // Yarn Classic's lockfile is not YAML, so its exact bytes stand in for the locked graph
    assert.deepEqual(
      yarnClassic ? lockedAfterRecovery : readLockedGraph(lockedAfterRecovery.toString('utf8')),
      yarnClassic ? before.get(lockName) : readLockedGraph(before.get(lockName)!.toString('utf8')),
      'Same-target recovery must preserve the complete locked dependency graph.',
    );
    if (environment.existingVitestVersion !== undefined) {
      const installedVitest = JSON.parse(
        await readFile(path.join(clientDirectory, 'node_modules/vitest/package.json'), 'utf8'),
      ) as { version: string };
      assert.equal(installedVitest.version, environment.existingVitestVersion);
    }
    assert.equal(await pathExists(lifecycleSentinelPath), false);
    for (const relativePath of ['src/custom-agent.ts', 'moldea/moldea.yaml', 'README.md']) {
      assert.deepEqual(
        await readFile(path.join(clientDirectory, relativePath)),
        before.get(relativePath),
      );
    }
    await verifyInterruptedInstallation({
      clientDirectory,
      environment: managerEnvironment,
      manager: environment.manager,
      managerVersion: environment.managerVersion,
      registry,
      targetVersion: candidate.cliVersion,
    });
    await verifyOlderInstallation({
      clientDirectory,
      environment: managerEnvironment,
      manager: environment.manager,
      managerVersion: environment.managerVersion,
      registryUrl: registry.registryUrl,
      skillRoot: environment.skillRoot,
      targetVersion: candidate.cliVersion,
    });
    await verifyDeclarationMigration({
      clientDirectory,
      environment: managerEnvironment,
      lifecycleSentinelPath,
      manager: environment.manager,
      managerVersion: environment.managerVersion,
      registryUrl: registry.registryUrl,
      skillRoot: environment.skillRoot,
      targetVersion: candidate.cliVersion,
    });
  } finally {
    try {
      const server = registry?.server;
      if (server !== undefined) {
        await new Promise<void>((resolvePromise, rejectPromise) => {
          server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
          server.closeIdleConnections();
        });
      }
    } finally {
      await rm(clientDirectory, { force: true, recursive: true });
    }
  }
};

const run = async (): Promise<void> => {
  if (process.argv.length !== 2) {
    throw new Error('Usage: package-manager-conformance.ts');
  }
  await verifyPackageManagerCandidate(readConformanceEnvironment());
  process.stdout.write('Package-manager candidate conformance passed.\n');
};

if (isMainModule(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
