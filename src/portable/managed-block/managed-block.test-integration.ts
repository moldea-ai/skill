// @vitest-environment node
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import type * as FileSystem from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';

import { updateManagedFile } from './index.ts';

const injection = vi.hoisted(() => ({
  beforeReplace: undefined as (() => Promise<void>) | undefined,
}));
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof FileSystem>();
  return {
    ...original,
    writeFile: async (...arguments_: Parameters<typeof original.writeFile>) => {
      await original.writeFile(...arguments_);
      if (typeof arguments_[0] === 'string' && arguments_[0].endsWith('.tmp'))
        await injection.beforeReplace?.();
    },
  };
});
const BLOCK = '<!-- moldea:start -->\nInstructions\n<!-- moldea:end -->\n';

test.each(['existing', 'new'])(
  'detects a changed %s target and removes temporary files',
  async (condition) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-block-'));
    const target = join(root, 'AGENTS.md');
    try {
      if (condition === 'existing') await writeFile(target, '# Original\n');
      injection.beforeReplace = () => writeFile(target, '# Concurrent edit\n');
      await expect(updateManagedFile(root, BLOCK, 'AGENTS.md')).rejects.toThrow(
        /changed before replacement/u,
      );
      expect(await readFile(target, 'utf8')).toBe('# Concurrent edit\n');
      expect(await readdir(root)).toStrictEqual(['AGENTS.md']);
    } finally {
      injection.beforeReplace = undefined;
      await rm(root, { recursive: true, force: true });
    }
  },
);
