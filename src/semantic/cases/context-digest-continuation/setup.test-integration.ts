// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import {
  createActorRepository,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
} from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

const ValidateEnvelope = z.object({
  command: z.literal('validate'),
  status: z.literal('valid'),
  result: z.object({
    valid: z.literal(true),
    diagnosticCount: z.number(),
    errorCount: z.number(),
    warningCount: z.number(),
    acceptedWarningCount: z.number(),
    coverageCounts: z.object({
      bindings: z.number(),
      exportsPassed: z.number(),
      exportsFailed: z.number(),
      exportsNotChecked: z.number(),
    }),
    page: z.object({ cursor: z.string().nullable(), records: z.array(z.unknown()) }),
  }),
});
const ContentEnvelope = z.object({
  command: z.literal('content'),
  status: z.literal('valid'),
  result: z.object({ chunk: z.object({ content: z.string() }) }),
});

test('body-only policy correction changes canonical content while the public validation result stays fixed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-digest-fixture-'));
  try {
    await mkdir(join(root, 'source-home'));
    vi.stubEnv('CODEX_HOME', join(root, 'source-home'));
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const before = await snapshotSemanticWorkspace(repositoryPath);
    const call = (operation: 'validate' | 'content'): unknown => {
      const result = spawnSync(
        process.execPath,
        [
          join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli/moldea.mjs'),
          operation,
          '--repository',
          repositoryPath,
          ...(operation === 'content' ? ['--path', '/moldea/context/returns.md'] : []),
          '--json',
          '--max-output-bytes',
          '65536',
        ],
        { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);
      return JSON.parse(result.stdout) as unknown;
    };
    const initialValidation = ValidateEnvelope.parse(call('validate'));
    const initialContent = ContentEnvelope.parse(call('content')).result.chunk.content;
    expect(initialContent).toContain('30 days');

    const path = join(repositoryPath, 'moldea/context/returns.md');
    await writeFile(path, (await readFile(path, 'utf8')).replace('30 days', '14 days'));

    const finalValidation = ValidateEnvelope.parse(call('validate'));
    const finalContent = ContentEnvelope.parse(call('content')).result.chunk.content;
    expect(finalValidation).toStrictEqual(initialValidation);
    expect(finalContent).toBe(initialContent.replace('30 days', '14 days'));
    expect(finalContent).toContain('14 days');
    expect(await readFile(join(repositoryPath, 'src/project-state.js'), 'utf8')).toBe(
      'export const returnsWindowDays = 30;\n',
    );
    const changes = diffSemanticWorkspaceSnapshots(
      before,
      await snapshotSemanticWorkspace(repositoryPath),
    );
    expect(changes.created).toStrictEqual([]);
    expect(changes.deleted).toStrictEqual([]);
    expect(changes.modified.map(({ path }) => path)).toStrictEqual(['moldea/context/returns.md']);
    expect(semanticCase.input.followUpDeveloperRequests).toHaveLength(2);
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});
