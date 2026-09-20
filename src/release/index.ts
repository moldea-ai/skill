// types
export type {
  IGitHubRelease,
  IGitHubReleaseAsset,
  IGitHubReleaseClient,
  IPublishEvidenceBundleOptions,
  IPublishedEvidenceBundle,
  IReleaseIdentity,
  IReleasePackageLock,
  IReleasePackageManifest,
} from './types.ts';

// constants
export {
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_PACKAGE_NAME,
  CLI_VERSION_RANGE_TEXT_PATHS,
  CORE_VERSION_RANGE_TEXT_PATHS,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  RELEASE_PATHS,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from './constants.ts';

// evidence repository
export { EVIDENCE_RELEASE_REPOSITORY } from '../evidence/index.ts';

// semantic versions
export {
  createCompatibleMajorRange,
  parseCompatibleMajorRange,
  parseCompatibleStableRange,
  parseStableVersion,
} from './versions.ts';

// current release identity
export {
  assertReleaseIdentity,
  createSemanticCliIdentity,
  inspectReleaseIdentity,
  readReleaseIdentity,
} from './identity.ts';

// CLI release update
export {
  createCliReleaseUpdate,
  resolvePublishedCliManifest,
  updateCliRelease,
} from './updater.ts';

// GitHub client
export { createGitHubReleaseClient } from './github.ts';

// publication
export { publishEvidenceBundle } from './publication.ts';

// selection
export { pinEvidenceReleaseAsset, type IPinEvidenceReleaseAssetOptions } from './pinning.ts';
