import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isMainModule } from 'jg-process';
import { readChangedPaths, resolveCommit } from 'jg-git-commands';
import { z } from 'zod';

import { parseTestSuiteArguments } from '../test-suite/index.ts';

import { CHANGED_PATHS_MAX_OUTPUT_BYTES, PRESENTATION_DIRECTORIES } from './constants.ts';
import type { IChangeComparison, ICiSelection } from './types.ts';

const CommitShaSchema = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);

/**
 * Selects root verification unless a nonempty complete batch is presentation-only.
 * @returns Whether the changed paths require the root/portable verification lanes.
 */
export const requiresRootVerification = (paths: readonly string[]): boolean =>
  paths.length === 0 ||
  paths.some(
    (changedPath) =>
      changedPath
        .split('/')
        .some((part) => ['_archive', '_archives', '_backup', '_backups'].includes(part)) ||
      !PRESENTATION_DIRECTORIES.some((directory) => changedPath.startsWith(directory)),
  );

/**
 * Compares the PR base to the exact tested commit; uncertain inputs select root checks.
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
  return requiresRootVerification(paths);
};

/**
 * Selects correctness priority independently of relevance, forcing full for tags.
 * @returns The root relevance and validated essential/full priority.
 * @throws
 * - Expected essential or full and optionally unit, integration, or e2e.
 * - If Git cannot resolve the supplied commits or produce a complete bounded diff.
 */
export const selectCiChecks = async (
  comparison: IChangeComparison,
  requestedSuite?: string,
): Promise<ICiSelection> => {
  const requested = parseTestSuiteArguments([requestedSuite ?? 'essential']).suite;
  const testSuite = comparison.refType === 'tag' ? 'full' : requested;
  return {
    rootRequired: testSuite === 'full' || (await classifyChanges(comparison)),
    testSuite,
  };
};

if (isMainModule(import.meta.url)) {
  const selection = await selectCiChecks(
    {
      repositoryRoot: resolve(import.meta.dirname, '../..'),
      eventName: process.env['GITHUB_EVENT_NAME'] ?? '',
      refType: process.env['GITHUB_REF_TYPE'] ?? '',
      baseSha: process.env['CI_BASE_SHA'],
      testedSha: process.env['CI_TESTED_SHA'],
    },
    process.env['CI_TEST_SUITE'],
  );
  const output = process.env['GITHUB_OUTPUT'];
  if (output === undefined) throw new Error('GITHUB_OUTPUT is required for CI classification.');
  await appendFile(
    output,
    `root_required=${selection.rootRequired}\ntest_suite=${selection.testSuite}\n`,
    'utf8',
  );
}
