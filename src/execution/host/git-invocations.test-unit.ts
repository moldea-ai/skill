// @vitest-environment node
import { expect, test } from 'vitest';

import { CODEX_EVALUATION_GIT_STATUS_ARGUMENTS } from './git-command-policy-boundary.ts';
import { GitInvocationEvidenceSchema, projectGitInvocations } from './git-invocations.ts';

const record = (arguments_: string[], approved = true, caller = 'actor'): string =>
  `${JSON.stringify({ arguments: arguments_, approved, caller, origin: 'actor' })}\n`;

test('direct hardened attribute-source lookup is a repair violation', () => {
  const prefix = CODEX_EVALUATION_GIT_STATUS_ARGUMENTS.slice(
    0,
    CODEX_EVALUATION_GIT_STATUS_ARGUMENTS.indexOf('status'),
  );
  const evidence = projectGitInvocations(
    record([...prefix, 'config', '--null', '--get', 'attr.tree']),
  );
  expect(evidence.repair.compliantCount).toBe(0);
  expect(evidence.repair.noncompliantCount).toBe(1);
});

test.each(['actor', 'unverified'])(
  'caller %s cannot earn helper credit from approved arguments',
  (caller) => {
    const status = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'];
    expect(projectGitInvocations(record(status, true, caller)).repair).toStrictEqual({
      compliantCount: 0,
      noncompliantCount: 1,
      unverifiedCount: 0,
      reasons: [{ code: 'git-status-arguments', count: 1 }],
    });
  },
);

test.each(['managed-writer', 'release-cli'])(
  'approved %s calls supply no helper credit and rejected calls still fail',
  (caller) => {
    const evidence = projectGitInvocations(
      record(['--version'], true, caller) + record(['log', '-p'], false, caller),
    );
    expect(evidence.repair).toStrictEqual({
      compliantCount: 0,
      noncompliantCount: 1,
      unverifiedCount: 0,
      reasons: [{ code: 'git-log', count: 1 }],
    });
  },
);

test('projects actual argument vectors and discards raw paths and revisions', () => {
  const status = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'];
  const evidence = projectGitInvocations(
    record(status, true, 'repair-helper') + record(['log', '-p'], false),
  );
  expect(evidence).toStrictEqual({
    invocationCount: 2,
    hostInvocationCount: 0,
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
    hostInvocationCount: 0,
    repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
  });
  const evidence = projectGitInvocations(
    record(['--version']) +
      record(
        [
          '-c',
          'core.fsmonitor=',
          '-c',
          'core.askPass=',
          '-c',
          'core.pager=cat',
          '-c',
          'color.ui=false',
          '-c',
          'submodule.recurse=false',
          '-c',
          'credential.helper=',
          '--no-pager',
          'rev-parse',
          '--show-toplevel',
        ],
        true,
        'release-cli',
      ),
  );
  expect(evidence.invocationCount).toBe(2);
  expect(evidence.repair.compliantCount).toBe(0);
  expect(evidence.repair.noncompliantCount).toBe(0);
});

test.each([
  ['malformed', '{bad}\n'],
  ['missing fields', '{}\n'],
  [
    'missing caller',
    `${JSON.stringify({ arguments: ['--version'], approved: true, origin: 'actor' })}\n`,
  ],
  [
    'legacy argument-derived provenance',
    `${JSON.stringify({ arguments: ['--version'], approved: true, origin: 'actor', releaseCli: true })}\n`,
  ],
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
      hostInvocationCount: 0,
      repair: { compliantCount: 1, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
    }),
  ).toThrow();
});

test('host invocations stay visible without supplying actor violations or positive credit', () => {
  const status = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'];
  const hostRecord = (arguments_: string[], approved: boolean): string =>
    `${JSON.stringify({ arguments: arguments_, approved, caller: 'unverified', origin: 'host' })}\n`;
  const evidence = projectGitInvocations(
    hostRecord(['log', '-p'], false) + hostRecord(status, true) + record(['log', '-p'], false),
  );
  expect(evidence).toStrictEqual({
    invocationCount: 3,
    hostInvocationCount: 2,
    repair: {
      compliantCount: 0,
      noncompliantCount: 1,
      unverifiedCount: 0,
      reasons: [{ code: 'git-log', count: 1 }],
    },
  });
  expect(() =>
    projectGitInvocations(
      `${JSON.stringify({ arguments: [], approved: true, caller: 'actor' })}\n`,
    ),
  ).toThrow();
  expect(() =>
    GitInvocationEvidenceSchema.parse({
      invocationCount: 1,
      hostInvocationCount: 1,
      repair: { compliantCount: 1, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
    }),
  ).toThrow();
});
