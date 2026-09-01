// @vitest-environment node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateSemanticCaseDefinition } from './evidence.mjs';
import { collectScenarioEvidence, hasValidScenarioEvidence } from './scenario-evidence.mjs';

test('scenario evidence materializes declared developer, host, Git, and path facts', async () => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-scenario-evidence-'));
  const repositoryPath = join(root, 'repository');
  const relatedPath = join(root, 'related');
  mkdirSync(join(repositoryPath, 'src'), { recursive: true });
  mkdirSync(relatedPath);
  writeFileSync(join(repositoryPath, 'README.md'), '# Fixture\n');
  writeFileSync(join(repositoryPath, 'src', 'policy.ts'), 'export const policy = true;\n');
  const largeEvidence = Buffer.concat([Buffer.alloc(32_768, 'a'), Buffer.from('b')]);
  writeFileSync(join(repositoryPath, 'src', 'large-evidence.txt'), largeEvidence);
  writeFileSync(join(relatedPath, 'package.json'), '{"name":"related"}\n');
  execFileSync('git', ['init', '--quiet'], { cwd: repositoryPath });
  execFileSync('git', ['config', 'user.email', 'evaluation@example.com'], {
    cwd: repositoryPath,
  });
  execFileSync('git', ['config', 'user.name', 'Evaluation Fixture'], { cwd: repositoryPath });
  execFileSync('git', ['add', '.'], { cwd: repositoryPath });
  execFileSync('git', ['commit', '--quiet', '-m', 'test: seed fixture'], {
    cwd: repositoryPath,
  });
  writeFileSync(join(repositoryPath, 'untracked.txt'), 'current context\n');

  const caseDefinition = validateSemanticCaseDefinition({
    expected: [{ criterion: 'The response uses the supplied evidence.', label: 'uses-evidence' }],
    forbidden: [{ criterion: 'The response invents evidence.', label: 'invents-evidence' }],
    hostInstructions: '# Repository instructions\n\nKeep changes focused.\n',
    id: 'evidence-fixture',
    input: {
      developerDirection: 'Update the repository from its current evidence.',
      repositoryEvidence: [
        {
          claim: 'The developer requested an update.',
          source: { kind: 'developer-direction' },
        },
        {
          claim: 'Repository instructions constrain the update.',
          source: { kind: 'host-instructions' },
        },
        {
          claim: 'The worktree already contains untracked context.',
          source: { fact: 'has-untracked-paths', kind: 'git-state' },
        },
        {
          claim: 'The current policy implementation exists.',
          source: { expectedType: 'file', kind: 'workspace-path', path: 'src/policy.ts' },
        },
        {
          claim: 'No canonical context file exists yet.',
          source: { expectedType: 'missing', kind: 'workspace-path', path: 'docs/context.md' },
        },
        {
          claim: 'A large evidence file exists without requiring unbounded captured content.',
          source: {
            expectedType: 'file',
            kind: 'workspace-path',
            path: 'src/large-evidence.txt',
          },
        },
        {
          claim: 'The related application declares its package identity.',
          source: {
            expectedType: 'file',
            kind: 'related-path',
            mount: '/related',
            path: 'package.json',
          },
        },
      ],
    },
    operation: 'maintain-repository',
    scenario: 'An adopted repository receives evidence-backed project context.',
  });

  try {
    const evidence = await collectScenarioEvidence({
      caseDefinition,
      readOnlyMounts: [{ source: relatedPath, target: '/related' }],
      repositoryPath,
    });

    assert.equal(hasValidScenarioEvidence(evidence, caseDefinition), true);
    assert.equal(evidence[2].observation.observed, true);
    assert.equal(evidence[3].observation.content, 'export const policy = true;\n');
    assert.equal(evidence[4].observation.type, 'missing');
    assert.equal(evidence[5].observation.content, null);
    assert.equal(evidence[5].observation.omission, 'file-too-large');
    assert.equal(
      evidence[5].observation.sha256,
      createHash('sha256').update(largeEvidence).digest('hex'),
    );
    const evidenceWithWrongPath = structuredClone(evidence);
    evidenceWithWrongPath[3].observation.path = 'src/other-policy.ts';
    assert.equal(hasValidScenarioEvidence(evidenceWithWrongPath, caseDefinition), false);
    const evidenceWithUnexpectedField = structuredClone(evidence);
    evidenceWithUnexpectedField[0].unexpected = true;
    assert.equal(hasValidScenarioEvidence(evidenceWithUnexpectedField, caseDefinition), false);

    symlinkSync(relatedPath, join(repositoryPath, 'outside-link'), 'dir');
    const unsafeCaseDefinition = validateSemanticCaseDefinition({
      ...caseDefinition,
      id: 'unsafe-evidence-fixture',
      input: {
        developerDirection: caseDefinition.input.developerDirection,
        repositoryEvidence: [
          {
            claim: 'Repository instructions constrain the update.',
            source: { kind: 'host-instructions' },
          },
          {
            claim: 'An unsafe linked file appears to be inside the repository.',
            source: {
              expectedType: 'file',
              kind: 'workspace-path',
              path: 'outside-link/package.json',
            },
          },
        ],
      },
    });
    await assert.rejects(
      collectScenarioEvidence({
        caseDefinition: unsafeCaseDefinition,
        readOnlyMounts: [],
        repositoryPath,
      }),
      /traverses an intermediate symlink/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('Git evidence keeps staged, unstaged, untracked, deleted, and renamed facts distinct', async () => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-scenario-git-facts-'));
  const createRepository = (name, trackedPath = 'tracked.txt') => {
    const repositoryPath = join(root, name);
    mkdirSync(repositoryPath);
    writeFileSync(join(repositoryPath, trackedPath), 'original\n');
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
    return { repositoryPath, trackedPath };
  };
  const createFactCase = (id, fact) =>
    validateSemanticCaseDefinition({
      expected: [
        { criterion: 'The repository contains the declared fact.', label: 'fact-present' },
      ],
      forbidden: [{ criterion: 'The repository does not contain the fact.', label: 'fact-absent' }],
      id,
      input: {
        developerDirection: 'Inspect the repository state.',
        repositoryEvidence: [
          {
            claim: `The repository has ${fact}.`,
            source: { fact, kind: 'git-state' },
          },
        ],
      },
      operation: 'evaluate',
      scenario: 'A repository exposes one exact Git state.',
    });
  const assertFactPresent = async (repositoryPath, id, fact) => {
    const evidence = await collectScenarioEvidence({
      caseDefinition: createFactCase(id, fact),
      readOnlyMounts: [],
      repositoryPath,
    });
    assert.equal(evidence[0].observation.observed, true);
  };
  const assertFactMissing = async (repositoryPath, id, fact) =>
    assert.rejects(
      collectScenarioEvidence({
        caseDefinition: createFactCase(id, fact),
        readOnlyMounts: [],
        repositoryPath,
      }),
      new RegExp(`Git fact ${fact} is not present`),
    );

  try {
    const untracked = createRepository('untracked');
    writeFileSync(join(untracked.repositoryPath, 'untracked.txt'), 'untracked\n');
    await assertFactPresent(
      untracked.repositoryPath,
      'untracked-fact-present',
      'has-untracked-paths',
    );
    await assertFactMissing(
      untracked.repositoryPath,
      'untracked-is-not-unstaged',
      'has-unstaged-changes',
    );

    const unstaged = createRepository('unstaged');
    writeFileSync(join(unstaged.repositoryPath, unstaged.trackedPath), 'modified\n');
    await assertFactPresent(
      unstaged.repositoryPath,
      'unstaged-fact-present',
      'has-unstaged-changes',
    );
    await assertFactMissing(
      unstaged.repositoryPath,
      'unstaged-is-not-staged',
      'has-staged-changes',
    );
    await assertFactMissing(
      unstaged.repositoryPath,
      'unstaged-is-not-untracked',
      'has-untracked-paths',
    );

    const staged = createRepository('staged');
    writeFileSync(join(staged.repositoryPath, staged.trackedPath), 'modified\n');
    execFileSync('git', ['add', staged.trackedPath], { cwd: staged.repositoryPath });
    await assertFactPresent(staged.repositoryPath, 'staged-fact-present', 'has-staged-changes');
    await assertFactMissing(
      staged.repositoryPath,
      'staged-is-not-unstaged',
      'has-unstaged-changes',
    );

    const deleted = createRepository('deleted');
    unlinkSync(join(deleted.repositoryPath, deleted.trackedPath));
    await assertFactPresent(deleted.repositoryPath, 'deleted-fact-present', 'has-deleted-paths');

    const renamed = createRepository('renamed', 'D misleading-status.txt');
    execFileSync('git', ['mv', renamed.trackedPath, 'renamed.txt'], {
      cwd: renamed.repositoryPath,
    });
    await assertFactPresent(renamed.repositoryPath, 'renamed-fact-present', 'has-renamed-paths');
    await assertFactMissing(renamed.repositoryPath, 'renamed-is-not-deleted', 'has-deleted-paths');
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
