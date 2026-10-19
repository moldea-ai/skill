import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  REPAIR_GIT_COMMON_CONFIGURATIONS,
  REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS,
  REPAIR_GIT_INDEX_ARGUMENTS,
} from '../../portable/repair-git/index.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const HARDENED_GIT_COMMON_CONFIGURATIONS = REPAIR_GIT_COMMON_CONFIGURATIONS;
const HARDENED_GIT_DIFF_CONFIGURATION = 'diff.external=';

const createGitConfigurationArguments = (configurations: readonly string[]): string[] =>
  configurations.flatMap((configuration) => ['-c', configuration]);

// exact status arguments accepted by the evaluator-owned Git boundary
export const CODEX_EVALUATION_GIT_STATUS_ARGUMENTS = Object.freeze([
  ...createGitConfigurationArguments(HARDENED_GIT_COMMON_CONFIGURATIONS),
  '--no-pager',
  'status',
  '--porcelain=v2',
  '-z',
  '--ignore-submodules=all',
]);

// exact prefix for a bounded diff followed by one or more repository-relative paths
export const CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX = Object.freeze([
  ...createGitConfigurationArguments([
    ...HARDENED_GIT_COMMON_CONFIGURATIONS,
    HARDENED_GIT_DIFF_CONFIGURATION,
  ]),
  '--no-pager',
  'diff',
  '--no-ext-diff',
  '--no-textconv',
  '--ignore-submodules=all',
  '--',
]);

/** Checks the complete hardened argument contract for a repair checkpoint Git read. */
export const isApprovedRepairGitArguments = (argumentsList: readonly string[]): boolean => {
  const configurations = new Set<string>();
  let index = 0;
  while (argumentsList[index] === '-c') {
    const configuration = argumentsList[index + 1];
    if (configuration === undefined || configurations.has(configuration)) return false;
    configurations.add(configuration);
    index += 2;
  }
  if (argumentsList[index++] !== '--no-pager') return false;
  const command = argumentsList[index];
  const expectedConfigurations =
    command === 'diff'
      ? [...HARDENED_GIT_COMMON_CONFIGURATIONS, HARDENED_GIT_DIFF_CONFIGURATION]
      : HARDENED_GIT_COMMON_CONFIGURATIONS;
  if (
    configurations.size !== expectedConfigurations.length ||
    !expectedConfigurations.every((configuration) => configurations.has(configuration))
  )
    return false;
  const shape = argumentsList.slice(index);
  if (command === 'config')
    return (
      shape.length === REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS.length &&
      shape.every(
        (argument, position) => argument === REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS[position],
      )
    );
  if (command === 'cat-file')
    return (
      shape.length === 3 &&
      shape[1] === '-t' &&
      /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(shape[2] ?? '')
    );
  if (command === 'ls-files') {
    return (
      shape.length === REPAIR_GIT_INDEX_ARGUMENTS.length &&
      shape.every((argument, position) => argument === REPAIR_GIT_INDEX_ARGUMENTS[position])
    );
  }
  if (command === 'status') {
    const expected = [
      'status',
      '--porcelain=v2',
      '-z',
      '--ignore-submodules=all',
      '--untracked-files=all',
      '--branch',
    ];
    return (
      shape.length === expected.length &&
      shape.every((argument, position) => argument === expected[position])
    );
  }
  const prefix = ['diff', '--no-ext-diff', '--no-textconv', '--ignore-submodules=all'];
  if (!prefix.every((argument, position) => shape[position] === argument)) return false;
  const tail = shape.slice(prefix.length);
  if (tail[0] === '--') {
    return (
      tail.length > 1 &&
      tail
        .slice(1)
        .every(
          (path) =>
            !/^[-~]/u.test(path) &&
            !/[:\\*?[\]{}\p{Cc}]/u.test(path) &&
            path
              .split('/')
              .every(
                (segment) =>
                  segment !== '' &&
                  segment !== '.' &&
                  segment !== '..' &&
                  !EXCLUDED_DIRECTORY_NAMES.has(segment),
              ),
        )
    );
  }
  const isChangedPaths = tail[0] === '--name-only' && tail[1] === '--no-renames';
  const remainder = isChangedPaths ? tail.slice(tail[2] === '-z' ? 3 : 2) : tail;
  const [commit, separator, path] = remainder;
  return (
    remainder.length === 3 &&
    commit !== undefined &&
    commit.length > 0 &&
    !/^[-^]/u.test(commit) &&
    !/[\s\0]/u.test(commit) &&
    !commit.includes('..') &&
    !/\^[!@-]/u.test(commit) &&
    separator === '--' &&
    path === (isChangedPaths ? '.' : 'moldea/moldea.yaml')
  );
};

/**
 * Validates evaluator-owned workspace paths that the sandbox mounts read-only.
 * @param workspacePaths The relative paths that cannot contain actor-authored attributes.
 * @returns The normalized paths embedded into the isolated Git wrapper.
 */
const normalizeTrustedReadOnlyWorkspacePaths = (workspacePaths: readonly string[]): string[] => {
  const normalizedWorkspacePaths = [...new Set(workspacePaths)];
  for (const workspacePath of normalizedWorkspacePaths) {
    if (
      typeof workspacePath !== 'string' ||
      workspacePath.length === 0 ||
      workspacePath.includes('\\') ||
      workspacePath
        .split('/')
        .some(
          (segment) =>
            segment.length === 0 ||
            segment === '.' ||
            segment === '..' ||
            EXCLUDED_DIRECTORY_NAMES.has(segment),
        )
    ) {
      throw new Error(`Invalid trusted read-only workspace path: ${workspacePath}.`);
    }
  }
  return normalizedWorkspacePaths.sort();
};

const TRUSTED_READ_ONLY_WORKSPACE_PATHS_PLACEHOLDER =
  '__MOLDEA_TRUSTED_READ_ONLY_WORKSPACE_PATHS__';

// wrapper source that prevents repository configuration from delegating Git execution
const GIT_COMMAND_POLICY_WRAPPER_SOURCE = [
  '#!/opt/node',
  "const { spawnSync } = require('node:child_process');",
  "const { appendFileSync, existsSync, statSync, readlinkSync, closeSync, constants, fstatSync, lstatSync, opendirSync, openSync, readSync } = require('node:fs');",
  "const { dirname, join, resolve, sep } = require('node:path');",
  '',
  "const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);",
  `const TRUSTED_READ_ONLY_WORKSPACE_PATHS = new Set(${TRUSTED_READ_ONLY_WORKSPACE_PATHS_PLACEHOLDER});`,
  "const FILTER_ATTRIBUTE = Buffer.from('filter');",
  'const REAL_GIT_EXECUTABLE = __REAL_GIT_EXECUTABLE__;',
  'const INVOCATION_LOG_PATH = __INVOCATION_LOG_PATH__;',
  'const MAX_GIT_ATTRIBUTE_TRAVERSAL_DEPTH = 64;',
  'const MAX_GIT_ATTRIBUTE_TRAVERSAL_ENTRIES = 4_096;',
  'const MAX_GIT_FILE_BYTES = 32_768;',
  'const MAX_GIT_INSPECTION_BYTES = 32_768;',
  "const SAFE_GIT_ARGUMENTS = ['-c', 'log.showSignature=false'];",
  `const HARDENED_GIT_COMMON_CONFIGURATIONS = new Set(${JSON.stringify(HARDENED_GIT_COMMON_CONFIGURATIONS)});`,
  `const HARDENED_GIT_DIFF_CONFIGURATION = ${JSON.stringify(HARDENED_GIT_DIFF_CONFIGURATION)};`,
  'const GIT_OBJECT_ID_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;',
  'const RELEASE_CLI_GIT_PREFIX = [',
  "  '--no-pager',",
  "  '-c',",
  "  'color.ui=false',",
  "  '-c',",
  "  'core.fsmonitor=false',",
  "  '-c',",
  "  'submodule.recurse=false',",
  '];',
  '',
  'const readFileWithinLimit = (path) => {',
  '  const descriptor = openSync(',
  '    path,',
  '    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,',
  '  );',
  '  try {',
  '    const stats = fstatSync(descriptor);',
  "    if (!stats.isFile()) throw new Error('A Git attribute source has an unsupported type.');",
  '    if (stats.size > MAX_GIT_FILE_BYTES) {',
  "      throw new Error('Git attribute evidence exceeded the evaluator limit.');",
  '    }',
  '    const content = Buffer.allocUnsafe(MAX_GIT_FILE_BYTES + 1);',
  '    let byteCount = 0;',
  '    while (byteCount < content.byteLength) {',
  '      const bytesRead = readSync(',
  '        descriptor,',
  '        content,',
  '        byteCount,',
  '        content.byteLength - byteCount,',
  '        null,',
  '      );',
  '      if (bytesRead === 0) return content.subarray(0, byteCount);',
  '      byteCount += bytesRead;',
  '    }',
  "    throw new Error('Git attribute evidence exceeded the evaluator limit.');",
  '  } finally {',
  '    closeSync(descriptor);',
  '  }',
  '};',
  '',
  'const findRepositoryRoot = () => {',
  '  let currentPath = resolve(process.cwd());',
  '  while (true) {',
  "    const gitPath = join(currentPath, '.git');",
  '    try {',
  '      const stats = lstatSync(gitPath);',
  '      if (stats.isDirectory() || stats.isFile()) return currentPath;',
  '      throw new Error("The repository\'s .git path has an unsupported type.");',
  '    } catch (error) {',
  "      if (error?.code !== 'ENOENT') throw error;",
  '    }',
  '    const parentPath = dirname(currentPath);',
  '    if (parentPath === currentPath) return null;',
  '    currentPath = parentPath;',
  '  }',
  '};',
  '',
  'const resolveGitDirectory = (repositoryRoot) => {',
  "  const gitPath = join(repositoryRoot, '.git');",
  '  const stats = lstatSync(gitPath);',
  '  if (stats.isDirectory()) return gitPath;',
  '  if (!stats.isFile()) throw new Error("The repository\'s .git path has an unsupported type.");',
  "  const declaration = readFileWithinLimit(gitPath).toString('utf8').trim();",
  '  const match = /^gitdir: (.+)$/u.exec(declaration);',
  "  if (match === null) throw new Error('The Git directory declaration is invalid.');",
  '  return resolve(repositoryRoot, match[1]);',
  '};',
  '',
  'const resolveGitCommonDirectory = (gitDirectory) => {',
  '  const stats = lstatSync(gitDirectory);',
  "  if (!stats.isDirectory()) throw new Error('The Git directory has an unsupported type.');",
  "  const commonDirectoryDeclarationPath = join(gitDirectory, 'commondir');",
  '  let declaration;',
  '  try {',
  '    declaration = readFileWithinLimit(commonDirectoryDeclarationPath)',
  "      .toString('utf8')",
  '      .trim();',
  '  } catch (error) {',
  '    if (error?.code === "ENOENT") return gitDirectory;',
  '    throw error;',
  '  }',
  '  if (!/^[^\\0\\r\\n]+$/u.test(declaration)) {',
  "    throw new Error('The Git common-directory declaration is invalid.');",
  '  }',
  '  const commonDirectory = resolve(gitDirectory, declaration);',
  '  const commonDirectoryStats = lstatSync(commonDirectory);',
  '  if (!commonDirectoryStats.isDirectory()) {',
  "    throw new Error('The Git common directory has an unsupported type.');",
  '  }',
  '  return commonDirectory;',
  '};',
  '',
  'const assertAttributeFileIsSafe = (path) => {',
  '  if (readFileWithinLimit(path).includes(FILTER_ATTRIBUTE)) {',
  "    throw new Error('A Git attribute source can activate a repository filter.');",
  '  }',
  '};',
  '',
  'const assertWorkingTreeAttributesAreSafe = (repositoryRoot) => {',
  '  let inspectedEntryCount = 0;',
  '  const visit = (directoryPath, relativeDirectoryPath, depth) => {',
  '    if (depth > MAX_GIT_ATTRIBUTE_TRAVERSAL_DEPTH) {',
  "      throw new Error('Git attribute traversal exceeded the evaluator depth limit.');",
  '    }',
  '    const directory = opendirSync(directoryPath);',
  '    try {',
  '      let entry;',
  '      while ((entry = directory.readSync()) !== null) {',
  "        if (entry.name === '.git') continue;",
  "        const relativePath = relativeDirectoryPath === '' ? entry.name : join(relativeDirectoryPath, entry.name);",
  '        if (TRUSTED_READ_ONLY_WORKSPACE_PATHS.has(relativePath)) continue;',
  '        inspectedEntryCount += 1;',
  '        if (inspectedEntryCount > MAX_GIT_ATTRIBUTE_TRAVERSAL_ENTRIES) {',
  "          throw new Error('Git attribute traversal exceeded the evaluator entry limit.');",
  '        }',
  '        const absolutePath = join(directoryPath, entry.name);',
  '        if (entry.isDirectory()) {',
  '          if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {',
  "            throw new Error('An excluded directory prevents complete Git attribute inspection.');",
  '          }',
  '          visit(absolutePath, relativePath, depth + 1);',
  "        } else if (entry.name === '.gitattributes') {",
  '          assertAttributeFileIsSafe(absolutePath);',
  '        }',
  '      }',
  '    } finally {',
  '      directory.closeSync();',
  '    }',
  '  };',
  "  visit(repositoryRoot, '', 0);",
  '};',
  '',
  'const listIndexedAttributePaths = (repositoryRoot) => {',
  '  const result = spawnSync(REAL_GIT_EXECUTABLE, [',
  "    '-c',",
  "    'core.fsmonitor=false',",
  "    '--no-pager',",
  "    'ls-files',",
  "    '-z',",
  "    '--',",
  "    ':(glob)**/.gitattributes',",
  '  ], {',
  '    cwd: repositoryRoot,',
  "    encoding: 'buffer',",
  '    env: {',
  '      ...process.env,',
  '      GIT_LITERAL_PATHSPECS: undefined,',
  '      GIT_GLOB_PATHSPECS: undefined,',
  '      GIT_NOGLOB_PATHSPECS: undefined,',
  '      GIT_ICASE_PATHSPECS: undefined,',
  '      GIT_WORK_TREE: repositoryRoot,',
  "      GIT_ATTR_NOSYSTEM: '1',",
  "      GIT_CONFIG_GLOBAL: '/dev/null',",
  "      GIT_CONFIG_NOSYSTEM: '1',",
  "      GIT_OPTIONAL_LOCKS: '0',",
  '    },',
  '    maxBuffer: MAX_GIT_INSPECTION_BYTES,',
  '  });',
  '  if (result.error) throw result.error;',
  "  if (result.status !== 0) throw new Error('Git index attribute inspection failed.');",
  "  return result.stdout.toString('utf8').split('\\0').filter(Boolean);",
  '};',
  '',
  'const assertIndexAttributeFallbacksAreSafe = (repositoryRoot) => {',
  '  for (const relativePath of listIndexedAttributePaths(repositoryRoot)) {',
  '    const absolutePath = resolve(repositoryRoot, relativePath);',
  '    if (!absolutePath.startsWith(`${repositoryRoot}${sep}`)) {',
  "      throw new Error('An indexed Git attribute path escapes the repository.');",
  '    }',
  '    try {',
  '      assertAttributeFileIsSafe(absolutePath);',
  '    } catch (error) {',
  '      if (error?.code === "ENOENT") {',
  "        throw new Error('An indexed Git attribute fallback cannot be inspected safely.');",
  '      }',
  '      throw error;',
  '    }',
  '  }',
  '};',
  '',
  'const assertGitAttributesAreSafe = (repositoryRoot) => {',
  "  const attributeSource = spawnSync(REAL_GIT_EXECUTABLE, ['-c', 'core.fsmonitor=false', '--no-pager', 'config', '--null', '--get', 'attr.tree'], {",
  '    cwd: repositoryRoot,',
  '    encoding: "buffer",',
  '    env: { ...process.env, GIT_WORK_TREE: repositoryRoot, GIT_ATTR_SOURCE: undefined, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },',
  '    maxBuffer: MAX_GIT_INSPECTION_BYTES,',
  '  });',
  '  if (attributeSource.error || attributeSource.status !== 1) throw new Error("Stored Git attribute sources are unverified.");',
  '  assertWorkingTreeAttributesAreSafe(repositoryRoot);',
  '  assertIndexAttributeFallbacksAreSafe(repositoryRoot);',
  '  const gitDirectory = resolveGitDirectory(repositoryRoot);',
  '  const commonGitDirectory = resolveGitCommonDirectory(gitDirectory);',
  "  const infoAttributesPath = join(commonGitDirectory, 'info', 'attributes');",
  '  try {',
  '    assertAttributeFileIsSafe(infoAttributesPath);',
  '  } catch (error) {',
  "    if (error?.code !== 'ENOENT') throw error;",
  '  }',
  '};',
  '',
  'const hasConflictingSubmoduleOption = (options) =>',
  '  options.some(',
  '    (option) =>',
  "      (option.startsWith('--ignore-submodules=') && option !== '--ignore-submodules=all') ||",
  "      option === '--no-ignore-submodules' ||",
  "      option === '--recurse-submodules' ||",
  "      option.startsWith('--recurse-submodules='),",
  '  );',
  '',
  'const hasExactArguments = (argumentsList, expectedArguments) =>',
  '  argumentsList.length === expectedArguments.length &&',
  '  argumentsList.every((argument, index) => argument === expectedArguments[index]);',
  '',
  '/** Identifies the one literal canonical pathspec emitted by selected release CLI reads. */',
  'const isApprovedReleaseCliPathspec = (pathspec) => {',
  "  const prefix = ':(top,literal)';",
  '  if (!pathspec.startsWith(prefix)) return false;',
  '  const path = pathspec.slice(prefix.length);',
  '  if (',
  "    path.length === 0 || path.endsWith('/') || path.includes('\\\\') || /[\\0-\\x1f\\x7f?*[\\]{}]/u.test(path)",
  '  ) {',
  '    return false;',
  '  }',
  "  if (path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {",
  '    return false;',
  '  }',
  '  return (',
  "    path === 'moldea/moldea.yaml' ||",
  "    path === 'moldea/project.md' ||",
  '    /^moldea\\/context\\/(?:[^/]+\\/)*[^/]+\\.md$/u.test(path) ||',
  '    /^moldea\\/decisions\\/[^/]+\\.md$/u.test(path) ||',
  '    /^moldea\\/runtimes\\/(?:[^/]+\\/)*[^/]+\\.md$/u.test(path) ||',
  '    /^moldea\\/agents\\/[^/]+\\/(?:description|instruction|handoff-description)\\.md$/u.test(path)',
  '  );',
  '};',
  '',
  '// the release CLI instruction probe selects exactly these coding-agent instruction files',
  'const RELEASE_CLI_INSTRUCTION_PATHSPECS = [',
  "  ':(top,literal)AGENTS.md',",
  "  ':(top,literal)CLAUDE.md',",
  "  ':(top,literal).claude/CLAUDE.md',",
  "  ':(top,literal)CLAUDE.local.md',",
  '];',
  '',
  '/** Matches a fixed release CLI inventory command with one canonical or the instruction selection. */',
  'const hasApprovedReleaseCliInventoryArguments = (argumentsList, expectedArguments) =>',
  '  hasExactArguments(argumentsList, expectedArguments) ||',
  '  hasExactArguments(argumentsList, [...expectedArguments, ...RELEASE_CLI_INSTRUCTION_PATHSPECS]) ||',
  '  (',
  '    argumentsList.length === expectedArguments.length + 1 &&',
  '    expectedArguments.every((argument, index) => argumentsList[index] === argument) &&',
  '    isApprovedReleaseCliPathspec(argumentsList.at(-1))',
  '  );',
  '',
  "/** Allows the release CLI's finite read-only Git discovery and inventory commands. */",
  'const isApprovedReleaseCliGitCommand = (argumentsList) => {',
  '  if (',
  '    argumentsList.length <= RELEASE_CLI_GIT_PREFIX.length ||',
  '    !RELEASE_CLI_GIT_PREFIX.every((argument, index) => argumentsList[index] === argument)',
  '  ) {',
  '    return false;',
  '  }',
  '  const commandArguments = argumentsList.slice(RELEASE_CLI_GIT_PREFIX.length);',
  "  if (hasExactArguments(commandArguments, ['--version'])) return true;",
  "  if (commandArguments[0] !== '-C' || !commandArguments[1]) return false;",
  '  const repositoryArguments = commandArguments.slice(2);',
  '  const exactRepositoryCommands = [',
  "    ['rev-parse', '--is-inside-work-tree'],",
  "    ['rev-parse', '--show-toplevel'],",
  "    ['rev-parse', '--absolute-git-dir'],",
  "    ['rev-parse', '--git-common-dir'],",
  "    ['config', '--type=bool', '--default=false', '--get', 'core.sparseCheckout'],",
  "    ['config', '--type=bool', '--default=true', '--get', 'core.symlinks'],",
  '    [',
  "      'ls-files',",
  "      '--cached',",
  "      '--stage',",
  "      '--full-name',",
  "      '--no-abbrev',",
  "      '--no-recurse-submodules',",
  "      '-z',",
  "      '--',",
  '    ],',
  '    [',
  "      'ls-files',",
  "      '--others',",
  "      '--exclude-standard',",
  "      '--full-name',",
  "      '--no-recurse-submodules',",
  "      '-z',",
  "      '--',",
  '    ],',
  "    ['check-attr', '--stdin', '-z', 'filter', 'working-tree-encoding', 'ident'],",
  '  ];',
  '  // ignored files are listed only for the instruction selection',
  '  if (',
  '    hasExactArguments(repositoryArguments, [',
  "      'ls-files',",
  "      '--others',",
  "      '--ignored',",
  "      '--exclude-standard',",
  "      '--full-name',",
  "      '--no-recurse-submodules',",
  "      '-z',",
  "      '--',",
  '      ...RELEASE_CLI_INSTRUCTION_PATHSPECS,',
  '    ])',
  '  ) {',
  '    return true;',
  '  }',
  '  return exactRepositoryCommands.some((expectedArguments) =>',
  "    expectedArguments[0] === 'ls-files'",
  '      ? hasApprovedReleaseCliInventoryArguments(repositoryArguments, expectedArguments)',
  '      : hasExactArguments(repositoryArguments, expectedArguments),',
  '  );',
  '};',
  '',
  '/** Allows only Git shapes whose helper and output behavior the evaluator bounds. */',
  'const isApprovedGitCommand = (argumentsList) => {',
  "  if (argumentsList.length === 1 && argumentsList[0] === '--version') return true;",
  '  if (isApprovedReleaseCliGitCommand(argumentsList)) return true;',
  '',
  '  const configurations = new Set();',
  '  let index = 0;',
  "  while (argumentsList[index] === '-c') {",
  '    const configuration = argumentsList[index + 1];',
  '    if (configuration === undefined || configurations.has(configuration)) return false;',
  '    configurations.add(configuration);',
  '    index += 2;',
  '  }',
  '',
  "  if (argumentsList[index] !== '--no-pager') return false;",
  '  const subcommand = argumentsList[index + 1];',
  '  const subcommandArguments = argumentsList.slice(index + 2);',
  '  const requiredConfigurations = new Set(HARDENED_GIT_COMMON_CONFIGURATIONS);',
  "  if (subcommand === 'diff' || subcommand === 'show') {",
  '    requiredConfigurations.add(HARDENED_GIT_DIFF_CONFIGURATION);',
  '  }',
  '  if (',
  '    configurations.size !== requiredConfigurations.size ||',
  '    [...requiredConfigurations].some((configuration) => !configurations.has(configuration))',
  '  ) {',
  '    return false;',
  '  }',
  '',
  "  if (subcommand === 'config') return hasExactArguments(subcommandArguments, ['--null', '--get', 'attr.tree']);",
  "  if (subcommand === 'cat-file') return subcommandArguments.length === 2 && subcommandArguments[0] === '-t' && GIT_OBJECT_ID_PATTERN.test(subcommandArguments[1]);",
  "  if (subcommand === 'ls-files') {",
  "    return hasExactArguments(subcommandArguments, ['-z', '--', '.']);",
  '  }',
  '',
  "  if (subcommand === 'status') {",
  '    return (',
  "      subcommandArguments.includes('--porcelain=v2') &&",
  "      subcommandArguments.includes('-z') &&",
  "      subcommandArguments.includes('--ignore-submodules=all') &&",
  '      !hasConflictingSubmoduleOption(subcommandArguments)',
  '    );',
  '  }',
  '',
  "  if (subcommand === 'log') {",
  "    const nameStatusMaximumMatch = /^--max-count=(\\d+)$/u.exec(subcommandArguments[2] ?? '');",
  '    if (',
  '      subcommandArguments.length === 3 &&',
  "      subcommandArguments[0] === '--format=fuller' &&",
  "      subcommandArguments[1] === '--name-status' &&",
  '      nameStatusMaximumMatch !== null',
  '    ) {',
  '      const maximumEntries = Number(nameStatusMaximumMatch[1]);',
  '      return (',
  '        Number.isSafeInteger(maximumEntries) &&',
  '        maximumEntries > 0 &&',
  '        maximumEntries <= 128',
  '      );',
  '    }',
  '',
  '    const safeMetadataPrefixes = [',
  "      ['--format=%H%x09%s'],",
  "      ['--format=%H%x09%aI%x09%s', '--all', '--decorate=no'],",
  "      ['--all', '--date=iso-strict', '--format=%H%x09%ad%x09%s'],",
  '    ];',
  '    const matchingPrefix = safeMetadataPrefixes.find(',
  '      (prefix) =>',
  '        subcommandArguments.length === prefix.length + 2 &&',
  '        prefix.every(',
  '          (argument, argumentIndex) => subcommandArguments[argumentIndex] === argument,',
  '        ),',
  '    );',
  '    const maximumEntries = Number(subcommandArguments.at(-1));',
  '    return (',
  '      matchingPrefix !== undefined &&',
  "      subcommandArguments.at(-2) === '-n' &&",
  '      Number.isSafeInteger(maximumEntries) &&',
  '      maximumEntries > 0 &&',
  '      maximumEntries <= 128',
  '    );',
  '  }',
  '',
  "  if (subcommand === 'diff') {",
  "    const pathspecSeparatorIndex = subcommandArguments.indexOf('--');",
  '    const options = subcommandArguments.slice(0, pathspecSeparatorIndex);',
  '    return (',
  '      pathspecSeparatorIndex !== -1 &&',
  '      pathspecSeparatorIndex < subcommandArguments.length - 1 &&',
  "      options.includes('--no-ext-diff') &&",
  "      options.includes('--no-textconv') &&",
  "      options.includes('--ignore-submodules=all') &&",
  "      !options.includes('--ext-diff') &&",
  "      !options.includes('--textconv') &&",
  '      !hasConflictingSubmoduleOption(options)',
  '    );',
  '  }',
  '',
  "  if (subcommand === 'show') {",
  '    return (',
  '      subcommandArguments.length === 6 &&',
  "      subcommandArguments[0] === '--no-ext-diff' &&",
  "      subcommandArguments[1] === '--no-textconv' &&",
  "      subcommandArguments[2] === '--format=fuller' &&",
  "      subcommandArguments[3] === '--stat' &&",
  "      subcommandArguments[4] === '--summary' &&",
  '      GIT_OBJECT_ID_PATTERN.test(subcommandArguments[5])',
  '    );',
  '  }',
  '',
  '  return false;',
  '};',
  '',
  'const invocationOrigin = () => {',
  '  if (process.env.MOLDEA_EVAL_MODEL_COMMAND === "1") return "actor";',
  '  try { return readlinkSync(`/proc/${process.ppid}/exe`) === "/opt/codex" ? "host" : "actor"; }',
  '  catch { return "actor"; }',
  '};',
  '',
  'const main = () => {',
  '  const argumentsList = process.argv.slice(2);',
  '  const approved = isApprovedGitCommand(argumentsList);',
  '  const record = JSON.stringify({ arguments: argumentsList, approved, origin: invocationOrigin(), releaseCli: isApprovedReleaseCliGitCommand(argumentsList) }) + "\\n";',
  '  try {',
  '  const size = existsSync(INVOCATION_LOG_PATH) ? statSync(INVOCATION_LOG_PATH).size : 0;',
  '  if (size + Buffer.byteLength(record) > 1048576) {',
  '    appendFileSync(INVOCATION_LOG_PATH, "CAPTURE_LIMIT\\n");',
  '    throw new Error("Git invocation capture exceeded its limit.");',
  '  }',
  '  appendFileSync(INVOCATION_LOG_PATH, record);',
  '  } catch {',
  '    process.stderr.write("MOLDEA_GIT_CAPTURE_FAILED\\n");',
  '    process.exitCode = 3;',
  '    return;',
  '  }',
  '  if (!approved) {',
  "    process.stderr.write('Git command blocked: command shape is not evaluator-approved.\\n');",
  '    process.exitCode = 2;',
  '    return;',
  '  }',
  '  const repositoryRoot = findRepositoryRoot();',
  '  if (repositoryRoot !== null) assertGitAttributesAreSafe(repositoryRoot);',
  '  const result = spawnSync(REAL_GIT_EXECUTABLE, [...SAFE_GIT_ARGUMENTS, ...argumentsList], {',
  '    env: {',
  '      ...process.env,',
  '      GIT_WORK_TREE: repositoryRoot ?? undefined,',
  '      GIT_ATTR_SOURCE: undefined,',
  "      GIT_CONFIG_GLOBAL: '/dev/null',",
  "      GIT_CONFIG_NOSYSTEM: '1',",
  "      GIT_OPTIONAL_LOCKS: '0',",
  '    },',
  "    stdio: 'inherit',",
  '  });',
  '  if (result.error) throw result.error;',
  '  process.exitCode = result.status ?? 1;',
  '};',
  '',
  'try {',
  '  main();',
  '} catch {',
  "  process.stderr.write('Git command blocked: repository attribute safety was not established.\\n');",
  '  process.exitCode = 2;',
  '}',
  '',
].join('\n');

/**
 * Creates the Git wrapper source for the evaluator-owned read-only workspace paths.
 * @param trustedReadOnlyWorkspacePaths Evaluator-owned relative paths mounted read-only.
 * @returns The complete executable wrapper source.
 */
const createGitCommandPolicyWrapperSource = (
  trustedReadOnlyWorkspacePaths: readonly string[],
  realGitExecutable: string,
  invocationLogPath: string,
): string =>
  GIT_COMMAND_POLICY_WRAPPER_SOURCE.replace(
    TRUSTED_READ_ONLY_WORKSPACE_PATHS_PLACEHOLDER,
    JSON.stringify(trustedReadOnlyWorkspacePaths),
  )
    .replace('__REAL_GIT_EXECUTABLE__', JSON.stringify(realGitExecutable))
    .replace('__INVOCATION_LOG_PATH__', JSON.stringify(invocationLogPath));

/**
 * Installs the evaluator-owned Git boundary ahead of the system executable.
 * @param directoryPath The isolated command directory mounted first on actor PATH.
 * @param options Evaluator-owned read-only paths excluded from the repository entry budget.
 * @returns A promise that resolves to the installed wrapper path.
 * @throws
 * - If a trusted read-only workspace path is invalid or conflicts with an excluded directory
 */
export const prepareGitCommandPolicyBoundary = async (
  directoryPath: string,
  {
    trustedReadOnlyWorkspacePaths = [],
    realGitExecutable,
    invocationLogPath,
  }: {
    trustedReadOnlyWorkspacePaths?: readonly string[];
    realGitExecutable: string;
    invocationLogPath: string;
  },
): Promise<string> => {
  const wrapperPath = join(directoryPath, 'git');
  const wrapperSource = createGitCommandPolicyWrapperSource(
    normalizeTrustedReadOnlyWorkspacePaths(trustedReadOnlyWorkspacePaths),
    realGitExecutable,
    invocationLogPath,
  );
  await mkdir(directoryPath, { recursive: true, mode: 0o700 });
  await writeFile(wrapperPath, wrapperSource, 'utf8');
  await chmod(wrapperPath, 0o755);
  return wrapperPath;
};
