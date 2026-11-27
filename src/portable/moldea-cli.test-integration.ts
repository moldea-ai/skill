// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from 'vitest';

const cli = path.resolve(import.meta.dirname, '../../moldea/scripts/moldea-cli/moldea.mjs');
const executable = process.env['MOLDEA_TEST_NODE'] ?? process.execPath;

test('the shipped CLI validates and inspects a project without a package manifest', async () => {
  const repository = await mkdtemp(path.join(tmpdir(), 'moldea-portable-cli-'));
  try {
    execFileSync('git', ['init', '--quiet'], { cwd: repository });
    const files = {
      'moldea/moldea.yaml':
        'version: 1\nagents:\n  support:\n    bindings:\n      runtimeAgent: { path: /src/agent.ts, symbol: supportAgent }\n',
      'moldea/project.md': '# Standalone project\n',
      'moldea/agents/support/description.md': 'Handles customer support.\n',
      'moldea/agents/support/instruction.md': 'You are the `support` agent.\n',
      'src/agent.ts': 'export const supportAgent = {};\n',
    };
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(repository, name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, content);
    }
    for (const name of ['package.json', 'node_modules']) {
      await expect(access(path.join(repository, name))).rejects.toMatchObject({ code: 'ENOENT' });
    }
    const run = (args: string[], exitCode: number, status: string) => {
      const invocation = spawnSync(executable, [cli, ...args, '--json'], {
        cwd: repository,
        encoding: 'utf8',
        timeout: 30_000,
      });
      if (invocation.error) throw invocation.error;
      expect(invocation.stderr).toBe('');
      expect(invocation.status, invocation.stdout).toBe(exitCode);
      const envelope = JSON.parse(invocation.stdout) as { result: unknown };
      expect(envelope).toMatchObject({
        cliVersion: '15.0.0',
        command: args[0],
        schemaVersion: 9,
        status,
      });
      return envelope.result;
    };

    const composition = run(['composition'], 0, 'valid') as { packages: unknown[] };
    expect(composition).toMatchObject({
      minimumGitVersion: '2.32.0',
      repositoryFormatVersions: [1],
      supportedNodeRange: '>=22.17.0',
    });
    expect(composition.packages).toContainEqual({ name: '@moldea.ai/core', version: '10.0.1' });
    expect(run(['validate'], 0, 'valid')).toMatchObject({
      coverageCounts: { exportsPassed: 1 },
      page: {
        records: [{ kind: 'diagnostic', code: 'MOLDEA_INTEGRATION_BLOCK_MISSING' }],
      },
    });
    const inspection = run(['inspect'], 0, 'valid') as {
      page: { records: { path: string | null }[] };
    };
    expect(inspection).toMatchObject({
      counts: { agents: 1, coverage: 1, metadata: 4 },
    });
    expect(
      inspection.page.records.find(({ path }) => path === '/moldea/agents/support/instruction.md'),
    ).toMatchObject({
      kind: 'metadata',
      metadataKind: 'agent-instruction',
      agentId: 'support',
      byteLength: Buffer.byteLength(files['moldea/agents/support/instruction.md']),
    });
    expect(inspection).not.toHaveProperty('coverageCounts');
    expect(run(['scope', '--path', '/src/agent.ts'], 0, 'valid')).toMatchObject({
      relevant: true,
      page: {
        records: [
          {
            kind: 'match',
            ownerKind: 'agent',
            path: '/moldea/agents/support/instruction.md',
            relationships: [{ field: 'runtimeAgent', path: '/src/agent.ts' }],
          },
        ],
      },
    });
    expect(run(['content', '--path', '/moldea/project.md'], 0, 'valid')).toMatchObject({
      chunk: { content: files['moldea/project.md'] },
    });

    await writeFile(path.join(repository, 'moldea', 'moldea.yaml'), 'version: 1\nunknown: true\n');
    run(['validate'], 1, 'invalid');
    run(['inspect'], 1, 'invalid');
    run(['scope', '--path', '/src/agent.ts'], 1, 'invalid');
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
