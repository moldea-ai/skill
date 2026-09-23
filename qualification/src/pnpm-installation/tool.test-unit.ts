// @vitest-environment node
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { resolveQualificationPnpmTool } from './tool.ts';

describe('qualification pnpm tool resolution', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) await rm(temporaryRoot, { recursive: true, force: true });
  });

  const createWorkspace = async (
    options: {
      installedVersion?: string;
      pin?: string;
      bin?: string;
    } = {},
  ) => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'qualification-pnpm-tool-'));
    const qualificationRoot = path.join(temporaryRoot, 'qualification');
    const packageRoot = path.join(temporaryRoot, 'node_modules', 'pnpm');
    await mkdir(qualificationRoot);
    await mkdir(packageRoot, { recursive: true });
    await writeFile(
      path.join(qualificationRoot, 'package.json'),
      JSON.stringify({ dependencies: { pnpm: options.pin ?? '11.27.1' } }),
    );
    await writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name: 'pnpm',
        version: options.installedVersion ?? '11.27.1',
        exports: { '.': './package.json' },
        bin: { pnpm: options.bin ?? 'bin/pnpm.mjs' },
      }),
    );
    await mkdir(path.join(packageRoot, 'bin'));
    await writeFile(path.join(packageRoot, 'bin', 'pnpm.mjs'), '');
    return { qualificationRoot, packageRoot };
  };

  test('rejects a missing installation with the clean-install action', async () => {
    const { qualificationRoot, packageRoot } = await createWorkspace();
    await rm(packageRoot, { recursive: true });
    await expect(resolveQualificationPnpmTool(qualificationRoot)).rejects.toThrow(
      'Qualification pnpm is missing. Run npm ci --ignore-scripts.',
    );
  });

  test('rejects an installed version different from the workspace pin', async () => {
    const { qualificationRoot } = await createWorkspace({ installedVersion: '11.8.0' });
    await expect(resolveQualificationPnpmTool(qualificationRoot)).rejects.toThrow(
      'Qualification pnpm 11.8.0 does not match the workspace pin 11.27.1.',
    );
  });

  test('rejects an executable symlink leaving the installed package', async () => {
    const { qualificationRoot, packageRoot } = await createWorkspace();
    const outsideBin = path.join(temporaryRoot!, 'outside.mjs');
    await writeFile(outsideBin, '');
    await rm(path.join(packageRoot, 'bin', 'pnpm.mjs'));
    await symlink(outsideBin, path.join(packageRoot, 'bin', 'pnpm.mjs'));
    await expect(resolveQualificationPnpmTool(qualificationRoot)).rejects.toThrow(
      'Qualification pnpm declares a bin outside its installed package.',
    );
  });

  test('rejects a bin path with traversal', async () => {
    const { qualificationRoot } = await createWorkspace({ bin: '../outside.mjs' });
    await expect(resolveQualificationPnpmTool(qualificationRoot)).rejects.toThrow(
      'Qualification pnpm declares a bin outside its installed package.',
    );
  });
});
