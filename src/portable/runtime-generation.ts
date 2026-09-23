import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type BuildOptions, type Metafile } from 'esbuild';

import { writeTextFileAtomically } from '../filesystem/index.ts';

import type { IRuntimeGenerationOptions, IRuntimeGenerationResult } from './types.ts';

const PORTABLE_SOURCE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT_DIRECTORY = path.resolve(PORTABLE_SOURCE_ROOT, '../..');
const DEFAULT_RUNTIME_OUTPUT_DIRECTORY = 'dist/runtime';

const RUNTIME_ENTRY_OUTPUTS = {
  'src/execution/host/git-command-policy-boundary.ts': 'git-command-policy-boundary.mjs',
  'src/execution/host/proxy.ts': 'codex-evaluation-proxy.mjs',
  'qualification/src/deterministic/direct-verifier.ts': 'qualification-direct-verifier.mjs',
} as const;

/** Builds one standalone Node runtime helper and returns its inspectable output. */
const buildRuntimeSource = async (
  rootDirectory: string,
  entryPath: string,
): Promise<{ metafile: Metafile; source: string }> => {
  const buildOptions: BuildOptions = {
    absWorkingDir: rootDirectory,
    alias: { buffer: 'node:buffer', process: 'node:process' },
    ...(entryPath === 'qualification/src/deterministic/direct-verifier.ts'
      ? {
          banner: {
            js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
          },
        }
      : {}),
    bundle: true,
    entryPoints: [entryPath],
    format: 'esm',
    legalComments: 'none',
    metafile: true,
    platform: 'node',
    target: 'node22.11',
    write: false,
  };
  const result = await build(buildOptions);
  const outputFile = result.outputFiles?.[0];

  if (outputFile === undefined || result.metafile === undefined) {
    throw new Error(`Runtime generation did not produce one inspectable output for ${entryPath}.`);
  }

  return { metafile: result.metafile, source: outputFile.text };
};

/** Rejects generated helpers that retain undeclared non-Node runtime dependencies. */
const assertRuntimeBundleIsStandalone = (entryPath: string, metafile: Metafile): void => {
  const unsupportedImport = Object.values(metafile.outputs)
    .flatMap((output) => output.imports)
    .find((runtimeImport) => runtimeImport.external && !runtimeImport.path.startsWith('node:'));

  if (unsupportedImport !== undefined) {
    throw new Error(
      `Runtime helper ${entryPath} retains an unsupported import: ${unsupportedImport.path}`,
    );
  }
};

/** Generates ignored standalone helpers used across evaluator isolation boundaries. */
export const generateRuntimeArtifacts = async (
  options: IRuntimeGenerationOptions = {},
): Promise<IRuntimeGenerationResult> => {
  const rootDirectory = path.resolve(options.rootDirectory ?? DEFAULT_ROOT_DIRECTORY);
  const outputDirectory = path.resolve(
    rootDirectory,
    options.outputDirectory ?? DEFAULT_RUNTIME_OUTPUT_DIRECTORY,
  );
  const artifactPaths: string[] = [];

  for (const [entryPath, outputName] of Object.entries(RUNTIME_ENTRY_OUTPUTS)) {
    const result = await buildRuntimeSource(rootDirectory, entryPath);
    assertRuntimeBundleIsStandalone(entryPath, result.metafile);

    const outputPath = path.join(outputDirectory, outputName);
    await writeTextFileAtomically(outputPath, result.source);
    artifactPaths.push(path.relative(rootDirectory, outputPath).split(path.sep).join('/'));
  }

  return { artifacts: artifactPaths };
};
