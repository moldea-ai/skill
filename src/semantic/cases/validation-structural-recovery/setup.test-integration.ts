// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';

import {
  createActorRepository,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
} from '../../workspace/index.ts';

import { semanticCase } from './case.ts';

test('structural recovery produces a real missing-path diagnostic before one scoped correction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-structural-fixture-'));
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
    const validate = () =>
      spawnSync(
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
    const invalid = validate();
    expect(invalid.status, invalid.stderr || invalid.stdout).toBe(1);
    expect(JSON.parse(invalid.stdout)).toMatchObject({
      status: 'invalid',
      result: { errorCount: 1 },
    });
    expect(invalid.stdout).toContain('MOLDEA_IMPACT_PATH_MISSING');
    const path = join(repositoryPath, 'moldea/moldea.yaml');
    await writeFile(
      path,
      (await readFile(path, 'utf8')).replace('/src/old-state.js', '/src/project-state.js'),
    );
    const valid = validate();
    expect(valid.status, valid.stderr || valid.stdout).toBe(0);
    expect(JSON.parse(valid.stdout)).toMatchObject({
      status: 'valid',
      result: { errorCount: 0, warningCount: 0, acceptedWarningCount: 0 },
    });
    const changes = diffSemanticWorkspaceSnapshots(
      before,
      await snapshotSemanticWorkspace(repositoryPath),
    );
    expect(changes.created).toStrictEqual([]);
    expect(changes.deleted).toStrictEqual([]);
    expect(changes.modified.map(({ path }) => path)).toStrictEqual(['moldea/moldea.yaml']);
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { force: true, recursive: true });
  }
});
