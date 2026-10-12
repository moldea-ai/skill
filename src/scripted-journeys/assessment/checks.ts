import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { containedPath, copyTree, runCommand } from '../harness/index.ts';
import type { IJourneyCheck, IJourneyCheckResult } from '../index.ts';

// all executable inputs are assessor-owned; reconstructed dependency files remain inert
export type ICheckContext = {
  repository: string;
  stepChanges: string[];
  fixtureChanges: string[];
  files: Record<string, string>;
  reply: string;
  cliVersion: string;
  closure: string;
  environment: NodeJS.ProcessEnv;
};
const matchesPath = (candidate: string, pattern: string): boolean =>
  pattern.endsWith('/**') ? candidate.startsWith(pattern.slice(0, -2)) : candidate === pattern;

/** Recognizes files and nonempty directories in the file-only snapshot. */
const hasTreePath = (files: Record<string, string>, candidate: string): boolean =>
  Object.hasOwn(files, candidate) ||
  Object.keys(files).some((name) => name.startsWith(`${candidate}/`));

/** Evaluates one trusted criterion against a reconstructed snapshot or agent-reported reply. */
export const evaluateJourneyCheck = async (
  check: IJourneyCheck,
  context: ICheckContext,
): Promise<IJourneyCheckResult> => {
  const result = (passed: boolean, detail: string): IJourneyCheckResult => ({
    check,
    status: passed ? 'passed' : 'failed',
    detail,
  });
  switch (check.kind) {
    case 'path-exists':
      return result(hasTreePath(context.files, check.path), `Required path: ${check.path}`);
    case 'path-absent':
      return result(!hasTreePath(context.files, check.path), `Absent path: ${check.path}`);
    case 'no-changes':
      return result(
        context.stepChanges.length === 0,
        `Changed paths: ${context.stepChanges.join(', ') || 'none'}`,
      );
    case 'paths-changed':
      return result(
        check.paths.every((pattern) =>
          context.stepChanges.some((name) => matchesPath(name, pattern)),
        ),
        'Required step changes',
      );
    case 'paths-unchanged':
      return result(
        !check.paths.some((pattern) =>
          (check.since === 'fixture' ? context.fixtureChanges : context.stepChanges).some((name) =>
            matchesPath(name, pattern),
          ),
        ),
        `Preservation since ${check.since}`,
      );
    case 'content-matches': {
      if (!Object.hasOwn(context.files, check.path))
        return result(false, `Missing content: ${check.path}`);
      return result(
        new RegExp(check.pattern, 'u').test(
          await readFile(containedPath(context.repository, check.path), 'utf8'),
        ),
        `Content pattern: ${check.path}`,
      );
    }
    case 'reply-matches':
      return result(
        !!context.reply.trim() &&
          new RegExp(check.pattern, 'iu').test(context.reply) &&
          !(check.absent && new RegExp(check.absent, 'iu').test(context.reply)),
        'Reply matches fixture fact or documented result',
      );
    case 'validate': {
      let declaration: string | undefined;
      if (context.files['package.json']) {
        const manifest = z
          .object({ devDependencies: z.record(z.string(), z.string()).optional() })
          .parse(
            JSON.parse(
              await readFile(path.join(context.repository, 'package.json'), 'utf8'),
            ) as unknown,
          );
        declaration = manifest.devDependencies?.['@moldea.ai/cli'];
      }
      if (declaration !== context.cliVersion || !context.files['package-lock.json'])
        return {
          check,
          status: 'blocked',
          detail:
            'Exact CLI declaration and lockfile required; exported dependencies were not installed.',
        };
      const destination = path.join(context.repository, 'node_modules');
      try {
        await copyTree(context.closure, destination, ['.bin']);
        const output = await runCommand(
          process.execPath,
          [
            path.join(context.repository, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
            '--repository',
            context.repository,
            '--',
            'validate',
            '--json',
            '--max-output-bytes',
            '65536',
          ],
          context.repository,
          context.environment,
          [0, 1, 2, 3],
        );
        if (output.exitCode > 1)
          return {
            check,
            status: 'blocked',
            detail: `Trusted CLI unavailable: ${output.stderr.slice(0, 1024)}`,
          };
        const envelope = z
          .object({ status: z.enum(['valid', 'invalid']), error: z.null() })
          .parse(JSON.parse(output.stdout) as unknown);
        return result(
          envelope.status === check.result,
          `Trusted CLI validation: ${envelope.status}`,
        );
      } finally {
        await rm(destination, { recursive: true, force: true });
      }
    }
  }
};
