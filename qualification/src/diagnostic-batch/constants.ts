import path from 'node:path';

import { LOCAL_QUALIFICATION_ROOT } from '../constants/index.ts';

// bounded ignored state for one sequential diagnostic batch
export const QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
export const QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT = 1_048_576 as const;
export const QUALIFICATION_DIAGNOSTIC_EXPLANATION_MAXIMUM_BYTE_COUNT = 4_096 as const;
export const QUALIFICATION_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT = 16_384 as const;
export const QUALIFICATION_DIAGNOSTIC_ROOT = path.join(
  LOCAL_QUALIFICATION_ROOT,
  'diagnostic-batch',
);
export const QUALIFICATION_DIAGNOSTIC_CHECKPOINT_PATH = path.join(
  QUALIFICATION_DIAGNOSTIC_ROOT,
  'checkpoint.json',
);
export const QUALIFICATION_DIAGNOSTIC_LEDGER_PATH = path.join(
  QUALIFICATION_DIAGNOSTIC_ROOT,
  'ledger.json',
);
