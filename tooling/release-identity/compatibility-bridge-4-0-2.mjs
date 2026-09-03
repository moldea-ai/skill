#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { parseDocument } from 'yaml';

import {
  assertCompatibility402Expansion,
  assertRepositoryCompatibility,
  COMPATIBILITY_401,
  COMPATIBILITY_402,
  isCompatibilityVersionSupported,
} from './compatibility.mjs';

export const COMPATIBILITY_BRIDGE_402_PATH =
  'fixtures/release-evidence/compatibility-bridge-4.0.2.json';
export const COMPATIBILITY_BRIDGE_402_SCHEMA_VERSION = 1;
export const SKILL_400_COMMIT = 'fcbc34f60b12b1b66cd9ebb28b1865979a259429';
export const SKILL_401_COMMIT = 'a2ae5a618e9610dfc169894f462d02954a0f557f';
export const PACKAGES_SOURCE_BASELINE_COMMIT = '9fa7a2ba4d3455b6310a62ece172571ab473f745';
export const PACKAGES_SOURCE_BASELINE_TREE = '9eba53f4f54185432b04a4f9a4fac44543b5d24b';

const CHECK_PACKAGES_SCRIPT =
  'node --experimental-strip-types tooling/release-identity/compatibility-bridge-4-0-2.mjs --check-packages';
const WRITE_SCRIPT =
  'node --experimental-strip-types tooling/release-identity/compatibility-bridge-4-0-2.mjs --write';
const CHECKSUM_FILE_NAME = 'SHA256SUMS';
const CLI_PACKAGE_NAME = '@moldea.ai/cli';
const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const MAXIMUM_GIT_OUTPUT_BYTES = 128 * 1024 * 1024;
const MAXIMUM_PACKAGE_ARCHIVE_BYTES = 64 * 1024 * 1024;
const MAXIMUM_UNPACKED_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAXIMUM_REGISTRY_RESPONSE_BYTES = 64 * 1024 * 1024;
const REGISTRY_REQUEST_TIMEOUT_MS = 300_000;
const SOURCE_NODE_RANGE = '^22.11.0 || ^24.11.0';
const CANDIDATE_NODE_RANGE = '>=22.11.0';
const SOURCE_REPOSITORY_DEPENDENCY_RANGE = '^1.0.0';
const CANDIDATE_REPOSITORY_DEPENDENCY_RANGE = '>=1.1.1';
const PROHIBITED_IMPORT_PATHS = [
  'tests/semantic-evaluation-runner.mjs',
  'tooling/semantic-evaluation/',
  'tooling/codex-evaluation-host/',
  'qualification/src/bin/',
  'qualification/src/execution/executor.ts',
  'qualification/src/execution/model-stages.ts',
];
const RUNTIME_COMPATIBILITY_JOB_NAMES = [
  'adapter-anthropic-runtime-compatibility',
  'adapter-claude-agent-sdk-runtime-compatibility',
  'adapter-cloudflare-agents-runtime-compatibility',
  'adapter-eve-runtime-compatibility',
  'adapter-google-genai-runtime-compatibility',
  'adapter-langchain-runtime-compatibility',
  'adapter-langgraph-runtime-compatibility',
  'adapter-openai-agents-sdk-runtime-compatibility',
  'adapter-openai-runtime-compatibility',
  'adapter-vercel-ai-sdk-runtime-compatibility',
  'cli-runtime-compatibility',
  'repository-fs-runtime-compatibility',
];
const FROZEN_MODULE_PATHS = [
  'tooling/release-identity/compatibility-bridge-4-0-2.d.mts',
  'tooling/release-identity/compatibility-bridge-4-0-2.mjs',
  'tooling/release-identity/compatibility.d.mts',
  'tooling/release-identity/compatibility.mjs',
];
const CARRY_FORWARD_401_FILES = Object.freeze({
  'fixtures/release-evidence/carry-forward-4.0.1.json':
    '694d0dad310c7162d576e1a401e01287144d0a5cabc6d7fcb4b9de4312be7ed4',
  'tooling/release-identity/carry-forward-4-0-1.d.mts':
    'd2bc0195267d66b6f49d9ecef514a0e5f42e9deb2cecc0dbab21d705faa9c1cd',
  'tooling/release-identity/carry-forward-4-0-1.mjs':
    '05a3542e54a763d299849862f2de7e9571afdba75bc9ad155a6e737a07465a6d',
  'tooling/release-identity/carry-forward-4-0-1.test-integration.mjs':
    'a01abd5ad614069d6081ac28b6f4e4208fa970e5df2af4b77b1592d9a04bac93',
});
const NEW_PACKAGES_SOURCE_PATHS = new Set([
  'projects/cli/scripts/testing-peer-compatibility/index.mjs',
  'projects/repository/scripts/testing-peer-compatibility/index.mjs',
]);
const NEW_SKILL_SOURCE_PATHS = new Set([
  COMPATIBILITY_BRIDGE_402_PATH,
  'tooling/release-identity/compatibility-bridge-4-0-2.d.mts',
  'tooling/release-identity/compatibility-bridge-4-0-2.mjs',
  'tooling/release-identity/compatibility-bridge-4-0-2.test-integration.mjs',
  'tooling/release-identity/compatibility.d.mts',
  'tooling/release-identity/compatibility.mjs',
  'tooling/release-identity/compatibility.test-unit.mjs',
]);

// exact source inventory authorized for the final skill 4.0.2 release
export const SKILL_402_CHANGED_PATHS = Object.freeze(
  [
    '.github/workflows/conformance.yml',
    '.github/workflows/release-candidate.yml',
    'README.md',
    'docs/adapter-qualification.md',
    'docs/compatibility-and-local-tooling.md',
    'docs/getting-started.md',
    'docs/semantic-evaluation.md',
    'fixtures/conformance-cases.json',
    'fixtures/release-evidence/compatibility-bridge-4.0.2.json',
    'fixtures/semantic-evaluation-results/README.md',
    'fixtures/tooling/semantic-cli/bin/moldea.js',
    'fixtures/tooling/semantic-cli/package.json',
    'moldea/SKILL.md',
    'moldea/references/local-tooling.md',
    'package-lock.json',
    'package.json',
    'qualification/README.md',
    'qualification/src/baseline/baseline.test-integration.ts',
    'qualification/src/baseline/baseline.ts',
    'tests/conformance.test-unit.mjs',
    'tests/package-manager.test-integration.mjs',
    'tooling/release-identity/compatibility-bridge-4-0-2.d.mts',
    'tooling/release-identity/compatibility-bridge-4-0-2.mjs',
    'tooling/release-identity/compatibility-bridge-4-0-2.test-integration.mjs',
    'tooling/release-identity/compatibility.d.mts',
    'tooling/release-identity/compatibility.mjs',
    'tooling/release-identity/compatibility.test-unit.mjs',
    'tooling/release-identity/evidence.mjs',
    'tooling/release-identity/evidence.test-integration.mjs',
    'tooling/release-identity/historical-semantic.d.mts',
    'tooling/release-identity/historical-semantic.mjs',
    'tooling/release-identity/index.mjs',
    'website/README.md',
    'website/src/lib/generation/generation.test-unit.ts',
    'website/src/lib/semantic-evaluation/compatibility.test-integration.ts',
    'website/src/lib/semantic-evaluation/compatibility.ts',
  ].sort((left, right) => left.localeCompare(right, 'en')),
);

// exact source inventory authorized for the coordinated package release
export const PACKAGES_402_CHANGED_PATHS = Object.freeze(
  [
    '.github/workflows/ci.yml',
    'README.md',
    'docs/npm-releases.md',
    'packages/adapter-static-analysis/package.json',
    'pnpm-lock.yaml',
    'projects/adapter-anthropic/README.md',
    'projects/adapter-anthropic/package.json',
    'projects/adapter-anthropic/src/index.test-integration.ts',
    'projects/adapter-claude-agent-sdk/README.md',
    'projects/adapter-claude-agent-sdk/package.json',
    'projects/adapter-claude-agent-sdk/src/index.test-integration.ts',
    'projects/adapter-cloudflare-agents/README.md',
    'projects/adapter-cloudflare-agents/package.json',
    'projects/adapter-cloudflare-agents/src/index.test-integration.ts',
    'projects/adapter-eve/README.md',
    'projects/adapter-eve/docs/verified-target.md',
    'projects/adapter-eve/package.json',
    'projects/adapter-eve/src/index.test-integration.ts',
    'projects/adapter-google-genai/README.md',
    'projects/adapter-google-genai/package.json',
    'projects/adapter-google-genai/src/index.test-integration.ts',
    'projects/adapter-langchain/README.md',
    'projects/adapter-langchain/docs/verified-target.md',
    'projects/adapter-langchain/package.json',
    'projects/adapter-langchain/src/index.test-integration.ts',
    'projects/adapter-langchain/src/inspection/inspection.test-integration.ts',
    'projects/adapter-langchain/src/package-discovery/index.test-unit.ts',
    'projects/adapter-langgraph/README.md',
    'projects/adapter-langgraph/docs/verified-target.md',
    'projects/adapter-langgraph/package.json',
    'projects/adapter-langgraph/src/index.test-integration.ts',
    'projects/adapter-langgraph/src/package-discovery/index.test-unit.ts',
    'projects/adapter-openai-agents-sdk/README.md',
    'projects/adapter-openai-agents-sdk/package.json',
    'projects/adapter-openai-agents-sdk/src/index.test-integration.ts',
    'projects/adapter-openai/README.md',
    'projects/adapter-openai/package.json',
    'projects/adapter-openai/src/index.test-integration.ts',
    'projects/adapter-vercel-ai-sdk/README.md',
    'projects/adapter-vercel-ai-sdk/package.json',
    'projects/adapter-vercel-ai-sdk/src/index.test-integration.ts',
    'projects/cli/README.md',
    'projects/cli/docs/commands.md',
    'projects/cli/package.json',
    'projects/cli/scripts/runtime-compatibility/index.mjs',
    'projects/cli/scripts/testing-peer-compatibility/index.mjs',
    'projects/cli/src/bin/index.test-e2e.ts',
    'projects/cli/src/bin/index.test-fixtures.ts',
    'projects/cli/src/cli-execution/command-executor.test-unit.ts',
    'projects/cli/src/cli-execution/runner.test-unit.ts',
    'projects/cli/src/composition/composition.test-fixtures.ts',
    'projects/cli/src/composition/transformers.test-unit.ts',
    'projects/cli/src/package-metadata/loader.test-integration.ts',
    'projects/cli/src/presentation/formatters.test-unit.ts',
    'projects/core/package.json',
    'projects/core/src/index.test-integration.ts',
    'projects/repository-fs/README.md',
    'projects/repository-fs/docs/security-and-limits.md',
    'projects/repository-fs/package.json',
    'projects/repository-fs/src/index.test-integration.ts',
    'projects/repository/README.md',
    'projects/repository/package.json',
    'projects/repository/scripts/testing-peer-compatibility/index.mjs',
    'projects/repository/src/index.test-integration.ts',
    'scripts/runtime-compatibility/implementation-validations.test-unit.ts',
  ].sort((left, right) => left.localeCompare(right, 'en')),
);

// immutable package identities compared by the release-specific bridge
export const PACKAGE_VERSION_MAP = Object.freeze({
  '@moldea.ai/adapter-anthropic': Object.freeze({
    source: '2.0.3',
    candidate: '2.0.5',
  }),
  '@moldea.ai/adapter-claude-agent-sdk': Object.freeze({
    source: '1.0.2',
    candidate: '1.0.4',
  }),
  '@moldea.ai/adapter-cloudflare-agents': Object.freeze({
    source: '1.0.2',
    candidate: '1.0.4',
  }),
  '@moldea.ai/adapter-eve': Object.freeze({
    source: '1.0.2',
    candidate: '1.0.4',
  }),
  '@moldea.ai/adapter-google-genai': Object.freeze({
    source: '1.0.5',
    candidate: '1.0.7',
  }),
  '@moldea.ai/adapter-langchain': Object.freeze({
    source: '1.0.2',
    candidate: '1.0.4',
  }),
  '@moldea.ai/adapter-langgraph': Object.freeze({
    source: '1.0.2',
    candidate: '1.0.4',
  }),
  '@moldea.ai/adapter-openai': Object.freeze({
    source: '2.0.6',
    candidate: '2.0.8',
  }),
  '@moldea.ai/adapter-openai-agents-sdk': Object.freeze({
    source: '1.0.4',
    candidate: '1.0.6',
  }),
  '@moldea.ai/adapter-vercel-ai-sdk': Object.freeze({
    source: '1.0.2',
    candidate: '1.0.4',
  }),
  '@moldea.ai/cli': Object.freeze({ source: '5.0.0', candidate: '5.0.2' }),
  '@moldea.ai/core': Object.freeze({ source: '2.0.1', candidate: '2.0.2' }),
  '@moldea.ai/repository': Object.freeze({
    source: '1.1.0',
    candidate: '1.1.1',
  }),
  '@moldea.ai/repository-fs': Object.freeze({
    source: '1.0.4',
    candidate: '1.0.6',
  }),
  '@moldea.ai/website-ui': Object.freeze({
    source: '1.2.2',
    candidate: '1.2.2',
  }),
});

const PACKAGE_SOURCE_PATHS = Object.freeze({
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
});
const PACKAGE_TAG_PREFIXES = Object.freeze({
  '@moldea.ai/adapter-anthropic': 'adapter-anthropic-v',
  '@moldea.ai/adapter-claude-agent-sdk': 'adapter-claude-agent-sdk-v',
  '@moldea.ai/adapter-cloudflare-agents': 'adapter-cloudflare-agents-v',
  '@moldea.ai/adapter-eve': 'adapter-eve-v',
  '@moldea.ai/adapter-google-genai': 'adapter-google-genai-v',
  '@moldea.ai/adapter-langchain': 'adapter-langchain-v',
  '@moldea.ai/adapter-langgraph': 'adapter-langgraph-v',
  '@moldea.ai/adapter-openai': 'adapter-openai-v',
  '@moldea.ai/adapter-openai-agents-sdk': 'adapter-openai-agents-sdk-v',
  '@moldea.ai/adapter-vercel-ai-sdk': 'adapter-vercel-ai-sdk-v',
  '@moldea.ai/cli': 'cli-v',
  '@moldea.ai/core': 'core-v',
  '@moldea.ai/repository': 'repository-v',
  '@moldea.ai/repository-fs': 'repository-fs-v',
  '@moldea.ai/website-ui': 'website-ui-v',
});
const NODE_BOUND_PACKAGE_NAMES = new Set(
  Object.keys(PACKAGE_VERSION_MAP).filter(
    (packageName) =>
      packageName !== '@moldea.ai/core' &&
      packageName !== '@moldea.ai/repository' &&
      packageName !== '@moldea.ai/website-ui',
  ),
);
const REPOSITORY_DEPENDENT_PACKAGE_NAMES = new Set(
  Object.keys(PACKAGE_VERSION_MAP).filter(
    (packageName) =>
      packageName !== CLI_PACKAGE_NAME &&
      packageName !== '@moldea.ai/repository' &&
      packageName !== '@moldea.ai/website-ui',
  ),
);
const COMPATIBILITY_DECISION_VERSIONS = Object.freeze({
  nodeRange: ['22.10.9', '22.11.0', '23.0.0', '24.11.0', '25.0.0', '26.8.1', '999.0.0'],
  npmRange: ['6.14.18', '7.0.0', '8.0.0', '9.0.0', '10.9.0', '11.19.0', '12.0.2', '999.0.0'],
  pnpmRange: ['8.3.0', '8.3.1', '9.0.0', '10.0.0', '11.20.0', '11.21.0', '12.3.1', '999.0.0'],
  yarnRange: ['4.14.0', '4.14.1', '4.18.0', '5.0.0', '999.0.0'],
});

/** Calculates one lower-case SHA-256 digest. */
const sha256 = (input) => createHash('sha256').update(input).digest('hex');

/** Records reproducible old-to-new compatibility decisions for boundary versions. */
const createCompatibilityDecisionIdentity = () => {
  const decisions = [];
  for (const [fieldName, versions] of Object.entries(COMPATIBILITY_DECISION_VERSIONS)) {
    for (const version of versions) {
      const sourceDeclared = isCompatibilityVersionSupported(COMPATIBILITY_401[fieldName], version);
      const sourceApplicable =
        sourceDeclared &&
        (fieldName !== 'yarnRange' || isCompatibilityVersionSupported('>=4.14.1', version));
      const candidate = isCompatibilityVersionSupported(COMPATIBILITY_402[fieldName], version);
      if (sourceApplicable) {
        assert.equal(candidate, true, `${fieldName} ${version} lost prior applicable support.`);
      }
      decisions.push({
        candidate,
        fieldName,
        sourceApplicable,
        sourceDeclared,
        version,
      });
    }
  }
  return { decisions, digest: sha256(`${JSON.stringify(decisions)}\n`) };
};

/** Converts one package identity to the canonical pnpm/npm tarball filename. */
const createTarballName = (packageName, version) =>
  `${packageName.slice(1).replace('/', '-')}-${version}.tgz`;

/** Converts one package identity to the npm registry tarball basename. */
const createRegistryTarballName = (packageName, version) =>
  `${packageName.slice(packageName.lastIndexOf('/') + 1)}-${version}.tgz`;

/** Runs Git without a shell and returns its bounded process result. */
const executeGit = (repositoryRoot, args) => {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'buffer',
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_OPTIONAL_LOCKS: '0',
    },
    maxBuffer: MAXIMUM_GIT_OUTPUT_BYTES,
    shell: false,
  });
  if (result.error) throw result.error;
  return {
    status: result.status,
    stderr: result.stderr ?? Buffer.alloc(0),
    stdout: result.stdout ?? Buffer.alloc(0),
  };
};

/** Requires one successful Git operation and returns its output. */
const requireGit = (runGit, repositoryRoot, args, context) => {
  const result = runGit(repositoryRoot, args);
  if (result.status !== 0) {
    throw new Error(`${context}: ${result.stderr.toString('utf8').trim()}`);
  }
  return result.stdout;
};

/** Parses a NUL-delimited path inventory without accepting empty records. */
const parseNulPaths = (output) => {
  if (output.length === 0) return [];
  assert.equal(output.at(-1), 0, 'Git path output must end with NUL.');
  const paths = output
    .subarray(0, -1)
    .toString('utf8')
    .split('\0')
    .sort((left, right) => left.localeCompare(right, 'en'));
  assert.equal(new Set(paths).size, paths.length, 'Git returned duplicate changed paths.');
  return paths;
};

/** Proves the frozen packages baseline, candidate ancestry, cleanliness, and path delta. */
export const assertPackagesSourceState = ({
  executeGitCommand = executeGit,
  packagesCommit,
  packagesRepository,
}) => {
  assert.match(
    packagesCommit,
    COMMIT_PATTERN,
    'The packages candidate must be a full commit hash.',
  );
  const repositoryRoot = resolve(packagesRepository);
  const baselineCommit = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['rev-parse', '--verify', `${PACKAGES_SOURCE_BASELINE_COMMIT}^{commit}`],
    'The immutable packages baseline commit is unavailable',
  )
    .toString('utf8')
    .trim();
  assert.equal(
    baselineCommit,
    PACKAGES_SOURCE_BASELINE_COMMIT,
    'The packages baseline commit changed.',
  );
  const baselineTree = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['rev-parse', '--verify', `${PACKAGES_SOURCE_BASELINE_COMMIT}^{tree}`],
    'The immutable packages baseline tree is unavailable',
  )
    .toString('utf8')
    .trim();
  assert.equal(baselineTree, PACKAGES_SOURCE_BASELINE_TREE, 'The packages baseline tree changed.');
  const candidateCommit = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['rev-parse', '--verify', `${packagesCommit}^{commit}`],
    'The packages candidate commit is unavailable',
  )
    .toString('utf8')
    .trim();
  assert.equal(candidateCommit, packagesCommit);
  const checkedOutCommit = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['rev-parse', '--verify', 'HEAD^{commit}'],
    'Unable to resolve the checked-out packages commit',
  )
    .toString('utf8')
    .trim();
  assert.equal(
    checkedOutCommit,
    packagesCommit,
    'The packages worktree must be checked out at the candidate commit.',
  );

  const ancestry = executeGitCommand(repositoryRoot, [
    'merge-base',
    '--is-ancestor',
    PACKAGES_SOURCE_BASELINE_COMMIT,
    packagesCommit,
  ]);
  assert.equal(ancestry.status, 0, 'The packages candidate must descend from the frozen baseline.');
  const changedPaths = parseNulPaths(
    requireGit(
      executeGitCommand,
      repositoryRoot,
      [
        'diff',
        '--name-only',
        '-z',
        '--no-renames',
        PACKAGES_SOURCE_BASELINE_COMMIT,
        packagesCommit,
        '--',
      ],
      'Unable to derive the packages source inventory',
    ),
  );
  assert.deepEqual(changedPaths, PACKAGES_402_CHANGED_PATHS, 'Packages changed paths differ.');
  const deletedPaths = parseNulPaths(
    requireGit(
      executeGitCommand,
      repositoryRoot,
      [
        'diff',
        '--diff-filter=D',
        '--name-only',
        '-z',
        '--no-renames',
        PACKAGES_SOURCE_BASELINE_COMMIT,
        packagesCommit,
        '--',
      ],
      'Unable to inspect deleted packages paths',
    ),
  );
  assert.deepEqual(deletedPaths, [], 'The package release must not delete source paths.');
  const status = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none'],
    'Unable to inspect the packages worktree',
  );
  assert.equal(status.length, 0, 'The packages worktree must be clean.');
  const sourceDelta = createSourceDeltaIdentity({
    baselineCommit: PACKAGES_SOURCE_BASELINE_COMMIT,
    candidateCommit,
    changedPaths,
    executeGitCommand,
    newPaths: NEW_PACKAGES_SOURCE_PATHS,
    repositoryRoot,
  });
  return {
    baselineCommit,
    baselineTree,
    candidateCommit,
    changedPaths,
    sourceDelta,
  };
};

/** Reads one source file from an immutable packages commit. */
const readPackagesCommitFile = (runGit, packagesRepository, packagesCommit, path) =>
  requireGit(
    runGit,
    packagesRepository,
    ['show', `${packagesCommit}:${path}`],
    `Unable to read ${path} from the packages candidate`,
  );

/** Reads one required file from an immutable repository commit. */
const readCommitFile = (runGit, repositoryRoot, commit, path) =>
  requireGit(
    runGit,
    repositoryRoot,
    ['show', `${commit}:${path}`],
    `Unable to read ${path} from ${commit}`,
  );

/** Records every changed source byte against one immutable baseline. */
const createSourceDeltaIdentity = ({
  baselineCommit,
  candidateCommit,
  changedPaths,
  executeGitCommand,
  newPaths,
  repositoryRoot,
}) => {
  const files = changedPaths.map((path) => {
    const candidate = readCommitFile(executeGitCommand, repositoryRoot, candidateCommit, path);
    let source = null;
    if (newPaths.has(path)) {
      const baselineResult = executeGitCommand(repositoryRoot, [
        'show',
        `${baselineCommit}:${path}`,
      ]);
      assert.notEqual(
        baselineResult.status,
        0,
        `${path} is classified as new but exists in the immutable baseline.`,
      );
    } else {
      source = readCommitFile(executeGitCommand, repositoryRoot, baselineCommit, path);
    }
    if (source !== null) {
      assert.notEqual(
        Buffer.compare(candidate, source),
        0,
        `${path} is listed as changed but retains its baseline bytes.`,
      );
    }
    return {
      candidateSha256: sha256(candidate),
      path,
      sourceSha256: source === null ? null : sha256(source),
    };
  });
  return { digest: sha256(`${JSON.stringify(files)}\n`), files };
};

/** Applies one required literal replacement while constructing an expected candidate. */
const replaceRequired = (content, source, candidate, label) => {
  assert.ok(content.includes(source), `The source ${label} token is unavailable.`);
  return content.replaceAll(source, candidate);
};

/** Builds the only portable SKILL.md candidate accepted by the compatibility bridge. */
const createExpectedPortableSkill = (source) => {
  let expected = replaceRequired(
    source,
    "version: '4.0.1'",
    "version: '4.0.2'",
    'portable skill version',
  );
  expected = replaceRequired(
    expected,
    `Skill release \`4.0.1\` supports exactly:

- \`@moldea.ai/cli: 5.0.0\`
- CLI JSON schema: \`2\`
- Node.js: \`^22.11.0 || ^24.11.0\`
- npm: \`>=10.9.0 <12.0.0\`
- pnpm: \`>=11.20.0 <12.0.0\`
- yarn: \`>=4.0.0 <5.0.0\``,
    `Skill release \`4.0.2\` supports exactly:

- \`@moldea.ai/cli: 5.0.2\`
- CLI JSON schema: \`2\`
- Node.js: \`>=22.11.0\`
- npm: \`>=7.0.0\`
- pnpm: \`>=8.3.1\`
- yarn: \`>=4.14.1\``,
    'portable compatibility section',
  );
  return replaceRequired(expected, 'CLI `5.0.0`', 'CLI `5.0.2`', 'portable CLI envelope');
};

/** Builds the only local-tooling candidate accepted by the compatibility bridge. */
const createExpectedLocalTooling = (source) => {
  let expected = source;
  for (const [sourceToken, candidateToken, label] of [
    ['Release `4.0.1`', 'Release `4.0.2`', 'local-tooling release'],
    ['Node.js `^22.11.0 || ^24.11.0`', 'Node.js `>=22.11.0`', 'local-tooling Node range'],
    ['npm `>=10.9.0 <12.0.0`', 'npm `>=7.0.0`', 'local-tooling npm range'],
    ['pnpm `>=11.20.0 <12.0.0`', 'pnpm `>=8.3.1`', 'local-tooling pnpm range'],
    ['Yarn `>=4.0.0 <5.0.0`', 'Yarn `>=4.14.1`', 'local-tooling Yarn range'],
    ['For Yarn 4,', 'For supported Yarn releases at or above 4,', 'local-tooling Yarn heading'],
  ]) {
    expected = replaceRequired(expected, sourceToken, candidateToken, label);
  }
  return replaceRequired(expected, '5.0.0', '5.0.2', 'local-tooling CLI version');
};

/** Parses one positive USTAR number field. */
const parseTarNumber = (field, label) => {
  const text = field.toString('ascii').replaceAll('\0', '').trim();
  const value = text.length === 0 ? 0 : Number.parseInt(text, 8);
  assert.ok(Number.isSafeInteger(value) && value >= 0, `Invalid tar ${label}.`);
  return value;
};

/** Reads one gzip-compressed package archive into a strict entry map. */
export const readPackageArchive = (archive) => {
  assert.ok(
    Buffer.isBuffer(archive) && archive.length <= MAXIMUM_PACKAGE_ARCHIVE_BYTES,
    'A package archive exceeds its compressed size boundary.',
  );
  const tar = gunzipSync(archive, {
    maxOutputLength: MAXIMUM_UNPACKED_ARCHIVE_BYTES,
  });
  assert.equal(tar.length % 512, 0, 'A package archive must contain complete USTAR blocks.');
  const entries = new Map();
  let hasEndMarker = false;
  let offset = 0;
  let pendingLongPath;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      hasEndMarker = true;
      assert.equal(
        tar.subarray(offset).every((byte) => byte === 0),
        true,
        'A package archive contains data after its end marker.',
      );
      break;
    }
    const recordedChecksum = parseTarNumber(header.subarray(148, 156), 'header checksum');
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const calculatedChecksum = checksumHeader.reduce((total, byte) => total + byte, 0);
    assert.equal(
      recordedChecksum,
      calculatedChecksum,
      'A package archive header checksum is invalid.',
    );
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/su, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/su, '');
    const size = parseTarNumber(header.subarray(124, 136), 'entry size');
    const mode = parseTarNumber(header.subarray(100, 108), 'entry mode');
    const typeValue = header.subarray(156, 157).toString('ascii');
    const type = typeValue === '\0' || typeValue === '' ? '0' : typeValue;
    const linkPath = header.subarray(157, 257).toString('utf8').replace(/\0.*$/su, '');
    const contentOffset = offset + 512;
    const contentEnd = contentOffset + size;
    assert.ok(contentEnd <= tar.length, 'A tar entry exceeds its archive boundary.');
    const content = tar.subarray(contentOffset, contentEnd);
    offset = contentOffset + Math.ceil(size / 512) * 512;

    if (type === 'L') {
      pendingLongPath = content.toString('utf8').replace(/\0+$/u, '');
      continue;
    }
    if (type === 'x' || type === 'g') {
      throw new Error('PAX metadata is not accepted in package release archives.');
    }

    const path = pendingLongPath ?? (prefix.length > 0 ? `${prefix}/${name}` : name);
    pendingLongPath = undefined;
    assert.ok(path.startsWith('package/'), `Unsafe package archive path: ${path}`);
    const normalizedPath = posix.normalize(path);
    assert.equal(normalizedPath, path, `Non-canonical package archive path: ${path}`);
    assert.equal(entries.has(path), false, `Duplicate package archive path: ${path}`);
    entries.set(path, { content: Buffer.from(content), linkPath, mode, type });
  }
  assert.equal(hasEndMarker, true, 'A package archive lacks its USTAR end marker.');
  assert.equal(pendingLongPath, undefined, 'A package archive has an incomplete long path.');
  assert.ok(entries.has('package/package.json'), 'A package archive lacks package/package.json.');
  return entries;
};

/** Reads a strict JSON package manifest from archive entries. */
const readArchiveManifest = (entries) => {
  const entry = entries.get('package/package.json');
  assert.ok(entry !== undefined);
  const document = parseDocument(entry.content.toString('utf8'), {
    schema: 'json',
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new Error(`The packed package manifest is invalid: ${document.errors[0].message}`);
  }
  const manifest = document.toJS();
  assert.ok(manifest !== null && typeof manifest === 'object' && !Array.isArray(manifest));
  return manifest;
};

/** Verifies and loads the exact candidate artifact set and checksum manifest. */
export const loadCandidatePackageArtifacts = (artifactDirectory) => {
  const resolvedDirectory = resolve(artifactDirectory);
  const expectedNames = Object.entries(PACKAGE_VERSION_MAP)
    .map(([packageName, { candidate }]) => createTarballName(packageName, candidate))
    .sort((left, right) => left.localeCompare(right, 'en'));
  const directoryEntries = readdirSync(resolvedDirectory, {
    withFileTypes: true,
  });
  const actualNames = directoryEntries
    .map(({ name }) => name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  assert.deepEqual(
    actualNames,
    [...expectedNames, CHECKSUM_FILE_NAME].sort((left, right) => left.localeCompare(right, 'en')),
    'The candidate artifact directory has an unexpected file set.',
  );
  for (const entry of directoryEntries) {
    const path = join(resolvedDirectory, entry.name);
    assert.ok(entry.isFile() && lstatSync(path).isFile(), `Artifact ${entry.name} is not a file.`);
  }

  const artifacts = new Map();
  const expectedChecksumLines = [];
  for (const archiveName of expectedNames) {
    const archive = readFileSync(join(resolvedDirectory, archiveName));
    assert.ok(
      archive.length <= MAXIMUM_PACKAGE_ARCHIVE_BYTES,
      `${archiveName} exceeds the package archive size boundary.`,
    );
    expectedChecksumLines.push(`${sha256(archive)}  ${archiveName}`);
    const entries = readPackageArchive(archive);
    const manifest = readArchiveManifest(entries);
    const versionRecord = PACKAGE_VERSION_MAP[manifest.name];
    assert.ok(
      versionRecord !== undefined,
      `Unexpected candidate package ${String(manifest.name)}.`,
    );
    assert.equal(manifest.version, versionRecord.candidate);
    assert.equal(archiveName, createTarballName(manifest.name, manifest.version));
    assert.equal(artifacts.has(manifest.name), false, `Duplicate candidate ${manifest.name}.`);
    artifacts.set(manifest.name, { archive, archiveName, entries, manifest });
  }
  assert.equal(artifacts.size, Object.keys(PACKAGE_VERSION_MAP).length);
  const expectedChecksums = `${expectedChecksumLines.join('\n')}\n`;
  assert.equal(
    readFileSync(join(resolvedDirectory, CHECKSUM_FILE_NAME), 'utf8'),
    expectedChecksums,
    'The package checksum manifest is invalid.',
  );
  return artifacts;
};

/** Fetches one bounded registry resource without following redirects. */
const fetchRegistryBuffer = async (url, fetchResource) => {
  const requestController = new AbortController();
  const timeout = setTimeout(
    () => requestController.abort(new Error(`Registry request timed out: ${url}`)),
    REGISTRY_REQUEST_TIMEOUT_MS,
  );
  timeout.unref?.();
  try {
    const response = await fetchResource(url, {
      redirect: 'error',
      signal: requestController.signal,
    });
    if (!response.ok) {
      throw new Error(`Registry request failed with HTTP ${response.status}: ${url}`);
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength !== null && Number(contentLength) > MAXIMUM_REGISTRY_RESPONSE_BYTES) {
      throw new Error(`Registry response is too large: ${url}`);
    }
    if (response.body === null) return Buffer.alloc(0);

    const chunks = [];
    const reader = response.body.getReader();
    let totalLength = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalLength += value.byteLength;
        if (totalLength > MAXIMUM_REGISTRY_RESPONSE_BYTES) {
          try {
            await reader.cancel();
          } catch {
            // the bounded-response failure remains the actionable error
          }
          throw new Error(`Registry response is too large: ${url}`);
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks, totalLength);
  } finally {
    clearTimeout(timeout);
  }
};

/** Loads one exact package set from immutable npm registry versions. */
export const loadPublishedPackageArtifacts = async ({ candidate, fetchResource = fetch }) => {
  const artifacts = new Map();
  for (const [packageName, versions] of Object.entries(PACKAGE_VERSION_MAP)) {
    const version = candidate ? versions.candidate : versions.source;
    const metadataUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${version}`;
    const metadata = JSON.parse(
      (await fetchRegistryBuffer(metadataUrl, fetchResource)).toString('utf8'),
    );
    assert.equal(metadata.name, packageName);
    assert.equal(metadata.version, version);
    assert.equal(typeof metadata.dist?.integrity, 'string');
    assert.equal(typeof metadata.dist?.shasum, 'string');
    const tarballUrl = new URL(metadata.dist?.tarball);
    assert.equal(tarballUrl.protocol, 'https:');
    assert.equal(tarballUrl.origin, 'https://registry.npmjs.org');
    const archive = await fetchRegistryBuffer(tarballUrl.href, fetchResource);
    assert.equal(
      `sha512-${createHash('sha512').update(archive).digest('base64')}`,
      metadata.dist.integrity,
      `Registry integrity mismatch for ${packageName}@${version}.`,
    );
    assert.equal(
      createHash('sha1').update(archive).digest('hex'),
      metadata.dist.shasum,
      `Registry shasum mismatch for ${packageName}@${version}.`,
    );
    const entries = readPackageArchive(archive);
    const manifest = readArchiveManifest(entries);
    assert.equal(manifest.name, packageName);
    assert.equal(manifest.version, version);
    artifacts.set(packageName, {
      archive,
      archiveName: createTarballName(packageName, version),
      entries,
      manifest,
      registry: {
        integrity: metadata.dist.integrity,
        shasum: metadata.dist.shasum,
        tarball: tarballUrl.href,
      },
    });
  }
  return artifacts;
};

/** Builds the exact candidate README bytes allowed for one package. */
const createExpectedReadme = (packageName, sourceReadme) => {
  let expected = sourceReadme;
  const { candidate, source } = PACKAGE_VERSION_MAP[packageName];
  if (candidate !== source && packageName.startsWith('@moldea.ai/adapter-')) {
    const sourceToken = `Version \`${source}\``;
    assert.equal(
      expected.split(sourceToken).length - 1,
      1,
      `${packageName} README version token changed.`,
    );
    expected = expected.replace(sourceToken, `Version \`${candidate}\``);
  }
  if (packageName === '@moldea.ai/repository') {
    const sourceText = 'Install its exact testing peers in the implementing package:';
    const candidateText =
      'Install compatible testing peers in the implementing package. The testing subpath supports Vitest `>=1.0.0` and web-utils-kit `>=1.3.1`:';
    assert.equal(expected.split(sourceText).length - 1, 1);
    expected = expected.replace(sourceText, candidateText);
  }
  if (packageName === '@moldea.ai/repository-fs' || packageName === CLI_PACKAGE_NAME) {
    assert.ok(expected.includes(SOURCE_NODE_RANGE));
    expected = expected.replaceAll(SOURCE_NODE_RANGE, CANDIDATE_NODE_RANGE);
    const sourceRuntimeText =
      packageName === CLI_PACKAGE_NAME
        ? 'Node.js `22.11.0`, latest Node.js 22, Node.js `24.11.0`, and latest Node.js 24'
        : 'Node.js `22.11.0`, the latest Node.js `22.x`, Node.js `24.11.0`, and the latest Node.js `24.x`';
    const candidateRuntimeText = `${sourceRuntimeText}, and Node.js \`26.8.1\``;
    assert.ok(expected.includes(sourceRuntimeText));
    expected = expected.replace(sourceRuntimeText, candidateRuntimeText);
  }
  if (packageName === CLI_PACKAGE_NAME) {
    const sourceToken = 'Anthropic adapter `2.0.3`';
    assert.equal(expected.split(sourceToken).length - 1, 1);
    expected = expected.replace(sourceToken, 'Anthropic adapter `2.0.5`');
  }
  return expected;
};

/** Requires the only package manifest changes authorized by the bridge. */
const comparePackageManifests = (packageName, sourceManifest, candidateManifest) => {
  const versions = PACKAGE_VERSION_MAP[packageName];
  assert.equal(sourceManifest.name, packageName);
  assert.equal(sourceManifest.version, versions.source);
  assert.equal(candidateManifest.name, packageName);
  assert.equal(candidateManifest.version, versions.candidate);
  const normalizedCandidate = structuredClone(candidateManifest);
  normalizedCandidate.version = versions.source;

  if (NODE_BOUND_PACKAGE_NAMES.has(packageName)) {
    assert.equal(sourceManifest.engines?.node, SOURCE_NODE_RANGE);
    assert.equal(candidateManifest.engines?.node, CANDIDATE_NODE_RANGE);
    normalizedCandidate.engines.node = SOURCE_NODE_RANGE;
  }
  if (packageName === '@moldea.ai/repository') {
    assert.deepEqual(sourceManifest.peerDependencies, {
      vitest: '4.1.10',
      'web-utils-kit': '1.3.1',
    });
    assert.deepEqual(candidateManifest.peerDependencies, {
      vitest: '>=1.0.0',
      'web-utils-kit': '>=1.3.1',
    });
    assert.deepEqual(candidateManifest.peerDependenciesMeta, sourceManifest.peerDependenciesMeta);
    normalizedCandidate.peerDependencies = structuredClone(sourceManifest.peerDependencies);
  }
  if (REPOSITORY_DEPENDENT_PACKAGE_NAMES.has(packageName)) {
    assert.equal(
      sourceManifest.dependencies?.['@moldea.ai/repository'],
      SOURCE_REPOSITORY_DEPENDENCY_RANGE,
    );
    assert.equal(
      candidateManifest.dependencies?.['@moldea.ai/repository'],
      CANDIDATE_REPOSITORY_DEPENDENCY_RANGE,
      `${packageName} candidate must exclude Repository 1.1.0.`,
    );
    normalizedCandidate.dependencies['@moldea.ai/repository'] = SOURCE_REPOSITORY_DEPENDENCY_RANGE;
  }
  if (packageName === CLI_PACKAGE_NAME) {
    for (const [dependencyName, dependencyVersions] of Object.entries(PACKAGE_VERSION_MAP)) {
      if (dependencyName === '@moldea.ai/website-ui' || dependencyName === CLI_PACKAGE_NAME)
        continue;
      assert.equal(sourceManifest.dependencies?.[dependencyName], dependencyVersions.source);
      assert.equal(candidateManifest.dependencies?.[dependencyName], dependencyVersions.candidate);
      normalizedCandidate.dependencies[dependencyName] = dependencyVersions.source;
    }
  }
  assert.deepEqual(
    normalizedCandidate,
    sourceManifest,
    `${packageName} contains an unauthorized package.json change.`,
  );
};

/** Compares the old and new package sets with manifest/README projections only. */
export const comparePackageArtifactSets = (sourceArtifacts, candidateArtifacts) => {
  assert.deepEqual(
    [...candidateArtifacts.keys()].sort((left, right) => left.localeCompare(right, 'en')),
    Object.keys(PACKAGE_VERSION_MAP).sort((left, right) => left.localeCompare(right, 'en')),
  );
  assert.deepEqual(
    [...sourceArtifacts.keys()].sort((left, right) => left.localeCompare(right, 'en')),
    Object.keys(PACKAGE_VERSION_MAP).sort((left, right) => left.localeCompare(right, 'en')),
  );

  const packageDigests = [];
  for (const packageName of Object.keys(PACKAGE_VERSION_MAP).sort((left, right) =>
    left.localeCompare(right, 'en'),
  )) {
    const source = sourceArtifacts.get(packageName);
    const candidate = candidateArtifacts.get(packageName);
    assert.ok(source !== undefined && candidate !== undefined);
    comparePackageManifests(packageName, source.manifest, candidate.manifest);
    assert.deepEqual(
      [...candidate.entries.keys()].sort((left, right) => left.localeCompare(right, 'en')),
      [...source.entries.keys()].sort((left, right) => left.localeCompare(right, 'en')),
      `${packageName} archive paths changed.`,
    );

    for (const [path, sourceEntry] of source.entries) {
      const candidateEntry = candidate.entries.get(path);
      assert.ok(candidateEntry !== undefined);
      assert.equal(candidateEntry.mode, sourceEntry.mode, `${packageName} ${path} mode changed.`);
      assert.equal(candidateEntry.type, sourceEntry.type, `${packageName} ${path} type changed.`);
      assert.equal(
        candidateEntry.linkPath,
        sourceEntry.linkPath,
        `${packageName} ${path} link changed.`,
      );
      if (path === 'package/package.json') continue;
      if (path === 'package/README.md') {
        assert.equal(
          candidateEntry.content.toString('utf8'),
          createExpectedReadme(packageName, sourceEntry.content.toString('utf8')),
          `${packageName} README contains an unauthorized change.`,
        );
        continue;
      }
      assert.equal(
        Buffer.compare(candidateEntry.content, sourceEntry.content),
        0,
        `${packageName} ${path} bytes changed.`,
      );
    }
    packageDigests.push({
      candidateSha256: sha256(candidate.archive),
      name: packageName,
      registry: {
        candidate: candidate.registry ?? null,
        source: source.registry ?? null,
      },
      sourceSha256: sha256(source.archive),
    });
  }
  return packageDigests;
};

/** Validates candidate source manifests and packed README correspondence. */
const assertCandidateSourceProjection = ({
  artifacts,
  executeGitCommand,
  packagesCommit,
  packagesRepository,
  sourceArtifacts,
}) => {
  for (const [packageName, sourceDirectory] of Object.entries(PACKAGE_SOURCE_PATHS)) {
    const artifact = artifacts.get(packageName);
    const sourceArtifact = sourceArtifacts.get(packageName);
    assert.ok(artifact !== undefined && sourceArtifact !== undefined);
    const sourceManifest = JSON.parse(
      readPackagesCommitFile(
        executeGitCommand,
        packagesRepository,
        packagesCommit,
        `${sourceDirectory}/package.json`,
      ).toString('utf8'),
    );
    const baselineManifest = JSON.parse(
      readPackagesCommitFile(
        executeGitCommand,
        packagesRepository,
        PACKAGES_SOURCE_BASELINE_COMMIT,
        `${sourceDirectory}/package.json`,
      ).toString('utf8'),
    );
    assert.equal(sourceManifest.name, packageName);
    assert.equal(sourceManifest.version, PACKAGE_VERSION_MAP[packageName].candidate);
    const normalizedSourceManifest = structuredClone(sourceManifest);
    normalizedSourceManifest.version = PACKAGE_VERSION_MAP[packageName].source;
    if (NODE_BOUND_PACKAGE_NAMES.has(packageName)) {
      assert.equal(sourceManifest.engines?.node, CANDIDATE_NODE_RANGE);
      normalizedSourceManifest.engines.node = SOURCE_NODE_RANGE;
    }
    if (packageName === '@moldea.ai/repository') {
      assert.deepEqual(sourceManifest.peerDependencies, {
        vitest: '>=1.0.0',
        'web-utils-kit': '>=1.3.1',
      });
      normalizedSourceManifest.peerDependencies = structuredClone(
        baselineManifest.peerDependencies,
      );
    }
    if (REPOSITORY_DEPENDENT_PACKAGE_NAMES.has(packageName)) {
      assert.equal(
        sourceManifest.dependencies?.['@moldea.ai/repository'],
        `workspace:${CANDIDATE_REPOSITORY_DEPENDENCY_RANGE}`,
      );
      normalizedSourceManifest.dependencies['@moldea.ai/repository'] =
        `workspace:${SOURCE_REPOSITORY_DEPENDENCY_RANGE}`;
    }
    if (packageName === CLI_PACKAGE_NAME) {
      for (const [dependencyName, versions] of Object.entries(PACKAGE_VERSION_MAP)) {
        if (dependencyName === CLI_PACKAGE_NAME || dependencyName === '@moldea.ai/website-ui') {
          continue;
        }
        assert.equal(
          sourceManifest.dependencies?.[dependencyName],
          `workspace:${versions.candidate}`,
        );
        normalizedSourceManifest.dependencies[dependencyName] = `workspace:${versions.source}`;
      }
    }
    assert.deepEqual(
      normalizedSourceManifest,
      baselineManifest,
      `${packageName} source manifest contains an unauthorized change.`,
    );
    const baselineReadme = readPackagesCommitFile(
      executeGitCommand,
      packagesRepository,
      PACKAGES_SOURCE_BASELINE_COMMIT,
      `${sourceDirectory}/README.md`,
    ).toString('utf8');
    assert.equal(
      sourceArtifact.entries.get('package/README.md')?.content.toString('utf8'),
      baselineReadme,
      `${packageName} published source README differs from the frozen packages baseline.`,
    );
    assert.equal(
      artifact.entries.get('package/README.md')?.content.toString('utf8'),
      readPackagesCommitFile(
        executeGitCommand,
        packagesRepository,
        packagesCommit,
        `${sourceDirectory}/README.md`,
      ).toString('utf8'),
      `${packageName} packed README differs from candidate source.`,
    );
  }
  const privateManifestPath = 'packages/adapter-static-analysis/package.json';
  const baselinePrivateManifest = JSON.parse(
    readPackagesCommitFile(
      executeGitCommand,
      packagesRepository,
      PACKAGES_SOURCE_BASELINE_COMMIT,
      privateManifestPath,
    ).toString('utf8'),
  );
  const candidatePrivateManifest = JSON.parse(
    readPackagesCommitFile(
      executeGitCommand,
      packagesRepository,
      packagesCommit,
      privateManifestPath,
    ).toString('utf8'),
  );
  assert.equal(candidatePrivateManifest.name, '@moldea.ai/adapter-static-analysis');
  assert.equal(candidatePrivateManifest.version, '0.0.0');
  assert.equal(candidatePrivateManifest.engines?.node, CANDIDATE_NODE_RANGE);
  const normalizedPrivateManifest = structuredClone(candidatePrivateManifest);
  normalizedPrivateManifest.engines.node = SOURCE_NODE_RANGE;
  assert.deepEqual(
    normalizedPrivateManifest,
    baselinePrivateManifest,
    'The private adapter manifest contains an unauthorized change.',
  );

  const parseLockfile = (commit) => {
    const document = parseDocument(
      readPackagesCommitFile(
        executeGitCommand,
        packagesRepository,
        commit,
        'pnpm-lock.yaml',
      ).toString('utf8'),
      { uniqueKeys: true },
    );
    if (document.errors.length > 0) {
      throw new Error(`The packages lockfile is invalid: ${document.errors[0].message}`);
    }
    return document.toJS();
  };
  const baselineLockfile = parseLockfile(PACKAGES_SOURCE_BASELINE_COMMIT);
  const candidateLockfile = parseLockfile(packagesCommit);
  const normalizedLockfile = structuredClone(candidateLockfile);
  const baselineCliDependencies = baselineLockfile.importers?.['projects/cli']?.dependencies;
  const candidateCliDependencies = candidateLockfile.importers?.['projects/cli']?.dependencies;
  const normalizedCliDependencies = normalizedLockfile.importers?.['projects/cli']?.dependencies;
  assert.ok(
    baselineCliDependencies !== undefined &&
      candidateCliDependencies !== undefined &&
      normalizedCliDependencies !== undefined,
  );
  for (const [dependencyName, versions] of Object.entries(PACKAGE_VERSION_MAP)) {
    if (dependencyName === CLI_PACKAGE_NAME || dependencyName === '@moldea.ai/website-ui') continue;
    assert.equal(
      candidateCliDependencies[dependencyName]?.specifier,
      `workspace:${versions.candidate}`,
    );
    normalizedCliDependencies[dependencyName].specifier =
      baselineCliDependencies[dependencyName].specifier;
  }
  for (const packageName of REPOSITORY_DEPENDENT_PACKAGE_NAMES) {
    const sourceDirectory = PACKAGE_SOURCE_PATHS[packageName];
    const baselineDependency =
      baselineLockfile.importers?.[sourceDirectory]?.dependencies?.['@moldea.ai/repository'];
    const candidateDependency =
      candidateLockfile.importers?.[sourceDirectory]?.dependencies?.['@moldea.ai/repository'];
    const normalizedDependency =
      normalizedLockfile.importers?.[sourceDirectory]?.dependencies?.['@moldea.ai/repository'];
    assert.ok(
      baselineDependency !== undefined &&
        candidateDependency !== undefined &&
        normalizedDependency !== undefined,
    );
    assert.equal(
      candidateDependency.specifier,
      `workspace:${CANDIDATE_REPOSITORY_DEPENDENCY_RANGE}`,
    );
    normalizedDependency.specifier = baselineDependency.specifier;
  }
  assert.deepEqual(
    normalizedLockfile,
    baselineLockfile,
    'The packages lockfile contains an unauthorized change.',
  );
};

/** Builds the exact Repository testing-peer CI job accepted by the bridge. */
const createExpectedRepositoryPeerJob = () => ({
  name: 'Repository Testing Peers (Vitest ${{ matrix.vitest-version }})',
  needs: 'verify',
  'runs-on': 'ubuntu-latest',
  env: {
    PNPM_VERSION: '11.9.0',
    WEB_UTILS_KIT_VERSION: '1.3.1',
  },
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
});

/** Builds the exact CLI existing-Vitest regression CI job accepted by the bridge. */
const createExpectedCliPeerJob = () => ({
  name: 'CLI Existing Vitest 3.2.4 Compatibility',
  needs: 'verify',
  'runs-on': 'ubuntu-latest',
  env: {
    PNPM_VERSION: '11.21.0',
    VITEST_VERSION: '3.2.4',
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
});

/** Builds the exact release-only package comparator CI job accepted by the bridge. */
const createExpectedBridgeJob = (pinnedSkillCommit) => ({
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
        ref: pinnedSkillCommit,
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
});

/** Extracts and binds the hosted gate definitions from the packages candidate. */
const createPackagesGateIdentity = ({ executeGitCommand, packagesCommit, packagesRepository }) => {
  const workflow = readPackagesCommitFile(
    executeGitCommand,
    packagesRepository,
    packagesCommit,
    '.github/workflows/ci.yml',
  ).toString('utf8');
  const workflowDocument = parseDocument(workflow, { uniqueKeys: true });
  if (workflowDocument.errors.length > 0) {
    throw new Error(`The packages CI workflow is invalid: ${workflowDocument.errors[0].message}`);
  }
  const workflowValue = workflowDocument.toJS();
  assert.ok(
    workflowValue !== null && typeof workflowValue === 'object' && !Array.isArray(workflowValue),
    'The packages CI workflow must be an object.',
  );
  const jobs = workflowValue.jobs;
  assert.ok(jobs !== null && typeof jobs === 'object' && !Array.isArray(jobs));
  for (const requiredToken of [
    'compatibility-bridge-packages:',
    'public-package-tarballs',
    'release:compatibility-bridge:check-packages',
    PACKAGES_SOURCE_BASELINE_COMMIT,
    PACKAGES_SOURCE_BASELINE_TREE,
    '11.21.0',
    '3.2.4',
    '26.8.1',
    '1.0.0',
    '2.0.0',
    '4.1.10',
  ]) {
    assert.ok(workflow.includes(requiredToken), `Packages CI is missing ${requiredToken}.`);
  }
  const pinMatches = [
    ...workflow.matchAll(
      /^\s*ref: (?<commit>[a-f0-9]{40}) # compatibility-bridge-4\.0\.2 comparator$/gmu,
    ),
  ];
  assert.equal(pinMatches.length, 1, 'Packages CI must contain one exact comparator commit pin.');
  const pinnedSkillCommit = pinMatches[0].groups?.commit;
  assert.match(pinnedSkillCommit, COMMIT_PATTERN);
  const repositoryPeerJob = jobs['repository-testing-peer-compatibility'];
  assert.deepEqual(
    repositoryPeerJob,
    createExpectedRepositoryPeerJob(),
    'The Repository testing-peer job differs from the frozen executable contract.',
  );
  const cliPeerJob = jobs['cli-testing-peer-compatibility'];
  assert.deepEqual(
    cliPeerJob,
    createExpectedCliPeerJob(),
    'The CLI testing-peer job differs from the frozen executable contract.',
  );
  assert.deepEqual(
    Object.keys(jobs)
      .filter((jobName) => jobName.endsWith('-runtime-compatibility'))
      .sort((left, right) => left.localeCompare(right, 'en')),
    RUNTIME_COMPATIBILITY_JOB_NAMES,
  );
  for (const jobName of RUNTIME_COMPATIBILITY_JOB_NAMES) {
    const job = jobs[jobName];
    assert.deepEqual(
      job?.strategy?.matrix?.['node-version'],
      ['22.11.0', '22.x', '24.11.0', '24.x', '26.8.1'],
      `${jobName} has an unexpected Node.js matrix.`,
    );
  }
  const bridgeJob = jobs['compatibility-bridge-packages'];
  assert.deepEqual(
    bridgeJob,
    createExpectedBridgeJob(pinnedSkillCommit),
    'The package bridge job differs from the frozen executable contract.',
  );

  const baselineWorkflow = readPackagesCommitFile(
    executeGitCommand,
    packagesRepository,
    PACKAGES_SOURCE_BASELINE_COMMIT,
    '.github/workflows/ci.yml',
  ).toString('utf8');
  const baselineDocument = parseDocument(baselineWorkflow, {
    uniqueKeys: true,
  });
  if (baselineDocument.errors.length > 0) {
    throw new Error(
      `The frozen packages CI workflow is invalid: ${baselineDocument.errors[0].message}`,
    );
  }
  const normalizedWorkflow = structuredClone(workflowValue);
  delete normalizedWorkflow.jobs['repository-testing-peer-compatibility'];
  delete normalizedWorkflow.jobs['cli-testing-peer-compatibility'];
  delete normalizedWorkflow.jobs['compatibility-bridge-packages'];
  for (const jobName of RUNTIME_COMPATIBILITY_JOB_NAMES) {
    const nodeVersions = normalizedWorkflow.jobs[jobName]?.strategy?.matrix?.['node-version'];
    assert.ok(Array.isArray(nodeVersions));
    assert.equal(nodeVersions.pop(), '26.8.1');
  }
  assert.deepEqual(
    normalizedWorkflow,
    baselineDocument.toJS(),
    'Packages CI contains an unauthorized change outside the frozen 4.0.2 jobs and matrices.',
  );
  const verifierPaths = [
    'projects/cli/scripts/testing-peer-compatibility/index.mjs',
    'projects/repository/scripts/testing-peer-compatibility/index.mjs',
  ];
  return {
    artifactNames: Object.entries(PACKAGE_VERSION_MAP)
      .map(([name, { candidate }]) => createTarballName(name, candidate))
      .sort((left, right) => left.localeCompare(right, 'en')),
    pinnedSkillCommit,
    verifierSources: verifierPaths.map((path) => ({
      path,
      sha256: sha256(
        readPackagesCommitFile(executeGitCommand, packagesRepository, packagesCommit, path),
      ),
    })),
    workflowSha256: sha256(workflow),
  };
};

/** Resolves relative static and dynamic imports from one repository-owned module. */
const readRelativeImports = (source) =>
  [
    ...source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)(['"])(?<specifier>\.\.?\/[^'"]+)\1/gu),
  ].map(({ groups }) => groups.specifier);

/** Records the complete repository-owned runtime import closure for frozen modules. */
export const createRuntimeImportClosure = (repositoryRoot) => {
  const resolvedRoot = resolve(repositoryRoot);
  const pending = FROZEN_MODULE_PATHS.filter((path) => path.endsWith('.mjs'));
  const visited = new Set();
  while (pending.length > 0) {
    const path = pending.shift();
    if (visited.has(path)) continue;
    for (const prohibitedPath of PROHIBITED_IMPORT_PATHS) {
      assert.equal(
        path === prohibitedPath || path.startsWith(prohibitedPath),
        false,
        `The compatibility bridge imports prohibited module ${path}.`,
      );
    }
    const absolutePath = join(resolvedRoot, ...path.split('/'));
    const source = readFileSync(absolutePath, 'utf8');
    visited.add(path);
    for (const specifier of readRelativeImports(source)) {
      const importedAbsolutePath = resolve(dirname(absolutePath), specifier);
      const importedPath = relative(resolvedRoot, importedAbsolutePath).split('\\').join('/');
      assert.ok(
        importedPath.length > 0 && !importedPath.startsWith('../') && !isAbsolute(importedPath),
        `Runtime import escapes the repository: ${specifier}`,
      );
      pending.push(importedPath);
    }
  }
  return [...visited]
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((path) => ({
      path,
      sha256: sha256(readFileSync(join(resolvedRoot, ...path.split('/')))),
    }));
};

/** Creates the frozen comparator surface identity from one filesystem tree. */
export const createFrozenCompatibilitySurface = (repositoryRoot) => {
  const resolvedRoot = resolve(repositoryRoot);
  const packageManifest = JSON.parse(readFileSync(join(resolvedRoot, 'package.json'), 'utf8'));
  assert.equal(
    packageManifest.scripts?.['release:compatibility-bridge:check-packages'],
    CHECK_PACKAGES_SCRIPT,
  );
  assert.equal(packageManifest.scripts?.['release:compatibility-bridge:write'], WRITE_SCRIPT);
  return {
    files: FROZEN_MODULE_PATHS.map((path) => ({
      path,
      sha256: sha256(readFileSync(join(resolvedRoot, ...path.split('/')))),
    })),
    runtimeImportClosure: createRuntimeImportClosure(resolvedRoot),
    scripts: {
      checkPackages: CHECK_PACKAGES_SCRIPT,
      write: WRITE_SCRIPT,
    },
  };
};

/** Reads and hashes the frozen comparator surface from one immutable skill commit. */
const createFrozenCompatibilitySurfaceAtCommit = ({
  executeGitCommand,
  repositoryRoot,
  skillCommit,
}) => {
  assert.match(skillCommit, COMMIT_PATTERN);
  const readCommitFile = (path) =>
    requireGit(
      executeGitCommand,
      repositoryRoot,
      ['show', `${skillCommit}:${path}`],
      `Unable to read frozen comparator path ${path}`,
    );
  const packageManifest = JSON.parse(readCommitFile('package.json').toString('utf8'));
  assert.equal(
    packageManifest.scripts?.['release:compatibility-bridge:check-packages'],
    CHECK_PACKAGES_SCRIPT,
  );
  assert.equal(packageManifest.scripts?.['release:compatibility-bridge:write'], WRITE_SCRIPT);
  return {
    files: FROZEN_MODULE_PATHS.map((path) => ({
      path,
      sha256: sha256(readCommitFile(path)),
    })),
    scripts: {
      checkPackages: CHECK_PACKAGES_SCRIPT,
      write: WRITE_SCRIPT,
    },
  };
};

/** Executes the shared package-only structural comparison without writing evidence. */
export const checkCompatibilityBridgePackages = async ({
  artifactDirectory,
  executeGitCommand = executeGit,
  fetchResource = fetch,
  packagesCommit,
  packagesRepository,
  repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'),
}) => {
  assertCompatibility402Expansion(COMPATIBILITY_401, COMPATIBILITY_402);
  const compatibilityDecisions = createCompatibilityDecisionIdentity();
  const sourceState = assertPackagesSourceState({
    executeGitCommand,
    packagesCommit,
    packagesRepository,
  });
  const candidateArtifacts = loadCandidatePackageArtifacts(artifactDirectory);
  const sourceArtifacts = await loadPublishedPackageArtifacts({
    candidate: false,
    fetchResource,
  });
  const packageDigests = comparePackageArtifactSets(sourceArtifacts, candidateArtifacts);
  assertCandidateSourceProjection({
    artifacts: candidateArtifacts,
    executeGitCommand,
    packagesCommit,
    packagesRepository,
    sourceArtifacts,
  });
  const gate = createPackagesGateIdentity({
    executeGitCommand,
    packagesCommit,
    packagesRepository,
  });
  const comparatorCommit = requireGit(
    executeGitCommand,
    resolve(repositoryRoot),
    ['rev-parse', '--verify', 'HEAD^{commit}'],
    'Unable to resolve the checked-out comparator commit',
  )
    .toString('utf8')
    .trim();
  assert.equal(gate.pinnedSkillCommit, comparatorCommit, 'Packages CI pins another comparator.');
  const frozenSurface = createFrozenCompatibilitySurface(repositoryRoot);
  const committedSurface = createFrozenCompatibilitySurfaceAtCommit({
    executeGitCommand,
    repositoryRoot: resolve(repositoryRoot),
    skillCommit: comparatorCommit,
  });
  assert.deepEqual(
    frozenSurface.files,
    committedSurface.files,
    'The checked-out frozen comparator differs from its pinned commit.',
  );
  assert.deepEqual(frozenSurface.scripts, committedSurface.scripts);
  return {
    compatibilityDecisions,
    comparatorCommit,
    frozenSurface,
    gate,
    packageDigests,
    sourceState,
  };
};

/** Requires immutable 4.0.1 bridge inputs to retain their frozen bytes. */
const assertCarryForward401Inputs = ({ executeGitCommand, repositoryRoot }) => {
  const originalSourceCommit = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['rev-parse', '--verify', 'v4.0.0^{commit}'],
    'Unable to resolve immutable skill tag v4.0.0',
  )
    .toString('utf8')
    .trim();
  assert.equal(originalSourceCommit, SKILL_400_COMMIT);
  const sourceCommit = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['rev-parse', '--verify', 'v4.0.1^{commit}'],
    'Unable to resolve immutable skill tag v4.0.1',
  )
    .toString('utf8')
    .trim();
  assert.equal(sourceCommit, SKILL_401_COMMIT);
  const files = [];
  for (const [path, expectedSha256] of Object.entries(CARRY_FORWARD_401_FILES)) {
    const current = readFileSync(join(repositoryRoot, ...path.split('/')));
    const tagged = requireGit(
      executeGitCommand,
      repositoryRoot,
      ['show', `v4.0.1:${path}`],
      `Unable to read immutable 4.0.1 path ${path}`,
    );
    assert.equal(sha256(current), expectedSha256, `${path} changed after release 4.0.1.`);
    assert.equal(sha256(tagged), expectedSha256, `${path} differs at v4.0.1.`);
    files.push({ path, sha256: expectedSha256 });
  }
  const attestation = JSON.parse(
    readFileSync(
      join(repositoryRoot, 'fixtures/release-evidence/carry-forward-4.0.1.json'),
      'utf8',
    ),
  );
  assert.equal(attestation.sourceRelease, 'v4.0.0');
  assert.equal(attestation.sourceCommit, SKILL_400_COMMIT);
  assert.equal(attestation.targetRelease, COMPATIBILITY_401.skillVersion);
  assert.equal(attestation.modelRunsPerformed, false);
  return { files, originalSourceCommit, sourceCommit };
};

/** Requires the root manifest to contain only the planned release and bridge fields. */
const assertSkillPackageManifestProjection = (source, candidate) => {
  assert.equal(candidate.version, COMPATIBILITY_402.skillVersion);
  assert.equal(candidate.engines?.node, COMPATIBILITY_402.nodeRange);
  assert.equal(candidate.devDependencies?.[CLI_PACKAGE_NAME], COMPATIBILITY_402.cliVersion);
  assert.equal(
    candidate.scripts?.['release:compatibility-bridge:check-packages'],
    CHECK_PACKAGES_SCRIPT,
  );
  assert.equal(candidate.scripts?.['release:compatibility-bridge:write'], WRITE_SCRIPT);
  const normalized = structuredClone(candidate);
  normalized.version = COMPATIBILITY_401.skillVersion;
  normalized.engines.node = COMPATIBILITY_401.nodeRange;
  normalized.devDependencies[CLI_PACKAGE_NAME] = COMPATIBILITY_401.cliVersion;
  delete normalized.scripts['release:compatibility-bridge:check-packages'];
  delete normalized.scripts['release:compatibility-bridge:write'];
  assert.deepEqual(
    normalized,
    source,
    'The root package manifest contains an unauthorized change.',
  );
};

/** Requires the lockfile to contain only the planned release package projection. */
export const compareSkillPackageLocks = (source, candidate) => {
  assert.equal(candidate.version, COMPATIBILITY_402.skillVersion);
  assert.equal(candidate.packages?.['']?.version, COMPATIBILITY_402.skillVersion);
  assert.equal(candidate.packages?.['']?.engines?.node, COMPATIBILITY_402.nodeRange);
  assert.equal(
    candidate.packages?.['']?.devDependencies?.[CLI_PACKAGE_NAME],
    COMPATIBILITY_402.cliVersion,
  );
  const normalized = structuredClone(candidate);
  normalized.version = source.version;
  normalized.packages[''].version = source.packages[''].version;
  normalized.packages[''].engines.node = source.packages[''].engines.node;
  normalized.packages[''].devDependencies[CLI_PACKAGE_NAME] =
    source.packages[''].devDependencies[CLI_PACKAGE_NAME];

  for (const [packageName, versions] of Object.entries(PACKAGE_VERSION_MAP)) {
    const path = `node_modules/${packageName}`;
    const sourcePackage = source.packages?.[path];
    const candidatePackage = candidate.packages?.[path];
    if (sourcePackage === undefined) {
      assert.equal(
        candidatePackage,
        undefined,
        `${packageName} unexpectedly entered the skill lockfile.`,
      );
      continue;
    }
    assert.ok(candidatePackage !== undefined);
    assert.equal(sourcePackage.version, versions.source);
    assert.equal(candidatePackage.version, versions.candidate);
    if (versions.candidate !== versions.source) {
      assert.equal(
        candidatePackage.resolved,
        `https://registry.npmjs.org/${packageName}/-/${createRegistryTarballName(
          packageName,
          versions.candidate,
        )}`,
      );
      assert.equal(typeof candidatePackage.integrity, 'string');
      const normalizedPackage = normalized.packages[path];
      normalizedPackage.version = sourcePackage.version;
      normalizedPackage.resolved = sourcePackage.resolved;
      normalizedPackage.integrity = sourcePackage.integrity;
    }
    const normalizedPackage = normalized.packages[path];
    if (NODE_BOUND_PACKAGE_NAMES.has(packageName)) {
      assert.equal(candidatePackage.engines?.node, CANDIDATE_NODE_RANGE);
      normalizedPackage.engines.node = sourcePackage.engines.node;
    }
    if (packageName === '@moldea.ai/repository') {
      assert.deepEqual(candidatePackage.peerDependencies, {
        vitest: '>=1.0.0',
        'web-utils-kit': '>=1.3.1',
      });
      normalizedPackage.peerDependencies = structuredClone(sourcePackage.peerDependencies);
    }
    if (REPOSITORY_DEPENDENT_PACKAGE_NAMES.has(packageName)) {
      assert.equal(
        candidatePackage.dependencies?.['@moldea.ai/repository'],
        CANDIDATE_REPOSITORY_DEPENDENCY_RANGE,
        `${packageName} candidate must exclude Repository 1.1.0.`,
      );
      normalizedPackage.dependencies['@moldea.ai/repository'] =
        sourcePackage.dependencies['@moldea.ai/repository'];
    }
    if (packageName === CLI_PACKAGE_NAME) {
      for (const [dependencyName, dependencyVersions] of Object.entries(PACKAGE_VERSION_MAP)) {
        if (dependencyName === CLI_PACKAGE_NAME || dependencyName === '@moldea.ai/website-ui') {
          continue;
        }
        assert.equal(candidatePackage.dependencies?.[dependencyName], dependencyVersions.candidate);
        normalizedPackage.dependencies[dependencyName] = dependencyVersions.source;
      }
    }
  }
  assert.deepEqual(normalized, source, 'The root package lock contains an unauthorized change.');
};

/** Binds every installed release package in the skill lockfile to registry metadata. */
const assertSkillLockRegistryIdentity = ({
  candidateArtifacts,
  candidateCommit,
  executeGitCommand,
  repositoryRoot,
}) => {
  const lockfile = JSON.parse(
    readCommitFile(
      executeGitCommand,
      repositoryRoot,
      candidateCommit,
      'package-lock.json',
    ).toString('utf8'),
  );
  for (const packageName of Object.keys(PACKAGE_VERSION_MAP)) {
    const lockedPackage = lockfile.packages?.[`node_modules/${packageName}`];
    if (lockedPackage === undefined) continue;
    const artifact = candidateArtifacts.get(packageName);
    assert.ok(artifact?.registry !== undefined);
    assert.equal(
      lockedPackage.resolved,
      artifact.registry.tarball,
      `${packageName} lockfile tarball differs from the registry identity.`,
    );
    assert.equal(
      lockedPackage.integrity,
      artifact.registry.integrity,
      `${packageName} lockfile integrity differs from the registry identity.`,
    );
  }
};

/** Requires portable behavior inputs to be exact compatibility projections. */
export const compareSkillCompatibilityFiles = (sourceFiles, candidateFiles) => {
  const identities = [];
  const compareText = (path, createExpected) => {
    const source = sourceFiles.get(path);
    const candidate = candidateFiles.get(path);
    assert.ok(Buffer.isBuffer(source) && Buffer.isBuffer(candidate));
    assert.equal(
      candidate.toString('utf8'),
      createExpected(source.toString('utf8')),
      `${path} contains an unauthorized behavior-bearing change.`,
    );
    identities.push({
      candidateSha256: sha256(candidate),
      path,
      sourceSha256: sha256(source),
    });
  };
  compareText('moldea/SKILL.md', createExpectedPortableSkill);
  compareText('moldea/references/local-tooling.md', createExpectedLocalTooling);
  compareText('fixtures/tooling/semantic-cli/bin/moldea.js', (source) =>
    replaceRequired(
      source,
      "supportedNodeRange: '^22.11.0 || ^24.11.0'",
      "supportedNodeRange: '>=22.11.0'",
      'synthetic CLI Node range',
    ),
  );
  return {
    digest: sha256(`${JSON.stringify(identities)}\n`),
    files: identities,
  };
};

/** Requires behavior-bearing skill inputs to be exact compatibility projections. */
const assertSkillCompatibilityProjection = ({
  candidateCommit,
  executeGitCommand,
  repositoryRoot,
}) => {
  const projectedPaths = [
    'moldea/SKILL.md',
    'moldea/references/local-tooling.md',
    'fixtures/tooling/semantic-cli/bin/moldea.js',
  ];
  const sourceFiles = new Map(
    projectedPaths.map((path) => [
      path,
      readCommitFile(executeGitCommand, repositoryRoot, SKILL_401_COMMIT, path),
    ]),
  );
  const candidateFiles = new Map(
    projectedPaths.map((path) => [
      path,
      readCommitFile(executeGitCommand, repositoryRoot, candidateCommit, path),
    ]),
  );
  const portableProjection = compareSkillCompatibilityFiles(sourceFiles, candidateFiles);
  const identities = [...portableProjection.files];

  const sourceManifest = JSON.parse(
    readCommitFile(executeGitCommand, repositoryRoot, SKILL_401_COMMIT, 'package.json').toString(
      'utf8',
    ),
  );
  const candidateManifestBuffer = readCommitFile(
    executeGitCommand,
    repositoryRoot,
    candidateCommit,
    'package.json',
  );
  assertSkillPackageManifestProjection(
    sourceManifest,
    JSON.parse(candidateManifestBuffer.toString('utf8')),
  );
  identities.push({
    candidateSha256: sha256(candidateManifestBuffer),
    path: 'package.json',
    sourceSha256: sha256(
      readCommitFile(executeGitCommand, repositoryRoot, SKILL_401_COMMIT, 'package.json'),
    ),
  });

  const sourceLockBuffer = readCommitFile(
    executeGitCommand,
    repositoryRoot,
    SKILL_401_COMMIT,
    'package-lock.json',
  );
  const candidateLockBuffer = readCommitFile(
    executeGitCommand,
    repositoryRoot,
    candidateCommit,
    'package-lock.json',
  );
  compareSkillPackageLocks(
    JSON.parse(sourceLockBuffer.toString('utf8')),
    JSON.parse(candidateLockBuffer.toString('utf8')),
  );
  identities.push({
    candidateSha256: sha256(candidateLockBuffer),
    path: 'package-lock.json',
    sourceSha256: sha256(sourceLockBuffer),
  });

  return {
    digest: sha256(`${JSON.stringify(identities)}\n`),
    files: identities,
  };
};

/** Proves the final skill source delta from immutable release 4.0.1. */
const assertSkillSourceState = ({ executeGitCommand, repositoryRoot }) => {
  const candidateCommit = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['rev-parse', '--verify', 'HEAD^{commit}'],
    'Unable to resolve the skill candidate commit',
  )
    .toString('utf8')
    .trim();
  assert.match(candidateCommit, COMMIT_PATTERN);
  const changedPaths = parseNulPaths(
    requireGit(
      executeGitCommand,
      repositoryRoot,
      ['diff', '--name-only', '-z', '--no-renames', SKILL_401_COMMIT, candidateCommit, '--'],
      'Unable to derive the skill source inventory',
    ),
  );
  const expectedCommittedPaths = SKILL_402_CHANGED_PATHS.filter(
    (path) => path !== COMPATIBILITY_BRIDGE_402_PATH,
  );
  assert.deepEqual(
    changedPaths,
    expectedCommittedPaths,
    'Skill changed paths differ before attestation generation.',
  );
  const deletedPaths = parseNulPaths(
    requireGit(
      executeGitCommand,
      repositoryRoot,
      [
        'diff',
        '--diff-filter=D',
        '--name-only',
        '-z',
        '--no-renames',
        SKILL_401_COMMIT,
        candidateCommit,
        '--',
      ],
      'Unable to inspect deleted skill paths',
    ),
  );
  assert.deepEqual(deletedPaths, [], 'The skill release must not delete source paths.');
  const status = requireGit(
    executeGitCommand,
    repositoryRoot,
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none'],
    'Unable to inspect the skill worktree',
  );
  assert.equal(status.length, 0, 'The skill worktree must be clean before bridge generation.');
  const sourceDelta = createSourceDeltaIdentity({
    baselineCommit: SKILL_401_COMMIT,
    candidateCommit,
    changedPaths: expectedCommittedPaths,
    executeGitCommand,
    newPaths: NEW_SKILL_SOURCE_PATHS,
    repositoryRoot,
  });
  const compatibilityProjection = assertSkillCompatibilityProjection({
    candidateCommit,
    executeGitCommand,
    repositoryRoot,
  });
  return {
    candidateCommit,
    compatibilityProjection,
    changedPaths: [...changedPaths, COMPATIBILITY_BRIDGE_402_PATH].sort((left, right) =>
      left.localeCompare(right, 'en'),
    ),
    sourceDelta,
  };
};

/** Records source tags and requires every changed candidate tag to target its release commit. */
const assertPackageTags = ({ executeGitCommand, packagesCommit, packagesRepository }) => {
  const sourceTags = [];
  const candidateTags = [];
  for (const [packageName, { candidate, source }] of Object.entries(PACKAGE_VERSION_MAP)) {
    const sourceTag = `${PACKAGE_TAG_PREFIXES[packageName]}${source}`;
    const sourceTagCommit = requireGit(
      executeGitCommand,
      packagesRepository,
      ['rev-parse', '--verify', `refs/tags/${sourceTag}^{commit}`],
      `Unable to resolve published package tag ${sourceTag}`,
    )
      .toString('utf8')
      .trim();
    assert.match(sourceTagCommit, COMMIT_PATTERN);
    sourceTags.push({
      packageName,
      tag: sourceTag,
      tagCommit: sourceTagCommit,
    });
    if (candidate === source) {
      candidateTags.push({
        packageName,
        tag: sourceTag,
        tagCommit: sourceTagCommit,
      });
      continue;
    }
    const candidateTag = `${PACKAGE_TAG_PREFIXES[packageName]}${candidate}`;
    const candidateTagCommit = requireGit(
      executeGitCommand,
      packagesRepository,
      ['rev-parse', '--verify', `refs/tags/${candidateTag}^{commit}`],
      `Unable to resolve published package tag ${candidateTag}`,
    )
      .toString('utf8')
      .trim();
    assert.equal(
      candidateTagCommit,
      packagesCommit,
      `${candidateTag} targets another packages commit.`,
    );
    candidateTags.push({
      packageName,
      tag: candidateTag,
      tagCommit: candidateTagCommit,
    });
  }
  return { candidate: candidateTags, source: sourceTags };
};

/** Creates one immutable Git-object inventory for retained evaluation artifacts. */
const createGitFileInventory = ({ commit, executeGitCommand, prefixes, repositoryRoot }) => {
  const paths = parseNulPaths(
    requireGit(
      executeGitCommand,
      repositoryRoot,
      ['ls-tree', '-r', '-z', '--name-only', commit, '--', ...prefixes],
      `Unable to inventory retained artifacts at ${commit}`,
    ),
  );
  const entries = paths.map((path) => ({
    path,
    sha256: sha256(
      requireGit(
        executeGitCommand,
        repositoryRoot,
        ['show', `${commit}:${path}`],
        `Unable to read retained artifact ${path}`,
      ),
    ),
  }));
  return { digest: sha256(`${JSON.stringify(entries)}\n`), entries };
};

/** Requires semantic and qualification attempt bytes to match immutable release 4.0.1. */
const assertRetainedAttemptInventories = ({
  candidateCommit,
  executeGitCommand,
  repositoryRoot,
}) => {
  const inventories = {};
  for (const [name, prefixes] of Object.entries({
    qualification: ['qualification/results'],
    semantic: ['fixtures/semantic-evaluation-results/attempts'],
  })) {
    const source = createGitFileInventory({
      commit: SKILL_401_COMMIT,
      executeGitCommand,
      prefixes,
      repositoryRoot,
    });
    const candidate = createGitFileInventory({
      commit: candidateCommit,
      executeGitCommand,
      prefixes,
      repositoryRoot,
    });
    assert.deepEqual(candidate, source, `${name} attempt inventory changed.`);
    inventories[name] = { candidate, source };
  }
  return inventories;
};

/** Creates the final registry-backed 4.0.2 attestation without running any model. */
export const createCompatibilityBridge402Attestation = async ({
  executeGitCommand = executeGit,
  fetchResource = fetch,
  packagesCommit,
  packagesRepository,
  repositoryRoot,
}) => {
  const resolvedRepositoryRoot = resolve(repositoryRoot);
  assertCompatibility402Expansion(COMPATIBILITY_401, COMPATIBILITY_402);
  assertRepositoryCompatibility(resolvedRepositoryRoot, COMPATIBILITY_402);
  const compatibilityDecisions = createCompatibilityDecisionIdentity();
  const carryForward401 = assertCarryForward401Inputs({
    executeGitCommand,
    repositoryRoot: resolvedRepositoryRoot,
  });
  const skillSourceState = assertSkillSourceState({
    executeGitCommand,
    repositoryRoot: resolvedRepositoryRoot,
  });
  const retainedAttempts = assertRetainedAttemptInventories({
    candidateCommit: skillSourceState.candidateCommit,
    executeGitCommand,
    repositoryRoot: resolvedRepositoryRoot,
  });
  const sourceState = assertPackagesSourceState({
    executeGitCommand,
    packagesCommit,
    packagesRepository,
  });
  const [sourceArtifacts, candidateArtifacts] = await Promise.all([
    loadPublishedPackageArtifacts({ candidate: false, fetchResource }),
    loadPublishedPackageArtifacts({ candidate: true, fetchResource }),
  ]);
  assertSkillLockRegistryIdentity({
    candidateArtifacts,
    candidateCommit: skillSourceState.candidateCommit,
    executeGitCommand,
    repositoryRoot: resolvedRepositoryRoot,
  });
  const packageDigests = comparePackageArtifactSets(sourceArtifacts, candidateArtifacts);
  assertCandidateSourceProjection({
    artifacts: candidateArtifacts,
    executeGitCommand,
    packagesCommit,
    packagesRepository,
    sourceArtifacts,
  });
  const packageTags = assertPackageTags({
    executeGitCommand,
    packagesCommit,
    packagesRepository,
  });
  const gate = createPackagesGateIdentity({
    executeGitCommand,
    packagesCommit,
    packagesRepository,
  });
  const frozenSurface = createFrozenCompatibilitySurface(resolvedRepositoryRoot);
  const pinnedSurface = createFrozenCompatibilitySurfaceAtCommit({
    executeGitCommand,
    repositoryRoot: resolvedRepositoryRoot,
    skillCommit: gate.pinnedSkillCommit,
  });
  assert.deepEqual(frozenSurface.files, pinnedSurface.files);
  assert.deepEqual(frozenSurface.scripts, pinnedSurface.scripts);
  return {
    schemaVersion: COMPATIBILITY_BRIDGE_402_SCHEMA_VERSION,
    sourceRelease: COMPATIBILITY_401.skillVersion,
    sourceCommit: SKILL_401_COMMIT,
    targetRelease: COMPATIBILITY_402.skillVersion,
    modelRunsPerformed: false,
    compatibility: {
      source: COMPATIBILITY_401,
      candidate: COMPATIBILITY_402,
      decisions: compatibilityDecisions.decisions,
      decisionDigest: compatibilityDecisions.digest,
      digest: sha256(
        `${JSON.stringify({
          source: COMPATIBILITY_401,
          candidate: COMPATIBILITY_402,
          decisions: compatibilityDecisions.decisions,
        })}\n`,
      ),
    },
    carryForward401,
    frozenSurface,
    gate,
    packages: { packageDigests, packageTags, sourceState },
    retainedAttempts,
    skill: skillSourceState,
  };
};

/** Writes the final attestation once and refuses every overwrite attempt. */
export const writeCompatibilityBridge402Attestation = async (options) => {
  const destinationPath = join(
    resolve(options.repositoryRoot),
    ...COMPATIBILITY_BRIDGE_402_PATH.split('/'),
  );
  const temporaryPath = `${destinationPath}.tmp`;
  if (existsSync(destinationPath) || existsSync(temporaryPath)) {
    throw new Error(`Refusing to overwrite ${COMPATIBILITY_BRIDGE_402_PATH}.`);
  }
  const attestation = await createCompatibilityBridge402Attestation(options);
  mkdirSync(dirname(destinationPath), { recursive: true });
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(attestation, null, 2)}\n`, {
      flag: 'wx',
    });
    renameSync(temporaryPath, destinationPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return attestation;
};

/** Parses one exact option set without accepting duplicates or positional values. */
const parseCommandOptions = (arguments_) => {
  const options = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!['--packages-repository', '--artifact-directory', '--packages-commit'].includes(name)) {
      throw new Error(`Unsupported compatibility bridge argument: ${String(name)}`);
    }
    assert.equal(options.has(name), false, `Duplicate compatibility bridge argument: ${name}`);
    assert.ok(value !== undefined && !value.startsWith('--'), `Missing value for ${name}.`);
    options.set(name, value);
  }
  return options;
};

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

/** Runs the release-specific command interface. */
const runDirectExecution = async () => {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const [operation, ...arguments_] = process.argv.slice(2);
  try {
    if (operation === '--check-packages') {
      const options = parseCommandOptions(arguments_);
      assert.equal(options.size, 3, 'Package comparison requires all three named arguments.');
      const result = await checkCompatibilityBridgePackages({
        artifactDirectory: resolve(options.get('--artifact-directory')),
        packagesCommit: options.get('--packages-commit'),
        packagesRepository: resolve(options.get('--packages-repository')),
        repositoryRoot,
      });
      process.stdout.write(`${JSON.stringify(result)}\n`);
      return;
    }
    if (operation === '--write') {
      assert.equal(arguments_.length, 0, 'The writer does not accept command-line overrides.');
      const packagesRepository = resolve(repositoryRoot, '..', 'packages');
      const packagesCommit = requireGit(
        executeGit,
        packagesRepository,
        ['rev-parse', '--verify', 'HEAD^{commit}'],
        'Unable to resolve the packages release commit',
      )
        .toString('utf8')
        .trim();
      const attestation = await writeCompatibilityBridge402Attestation({
        packagesCommit,
        packagesRepository,
        repositoryRoot,
      });
      process.stdout.write(`${JSON.stringify(attestation)}\n`);
      return;
    }
    throw new Error(
      'Usage: compatibility-bridge-4-0-2.mjs --check-packages --packages-repository <path> --artifact-directory <path> --packages-commit <commit> | --write',
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (isDirectExecution) await runDirectExecution();
