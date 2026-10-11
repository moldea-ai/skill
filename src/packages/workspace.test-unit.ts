// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { test } from 'vitest';

import {
  createSourceCandidatePlan,
  discoverSourcePackageManifests,
  packSourceWorkspaceCandidate,
} from './workspace.ts';
import type { IPackageCandidateManifest } from './types.ts';

/** Writes one source package manifest into a synthetic workspace project. */
const writeManifest = (
  workspaceRoot: string,
  projectDirectory: string,
  manifest: IPackageCandidateManifest & { devDependencies?: Record<string, string> },
): void => {
  const directory = join(workspaceRoot, projectDirectory);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
};

/** Creates the source graph used by candidate plan and packing tests. */
const createWorkspace = (): string => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'moldea-source-candidate-test-'));
  writeManifest(workspaceRoot, 'projects/cli', {
    dependencies: {
      '@moldea.ai/extension-next': 'workspace:^1.0.0',
      '@moldea.ai/core': 'workspace:^2.0.0',
      '@moldea.ai/repository': 'workspace:^1.0.0',
    },
    name: '@moldea.ai/cli',
    version: '3.2.0',
  });
  writeManifest(workspaceRoot, 'projects/extension-next', {
    dependencies: { '@moldea.ai/core': 'workspace:^2.0.0' },
    devDependencies: { '@moldea.ai/build-analysis': 'workspace:*' },
    name: '@moldea.ai/extension-next',
    version: '1.0.0',
  });
  writeManifest(workspaceRoot, 'projects/core', {
    dependencies: { '@moldea.ai/repository': 'workspace:^1.0.0' },
    name: '@moldea.ai/core',
    version: '2.0.0',
  });
  writeManifest(workspaceRoot, 'projects/repository', {
    name: '@moldea.ai/repository',
    version: '1.0.0',
  });
  writeManifest(workspaceRoot, 'packages/build-analysis', {
    name: '@moldea.ai/build-analysis',
    version: '0.0.0',
  });
  return workspaceRoot;
};

test('discovers projects and resolves dependency-first runtime and build closures', () => {
  const workspaceRoot = createWorkspace();

  try {
    const { buildClosure, manifests, runtimeClosure } = createSourceCandidatePlan(workspaceRoot);

    assert.equal(manifests.size, 5);
    assert.deepEqual(
      runtimeClosure.map(({ name }) => name),
      ['@moldea.ai/repository', '@moldea.ai/core', '@moldea.ai/extension-next', '@moldea.ai/cli'],
    );
    assert.deepEqual(
      buildClosure.map(({ name }) => name),
      [
        '@moldea.ai/repository',
        '@moldea.ai/core',
        '@moldea.ai/build-analysis',
        '@moldea.ai/extension-next',
        '@moldea.ai/cli',
      ],
    );
  } finally {
    rmSync(workspaceRoot, { force: true, recursive: true });
  }
});

test('adds selected package roots outside the CLI runtime closure', () => {
  const workspaceRoot = createWorkspace();

  try {
    writeManifest(workspaceRoot, 'projects/extension-selected', {
      dependencies: { '@moldea.ai/core': 'workspace:^2.0.0' },
      name: '@moldea.ai/extension-selected',
      version: '1.0.0',
    });
    const { runtimeClosure } = createSourceCandidatePlan(workspaceRoot, [
      '@moldea.ai/extension-selected',
    ]);

    assert.deepEqual(
      runtimeClosure.map(({ name }) => name),
      [
        '@moldea.ai/repository',
        '@moldea.ai/core',
        '@moldea.ai/extension-next',
        '@moldea.ai/cli',
        '@moldea.ai/extension-selected',
      ],
    );
  } finally {
    rmSync(workspaceRoot, { force: true, recursive: true });
  }
});

test('rejects duplicate identities and non-compatible source dependencies', () => {
  const duplicateWorkspaceRoot = createWorkspace();
  const rangedWorkspaceRoot = createWorkspace();

  try {
    writeManifest(duplicateWorkspaceRoot, 'packages/duplicate-core', {
      name: '@moldea.ai/core',
      version: '2.0.0',
    });
    assert.throws(
      () => discoverSourcePackageManifests(duplicateWorkspaceRoot),
      /Duplicate source package identity @moldea\.ai\/core/,
    );

    writeManifest(rangedWorkspaceRoot, 'projects/cli', {
      dependencies: {
        '@moldea.ai/extension-next': 'workspace:^1.0.0',
        '@moldea.ai/core': 'workspace:2.0.0',
        '@moldea.ai/repository': 'workspace:^1.0.0',
      },
      name: '@moldea.ai/cli',
      version: '3.2.0',
    });
    assert.throws(
      () => createSourceCandidatePlan(rangedWorkspaceRoot),
      /Expected a compatible stable range/,
    );
  } finally {
    rmSync(duplicateWorkspaceRoot, { force: true, recursive: true });
    rmSync(rangedWorkspaceRoot, { force: true, recursive: true });
  }
});

test('accepts later compatible source patches and rejects breaking-major ranges', () => {
  const compatibleWorkspaceRoot = createWorkspace();
  const breakingWorkspaceRoot = createWorkspace();

  try {
    writeManifest(compatibleWorkspaceRoot, 'projects/core', {
      dependencies: { '@moldea.ai/repository': 'workspace:^1.0.0' },
      name: '@moldea.ai/core',
      version: '2.9.7',
    });
    assert.doesNotThrow(() => createSourceCandidatePlan(compatibleWorkspaceRoot));
    writeManifest(compatibleWorkspaceRoot, 'projects/cli', {
      dependencies: {
        '@moldea.ai/extension-next': 'workspace:^1.0.0',
        '@moldea.ai/core': 'workspace:^2.9.7',
        '@moldea.ai/repository': 'workspace:^1.0.0',
      },
      name: '@moldea.ai/cli',
      version: '3.2.0',
    });
    assert.doesNotThrow(() => createSourceCandidatePlan(compatibleWorkspaceRoot));

    writeManifest(breakingWorkspaceRoot, 'projects/cli', {
      dependencies: {
        '@moldea.ai/extension-next': 'workspace:^1.0.0',
        '@moldea.ai/core': 'workspace:^3.0.0',
        '@moldea.ai/repository': 'workspace:^1.0.0',
      },
      name: '@moldea.ai/cli',
      version: '3.2.0',
    });
    assert.throws(
      () => createSourceCandidatePlan(breakingWorkspaceRoot),
      /@moldea\.ai\/core@2\.0\.0 does not satisfy workspace:\^3\.0\.0/,
    );
  } finally {
    rmSync(compatibleWorkspaceRoot, { force: true, recursive: true });
    rmSync(breakingWorkspaceRoot, { force: true, recursive: true });
  }
});

test('builds and packs only the resolved dynamic closure', () => {
  const workspaceRoot = createWorkspace();
  const artifactDirectory = join(workspaceRoot, 'artifacts');
  const commands: Array<{ args: string[]; cwd: string }> = [];

  try {
    const result = packSourceWorkspaceCandidate({
      artifactDirectory,
      executeCommand: ({ args, cwd }) => {
        commands.push({ args, cwd });
        if (args[0] === 'pack') {
          writeFileSync(join(artifactDirectory, `${basename(cwd)}.tgz`), basename(cwd));
        }
      },
      loadArtifacts: (directory) => {
        assert.deepEqual(
          readdirSync(directory)
            .filter((name) => name.endsWith('.tgz'))
            .sort(),
          ['cli.tgz', 'core.tgz', 'extension-next.tgz', 'repository.tgz'],
        );
        return { artifacts: new Map(), cliVersion: '3.2.0' };
      },
      workspaceRoot,
    });

    assert.deepEqual(result.runtimePackageNames, [
      '@moldea.ai/repository',
      '@moldea.ai/core',
      '@moldea.ai/extension-next',
      '@moldea.ai/cli',
    ]);
    assert.equal(commands.filter(({ args }) => args[0] === '--filter').length, 5);
    assert.equal(commands.filter(({ args }) => args[0] === 'pack').length, 4);
    assert.deepEqual(commands[0]?.args, ['--filter', '@moldea.ai/repository', 'build']);
  } finally {
    rmSync(workspaceRoot, { force: true, recursive: true });
  }
});
