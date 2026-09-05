#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';

import { resolveRepositoryCli } from './repository-package.mjs';

const MINIMUM_OUTPUT_BYTES = 4_096;
const MAXIMUM_OUTPUT_BYTES = 1_048_576;
const MAXIMUM_STDERR_BYTES = 32_768;
const MAXIMUM_CURSOR_BYTES = 8_192;
const DEFAULT_COMPOSITION_OUTPUT_BYTES = 65_536;
const PROCESS_TERMINATION_GRACE_PERIOD_MS = 5_000;
const VALUE_OPTIONS = new Set(['--cursor', '--max-output-bytes', '--path']);

const COMMAND_CONTRACTS = Object.freeze({
  composition: {
    allowedFlags: new Set(['--json']),
    allowedValues: new Set(),
    requiresOutputBudget: false,
  },
  content: {
    allowedFlags: new Set(['--json']),
    allowedValues: new Set(['--cursor', '--max-output-bytes', '--path']),
    requiresOutputBudget: true,
  },
  inspect: {
    allowedFlags: new Set(['--json']),
    allowedValues: new Set(['--cursor', '--max-output-bytes']),
    requiresOutputBudget: true,
  },
  scope: {
    allowedFlags: new Set(['--json', '--paths-stdin']),
    allowedValues: new Set(['--cursor', '--max-output-bytes', '--path']),
    requiresOutputBudget: true,
  },
  validate: {
    allowedFlags: new Set(['--json']),
    allowedValues: new Set(['--cursor', '--max-output-bytes']),
    requiresOutputBudget: true,
  },
});

/** Parses and validates the complete launcher command surface. */
const parseArguments = () => {
  const arguments_ = process.argv.slice(2);

  if (
    arguments_.length < 5 ||
    arguments_[0] !== '--repository' ||
    !isAbsolute(arguments_[1]) ||
    arguments_[2] !== '--'
  ) {
    throw new Error('Usage: moldea-cli --repository <absolute-path> -- <command> [arguments].');
  }

  const repositoryRoot = arguments_[1];
  const command = arguments_[3];
  const contract = COMMAND_CONTRACTS[command];

  if (contract === undefined) {
    throw new Error('The requested moldea command is not supported by this launcher.');
  }

  const commandArguments = arguments_.slice(4);
  const values = new Map();
  const flags = new Set();

  for (let index = 0; index < commandArguments.length; index += 1) {
    const argument = commandArguments[index];

    if (VALUE_OPTIONS.has(argument)) {
      if (!contract.allowedValues.has(argument) || values.has(argument)) {
        throw new Error(`Unsupported or duplicate launcher option: ${argument}.`);
      }
      const optionValue = commandArguments[index + 1];
      if (optionValue === undefined || optionValue === '' || optionValue.startsWith('--')) {
        throw new Error(`Launcher option ${argument} requires one value.`);
      }
      values.set(argument, optionValue);
      index += 1;
      continue;
    }

    if (!contract.allowedFlags.has(argument) || flags.has(argument)) {
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

  return { command, commandArguments, outputByteLimit, repositoryRoot };
};

/** Runs the validated repository-local CLI while retaining only bounded output. */
const runCli = async () => {
  const parsed = parseArguments();
  const resolvedCli = await resolveRepositoryCli(parsed.repositoryRoot);
  const cliArguments =
    parsed.command === 'composition'
      ? [parsed.command, ...parsed.commandArguments]
      : [parsed.command, '--repository', resolvedCli.repositoryRoot, ...parsed.commandArguments];
  const child = spawn(process.execPath, [resolvedCli.cliBinaryPath, ...cliArguments], {
    cwd: resolvedCli.repositoryRoot,
    env: process.env,
    shell: false,
    stdio: ['inherit', 'pipe', 'pipe'],
  });
  const stdoutChunks = [];
  const stderrChunks = [];
  let stdoutByteCount = 0;
  let stderrByteCount = 0;
  let outputLimitExceeded = false;
  let hasChildClosed = false;
  let forcedTerminationTimer;

  const requestTermination = (signal) => {
    if (hasChildClosed) return;
    child.kill(signal);
    forcedTerminationTimer ??= setTimeout(() => {
      if (!hasChildClosed) child.kill('SIGKILL');
    }, PROCESS_TERMINATION_GRACE_PERIOD_MS);
  };

  const terminateForLimit = () => {
    if (!outputLimitExceeded) {
      outputLimitExceeded = true;
      requestTermination('SIGTERM');
    }
  };

  child.stdout.on('data', (chunk) => {
    stdoutByteCount += chunk.byteLength;
    if (stdoutByteCount > parsed.outputByteLimit) terminateForLimit();
    else stdoutChunks.push(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderrByteCount += chunk.byteLength;
    if (stderrByteCount > MAXIMUM_STDERR_BYTES) terminateForLimit();
    else stderrChunks.push(chunk);
  });

  const relayInterrupt = () => requestTermination('SIGINT');
  const relayTermination = () => requestTermination('SIGTERM');
  process.once('SIGINT', relayInterrupt);
  process.once('SIGTERM', relayTermination);

  const completion = await new Promise((resolveCompletion, rejectCompletion) => {
    child.once('error', rejectCompletion);
    child.once('close', (exitCode, signal) => {
      hasChildClosed = true;
      resolveCompletion({ exitCode, signal });
    });
  }).finally(() => {
    clearTimeout(forcedTerminationTimer);
    process.removeListener('SIGINT', relayInterrupt);
    process.removeListener('SIGTERM', relayTermination);
  });

  if (outputLimitExceeded) {
    process.stderr.write('moldea CLI output exceeded the launcher boundary.\n');
    process.exitCode = 3;
    return;
  }

  process.stdout.write(Buffer.concat(stdoutChunks, stdoutByteCount));
  process.stderr.write(Buffer.concat(stderrChunks, stderrByteCount));

  if (completion.signal !== null) {
    process.stderr.write(`moldea CLI terminated by ${completion.signal}.\n`);
    process.exitCode = 3;
    return;
  }

  process.exitCode = completion.exitCode ?? 3;
};

try {
  await runCli();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'moldea CLI launcher failed.'}\n`,
  );
  process.exitCode = 3;
}
