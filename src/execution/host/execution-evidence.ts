import { posix } from 'node:path';

import { normalizeScopePath } from '../../portable/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';

import { isApprovedRepairGitArguments } from './git-command-policy-boundary.ts';
import { CliInvocationEventSchema, type ICliInvocation } from './cli-invocations/index.ts';

import type {
  ICodexEvaluationCommandOwnership,
  ICodexEvaluationCommandPolicyEvidence,
  ICodexEvaluationCommandPolicyReason,
  ICodexEvaluationCommandPolicyReasonCode,
  ICodexEvaluationCommandPolicyStatus,
  ICodexEvaluationExecutionEvidence,
  ICodexEvaluationMoldeaEvent,
  ICodexEvaluationOwnedCommandTotals,
  IMoldeaCliOperation,
  IMoldeaCliLauncherMissReasonCode,
  IMoldeaManagedAgentsMode,
  IRepositoryTestCommandKind,
  IRepairGitCommandEvidence,
  IRepairGitReasonCode,
} from './types.ts';

type IPlainRecord = Record<string, unknown>;

interface IAccessClassification {
  reasonCode: ICodexEvaluationCommandPolicyReasonCode;
  status: Exclude<ICodexEvaluationCommandPolicyStatus, 'not-observed'>;
}

interface ICommandClassification {
  moldeaCommandCount: number;
  moldeaLauncherMissReasonCodes: IMoldeaCliLauncherMissReasonCode[];
  // the launcher operation of a placeable cli command, otherwise null
  moldeaOperation: IMoldeaCliOperation | null;
  networkAccess: ICodexEvaluationCommandPolicyStatus;
  ownership: ICodexEvaluationCommandOwnership;
  networkReasonCode?: ICodexEvaluationCommandPolicyReasonCode;
  sensitiveAccess: ICodexEvaluationCommandPolicyStatus;
  sensitiveReasonCode?: ICodexEvaluationCommandPolicyReasonCode;
}

type IPolicyName = 'networkAccess' | 'sensitiveAccess';
type IPolicyObservation = ICodexEvaluationCommandPolicyEvidence[IPolicyName];
type IUsage = NonNullable<ICodexEvaluationExecutionEvidence['usage']>;

const COMMAND_POLICY_STATUSES = new Set<ICodexEvaluationCommandPolicyStatus>([
  'indeterminate',
  'not-observed',
  'observed',
]);
const COMMAND_POLICY_REASON_CODES = new Set<ICodexEvaluationCommandPolicyReasonCode>([
  'broad-filesystem-read',
  'credential-material',
  'dynamic-execution',
  'environment-dump',
  'environment-value-read',
  'evaluator-auth-file',
  'evaluator-home',
  'git-network',
  'network-client',
  'oversized-command',
  'package-manager-network',
  'process-environment',
  'unclassified-command',
]);
const NETWORK_OBSERVED_REASON_CODES = new Set<ICodexEvaluationCommandPolicyReasonCode>([
  'git-network',
  'network-client',
  'package-manager-network',
]);
const NETWORK_INDETERMINATE_REASON_CODES = new Set<ICodexEvaluationCommandPolicyReasonCode>([
  'dynamic-execution',
  'oversized-command',
  'unclassified-command',
]);
const SENSITIVE_OBSERVED_REASON_CODES = new Set<ICodexEvaluationCommandPolicyReasonCode>([
  'environment-dump',
  'environment-value-read',
  'evaluator-auth-file',
  'evaluator-home',
  'process-environment',
]);
const SENSITIVE_INDETERMINATE_REASON_CODES = new Set<ICodexEvaluationCommandPolicyReasonCode>([
  'broad-filesystem-read',
  'dynamic-execution',
  'oversized-command',
  'unclassified-command',
]);
const MAX_COMPLETED_COMMAND_COUNT =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxCompletedCommandCount;
const MAX_COMMAND_BYTES = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxCommandTextBytes;
const MAX_MODEL_VISIBLE_TOOL_OUTPUT_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxModelVisibleToolOutputBytes;
const MAX_MOLDEA_COMMAND_COUNT = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaCommandCount;
const MAX_MOLDEA_OUTPUT_BYTES = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaOutputBytes;
// patch writes share the completed-command ceiling, so ordered events stay bounded
const MAX_FILE_CHANGE_COUNT = MAX_COMPLETED_COMMAND_COUNT;
const COMMAND_OWNERSHIPS: readonly ICodexEvaluationCommandOwnership[] = [
  'canonical',
  'cli',
  'helper',
  'project',
  'source',
];
const MOLDEA_EVENT_OWNERSHIPS = new Set<ICodexEvaluationCommandOwnership>([
  'canonical',
  'cli',
  'helper',
]);
// bundled skill scripts, matched by word or, for unparseable commands, anywhere in the text
const MOLDEA_SKILL_SCRIPT_WORD_PATTERN = /(?:^|\/)\.agents\/skills\/moldea\/scripts\/[^/]+$/u;
const MOLDEA_SKILL_SCRIPT_TEXT_PATTERN = /\.agents\/skills\/moldea\/scripts\/([A-Za-z0-9._-]+)/gu;
// the repository's own moldea/ directory, never the installed skill's moldea/ path segment
const REPOSITORY_MOLDEA_WORD_PATTERN = /(?:^|[=:,])(?:\/mnt\/|\.\/)?moldea\//u;
const REPOSITORY_MOLDEA_TEXT_PATTERN =
  /(?:^|[\s'"=:,;|&()<>])(?:\/mnt\/|\.\/)?moldea(?:\/|(?=[\s'";|&()<>]|$))/u;
const PROJECT_EXECUTABLES = new Set(['git', 'npm', 'npx', 'pnpm', 'tsc', 'yarn']);
const MOLDEA_LAUNCHER_MISS_REASON_CODES: IMoldeaCliLauncherMissReasonCode[] = [
  'unrecognized-launcher-path',
  'unrecognized-node-path',
];

const NETWORK_EXECUTABLES = new Set([
  'corepack',
  'curl',
  'ftp',
  'gh',
  'http',
  'https',
  'nc',
  'ncat',
  'npx',
  'pnpm',
  'pnpx',
  'scp',
  'sftp',
  'ssh',
  'telnet',
  'wget',
  'yarn',
  'yarnpkg',
]);
const OPAQUE_EXECUTABLES = new Set([
  '.',
  'awk',
  'bash',
  'bun',
  'dash',
  'deno',
  'eval',
  'fish',
  'just',
  'make',
  'node',
  'perl',
  'python',
  'python3',
  'ruby',
  'sh',
  'source',
  'xargs',
  'zsh',
]);
const SAFE_LOCAL_EXECUTABLES = new Set([
  '[',
  '[[',
  ':',
  'basename',
  'cat',
  'cmp',
  'cut',
  'dirname',
  'echo',
  'false',
  'file',
  'find',
  'grep',
  'head',
  'hexdump',
  'jq',
  'ls',
  'od',
  'moldea-cli.mjs',
  'printf',
  'pwd',
  'readlink',
  'realpath',
  'relevance-gate.mjs',
  'rg',
  'sha256sum',
  'sort',
  'stat',
  'tail',
  'test',
  'tr',
  'true',
  'tsc',
  'uniq',
  'wc',
  'xxd',
]);
// passive repair reads cannot delegate execution through options or repository scripts
const REPAIR_PASSIVE_EXECUTABLES = new Set([
  ...[...SAFE_LOCAL_EXECUTABLES].filter(
    (executable) =>
      !['file', 'find', 'sort', 'tsc', 'moldea-cli.mjs', 'relevance-gate.mjs'].includes(executable),
  ),
  'nl',
]);
// rg globs without a path prefix could expand to an execution-capable --pre option
const REPAIR_GLOB_READ_EXECUTABLES = new Set(
  [...REPAIR_PASSIVE_EXECUTABLES].filter((executable) => executable !== 'rg'),
);
const SAFE_WORKSPACE_EXECUTABLE_PATHS = new Map([
  [
    'moldea-cli.mjs',
    new Set([
      '.agents/skills/moldea/scripts/moldea-cli.mjs',
      './.agents/skills/moldea/scripts/moldea-cli.mjs',
      '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs',
    ]),
  ],
  [
    'relevance-gate.mjs',
    new Set([
      '.agents/skills/moldea/scripts/relevance-gate.mjs',
      './.agents/skills/moldea/scripts/relevance-gate.mjs',
      '/mnt/.agents/skills/moldea/scripts/relevance-gate.mjs',
    ]),
  ],
  [
    'tsc',
    new Set(['node_modules/.bin/tsc', './node_modules/.bin/tsc', '/mnt/node_modules/.bin/tsc']),
  ],
]);
const TRUSTED_SYSTEM_EXECUTABLE_DIRECTORIES = ['/bin', '/usr/bin'];
const SAFE_GIT_SUBCOMMANDS = new Set([
  'diff',
  'log',
  'ls-files',
  'rev-parse',
  'show',
  'status',
  'version',
]);
const SAFE_GIT_CONFIG_ASSIGNMENTS = new Set([
  'core.attributesFile=/dev/null',
  'core.fsmonitor=',
  'core.pager=cat',
  'diff.external=',
  'filter.lfs.clean=',
  'filter.lfs.process=',
  'filter.lfs.required=false',
  'filter.lfs.smudge=',
]);
const SAFE_RELEVANCE_GATE_PATHS = new Set([
  '.agents/skills/moldea/scripts/relevance-gate.mjs',
  './.agents/skills/moldea/scripts/relevance-gate.mjs',
  '/mnt/.agents/skills/moldea/scripts/relevance-gate.mjs',
]);
const SAFE_MANAGED_README_PATHS = new Set([
  '.agents/skills/moldea/scripts/managed-readme.mjs',
  './.agents/skills/moldea/scripts/managed-readme.mjs',
  '/mnt/.agents/skills/moldea/scripts/managed-readme.mjs',
]);
const SAFE_MOLDEA_CLI_LAUNCHER_PATHS = new Set([
  '.agents/skills/moldea/scripts/moldea-cli.mjs',
  './.agents/skills/moldea/scripts/moldea-cli.mjs',
  '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs',
]);
const MOLDEA_CLI_OPERATIONS = new Set(['composition', 'content', 'inspect', 'scope', 'validate']);
const MOLDEA_CLI_VALUE_OPTIONS = new Set([
  '--cursor',
  '--max-output-bytes',
  '--path',
  '--save-response',
  '--cursor-from-response',
]);
const MOLDEA_CLI_PAGE_OUTPUT_BYTES = '65536';
const REPOSITORY_TEST_PATH_PATTERN =
  /(?:^|\/)[a-z0-9][a-z0-9._-]*\.test-(?:e2e|integration|unit)\.(?:c|m)?js$/u;
const SAFE_SED_PRINT_SCRIPT_PATTERN = /^\d+(?:,\d+)?p$/u;
const EVALUATOR_HOME_PATH = '/home/evaluator';
const EVALUATOR_EMPTY_SKILLS_PATH = `${EVALUATOR_HOME_PATH}/.codex/skills`;
const NETWORK_GIT_SUBCOMMANDS = new Set([
  'clone',
  'fetch',
  'ls-remote',
  'pull',
  'push',
  'remote',
  'send-email',
  'submodule',
]);
const CREDENTIAL_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/gu,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/gu,
  /\b(?:npm_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/gu,
  /\bAKIA[A-Z0-9]{16}\b/gu,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}(?=$|[\s"',;])/giu,
  /-----BEGIN ((?:(?:RSA|DSA|EC|OPENSSH|ENCRYPTED) )?PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----[\s\S]*?-----END \1-----/gu,
];
const BASIC_AUTHORIZATION_PATTERN = /\bBasic\s+([A-Za-z0-9+/]{8,}={0,2})(?=$|[\s"',;])/giu;
const CREDENTIAL_TEXT_FIELD_NAMES = new Set(['aggregated_output', 'command', 'message', 'text']);
const SAFE_EVALUATOR_SKILL_PATH_PATTERN =
  /\/home\/evaluator\/\.codex\/skills(?:\/(?!(?:\.{1,2})(?:\/|$))[A-Za-z0-9._-]+)*(?![A-Za-z0-9._/-])/gu;
const SENSITIVE_ENVIRONMENT_NAME_PATTERN =
  /^(?:OPENAI_API_KEY|AUTHORIZATION|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD|PRIVATE_KEY|SECRET)$/iu;
const PROCESS_ENVIRONMENT_PATTERN = /^\/proc\/(?:self|\d+)\/environ$/u;
const SEARCH_EXECUTABLES = new Set(['grep', 'rg']);
const FILE_INSPECTION_EXECUTABLES = new Set([
  'cat',
  'cmp',
  'file',
  'head',
  'ls',
  'readlink',
  'realpath',
  'sed',
  'sha256sum',
  'stat',
  'tail',
  'wc',
]);

// Bash word separators exclude the other characters JavaScript treats as whitespace
const BASH_WHITESPACE_PATTERN = /[ \t\n]/u;

const isPlainRecord = (input: unknown): input is IPlainRecord =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const hasExactKeys = (record: unknown, keys: readonly string[]): record is IPlainRecord =>
  isPlainRecord(record) &&
  Object.keys(record).length === keys.length &&
  keys.every((key) => Object.hasOwn(record, key));

const isBoundedNonNegativeInteger = (value: unknown, maximum: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum;

/** Reconstructs one fixed shell-escaped word without evaluating expansions. */
const decodeFixedShellWord = (input: string): string | null => {
  let output = '';
  let quote: "'" | '"' | null = null;
  let hasWord = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    const nextCharacter = input[index + 1];

    if (quote === "'") {
      if (character === quote) quote = null;
      else output += character;
      hasWord = true;
      continue;
    }
    if (quote === '"') {
      if (character === quote) {
        quote = null;
      } else if (character === '\\') {
        if (nextCharacter === undefined) return null;
        if (nextCharacter === '\n') index += 1;
        else if ('$`"\\'.includes(nextCharacter)) {
          output += nextCharacter;
          index += 1;
        } else output += character;
      } else if (character === '$' || character === '`') return null;
      else output += character;
      hasWord = true;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      hasWord = true;
      continue;
    }
    if (character === '\\') {
      if (nextCharacter === undefined) return null;
      if (nextCharacter === '\n') {
        index += 1;
        continue;
      }
      output += nextCharacter;
      hasWord = true;
      index += 1;
      continue;
    }
    if (character === '$' || character === '`') return null;
    if (BASH_WHITESPACE_PATTERN.test(character)) {
      return hasWord && /^[ \t\n]*$/u.test(input.slice(index)) ? output : null;
    }
    if (';&|<>(){}'.includes(character)) return null;
    output += character;
    hasWord = true;
  }

  return quote === null && hasWord ? output : null;
};

/** Removes only the fixed Bash wrapper emitted by the Codex command host. */
const unwrapCodexShellCommand = (command: string): string | null => {
  for (const executable of ['/bin/bash', 'bash']) {
    const prefix = `${executable} -lc `;
    if (command.startsWith(prefix)) return decodeFixedShellWord(command.slice(prefix.length));
  }
  return command;
};

/** Removes only fixed shell redirections that discard output or duplicate an existing stream. */
const stripSafeShellRedirections = (command: string): string =>
  command.replace(/(^|\s)(?:[012]?>\/dev\/null|[12]>&[12])(?=$|\s)/gu, '$1');

/** Splits a static shell list while rejecting syntax that can conceal execution. */
const parseStaticShellList = (
  command: string,
  allowPassiveReadGlobs = false,
): { commands: string[][] } | null => {
  const commands: string[][] = [[]];
  let requiresFollowingCommand = false;
  let currentWord = '';
  let hasCurrentWord = false;
  let quote: "'" | '"' | null = null;
  let hasComment = false;

  const pushWord = () => {
    if (!hasCurrentWord) return;
    commands.at(-1)!.push(currentWord);
    requiresFollowingCommand = false;
    currentWord = '';
    hasCurrentWord = false;
  };
  const pushCommand = () => {
    pushWord();
    if (commands.at(-1)!.length === 0) return false;
    commands.push([]);
    return true;
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;
    const nextCharacter = command[index + 1];

    if (quote !== null) {
      if (character === quote) {
        quote = null;
      } else if (character === '\\' && quote === '"') {
        if (nextCharacter === undefined) return null;
        if (nextCharacter === '\n') index += 1;
        else if ('$`"\\'.includes(nextCharacter)) {
          currentWord += nextCharacter;
          hasCurrentWord = true;
          index += 1;
        } else {
          currentWord += character;
          hasCurrentWord = true;
        }
      } else if (quote !== "'" && (character === '$' || character === '`')) return null;
      else {
        currentWord += character;
        hasCurrentWord = true;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      hasCurrentWord = true;
      continue;
    }
    if (character === '\\') {
      if (nextCharacter === undefined) return null;
      if (nextCharacter === '\n') {
        index += 1;
        continue;
      }
      currentWord += nextCharacter;
      hasCurrentWord = true;
      index += 1;
      continue;
    }
    const executableWord = commands.at(-1)![0];
    const readExecutable = getExecutableName(executableWord ?? '');
    const canUseReadGlob =
      allowPassiveReadGlobs &&
      (REPAIR_GLOB_READ_EXECUTABLES.has(readExecutable) ||
        (readExecutable === 'rg' && currentWord.includes('/') && !currentWord.startsWith('-'))) &&
      isTrustedLocalExecutable(executableWord, readExecutable);
    if ((character === '*' || character === '?') && !canUseReadGlob) return null;
    if (character === '[') {
      const isSingleBracketCommand =
        !hasCurrentWord &&
        commands.at(-1)!.length === 0 &&
        (nextCharacter === undefined || BASH_WHITESPACE_PATTERN.test(nextCharacter));
      const isDoubleBracketCommand =
        !hasCurrentWord &&
        commands.at(-1)!.length === 0 &&
        nextCharacter === '[' &&
        (command[index + 2] === undefined || BASH_WHITESPACE_PATTERN.test(command[index + 2]!));
      if (!isSingleBracketCommand && !isDoubleBracketCommand && !canUseReadGlob) return null;
      if (canUseReadGlob) {
        currentWord += character;
        hasCurrentWord = true;
        continue;
      }
      currentWord += isDoubleBracketCommand ? '[[' : '[';
      hasCurrentWord = true;
      if (isDoubleBracketCommand) index += 1;
      continue;
    }
    if (character === ']') {
      const isSingleBracketTerminator =
        !hasCurrentWord &&
        (nextCharacter === undefined || BASH_WHITESPACE_PATTERN.test(nextCharacter));
      const isDoubleBracketTerminator =
        !hasCurrentWord &&
        nextCharacter === ']' &&
        (command[index + 2] === undefined || BASH_WHITESPACE_PATTERN.test(command[index + 2]!));
      if (!isSingleBracketTerminator && !isDoubleBracketTerminator && !canUseReadGlob) return null;
      if (canUseReadGlob) {
        currentWord += character;
        hasCurrentWord = true;
        continue;
      }
      currentWord += isDoubleBracketTerminator ? ']]' : ']';
      hasCurrentWord = true;
      if (isDoubleBracketTerminator) index += 1;
      continue;
    }
    if (
      character === '$' ||
      character === '`' ||
      character === '<' ||
      character === '>' ||
      '(){}'.includes(character)
    ) {
      return null;
    }
    if (character === '#' && !hasCurrentWord) {
      hasComment = true;
      const newlineIndex = command.indexOf('\n', index);
      if (newlineIndex === -1) break;
      index = newlineIndex - 1;
      continue;
    }
    if (BASH_WHITESPACE_PATTERN.test(character)) {
      if (character === '\n' && (hasCurrentWord || commands.at(-1)!.length > 0)) {
        if (!pushCommand()) return null;
      } else pushWord();
      continue;
    }
    if (character === ';' || character === '|' || character === '&') {
      if (!pushCommand()) return null;
      requiresFollowingCommand = character === '|' || (character === '&' && nextCharacter === '&');
      if (nextCharacter === character) index += 1;
      continue;
    }
    currentWord += character;
    hasCurrentWord = true;
  }

  if (quote !== null) return null;
  pushWord();
  if (commands.at(-1)!.length === 0) {
    if (requiresFollowingCommand) return null;
    commands.pop();
  }
  return commands.length > 0 || hasComment ? { commands } : null;
};

/** Locates the executable token in a static command and its trusted env wrapper. */
const identifyExecutableWordIndex = (words: readonly string[]): number | null => {
  let wordIndex = 0;
  while (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(words[wordIndex] ?? '')) wordIndex += 1;
  if (words[wordIndex] === '!') wordIndex += 1;

  if (['env', '/bin/env', '/usr/bin/env'].includes(words[wordIndex] ?? '')) {
    wordIndex += 1;
    if (words[wordIndex] === '--') wordIndex += 1;
    while (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(words[wordIndex] ?? '')) wordIndex += 1;
  }

  return wordIndex < words.length ? wordIndex : null;
};

/** Returns path operands without treating repository-search patterns as accessed paths. */
const identifyFilesystemTargets = (words: readonly string[]): string[] => {
  const executableWordIndex = identifyExecutableWordIndex(words);
  if (executableWordIndex === null) return [];
  const executable = getExecutableName(words[executableWordIndex]!);
  const commandArguments = words.slice(executableWordIndex + 1);

  if (SEARCH_EXECUTABLES.has(executable)) {
    const targets: string[] = [];
    let hasExplicitPattern = false;
    let hasImplicitPattern = false;
    for (let index = 0; index < commandArguments.length; index += 1) {
      const argument = commandArguments[index];
      if (argument !== undefined && ['-e', '--regexp'].includes(argument)) {
        hasExplicitPattern = true;
        index += 1;
        continue;
      }
      if (argument !== undefined && ['-f', '--file'].includes(argument)) {
        const patternFile = commandArguments[index + 1];
        if (patternFile !== undefined) targets.push(patternFile);
        index += 1;
        continue;
      }
      if (
        [
          '-A',
          '-B',
          '-C',
          '-g',
          '-m',
          '-t',
          '--after-context',
          '--before-context',
          '--context',
          '--glob',
          '--max-count',
          '--pre',
          '--pre-glob',
          '--type',
          '--type-add',
        ].includes(argument ?? '')
      ) {
        index += 1;
        continue;
      }
      if (argument === undefined || argument.startsWith('-')) continue;
      if (!hasExplicitPattern && !hasImplicitPattern) {
        hasImplicitPattern = true;
        continue;
      }
      targets.push(argument);
    }
    return targets;
  }

  if (executable === 'find') {
    return commandArguments.filter((argument) => !argument.startsWith('-')).slice(0, 1);
  }

  if (executable === 'git') {
    const directoryIndex = commandArguments.indexOf('-C');
    return directoryIndex === -1
      ? []
      : commandArguments.slice(directoryIndex + 1, directoryIndex + 2);
  }

  if (!FILE_INSPECTION_EXECUTABLES.has(executable)) return [];
  if (executable === 'sed') {
    const scriptIndex = commandArguments.findIndex((argument) => !argument.startsWith('-'));
    return scriptIndex === -1 ? [] : commandArguments.slice(scriptIndex + 1);
  }
  return commandArguments.filter((argument) => !argument.startsWith('-'));
};

/** Classifies one resolved filesystem target without retaining the target itself. */
const classifyFilesystemTarget = (candidate: string): IAccessClassification | null => {
  let pathCandidate = candidate;
  if (candidate === '~') pathCandidate = EVALUATOR_HOME_PATH;
  else if (candidate.startsWith('~/')) {
    pathCandidate = posix.join(EVALUATOR_HOME_PATH, candidate.slice(2));
  } else if (!candidate.startsWith('/') && !candidate.startsWith('.')) return null;

  const normalizedPath = posix.resolve('/mnt', pathCandidate);
  if (
    normalizedPath === EVALUATOR_EMPTY_SKILLS_PATH ||
    normalizedPath.startsWith(`${EVALUATOR_EMPTY_SKILLS_PATH}/`)
  ) {
    return null;
  }
  if (PROCESS_ENVIRONMENT_PATTERN.test(normalizedPath)) {
    return { status: 'observed', reasonCode: 'process-environment' };
  }
  if (
    normalizedPath === `${EVALUATOR_HOME_PATH}/.codex/auth.json` ||
    normalizedPath === `${EVALUATOR_HOME_PATH}/.codex/config.toml`
  ) {
    return { status: 'observed', reasonCode: 'evaluator-auth-file' };
  }
  if (
    normalizedPath === EVALUATOR_HOME_PATH ||
    normalizedPath.startsWith(`${EVALUATOR_HOME_PATH}/`)
  ) {
    return { status: 'observed', reasonCode: 'evaluator-home' };
  }
  if (
    normalizedPath === '/proc' ||
    normalizedPath.startsWith('/proc/') ||
    normalizedPath === '/' ||
    EVALUATOR_HOME_PATH.startsWith(`${normalizedPath}/`)
  ) {
    return { status: 'indeterminate', reasonCode: 'broad-filesystem-read' };
  }
  return null;
};

/** Detects an actual environment-value read in a decoded static command. */
const classifyEnvironmentAccess = (words: readonly string[]): IAccessClassification | null => {
  const executableWordIndex = identifyExecutableWordIndex(words);
  if (executableWordIndex === null) {
    return { status: 'indeterminate', reasonCode: 'dynamic-execution' };
  }
  const executable = getExecutableName(words[executableWordIndex]!);
  const commandArguments = words.slice(executableWordIndex + 1);

  if (executable === 'printenv') {
    return { status: 'observed', reasonCode: 'environment-dump' };
  }
  if (executable === 'env' && commandArguments.length === 0) {
    return { status: 'observed', reasonCode: 'environment-dump' };
  }
  if (
    ['node', 'bun', 'deno'].includes(executable) &&
    commandArguments.some((argument) =>
      /(?:process\.env|Deno\.env|Bun\.env)(?:\b|\[)/u.test(argument),
    )
  ) {
    return { status: 'observed', reasonCode: 'environment-value-read' };
  }
  if (
    commandArguments.some((argument) =>
      SENSITIVE_ENVIRONMENT_NAME_PATTERN.test(argument.replace(/^\$|^\$\{|\}$/gu, '')),
    )
  ) {
    return { status: 'observed', reasonCode: 'environment-value-read' };
  }
  return null;
};

/** Classifies decoded operations that can reach evaluator-owned or credential state. */
const classifyDecodedSensitiveAccess = (
  commands: readonly string[][],
): IAccessClassification | null => {
  const classifications: IAccessClassification[] = [];
  for (const words of commands) {
    const environmentAccess = classifyEnvironmentAccess(words);
    if (environmentAccess !== null) classifications.push(environmentAccess);
    for (const target of identifyFilesystemTargets(words)) {
      const targetClassification = classifyFilesystemTarget(target);
      if (targetClassification !== null) classifications.push(targetClassification);
    }
  }

  const observed = classifications
    .filter(({ status }) => status === 'observed')
    .sort(({ reasonCode: left }, { reasonCode: right }) => left.localeCompare(right, 'en'))[0];
  if (observed !== undefined) return observed;
  return (
    classifications
      .filter(({ status }) => status === 'indeterminate')
      .sort(({ reasonCode: left }, { reasonCode: right }) => left.localeCompare(right, 'en'))[0] ??
    null
  );
};

const getExecutableName = (word: string): string => posix.basename(word).toLowerCase();

/** Checks that a local executable resolves through an immutable sandbox mount. */
const isTrustedLocalExecutable = (word: string | undefined, executable: string): boolean => {
  if (word === undefined) return false;
  const workspacePaths = SAFE_WORKSPACE_EXECUTABLE_PATHS.get(executable);
  if (workspacePaths !== undefined) return workspacePaths.has(word);
  return (
    word === executable ||
    (executable === 'node' && word === '/opt/node') ||
    TRUSTED_SYSTEM_EXECUTABLE_DIRECTORIES.some(
      (directory) => word === posix.join(directory, executable),
    )
  );
};

const isSandboxRepositoryRoot = (candidate: string | undefined): boolean =>
  candidate !== undefined && candidate !== '' && posix.resolve('/mnt', candidate) === '/mnt';

/** Applies the launcher's path normalization without accessing repository files. */
const normalizeSandboxTaskPath = (candidate: string | undefined): string | null => {
  if (candidate === undefined || candidate.startsWith('--')) return null;
  try {
    return normalizeScopePath(candidate, {
      repositoryRoot: '/mnt',
      resolvedRepositoryRoot: '/mnt',
    });
  } catch {
    return null;
  }
};

/** Checks the fixed cross-platform Node invocation for the repository relevance gate. */
const isSafeRelevanceGateCommand = (words: readonly string[]): boolean => {
  if (
    !isTrustedLocalExecutable(words[0], 'node') ||
    !SAFE_RELEVANCE_GATE_PATHS.has(words[1] ?? '') ||
    words[2] !== '--repository' ||
    !isSandboxRepositoryRoot(words[3])
  )
    return false;
  const flags = new Set<string>();
  let pathCount = 0;
  for (let index = 4; index < words.length; index++) {
    const option = words[index];
    if ((option === '--adoption-only' || option === '--diagnose') && !flags.has(option))
      flags.add(option);
    else if (option === '--path') {
      if (normalizeSandboxTaskPath(words[++index]) === null) return false;
      pathCount++;
    } else return false;
  }
  return !flags.has('--adoption-only') || pathCount === 0;
};

const getStandaloneCommandWords = (command: unknown): readonly string[] | null => {
  if (typeof command !== 'string' || Buffer.byteLength(command, 'utf8') > MAX_COMMAND_BYTES) {
    return null;
  }
  const directCommand = unwrapCodexShellCommand(command);
  const commands =
    directCommand === null
      ? null
      : (parseStaticShellList(stripSafeShellRedirections(directCommand))?.commands ?? null);
  return commands?.length === 1 ? commands[0]! : null;
};

/**
 * Identifies one exact bundled relevance-gate invocation without retaining its command.
 * @param command The host command to classify.
 * @returns The gate mode, or null when the command is not an exact gate invocation.
 */
export const identifyMoldeaRelevanceGateMode = (
  command: unknown,
): 'adoption-only' | 'relationship' | null => {
  const words = getStandaloneCommandWords(command);
  if (words === null || !isSafeRelevanceGateCommand(words)) return null;
  return words.includes('--adoption-only') ? 'adoption-only' : 'relationship';
};

/** Recognizes only the installed repair evidence helper and its fixed read modes. */
const getRepairGitMode = (
  words: readonly string[],
): 'checkpoint' | 'continue' | 'review' | 'verify' | null => {
  if (
    !isTrustedLocalExecutable(words[0], 'node') ||
    !SAFE_MANAGED_README_PATHS.has(
      (words[1] ?? '').replace(/repair-git\.mjs$/u, 'managed-readme.mjs'),
    ) ||
    !words[1]?.endsWith('/repair-git.mjs') ||
    words[2] !== '--repository' ||
    !isSandboxRepositoryRoot(words[3]) ||
    words[4] !== '--'
  )
    return null;
  const mode = words[5];
  if (mode === 'checkpoint' && words.length === 6) return mode;
  if (
    ['continue', 'verify'].includes(mode ?? '') &&
    words.length === 8 &&
    words[6] === '--checkpoint' &&
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(words[7] ?? '')
  )
    return mode as 'continue' | 'verify';
  if (mode === 'review' && words.length >= 8 && words.length % 2 === 0) {
    for (let index = 6; index < words.length; index += 2) {
      const path = words[index + 1] ?? '';
      if (
        words[index] !== '--path' ||
        path.startsWith('/') ||
        /^[a-z]:/iu.test(path) ||
        /[\\\p{Cc}]/u.test(path) ||
        path
          .split('/')
          .some(
            (part) =>
              !part ||
              part === '.' ||
              part === '..' ||
              ['_archive', '_archives', '_backup', '_backups'].includes(part),
          )
      )
        return null;
    }
    return mode;
  }
  return null;
};

/** Identifies the exact installed repair helper without retaining its arguments. */
export const identifyMoldeaRepairGitMode = (
  command: unknown,
): 'checkpoint' | 'continue' | 'review' | 'verify' | null => {
  const words = getStandaloneCommandWords(command);
  return words === null ? null : getRepairGitMode(words);
};

/** Checks the exact standalone Node invocation for the bundled README writer. */
const isSafeManagedReadmeCommand = (words: readonly string[]): boolean =>
  isTrustedLocalExecutable(words[0], 'node') &&
  words.length === 4 &&
  SAFE_MANAGED_README_PATHS.has(words[1] ?? '') &&
  words[2] === '--repository' &&
  isSandboxRepositoryRoot(words[3]);

/**
 * Identifies one exact bundled README-writer invocation without retaining its command.
 * @param command The host command to classify.
 * @returns Whether the command invokes the installed writer alone.
 */
export const isMoldeaManagedReadmeWriterCommand = (command: unknown): boolean => {
  const words = getStandaloneCommandWords(command);
  return words !== null && isSafeManagedReadmeCommand(words);
};

// Claude Code instruction files the installed helper may name with --claude
const MANAGED_AGENTS_CLAUDE_SUBJECTS: ReadonlySet<string> = new Set([
  '/CLAUDE.md',
  '/.claude/CLAUDE.md',
  '/CLAUDE.local.md',
]);

/** Recognizes only the installed AGENTS helper and its closed operation modes. */
const getManagedAgentsMode = (words: readonly string[]): IMoldeaManagedAgentsMode | null => {
  if (
    !isTrustedLocalExecutable(words[0], 'node') ||
    !SAFE_MANAGED_README_PATHS.has(
      (words[1] ?? '').replace(/managed-agents\.mjs$/u, 'managed-readme.mjs'),
    ) ||
    !words[1]?.endsWith('/managed-agents.mjs') ||
    words[2] !== '--repository' ||
    !isSandboxRepositoryRoot(words[3])
  )
    return null;
  const isPrint = words.length > 4 && words.at(-1) === '--print';
  const modeOptions = words.slice(4, isPrint ? -1 : undefined);
  if (modeOptions.length === 0) return isPrint ? 'print' : 'write';
  if (
    modeOptions.length === 2 &&
    modeOptions[0] === '--claude' &&
    MANAGED_AGENTS_CLAUDE_SUBJECTS.has(modeOptions[1] ?? '')
  )
    return isPrint ? 'claude-print' : 'claude-write';
  return null;
};

/** Returns the exact helper mode without retaining raw command text. */
export const identifyMoldeaManagedAgentsMode = (
  command: unknown,
): IMoldeaManagedAgentsMode | null => {
  const words = getStandaloneCommandWords(command);
  return words === null ? null : getManagedAgentsMode(words);
};

/** Parses the strict option surface for one launcher-backed CLI operation. */
const parseMoldeaCliOperationArguments = (
  operation: IMoldeaCliOperation,
  commandArguments: readonly string[],
): IMoldeaCliOperation | null => {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 0; index < commandArguments.length; index += 1) {
    const argument = commandArguments[index];
    if (argument !== undefined && MOLDEA_CLI_VALUE_OPTIONS.has(argument)) {
      if (values.has(argument)) return null;
      const optionValue = commandArguments[index + 1];
      if (optionValue === undefined || optionValue === '' || optionValue.startsWith('--')) {
        return null;
      }
      values.set(argument, optionValue);
      index += 1;
      continue;
    }
    if (
      argument === undefined ||
      !['--json', '--paths-stdin'].includes(argument) ||
      flags.has(argument)
    ) {
      return null;
    }
    flags.add(argument);
  }

  if (!flags.has('--json')) return null;
  if (operation === 'composition') {
    return flags.size === 1 && values.size === 0 ? operation : null;
  }
  if (values.get('--max-output-bytes') !== MOLDEA_CLI_PAGE_OUTPUT_BYTES) return null;

  if (values.has('--cursor') && values.has('--cursor-from-response')) return null;
  for (const option of ['--save-response', '--cursor-from-response']) {
    const filePath = values.get(option);
    if (
      filePath !== undefined &&
      (!filePath.startsWith('/tmp/') ||
        posix.normalize(filePath) !== filePath ||
        filePath.includes('\\'))
    )
      return null;
  }
  const cursor = values.get('--cursor');
  if (cursor !== undefined && Buffer.byteLength(cursor, 'utf8') > 8_192) return null;
  const pathInput = values.get('--path');
  const logicalPath = normalizeSandboxTaskPath(pathInput);
  if (operation === 'content') {
    if (flags.size !== 1 || logicalPath === null || !logicalPath.startsWith('/moldea/')) {
      return null;
    }
  } else if (operation === 'scope') {
    const hasStdinPaths = flags.size === 2 && flags.has('--paths-stdin') && pathInput === undefined;
    const hasSinglePath = flags.size === 1 && logicalPath !== null;
    if (!hasStdinPaths && !hasSinglePath) return null;
  } else if (flags.size !== 1 || pathInput !== undefined) return null;

  const allowedValues =
    operation === 'content' || operation === 'scope'
      ? new Set([
          '--cursor',
          '--max-output-bytes',
          '--path',
          '--save-response',
          '--cursor-from-response',
        ])
      : new Set(['--cursor', '--max-output-bytes', '--save-response', '--cursor-from-response']);
  return [...values.keys()].every((option) => allowedValues.has(option)) ? operation : null;
};

/** Returns the supported operation for one exact launcher command word sequence. */
const isMoldeaCliOperation = (value: string | undefined): value is IMoldeaCliOperation =>
  value !== undefined && MOLDEA_CLI_OPERATIONS.has(value);

/** Returns the supported operation for one exact launcher command word sequence. */
const identifyMoldeaCliLauncherOperationFromWords = (
  words: readonly string[],
): IMoldeaCliOperation | null => {
  const operation = words[5];
  if (
    !isTrustedLocalExecutable(words[0], 'node') ||
    !SAFE_MOLDEA_CLI_LAUNCHER_PATHS.has(words[1] ?? '') ||
    words[2] !== '--repository' ||
    !isSandboxRepositoryRoot(words[3]) ||
    words[4] !== '--' ||
    words.slice(5).includes('--') ||
    !isMoldeaCliOperation(operation)
  ) {
    return null;
  }

  return parseMoldeaCliOperationArguments(operation, words.slice(6));
};

/** Diagnoses only launcher-shaped attempts, without retaining executable or script paths. */
const identifyMoldeaCliLauncherMissReason = (
  words: readonly string[],
): IMoldeaCliLauncherMissReasonCode | null => {
  const executableIndex = identifyExecutableWordIndex(words);
  if (executableIndex === null) return null;
  const command = words.slice(executableIndex);
  if (command[2] !== '--repository' || command[4] !== '--' || !isMoldeaCliOperation(command[5]))
    return null;
  if (!isTrustedLocalExecutable(command[0], 'node')) return 'unrecognized-node-path';
  if (!SAFE_MOLDEA_CLI_LAUNCHER_PATHS.has(command[1] ?? '')) return 'unrecognized-launcher-path';
  return null;
};

/**
 * Identifies exactly one launcher-backed moldea operation without retaining the command.
 * @param command The completed Codex command text.
 * @returns The supported operation, or `null` when zero or multiple launchers are recognizable.
 */
export const identifyMoldeaCliLauncherOperation = (
  command: unknown,
): IMoldeaCliOperation | null => {
  if (typeof command !== 'string' || Buffer.byteLength(command, 'utf8') > MAX_COMMAND_BYTES) {
    return null;
  }
  const directCommand = unwrapCodexShellCommand(command);
  const commands =
    directCommand === null
      ? null
      : (parseStaticShellList(stripSafeShellRedirections(directCommand))?.commands ?? null);
  if (commands === null) return null;
  const operations = commands
    .map(identifyMoldeaCliLauncherOperationFromWords)
    .filter((operation) => operation !== null);
  return operations.length === 1 ? (operations[0] ?? null) : null;
};

/** Checks one portable repository-relative Node test path. */
const isRepositoryTestPath = (candidate: string): boolean => {
  if (
    candidate === '' ||
    candidate.startsWith('/') ||
    candidate.includes('\\') ||
    candidate.includes('\0')
  ) {
    return false;
  }
  const normalized = candidate.startsWith('./') ? candidate.slice(2) : candidate;
  return (
    normalized !== '' &&
    posix.normalize(normalized) === normalized &&
    !normalized.split('/').includes('..') &&
    REPOSITORY_TEST_PATH_PATTERN.test(normalized)
  );
};

/** Identifies one exact repository-root correctness-test command word sequence. */
const identifyRepositoryTestCommandKindsFromWords = (
  words: readonly string[],
): IRepositoryTestCommandKind[] | null => {
  if (!isTrustedLocalExecutable(words[0], 'node') || words[1] !== '--test') return null;
  const paths: string[] = [];
  let hasReporter = false;
  for (let index = 2; index < words.length; index++) {
    const word = words[index]!;
    if (paths.length === 0 && !hasReporter && word.startsWith('--test-reporter')) {
      const reporter =
        word === '--test-reporter' ? words[++index] : word.slice('--test-reporter='.length);
      if (
        !['--test-reporter', '--test-reporter=spec', '--test-reporter=tap'].includes(word) ||
        (reporter !== 'spec' && reporter !== 'tap')
      )
        return null;
      hasReporter = true;
    } else {
      if (!isRepositoryTestPath(word)) return null;
      paths.push(word);
    }
  }
  if (paths.length === 0) return null;
  const testKinds = new Set<IRepositoryTestCommandKind>();
  for (const path of paths) {
    const testKind = /\.test-(e2e|integration|unit)\.(?:c|m)?js$/u.exec(path)?.[1];
    if (testKind === 'e2e' || testKind === 'integration' || testKind === 'unit') {
      testKinds.add(testKind);
    } else {
      return null;
    }
  }
  return [...testKinds].sort();
};

/**
 * Identifies every test level named by one static repository-root correctness command.
 * @param command The completed Codex command text.
 * @returns The sorted unique test levels, or `null` when the command is not an allowed invocation.
 */
export const identifyRepositoryTestCommandKinds = (
  command: unknown,
): IRepositoryTestCommandKind[] | null => {
  if (typeof command !== 'string' || Buffer.byteLength(command, 'utf8') > MAX_COMMAND_BYTES) {
    return null;
  }
  const directCommand = unwrapCodexShellCommand(command);
  if (directCommand === null) return null;
  const hasPipefail = directCommand.startsWith('set -o pipefail;');
  const testCommand = hasPipefail
    ? directCommand.slice('set -o pipefail;'.length).trim()
    : directCommand;
  const commands = parseStaticShellList(stripSafeShellRedirections(testCommand))?.commands;
  if (commands?.length === 1) return identifyRepositoryTestCommandKindsFromWords(commands[0]!);
  // a tail pipeline preserves Node's exit status only when pipefail is explicit
  if (hasPipefail && commands?.length === 2 && testCommand.split('|').length === 2) {
    const tail = commands[1]!;
    if (
      isTrustedLocalExecutable(tail[0], 'tail') &&
      tail.length === 3 &&
      tail[1] === '-n' &&
      /^[1-9][0-9]{0,3}$/u.test(tail[2] ?? '') &&
      /\|\s*(?:\/(?:usr\/)?bin\/)?tail\s+-n\s+[1-9][0-9]{0,3}\s*$/u.test(testCommand)
    ) {
      return identifyRepositoryTestCommandKindsFromWords(commands[0]!);
    }
  }
  return null;
};

/** Checks whether one command is an allowed repository correctness-test invocation. */
export const isRepositoryTestCommand = (command: unknown): boolean =>
  identifyRepositoryTestCommandKinds(command) !== null;

/** Checks the fixed Node invocation for the bundled repository-local CLI launcher. */
const isSafeMoldeaCliLauncherCommand = (words: readonly string[]): boolean =>
  identifyMoldeaCliLauncherOperationFromWords(words) !== null;

/** Returns a Git subcommand after validating the global options that precede it. */
const identifyGitSubcommand = (words: readonly string[]): string | null => {
  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    if (word === undefined) return null;
    if (word === '--') return words[index + 1] ?? null;
    if (word === '-C') {
      if (words[index + 1] === undefined) return null;
      index += 1;
      continue;
    }
    if (word === '-c') {
      const assignment = words[index + 1];
      if (assignment === undefined || !SAFE_GIT_CONFIG_ASSIGNMENTS.has(assignment)) return null;
      index += 1;
      continue;
    }
    if (word === '--no-pager' || word === '--literal-pathspecs') continue;
    if (word.startsWith('-')) return null;
    return word;
  }

  return null;
};

/** Checks the evaluator-owned npm probe's complete non-networking command contract. */
const isSafeNpmProbeCommand = (words: readonly string[]): boolean =>
  ['npm', `${EVALUATOR_HOME_PATH}/bin/npm`].includes(words[0] ?? '') &&
  words.length === 2 &&
  ['--version', '-v'].includes(words[1] ?? '');

/** Checks Node's complete built-in version command without accepting executable code. */
const isSafeNodeVersionCommand = (words: readonly string[]): boolean =>
  ['node', '/opt/node', '/usr/bin/node'].includes(words[0] ?? '') &&
  words.length === 2 &&
  ['--version', '-v'].includes(words[1] ?? '');

/** Checks a non-executing sed invocation limited to a numeric print range. */
const isSafeSedInspectionCommand = (words: readonly string[]): boolean => {
  if (
    words.length < 3 ||
    words[1] !== '-n' ||
    !SAFE_SED_PRINT_SCRIPT_PATTERN.test(words[2] ?? '')
  ) {
    return false;
  }
  const fileArguments = words.slice(3);
  if (fileArguments[0] === '--') fileArguments.shift();
  return fileArguments.every((word) => word !== '' && !word.startsWith('-'));
};

/** Checks that Git resolves only through the evaluator's trusted executable search path. */
const isTrustedGitExecutable = (word: string | undefined): boolean =>
  word !== undefined &&
  ['git', '/home/evaluator/bin/git', '/usr/bin/git', '/bin/git', '/usr/lib/git-core/git'].includes(
    word,
  );

/** Classifies whether one static command can use a network boundary. */
const classifyNetworkCommand = (
  words: string[],
  canUseLocalSkillOperation = false,
): ICodexEvaluationCommandPolicyStatus => {
  const assignmentPrefixes: string[] = [];
  while (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(words[0] ?? '')) {
    assignmentPrefixes.push(words.shift()!);
  }
  if (words[0] === '!') words.shift();
  const executable = getExecutableName(words[0] ?? '');
  if (executable === '') return 'indeterminate';
  if (executable === 'env') {
    if (!isTrustedLocalExecutable(words[0], executable)) return 'indeterminate';
    const remainingWords = words.slice(1);
    if (remainingWords[0] === '--') remainingWords.shift();
    return remainingWords[0] === 'GIT_ATTR_NOSYSTEM=1'
      ? classifyNetworkCommand(remainingWords)
      : 'indeterminate';
  }
  if (executable === 'npm')
    return assignmentPrefixes.length === 0 && isSafeNpmProbeCommand(words)
      ? 'not-observed'
      : 'observed';
  if (NETWORK_EXECUTABLES.has(executable)) return 'observed';
  if (words.length === 3 && words[0] === 'set' && words[1] === '-o' && words[2] === 'pipefail')
    return assignmentPrefixes.length === 0 ? 'not-observed' : 'indeterminate';
  if (
    executable === 'node' &&
    assignmentPrefixes.length === 0 &&
    (getRepairGitMode(words) !== null ||
      isSafeNodeVersionCommand(words) ||
      identifyRepositoryTestCommandKindsFromWords(words) !== null ||
      isSafeMoldeaCliLauncherCommand(words) ||
      (canUseLocalSkillOperation &&
        (isSafeManagedReadmeCommand(words) || getManagedAgentsMode(words) !== null)))
  )
    return 'not-observed';
  if (executable === 'git') {
    const hasSafeAttributeIsolation =
      assignmentPrefixes.length === 0 ||
      (assignmentPrefixes.length === 1 && assignmentPrefixes[0] === 'GIT_ATTR_NOSYSTEM=1');
    if (!hasSafeAttributeIsolation || !isTrustedGitExecutable(words[0])) return 'indeterminate';
    if (words.length === 2 && words[1] === '--version') return 'not-observed';
    const subcommand = identifyGitSubcommand(words);
    if (subcommand === null) return 'indeterminate';
    if (
      subcommand === 'remote' &&
      (words.at(-1) === 'remote' ||
        (words.at(-2) === 'remote' && ['-v', '--verbose'].includes(words.at(-1) ?? '')))
    ) {
      return 'not-observed';
    }
    if (subcommand === 'config' && isApprovedRepairGitArguments(words.slice(1)))
      return 'not-observed';
    if (NETWORK_GIT_SUBCOMMANDS.has(subcommand)) return 'observed';
    return SAFE_GIT_SUBCOMMANDS.has(subcommand) ? 'not-observed' : 'indeterminate';
  }
  if (assignmentPrefixes.length > 0) return 'indeterminate';
  if (executable === 'find' && words.some((word) => /^-(?:exec|execdir|ok|okdir)$/u.test(word))) {
    return 'indeterminate';
  }
  if (executable === 'rg' && words.some((word) => word === '--pre' || word.startsWith('--pre='))) {
    return 'indeterminate';
  }
  if (executable === 'sed') {
    return isTrustedLocalExecutable(words[0], executable) && isSafeSedInspectionCommand(words)
      ? 'not-observed'
      : 'indeterminate';
  }
  if (executable === 'node' && isSafeRelevanceGateCommand(words)) return 'not-observed';
  if (OPAQUE_EXECUTABLES.has(executable)) return 'indeterminate';
  return SAFE_LOCAL_EXECUTABLES.has(executable) && isTrustedLocalExecutable(words[0], executable)
    ? 'not-observed'
    : 'indeterminate';
};

// disjoint reason sets keep diagnostic totals tied to the strict compliance counts
const REPAIR_GIT_NONCOMPLIANT_REASONS = new Set<IRepairGitReasonCode>([
  'git-rev-parse',
  'git-log',
  'git-show',
  'git-status-arguments',
  'git-diff-arguments',
  'git-other',
]);
const REPAIR_GIT_UNVERIFIED_REASONS = new Set<IRepairGitReasonCode>([
  'untrusted-git',
  'unparsed-shell',
  'opaque-node',
  'opaque-shell',
  'opaque-command',
]);

/** Validates bounded diagnostic codes and their exact noncompliant/unverified totals. */
export const hasValidRepairGitCommandEvidence = (
  input: unknown,
): input is IRepairGitCommandEvidence => {
  if (!hasExactKeys(input, ['compliantCount', 'noncompliantCount', 'unverifiedCount', 'reasons']))
    return false;
  const counts = [input['compliantCount'], input['noncompliantCount'], input['unverifiedCount']];
  if (
    !counts.every(
      (count): count is number =>
        typeof count === 'number' && Number.isSafeInteger(count) && count >= 0,
    )
  )
    return false;
  if (
    counts.reduce((sum, count) => sum + count, 0) > MAX_COMMAND_BYTES ||
    !Array.isArray(input['reasons'])
  )
    return false;
  let noncompliantCount = 0;
  let unverifiedCount = 0;
  let previousCode = '';
  for (const reason of input['reasons'] as unknown[]) {
    if (!hasExactKeys(reason, ['code', 'count'])) return false;
    const code = reason['code'];
    const count = reason['count'];
    if (
      typeof code !== 'string' ||
      code <= previousCode ||
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count <= 0 ||
      count > MAX_COMMAND_BYTES
    )
      return false;
    if (REPAIR_GIT_NONCOMPLIANT_REASONS.has(code as IRepairGitReasonCode))
      noncompliantCount += count;
    else if (REPAIR_GIT_UNVERIFIED_REASONS.has(code as IRepairGitReasonCode))
      unverifiedCount += count;
    else return false;
    previousCode = code;
  }
  return (
    noncompliantCount === input['noncompliantCount'] && unverifiedCount === input['unverifiedCount']
  );
};

const getRejectedRepairGitReason = (words: readonly string[]): IRepairGitReasonCode => {
  switch (identifyGitSubcommand(words)) {
    case 'rev-parse':
      return 'git-rev-parse';
    case 'log':
      return 'git-log';
    case 'show':
      return 'git-show';
    case 'status':
      return 'git-status-arguments';
    case 'diff':
      return 'git-diff-arguments';
    default:
      return 'git-other';
  }
};

/** Credits approved arguments only after the wrapper observes the installed repair helper. */
export const projectRepairGitArgumentsEvidence = (
  arguments_: readonly string[],
  isRepairHelper = false,
): IRepairGitCommandEvidence =>
  isRepairHelper && isApprovedRepairGitArguments(arguments_)
    ? { compliantCount: 1, noncompliantCount: 0, unverifiedCount: 0, reasons: [] }
    : {
        compliantCount: 0,
        noncompliantCount: 1,
        unverifiedCount: 0,
        reasons: [{ code: getRejectedRepairGitReason(['git', ...arguments_]), count: 1 }],
      };

/** Projects repair Git compliance without preserving command text or trusting opaque execution. */
export const projectRepairGitCommandEvidence = (command: unknown): IRepairGitCommandEvidence => {
  const evidence: IRepairGitCommandEvidence = {
    compliantCount: 0,
    noncompliantCount: 0,
    unverifiedCount: 0,
    reasons: [],
  };
  const reasonCounts = new Map<IRepairGitReasonCode, number>();
  const recordReason = (code: IRepairGitReasonCode): void => {
    reasonCounts.set(code, (reasonCounts.get(code) ?? 0) + 1);
    if (REPAIR_GIT_NONCOMPLIANT_REASONS.has(code)) evidence.noncompliantCount++;
    else evidence.unverifiedCount++;
  };
  const directCommand =
    typeof command === 'string' && Buffer.byteLength(command, 'utf8') <= MAX_COMMAND_BYTES
      ? unwrapCodexShellCommand(command)
      : null;
  const parsed =
    directCommand === null
      ? null
      : parseStaticShellList(stripSafeShellRedirections(directCommand), true);
  if (parsed === null)
    return { ...evidence, unverifiedCount: 1, reasons: [{ code: 'unparsed-shell', count: 1 }] };
  for (const originalWords of parsed.commands) {
    let executableIndex = 0;
    while (executableIndex < originalWords.length) {
      const word = originalWords[executableIndex];
      if (word === '!' || word === 'GIT_ATTR_NOSYSTEM=1') {
        executableIndex++;
      } else if (['env', '/bin/env', '/usr/bin/env'].includes(word ?? '')) {
        executableIndex++;
        if (originalWords[executableIndex] === '--') executableIndex++;
        if (originalWords[executableIndex] !== 'GIT_ATTR_NOSYSTEM=1') break;
      } else {
        break;
      }
    }
    const words = originalWords.slice(executableIndex);
    const executable = getExecutableName(words[0] ?? '');
    if (executable === 'git') {
      if (isTrustedGitExecutable(words[0]) && words.length === 2 && words[1] === '--version')
        continue;
      if (!isTrustedGitExecutable(words[0])) recordReason('untrusted-git');
      else recordReason(getRejectedRepairGitReason(words));
      continue;
    }
    if (getRepairGitMode(words) !== null) {
      evidence.compliantCount++;
      continue;
    }
    const isInstalledOperation =
      isSafeMoldeaCliLauncherCommand(words) ||
      isSafeRelevanceGateCommand(words) ||
      isSafeManagedReadmeCommand(words) ||
      getManagedAgentsMode(words) !== null ||
      isSafeNodeVersionCommand(words) ||
      isSafeNpmProbeCommand(words);
    const canInspectWithoutExecution =
      (REPAIR_PASSIVE_EXECUTABLES.has(executable) &&
        isTrustedLocalExecutable(words[0], executable) &&
        !(executable === 'rg' && words.some((word) => /^--pre(?:=|$)/u.test(word)))) ||
      (executable === 'sed' &&
        isTrustedLocalExecutable(words[0], executable) &&
        isSafeSedInspectionCommand(words)) ||
      (executable === 'find' &&
        isTrustedLocalExecutable(words[0], executable) &&
        !words.some((word) => /^-(?:exec|execdir|ok|okdir)$/u.test(word))) ||
      (executable === 'sort' &&
        isTrustedLocalExecutable(words[0], executable) &&
        !words.some((word) => word.startsWith('--c')));
    if (
      !isInstalledOperation &&
      !canInspectWithoutExecution &&
      !(words.length === 2 && words[0] === 'cd' && words[1] === '/mnt')
    ) {
      recordReason(
        executable === 'node'
          ? 'opaque-node'
          : ['sh', 'bash', 'zsh', 'dash'].includes(executable)
            ? 'opaque-shell'
            : 'opaque-command',
      );
    }
  }
  evidence.reasons = [...reasonCounts]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([code, count]) => ({ code, count }));
  return evidence;
};

/** Maps one non-safe network classification to a privacy-safe diagnostic reason. */
const identifyNetworkReasonCode = (
  words: readonly string[],
  status: ICodexEvaluationCommandPolicyStatus,
): ICodexEvaluationCommandPolicyReasonCode | null => {
  if (status === 'not-observed') return null;
  const executableWordIndex = identifyExecutableWordIndex(words);
  if (executableWordIndex === null) return 'dynamic-execution';
  const executable = getExecutableName(words[executableWordIndex]!);
  if (executable === 'git') return status === 'observed' ? 'git-network' : 'unclassified-command';
  if (['corepack', 'npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'yarnpkg'].includes(executable)) {
    return status === 'observed' ? 'package-manager-network' : 'unclassified-command';
  }
  if (NETWORK_EXECUTABLES.has(executable)) return 'network-client';
  if (OPAQUE_EXECUTABLES.has(executable)) return 'dynamic-execution';
  return 'unclassified-command';
};

/** Detects a sensitive environment expansion without evaluating shell syntax. */
const hasSensitiveEnvironmentExpansion = (source: string): boolean => {
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    if (character === "'" && quote !== '"') {
      quote = quote === "'" ? null : "'";
      continue;
    }
    if (character === '"' && quote !== "'") {
      quote = quote === '"' ? null : '"';
      continue;
    }
    if (character !== '$' || quote === "'") continue;
    const match = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/u.exec(source.slice(index));
    if (match?.[1] !== undefined && SENSITIVE_ENVIRONMENT_NAME_PATTERN.test(match[1])) return true;
  }
  return false;
};

/** Classifies a recognizable prohibited target when full static tokenization is impossible. */
const classifyUntokenizedSensitiveAccess = (source: string): IAccessClassification | null => {
  if (hasSensitiveEnvironmentExpansion(source)) {
    return { status: 'observed', reasonCode: 'environment-value-read' };
  }
  const normalizedSource = source.replaceAll("'", '').replaceAll('"', '');
  const fileOperationPattern =
    /^(?:\S*\/)?(?:cat|cmp|file|grep|head|ls|readlink|realpath|rg|sed|sha256sum|stat|tail|wc)\b/u;
  if (fileOperationPattern.test(normalizedSource)) {
    if (/\/proc\/(?:self|\d+)\/environ\b/u.test(normalizedSource)) {
      return { status: 'observed', reasonCode: 'process-environment' };
    }
    if (/\/home\/evaluator\/\.codex\/(?:auth|config)/u.test(normalizedSource)) {
      return { status: 'observed', reasonCode: 'evaluator-auth-file' };
    }
    const sourceWithoutEmptySkillPaths = normalizedSource.replaceAll(
      SAFE_EVALUATOR_SKILL_PATH_PATTERN,
      '',
    );
    if (
      normalizedSource.includes(EVALUATOR_EMPTY_SKILLS_PATH) &&
      !sourceWithoutEmptySkillPaths.includes(EVALUATOR_HOME_PATH)
    ) {
      return null;
    }
    if (/\/home\/evaluator(?:\/|\b)/u.test(normalizedSource)) {
      return { status: 'observed', reasonCode: 'evaluator-home' };
    }
  }
  return { status: 'indeterminate', reasonCode: 'dynamic-execution' };
};

/** Checks whether one path names the repository's moldea/ directory or a path beneath it. */
const isRepositoryMoldeaPath = (candidate: string): boolean => {
  if (candidate === '' || candidate.startsWith('-')) return false;
  const resolvedPath = posix.resolve('/mnt', candidate);
  return resolvedPath === '/mnt/moldea' || resolvedPath.startsWith('/mnt/moldea/');
};

/** Names the bundled skill script one static command runs, directly or through Node. */
const identifyMoldeaSkillScript = (words: readonly string[]): string | null => {
  const executableIndex = identifyExecutableWordIndex(words);
  if (executableIndex === null) return null;
  const executableWord = words[executableIndex]!;
  const scriptWord =
    getExecutableName(executableWord) === 'node' ? words[executableIndex + 1] : executableWord;
  return scriptWord !== undefined && MOLDEA_SKILL_SCRIPT_WORD_PATTERN.test(scriptWord)
    ? posix.basename(scriptWord)
    : null;
};

/** Recognizes a project test, build, Git, package-manager or Node version command. */
const isProjectCommand = (words: readonly string[]): boolean => {
  const executableIndex = identifyExecutableWordIndex(words);
  if (executableIndex === null) return false;
  const commandWords = words.slice(executableIndex);
  return (
    PROJECT_EXECUTABLES.has(getExecutableName(commandWords[0]!)) ||
    identifyRepositoryTestCommandKindsFromWords(commandWords) !== null ||
    isSafeNodeVersionCommand(commandWords)
  );
};

/**
 * Assigns one completed command to the owner whose work it performs, in precedence order:
 * the launcher, a bundled helper, the repository's moldea/ directory, the project, then source.
 */
const classifyCommandOwnership = (
  commands: readonly (readonly string[])[] | null,
  commandText: string,
): Pick<ICommandClassification, 'moldeaOperation' | 'ownership'> => {
  if (commands === null) {
    // an unparseable command takes the highest owner its text could reach
    const scriptNames = [...commandText.matchAll(MOLDEA_SKILL_SCRIPT_TEXT_PATTERN)].map(
      ([, scriptName]) => scriptName,
    );
    return {
      moldeaOperation: null,
      ownership: scriptNames.includes('moldea-cli.mjs')
        ? 'cli'
        : scriptNames.length > 0
          ? 'helper'
          : REPOSITORY_MOLDEA_TEXT_PATTERN.test(commandText)
            ? 'canonical'
            : 'source',
    };
  }
  const scriptNames = commands.map(identifyMoldeaSkillScript).filter((name) => name !== null);
  if (scriptNames.includes('moldea-cli.mjs')) {
    const operations = commands.flatMap((words) => {
      const executableIndex = identifyExecutableWordIndex(words);
      const operation =
        executableIndex === null
          ? null
          : identifyMoldeaCliLauncherOperationFromWords(words.slice(executableIndex));
      return operation === null ? [] : [operation];
    });
    // only one recognizable launcher call can be placed in the ordered event stream
    const isPlaceable =
      operations.length === 1 &&
      scriptNames.filter((scriptName) => scriptName === 'moldea-cli.mjs').length === 1;
    return { moldeaOperation: isPlaceable ? operations[0]! : null, ownership: 'cli' };
  }
  if (scriptNames.length > 0) return { moldeaOperation: null, ownership: 'helper' };
  if (
    commands.some(
      (words) =>
        identifyFilesystemTargets(words).some(isRepositoryMoldeaPath) ||
        words.some((word) => REPOSITORY_MOLDEA_WORD_PATTERN.test(word)),
    )
  ) {
    return { moldeaOperation: null, ownership: 'canonical' };
  }
  const substantiveCommands = commands.filter((words) => {
    const executableIndex = identifyExecutableWordIndex(words);
    return executableIndex !== null && getExecutableName(words[executableIndex]!) !== 'cd';
  });
  return {
    moldeaOperation: null,
    ownership:
      substantiveCommands.length > 0 && substantiveCommands.every(isProjectCommand)
        ? 'project'
        : 'source',
  };
};

/** Reports whether one completed Codex patch touched the repository's moldea/ directory. */
const classifyFileChangeMoldeaPath = (
  item: IPlainRecord,
): Extract<ICodexEvaluationMoldeaEvent, { kind: 'file-change' }>['moldeaPath'] => {
  const changes = item['changes'];
  if (!Array.isArray(changes) || changes.length === 0) return 'unreadable';
  let isTouching = false;
  for (const change of changes as unknown[]) {
    if (!isPlainRecord(change) || typeof change['path'] !== 'string' || change['path'] === '') {
      return 'unreadable';
    }
    if (isRepositoryMoldeaPath(change['path'])) isTouching = true;
  }
  return isTouching ? 'touching' : 'not-touching';
};

/** Classifies one complete command without retaining its content. */
const classifyCommand = (command: string): ICommandClassification => {
  if (Buffer.byteLength(command, 'utf8') > MAX_COMMAND_BYTES) {
    return {
      moldeaCommandCount: 0,
      moldeaLauncherMissReasonCodes: [],
      networkAccess: 'indeterminate',
      networkReasonCode: 'oversized-command',
      sensitiveAccess: 'indeterminate',
      sensitiveReasonCode: 'oversized-command',
      ...classifyCommandOwnership(null, command),
    };
  }
  const directCommand = unwrapCodexShellCommand(command);
  const commandWithoutSafeRedirections =
    directCommand === null ? null : stripSafeShellRedirections(directCommand);
  const commands =
    commandWithoutSafeRedirections === null
      ? null
      : (parseStaticShellList(commandWithoutSafeRedirections)?.commands ?? null);
  if (commands === null) {
    const sensitiveClassification = classifyUntokenizedSensitiveAccess(directCommand ?? command);
    return {
      moldeaCommandCount: 0,
      moldeaLauncherMissReasonCodes: [],
      networkAccess: 'indeterminate',
      networkReasonCode: 'dynamic-execution',
      sensitiveAccess: sensitiveClassification?.status ?? 'indeterminate',
      sensitiveReasonCode: sensitiveClassification?.reasonCode ?? 'dynamic-execution',
      ...classifyCommandOwnership(null, directCommand ?? command),
    };
  }
  const sensitiveClassification = classifyDecodedSensitiveAccess(commands);
  const canUseLocalSkillOperation =
    commands.length === 1 && commandWithoutSafeRedirections === directCommand;
  const networkClassifications = commands.map((words) =>
    classifyNetworkCommand([...words], canUseLocalSkillOperation),
  );
  const networkAccess: ICodexEvaluationCommandPolicyStatus = networkClassifications.includes(
    'observed',
  )
    ? 'observed'
    : networkClassifications.includes('indeterminate')
      ? 'indeterminate'
      : 'not-observed';
  const networkReasonCode = commands
    .map((words, index) => identifyNetworkReasonCode(words, networkClassifications[index]!))
    .filter((reasonCode) => reasonCode !== null)
    .sort((left, right) => left.localeCompare(right, 'en'))[0];
  const moldeaCommandCount = commands.filter((words) => {
    const commandWords = [...words];
    while (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(commandWords[0] ?? '')) commandWords.shift();
    if (commandWords[0] === '!') commandWords.shift();
    return isSafeMoldeaCliLauncherCommand(commandWords);
  }).length;
  return {
    moldeaCommandCount,
    moldeaLauncherMissReasonCodes: commands
      .map(identifyMoldeaCliLauncherMissReason)
      .filter((code) => code !== null),
    networkAccess,
    ...(networkReasonCode === undefined ? {} : { networkReasonCode }),
    sensitiveAccess:
      sensitiveClassification?.status ??
      (networkAccess === 'indeterminate' ? 'indeterminate' : 'not-observed'),
    ...(sensitiveClassification !== null
      ? { sensitiveReasonCode: sensitiveClassification.reasonCode }
      : networkAccess === 'indeterminate' && networkReasonCode !== undefined
        ? { sensitiveReasonCode: networkReasonCode }
        : {}),
    ...classifyCommandOwnership(commands, command),
  };
};

/** Detects a canonical Basic credential without treating ordinary prose as secret material. */
const hasBasicAuthorizationCredential = (source: string): boolean => {
  BASIC_AUTHORIZATION_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(BASIC_AUTHORIZATION_PATTERN)) {
    const token = match[1];
    if (token === undefined) continue;
    const decoded = Buffer.from(token, 'base64');
    const decodedText = decoded.toString('utf8');
    const normalizedToken = token.replace(/=+$/u, '');
    if (
      Buffer.from(decodedText, 'utf8').equals(decoded) &&
      decoded.toString('base64').replace(/=+$/u, '') === normalizedToken &&
      decodedText.includes(':')
    ) {
      return true;
    }
  }
  return false;
};

const hasCredentialExposure = (source: string): boolean =>
  hasBasicAuthorizationCredential(source) ||
  CREDENTIAL_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(source);
  });

/** Detects credentials only in plaintext event fields that can expose them to the model or logs. */
const hasCredentialExposureInEvent = (event: unknown): boolean => {
  const visit = (candidate: unknown): boolean => {
    if (Array.isArray(candidate)) return candidate.some(visit);
    if (!isPlainRecord(candidate)) return false;
    return Object.entries(candidate).some(([key, value]) => {
      if (typeof value === 'string' && CREDENTIAL_TEXT_FIELD_NAMES.has(key)) {
        return hasCredentialExposure(value);
      }
      return typeof value === 'object' && value !== null ? visit(value) : false;
    });
  };

  return visit(event);
};

/** Recursively selects the latest complete token-usage candidate. */
const extractUsageCandidate = (candidate: unknown): IUsage | null => {
  if (!isPlainRecord(candidate)) return null;
  const inputTokens = candidate['input_tokens'] ?? candidate['inputTokens'];
  const cachedInputTokens = candidate['cached_input_tokens'] ?? candidate['cachedInputTokens'] ?? 0;
  const outputTokens = candidate['output_tokens'] ?? candidate['outputTokens'];
  if (
    isBoundedNonNegativeInteger(inputTokens, Number.MAX_SAFE_INTEGER) &&
    isBoundedNonNegativeInteger(cachedInputTokens, Number.MAX_SAFE_INTEGER) &&
    isBoundedNonNegativeInteger(outputTokens, Number.MAX_SAFE_INTEGER)
  ) {
    return { inputTokens, cachedInputTokens, outputTokens };
  }
  for (const nestedValue of Object.values(candidate)) {
    const nestedUsage: IUsage | null = extractUsageCandidate(nestedValue);
    if (nestedUsage !== null) return nestedUsage;
  }
  return null;
};

const summarizePolicy = (
  classifications: readonly ICommandClassification[],
  policyName: IPolicyName,
): IPolicyObservation => {
  const observedCount = classifications.filter(
    (classification) => classification[policyName] === 'observed',
  ).length;
  const indeterminateCount = classifications.filter(
    (classification) => classification[policyName] === 'indeterminate',
  ).length;
  const reasonCounts = new Map<ICodexEvaluationCommandPolicyReasonCode, number>();
  const reasonFieldName =
    policyName === 'networkAccess' ? 'networkReasonCode' : 'sensitiveReasonCode';
  for (const classification of classifications) {
    const reasonCode = classification[reasonFieldName];
    if (reasonCode !== undefined) {
      reasonCounts.set(reasonCode, (reasonCounts.get(reasonCode) ?? 0) + 1);
    }
  }
  return {
    status:
      observedCount > 0 ? 'observed' : indeterminateCount > 0 ? 'indeterminate' : 'not-observed',
    observedCount,
    indeterminateCount,
    reasons: [...reasonCounts]
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([code, count]) => ({ code, count })),
  };
};

/** Throws one actionable resource-limit error with the observed and permitted values. */
const assertWithinResourceLimit = (
  label: string,
  unit: string,
  observedValue: number,
  maximumValue: number,
): void => {
  if (observedValue > maximumValue) {
    throw new Error(
      `Codex execution evidence ${label} is ${observedValue} ${unit}; the limit is ${maximumValue} ${unit}.`,
    );
  }
};

/** Checks one ordered privacy-safe command-policy reason list. */
const hasValidCommandPolicyReasons = (
  reasons: unknown,
): reasons is ICodexEvaluationCommandPolicyReason[] => {
  if (!Array.isArray(reasons)) return false;

  let previousCode: ICodexEvaluationCommandPolicyReasonCode | null = null;
  for (const reason of reasons as unknown[]) {
    if (!hasExactKeys(reason, ['code', 'count'])) return false;
    const code = reason['code'];
    const count = reason['count'];
    if (
      typeof code !== 'string' ||
      !COMMAND_POLICY_REASON_CODES.has(code as ICodexEvaluationCommandPolicyReasonCode) ||
      typeof count !== 'number' ||
      !Number.isSafeInteger(count) ||
      count <= 0 ||
      (previousCode !== null && previousCode >= code)
    ) {
      return false;
    }
    previousCode = code as ICodexEvaluationCommandPolicyReasonCode;
  }
  return true;
};

/** Checks one derived network or sensitive-access aggregate. */
const hasValidCommandPolicyObservation = (
  observation: unknown,
  completedCommandCount: number,
  observedReasonCodes: ReadonlySet<ICodexEvaluationCommandPolicyReasonCode>,
  indeterminateReasonCodes: ReadonlySet<ICodexEvaluationCommandPolicyReasonCode>,
): observation is IPolicyObservation => {
  if (!hasExactKeys(observation, ['status', 'observedCount', 'indeterminateCount', 'reasons'])) {
    return false;
  }

  const status = observation['status'];
  const observedCount = observation['observedCount'];
  const indeterminateCount = observation['indeterminateCount'];
  const reasons = observation['reasons'];
  if (
    typeof status !== 'string' ||
    !COMMAND_POLICY_STATUSES.has(status as ICodexEvaluationCommandPolicyStatus) ||
    !isBoundedNonNegativeInteger(observedCount, completedCommandCount) ||
    !isBoundedNonNegativeInteger(indeterminateCount, completedCommandCount) ||
    observedCount + indeterminateCount > completedCommandCount ||
    !hasValidCommandPolicyReasons(reasons)
  ) {
    return false;
  }

  const expectedStatus =
    observedCount > 0 ? 'observed' : indeterminateCount > 0 ? 'indeterminate' : 'not-observed';
  const observedReasonCount = reasons.reduce(
    (total, reason) => total + (observedReasonCodes.has(reason.code) ? reason.count : 0),
    0,
  );
  const indeterminateReasonCount = reasons.reduce(
    (total, reason) => total + (indeterminateReasonCodes.has(reason.code) ? reason.count : 0),
    0,
  );
  return (
    status === expectedStatus &&
    observedReasonCount === observedCount &&
    indeterminateReasonCount === indeterminateCount &&
    observedReasonCount + indeterminateReasonCount ===
      reasons.reduce((total, reason) => total + reason.count, 0)
  );
};

/** Checks one ownership class's completed-command totals. */
const hasValidOwnedCommandTotals = (
  totals: unknown,
): totals is ICodexEvaluationOwnedCommandTotals =>
  hasExactKeys(totals, ['commandCount', 'maximumOutputByteCount', 'outputByteCount']) &&
  isBoundedNonNegativeInteger(totals['commandCount'], MAX_COMPLETED_COMMAND_COUNT) &&
  isBoundedNonNegativeInteger(totals['outputByteCount'], MAX_MODEL_VISIBLE_TOOL_OUTPUT_BYTES) &&
  isBoundedNonNegativeInteger(totals['maximumOutputByteCount'], totals['outputByteCount']) &&
  (totals['commandCount'] > 0 || totals['outputByteCount'] === 0);

/** Checks one ordered moldea event without accepting raw commands or paths. */
const hasValidMoldeaEvent = (event: unknown): event is ICodexEvaluationMoldeaEvent => {
  if (hasExactKeys(event, ['kind', 'moldeaPath'])) {
    return (
      event['kind'] === 'file-change' &&
      ['not-touching', 'touching', 'unreadable'].includes(event['moldeaPath'] as string)
    );
  }
  if (!hasExactKeys(event, ['kind', 'operation', 'outputByteCount', 'ownership'])) return false;
  const operation = event['operation'];
  return (
    event['kind'] === 'command' &&
    MOLDEA_EVENT_OWNERSHIPS.has(event['ownership'] as ICodexEvaluationCommandOwnership) &&
    isBoundedNonNegativeInteger(event['outputByteCount'], MAX_MODEL_VISIBLE_TOOL_OUTPUT_BYTES) &&
    (operation === null ||
      (event['ownership'] === 'cli' &&
        typeof operation === 'string' &&
        MOLDEA_CLI_OPERATIONS.has(operation)))
  );
};

/** Checks that ownership totals and ordered moldea events agree with the command aggregate. */
const hasValidCommandOwnership = (
  commandOwnership: unknown,
  moldeaEvents: unknown,
  aggregate: {
    completedCommandCount: number;
    maximumCommandOutputByteCount: number;
    modelVisibleToolOutputByteCount: number;
  },
): boolean => {
  if (
    !hasExactKeys(commandOwnership, COMMAND_OWNERSHIPS) ||
    !COMMAND_OWNERSHIPS.every((ownership) =>
      hasValidOwnedCommandTotals(commandOwnership[ownership]),
    ) ||
    !Array.isArray(moldeaEvents) ||
    moldeaEvents.length > MAX_COMPLETED_COMMAND_COUNT + MAX_FILE_CHANGE_COUNT ||
    !moldeaEvents.every(hasValidMoldeaEvent)
  ) {
    return false;
  }
  const totals = COMMAND_OWNERSHIPS.map(
    (ownership) => commandOwnership[ownership] as ICodexEvaluationOwnedCommandTotals,
  );
  const commandEvents = moldeaEvents.filter((event) => event.kind === 'command');
  return (
    totals.reduce((total, { commandCount }) => total + commandCount, 0) ===
      aggregate.completedCommandCount &&
    totals.reduce((total, { outputByteCount }) => total + outputByteCount, 0) ===
      aggregate.modelVisibleToolOutputByteCount &&
    Math.max(0, ...totals.map(({ maximumOutputByteCount }) => maximumOutputByteCount)) ===
      aggregate.maximumCommandOutputByteCount &&
    moldeaEvents.length - commandEvents.length <= MAX_FILE_CHANGE_COUNT &&
    [...MOLDEA_EVENT_OWNERSHIPS].every((ownership) => {
      const ownedEvents = commandEvents.filter((event) => event.ownership === ownership);
      const ownedTotals = commandOwnership[ownership] as ICodexEvaluationOwnedCommandTotals;
      return (
        ownedEvents.length === ownedTotals.commandCount &&
        ownedEvents.reduce((total, event) => total + event.outputByteCount, 0) ===
          ownedTotals.outputByteCount &&
        Math.max(0, ...ownedEvents.map(({ outputByteCount }) => outputByteCount)) ===
          ownedTotals.maximumOutputByteCount
      );
    })
  );
};

/**
 * Checks the complete privacy-safe command-policy aggregate shared by evaluation workflows.
 * @param evidence The prospective aggregate.
 * @returns Whether the aggregate has the exact current structure and consistent derived counts.
 */
export const hasValidCodexEvaluationCommandPolicy = (
  evidence: unknown,
): evidence is ICodexEvaluationCommandPolicyEvidence => {
  if (
    !hasExactKeys(evidence, [
      'commandOwnership',
      'completedCommandCount',
      'credentialExposure',
      'maximumCommandOutputByteCount',
      'modelVisibleToolOutputByteCount',
      'moldeaCommandCount',
      'moldeaEvents',
      'moldeaLauncherMissReasons',
      'moldeaOutputByteCount',
      'networkAccess',
      'sensitiveAccess',
    ])
  ) {
    return false;
  }

  const completedCommandCount = evidence['completedCommandCount'];
  const maximumCommandOutputByteCount = evidence['maximumCommandOutputByteCount'];
  const modelVisibleToolOutputByteCount = evidence['modelVisibleToolOutputByteCount'];
  const moldeaCommandCount = evidence['moldeaCommandCount'];
  const moldeaOutputByteCount = evidence['moldeaOutputByteCount'];
  const launcherMissReasons = evidence['moldeaLauncherMissReasons'];
  if (
    !isBoundedNonNegativeInteger(completedCommandCount, MAX_COMPLETED_COMMAND_COUNT) ||
    !isBoundedNonNegativeInteger(
      maximumCommandOutputByteCount,
      MAX_MODEL_VISIBLE_TOOL_OUTPUT_BYTES,
    ) ||
    !isBoundedNonNegativeInteger(
      modelVisibleToolOutputByteCount,
      MAX_MODEL_VISIBLE_TOOL_OUTPUT_BYTES,
    ) ||
    !isBoundedNonNegativeInteger(moldeaCommandCount, MAX_MOLDEA_COMMAND_COUNT) ||
    !isBoundedNonNegativeInteger(moldeaOutputByteCount, MAX_MOLDEA_OUTPUT_BYTES) ||
    maximumCommandOutputByteCount > modelVisibleToolOutputByteCount ||
    (completedCommandCount === 0 && maximumCommandOutputByteCount !== 0) ||
    (moldeaCommandCount === 0 && moldeaOutputByteCount !== 0) ||
    !hasValidCommandOwnership(evidence['commandOwnership'], evidence['moldeaEvents'], {
      completedCommandCount,
      maximumCommandOutputByteCount,
      modelVisibleToolOutputByteCount,
    })
  ) {
    return false;
  }

  if (
    !Array.isArray(launcherMissReasons) ||
    launcherMissReasons.length > MOLDEA_LAUNCHER_MISS_REASON_CODES.length ||
    launcherMissReasons.some(
      (reason: unknown) =>
        !hasExactKeys(reason, ['code', 'count']) ||
        !MOLDEA_LAUNCHER_MISS_REASON_CODES.includes(
          reason['code'] as IMoldeaCliLauncherMissReasonCode,
        ) ||
        !isBoundedNonNegativeInteger(reason['count'], MAX_COMMAND_BYTES * completedCommandCount) ||
        reason['count'] === 0,
    ) ||
    new Set(
      launcherMissReasons.map((reason: unknown) => (isPlainRecord(reason) ? reason['code'] : null)),
    ).size !== launcherMissReasons.length
  )
    return false;

  const credentialExposure = evidence['credentialExposure'];
  if (!hasExactKeys(credentialExposure, ['status', 'observedCount', 'reasons'])) {
    return false;
  }

  const credentialStatus = credentialExposure['status'];
  const credentialObservedCount = credentialExposure['observedCount'];
  const credentialReasons = credentialExposure['reasons'];
  if (
    (credentialStatus !== 'not-observed' && credentialStatus !== 'observed') ||
    !isBoundedNonNegativeInteger(credentialObservedCount, Number.MAX_SAFE_INTEGER) ||
    !hasValidCommandPolicyReasons(credentialReasons) ||
    credentialStatus !== (credentialObservedCount > 0 ? 'observed' : 'not-observed') ||
    credentialReasons.reduce((total, reason) => total + reason.count, 0) !==
      credentialObservedCount ||
    (credentialObservedCount > 0 &&
      (credentialReasons.length !== 1 || credentialReasons[0]?.code !== 'credential-material')) ||
    (credentialObservedCount === 0 && credentialReasons.length !== 0)
  ) {
    return false;
  }

  return (
    hasValidCommandPolicyObservation(
      evidence['networkAccess'],
      completedCommandCount,
      NETWORK_OBSERVED_REASON_CODES,
      NETWORK_INDETERMINATE_REASON_CODES,
    ) &&
    hasValidCommandPolicyObservation(
      evidence['sensitiveAccess'],
      completedCommandCount,
      SENSITIVE_OBSERVED_REASON_CODES,
      SENSITIVE_INDETERMINATE_REASON_CODES,
    )
  );
};

/**
 * Decides whether evaluation command-policy evidence contains an observed violation.
 * @param evidence The prospective privacy-safe command-policy aggregate.
 * @returns Whether the evidence contains no policy-level failure.
 */
export const hasPassingCodexEvaluationCommandPolicy = (evidence: unknown): boolean => {
  return (
    hasValidCodexEvaluationCommandPolicy(evidence) &&
    evidence.credentialExposure.status !== 'observed' &&
    evidence.networkAccess.status !== 'observed' &&
    evidence.sensitiveAccess.status !== 'observed'
  );
};

/**
 * Projects Codex JSONL into bounded execution facts and discards raw commands and output.
 * @param source The complete successful Codex JSONL stream.
 * @param sessionUsageBeforeRequest The cumulative counter before this resumed request, or null for a fresh session.
 * @returns Safe projected events, token usage, and command-policy evidence.
 * @throws If the stream, command evidence, usage counters or resource consumption is invalid.
 */
export const projectCodexEvaluationExecutionEvidence = (
  source: unknown,
  sessionUsageBeforeRequest: IUsage | null = null,
): ICodexEvaluationExecutionEvidence => {
  if (typeof source !== 'string') throw new TypeError('Codex execution evidence must be JSONL.');
  const projectedEvents: Array<{
    eventType: 'command.completed';
    exitCode: number;
    moldeaCommandCount: number;
    outputByteCount: number;
    status: 'completed' | 'failed';
  }> = [];
  const classifications: ICommandClassification[] = [];
  const commandOwnership = Object.fromEntries(
    COMMAND_OWNERSHIPS.map((ownership) => [
      ownership,
      { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
    ]),
  ) as ICodexEvaluationCommandPolicyEvidence['commandOwnership'];
  const moldeaEvents: ICodexEvaluationMoldeaEvent[] = [];
  let fileChangeCount = 0;
  let credentialExposureCount = 0;
  let maximumCommandOutputByteCount = 0;
  let modelVisibleToolOutputByteCount = 0;
  let moldeaCommandCount = 0;
  let moldeaOutputByteCount = 0;
  let usage: IUsage | null = null;
  let cliInvocations: ICliInvocation[] | null = null;

  for (const eventLine of source.split('\n')) {
    if (eventLine.trim() === '') continue;
    let event: unknown;
    try {
      event = JSON.parse(eventLine) as unknown;
    } catch (error) {
      throw new Error('Codex execution evidence contains malformed JSONL.', {
        cause: error,
      });
    }
    if (!isPlainRecord(event) || typeof event['type'] !== 'string') {
      throw new Error('Codex execution evidence contains an unsupported event.');
    }
    if (hasCredentialExposureInEvent(event)) credentialExposureCount += 1;
    if (event['type'] === 'moldea.cli-invocations') {
      if (cliInvocations !== null) throw new Error('CLI invocation capture is duplicated.');
      cliInvocations = CliInvocationEventSchema.parse(event).invocations;
    }
    const eventUsage = extractUsageCandidate(event);
    if (eventUsage !== null) usage = eventUsage;

    // patch writes are not commands, but their order decides the final-validation exception
    if (
      event['type'] === 'item.completed' &&
      isPlainRecord(event['item']) &&
      event['item']['type'] === 'file_change'
    ) {
      fileChangeCount += 1;
      assertWithinResourceLimit(
        'file change count',
        'changes',
        fileChangeCount,
        MAX_FILE_CHANGE_COUNT,
      );
      moldeaEvents.push({
        kind: 'file-change',
        moldeaPath: classifyFileChangeMoldeaPath(event['item']),
      });
      continue;
    }

    if (
      event['type'] !== 'item.completed' ||
      !isPlainRecord(event['item']) ||
      event['item']['type'] !== 'command_execution'
    ) {
      continue;
    }
    const item = event['item'];
    const command = item['command'];
    const status = item['status'];
    const exitCode = item['exit_code'];
    const aggregatedOutput = item['aggregated_output'];
    if (
      typeof command !== 'string' ||
      command.trim() === '' ||
      (status !== 'completed' && status !== 'failed') ||
      typeof exitCode !== 'number' ||
      !Number.isSafeInteger(exitCode) ||
      typeof aggregatedOutput !== 'string'
    ) {
      throw new Error('A completed Codex command event has an unsupported shape.');
    }
    if (projectedEvents.length >= MAX_COMPLETED_COMMAND_COUNT) {
      throw new Error('Codex execution evidence exceeded its completed-command limit.');
    }

    const classification = classifyCommand(command);
    const outputByteCount = Buffer.byteLength(aggregatedOutput, 'utf8');
    maximumCommandOutputByteCount = Math.max(maximumCommandOutputByteCount, outputByteCount);
    modelVisibleToolOutputByteCount += outputByteCount;
    moldeaCommandCount += classification.moldeaCommandCount;
    if (classification.moldeaCommandCount > 0) moldeaOutputByteCount += outputByteCount;
    const ownedTotals = commandOwnership[classification.ownership];
    ownedTotals.commandCount += 1;
    ownedTotals.outputByteCount += outputByteCount;
    ownedTotals.maximumOutputByteCount = Math.max(
      ownedTotals.maximumOutputByteCount,
      outputByteCount,
    );
    if (
      classification.ownership === 'canonical' ||
      classification.ownership === 'cli' ||
      classification.ownership === 'helper'
    ) {
      moldeaEvents.push({
        kind: 'command',
        operation: classification.moldeaOperation,
        outputByteCount,
        ownership: classification.ownership,
      });
    }
    assertWithinResourceLimit(
      'model-visible tool output',
      'bytes',
      modelVisibleToolOutputByteCount,
      MAX_MODEL_VISIBLE_TOOL_OUTPUT_BYTES,
    );
    classifications.push(classification);
    projectedEvents.push({
      eventType: 'command.completed',
      exitCode,
      moldeaCommandCount: classification.moldeaCommandCount,
      outputByteCount,
      status,
    });
  }

  if (cliInvocations !== null) {
    moldeaCommandCount = cliInvocations.length;
    moldeaOutputByteCount = cliInvocations.reduce(
      (total, invocation) => total + invocation.outputByteCount,
      0,
    );
  }
  assertWithinResourceLimit(
    'moldea command count',
    'commands',
    moldeaCommandCount,
    MAX_MOLDEA_COMMAND_COUNT,
  );
  assertWithinResourceLimit(
    'moldea command output',
    'bytes',
    moldeaOutputByteCount,
    MAX_MOLDEA_OUTPUT_BYTES,
  );
  const networkAccess = summarizePolicy(classifications, 'networkAccess');
  const sensitiveAccess = summarizePolicy(classifications, 'sensitiveAccess');
  const commandPolicy: ICodexEvaluationCommandPolicyEvidence = {
    commandOwnership,
    completedCommandCount: classifications.length,
    credentialExposure:
      credentialExposureCount > 0
        ? {
            status: 'observed',
            observedCount: credentialExposureCount,
            reasons: [{ code: 'credential-material', count: credentialExposureCount }],
          }
        : { status: 'not-observed', observedCount: 0, reasons: [] },
    maximumCommandOutputByteCount,
    modelVisibleToolOutputByteCount,
    moldeaCommandCount,
    moldeaEvents,
    moldeaLauncherMissReasons: MOLDEA_LAUNCHER_MISS_REASON_CODES.map((code) => ({
      code,
      count: classifications.reduce(
        (total, classification) =>
          total +
          classification.moldeaLauncherMissReasonCodes.filter((reason) => reason === code).length,
        0,
      ),
    })).filter(({ count }) => count > 0),
    moldeaOutputByteCount,
    networkAccess,
    sensitiveAccess,
  };
  if (
    !COMMAND_POLICY_STATUSES.has(networkAccess.status) ||
    !COMMAND_POLICY_STATUSES.has(sensitiveAccess.status)
  ) {
    throw new Error('Codex execution command policy could not be derived.');
  }
  if (sessionUsageBeforeRequest !== null) {
    if (usage === null) throw new Error('Codex resumed-session token usage is missing.');
    const fields = ['inputTokens', 'cachedInputTokens', 'outputTokens'] as const;
    for (const field of fields) {
      if (
        !isBoundedNonNegativeInteger(sessionUsageBeforeRequest[field], Number.MAX_SAFE_INTEGER) ||
        usage[field] < sessionUsageBeforeRequest[field]
      ) {
        throw new Error('Codex resumed-session token usage is inconsistent.');
      }
    }
    usage = {
      inputTokens: usage.inputTokens - sessionUsageBeforeRequest.inputTokens,
      cachedInputTokens: usage.cachedInputTokens - sessionUsageBeforeRequest.cachedInputTokens,
      outputTokens: usage.outputTokens - sessionUsageBeforeRequest.outputTokens,
    };
    if (usage.cachedInputTokens > usage.inputTokens) {
      throw new Error('Codex resumed-session token usage is inconsistent.');
    }
  }
  // token overages remain evidence for the trial's resource verdict, not parsing failures
  return {
    commandPolicy,
    projectedEvents:
      projectedEvents.map((event) => JSON.stringify(event)).join('\n') +
      (projectedEvents.length === 0 ? '' : '\n'),
    usage,
  };
};
