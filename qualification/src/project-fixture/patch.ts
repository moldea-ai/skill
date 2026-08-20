import { EXCLUDED_DIRECTORY_NAMES } from '../constants/index.ts';
import { executeProcess } from '../process/index.ts';

const isExcludedPath = (relativePath: string): boolean =>
  relativePath.split('/').some((pathSegment) => EXCLUDED_DIRECTORY_NAMES.has(pathSegment));

/** Captures tracked and non-ignored untracked project changes as a reviewable binary patch. */
export const captureWorkspacePatch = async (workspaceDirectory: string): Promise<string> => {
  const trackedPatch = (
    await executeProcess({
      command: 'git',
      args: ['diff', '--binary', '--no-ext-diff', 'HEAD', '--'],
      cwd: workspaceDirectory,
    })
  ).stdout;
  const untrackedResult = await executeProcess({
    command: 'git',
    args: ['ls-files', '--others', '--exclude-standard', '-z'],
    cwd: workspaceDirectory,
  });
  const untrackedPaths = untrackedResult.stdout
    .split('\0')
    .filter((relativePath) => relativePath !== '' && !isExcludedPath(relativePath))
    .sort((left, right) => left.localeCompare(right, 'en'));
  const patchParts = [trackedPatch];

  for (const relativePath of untrackedPaths) {
    const untrackedPatch = await executeProcess({
      command: 'git',
      args: ['diff', '--no-index', '--binary', '--', '/dev/null', relativePath],
      cwd: workspaceDirectory,
      expectedExitCodes: [0, 1],
    });

    patchParts.push(untrackedPatch.stdout);
  }

  return patchParts.filter((patchPart) => patchPart !== '').join('\n');
};
