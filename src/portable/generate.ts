import { isMainModule, parseStrictArgs } from 'jg-process';

import { generatePortableArtifacts } from './generation.ts';

const run = async (): Promise<void> => {
  const { check } = parseStrictArgs(process.argv.slice(2), { check: { type: 'boolean' } });
  const result = await generatePortableArtifacts({ check });
  process.stdout.write(`Portable artifacts are ${result.status}.\n`);
};

if (isMainModule(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(
      `Portable generation failed: ${error instanceof Error ? error.message : 'Unknown failure'}\n`,
    );
    process.exitCode = 1;
  }
}
