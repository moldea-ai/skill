import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CODEX_EVALUATION_DEFAULT_ALLOWED_EGRESS_HOSTS,
  CODEX_EVALUATION_MODEL,
  CODEX_EVALUATION_REASONING_EFFORT,
} from '../../../tooling/codex-evaluation-host/index.mjs';

// immutable protocol and evaluator identity for committed qualification evidence
export const QUALIFICATION_PROTOCOL_VERSION = 1 as const;
export const QUALIFICATION_EVIDENCE_PROTOCOL_VERSION = 3 as const;
export const QUALIFICATION_MODEL = CODEX_EVALUATION_MODEL;
export const QUALIFICATION_REASONING_EFFORT = CODEX_EVALUATION_REASONING_EFFORT;
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
  'qualification',
  'tooling/codex-evaluation-host',
  'tooling/package-candidate',
] as const;
export const QUALIFICATION_CASES_PATH = path.join(QUALIFICATION_ROOT, 'cases', 'cases.yaml');
export const QUALIFICATION_PROFILES_ROOT = path.join(QUALIFICATION_ROOT, 'profiles');
export const QUALIFICATION_RESULTS_ROOT = path.join(QUALIFICATION_ROOT, 'results');
export const LOCAL_QUALIFICATION_ROOT = path.join(SKILL_REPOSITORY_ROOT, '.runtime-qualification');
export const DEFAULT_SKILL_REPOSITORY = path.join(SKILL_REPOSITORY_ROOT, 'moldea');

// directories that are never consumed by qualification discovery or fingerprinting
export const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

// bounded process output protects local runs from unbounded child-process memory use
export const MAX_PROCESS_OUTPUT_BYTES = 16 * 1024 * 1024;
