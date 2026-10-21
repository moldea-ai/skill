import { resolve } from 'node:path';
import { isMainModule, parseStrictArgs } from 'jg-process';

import { packSourceWorkspaceCandidate } from './workspace.ts';
import type { IPackSourceWorkspaceCandidateOptions } from './types.ts';

/**
 * Parses the source candidate packer command line.
 * @param argumentsList Command-line arguments excluding Node and the script path.
 * @returns Validated workspace, output, and selected package roots.
 * @throws
 * - INVALID_ARGUMENTS: an unknown option, a positional argument, a missing or empty value, a
 * repeated option, or a missing required one
 */
export const parsePackArguments = (
  argumentsList: string[],
): Required<
  Pick<
    IPackSourceWorkspaceCandidateOptions,
    'artifactDirectory' | 'selectedRootPackageNames' | 'workspaceRoot'
  >
> => {
  const { output, root, workspace } = parseStrictArgs(argumentsList, {
    output: { type: 'string', required: true },
    root: { type: 'string', multiple: true },
    workspace: { type: 'string', required: true },
  });
  return {
    artifactDirectory: resolve(output),
    selectedRootPackageNames: root,
    workspaceRoot: resolve(workspace),
  };
};

/** Packs the dependency-first source closure and prints a machine-readable summary. */
const main = (): void => {
  const options = parsePackArguments(process.argv.slice(2));
  const result = packSourceWorkspaceCandidate(options);
  process.stdout.write(
    `${JSON.stringify(
      {
        buildPackageNames: result.buildPackageNames,
        cliVersion: result.cliVersion,
        runtimePackageNames: result.runtimePackageNames,
      },
      null,
      2,
    )}\n`,
  );
};

if (isMainModule(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
