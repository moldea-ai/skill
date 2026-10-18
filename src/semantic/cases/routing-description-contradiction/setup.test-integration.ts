// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';

import { createActorRepository, snapshotSemanticWorkspace } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

test('correct description wiring remains structurally valid while its authority contradicts the instruction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-routing-'));
  const originalHome = process.env['CODEX_HOME'];
  try {
    const sourceHome = join(root, 'source-home');
    await mkdir(sourceHome);
    process.env['CODEX_HOME'] = sourceHome;
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const description = await readFile(
      join(repositoryPath, 'moldea/agents/triage-agent/description.md'),
      'utf8',
    );
    expect(description).toContain('independently authorizes customer refunds');
    expect(
      await readFile(join(repositoryPath, 'moldea/agents/triage-agent/instruction.md'), 'utf8'),
    ).toContain('without making authorization decisions');
    const before = await snapshotSemanticWorkspace(repositoryPath);
    const native = spawnSync(
      process.execPath,
      ['--test', 'src/triage-agent.test-integration.mjs'],
      { cwd: repositoryPath, encoding: 'utf8' },
    );
    expect(native.status, native.stderr).toBe(0);
    const validation = spawnSync(
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
      { encoding: 'utf8' },
    );
    expect(validation.status, validation.stderr).toBe(0);
    expect(
      z
        .object({ result: z.object({ valid: z.literal(true) }) })
        .parse(JSON.parse(validation.stdout)).result.valid,
    ).toBe(true);
    expect(await snapshotSemanticWorkspace(repositoryPath)).toStrictEqual(before);
    expect(semanticCase.forbidden.find(({ label }) => label === 'repository-write')).toBeDefined();
  } finally {
    if (originalHome === undefined) delete process.env['CODEX_HOME'];
    else process.env['CODEX_HOME'] = originalHome;
    await rm(root, { recursive: true, force: true });
  }
});
