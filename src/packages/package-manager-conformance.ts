import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { z } from 'zod';

import {
  parseRuntimeCompatibilityPublication,
  RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME,
} from '../compatibility/index.ts';
import { executeProcess } from '../process/index.ts';
import { createCandidateRegistry, loadCandidateArtifacts } from './artifacts.ts';

const EnvironmentSchema = z.strictObject({
  artifactDirectory: z.string().trim().min(1),
  existingVitestVersion: z.string().trim().min(1).optional(),
  manager: z.enum(['npm', 'pnpm', 'yarn']),
  managerVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
});

type IConformanceEnvironment = z.infer<typeof EnvironmentSchema>;

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

/** Reads the exact package-manager matrix selection supplied by release-candidate CI. */
const readConformanceEnvironment = (): IConformanceEnvironment =>
  EnvironmentSchema.parse({
    artifactDirectory: process.env['MOLDEA_CLI_ARTIFACT_DIRECTORY'],
    existingVitestVersion: process.env['MOLDEA_TEST_EXISTING_VITEST_VERSION'] || undefined,
    manager: process.env['MOLDEA_TEST_MANAGER'],
    managerVersion: process.env['MOLDEA_TEST_MANAGER_VERSION'],
  });

/** Returns the package-manager executable installed by the workflow matrix. */
const getManagerExecutable = (manager: IConformanceEnvironment['manager']): string =>
  process.platform === 'win32' ? `${manager}.cmd` : manager;

/** Runs one bounded shell-free command and returns trimmed standard output. */
const runCommand = async (options: {
  args: readonly string[];
  command: string;
  cwd: string;
  environment?: NodeJS.ProcessEnv;
}): Promise<{ stderr: string; stdout: string }> => {
  const result = await executeProcess(options);
  return { stderr: result.stderr, stdout: result.stdout.trim() };
};

/** Writes manager-specific local registry configuration without changing global state. */
const configureCandidateRegistry = async (
  clientDirectory: string,
  manager: IConformanceEnvironment['manager'],
  registryUrl: string,
): Promise<void> => {
  if (manager === 'yarn') {
    await writeFile(
      path.join(clientDirectory, '.yarnrc.yml'),
      `enableGlobalCache: false\nnpmScopes:\n  moldea.ai:\n    npmRegistryServer: "${registryUrl}"\nunsafeHttpWhitelist:\n  - 127.0.0.1\n`,
      'utf8',
    );
    return;
  }

  await writeFile(
    path.join(clientDirectory, '.npmrc'),
    `@moldea.ai:registry=${registryUrl}/\n`,
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
  return ['add', '--dev', '--exact', '--mode=skip-build', options.packageIdentity];
};

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

/** Executes the installed CLI without relying on a shell or global CLI resolution. */
const runCli = async (options: {
  argumentsList: readonly string[];
  clientDirectory: string;
  environment: NodeJS.ProcessEnv;
  manager: IConformanceEnvironment['manager'];
}): Promise<{ stderr: string; stdout: string }> => {
  if (options.manager === 'yarn') {
    return runCommand({
      args: ['exec', 'moldea', ...options.argumentsList],
      command: getManagerExecutable(options.manager),
      cwd: options.clientDirectory,
      environment: options.environment,
    });
  }
  return runCommand({
    args: options.argumentsList,
    command: path.join(
      options.clientDirectory,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'moldea.cmd' : 'moldea',
    ),
    cwd: options.clientDirectory,
    environment: options.environment,
  });
};

/** Exercises one exact candidate closure through the selected real package manager. */
export const verifyPackageManagerCandidate = async (
  input: IConformanceEnvironment,
): Promise<void> => {
  const environment = EnvironmentSchema.parse(input);
  const artifactDirectory = path.resolve(environment.artifactDirectory);
  parseRuntimeCompatibilityPublication(
    await readFile(
      path.join(artifactDirectory, RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME),
      'utf8',
    ),
  );
  const candidate = loadCandidateArtifacts(artifactDirectory);
  const registry = await createCandidateRegistry(candidate.artifacts);
  const clientDirectory = await mkdtemp(
    path.join(tmpdir(), `moldea-candidate-${environment.manager}-`),
  );
  const managerHomeDirectory = path.join(clientDirectory, '.manager-home');
  const lifecycleSentinelPath = path.join(clientDirectory, 'lifecycle-ran.txt');
  const executable = getManagerExecutable(environment.manager);
  const managerEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: managerHomeDirectory,
    MOLDEA_LIFECYCLE_SENTINEL: lifecycleSentinelPath,
    XDG_CACHE_HOME: path.join(managerHomeDirectory, '.cache'),
    XDG_CONFIG_HOME: path.join(managerHomeDirectory, '.config'),
    npm_config_audit: 'false',
    npm_config_fund: 'false',
  };

  try {
    await mkdir(managerHomeDirectory, { recursive: true });
    await writeFile(
      path.join(clientDirectory, 'package.json'),
      `${JSON.stringify(
        {
          name: 'moldea-cli-candidate-client',
          packageManager: `${environment.manager}@${environment.managerVersion}`,
          private: true,
          scripts: {
            install: 'node lifecycle-sentinel.mjs install',
            postinstall: 'node lifecycle-sentinel.mjs postinstall',
            preinstall: 'node lifecycle-sentinel.mjs preinstall',
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      path.join(clientDirectory, 'lifecycle-sentinel.mjs'),
      "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.MOLDEA_LIFECYCLE_SENTINEL, `${process.argv[2] ?? 'unknown'}\\n`);\n",
      'utf8',
    );
    await configureCandidateRegistry(clientDirectory, environment.manager, registry.registryUrl);

    const versionResult = await runCommand({
      args: ['--version'],
      command: executable,
      cwd: clientDirectory,
      environment: managerEnvironment,
    });
    assert.equal(versionResult.stdout, environment.managerVersion);

    if (environment.existingVitestVersion !== undefined) {
      assert.equal(environment.manager, 'pnpm');
      await runCommand({
        args: createInstallArguments({
          manager: environment.manager,
          packageIdentity: `vitest@${environment.existingVitestVersion}`,
        }),
        command: executable,
        cwd: clientDirectory,
        environment: managerEnvironment,
      });
    }

    const installation = await runCommand({
      args: createInstallArguments({
        manager: environment.manager,
        packageIdentity: `@moldea.ai/cli@${candidate.cliVersion}`,
      }),
      command: executable,
      cwd: clientDirectory,
      environment: managerEnvironment,
    });
    assert.doesNotMatch(
      `${installation.stdout}\n${installation.stderr}`,
      /(?:warn(?:ing)?[^\n]*(?:peer|vitest)|(?:unmet|missing|conflicting)[^\n]*peer)/iu,
    );
    assert.equal(await pathExists(lifecycleSentinelPath), false);

    const clientManifest = JSON.parse(
      await readFile(path.join(clientDirectory, 'package.json'), 'utf8'),
    ) as { devDependencies?: Record<string, string> };
    assert.equal(clientManifest.devDependencies?.['@moldea.ai/cli'], candidate.cliVersion);
    assert.equal(clientManifest.devDependencies?.['vitest'], environment.existingVitestVersion);

    await seedConformanceProject(clientDirectory);
    const version = await runCli({
      argumentsList: ['--version'],
      clientDirectory,
      environment: managerEnvironment,
      manager: environment.manager,
    });
    assert.equal(version.stdout, candidate.cliVersion);

    for (const command of ['composition', 'validate', 'inspect'] as const) {
      const execution = await runCli({
        argumentsList: [command, '--json'],
        clientDirectory,
        environment: managerEnvironment,
        manager: environment.manager,
      });
      assert.equal(execution.stderr, '');
      assert.equal(execution.stdout.includes(`${String.fromCharCode(27)}[`), false);
      const envelope = z
        .looseObject({
          cliVersion: z.literal(candidate.cliVersion),
          command: z.literal(command),
          status: z.literal('valid'),
        })
        .parse(JSON.parse(execution.stdout) as unknown);
      assert.equal(envelope.command, command);
    }
  } finally {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      registry.server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
    });
    await rm(clientDirectory, { force: true, recursive: true });
  }
};

const run = async (): Promise<void> => {
  if (process.argv.length !== 2) {
    throw new Error('Usage: package-manager-conformance.ts');
  }
  await verifyPackageManagerCandidate(readConformanceEnvironment());
  process.stdout.write('Package-manager candidate conformance passed.\n');
};

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
