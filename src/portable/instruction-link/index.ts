// types
export type { IInstructionPath, IInstructionWriteTarget } from './instruction-link.ts';

// Git queries the writer runs, for the evaluator's allowlist
export {
  INSTRUCTION_GIT_STORAGE_ARGUMENTS,
  INSTRUCTION_GIT_SYMLINK_SETTING_ARGUMENTS,
} from './constants.ts';

// link resolution
export { resolveInstructionWriteTarget } from './instruction-link.ts';
