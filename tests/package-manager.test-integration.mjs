import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_PATH = join(REPOSITORY_ROOT, 'fixtures', 'tooling', 'fake-cli');
const MANAGER = process.env.MOLDEA_TEST_MANAGER ?? 'npm';
const EXPECTED_VERSION = process.env.MOLDEA_TEST_MANAGER_VERSION;
const EXECUTABLE = process.platform === 'win32' ? `${MANAGER}.cmd` : MANAGER;

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

const run = (command, args, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', rejectPromise);
    child.on('close', (status) => {
      if (status === 0) {
        resolvePromise(stdout.trim());
      } else {
        rejectPromise(new Error(
          [`${command} ${args.join(' ')} failed.`, stdout, stderr].join('\n'),
        ));
      }
    });
  });

const createRegistry = async (archive) => {
  let registryUrl;
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, registryUrl).pathname);
    if (pathname === '/@moldea.ai/cli') {
      const metadata = {
        name: '@moldea.ai/cli',
        'dist-tags': { latest: '1.0.0' },
        time: {
          created: '2025-01-01T00:00:00.000Z',
          modified: '2025-01-01T00:00:00.000Z',
          '1.0.0': '2025-01-01T00:00:00.000Z',
        },
        versions: {
          '1.0.0': {
            name: '@moldea.ai/cli',
            version: '1.0.0',
            bin: {
              moldea: 'bin/moldea.js',
            },
            scripts: {
              preinstall: 'node lifecycle-sentinel.mjs dependency-preinstall',
              install: 'node lifecycle-sentinel.mjs dependency-install',
              postinstall: 'node lifecycle-sentinel.mjs dependency-postinstall',
            },
            dist: {
              integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}`,
              shasum: createHash('sha1').update(archive).digest('hex'),
              tarball: `${registryUrl}/@moldea.ai/cli/-/cli-1.0.0.tgz`,
            },
          },
        },
      };
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(metadata));
      return;
    }
    if (pathname === '/@moldea.ai/cli/-/cli-1.0.0.tgz') {
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

test('supported package-manager command exact-pins the CLI and suppresses lifecycle scripts', async () => {
  const actualVersion = runSync(EXECUTABLE, ['--version']);
  assert.ok(isSupportedVersion(MANAGER, actualVersion));

  if (EXPECTED_VERSION) {
    assert.equal(actualVersion, EXPECTED_VERSION);
  }

  const clientDirectory = mkdtempSync(join(tmpdir(), `moldea-${MANAGER}-`));
  const packDirectory = mkdtempSync(join(tmpdir(), 'moldea-cli-pack-'));
  const sentinelPath = join(clientDirectory, 'lifecycle-ran.txt');
  const packageManager = `${MANAGER}@${actualVersion}`;
  const archiveName = runSync('npm', [
    'pack',
    '--ignore-scripts',
    '--pack-destination',
    packDirectory,
    FIXTURE_PATH,
  ]).split('\n').at(-1);
  const archive = readFileSync(join(packDirectory, archiveName));
  const { registryUrl, server } = await createRegistry(archive);
  const managerEnvironment = {
    ...process.env,
    MOLDEA_LIFECYCLE_SENTINEL: sentinelPath,
    npm_config_audit: 'false',
    npm_config_fund: 'false',
  };

  writeFileSync(
    join(clientDirectory, 'package.json'),
    JSON.stringify(
      {
        name: 'moldea-tooling-test-client',
        private: true,
        packageManager,
        scripts: {
          preinstall: 'node lifecycle-sentinel.mjs root-preinstall',
          install: 'node lifecycle-sentinel.mjs root-install',
          postinstall: 'node lifecycle-sentinel.mjs root-postinstall',
        },
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    join(clientDirectory, 'lifecycle-sentinel.mjs'),
    "import { appendFileSync } from 'node:fs';\nappendFileSync(process.env.MOLDEA_LIFECYCLE_SENTINEL, (process.argv[2] ?? 'unknown') + '\\n');\n",
  );

  let installArguments;

  if (MANAGER === 'npm') {
    installArguments = [
      'install',
      '--save-dev',
      '--save-exact',
      '--ignore-scripts',
      '--registry',
      registryUrl,
      '@moldea.ai/cli@1.0.0',
    ];
  } else if (MANAGER === 'pnpm') {
    writeFileSync(join(clientDirectory, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n");
    installArguments = [
      'add',
      '--workspace-root',
      '--save-dev',
      '--save-exact',
      '--ignore-scripts',
      '--registry',
      registryUrl,
      '@moldea.ai/cli@1.0.0',
    ];
  } else {
    assert.equal(MANAGER, 'yarn');
    const yarnHome = join(clientDirectory, '.home');
    mkdirSync(yarnHome);
    managerEnvironment.HOME = yarnHome;
    managerEnvironment.XDG_CACHE_HOME = join(yarnHome, '.cache');
    managerEnvironment.XDG_CONFIG_HOME = join(yarnHome, '.config');
    writeFileSync(
      join(clientDirectory, '.yarnrc.yml'),
      `enableGlobalCache: false\nnpmRegistryServer: "${registryUrl}"\nunsafeHttpWhitelist:\n  - 127.0.0.1\n`,
    );
    installArguments = [
      'add',
      '--dev',
      '--exact',
      '--mode=skip-build',
      '@moldea.ai/cli@1.0.0',
    ];
  }

  try {
    await run(EXECUTABLE, installArguments, {
      cwd: clientDirectory,
      env: managerEnvironment,
    });

    assert.equal(existsSync(sentinelPath), false);
    const installedManifest = JSON.parse(
      readFileSync(join(clientDirectory, 'package.json'), 'utf8'),
    );
    assert.equal(installedManifest.devDependencies['@moldea.ai/cli'], '1.0.0');

    if (MANAGER === 'yarn') {
      assert.ok((await run(EXECUTABLE, ['bin', 'moldea'], {
        cwd: clientDirectory,
        env: managerEnvironment,
      })).length > 0);
      assert.equal(
        await run(EXECUTABLE, ['exec', 'moldea', '--version'], {
          cwd: clientDirectory,
          env: managerEnvironment,
        }),
        '1.0.0',
      );
    } else {
      const installedCliManifest = JSON.parse(
        readFileSync(
          join(clientDirectory, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
          'utf8',
        ),
      );
      assert.equal(installedCliManifest.version, '1.0.0');
      const binaryName = process.platform === 'win32' ? 'moldea.cmd' : 'moldea';
      assert.equal(
        await run(join(clientDirectory, 'node_modules', '.bin', binaryName), ['--version'], {
          cwd: clientDirectory,
        }),
        '1.0.0',
      );
    }
  } finally {
    await new Promise((resolvePromise, rejectPromise) =>
      server.close((error) => error ? rejectPromise(error) : resolvePromise()),
    );
    rmSync(clientDirectory, { force: true, recursive: true });
    rmSync(packDirectory, { force: true, recursive: true });
  }
});
