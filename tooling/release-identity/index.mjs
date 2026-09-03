// release identity
export { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from './constants.mjs';
export {
  assertCompatibility402Expansion,
  assertRepositoryCompatibility,
  COMPATIBILITY_401,
  COMPATIBILITY_402,
  isCompatibilityVersionSupported,
  parseCompatibility,
  validateCompatibilityContract,
} from './compatibility.mjs';
export {
  assertReleaseIdentity,
  createSemanticCliIdentity,
  inspectReleaseIdentity,
  parseStableVersion,
  readReleaseIdentity,
} from './identity.mjs';

// release evidence
export {
  assertReleaseEvidence,
  inspectReleaseEvidence,
  inspectSemanticEvidence,
} from './evidence.mjs';

// historical evidence bridge
export {
  CARRY_FORWARD_401_PATH,
  CARRY_FORWARD_401_SCHEMA_VERSION,
  CARRY_FORWARD_401_SOURCE_COMMIT,
  CARRY_FORWARD_401_SOURCE_RELEASE,
  CARRY_FORWARD_401_TARGET_RELEASE,
  createCarryForward401Attestation,
  parseCarryForward401Attestation,
  readCarryForward401Attestation,
  verifyCarryForward401Attestation,
  verifyCarryForward401SourceAttestation,
  writeCarryForward401Attestation,
} from './carry-forward-4-0-1.mjs';

// 4.0.2 compatibility bridge consumers
export {
  COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY,
  hasCompatibilityBridge402Qualification,
  hasLocalCompatibilityBridge402Qualification,
  mapCompatibilityBridge402Packages,
  parseCompatibilityBridge402Attestation,
  readCompatibilityBridge402Attestation,
  resolveCompatibleHistoricalSemanticAttemptId,
} from './historical-semantic.mjs';

// CLI updates
export {
  createCliReleaseUpdate,
  resolvePublishedCliManifest,
  updateCliRelease,
} from './updater.mjs';
