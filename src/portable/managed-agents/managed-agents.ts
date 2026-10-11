#!/usr/bin/env node

import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertManagedBlock, updateManagedFile } from '../managed-block/index.ts';
import { isPathWithin, resolveRepositoryFile } from '../repository-files.ts';

const MANAGED_AGENTS_TEMPLATE = '__MOLDEA_MANAGED_AGENTS_BLOCK_JSON__';

/**
 * Renders the bridge from the executing installed copy, never a guessed or supplied installation.
 * @returns The exact LF template with the verified repository-relative installation path.
 * @throws
 * - The repository root must be an absolute path.
 * - The skill must be installed inside the repository.
 * - The skill installation path cannot be represented safely in the command.
 * - Expected a bounded regular file inside the repository.
 */
export const renderManagedAgentsBlock = async (repositoryRoot: string): Promise<string> => {
  if (!isAbsolute(repositoryRoot)) throw new Error('The repository root must be an absolute path.');
  const root = await realpath(repositoryRoot);
  const skillRoot = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  if (root === skillRoot || !isPathWithin(root, skillRoot))
    throw new Error('The skill must be installed inside the repository.');
  await Promise.all(
    ['SKILL.md', 'scripts/relevance-gate.mjs'].map((file) =>
      resolveRepositoryFile(root, join(skillRoot, file), 2_097_152),
    ),
  );
  const skillPath = relative(root, skillRoot).split(sep).join('/');
  if (!/^[A-Za-z0-9._/-]+$/u.test(skillPath))
    throw new Error('The skill installation path cannot be represented safely in the command.');
  const block = MANAGED_AGENTS_TEMPLATE.replaceAll('{{skill-path}}', skillPath);
  assertManagedBlock(block, 'AGENTS.md', false);
  return block;
};

// Node resolves import.meta.url through installation links but preserves the invoked argv path.
const isDirectExecution =
  process.argv[1] !== undefined &&
  (await realpath(resolve(process.argv[1]))) === fileURLToPath(import.meta.url);
if (isDirectExecution) {
  try {
    const arguments_ = process.argv.slice(2);
    if (
      arguments_[0] !== '--repository' ||
      arguments_[1] === undefined ||
      !isAbsolute(arguments_[1]) ||
      arguments_.length < 2 ||
      arguments_.length > 3 ||
      (arguments_.length === 3 && arguments_[2] !== '--print')
    )
      throw new Error('Usage: managed-agents.mjs --repository <absolute-root> [--print]');
    const repositoryRoot = await realpath(arguments_[1]);
    const block = await renderManagedAgentsBlock(repositoryRoot);
    if (arguments_[2] === '--print') process.stdout.write(block);
    else process.stdout.write(`${await updateManagedFile(repositoryRoot, block, 'AGENTS.md')}\n`);
  } catch (error) {
    process.stderr.write(
      `managed AGENTS update failed: ${error instanceof Error ? error.message : 'Unknown failure'}\n`,
    );
    process.exitCode = 1;
  }
}
