// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import {
  buildCodexEvaluationHostCommand,
  CliInvocationEventSchema,
  GitInvocationEventSchema,
  runCodexEvaluationHost,
} from '../../../execution/host/index.ts';
import { createActorRepository, snapshotSemanticWorkspace } from '../../workspace/index.ts';
import { loadSemanticCases } from '../index.ts';

import { semanticCase } from './case.ts';

test('correct description wiring remains structurally valid while its authority contradicts the instruction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-routing-'));
  const originalHome = process.env['CODEX_HOME'];
  try {
    const sourceHome = join(root, 'source-home');
    await mkdir(sourceHome);
    process.env['CODEX_HOME'] = sourceHome;
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const description = await readFile(
      join(repositoryPath, 'moldea/agents/triage-agent/description.md'),
      'utf8',
    );
    expect(description).toContain('independently authorizes customer refunds');
    expect(
      await readFile(join(repositoryPath, 'moldea/agents/triage-agent/instruction.md'), 'utf8'),
    ).toContain('without making authorization decisions');
    const before = await snapshotSemanticWorkspace(repositoryPath);
    const native = spawnSync(
      process.execPath,
      ['--test', 'src/triage-agent.test-integration.mjs'],
      { cwd: repositoryPath, encoding: 'utf8' },
    );
    expect(native.status, native.stderr).toBe(0);
    const validation = spawnSync(
      process.execPath,
      [
        join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
        '--repository',
        repositoryPath,
        '--',
        'validate',
        '--json',
        '--max-output-bytes',
        '65536',
      ],
      { encoding: 'utf8' },
    );
    expect(validation.status, validation.stderr).toBe(0);
    expect(
      z
        .object({ result: z.object({ valid: z.literal(true) }) })
        .parse(JSON.parse(validation.stdout)).result.valid,
    ).toBe(true);
    expect(await snapshotSemanticWorkspace(repositoryPath)).toStrictEqual(before);
    expect(semanticCase.forbidden.find(({ label }) => label === 'repository-write')).toBeDefined();
  } finally {
    if (originalHome === undefined) delete process.env['CODEX_HOME'];
    else process.env['CODEX_HOME'] = originalHome;
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['routing-description-contradiction', 'routing-description-fallback'])(
  '%s reads canonical content on the host and through the production Git wrapper',
  async (id) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-content-'));
    try {
      const sourceHome = join(root, 'source-home');
      const bin = join(root, 'bin');
      await mkdir(sourceHome);
      await mkdir(bin);
      vi.stubEnv('CODEX_HOME', sourceHome);
      vi.stubEnv('PATH', `${bin}${delimiter}${process.env['PATH'] ?? ''}`);
      const definition = (await loadSemanticCases(join(import.meta.dirname, '..'))).find(
        (entry) => entry.id === id,
      );
      if (!definition) throw new Error('Missing routing content fixture');
      const sandboxHome = join(root, 'home');
      const { repositoryPath, readOnlyMounts, hasWorkspaceBinaryDirectory } =
        await createActorRepository(root, definition, sandboxHome, join(root, 'tools'));
      const paths = [
        '/moldea/agents/triage-agent/description.md',
        '/moldea/agents/triage-agent/instruction.md',
      ];
      const expected = new Map(
        await Promise.all(
          paths.map(
            async (asset) =>
              [asset, await readFile(join(repositoryPath, asset.slice(1)), 'utf8')] as const,
          ),
        ),
      );
      const before = await snapshotSemanticWorkspace(repositoryPath);
      const readHost = () =>
        paths.map((asset) => {
          const result = spawnSync(
            process.execPath,
            [
              join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
              '--repository',
              repositoryPath,
              '--',
              'content',
              '--path',
              asset,
              '--json',
              '--max-output-bytes',
              '65536',
            ],
            { cwd: repositoryPath, encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
          );
          return {
            environment: 'host',
            path: asset,
            status: result.status,
            stdout: result.stdout,
            stderr: result.stderr,
          };
        });
      const codex = join(bin, 'codex');
      const companion = join(bin, 'codex-code-mode-host');
      await writeFile(companion, '#!/opt/node\n');
      await chmod(companion, 0o755);
      await writeFile(
        codex,
        `#!/opt/node\nimport { spawnSync } from 'node:child_process';\nprocess.env.MOLDEA_EVAL_MODEL_COMMAND = '1';\nconst results = ${JSON.stringify(paths)}.map(path => {\n const result = spawnSync('/bin/bash', ['-lc', 'exec node "$@"', 'moldea-content', '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs', '--repository', '/mnt', '--', 'content', '--path', path, '--json', '--max-output-bytes', '65536'], { encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });\n return { environment: 'sandbox', path, status: result.status, stdout: result.stdout, stderr: result.stderr };\n});\nprocess.stdout.write(JSON.stringify(results) + '\\n');\n`,
      );
      await chmod(codex, 0o755);
      const output = await runCodexEvaluationHost({
        command: buildCodexEvaluationHostCommand(
          [
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
          ],
          'actor',
        ),
        cwd: repositoryPath,
        includeWorkspaceBinaryDirectory: hasWorkspaceBinaryDirectory,
        prompt: 'deterministic routing content check',
        readOnlyMounts,
        readOnlyWorkspacePaths: ['.agents', '.git'],
        role: 'actor',
        sandboxHome,
      });
      const lines = output.split('\n');
      CliInvocationEventSchema.parse(JSON.parse(lines.pop() ?? ''));
      const { evidence } = GitInvocationEventSchema.parse(JSON.parse(lines.pop() ?? ''));
      expect(evidence.invocationCount).toBeGreaterThan(evidence.hostInvocationCount);
      const results = readHost();
      results.push(
        ...z
          .array(
            z.object({
              environment: z.string(),
              path: z.string(),
              status: z.number().int().nullable(),
              stdout: z.string(),
              stderr: z.string(),
            }),
          )
          .length(2)
          .parse(JSON.parse(lines.join('\n'))),
      );
      for (const result of results) {
        expect
          .soft(
            result.status,
            `${result.environment} ${result.path}: ${result.stdout}${result.stderr}`,
          )
          .toBe(0);
        if (result.status === 0) {
          const response = z
            .object({
              schemaVersion: z.literal(7),
              error: z.null(),
              status: z.literal('valid'),
              result: z.object({ chunk: z.object({ content: z.string() }) }),
            })
            .parse(JSON.parse(result.stdout));
          expect.soft(response.result.chunk.content).toBe(expected.get(result.path));
        }
      }
      expect(await snapshotSemanticWorkspace(repositoryPath)).toStrictEqual(before);
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  },
);
