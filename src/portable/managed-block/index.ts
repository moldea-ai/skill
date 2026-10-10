// types
export type { IManagedFileName } from './types.ts';

// managed regions
export {
  assertManagedBlock,
  createManagedBlockBytes,
  hasManagedBlock,
  readManagedFile,
  updateManagedFile,
  isMissingFile,
} from './managed-block.ts';
