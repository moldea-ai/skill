// npm package identity shared by the development pin and recorded CLI evidence
export const CLI_PACKAGE_NAME = '@moldea.ai/cli';

// protocol versions recorded by the current evaluators
export const SEMANTIC_EVALUATION_PROTOCOL_VERSION = 58;

// repository-owned release identity paths
export const RELEASE_PATHS = {
  installedPortableCli: 'node_modules/@moldea.ai/cli/dist/portable',
  manifestScope: 'moldea/scripts/manifest-scope.cjs',
  packageLock: 'package-lock.json',
  packageManifest: 'package.json',
  portableCli: 'moldea/scripts/moldea-cli',
  skill: 'moldea/SKILL.md',
} as const;
