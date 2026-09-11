// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createQualificationProjectEvidence } from './project-transformers.ts';
import type { IWorkspaceAssertionResult } from './types.ts';

const createWorkspace = (): IWorkspaceAssertionResult => ({
  passed: true,
  failures: [],
  before: [
    { path: 'README.md', kind: 'file', mode: 33_204, sha256: 'a'.repeat(64) },
    { path: 'legacy/current', kind: 'symlink', mode: 41_420, sha256: 'b'.repeat(64) },
  ],
  after: [
    { path: 'README.md', kind: 'file', mode: 33_204, sha256: 'c'.repeat(64) },
    { path: 'src/agent.ts', kind: 'file', mode: 33_204, sha256: 'd'.repeat(64) },
  ],
  changedPaths: ['src/agent.ts', 'README.md', 'legacy/current'],
});

describe('createQualificationProjectEvidence', () => {
  test('builds the complete starting tree and exact change groups', () => {
    expect(createQualificationProjectEvidence(createWorkspace())).toStrictEqual({
      changeGroups: [
        {
          changes: [{ path: 'src/agent.ts', type: 'file' }],
          status: 'created',
          tree: [
            {
              changeCount: 1,
              children: [
                {
                  changeCount: 1,
                  children: [],
                  kind: 'file',
                  name: 'agent.ts',
                  path: 'src/agent.ts',
                },
              ],
              kind: 'folder',
              name: 'src',
              path: 'src',
            },
          ],
        },
        {
          changes: [{ path: 'README.md', type: 'file' }],
          status: 'modified',
          tree: [
            {
              changeCount: 1,
              children: [],
              kind: 'file',
              name: 'README.md',
              path: 'README.md',
            },
          ],
        },
        {
          changes: [{ path: 'legacy/current', type: 'symlink' }],
          status: 'deleted',
          tree: [
            {
              changeCount: 1,
              children: [
                {
                  changeCount: 1,
                  children: [],
                  kind: 'symlink',
                  name: 'current',
                  path: 'legacy/current',
                },
              ],
              kind: 'folder',
              name: 'legacy',
              path: 'legacy',
            },
          ],
        },
      ],
      startingTree: [
        {
          changeCount: 1,
          children: [
            {
              changeCount: 1,
              children: [],
              kind: 'symlink',
              name: 'current',
              path: 'legacy/current',
            },
          ],
          kind: 'folder',
          name: 'legacy',
          path: 'legacy',
        },
        {
          changeCount: 1,
          children: [],
          kind: 'file',
          name: 'README.md',
          path: 'README.md',
        },
      ],
    });
  });

  test('keeps the complete starting tree when no paths changed', () => {
    const workspace = createWorkspace();
    workspace.after = workspace.before.map((entry) => ({ ...entry }));
    workspace.changedPaths = [];

    const evidence = createQualificationProjectEvidence(workspace);

    expect(evidence.startingTree).toHaveLength(2);
    expect(evidence.changeGroups.map(({ changes }) => changes)).toStrictEqual([[], [], []]);
  });

  test('rejects snapshots that contradict recorded changed paths', () => {
    const workspace = createWorkspace();
    workspace.changedPaths = ['README.md'];

    expect(() => createQualificationProjectEvidence(workspace)).toThrow(
      'Qualification workspace snapshots contradict their changed paths.',
    );
  });
});
