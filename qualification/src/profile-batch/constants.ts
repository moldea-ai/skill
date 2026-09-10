import path from 'node:path';

import { LOCAL_QUALIFICATION_ROOT } from '../constants/index.ts';

// bounded ignored orchestration state for concurrent adapter qualification
export const QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION = 1 as const;
export const QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT = 1_048_576 as const;
export const QUALIFICATION_PROFILE_BATCH_SUMMARY_MAXIMUM_BYTE_COUNT = 4_096 as const;
export const QUALIFICATION_PROFILE_BATCH_OUTPUT_MAXIMUM_BYTE_COUNT = 16_384 as const;
export const QUALIFICATION_PROFILE_BATCH_ROOT = path.join(
  LOCAL_QUALIFICATION_ROOT,
  'profile-batch',
);
export const QUALIFICATION_PROFILE_BATCH_CHECKPOINT_PATH = path.join(
  QUALIFICATION_PROFILE_BATCH_ROOT,
  'checkpoint.json',
);
export const QUALIFICATION_PROFILE_BATCH_LEDGER_PATH = path.join(
  QUALIFICATION_PROFILE_BATCH_ROOT,
  'ledger.json',
);
export const QUALIFICATION_PROFILE_BATCH_HISTORY_ROOT = path.join(
  QUALIFICATION_PROFILE_BATCH_ROOT,
  'history',
);
