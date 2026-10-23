// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashValue } from 'jg-crypto';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import {
  createActorRepository,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
} from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

const EnvelopeSchema = z.object({
  status: z.literal('valid'),
  result: z.object({ snapshotDigest: z.string() }),
});

test('body-only policy correction changes content and inspect identities while validation identity stays fixed', async () => {
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
    const call = (operation: string) => {
      const result = spawnSync(
        process.execPath,
        [
          join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
          '--repository',
          repositoryPath,
          '--',
          operation,
          ...(operation === 'content' ? ['--path', '/moldea/context/returns.md'] : []),
          '--json',
          '--max-output-bytes',
          '65536',
        ],
        { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);
      return {
        digest: EnvelopeSchema.parse(JSON.parse(result.stdout)).result.snapshotDigest,
        bodyDigest:
          operation === 'content'
            ? hashValue(
                z
                  .object({ result: z.object({ chunk: z.object({ content: z.string() }) }) })
                  .parse(JSON.parse(result.stdout)).result.chunk.content,
              )
            : null,
        output: result.stdout,
      };
    };
    const initial = {
      validation: call('validate'),
      inspection: call('inspect'),
      content: call('content'),
    };
    expect(initial.content.output).toContain('30 days');
    const path = join(repositoryPath, 'moldea/context/returns.md');
    await writeFile(path, (await readFile(path, 'utf8')).replace('30 days', '14 days'));
    const final = {
      validation: call('validate'),
      inspection: call('inspect'),
      content: call('content'),
    };
    expect(final.validation.digest).toBe(initial.validation.digest);
    expect(final.inspection.digest).not.toBe(initial.inspection.digest);
    expect(final.content.digest).toBe(initial.content.digest);
    expect(final.content.bodyDigest).not.toBe(initial.content.bodyDigest);
    expect(final.content.output).toContain('14 days');
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
