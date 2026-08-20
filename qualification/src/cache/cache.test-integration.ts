// @vitest-environment node
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { ensureDirectory } from '../filesystem/index.ts';
import {
  calculateModelCacheKey,
  readActorCache,
  readJudgeCache,
  writeActorCache,
  writeJudgeCache,
} from './cache.ts';

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

describe('qualification model cache', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('restores exact actor state and preserves immutable source provenance', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-cache-'));
    const cacheRoot = path.join(temporaryRoot, 'cache');
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    await ensureDirectory(path.join(workspaceDirectory, '.git'));
    await ensureDirectory(path.join(workspaceDirectory, '.agents', 'skills', 'moldea'));
    await ensureDirectory(path.join(workspaceDirectory, 'node_modules', 'candidate'));
    await writeFile(path.join(workspaceDirectory, '.git', 'sentinel'), 'git-state\n', 'utf8');
    await writeFile(
      path.join(workspaceDirectory, '.agents', 'project-policy.md'),
      'cached policy\n',
      'utf8',
    );
    await writeFile(
      path.join(workspaceDirectory, '.agents', 'skills', 'moldea', 'SKILL.md'),
      'mounted skill\n',
      'utf8',
    );
    await writeFile(
      path.join(workspaceDirectory, 'node_modules', 'candidate', 'index.js'),
      'candidate runtime\n',
      'utf8',
    );
    await writeFile(path.join(workspaceDirectory, 'project.txt'), 'cached project\n', 'utf8');
    const cacheKey = calculateModelCacheKey({ role: 'actor', input: 'stable' });

    await writeActorCache({
      cacheKey,
      sourceAttemptId: 'source-attempt',
      output: {
        outcome: 'completed',
        summary: 'Completed the cached task.',
        commands: ['moldea validate'],
        changedFiles: ['project.txt'],
        observations: ['The project is valid.'],
        unresolved: [],
      },
      durationMs: 4,
      events: '{"type":"completed"}\n',
      usage: { inputTokens: 8, cachedInputTokens: 2, outputTokens: 4 },
      workspaceDirectory,
      cacheRoot,
    });
    await writeFile(path.join(workspaceDirectory, 'project.txt'), 'mutated\n', 'utf8');
    await writeFile(
      path.join(workspaceDirectory, '.agents', 'project-policy.md'),
      'mutated policy\n',
      'utf8',
    );
    await writeFile(
      path.join(workspaceDirectory, '.agents', 'skills', 'moldea', 'SKILL.md'),
      'current mounted skill\n',
      'utf8',
    );
    await writeFile(
      path.join(workspaceDirectory, 'node_modules', 'candidate', 'index.js'),
      'current candidate runtime\n',
      'utf8',
    );
    await writeFile(path.join(workspaceDirectory, 'unexpected.txt'), 'remove me\n', 'utf8');
    const hit = await readActorCache(cacheKey, workspaceDirectory, cacheRoot);

    expect(hit).toMatchObject({
      metadata: {
        cacheKey,
        role: 'actor',
        sourceAttemptId: 'source-attempt',
      },
      output: { outcome: 'completed', changedFiles: ['project.txt'] },
      events: '{"type":"completed"}\n',
    });
    expect(await readFile(path.join(workspaceDirectory, 'project.txt'), 'utf8')).toBe(
      'cached project\n',
    );
    expect(await pathExists(path.join(workspaceDirectory, 'unexpected.txt'))).toBe(false);
    expect(await readFile(path.join(workspaceDirectory, '.git', 'sentinel'), 'utf8')).toBe(
      'git-state\n',
    );
    expect(
      await readFile(path.join(workspaceDirectory, '.agents', 'project-policy.md'), 'utf8'),
    ).toBe('cached policy\n');
    expect(
      await readFile(
        path.join(workspaceDirectory, '.agents', 'skills', 'moldea', 'SKILL.md'),
        'utf8',
      ),
    ).toBe('current mounted skill\n');
    expect(
      await readFile(
        path.join(workspaceDirectory, 'node_modules', 'candidate', 'index.js'),
        'utf8',
      ),
    ).toBe('current candidate runtime\n');
  });

  test('round-trips a judge decision and rejects corrupted structured output', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-cache-'));
    const cacheRoot = path.join(temporaryRoot, 'cache');
    const cacheKey = calculateModelCacheKey({ role: 'judge', input: 'stable' });

    await writeJudgeCache({
      cacheKey,
      sourceAttemptId: 'judge-source',
      output: {
        verdict: 'pass',
        summary: 'Every declared requirement passed.',
        requirements: [],
        failures: [],
      },
      durationMs: 2,
      events: '',
      usage: null,
      cacheRoot,
    });

    expect(await readJudgeCache(cacheKey, cacheRoot)).toMatchObject({
      metadata: { sourceAttemptId: 'judge-source', role: 'judge' },
      output: { verdict: 'pass' },
    });

    await writeFile(path.join(cacheRoot, cacheKey, 'output.json'), '{}\n', 'utf8');
    expect(await readJudgeCache(cacheKey, cacheRoot)).toBeNull();
  });
});
