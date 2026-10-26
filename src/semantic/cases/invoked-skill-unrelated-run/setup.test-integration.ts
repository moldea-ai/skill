// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import { createActorRepository } from '../../workspace/index.ts';
import { loadSemanticCases } from '../index.ts';

const ScopeSchema = z.object({
  status: z.literal('valid'),
  result: z.object({ relevant: z.boolean() }),
});

test.each([
  ['invoked-skill-unrelated-run', false],
  ['invoked-skill-related-output', true],
] as const)('%s: instruction binding and task relevance -> %s', async (id, hasRelatedOutput) => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-invoked-skill-'));
  try {
    const sourceHome = join(root, 'source-home');
    await mkdir(sourceHome);
    vi.stubEnv('CODEX_HOME', sourceHome);
    const cases = await loadSemanticCases(join(import.meta.dirname, '..'));
    const definition = cases.find((entry) => entry.id === id);
    expect(definition).toBeDefined();
    if (!definition) throw new Error('Missing invoked-skill case');
    const { repositoryPath } = await createActorRepository(
      root,
      definition,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const launcher = join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs');
    const run = (argumentsList: string[], input?: string) => {
      const result = spawnSync(
        process.execPath,
        [
          launcher,
          '--repository',
          repositoryPath,
          '--',
          ...argumentsList,
          '--json',
          '--max-output-bytes',
          '65536',
        ],
        { encoding: 'utf8', input, maxBuffer: 65536, timeout: 10_000 },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);
      return result.stdout;
    };
    for (const [path, expected] of [
      ['.agents/skills/report-note/SKILL.md', true],
      ['docs/release-input.md', false],
      ['reports/release-note.md', hasRelatedOutput],
    ] as const) {
      const gate = spawnSync(
        process.execPath,
        [
          join(repositoryPath, '.agents/skills/moldea/scripts/relevance-gate.mjs'),
          '--repository',
          repositoryPath,
          '--path',
          path,
        ],
        { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
      );
      expect(gate.status, gate.stderr).toBe(0);
      expect(gate.stdout.trim()).toBe(expected ? '1' : '0');
      expect(
        ScopeSchema.parse(JSON.parse(run(['scope', '--paths-stdin'], `${path}\0`))).result.relevant,
      ).toBe(expected);
    }
    const validation = z
      .object({ status: z.literal('valid'), result: z.object({ errorCount: z.literal(0) }) })
      .parse(JSON.parse(run(['validate'])));
    expect(validation.result.errorCount).toBe(0);
    expect(await readFile(join(repositoryPath, 'docs/release-input.md'), 'utf8')).toContain(
      'CSV export: verified.\nSearch: queued.',
    );
    expect(await readFile(join(repositoryPath, 'reports/release-note.md'), 'utf8')).toContain(
      'Draft pending.',
    );
    expect(
      await readFile(join(repositoryPath, '.agents/skills/report-note/SKILL.md'), 'utf8'),
    ).toContain('Do not change release approval or modify this skill.');
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { force: true, recursive: true });
  }
});
