// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyActorCommandPolicyEvent,
  createActorCommandPolicyEvidence,
  hasValidActorCommandPolicyEvidence,
} from './actor-command-policy-evidence.mjs';

const createCompletedCommandEvent = (command) => ({
  item: {
    aggregated_output: '',
    command,
    exit_code: 0,
    id: 'command',
    status: 'completed',
    type: 'command_execution',
  },
  type: 'item.completed',
});

test('detects direct, wrapped, and entrypoint package-manager invocations', () => {
  const commands = [
    'npm --version',
    '/usr/local/bin/npx package',
    './node_modules/.bin/pnpm install',
    'corepack yarn --version',
    "/bin/bash -lc 'yarnpkg install'",
    'env CI=true pnpx package',
    'command -- pnpm install',
    'exec pnpm --version',
    'exec -- pnpm --version',
    'nohup pnpm --version',
    'nohup -- pnpm --version',
    'node /opt/corepack/dist/yarn.js --version',
    'node -- /opt/corepack/dist/pnpm.cjs --version',
    '/usr/bin/node /opt/corepack/dist/pnpm.cjs --version',
  ];

  for (const command of commands) {
    assert.equal(classifyActorCommandPolicyEvent(createCompletedCommandEvent(command)), 'observed');
  }
});

test('does not treat static inspection arguments as package-manager execution', () => {
  const commands = [
    'cat package.json',
    "rg 'pnpm|yarn' package.json",
    "sed -n '1,220p' .pnpmfile.cjs",
    'find . -maxdepth 2 -type f',
    'sort package.json',
    'command -v pnpm',
    'env ENVIRONMENT_ONLY=true',
    '/bin/bash -lc "test ! -e package-manager-hook-ran.txt"',
    'cat package.json | rg packageManager',
  ];

  for (const command of commands) {
    assert.equal(
      classifyActorCommandPolicyEvent(createCompletedCommandEvent(command)),
      'not-observed',
    );
  }
});

test('fails closed for commands that can conceal another executable', () => {
  const commands = [
    '$PACKAGE_MANAGER --version',
    'echo $(pnpm --version)',
    'eval "pnpm --version"',
    'bash -c "pnpm --version"',
    'node scripts/check-project.mjs',
    'find . -exec sh -c "pnpm --version" ;',
    "rg --pre pnpm 'packageManager' package.json",
    "sed -n '1p; e pnpm --version' package.json",
    './scripts/check-project inspect',
    './moldea inspect',
    './cat package.json',
    '/tmp/cat package.json',
    'PATH=. cat package.json',
    'env PATH=. cat package.json',
    'LD_PRELOAD=./hook.so cat package.json',
    'ENVIRONMENT_ONLY=true',
    'PATH=.; cat package.json',
    'cat package.json > inspected.txt',
    'env -S "pnpm --version"',
    "env '-S pnpm --version'",
    'exec -a cat pnpm --version',
    'exec -c pnpm --version',
    'nohup --help',
    'git log --oneline -5',
    "git -c alias.pm='!pnpm --version' pm",
    'git difftool --extcmd=pnpm --no-prompt',
    'git -c core.fsmonitor=false -c core.pager=cat --no-pager status --porcelain=v2 -z',
    'sort --co pnpm -S 1b package.json',
    'sort --compress-prog=pnpm -S 1b package.json',
    'sort --compress-program pnpm -S 1b package.json',
    'sort --compress-program=pnpm -S 1b package.json',
    'sudo pnpm --version',
    'timeout 5 pnpm --version',
    'unknown-tool inspect',
  ];

  for (const command of commands) {
    assert.equal(
      classifyActorCommandPolicyEvent(createCompletedCommandEvent(command)),
      'indeterminate',
    );
  }
});

test('derives and validates privacy-safe command-policy aggregates', () => {
  const evidence = createActorCommandPolicyEvidence(['not-observed', 'indeterminate', 'observed']);

  assert.deepEqual(evidence, {
    completedCommandCount: 3,
    indeterminateCommandCount: 1,
    packageManagerExecution: 'observed',
    packageManagerInvocationCount: 1,
  });
  assert.equal(hasValidActorCommandPolicyEvidence(evidence), true);
  assert.equal(
    hasValidActorCommandPolicyEvidence({
      ...evidence,
      packageManagerExecution: 'not-observed',
    }),
    false,
  );
});

test('ignores non-command events and rejects malformed command events', () => {
  assert.equal(
    classifyActorCommandPolicyEvent({
      item: { text: 'pnpm install', type: 'agent_message' },
      type: 'item.completed',
    }),
    null,
  );
  assert.throws(
    () =>
      classifyActorCommandPolicyEvent({
        item: { type: 'command_execution' },
        type: 'item.completed',
      }),
    /did not include its command policy input/u,
  );
});
