#!/usr/bin/env node
import { parseArgs } from 'node:util';

import { createResponseDirectory } from './index.ts';

try {
  const { values } = parseArgs({ options: { repository: { type: 'string' } } });
  if (values.repository === undefined) throw new Error('--repository is required.');
  process.stdout.write(`${await createResponseDirectory(values.repository)}\n`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Response directory unavailable.'}\n`,
  );
  process.exitCode = 1;
}
