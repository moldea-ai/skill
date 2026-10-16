// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

import {
  hasPassingRepairGitEvidence,
  projectActorExecutionEvidenceEvent,
} from '../../semantic/execution/index.ts';

import {
  CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
  prepareGitCommandPolicyBoundary,
} from './git-command-policy-boundary.ts';
import { readGitInvocationEvidence } from './git-invocations.ts';
import { buildCodexEvaluationBwrapArguments } from './host.ts';

const safeArguments = [
  ...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
  '--untracked-files=all',
  '--branch',
];
const nodeSpawn = (path: string, arguments_: string[]): string =>
  `/opt/node --input-type=module -e 'import {spawnSync} from "node:child_process";process.exitCode=spawnSync(${JSON.stringify(path)},${JSON.stringify(arguments_)},{stdio:"inherit"}).status??1'`;

test.each([
  ['git', `git ${safeArguments.join(' ')}`, 1, true],
  ['/bin/git', `/bin/git ${safeArguments.join(' ')}`, 1, true],
  ['/usr/lib/git-core/git', `/usr/lib/git-core/git ${safeArguments.join(' ')}`, 1, true],
  ['/usr/bin/git', `/usr/bin/git ${safeArguments.join(' ')}`, 1, true],
  ['Node PATH', nodeSpawn('git', safeArguments), 1, true],
  ['Node absolute', nodeSpawn('/usr/bin/git', safeArguments), 1, true],
  [
    'execSync',
    `/opt/node --input-type=module -e 'import {execSync} from "node:child_process";execSync("git ${safeArguments.join(' ')}",{stdio:"inherit"})'`,
    1,
    true,
  ],
  ['Node without Git', `/opt/node -e 'process.stdout.write("local work\\n")'`, 0, true],
  ['non-PATH real binary', 'command -v moldea-real-git', 0, true],
  ['explicit real binary', `/opt/moldea-real-git/git ${safeArguments.join(' ')}`, 0, false],
  ['nested rejected Git', nodeSpawn('git', ['log', '-p']), 1, false],
  ['unexecuted rejected Git', 'false && git log -p', 0, false],
] as const)(
  'sandbox captures %s and grades combined compliance',
  async (_name, command, count, passing) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-git-capture-'));
    const repository = join(root, 'repository');
    const home = join(root, 'home');
    try {
      await mkdir(repository);
      await mkdir(join(home, 'bin'), { recursive: true });
      await mkdir(join(home, 'tmp'));
      const init = spawnSync('/usr/bin/git', ['init', '--quiet'], {
        cwd: repository,
        encoding: 'utf8',
      });
      expect(init.status).toBe(0);
      await prepareGitCommandPolicyBoundary(join(home, 'bin'), {
        realGitExecutable: '/opt/moldea-real-git/git',
        invocationLogPath: '/home/evaluator/git-invocations.jsonl',
      });
      const log = join(home, 'git-invocations.jsonl');
      await writeFile(log, '', { mode: 0o600 });
      const result = spawnSync(
        'bwrap',
        buildCodexEvaluationBwrapArguments({
          command: [
            'codex',
            '-c',
            `PATH=/home/evaluator/bin:/opt:/usr/bin:/bin; export PATH; ${command}`,
          ],
          cwd: repository,
          hostExecutable: await realpath('/bin/sh'),
          nodeExecutable: process.execPath,
          sandboxHome: home,
        }),
        { encoding: 'utf8', timeout: 10_000 },
      );
      if (result.error) throw result.error;
      const capture = await readGitInvocationEvidence(log);
      expect(capture.invocationCount).toBe(count);
      if (_name === 'non-PATH real binary') expect(result.status).toBe(127);
      const evidence = projectActorExecutionEvidenceEvent(
        {
          type: 'item.completed',
          item: {
            type: 'command_execution',
            command,
            aggregated_output: result.stdout + result.stderr,
            exit_code: result.status ?? 1,
            status: result.status === 0 ? 'completed' : 'failed',
          },
        },
        { cliVersion: '11.0.5', jsonSchemaVersion: 7 },
      );
      if (evidence === null) throw new Error('Expected completed execution evidence.');
      expect(hasPassingRepairGitEvidence([evidence], capture)).toBe(passing);
      if (count === 1 && passing) expect(capture.repair.compliantCount).toBe(1);
      if (_name === 'nested rejected Git') expect(capture.repair.noncompliantCount).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
