// release identity
export { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from './constants.mjs';
export {
  assertReleaseIdentity,
  createSemanticCliIdentity,
  inspectReleaseIdentity,
  parseStableVersion,
  readReleaseIdentity,
} from './identity.mjs';

// current release evidence
export {
  assertReleaseEvidence,
  assertCurrentReleaseEvidence,
  clearPinnedReleaseEvidence,
  inspectCurrentReleaseEvidence,
  inspectQualificationEvidence,
  inspectReleaseEvidence,
  inspectSemanticEvidence,
  pinReleaseEvidence,
  recordFreshReleaseEvidence,
} from './evidence.mjs';

// release evidence contract
export {
  MAX_RELEASE_EVIDENCE_BYTES,
  MAX_RELEASE_EVIDENCE_REASON_BYTES,
  parseReleaseEvidenceEnvelope,
  readReleaseEvidenceEnvelope,
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  serializeReleaseEvidenceEnvelope,
  validateReleaseEvidenceReason,
} from './release-evidence-envelope.mjs';

// immutable source and target tags
export {
  assertPinnedReleaseEvidenceSource,
  assertTargetReleaseTagIdentity,
  resolveFreshReleaseEvidenceSource,
  resolveReleaseTagCommit,
} from './release-evidence-source.mjs';

// CLI updates
export {
  createCliReleaseUpdate,
  resolvePublishedCliManifest,
  updateCliRelease,
} from './updater.mjs';
