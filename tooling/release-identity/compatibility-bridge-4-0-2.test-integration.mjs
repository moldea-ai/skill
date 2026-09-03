import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, test } from 'node:test';
import { gunzipSync, gzipSync } from 'node:zlib';

import { stringify } from 'yaml';

import {
  assertPackageTags,
  assertPackagesSourceState,
  checkCompatibilityBridgePackages,
  comparePackageArtifactSets,
  compareSkillCompatibilityFiles,
  compareSkillPackageLocks,
  createFrozenCompatibilitySurface,
  createRuntimeImportClosure,
  loadCandidatePackageArtifacts,
  PACKAGE_VERSION_MAP,
  PACKAGES_402_CHANGED_PATHS,
  PACKAGES_SOURCE_BASELINE_COMMIT,
  PACKAGES_SOURCE_BASELINE_TREE,
  readPackageArchive,
  SKILL_401_COMMIT,
  SKILL_402_CHANGED_PATHS,
  writeCompatibilityBridge402Attestation,
} from './compatibility-bridge-4-0-2.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..', '..');
const temporaryDirectories = [];
const candidateCommit = 'c'.repeat(40);
const skillCommit = 'd'.repeat(40);
const sourceNodeRange = '^22.11.0 || ^24.11.0';
const candidateNodeRange = '>=22.11.0';
const sourceCoreDependencyRange = '^2.0.0';
const candidateCoreDependencyRange = '>=2.0.2';
const sourceRepositoryDependencyRange = '^1.0.0';
const candidateRepositoryDependencyRange = '>=1.1.1';

const newPackagesSourcePaths = new Set([
  'projects/cli/scripts/testing-peer-compatibility/index.mjs',
  'projects/repository/scripts/testing-peer-compatibility/index.mjs',
]);
const packageSourcePaths = {
  '@moldea.ai/adapter-anthropic': 'projects/adapter-anthropic',
  '@moldea.ai/adapter-claude-agent-sdk': 'projects/adapter-claude-agent-sdk',
  '@moldea.ai/adapter-cloudflare-agents': 'projects/adapter-cloudflare-agents',
  '@moldea.ai/adapter-eve': 'projects/adapter-eve',
  '@moldea.ai/adapter-google-genai': 'projects/adapter-google-genai',
  '@moldea.ai/adapter-langchain': 'projects/adapter-langchain',
  '@moldea.ai/adapter-langgraph': 'projects/adapter-langgraph',
  '@moldea.ai/adapter-openai': 'projects/adapter-openai',
  '@moldea.ai/adapter-openai-agents-sdk': 'projects/adapter-openai-agents-sdk',
  '@moldea.ai/adapter-vercel-ai-sdk': 'projects/adapter-vercel-ai-sdk',
  '@moldea.ai/cli': 'projects/cli',
  '@moldea.ai/core': 'projects/core',
  '@moldea.ai/repository': 'projects/repository',
  '@moldea.ai/repository-fs': 'projects/repository-fs',
  '@moldea.ai/website-ui': 'projects/website-ui',
};
const nodeBoundPackageNames = new Set(
  Object.keys(PACKAGE_VERSION_MAP).filter(
    (packageName) =>
      packageName !== '@moldea.ai/core' &&
      packageName !== '@moldea.ai/repository' &&
      packageName !== '@moldea.ai/website-ui',
  ),
);
const repositoryDependentPackageNames = new Set(
  Object.keys(PACKAGE_VERSION_MAP).filter(
    (packageName) =>
      packageName !== '@moldea.ai/cli' &&
      packageName !== '@moldea.ai/repository' &&
      packageName !== '@moldea.ai/website-ui',
  ),
);
const coreDependentPackageNames = new Set(
  Object.keys(PACKAGE_VERSION_MAP).filter((packageName) =>
    packageName.startsWith('@moldea.ai/adapter-'),
  ),
);

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

/** Creates one tracked temporary directory. */
const createTemporaryDirectory = (prefix) => {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
};

/** Writes one octal USTAR header field. */
const writeTarNumber = (header, offset, length, value) => {
  const encoded = `${value.toString(8).padStart(length - 1, '0')}\0`;
  header.write(encoded, offset, length, 'ascii');
};

/** Creates one small deterministic gzip-compressed USTAR archive. */
const createArchive = (entries) => {
  const blocks = [];
  for (const [path, input] of entries) {
    const content = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const header = Buffer.alloc(512);
    header.write(path, 0, 100, 'utf8');
    writeTarNumber(header, 100, 8, 0o644);
    writeTarNumber(header, 108, 8, 0);
    writeTarNumber(header, 116, 8, 0);
    writeTarNumber(header, 124, 12, content.length);
    writeTarNumber(header, 136, 12, 0);
    header.fill(0x20, 148, 156);
    header.write('0', 156, 1, 'ascii');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    const checksum = header.reduce((total, byte) => total + byte, 0);
    header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
    blocks.push(
      header,
      content,
      Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length),
    );
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
};

/** Creates the minimal package manifest needed to exercise every bridge projection. */
const createPackageManifest = (packageName, isCandidate) => {
  const versions = PACKAGE_VERSION_MAP[packageName];
  const manifest = {
    name: packageName,
    version: isCandidate ? versions.candidate : versions.source,
    sideEffects: false,
    exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
    files: ['dist', 'README.md'],
    dependencies: {},
  };
  if (nodeBoundPackageNames.has(packageName)) {
    manifest.engines = {
      node: isCandidate ? candidateNodeRange : sourceNodeRange,
    };
  }
  if (packageName === '@moldea.ai/repository') {
    manifest.peerDependencies = isCandidate
      ? { vitest: '>=1.0.0', 'web-utils-kit': '>=1.3.1' }
      : { vitest: '4.1.10', 'web-utils-kit': '1.3.1' };
    manifest.peerDependenciesMeta = {
      vitest: { optional: true },
      'web-utils-kit': { optional: true },
    };
  }
  if (repositoryDependentPackageNames.has(packageName)) {
    manifest.dependencies['@moldea.ai/repository'] = isCandidate
      ? candidateRepositoryDependencyRange
      : sourceRepositoryDependencyRange;
  }
  if (coreDependentPackageNames.has(packageName)) {
    manifest.dependencies['@moldea.ai/core'] = isCandidate
      ? candidateCoreDependencyRange
      : sourceCoreDependencyRange;
  }
  if (packageName === '@moldea.ai/cli') {
    manifest.dependencies = Object.fromEntries(
      Object.entries(PACKAGE_VERSION_MAP)
        .filter(
          ([dependencyName]) =>
            dependencyName !== '@moldea.ai/cli' && dependencyName !== '@moldea.ai/website-ui',
        )
        .map(([dependencyName, dependencyVersions]) => [
          dependencyName,
          isCandidate ? dependencyVersions.candidate : dependencyVersions.source,
        ]),
    );
  }
  return manifest;
};

/** Creates the source README text containing each authorized package token. */
const createSourceReadme = (packageName) => {
  const version = PACKAGE_VERSION_MAP[packageName].source;
  if (packageName.startsWith('@moldea.ai/adapter-')) {
    return `Version \`${version}\` supports.\n\`@moldea.ai/core ${sourceCoreDependencyRange}\`\n`;
  }
  if (packageName === '@moldea.ai/repository') {
    return 'Install its exact testing peers in the implementing package:\n';
  }
  if (packageName === '@moldea.ai/repository-fs') {
    return `${sourceNodeRange}\nNode.js \`22.11.0\`, the latest Node.js \`22.x\`, Node.js \`24.11.0\`, and the latest Node.js \`24.x\`\n`;
  }
  if (packageName === '@moldea.ai/cli') {
    return `${sourceNodeRange}\nNode.js \`22.11.0\`, latest Node.js 22, Node.js \`24.11.0\`, and latest Node.js 24\nAnthropic adapter \`2.0.3\`\n`;
  }
  return `${packageName} stable README\n`;
};

/** Applies the exact README projection frozen by the bridge. */
const createCandidateReadme = (packageName) => {
  let readme = createSourceReadme(packageName);
  const versions = PACKAGE_VERSION_MAP[packageName];
  if (packageName.startsWith('@moldea.ai/adapter-')) {
    readme = readme.replace(`Version \`${versions.source}\``, `Version \`${versions.candidate}\``);
    readme = readme.replace(sourceCoreDependencyRange, candidateCoreDependencyRange);
  }
  if (packageName === '@moldea.ai/repository') {
    readme = readme.replace(
      'Install its exact testing peers in the implementing package:',
      'Install compatible testing peers in the implementing package. The testing subpath supports Vitest `>=1.0.0` and web-utils-kit `>=1.3.1`:',
    );
  }
  if (packageName === '@moldea.ai/repository-fs' || packageName === '@moldea.ai/cli') {
    readme = readme.replaceAll(sourceNodeRange, candidateNodeRange);
    const sourceRuntimeText =
      packageName === '@moldea.ai/cli'
        ? 'Node.js `22.11.0`, latest Node.js 22, Node.js `24.11.0`, and latest Node.js 24'
        : 'Node.js `22.11.0`, the latest Node.js `22.x`, Node.js `24.11.0`, and the latest Node.js `24.x`';
    readme = readme.replace(sourceRuntimeText, `${sourceRuntimeText}, and Node.js \`26.8.1\``);
  }
  if (packageName === '@moldea.ai/cli') {
    readme = readme.replace('Anthropic adapter `2.0.3`', 'Anthropic adapter `2.0.6`');
  }
  return readme;
};

/** Creates in-memory source or candidate artifacts for all 15 public packages. */
const createArtifactSet = (isCandidate) =>
  new Map(
    Object.keys(PACKAGE_VERSION_MAP).map((packageName) => {
      const manifest = createPackageManifest(packageName, isCandidate);
      const readme = isCandidate
        ? createCandidateReadme(packageName)
        : createSourceReadme(packageName);
      const archive = createArchive([
        ['package/package.json', `${JSON.stringify(manifest, null, 2)}\n`],
        ['package/README.md', readme],
        ['package/dist/index.js', 'export const stable = true;\n'],
      ]);
      return [
        packageName,
        {
          archive,
          archiveName: `${packageName.slice(1).replace('/', '-')}-${manifest.version}.tgz`,
          entries: readPackageArchive(archive),
          manifest,
        },
      ];
    }),
  );

/** Writes the exact candidate tarball set and checksum file. */
const writeCandidateArtifacts = (artifactDirectory, artifacts) => {
  mkdirSync(artifactDirectory, { recursive: true });
  const checksumLines = [];
  for (const { archive, archiveName } of [...artifacts.values()].sort((left, right) =>
    left.archiveName.localeCompare(right.archiveName, 'en'),
  )) {
    writeFileSync(join(artifactDirectory, archiveName), archive);
    checksumLines.push(`${createHash('sha256').update(archive).digest('hex')}  ${archiveName}`);
  }
  writeFileSync(join(artifactDirectory, 'SHA256SUMS'), `${checksumLines.join('\n')}\n`);
};

/** Creates a Git seam for exact immutable source-state checks. */
const createPackagesGit =
  ({
    ancestry = true,
    baselineCommit = PACKAGES_SOURCE_BASELINE_COMMIT,
    changedPaths = PACKAGES_402_CHANGED_PATHS,
    checkedOutCommit = candidateCommit,
    tree,
  }) =>
  (_repositoryRoot, arguments_) => {
    const command = arguments_.join(' ');
    if (command === `rev-parse --verify ${PACKAGES_SOURCE_BASELINE_COMMIT}^{commit}`) {
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(`${baselineCommit}\n`),
      };
    }
    if (command === `rev-parse --verify ${PACKAGES_SOURCE_BASELINE_COMMIT}^{tree}`) {
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(`${tree ?? PACKAGES_SOURCE_BASELINE_TREE}\n`),
      };
    }
    if (command === `rev-parse --verify ${candidateCommit}^{commit}`) {
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(`${candidateCommit}\n`),
      };
    }
    if (command === 'rev-parse --verify HEAD^{commit}') {
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(`${checkedOutCommit}\n`),
      };
    }
    if (arguments_[0] === 'merge-base') {
      return {
        status: ancestry ? 0 : 1,
        stderr: Buffer.alloc(0),
        stdout: Buffer.alloc(0),
      };
    }
    if (arguments_[0] === 'diff' && arguments_.includes('--diff-filter=D')) {
      return { status: 0, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) };
    }
    if (arguments_[0] === 'diff') {
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(`${changedPaths.join('\0')}\0`),
      };
    }
    if (arguments_[0] === 'status') {
      return { status: 0, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) };
    }
    if (arguments_[0] === 'show') {
      const separatorIndex = arguments_[1].indexOf(':');
      const commit = arguments_[1].slice(0, separatorIndex);
      const path = arguments_[1].slice(separatorIndex + 1);
      if (commit === PACKAGES_SOURCE_BASELINE_COMMIT && newPackagesSourcePaths.has(path)) {
        return { status: 1, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) };
      }
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(
          `${commit === PACKAGES_SOURCE_BASELINE_COMMIT ? 'source' : 'candidate'}:${path}\n`,
        ),
      };
    }
    throw new Error(`Unexpected Git operation: ${command}`);
  };

/** Creates a complete controlled package and comparator checkout seam. */
const createFullGitFixture = ({
  packagesRepository,
  skillRepository,
  transformWorkflow = (workflow) => workflow,
}) => {
  const packageFiles = new Map();
  const baselinePackageFiles = new Map();
  for (const [packageName, sourceDirectory] of Object.entries(packageSourcePaths)) {
    const manifest = createPackageManifest(packageName, true);
    const baselineManifest = createPackageManifest(packageName, false);
    manifest.dependencies = Object.fromEntries(
      Object.entries(manifest.dependencies).map(([name, version]) => [
        name,
        `workspace:${version}`,
      ]),
    );
    baselineManifest.dependencies = Object.fromEntries(
      Object.entries(baselineManifest.dependencies).map(([name, version]) => [
        name,
        `workspace:${version}`,
      ]),
    );
    packageFiles.set(
      `${sourceDirectory}/package.json`,
      Buffer.from(`${JSON.stringify(manifest)}\n`),
    );
    packageFiles.set(
      `${sourceDirectory}/README.md`,
      Buffer.from(createCandidateReadme(packageName)),
    );
    baselinePackageFiles.set(
      `${sourceDirectory}/package.json`,
      Buffer.from(`${JSON.stringify(baselineManifest)}\n`),
    );
    baselinePackageFiles.set(
      `${sourceDirectory}/README.md`,
      Buffer.from(createSourceReadme(packageName)),
    );
  }
  packageFiles.set(
    'packages/adapter-static-analysis/package.json',
    Buffer.from(
      `${JSON.stringify({
        name: '@moldea.ai/adapter-static-analysis',
        version: '0.0.0',
        engines: { node: candidateNodeRange },
      })}\n`,
    ),
  );
  baselinePackageFiles.set(
    'packages/adapter-static-analysis/package.json',
    Buffer.from(
      `${JSON.stringify({
        name: '@moldea.ai/adapter-static-analysis',
        version: '0.0.0',
        engines: { node: sourceNodeRange },
      })}\n`,
    ),
  );
  const runtimeJob = {
    strategy: {
      matrix: {
        'node-version': ['22.11.0', '22.x', '24.11.0', '24.x', '26.8.1'],
      },
    },
  };
  const workflowValue = {
    jobs: {
      'repository-testing-peer-compatibility': {
        name: 'Repository Testing Peers (Vitest ${{ matrix.vitest-version }})',
        needs: 'verify',
        'runs-on': 'ubuntu-latest',
        env: { PNPM_VERSION: '11.9.0', WEB_UTILS_KIT_VERSION: '1.3.1' },
        strategy: {
          'fail-fast': false,
          matrix: { 'vitest-version': ['1.0.0', '2.0.0', '3.2.4', '4.1.10'] },
        },
        steps: [
          {
            name: 'Checkout',
            uses: 'actions/checkout@v6',
            with: { 'persist-credentials': false },
          },
          {
            name: 'Setup pnpm',
            uses: 'pnpm/action-setup@v6',
            with: { version: '${{ env.PNPM_VERSION }}' },
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v6',
            with: { 'node-version': '${{ env.NODE_VERSION }}' },
          },
          {
            name: 'Download Public Package Artifacts',
            uses: 'actions/download-artifact@v8',
            with: {
              name: 'public-package-tarballs',
              path: '${{ runner.temp }}/public-package-tarballs',
            },
          },
          {
            name: 'Test Packed Repository Testing Peers',
            run: 'node projects/repository/scripts/testing-peer-compatibility/index.mjs "${{ runner.temp }}/public-package-tarballs" "${{ matrix.vitest-version }}"',
          },
        ],
      },
      'cli-testing-peer-compatibility': {
        name: 'CLI Existing Vitest 3.2.4 Compatibility',
        needs: 'verify',
        'runs-on': 'ubuntu-latest',
        env: { PNPM_VERSION: '11.21.0', VITEST_VERSION: '3.2.4' },
        steps: [
          {
            name: 'Checkout',
            uses: 'actions/checkout@v6',
            with: { 'persist-credentials': false },
          },
          {
            name: 'Setup pnpm',
            uses: 'pnpm/action-setup@v6',
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v6',
            with: { 'node-version': '${{ env.NODE_VERSION }}' },
          },
          {
            name: 'Download Public Package Artifacts',
            uses: 'actions/download-artifact@v8',
            with: {
              name: 'public-package-tarballs',
              path: '${{ runner.temp }}/public-package-tarballs',
            },
          },
          {
            name: 'Test Packed CLI with Existing Vitest',
            run: 'node projects/cli/scripts/testing-peer-compatibility/index.mjs "${{ runner.temp }}/public-package-tarballs" "${{ env.VITEST_VERSION }}"',
          },
        ],
      },
      'adapter-anthropic-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-claude-agent-sdk-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-cloudflare-agents-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-eve-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-google-genai-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-langchain-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-langgraph-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-openai-agents-sdk-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-openai-runtime-compatibility': structuredClone(runtimeJob),
      'adapter-vercel-ai-sdk-runtime-compatibility': structuredClone(runtimeJob),
      'cli-runtime-compatibility': structuredClone(runtimeJob),
      'repository-fs-runtime-compatibility': structuredClone(runtimeJob),
      'compatibility-bridge-packages': {
        name: 'Verify 4.0.2 Package Compatibility Bridge',
        needs: 'verify',
        if: '${{ inputs.release_build == true }}',
        'runs-on': 'ubuntu-latest',
        env: {
          PACKAGES_SOURCE_BASELINE_COMMIT,
          PACKAGES_SOURCE_BASELINE_TREE,
        },
        steps: [
          {
            name: 'Checkout Packages Candidate',
            uses: 'actions/checkout@v6',
            with: {
              'fetch-depth': 0,
              path: 'packages',
              'persist-credentials': false,
              ref: '${{ github.sha }}',
            },
          },
          {
            name: 'Checkout Frozen Skill Comparator',
            uses: 'actions/checkout@v6',
            with: {
              'fetch-depth': 0,
              path: 'skill',
              'persist-credentials': false,
              ref: skillCommit,
              repository: 'moldea-ai/skill',
            },
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v6',
            with: { 'node-version': '${{ env.NODE_VERSION }}' },
          },
          {
            name: 'Install Frozen Comparator Dependencies',
            run: 'npm --prefix skill ci --ignore-scripts',
          },
          {
            name: 'Download Public Package Artifacts',
            uses: 'actions/download-artifact@v8',
            with: {
              name: 'public-package-tarballs',
              path: '${{ runner.temp }}/public-package-tarballs',
            },
          },
          {
            name: 'Compare 4.0.2 Package Artifacts',
            run: 'npm --prefix skill run release:compatibility-bridge:check-packages -- --packages-repository "$GITHUB_WORKSPACE/packages" --artifact-directory "${{ runner.temp }}/public-package-tarballs" --packages-commit "${{ github.sha }}"',
          },
        ],
      },
    },
  };
  const baselineWorkflowValue = structuredClone(workflowValue);
  delete baselineWorkflowValue.jobs['repository-testing-peer-compatibility'];
  delete baselineWorkflowValue.jobs['cli-testing-peer-compatibility'];
  delete baselineWorkflowValue.jobs['compatibility-bridge-packages'];
  for (const jobName of Object.keys(baselineWorkflowValue.jobs)) {
    baselineWorkflowValue.jobs[jobName].strategy.matrix['node-version'].pop();
  }
  const workflow = stringify(workflowValue).replace(
    `ref: ${skillCommit}`,
    `ref: ${skillCommit} # compatibility-bridge-4.0.2 comparator`,
  );
  packageFiles.set('.github/workflows/ci.yml', Buffer.from(transformWorkflow(workflow)));
  baselinePackageFiles.set(
    '.github/workflows/ci.yml',
    Buffer.from(stringify(baselineWorkflowValue)),
  );
  packageFiles.set(
    'projects/cli/scripts/testing-peer-compatibility/index.mjs',
    Buffer.from('export const verifyCliPeers = true;\n'),
  );
  packageFiles.set(
    'projects/repository/scripts/testing-peer-compatibility/index.mjs',
    Buffer.from('export const verifyRepositoryPeers = true;\n'),
  );
  const baselineLockfile = {
    importers: { 'projects/cli': { dependencies: {} } },
  };
  const candidateLockfile = {
    importers: { 'projects/cli': { dependencies: {} } },
  };
  for (const [packageName, versions] of Object.entries(PACKAGE_VERSION_MAP)) {
    if (packageName === '@moldea.ai/cli' || packageName === '@moldea.ai/website-ui') continue;
    baselineLockfile.importers['projects/cli'].dependencies[packageName] = {
      specifier: `workspace:${versions.source}`,
      version: `link:${packageName}`,
    };
    candidateLockfile.importers['projects/cli'].dependencies[packageName] = {
      specifier: `workspace:${versions.candidate}`,
      version: `link:${packageName}`,
    };
  }
  for (const packageName of repositoryDependentPackageNames) {
    const sourceDirectory = packageSourcePaths[packageName];
    baselineLockfile.importers[sourceDirectory] = {
      dependencies: {
        '@moldea.ai/repository': {
          specifier: `workspace:${sourceRepositoryDependencyRange}`,
          version: 'link:../repository',
        },
      },
    };
    candidateLockfile.importers[sourceDirectory] = {
      dependencies: {
        '@moldea.ai/repository': {
          specifier: `workspace:${candidateRepositoryDependencyRange}`,
          version: 'link:../repository',
        },
      },
    };
  }
  for (const packageName of coreDependentPackageNames) {
    const sourceDirectory = packageSourcePaths[packageName];
    baselineLockfile.importers[sourceDirectory].dependencies['@moldea.ai/core'] = {
      specifier: `workspace:${sourceCoreDependencyRange}`,
      version: 'link:../core',
    };
    candidateLockfile.importers[sourceDirectory].dependencies['@moldea.ai/core'] = {
      specifier: `workspace:${candidateCoreDependencyRange}`,
      version: 'link:../core',
    };
  }
  baselinePackageFiles.set('pnpm-lock.yaml', Buffer.from(stringify(baselineLockfile)));
  packageFiles.set('pnpm-lock.yaml', Buffer.from(stringify(candidateLockfile)));
  for (const path of PACKAGES_402_CHANGED_PATHS) {
    if (!packageFiles.has(path)) {
      packageFiles.set(path, Buffer.from(`candidate:${path}\n`));
    }
    if (!newPackagesSourcePaths.has(path) && !baselinePackageFiles.has(path)) {
      baselinePackageFiles.set(path, Buffer.from(`source:${path}\n`));
    }
  }

  return (currentRepository, arguments_) => {
    if (resolve(currentRepository) === resolve(packagesRepository)) {
      if (arguments_[0] === 'show') {
        const separatorIndex = arguments_[1].indexOf(':');
        const commit = arguments_[1].slice(0, separatorIndex);
        const path = arguments_[1].slice(separatorIndex + 1);
        const content =
          commit === PACKAGES_SOURCE_BASELINE_COMMIT
            ? baselinePackageFiles.get(path)
            : packageFiles.get(path);
        if (content === undefined) {
          return { status: 1, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) };
        }
        return { status: 0, stderr: Buffer.alloc(0), stdout: content };
      }
      return createPackagesGit({})(currentRepository, arguments_);
    }
    if (resolve(currentRepository) === resolve(skillRepository)) {
      if (arguments_.join(' ') === 'rev-parse --verify HEAD^{commit}') {
        return {
          status: 0,
          stderr: Buffer.alloc(0),
          stdout: Buffer.from(`${skillCommit}\n`),
        };
      }
      if (arguments_[0] === 'show') {
        const path = arguments_[1].slice(`${skillCommit}:`.length);
        return {
          status: 0,
          stderr: Buffer.alloc(0),
          stdout: readFileSync(join(skillRepository, ...path.split('/'))),
        };
      }
    }
    throw new Error(`Unexpected controlled repository: ${currentRepository}`);
  };
};

/** Creates a registry fetch seam for the old artifact set. */
const createRegistryFetch = (sourceArtifacts) => {
  const responses = new Map();
  for (const [packageName, artifact] of sourceArtifacts) {
    const version = PACKAGE_VERSION_MAP[packageName].source;
    const metadataUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${version}`;
    const tarballUrl = `https://registry.npmjs.org/${packageName}/-/${artifact.archiveName}`;
    responses.set(
      metadataUrl,
      Buffer.from(
        JSON.stringify({
          name: packageName,
          version,
          dist: {
            integrity: `sha512-${createHash('sha512').update(artifact.archive).digest('base64')}`,
            shasum: createHash('sha1').update(artifact.archive).digest('hex'),
            tarball: tarballUrl,
          },
        }),
      ),
    );
    responses.set(tarballUrl, artifact.archive);
  }
  return async (url) => {
    const body = responses.get(url);
    return body === undefined
      ? new Response('Not found', { status: 404 })
      : new Response(body, { status: 200 });
  };
};

test('freezes the exact skill and packages path inventories', () => {
  assert.equal(SKILL_402_CHANGED_PATHS.length, 36);
  assert.equal(PACKAGES_402_CHANGED_PATHS.length, 65);
  assert.equal(new Set(SKILL_402_CHANGED_PATHS).size, SKILL_402_CHANGED_PATHS.length);
  assert.equal(new Set(PACKAGES_402_CHANGED_PATHS).size, PACKAGES_402_CHANGED_PATHS.length);
  assert.ok(SKILL_402_CHANGED_PATHS.includes('tests/package-manager.test-integration.mjs'));
  assert.ok(PACKAGES_402_CHANGED_PATHS.includes('projects/core/package.json'));
  assert.ok(PACKAGES_402_CHANGED_PATHS.includes('projects/repository/package.json'));
  assert.equal(
    [...SKILL_402_CHANGED_PATHS].some((path) => path.includes('*')),
    false,
  );
  assert.equal(
    [...PACKAGES_402_CHANGED_PATHS].some((path) => path.includes('*')),
    false,
  );
  assert.equal(
    createHash('sha256').update(JSON.stringify(SKILL_402_CHANGED_PATHS)).digest('hex'),
    '9e2cb8f6c9232b71b0d085e53933074cee988510a2fa6de34cd9a9c49cea6be2',
  );
  assert.equal(
    createHash('sha256').update(JSON.stringify(PACKAGES_402_CHANGED_PATHS)).digest('hex'),
    'df6a10bed3c388b4a3fe5fdfdbb6bbc32648db722435b8ca94ae25f7a474ece8',
  );
  assert.equal(
    createHash('sha256').update(JSON.stringify(PACKAGE_VERSION_MAP)).digest('hex'),
    'b9608b83497db0dc1348fc0fc29f71b2e1a6f40f6978c60f056e149f9715dda0',
  );
});

test('binds reused and changed package tags to exact ancestor manifests', () => {
  const sourceTagCommit = 'a'.repeat(40);
  const candidateTagCommit = 'b'.repeat(40);
  const candidateTags = new Set(
    Object.entries(PACKAGE_VERSION_MAP)
      .filter(([, { candidate, source }]) => candidate !== source)
      .map(
        ([packageName, { candidate }]) =>
          `${packageName.slice('@moldea.ai/'.length)}-v${candidate}`,
      ),
  );
  const executeGitCommand = (_repositoryRoot, arguments_) => {
    if (arguments_[0] === 'rev-parse') {
      const tagRef = arguments_[2];
      const tag = tagRef.slice('refs/tags/'.length, -'^{commit}'.length);
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(`${candidateTags.has(tag) ? candidateTagCommit : sourceTagCommit}\n`),
      };
    }
    if (arguments_[0] === 'merge-base') {
      return { status: 0, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) };
    }
    if (arguments_[0] === 'show') {
      const separatorIndex = arguments_[1].indexOf(':');
      const commit = arguments_[1].slice(0, separatorIndex);
      const packagePath = arguments_[1].slice(separatorIndex + 1);
      const packageName = Object.entries(packageSourcePaths).find(
        ([, sourceDirectory]) => packagePath === `${sourceDirectory}/package.json`,
      )?.[0];
      assert.notEqual(packageName, undefined);
      const versions = PACKAGE_VERSION_MAP[packageName];
      return {
        status: 0,
        stderr: Buffer.alloc(0),
        stdout: Buffer.from(
          `${JSON.stringify({
            name: packageName,
            version: commit === candidateTagCommit ? versions.candidate : versions.source,
          })}\n`,
        ),
      };
    }
    throw new Error(`Unexpected Git operation: ${arguments_.join(' ')}`);
  };

  const identity = assertPackageTags({
    executeGitCommand,
    packagesCommit: candidateCommit,
    packagesRepository: '/controlled/packages',
  });
  assert.equal(identity.source.length, Object.keys(PACKAGE_VERSION_MAP).length);
  assert.equal(identity.candidate.length, Object.keys(PACKAGE_VERSION_MAP).length);
  assert.ok(identity.source.every(({ tagCommit }) => tagCommit === sourceTagCommit));
  assert.ok(
    identity.candidate.every(({ packageName, tagCommit }) =>
      PACKAGE_VERSION_MAP[packageName].candidate === PACKAGE_VERSION_MAP[packageName].source
        ? tagCommit === sourceTagCommit
        : tagCommit === candidateTagCommit,
    ),
  );

  assert.throws(
    () =>
      assertPackageTags({
        executeGitCommand: (repositoryRoot, arguments_) =>
          arguments_[0] === 'merge-base'
            ? { status: 1, stderr: Buffer.alloc(0), stdout: Buffer.alloc(0) }
            : executeGitCommand(repositoryRoot, arguments_),
        packagesCommit: candidateCommit,
        packagesRepository: '/controlled/packages',
      }),
    /not in the verified packages release ancestry/u,
  );
  assert.throws(
    () =>
      assertPackageTags({
        executeGitCommand: (repositoryRoot, arguments_) => {
          const result = executeGitCommand(repositoryRoot, arguments_);
          return arguments_[0] === 'show'
            ? {
                ...result,
                stdout: Buffer.from(
                  `${JSON.stringify({
                    ...JSON.parse(result.stdout.toString('utf8')),
                    version: '0.0.0',
                  })}\n`,
                ),
              }
            : result;
        },
        packagesCommit: candidateCommit,
        packagesRepository: '/controlled/packages',
      }),
    /contains another package version/u,
  );
});

test('rejects packages baseline, tree, ancestry, and exact path inventory failures', () => {
  const sourceState = assertPackagesSourceState({
    executeGitCommand: createPackagesGit({}),
    packagesCommit: candidateCommit,
    packagesRepository: '/controlled/packages',
  });
  assert.deepEqual(sourceState.changedPaths, PACKAGES_402_CHANGED_PATHS);
  assert.equal(sourceState.sourceDelta.files.length, PACKAGES_402_CHANGED_PATHS.length);
  assert.match(sourceState.sourceDelta.digest, /^[a-f0-9]{64}$/u);
  assert.throws(
    () =>
      assertPackagesSourceState({
        executeGitCommand: createPackagesGit({
          baselineCommit: 'e'.repeat(40),
        }),
        packagesCommit: candidateCommit,
        packagesRepository: '/controlled/packages',
      }),
    /baseline commit changed/u,
  );
  assert.throws(
    () =>
      assertPackagesSourceState({
        executeGitCommand: createPackagesGit({ tree: 'e'.repeat(40) }),
        packagesCommit: candidateCommit,
        packagesRepository: '/controlled/packages',
      }),
    /baseline tree changed/u,
  );
  assert.throws(
    () =>
      assertPackagesSourceState({
        executeGitCommand: createPackagesGit({ ancestry: false }),
        packagesCommit: candidateCommit,
        packagesRepository: '/controlled/packages',
      }),
    /must descend/u,
  );
  assert.throws(
    () =>
      assertPackagesSourceState({
        executeGitCommand: createPackagesGit({ checkedOutCommit: 'e'.repeat(40) }),
        packagesCommit: candidateCommit,
        packagesRepository: '/controlled/packages',
      }),
    /must be checked out at the candidate commit/u,
  );
  for (const changedPaths of [
    PACKAGES_402_CHANGED_PATHS.slice(1),
    [...PACKAGES_402_CHANGED_PATHS, 'projects/repository/unexpected.ts'],
  ]) {
    assert.throws(
      () =>
        assertPackagesSourceState({
          executeGitCommand: createPackagesGit({ changedPaths }),
          packagesCommit: candidateCommit,
          packagesRepository: '/controlled/packages',
        }),
      /changed paths differ/u,
    );
  }
  assert.throws(
    () =>
      assertPackagesSourceState({
        executeGitCommand: createPackagesGit({}),
        packagesCommit: 'abc123',
        packagesRepository: '/controlled/packages',
      }),
    /full commit hash/u,
  );
});

test('permits only exact manifest, README, and unchanged tarball-byte projections', () => {
  const sourceArtifacts = createArtifactSet(false);
  const candidateArtifacts = createArtifactSet(true);
  assert.equal(comparePackageArtifactSets(sourceArtifacts, candidateArtifacts).length, 15);

  const manifestMutation = createArtifactSet(true);
  manifestMutation.get('@moldea.ai/repository').manifest.dependencies.unexpected = '1.0.0';
  assert.throws(
    () => comparePackageArtifactSets(sourceArtifacts, manifestMutation),
    /unauthorized package\.json change/u,
  );

  const repositoryFloorMutation = createArtifactSet(true);
  repositoryFloorMutation.get('@moldea.ai/adapter-openai').manifest.dependencies[
    '@moldea.ai/repository'
  ] = '^1.0.0';
  assert.throws(
    () => comparePackageArtifactSets(sourceArtifacts, repositoryFloorMutation),
    /candidate must exclude Repository 1\.1\.0/u,
  );

  const coreFloorMutation = createArtifactSet(true);
  coreFloorMutation.get('@moldea.ai/adapter-openai').manifest.dependencies['@moldea.ai/core'] =
    '^2.0.0';
  assert.throws(
    () => comparePackageArtifactSets(sourceArtifacts, coreFloorMutation),
    /candidate must exclude Core releases before 2\.0\.2/u,
  );

  const coreReadmeMutation = createArtifactSet(true);
  const coreReadme = coreReadmeMutation
    .get('@moldea.ai/adapter-openai')
    .entries.get('package/README.md');
  coreReadme.content = Buffer.from(
    coreReadme.content
      .toString('utf8')
      .replace(candidateCoreDependencyRange, sourceCoreDependencyRange),
  );
  assert.throws(
    () => comparePackageArtifactSets(sourceArtifacts, coreReadmeMutation),
    /README contains an unauthorized change/u,
  );

  const readmeMutation = createArtifactSet(true);
  readmeMutation.get('@moldea.ai/repository').entries.get('package/README.md').content =
    Buffer.from('broader unreviewed prose\n');
  assert.throws(
    () => comparePackageArtifactSets(sourceArtifacts, readmeMutation),
    /README contains an unauthorized change/u,
  );

  const byteMutation = createArtifactSet(true);
  byteMutation.get('@moldea.ai/core').entries.get('package/dist/index.js').content = Buffer.from(
    'export const drift = true;\n',
  );
  assert.throws(
    () => comparePackageArtifactSets(sourceArtifacts, byteMutation),
    /dist\/index\.js bytes changed/u,
  );
});

test('rejects truncated and trailing package archive bytes', () => {
  const archive = createArchive([
    ['package/package.json', JSON.stringify({ name: 'fixture', version: '1.0.0' })],
  ]);
  const tar = gunzipSync(archive);
  assert.throws(
    () => readPackageArchive(gzipSync(tar.subarray(0, -1024))),
    /lacks its USTAR end marker/u,
  );
  assert.throws(
    () => readPackageArchive(gzipSync(Buffer.concat([tar, Buffer.from('unexpected')]))),
    /complete USTAR blocks/u,
  );
});

test('loads only the exact checksummed candidate artifact set', () => {
  const artifactDirectory = createTemporaryDirectory('moldea-bridge-artifacts-');
  writeCandidateArtifacts(artifactDirectory, createArtifactSet(true));
  assert.equal(loadCandidatePackageArtifacts(artifactDirectory).size, 15);
  writeFileSync(join(artifactDirectory, 'unexpected.tgz'), Buffer.from('unexpected'));
  assert.throws(() => loadCandidatePackageArtifacts(artifactDirectory), /unexpected file set/u);
});

test('freezes the no-model runtime import closure and exact command surface', () => {
  const closure = createRuntimeImportClosure(repositoryRoot);
  assert.deepEqual(
    closure.map(({ path }) => path),
    [
      'tooling/release-identity/compatibility-bridge-4-0-2.mjs',
      'tooling/release-identity/compatibility.mjs',
    ],
  );
  const surface = createFrozenCompatibilitySurface(repositoryRoot);
  assert.equal(surface.files.length, 4);
  assert.equal(surface.runtimeImportClosure.length, 2);

  const mutatedRoot = createTemporaryDirectory('moldea-bridge-import-');
  for (const path of [
    'tooling/release-identity/compatibility-bridge-4-0-2.mjs',
    'tooling/release-identity/compatibility.mjs',
  ]) {
    const destination = join(mutatedRoot, ...path.split('/'));
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repositoryRoot, ...path.split('/')), destination);
  }
  const bridgePath = join(mutatedRoot, 'tooling/release-identity/compatibility-bridge-4-0-2.mjs');
  writeFileSync(
    bridgePath,
    `${readFileSync(bridgePath, 'utf8')}\nimport '../../tests/semantic-evaluation-runner.mjs';\n`,
  );
  assert.throws(() => createRuntimeImportClosure(mutatedRoot), /imports prohibited module/u);
});

test('rejects behavior changes outside the exact portable compatibility projection', () => {
  const skillPath = 'moldea/SKILL.md';
  const localToolingPath = 'moldea/references/local-tooling.md';
  const syntheticCliPath = 'fixtures/tooling/semantic-cli/bin/moldea.js';
  const sourceSkill = Buffer.from(`version: '4.0.1'

Skill release \`4.0.1\` supports exactly:

- \`@moldea.ai/cli: 5.0.0\`
- CLI JSON schema: \`2\`
- Node.js: \`^22.11.0 || ^24.11.0\`
- npm: \`>=10.9.0 <12.0.0\`
- pnpm: \`>=11.20.0 <12.0.0\`
- yarn: \`>=4.0.0 <5.0.0\`

CLI \`5.0.0\`
`);
  const sourceLocalTooling = Buffer.from(`Release \`4.0.1\`
Node.js \`^22.11.0 || ^24.11.0\`
npm \`>=10.9.0 <12.0.0\`
pnpm \`>=11.20.0 <12.0.0\`
Yarn \`>=4.0.0 <5.0.0\`
For Yarn 4,
CLI 5.0.0
`);
  const sourceSyntheticCli = Buffer.from("const supportedNodeRange: '^22.11.0 || ^24.11.0';\n");
  const candidateSkill = Buffer.from(
    sourceSkill
      .toString('utf8')
      .replace("version: '4.0.1'", "version: '4.0.2'")
      .replace(
        `Skill release \`4.0.1\` supports exactly:

- \`@moldea.ai/cli: 5.0.0\`
- CLI JSON schema: \`2\`
- Node.js: \`^22.11.0 || ^24.11.0\`
- npm: \`>=10.9.0 <12.0.0\`
- pnpm: \`>=11.20.0 <12.0.0\`
- yarn: \`>=4.0.0 <5.0.0\``,
        `Skill release \`4.0.2\` supports exactly:

- \`@moldea.ai/cli: 5.0.3\`
- CLI JSON schema: \`2\`
- Node.js: \`>=22.11.0\`
- npm: \`>=7.0.0\`
- pnpm: \`>=8.3.1\`
- yarn: \`>=4.14.1\``,
      )
      .replace('CLI `5.0.0`', 'CLI `5.0.3`'),
  );
  const candidateLocalTooling = Buffer.from(
    sourceLocalTooling
      .toString('utf8')
      .replaceAll('4.0.1', '4.0.2')
      .replace('^22.11.0 || ^24.11.0', '>=22.11.0')
      .replace('>=10.9.0 <12.0.0', '>=7.0.0')
      .replace('>=11.20.0 <12.0.0', '>=8.3.1')
      .replace('>=4.0.0 <5.0.0', '>=4.14.1')
      .replace('For Yarn 4,', 'For supported Yarn releases at or above 4,')
      .replaceAll('5.0.0', '5.0.3'),
  );
  const candidateSyntheticCli = Buffer.from(
    sourceSyntheticCli
      .toString('utf8')
      .replace("supportedNodeRange: '^22.11.0 || ^24.11.0'", "supportedNodeRange: '>=22.11.0'"),
  );
  const sourceFiles = new Map([
    [skillPath, sourceSkill],
    [localToolingPath, sourceLocalTooling],
    [syntheticCliPath, sourceSyntheticCli],
  ]);
  const candidateFiles = new Map([
    [skillPath, candidateSkill],
    [localToolingPath, candidateLocalTooling],
    [syntheticCliPath, candidateSyntheticCli],
  ]);
  assert.equal(compareSkillCompatibilityFiles(sourceFiles, candidateFiles).files.length, 3);
  candidateFiles.set(
    skillPath,
    Buffer.concat([candidateSkill, Buffer.from('\nBehavior drift.\n')]),
  );
  assert.throws(
    () => compareSkillCompatibilityFiles(sourceFiles, candidateFiles),
    /unauthorized behavior-bearing change/u,
  );
});

test('accepts absent non-closure packages and requires registry lockfile tarball names', () => {
  const sourceLockfile = {
    version: '4.0.1',
    packages: {
      '': {
        version: '4.0.1',
        engines: { node: sourceNodeRange },
        devDependencies: { '@moldea.ai/cli': '5.0.0' },
      },
      'node_modules/@moldea.ai/repository': {
        version: '1.1.0',
        resolved: 'https://registry.npmjs.org/@moldea.ai/repository/-/repository-1.1.0.tgz',
        integrity: 'source-integrity',
        peerDependencies: { vitest: '4.1.10', 'web-utils-kit': '1.3.1' },
      },
    },
  };
  const candidateLockfile = structuredClone(sourceLockfile);
  candidateLockfile.version = '4.0.2';
  candidateLockfile.packages[''].version = '4.0.2';
  candidateLockfile.packages[''].engines.node = candidateNodeRange;
  candidateLockfile.packages[''].devDependencies['@moldea.ai/cli'] = '5.0.3';
  const repository = candidateLockfile.packages['node_modules/@moldea.ai/repository'];
  repository.version = '1.1.1';
  repository.resolved = 'https://registry.npmjs.org/@moldea.ai/repository/-/repository-1.1.1.tgz';
  repository.integrity = 'candidate-integrity';
  repository.peerDependencies = { vitest: '>=1.0.0', 'web-utils-kit': '>=1.3.1' };
  assert.doesNotThrow(() => compareSkillPackageLocks(sourceLockfile, candidateLockfile));

  const invalidTarballLockfile = structuredClone(candidateLockfile);
  invalidTarballLockfile.packages['node_modules/@moldea.ai/repository'].resolved =
    'https://registry.npmjs.org/@moldea.ai/repository/-/moldea.ai-repository-1.1.1.tgz';
  assert.throws(
    () => compareSkillPackageLocks(sourceLockfile, invalidTarballLockfile),
    /repository-1\.1\.1\.tgz/u,
  );

  const unexpectedPackageLockfile = structuredClone(candidateLockfile);
  unexpectedPackageLockfile.packages['node_modules/@moldea.ai/website-ui'] = {
    version: '1.2.2',
  };
  assert.throws(
    () => compareSkillPackageLocks(sourceLockfile, unexpectedPackageLockfile),
    /unexpectedly entered the skill lockfile/u,
  );
});

test('runs the complete package-only comparison without writing an attestation', async () => {
  const fixtureRoot = createTemporaryDirectory('moldea-bridge-check-');
  const packagesRepository = join(fixtureRoot, 'packages');
  const skillRepository = join(fixtureRoot, 'skill');
  const artifactDirectory = join(fixtureRoot, 'artifacts');
  mkdirSync(packagesRepository, { recursive: true });
  for (const path of [
    'tooling/release-identity/compatibility-bridge-4-0-2.d.mts',
    'tooling/release-identity/compatibility-bridge-4-0-2.mjs',
    'tooling/release-identity/compatibility.d.mts',
    'tooling/release-identity/compatibility.mjs',
  ]) {
    const destination = join(skillRepository, ...path.split('/'));
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repositoryRoot, ...path.split('/')), destination);
  }
  writeFileSync(
    join(skillRepository, 'package.json'),
    `${JSON.stringify({
      scripts: {
        'release:compatibility-bridge:check-packages':
          'node --experimental-strip-types tooling/release-identity/compatibility-bridge-4-0-2.mjs --check-packages',
        'release:compatibility-bridge:write':
          'node --experimental-strip-types tooling/release-identity/compatibility-bridge-4-0-2.mjs --write',
      },
    })}\n`,
  );
  const sourceArtifacts = createArtifactSet(false);
  const candidateArtifacts = createArtifactSet(true);
  writeCandidateArtifacts(artifactDirectory, candidateArtifacts);
  const sentinelMarker = join(fixtureRoot, 'model-command-invoked');
  const sentinelScript = join(fixtureRoot, 'model-sentinel.mjs');
  writeFileSync(
    sentinelScript,
    `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(sentinelMarker)}, 'invoked');\nprocess.exitCode = 1;\n`,
  );
  const codexSentinel = join(fixtureRoot, process.platform === 'win32' ? 'codex.cmd' : 'codex');
  writeFileSync(
    codexSentinel,
    process.platform === 'win32'
      ? `@"${process.execPath}" "${sentinelScript}"\r\n`
      : `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(sentinelMarker)}, 'invoked');\nprocess.exitCode = 1;\n`,
  );
  if (process.platform !== 'win32') chmodSync(codexSentinel, 0o755);
  const originalEnvironment = {
    actor: process.env.MOLDEA_EVAL_ACTOR_COMMAND_JSON,
    judge: process.env.MOLDEA_EVAL_JUDGE_COMMAND_JSON,
    path: process.env.PATH,
  };
  process.env.MOLDEA_EVAL_ACTOR_COMMAND_JSON = JSON.stringify([process.execPath, sentinelScript]);
  process.env.MOLDEA_EVAL_JUDGE_COMMAND_JSON = JSON.stringify([process.execPath, sentinelScript]);
  process.env.PATH = `${fixtureRoot}${process.platform === 'win32' ? ';' : ':'}${originalEnvironment.path ?? ''}`;
  let result;
  try {
    result = await checkCompatibilityBridgePackages({
      artifactDirectory,
      executeGitCommand: createFullGitFixture({
        packagesRepository,
        skillRepository,
      }),
      fetchResource: createRegistryFetch(sourceArtifacts),
      packagesCommit: candidateCommit,
      packagesRepository,
      repositoryRoot: skillRepository,
    });
  } finally {
    if (originalEnvironment.actor === undefined) delete process.env.MOLDEA_EVAL_ACTOR_COMMAND_JSON;
    else process.env.MOLDEA_EVAL_ACTOR_COMMAND_JSON = originalEnvironment.actor;
    if (originalEnvironment.judge === undefined) delete process.env.MOLDEA_EVAL_JUDGE_COMMAND_JSON;
    else process.env.MOLDEA_EVAL_JUDGE_COMMAND_JSON = originalEnvironment.judge;
    process.env.PATH = originalEnvironment.path;
  }
  assert.equal(result.packageDigests.length, 15);
  assert.equal(result.comparatorCommit, skillCommit);
  assert.equal(existsSync(sentinelMarker), false);
  assert.equal(
    existsSync(join(skillRepository, 'fixtures/release-evidence/compatibility-bridge-4.0.2.json')),
    false,
  );
  for (const transformWorkflow of [
    (workflow) => workflow.replace('4.1.10', '4.2.0'),
    (workflow) =>
      workflow.replace(
        'node projects/repository/scripts/testing-peer-compatibility/index.mjs',
        'echo node projects/repository/scripts/testing-peer-compatibility/index.mjs',
      ),
    (workflow) =>
      workflow.replace(
        'npm --prefix skill run release:compatibility-bridge:check-packages',
        'echo release:compatibility-bridge:check-packages',
      ),
    (workflow) => `${workflow}\npermissions: write-all\n`,
  ]) {
    await assert.rejects(
      checkCompatibilityBridgePackages({
        artifactDirectory,
        executeGitCommand: createFullGitFixture({
          packagesRepository,
          skillRepository,
          transformWorkflow,
        }),
        fetchResource: createRegistryFetch(sourceArtifacts),
        packagesCommit: candidateCommit,
        packagesRepository,
        repositoryRoot: skillRepository,
      }),
    );
  }
});

test('refuses final write mode while the explicit skill contract is not 4.0.2', async () => {
  const skillRepository = createTemporaryDirectory('moldea-bridge-write-');
  writeFileSync(join(skillRepository, 'package.json'), '{"version":"4.0.1"}\n');
  await assert.rejects(
    writeCompatibilityBridge402Attestation({
      packagesCommit: candidateCommit,
      packagesRepository: '/controlled/packages',
      repositoryRoot: skillRepository,
    }),
  );
  assert.equal(
    existsSync(join(skillRepository, 'fixtures/release-evidence/compatibility-bridge-4.0.2.json')),
    false,
  );
});
