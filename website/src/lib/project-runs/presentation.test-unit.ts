// @vitest-environment node
import { expect, test } from 'vitest';

import { combineProjectRuns, createProjectAttempt, createProjectRunModel } from './presentation.ts';
import { ProjectAttemptRecordSchema, ProjectRunRecordSchema } from './types.ts';

const source = { kind: 'public' as const, commit: 'a'.repeat(40), runId: 'example' };
const record = ProjectAttemptRecordSchema.parse({
  formatVersion: 1,
  runId: 'example',
  scenarioId: 'example',
  attemptId: 'example',
  baseCommit: 'b'.repeat(40),
  finalCommit: null,
  lastDurableCommit: 'c'.repeat(40),
  observedSummary: 'A partial implementation was preserved.',
  outcomeReason: 'The session was interrupted.',
  interventions: [
    { originalResult: 'Incorrect policy.', assistedResult: 'Corrected after a developer prompt.' },
  ],
  failures: [{ description: 'The first check failed.' }],
  assets: [{ kind: 'session', tag: 'run/one', name: 'session #1.gz' }],
});

test('retains every later request in conversation order, including interventions', () => {
  const requests = [
    {
      id: 'last',
      ordinal: 4,
      kind: 'follow-up' as const,
      text: 'Apply the correction.',
      observedResult: 'The authorized owner changed.',
    },
    {
      id: 'initial',
      ordinal: 1,
      kind: 'initial' as const,
      text: 'Create the project.',
      observedResult: 'Created.',
    },
    {
      id: 'intervention',
      ordinal: 3,
      kind: 'intervention' as const,
      text: 'Keep this read-only.',
      observedResult: 'No files changed.',
    },
    {
      id: 'discussion',
      ordinal: 2,
      kind: 'follow-up' as const,
      text: 'Discuss the policy.',
      observedResult: 'The policy was discussed.',
    },
  ];
  const attempt = createProjectAttempt(
    { ...record, requests },
    source,
    'evidence/attempt.json',
    null,
  );
  expect(attempt.initialRequest).toStrictEqual(requests[1]);
  expect(attempt.followUps).toStrictEqual([requests[3], requests[2], requests[0]]);
  expect(requests.map(({ ordinal }) => ordinal)).toStrictEqual([4, 1, 3, 2]);
  expect(
    createProjectAttempt(record, source, 'evidence/attempt.json', null).followUps,
  ).toStrictEqual([]);
});

test('retains interventions and failures and links the reached checkpoint without inventing a final commit', () => {
  const attempt = createProjectAttempt(record, source, 'evidence/attempt.json', null);
  expect(attempt.notes).toStrictEqual([
    'The session was interrupted.',
    'Before intervention: Incorrect policy.\nAfter intervention: Corrected after a developer prompt.',
    'The first check failed.',
  ]);
  expect(attempt.reachedCommit).toBe('c'.repeat(40));
  expect(attempt.links.at(-1)?.href).toBe(
    'https://github.com/jesusgraterol/moldea-mock-project-public/releases/download/run%2Fone/session%20%231.gz',
  );
});

test.each([
  [0, 1, 0],
  [1, 1, 1],
  [16, 1, 16],
  [17, 2, 1],
])(
  'paginates %d projects into %d pages with %d on the final page',
  (count, pageCount, finalCount) => {
    const run = ProjectRunRecordSchema.parse({
      formatVersion: 1,
      runId: 'example',
      date: '2026-09-27',
      summary: 'Recorded work.',
      attempts: [],
    });
    const attempts = Array.from({ length: count }, (_, index) =>
      createProjectAttempt(
        { ...record, attemptId: `project-${index}` },
        source,
        'evidence/attempt.json',
        null,
      ),
    );
    const model = createProjectRunModel(run, source, 'evidence/run.json', attempts);
    expect(model.pages).toHaveLength(pageCount);
    expect(model.pages[0]!.previous).toBeNull();
    expect(model.pages.at(-1)!.next).toBeNull();
    expect(model.pages.at(-1)!.attempts).toHaveLength(finalCount);
    expect(model.pages.flatMap((page) => page.attempts)).toStrictEqual(attempts);
    if (pageCount === 2) {
      expect(model.pages[0]!.next).toBe('/evidence/project-runs/2/');
      expect(model.pages[1]!.previous).toBe('/evidence/project-runs/');
    }
  },
);

test('shows one card per project and prefers the selected attempt over its earlier branch', () => {
  const run = ProjectRunRecordSchema.parse({
    formatVersion: 1,
    runId: 'example',
    date: '2026-09-28',
    summary: 'Recorded work.',
    attempts: [],
  });
  const selected = createProjectRunModel(run, source, 'evidence/run.json', [
    createProjectAttempt(
      { ...record, attemptId: 'field-02', branch: 'fixture_eve_02' },
      source,
      'evidence/field.json',
      null,
    ),
  ]);
  const earlier = createProjectRunModel(run, source, 'evidence/earlier.json', [
    createProjectAttempt(
      { ...record, attemptId: 'field-01', branch: 'fixture_eve_01' },
      source,
      'evidence/old-field.json',
      null,
    ),
    createProjectAttempt(
      { ...record, attemptId: 'cedar-01', branch: 'fixture_initialized_01' },
      source,
      'evidence/cedar.json',
      null,
    ),
  ]);
  const combined = combineProjectRuns(selected, [earlier]);
  expect(combined.pages).toHaveLength(1);
  expect(combined.pages[0]?.attempts.map(({ id, title }) => ({ id, title }))).toStrictEqual([
    { id: 'field-02', title: 'Field Notes' },
    { id: 'cedar-01', title: 'Cedar Workshop' },
  ]);
});
