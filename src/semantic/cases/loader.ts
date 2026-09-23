import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { EXCLUDED_DIRECTORY_NAMES } from '../../filesystem/index.ts';
import { defineSemanticCase } from './define.ts';
import type { ISemanticCase } from './types.ts';

type ISemanticCaseModule = { semanticCase?: unknown };

/**
 * Discovers typed semantic case modules without a handwritten inventory.
 * @param casesRoot Directory containing one `<case-id>/case.ts` or built `case.mjs` per case.
 * @returns Validated cases ordered by stable case id.
 */
export const loadSemanticCases = async (casesRoot: string): Promise<ISemanticCase[]> => {
  const directoryEntries = await readdir(casesRoot, { withFileTypes: true });
  const caseDirectories = directoryEntries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !EXCLUDED_DIRECTORY_NAMES.has(entry.name) &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name),
    )
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  const discoveredCases: Array<{ directoryName: string; semanticCase: ISemanticCase }> = [];

  for (const directory of caseDirectories) {
    const directoryPath = path.join(casesRoot, directory.name);
    const fileNames = await readdir(directoryPath);
    const caseFileName = fileNames.includes('case.ts')
      ? 'case.ts'
      : fileNames.includes('case.mjs')
        ? 'case.mjs'
        : null;
    if (caseFileName === null) {
      throw new Error(`Semantic case ${directory.name} has no case module.`);
    }
    const caseModule = (await import(
      /* @vite-ignore */
      pathToFileURL(path.join(directoryPath, caseFileName)).href
    )) as ISemanticCaseModule;
    if (caseModule.semanticCase === undefined) {
      throw new Error(`Semantic case ${directory.name} does not export semanticCase.`);
    }
    const semanticCase = defineSemanticCase(caseModule.semanticCase as ISemanticCase);
    discoveredCases.push({ directoryName: directory.name, semanticCase });
  }

  const cases = discoveredCases.map(({ semanticCase }) => semanticCase);
  const ids = new Set(cases.map(({ id }) => id));
  if (ids.size !== cases.length) throw new Error('Semantic case ids must be unique.');
  for (const { directoryName, semanticCase } of discoveredCases) {
    if (semanticCase.id !== directoryName) {
      throw new Error(
        `Semantic case directory ${directoryName} does not match id ${semanticCase.id}.`,
      );
    }
  }
  return cases;
};
