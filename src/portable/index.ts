// types
export type {
  IPortableGenerationOptions,
  IPortableGenerationResult,
  IRuntimeGenerationOptions,
  IRuntimeGenerationResult,
} from './types.ts';

// artifact generation
export { generatePortableArtifacts } from './generation.ts';

// isolated runtime generation
export { generateRuntimeArtifacts } from './runtime-generation.ts';

// artifact identity
export {
  createPortableSkillArtifactDigest,
  createPortableSkillBehaviorDigest,
  createPortableSkillDigest,
} from './artifact.ts';

// managed README
export {
  assertCanonicalManagedReadmeBlock,
  createManagedReadmeBytes,
  hasCanonicalManagedReadmeBlock,
  updateManagedReadme,
} from './managed-readme.ts';

// manifest scope
export type { IManifestScopeInput } from './manifest-scope.ts';
export { matchManifestScope } from './manifest-scope.ts';

// repository filesystem
export { isPathWithin, readRepositoryFile, resolveRepositoryFile } from './repository-files.ts';

// repository package
export type { IResolvedRepositoryCli } from './repository-package.ts';
export {
  EXPECTED_CLI_RANGE,
  isCompatibleStableVersion,
  isSupportedCliDeclaration,
  parseStableVersion,
  resolveRepositoryCli,
  SUPPORTED_CORE_RANGE,
} from './repository-package.ts';
