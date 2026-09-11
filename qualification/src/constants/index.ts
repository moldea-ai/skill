import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CODEX_EVALUATION_ACTOR_REASONING_EFFORT,
  CODEX_EVALUATION_DEFAULT_ALLOWED_EGRESS_HOSTS,
  CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS,
  CODEX_EVALUATION_JUDGE_REASONING_EFFORT,
  CODEX_EVALUATION_MODEL,
} from '../../../tooling/codex-evaluation-host/index.mjs';
import { EVALUATION_CONFIRMATION_POLICY } from '../../../tooling/evaluation-confirmation-policy/index.mjs';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../tooling/resource-calibration/profiles.mjs';

// immutable protocol and evaluator identity for committed qualification evidence
export const QUALIFICATION_PROTOCOL_VERSION = 2 as const;
export const QUALIFICATION_EVIDENCE_PROTOCOL_VERSION = 10 as const;
export const QUALIFICATION_MAXIMUM_OPERATIONAL_RETRY_COUNT = 1 as const;
// finite candidate-wide stop-loss; calibrated initials fit with confirmation headroom
export const QUALIFICATION_CANDIDATE_TOKEN_LIMIT = 32_000_000 as const;
export const QUALIFICATION_CONFIRMATION_POLICY = EVALUATION_CONFIRMATION_POLICY;
export const QUALIFICATION_TRIAL_IDS = [
  'initial',
  'confirmation-1',
  'confirmation-2',
  'confirmation-3',
] as const;
export const QUALIFICATION_MODEL = CODEX_EVALUATION_MODEL;
export const QUALIFICATION_ACTOR_REASONING_EFFORT = CODEX_EVALUATION_ACTOR_REASONING_EFFORT;
export const QUALIFICATION_JUDGE_REASONING_EFFORT = CODEX_EVALUATION_JUDGE_REASONING_EFFORT;
export const QUALIFICATION_DEFAULT_HOST_TIMEOUT_MS = CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS;
export const QUALIFICATION_ALLOWED_EGRESS_HOSTS = [
  ...CODEX_EVALUATION_DEFAULT_ALLOWED_EGRESS_HOSTS,
].sort();
export const QUALIFICATION_MODEL_ENDPOINT_ORIGINS = ['https://api.openai.com'] as const;

// repository-local directories owned by the qualification workflow
export const SKILL_REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url)),
);
export const DEFAULT_PACKAGES_REPOSITORY = path.resolve(SKILL_REPOSITORY_ROOT, '../packages');
export const QUALIFICATION_ROOT = path.join(SKILL_REPOSITORY_ROOT, 'qualification');
export const QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES = [
  'package.json',
  'package-lock.json',
  'qualification',
  'tooling/codex-evaluation-host',
  'tooling/package-candidate',
  'tooling/resource-calibration',
] as const;
export const QUALIFICATION_CASES_PATH = path.join(QUALIFICATION_ROOT, 'cases', 'cases.yaml');
export const QUALIFICATION_PROFILES_ROOT = path.join(QUALIFICATION_ROOT, 'profiles');
export const QUALIFICATION_RESULTS_ROOT = path.join(QUALIFICATION_ROOT, 'results');
export const LOCAL_QUALIFICATION_ROOT = path.join(SKILL_REPOSITORY_ROOT, '.runtime-qualification');
export const DEFAULT_SKILL_REPOSITORY = path.join(SKILL_REPOSITORY_ROOT, 'moldea');

// directories that are never consumed by qualification discovery or fingerprinting
export const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

// bounded process output protects local runs from unbounded child-process memory use
export const MAX_PROCESS_OUTPUT_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxProcessOutputBytes;

// local processes receive the same graceful-shutdown period as the evaluation relay
export const PROCESS_TERMINATION_GRACE_PERIOD_MS = 5_000;
