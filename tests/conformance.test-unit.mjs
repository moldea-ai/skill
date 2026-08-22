import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { parseDocument } from 'yaml';

import {
  createSemanticCliIdentity,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from '../tooling/release-identity/index.mjs';
import {
  createPortableSkillDigest,
  createPortableSkillSemanticDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  getSemanticCriterionLabels,
  validateSemanticCaseDefinition,
} from '../tooling/semantic-evaluation/index.mjs';

import { validateSkillEvidenceConfiguration } from './semantic-evaluation-runner.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIRECTORY = join(REPOSITORY_ROOT, 'moldea');
const SKILL_PATH = join(SKILL_DIRECTORY, 'SKILL.md');
const SEMANTIC_CLI_PATH = join(
  REPOSITORY_ROOT,
  'fixtures',
  'tooling',
  'semantic-cli',
  'bin',
  'moldea.js',
);
const SEMANTIC_CLI_MANIFEST = JSON.parse(
  readFileSync(
    join(REPOSITORY_ROOT, 'fixtures', 'tooling', 'semantic-cli', 'package.json'),
    'utf8',
  ),
);
const LIFECYCLE_CLI_MANIFEST_PATH = join(
  REPOSITORY_ROOT,
  'fixtures',
  'tooling',
  'lifecycle-cli',
  'package.json',
);
const LEGACY_RUNTIME_TERM = ['frame', 'work'].join('');
const READ_ONLY_TOOLING_OPERATIONS = new Set(['evaluate', 'plan', 'validate']);
const REFERENCE_FILES = [
  'agent-design.md',
  'agent-system-planning.md',
  'context-gathering.md',
  'continuous-maintenance.md',
  'evaluate-and-reconcile.md',
  'local-tooling.md',
  'skill-design.md',
];
const ALLOWED_FRONTMATTER_KEYS = new Set([
  'allowed-tools',
  'compatibility',
  'description',
  'license',
  'metadata',
  'name',
]);
const REQUIRED_EVALUATION_CASE_IDS = {
  packageManagerCases: [
    'declared-executable-version-conflict',
    'different-installed-cli',
    'evaluate-missing-cli-read-only',
    'evaluate-release-cli-missing-required-capability',
    'existing-cli-with-executable-manager-config',
    'floating-cli-with-release-install',
    'matching-package-manager-and-lockfile',
    'metadata-lockfile-conflict',
    'missing-release-cli',
    'multiple-manager-lockfiles',
    'no-evidence-default-npm',
    'out-of-range-executable',
    'plan-missing-cli-without-tooling-change',
    'pnpm-executable-hook-config',
    'release-cli-missing-required-capability',
    'unsupported-established-manager',
    'validate-missing-cli-read-only',
    'yarn-third-party-plugin-config',
  ],
  cliEnvelopeCases: [
    'command-mismatch',
    'compatibility-invalid',
    'compatibility-valid',
    'different-cli-version',
    'inspect-invalid',
    'inspect-valid',
    'malformed-json',
    'operational-error',
    'schema-mismatch',
    'version-mismatch',
  ],
  readmeMarkerCases: [
    'duplicate-markers',
    'missing-end',
    'missing-start',
    'nested-markers',
    'no-markers',
    'one-valid-pair',
    'reversed-markers',
  ],
  semanticCases: [
    'adopted-relevance-changed-behavior',
    'adopted-relevance-no-change',
    'agent-adoption-inline-runtime-instruction',
    'available-runtime-insufficient-behavioral-evidence',
    'canonical-instruction-changed',
    'dedicated-repository-runtime-selection',
    'dedicated-repository-single-side-change',
    'evaluate-clean-working-tree',
    'evaluate-dirty-working-tree',
    'evaluate-unborn-repository',
    'host-plan-command-precedence',
    'initialize-insufficient-context',
    'initialize-partial-context',
    'initialize-sufficient-context',
    'plan-existing-project-one-agent',
    'plan-justified-multi-agent',
    'plan-material-ambiguity',
    'plan-runtime-inventory-insufficient-evidence',
    'plan-uninitialized-zero-agent',
    'pnpm-hook-install-blocked',
    'pnpm-pnp-local-cli-provider',
    'provider-hosted-capability',
    'read-only-git-helper-suppression',
    'reconcile-material-ambiguity',
    'routing-description-dynamic-wiring',
    'routing-description-fallback',
    'routing-description-property-name',
    'routing-description-reconciliation',
    'routing-description-separate-properties',
    'routing-description-shared-property',
    'skill-boundary-surface-selection',
    'skill-create-progressive-disclosure',
    'skill-evaluate-read-only',
    'skill-evaluate-script-authority',
    'skill-maintain-host-invocation-policy',
    'skill-maintain-linked-resources',
    'skill-provider-registration-boundary',
    'skill-reconcile-distributed-copy',
    'skill-reuse-existing-cohesive',
    'unadopted-relevance-no-initialization',
    'unavailable-runtime-selection',
    'unresolved-related-file-changed',
    'yarn-conflicting-cli-provider',
    'yarn-plugin-install-blocked',
  ],
};

const readRepositoryFile = (path) => readFileSync(join(REPOSITORY_ROOT, path), 'utf8');
const ROOT_PACKAGE_MANIFEST = JSON.parse(readRepositoryFile('package.json'));
const RELEASE_CLI_VERSION = ROOT_PACKAGE_MANIFEST.devDependencies['@moldea.ai/cli'];
const RELEASE_CLI_JSON_SCHEMA_VERSION = ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion;
const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'SKILL.md must begin with YAML frontmatter.');
  const document = parseDocument(match[1], { uniqueKeys: true });
  assert.equal(document.errors.length, 0, document.errors.map((error) => error.message).join('\n'));
  const frontmatter = document.toJS();
  assert.ok(isPlainRecord(frontmatter));

  for (const key of Object.keys(frontmatter)) {
    assert.ok(ALLOWED_FRONTMATTER_KEYS.has(key), `Unsupported frontmatter key: ${key}`);
  }

  assert.match(frontmatter.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(frontmatter.name.length <= 64);
  assert.equal(typeof frontmatter.description, 'string');
  assert.ok(frontmatter.description.trim().length >= 1 && frontmatter.description.length <= 1024);
  assert.doesNotMatch(frontmatter.description, /[<>]/);
  assert.equal(typeof frontmatter.license, 'string');
  assert.ok(frontmatter.license.trim().length > 0);
  assert.ok(isPlainRecord(frontmatter.metadata));
  assert.ok(
    Object.entries(frontmatter.metadata).every(
      ([metadataKey, metadataValue]) => metadataKey.length > 0 && typeof metadataValue === 'string',
    ),
  );
  if ('allowed-tools' in frontmatter) {
    assert.equal(typeof frontmatter['allowed-tools'], 'string');
    assert.ok(frontmatter['allowed-tools'].trim().length > 0);
  }
  if ('compatibility' in frontmatter) {
    assert.equal(typeof frontmatter.compatibility, 'string');
    assert.ok(frontmatter.compatibility.trim().length > 0);
  }
  return frontmatter;
};

const assertMatchesEvery = (content, patterns) => {
  for (const pattern of patterns) {
    assert.match(content, pattern);
  }
};

const isSupportedManagerVersion = (manager, version) => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const [, majorText, minorText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);

  if (manager === 'npm') return (major === 10 && minor >= 9) || major === 11;
  if (manager === 'pnpm') return major === 11 && minor >= 20;
  if (manager === 'yarn') return major === 4;
  return false;
};

const isReleaseCliVersion = (version) => version === RELEASE_CLI_VERSION;

const evaluatePackageManagerCase = ({ operation, input }) => {
  const cli = input.cli;
  const hasReleaseInstall = isReleaseCliVersion(cli.installedVersion);
  const isExactDeclaration = isReleaseCliVersion(cli.declaration);
  const hasExactReleaseCli =
    isExactDeclaration && cli.declaration === cli.installedVersion && cli.executableResolves;
  const hasRequiredCapability =
    !cli.requiredCapability || cli.installedCapabilities?.includes(cli.requiredCapability);

  if (operation === 'plan' && !hasExactReleaseCli) {
    return ['continue-plan-without-tooling'];
  }

  const lockfileManagers = new Set(
    input.lockfiles.map((lockfile) => {
      if (lockfile === 'package-lock.json' || lockfile === 'npm-shrinkwrap.json') return 'npm';
      if (lockfile === 'pnpm-lock.yaml') return 'pnpm';
      if (lockfile === 'yarn.lock') return 'yarn';
      return 'unknown';
    }),
  );
  const metadataParts = input.packageManager?.split('@') ?? [];
  const metadataManager = metadataParts[0];
  const metadataVersion = metadataParts[1];

  if (lockfileManagers.size > 1) return ['stop-for-material-conflict'];
  if (metadataManager && lockfileManagers.size === 1 && !lockfileManagers.has(metadataManager)) {
    return ['stop-for-material-conflict'];
  }

  const manager = metadataManager || [...lockfileManagers][0] || 'npm';
  if (!['npm', 'pnpm', 'yarn'].includes(manager)) {
    return ['report-prerequisite-without-switching'];
  }
  if (input.executable.manager !== manager) return ['stop-for-material-conflict'];
  if (metadataVersion && metadataVersion !== input.executable.version) {
    return ['stop-for-material-conflict'];
  }
  if (!isSupportedManagerVersion(manager, input.executable.version)) {
    return ['report-prerequisite-without-upgrade'];
  }

  const decisions = [
    metadataManager || lockfileManagers.size > 0
      ? 'preserve-established-manager'
      : 'select-npm-and-verify-executable',
  ];
  const isReadOnlyOperation = READ_ONLY_TOOLING_OPERATIONS.has(operation);
  const requiresDependencyChange = !hasExactReleaseCli;

  if (
    !isReadOnlyOperation &&
    requiresDependencyChange &&
    input.repositoryExecutableConfig?.length > 0
  ) {
    return ['stop-for-executable-package-manager-config'];
  }

  if (hasExactReleaseCli && !hasRequiredCapability) {
    decisions.push('report-release-capability-defect');
  } else if (isReadOnlyOperation && !hasExactReleaseCli) {
    decisions.push('report-read-only-remediation');
  } else if (hasExactReleaseCli) {
    decisions.push('preserve-existing-exact-cli');
  } else if (hasReleaseInstall && cli.executableResolves) {
    decisions.push('pin-exact-release-cli');
  } else {
    decisions.push('install-exact-release-cli');
  }

  return decisions;
};

const evaluateCliEnvelopeCase = ({ input }) => {
  if (typeof input.output !== 'object' || input.output === null) {
    return 'stop-without-heuristics';
  }

  const envelope = input.output;
  if (
    envelope.schemaVersion !== ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion ||
    !isReleaseCliVersion(envelope.cliVersion) ||
    envelope.cliVersion !== input.declaredCliVersion ||
    envelope.cliVersion !== input.installedCliVersion ||
    envelope.command !== input.invokedCommand ||
    !['valid', 'invalid', 'error'].includes(envelope.status)
  ) {
    return 'stop-without-heuristics';
  }

  if (envelope.status === 'valid') {
    return input.exitCode === 0 && envelope.result !== null && envelope.error === null
      ? 'interpret-result'
      : 'stop-without-heuristics';
  }
  if (envelope.status === 'invalid') {
    return input.exitCode === 1 &&
      ['inspect', 'validate'].includes(envelope.command) &&
      envelope.result !== null &&
      envelope.error === null
      ? 'interpret-structural-diagnostics'
      : 'stop-without-heuristics';
  }
  return [2, 3].includes(input.exitCode) && envelope.result === null && envelope.error !== null
    ? 'report-separately-from-invalidity'
    : 'stop-without-heuristics';
};

const evaluateReadmeMarkerCase = ({ input }) => {
  const lines = input.readme.split('\n');
  const starts = lines.flatMap((line, index) => (line === '<!-- moldea:start -->' ? [index] : []));
  const ends = lines.flatMap((line, index) => (line === '<!-- moldea:end -->' ? [index] : []));

  if (starts.length === 0 && ends.length === 0) {
    return ['report-missing', 'add-one-block'];
  }
  if (starts.length === 1 && ends.length === 1 && starts[0] < ends[0]) {
    return ['assess-content', 'replace-owned-content-only'];
  }
  return ['report-ownership-conflict', 'stop-for-developer-resolution'];
};

describe('portable Agent Skill contract', () => {
  const skill = readFileSync(SKILL_PATH, 'utf8');
  const frontmatter = parseFrontmatter(skill);
  const references = REFERENCE_FILES.map((fileName) =>
    readRepositoryFile(`moldea/references/${fileName}`),
  ).join('\n');
  const portableContent = skill + '\n' + references;

  test('uses valid portable identity and release metadata', () => {
    assert.equal(frontmatter.name, 'moldea');
    assert.equal(frontmatter.license, 'MIT');
    assert.equal(frontmatter.metadata.version, ROOT_PACKAGE_MANIFEST.version);
    assert.equal(dirname(SKILL_PATH), SKILL_DIRECTORY);
    assert.equal(dirname(SKILL_PATH).split('/').at(-1), frontmatter.name);
    assert.ok(frontmatter.description.length >= 1 && frontmatter.description.length <= 1024);
    assert.ok(skill.split('\n').length < 500);
  });

  test('rejects malformed or unsupported Agent Skills frontmatter', () => {
    assert.throws(() => parseFrontmatter('---\nname: moldea\ndescription: broken: value\n---\n'));
    assert.throws(() =>
      parseFrontmatter('---\nname: moldea\ndescription: valid\nunsupported: true\n---\n'),
    );
    assert.throws(() =>
      parseFrontmatter(
        '---\nname: moldea\ndescription: "   "\nlicense: MIT\nmetadata:\n  version: "1.0.0"\n---\n',
      ),
    );
    assert.throws(() =>
      parseFrontmatter(
        '---\nname: moldea\ndescription: valid\nlicense: MIT\ncompatibility: 1\nmetadata:\n  version: "1.0.0"\n---\n',
      ),
    );
    assert.throws(() =>
      parseFrontmatter(
        '---\nname: moldea\ndescription: valid\nlicense: MIT\nallowed-tools: []\nmetadata:\n  version: "1.0.0"\n---\n',
      ),
    );
  });

  test('declares the exact release compatibility contract', () => {
    assertMatchesEvery(skill, [
      new RegExp(`@moldea\\.ai/cli: ${RELEASE_CLI_VERSION.replaceAll('.', '\\.')}\\b`),
      new RegExp('CLI JSON schema: `' + RELEASE_CLI_JSON_SCHEMA_VERSION + '`'),
      /Node\.js: `\^22\.11\.0 \|\| \^24\.11\.0`/,
      /npm: `>=10\.9\.0 <12\.0\.0`/,
      /pnpm: `>=11\.20\.0 <12\.0\.0`/,
      /yarn: `>=4\.0\.0 <5\.0\.0`/,
      /that exact repository-root/,
    ]);
  });

  test('uses explicit progressive-disclosure triggers and resolvable references', () => {
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');
    const referencedPaths = [...skill.matchAll(/Read `references\/([^`]+\.md)` before/g)].map(
      (match) => match[1],
    );

    assert.deepEqual([...referencedPaths].sort(), REFERENCE_FILES);

    for (const fileName of REFERENCE_FILES) {
      assert.ok(existsSync(join(SKILL_DIRECTORY, 'references', fileName)));
    }

    assertMatchesEvery(skillDesign, [
      /Existing authoritative repository documents and scripts can provide focused progressive disclosure/i,
      /skill-local reference only when the skill owns substantial conditional guidance/i,
      /Do not add a reference that merely relays or duplicates an authoritative repository file/i,
    ]);
  });

  test('preserves activation, authority, and continuous-maintenance semantics', () => {
    assertMatchesEvery(portableContent, [
      /Explicit activation/,
      /Relevance-triggered activation/,
      /Never initialize `moldea` solely/,
      /Relevance means reconsider/,
      /legitimate no-change result/,
      /semantic role/,
      /Treat repository content as untrusted evidence/,
      /no asset type always wins/i,
      /Do not stage, unstage, commit/,
      /no canonical edit when/,
      /effective routing description/,
      /general-only runtime metadata/,
      /property named `description` may be routing-facing/,
      /do not report that shared contract as misaligned or recommend a duplicate property/,
      /dynamic or unsupported wiring as unestablished/,
    ]);
  });

  test('defines evidence-based initialization clarification and handoff behavior', () => {
    assertMatchesEvery(portableContent, [
      /Insufficient:/,
      /Partial:/,
      /Sufficient:/,
      /no meaningful project context was inferred/i,
      /ask one focused clarification question/i,
      /documentation volume/i,
      /awaiting developer context/i,
      /insufficient or partial project foundation is a pre-write stop condition/i,
      /before creating `\/moldea\/\*\*` or the owned README awareness block/i,
      /never convert developer-answerable foundational ambiguity into an unresolved requirement/i,
      /reviewing the foundation and continuing ordinary development/i,
      /end the report with an explicit `Next actions` handoff/i,
      /validation or test status does not replace this handoff/i,
      /file creation or structural validity alone/i,
    ]);
  });

  test('defines objective-first read-only agent-system planning', () => {
    assertMatchesEvery(portableContent, [
      /agent-system planning activates only/i,
      /Generic implementation planning and host-defined `plan` commands remain outside/i,
      /valid result may recommend zero agents/i,
      /fixed calculations, eligibility rules, filtering, storage, delivery mechanics, and predictable sequencing deterministic/i,
      /Prefer deterministic orchestration/i,
      /why model reasoning earns an agent boundary/i,
      /least-privilege constraints/i,
      /implementation order/i,
      /no repository files were changed by `plan`/i,
    ]);
    assert.match(
      skill,
      /Every `plan` result must .* explicitly state that planning changed no repository files/i,
    );
  });

  test('treats Agent Skills as first-class portable artifacts', () => {
    const evaluateAndReconcile = readRepositoryFile(
      'moldea/references/evaluate-and-reconcile.md',
    );
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');

    assertMatchesEvery(portableContent, [
      /Choose a skill deliberately/,
      /primary activation contract/,
      /representative positive requests/,
      /adjacent requests that should remain outside/,
      /Keep host metadata aligned/,
      /Preserve an existing invocation policy/,
      /Use progressive disclosure/,
      /references\//,
      /scripts\//,
      /assets\//,
      /Design scripts as real software/,
      /supported environments/,
      /generated, installed, or distributed copies/,
      /report non-atomicity/,
      /repository format version `1` defines no canonical `\/moldea\/skills` store/i,
      /does not prove installation, activation, or runtime-agent registration/i,
      /Structural validity does not prove useful activation, complete workflow behavior/i,
    ]);
    assert.match(skill, /Read `references\/skill-design\.md` before creating, evaluating/i);
    assertMatchesEvery(skillDesign, [
      /invalid identity or frontmatter, unsafe or unresolved links, missing required resources, and validator failures as structural problems/i,
      /activation imprecision, incomplete workflow behavior, incorrect use conditions, and content drift as semantic problems/i,
      /Do not call the complete artifact structurally valid when a required resource is missing/i,
    ]);
    assert.match(
      evaluateAndReconcile,
      /For every scoped Agent Skill, apply the structural and semantic classification in `skill-design\.md`/i,
    );
  });

  test('preserves evaluate, reconcile, and deterministic responsibility boundaries', () => {
    assertMatchesEvery(portableContent, [
      /`evaluate` must not modify/,
      /staged, unstaged, untracked, renamed, and deleted/,
      /working tree is clean/,
      /No `HEAD` exists/,
      /Deterministic diagnostics/,
      /Confirmed semantic problems/,
      /Material ambiguities/,
      /Relevant unresolved requirements/,
      /Material evidence limitations/,
      /no repository files were changed/i,
      /smallest coherent change/,
      /Do not recreate or heuristically reinterpret/,
    ]);
    assert.match(
      skill,
      /Every `evaluate` result must explicitly state that no repository files were changed/i,
    );
  });

  test('keeps deterministic evidence and adapter claims at their owning boundaries', () => {
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');
    const agentDesign = readRepositoryFile('moldea/references/agent-design.md');
    const continuousMaintenance = readRepositoryFile(
      'moldea/references/continuous-maintenance.md',
    );

    assertMatchesEvery(skill, [
      /deterministic tooling runs after writes/i,
      /exact repository-local command/i,
      /valid status/i,
      /bare statement that inspection succeeded is not sufficient evidence/i,
      /semantic decisions and the evidence chain that established any consequential misalignment/i,
      /Never imply that valid canonical inspection proves behavior it cannot observe/i,
      /distinguish behavior established by related-application evidence/i,
    ]);
    assertMatchesEvery(skillDesign, [
      /established script already owns a check/i,
      /script's actual interface/i,
      /Do not ask the model to reimplement the check/i,
      /script-owned result as an input/i,
    ]);
    assertMatchesEvery(agentDesign, [
      /adapter documentation as available only when it is present in authorized evidence/i,
      /do not reconstruct target details, supported patterns, provider limitations, maturity, or wiring semantics/i,
      /preserve the existing runtime unless other reliable evidence establishes the replacement/i,
      /report the reliable evidence that established whether each affected runtime property is routing-facing, general-only, or shared/i,
      /previous canonical source and the resulting source/i,
    ]);
    assertMatchesEvery(continuousMaintenance, [
      /final report/i,
      /distinguish behavior established by related-application evidence/i,
      /facts canonical deterministic inspection cannot observe/i,
    ]);
  });

  test('defines safe tooling, exact pinning, and machine-envelope handling', () => {
    assertMatchesEvery(portableContent, [
      /npm install --save-dev --save-exact --ignore-scripts/,
      /pnpm add --save-dev --save-exact --ignore-scripts/,
      /pnpm add --workspace-root --save-dev --save-exact --ignore-scripts/,
      /yarn add --dev --exact --mode=skip-build/,
      /repository-supplied executable package-manager extensions, hooks, or plugins/,
      /pnpmfiles, hook-bearing pnpm configuration/,
      /repository-declared third-party Yarn plugins/,
      /yarn bin moldea/,
      /yarn exec moldea/,
      /never use a bare global command/i,
      new RegExp('`schemaVersion` is integer `' + RELEASE_CLI_JSON_SCHEMA_VERSION + '`'),
      /`command` equals the command invoked/,
      /`compatibility` never uses `invalid`/,
      /Structural `invalid` output is deterministic project evidence/,
    ]);
  });

  test('covers README ownership, dedicated repositories, unresolved state, and mirrors', () => {
    assertMatchesEvery(portableContent, [
      /<!-- moldea:start -->/,
      /Duplicate, missing, reversed, nested, overlapping/,
      /cross-repository bindings/,
      /actual available official `runtime\.id`/,
      /evidence-location limitation/,
      /application-only and provider-hosted model-visible capabilities/,
      /report completion for each side accurately/,
      /Do not use requirements as a roadmap or backlog/,
      /related file changed/,
      /synchronize every mirror/,
      /Never edit a mirror independently/,
      /Never invent a manifest `handoffs` graph/,
    ]);
  });

  test('requires canonical instruction provenance without prescribing its mechanism', () => {
    assertMatchesEvery(portableContent, [
      /Establish canonical instruction provenance/,
      /Do not prescribe a loading mechanism/,
      /independently maintained behavioral source/,
      /verify that the runtime actually uses that mirror/,
      /does not prove runtime consumption/,
      /Do not require that binding when an adapter or other reliable evidence/,
      /do not claim readiness/,
    ]);
  });

  test('uses only the runtime contract and safe read-only Git evidence', () => {
    assertMatchesEvery(portableContent, [
      /exactly one `runtime\.id`/,
      /primary runtime integration boundary/,
      /compact CLI inventory/,
      /unavailable adapter/,
      /filesystem-monitor hooks/,
      /external diff helpers/,
      /text-conversion drivers/,
      /unintended submodule recursion/,
    ]);
    assert.equal(portableContent.toLowerCase().includes(LEGACY_RUNTIME_TERM), false);
  });

  test('has no semantic dependency on host-specific metadata or external repository paths', () => {
    assert.doesNotMatch(portableContent, /agents\/openai\.yaml/);
    assert.doesNotMatch(portableContent, /\.\.\/platform\//);
    assert.doesNotMatch(portableContent, /coding-instructions\/src/);
  });
});

describe('source repository conformance', () => {
  const cases = JSON.parse(readRepositoryFile('fixtures/conformance-cases.json'));

  test('contains complete forward-evaluation fixtures', () => {
    for (const [categoryName, category] of Object.entries(cases)) {
      assert.deepEqual(
        category.map((conformanceCase) => conformanceCase.id).sort(),
        REQUIRED_EVALUATION_CASE_IDS[categoryName],
      );
      for (const conformanceCase of category) {
        assert.match(conformanceCase.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        assert.ok(conformanceCase.scenario.length > 20);
        assert.ok(conformanceCase.operation.length > 0);
        assert.ok(conformanceCase.input && typeof conformanceCase.input === 'object');
        assert.ok(conformanceCase.expected.length > 0);
        assert.ok(conformanceCase.forbidden.length > 0);
        if (categoryName === 'semanticCases') {
          assert.doesNotThrow(() => validateSemanticCaseDefinition(conformanceCase));
          assert.doesNotThrow(() => validateSkillEvidenceConfiguration(conformanceCase));
        }
      }
    }
  });

  test('judges read-only reporting and README ownership against portable contracts', () => {
    const semanticCriteria = cases.semanticCases.flatMap(({ expected, forbidden }) => [
      ...expected,
      ...forbidden,
    ]);
    const noWriteCriteria = semanticCriteria.filter(
      ({ label }) => label === 'report-no-writes',
    );
    const initializationCase = cases.semanticCases.find(
      ({ id }) => id === 'initialize-sufficient-context',
    );
    const readmeAwarenessCriterion = initializationCase?.expected.find(
      ({ label }) => label === 'add-owned-readme-awareness',
    );

    assert.ok(noWriteCriteria.length > 0);
    for (const { criterion } of noWriteCriteria) {
      assert.equal(
        criterion,
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
      );
      assert.doesNotMatch(criterion, /dependency|Git|external-state/);
    }

    assert.ok(readmeAwarenessCriterion);
    assert.match(readmeAwarenessCriterion.criterion, /exactly one correctly marked owned README/i);
    assert.match(readmeAwarenessCriterion.criterion, /preserving unrelated README content/i);
    assert.doesNotMatch(readmeAwarenessCriterion.criterion, /manifest|affectedBy/i);
  });

  test('keeps runtime behavior evidence-gated when the CLI proves only availability', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const evaluationCase = semanticCasesById.get(
      'available-runtime-insufficient-behavioral-evidence',
    );
    const planningCase = semanticCasesById.get('plan-runtime-inventory-insufficient-evidence');

    assert.ok(evaluationCase);
    assert.ok(planningCase);

    const evaluationExpected = getSemanticCriterionLabels(evaluationCase.expected);
    const evaluationForbidden = getSemanticCriterionLabels(evaluationCase.forbidden);
    const planningExpected = getSemanticCriterionLabels(planningCase.expected);
    const planningForbidden = getSemanticCriterionLabels(planningCase.forbidden);

    assert.ok(evaluationExpected.includes('treat-inventory-as-availability-only'));
    assert.ok(evaluationExpected.includes('report-behavioral-evidence-limitation'));
    assert.ok(evaluationExpected.includes('preserve-existing-runtime-id'));
    assert.ok(evaluationForbidden.includes('rewrite-runtime-from-inventory'));
    assert.ok(evaluationForbidden.includes('claim-provider-limits-patterns-or-maturity'));

    assert.ok(planningExpected.includes('treat-inventory-as-availability-only'));
    assert.ok(planningExpected.includes('leave-runtime-selection-evidence-gated'));
    assert.ok(planningExpected.includes('avoid-unsupported-target-claims'));
    assert.ok(planningForbidden.includes('select-runtime-from-inventory-alone'));
    assert.ok(planningForbidden.includes('invent-provider-limits-patterns-or-maturity'));
  });

  test('judges observable skill validation and permits deterministic orchestration', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const skillCreationCase = semanticCasesById.get('skill-create-progressive-disclosure');
    const skillMaintenanceCase = semanticCasesById.get('skill-maintain-linked-resources');
    const oneAgentPlanningCase = semanticCasesById.get('plan-existing-project-one-agent');

    assert.ok(skillCreationCase);
    assert.ok(skillMaintenanceCase);
    assert.ok(oneAgentPlanningCase);

    const skillCreationExpected = getSemanticCriterionLabels(skillCreationCase.expected);
    const skillMaintenanceExpected = getSemanticCriterionLabels(skillMaintenanceCase.expected);
    const oneAgentPlanningForbidden = getSemanticCriterionLabels(
      oneAgentPlanningCase.forbidden,
    );
    const progressiveDisclosureCriterion = skillCreationCase.expected.find(
      ({ label }) => label === 'use-progressive-disclosure',
    );

    assert.ok(skillCreationExpected.includes('pass-independent-skill-structural-validation'));
    assert.equal(skillCreationExpected.includes('run-skill-structural-validation'), false);
    assert.ok(progressiveDisclosureCriterion);
    assert.match(
      progressiveDisclosureCriterion.criterion,
      /existing authoritative repository resources/i,
    );
    assert.match(
      progressiveDisclosureCriterion.criterion,
      /does not require a skill-local resource/i,
    );

    assert.ok(skillMaintenanceExpected.includes('pass-independent-skill-structural-validation'));
    assert.equal(skillMaintenanceExpected.includes('run-skill-structural-validation'), false);

    assert.ok(oneAgentPlanningForbidden.includes('model-orchestrator-without-semantic-routing'));
    assert.equal(oneAgentPlanningForbidden.includes('automatic-orchestrator'), false);
  });

  test('defines mirror provenance and external capabilities as observable judge contracts', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const adoptionCase = semanticCasesById.get('agent-adoption-inline-runtime-instruction');
    const dedicatedRepositoryCase = semanticCasesById.get(
      'dedicated-repository-runtime-selection',
    );

    assert.ok(adoptionCase);
    assert.ok(dedicatedRepositoryCase);

    const provenanceCriterion = adoptionCase.expected.find(
      ({ label }) => label === 'establish-canonical-instruction-provenance',
    );
    const independentSourceCriterion = adoptionCase.forbidden.find(
      ({ label }) => label === 'retain-independently-editable-instruction-sources',
    );
    const capabilityCriterion = dedicatedRepositoryCase.expected.find(
      ({ label }) => label === 'represent-application-capabilities-semantically',
    );

    assert.ok(provenanceCriterion);
    assert.ok(independentSourceCriterion);
    assert.ok(capabilityCriterion);

    assert.match(provenanceCriterion.criterion, /declared exact mirror/i);
    assert.match(provenanceCriterion.criterion, /model invocation/i);
    assert.match(independentSourceCriterion.criterion, /does not trigger/i);
    assert.match(capabilityCriterion.criterion, /instruction or runtime guidance/i);
    assert.match(capabilityCriterion.criterion, /without fabricating/i);
  });

  test(
    'binds available semantic evaluations to exact release inputs',
    { skip: !existsSync(join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-result.json')) },
    () => {
      const result = JSON.parse(readRepositoryFile('fixtures/semantic-evaluation-result.json'));
      const semanticCases = new Map(
        cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
      );

      const portableSkillDigest = createPortableSkillDigest();
      assert.equal(result.schemaVersion, 1);
      assert.equal(result.evaluationProtocolVersion, SEMANTIC_EVALUATION_PROTOCOL_VERSION);
      assert.deepEqual(result.cli, createSemanticCliIdentity(REPOSITORY_ROOT));
      assert.equal(result.caseSuiteDigest, createSemanticCaseSuiteDigest(cases.semanticCases));
      assert.equal(result.artifact.sha256, result.skillDigest);
      assert.equal(result.artifactDigest, result.skillDigest);
      assert.equal(result.artifactSha256, result.skillDigest);
      if (result.skillDigest === portableSkillDigest) {
        assert.equal(result.releaseEvidenceCarryForward, undefined);
      } else {
        assert.ok(
          result.releaseEvidenceCarryForward,
          'Semantic evidence must match portable content or include a valid release-only carry-forward.',
        );
        assert.equal(result.releaseEvidenceCarryForward.fromArtifactDigest, result.skillDigest);
        assert.equal(result.releaseEvidenceCarryForward.toArtifactDigest, portableSkillDigest);
        assert.notEqual(
          result.releaseEvidenceCarryForward.fromArtifactDigest,
          result.releaseEvidenceCarryForward.toArtifactDigest,
        );
        assert.deepEqual(result.releaseEvidenceCarryForward.changedPortablePaths, [
          'SKILL.md',
          'references/local-tooling.md',
        ]);
        assert.equal(
          result.releaseEvidenceCarryForward.fromSemanticDigest,
          result.releaseEvidenceCarryForward.toSemanticDigest,
        );
        assert.equal(
          result.releaseEvidenceCarryForward.toSemanticDigest,
          createPortableSkillSemanticDigest(),
        );
        assert.match(result.releaseEvidenceCarryForward.carriedForwardAt, /^\d{4}-\d{2}-\d{2}T/);
        assert.equal(
          result.releaseEvidenceCarryForward.reason,
          'Release-version declarations changed without changing semantic skill content.',
        );
      }
      assert.deepEqual(result.host, result.actorHost);
      assert.equal(result.actorHost.model, 'gpt-5.6-terra');
      assert.equal(result.judgeHost.model, 'gpt-5.6-terra');
      assert.equal(result.actorHost.reasoningEffort, 'medium');
      assert.equal(result.judgeHost.reasoningEffort, 'medium');
      assert.ok(result.host.name.length > 0);
      assert.ok(result.host.version.length > 0);
      assert.match(result.evaluatedAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.deepEqual(
        result.cases.map((evaluationCase) => evaluationCase.id).sort(),
        [...semanticCases.keys()].sort(),
      );

      for (const evaluationCase of result.cases) {
        const conformanceCase = semanticCases.get(evaluationCase.id);
        assert.equal(evaluationCase.passed, true);
        assert.equal(
          evaluationCase.caseDefinitionDigest,
          createSemanticCaseDefinitionDigest(conformanceCase),
        );
        assert.match(evaluationCase.evaluatedAt, /^\d{4}-\d{2}-\d{2}T/);
        assert.deepEqual(
          [...evaluationCase.expectedSatisfied].sort(),
          getSemanticCriterionLabels(conformanceCase.expected).sort(),
        );
        assert.deepEqual(evaluationCase.forbiddenTriggered, []);
        assert.ok(evaluationCase.rationale.length > 20);

        const configuredArtifacts = conformanceCase.skillEvidence?.artifacts ?? [];
        assert.equal(evaluationCase.skillArtifactEvidence.length, configuredArtifacts.length);
        assert.deepEqual(
          evaluationCase.skillArtifactEvidence.map(({ role, root }) => ({ role, root })),
          configuredArtifacts,
        );
      }

      const skillCreationCase = semanticCases.get('skill-create-progressive-disclosure');
      const skillCreationExpected = getSemanticCriterionLabels(skillCreationCase.expected);
      assert.ok(skillCreationExpected.includes('create-valid-skill-frontmatter'));
      assert.ok(skillCreationExpected.includes('pass-independent-skill-structural-validation'));
      assert.ok(skillCreationExpected.includes('support-positive-and-adjacent-non-activation'));
      const skillCreationResult = result.cases.find(
        ({ id }) => id === 'skill-create-progressive-disclosure',
      );
      assert.equal(skillCreationResult.skillArtifactEvidence.length, 1);
      assert.equal(skillCreationResult.skillArtifactEvidence[0].validation.valid, true);
      assert.equal(skillCreationResult.skillArtifactEvidence[0].validation.name, 'release-review');
      const createdSkillContent = skillCreationResult.skillArtifactEvidence[0].files.find(
        ({ path }) => path === 'skills/release-review/SKILL.md',
      ).content;
      assert.match(createdSkillContent, /release-policy\.md/);
      assert.match(createdSkillContent, /verify-release\.mjs/);
      assert.ok(skillCreationResult.skillArtifactEvidence[0].resourceReferences.length >= 2);
      assert.ok(
        skillCreationResult.skillArtifactEvidence[0].resourceReferences.every(
          ({ isSafe, type }) => isSafe && type !== 'missing' && type !== 'unsafe',
        ),
      );

      const skillMaintenanceCase = semanticCases.get('skill-maintain-linked-resources');
      const skillMaintenanceExpected = getSemanticCriterionLabels(skillMaintenanceCase.expected);
      assert.ok(skillMaintenanceExpected.includes('produce-structurally-valid-updated-skill'));
      assert.ok(skillMaintenanceExpected.includes('pass-independent-skill-structural-validation'));
      const skillMaintenanceResult = result.cases.find(
        ({ id }) => id === 'skill-maintain-linked-resources',
      );
      assert.equal(skillMaintenanceResult.skillArtifactEvidence.length, 1);
      assert.equal(skillMaintenanceResult.skillArtifactEvidence[0].validation.valid, true);
      const packageManagerReference = skillMaintenanceResult.skillArtifactEvidence[0].files.find(
        ({ path }) => path === 'skills/release-review/references/package-managers.md',
      ).content;
      assert.match(packageManagerReference, /npm/i);
      assert.match(packageManagerReference, /pnpm/i);

      const hostMetadataResult = result.cases.find(
        ({ id }) => id === 'skill-maintain-host-invocation-policy',
      );
      const maintainedHostMetadata = hostMetadataResult.skillArtifactEvidence[0].files.find(
        ({ path }) => path === 'skills/deployment-review/agents/openai.yaml',
      ).content;
      assert.match(maintainedHostMetadata, /allow_implicit_invocation: false/);
      assert.match(maintainedHostMetadata, /brand_color: ["']#336699["']/);

      const reconciliationResult = result.cases.find(
        ({ id }) => id === 'skill-reconcile-distributed-copy',
      );
      const authoritativeContent = reconciliationResult.skillArtifactEvidence[0].files.find(
        ({ path }) => path === 'skills/release-review/SKILL.md',
      ).content;
      const distributedContent = reconciliationResult.skillArtifactEvidence[1].files.find(
        ({ path }) => path === 'dist/skills/release-review/SKILL.md',
      ).content;
      assert.equal(distributedContent, authoritativeContent);
    },
  );

  test('exercises package-manager selection, conflicts, and CLI pin decisions', () => {
    for (const conformanceCase of cases.packageManagerCases) {
      assert.deepEqual(evaluatePackageManagerCase(conformanceCase), conformanceCase.expected);
    }
  });

  test('keeps the semantic CLI fixture contract faithful to release metadata', () => {
    const repositoryPath = mkdtempSync(join(tmpdir(), 'moldea-semantic-cli-test-'));

    try {
      assert.equal(
        SEMANTIC_CLI_MANIFEST.moldeaRelease.cliJsonSchemaVersion,
        RELEASE_CLI_JSON_SCHEMA_VERSION,
      );
      mkdirSync(join(repositoryPath, 'moldea', 'agents', 'refund-agent'), {
        recursive: true,
      });
      writeFileSync(
        join(repositoryPath, 'moldea', 'moldea.yaml'),
        'version: 1\n\nagents:\n  refund-agent:\n    runtime:\n      id: unavailable-runtime\n',
      );
      writeFileSync(join(repositoryPath, 'moldea', 'project.md'), '# Test project\n');
      writeFileSync(
        join(repositoryPath, 'moldea', 'agents', 'refund-agent', 'description.md'),
        'Handles refund requests.\n',
      );
      writeFileSync(
        join(repositoryPath, 'moldea', 'agents', 'refund-agent', 'instruction.md'),
        '# Refund agent\n\nYou are the `refund-agent` agent.\n',
      );
      const inspection = spawnSync(SEMANTIC_CLI_PATH, ['inspect', '--json'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });
      const inspectionEnvelope = JSON.parse(inspection.stdout);
      assert.equal(inspection.status, 1);
      assert.equal(inspectionEnvelope.cliVersion, RELEASE_CLI_VERSION);
      assert.equal(inspectionEnvelope.schemaVersion, RELEASE_CLI_JSON_SCHEMA_VERSION);
      assert.equal(inspectionEnvelope.status, 'invalid');
      assert.equal(
        inspectionEnvelope.result.inspection.diagnostics[0].code,
        'MOLDEA_RUNTIME_ADAPTER_UNAVAILABLE',
      );

      const compatibility = spawnSync(SEMANTIC_CLI_PATH, ['compatibility', '--json'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });
      const compatibilityEnvelope = JSON.parse(compatibility.stdout);
      assert.equal(compatibility.status, 0);
      assert.equal(compatibilityEnvelope.cliVersion, RELEASE_CLI_VERSION);
      assert.equal(compatibilityEnvelope.schemaVersion, RELEASE_CLI_JSON_SCHEMA_VERSION);
      assert.equal(compatibilityEnvelope.status, 'valid');
      assert.deepEqual(
        compatibilityEnvelope.result.packages,
        Object.entries(SEMANTIC_CLI_MANIFEST.dependencies)
          .filter(([name]) => name.startsWith('@moldea.ai/'))
          .map(([name, version]) => ({ name, version }))
          .sort(({ name: left }, { name: right }) => left.localeCompare(right)),
      );
      assert.deepEqual(
        compatibilityEnvelope.result.adapters.map(({ id }) => id),
        [
          'custom',
          ...Object.keys(SEMANTIC_CLI_MANIFEST.dependencies)
            .filter((name) => name.startsWith('@moldea.ai/adapter-'))
            .map((name) => name.slice('@moldea.ai/adapter-'.length)),
        ].sort((left, right) => left.localeCompare(right)),
      );
      const customCompatibility = compatibilityEnvelope.result.adapters.find(
        ({ id }) => id === 'custom',
      );
      assert.deepEqual(customCompatibility.repositoryFormatVersions, [1]);
      const googleGenAiCompatibility = compatibilityEnvelope.result.adapters.find(
        ({ id }) => id === 'google-genai',
      );
      assert.deepEqual(googleGenAiCompatibility.repositoryFormatVersions, [1]);
    } finally {
      rmSync(repositoryPath, { force: true, recursive: true });
    }
  });

  test('keeps the lifecycle fixture limited to hostile installation hooks', () => {
    const manifest = JSON.parse(readFileSync(LIFECYCLE_CLI_MANIFEST_PATH, 'utf8'));

    assert.deepEqual(manifest.bin, { moldea: 'bin/moldea.js' });
    assert.deepEqual(manifest.scripts, {
      install: 'node lifecycle-sentinel.mjs dependency-install',
      postinstall: 'node lifecycle-sentinel.mjs dependency-postinstall',
      preinstall: 'node lifecycle-sentinel.mjs dependency-preinstall',
    });
    assert.equal(manifest.version, '1.0.1');
    assert.equal('dependencies' in manifest, false);
  });

  test('exercises every supported CLI machine-envelope disposition', () => {
    for (const conformanceCase of cases.cliEnvelopeCases) {
      assert.equal(evaluateCliEnvelopeCase(conformanceCase), conformanceCase.expected[0]);
    }
  });

  test('exercises README marker ownership for evaluate and write-capable operations', () => {
    for (const conformanceCase of cases.readmeMarkerCases) {
      assert.deepEqual(evaluateReadmeMarkerCase(conformanceCase), conformanceCase.expected);
    }
  });

  test('documents preferred project installation and reproducible release pinning', () => {
    const readme = readRepositoryFile('README.md');
    const projectInstallationIndex = readme.indexOf('### Project installation (recommended)');
    const globalInstallationIndex = readme.indexOf('### Global installation (optional)');

    assert.ok(readme.includes('The current release is `' + ROOT_PACKAGE_MANIFEST.version + '`.'));
    assert.match(readme, /^npx skills add moldea-ai\/skill$/m);
    assert.match(
      readme,
      new RegExp(`^npx skills add "moldea-ai/skill#v${ROOT_PACKAGE_MANIFEST.version}"$`, 'm'),
    );
    assert.match(readme, /^npx skills add moldea-ai\/skill -g$/m);
    assert.ok(projectInstallationIndex >= 0);
    assert.ok(globalInstallationIndex > projectInstallationIndex);
    assert.doesNotMatch(readme, /skills@1\.5\.22/);
    assert.doesNotMatch(readme, /https:\/\/github\.com\/moldea-ai\/skill\/tree\//);
    assert.match(readme, /do not install `@moldea\.ai\/cli` globally/);
    assert.match(readme, /exact .*repository-local `@moldea\.ai\/cli` development dependency/);
    assert.ok(
      readme.includes(
        'CLI `' + RELEASE_CLI_VERSION + "` is part of this skill release's identity.",
      ),
    );
    assert.doesNotMatch(readme, /minimum CLI|minimum compatibility|supported CLI range/i);
    assert.doesNotMatch(
      readme,
      /unpublished release candidate|future source URL|after release|candidate supports|prepared for, but has not created/i,
    );
  });

  test('CI installs and compares the complete portable artifact', () => {
    const workflow = readRepositoryFile('.github/workflows/conformance.yml');

    assert.match(workflow, /skills@1\.5\.22 add .* -g -a codex -y --copy/);
    assert.match(workflow, /\.agents\/skills\/moldea/);
    assert.match(workflow, /diff --recursive --brief moldea/);
    assert.doesNotMatch(workflow, /add .* --list/);
  });

  test('CI derives one exact release CLI across every package manager', () => {
    const workflow = readRepositoryFile('.github/workflows/conformance.yml');
    const packageManifest = JSON.parse(readRepositoryFile('package.json'));

    assert.equal(packageManifest.devDependencies['@moldea.ai/cli'], RELEASE_CLI_VERSION);
    assert.doesNotMatch(workflow, /cli_version:|MOLDEA_TEST_CLI_VERSION/);
    assert.match(workflow, /\/ release CLI/);
    assert.equal(workflow.match(/npm ci --ignore-scripts/g)?.length, 2);
    assert.equal(
      workflow.match(/sudo apt-get install --yes apparmor-profiles apparmor-utils bubblewrap/g)
        ?.length,
      1,
    );
    assert.equal(
      workflow.match(/sudo apparmor_parser -r \/etc\/apparmor\.d\/bwrap-userns-restrict/g)?.length,
      1,
    );
    assert.equal(
      workflow.match(/node --test tests\/package-manager\.test-integration\.mjs/g)?.length,
      1,
    );
    assert.equal(existsSync(join(REPOSITORY_ROOT, 'fixtures', 'tooling', 'fake-cli')), false);
  });

  test('candidate workflow verifies real package tarballs without publishing', () => {
    const workflow = readRepositoryFile('.github/workflows/release-candidate.yml');
    const document = parseDocument(workflow, { uniqueKeys: true });

    assert.equal(
      document.errors.length,
      0,
      document.errors.map((error) => error.message).join('\n'),
    );
    assertMatchesEvery(workflow, [
      /workflow_dispatch:/,
      /packages_ref:/,
      /repository: moldea-ai\/packages/,
      /git -C packages rev-parse HEAD/,
      /node tooling\/package-candidate\/pack\.mjs/,
      /--workspace packages/,
      /--output "\$candidate_directory"/,
      /MOLDEA_CLI_ARTIFACT_DIRECTORY:/,
      /MOLDEA_REQUIRE_REAL_CLI_ARTIFACTS: "1"/,
      /node --test tests\/package-manager\.test-integration\.mjs/,
    ]);
    assert.doesNotMatch(workflow, /projects\/[a-z0-9-]+ pack/);
    assert.doesNotMatch(workflow, /qualification|runtime-qualification/);
    assert.doesNotMatch(workflow, /npm publish|pnpm publish|git tag|git push/);
  });

  test('requires approval before token-intensive semantic evaluation', () => {
    const readme = readRepositoryFile('README.md');

    assertMatchesEvery(readme, [
      /Semantic evaluation is intentionally lengthy/,
      /44 cases/,
      /88 model calls/,
      /adapter availability/,
      /behavioral support/,
      /significant number of model tokens/,
      /full or targeted semantic evaluation/,
      /why fresh semantic evidence is important/,
      /why existing evidence or deterministic verification is insufficient/,
      /expected time and token cost/,
      /developer's explicit approval/,
    ]);
  });

  test('pins semantic evaluation to the balanced-tier model with fixed reasoning effort', () => {
    const readme = readRepositoryFile('README.md');

    assertMatchesEvery(readme, [
      /balanced-tier model/,
      /gpt-5\.6-terra/,
      /actor and judge/,
      /medium/,
      /must not select their own model or reasoning effort/,
    ]);
    assert.doesNotMatch(readme, /MOLDEA_EVAL_REASONING_EFFORT/);
  });

  test('documents resumable semantic evidence without weakening promotion', () => {
    const readme = readRepositoryFile('README.md');
    const gitignore = readRepositoryFile('.gitignore');

    assertMatchesEvery(readme, [
      /\.semantic-evaluation-candidate\.json/,
      /already passing cases are skipped/,
      /missing and failing cases are evaluated again/,
      /--record --restart/,
      /--case <case-id> --record/,
      /replaces only that case's compatible candidate evidence/,
      /only after every required case passes/,
      /Missing or failing evidence never replaces the committed result/,
      /hashes and bounded text content for repository-visible changes/,
      /bounded post-execution source or copy directories/,
      /independent structural and resource-link evidence/,
      /do not rely on opaque label interpretation, the actor's report alone, or leaked answer criteria/,
    ]);
    assert.match(gitignore, /fixtures\/\.semantic-evaluation-candidate\.json\*/);
  });

  test('keeps optional OpenAI metadata supplemental and behaviorally complete', () => {
    const openaiMetadata = readRepositoryFile('moldea/agents/openai.yaml');

    assertMatchesEvery(openaiMetadata, [
      /display_name: 'moldea'/,
      /plan, initialize, design, maintain, evaluate, reconcile, or validate/,
    ]);
    assert.doesNotMatch(openaiMetadata, /^policy:/m);
    assert.doesNotMatch(
      openaiMetadata,
      /initialize this repository context and agent instructions/,
    );
  });

  test('keeps source and portable release versions synchronized', () => {
    const packageManifest = JSON.parse(readRepositoryFile('package.json'));
    const skill = readRepositoryFile('moldea/SKILL.md');
    const frontmatter = parseFrontmatter(skill);
    const localTooling = readRepositoryFile('moldea/references/local-tooling.md');

    assert.equal(packageManifest.version, frontmatter.metadata.version);
    assert.ok(
      skill.includes(`Skill release \`${frontmatter.metadata.version}\` supports exactly:`),
    );
    assert.ok(localTooling.includes(`Release \`${frontmatter.metadata.version}\` supports:`));
    if (process.env.MOLDEA_RELEASE_TAG) {
      assert.equal(process.env.MOLDEA_RELEASE_TAG, `v${frontmatter.metadata.version}`);
    }
  });
});
