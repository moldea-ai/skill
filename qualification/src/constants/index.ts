import path from 'node:path';
import { fileURLToPath } from 'node:url';

// immutable protocol and evaluator identity for committed qualification evidence
export const QUALIFICATION_PROTOCOL_VERSION = 1 as const;
export const QUALIFICATION_MODEL = 'gpt-5.6-terra' as const;
export const QUALIFICATION_REASONING_EFFORT = 'medium' as const;

// repository-local directories owned by the qualification workflow
export const SKILL_REPOSITORY_ROOT = path.resolve(
  fileURLToPath(new URL('../../../', import.meta.url)),
);
export const DEFAULT_PACKAGES_REPOSITORY = path.resolve(SKILL_REPOSITORY_ROOT, '../packages');
export const QUALIFICATION_ROOT = path.join(SKILL_REPOSITORY_ROOT, 'qualification');
export const QUALIFICATION_CASES_PATH = path.join(QUALIFICATION_ROOT, 'cases', 'cases.yaml');
export const QUALIFICATION_PROFILES_ROOT = path.join(QUALIFICATION_ROOT, 'profiles');
export const QUALIFICATION_RESULTS_ROOT = path.join(QUALIFICATION_ROOT, 'results');
export const LOCAL_QUALIFICATION_ROOT = path.join(SKILL_REPOSITORY_ROOT, '.runtime-qualification');
export const DEFAULT_SKILL_REPOSITORY = path.join(SKILL_REPOSITORY_ROOT, 'moldea');

// directories that are never consumed by qualification discovery or fingerprinting
export const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

// bounded process output protects local runs from unbounded child-process memory use
export const MAX_PROCESS_OUTPUT_BYTES = 16 * 1024 * 1024;
