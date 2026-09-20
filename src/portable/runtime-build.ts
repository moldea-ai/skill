import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { generateRuntimeArtifacts } from './runtime-generation.ts';

const run = async (): Promise<void> => {
  if (process.argv.length !== 2) {
    throw new Error('Usage: runtime-build.ts');
  }

  const result = await generateRuntimeArtifacts();
  process.stdout.write(`Generated ${result.artifacts.length} runtime helpers.\n`);
};

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(
      `Runtime generation failed: ${error instanceof Error ? error.message : 'Unknown failure'}\n`,
    );
    process.exitCode = 1;
  }
}
