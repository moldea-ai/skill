// fixed capture bounds keep one packet below the existing host output ceiling
export const INITIALIZATION_INSPECTION_LIMITS = {
  directoryDepth: 64,
  inventoryEntries: 16_384,
  inventoryRecords: 128,
  sourcePaths: 8,
  sourceFileBytes: 32_768,
  sourcePacketBytes: 65_536,
  outputBytes: 262_144,
} as const;

// excluded directories are never opened, including for metadata discovery
export const INSPECTION_EXCLUDED_DIRECTORIES = new Set([
  '_archive',
  '_archives',
  '_backup',
  '_backups',
  '.git',
  'node_modules',
]);
