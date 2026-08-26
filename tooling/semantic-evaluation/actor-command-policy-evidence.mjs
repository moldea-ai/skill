import { posix } from 'node:path';

const COMMAND_CLASSIFICATIONS = new Set(['indeterminate', 'not-observed', 'observed']);
const MAX_COMPLETED_COMMANDS = 128;
const MAX_COMMAND_BYTES = 32_768;
const PACKAGE_MANAGER_EXECUTABLES = new Set([
  'corepack',
  'npm',
  'npx',
  'pnpm',
  'pnpx',
  'yarn',
  'yarnpkg',
]);
const SAFE_STATIC_EXECUTABLES = new Set([
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
  'grep',
  'head',
  'jq',
  'ls',
  'moldea',
  'pwd',
  'readlink',
  'realpath',
  'sha256sum',
  'sort',
  'stat',
  'tail',
  'test',
  'tr',
  'true',
  'uniq',
  'wc',
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
const PACKAGE_MANAGER_ENTRYPOINT_PATTERN =
  /^(?:corepack|npm-cli|npx-cli|pnpm|pnpx|yarn|yarnpkg)(?:\.[cm]?js)?$/u;
const ASSIGNMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=.*/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const hasExactKeys = (record, expectedKeys) => {
  const actualKeys = Object.keys(record).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
};

/** Removes only the fixed shell wrapper emitted by the Codex command host. */
const unwrapCodexShellCommand = (command) => {
  for (const executable of ['/bin/bash', 'bash']) {
    for (const quote of ["'", '"']) {
      const prefix = `${executable} -lc ${quote}`;
      if (command.startsWith(prefix) && command.endsWith(quote)) {
        return command.slice(prefix.length, -1);
      }
    }
  }

  return command;
};

/** Tokenizes static shell lists while rejecting syntax that can conceal another execution. */
const tokenizeStaticShellList = (command) => {
  const commands = [[]];
  let currentWord = '';
  let hasCurrentWord = false;
  let hasExecutableExpansion = false;
  let quote = null;

  const pushWord = () => {
    if (!hasCurrentWord) return;
    commands.at(-1).push({ hasExecutableExpansion, text: currentWord });
    currentWord = '';
    hasCurrentWord = false;
    hasExecutableExpansion = false;
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
        continue;
      }
      if (character === '\\' && quote === '"') {
        if (nextCharacter === undefined) return null;
        currentWord += nextCharacter;
        hasCurrentWord = true;
        index += 1;
        continue;
      }
      if (quote !== "'" && (character === '`' || (character === '$' && nextCharacter === '('))) {
        return null;
      }
      if (quote !== "'" && character === '$') hasExecutableExpansion = true;
      currentWord += character;
      hasCurrentWord = true;
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
      character === '`' ||
      (character === '$' && nextCharacter === '(') ||
      ((character === '<' || character === '>') && nextCharacter === '(')
    ) {
      return null;
    }
    if (character === '$') {
      hasExecutableExpansion = true;
      currentWord += character;
      hasCurrentWord = true;
      continue;
    }
    if (character === '#' && !hasCurrentWord) {
      const newlineIndex = command.indexOf('\n', index);
      if (newlineIndex === -1) break;
      if (!pushCommand()) return null;
      index = newlineIndex;
      continue;
    }
    if (/\s/u.test(character)) {
      if (character === '\n' && commands.at(-1).length > 0) {
        if (!pushCommand()) return null;
      } else {
        pushWord();
      }
      continue;
    }
    if (character === '<' || character === '>' || '(){}'.includes(character)) return null;
    if (character === ';' || character === '|' || character === '&') {
      const operatorLength = nextCharacter === character ? 2 : 1;
      if (!pushCommand()) return null;
      index += operatorLength - 1;
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

const getExecutableName = (word) => posix.basename(word.text).toLowerCase();

const hasPathQualifier = (word) => word.text.includes('/');

const isPackageManagerExecutable = (word) => {
  const executableName = getExecutableName(word);
  return (
    PACKAGE_MANAGER_EXECUTABLES.has(executableName) ||
    PACKAGE_MANAGER_ENTRYPOINT_PATTERN.test(executableName)
  );
};

/** Classifies a command after static wrapper and assignment prefixes. */
const classifyStaticCommand = (words) => {
  let index = 0;
  let hasAssignmentPrefix = false;
  while (ASSIGNMENT_PATTERN.test(words[index]?.text ?? '')) {
    hasAssignmentPrefix = true;
    index += 1;
  }
  if (words[index] === undefined) return hasAssignmentPrefix ? 'indeterminate' : 'not-observed';
  if (words[index].text === '!') index += 1;
  const executableWord = words[index];
  if (executableWord === undefined) return 'indeterminate';
  if (executableWord.hasExecutableExpansion) return 'indeterminate';

  const executableName = getExecutableName(executableWord);
  if (isPackageManagerExecutable(executableWord)) return 'observed';

  if (executableName === 'node') {
    const nodeArguments = words.slice(index + 1);
    const separatorIndex = nodeArguments.findIndex(({ text }) => text === '--');
    const entrypoint =
      separatorIndex === -1
        ? nodeArguments.find(({ text }) => !text.startsWith('-'))
        : nodeArguments[separatorIndex + 1];
    return entrypoint !== undefined && isPackageManagerExecutable(entrypoint)
      ? 'observed'
      : 'indeterminate';
  }

  if (hasAssignmentPrefix) return 'indeterminate';
  if (hasPathQualifier(executableWord)) return 'indeterminate';

  if (executableName === 'command') {
    const remainingWords = words.slice(index + 1);
    if (['-V', '-v'].includes(remainingWords[0]?.text)) return 'not-observed';
    while (remainingWords[0]?.text.startsWith('-')) remainingWords.shift();
    return remainingWords.length === 0 ? 'not-observed' : classifyStaticCommand(remainingWords);
  }
  if (executableName === 'env') {
    const remainingWords = words.slice(index + 1);
    if (remainingWords[0]?.text === '--') remainingWords.shift();
    if (remainingWords[0]?.text.startsWith('-')) return 'indeterminate';
    let hasEnvironmentAssignment = false;
    while (ASSIGNMENT_PATTERN.test(remainingWords[0]?.text ?? '')) {
      hasEnvironmentAssignment = true;
      remainingWords.shift();
    }
    if (remainingWords.length === 0) return 'not-observed';
    const nestedClassification = classifyStaticCommand(remainingWords);
    return nestedClassification === 'observed' || !hasEnvironmentAssignment
      ? nestedClassification
      : 'indeterminate';
  }
  if (executableName === 'exec') {
    const remainingWords = words.slice(index + 1);
    if (remainingWords[0]?.text === '--') remainingWords.shift();
    else if (remainingWords[0]?.text.startsWith('-')) return 'indeterminate';
    return remainingWords.length === 0 ? 'indeterminate' : classifyStaticCommand(remainingWords);
  }
  if (executableName === 'nohup') {
    const remainingWords = words.slice(index + 1);
    if (remainingWords[0]?.text === '--') remainingWords.shift();
    else if (remainingWords[0]?.text.startsWith('-')) return 'indeterminate';
    return remainingWords.length === 0 ? 'indeterminate' : classifyStaticCommand(remainingWords);
  }
  if (executableName === 'find') {
    return words.slice(index + 1).some(({ text }) => /^-(?:exec|execdir|ok|okdir)$/u.test(text))
      ? 'indeterminate'
      : 'not-observed';
  }
  if (executableName === 'git') {
    return 'indeterminate';
  }
  if (executableName === 'rg') {
    return words.slice(index + 1).some(({ text }) => text === '--pre' || text.startsWith('--pre='))
      ? 'indeterminate'
      : 'not-observed';
  }
  if (executableName === 'sed') {
    const argumentsAfterExecutable = words.slice(index + 1).map(({ text }) => text);
    const hasSafePrintProgram = /^\d+(?:,\d+)?p$/u.test(argumentsAfterExecutable[1] ?? '');
    const hasOnlyFileOperands = argumentsAfterExecutable
      .slice(2)
      .every((argument) => argument === '-' || !argument.startsWith('-'));
    return argumentsAfterExecutable[0] === '-n' && hasSafePrintProgram && hasOnlyFileOperands
      ? 'not-observed'
      : 'indeterminate';
  }
  if (executableName === 'sort') {
    // GNU sort accepts unambiguous --compress-program abbreviations as short as --co.
    return words.slice(index + 1).some(({ text }) => text.startsWith('--co'))
      ? 'indeterminate'
      : 'not-observed';
  }
  if (OPAQUE_EXECUTABLES.has(executableName)) {
    return 'indeterminate';
  }
  return SAFE_STATIC_EXECUTABLES.has(executableName) ? 'not-observed' : 'indeterminate';
};

/** Classifies one complete shell command without retaining its content. */
const classifyCompletedCommand = (command) => {
  if (Buffer.byteLength(command, 'utf8') > MAX_COMMAND_BYTES) return 'indeterminate';
  const directCommand = unwrapCodexShellCommand(command);
  const commands = tokenizeStaticShellList(directCommand);
  if (commands === null) return 'indeterminate';

  const classifications = commands.map(classifyStaticCommand);
  if (classifications.includes('observed')) return 'observed';
  return classifications.includes('indeterminate') ? 'indeterminate' : 'not-observed';
};

/** Selects one command-policy classification from a completed Codex JSONL event. */
export const classifyActorCommandPolicyEvent = (event) => {
  if (
    !isPlainRecord(event) ||
    event.type !== 'item.completed' ||
    !isPlainRecord(event.item) ||
    event.item.type !== 'command_execution'
  ) {
    return null;
  }
  if (typeof event.item.command !== 'string' || event.item.command.trim() === '') {
    throw new Error('A completed Codex command event did not include its command policy input.');
  }

  return classifyCompletedCommand(event.item.command);
};

/** Creates the bounded aggregate persisted after raw command text is discarded. */
export const createActorCommandPolicyEvidence = (classifications) => {
  if (
    !Array.isArray(classifications) ||
    classifications.length > MAX_COMPLETED_COMMANDS ||
    classifications.some((classification) => !COMMAND_CLASSIFICATIONS.has(classification))
  ) {
    throw new Error('Actor command-policy observations have an unsupported shape.');
  }
  const packageManagerInvocationCount = classifications.filter(
    (classification) => classification === 'observed',
  ).length;
  const indeterminateCommandCount = classifications.filter(
    (classification) => classification === 'indeterminate',
  ).length;
  const packageManagerExecution =
    packageManagerInvocationCount > 0
      ? 'observed'
      : indeterminateCommandCount > 0
        ? 'indeterminate'
        : 'not-observed';

  return {
    completedCommandCount: classifications.length,
    indeterminateCommandCount,
    packageManagerExecution,
    packageManagerInvocationCount,
  };
};

/** Checks the strict aggregate shape and its derived package-manager status. */
export const hasValidActorCommandPolicyEvidence = (evidence) => {
  if (
    !isPlainRecord(evidence) ||
    !hasExactKeys(evidence, [
      'completedCommandCount',
      'indeterminateCommandCount',
      'packageManagerExecution',
      'packageManagerInvocationCount',
    ]) ||
    !Number.isSafeInteger(evidence.completedCommandCount) ||
    evidence.completedCommandCount < 0 ||
    evidence.completedCommandCount > MAX_COMPLETED_COMMANDS ||
    !Number.isSafeInteger(evidence.indeterminateCommandCount) ||
    evidence.indeterminateCommandCount < 0 ||
    !Number.isSafeInteger(evidence.packageManagerInvocationCount) ||
    evidence.packageManagerInvocationCount < 0 ||
    evidence.indeterminateCommandCount + evidence.packageManagerInvocationCount >
      evidence.completedCommandCount
  ) {
    return false;
  }
  const expectedStatus =
    evidence.packageManagerInvocationCount > 0
      ? 'observed'
      : evidence.indeterminateCommandCount > 0
        ? 'indeterminate'
        : 'not-observed';
  return evidence.packageManagerExecution === expectedStatus;
};
