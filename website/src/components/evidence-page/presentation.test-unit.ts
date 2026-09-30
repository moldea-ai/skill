// @vitest-environment node
import { expect, test } from 'vitest';
import type { IEvaluationReplayModel } from '@moldea.ai/website-ui/evaluation-replay-model';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';

import {
  getProjectPatchPaths,
  getRecordedWorkspace,
  getSemanticPreviewCase,
} from './presentation.ts';

test('selected recorded cases remain available without a current assurance attempt', () => {
  const evaluation = loadWebsiteModel().semanticEvaluation;
  const evaluationCase = evaluation.groups[0]!.cases[0]!;
  expect(
    getSemanticPreviewCase({ ...evaluation, currentAssurance: null }, evaluationCase.id),
  ).toStrictEqual(evaluationCase);
});

test('a current assurance case takes precedence over the selected group record', () => {
  const evaluation = loadWebsiteModel().semanticEvaluation;
  const evaluationCase = evaluation.currentAssurance!.cases[0]!;
  const updatedCase = { ...evaluationCase, title: 'Updated recorded case' };
  const currentAssurance = { ...evaluation.currentAssurance!, cases: [updatedCase] };
  expect(
    getSemanticPreviewCase({ ...evaluation, currentAssurance }, evaluationCase.id),
  ).toStrictEqual(updatedCase);
  expect(
    getSemanticPreviewCase(
      { ...evaluation, currentAssurance: { ...currentAssurance, cases: [] } },
      evaluationCase.id,
    ),
  ).toBeNull();
});

test('missing or unrecorded cases cannot become recorded previews', () => {
  const evaluation = loadWebsiteModel().semanticEvaluation;
  const evaluationCase = evaluation.currentAssurance!.cases[0]!;
  expect(getSemanticPreviewCase(evaluation, 'missing-case')).toBeNull();
  for (const replay of [null, { trials: [] }]) {
    const currentAssurance = {
      ...evaluation.currentAssurance!,
      cases: [{ ...evaluationCase, replay }],
    };
    expect(
      getSemanticPreviewCase({ ...evaluation, currentAssurance }, evaluationCase.id),
    ).toBeNull();
  }
});

test('missing workspace evidence does not imply that no files changed', () => {
  expect(getRecordedWorkspace(null)).toBeNull();
  expect(getRecordedWorkspace({ trials: [] })).toBeNull();
  const replay: IEvaluationReplayModel = {
    trials: [
      {
        id: 'initial',
        title: 'Initial',
        kind: 'initial',
        confirmationIndex: null,
        evaluatedAt: '',
        steps: [{ kind: 'workspace', groups: [] }],
      },
    ],
  };
  expect(getRecordedWorkspace(replay)).toStrictEqual({ changeCount: 0, paths: [] });
  expect(
    getRecordedWorkspace({
      trials: [...replay.trials, { ...replay.trials[0]!, id: 'final', steps: [] }],
    }),
  ).toBeNull();
});

test('the final workspace count includes changes beyond the bounded preview', () => {
  const changes = Array.from({ length: 8 }, (_, index) => ({
    path: `src/file-${index}.ts`,
    type: 'file' as const,
  }));
  const replay: IEvaluationReplayModel = {
    trials: [
      {
        id: 'final',
        title: 'Final',
        kind: 'initial',
        confirmationIndex: null,
        evaluatedAt: '',
        steps: [{ kind: 'workspace', groups: [{ status: 'modified', changes, tree: [] }] }],
      },
    ],
  };
  expect(getRecordedWorkspace(replay)).toStrictEqual({
    changeCount: 8,
    paths: changes.slice(0, 4).map(({ path }) => ({ path, status: 'modified' })),
  });
});

test('filtering preview paths retains the complete final workspace change count', () => {
  const replay: IEvaluationReplayModel = {
    trials: [
      {
        id: 'final',
        title: 'Final',
        kind: 'initial',
        confirmationIndex: null,
        evaluatedAt: '',
        steps: [
          {
            kind: 'workspace',
            groups: [
              {
                status: 'created',
                changes: [
                  { path: 'moldea/agents/support/description.md', type: 'file' },
                  { path: 'moldea/agents/support/instruction.md', type: 'file' },
                  { path: 'moldea/runtimes/custom.md', type: 'file' },
                ],
                tree: [],
              },
              {
                status: 'modified',
                changes: [
                  { path: 'moldea/moldea.yaml', type: 'file' },
                  { path: 'src/support-agent.js', type: 'file' },
                  { path: 'src/support-agent.test-integration.js', type: 'file' },
                ],
                tree: [],
              },
            ],
          },
        ],
      },
    ],
  };
  expect(
    getRecordedWorkspace(
      replay,
      (path) =>
        path.startsWith('src/') ||
        path.endsWith('/instruction.md') ||
        path === 'moldea/moldea.yaml',
    ),
  ).toStrictEqual({
    changeCount: 6,
    paths: [
      { path: 'moldea/agents/support/instruction.md', status: 'created' },
      { path: 'moldea/moldea.yaml', status: 'modified' },
      { path: 'src/support-agent.js', status: 'modified' },
      { path: 'src/support-agent.test-integration.js', status: 'modified' },
    ],
  });
  expect(getRecordedWorkspace(replay, () => false)).toStrictEqual({ changeCount: 6, paths: [] });
});

test('project previews retain distinct recorded paths and do not invent missing edits', () => {
  expect(getProjectPatchPaths({ session: null })).toStrictEqual([]);
  const session = Array.from({ length: 8 }, (_, ordinal) => ({
    ordinal,
    lastOrdinal: ordinal,
    timestamp: '',
    kind: 'tool' as const,
    title: 'Patch',
    content: '',
    isRedacted: false,
    patchTargets: [{ action: 'Update' as const, path: `src/file-${Math.floor(ordinal / 2)}.ts` }],
  }));
  expect(getProjectPatchPaths({ session })).toStrictEqual(
    Array.from({ length: 4 }, (_, index) => ({ path: `src/file-${index}.ts`, action: 'Update' })),
  );
});
