// @vitest-environment node
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { z } from 'zod';
import { describe, expect, test } from 'vitest';

import { assertReleaseIdentity } from '../../../../src/release/index.ts';

import {
  getLandingExampleFile,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_BEFORE_AGENT_FILES,
  LANDING_EXAMPLE_HERO_SOURCES,
  LANDING_EXAMPLE_DISCONNECTED_FILES,
  LANDING_EXAMPLE_INITIAL_FILES,
  LANDING_EXAMPLE_MAINTAINED_FILES,
  LANDING_EXAMPLE_MISSING_EXPORT_FILES,
  type ILandingExampleFiles,
} from './index.ts';

const MAX_PROCESS_OUTPUT_BYTES = 65_536;
const PROCESS_TIMEOUT_MS = 10_000;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const websiteRoot = path.join(repositoryRoot, 'website');
// release verification can exercise the same example against the complete installed candidate
const candidateSkillRoot = process.env['MOLDEA_CANDIDATE_SKILL_ROOT'];
const releaseRoot =
  candidateSkillRoot === undefined ? repositoryRoot : path.dirname(candidateSkillRoot);
const portableSkillRoot = candidateSkillRoot ?? path.join(repositoryRoot, 'moldea');
const releaseIdentity = assertReleaseIdentity(releaseRoot);
const cliPath = path.join(releaseRoot, 'node_modules', '@moldea.ai', 'cli', 'dist', 'moldea.js');

const CliRecordSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('coverage'),
    relationship: z.string(),
    path: z.string(),
    symbol: z.string().nullable(),
    fileCheck: z.literal('passed'),
    exportCheck: z.enum(['passed', 'failed', 'not-checked']),
  }),
  z.object({ kind: z.literal('diagnostic'), code: z.string() }),
  z.object({
    kind: z.literal('match'),
    match: z.object({ owner: z.object({ agentId: z.string().nullable(), id: z.string() }) }),
  }),
  z.object({ kind: z.enum(['agent', 'metadata']) }),
]);
const CliEnvelopeSchema = z.object({
  command: z.enum(['inspect', 'scope', 'validate']),
  error: z.unknown().nullable(),
  result: z.object({
    page: z.object({ records: z.array(CliRecordSchema) }),
    coverageCounts: z
      .object({
        bindings: z.number(),
        exportsPassed: z.number(),
        exportsFailed: z.number(),
        exportsNotChecked: z.number(),
      })
      .optional(),
    relevant: z.boolean().optional(),
    snapshotDigest: z.string(),
    valid: z.boolean(),
    warningCount: z.number().optional(),
  }),
  schemaVersion: z.literal(releaseIdentity.cliJsonSchemaVersion),
  status: z.enum(['invalid', 'valid']),
});

interface IProcessResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

/** Runs a bounded process without a command shell. */
const executeProcess = async (
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<IProcessResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: false });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let outputBytes = 0;
    let isSettled = false;

    const timeout = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      child.kill();
      reject(new Error('Landing example process timed out.'));
    }, PROCESS_TIMEOUT_MS);

    const rejectOnce = (error: Error): void => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeout);
      child.kill();
      reject(error);
    };

    const collect = (chunks: Buffer[], chunk: Buffer): void => {
      outputBytes += chunk.byteLength;
      if (outputBytes > MAX_PROCESS_OUTPUT_BYTES) {
        rejectOnce(new Error('Landing example process exceeded its output limit.'));
        return;
      }
      chunks.push(chunk);
    };

    child.stdout.on('data', (chunk: Buffer) => collect(stdoutChunks, chunk));
    child.stderr.on('data', (chunk: Buffer) => collect(stderrChunks, chunk));
    child.on('error', rejectOnce);
    child.on('close', (exitCode) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeout);
      resolve({
        exitCode: exitCode ?? -1,
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
      });
    });
  });

/** Writes one complete project snapshot below a disposable root. */
const writeFixture = async (root: string, files: ILandingExampleFiles): Promise<void> => {
  for (const [logicalPath, source] of Object.entries(files)) {
    const destination = path.join(root, ...logicalPath.slice(1).split('/'));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, source, 'utf8');
  }
};

/** Runs one CLI command and parses the response schema owned by the installed release. */
const runCli = async (root: string, args: readonly string[]) => {
  const processResult = await executeProcess(
    process.execPath,
    [cliPath, ...args, '--json', '--no-color'],
    root,
  );
  const envelope = CliEnvelopeSchema.parse(JSON.parse(processResult.stdout) as unknown);

  return { envelope, processResult };
};

/** Reads the fixture back into its repository-logical shape. */
const readFixture = async (
  root: string,
  expectedFiles: ILandingExampleFiles,
): Promise<ILandingExampleFiles> =>
  Object.fromEntries(
    await Promise.all(
      Object.keys(expectedFiles).map(
        async (logicalPath) =>
          [
            logicalPath,
            await readFile(path.join(root, ...logicalPath.slice(1).split('/')), 'utf8'),
          ] as const,
      ),
    ),
  );

/** Creates and removes one isolated Git repository around a test callback. */
const withFixture = async (
  files: ILandingExampleFiles,
  callback: (root: string) => Promise<void>,
): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-landing-'));
  try {
    await writeFixture(root, files);
    const skillPath = '.agents/skills/moldea';
    const managedAgentsTemplate = await readFile(
      path.join(portableSkillRoot, 'assets', 'managed-agents-block.md'),
      'utf8',
    );
    await writeFixture(root, {
      [`/${skillPath}/SKILL.md`]: await readFile(path.join(portableSkillRoot, 'SKILL.md'), 'utf8'),
      [`/${skillPath}/scripts/relevance-gate.mjs`]: await readFile(
        path.join(portableSkillRoot, 'scripts', 'relevance-gate.mjs'),
        'utf8',
      ),
      [`/${skillPath}/assets/managed-agents-block.md`]: managedAgentsTemplate,
      '/AGENTS.md': managedAgentsTemplate.replaceAll('{{skill-path}}', skillPath),
    });
    const gitResult = await executeProcess('git', ['init', '--quiet'], root);
    expect(gitResult.exitCode, gitResult.stderr).toBe(0);
    await callback(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
};

/** Executes the generated agent with real local modules and a fake OpenAI boundary. */
const runAgentScript = async (
  script: string,
  files: ILandingExampleFiles = LANDING_EXAMPLE_INITIAL_FILES,
): Promise<IProcessResult> => {
  const generatedRoot = path.join(websiteRoot, '.generated');
  await mkdir(generatedRoot, { recursive: true });
  const root = await mkdtemp(path.join(generatedRoot, 'landing-runtime-'));

  try {
    await writeFixture(root, files);
    for (const logicalPath of [
      LANDING_EXAMPLE.paths.agent,
      LANDING_EXAMPLE.paths.contracts,
      LANDING_EXAMPLE.paths.instructionLoader,
      LANDING_EXAMPLE.paths.orderLookup,
    ]) {
      const source = getLandingExampleFile(files, logicalPath);
      const javascript = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        fileName: logicalPath,
      }).outputText;
      await writeFile(
        path.join(root, ...logicalPath.slice(1).split('/')).replace(/\.ts$/u, '.js'),
        javascript,
      );
    }

    const openAiRoot = path.join(root, 'node_modules', 'openai');
    await mkdir(path.join(openAiRoot, 'helpers'), { recursive: true });
    await writeFile(
      path.join(openAiRoot, 'package.json'),
      JSON.stringify({
        name: 'openai',
        type: 'module',
        exports: { '.': './index.js', './helpers/zod': './helpers/zod.js' },
      }),
    );
    await writeFile(
      path.join(openAiRoot, 'index.js'),
      `export default class OpenAI {
  static requests = [];
  static results = [];

  constructor() {
    this.responses = {
      create: async (request) => {
        OpenAI.requests.push(request);
        if (OpenAI.results.length === 0) throw new Error('No fake OpenAI response queued.');
        return OpenAI.results.shift();
      },
    };
  }
}
`,
    );
    await writeFile(
      path.join(openAiRoot, 'helpers', 'zod.js'),
      'export const zodTextFormat = (_schema, name) => ({ name });\n',
    );
    await writeFile(path.join(root, 'run.mjs'), script);
    return await executeProcess(process.execPath, ['run.mjs'], root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
};

describe('landing example fixture', () => {
  test('looks up the requested order and returns the bounded model continuation', async () => {
    const result = await runAgentScript(`import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { supportAgent } from './src/agent.js';

OpenAI.results = [
  { id: 'response-1', output: [{ type: 'function_call', name: 'lookup_order', call_id: 'call-1', arguments: '{"orderId":"order-1042"}' }] },
  { id: 'response-2', output: [{ type: 'message' }] },
];

const response = await supportAgent({ message: 'Where is my order?', orderId: 'order-1042' });
assert.equal(response.id, 'response-2');
assert.equal(OpenAI.requests.length, 2);
assert.equal(OpenAI.requests[0].parallel_tool_calls, false);
assert.equal(OpenAI.requests[0].text.format.name, 'support');
assert.equal(OpenAI.requests[1].previous_response_id, 'response-1');
assert.equal(OpenAI.requests[1].tool_choice, 'none');
assert.deepEqual(OpenAI.requests[1].input, [{
  type: 'function_call_output',
  call_id: 'call-1',
  output: '{"orderId":"order-1042","status":"shipped"}',
}]);
assert.equal(OpenAI.requests[1].instructions, OpenAI.requests[0].instructions);
assert.match(OpenAI.requests[1].instructions, /application decides eligibility/);
`);
    expect(result.exitCode, result.stderr).toBe(0);
  });

  test('returns a direct answer without calling the order lookup', async () => {
    const result = await runAgentScript(`import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { supportAgent } from './src/agent.js';

OpenAI.results = [{ id: 'response-1', output: [{ type: 'message' }] }];
const response = await supportAgent({ message: 'What is your refund window?', orderId: null });
assert.equal(response.id, 'response-1');
assert.equal(OpenAI.requests.length, 1);
`);
    expect(result.exitCode, result.stderr).toBe(0);
  });

  test('rejects invalid lookup arguments before sending a tool result', async () => {
    const result = await runAgentScript(`import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { supportAgent } from './src/agent.js';

OpenAI.results = [{ id: 'response-1', output: [{ type: 'function_call', name: 'lookup_order', call_id: 'call-1', arguments: '{"orderId":123}' }] }];
await assert.rejects(supportAgent({ message: 'Where is my order?', orderId: 'order-1042' }));
assert.equal(OpenAI.requests.length, 1);
`);
    expect(result.exitCode, result.stderr).toBe(0);
  });

  test('keeps concise hero excerpts grounded in the current source', () => {
    for (const [logicalPath, excerpt] of Object.entries(LANDING_EXAMPLE_HERO_SOURCES)) {
      const sourceLines = getLandingExampleFile(LANDING_EXAMPLE_INITIAL_FILES, logicalPath)
        .split('\n')
        .map((line) => line.trim())
        .join('\n');
      const excerptLines = excerpt.split('\n');
      expect(excerptLines.length).toBeGreaterThan(0);
      expect(excerptLines.length).toBeLessThanOrEqual(8);
      expect(sourceLines).toContain(excerptLines.map((line) => line.trim()).join('\n'));
      expect(excerpt).not.toMatch(/^import |^export type |^@@|^[+-]/mu);
    }
    for (const [logicalPath, before] of Object.entries(LANDING_EXAMPLE_BEFORE_AGENT_FILES)) {
      const current = getLandingExampleFile(LANDING_EXAMPLE_INITIAL_FILES, logicalPath);
      if (
        logicalPath === LANDING_EXAMPLE.paths.policyContext ||
        logicalPath === LANDING_EXAMPLE.paths.project
      )
        expect(current).toBe(before);
      else expect(current).not.toBe(before);
    }
  });

  test('validates the coherent project and reports only the completed file and export checks', async () => {
    await withFixture(LANDING_EXAMPLE_MAINTAINED_FILES, async (root) => {
      const before = await readFixture(root, LANDING_EXAMPLE_MAINTAINED_FILES);
      const firstInspection = await runCli(root, ['inspect']);
      const secondInspection = await runCli(root, ['inspect']);
      const validation = await runCli(root, ['validate']);
      const coverage = firstInspection.envelope.result.page.records
        .filter((record) => record.kind === 'coverage')
        .sort((left, right) => left.relationship.localeCompare(right.relationship));

      expect(firstInspection.processResult.exitCode).toBe(0);
      expect(firstInspection.envelope.status).toBe('valid');
      expect(coverage).toStrictEqual([
        {
          kind: 'coverage',
          relationship: 'instruction-loader',
          path: LANDING_EXAMPLE.paths.instructionLoader,
          symbol: 'loadSupportInstruction',
          fileCheck: 'passed',
          exportCheck: 'passed',
        },
        {
          kind: 'coverage',
          relationship: 'runtime-agent',
          path: LANDING_EXAMPLE.paths.agent,
          symbol: 'supportAgent',
          fileCheck: 'passed',
          exportCheck: 'passed',
        },
        {
          kind: 'coverage',
          relationship: 'tool-implementation',
          path: LANDING_EXAMPLE.paths.orderLookup,
          symbol: 'lookupOrder',
          fileCheck: 'passed',
          exportCheck: 'passed',
        },
        {
          kind: 'coverage',
          relationship: 'tool-registration',
          path: LANDING_EXAMPLE.paths.orderLookup,
          symbol: 'lookupOrderTool',
          fileCheck: 'passed',
          exportCheck: 'passed',
        },
      ]);
      expect(firstInspection.envelope.result.coverageCounts).toStrictEqual({
        bindings: 4,
        exportsPassed: 4,
        exportsFailed: 0,
        exportsNotChecked: 0,
      });
      expect(
        firstInspection.envelope.result.page.records.filter(({ kind }) => kind === 'diagnostic'),
      ).toStrictEqual([]);
      expect(validation.processResult.exitCode).toBe(0);
      expect(validation.envelope.result.valid).toBe(true);
      expect(validation.envelope.result.warningCount).toBe(0);
      expect(secondInspection.envelope.result.snapshotDigest).toBe(
        firstInspection.envelope.result.snapshotDigest,
      );
      expect(await readFixture(root, LANDING_EXAMPLE_MAINTAINED_FILES)).toStrictEqual(before);
    });
  });

  test('detects and repairs a missing declared instruction-loader export', async () => {
    await withFixture(LANDING_EXAMPLE_MISSING_EXPORT_FILES, async (root) => {
      const missingExport = await runCli(root, ['inspect']);
      const missingExportRecords = missingExport.envelope.result.page.records;

      expect(missingExport.processResult.exitCode).toBe(1);
      expect(missingExport.envelope.status).toBe('invalid');
      expect(
        missingExportRecords
          .filter((record) => record.kind === 'diagnostic')
          .map(({ code }) => code),
      ).toStrictEqual([LANDING_EXAMPLE.diagnostic]);
      expect(
        missingExportRecords.find(
          (record) => record.kind === 'coverage' && record.relationship === 'instruction-loader',
        ),
      ).toStrictEqual({
        kind: 'coverage',
        relationship: 'instruction-loader',
        path: LANDING_EXAMPLE.paths.instructionLoader,
        symbol: 'loadSupportInstruction',
        fileCheck: 'passed',
        exportCheck: 'failed',
      });
      expect(missingExport.envelope.result.coverageCounts).toStrictEqual({
        bindings: 4,
        exportsPassed: 3,
        exportsFailed: 1,
        exportsNotChecked: 0,
      });

      await writeFile(
        path.join(root, 'src', 'instructions.ts'),
        getLandingExampleFile(
          LANDING_EXAMPLE_MAINTAINED_FILES,
          LANDING_EXAMPLE.paths.instructionLoader,
        ),
        'utf8',
      );
      const repaired = await runCli(root, ['inspect']);
      const repairedRecords = repaired.envelope.result.page.records;

      expect(repaired.processResult.exitCode).toBe(0);
      const repairedDiagnostics = repairedRecords.filter(({ kind }) => kind === 'diagnostic');
      expect(repairedDiagnostics).toStrictEqual([]);
      expect(repaired.envelope.result.coverageCounts).toStrictEqual({
        bindings: 4,
        exportsPassed: 4,
        exportsFailed: 0,
        exportsNotChecked: 0,
      });
    });
  });

  test('does not infer runtime instruction wiring from passing file and export checks', async () => {
    await withFixture(LANDING_EXAMPLE_DISCONNECTED_FILES, async (root) => {
      const inspection = await runCli(root, ['inspect']);
      expect(inspection.processResult.exitCode).toBe(0);
      expect(inspection.envelope.result.coverageCounts).toStrictEqual({
        bindings: 4,
        exportsPassed: 4,
        exportsFailed: 0,
        exportsNotChecked: 0,
      });
      expect(
        inspection.envelope.result.page.records.filter(({ kind }) => kind === 'diagnostic'),
      ).toStrictEqual([]);
    });
    const runtime = await runAgentScript(
      `import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { supportAgent } from './src/agent.js';

OpenAI.results = [{ id: 'response-1', output: [{ type: 'message' }] }];
await supportAgent({ message: 'What is your refund window?', orderId: null });
assert.equal(OpenAI.requests[0].instructions, 'Be helpful.');
`,
      LANDING_EXAMPLE_DISCONNECTED_FILES,
    );
    expect(runtime.exitCode, runtime.stderr).toBe(0);
  });

  test('matches only declared application and policy paths', async () => {
    await withFixture(LANDING_EXAMPLE_MAINTAINED_FILES, async (root) => {
      for (const logicalPath of [
        LANDING_EXAMPLE.paths.refundPolicy,
        LANDING_EXAMPLE.paths.policyContext,
        LANDING_EXAMPLE.paths.contracts,
      ]) {
        const { envelope, processResult } = await runCli(root, ['scope', '--path', logicalPath]);
        expect(processResult.exitCode).toBe(0);
        expect(envelope.result.relevant).toBe(true);
        expect(
          envelope.result.page.records
            .filter((record) => record.kind === 'match')
            .map(({ match }) => match.owner.agentId),
        ).toContain('support');
      }

      const unrelated = await runCli(root, ['scope', '--path', '/src/catalog.ts']);
      expect(unrelated.processResult.exitCode).toBe(0);
      expect(unrelated.envelope.result.relevant).toBe(false);
    });
  });

  test('executes both rule boundaries and catches an unchanged implementation', async () => {
    for (const logicalPath of [
      LANDING_EXAMPLE.paths.instructionLoader,
      LANDING_EXAMPLE.paths.orderLookup,
      LANDING_EXAMPLE.paths.contracts,
      LANDING_EXAMPLE.paths.agentDescription,
    ]) {
      expect(getLandingExampleFile(LANDING_EXAMPLE_MAINTAINED_FILES, logicalPath)).toBe(
        getLandingExampleFile(LANDING_EXAMPLE_INITIAL_FILES, logicalPath),
      );
    }
    for (const logicalPath of [
      LANDING_EXAMPLE.paths.refundPolicy,
      LANDING_EXAMPLE.paths.refundPolicyTest,
      LANDING_EXAMPLE.paths.policyContext,
      LANDING_EXAMPLE.paths.instruction,
    ]) {
      expect(getLandingExampleFile(LANDING_EXAMPLE_MAINTAINED_FILES, logicalPath)).not.toBe(
        getLandingExampleFile(LANDING_EXAMPLE_INITIAL_FILES, logicalPath),
      );
    }

    await withFixture(LANDING_EXAMPLE_INITIAL_FILES, async (root) => {
      const original = await executeProcess(
        process.execPath,
        ['--experimental-strip-types', '--test', 'src/refund-policy.test-unit.ts'],
        root,
      );
      expect(original.exitCode, original.stderr).toBe(0);

      await writeFile(
        path.join(root, 'src', 'refund-policy.test-unit.ts'),
        getLandingExampleFile(
          LANDING_EXAMPLE_MAINTAINED_FILES,
          LANDING_EXAMPLE.paths.refundPolicyTest,
        ),
        'utf8',
      );
      const staleImplementation = await executeProcess(
        process.execPath,
        ['--experimental-strip-types', '--test', 'src/refund-policy.test-unit.ts'],
        root,
      );
      expect(staleImplementation.exitCode).toBe(1);

      await writeFile(
        path.join(root, 'src', 'refund-policy.ts'),
        getLandingExampleFile(LANDING_EXAMPLE_MAINTAINED_FILES, LANDING_EXAMPLE.paths.refundPolicy),
        'utf8',
      );
      const maintained = await executeProcess(
        process.execPath,
        ['--experimental-strip-types', '--test', 'src/refund-policy.test-unit.ts'],
        root,
      );
      expect(maintained.exitCode, maintained.stderr).toBe(0);
    });
  });
});
