import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../resources/index.ts';

// bounded output protects local runs from unbounded child-process memory use
export const MAX_PROCESS_OUTPUT_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxProcessOutputBytes;

// local processes receive a short graceful-shutdown period before forced termination
export const PROCESS_TERMINATION_GRACE_PERIOD_MS = 5_000;

// forced termination is polled briefly so rejection cannot race surviving group members
export const PROCESS_TERMINATION_POLL_INTERVAL_MS = 20;
