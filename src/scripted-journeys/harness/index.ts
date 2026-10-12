// secure exchange and process operations
export {
  assertSafePath,
  containedPath,
  sha256,
  treeHashes,
  treeDigest,
  assertHashes,
  assertCheckpointIdentity,
  readJson,
  runCommand,
  copyTree,
  verifyBundle,
  verifyExport,
  isolatedEnvironment,
} from './shared.ts';

// sandbox protocol operations
export { setupWorkspace } from './setup.ts';
export type { ISetupOptions } from './setup.ts';
export { nextRequest } from './next.ts';
export { recordStep } from './record.ts';
export { exportWorkspace } from './export.ts';
