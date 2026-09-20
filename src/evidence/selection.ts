import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import {
  readJsonFile,
  resolveContainedPath,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import { EVIDENCE_SELECTION_RELATIVE_PATH } from './constants.ts';
import {
  EvidenceSelectionSchema,
  type IEvidenceKind,
  type IEvidenceSelection,
  type IEvidenceSelectionReference,
} from './types.ts';

/** Returns the production evidence selection path below a repository root. */
export const getEvidenceSelectionPath = (repositoryRoot: string): string =>
  resolveContainedPath(repositoryRoot, EVIDENCE_SELECTION_RELATIVE_PATH);

/** Reads and validates the repository's independent evidence selections. */
export const readEvidenceSelection = async (selectionPath: string): Promise<IEvidenceSelection> =>
  readJsonFile(selectionPath, EvidenceSelectionSchema);

/**
 * Atomically replaces one evidence section selection without changing the other section.
 * @param selectionPath Absolute path to the repository selection document.
 * @param kind Evidence section to update.
 * @param reference Exact official release asset to select.
 * @returns The complete updated selection document.
 */
export const updateEvidenceSelection = async (
  selectionPath: string,
  kind: IEvidenceKind,
  reference: IEvidenceSelectionReference,
): Promise<IEvidenceSelection> => {
  const lockPath = `${selectionPath}.lock`;
  const deadline = Date.now() + 5_000;
  while (true) {
    try {
      await mkdir(lockPath);
      break;
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
      if (Date.now() >= deadline) {
        throw new Error('Timed out waiting for the evidence selection update lock.', {
          cause: error,
        });
      }
      await delay(50);
    }
  }

  try {
    const currentSelection = await readEvidenceSelection(selectionPath);
    const updatedSelection = EvidenceSelectionSchema.parse({
      ...currentSelection,
      [kind]: reference,
    });
    await writeJsonFileAtomically(selectionPath, updatedSelection);
    return updatedSelection;
  } finally {
    await rm(lockPath, { force: true, recursive: true });
  }
};

/** Creates an initially unselected production evidence document. */
export const createEmptyEvidenceSelection = async (selectionPath: string): Promise<void> => {
  try {
    await readFile(selectionPath);
    throw new Error(`Evidence selection already exists: ${path.basename(selectionPath)}`);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  await writeJsonFileAtomically(selectionPath, {
    formatVersion: 1,
    qualification: null,
    semantic: null,
  } satisfies IEvidenceSelection);
};
