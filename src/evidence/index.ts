// types and schemas
export {
  EvidenceBundleSchema,
  EvidencePreparationManifestSchema,
  EvidenceSelectionReferenceSchema,
  EvidenceSelectionSchema,
  type ICreateEvidenceBundleOptions,
  type IEvidenceArtifactInput,
  type IEvidenceBundle,
  type IEvidenceClassification,
  type IEvidenceKind,
  type IEvidencePreparationManifest,
  type IEvidenceSelection,
  type IEvidenceSelectionReference,
} from './types.ts';

// constants
export {
  EVIDENCE_CLASSIFICATIONS,
  EVIDENCE_FORMAT_VERSION,
  EVIDENCE_KINDS,
  EVIDENCE_RELEASE_REPOSITORY,
  EVIDENCE_SELECTION_RELATIVE_PATH,
  LOCAL_EVIDENCE_RELATIVE_PATH,
  MAXIMUM_EVIDENCE_ARTIFACT_BYTES,
  MAXIMUM_EVIDENCE_ARTIFACT_COUNT,
  MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES,
  MAXIMUM_EVIDENCE_BUNDLE_BYTES,
} from './constants.ts';

// bundles
export {
  createEvidenceBundle,
  decodeEvidenceBundle,
  encodeEvidenceBundle,
  validateEvidenceBundle,
} from './bundle.ts';

// selection
export {
  createEmptyEvidenceSelection,
  getEvidenceSelectionPath,
  readEvidenceSelection,
  updateEvidenceSelection,
} from './selection.ts';

// local completed runs
export {
  getCompletedEvidenceRunPath,
  packCompletedEvidenceRun,
  packLatestCompletedEvidenceRun,
  readCompletedEvidenceRun,
  storeCompletedEvidenceRun,
} from './storage.ts';

// preparation
export {
  downloadGitHubEvidenceAsset,
  prepareSelectedEvidence,
  verifyPreparedReleaseEvidence,
  type IDownloadEvidenceAsset,
  type IPrepareEvidenceOptions,
} from './preparation.ts';
