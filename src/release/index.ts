// types
export type {
  IGitHubRelease,
  IGitHubReleaseAsset,
  IGitHubReleaseClient,
  IPublishEvidenceBundleOptions,
  IPublishedEvidenceBundle,
  IReleaseIdentity,
} from './types.ts';

// constants
export {
  CLI_PACKAGE_NAME,
  RELEASE_PATHS,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from './constants.ts';

// evidence repository
export { EVIDENCE_RELEASE_REPOSITORY } from '../evidence/index.ts';

// semantic versions
export {
  createCompatibleMajorRange,
  parseCompatibleStableRange,
  parseStableVersion,
} from './versions.ts';

// current release identity
export {
  assertReleaseIdentity,
  createSemanticCliIdentity,
  readReleaseIdentity,
} from './identity.ts';

// CLI release update
export { updateCliRelease } from './updater.ts';

// GitHub client
export { createGitHubReleaseClient } from './github.ts';

// publication
export { publishEvidenceBundle } from './publication.ts';

// selection
export { pinEvidenceReleaseAsset, type IPinEvidenceReleaseAssetOptions } from './pinning.ts';
