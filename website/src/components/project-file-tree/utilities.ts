import type { IProjectFileStatus, IProjectFileTreeFile } from './types.ts';

/**
 * Derives a file's change state from its before and after sources.
 * @param file The example file with its optional earlier source.
 * @returns Added without an earlier source, Unchanged when both match, and Modified otherwise.
 */
export const getProjectFileStatus = ({
  before,
  source,
}: IProjectFileTreeFile): IProjectFileStatus =>
  before === undefined ? 'Added' : before === source ? 'Unchanged' : 'Modified';
