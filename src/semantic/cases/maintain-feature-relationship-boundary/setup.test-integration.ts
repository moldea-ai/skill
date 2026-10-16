// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';

import { createActorRepository } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

test('feature boundary starts valid with one missing policy impact and passing native checks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-feature-boundary-'));
  const sourceHome = join(root, 'source-home');
  const originalCodexHome = process.env['CODEX_HOME'];
  try {
    await mkdir(sourceHome);
    process.env['CODEX_HOME'] = sourceHome;
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'actor-home'),
      join(root, 'actor-tools'),
    );
    const launcher = resolve(import.meta.dirname, '../../../../moldea/scripts/moldea-cli.mjs');
    const validation = spawnSync(
      process.execPath,
      [
        launcher,
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
    const result = z
      .object({ result: z.object({ valid: z.boolean() }) })
      .parse(JSON.parse(validation.stdout));
    expect(result.result.valid).toBe(true);
    expect(await readFile(join(repositoryPath, 'moldea/moldea.yaml'), 'utf8')).toBe(
      'version: 1\ncontext:\n  /moldea/context/refunds.md:\n    affectedBy:\n      - /src/refund-request.js\n',
    );
    const tests = spawnSync(
      process.execPath,
      ['--test', 'src/refund-request.test-unit.js', 'src/refund-view.test-unit.js'],
      { cwd: repositoryPath, encoding: 'utf8' },
    );
    expect(tests.status, tests.stderr).toBe(0);
    expect(tests.stdout).toContain('fail 0');
  } finally {
    if (originalCodexHome === undefined) delete process.env['CODEX_HOME'];
    else process.env['CODEX_HOME'] = originalCodexHome;
    await rm(root, { recursive: true, force: true });
  }
});
