// @vitest-environment node
import { expect, test } from 'vitest';

import { CODEX_EVALUATION_GIT_STATUS_ARGUMENTS } from './git-command-policy-boundary.ts';
import { GitInvocationEvidenceSchema, projectGitInvocations } from './git-invocations.ts';

const record = (arguments_: string[], approved = true, releaseCli = false): string =>
  `${JSON.stringify({ arguments: arguments_, approved, releaseCli })}\n`;

test('projects actual argument vectors and discards raw paths and revisions', () => {
  const status = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'];
  const evidence = projectGitInvocations(record(status) + record(['log', '-p'], false));
  expect(evidence).toStrictEqual({
    invocationCount: 2,
    repair: {
      compliantCount: 1,
      noncompliantCount: 1,
      unverifiedCount: 0,
      reasons: [{ code: 'git-log', count: 1 }],
    },
  });
  expect(JSON.stringify(evidence)).not.toContain('--branch');
});

test('empty capture and fixed CLI/version calls do not invent a repair read', () => {
  expect(projectGitInvocations('')).toStrictEqual({
    invocationCount: 0,
    repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
  });
  const evidence = projectGitInvocations(
    record(['--version']) +
      record(
        [
          '--no-pager',
          '-c',
          'color.ui=false',
          '-c',
          'core.fsmonitor=false',
          '-c',
          'submodule.recurse=false',
          '-C',
          '/mnt',
          'rev-parse',
          '--show-toplevel',
        ],
        true,
        true,
      ),
  );
  expect(evidence.invocationCount).toBe(2);
  expect(evidence.repair.compliantCount).toBe(0);
  expect(evidence.repair.noncompliantCount).toBe(0);
});

test.each([
  ['malformed', '{bad}\n'],
  ['missing fields', '{}\n'],
  ['partial', record(['--version']).trimEnd()],
  ['oversized', 'x'.repeat(1_048_577)],
  ['capture limit', 'CAPTURE_LIMIT\n'],
])('rejects %s capture', (_name, source) => {
  expect(() => projectGitInvocations(source)).toThrow();
});

test('rejects contradictory projected totals', () => {
  expect(() =>
    GitInvocationEvidenceSchema.parse({
      invocationCount: 0,
      repair: { compliantCount: 1, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
    }),
  ).toThrow();
});
