// package and protocol identities owned by the current release workflow
export const CLI_PACKAGE_NAME = '@moldea.ai/cli';
export const SEMANTIC_EVALUATION_PROTOCOL_VERSION = 7;

// release files that must carry the exact CLI version
export const CLI_VERSION_TEXT_PATHS = [
  'README.md',
  'docs/compatibility-and-local-tooling.md',
  'fixtures/conformance-cases.json',
  'moldea/SKILL.md',
  'moldea/references/local-tooling.md',
];

// repository-owned release identity paths
export const RELEASE_PATHS = Object.freeze({
  conformanceWorkflow: '.github/workflows/conformance.yml',
  gettingStarted: 'docs/getting-started.md',
  packageLock: 'package-lock.json',
  packageManifest: 'package.json',
  readme: 'README.md',
  semanticCliManifest: 'fixtures/tooling/semantic-cli/package.json',
  semanticResult: 'fixtures/semantic-evaluation-result.json',
  skill: 'moldea/SKILL.md',
  skillLocalTooling: 'moldea/references/local-tooling.md',
});
