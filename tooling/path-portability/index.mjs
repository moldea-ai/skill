import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkRepositoryPathPortability } from './path-portability.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const result = checkRepositoryPathPortability(repositoryRoot);

process.stdout.write(
  `Path portability passed for ${result.pathCount} candidate files; longest audited path is ${result.maximumPathBytes} UTF-8 bytes.\n`,
);
