// versioned, bounded exchange format shared by the sandbox and local assessor
export const JOURNEYS_FORMAT_VERSION = 2 as const;
export const JOURNEY_PLATFORMS = ['chatgpt', 'claude'] as const;
export const RUN_ID_PATTERN = /^\d{8}-[a-f0-9]{6}$/u;
export const MAXIMUM_REPLY_BYTES = 65_536;
export const MAXIMUM_ARCHIVE_BYTES = 64 * 1_048_576;
export const MAXIMUM_ENTRY_BYTES = 16 * 1_048_576;
export const MAXIMUM_ARCHIVE_ENTRIES = 8_192;
export const COMMAND_TIMEOUT_MS = 240_000;
export const EXCLUDED_DIRECTORIES = ['_archive', '_archives', '_backup', '_backups'];
