import { fileURLToPath } from 'node:url';

import { isMainModule, parseStrictArgs } from 'jg-process';

import { assertReleaseIdentity } from '../release/index.ts';

import { generatePortableArtifacts } from './generation.ts';

const run = async (): Promise<void> => {
  const { check } = parseStrictArgs(process.argv.slice(2), { check: { type: 'boolean' } });
  const result = await generatePortableArtifacts({ check });
  if (check) assertReleaseIdentity(fileURLToPath(new URL('../../', import.meta.url)));
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
