// package and protocol identities owned by the current release workflow
export const CLI_PACKAGE_NAME = '@moldea.ai/cli';
export const SEMANTIC_EVALUATION_PROTOCOL_VERSION = 22;
export const QUALIFICATION_EVIDENCE_PROTOCOL_VERSION = 7;

// release files that must carry the exact CLI version
export const CLI_VERSION_TEXT_PATHS = [
  'README.md',
  'docs/compatibility-and-local-tooling.md',
  'moldea/SKILL.md',
  'moldea/references/local-tooling.md',
  'moldea/scripts/relevance-gate.mjs',
  'qualification/README.md',
];

// release files that must carry the exact CLI JSON schema version
export const CLI_JSON_SCHEMA_VERSION_TEXT_PATHS = [
  'README.md',
  'docs/compatibility-and-local-tooling.md',
  'moldea/SKILL.md',
  'moldea/references/local-tooling.md',
  'qualification/README.md',
];

// repository-owned release identity paths
export const RELEASE_PATHS = Object.freeze({
  conformanceWorkflow: '.github/workflows/conformance.yml',
  conformanceCases: 'fixtures/conformance-cases.json',
  semanticCoverage: 'fixtures/semantic-evaluation-coverage.json',
  gettingStarted: 'docs/getting-started.md',
  packageLock: 'package-lock.json',
  packageManifest: 'package.json',
  qualificationReadme: 'qualification/README.md',
  readme: 'README.md',
  releaseEvidence: 'fixtures/release-evidence.json',
  semanticCliManifest: 'fixtures/tooling/semantic-cli/package.json',
  semanticResult: 'fixtures/semantic-evaluation-result.json',
  skill: 'moldea/SKILL.md',
  skillLocalTooling: 'moldea/references/local-tooling.md',
  skillRelevanceGate: 'moldea/scripts/relevance-gate.mjs',
});
