// package identity controlled by release metadata
export const CLI_PACKAGE_NAME = '@moldea.ai/cli';

// protocol versions recorded by the current evaluators
export const SEMANTIC_EVALUATION_PROTOCOL_VERSION = 25;
export const QUALIFICATION_EVIDENCE_PROTOCOL_VERSION = 10;

// portable release files that carry the supported CLI major range
export const CLI_VERSION_RANGE_TEXT_PATHS = [
  'README.md',
  'docs/compatibility-and-local-tooling.md',
  'moldea/SKILL.md',
  'moldea/references/local-tooling.md',
  'moldea/scripts/repository-package.mjs',
  'qualification/README.md',
] as const;

// portable release files that carry the minimum supported Core range
export const CORE_VERSION_RANGE_TEXT_PATHS = [
  'README.md',
  'docs/compatibility-and-local-tooling.md',
  'moldea/SKILL.md',
  'moldea/references/local-tooling.md',
  'moldea/scripts/repository-package.mjs',
] as const;

// release files that carry the exact CLI JSON schema version
export const CLI_JSON_SCHEMA_VERSION_TEXT_PATHS = [
  'README.md',
  'docs/compatibility-and-local-tooling.md',
  'moldea/SKILL.md',
  'moldea/references/local-tooling.md',
  'qualification/README.md',
] as const;

// repository-owned release identity paths
export const RELEASE_PATHS = {
  conformanceCases: 'fixtures/conformance-cases.json',
  conformanceWorkflow: '.github/workflows/conformance.yml',
  gettingStarted: 'docs/getting-started.md',
  packageLock: 'package-lock.json',
  packageManifest: 'package.json',
  qualificationReadme: 'qualification/README.md',
  readme: 'README.md',
  semanticCliManifest: 'fixtures/tooling/semantic-cli/package.json',
  skill: 'moldea/SKILL.md',
  skillCliLauncher: 'moldea/scripts/moldea-cli.mjs',
  skillLocalTooling: 'moldea/references/local-tooling.md',
  skillRelevanceGate: 'moldea/scripts/relevance-gate.mjs',
  skillRepositoryPackage: 'moldea/scripts/repository-package.mjs',
} as const;
