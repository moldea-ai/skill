// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readIndexEntries } from 'jg-git-commands';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import {
  buildCodexEvaluationHostCommand,
  CliInvocationEventSchema,
  GitInvocationEventSchema,
  runCodexEvaluationHost,
} from '../../../execution/host/index.ts';
import { createActorRepository } from '../../workspace/index.ts';
import { loadSemanticCases } from '../index.ts';

test.each([
  ['repair-contained-directory-links', false],
  ['repair-unsafe-directory-link', true],
] as const)(
  '%s exercises the real helper behind the production tools overlay',
  async (id, isUnsafe) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-link-fixture-'));
    try {
      const sourceHome = join(root, 'source-home');
      const bin = join(root, 'bin');
      await mkdir(sourceHome);
      await mkdir(bin);
      vi.stubEnv('CODEX_HOME', sourceHome);
      vi.stubEnv('PATH', `${bin}:${process.env['PATH'] ?? ''}`);
      const definition = (await loadSemanticCases(join(import.meta.dirname, '..'))).find(
        (entry) => entry.id === id,
      );
      if (!definition) throw new Error('Missing directory-link case');
      const sandboxHome = join(root, 'home');
      const { repositoryPath, readOnlyMounts } = await createActorRepository(
        root,
        definition,
        sandboxHome,
        join(root, 'tools'),
      );
      const names = Array.from(
        { length: isUnsafe ? 1 : 32 },
        (_, index) => `fixture-${String(index + 1).padStart(2, '0')}`,
      );
      const paths = names.map((name) => `.agents/skills/${name}/SKILL.md`);
      const indexBefore = await readIndexEntries(repositoryPath, { paths });
      expect(indexBefore.map(({ path, mode, stage }) => ({ path, mode, stage }))).toStrictEqual(
        paths.map((path) => ({ path, mode: '100644', stage: 0 })),
      );
      const ignoreBefore = await readFile(join(repositoryPath, '.gitignore'));
      const contextBefore = await readFile(join(repositoryPath, 'moldea/project.md'), 'utf8');
      const codex = join(bin, 'codex');
      const companion = join(bin, 'codex-code-mode-host');
      await writeFile(companion, '#!/bin/sh\nexit 0\n');
      await chmod(companion, 0o755);
      await writeFile(
        codex,
        '#!/bin/sh\nset -eu\nexport MOLDEA_EVAL_MODEL_COMMAND=1\nnode /mnt/.agents/skills/moldea/scripts/repair-git.mjs --repository /mnt -- checkpoint || test "$?" -eq 1\n',
      );
      await chmod(codex, 0o755);
      const output = await runCodexEvaluationHost({
        command: buildCodexEvaluationHostCommand(
          [
            'codex',
            'exec',
            '--ignore-user-config',
            '--ignore-rules',
            '--ephemeral',
            '--skip-git-repo-check',
            '--dangerously-bypass-approvals-and-sandbox',
            '-c',
            'shell_environment_policy.inherit=none',
            '-',
          ],
          'actor',
        ),
        cwd: repositoryPath,
        includeWorkspaceBinaryDirectory: true,
        prompt: 'deterministic directory-link helper check',
        readOnlyMounts,
        readOnlyWorkspacePaths: ['.agents', '.git'],
        role: 'actor',
        sandboxHome,
      });
      const lines = output.split('\n');
      CliInvocationEventSchema.parse(JSON.parse(lines.pop() ?? ''));
      const { evidence } = GitInvocationEventSchema.parse(JSON.parse(lines.pop() ?? ''));
      const helper = z
        .object({ status: z.string(), reasonCode: z.string().optional() })
        .parse(JSON.parse(lines.join('\n')));
      expect(helper.status).toBe(isUnsafe ? 'unavailable' : 'available');
      if (isUnsafe) expect(helper.reasonCode).toBe('attribute-safety');
      else expect(evidence.repair.compliantCount).toBeGreaterThan(0);
      expect(evidence.repair.noncompliantCount).toBe(0);
      expect(await readFile(join(repositoryPath, 'moldea/project.md'), 'utf8')).toBe(contextBefore);
      if (!isUnsafe) {
        await writeFile(
          join(repositoryPath, 'moldea/project.md'),
          contextBefore.replace('30 days', '14 days'),
        );
        const result = spawnSync(
          process.execPath,
          [
            join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
            '--repository',
            repositoryPath,
            '--',
            'validate',
            '--json',
            '--max-output-bytes',
            '65536',
          ],
          { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
        );
        expect(result.status, result.stderr || result.stdout).toBe(0);
        expect(JSON.parse(result.stdout)).toMatchObject({
          status: 'valid',
          result: { errorCount: 0, warningCount: 0, acceptedWarningCount: 0 },
        });
      }
      for (const name of names) {
        const link = join(repositoryPath, '.agents/skills', name);
        expect((await lstat(link)).isSymbolicLink()).toBe(true);
        expect(await readlink(link)).toBe(
          isUnsafe ? '../../../outside-skill' : `../link-sources/${name}`,
        );
        expect(
          await readFile(join(repositoryPath, '.agents/link-sources', name, 'SKILL.md'), 'utf8'),
        ).toBe(`# ${name}\n\nPreserve this installed skill.\n`);
      }
      expect(await readFile(join(repositoryPath, '.gitignore'))).toStrictEqual(ignoreBefore);
      expect(await readIndexEntries(repositoryPath, { paths })).toStrictEqual(indexBefore);
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  },
);
