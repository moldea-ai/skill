// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'vitest';

import { prepareSkillCandidate } from './skill-candidate.ts';

test('rejects source output through direct paths and directory aliases before writing', async () => {
  const repositoryRoot = resolve(import.meta.dirname, '../..');
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-candidate-path-'));
  const alias = join(temporaryRoot, 'source-alias');
  try {
    symlinkSync(repositoryRoot, alias, 'junction');
    for (const outputDirectory of [repositoryRoot, alias, join(alias, 'candidate-output')]) {
      await assert.rejects(
        prepareSkillCandidate({
          artifactDirectory: join(temporaryRoot, 'missing-artifacts'),
          outputDirectory,
          repositoryRoot,
        }),
        /Skill candidate output must be outside the source repository/u,
      );
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
