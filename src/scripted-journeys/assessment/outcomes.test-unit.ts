// @vitest-environment node
import { expect, test } from 'vitest';

import type { IJourneyOutcome } from '../index.ts';

import { deriveJourneyOutcome, deriveRunOutcome, deriveStepOutcome } from './outcomes.ts';

test.each<[IJourneyOutcome[], IJourneyOutcome[], IJourneyOutcome]>([
  [['failed', 'blocked'], [], 'failed'],
  [['blocked', 'failed'], [], 'failed'],
  [['failed'], ['failed'], 'failed'],
  [['failed'], ['blocked'], 'failed'],
  [['passed'], ['failed'], 'blocked'],
  [['blocked'], [], 'blocked'],
  [[], [], 'blocked'],
  [[], ['failed'], 'blocked'],
  [['passed', 'passed'], ['passed'], 'passed'],
])('deriveStepOutcome(%o, %o) -> %s', (statuses, dependencies, expected) => {
  expect(
    deriveStepOutcome(
      statuses.map((status) => ({ check: { kind: 'no-changes' }, status, detail: '' })),
      dependencies,
    ),
  ).toBe(expected);
});

test('missing evidence and failed dependencies block steps', () => {
  expect(
    deriveStepOutcome(
      [{ check: { kind: 'no-changes' }, status: 'passed', detail: '' }],
      ['failed'],
    ),
  ).toBe('blocked');
  expect(
    deriveStepOutcome([{ check: { kind: 'no-changes' }, status: 'blocked', detail: '' }], []),
  ).toBe('blocked');
  expect(deriveJourneyOutcome(['passed', 'blocked'])).toBe('blocked');
});
test('complete failures cannot be confused with missing-platform diagnostic runs', () => {
  expect(deriveRunOutcome([{ platform: 'chatgpt', journeys: [{ status: 'failed' }] }])).toBe(
    'incomplete',
  );
  expect(
    deriveRunOutcome([
      { platform: 'chatgpt', journeys: [{ status: 'passed' }] },
      { platform: 'claude', journeys: [{ status: 'failed' }] },
    ]),
  ).toBe('failed');
  expect(
    deriveRunOutcome([
      { platform: 'chatgpt', journeys: [{ status: 'passed' }] },
      { platform: 'claude', journeys: [{ status: 'passed' }] },
    ]),
  ).toBe('passed');
});
