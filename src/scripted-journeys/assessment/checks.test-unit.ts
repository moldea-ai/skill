// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import { evaluateJourneyCheck, type ICheckContext } from './checks.ts';

test.each([
  ['path-exists', 'policy.md', 'passed'],
  ['path-exists', 'agents/triage', 'passed'],
  ['path-absent', 'agents/triage', 'failed'],
  ['path-absent', 'agents/triage/instruction.md', 'failed'],
  ['path-absent', 'agents/tri', 'passed'],
  ['path-exists', 'agents/tri', 'failed'],
  ['path-absent', 'missing', 'passed'],
] as const)('%s(%s) -> %s', async (kind, candidate, expectedStatus) => {
  const result = await evaluateJourneyCheck(
    { kind, path: candidate },
    {
      repository: '',
      stepChanges: [],
      fixtureChanges: [],
      files: { 'policy.md': 'hash', 'agents/triage/instruction.md': 'hash' },
      reply: '',
      cliVersion: '11.0.0',
      closure: '',
      environment: {},
    },
  );
  expect(result.status).toBe(expectedStatus);
});

test('trusted checks distinguish step changes, enduring preservation, absent content, and false replies', async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'journeys-checks-'));
  try {
    await writeFile(path.join(repository, 'policy.md'), 'Retention: 30 days.');
    const context: ICheckContext = {
      repository,
      stepChanges: [],
      fixtureChanges: ['policy.md'],
      files: { 'policy.md': 'hash' },
      reply: 'Retention is 60 days; invalid.',
      cliVersion: '11.0.0',
      closure: '',
      environment: {},
    };
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'paths-unchanged', paths: ['policy.md'], since: 'step' },
          context,
        )
      ).status,
    ).toBe('passed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'paths-unchanged', paths: ['policy.md'], since: 'fixture' },
          context,
        )
      ).status,
    ).toBe('failed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'no-changes' },
          { ...context, stepChanges: ['other.md'] },
        )
      ).status,
    ).toBe('failed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'content-matches', path: 'missing.md', pattern: '30' },
          context,
        )
      ).status,
    ).toBe('failed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'content-matches', path: 'policy.md', pattern: '30' },
          context,
        )
      ).status,
    ).toBe('passed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'reply-matches', pattern: '30', skillBehavior: false },
          context,
        )
      ).status,
    ).toBe('failed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'reply-matches', pattern: 'valid', absent: 'invalid', skillBehavior: false },
          context,
        )
      ).status,
    ).toBe('failed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'reply-matches', pattern: '.*', skillBehavior: false },
          { ...context, reply: '' },
        )
      ).status,
    ).toBe('failed');
    expect(
      (
        await evaluateJourneyCheck(
          { kind: 'content-matches', path: 'policy.md', pattern: 'retention' },
          context,
        )
      ).status,
    ).toBe('failed');
    expect(
      (await evaluateJourneyCheck({ kind: 'validate', result: 'valid' }, context)).status,
    ).toBe('blocked');
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
