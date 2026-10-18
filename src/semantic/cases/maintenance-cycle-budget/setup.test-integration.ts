// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';

import { createActorRepository } from '../../workspace/index.ts';

import { semanticCase } from './case.ts';
import { createReviewPolicy, REVIEW_DOMAINS } from './fixtures.ts';

const EnvelopeSchema = z.object({
  status: z.literal('valid'),
  result: z.object({
    cursor: z.string().nullable(),
    chunk: z.object({ content: z.string() }),
  }),
});

test('distinct complete policy pages exceed one output allowance while each scoped review fits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-cycle-fixture-'));
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
    const responseDirectory = join(root, 'responses');
    await mkdir(responseDirectory, { mode: 0o700 });
    const launcher = join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs');
    const call = (args: string[], input?: string) => {
      const result = spawnSync(
        process.execPath,
        [
          launcher,
          '--repository',
          repositoryPath,
          '--',
          ...args,
          '--json',
          '--max-output-bytes',
          '65536',
        ],
        { encoding: 'utf8', input, maxBuffer: 65536 },
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(65536);
      return result.stdout;
    };
    const cycleBytes: number[] = [];
    for (const [index, domain] of REVIEW_DOMAINS.entries()) {
      let calls = 1;
      let bytes = Buffer.byteLength(
        call(['scope', '--paths-stdin'], `reports/${domain.id}-review.md\0`),
      );
      const savedPage = join(responseDirectory, `${domain.id}.json`);
      let cursor: string | null = null;
      let contentBytes = 0;
      let content = '';
      do {
        const output = call([
          'content',
          '--path',
          `/moldea/context/${domain.id}.md`,
          '--save-response',
          savedPage,
          ...(calls > 1 ? ['--cursor-from-response', savedPage] : []),
        ]);
        const envelope = EnvelopeSchema.parse(JSON.parse(output));
        cursor = envelope.result.cursor;
        content += envelope.result.chunk.content;
        contentBytes += Buffer.byteLength(output);
        calls++;
        expect(calls).toBeLessThan(semanticCase.resourceBudget.maximumMoldeaCommands);
      } while (cursor !== null);
      expect(contentBytes).toBeGreaterThan(Buffer.byteLength(createReviewPolicy(index)));
      expect(content).toBe(createReviewPolicy(index));
      bytes += contentBytes + Buffer.byteLength(call(['validate']));
      calls++;
      expect(calls).toBeLessThanOrEqual(semanticCase.resourceBudget.maximumMoldeaCommands);
      expect(calls).toBeGreaterThanOrEqual(7);
      expect(calls).toBeLessThanOrEqual(8);
      expect(bytes).toBeGreaterThanOrEqual(190_000);
      expect(bytes).toBeLessThanOrEqual(200_000);
      expect(bytes).toBeLessThan(semanticCase.resourceBudget.maximumMoldeaOutputBytes / 2);
      cycleBytes.push(bytes);
      const policy = createReviewPolicy(index);
      expect(Buffer.byteLength(policy)).toBeGreaterThanOrEqual(190_000);
      expect(Buffer.byteLength(policy)).toBeLessThanOrEqual(200_000);
      expect(policy.match(/^\| (?:returns|invoices|support)-\d{3,4} /gmu)).toHaveLength(696);
      expect(policy).toContain(`| ${domain.id}-696 |`);
      const rows = policy
        .split('\n')
        .filter((line) => line.startsWith(`| ${domain.id}-`))
        .map((line) => line.split(' | '));
      const deadlines = rows.map((row) => Number(row[5]));
      expect([Math.min(...deadlines), Math.max(...deadlines)]).toStrictEqual([7, 60]);
      expect(rows.filter((row) => row[7] === 'yes')).toHaveLength([140, 116, 100][index]!);
    }
    const totalBytes = cycleBytes.reduce((total, bytes) => total + bytes, 0);
    expect(totalBytes).toBeGreaterThan(524_288);
    expect(totalBytes).toBeGreaterThanOrEqual(580_000);
    expect(totalBytes).toBeLessThanOrEqual(600_000);
    expect(semanticCase.input.followUpDeveloperRequests).toHaveLength(2);
    expect(semanticCase.input.followUpDeveloperRequests[0]).toMatch(/^Continue/u);
  } finally {
    if (originalHome === undefined) delete process.env['CODEX_HOME'];
    else process.env['CODEX_HOME'] = originalHome;
    await rm(root, { recursive: true, force: true });
  }
});
