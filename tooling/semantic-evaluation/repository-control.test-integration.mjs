// @vitest-environment node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  captureRepositoryControlState,
  createRepositoryControlEvidence,
  hasValidRepositoryControlEvidence,
} from './repository-control.mjs';

test('repository controls detect installed-skill changes and accept unchanged state', async () => {
  const repositoryPath = mkdtempSync(join(tmpdir(), 'moldea-repository-control-'));
  const installedSkillPath = join(repositoryPath, '.agents', 'skills', 'moldea');
  mkdirSync(installedSkillPath, { recursive: true });
  writeFileSync(join(repositoryPath, 'README.md'), '# Fixture\n');
  writeFileSync(join(installedSkillPath, 'SKILL.md'), '# Fixture skill\n');
  execFileSync('git', ['init', '--quiet'], { cwd: repositoryPath });
  execFileSync('git', ['config', 'user.email', 'evaluation@example.com'], {
    cwd: repositoryPath,
  });
  execFileSync('git', ['config', 'user.name', 'Evaluation Fixture'], {
    cwd: repositoryPath,
  });
  execFileSync('git', ['add', '.'], { cwd: repositoryPath });
  execFileSync('git', ['commit', '--quiet', '-m', 'test: seed fixture'], {
    cwd: repositoryPath,
  });

  try {
    const before = await captureRepositoryControlState(repositoryPath);
    const unchanged = createRepositoryControlEvidence(
      before,
      await captureRepositoryControlState(repositoryPath),
    );
    assert.equal(hasValidRepositoryControlEvidence(unchanged), true);
    assert.deepEqual(unchanged.violations, []);
    const controlEvidenceWithUnexpectedField = structuredClone(unchanged);
    controlEvidenceWithUnexpectedField.before.unexpected = true;
    assert.equal(hasValidRepositoryControlEvidence(controlEvidenceWithUnexpectedField), false);

    writeFileSync(join(installedSkillPath, 'SKILL.md'), '# Changed fixture skill\n');
    const changed = createRepositoryControlEvidence(
      before,
      await captureRepositoryControlState(repositoryPath),
    );
    assert.equal(hasValidRepositoryControlEvidence(changed), true);
    assert.deepEqual(changed.violations, ['installed-skill-changed']);
  } finally {
    rmSync(repositoryPath, { force: true, recursive: true });
  }
});
