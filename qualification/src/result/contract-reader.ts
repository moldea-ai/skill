import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { EXCLUDED_DIRECTORY_NAMES, QUALIFICATION_RESULTS_ROOT } from '../constants/index.ts';
import { resolveContainedPath, type IBoundarySchema } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';

const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/u;

const assertAllowedContractPath = (relativePath: string): void => {
  const pathSegments = relativePath.split(/[\\/]/u);
  const excludedSegment = pathSegments.find((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment));

  if (excludedSegment !== undefined) {
    throw new Error(`Qualification contract path enters excluded directory ${excludedSegment}.`);
  }
};

/** Reads one qualification contract source from its recorded commit or current synthetic tree. */
const readQualificationContractSource = async (options: {
  contractRoot?: 'qualification' | 'repository';
  qualificationRepositoryCommit: string;
  relativePath: string;
  resultsRoot: string;
}): Promise<string> => {
  assertAllowedContractPath(options.relativePath);
  const qualificationRoot = path.resolve(options.resultsRoot, '..');
  const repositoryRoot = path.resolve(qualificationRoot, '..');
  const contractPath = resolveContainedPath(
    options.contractRoot === 'repository' ? repositoryRoot : qualificationRoot,
    options.relativePath,
  );
  let hasRepository = false;

  try {
    await access(path.join(repositoryRoot, '.git'));
    hasRepository = true;
  } catch {
    // synthetic fixtures intentionally validate their adjacent contracts without Git
  }

  if (!GIT_COMMIT_PATTERN.test(options.qualificationRepositoryCommit) || !hasRepository) {
    if (path.resolve(options.resultsRoot) === path.resolve(QUALIFICATION_RESULTS_ROOT)) {
      throw new Error('Public qualification evidence lacks an exact source commit.');
    }

    return readFile(contractPath, 'utf8');
  }

  const repositoryRelativePath = path
    .relative(repositoryRoot, contractPath)
    .split(path.sep)
    .join(path.posix.sep);

  try {
    const { stdout } = await executeProcess({
      command: 'git',
      args: [
        'cat-file',
        'blob',
        `${options.qualificationRepositoryCommit}:${repositoryRelativePath}`,
      ],
      cwd: repositoryRoot,
    });

    return stdout;
  } catch (error) {
    throw new Error(
      `Unable to read recorded qualification contract ${options.relativePath} from commit ${options.qualificationRepositoryCommit}.`,
      { cause: error },
    );
  }
};

/**
 * Reads one YAML qualification contract from the exact clean commit recorded by public evidence.
 * Synthetic result roots without a Git commit keep using their adjacent test fixture contracts.
 * @param options The recorded commit, result root, relative contract path, and boundary schema.
 * @returns A promise resolving to the validated recorded contract.
 * @throws If public evidence lacks a Git commit or its recorded contract cannot be read.
 */
export const readQualificationContractYaml = async <TResult>(options: {
  contractRoot?: 'qualification' | 'repository';
  qualificationRepositoryCommit: string;
  relativePath: string;
  resultsRoot: string;
  schema: IBoundarySchema<TResult>;
}): Promise<TResult> => {
  const source = await readQualificationContractSource(options);
  return options.schema.parse(parseYaml(source) as unknown);
};

/**
 * Reads one JSON qualification contract from the exact clean commit recorded by public evidence.
 * Synthetic result roots without a Git commit keep using their adjacent test fixture contracts.
 * @param options The recorded commit, result root, relative contract path, and boundary schema.
 * @returns A promise resolving to the validated recorded contract.
 * @throws If public evidence lacks a Git commit or its recorded contract cannot be read.
 */
export const readQualificationContractJson = async <TResult>(options: {
  contractRoot?: 'qualification' | 'repository';
  qualificationRepositoryCommit: string;
  relativePath: string;
  resultsRoot: string;
  schema: IBoundarySchema<TResult>;
}): Promise<TResult> => {
  const source = await readQualificationContractSource(options);

  try {
    return options.schema.parse(JSON.parse(source) as unknown);
  } catch (error) {
    throw new Error(`Invalid qualification JSON contract ${options.relativePath}.`, {
      cause: error,
    });
  }
};
