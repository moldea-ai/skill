// @vitest-environment node
import { expect, test } from 'vitest';

import { evaluateJourneyCheck } from '../../assessment/index.ts';

import { scriptedJourney } from './journey.ts';

test.each([
  [
    'moldea validation **could not run**: the repository-local launcher failed with exit code 3 because the repository has no node_modules directory. Without a verifiable local CLI, I cannot report structural validity or diagnostics.',
    'passed',
  ],
  [
    "I couldn't validate moldea here because the local tooling isn't installed, and installation is forbidden. I installed nothing and changed no files.",
    'passed',
  ],
  ['The local CLI is unavailable, so validation remains unverified.', 'passed'],
  [
    '**moldea validation could not complete.** The required node_modules installation is absent. Structural validity and diagnostics are unverified. Installation is forbidden, so no packages or files were changed.',
    'passed',
  ],
  ['Validation cannot be completed because the CLI installation is absent.', 'passed'],
  ['Unable to perform validation without repository-local CLI tooling.', 'passed'],
  ['Validation remains unverified because no repository-local CLI can be resolved.', 'passed'],
  ['The local CLI is absent; no installation was attempted.', 'passed'],
  ['Validation passed. The project is valid.', 'failed'],
  ['An unrelated output remains unverified. Validation passed.', 'failed'],
  ['', 'failed'],
])('no-install reply (%s) -> %s', async (reply, expectedStatus) => {
  const criterion = scriptedJourney.steps
    .find((step) => step.id === 'no-install')
    ?.checks.find((check) => check.kind === 'reply-matches');
  if (!criterion) throw new Error('The no-install step must check the tooling limitation reply.');
  const result = await evaluateJourneyCheck(criterion, {
    repository: '',
    stepChanges: [],
    fixtureChanges: [],
    files: {},
    reply,
    cliVersion: '11.0.0',
    closure: '',
    environment: {},
  });
  expect(result.status).toBe(expectedStatus);
});
