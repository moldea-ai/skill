#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasErrorCode } from 'jg-exception';
import { ERRORS as PROCESS_ERRORS, parseStrictArgs } from 'jg-process';

import { collectInitializationInspection } from './index.ts';
import { INITIALIZATION_INSPECTION_LIMITS } from './constants.ts';

/** Parses the repository root and the known files to read, or throws the usage. */
const parseArguments = (): { path: string[]; repository: string } => {
  try {
    return parseStrictArgs(process.argv.slice(2), {
      path: { type: 'string', multiple: true },
      repository: { type: 'string', required: true },
    });
  } catch (error) {
    if (!hasErrorCode(error, PROCESS_ERRORS.INVALID_ARGUMENTS)) throw error;
    throw new Error(
      'Usage: initialization-inspection --repository <absolute-root> [--path <known-relative-file> ...]',
      { cause: error },
    );
  }
};

try {
  const { path: paths, repository } = parseArguments();
  const result = await collectInitializationInspection({
    repositoryRoot: repository,
    installedSkillRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    paths,
  });
  const output = `${JSON.stringify(result)}\n`;
  if (Buffer.byteLength(output) > INITIALIZATION_INSPECTION_LIMITS.outputBytes)
    throw new Error('Inspection output exceeds its byte limit.');
  process.stdout.write(output);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Initialization inspection failed.'}\n`,
  );
  process.exitCode = 1;
}
