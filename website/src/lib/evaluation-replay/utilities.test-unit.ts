// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { buildEvaluationReplayPathTree } from './utilities.ts';

describe('buildEvaluationReplayPathTree', () => {
  test('builds a stable structural tree for files and symlinks', () => {
    expect(
      buildEvaluationReplayPathTree([
        { path: 'src/zeta.ts', type: 'file' },
        { path: 'README.md', type: 'file' },
        { path: 'src/agents/support.ts', type: 'file' },
        { path: 'src/current', type: 'symlink' },
      ]),
    ).toStrictEqual([
      {
        changeCount: 1,
        children: [],
        kind: 'file',
        name: 'README.md',
        path: 'README.md',
      },
      {
        changeCount: 3,
        children: [
          {
            changeCount: 1,
            children: [
              {
                changeCount: 1,
                children: [],
                kind: 'file',
                name: 'support.ts',
                path: 'src/agents/support.ts',
              },
            ],
            kind: 'folder',
            name: 'agents',
            path: 'src/agents',
          },
          {
            changeCount: 1,
            children: [],
            kind: 'symlink',
            name: 'current',
            path: 'src/current',
          },
          {
            changeCount: 1,
            children: [],
            kind: 'file',
            name: 'zeta.ts',
            path: 'src/zeta.ts',
          },
        ],
        kind: 'folder',
        name: 'src',
        path: 'src',
      },
    ]);
  });

  test('returns an empty tree for an empty change group', () => {
    expect(buildEvaluationReplayPathTree([])).toStrictEqual([]);
  });

  test.each([
    ['', 'repository-relative'],
    ['/src/index.ts', 'repository-relative'],
    ['src\\index.ts', 'repository-relative'],
    ['src/../index.ts', 'repository-relative'],
    ['src//index.ts', 'repository-relative'],
  ])('rejects unsafe path %s', (path, expectedMessage) => {
    expect(() => buildEvaluationReplayPathTree([{ path, type: 'file' }])).toThrow(expectedMessage);
  });

  test('rejects duplicate and structurally conflicting paths', () => {
    expect(() =>
      buildEvaluationReplayPathTree([
        { path: 'src/index.ts', type: 'file' },
        { path: 'src/index.ts', type: 'file' },
      ]),
    ).toThrow('duplicated');
    expect(() =>
      buildEvaluationReplayPathTree([
        { path: 'src', type: 'file' },
        { path: 'src/index.ts', type: 'file' },
      ]),
    ).toThrow('conflicts');
  });
});
