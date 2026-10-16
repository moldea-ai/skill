// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, vi } from 'vitest';

import { createActorRepository } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

test('grounds the no-change owner in its declared helper contract', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-no-change-'));
  vi.stubEnv('CODEX_HOME', join(root, 'empty-codex-home'));
  try {
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const project = await readFile(join(repositoryPath, 'moldea/project.md'), 'utf8');
    const manifest = await readFile(join(repositoryPath, 'moldea/moldea.yaml'), 'utf8');
    expect(project).toContain('/src/internal-helper.js');
    expect(project).toContain('normalizeRefundId');
    expect(project).not.toContain('project-state.js');
    expect(manifest).toContain('/src/internal-helper.js');
    expect(
      execFileSync('git', ['--no-pager', 'show', 'HEAD:moldea/project.md'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      }),
    ).toBe(project);
    expect(
      execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      }),
    ).toBe('');
    await expect(access(join(root, 'home', '.codex', 'auth.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const helper = (await import(
      pathToFileURL(join(repositoryPath, 'src/internal-helper.js')).href
    )) as { normalizeRefundId: (refundId: string) => string };
    expect(helper.normalizeRefundId(' \trefund-42\n')).toBe('refund-42');
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
  await expect(access(root)).rejects.toMatchObject({ code: 'ENOENT' });
});
