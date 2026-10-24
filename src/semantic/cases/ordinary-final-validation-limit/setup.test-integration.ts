// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPathWithin } from 'jg-fs';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import { projectCodexEvaluationExecutionEvidence } from '../../../execution/host/index.ts';
import { createSemanticCliIdentity } from '../../../release/index.ts';
import {
  type ISemanticActorExecutionEvidence,
  createMoldeaResourceEvidence,
  createSemanticResultDimensions,
  projectActorExecutionEvidenceEvent,
} from '../../execution/index.ts';
import { buildSemanticActorPrompt } from '../../judging/index.ts';
import {
  createActorRepository,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
} from '../../workspace/index.ts';

import { semanticCase } from './case.ts';
import { CONTRACT_COUNT, createBoundaryLedger } from './fixtures.ts';

const PageSchema = z.object({
  status: z.literal('valid'),
  result: z.object({ cursor: z.string().nullable(), chunk: z.object({ content: z.string() }) }),
});

test('real content pages and final validation straddle the unchanged ordinary allowance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-final-limit-'));
  try {
    await mkdir(join(root, 'source-home'));
    vi.stubEnv('CODEX_HOME', join(root, 'source-home'));
    const { repositoryPath } = await createActorRepository(
      root,
      semanticCase,
      join(root, 'home'),
      join(root, 'tools'),
    );
    const before = await snapshotSemanticWorkspace(repositoryPath);
    const actorPrompt = buildSemanticActorPrompt(semanticCase);
    expect(actorPrompt).toContain('moldea/context/contracts.md');
    expect(actorPrompt).toContain(
      await readFile(join(repositoryPath, 'moldea/project.md'), 'utf8'),
    );
    const events: unknown[] = [];
    const captures: ISemanticActorExecutionEvidence[] = [];
    const { version: cliVersion, jsonSchemaVersion } = createSemanticCliIdentity(
      join(import.meta.dirname, '../../../..'),
    );
    const cliIdentity = { cliVersion, jsonSchemaVersion };
    const runHelper = (filename: string, args: string[]) => {
      const result = spawnSync(
        process.execPath,
        [
          join(repositoryPath, '.agents/skills/moldea/scripts', filename),
          '--repository',
          repositoryPath,
          ...args,
        ],
        {
          encoding: 'utf8',
          timeout: 10_000,
          maxBuffer: 65536,
          env: { ...process.env, TMPDIR: root, TMP: root, TEMP: root },
        },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);
      events.push({
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: `node /mnt/.agents/skills/moldea/scripts/${filename} --repository /mnt ${args.join(' ')}`,
          aggregated_output: result.stdout,
          exit_code: 0,
          status: 'completed',
        },
      });
      return result.stdout;
    };
    const call = (args: string[]) => {
      const result = spawnSync(
        process.execPath,
        [
          join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
          '--repository',
          repositoryPath,
          '--',
          ...args,
          '--json',
          '--max-output-bytes',
          '65536',
        ],
        { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(65536);
      const event = {
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: `node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt -- ${args.join(' ')} --json --max-output-bytes 65536`,
          aggregated_output: result.stdout,
          exit_code: 0,
          status: 'completed',
        },
      };
      events.push(event);
      const capture = projectActorExecutionEvidenceEvent(event, cliIdentity);
      if (!capture) throw new Error('Missing launcher projection');
      captures.push(capture);
      return result.stdout;
    };
    const gateOutput = runHelper('relevance-gate.mjs', ['--adoption-only']);
    expect(gateOutput).toBe('1\n');
    const directoryOutput = runHelper('response-directory.mjs', []);
    const responseDirectory = directoryOutput.trim();
    expect(responseDirectory).not.toBe(root);
    expect(isPathWithin(root, responseDirectory)).toBe(true);
    const saved = join(responseDirectory, 'page.json');
    let cursor: string | null = null;
    let content = '';
    let pages = 0;
    let beforeValidationBytes = Buffer.byteLength(gateOutput) + Buffer.byteLength(directoryOutput);
    do {
      const output = call([
        'content',
        '--path',
        '/moldea/context/contracts.md',
        '--save-response',
        saved,
        ...(pages ? ['--cursor-from-response', saved] : []),
      ]);
      beforeValidationBytes += Buffer.byteLength(output);
      const page = PageSchema.parse(JSON.parse(output));
      content += page.result.chunk.content;
      cursor = page.result.cursor;
      pages++;
      expect(pages).toBeLessThanOrEqual(16);
    } while (cursor !== null);
    expect(content).toBe(createBoundaryLedger());
    expect(CONTRACT_COUNT).toBe(2857);
    const rows = content.split('\n').filter((line) => line.startsWith('| contract-'));
    expect(rows).toHaveLength(2857);
    const deadlines = rows.map((row) => Number(row.split(' | ')[4]));
    expect([Math.min(...deadlines), Math.max(...deadlines)]).toStrictEqual([7, 60]);
    expect(pages).toBe(16);
    await writeFile(
      join(repositoryPath, 'moldea/project.md'),
      '# Contract review service\n\nThere are 2857 active contracts with review deadlines from 7 through 60 days. Human reviewers retain refund approval.\n',
    );
    events.push({
      type: 'item.completed',
      item: {
        type: 'file_change',
        status: 'completed',
        changes: [{ path: '/mnt/moldea/project.md', kind: 'update' }],
      },
    });
    const validation = call(['validate']);
    expect(JSON.parse(validation)).toMatchObject({
      status: 'valid',
      result: { errorCount: 0, warningCount: 0 },
    });
    expect(beforeValidationBytes).toBeLessThanOrEqual(524288);
    expect(beforeValidationBytes + Buffer.byteLength(validation)).toBeGreaterThan(524288);
    const commandPolicy = projectCodexEvaluationExecutionEvidence(
      events.map((event) => JSON.stringify(event)).join('\n'),
    ).commandPolicy;
    const changes = diffSemanticWorkspaceSnapshots(
      before,
      await snapshotSemanticWorkspace(repositoryPath),
    );
    expect(changes.modified.map(({ path }) => path)).toStrictEqual(['moldea/project.md']);
    const dimensions = createSemanticResultDimensions({
      actorCommandPolicy: commandPolicy,
      actorExecutionEvidence: captures,
      actorResourceEvidence: createMoldeaResourceEvidence(captures, cliIdentity),
      caseDefinition: semanticCase,
      gitInvocationEvidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: projectCodexEvaluationExecutionEvidence('').commandPolicy,
      workspaceChanges: changes,
    });
    expect(dimensions.resource).toBe(true);
    expect(dimensions.semantic).toBe(true);
    expect(await readFile(join(repositoryPath, 'moldea/context/contracts.md'), 'utf8')).toBe(
      content,
    );
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});
