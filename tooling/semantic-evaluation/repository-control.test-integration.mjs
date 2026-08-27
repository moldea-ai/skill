// @vitest-environment node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  captureReadOnlyMountControlState,
  captureRepositoryControlState,
  createReadOnlyMountControlEvidence,
  createRepositoryControlEvidence,
  hasValidReadOnlyMountControlEvidence,
  hasValidRepositoryControlEvidence,
} from './repository-control.mjs';

test('read-only mount controls prove unchanged trees and detect mutations', async () => {
  const mountPath = mkdtempSync(join(tmpdir(), 'moldea-read-only-mount-control-'));
  writeFileSync(join(mountPath, 'application.ts'), 'export const application = true;\n');

  try {
    const before = await captureReadOnlyMountControlState({
      source: mountPath,
      target: '/related-application',
    });
    const unchanged = createReadOnlyMountControlEvidence(
      before,
      await captureReadOnlyMountControlState({
        source: mountPath,
        target: '/related-application',
      }),
    );
    assert.equal(hasValidReadOnlyMountControlEvidence(unchanged), true);
    assert.deepEqual(unchanged.violations, []);

    writeFileSync(join(mountPath, 'application.ts'), 'export const application = false;\n');
    const changed = createReadOnlyMountControlEvidence(
      before,
      await captureReadOnlyMountControlState({
        source: mountPath,
        target: '/related-application',
      }),
    );
    assert.equal(hasValidReadOnlyMountControlEvidence(changed), true);
    assert.deepEqual(changed.violations, ['tree-changed']);
  } finally {
    rmSync(mountPath, { force: true, recursive: true });
  }
});

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
