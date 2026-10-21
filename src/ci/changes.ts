import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isMainModule } from 'jg-process';
import { readChangedPaths, resolveCommit } from 'jg-git-commands';
import { z } from 'zod';

import { CHANGED_PATHS_MAX_OUTPUT_BYTES, PRESENTATION_DIRECTORIES } from './constants.ts';
import type { IChangeComparison } from './types.ts';

const CommitShaSchema = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);

/** Selects full conformance unless a nonempty complete batch is presentation-only. */
export const requiresFullConformance = (paths: readonly string[]): boolean =>
  paths.length === 0 ||
  paths.some(
    (changedPath) =>
      changedPath
        .split('/')
        .some((part) => ['_archive', '_archives', '_backup', '_backups'].includes(part)) ||
      !PRESENTATION_DIRECTORIES.some((directory) => changedPath.startsWith(directory)),
  );

/**
 * Compares the PR base to the exact tested commit; uncertain inputs select full checks.
 * @returns Whether all conformance jobs must run.
 * @throws If Git cannot resolve the supplied commits or produce a complete bounded diff.
 */
export const classifyChanges = async (comparison: IChangeComparison): Promise<boolean> => {
  if (comparison.refType === 'tag' || comparison.eventName !== 'pull_request') return true;
  const base = CommitShaSchema.safeParse(comparison.baseSha);
  const tested = CommitShaSchema.safeParse(comparison.testedSha);
  if (!base.success || !tested.success) return true;
  for (const sha of [base.data, tested.data]) {
    if ((await resolveCommit(comparison.repositoryRoot, sha)) !== sha)
      throw new Error(`The commit ${sha} is unavailable for change classification.`);
  }
  // a rename lists its old path as deleted and its new path as added
  const paths = await readChangedPaths(comparison.repositoryRoot, base.data, {
    to: tested.data,
    maxOutputBytes: CHANGED_PATHS_MAX_OUTPUT_BYTES,
  });
  return requiresFullConformance(paths);
};

if (isMainModule(import.meta.url)) {
  const full = await classifyChanges({
    repositoryRoot: resolve(import.meta.dirname, '../..'),
    eventName: process.env['GITHUB_EVENT_NAME'] ?? '',
    refType: process.env['GITHUB_REF_TYPE'] ?? '',
    baseSha: process.env['CI_BASE_SHA'],
    testedSha: process.env['CI_TESTED_SHA'],
  });
  const output = process.env['GITHUB_OUTPUT'];
  if (output === undefined) throw new Error('GITHUB_OUTPUT is required for CI classification.');
  await appendFile(output, `full=${full}\n`, 'utf8');
}
