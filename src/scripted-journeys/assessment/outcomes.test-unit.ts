// @vitest-environment node
import { expect, test } from 'vitest';

import { deriveJourneyOutcome, deriveRunOutcome, deriveStepOutcome } from './outcomes.ts';

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
