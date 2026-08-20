// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { ILocalPackageManifest } from './types.ts';
import { resolveBuildClosure, resolveRuntimeClosure } from './resolver.ts';

const createManifest = (
  name: string,
  dependencies: Record<string, string> = {},
  devDependencies: Record<string, string> = {},
): ILocalPackageManifest => ({
  name,
  version: '1.0.0',
  dependencies,
  devDependencies,
  projectDirectory: `projects/${name.slice('@moldea.ai/'.length)}`,
});

describe('candidate closure resolution', () => {
  test('derives runtime and build closures from current package relationships', () => {
    const repository = createManifest('@moldea.ai/repository');
    const core = createManifest('@moldea.ai/core', {
      '@moldea.ai/repository': 'workspace:*',
    });
    const staticAnalysis = createManifest('@moldea.ai/adapter-static-analysis');
    const adapter = createManifest(
      '@moldea.ai/adapter-example',
      { '@moldea.ai/core': 'workspace:*', external: '1.0.0' },
      { '@moldea.ai/adapter-static-analysis': 'workspace:*' },
    );
    const cli = createManifest('@moldea.ai/cli', {
      '@moldea.ai/adapter-example': 'workspace:*',
      '@moldea.ai/core': 'workspace:*',
    });
    const manifests = new Map(
      [repository, core, staticAnalysis, adapter, cli].map((manifest) => [manifest.name, manifest]),
    );
    const runtimeClosure = resolveRuntimeClosure(manifests, [cli.name, adapter.name]);

    expect(runtimeClosure.map(({ name }) => name)).toStrictEqual([
      '@moldea.ai/repository',
      '@moldea.ai/core',
      '@moldea.ai/adapter-example',
      '@moldea.ai/cli',
    ]);
    expect(resolveBuildClosure(manifests, runtimeClosure).map(({ name }) => name)).toStrictEqual([
      '@moldea.ai/repository',
      '@moldea.ai/core',
      '@moldea.ai/adapter-static-analysis',
      '@moldea.ai/adapter-example',
      '@moldea.ai/cli',
    ]);
  });

  test('fails when a required local runtime package is missing', () => {
    const cli = createManifest('@moldea.ai/cli', {
      '@moldea.ai/core': 'workspace:*',
    });

    expect(() => resolveRuntimeClosure(new Map([[cli.name, cli]]), [cli.name])).toThrow(
      'Candidate closure requires missing local package @moldea.ai/core.',
    );
  });
});
