import { isMainModule } from 'jg-process';

import { generateRuntimeArtifacts } from './runtime-generation.ts';

const run = async (): Promise<void> => {
  if (process.argv.length !== 2) {
    throw new Error('Usage: runtime-build.ts');
  }

  const result = await generateRuntimeArtifacts();
  process.stdout.write(`Generated ${result.artifacts.length} runtime helpers.\n`);
};

if (isMainModule(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(
      `Runtime generation failed: ${error instanceof Error ? error.message : 'Unknown failure'}\n`,
    );
    process.exitCode = 1;
  }
}
