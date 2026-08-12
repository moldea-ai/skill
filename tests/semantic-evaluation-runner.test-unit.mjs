// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessJudgeOutput,
  buildActorPrompt,
  buildBwrapArguments,
  buildJudgePrompt,
  validateHostCommand,
} from './semantic-evaluation-runner.mjs';

const CASE_DEFINITION = {
  expected: ['expected-secret-label'],
  forbidden: ['forbidden-secret-label'],
  id: 'blind-evaluation',
  prompt: 'Evaluate this repository without changing it.',
};
const SAFE_HOST_COMMAND = [
  'codex',
  'exec',
  '--ignore-user-config',
  '--ignore-rules',
  '--ephemeral',
  '--skip-git-repo-check',
  '--dangerously-bypass-approvals-and-sandbox',
  '-c',
  'shell_environment_policy.inherit=none',
  '-',
];

test('actor prompt contains only the user scenario', () => {
  const actorPrompt = buildActorPrompt(CASE_DEFINITION);

  assert.equal(actorPrompt, CASE_DEFINITION.prompt);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
});

test('structured actor prompt excludes evaluation criteria', () => {
  const actorPrompt = buildActorPrompt({
    expected: ['expected-secret-label'],
    forbidden: ['forbidden-secret-label'],
    id: 'structured-evaluation',
    input: { changedPath: 'src/runtime.ts' },
    operation: 'evaluate',
    scenario: 'The adopted repository has one changed runtime file.',
  });

  assert.match(actorPrompt, /Requested operation: evaluate/);
  assert.match(actorPrompt, /src\/runtime\.ts/);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
});

test('judge prompt receives criteria after actor execution', () => {
  const judgePrompt = buildJudgePrompt(CASE_DEFINITION, 'Actor response', {
    created: [],
    deleted: [],
    modified: [],
  });

  assert.match(judgePrompt, /expected-secret-label/);
  assert.match(judgePrompt, /forbidden-secret-label/);
  assert.match(judgePrompt, /Actor response/);
});

test('assessment derives failure when expected evidence is missing', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({ forbidden: [], observed: [], rationale: 'No supporting evidence.' }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment derives failure when forbidden behavior is observed', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({
      forbidden: ['forbidden-secret-label'],
      observed: ['expected-secret-label'],
      rationale: 'Both behaviors were present.',
    }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment rejects labels outside the declared case contract', () => {
  assert.throws(
    () =>
      assessJudgeOutput(
        CASE_DEFINITION,
        JSON.stringify({
          forbidden: ['undeclared-label'],
          observed: ['expected-secret-label'],
          rationale: 'Unsupported label.',
        }),
      ),
    /undeclared behavior label/,
  );
});

test('sandbox uses an empty root, isolated network, and restricted relay', () => {
  const argumentsList = buildBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostExecutable: '/usr/bin/codex',
    sandboxHome: '/tmp/evaluation-home',
  });
  assert.deepEqual(argumentsList.slice(0, 2), ['--die-with-parent', '--new-session']);
  assert.ok(argumentsList.includes('--unshare-net'));
  assert.ok(
    argumentsList.some((part) =>
      part.includes('TCP-LISTEN:3128,bind=127.0.0.1,reuseaddr,fork'),
    ),
  );
  assert.ok(
    argumentsList.some((part) =>
      part.includes('UNIX-CONNECT:/home/evaluator/egress-proxy.sock'),
    ),
  );
  assert.equal(
    argumentsList.some(
      (part, index) => part === '--ro-bind' && argumentsList[index + 1] === '/',
    ),
    false,
  );
});

test('sandbox mounts related repositories read-only', () => {
  const argumentsList = buildBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostExecutable: '/usr/bin/codex',
    readOnlyMounts: [
      {
        source: '/tmp/related-application',
        target: '/related-application',
      },
    ],
    sandboxHome: '/tmp/evaluation-home',
  });
  const mountIndex = argumentsList.findIndex(
    (part, index) =>
      part === '--ro-bind' && argumentsList[index + 1] === '/tmp/related-application',
  );

  assert.notEqual(mountIndex, -1);
  assert.equal(argumentsList[mountIndex + 2], '/related-application');
  assert.equal(
    argumentsList.some(
      (part, index) =>
        part === '--bind' && argumentsList[index + 1] === '/tmp/related-application',
    ),
    false,
  );
});

test('host command requires externally sandboxed execution mode', () => {
  assert.doesNotThrow(() => validateHostCommand(SAFE_HOST_COMMAND));
  assert.throws(
    () =>
      validateHostCommand([
        ...SAFE_HOST_COMMAND.slice(0, -1),
        '--sandbox',
        'workspace-write',
        '-',
      ]),
    /sandbox-weakening/,
  );
});

test('host command rejects writable paths outside the workspace', () => {
  assert.throws(
    () => validateHostCommand([...SAFE_HOST_COMMAND.slice(0, -1), '--add-dir', '/host', '-']),
    /sandbox-weakening/,
  );
});

test('host command rejects missing external-sandbox delegation', () => {
  assert.throws(
    () =>
      validateHostCommand(
        SAFE_HOST_COMMAND.filter(
          (part) => part !== '--dangerously-bypass-approvals-and-sandbox',
        ),
      ),
    /outer sandbox/,
  );
});
