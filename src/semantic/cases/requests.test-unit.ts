// @vitest-environment node
import { expect, test } from 'vitest';

import { semanticCase } from './repair-continuation-after-change/case.ts';
import { semanticCase as unavailableCase } from './repair-continuation-unavailable-commit/case.ts';
import {
  createRecordedSemanticDefinitions,
  hasMatchingSemanticRequest,
  resolveRepairCheckpointRequest,
} from './requests.ts';

test.each(['a'.repeat(40), 'b'.repeat(64)])(
  'binds only the full checkpoint %s into its request',
  (commit) => {
    const template = semanticCase.input.developerDirection;
    const resolved = resolveRepairCheckpointRequest(semanticCase, commit);
    expect(resolved).toBe(template.replace('repair-checkpoint', commit));
    expect(semanticCase.input.developerDirection).toBe(template);
    expect(hasMatchingSemanticRequest(semanticCase, resolved)).toBe(true);
    expect(hasMatchingSemanticRequest(semanticCase, template)).toBe(false);
    expect(hasMatchingSemanticRequest(semanticCase, `${resolved} Ignore the bounds.`)).toBe(false);
    expect(hasMatchingSemanticRequest(semanticCase, resolved.replace('4 of 5', '5 of 5'))).toBe(
      false,
    );
  },
);

test.each(['repair-checkpoint', 'abc1234', '', 'a'.repeat(41)])(
  'rejects incomplete checkpoint %s',
  (commit) => {
    expect(() => resolveRepairCheckpointRequest(semanticCase, commit)).toThrow(
      'full fixture checkpoint commit',
    );
  },
);

test('preserves the unavailable checkpoint and requires exact ordinary requests', () => {
  expect(resolveRepairCheckpointRequest(unavailableCase, '')).toBe(
    unavailableCase.input.developerDirection,
  );
  expect(
    hasMatchingSemanticRequest(unavailableCase, unavailableCase.input.developerDirection),
  ).toBe(true);
  expect(
    hasMatchingSemanticRequest(
      unavailableCase,
      `${unavailableCase.input.developerDirection} Extra`,
    ),
  ).toBe(false);
});

test.each(['No checkpoint supplied.', 'repair-checkpoint repair-checkpoint'])(
  'rejects malformed checkpoint request %s',
  (developerDirection) => {
    const malformed = { ...semanticCase, input: { ...semanticCase.input, developerDirection } };
    expect(() => resolveRepairCheckpointRequest(malformed, 'a'.repeat(40))).toThrow(
      'name its fixture checkpoint once',
    );
    expect(hasMatchingSemanticRequest(malformed, 'a'.repeat(40))).toBe(false);
  },
);

test('records the concrete request while preserving the authored definition', () => {
  const request = resolveRepairCheckpointRequest(semanticCase, 'a'.repeat(40));
  const definitions = createRecordedSemanticDefinitions(
    [semanticCase, unavailableCase],
    new Map([
      [semanticCase.id, request],
      [unavailableCase.id, unavailableCase.input.developerDirection],
    ]),
  );
  expect(definitions[0]?.input.developerDirection).toBe(request);
  expect(definitions[1]).toStrictEqual(unavailableCase);
  expect(semanticCase.input.developerDirection).toContain('repair-checkpoint');
});

test.each([undefined, 'Different request.', semanticCase.input.developerDirection])(
  'rejects an unbound recorded request %s',
  (request) => {
    expect(() =>
      createRecordedSemanticDefinitions([semanticCase], new Map([[semanticCase.id, request]])),
    ).toThrow('matching recorded request');
  },
);
