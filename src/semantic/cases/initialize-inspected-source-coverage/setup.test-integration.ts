// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';

import { createActorRepository } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';
import { COVERAGE_FILES } from './fixtures.ts';

test('bounded onboarding can register and consume the instruction without peripheral relationships', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-coverage-'));
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
    const runTests = () =>
      spawnSync(process.execPath, ['--test', 'src/triage-agent.test-integration.js'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });
    const initial = runTests();
    expect(initial.status, initial.stderr).toBe(0);
    const instruction =
      'You are the `support-triage` agent. Classify the supplied support request for human review. Do not authorize refunds or payments.\n';
    await mkdir(join(repositoryPath, 'moldea/agents/support-triage'), { recursive: true });
    await mkdir(join(repositoryPath, 'moldea/runtimes'), { recursive: true });
    await writeFile(
      join(repositoryPath, 'moldea/project.md'),
      '# Support review service\n\nSupport Triage classifies supplied requests for human review. Humans authorize refunds and payments.\n',
    );
    await writeFile(
      join(repositoryPath, 'moldea/agents/support-triage/description.md'),
      'Classifies supplied support requests for human review.\n',
    );
    await writeFile(
      join(repositoryPath, 'moldea/agents/support-triage/instruction.md'),
      instruction,
    );
    await writeFile(
      join(repositoryPath, 'moldea/runtimes/custom.md'),
      '# Responses client\n\nThe injected client accepts input and instructions and returns its response. The agent loads its canonical instruction.\n',
    );
    await writeFile(
      join(repositoryPath, 'moldea/moldea.yaml'),
      'version: 1\nagents:\n  support-triage:\n    runtime:\n      id: custom\n      guidance: /moldea/runtimes/custom.md\n    bindings:\n      runtimeAgent:\n        path: /src/triage-agent.js\n        symbol: runTriage\n      instructionLoader:\n        path: /src/triage-agent.js\n        symbol: loadInstruction\n    affectedBy:\n      - /src/triage-agent.test-integration.js\n',
    );
    await writeFile(
      join(repositoryPath, 'src/triage-agent.js'),
      "import { readFileSync } from 'node:fs';\nexport const loadInstruction = () => readFileSync(new URL('../moldea/agents/support-triage/instruction.md', import.meta.url), 'utf8');\nexport const runTriage = (client, message) => client.responses.create({ input: message, instructions: loadInstruction() });\n",
    );
    await writeFile(
      join(repositoryPath, 'src/triage-agent.test-integration.js'),
      COVERAGE_FILES['src/triage-agent.test-integration.js']!.replace(
        'import { runTriage }',
        "import { readFileSync } from 'node:fs';\nimport { runTriage }",
      ).replace(
        '  assert.equal(calls.length, 1);',
        "  assert.equal(calls.length, 1);\n  assert.equal(calls[0].instructions, readFileSync(new URL('../moldea/agents/support-triage/instruction.md', import.meta.url), 'utf8'));",
      ),
    );
    const connected = runTests();
    expect(connected.status, connected.stderr).toBe(0);
    const pipeline = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import assert from 'node:assert/strict';
      import { runSupportPipeline } from './src/support-pipeline.js';
      const client = { responses: { create: async ({ input }) => {
        assert.deepEqual(input, { message: 'Help', context: [{ isCurrent: true }] });
        return { output_text: 'Human review' };
      } } };
      assert.deepEqual(await runSupportPipeline(client, ' Help ', [{ isCurrent: true }, { isCurrent: false }]), { summary: 'Human review' });
    `,
      ],
      { cwd: repositoryPath, encoding: 'utf8' },
    );
    expect(pipeline.status, pipeline.stderr).toBe(0);
    const launcher = join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs');
    const validation = spawnSync(
      process.execPath,
      [
        launcher,
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
    expect(validation.status, validation.stderr || validation.stdout).toBe(0);
    const result = z
      .object({ result: z.object({ valid: z.literal(true), errorCount: z.literal(0) }) })
      .parse(JSON.parse(validation.stdout));
    expect(result.result.valid).toBe(true);
    const manifest = await readFile(join(repositoryPath, 'moldea/moldea.yaml'), 'utf8');
    for (const relativePath of [
      'src/input.js',
      'src/context-selection.js',
      'src/output.js',
      'src/support-pipeline.js',
    ]) {
      expect(await readFile(join(repositoryPath, relativePath), 'utf8')).toBe(
        COVERAGE_FILES[relativePath],
      );
      expect(manifest).not.toContain(relativePath);
    }
    // Mutation proves the native assertion verifies actual consumption, not just a passing count.
    await writeFile(
      join(repositoryPath, 'moldea/agents/support-triage/instruction.md'),
      `${instruction}Use the updated escalation policy.\n`,
    );
    const changed = runTests();
    expect(changed.status, changed.stderr).toBe(0);
    await writeFile(
      join(repositoryPath, 'src/triage-agent.js'),
      COVERAGE_FILES['src/triage-agent.js']!,
    );
    expect(runTests().status).not.toBe(0);
  } finally {
    if (originalHome === undefined) delete process.env['CODEX_HOME'];
    else process.env['CODEX_HOME'] = originalHome;
    await rm(root, { recursive: true, force: true });
  }
});
