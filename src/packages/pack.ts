import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { packSourceWorkspaceCandidate } from './workspace.ts';
import type { IPackSourceWorkspaceCandidateOptions } from './types.ts';

/**
 * Parses the source candidate packer command line.
 * @param argumentsList Command-line arguments excluding Node and the script path.
 * @returns Validated workspace, output, and selected package roots.
 */
export const parsePackArguments = (
  argumentsList: string[],
): Required<
  Pick<
    IPackSourceWorkspaceCandidateOptions,
    | 'artifactDirectory'
    | 'runtimeCompatibilityPublicationPath'
    | 'selectedRootPackageNames'
    | 'workspaceRoot'
  >
> => {
  let artifactDirectory: string | undefined;
  let runtimeCompatibilityPublicationPath: string | undefined;
  let workspaceRoot: string | undefined;
  const selectedRootPackageNames: string[] = [];

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const optionValue = argumentsList[index + 1];
    if (
      argument === undefined ||
      !['--output', '--root', '--runtime-compatibility-publication', '--workspace'].includes(
        argument,
      )
    ) {
      throw new Error(`Unknown candidate packer option: ${argument}`);
    }
    if (!optionValue || optionValue.startsWith('--')) {
      throw new Error(`${argument} requires a value.`);
    }
    index += 1;

    if (argument === '--output') artifactDirectory = resolve(optionValue);
    if (argument === '--workspace') workspaceRoot = resolve(optionValue);
    if (argument === '--root') selectedRootPackageNames.push(optionValue);
    if (argument === '--runtime-compatibility-publication') {
      runtimeCompatibilityPublicationPath = resolve(optionValue);
    }
  }

  if (!workspaceRoot) throw new Error('--workspace is required.');
  if (!artifactDirectory) throw new Error('--output is required.');
  if (!runtimeCompatibilityPublicationPath) {
    throw new Error('--runtime-compatibility-publication is required.');
  }
  return {
    artifactDirectory,
    runtimeCompatibilityPublicationPath,
    selectedRootPackageNames,
    workspaceRoot,
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
        runtimeCompatibilityPublicationArtifact: result.runtimeCompatibilityPublicationArtifact,
        runtimePackageNames: result.runtimePackageNames,
      },
      null,
      2,
    )}\n`,
  );
};

const isDirectExecution =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
