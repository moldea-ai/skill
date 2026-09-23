// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'vitest';

import { resolveRepositoryCli } from './repository-package.ts';

interface IPackageFixtureOptions {
  cliDeclaration?: string;
  cliVersion?: string;
  coreDeclaration?: string;
  coreLocation?: 'hoisted' | 'nested';
  coreVersion?: string;
}

interface IPackageFixture {
  cliRoot: string;
  coreRoot: string;
  invocationMarker: string;
  repositoryRoot: string;
}

const LAUNCHER_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'moldea',
  'scripts',
  'moldea-cli.mjs',
);
const temporaryRoots: string[] = [];

const writeJson = (filePath: string, content: object): void => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
};

const createPackageFixture = ({
  cliDeclaration = '^8.0.0',
  cliVersion = '8.0.1',
  coreDeclaration = '^4.0.1',
  coreLocation = 'hoisted',
  coreVersion = '4.0.2',
}: IPackageFixtureOptions = {}): IPackageFixture => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-package-'));
  temporaryRoots.push(repositoryRoot);
  const cliRoot = join(repositoryRoot, 'node_modules', '@moldea.ai', 'cli');
  const coreRoot =
    coreLocation === 'nested'
      ? join(cliRoot, 'node_modules', '@moldea.ai', 'core')
      : join(repositoryRoot, 'node_modules', '@moldea.ai', 'core');
  const invocationMarker = join(repositoryRoot, 'cli-invoked.txt');

  writeJson(join(repositoryRoot, 'package.json'), {
    devDependencies: { '@moldea.ai/cli': cliDeclaration },
  });
  writeJson(join(repositoryRoot, 'package-lock.json'), {
    packages: { 'node_modules/@moldea.ai/cli': { version: '8.0.0' } },
  });
  writeJson(join(cliRoot, 'package.json'), {
    bin: { moldea: './dist/moldea.js' },
    dependencies: { '@moldea.ai/core': coreDeclaration },
    name: '@moldea.ai/cli',
    version: cliVersion,
  });
  mkdirSync(join(cliRoot, 'dist'), { recursive: true });
  writeFileSync(
    join(cliRoot, 'dist', 'moldea.js'),
    `require('node:fs').writeFileSync(${JSON.stringify(invocationMarker)}, 'invoked');\nprocess.stdout.write('fixture-cli-invoked\\n');\n`,
  );
  writeJson(join(coreRoot, 'package.json'), { name: '@moldea.ai/core', version: coreVersion });
  mkdirSync(join(coreRoot, 'dist'), { recursive: true });
  writeFileSync(join(coreRoot, 'dist', 'index.js'), 'module.exports = {};\n');

  return { cliRoot, coreRoot, invocationMarker, repositoryRoot };
};

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test.each([
  ['^4.0.1', '4.0.2'],
  ['^4.0.2', '4.0.2'],
  ['>=4.0.1 <5.0.0', '4.2.0'],
])('resolves declaration %s with installed Core %s', async (coreDeclaration, coreVersion) => {
  const fixture = createPackageFixture({ coreDeclaration, coreVersion });

  const resolved = await resolveRepositoryCli(fixture.repositoryRoot);

  assert.equal(resolved.cliVersion, '8.0.1');
  assert.equal(resolved.cliRoot, fixture.cliRoot);
  assert.equal(resolved.repositoryRoot, fixture.repositoryRoot);
  assert.equal(existsSync(fixture.invocationMarker), false);
});

test('accepts a compatible CLI minor and its nearest nested Core package', async () => {
  const fixture = createPackageFixture({
    cliVersion: '8.1.0',
    coreDeclaration: '^4.1.0',
    coreLocation: 'nested',
    coreVersion: '4.1.1',
  });
  const hoistedCoreRoot = join(fixture.repositoryRoot, 'node_modules', '@moldea.ai', 'core');
  writeJson(join(hoistedCoreRoot, 'package.json'), {
    name: '@moldea.ai/core',
    version: '3.0.0',
  });

  assert.equal((await resolveRepositoryCli(fixture.repositoryRoot)).cliVersion, '8.1.0');
});

test('accepts a compatible installed CLI when the target lock selects an older patch', async () => {
  const fixture = createPackageFixture();
  const lockPath = join(fixture.repositoryRoot, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as {
    packages: Record<string, { version: string }>;
  };
  assert.equal(lock.packages['node_modules/@moldea.ai/cli']?.version, '8.0.0');
  assert.equal((await resolveRepositoryCli(fixture.repositoryRoot)).cliVersion, '8.0.1');

  writeFileSync(lockPath, '{not valid JSON');
  assert.equal((await resolveRepositoryCli(fixture.repositoryRoot)).cliVersion, '8.0.1');
});

test.each([
  [{ coreDeclaration: '^4.1.0' }, /unsupported Core package/u],
  [{ coreDeclaration: '^3.0.0' }, /unsupported Core package/u],
  [{ coreDeclaration: 'not-a-range' }, /unsupported CLI package closure/u],
  [{ coreDeclaration: '' }, /unsupported CLI package closure/u],
  [{ coreVersion: '4.0.0' }, /unsupported Core package/u],
  [{ coreVersion: '4.1.0-beta.1' }, /unsupported Core package/u],
  [{ coreVersion: '5.0.0' }, /unsupported Core package/u],
  [{ cliDeclaration: '8.0.0' }, /unsupported CLI package closure/u],
  [{ cliVersion: '8.1.0-beta.1' }, /unsupported CLI package closure/u],
  [{ cliVersion: '9.0.0' }, /unsupported CLI package closure/u],
])('rejects an incompatible package closure %o', async (options, expectedError) => {
  const fixture = createPackageFixture(options);

  await assert.rejects(resolveRepositoryCli(fixture.repositoryRoot), expectedError);
  assert.equal(existsSync(fixture.invocationMarker), false);
});

test('rejects missing Core declarations, packages, and executable entries', async () => {
  const missingDeclaration = createPackageFixture();
  writeJson(join(missingDeclaration.cliRoot, 'package.json'), {
    bin: { moldea: './dist/moldea.js' },
    dependencies: {},
    name: '@moldea.ai/cli',
    version: '8.0.1',
  });
  await assert.rejects(
    resolveRepositoryCli(missingDeclaration.repositoryRoot),
    /unsupported CLI package closure/u,
  );

  const missingCore = createPackageFixture();
  rmSync(missingCore.coreRoot, { force: true, recursive: true });
  await assert.rejects(
    resolveRepositoryCli(missingCore.repositoryRoot),
    /Core package could not be resolved/u,
  );

  const missingCliBinary = createPackageFixture();
  rmSync(join(missingCliBinary.cliRoot, 'dist', 'moldea.js'));
  await assert.rejects(resolveRepositoryCli(missingCliBinary.repositoryRoot), /ENOENT/u);

  const missingCoreEntry = createPackageFixture();
  rmSync(join(missingCoreEntry.coreRoot, 'dist', 'index.js'));
  await assert.rejects(resolveRepositoryCli(missingCoreEntry.repositoryRoot), /ENOENT/u);
});

test('rejects a Core package redirected outside repository dependencies', async () => {
  const fixture = createPackageFixture();
  const outsideRoot = mkdtempSync(join(tmpdir(), 'moldea-package-outside-'));
  temporaryRoots.push(outsideRoot);
  rmSync(fixture.coreRoot, { force: true, recursive: true });
  symlinkSync(outsideRoot, fixture.coreRoot, process.platform === 'win32' ? 'junction' : 'dir');

  await assert.rejects(
    resolveRepositoryCli(fixture.repositoryRoot),
    /Core package escaped repository dependencies/u,
  );
});

test('generated launcher invokes only an eligible repository CLI', () => {
  const eligible = createPackageFixture();
  const invocation = spawnSync(
    process.execPath,
    [LAUNCHER_PATH, '--repository', eligible.repositoryRoot, '--', 'composition', '--json'],
    { cwd: eligible.repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(invocation.status, 0, invocation.stderr);
  assert.equal(invocation.stdout, 'fixture-cli-invoked\n');
  assert.equal(existsSync(eligible.invocationMarker), true);

  const ineligible = createPackageFixture({ coreDeclaration: '^4.1.0' });
  const rejection = spawnSync(
    process.execPath,
    [LAUNCHER_PATH, '--repository', ineligible.repositoryRoot, '--', 'composition', '--json'],
    { cwd: ineligible.repositoryRoot, encoding: 'utf8' },
  );
  assert.equal(rejection.status, 3);
  assert.match(rejection.stderr, /unsupported Core package/u);
  assert.equal(existsSync(ineligible.invocationMarker), false);
});
