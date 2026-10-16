#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectInitializationInspection } from './index.ts';
import { INITIALIZATION_INSPECTION_LIMITS } from './constants.ts';

const [flag, repositoryRoot, ...remaining] = process.argv.slice(2);
try {
  if (
    flag !== '--repository' ||
    !repositoryRoot ||
    remaining.length % 2 !== 0 ||
    remaining.some((part, index) => index % 2 === 0 && part !== '--path')
  ) {
    throw new Error(
      'Usage: initialization-inspection --repository <absolute-root> [--path <known-relative-file> ...]',
    );
  }
  const result = await collectInitializationInspection({
    repositoryRoot,
    installedSkillRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    paths: remaining.filter((_, index) => index % 2 === 1),
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
