// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readFile, readlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashValue } from 'jg-crypto';
import { readIndexEntries } from 'jg-git-commands';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import { createActorRepository } from '../../workspace/index.ts';
import { loadSemanticCases } from '../index.ts';

const ValidationSchema = z.object({
  status: z.literal('valid'),
  result: z.object({
    errorCount: z.literal(0),
    warningCount: z.number(),
    acceptedWarningCount: z.number(),
    page: z.object({
      records: z.array(
        z.object({ kind: z.string(), code: z.string().optional(), subject: z.string().optional() }),
      ),
    }),
  }),
});

test.each([
  ['repair-stale-integration', false],
  ['repair-stale-integration-protected', true],
] as const)(
  '%s preserves a real stale linked bridge until the permitted refresh',
  async (id, isProtected) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-stale-bridge-'));
    try {
      const sourceHome = join(root, 'source-home');
      await mkdir(sourceHome);
      vi.stubEnv('CODEX_HOME', sourceHome);
      const definition = (await loadSemanticCases(join(import.meta.dirname, '..'))).find(
        (entry) => entry.id === id,
      );
      if (!definition) throw new Error('Missing stale integration case');
      const frozen = await readFile(join(import.meta.dirname, 'bridge-10.0.1.md'));
      expect(hashValue(frozen)).toBe(
        '6803b18c8155d9929d74801ef4857a1515a94812d5c3f4aa0f35266a6c5517b1',
      );
      const { repositoryPath } = await createActorRepository(
        root,
        definition,
        join(root, 'home'),
        join(root, 'tools'),
      );
      const target = join(repositoryPath, 'config/agent-notes.md');
      const before = await readFile(target);
      const ignoreBefore = await readFile(join(repositoryPath, '.gitignore'));
      expect((await lstat(join(repositoryPath, 'AGENTS.md'))).isSymbolicLink()).toBe(true);
      expect(await readlink(join(repositoryPath, 'AGENTS.md'))).toBe('config/agent-notes.md');
      expect(await readIndexEntries(repositoryPath, { paths: ['AGENTS.md'] })).toMatchObject([
        { mode: '120000', stage: 0, path: 'AGENTS.md' },
      ]);
      const scripts = join(repositoryPath, '.agents/skills/moldea/scripts');
      const run = (filename: string, args: string[]) => {
        const result = spawnSync(
          process.execPath,
          [join(scripts, filename), '--repository', repositoryPath, ...args],
          { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
        );
        expect(result.status, result.stderr || result.stdout).toBe(0);
        return result.stdout;
      };
      const validate = () =>
        ValidationSchema.parse(
          JSON.parse(
            run('moldea-cli.mjs', ['--', 'validate', '--json', '--max-output-bytes', '65536']),
          ),
        );
      const stale = validate();
      expect(stale.result.warningCount).toBe(1);
      expect(stale.result.acceptedWarningCount).toBe(0);
      expect(stale.result.page.records).toContainEqual(
        expect.objectContaining({ code: 'MOLDEA_INTEGRATION_BLOCK_STALE', subject: '/AGENTS.md' }),
      );
      const printed = run('managed-agents.mjs', ['--print']);
      const template = (
        await readFile(
          join(repositoryPath, '.agents/skills/moldea/assets/managed-agents-block.md'),
          'utf8',
        )
      ).replaceAll('{{skill-path}}', '.agents/skills/moldea');
      expect(printed).toBe(template);
      expect(await readFile(target)).toStrictEqual(before);
      expect(printed).not.toBe(
        frozen.toString('utf8').replaceAll('{{skill-path}}', '.agents/skills/moldea'),
      );
      if (!isProtected) {
        expect(run('managed-agents.mjs', [])).toBe('updated\n');
        const expected =
          '\uFEFF# Host rules\r\n\r\nKeep changes scoped and verified.\r\n\r\n' +
          printed.replaceAll('\n', '\r\n') +
          '\r\nKeep these owner rules.\r\n';
        expect((await readFile(target)).toString('utf8')).toBe(expected);
        expect(validate().result.warningCount).toBe(0);
        expect(run('managed-agents.mjs', [])).toBe('unchanged\n');
        expect((await readFile(target)).toString('utf8')).toBe(expected);
      } else {
        expect(before.toString('utf8')).toContain(
          'AGENTS.md and config/agent-notes.md are protected.',
        );
        expect(validate().result.warningCount).toBe(1);
        expect(await readFile(target)).toStrictEqual(before);
      }
      expect(await readlink(join(repositoryPath, 'AGENTS.md'))).toBe('config/agent-notes.md');
      expect(await readFile(join(repositoryPath, '.gitignore'))).toStrictEqual(ignoreBefore);
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { force: true, recursive: true });
    }
  },
);
