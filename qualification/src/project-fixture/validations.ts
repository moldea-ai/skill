import path from 'node:path';

/** Checks one repository-relative path against exact paths and bounded POSIX glob patterns. */
export const matchesWorkspacePathContract = (
  candidatePath: string,
  exactPaths: readonly string[],
  pathPatterns: readonly string[],
): boolean =>
  exactPaths.includes(candidatePath) ||
  pathPatterns.some((pathPattern) => path.matchesGlob(candidatePath, pathPattern));
