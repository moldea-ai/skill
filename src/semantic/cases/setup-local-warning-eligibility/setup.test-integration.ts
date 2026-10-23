// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readIndexEntries } from 'jg-git-commands';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

import { buildCodexEvaluationBwrapArguments } from '../../../execution/host/index.ts';
import { createActorRepository } from '../../workspace/index.ts';
import { loadSemanticCases } from '../index.ts';

const ValidationSchema = z.object({
  status: z.literal('valid'),
  result: z.object({
    errorCount: z.literal(0),
    warningCount: z.number(),
    acceptedWarningCount: z.number(),
    page: z.object({
      records: z.array(
        z.object({
          kind: z.string(),
          code: z.string().optional(),
          subject: z.string().optional(),
          qualifier: z.string().nullable().optional(),
          acceptable: z.boolean().optional(),
          accepted: z.boolean().optional(),
          reason: z.string().nullable().optional(),
        }),
      ),
    }),
  }),
});

test.each([
  'setup-local-warning-eligibility',
  'setup-shared-claude-precedence',
  'setup-tracked-warning-acceptance',
])(
  '%s materializes its actual warning subjects, Git storage and supported resolution',
  async (id) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-warning-eligibility-'));
    try {
      const sourceHome = join(root, 'source-home');
      await mkdir(sourceHome);
      vi.stubEnv('CODEX_HOME', sourceHome);
      const definition = (await loadSemanticCases(join(import.meta.dirname, '..'))).find(
        (entry) => entry.id === id,
      );
      if (!definition) throw new Error('Missing integration warning case');
      const { repositoryPath, readOnlyMounts } = await createActorRepository(
        root,
        definition,
        join(root, 'home'),
        join(root, 'tools'),
      );
      const scripts = join(repositoryPath, '.agents/skills/moldea/scripts');
      const run = (filename: string, args: string[]) => {
        const result = spawnSync(
          process.execPath,
          [join(scripts, filename), '--repository', repositoryPath, ...args],
          { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
        );
        expect(result.status, result.stderr || result.stdout).toBe(0);
        return result.stdout;
      };
      const validate = () =>
        ValidationSchema.parse(
          JSON.parse(
            run('moldea-cli.mjs', ['--', 'validate', '--json', '--max-output-bytes', '65536']),
          ),
        );
      const beforeAgents = await readFile(join(repositoryPath, 'AGENTS.md'));
      const beforeIgnore = await readFile(join(repositoryPath, '.gitignore'));
      const initial = validate();
      expect(initial.result.acceptedWarningCount).toBe(0);
      expect(
        (await readFile(join(repositoryPath, 'moldea/moldea.yaml'), 'utf8')).includes(
          'acceptedWarnings',
        ),
      ).toBe(false);
      if (id === 'setup-local-warning-eligibility') {
        expect(initial.result.warningCount).toBe(2);
        expect(initial.result.page.records).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MOLDEA_INTEGRATION_BLOCK_MISSING',
              subject: '/AGENTS.md',
            }),
            expect.objectContaining({
              code: 'MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING',
              subject: '/CLAUDE.local.md',
            }),
          ]),
        );
        expect(
          await readIndexEntries(repositoryPath, { paths: ['AGENTS.md', 'CLAUDE.local.md'] }),
        ).toStrictEqual([]);
        expect(beforeIgnore.toString('utf8')).toContain('AGENTS.md\nCLAUDE.local.md\n');
        expect(run('managed-agents.mjs', ['--claude', '/CLAUDE.local.md', '--print'])).toBe(
          '@AGENTS.md\n',
        );
      } else if (id === 'setup-shared-claude-precedence') {
        expect(initial.result.warningCount).toBe(1);
        expect(initial.result.page.records).toContainEqual(
          expect.objectContaining({
            code: 'MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING',
            subject: '/.claude/CLAUDE.md',
          }),
        );
        expect(existsSync(join(repositoryPath, 'CLAUDE.md'))).toBe(false);
        const localBefore = await readFile(join(repositoryPath, 'CLAUDE.local.md'));
        expect(localBefore.toString('utf8')).toContain('@AGENTS.md');
        expect(
          await readIndexEntries(repositoryPath, { paths: ['.claude/CLAUDE.md'] }),
        ).toMatchObject([{ path: '.claude/CLAUDE.md', stage: 0 }]);
        const sharedBefore = await readFile(join(repositoryPath, '.claude/CLAUDE.md'), 'utf8');
        expect(run('managed-agents.mjs', ['--claude', '/.claude/CLAUDE.md', '--print'])).toBe(
          '@../AGENTS.md\n',
        );
        expect(await readFile(join(repositoryPath, '.claude/CLAUDE.md'), 'utf8')).toBe(
          sharedBefore,
        );
        // this disposable resolution control is not an actor write or a semantic pass
        expect(run('managed-agents.mjs', ['--claude', '/.claude/CLAUDE.md'])).toBe('updated\n');
        expect(await readFile(join(repositoryPath, '.claude/CLAUDE.md'), 'utf8')).toBe(
          sharedBefore + '@../AGENTS.md\n',
        );
        expect(validate().result.warningCount).toBe(0);
        expect(await readFile(join(repositoryPath, 'CLAUDE.local.md'))).toStrictEqual(localBefore);
      } else {
        expect(initial.result.warningCount).toBe(1);
        expect(initial.result.page.records).toContainEqual(
          expect.objectContaining({
            code: 'MOLDEA_INTEGRATION_BLOCK_MISSING',
            subject: '/AGENTS.md',
            qualifier: null,
            acceptable: true,
          }),
        );
        expect(await readIndexEntries(repositoryPath, { paths: ['AGENTS.md'] })).toMatchObject([
          { path: 'AGENTS.md', stage: 0 },
        ]);
        const probe = definition.input.developerDirection.split(
          "The host's bounded index probe is: ",
        )[1];
        if (!probe) throw new Error('Missing bounded fixture index probe');
        const argumentsList = probe.split(' ');
        expect(argumentsList.shift()).toBe('git');
        const boundedIndex = spawnSync(
          'bwrap',
          buildCodexEvaluationBwrapArguments({
            command: [
              'codex',
              '-e',
              `const result = require('node:child_process').spawnSync('git', ${JSON.stringify(argumentsList)}, {stdio:'inherit',env:{...process.env,MOLDEA_EVAL_MODEL_COMMAND:'1'}}); process.exitCode=result.status??1;`,
            ],
            cwd: repositoryPath,
            hostExecutable: process.execPath,
            nodeExecutable: process.execPath,
            includeWorkspaceBinaryDirectory: true,
            readOnlyWorkspacePaths: ['.agents', '.git'],
            readOnlyMounts,
            sandboxHome: join(root, 'home'),
          }),
          { encoding: 'utf8', timeout: 10_000, maxBuffer: 65536 },
        );
        expect(boundedIndex.status, boundedIndex.stderr).toBe(0);
        expect(boundedIndex.stdout).toMatch(
          /^100644 [a-f0-9]{40}(?:[a-f0-9]{24})? 0\tAGENTS\.md\0$/u,
        );
        await appendFile(
          join(repositoryPath, 'moldea/moldea.yaml'),
          '\nacceptedWarnings:\n  - code: MOLDEA_INTEGRATION_BLOCK_MISSING\n    subject: /AGENTS.md\n    qualifier: null\n    reason: The team will apply the tracked AGENTS.md bridge in a separate reviewed change.\n',
          'utf8',
        );
        const accepted = validate();
        expect(accepted.result.warningCount).toBe(0);
        expect(accepted.result.acceptedWarningCount).toBe(1);
        expect(accepted.result.page.records).toContainEqual(
          expect.objectContaining({
            code: 'MOLDEA_INTEGRATION_BLOCK_MISSING',
            subject: '/AGENTS.md',
            qualifier: null,
            accepted: true,
            reason:
              'The team will apply the tracked AGENTS.md bridge in a separate reviewed change.',
          }),
        );
      }
      expect(await readFile(join(repositoryPath, 'AGENTS.md'))).toStrictEqual(beforeAgents);
      expect(await readFile(join(repositoryPath, '.gitignore'))).toStrictEqual(beforeIgnore);
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { force: true, recursive: true });
    }
  },
);
