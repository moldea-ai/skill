import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { generatePortableArtifacts } from './generation.ts';

const run = async (): Promise<void> => {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length > 1 || (argumentsList.length === 1 && argumentsList[0] !== '--check')) {
    throw new Error('Usage: generate.ts [--check]');
  }
  const result = await generatePortableArtifacts({ check: argumentsList[0] === '--check' });
  process.stdout.write(`Portable artifacts are ${result.status}.\n`);
};

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(
      `Portable generation failed: ${error instanceof Error ? error.message : 'Unknown failure'}\n`,
    );
    process.exitCode = 1;
  }
}
