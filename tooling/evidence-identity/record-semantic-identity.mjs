#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recoverSemanticIdentity } from './semantic-identity.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

try {
  const result = await recoverSemanticIdentity(repositoryRoot);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[semantic-evaluation-identity] ${message}\n`);
  process.exitCode = 1;
}
