import { chmod, readFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type BuildOptions, type Metafile, type Plugin } from 'esbuild';
import { z } from 'zod';

import { writeTextFileAtomically } from '../filesystem/index.ts';

import { assertManagedBlock } from './managed-block/index.ts';

import type { IPortableGenerationOptions, IPortableGenerationResult } from './types.ts';

const PORTABLE_SOURCE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT_DIRECTORY = path.resolve(PORTABLE_SOURCE_ROOT, '../..');
const MANAGED_README_PLACEHOLDER = '__MOLDEA_MANAGED_README_BLOCK_JSON__';
const MANAGED_AGENTS_PLACEHOLDER = '__MOLDEA_MANAGED_AGENTS_BLOCK_JSON__';
const MAXIMUM_MATCHER_BUNDLE_BYTES = 1_048_576;

const LockfileSchema = z.object({
  packages: z.record(
    z.string(),
    z.object({
      version: z.string().optional(),
    }),
  ),
});

const PackageManifestSchema = z.object({
  license: z.string().optional(),
  name: z.string(),
  version: z.string(),
});

const PORTABLE_ENTRY_OUTPUTS = {
  'managed-agents/managed-agents.ts': 'moldea/scripts/managed-agents.mjs',
  'managed-readme.ts': 'moldea/scripts/managed-readme.mjs',
  'moldea-cli.ts': 'moldea/scripts/moldea-cli.mjs',
  'relevance-gate.ts': 'moldea/scripts/relevance-gate.mjs',
  'repository-files.ts': 'moldea/scripts/repository-files.mjs',
  'repository-package.ts': 'moldea/scripts/repository-package.mjs',
} as const;

// complete set of files owned by portable generation
export const PORTABLE_ARTIFACT_PATHS = [
  ...Object.values(PORTABLE_ENTRY_OUTPUTS),
  'moldea/scripts/repository-package.license.txt',
  'moldea/scripts/moldea-cli.license.txt',
  'moldea/scripts/manifest-scope.cjs',
  'moldea/scripts/manifest-scope.license.txt',
] as const;

const PORTABLE_EXTERNAL_IMPORTS = new Map([
  ['./managed-readme.ts', './managed-readme.mjs'],
  ['./manifest-scope.ts', './manifest-scope.cjs'],
  ['./repository-files.ts', './repository-files.mjs'],
  ['../repository-files.ts', './repository-files.mjs'],
  ['./repository-package.ts', './repository-package.mjs'],
]);
const EXECUTABLE_PORTABLE_OUTPUTS = new Set([
  'moldea/scripts/managed-agents.mjs',
  'moldea/scripts/managed-readme.mjs',
  'moldea/scripts/relevance-gate.mjs',
]);

const createPortableExternalPlugin = (): Plugin => ({
  name: 'portable-local-externals',
  setup: (buildContext) => {
    buildContext.onResolve({ filter: /^\.{1,2}\/[a-z0-9-]+\.ts$/ }, (arguments_) => {
      const portablePath = PORTABLE_EXTERNAL_IMPORTS.get(arguments_.path);
      return portablePath === undefined ? undefined : { external: true, path: portablePath };
    });
  },
});

const buildSource = async (
  options: BuildOptions,
): Promise<{ metafile: Metafile; source: string }> => {
  const result = await build({
    bundle: true,
    platform: 'node',
    target: 'node22.11',
    // release transactions and candidate directories must not inherit ambient compiler settings
    tsconfigRaw: { compilerOptions: { strict: true, useDefineForClassFields: true } },
    write: false,
    metafile: true,
    ...options,
  });
  const outputFile = result.outputFiles?.[0];
  if (outputFile === undefined || result.metafile === undefined) {
    throw new Error('Portable generation did not produce one inspectable output.');
  }
  return {
    metafile: result.metafile,
    source: outputFile.text.replace(/^[\t ]+$/gmu, ''),
  };
};

const assertBuiltinRuntimeImports = (metafile: Metafile): void => {
  const imports = Object.values(metafile.outputs).flatMap((output) => output.imports);
  const unsupportedImport = imports.find(
    (entry) => !entry.external || (!entry.path.startsWith('node:') && !entry.path.startsWith('./')),
  );
  if (unsupportedImport !== undefined) {
    throw new Error(`Portable output retains an unsupported import: ${unsupportedImport.path}`);
  }
  const unsupportedBuiltin = imports.find(
    (entry) => entry.path.startsWith('node:') && !isBuiltin(entry.path),
  );
  if (unsupportedBuiltin !== undefined) {
    throw new Error(`Portable output retains an unknown Node import: ${unsupportedBuiltin.path}`);
  }
};

const buildBundledNotices = async (
  rootDirectory: string,
  metafile: Metafile,
  entrySource: string,
  label: string,
  ownedSources: string[] = [entrySource],
): Promise<string> => {
  const lockfile = LockfileSchema.parse(
    JSON.parse(await readFile(path.join(rootDirectory, 'package-lock.json'), 'utf8')) as unknown,
  );
  const packageRoots = new Set<string>();

  for (const input of Object.keys(metafile.inputs)) {
    const marker = input.lastIndexOf('node_modules/');
    if (marker === -1) {
      if (!ownedSources.includes(input)) {
        throw new Error(`Unexpected ${label} build input: ${input}`);
      }
      continue;
    }
    const segments = input.slice(marker + 'node_modules/'.length).split('/');
    const packageSegmentCount = segments[0]?.startsWith('@') === true ? 2 : 1;
    packageRoots.add(
      `${input.slice(0, marker)}node_modules/${segments.slice(0, packageSegmentCount).join('/')}`,
    );
  }

  const notices: string[] = [];
  for (const packageRoot of [...packageRoots].sort((left, right) =>
    left.localeCompare(right, 'en'),
  )) {
    const manifest = PackageManifestSchema.parse(
      JSON.parse(
        await readFile(path.join(rootDirectory, packageRoot, 'package.json'), 'utf8'),
      ) as unknown,
    );
    if (lockfile.packages[packageRoot]?.version !== manifest.version) {
      throw new Error(
        `${label} dependency does not match the lockfile: ${manifest.name} (${packageRoot}: ${lockfile.packages[packageRoot]?.version ?? 'missing'} versus ${manifest.version})`,
      );
    }
    const license = await readFile(path.join(rootDirectory, packageRoot, 'LICENSE'), 'utf8');
    notices.push(`${manifest.name}@${manifest.version}\n\n${license.trim()}\n`);
  }
  return notices.join('\n');
};

const buildPortableArtifacts = async (rootDirectory: string): Promise<Map<string, string>> => {
  const artifacts = new Map<string, string>();
  const managedReadmeBlock = await readFile(
    path.join(rootDirectory, 'moldea/assets/managed-readme-block.md'),
    'utf8',
  );

  const managedAgentsBlock = await readFile(
    path.join(rootDirectory, 'moldea/assets/managed-agents-block.md'),
    'utf8',
  );

  assertManagedBlock(managedReadmeBlock);
  assertManagedBlock(managedAgentsBlock, 'AGENTS.md', false);

  for (const [entryFile, outputPath] of Object.entries(PORTABLE_ENTRY_OUTPUTS)) {
    const result = await buildSource({
      absWorkingDir: rootDirectory,
      entryPoints: [`src/portable/${entryFile}`],
      format: 'esm',
      legalComments: 'none',
      plugins: [createPortableExternalPlugin()],
      ...(['repository-package.ts', 'moldea-cli.ts'].includes(entryFile)
        ? {
            banner: {
              js: `// Generated by npm run portable:generate. See ${entryFile.replace('.ts', '.license.txt')}.`,
            },
          }
        : {}),
    });
    assertBuiltinRuntimeImports(result.metafile);

    const embeddedTemplate =
      entryFile === 'managed-readme.ts'
        ? { placeholder: MANAGED_README_PLACEHOLDER, block: managedReadmeBlock }
        : entryFile === 'managed-agents/managed-agents.ts'
          ? { placeholder: MANAGED_AGENTS_PLACEHOLDER, block: managedAgentsBlock }
          : undefined;
    let source = result.source;
    if (embeddedTemplate !== undefined) {
      const placeholder = JSON.stringify(embeddedTemplate.placeholder);
      if (source.split(placeholder).length - 1 !== 1)
        throw new Error(
          `Managed block generation requires exactly one embedded placeholder in ${entryFile}.`,
        );
      source = source.replace(placeholder, JSON.stringify(embeddedTemplate.block));
    }
    if (
      [MANAGED_README_PLACEHOLDER, MANAGED_AGENTS_PLACEHOLDER].some((placeholder) =>
        source.includes(placeholder),
      )
    )
      throw new Error(`Unexpected unresolved managed block placeholder in ${entryFile}.`);
    artifacts.set(outputPath, source);
    if (entryFile === 'moldea-cli.ts') {
      artifacts.set(
        'moldea/scripts/moldea-cli.license.txt',
        await buildBundledNotices(
          rootDirectory,
          result.metafile,
          'src/portable/moldea-cli.ts',
          'Launcher',
          [
            'src/portable/moldea-cli.ts',
            'src/portable/scope-path-input.ts',
            'src/portable/response-page/index.ts',
            'src/portable/response-page/types.ts',
            'src/portable/response-page/response-page.ts',
            'src/filesystem/atomic-bytes/index.ts',
            'src/filesystem/atomic-bytes/atomic-bytes.ts',
          ],
        ),
      );
    }
    if (entryFile === 'repository-package.ts') {
      artifacts.set(
        'moldea/scripts/repository-package.license.txt',
        await buildBundledNotices(
          rootDirectory,
          result.metafile,
          'src/portable/repository-package.ts',
          'Resolver',
        ),
      );
    }
  }

  const matcher = await buildSource({
    absWorkingDir: rootDirectory,
    entryPoints: ['src/portable/manifest-scope.ts'],
    format: 'cjs',
    minifySyntax: true,
    minifyWhitespace: true,
    legalComments: 'inline',
    alias: { buffer: 'node:buffer', process: 'node:process' },
    banner: {
      js: '// Generated by npm run portable:generate. See manifest-scope.license.txt.',
    },
  });
  assertBuiltinRuntimeImports(matcher.metafile);
  if (Buffer.byteLength(matcher.source, 'utf8') > MAXIMUM_MATCHER_BUNDLE_BYTES) {
    throw new Error('The portable matcher exceeded its reviewed artifact size limit.');
  }
  artifacts.set('moldea/scripts/manifest-scope.cjs', matcher.source);
  artifacts.set(
    'moldea/scripts/manifest-scope.license.txt',
    await buildBundledNotices(
      rootDirectory,
      matcher.metafile,
      'src/portable/manifest-scope.ts',
      'Matcher',
    ),
  );
  return artifacts;
};

/** Generates every committed portable runtime or verifies exact reproducibility. */
export const generatePortableArtifacts = async (
  options: IPortableGenerationOptions = {},
): Promise<IPortableGenerationResult> => {
  const rootDirectory = path.resolve(options.rootDirectory ?? DEFAULT_ROOT_DIRECTORY);
  const artifacts = await buildPortableArtifacts(rootDirectory);
  if (
    artifacts.size !== PORTABLE_ARTIFACT_PATHS.length ||
    PORTABLE_ARTIFACT_PATHS.some((relativePath) => !artifacts.has(relativePath))
  ) {
    throw new Error('Portable generation produced an unexpected artifact set.');
  }

  for (const [relativePath, content] of artifacts) {
    const outputPath = path.join(rootDirectory, relativePath);
    if (options.check === true) {
      if ((await readFile(outputPath, 'utf8')) !== content) {
        throw new Error(`Generated portable artifact is stale: ${relativePath}`);
      }
      continue;
    }
    await writeTextFileAtomically(outputPath, content);
    if (EXECUTABLE_PORTABLE_OUTPUTS.has(relativePath)) {
      await chmod(outputPath, 0o755);
    }
  }

  return {
    artifacts: [...artifacts.keys()],
    status: options.check === true ? 'current' : 'generated',
  };
};
