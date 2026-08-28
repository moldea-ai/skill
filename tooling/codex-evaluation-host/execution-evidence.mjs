import { posix } from 'node:path';

const COMMAND_POLICY_STATUSES = new Set(['indeterminate', 'not-observed', 'observed']);
const COMMAND_RESULT_STATUSES = new Set(['completed', 'failed']);
const MAX_COMPLETED_COMMAND_COUNT = 128;
const MAX_COMMAND_BYTES = 32_768;
const NETWORK_EXECUTABLES = new Set([
  'corepack',
  'curl',
  'ftp',
  'gh',
  'http',
  'https',
  'nc',
  'ncat',
  'npm',
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
  'jq',
  'ls',
  'moldea',
  'printf',
  'pwd',
  'readlink',
  'realpath',
  'rg',
  'sed',
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
]);
const SAFE_GIT_SUBCOMMANDS = new Set(['diff', 'log', 'rev-parse', 'show', 'status', 'version']);
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
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}(?=$|[\s"',;])/giu,
  /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/gu,
];
const SENSITIVE_ACCESS_PATTERN =
  /(?:^|[\s'"=])(?:~|\/home\/evaluator)?\/?\.codex\/(?:auth\.json|config\.toml)|\b(?:OPENAI_API_KEY|AUTHORIZATION|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD|PRIVATE_KEY|SECRET)\b/iu;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Reconstructs one fixed shell-escaped word without evaluating expansions. */
const decodeFixedShellWord = (input) => {
  let output = '';
  let quote = null;
  let hasWord = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
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
      output += nextCharacter;
      hasWord = true;
      index += 1;
      continue;
    }
    if (character === '$' || character === '`') return null;
    if (/\s/u.test(character)) {
      return hasWord && input.slice(index).trim() === '' ? output : null;
    }
    if (';&|<>(){}'.includes(character)) return null;
    output += character;
    hasWord = true;
  }

  return quote === null && hasWord ? output : null;
};

/** Removes only the fixed Bash wrapper emitted by the Codex command host. */
const unwrapCodexShellCommand = (command) => {
  for (const executable of ['/bin/bash', 'bash']) {
    const prefix = `${executable} -lc `;
    if (command.startsWith(prefix)) return decodeFixedShellWord(command.slice(prefix.length));
  }
  return command;
};

/** Splits a static shell list while rejecting syntax that can conceal execution. */
const tokenizeStaticShellList = (command) => {
  const commands = [[]];
  let currentWord = '';
  let hasCurrentWord = false;
  let quote = null;

  const pushWord = () => {
    if (!hasCurrentWord) return;
    commands.at(-1).push(currentWord);
    currentWord = '';
    hasCurrentWord = false;
  };
  const pushCommand = () => {
    pushWord();
    if (commands.at(-1).length === 0) return false;
    commands.push([]);
    return true;
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    const nextCharacter = command[index + 1];

    if (quote !== null) {
      if (character === quote) {
        quote = null;
      } else if (character === '\\' && quote === '"') {
        if (nextCharacter === undefined) return null;
        currentWord += nextCharacter;
        hasCurrentWord = true;
        index += 1;
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
      currentWord += nextCharacter;
      hasCurrentWord = true;
      index += 1;
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
    if (/\s/u.test(character)) {
      if (character === '\n' && (hasCurrentWord || commands.at(-1).length > 0)) {
        if (!pushCommand()) return null;
      } else pushWord();
      continue;
    }
    if (character === ';' || character === '|' || character === '&') {
      if (!pushCommand()) return null;
      if (nextCharacter === character) index += 1;
      continue;
    }
    currentWord += character;
    hasCurrentWord = true;
  }

  if (quote !== null) return null;
  pushWord();
  if (commands.at(-1).length === 0) commands.pop();
  return commands.length > 0 ? commands : null;
};

const getExecutableName = (word) => posix.basename(word).toLowerCase();

/** Classifies whether one static command can use a network boundary. */
const classifyNetworkCommand = (words) => {
  while (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(words[0] ?? '')) words.shift();
  if (words[0] === '!') words.shift();
  const executable = getExecutableName(words[0] ?? '');
  if (executable === '') return 'indeterminate';
  if (NETWORK_EXECUTABLES.has(executable)) return 'observed';
  if (executable === 'git') {
    const subcommand = words.find((word, index) => index > 0 && !word.startsWith('-'));
    if (subcommand === undefined) return 'indeterminate';
    if (NETWORK_GIT_SUBCOMMANDS.has(subcommand)) return 'observed';
    return SAFE_GIT_SUBCOMMANDS.has(subcommand) ? 'not-observed' : 'indeterminate';
  }
  if (executable === 'find' && words.some((word) => /^-(?:exec|execdir|ok|okdir)$/u.test(word))) {
    return 'indeterminate';
  }
  if (executable === 'rg' && words.some((word) => word === '--pre' || word.startsWith('--pre='))) {
    return 'indeterminate';
  }
  if (OPAQUE_EXECUTABLES.has(executable)) return 'indeterminate';
  return SAFE_LOCAL_EXECUTABLES.has(executable) ? 'not-observed' : 'indeterminate';
};

/** Classifies one complete command without retaining its content. */
const classifyCommand = (command) => {
  if (Buffer.byteLength(command, 'utf8') > MAX_COMMAND_BYTES) {
    return { networkAccess: 'indeterminate', sensitiveAccess: 'indeterminate' };
  }
  const sensitiveAccess = SENSITIVE_ACCESS_PATTERN.test(command) ? 'observed' : null;
  const directCommand = unwrapCodexShellCommand(command);
  const commands = directCommand === null ? null : tokenizeStaticShellList(directCommand);
  if (commands === null) {
    return {
      networkAccess: 'indeterminate',
      sensitiveAccess: sensitiveAccess ?? 'indeterminate',
    };
  }
  const networkClassifications = commands.map((words) => classifyNetworkCommand([...words]));
  const networkAccess = networkClassifications.includes('observed')
    ? 'observed'
    : networkClassifications.includes('indeterminate')
      ? 'indeterminate'
      : 'not-observed';
  return {
    networkAccess,
    sensitiveAccess:
      sensitiveAccess ?? (networkAccess === 'indeterminate' ? 'indeterminate' : 'not-observed'),
  };
};

const hasCredentialExposure = (source) =>
  CREDENTIAL_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(source);
  });

/** Recursively selects the latest complete token-usage candidate. */
const extractUsageCandidate = (candidate) => {
  if (!isPlainRecord(candidate)) return null;
  const inputTokens = candidate.input_tokens ?? candidate.inputTokens;
  const cachedInputTokens = candidate.cached_input_tokens ?? candidate.cachedInputTokens ?? 0;
  const outputTokens = candidate.output_tokens ?? candidate.outputTokens;
  if (
    Number.isSafeInteger(inputTokens) &&
    inputTokens >= 0 &&
    Number.isSafeInteger(cachedInputTokens) &&
    cachedInputTokens >= 0 &&
    Number.isSafeInteger(outputTokens) &&
    outputTokens >= 0
  ) {
    return { inputTokens, cachedInputTokens, outputTokens };
  }
  for (const nestedValue of Object.values(candidate)) {
    const nestedUsage = extractUsageCandidate(nestedValue);
    if (nestedUsage !== null) return nestedUsage;
  }
  return null;
};

const summarizePolicy = (classifications, policyName) => {
  const observedCount = classifications.filter(
    (classification) => classification[policyName] === 'observed',
  ).length;
  const indeterminateCount = classifications.filter(
    (classification) => classification[policyName] === 'indeterminate',
  ).length;
  return {
    status:
      observedCount > 0 ? 'observed' : indeterminateCount > 0 ? 'indeterminate' : 'not-observed',
    observedCount,
    indeterminateCount,
  };
};

/**
 * Projects Codex JSONL into bounded execution facts and discards raw commands and output.
 * @param source The complete successful Codex JSONL stream.
 * @returns Safe projected events, token usage, and command-policy evidence.
 * @throws If the stream or a completed command event has an unsupported shape.
 */
export const projectCodexEvaluationExecutionEvidence = (source) => {
  if (typeof source !== 'string') throw new TypeError('Codex execution evidence must be JSONL.');
  const projectedEvents = [];
  const classifications = [];
  let credentialExposureCount = 0;
  let usage = null;

  for (const eventLine of source.split('\n')) {
    if (eventLine.trim() === '') continue;
    if (hasCredentialExposure(eventLine)) credentialExposureCount += 1;
    let event;
    try {
      event = JSON.parse(eventLine);
    } catch (error) {
      throw new Error('Codex execution evidence contains malformed JSONL.', { cause: error });
    }
    if (!isPlainRecord(event) || typeof event.type !== 'string') {
      throw new Error('Codex execution evidence contains an unsupported event.');
    }
    const eventUsage = extractUsageCandidate(event);
    if (eventUsage !== null) usage = eventUsage;

    if (
      event.type !== 'item.completed' ||
      !isPlainRecord(event.item) ||
      event.item.type !== 'command_execution'
    ) {
      continue;
    }
    if (
      typeof event.item.command !== 'string' ||
      event.item.command.trim() === '' ||
      !COMMAND_RESULT_STATUSES.has(event.item.status) ||
      !Number.isSafeInteger(event.item.exit_code) ||
      typeof event.item.aggregated_output !== 'string'
    ) {
      throw new Error('A completed Codex command event has an unsupported shape.');
    }
    if (projectedEvents.length >= MAX_COMPLETED_COMMAND_COUNT) {
      throw new Error('Codex execution evidence exceeded its completed-command limit.');
    }

    const classification = classifyCommand(event.item.command);
    classifications.push(classification);
    projectedEvents.push({
      eventType: 'command.completed',
      exitCode: event.item.exit_code,
      outputByteCount: Buffer.byteLength(event.item.aggregated_output, 'utf8'),
      status: event.item.status,
    });
  }

  const networkAccess = summarizePolicy(classifications, 'networkAccess');
  const sensitiveAccess = summarizePolicy(classifications, 'sensitiveAccess');
  const commandPolicy = {
    completedCommandCount: classifications.length,
    credentialExposure:
      credentialExposureCount > 0
        ? { status: 'observed', observedCount: credentialExposureCount }
        : { status: 'not-observed', observedCount: 0 },
    networkAccess,
    sensitiveAccess,
  };
  if (
    !COMMAND_POLICY_STATUSES.has(networkAccess.status) ||
    !COMMAND_POLICY_STATUSES.has(sensitiveAccess.status)
  ) {
    throw new Error('Codex execution command policy could not be derived.');
  }

  return {
    commandPolicy,
    projectedEvents:
      projectedEvents.map((event) => JSON.stringify(event)).join('\n') +
      (projectedEvents.length === 0 ? '' : '\n'),
    usage,
  };
};
