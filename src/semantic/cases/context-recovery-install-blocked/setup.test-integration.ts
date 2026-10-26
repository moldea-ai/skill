// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import { createActorRepository, seedSemanticTooling } from '../../workspace/index.ts';
import { buildSemanticActorPrompt } from '../../judging/index.ts';
import { loadSemanticCases } from '../index.ts';

test.each([
  'context-recovery-install-blocked',
  'context-recovery-install-only',
  'context-recovery-paused',
  'context-recovery-topic-change',
])('%s starts with a real tooling blocker and keeps its future request private', async (id) => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-context-recovery-'));
  try {
    const sourceHome = join(root, 'source-home');
    await mkdir(sourceHome);
    vi.stubEnv('CODEX_HOME', sourceHome);
    const cases = await loadSemanticCases(join(import.meta.dirname, '..'));
    const definition = cases.find((entry) => entry.id === id);
    if (!definition) throw new Error('Missing recovery case');
    const { repositoryPath } = await createActorRepository(
      root,
      definition,
      join(root, 'home'),
      join(root, 'tools'),
    );
    expect(existsSync(join(repositoryPath, 'node_modules'))).toBe(false);
    const policy = await readFile(join(repositoryPath, 'moldea/project.md'), 'utf8');
    expect(policy).toContain('within 30 days');
    expect(policy).not.toContain('14 days');
    expect(await readFile(join(repositoryPath, 'reports/status.txt'), 'utf8')).toBe('pending\n');
    const prompt = buildSemanticActorPrompt(definition);
    expect(prompt).toContain('14 days instead of 30 days');
    expect(prompt).toContain(
      'This context update is blocked because the repository-local moldea CLI is not installed.',
    );
    expect(definition.input.followUpDeveloperRequests).toHaveLength(1);
    expect(prompt).not.toContain(definition.input.followUpDeveloperRequests![0]);
    for (const criterion of [...definition.expected, ...definition.forbidden])
      expect(prompt).not.toContain(criterion.criterion);
    const launcher = join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs');
    const run = (argumentsList: string[], input?: string) =>
      spawnSync(
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
    const unavailable = run(['validate']);
    expect(unavailable.status).not.toBe(0);
    expect(existsSync(join(repositoryPath, 'node_modules'))).toBe(false);
    expect(await readFile(join(repositoryPath, 'moldea/project.md'), 'utf8')).toBe(policy);
    // restoring tooling only in this disposable control proves the blocked fixture's scope contract
    await seedSemanticTooling(repositoryPath, { id });
    const status = run(['scope', '--paths-stdin'], 'reports/status.txt\0');
    expect(status.status, status.stderr || status.stdout).toBe(0);
    expect(
      z
        .object({ result: z.object({ relevant: z.literal(false) }) })
        .parse(JSON.parse(status.stdout)).result.relevant,
    ).toBe(false);
    const owner = run(['scope', '--paths-stdin'], 'src/project-state.js\0');
    expect(owner.status, owner.stderr || owner.stdout).toBe(0);
    expect(
      z.object({ result: z.object({ relevant: z.literal(true) }) }).parse(JSON.parse(owner.stdout))
        .result.relevant,
    ).toBe(true);
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { force: true, recursive: true });
  }
});
