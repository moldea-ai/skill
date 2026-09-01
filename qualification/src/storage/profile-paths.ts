import { access } from 'node:fs/promises';
import path from 'node:path';

import { QUALIFICATION_PROFILES_ROOT } from '../constants/index.ts';
import type { IQualificationSelection } from '../contracts/index.ts';
import { readYamlFile, resolveContainedPath } from '../filesystem/index.ts';
import {
  QualificationProfileIndexSchema,
  type IQualificationProfileIndex,
  type IQualificationProfileIndexTarget,
} from './types.ts';

/** Reads and validates the append-only qualification target index. */
export const loadQualificationProfileIndex = async (
  profilesRoot: string = QUALIFICATION_PROFILES_ROOT,
): Promise<IQualificationProfileIndex> =>
  readYamlFile(path.join(profilesRoot, 'index.yaml'), QualificationProfileIndexSchema);

/** Finds one indexed target while preserving its logical adapter and implementation identity. */
export const findQualificationProfileTarget = (
  index: IQualificationProfileIndex,
  selection: IQualificationSelection,
): IQualificationProfileIndexTarget | null =>
  index.targets.find(
    ({ adapterId, implementationId }) =>
      adapterId === selection.adapterId && implementationId === selection.implementationId,
  ) ?? null;

/** Resolves one logical target to its short append-only storage key. */
export const resolveQualificationTargetKey = async (
  selection: IQualificationSelection,
  profilesRoot: string = QUALIFICATION_PROFILES_ROOT,
): Promise<string> => {
  const index = await loadQualificationProfileIndex(profilesRoot);
  const target = findQualificationProfileTarget(index, selection);

  if (target === null) {
    throw new Error(
      `Qualification profile index does not contain ${selection.adapterId}/${selection.implementationId}.`,
    );
  }

  return target.key;
};

/** Resolves one logical target to its contained short profile directory. */
export const resolveQualificationProfileDirectory = async (
  selection: IQualificationSelection,
  profilesRoot: string = QUALIFICATION_PROFILES_ROOT,
): Promise<string> =>
  resolveContainedPath(profilesRoot, await resolveQualificationTargetKey(selection, profilesRoot));

/** Resolves a colocated profile index, with the repository index as the synthetic-root fallback. */
export const resolveQualificationProfilesRootForResults = async (
  resultsRoot: string,
): Promise<string> => {
  const candidateProfilesRoot = path.join(path.resolve(resultsRoot, '..'), 'profiles');

  try {
    await access(path.join(candidateProfilesRoot, 'index.yaml'));
    return candidateProfilesRoot;
  } catch {
    return QUALIFICATION_PROFILES_ROOT;
  }
};

/** Resolves one logical target to its contained short result directory. */
export const resolveQualificationResultTargetDirectory = async (
  resultsRoot: string,
  selection: IQualificationSelection,
): Promise<string> => {
  const profilesRoot = await resolveQualificationProfilesRootForResults(resultsRoot);
  const targetKey = await resolveQualificationTargetKey(selection, profilesRoot);
  return resolveContainedPath(resultsRoot, targetKey);
};
