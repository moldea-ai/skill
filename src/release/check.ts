import path from 'node:path';

import { verifyPreparedReleaseEvidence } from '../evidence/index.ts';
import { assertReleaseIdentity } from './identity.ts';

const repositoryRoot = path.resolve(import.meta.dirname, '../..');
const allowedArguments = new Set(['--identity-only']);
const unsupportedArgument = process.argv
  .slice(2)
  .find((argument) => !allowedArguments.has(argument));

if (unsupportedArgument !== undefined) {
  process.stderr.write(`Unsupported release-check argument: ${unsupportedArgument}\n`);
  process.exitCode = 1;
} else {
  try {
    const identity = assertReleaseIdentity(repositoryRoot);
    if (!process.argv.includes('--identity-only')) {
      await verifyPreparedReleaseEvidence({
        preparedDirectory: path.join(repositoryRoot, '.evidence', 'prepared'),
        selectionPath: path.join(repositoryRoot, 'evidence', 'selection.json'),
      });
    }
    process.stdout.write(
      `Release identity is synchronized for skill ${identity.releaseVersion} and ${identity.cliVersion}.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
