import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';

import { createActorRepository } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

test('grounds the healthy negative README wiring smoke result', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-readme-smoke-'));
  vi.stubEnv('CODEX_HOME', join(root, 'empty-codex-home'));
  try {
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const manifest = await readFile(join(repositoryPath, 'moldea/moldea.yaml'), 'utf8');
    expect(manifest).not.toContain('README.md');
    const result = spawnSync(
      process.execPath,
      [
        '.agents/skills/moldea/scripts/relevance-gate.mjs',
        '--repository',
        repositoryPath,
        '--diagnose',
        '--path',
        'README.md',
      ],
      { cwd: repositoryPath, encoding: 'utf8', timeout: 10000, maxBuffer: 65536 },
    );
    if (result.error) throw result.error;
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('0\n');
    expect(result.stderr).toBe('');
    const grounding = semanticCase.input.repositoryEvidence.find(({ claim }) =>
      claim.includes('healthy wiring'),
    );
    assert.ok(grounding, 'The judge needs the expected negative smoke-test fixture fact.');
    expect(grounding.source).toStrictEqual({
      kind: 'workspace-path',
      path: 'moldea/moldea.yaml',
      expectedType: 'file',
    });
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});
