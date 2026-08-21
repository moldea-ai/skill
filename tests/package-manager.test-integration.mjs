import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  createCandidateRegistry,
  loadCandidateArtifacts,
} from '../tooling/package-candidate/index.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIFECYCLE_FIXTURE_PATH = join(REPOSITORY_ROOT, 'fixtures', 'tooling', 'lifecycle-cli');
const LIFECYCLE_FIXTURE_MANIFEST = JSON.parse(
  readFileSync(join(LIFECYCLE_FIXTURE_PATH, 'package.json'), 'utf8'),
);
const ROOT_PACKAGE_MANIFEST = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
);
const MANAGER = process.env.MOLDEA_TEST_MANAGER ?? 'npm';
const EXPECTED_MANAGER_VERSION = process.env.MOLDEA_TEST_MANAGER_VERSION;
const PUBLISHED_CLI_VERSION = ROOT_PACKAGE_MANIFEST.devDependencies['@moldea.ai/cli'];
const EXECUTABLE = process.platform === 'win32' ? `${MANAGER}.cmd` : MANAGER;
const CANDIDATE_ARTIFACT_DIRECTORY = process.env.MOLDEA_CLI_ARTIFACT_DIRECTORY;
const REQUIRE_CANDIDATE_ARTIFACTS = process.env.MOLDEA_REQUIRE_REAL_CLI_ARTIFACTS === '1';
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

const parseVersion = (version) => {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  assert.ok(match, `Expected a stable semantic version, received ${version}.`);
  return match.slice(1).map(Number);
};

const isSupportedVersion = (manager, version) => {
  const [major, minor] = parseVersion(version);
  if (manager === 'npm') return (major === 10 && minor >= 9) || major === 11;
  if (manager === 'pnpm') return major === 11 && minor >= 20;
  if (manager === 'yarn') return major === 4;
  return false;
};

/** Returns whether the selected Yarn version supports its command-scoped age-gate override. */
const supportsYarnNoTimeGate = (version) => {
  const [major, minor] = parseVersion(version);
  return major > 4 || (major === 4 && minor >= 12);
};

const runSync = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });

  assert.equal(
    result.status,
    0,
    [`${command} ${args.join(' ')} failed.`, result.stdout, result.stderr].join('\n'),
  );
  return result.stdout.trim();
};

const runDetailed = (command, args, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', rejectPromise);
    child.on('close', (status) => {
      if (status === 0) {
        resolvePromise({ stderr, stdout });
      } else {
        rejectPromise(
          new Error(
            [
              `${command} ${args.join(' ')} failed in ${options.cwd ?? process.cwd()}.`,
              stdout,
              stderr,
            ].join('\n'),
          ),
        );
      }
    });
  });

const run = async (command, args, options = {}) =>
  (await runDetailed(command, args, options)).stdout.trim();

/** Confirms the selected package manager is one of the supported exact CI versions. */
const readPackageManagerVersion = () => {
  const actualVersion = runSync(EXECUTABLE, ['--version']);
  assert.ok(isSupportedVersion(MANAGER, actualVersion));
  if (EXPECTED_MANAGER_VERSION) assert.equal(actualVersion, EXPECTED_MANAGER_VERSION);
  return actualVersion;
};

/** Returns whether a candidate path remains inside its expected parent path. */
const isPathWithin = (parentPath, candidatePath) => {
  const relativePath = relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
};

/** Locates the package manifest that owns one resolved executable. */
const findOwningPackage = (binaryPath, expectedPackageName) => {
  const resolvedBinaryPath = realpathSync(binaryPath);
  let currentPath = dirname(resolvedBinaryPath);

  while (true) {
    const manifestPath = join(currentPath, 'package.json');
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (manifest.name === expectedPackageName) {
        return { manifest, packageRoot: currentPath };
      }
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) break;
    currentPath = parentPath;
  }

  throw new Error(`${binaryPath} is not owned by ${expectedPackageName}.`);
};

/** Loads a direct dependency from a node_modules installation without following its bin wrapper. */
const loadInstalledNodeModulesPackage = (clientDirectory, expectedPackageName) => {
  const packageRoot = realpathSync(
    join(clientDirectory, 'node_modules', ...expectedPackageName.split('/')),
  );
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));

  assert.equal(manifest.name, expectedPackageName);
  return { manifest, packageRoot };
};

/** Writes manager-specific scoped-registry configuration without changing global state. */
const configureScopedRegistry = (clientDirectory, registryUrl) => {
  if (MANAGER === 'npm') {
    writeFileSync(join(clientDirectory, '.npmrc'), `@moldea.ai:registry=${registryUrl}/\n`);
    return;
  }

  if (MANAGER === 'pnpm') {
    writeFileSync(join(clientDirectory, '.npmrc'), `@moldea.ai:registry=${registryUrl}/\n`);
    writeFileSync(join(clientDirectory, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
    return;
  }

  assert.equal(MANAGER, 'yarn');
  const unsafeHttpConfiguration = registryUrl.startsWith('http://')
    ? 'unsafeHttpWhitelist:\n  - 127.0.0.1\n'
    : '';
  writeFileSync(
    join(clientDirectory, '.yarnrc.yml'),
    `enableGlobalCache: false\nnpmScopes:\n  moldea.ai:\n    npmRegistryServer: "${registryUrl}"\n${unsafeHttpConfiguration}`,
  );
};

/** Builds the lifecycle-safe exact installation arguments for the selected package manager. */
const createInstallArguments = (cliVersion, managerVersion) => {
  if (MANAGER === 'npm') {
    return [
      'install',
      '--save-dev',
      '--save-exact',
      '--ignore-scripts',
      `@moldea.ai/cli@${cliVersion}`,
    ];
  }

  if (MANAGER === 'pnpm') {
    return [
      'add',
      '--workspace-root',
      '--save-dev',
      '--save-exact',
      '--ignore-scripts',
      `@moldea.ai/cli@${cliVersion}`,
    ];
  }

  assert.equal(MANAGER, 'yarn');
  const timeGateArguments = supportsYarnNoTimeGate(managerVersion) ? ['--no-time-gate'] : [];
  return [
    'add',
    '--dev',
    '--exact',
    '--mode=skip-build',
    ...timeGateArguments,
    `@moldea.ai/cli@${cliVersion}`,
  ];
};

/** Serves the hostile lifecycle fixture as exact scoped package metadata. */
const createLifecycleRegistry = async (archive, archiveName) => {
  let registryUrl;
  const packageName = LIFECYCLE_FIXTURE_MANIFEST.name;
  const packageVersion = LIFECYCLE_FIXTURE_MANIFEST.version;
  const archivePath = `/${packageName}/-/${archiveName}`;
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, registryUrl).pathname);
    if (pathname === `/${packageName}`) {
      const publishedAt = '2025-01-01T00:00:00.000Z';
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          name: packageName,
          'dist-tags': { latest: packageVersion },
          time: {
            created: publishedAt,
            modified: publishedAt,
            [packageVersion]: publishedAt,
          },
          versions: {
            [packageVersion]: {
              ...LIFECYCLE_FIXTURE_MANIFEST,
              dist: {
                integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}`,
                shasum: createHash('sha1').update(archive).digest('hex'),
                tarball: `${registryUrl}${archivePath}`,
              },
            },
          },
        }),
      );
      return;
    }
    if (pathname === archivePath) {
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.end(archive);
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  registryUrl = `http://127.0.0.1:${address.port}`;
  return { registryUrl, server };
};

/** Creates the custom-runtime repository and optional OpenAI adapter evidence. */
const seedConformanceProject = (clientDirectory, { includeOpenAi }) => {
  mkdirSync(join(clientDirectory, 'moldea', 'agents', 'custom-agent'), { recursive: true });
  mkdirSync(join(clientDirectory, 'moldea', 'runtimes'), { recursive: true });
  mkdirSync(join(clientDirectory, 'src'), { recursive: true });
  writeFileSync(
    join(clientDirectory, 'moldea', 'moldea.yaml'),
    `version: 1\nagents:\n  custom-agent:\n    runtime:\n      id: custom\n      guidance: /moldea/runtimes/custom.md\n    bindings:\n      runtimeAgent:\n        path: /src/custom-agent.ts\n        symbol: customAgent\n    affectedBy:\n      - /src/**\n${
      includeOpenAi
        ? '  openai-agent:\n    runtime:\n      id: openai\n    bindings:\n      runtimeAgent:\n        path: /src/openai-agent.ts\n        symbol: openAiAgent\n'
        : ''
    }`,
  );
  writeFileSync(join(clientDirectory, 'moldea', 'project.md'), '# CLI conformance project\n');
  writeFileSync(
    join(clientDirectory, 'moldea', 'agents', 'custom-agent', 'description.md'),
    'A custom conformance agent.\n',
  );
  writeFileSync(
    join(clientDirectory, 'moldea', 'agents', 'custom-agent', 'instruction.md'),
    'You are the `custom-agent` agent.\n',
  );
  writeFileSync(
    join(clientDirectory, 'moldea', 'runtimes', 'custom.md'),
    'Use the project-local custom runtime.\n',
  );
  writeFileSync(
    join(clientDirectory, 'src', 'custom-agent.ts'),
    'export const customAgent = {};\n',
  );

  if (includeOpenAi) {
    mkdirSync(join(clientDirectory, 'moldea', 'agents', 'openai-agent'), {
      recursive: true,
    });
    writeFileSync(
      join(clientDirectory, 'moldea', 'agents', 'openai-agent', 'description.md'),
      'An OpenAI Responses API conformance agent.\n',
    );
    writeFileSync(
      join(clientDirectory, 'moldea', 'agents', 'openai-agent', 'instruction.md'),
      'You are the `openai-agent` agent.\n',
    );
    writeFileSync(
      join(clientDirectory, 'src', 'openai-agent.ts'),
      "import OpenAI from 'openai';\nconst client = new OpenAI();\nexport const openAiAgent = () => client.responses.create({ input: 'hello' });\n",
    );
    const clientManifestPath = join(clientDirectory, 'package.json');
    const clientManifest = JSON.parse(readFileSync(clientManifestPath, 'utf8'));
    clientManifest.dependencies = { openai: '7.4.0' };
    writeFileSync(clientManifestPath, `${JSON.stringify(clientManifest, null, 2)}\n`);
  }
};

/** Installs and exercises one real published or packed CLI dependency closure. */
const exerciseRealCli = async ({ cliVersion, registryUrl, sourceLabel }) => {
  parseVersion(cliVersion);
  const actualManagerVersion = readPackageManagerVersion();
  const clientDirectory = mkdtempSync(join(tmpdir(), `moldea-${sourceLabel}-${MANAGER}-`));
  const lifecycleSentinelPath = join(clientDirectory, 'lifecycle-ran.txt');
  const managerHomeDirectory = join(clientDirectory, '.manager-home');
  const gitHooksDirectory = join(clientDirectory, '.git-hooks');
  const managerEnvironment = {
    ...process.env,
    HOME: managerHomeDirectory,
    MOLDEA_LIFECYCLE_SENTINEL: lifecycleSentinelPath,
    XDG_CACHE_HOME: join(managerHomeDirectory, '.cache'),
    XDG_CONFIG_HOME: join(managerHomeDirectory, '.config'),
    npm_config_audit: 'false',
    npm_config_fund: 'false',
  };

  mkdirSync(managerHomeDirectory, { recursive: true });
  mkdirSync(gitHooksDirectory, { recursive: true });
  writeFileSync(
    join(clientDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: `moldea-cli-${sourceLabel}-client`,
        private: true,
        packageManager: `${MANAGER}@${actualManagerVersion}`,
        scripts: {
          preinstall: 'node lifecycle-sentinel.mjs root-preinstall',
          install: 'node lifecycle-sentinel.mjs root-install',
          postinstall: 'node lifecycle-sentinel.mjs root-postinstall',
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(clientDirectory, 'lifecycle-sentinel.mjs'),
    "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.MOLDEA_LIFECYCLE_SENTINEL, (process.argv[2] ?? 'unknown') + '\\n');\n",
  );
  configureScopedRegistry(clientDirectory, registryUrl);

  try {
    await run(EXECUTABLE, createInstallArguments(cliVersion, actualManagerVersion), {
      cwd: clientDirectory,
      env: managerEnvironment,
    });
    assert.equal(existsSync(lifecycleSentinelPath), false);
    const installedManifest = JSON.parse(
      readFileSync(join(clientDirectory, 'package.json'), 'utf8'),
    );
    assert.equal(installedManifest.devDependencies['@moldea.ai/cli'], cliVersion);
    let binaryPath;

    if (MANAGER === 'yarn') {
      binaryPath = await run(EXECUTABLE, ['bin', 'moldea'], {
        cwd: clientDirectory,
        env: managerEnvironment,
      });
      assert.ok(isPathWithin(clientDirectory, binaryPath));
      assert.match(binaryPath, /[\\/]\.yarn[\\/]unplugged[\\/]/);
    } else {
      const binaryName = process.platform === 'win32' ? 'moldea.cmd' : 'moldea';
      binaryPath = join(clientDirectory, 'node_modules', '.bin', binaryName);
      assert.equal(existsSync(binaryPath), true);
    }

    const cliPackage =
      MANAGER === 'yarn'
        ? findOwningPackage(binaryPath, '@moldea.ai/cli')
        : loadInstalledNodeModulesPackage(clientDirectory, '@moldea.ai/cli');
    const hasOpenAiAdapter =
      cliPackage.manifest.dependencies?.['@moldea.ai/adapter-openai'] !== undefined;

    seedConformanceProject(clientDirectory, { includeOpenAi: hasOpenAiAdapter });
    writeFileSync(
      join(clientDirectory, '.gitignore'),
      '.git-hooks/\n.manager-home/\n.pnp.*\n.yarn/\nlifecycle-ran.txt\nnode_modules/\n',
    );
    const gitEnvironment = {
      ...managerEnvironment,
      GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_TERMINAL_PROMPT: '0',
    };

    runSync('git', ['init', '--quiet'], { cwd: clientDirectory, env: gitEnvironment });
    runSync('git', ['-c', `core.hooksPath=${gitHooksDirectory}`, 'add', '--', '.'], {
      cwd: clientDirectory,
      env: gitEnvironment,
    });
    const statusBefore = runSync('git', ['status', '--porcelain=v2', '-z'], {
      cwd: clientDirectory,
      env: gitEnvironment,
    });
    let versionOutput;
    let compatibilityExecution;
    let inspectionExecution;

    if (MANAGER === 'yarn') {
      versionOutput = await run(EXECUTABLE, ['exec', 'moldea', '--version'], {
        cwd: clientDirectory,
        env: managerEnvironment,
      });
      compatibilityExecution = await runDetailed(
        EXECUTABLE,
        ['exec', 'moldea', 'compatibility', '--json'],
        { cwd: clientDirectory, env: managerEnvironment },
      );
      inspectionExecution = await runDetailed(EXECUTABLE, ['exec', 'moldea', 'inspect', '--json'], {
        cwd: clientDirectory,
        env: managerEnvironment,
      });
    } else {
      versionOutput = await run(binaryPath, ['--version'], {
        cwd: clientDirectory,
        env: managerEnvironment,
      });
      compatibilityExecution = await runDetailed(binaryPath, ['compatibility', '--json'], {
        cwd: clientDirectory,
        env: managerEnvironment,
      });
      inspectionExecution = await runDetailed(binaryPath, ['inspect', '--json'], {
        cwd: clientDirectory,
        env: managerEnvironment,
      });
    }

    assert.ok(isPathWithin(clientDirectory, cliPackage.packageRoot));
    assert.equal(cliPackage.manifest.version, cliVersion);
    assert.equal(versionOutput, cliVersion);
    assert.equal(compatibilityExecution.stderr, '');
    assert.equal(inspectionExecution.stderr, '');
    assert.equal(
      `${compatibilityExecution.stdout}${inspectionExecution.stdout}`.includes('\u001b['),
      false,
    );

    const compatibilityEnvelope = JSON.parse(compatibilityExecution.stdout);
    const inspectionEnvelope = JSON.parse(inspectionExecution.stdout);
    const expectedPackages = Object.entries(cliPackage.manifest.dependencies ?? {})
      .filter(([packageName]) => packageName.startsWith('@moldea.ai/'))
      .map(([name, version]) => ({ name, version }))
      .sort(({ name: left }, { name: right }) => left.localeCompare(right));
    const customAdapter = compatibilityEnvelope.result.adapters.find(({ id }) => id === 'custom');
    const anthropicAdapter = compatibilityEnvelope.result.adapters.find(
      ({ id }) => id === 'anthropic',
    );
    const googleGenAiAdapter = compatibilityEnvelope.result.adapters.find(
      ({ id }) => id === 'google-genai',
    );
    const openAiAdapter = compatibilityEnvelope.result.adapters.find(({ id }) => id === 'openai');

    assert.equal(compatibilityEnvelope.cliVersion, cliVersion);
    assert.equal(compatibilityEnvelope.command, 'compatibility');
    assert.equal(compatibilityEnvelope.schemaVersion, 1);
    assert.equal(compatibilityEnvelope.status, 'valid');
    assert.deepEqual(compatibilityEnvelope.result.packages, expectedPackages);
    assert.equal(customAdapter.active, true);
    assert.equal(customAdapter.bundledVersion, cliPackage.manifest.dependencies['@moldea.ai/core']);
    assert.equal(customAdapter.matrix.implementationStatus, 'available');
    assert.equal(customAdapter.matrix.compatibleCoreRange, '^2.0.0');
    assert.deepEqual(customAdapter.matrix.supportedRepositoryFormatVersions, [1]);
    assert.equal(customAdapter.matrix.runtimeGuidance.expectation, 'required');
    assert.equal(customAdapter.matrix.targets[0].id, 'custom');
    assert.deepEqual(customAdapter.matrix.targets[0].patterns, [
      {
        description:
          'Universal Core validation of explicit repository relationships without runtime-specific inference.',
        id: 'explicit-repository-relationships',
        kind: 'runtime',
        support: 'full',
      },
    ]);
    assert.equal(anthropicAdapter.active, true);
    assert.equal(
      anthropicAdapter.bundledVersion,
      cliPackage.manifest.dependencies['@moldea.ai/adapter-anthropic'],
    );
    assert.equal(googleGenAiAdapter.active, true);
    assert.equal(
      googleGenAiAdapter.bundledVersion,
      cliPackage.manifest.dependencies['@moldea.ai/adapter-google-genai'],
    );
    assert.equal(openAiAdapter.active, hasOpenAiAdapter);
    assert.equal(
      openAiAdapter.bundledVersion,
      hasOpenAiAdapter ? cliPackage.manifest.dependencies['@moldea.ai/adapter-openai'] : null,
    );
    assert.equal(inspectionEnvelope.cliVersion, cliVersion);
    assert.equal(inspectionEnvelope.command, 'inspect');
    assert.equal(inspectionEnvelope.schemaVersion, 1);
    assert.equal(inspectionEnvelope.status, 'valid');
    assert.equal(inspectionEnvelope.result.inspection.valid, true);
    assert.deepEqual(inspectionEnvelope.result.inspection.diagnostics, []);
    if (hasOpenAiAdapter) {
      assert.deepEqual(
        inspectionEnvelope.result.inspection.evidence.map(({ kind }) => kind),
        ['language', 'runtime-package', 'runtime-pattern'],
      );
    } else {
      assert.deepEqual(inspectionEnvelope.result.inspection.evidence, []);
    }
    assert.deepEqual(inspectionEnvelope.result.inspection.project.agents[0].declaration, {
      affectedBy: ['/src/**'],
      bindings: {
        runtimeAgent: { path: '/src/custom-agent.ts', symbol: 'customAgent' },
      },
      runtime: { guidance: '/moldea/runtimes/custom.md', id: 'custom' },
    });
    assert.deepEqual(
      inspectionEnvelope.result.inspection.project.runtimes.map(({ asset }) => asset.path),
      ['/moldea/runtimes/custom.md'],
    );
    assert.equal(
      runSync('git', ['status', '--porcelain=v2', '-z'], {
        cwd: clientDirectory,
        env: gitEnvironment,
      }),
      statusBefore,
    );
  } finally {
    rmSync(clientDirectory, { force: true, recursive: true });
  }
};

test('supported package-manager command exact-pins the CLI and suppresses lifecycle scripts', async () => {
  const actualManagerVersion = readPackageManagerVersion();
  const clientDirectory = mkdtempSync(join(tmpdir(), `moldea-lifecycle-${MANAGER}-`));
  const packDirectory = mkdtempSync(join(tmpdir(), 'moldea-cli-pack-'));
  const sentinelPath = join(clientDirectory, 'lifecycle-ran.txt');
  const managerHomeDirectory = join(clientDirectory, '.manager-home');
  const archiveName = runSync('npm', [
    'pack',
    '--ignore-scripts',
    '--pack-destination',
    packDirectory,
    LIFECYCLE_FIXTURE_PATH,
  ])
    .split('\n')
    .at(-1);
  const archive = readFileSync(join(packDirectory, archiveName));
  const { registryUrl, server } = await createLifecycleRegistry(archive, archiveName);
  const managerEnvironment = {
    ...process.env,
    HOME: managerHomeDirectory,
    MOLDEA_LIFECYCLE_SENTINEL: sentinelPath,
    XDG_CACHE_HOME: join(managerHomeDirectory, '.cache'),
    XDG_CONFIG_HOME: join(managerHomeDirectory, '.config'),
    npm_config_audit: 'false',
    npm_config_fund: 'false',
  };

  mkdirSync(managerHomeDirectory, { recursive: true });
  writeFileSync(
    join(clientDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'moldea-tooling-test-client',
        private: true,
        packageManager: `${MANAGER}@${actualManagerVersion}`,
        scripts: {
          preinstall: 'node lifecycle-sentinel.mjs root-preinstall',
          install: 'node lifecycle-sentinel.mjs root-install',
          postinstall: 'node lifecycle-sentinel.mjs root-postinstall',
        },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(clientDirectory, 'lifecycle-sentinel.mjs'),
    "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.MOLDEA_LIFECYCLE_SENTINEL, (process.argv[2] ?? 'unknown') + '\\n');\n",
  );
  configureScopedRegistry(clientDirectory, registryUrl);

  try {
    await run(
      EXECUTABLE,
      createInstallArguments(LIFECYCLE_FIXTURE_MANIFEST.version, actualManagerVersion),
      {
        cwd: clientDirectory,
        env: managerEnvironment,
      },
    );

    assert.equal(existsSync(sentinelPath), false);
    const installedManifest = JSON.parse(
      readFileSync(join(clientDirectory, 'package.json'), 'utf8'),
    );
    assert.equal(
      installedManifest.devDependencies['@moldea.ai/cli'],
      LIFECYCLE_FIXTURE_MANIFEST.version,
    );

    if (MANAGER === 'yarn') {
      assert.ok(
        (
          await run(EXECUTABLE, ['bin', 'moldea'], {
            cwd: clientDirectory,
            env: managerEnvironment,
          })
        ).length > 0,
      );
      assert.equal(
        await run(EXECUTABLE, ['exec', 'moldea', '--version'], {
          cwd: clientDirectory,
          env: managerEnvironment,
        }),
        LIFECYCLE_FIXTURE_MANIFEST.version,
      );
    } else {
      const binaryName = process.platform === 'win32' ? 'moldea.cmd' : 'moldea';
      assert.equal(
        await run(join(clientDirectory, 'node_modules', '.bin', binaryName), ['--version'], {
          cwd: clientDirectory,
          env: managerEnvironment,
        }),
        LIFECYCLE_FIXTURE_MANIFEST.version,
      );
    }
  } finally {
    await new Promise((resolvePromise, rejectPromise) =>
      server.close((error) => (error ? rejectPromise(error) : resolvePromise())),
    );
    rmSync(clientDirectory, { force: true, recursive: true });
    rmSync(packDirectory, { force: true, recursive: true });
  }
});

test('supported package manager installs and executes the published CLI closure', async () => {
  await exerciseRealCli({
    cliVersion: PUBLISHED_CLI_VERSION,
    registryUrl: NPM_REGISTRY_URL,
    sourceLabel: 'published',
  });
});

test(
  'supported package manager installs and executes the real CLI candidate closure',
  {
    skip: CANDIDATE_ARTIFACT_DIRECTORY === undefined && !REQUIRE_CANDIDATE_ARTIFACTS,
  },
  async () => {
    assert.ok(
      CANDIDATE_ARTIFACT_DIRECTORY,
      'MOLDEA_CLI_ARTIFACT_DIRECTORY is required for candidate conformance.',
    );
    const { artifacts, cliVersion } = loadCandidateArtifacts(resolve(CANDIDATE_ARTIFACT_DIRECTORY));
    const { registryUrl, server } = await createCandidateRegistry(artifacts);

    try {
      await exerciseRealCli({ cliVersion, registryUrl, sourceLabel: 'candidate' });
    } finally {
      await new Promise((resolvePromise, rejectPromise) =>
        server.close((error) => (error ? rejectPromise(error) : resolvePromise())),
      );
    }
  },
);
