// @vitest-environment node
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { describe, expect, test } from 'vitest';

import {
  getLandingExampleFile,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_DISCONNECTED_FILES,
  LANDING_EXAMPLE_INITIAL_FILES,
  LANDING_EXAMPLE_MAINTAINED_FILES,
  type ILandingExampleFiles,
} from './index.ts';

const MAX_PROCESS_OUTPUT_BYTES = 65_536;
const PROCESS_TIMEOUT_MS = 10_000;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const cliPath = path.join(repositoryRoot, 'node_modules', '@moldea.ai', 'cli', 'dist', 'moldea.js');

const CliRecordSchema = z.object({
  code: z.string().optional(),
  evidenceKind: z.string().optional(),
  kind: z.enum(['agent', 'diagnostic', 'evidence', 'match', 'metadata']),
  match: z
    .object({ owner: z.object({ agentId: z.string().nullable(), id: z.string() }) })
    .optional(),
});
const CliEnvelopeSchema = z.object({
  command: z.enum(['inspect', 'scope', 'validate']),
  error: z.unknown().nullable(),
  result: z.object({
    page: z.object({ records: z.array(CliRecordSchema) }),
    relevant: z.boolean().optional(),
    snapshotDigest: z.string(),
    valid: z.boolean(),
  }),
  schemaVersion: z.literal(4),
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

/** Runs one CLI command and parses its schema-4 response. */
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
    const gitResult = await executeProcess('git', ['init', '--quiet'], root);
    expect(gitResult.exitCode, gitResult.stderr).toBe(0);
    await callback(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
};

describe('landing example fixture', () => {
  test('validates the coherent project and preserves positive source evidence', async () => {
    await withFixture(LANDING_EXAMPLE_MAINTAINED_FILES, async (root) => {
      const before = await readFixture(root, LANDING_EXAMPLE_MAINTAINED_FILES);
      const firstInspection = await runCli(root, ['inspect']);
      const secondInspection = await runCli(root, ['inspect']);
      const validation = await runCli(root, ['validate']);
      const evidenceKinds = firstInspection.envelope.result.page.records
        .filter(({ kind }) => kind === 'evidence')
        .map(({ evidenceKind }) => evidenceKind);

      expect(firstInspection.processResult.exitCode).toBe(0);
      expect(firstInspection.envelope.status).toBe('valid');
      expect(evidenceKinds).toEqual(
        expect.arrayContaining(['instruction-loader', 'tool-registration']),
      );
      expect(validation.processResult.exitCode).toBe(0);
      expect(validation.envelope.result.valid).toBe(true);
      expect(secondInspection.envelope.result.snapshotDigest).toBe(
        firstInspection.envelope.result.snapshotDigest,
      );
      expect(await readFixture(root, LANDING_EXAMPLE_MAINTAINED_FILES)).toStrictEqual(before);
    });
  });

  test('detects and repairs a disconnected instruction loader', async () => {
    await withFixture(LANDING_EXAMPLE_DISCONNECTED_FILES, async (root) => {
      const disconnected = await runCli(root, ['inspect']);
      const disconnectedRecords = disconnected.envelope.result.page.records;

      expect(disconnected.processResult.exitCode).toBe(1);
      expect(disconnected.envelope.status).toBe('invalid');
      expect(
        disconnectedRecords.filter(({ kind }) => kind === 'diagnostic').map(({ code }) => code),
      ).toContain(LANDING_EXAMPLE.diagnostic);
      expect(
        disconnectedRecords
          .filter(({ kind }) => kind === 'evidence')
          .map(({ evidenceKind }) => evidenceKind),
      ).toContain('tool-registration');

      await writeFile(
        path.join(root, 'src', 'agent.ts'),
        getLandingExampleFile(LANDING_EXAMPLE_MAINTAINED_FILES, LANDING_EXAMPLE.paths.agent),
        'utf8',
      );
      const repaired = await runCli(root, ['inspect']);
      const repairedRecords = repaired.envelope.result.page.records;

      expect(repaired.processResult.exitCode).toBe(0);
      expect(repairedRecords.filter(({ kind }) => kind === 'diagnostic')).toStrictEqual([]);
      expect(
        repairedRecords
          .filter(({ kind }) => kind === 'evidence')
          .map(({ evidenceKind }) => evidenceKind),
      ).toContain('instruction-loader');
    });
  });

  test('matches only declared application and policy paths', async () => {
    await withFixture(LANDING_EXAMPLE_MAINTAINED_FILES, async (root) => {
      for (const logicalPath of [
        LANDING_EXAMPLE.paths.refundPolicy,
        LANDING_EXAMPLE.paths.policyContext,
      ]) {
        const { envelope, processResult } = await runCli(root, ['scope', '--path', logicalPath]);
        expect(processResult.exitCode).toBe(0);
        expect(envelope.result.relevant).toBe(true);
        expect(
          envelope.result.page.records
            .filter(({ kind }) => kind === 'match')
            .map(({ match }) => match?.owner.agentId),
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
