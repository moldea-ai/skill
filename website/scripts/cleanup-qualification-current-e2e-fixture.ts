import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '.qualification-current-dist',
);

/** Removes the ignored current-qualification browser fixture build. */
const cleanupQualificationCurrentE2eFixture = async (): Promise<void> => {
  await rm(outputDirectory, { force: true, recursive: true });
};

export default cleanupQualificationCurrentE2eFixture;
