#!/usr/bin/env node

import { collectRepairGitEvidence, type IRepairGitMode } from './index.ts';

const arguments_ = process.argv.slice(2);
const [repositoryFlag, repositoryRoot, separator, mode, ...remaining] = arguments_;
if (
  repositoryFlag !== '--repository' ||
  !repositoryRoot ||
  separator !== '--' ||
  !['checkpoint', 'continue', 'review', 'verify'].includes(mode ?? '') ||
  (mode === 'checkpoint' && remaining.length !== 0) ||
  (['continue', 'verify'].includes(mode ?? '') &&
    (remaining.length !== 2 || remaining[0] !== '--checkpoint')) ||
  (mode === 'review' &&
    (remaining.length === 0 ||
      remaining.length % 2 !== 0 ||
      remaining.some((part, index) => index % 2 === 0 && part !== '--path')))
) {
  process.stderr.write(
    'Usage: repair-git --repository <absolute-root> -- checkpoint | continue --checkpoint <full-oid> | verify --checkpoint <full-oid> | review --path <written-file> [--path <written-file>]\n',
  );
  process.exitCode = 2;
} else {
  const evidence = await collectRepairGitEvidence({
    repositoryRoot,
    mode: mode as IRepairGitMode,
    ...(['continue', 'verify'].includes(mode ?? '') ? { checkpoint: remaining[1] } : {}),
    ...(mode === 'review' ? { paths: remaining.filter((_, index) => index % 2 === 1) } : {}),
  });
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
  if (evidence.status === 'unavailable') process.exitCode = 1;
}
