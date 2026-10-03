#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';

import { prepareResponseFiles, saveResponsePage } from './response-page/index.ts';
import { resolveRepositoryCli } from './repository-package.ts';
import { normalizeScopePath, readScopePathInput } from './scope-path-input.ts';

const MINIMUM_OUTPUT_BYTES = 4_096;
const MAXIMUM_OUTPUT_BYTES = 1_048_576;
const MAXIMUM_STDERR_BYTES = 32_768;
const MAXIMUM_CURSOR_BYTES = 8_192;
const DEFAULT_COMPOSITION_OUTPUT_BYTES = 65_536;
const PROCESS_TERMINATION_GRACE_PERIOD_MS = 5_000;
const RESPONSE_OPTIONS = ['--save-response', '--cursor-from-response'];
const VALUE_OPTIONS = new Set<string>([
  '--cursor',
  '--max-output-bytes',
  '--path',
  ...RESPONSE_OPTIONS,
]);

const COMMAND_CONTRACTS = Object.freeze({
  composition: {
    allowedFlags: new Set<string>(['--json']),
    allowedValues: new Set<string>(),
    requiresOutputBudget: false,
  },
  content: {
    allowedFlags: new Set<string>(['--json']),
    allowedValues: new Set<string>([
      '--cursor',
      '--max-output-bytes',
      '--path',
      ...RESPONSE_OPTIONS,
    ]),
    requiresOutputBudget: true,
  },
  inspect: {
    allowedFlags: new Set<string>(['--json']),
    allowedValues: new Set<string>(['--cursor', '--max-output-bytes', ...RESPONSE_OPTIONS]),
    requiresOutputBudget: true,
  },
  scope: {
    allowedFlags: new Set<string>(['--json', '--paths-stdin']),
    allowedValues: new Set<string>([
      '--cursor',
      '--max-output-bytes',
      '--path',
      ...RESPONSE_OPTIONS,
    ]),
    requiresOutputBudget: true,
  },
  validate: {
    allowedFlags: new Set<string>(['--json']),
    allowedValues: new Set<string>(['--cursor', '--max-output-bytes', ...RESPONSE_OPTIONS]),
    requiresOutputBudget: true,
  },
});

type ILauncherCommand = keyof typeof COMMAND_CONTRACTS;

interface IParsedArguments {
  command: ILauncherCommand;
  commandArguments: string[];
  outputByteLimit: number;
  repositoryRoot: string;
  cursorResponsePath: string | undefined;
  saveResponsePath: string | undefined;
}

const isLauncherCommand = (command: string | undefined): command is ILauncherCommand =>
  command !== undefined && Object.hasOwn(COMMAND_CONTRACTS, command);

/** Parses and validates the complete launcher command surface. */
const parseArguments = (): IParsedArguments => {
  const arguments_ = process.argv.slice(2);
  const repositoryRoot = arguments_[1];

  if (
    arguments_.length < 5 ||
    arguments_[0] !== '--repository' ||
    repositoryRoot === undefined ||
    !isAbsolute(repositoryRoot) ||
    arguments_[2] !== '--'
  ) {
    throw new Error('Usage: moldea-cli --repository <absolute-path> -- <command> [arguments].');
  }

  const command = arguments_[3];
  if (!isLauncherCommand(command)) {
    throw new Error('The requested moldea command is not supported by this launcher.');
  }
  const contract = COMMAND_CONTRACTS[command];

  const commandArguments = arguments_.slice(4);
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < commandArguments.length; index += 1) {
    const argument = commandArguments[index];

    if (argument !== undefined && VALUE_OPTIONS.has(argument)) {
      if (!contract.allowedValues.has(argument) || values.has(argument)) {
        throw new Error(`Unsupported or duplicate launcher option: ${argument}.`);
      }
      const optionValue = commandArguments[index + 1];
      if (optionValue === undefined || optionValue === '' || optionValue.startsWith('--')) {
        throw new Error(`Launcher option ${argument} requires one value.`);
      }
      const normalizedValue =
        command === 'scope' && argument === '--path'
          ? normalizeScopePath(optionValue)
          : optionValue;
      values.set(argument, normalizedValue);
      commandArguments[index + 1] = normalizedValue;
      index += 1;
      continue;
    }

    if (argument === undefined || !contract.allowedFlags.has(argument) || flags.has(argument)) {
      throw new Error(`Unsupported or duplicate launcher option: ${argument}.`);
    }
    flags.add(argument);
  }

  if (!flags.has('--json')) {
    throw new Error('The launcher requires machine-readable JSON output.');
  }

  const outputBudgetValue = values.get('--max-output-bytes');
  const outputByteLimit = contract.requiresOutputBudget
    ? Number(outputBudgetValue)
    : DEFAULT_COMPOSITION_OUTPUT_BYTES;

  if (
    contract.requiresOutputBudget &&
    (outputBudgetValue === undefined ||
      !/^\d+$/u.test(outputBudgetValue) ||
      !Number.isSafeInteger(outputByteLimit) ||
      outputByteLimit < MINIMUM_OUTPUT_BYTES ||
      outputByteLimit > MAXIMUM_OUTPUT_BYTES)
  ) {
    throw new Error(
      `The launcher output budget must be between ${MINIMUM_OUTPUT_BYTES} and ${MAXIMUM_OUTPUT_BYTES} bytes.`,
    );
  }

  if (values.has('--cursor') && values.has('--cursor-from-response')) {
    throw new Error('Use either --cursor or --cursor-from-response, never both.');
  }
  const cursor = values.get('--cursor');
  if (cursor !== undefined && Buffer.byteLength(cursor, 'utf8') > MAXIMUM_CURSOR_BYTES) {
    throw new Error('The launcher cursor exceeds its byte limit.');
  }

  const logicalPath = values.get('--path');
  if (
    logicalPath !== undefined &&
    (!logicalPath.startsWith('/') || logicalPath.includes('\\') || logicalPath.includes('\0'))
  ) {
    throw new Error('The launcher requires one canonical repository-logical path.');
  }

  if (command === 'content' && logicalPath === undefined) {
    throw new Error('The content command requires --path.');
  }
  if (
    command === 'scope' &&
    Number(flags.has('--paths-stdin')) + Number(logicalPath !== undefined) !== 1
  ) {
    throw new Error('The scope command requires exactly one of --path or --paths-stdin.');
  }

  const forwardedArguments = commandArguments.filter(
    (_argument, index) =>
      !RESPONSE_OPTIONS.includes(commandArguments[index] ?? '') &&
      !RESPONSE_OPTIONS.includes(commandArguments[index - 1] ?? ''),
  );
  return {
    command,
    commandArguments: forwardedArguments,
    outputByteLimit,
    repositoryRoot,
    cursorResponsePath: values.get('--cursor-from-response'),
    saveResponsePath: values.get('--save-response'),
  };
};

/** Runs the validated repository-local CLI while retaining only bounded output. */
const runCli = async (): Promise<void> => {
  const parsed = parseArguments();
  const scopeInput =
    parsed.command === 'scope' && parsed.commandArguments.includes('--paths-stdin')
      ? Buffer.from(`${(await readScopePathInput(process.stdin)).join('\0')}\0`, 'utf8')
      : undefined;
  const resolvedCli = await resolveRepositoryCli(parsed.repositoryRoot);
  const responseFiles =
    parsed.command === 'composition'
      ? {}
      : await prepareResponseFiles(
          resolvedCli.repositoryRoot,
          { command: parsed.command, cliVersion: resolvedCli.cliVersion },
          parsed.cursorResponsePath,
          parsed.saveResponsePath,
        );
  if (responseFiles.cursor !== undefined)
    parsed.commandArguments.push('--cursor', responseFiles.cursor);
  const captureController = new AbortController();
  const cliArguments =
    parsed.command === 'composition'
      ? [parsed.command, ...parsed.commandArguments]
      : [parsed.command, '--repository', resolvedCli.repositoryRoot, ...parsed.commandArguments];
  const spawnArguments = [resolvedCli.cliBinaryPath, ...cliArguments];
  const spawnOptions = {
    cwd: resolvedCli.repositoryRoot,
    env: process.env,
    shell: false,
  };
  const child =
    scopeInput === undefined
      ? spawn(process.execPath, spawnArguments, {
          ...spawnOptions,
          stdio: ['inherit', 'pipe', 'pipe'],
        })
      : spawn(process.execPath, spawnArguments, {
          ...spawnOptions,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let stdoutByteCount = 0;
  let stderrByteCount = 0;
  let outputLimitExceeded = false;
  let inputWriteFailed = false;
  let cancellationSignal: NodeJS.Signals | undefined;
  let hasChildClosed = false;
  let forcedTerminationTimer: NodeJS.Timeout | undefined;

  const requestTermination = (signal: NodeJS.Signals): void => {
    if (hasChildClosed) return;
    child.kill(signal);
    forcedTerminationTimer ??= setTimeout(() => {
      if (!hasChildClosed) child.kill('SIGKILL');
    }, PROCESS_TERMINATION_GRACE_PERIOD_MS);
  };

  const terminateForLimit = (): void => {
    if (!outputLimitExceeded) {
      outputLimitExceeded = true;
      requestTermination('SIGTERM');
    }
  };

  child.stdout.on('data', (chunk: Buffer) => {
    stdoutByteCount += chunk.byteLength;
    if (stdoutByteCount > parsed.outputByteLimit) terminateForLimit();
    else stdoutChunks.push(chunk);
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderrByteCount += chunk.byteLength;
    if (stderrByteCount > MAXIMUM_STDERR_BYTES) terminateForLimit();
    else stderrChunks.push(chunk);
  });

  const cancelInvocation = (signal: NodeJS.Signals): void => {
    cancellationSignal ??= signal;
    captureController.abort();
    requestTermination(signal);
  };
  const relayInterrupt = (): void => cancelInvocation('SIGINT');
  const relayTermination = (): void => cancelInvocation('SIGTERM');
  process.once('SIGINT', relayInterrupt);
  process.once('SIGTERM', relayTermination);

  try {
    const completion = await new Promise<{
      exitCode: number | null;
      signal: NodeJS.Signals | null;
    }>((resolveCompletion, rejectCompletion) => {
      child.once('error', rejectCompletion);
      child.once('close', (exitCode, signal) => {
        hasChildClosed = true;
        resolveCompletion({ exitCode, signal });
      });
      if (scopeInput !== undefined && child.stdin !== null) {
        child.stdin.once('error', () => {
          inputWriteFailed = true;
          requestTermination('SIGTERM');
        });
        child.stdin.end(scopeInput);
      }
    });
    clearTimeout(forcedTerminationTimer);

    if (outputLimitExceeded) {
      process.stderr.write('moldea CLI output exceeded the launcher boundary.\n');
      process.exitCode = 3;
      return;
    }

    if (inputWriteFailed && cancellationSignal === undefined) {
      process.stderr.write('moldea CLI scope input could not be delivered.\n');
      process.exitCode = 3;
      return;
    }

    const terminationSignal = cancellationSignal ?? completion.signal;
    if (terminationSignal !== null) {
      process.stderr.write(Buffer.concat(stderrChunks, stderrByteCount));
      process.stderr.write(`moldea CLI terminated by ${terminationSignal}.\n`);
      process.exitCode = 3;
      return;
    }

    const stdout = Buffer.concat(stdoutChunks, stdoutByteCount);
    if (parsed.command !== 'composition') {
      await saveResponsePage(
        responseFiles,
        resolvedCli.repositoryRoot,
        stdout,
        { command: parsed.command, cliVersion: resolvedCli.cliVersion },
        completion.exitCode,
        captureController.signal,
      );
    }
    if (cancellationSignal !== undefined) {
      process.stderr.write(`moldea CLI terminated by ${cancellationSignal}.\n`);
      process.exitCode = 3;
      return;
    }
    process.stdout.write(stdout);
    process.stderr.write(Buffer.concat(stderrChunks, stderrByteCount));
    process.exitCode = completion.exitCode ?? 3;
  } finally {
    clearTimeout(forcedTerminationTimer);
    process.removeListener('SIGINT', relayInterrupt);
    process.removeListener('SIGTERM', relayTermination);
  }
};

try {
  await runCli();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'moldea CLI launcher failed.'}\n`,
  );
  process.exitCode = 3;
}
