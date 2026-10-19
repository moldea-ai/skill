// types
export type { IManagedFileName, IManagedWriteTargetResolver } from './types.ts';

// managed regions
export {
  assertManagedBlock,
  createManagedBlockBytes,
  hasManagedBlock,
  readManagedFile,
  updateManagedFile,
  writeManagedFileAtomically,
  isMissingFile,
} from './managed-block.ts';
