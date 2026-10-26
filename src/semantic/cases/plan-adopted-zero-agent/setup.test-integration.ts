// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import { createActorRepository } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

test('adopted zero-agent planning has healthy tooling and exact deterministic rules', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-zero-agent-'));
  try {
    const sourceHome = join(root, 'source-home');
    await mkdir(sourceHome);
    vi.stubEnv('CODEX_HOME', sourceHome);
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const launcher = join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs');
    const result = spawnSync(
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
      { encoding: 'utf8', maxBuffer: 65536, timeout: 10_000 },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(
      z
        .object({ status: z.literal('valid'), result: z.object({ errorCount: z.literal(0) }) })
        .parse(JSON.parse(result.stdout)).result.errorCount,
    ).toBe(0);
    expect(existsSync(join(repositoryPath, 'moldea/agents'))).toBe(false);
    expect(await readFile(join(repositoryPath, 'docs/tax-policy.md'), 'utf8')).toContain(
      'rounded down to a whole minor unit',
    );
    const calculation = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        'import assert from "node:assert/strict"; import { calculateTaxMinorUnits } from "./src/tax-calculation.js"; assert.equal(calculateTaxMinorUnits(129n), 12n); assert.equal(calculateTaxMinorUnits(0n), 0n);',
      ],
      { cwd: repositoryPath, encoding: 'utf8', timeout: 2_000 },
    );
    expect(calculation.status, calculation.stderr).toBe(0);
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { force: true, recursive: true });
  }
});
