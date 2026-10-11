import { appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

import { executeProcess } from '../process/index.ts';

import { PRESENTATION_DIRECTORIES } from './constants.ts';
import type { IChangeComparison } from './types.ts';

const CommitShaSchema = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);

/**
 * Decodes complete Git name-status output, retaining both rename/copy paths.
 * @returns Every changed path, or null when the output cannot be trusted.
 */
export const parseChangedPaths = (output: string): string[] | null => {
  if (output === '') return [];
  if (!output.endsWith('\0')) return null;
  const fields = output.slice(0, -1).split('\0');
  const paths: string[] = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (status === undefined || !/^(?:[ADMT]|[RC](?:100|0?\d{1,2}))$/.test(status)) return null;
    const pathCount = /^[RC]/.test(status) ? 2 : 1;
    for (let count = 0; count < pathCount; count++) {
      const changedPath = fields[index++];
      if (
        changedPath === undefined ||
        changedPath === '' ||
        changedPath.startsWith('/') ||
        changedPath.includes('\\') ||
        changedPath.split('/').some((part) => part === '.' || part === '..' || part === '')
      )
        return null;
      paths.push(changedPath);
    }
  }
  return paths;
};

/** Selects full conformance unless a nonempty complete batch is presentation-only. */
export const requiresFullConformance = (paths: string[] | null): boolean =>
  paths === null ||
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
    await executeProcess({
      command: 'git',
      args: ['cat-file', '-e', `${sha}^{commit}`],
      cwd: comparison.repositoryRoot,
    });
  }
  const result = await executeProcess({
    command: 'git',
    args: [
      'diff',
      '--no-ext-diff',
      '--name-status',
      '-z',
      '--find-renames',
      '--find-copies',
      '--find-copies-harder',
      base.data,
      tested.data,
      '--',
    ],
    cwd: comparison.repositoryRoot,
  });
  return requiresFullConformance(parseChangedPaths(result.stdout));
};

if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
  const full = await classifyChanges({
    repositoryRoot: resolve(import.meta.dirname, '../..'),
    eventName: process.env['GITHUB_EVENT_NAME'] ?? '',
    refType: process.env['GITHUB_REF_TYPE'] ?? '',
    baseSha: process.env['CI_BASE_SHA'],
    testedSha: process.env['GITHUB_SHA'],
  });
  const output = process.env['GITHUB_OUTPUT'];
  if (output === undefined) throw new Error('GITHUB_OUTPUT is required for CI classification.');
  await appendFile(output, `full=${full}\n`, 'utf8');
}
