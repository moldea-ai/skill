import path from 'node:path';

import { EXCLUDED_DIRECTORIES } from '../index.ts';
import { sha256, treeHashes } from '../harness/index.ts';

/** Hashes the maintained evaluator and shared quorum implementation with one canonical inventory. */
export const createAssessorFingerprint = async (repositoryRoot: string): Promise<string> =>
  sha256(
    JSON.stringify({
      journeys: await treeHashes(
        path.join(repositoryRoot, 'src/scripted-journeys'),
        EXCLUDED_DIRECTORIES,
      ),
      confirmation: await treeHashes(
        path.join(repositoryRoot, 'src/execution/confirmation'),
        EXCLUDED_DIRECTORIES,
      ),
    }),
  );

/** Identifies one original fixture independently of the other bundled journeys. */
export const createFixtureFingerprint = (
  files: Record<string, string>,
  journeyId: string,
): string => {
  const prefix = `journeys/${journeyId}/fixture/`;
  const inventory = Object.entries(files)
    .filter(([name]) => name.startsWith(prefix))
    .map(([name, hash]) => [name.slice(prefix.length), hash])
    .sort(([left], [right]) => (left! < right! ? -1 : left! > right! ? 1 : 0));
  if (!inventory.length) throw new Error(`Missing original fixture: ${journeyId}`);
  return sha256(JSON.stringify(inventory));
};
