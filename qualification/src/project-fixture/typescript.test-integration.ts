// @vitest-environment node
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { ensureDirectory } from '../filesystem/index.ts';
import { inspectProjectTypeScriptInstallation } from './typescript.ts';

describe('project TypeScript installation', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  /** Creates one isolated compiler layout for installation-contract checks. */
  const seedInstallation = async (options: {
    declaredVersion?: string | undefined;
    installedVersion: string;
    isAbsoluteShim?: boolean | undefined;
    isExternalNodeModules?: boolean | undefined;
    isExternalPackage?: boolean | undefined;
  }): Promise<string> => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-typescript-installation-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const nodeModulesDirectory = options.isExternalNodeModules
      ? path.join(temporaryRoot, 'external-node-modules')
      : path.join(workspaceDirectory, 'node_modules');
    const packageDirectory = path.join(nodeModulesDirectory, 'typescript');
    const compilerPath = path.join(packageDirectory, 'bin', 'tsc');
    const shimDirectory = path.join(nodeModulesDirectory, '.bin');
    await Promise.all([
      ensureDirectory(workspaceDirectory),
      ensureDirectory(path.dirname(compilerPath)),
      ensureDirectory(shimDirectory),
    ]);
    await Promise.all([
      writeFile(
        path.join(workspaceDirectory, 'package.json'),
        `${JSON.stringify({
          devDependencies:
            options.declaredVersion === undefined ? {} : { typescript: options.declaredVersion },
        })}\n`,
        'utf8',
      ),
      writeFile(
        path.join(packageDirectory, 'package.json'),
        `${JSON.stringify({ name: 'typescript', version: options.installedVersion })}\n`,
        'utf8',
      ),
      writeFile(compilerPath, '#!/usr/bin/env node\n', 'utf8'),
    ]);
    if (options.isExternalPackage === true) {
      const externalPackageDirectory = path.join(temporaryRoot, 'external-typescript');
      await ensureDirectory(path.join(externalPackageDirectory, 'bin'));
      await Promise.all([
        writeFile(
          path.join(externalPackageDirectory, 'package.json'),
          `${JSON.stringify({ name: 'typescript', version: options.installedVersion })}\n`,
          'utf8',
        ),
        writeFile(
          path.join(externalPackageDirectory, 'bin', 'tsc'),
          '#!/usr/bin/env node\n',
          'utf8',
        ),
      ]);
      await rm(packageDirectory, { recursive: true });
      await symlink(
        path.relative(nodeModulesDirectory, externalPackageDirectory),
        packageDirectory,
        'dir',
      );
    }
    await symlink(
      options.isAbsoluteShim === true ? compilerPath : '../typescript/bin/tsc',
      path.join(shimDirectory, 'tsc'),
    );
    if (options.isExternalNodeModules === true) {
      await symlink(
        '../external-node-modules',
        path.join(workspaceDirectory, 'node_modules'),
        'dir',
      );
    }
    return workspaceDirectory;
  };

  test('accepts one exact project-owned compiler behind a relative local shim', async () => {
    const workspaceDirectory = await seedInstallation({
      declaredVersion: '6.0.3',
      installedVersion: '6.0.3',
    });

    await expect(inspectProjectTypeScriptInstallation(workspaceDirectory)).resolves.toStrictEqual({
      executablePath: path.join(workspaceDirectory, 'node_modules', 'typescript', 'bin', 'tsc'),
      version: '6.0.3',
    });
  });

  test('rejects a compiler package linked outside the project dependency tree', async () => {
    const workspaceDirectory = await seedInstallation({
      declaredVersion: '6.0.3',
      installedVersion: '6.0.3',
      isExternalPackage: true,
    });

    await expect(inspectProjectTypeScriptInstallation(workspaceDirectory)).rejects.toThrow(
      'unexpected provider',
    );
  });

  test('rejects a project dependency tree linked outside the workspace', async () => {
    const workspaceDirectory = await seedInstallation({
      declaredVersion: '6.0.3',
      installedVersion: '6.0.3',
      isExternalNodeModules: true,
    });

    await expect(inspectProjectTypeScriptInstallation(workspaceDirectory)).rejects.toThrow(
      'unexpected provider',
    );
  });

  test.each([
    [undefined, '6.0.3', false, 'must declare TypeScript as an exact development dependency'],
    ['^6.0.3', '6.0.3', false, 'must declare TypeScript as an exact development dependency'],
    ['6.0.3', '6.0.2', false, 'does not match the exact fixture declaration'],
    ['6.0.3', '6.0.3', true, 'must be a relative symlink'],
  ])(
    'inspectProjectTypeScriptInstallation(%s, %s, absolute=%s) -> rejects',
    async (declaredVersion, installedVersion, isAbsoluteShim, expectedMessage) => {
      const workspaceDirectory = await seedInstallation({
        declaredVersion,
        installedVersion,
        isAbsoluteShim,
      });

      await expect(inspectProjectTypeScriptInstallation(workspaceDirectory)).rejects.toThrow(
        expectedMessage,
      );
    },
  );
});
