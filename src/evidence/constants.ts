export const EVIDENCE_FORMAT_VERSION = 1 as const;
export const EVIDENCE_KINDS = ['qualification', 'semantic'] as const;
export const EVIDENCE_CLASSIFICATIONS = ['fixture', 'official'] as const;

// fixed public repository that owns evidence release assets
export const EVIDENCE_RELEASE_REPOSITORY = 'moldea-ai/skill';

export const MAXIMUM_EVIDENCE_BUNDLE_BYTES = 128 * 1_048_576;
export const MAXIMUM_EVIDENCE_ARTIFACT_BYTES = 16 * 1_048_576;
export const MAXIMUM_EVIDENCE_ARTIFACT_COUNT = 8_192;
export const MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES = 64 * 1_048_576;

export const EVIDENCE_SELECTION_RELATIVE_PATH = 'evidence/selection.json';
export const LOCAL_EVIDENCE_RELATIVE_PATH = '.evidence';
