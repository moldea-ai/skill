import type { IQualificationSelection } from '../contracts/index.ts';
import { resolveQualificationTarget } from '../compatibility/index.ts';

/**
 * Resolves the selected checkout and returns the maximum paid model-call count.
 * @param selection The adapter implementation selected for qualification.
 * @param packagesRepository The optional packages checkout containing the target matrix.
 * @returns A promise resolving to one actor and one judge call per profile case.
 */
export const getQualificationModelCallCount = async (
  selection: IQualificationSelection,
  packagesRepository?: string,
): Promise<number> => {
  const target = await resolveQualificationTarget(selection, packagesRepository);
  return target.profile.cases.length * 2;
};
