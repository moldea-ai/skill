// @vitest-environment node
import { expect, test } from 'vitest';

import { evaluateJourneyCheck } from '../assessment/index.ts';

import { VALIDATION_REPLY_PATTERN, VALIDATION_REPLY_CONTRADICTION_PATTERN } from './constants.ts';

test.each([
  [
    "moldea validation passed: the project is **valid**, with one warning. Warnings don't make the project invalid.",
    'passed',
  ],
  ['The project is valid. Warnings do not make the project invalid.', 'passed'],
  ['Valid with one warning; the project is not invalid.', 'passed'],
  ['Validation passed: valid, with no errors or warnings.', 'passed'],
  [
    'Moldea validation **passed** (CLI 11.0.2, schema 7, repository format 1). Results: 0 errors, 0 warnings, 0 accepted warnings, and 0 declared bindings. No files changed.',
    'passed',
  ],
  ['Validation passed with one warning.', 'passed'],
  ['Validation **passed**. The project is invalid.', 'failed'],
  ['The format is valid; validation **failed**.', 'failed'],
  ['Validation passed earlier. Validation did not pass now.', 'failed'],
  ['Tests passed; validation could not run.', 'failed'],
  ['Validation did not pass.', 'failed'],
  ["The format is valid; validation didn't pass.", 'failed'],
  ['The project is valid, but the setup is invalid.', 'failed'],
  ['The format is valid; validation: invalid.', 'failed'],
  ['The format is valid, but status="invalid".', 'failed'],
  ['The format is valid, project invalid.', 'failed'],
  ['Project invalid; the format is valid.', 'failed'],
  ['Valid? Invalid.', 'failed'],
  ['The project is not valid.', 'failed'],
  ["The setup isn't valid.", 'failed'],
  ['The project is invalid.', 'failed'],
  ['', 'failed'],
])('validation reply (%s) -> %s', async (reply, expectedStatus) => {
  const result = await evaluateJourneyCheck(
    {
      kind: 'reply-matches',
      pattern: VALIDATION_REPLY_PATTERN,
      absent: VALIDATION_REPLY_CONTRADICTION_PATTERN,
      skillBehavior: false,
    },
    {
      repository: '',
      stepChanges: [],
      fixtureChanges: [],
      files: {},
      reply,
      cliVersion: '11.0.0',
      closure: '',
      environment: {},
    },
  );
  expect(result.status).toBe(expectedStatus);
});
