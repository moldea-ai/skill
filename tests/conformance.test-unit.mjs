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
  createSemanticCoverageDigest,
  getSemanticCriterionLabels,
  hasValidRepositoryControlEvidence,
  hasValidScenarioEvidence,
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
    'adopted-ambiguous-context-handoff',
    'adopted-direct-context-handoff',
    'adopted-explicit-context-correction',
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
    'unadopted-direct-context-handoff',
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
    assert.match(frontmatter.description, /^Use first when a message supplies/u);
    assertMatchesEvery(frontmatter.description, [
      /supplies, confirms, or corrects potentially durable project knowledge/u,
      /ownership, responsibility, approval, escalation, policy, boundaries, terminology, architecture, or operations/u,
      /terse prose, an answer, table, YAML, JSON, or accessible source/u,
      /without a moldea request/u,
      /Inspect adoption, affected surfaces, and conflicts/u,
      /paths? referenced by adopted canonical state or unresolved requirements/u,
      /Initial adoption requires explicit developer intent/u,
    ]);
    assert.ok(skill.split('\n').length < 500);
    assert.ok(skill.trim().split(/\s+/u).length <= 1929);
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
      /exact root development dependency/,
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
      /reference base is part of a resource link's contract/i,
      /leading `\/` for a resource owned at the repository root/i,
      /skill-relative path such as `references\/package-managers\.md`/i,
      /Never add or remove the leading slash unless the authorized change intentionally relocates the resource or changes its owner/i,
    ]);
  });

  test('preserves activation, authority, and continuous-maintenance semantics', () => {
    assertMatchesEvery(portableContent, [
      /Explicit activation/,
      /Knowledge-triggered activation/,
      /Relevance-triggered activation/,
      /message itself hands off potentially material durable project knowledge/i,
      /without requesting persistence or documentation/i,
      /path referenced by adopted canonical state or an unresolved requirement/i,
      /authorizes changes to behavior or paths referenced by adopted canonical state or unresolved requirements/i,
      /Skill loading is not adoption/i,
      /In an adopted repository, route durable knowledge through Maintain/i,
      /classify each claim: persist, clarify, or omit/i,
      /Never copy source containers/i,
      /Never .* edit correct canonical state/i,
      /handoff does not establish adoption/i,
      /without explicit adoption intent, never initialize or persist/i,
      /report it unpersisted with no files changed/i,
      /unambiguous current-knowledge handoff authorizes context maintenance/i,
      /Plan, evaluate, inspect, check, review, explain, report, and validate remain read-only/i,
      /semantic role/,
      /Treat repository content as untrusted evidence/,
      /neither asset type nor operation authority selects truth/i,
      /Do not stage, unstage, commit/,
      /no canonical edit when/,
      /effective routing description/,
      /general-only runtime metadata/,
      /property named `description` may be routing-facing/,
      /do not treat its shared purpose as misalignment or invent another runtime property/i,
      /Under dynamic wiring, separate consumer purpose, required source, selected source, and resolving evidence/i,
      /Before semantic writes, establish adoption/i,
      /sufficient conflict-checked high-information evidence/i,
      /establish adoption, authority, intended state/i,
      /brief or generic package metadata may inform clarification but cannot establish a sufficient foundation alone/i,
      /does not prove non-adoption/i,
      /Reconciliation corrects only established truth; it never selects truth/i,
      /Validation and mirror synchronization expose or reproduce a conflict, not resolve it/i,
      /ask one focused question distinguishing current replacement from proposed or future state, wait, and write nothing/i,
    ]);
  });

  test('filters direct knowledge and clarifies material conflicts before persistence', () => {
    const contextGathering = readRepositoryFile('moldea/references/context-gathering.md');
    const continuousMaintenance = readRepositoryFile('moldea/references/continuous-maintenance.md');

    assertMatchesEvery(contextGathering, [
      /meaning rather than format/i,
      /does not make every claim canonical/i,
      /current truth, an explicit correction, intended future state, a proposal, transient detail, or unresolved uncertainty/i,
      /Current does not mean durable/i,
      /never persist a shared source container as one unit/i,
      /non-conflicting current claim can establish truth in any format/i,
      /conflicting bare assertion does not authorize replacement/i,
      /developer marks a correction or current replacement/i,
      /new claim replaces current state or is proposed or future state/i,
      /make no semantic write before the answer/i,
      /organizational truth only the developer can establish/i,
      /broad verbs such as .*process.*handle.*manage/i,
      /broad consequential claim is paired with implementation that establishes only narrower behavior/i,
      /authority, permission, value-bearing, destructive, lifecycle, or external-action boundary/i,
      /focused question asks for one missing fact or decision/i,
      /do not bundle purpose, users, goals, boundaries, authority, or workflow/i,
      /team responsibility or ownership/i,
      /path listings are not evidence/i,
      /read each accessible material candidate and map its path to its fact and responsibility/i,
      /Never ask the developer to paste an accessible file/i,
    ]);
    assertMatchesEvery(continuousMaintenance, [
      /Probe repository-root `\/moldea\/moldea\.yaml`, `\/moldea\/project\.md`, and the exact README markers directly/i,
      /Absence from `rg`, Git inventory, indexed search, or other ignore-sensitive discovery does not prove non-adoption/i,
      /unambiguous direct handoff of current project knowledge as Maintain authority/i,
      /ownership, responsibility, approval, escalation, policy, and boundary handoffs/i,
      /prose, an answer, a table, structured data, or an accessible source differ only in format/i,
      /shared container does not determine authority, truth, durability, or replacement semantics/i,
      /conflicting assertion needs explicit correction or replacement meaning/i,
      /Do not merely acknowledge a handoff/i,
      /literal repository-local deterministic invocation/i,
      /Name a correction's stale and current truth/i,
      /Without explicit intent or existing adoption, do not initialize or persist; report why and that no files changed/i,
      /requirement referencing a planned path, read its current state and all criteria before editing; discovery is insufficient/i,
      /durable project truth changed or was newly established/i,
    ]);
  });

  test('defines evidence-based initialization clarification and handoff behavior', () => {
    assertMatchesEvery(portableContent, [
      /Insufficient:/,
      /Partial:/,
      /Sufficient:/,
      /no meaningful project context was inferred/i,
      /ask one question about that boundary/i,
      /documentation volume/i,
      /awaits context/i,
      /During `initialize`, an insufficient or partial foundation stops all writes/i,
      /ask one focused question/i,
      /do not bundle purpose, users, goals, boundaries, authority, or workflow/i,
      /before dependency changes, canonical project state, or the owned README awareness block/i,
      /Never persist answerable ambiguity/i,
      /reviewing the foundation and continuing ordinary development/i,
      /end with `Next actions`/i,
      /which material sources established each foundation conclusion/i,
      /validation or test status does not replace this handoff/i,
      /make file creation semantic completion/i,
      /classify the foundation before changing dependency state/i,
      /Missing or unverified tooling never makes available evidence .*empty/i,
      /brief or generic package metadata may inform clarification but cannot establish a sufficient foundation alone/i,
    ]);
  });

  test('defines objective-first read-only agent-system planning', () => {
    assertMatchesEvery(portableContent, [
      /agent-system planning activates only/i,
      /Generic planning and host-defined `plan` commands remain outside/i,
      /valid result may recommend zero agents/i,
      /fixed calculations, eligibility rules, filtering, storage, delivery mechanics, and predictable sequencing deterministic/i,
      /Prefer deterministic orchestration/i,
      /why model reasoning earns an agent boundary/i,
      /least-privilege constraints/i,
      /Discovery queues candidates, not evidence/i,
      /Open each accessible material candidate and map its path to a fact and responsibility/i,
      /bounded root inventory/i,
      /Search objective terms across source, documentation, configuration, and tests/i,
      /Before an absence claim, request, or repository-specific recommendation, reconcile discovered candidates and read accessible ones/i,
      /Name material paths read and what each establishes/i,
      /reconcile every material evidence-established responsibility with an explicit deterministic, service, tool, skill, agent, or human owner/i,
      /Combining or removing one requires reliable replacement evidence and cannot erase its outcome/i,
      /Model-reasoning responsibilities with incompatible private context, permissions, trust, or failure boundaries remain separate/i,
      /Public research and privileged project or customer reasoning remain separate/i,
      /approval for every publication when required/i,
      /authoritative data, readers and writers, persistence/i,
      /model input and output contracts, deterministic enforcement/i,
      /material paths read/i,
      /completion check, not optional sections/i,
      /implementation order/i,
      /distinct from runtime control flow/i,
      /required with zero agents/i,
      /state the invariant architecture/i,
      /identify the branch that cannot be finalized/i,
      /question whose answer most changes authority, responsibility ownership, topology, or consequential side effects/i,
      /runtime identity is explicitly requested/i,
      /run `compatibility --json`; inventory proves availability only/i,
      /Leave runtime undecided without behavioral evidence/i,
      /no repository files were changed by `plan`/i,
    ]);
    assert.match(
      skill,
      /Every moldea agent-system `plan` maps each material path read .* states that no files changed/i,
    );
    assert.match(
      skill,
      /Read `references\/context-gathering\.md` before initialization, agent-system planning/i,
    );
    assert.doesNotMatch(skill, /Every `plan` result must/i);
  });

  test('treats Agent Skills as first-class portable artifacts', () => {
    const evaluateAndReconcile = readRepositoryFile('moldea/references/evaluate-and-reconcile.md');
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');

    assertMatchesEvery(portableContent, [
      /Choose a skill deliberately/,
      /primary activation contract/,
      /representative positive requests/,
      /adjacent requests that should remain outside/,
      /Keep host metadata aligned/,
      /update the portable description first/i,
      /host-only change leaves the portable contract stale/i,
      /Verify positive and adjacent non-activation requests/i,
      /Preserve an existing invocation policy/,
      /State which surface owns each proposed behavior/i,
      /Selecting protected instructions as the owner never authorizes changing them/i,
      /reread or diff both artifacts and report only workspace-proven changes/i,
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
    assertMatchesEvery(skill, [
      /each deterministic validator result as evidence only for the boundary it actually validates/i,
      /Never generalize a component validator's success into whole-artifact or whole-system structural validity/i,
      /relevant resources, relationships, and consumer evidence/i,
    ]);
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
      /Pair each runtime unknown with its smallest reliable resolver/i,
      /source-owned target docs, closed wiring, provider configuration, or an integration test/i,
      /Name its artifact type and owner without inventing a path/i,
      /absent handoff with a consumer of `description\.md` is aligned fallback/i,
      /generic statements are insufficient/i,
      /no repository files were changed/i,
      /smallest coherent change/,
      /Do not recreate those mechanics/,
      /request to reconcile authorizes the operation, not an arbitrary choice/i,
      /complete an intended-state gate/i,
      /Code proves implementation and instructions declare model behavior, but neither selects intended policy/i,
      /Deterministic checks, validation, and mirror synchronization expose or reproduce conflicts, not resolve them/i,
      /name the exact conflicting claims and the evidence role of each/i,
      /neither implementation nor synchronized canonical or mirror content establishes intended-state authority/i,
      /make no semantic write while the answer is pending/i,
    ]);
    assert.match(
      skill,
      /Every `evaluate` result must explicitly state that no repository files were changed/i,
    );
  });

  test('keeps deterministic evidence and adapter claims at their owning boundaries', () => {
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');
    const agentDesign = readRepositoryFile('moldea/references/agent-design.md');
    const continuousMaintenance = readRepositoryFile('moldea/references/continuous-maintenance.md');

    assertMatchesEvery(skill, [
      /After writes/i,
      /Version or subcommand alone and failed, incomplete, aggregate, or unverified execution cannot support completion/i,
      /canonical surfaces changed, explicitly unchanged with why no canonical change was required, or blocked by material ambiguity/i,
      /semantic decisions and the evidence chain that established any consequential misalignment/i,
      /Under dynamic wiring, separate consumer purpose, required source, selected source, and resolving evidence/i,
      /every accepted tooling proof stage/i,
      /literal invocation, status, diagnostics, mirror findings, and requirement outcomes/i,
      /explicit absence of diagnostics or findings/i,
      /Report only workspace-proven changes/i,
      /state what canonical inspection cannot observe, the related evidence, and remaining unknowns/i,
    ]);
    assertMatchesEvery(skillDesign, [
      /established script already owns a check/i,
      /script's actual interface/i,
      /Do not ask the model to reimplement the check/i,
      /script-owned result as an input/i,
    ]);
    assertMatchesEvery(agentDesign, [
      /Adapter documentation exists only in authorized evidence/i,
      /Never reconstruct target behavior from model knowledge, package names, or inventory/i,
      /Without behavioral evidence, preserve the runtime/i,
      /pair each unknown invocation, instruction-loading, capability, schema, routing, or variable fact with its smallest reliable resolver/i,
      /Name the artifact type and owner without inventing its path/i,
      /Evaluation is incomplete while a material unknown lacks a resolver/i,
      /If `handoff-description\.md` is absent, read `description\.md`, runtime guidance, and the consumer before judging fallback/i,
      /Never request an accessible description/i,
      /Before changing a runtime description mapping, keep these facts separate/i,
      /exact runtime guidance, compatibility evidence, or implementation behavior that establishes whether the consumer is routing-facing, general-only, or shared/i,
      /canonical source currently consumed, or report it unestablished under dynamic wiring/i,
      /source the established consumer role requires/i,
      /required source does not prove the selected source/i,
      /never call a candidate current, effective, absent, or wrong/i,
      /Prove a mismatch before editing/i,
      /Tests confirm a correction, not its justification/i,
      /complete a pre-edit gate/i,
      /Inventory external capabilities/i,
      /classify them as model-visible, integration-only, or qualifying local implementation/i,
      /Reconcile runtime identity and semantic surfaces together/i,
      /Provider hosting or a correct `runtime\.id` never replaces model-visible semantics/i,
      /Report canonical inspection limits, each related path's evidence, both repository states, and remaining unknowns/i,
      /Stop explicitly without selecting a replacement runtime/i,
    ]);
    assertMatchesEvery(continuousMaintenance, [
      /final report/i,
      /classify the canonical and each related repository as clean, dirty, unborn, unavailable, or uninspected/i,
      /external facts canonical inspection cannot observe/i,
    ]);
  });

  test('defines safe tooling, exact pinning, and machine-envelope handling', () => {
    assertMatchesEvery(portableContent, [
      /npm install --save-dev --save-exact --ignore-scripts/,
      /pnpm add --save-dev --save-exact --ignore-scripts/,
      /pnpm add --workspace-root --save-dev --save-exact --ignore-scripts/,
      /yarn add --dev --exact --mode=skip-build/,
      /repository-supplied executable package-manager extensions, hooks, or plugins/,
      /before invoking any package-manager executable/i,
      /pnpmfiles, hook-bearing pnpm configuration/,
      /Yarn plugins/,
      /`.yarnrc.yml` `plugins\[\]\.path` declaration is executable configuration/i,
      /even if the plugin remains unread and unrun/i,
      /including version or discovery/i,
      /does not block the entire `moldea` workflow/i,
      /dependency changes or exact provider proof or invocation requires the manager/i,
      /retain an independent blocker record in the final report even when another clarification or stop applies/i,
      /independently verify and invoke an already declared and installed exact CLI without the manager/i,
      /exact path, blocked operation, unavailable evidence, and safe prerequisite/i,
      /remove or disable the extension and retry/i,
      /Never propose bypassing, trusting, or executing the extension/i,
      /Lifecycle-script suppression does not neutralize a repository-supplied manager extension/,
      /every command whose safety or authority depends on earlier output as a separate process execution/i,
      /Never batch a result-dependent sequence/i,
      /Retain cumulative CLI proof/i,
      /exact root declaration; installed package identity and version; exported `bin\.moldea`; effective provider/i,
      /Later conflicts do not erase accepted proof/i,
      /yarn info @moldea\.ai\/cli --json/,
      /prove and retain each stage separately/i,
      /installed identity, exact version, and exported `bin\.moldea`/i,
      /Report every accepted proof field even when a later provider conflict stops execution/i,
      /newline-delimited JSON records/,
      /`source` is exactly `@moldea\.ai\/cli`/,
      /`source` field identifies the provider package, not its version/,
      /do not run `yarn bin moldea`/,
      /yarn exec moldea/,
      /canonical path to equal the recorded provider path/,
      /missing, malformed, duplicate, conflicting, or non-CLI providers/,
      /Never invoke a bare `moldea`/i,
      /pnpapi\.resolveToUnqualified\('@moldea\.ai\/cli'/i,
      /require exact name `@moldea\.ai\/cli`, the exact release version, and a relative `bin\.moldea`/i,
      /require the bin to remain inside that package/i,
      /another process invoke `pnpm node <resolved-bin> <command> --json`/i,
      /Accessible repository evidence makes local CLI proof executable/i,
      /even when requested as an explanation: run safe provider and CLI checks/i,
      /Only requests without such evidence may receive a procedure/i,
      /Report provider, exact version, command, and envelope/i,
      /each `inspect --json`, `validate --json`, or `compatibility --json` invocation as an independent process execution/,
      /Do not shell-chain deterministic CLI invocations/,
      /failed aggregate shell command/,
      /ignored-tree omission from Git or `rg` does not prove absence/i,
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
      /report every repository's actual state as changed, unchanged, uninspected, or blocked/i,
      /direction that establishes repository authority but no semantic change does not authorize invented work/i,
      /promise is not a status/i,
      /Do not use requirements as a roadmap or backlog/,
      /related file changed/,
      /Do not expand scope to close the requirement/i,
      /Before editing, identify affected behavior and check planned paths against canonical relationships, requirements, mirrors, generated surfaces, and related-repository boundaries/i,
      /For every requirement referencing a planned path, read its current state and all criteria before editing; discovery is insufficient/i,
      /classify each criterion as satisfied, outstanding, or evidence-blocked/i,
      /preserve it unless every criterion is established/i,
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
      /Field names do not alter provenance/i,
      /`instructions`, `input`, continuation prompts, messages, or tool payloads/i,
      /turn-specific content, never independent reusable policy/i,
      /independent durable instructions from every field/i,
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
      /inventory proves availability only/i,
      /pair each unknown invocation, instruction-loading, capability, schema, routing, or variable fact with its smallest reliable resolver/i,
      /source-owned target documentation, closed wiring, provider configuration, or an integration test/i,
      /unavailable adapter/,
      /`-c core\.fsmonitor=false`/,
      /`-c core\.pager=cat`/,
      /`--no-pager`/,
      /`-c core\.attributesFile=\/dev\/null`/,
      /-c filter\.lfs\.process=/,
      /-c filter\.lfs\.smudge=/,
      /-c filter\.lfs\.required=false/,
      /`-c diff\.external=`/,
      /`--no-ext-diff`/,
      /`--no-textconv`/,
      /--ignore-submodules=all/,
      /repository attributes may still exist/i,
      /No Git command, including `rev-parse`, `status`, `log`, or `diff`, is harmless before this reference is loaded/i,
      /then locate the Git working-tree root with its safe command shape/i,
      /especially a failure, inspect the workspace and any helper sentinel before claiming no writes/i,
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
    const noWriteCriteria = semanticCriteria.filter(({ label }) => label === 'report-no-writes');
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

  test('covers unadopted, direct, corrective, and ambiguous project-knowledge handoffs', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const unadoptedHandoffCase = semanticCasesById.get('unadopted-direct-context-handoff');
    const directHandoffCase = semanticCasesById.get('adopted-direct-context-handoff');
    const explicitCorrectionCase = semanticCasesById.get('adopted-explicit-context-correction');
    const ambiguousHandoffCase = semanticCasesById.get('adopted-ambiguous-context-handoff');

    assert.ok(unadoptedHandoffCase);
    assert.ok(directHandoffCase);
    assert.ok(explicitCorrectionCase);
    assert.ok(ambiguousHandoffCase);
    assert.deepEqual(getSemanticCriterionLabels(unadoptedHandoffCase.expected), [
      'recognize-unadopted-context-boundary',
      'report-no-writes',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(unadoptedHandoffCase.forbidden), [
      'initialize-from-knowledge-discovery',
      'persist-unadopted-context',
      'claim-knowledge-triggered-adoption',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(directHandoffCase.expected), [
      'maintain-durable-project-knowledge',
      'filter-transient-project-detail',
      'rerun-deterministic-inspection',
      'report-knowledge-selection',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(directHandoffCase.forbidden), [
      'require-explicit-moldea-request',
      'persist-entire-structured-payload',
      'create-unrelated-agent-or-behavior',
      'rewrite-unrelated-canonical-state',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(explicitCorrectionCase.expected), [
      'accept-explicit-project-correction',
      'maintain-corrected-product-boundary',
      'rerun-correction-inspection',
      'report-corrected-project-truth',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(explicitCorrectionCase.forbidden), [
      'ask-ceremonial-correction-question',
      'preserve-stale-payment-authority',
      'create-unrelated-runtime-or-agent',
      'rewrite-unrelated-correction-state',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(ambiguousHandoffCase.expected), [
      'identify-material-ownership-conflict',
      'ask-focused-ownership-clarification',
      'preserve-canonical-state-before-answer',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(ambiguousHandoffCase.forbidden), [
      'overwrite-established-ownership',
      'record-contradictory-current-owners',
      'ask-generic-context-questionnaire',
      'claim-context-aligned',
    ]);
  });

  test('keeps semantic directions self-contained for the behavior under evaluation', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const getDirection = (caseId) => semanticCasesById.get(caseId)?.input.developerDirection ?? '';

    for (const caseId of [
      'dedicated-repository-runtime-selection',
      'dedicated-repository-single-side-change',
    ]) {
      assert.match(getDirection(caseId), /moldea/i);
      assert.match(getDirection(caseId), /related application at \/related-application/i);
      assert.match(getDirection(caseId), /read-only/i);
    }

    assert.match(
      getDirection('skill-create-progressive-disclosure'),
      /Agent Skill at skills\/release-review/i,
    );
    assert.match(getDirection('pnpm-pnp-local-cli-provider'), /repository-local moldea CLI/i);
    assert.match(
      getDirection('unavailable-runtime-selection'),
      /moldea agent runtime relationship/i,
    );

    const partialInitializationCase = semanticCasesById.get('initialize-partial-context');
    const insufficientInitializationCase = semanticCasesById.get('initialize-insufficient-context');
    const genericQuestionnaireCriterion = partialInitializationCase?.forbidden.find(
      ({ label }) => label === 'ask-generic-questionnaire',
    );
    const insufficientQuestionnaireCriterion = insufficientInitializationCase?.forbidden.find(
      ({ label }) => label === 'ask-generic-questionnaire',
    );
    const releaseVerifierEvidence = semanticCasesById
      .get('skill-reuse-existing-cohesive')
      ?.input.repositoryEvidence.find(
        ({ source }) =>
          source.kind === 'workspace-path' && source.path === 'scripts/verify-release.mjs',
      );

    assert.match(
      genericQuestionnaireCriterion?.criterion ?? '',
      /one unresolved payment-authority boundary/i,
    );
    assert.match(
      insufficientQuestionnaireCriterion?.criterion ?? '',
      /one focused question about the highest-value missing foundational fact/i,
    );
    assert.match(releaseVerifierEvidence?.claim ?? '', /directly reads and checks/i);
  });

  test('keeps partial requirement work bounded by the developer direction', () => {
    const requirementCase = cases.semanticCases.find(
      ({ id }) => id === 'unresolved-related-file-changed',
    );

    assert.ok(requirementCase);
    assert.match(requirementCase.input.developerDirection, /enable the provider support flag/i);
    assert.match(
      requirementCase.input.developerDirection,
      /leave integration coverage for a separate change/i,
    );
    assert.deepEqual(getSemanticCriterionLabels(requirementCase.expected), [
      'recheck-resolution-criteria',
      'complete-authorized-partial-implementation',
      'preserve-unresolved-requirement',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(requirementCase.forbidden), [
      'automatic-resolution',
      'treat-requirement-as-backlog',
    ]);
    assert.match(
      requirementCase.forbidden[0].criterion,
      /adds integration coverage outside the authorized partial change/i,
    );
  });

  test('distinguishes a required routing source from an unresolved selected source', () => {
    const routingCase = cases.semanticCases.find(
      ({ id }) => id === 'routing-description-dynamic-wiring',
    );
    const wrongSourceCriterion = routingCase?.forbidden.find(
      ({ label }) => label === 'claim-wrong-description-source',
    );

    assert.ok(routingCase);
    assert.ok(wrongSourceCriterion);
    assert.match(wrongSourceCriterion.criterion, /unconditionally claims/i);
    assert.match(wrongSourceCriterion.criterion, /current, selected, effective, absent, or wrong/i);
    assert.match(wrongSourceCriterion.criterion, /selected source unresolved/i);
    assert.match(
      wrongSourceCriterion.criterion,
      /consumer's established purpose, its required source, or a conditional mismatch is allowed/i,
    );
    assert.doesNotMatch(
      wrongSourceCriterion.criterion,
      /does not establish whether the consumer is routing-facing or general-purpose/i,
    );
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
    const oneAgentPlanningForbidden = getSemanticCriterionLabels(oneAgentPlanningCase.forbidden);
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
    const dedicatedRepositoryCase = semanticCasesById.get('dedicated-repository-runtime-selection');

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
    {
      skip: !existsSync(join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-result.json')),
    },
    () => {
      const result = JSON.parse(readRepositoryFile('fixtures/semantic-evaluation-result.json'));
      const semanticCases = new Map(
        cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
      );

      const portableSkillDigest = createPortableSkillDigest();
      const coverage = JSON.parse(readRepositoryFile('fixtures/semantic-evaluation-coverage.json'));
      assert.equal(result.schemaVersion, 2);
      assert.equal(result.evaluationProtocolVersion, SEMANTIC_EVALUATION_PROTOCOL_VERSION);
      assert.deepEqual(result.cli, createSemanticCliIdentity(REPOSITORY_ROOT));
      assert.equal(result.caseSuiteDigest, createSemanticCaseSuiteDigest(cases.semanticCases));
      assert.equal(
        result.coverageDigest,
        createSemanticCoverageDigest(coverage, cases.semanticCases),
      );
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
        assert.ok(Array.isArray(evaluationCase.actorExecutionEvidence));
        assert.equal(
          hasValidScenarioEvidence(evaluationCase.scenarioEvidence, conformanceCase),
          true,
        );
        assert.equal(
          hasValidRepositoryControlEvidence(evaluationCase.repositoryControlEvidence),
          true,
        );
        assert.deepEqual(evaluationCase.repositoryControlEvidence.violations, []);

        const configuredArtifacts = conformanceCase.skillEvidence?.artifacts ?? [];
        assert.equal(evaluationCase.skillArtifactEvidence.length, configuredArtifacts.length);
        assert.deepEqual(
          evaluationCase.skillArtifactEvidence.map(({ role, root }) => ({
            role,
            root,
          })),
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
      /48 cases/,
      /96 model calls/,
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
      /pre-actor sourced evidence/,
      /bounded workspace changes/,
      /independent structural and resource-link evidence/,
      /do not rely on opaque labels, the actor's report alone, or leaked answer criteria/,
      /Codex JSONL events/,
      /bounded command and tool-call events/,
      /final response cannot create or replace that evidence/,
      /mounted read-only over the isolated actor executable directory/,
      /actor cannot replace those probes/,
    ]);
    assert.match(gitignore, /fixtures\/\.semantic-evaluation-candidate\.json\*/);
  });

  test('keeps optional OpenAI metadata supplemental and behaviorally complete', () => {
    const openaiMetadata = readRepositoryFile('moldea/agents/openai.yaml');

    assertMatchesEvery(openaiMetadata, [
      /display_name: 'moldea'/,
      /short_description: 'Maintain project context and agent systems'/,
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
