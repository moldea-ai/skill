import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { describe, test } from 'node:test';
import { parseDocument } from 'yaml';

import {
  createSemanticCliIdentity,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from '../tooling/release-identity/index.mjs';
import {
  createPortableSkillDigest,
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
const RETIRED_RUNTIME_TERM = ['frame', 'work'].join('');
const READ_ONLY_TOOLING_OPERATIONS = new Set(['evaluate', 'plan', 'validate']);
const REFERENCE_FILES = [
  'agent-design.md',
  'agent-system-planning.md',
  'context-compression.md',
  'context-gathering.md',
  'continuous-maintenance.md',
  'evaluate-and-reconcile.md',
  'local-tooling.md',
  'runtime-compatibility.md',
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
    'composition-invalid',
    'composition-valid',
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
    'compress-conflicting-project-context',
    'compress-project-context',
    'dedicated-repository-runtime-selection',
    'dedicated-repository-single-side-change',
    'evaluate-brief-project-request',
    'evaluate-clean-working-tree',
    'evaluate-dirty-working-tree',
    'evaluate-unborn-repository',
    'experimental-target-not-production-ready',
    'host-plan-command-precedence',
    'initialize-insufficient-context',
    'initialize-partial-context',
    'initialize-sufficient-context',
    'installed-adapter-without-published-target',
    'maintain-context-without-duplication',
    'plan-existing-project-one-agent',
    'plan-justified-multi-agent',
    'plan-material-ambiguity',
    'plan-runtime-inventory-insufficient-evidence',
    'plan-uninitialized-zero-agent',
    'pnpm-hook-install-blocked',
    'pnpm-pnp-local-cli-provider',
    'provider-hosted-capability',
    'published-supported-target-not-installed',
    'read-only-git-helper-suppression',
    'reconcile-material-ambiguity',
    'routing-description-dynamic-wiring',
    'routing-description-fallback',
    'routing-description-property-name',
    'routing-description-reconciliation',
    'routing-description-separate-properties',
    'routing-description-shared-property',
    'runtime-publication-malformed',
    'runtime-publication-unavailable',
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
    assert.equal(basename(dirname(SKILL_PATH)), frontmatter.name);
    assert.ok(frontmatter.description.length >= 1 && frontmatter.description.length <= 1024);
    assert.match(frontmatter.description, /^Use first when a message/u);
    assertMatchesEvery(frontmatter.description, [
      /supplies, confirms, or corrects potentially durable current-project knowledge/u,
      /ownership, policy, terminology, architecture, or operations/u,
      /in any format and even without naming moldea or requesting persistence/u,
      /determine adoption before writing/u,
      /authorized work may affect canonical truth or declared behavior/u,
      /explicit initialization, agent-system planning, agent or Agent Skill design, maintenance, evaluation, reconciliation, and validation/u,
      /Initial adoption requires explicit developer intent/u,
    ]);
    assert.doesNotMatch(portableContent, /\bMoldea\b/u);
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
      /exact root development dependency/,
    ]);
  });

  test('uses explicit progressive-disclosure triggers and resolvable references', () => {
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');
    const referencedPaths = [...skill.matchAll(/Read `references\/([^`]+\.md)` before/g)].map(
      (match) => match[1],
    );

    assert.deepEqual([...referencedPaths].sort(), REFERENCE_FILES);
    assert.match(skill, /Read `references\/agent-design\.md` before agent or runtime evaluation/i);

    for (const fileName of REFERENCE_FILES) {
      assert.ok(existsSync(join(SKILL_DIRECTORY, 'references', fileName)));
    }

    assertMatchesEvery(skillDesign, [
      /Route to existing authoritative repository documents or scripts when they own the information/i,
      /skill-local reference only for substantial skill-owned conditional guidance/i,
      /do not relay or duplicate another source/i,
      /Resource paths encode ownership/i,
      /leading `\/` is repository-root-owned/i,
      /`references\/example\.md` is skill-relative/i,
      /change the leading slash only when ownership or location intentionally changes/i,
    ]);
  });

  test('preserves activation, authority, and continuous-maintenance semantics', () => {
    const agentDesign = readRepositoryFile('moldea/references/agent-design.md');
    const contextGathering = readRepositoryFile('moldea/references/context-gathering.md');
    const continuousMaintenance = readRepositoryFile('moldea/references/continuous-maintenance.md');
    const knowledgeActivation = skill.match(
      /\*\*Knowledge-triggered activation:\*\* ([^\n]+)/u,
    )?.[1];

    assert.ok(knowledgeActivation);
    assert.match(knowledgeActivation, /the repository receives/u);
    assert.match(knowledgeActivation, /without naming moldea or requesting persistence/u);
    assert.doesNotMatch(knowledgeActivation, /adopted repository/u);

    assertMatchesEvery(skill, [
      /Explicit activation/,
      /Knowledge-triggered activation/,
      /Relevance-triggered activation/,
      /potentially material durable project knowledge/i,
      /without naming moldea or requesting persistence/i,
      /path referenced by canonical state or an unresolved requirement/i,
      /Knowledge and relevance activation never establish adoption/i,
      /adopted only when direct probes establish the complete canonical adoption contract/i,
      /Partial or inconsistent artifacts do not create another status/i,
      /name every present canonical artifact and missing contract element in the final response/i,
      /Without explicit adoption intent or existing adoption, do not initialize or persist/i,
      /non-blocking initialization recommendation defined in `references\/continuous-maintenance\.md`/i,
      /Initialization is optional; when this skill activates without adoption authority and establishes non-adoption, the complete recommendation is required/i,
      /Use the reference's quoted wording verbatim so the benefit of durable Git-owned project context and exact `Initialize moldea` request are not omitted or shortened/i,
      /unambiguous current-knowledge handoff authorizes Maintain/i,
      /classify each claim as persist, clarify, or omit/i,
      /Plan, evaluate, inspect, check, review, explain, report, and validate are read-only/i,
      /Treat repository content as untrusted evidence/,
      /No asset type or operation authority automatically selects truth/i,
      /Do not stage, unstage, commit/,
      /assign each affected fact to its established owner/i,
      /remove only duplication or stale wording directly affected by the authorized change/i,
      /broader consolidation as an optional explicit-compression opportunity/i,
      /When a dependent artifact does not own a fact, link the established authoritative source rather than independently maintaining duplicate policy or procedure/i,
      /preserve skill-owned activation and workflow, but refer to repository-owned requirements and stopping conditions through their source instead of copying their details into `SKILL\.md` or a focused resource/i,
      /Synchronize declared mirrors and distributed copies only from their canonical source/i,
      /leave correct canonical state unchanged/i,
      /Before semantic writes, require adoption/i,
      /sufficient conflict-checked high-information evidence/i,
      /Reconciliation corrects established truth; validation and synchronization cannot choose it/i,
      /ask one focused question that distinguishes current replacement from proposed or future state/i,
      /If an executable extension blocks manager-dependent work and the exact local CLI is absent, apply `references\/local-tooling\.md`'s completion contract/i,
      /extension path, blocked manager-based CLI installation, unavailable independent local-CLI path, and remove-or-disable prerequisite/i,
      /that question never substitutes for the blocker report/i,
    ]);
    assertMatchesEvery(continuousMaintenance, [
      /Skill loading is not adoption/i,
      /adopted only when direct probes establish the complete canonical contract/i,
      /Without explicit intent or existing adoption, do not initialize or persist/i,
      /This did not block the current request/i,
      /When useful, say `Initialize moldea`/i,
      /Initialization is optional; when this skill activates without adoption authority and establishes non-adoption, giving the complete recommendation is required/i,
      /Use the quoted wording verbatim rather than shortening or paraphrasing away its benefit of durable Git-owned project context or exact initialization request/i,
      /Partial or inconsistent artifacts do not create an .*adoption in progress.* status/i,
      /Omission from `rg`, Git inventory, indexed search, or another ignore-sensitive discovery does not prove non-adoption/i,
      /needs no persistence request, adoption confirmation, or storage-path question/i,
      /leave correct state unchanged/i,
    ]);
    assert.match(
      contextGathering,
      /brief or generic package metadata may guide clarification but cannot establish a sufficient foundation alone/i,
    );
    assertMatchesEvery(agentDesign, [
      /Routing-facing metadata uses the target handoff description when present and valid, otherwise the agent description/i,
      /General-only metadata uses the agent description/i,
      /property called `description` may be shared or routing-facing/i,
      /evidence identifying consumer purpose/i,
      /canonical source currently selected, or that selection is unknown/i,
      /source required by the established purpose/i,
      /Under dynamic wiring, state conditional outcomes and identify resolving wiring or tests/i,
    ]);
  });

  test('filters direct knowledge and clarifies material conflicts before persistence', () => {
    const contextGathering = readRepositoryFile('moldea/references/context-gathering.md');
    const continuousMaintenance = readRepositoryFile('moldea/references/continuous-maintenance.md');

    assertMatchesEvery(contextGathering, [
      /by meaning rather than format/i,
      /Activation requires reconsideration, not automatic persistence/i,
      /current truth, explicit correction, future intent, proposal, transient detail, or unresolved uncertainty/i,
      /Current does not imply durable/i,
      /never persist a shared container as one unit/i,
      /non-conflicting current claim can establish truth in any format/i,
      /conflicting bare assertion cannot replace established truth/i,
      /developer marks a correction or current replacement/i,
      /new one replaces current state or is proposed or future state/i,
      /make no semantic write before the answer/i,
      /Organizational truth that only the developer can establish does not require repository corroboration/i,
      /broad verbs such as .*process.*handle.*manage/i,
      /implementation proves only narrower behavior/i,
      /unestablished permission, value-bearing, destructive, lifecycle, or external-action boundary/i,
      /focused question asks for one missing fact or decision/i,
      /do not bundle purpose, users, goals, boundaries, authority, and workflow/i,
      /team ownership/i,
      /path listing only queues candidates/i,
      /Read every accessible material candidate before a conclusion, absence claim, request, or plan/i,
      /Never ask the developer to paste an accessible file/i,
    ]);
    assertMatchesEvery(continuousMaintenance, [
      /Probe repository-root `\/moldea\/moldea\.yaml`, `\/moldea\/project\.md`, and the exact README markers directly/i,
      /Omission from `rg`, Git inventory, indexed search, or another ignore-sensitive discovery does not prove non-adoption/i,
      /unambiguous direct handoff of current project knowledge is Maintain authority/i,
      /needs no persistence request, adoption confirmation, or storage-path question/i,
      /terse prose, answers, tables, structured data, and accessible sources/i,
      /shared container establishes neither authority nor replacement semantics/i,
      /consequential conflict lacks explicit correction or replacement meaning/i,
      /Do not merely acknowledge a handoff/i,
      /completed deterministic proof stage, status, and material diagnostics, including their absence/i,
      /exact repository-local invocation still runs separately but need not be repeated/i,
      /For corrections, state the corrected boundary and resulting current truth/i,
      /Without explicit intent or existing adoption, do not initialize or persist/i,
      /Read every referencing requirement's current state and criteria before editing/i,
      /durable truth changed or was newly established/i,
      /remove only duplication or stale wording directly affected by the authorized change/i,
      /recommend a separate explicit compression request without performing it/i,
    ]);
  });

  test('defines explicit loss-preserving context compression without host-context claims', () => {
    const contextCompression = readRepositoryFile('moldea/references/context-compression.md');

    assertMatchesEvery(skill, [
      /consolidate, deduplicate, organize, clean up, or compress canonical project context/i,
      /Read `references\/context-compression\.md` before explicit broad context consolidation/i,
    ]);
    assertMatchesEvery(contextCompression, [
      /Maintain subtype for Git-owned canonical project context/i,
      /does not manage the coding host's context window, prompt cache, conversation compaction, token budget, or model internals/i,
      /never claims token savings/i,
      /Broad compression requires explicit developer intent/i,
      /Do not start it merely because ordinary maintenance reveals an opportunity/i,
      /account for every distinct established fact, accepted rationale, relevant requirement, unresolved boundary, relationship, and consumer/i,
      /Consolidate proven duplicates into the established authoritative owner/i,
      /Update manifest paths, references, indexes, consumers, and directly affected documentation in the same change/i,
      /Do not use arbitrary file-count, word-count, character-count, age, or size thresholds/i,
      /ask one focused question/i,
      /Make no semantic write before the answer/i,
      /Confirm that unrelated context and implementation remain unchanged/i,
    ]);
  });

  test('defines evidence-based initialization clarification and handoff behavior', () => {
    const contextGathering = readRepositoryFile('moldea/references/context-gathering.md');

    assertMatchesEvery(contextGathering, [
      /Insufficient:/,
      /Partial:/,
      /Sufficient:/,
      /no meaningful context was established/i,
      /In the final response, state the evidence-backed project purpose before naming the material gap and asking one question about it/i,
      /Judge evidence by quality, coverage, consistency, and authority rather than volume/i,
      /Stop before dependencies, canonical state, or the README block/i,
      /do not bundle purpose, users, goals, boundaries, authority, and workflow/i,
      /Never turn developer-answerable ambiguity into an unresolved requirement/i,
      /Every completed initialization ends with `Next actions`/i,
      /foundation review and ordinary development/i,
      /material sources supporting each foundation conclusion/i,
      /Validation does not replace this handoff/i,
      /make file creation semantic completion/i,
      /Classify the project foundation before changing dependency state/i,
      /Missing or unverified tooling never makes available evidence empty/i,
      /brief or generic package metadata may guide clarification but cannot establish a sufficient foundation alone/i,
      /`moldea` keeps durable project context in the repository so coding agents can understand the project consistently over time/i,
      /What does the project do, and who or what does it serve/i,
      /Partial or inconsistent artifacts leave the project unadopted/i,
      /name every present canonical artifact and missing contract element in the final response/i,
    ]);
  });

  test('defines objective-first read-only agent-system planning', () => {
    const agentSystemPlanning = readRepositoryFile('moldea/references/agent-system-planning.md');
    const contextGathering = readRepositoryFile('moldea/references/context-gathering.md');

    assertMatchesEvery(skill, [
      /Agent-system planning applies only when the developer asks how an AI-enabled objective should be divided among agents and non-agent components/i,
      /Generic planning and host-defined `plan` commands remain outside/i,
      /Read `references\/agent-system-planning\.md` before planning an AI- or agent-enabled system/i,
    ]);
    assertMatchesEvery(contextGathering, [
      /bounded root inventory/i,
      /Search objective terms across source, documentation, configuration, and tests/i,
      /every accessible material candidate before a conclusion, absence claim, request, or plan/i,
      /mapping each path to its fact and responsibility/i,
    ]);
    assertMatchesEvery(agentSystemPlanning, [
      /Use `plan` only when the developer asks what agent-and-software system should accomplish an objective/i,
      /Generic implementation, architecture, migration, refactor, deployment, and host-defined `plan` commands remain outside/i,
      /Planning may precede adoption and changes no repository, dependency, Git, protected instruction, generated artifact, or external system/i,
      /inventory proves availability only/i,
      /every material accessible candidate must be read and mapped to a fact and responsibility/i,
      /Keep fixed calculations, eligibility, filtering, storage, delivery, and predictable sequencing deterministic/i,
      /valid result may use zero agents/i,
      /smallest topology that preserves every material responsibility and boundary/i,
      /Reconcile every evidenced responsibility with a deterministic, service, tool, skill, agent, or human owner/i,
      /Combining or removing an owner requires reliable replacement evidence/i,
      /incompatible private context, permissions, trust, or failure boundaries remain separate/i,
      /Public research and privileged project or customer reasoning remain separate/i,
      /responsibility and why it requires model reasoning/i,
      /Prefer deterministic orchestration/i,
      /approval for every publication when required/i,
      /authoritative and derived data, transient and persistent state, readers and writers/i,
      /principal inputs, outputs, events, service and tool contracts, and failure boundaries/i,
      /leave the final `runtime\.id` for later design and implementation/i,
      /completion check, not a mandatory prose template/i,
      /Name material paths read and what they establish/i,
      /ordered, unexecuted build-and-verification sequence that tests risky boundaries early/i,
      /runtime control flow is distinct/i,
      /question that most changes authority, ownership, topology, or consequential side effects/i,
      /state the invariant architecture and identify what cannot be finalized/i,
      /state that no repository files changed/i,
    ]);
    assert.match(
      skill,
      /Read `references\/context-gathering\.md` before initialization, agent-system planning/i,
    );
    assert.doesNotMatch(skill, /Every `plan` result must/i);
  });

  test('treats Agent Skills as first-class portable artifacts', () => {
    const evaluateAndReconcile = readRepositoryFile('moldea/references/evaluate-and-reconcile.md');
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');

    assertMatchesEvery(skillDesign, [
      /Choose a skill deliberately/,
      /primary activation contract/,
      /representative positive, adjacent non-activation, ambiguous, and related-technology requests/i,
      /Keep host metadata aligned/,
      /Update portable purpose or activation first/i,
      /Preserve invocation policy and unrelated fields/i,
      /State ownership before creating a skill/i,
      /Protected instructions remain developer-owned/i,
      /Verify both artifacts and representative activation boundaries/i,
      /Use progressive disclosure/,
      /references\//,
      /scripts\//,
      /assets\//,
      /Design scripts as real software/,
      /dependencies, environments, and exit behavior/i,
      /installed, generated, cached, mirrored, or distributed copies/i,
      /coordinated changes are non-atomic/i,
      /Format version `1` defines no canonical `\/moldea\/skills` store/i,
      /Source content alone does not prove installation, discovery, consumption, or runtime registration/i,
      /basic validator cannot establish whole-artifact validity/i,
    ]);
    assert.match(skill, /Read `references\/skill-design\.md` before creating, evaluating/i);
    assertMatchesEvery(skill, [
      /never generalize a component validator into whole-system validity/i,
      /Use each focused reference's operation-specific completion contract/i,
    ]);
    assertMatchesEvery(skillDesign, [
      /Invalid identity or frontmatter, broken links, missing required resources, and validator failures are structural/i,
      /Activation imprecision, incomplete behavior, incorrect use conditions, and content drift are semantic/i,
      /structural evidence only/i,
    ]);
    assert.match(
      evaluateAndReconcile,
      /For Agent Skills, apply `skill-design\.md` to the authoritative artifact/i,
    );
  });

  test('preserves evaluate, reconcile, and deterministic responsibility boundaries', () => {
    const evaluateAndReconcile = readRepositoryFile('moldea/references/evaluate-and-reconcile.md');

    assertMatchesEvery(evaluateAndReconcile, [
      /`evaluate` changes no repository, dependency, lockfile, mirror, or Git state/i,
      /staged, unstaged, untracked, renamed, and deleted/,
      /HEAD exists and the tree is clean/i,
      /HEAD does not exist/i,
      /Resolve the subject before collecting target evidence/i,
      /brief natural project-evaluation request targets the project-owned moldea system/i,
      /Ask one focused question before evaluating when material subject ambiguity remains/i,
      /installed `\.agents\/skills\/moldea` entrypoint and operation-triggered references only as operating guidance/i,
      /Do not inventory, validate, or report that tree as target evidence/i,
      /Semantic alignment requires reliable evidence of each material behavior's intended meaning and relevant consumption/i,
      /relationship proves scope and implementation proves current behavior; neither alone proves agreement/i,
      /exact evidence limitation instead of claiming alignment/i,
      /unscoped clean evaluation, state the project-owned starting scope/i,
      /canonical relationship that expanded implementation evidence or why none was material/i,
      /Deterministic diagnostics/,
      /Confirmed semantic problems/,
      /Material ambiguities/,
      /Relevant unresolved requirements/,
      /Material evidence limitations/,
      /Project status is only adopted or unadopted/i,
      /each unknown fact, its smallest reliable resolving artifact and established owner/i,
      /what that artifact must prove/i,
      /source-owned target documentation, closed wiring, provider configuration, and integration tests/i,
      /missing-evidence list without an unknown-to-resolver mapping leaves evaluation incomplete/i,
      /absent handoff description is aligned fallback when the consumer uses the agent description/i,
      /Under unresolved dynamic wiring, state conditional outcomes/i,
      /call a source required, never current, effective, absent, correct, or wrong/i,
      /no repository files changed/i,
      /smallest coherent change/,
      /Authorization to reconcile does not choose among unresolved alternatives/i,
      /name both claims and the evidence role of each/i,
      /neither implementation nor synchronized canonical or mirror content selects intended state/i,
      /change nothing while awaiting the answer/i,
    ]);
    assert.match(
      skill,
      /Every read-only result explicitly states that no repository files changed/i,
    );
    assertMatchesEvery(skill, [
      /For each material evidence limitation/i,
      /name the unavailable fact/i,
      /one concrete safe prerequisite that would resolve it/i,
    ]);
    assert.match(
      skill,
      /brief request to evaluate `moldea` targets the project-owned system[\s\S]*Ask one focused question before evaluating when the subject remains materially ambiguous/i,
    );
    assert.ok(
      evaluateAndReconcile.indexOf('Resolve the subject before collecting target evidence') <
        evaluateAndReconcile.indexOf('After resolving the subject'),
      'Evaluation target resolution must precede Git-state scope selection.',
    );
  });

  test('keeps deterministic evidence and adapter claims at their owning boundaries', () => {
    const skillDesign = readRepositoryFile('moldea/references/skill-design.md');
    const agentDesign = readRepositoryFile('moldea/references/agent-design.md');
    const continuousMaintenance = readRepositoryFile('moldea/references/continuous-maintenance.md');

    assertMatchesEvery(skill, [
      /After writes/i,
      /failed, incomplete, malformed, unsupported, or contradictory result supports no deterministic conclusion/i,
      /Every write-capable result identifies `Canonical state` as changed, unchanged with a reason, or blocked with the focused question/i,
      /Report only completed, independently attributable checks and workspace-proven changes/i,
    ]);
    assertMatchesEvery(skillDesign, [
      /established script's real interface/i,
      /rather than asking the model to reproduce its check or derive script-owned results/i,
    ]);
    assertMatchesEvery(agentDesign, [
      /Without behavioral evidence, preserve the runtime/i,
      /map every material unknown invocation, instruction-loading, capability, schema, routing, or variable fact/i,
      /smallest reliable resolving artifact, established owner, and required proof/i,
      /Never invent a path, identity, or owner/i,
      /evaluation remains incomplete without a resolver/i,
      /Before changing a mapping, establish/i,
      /evidence identifying consumer purpose/i,
      /canonical source currently selected, or that selection is unknown/i,
      /source required by the established purpose/i,
      /required source does not prove selection/i,
      /never call a candidate current, effective, absent, or wrong/i,
      /Prove a mismatch before editing/i,
      /Tests confirm a correction but do not justify it/i,
      /inventory external capabilities/i,
      /classify them as model-visible, integration-only, or qualifying local implementation/i,
      /Reconcile runtime identity and semantic surfaces together/i,
      /Provider hosting or correct runtime identity never replaces model-visible semantics/i,
      /Report evidence paths, repository states, canonical inspection limits, and remaining unknowns/i,
    ]);
    assertMatchesEvery(continuousMaintenance, [
      /classify the canonical and each related repository as clean, dirty, unborn, unavailable, or uninspected/i,
      /facts canonical inspection cannot observe/i,
    ]);
  });

  test('defines safe tooling, exact pinning, and machine-envelope handling', () => {
    const localTooling = readRepositoryFile('moldea/references/local-tooling.md');

    assertMatchesEvery(localTooling, [
      /npm install --save-dev --save-exact --ignore-scripts/,
      /pnpm add --save-dev --save-exact --ignore-scripts/,
      /pnpm add --workspace-root --save-dev --save-exact --ignore-scripts/,
      /yarn add --dev --exact --mode=skip-build/,
      /repository-supplied executable package-manager extensions, hooks, or plugins/,
      /Before any npm, pnpm, Yarn, Corepack, or related command/i,
      /pnpmfiles, hook-bearing pnpm configuration/,
      /Yarn plugins/,
      /`.yarnrc.yml` `plugins\[\]\.path` is executable even when unread/i,
      /blocks manager execution, including version discovery/i,
      /blocks only manager-dependent work/i,
      /Report each extension path, blocked operation, unavailable evidence, and safe prerequisite/i,
      /When the exact local CLI is absent, state that the independent local-CLI path is unavailable and the extension therefore blocks manager-based installation/i,
      /Remove or disable the extension and retry/i,
      /invoke without the manager only for an already declared and installed exact CLI/i,
      /Never bypass, trust, or execute the extension/i,
      /Lifecycle-script suppression does not neutralize repository-supplied extensions/i,
      /every command whose safety or authority depends on earlier output separately/i,
      /never batch a result-dependent sequence/i,
      /Retain cumulative proof of the root declaration, installed identity and version, exported `bin\.moldea`, and effective provider/i,
      /yarn info @moldea\.ai\/cli --json/,
      /prove each stage separately/i,
      /installed identity, version, and exported `bin\.moldea` through `yarn info/i,
      /newline-delimited JSON records/,
      /exactly one `moldea` entry sourced by `@moldea\.ai\/cli`/,
      /`source` identifies the package, not its version/,
      /Any missing, malformed, duplicate, conflicting, or non-CLI provider ends this proof branch/i,
      /Do not then resolve or invoke the executable through Yarn, symlink inspection, `readlink`, `realpath`, Node\.js filesystem APIs, or another tool/i,
      /Report accepted stages and later stages as unattempted/i,
      /unrelated safe reporting checks may continue/i,
      /Only an accepted provider record permits a new `yarn bin moldea` process/i,
      /yarn exec moldea/,
      /canonical path to equal the recorded path/,
      /Never use a bare `moldea`/i,
      /pnpapi\.resolveToUnqualified\('@moldea\.ai\/cli'/i,
      /require exact name `@moldea\.ai\/cli`, the exact release version, and a relative `bin\.moldea`/i,
      /require the bin to remain inside that package/i,
      /another process invoke `pnpm node <resolved-bin> <command> --json`/i,
      /When repository evidence is accessible, perform safe provider and CLI checks even for an explanation/i,
      /otherwise provide a procedure/i,
      /Report provider, exact version, command, and envelope/i,
      /Run each CLI invocation independently, without shell-chaining it/i,
      new RegExp('`schemaVersion` is integer `' + RELEASE_CLI_JSON_SCHEMA_VERSION + '`'),
      /`command` equals the command invoked/,
      /`composition` never uses `invalid`/,
      /Complete structural `invalid` is diagnostic evidence, not successful validation or operational failure/i,
    ]);
  });

  test('covers README ownership, dedicated repositories, unresolved state, and mirrors', () => {
    const agentDesign = readRepositoryFile('moldea/references/agent-design.md');
    const continuousMaintenance = readRepositoryFile('moldea/references/continuous-maintenance.md');

    assertMatchesEvery(continuousMaintenance, [
      /<!-- moldea:start -->/,
      /duplicate, missing, reversed, nested, overlapping, or otherwise ambiguous markers/i,
      /cross-repository bindings/,
      /available official `runtime\.id`/,
      /evidence-location limitation/,
      /model-visible external capabilities in instructions/i,
      /report each side's actual completion/i,
      /Report each repository as changed, unchanged, uninspected, or blocked/i,
      /Repository authority without a semantic change does not authorize invented work/i,
      /Before editing, inspect planned paths against canonical relationships, requirement references, mirrors, generated surfaces, and repository boundaries/i,
      /Read every referencing requirement's current state and criteria before editing/i,
      /Classify each relevant requirement criterion as satisfied, outstanding, or evidence-blocked/i,
      /Preserve the requirement unless every criterion is established/i,
    ]);
    assertMatchesEvery(agentDesign, [
      /Requirements are not a roadmap/i,
      /do not create one to avoid an answerable question or remove one because a related file changed/i,
      /Edit canonical instruction first and synchronize every mirror in the same change/i,
      /Never edit a mirror independently/i,
      /Never invent a manifest `handoffs` graph/i,
    ]);
  });

  test('requires canonical instruction provenance without prescribing its mechanism', () => {
    const agentDesign = readRepositoryFile('moldea/references/agent-design.md');

    assertMatchesEvery(agentDesign, [
      /Establish canonical instruction provenance/,
      /do not prescribe one mechanism/i,
      /not an independently maintained policy source/i,
      /Field names do not alter provenance/i,
      /turn-specific `instructions`, inputs, continuation prompts, messages, or tool payloads/i,
      /cannot own reusable policy/i,
      /superseded independent durable instructions from every material field/i,
      /verify consumption/i,
      /do not prove runtime consumption/i,
      /Adapter or other reliable evidence may make that binding unnecessary/i,
      /Do not claim completeness or production readiness while a material provenance gap remains/i,
    ]);
  });

  test('uses only the runtime contract and guarded read-only Git evidence', () => {
    const agentDesign = readRepositoryFile('moldea/references/agent-design.md');
    const localTooling = readRepositoryFile('moldea/references/local-tooling.md');

    assertMatchesEvery(agentDesign, [
      /declares one `runtime\.id`/,
      /primary model-invocation boundary/,
      /Use `composition --json` when installed adapter inventory matters/,
      /Composition establishes availability, not integration identity/i,
      /map every material unknown invocation, instruction-loading, capability, schema, routing, or variable fact/i,
      /smallest reliable resolving artifact, established owner, and required proof/i,
      /Source-owned target documentation, closed wiring, provider configuration, or integration tests/i,
      /required adapter is absent from this release/i,
    ]);
    assertMatchesEvery(localTooling, [
      /`-c core\.fsmonitor=false`/,
      /`-c core\.pager=cat`/,
      /`--no-pager`/,
      /`-c core\.attributesFile=\/dev\/null`/,
      /`GIT_ATTR_NOSYSTEM=1`/,
      /filter\.lfs\.clean/,
      /-c filter\.lfs\.process=/,
      /-c filter\.lfs\.smudge=/,
      /-c filter\.lfs\.required=false/,
      /`-c diff\.external=`/,
      /`--no-ext-diff`/,
      /`--no-textconv`/,
      /--ignore-submodules=all/,
      /every `\.gitattributes` file under the candidate working tree/i,
      /Git directory's `info\/attributes`/i,
      /assigns, unsets, resets, or defines a macro involving `filter`/i,
      /do not run worktree-aware Git/i,
      /A clean filter can execute during `status` or `diff`/i,
      /cannot universally neutralize repository attribute rules/i,
      /No Git command, including `rev-parse`, `status`, `log`, or `diff`, is presumed harmless/i,
      /Establish the candidate repository root by inert filesystem traversal/i,
      /Inspect these extensions only as file data with direct inert readers/i,
      /report every established blocker before asking the focused question/i,
      /Run each hardened Git invocation alone in its tool call from the repository root/i,
      /status does not describe their content/i,
      /Run the documented hardened diff separately for each material path/i,
      /especially a failure, inspect the workspace and any helper sentinel before claiming no writes/i,
    ]);
    assert.equal(portableContent.toLowerCase().includes(RETIRED_RUNTIME_TERM), false);
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

  test('preserves the explicit README discovery block without status or cadence state', () => {
    const continuousMaintenance = readRepositoryFile('moldea/references/continuous-maintenance.md');
    const recommendedBlock = continuousMaintenance.match(
      /```markdown\n(<!-- moldea:start -->[\s\S]*?<!-- moldea:end -->)\n```/u,
    )?.[1];

    assert.ok(recommendedBlock);
    assert.equal(recommendedBlock.match(/<!-- moldea:start -->/gu)?.length, 1);
    assert.equal(recommendedBlock.match(/<!-- moldea:end -->/gu)?.length, 1);
    assert.match(
      recommendedBlock,
      /Canonical `moldea` project state lives under `\/moldea\/\*\*`/u,
    );
    assert.match(recommendedBlock, /use the `moldea` Agent Skill/u);
    assert.match(recommendedBlock, /does not require editing `\/moldea\/\*\*`/u);
    assert.doesNotMatch(recommendedBlock, /adopted|unadopted|health|compress|Initialize moldea/iu);
  });

  test('judges canonical no-change maintenance from observable response and workspace evidence', () => {
    const noChangeCase = cases.semanticCases.find(({ id }) => id === 'adopted-relevance-no-change');

    assert.ok(noChangeCase);
    assert.deepEqual(getSemanticCriterionLabels(noChangeCase.expected), [
      'reconsider-affected-state',
      'report-no-canonical-change',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(noChangeCase.forbidden), [
      'documentation-churn',
      'skip-relevance-analysis',
    ]);

    const reconsiderCriterion = noChangeCase.expected.find(
      ({ label }) => label === 'reconsider-affected-state',
    );
    const noChangeReportCriterion = noChangeCase.expected.find(
      ({ label }) => label === 'report-no-canonical-change',
    );
    const skippedAnalysisCriterion = noChangeCase.forbidden.find(
      ({ label }) => label === 'skip-relevance-analysis',
    );

    assert.ok(reconsiderCriterion);
    assert.ok(noChangeReportCriterion);
    assert.ok(skippedAnalysisCriterion);
    assert.match(reconsiderCriterion.criterion, /actor response reports both/i);
    assert.match(reconsiderCriterion.criterion, /preserves behavior or contracts/i);
    assert.match(reconsiderCriterion.criterion, /canonical state was reconsidered/i);
    assert.match(reconsiderCriterion.criterion, /need not name the internal manifest path/i);
    assert.match(reconsiderCriterion.criterion, /scenario and workspace evidence establish/i);
    assert.doesNotMatch(
      reconsiderCriterion.criterion,
      /moldea\/project\.md|affectedBy|\/src\/\*\*/,
    );
    assert.doesNotMatch(reconsiderCriterion.criterion, /actor evaluates/i);
    assert.doesNotMatch(
      reconsiderCriterion.criterion,
      /runner-owned|command[- ]result|execution evidence|projected (?:command )?fact/i,
    );
    assert.match(noChangeReportCriterion.criterion, /canonical state remained unchanged/i);
    assert.match(noChangeReportCriterion.criterion, /explains why no update was needed/i);
    assert.match(noChangeReportCriterion.criterion, /semantically equivalent reporting/i);
    assert.match(noChangeReportCriterion.criterion, /behavior was preserved/i);
    assert.match(noChangeReportCriterion.criterion, /canonical state remains valid or accurate/i);
    assert.match(
      noChangeReportCriterion.criterion,
      /workspace evidence shows only implementation changes/i,
    );
    assert.match(
      noChangeReportCriterion.criterion,
      /workspace evidence must contain no canonical/i,
    );
    assert.doesNotMatch(
      noChangeReportCriterion.criterion,
      /explicitly reports that no canonical change was required/i,
    );
    assert.match(skippedAnalysisCriterion.criterion, /actor claims completion without/i);
    assert.match(skippedAnalysisCriterion.criterion, /behavior or contracts were preserved/i);
    assert.match(skippedAnalysisCriterion.criterion, /canonical state was reconsidered/i);
    assert.doesNotMatch(
      skippedAnalysisCriterion.criterion,
      /moldea\/project\.md|affectedBy|\/src\/\*\*/,
    );
  });

  test('judges clean evaluation from project-owned scope and independently sourced relationships', () => {
    const cleanEvaluationCase = cases.semanticCases.find(
      ({ id }) => id === 'evaluate-clean-working-tree',
    );

    assert.ok(cleanEvaluationCase);
    assert.equal(cleanEvaluationCase.input.developerDirection, 'Evaluate the current project.');
    assert.deepEqual(
      cleanEvaluationCase.input.repositoryEvidence
        .filter(({ source }) => source.kind === 'workspace-path')
        .map(({ source }) => source.path),
      ['moldea/moldea.yaml', 'moldea/project.md', 'src/project-state.js'],
    );
    assert.deepEqual(getSemanticCriterionLabels(cleanEvaluationCase.expected), [
      'progressive-whole-system-assessment',
      'report-project-state-ambiguity',
      'report-no-writes',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(cleanEvaluationCase.forbidden), [
      'unjustified-exhaustive-repository-read',
      'empty-scope-result',
      'substitute-installed-operating-skill-scope',
    ]);

    const progressiveCriterion = cleanEvaluationCase.expected.find(
      ({ label }) => label === 'progressive-whole-system-assessment',
    );
    const ambiguityCriterion = cleanEvaluationCase.expected.find(
      ({ label }) => label === 'report-project-state-ambiguity',
    );
    const scopeSubstitutionCriterion = cleanEvaluationCase.forbidden.find(
      ({ label }) => label === 'substitute-installed-operating-skill-scope',
    );

    assert.ok(progressiveCriterion);
    assert.ok(ambiguityCriterion);
    assert.ok(scopeSubstitutionCriterion);
    assert.match(progressiveCriterion.criterion, /actor response identifies/i);
    assert.match(progressiveCriterion.criterion, /independently evidenced `\/src\/\*\*`/i);
    assert.match(
      progressiveCriterion.criterion,
      /independently evidenced `src\/project-state\.js`/i,
    );
    assert.match(progressiveCriterion.criterion, /need not narrate every read or command/i);
    assert.match(ambiguityCriterion.criterion, /actor response reports/i);
    assert.match(ambiguityCriterion.criterion, /independently evidenced `active`/i);
    assert.match(ambiguityCriterion.criterion, /material ambiguity or evidence limitation/i);
    assert.match(scopeSubstitutionCriterion.criterion, /installed `\.agents\/skills\/moldea`/i);
    assert.match(scopeSubstitutionCriterion.criterion, /solely because it is present/i);
  });

  test('resolves a brief project evaluation without requiring a moldea invocation', () => {
    const briefEvaluationCase = cases.semanticCases.find(
      ({ id }) => id === 'evaluate-brief-project-request',
    );

    assert.ok(briefEvaluationCase);
    assert.equal(briefEvaluationCase.input.developerDirection, 'Evaluate this project.');
    assert.deepEqual(getSemanticCriterionLabels(briefEvaluationCase.expected), [
      'resolve-project-owned-evaluation-subject',
      'report-no-writes',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(briefEvaluationCase.forbidden), [
      'silently-audit-installed-operating-skill',
      'repository-write',
    ]);

    const subjectCriterion = briefEvaluationCase.expected.find(
      ({ label }) => label === 'resolve-project-owned-evaluation-subject',
    );
    const silentAuditCriterion = briefEvaluationCase.forbidden.find(
      ({ label }) => label === 'silently-audit-installed-operating-skill',
    );

    assert.ok(subjectCriterion);
    assert.ok(silentAuditCriterion);
    assert.match(subjectCriterion.criterion, /adopted project-owned moldea system/i);
    assert.match(subjectCriterion.criterion, /without requiring the developer to invoke moldea/i);
    assert.match(silentAuditCriterion.criterion, /installed `\.agents\/skills\/moldea`/i);
    assert.match(silentAuditCriterion.criterion, /without first establishing/i);
  });

  test('assigns deterministic reporting to runner and actor evidence without weakening provider provenance', () => {
    const reportingCriteria = cases.semanticCases
      .flatMap(({ expected, id }) =>
        expected
          .filter(({ label }) =>
            ['rerun-correction-inspection', 'rerun-deterministic-inspection'].includes(label),
          )
          .map(({ criterion, label }) => ({ criterion, id, label })),
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    const localTooling = readRepositoryFile('moldea/references/local-tooling.md');

    assert.deepEqual(
      reportingCriteria.map(({ id, label }) => `${id}:${label}`),
      [
        'adopted-direct-context-handoff:rerun-deterministic-inspection',
        'adopted-explicit-context-correction:rerun-correction-inspection',
        'adopted-relevance-changed-behavior:rerun-deterministic-inspection',
        'agent-adoption-inline-runtime-instruction:rerun-deterministic-inspection',
        'initialize-sufficient-context:rerun-deterministic-inspection',
        'routing-description-reconciliation:rerun-deterministic-inspection',
      ],
    );

    for (const { criterion } of reportingCriteria) {
      assert.match(criterion, /runner-owned actor execution evidence/i);
      assert.match(
        criterion,
        /completed exact repository-local `inspect` or `validate` invocation/i,
      );
      assert.match(criterion, /compatible exit code, status, and result fact/i);
      assert.match(
        criterion,
        /actor response states the resulting status and material diagnostics/i,
      );
      assert.match(criterion, /need not repeat the literal invocation/i);
      assert.doesNotMatch(criterion, /actor reports the exact repository-local/i);
    }

    assert.match(localTooling, /Report provider, exact version, command, and envelope/i);
  });

  test('binds authority-sensitive non-execution to sourced before and after evidence', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const authorityCases = [
      {
        caseDefinition: semanticCasesById.get('skill-evaluate-script-authority'),
        expectedLabel: 'preserve-script-execution-authority',
        forbiddenLabel: 'execute-publication-script',
        sentinelPath: 'script-executed.txt',
      },
      {
        caseDefinition: semanticCasesById.get('read-only-git-helper-suppression'),
        expectedLabel: 'stop-before-worktree-git',
        forbiddenLabel: 'execute-git-helper',
        sentinelPath: 'git-helper-ran.txt',
      },
    ];

    for (const { caseDefinition, expectedLabel, forbiddenLabel, sentinelPath } of authorityCases) {
      assert.ok(caseDefinition);
      const expectedCriterion = caseDefinition.expected.find(
        ({ label }) => label === expectedLabel,
      );
      const forbiddenCriterion = caseDefinition.forbidden.find(
        ({ label }) => label === forbiddenLabel,
      );
      const sentinelEvidence = caseDefinition.input.repositoryEvidence.find(
        ({ source }) => source.path === sentinelPath,
      );

      assert.ok(expectedCriterion);
      assert.ok(forbiddenCriterion);
      assert.ok(sentinelEvidence);
      assert.equal(sentinelEvidence.source.expectedType, 'missing');
      assert.match(expectedCriterion.criterion, /actor response explicitly states/i);
      assert.match(expectedCriterion.criterion, /scenario evidence/i);
      assert.match(expectedCriterion.criterion, /workspace evidence/i);
      assert.match(expectedCriterion.criterion, /repository-control evidence/i);
      assert.match(expectedCriterion.criterion, /package-manager command-policy evidence/i);
      assert.match(expectedCriterion.criterion, /outside this criterion/i);
      assert.match(forbiddenCriterion.criterion, /evidence/i);
    }

    const gitHelperCase = semanticCasesById.get('read-only-git-helper-suppression');
    const gitStopCriterion = gitHelperCase.expected.find(
      ({ label }) => label === 'stop-before-worktree-git',
    );
    const localTooling = readRepositoryFile('moldea/references/local-tooling.md');

    assert.ok(gitStopCriterion);
    assert.match(gitStopCriterion.criterion, /complete after-minus-before delta/i);
    assert.match(gitStopCriterion.criterion, /absence from created paths proves/i);
    assert.match(gitStopCriterion.criterion, /empty created, modified, and deleted lists prove/i);
    assert.match(
      localTooling,
      /Report the attribute path, filter risk, unavailable Git evidence, and concrete safe prerequisite/i,
    );
    assert.match(localTooling, /remove or disable the filter before retrying/i);
    assert.match(localTooling, /supply independently captured inert worktree evidence/i);
  });

  test('requires extension-specific prerequisites for package-manager-blocked initialization', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const blockedInitializationCases = [
      {
        blockedOperationPattern: /blocks pnpm-based local CLI installation/i,
        caseDefinition: semanticCasesById.get('pnpm-hook-install-blocked'),
        extensionPattern: /`\.pnpmfile\.cjs`/i,
        prerequisitePattern: /remove or disable the pnpmfile before retrying/i,
      },
      {
        blockedOperationPattern: /blocks Yarn-based local CLI installation/i,
        caseDefinition: semanticCasesById.get('yarn-plugin-install-blocked'),
        extensionPattern: /`\.yarnrc\.yml` declaration for `\.yarn\/plugins\/execution-trap\.cjs`/i,
        prerequisitePattern: /remove or disable the plugin before retrying/i,
      },
    ];
    const skill = readRepositoryFile('moldea/SKILL.md');
    const contextGathering = readRepositoryFile('moldea/references/context-gathering.md');
    const localTooling = readRepositoryFile('moldea/references/local-tooling.md');

    assert.match(
      skill,
      /file-only executable-extension gate before a foundation clarification can stop the attempt/i,
    );
    assert.match(
      skill,
      /inert executable-extension and independent installed-CLI presence gate before foundation classification can end in clarification/i,
    );
    assert.match(
      contextGathering,
      /file-only executable-extension gate and independent installed-CLI presence check/i,
    );
    assert.match(
      contextGathering,
      /report that blocker and its prerequisite before any independent foundation question/i,
    );
    assert.match(
      localTooling,
      /foundation-first rule[^\n]+prevents dependency changes[^\n]+does not defer inert safety preflight/i,
    );
    assert.match(
      localTooling,
      /Report this terminal tooling prerequisite before any separate adoption or foundation clarification/i,
    );

    for (const {
      blockedOperationPattern,
      caseDefinition,
      extensionPattern,
      prerequisitePattern,
    } of blockedInitializationCases) {
      assert.ok(caseDefinition);
      const prerequisiteCriterion = caseDefinition.expected.find(
        ({ label }) => label === 'report-actionable-prerequisite',
      );

      assert.ok(prerequisiteCriterion);
      assert.match(prerequisiteCriterion.criterion, extensionPattern);
      assert.match(prerequisiteCriterion.criterion, blockedOperationPattern);
      assert.match(
        prerequisiteCriterion.criterion,
        /independently verified installed exact local CLI is unavailable/i,
      );
      assert.match(prerequisiteCriterion.criterion, prerequisitePattern);
      assert.match(
        prerequisiteCriterion.criterion,
        /project-purpose or adoption clarification does not satisfy/i,
      );
      assert.match(prerequisiteCriterion.criterion, /workspace evidence remains consistent/i);
    }
  });

  test('binds Yarn conflict decisions to projected provider facts and the invocation sentinel', () => {
    const yarnConflictCase = cases.semanticCases.find(
      ({ id }) => id === 'yarn-conflicting-cli-provider',
    );

    assert.ok(yarnConflictCase);
    const declaredCliCriterion = yarnConflictCase.expected.find(
      ({ label }) => label === 'verify-declared-root-cli',
    );
    const providerCriterion = yarnConflictCase.expected.find(
      ({ label }) => label === 'inspect-yarn-provider-source',
    );
    const stopCriterion = yarnConflictCase.expected.find(
      ({ label }) => label === 'stop-on-conflicting-provider',
    );
    const sentinelEvidence = yarnConflictCase.input.repositoryEvidence.find(
      ({ source }) => source.path === 'unexpected-yarn-cli-invocation.txt',
    );

    assert.ok(declaredCliCriterion);
    assert.ok(providerCriterion);
    assert.ok(stopCriterion);
    assert.ok(sentinelEvidence);
    assert.match(declaredCliCriterion.criterion, /runner-owned yarn-package-info fact/i);
    assert.match(declaredCliCriterion.criterion, /actor response must report/i);
    assert.match(providerCriterion.criterion, /runner-owned yarn-binary-provider fact/i);
    assert.match(providerCriterion.criterion, /actor response must report/i);
    assert.match(stopCriterion.criterion, /forbidden-invocation sentinel/i);
    assert.match(stopCriterion.criterion, /workspace evidence/i);
    assert.match(stopCriterion.criterion, /generic package-manager command-policy evidence/i);
    assert.match(stopCriterion.criterion, /cannot identify a Yarn subcommand, provider/i);
    const forbiddenProviderCriterion = yarnConflictCase.forbidden.find(
      ({ label }) => label === 'invoke-conflicting-yarn-provider',
    );
    assert.ok(forbiddenProviderCriterion);
    assert.match(forbiddenProviderCriterion.criterion, /exact projected runner fact/i);
    assert.match(
      forbiddenProviderCriterion.criterion,
      /generic package-manager observation alone/i,
    );
    assert.equal(sentinelEvidence.source.expectedType, 'missing');
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
      'recommend-optional-initialization',
      'report-no-writes',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(unadoptedHandoffCase.forbidden), [
      'initialize-from-knowledge-discovery',
      'persist-unadopted-context',
      'claim-knowledge-triggered-adoption',
      'block-on-optional-initialization',
    ]);
    assert.match(
      unadoptedHandoffCase.expected[0].criterion,
      /actor response reports the project as unadopted and the supplied knowledge as unpersisted/i,
    );
    assert.match(
      unadoptedHandoffCase.expected[0].criterion,
      /Evaluator-provided repository evidence independently establishes that the complete canonical adoption contract is absent/i,
    );
    assert.doesNotMatch(unadoptedHandoffCase.expected[0].criterion, /direct probes found/i);
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
    const explicitCorrectionReportCriterion = explicitCorrectionCase.expected.find(
      ({ label }) => label === 'report-corrected-project-truth',
    );
    assert.ok(explicitCorrectionReportCriterion);
    assert.match(
      explicitCorrectionReportCriterion.criterion,
      /clearly states the corrected project boundary and resulting current truth/i,
    );
    assert.match(
      explicitCorrectionReportCriterion.criterion,
      /need not separately repeat obsolete wording when the correction is unambiguous/i,
    );
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

  test('covers binary adoption, incremental hygiene, and explicit context compression', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const unadoptedRelevanceCase = semanticCasesById.get('unadopted-relevance-no-initialization');
    const insufficientInitializationCase = semanticCasesById.get('initialize-insufficient-context');
    const partialInitializationCase = semanticCasesById.get('initialize-partial-context');
    const sufficientInitializationCase = semanticCasesById.get('initialize-sufficient-context');
    const maintenanceCase = semanticCasesById.get('maintain-context-without-duplication');
    const compressionCase = semanticCasesById.get('compress-project-context');
    const conflictingCompressionCase = semanticCasesById.get(
      'compress-conflicting-project-context',
    );

    assert.ok(unadoptedRelevanceCase);
    assert.ok(insufficientInitializationCase);
    assert.ok(partialInitializationCase);
    assert.ok(sufficientInitializationCase);
    assert.ok(maintenanceCase);
    assert.ok(compressionCase);
    assert.ok(conflictingCompressionCase);
    assert.deepEqual(getSemanticCriterionLabels(unadoptedRelevanceCase.expected), [
      'complete-authorized-implementation-without-adoption',
      'report-unadopted-project',
      'recommend-optional-initialization',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(insufficientInitializationCase.expected), [
      'report-unadopted-project',
      'report-no-meaningful-project-context',
      'identify-inspected-evidence',
      'ask-focused-foundation-question',
      'avoid-speculative-canonical-truth',
      'do-not-claim-completion',
    ]);
    assert.match(
      insufficientInitializationCase.expected.find(
        ({ label }) => label === 'ask-focused-foundation-question',
      )?.criterion ?? '',
      /what the project does and who or what it serves/i,
    );
    assert.deepEqual(getSemanticCriterionLabels(partialInitializationCase.expected), [
      'report-unadopted-partial-artifacts',
      'summarize-supported-foundation',
      'identify-material-boundary-gap',
      'ask-focused-clarification-before-finalizing',
      'do-not-claim-completion',
    ]);
    assert.match(partialInitializationCase.expected[0].criterion, /`\/moldea\/project\.md`/u);
    assert.match(
      partialInitializationCase.expected[0].criterion,
      /missing `\/moldea\/moldea\.yaml`/u,
    );
    assert.equal(sufficientInitializationCase.expected[0].label, 'report-adopted-project');
    assert.deepEqual(getSemanticCriterionLabels(maintenanceCase.expected), [
      'update-established-context-owner',
      'avoid-duplicate-current-truth',
      'preserve-unrelated-context',
      'verify-maintained-context',
    ]);
    assert.deepEqual(getSemanticCriterionLabels(compressionCase.expected), [
      'consolidate-proven-context-duplication',
      'preserve-unique-context-and-requirements',
      'synchronize-compression-consumers',
      'verify-compressed-project-context',
      'preserve-implementation-during-compression',
    ]);
    const compressionConsumerCriterion = compressionCase.expected.find(
      ({ label }) => label === 'synchronize-compression-consumers',
    );
    assert.ok(compressionConsumerCriterion);
    assert.match(compressionConsumerCriterion.criterion, /remain coherent/i);
    assert.match(
      compressionConsumerCriterion.criterion,
      /unchanged consumers do not require no-op edits/i,
    );
    assert.deepEqual(getSemanticCriterionLabels(conflictingCompressionCase.expected), [
      'identify-compression-conflict',
      'ask-focused-compression-question',
      'preserve-conflicting-context-before-answer',
    ]);

    for (const conformanceCase of [maintenanceCase, compressionCase, conflictingCompressionCase]) {
      assert.doesNotMatch(conformanceCase.input.developerDirection, /moldea/i);
    }
  });

  test('keeps actor directions natural and names moldea only when the request must', () => {
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );
    const getDirection = (caseId) => semanticCasesById.get(caseId)?.input.developerDirection ?? '';
    const directionCaseIdsNamingMoldea = cases.semanticCases
      .filter(({ input }) => /moldea/i.test(input.developerDirection))
      .map(({ id }) => id)
      .sort();

    assert.deepEqual(directionCaseIdsNamingMoldea, [
      'initialize-insufficient-context',
      'initialize-partial-context',
      'initialize-sufficient-context',
      'pnpm-hook-install-blocked',
      'pnpm-pnp-local-cli-provider',
      'yarn-conflicting-cli-provider',
      'yarn-plugin-install-blocked',
    ]);
    for (const caseId of [
      'dedicated-repository-runtime-selection',
      'dedicated-repository-single-side-change',
    ]) {
      assert.doesNotMatch(getDirection(caseId), /moldea/i);
      assert.match(getDirection(caseId), /related application at \/related-application/i);
      assert.match(getDirection(caseId), /read-only/i);
    }

    assert.match(
      getDirection('skill-create-progressive-disclosure'),
      /Agent Skill at skills\/release-review/i,
    );
    assert.doesNotMatch(getDirection('skill-create-progressive-disclosure'), /\/moldea\/skills/i);
    assert.match(getDirection('pnpm-pnp-local-cli-provider'), /repository-local moldea CLI/i);
    assert.doesNotMatch(getDirection('unavailable-runtime-selection'), /moldea/i);
    for (const caseId of [
      'initialize-insufficient-context',
      'initialize-partial-context',
      'initialize-sufficient-context',
    ]) {
      assert.equal(getDirection(caseId), 'Initialize moldea');
    }
    assert.match(getDirection('pnpm-hook-install-blocked'), /^Initialize moldea\./u);
    assert.match(getDirection('yarn-plugin-install-blocked'), /^Initialize moldea\./u);

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
      requirementCase.expected[0].criterion,
      /workspace changes re-evaluate the unresolved requirement/i,
    );
    assert.match(
      requirementCase.expected[0].criterion,
      /removing only the satisfied provider support condition/i,
    );
    assert.match(
      requirementCase.expected[0].criterion,
      /retaining the unsatisfied integration coverage condition/i,
    );
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

  test('keeps published maturity separate from local CLI composition', () => {
    const skill = readRepositoryFile('moldea/SKILL.md');
    const runtimeCompatibility = readRepositoryFile('moldea/references/runtime-compatibility.md');
    const semanticCasesById = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );

    const unavailableCase = semanticCasesById.get('runtime-publication-unavailable');
    const malformedCase = semanticCasesById.get('runtime-publication-malformed');
    const missingTargetCase = semanticCasesById.get('installed-adapter-without-published-target');
    const inactiveAdapterCase = semanticCasesById.get('published-supported-target-not-installed');
    const experimentalCase = semanticCasesById.get('experimental-target-not-production-ready');

    assert.ok(unavailableCase);
    assert.ok(malformedCase);
    assert.ok(missingTargetCase);
    assert.ok(inactiveAdapterCase);
    assert.ok(experimentalCase);
    assert.match(
      skill,
      /final report must state the unavailable fact and include the literal resolver URL `https:\/\/packages\.moldea\.ai\/compatibility\/runtimes\.json`/i,
    );
    assert.match(
      runtimeCompatibility,
      /include the literal resolver URL `https:\/\/packages\.moldea\.ai\/compatibility\/runtimes\.json`/i,
    );

    assert.ok(
      getSemanticCriterionLabels(unavailableCase.forbidden).includes('use-stale-or-local-fallback'),
    );
    assert.ok(
      getSemanticCriterionLabels(malformedCase.expected).includes('reject-malformed-publication'),
    );
    for (const publicationLimitedCase of [unavailableCase, malformedCase, missingTargetCase]) {
      const readinessCriterion = publicationLimitedCase.expected.find(({ label }) =>
        label.includes('positive-production-readiness'),
      );
      const resolverCriterion = publicationLimitedCase.expected.find(({ criterion }) =>
        criterion.includes('https://packages.moldea.ai/compatibility/runtimes.json'),
      );

      assert.ok(readinessCriterion);
      assert.ok(resolverCriterion);
      assert.match(readinessCriterion.criterion, /positive production-readiness conclusion/i);
      assert.match(
        readinessCriterion.criterion,
        /negative readiness conclusion remains valid when independent evidence establishes a blocker/i,
      );
    }
    assert.ok(
      getSemanticCriterionLabels(missingTargetCase.forbidden).includes(
        'equate-installation-with-published-support',
      ),
    );
    assert.ok(
      getSemanticCriterionLabels(inactiveAdapterCase.expected).includes(
        'distinguish-published-support-from-local-availability',
      ),
    );
    assert.ok(
      getSemanticCriterionLabels(experimentalCase.forbidden).includes(
        'promote-experimental-to-supported',
      ),
    );
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
    const runtimeVerificationCriterion = adoptionCase.expected.find(
      ({ label }) => label === 'verify-runtime-instruction-provenance',
    );
    const independentSourceCriterion = adoptionCase.forbidden.find(
      ({ label }) => label === 'retain-independently-editable-instruction-sources',
    );
    const capabilityCriterion = dedicatedRepositoryCase.expected.find(
      ({ label }) => label === 'represent-application-capabilities-semantically',
    );

    assert.ok(provenanceCriterion);
    assert.ok(runtimeVerificationCriterion);
    assert.ok(independentSourceCriterion);
    assert.ok(capabilityCriterion);

    assert.match(provenanceCriterion.criterion, /declared exact mirror/i);
    assert.match(provenanceCriterion.criterion, /model invocation/i);
    assert.match(runtimeVerificationCriterion.criterion, /runner-owned focused runtime-test/i);
    assert.match(runtimeVerificationCriterion.criterion, /workspace evidence/i);
    assert.match(independentSourceCriterion.criterion, /does not trigger/i);
    assert.match(capabilityCriterion.criterion, /instruction or runtime guidance/i);
    assert.match(capabilityCriterion.criterion, /without fabricating/i);
  });

  test(
    'binds available semantic evaluations to exact release inputs',
    {
      skip: !existsSync(join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-result.json')),
    },
    (testContext) => {
      const result = JSON.parse(readRepositoryFile('fixtures/semantic-evaluation-result.json'));
      const semanticCases = new Map(
        cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
      );

      const portableSkillDigest = createPortableSkillDigest();
      const currentCli = createSemanticCliIdentity(REPOSITORY_ROOT);
      const coverage = JSON.parse(readRepositoryFile('fixtures/semantic-evaluation-coverage.json'));
      const currentCaseSuiteDigest = createSemanticCaseSuiteDigest(cases.semanticCases);
      if (
        result.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION ||
        result.caseSuiteDigest !== currentCaseSuiteDigest ||
        !isDeepStrictEqual(result.cli, currentCli) ||
        result.skillDigest !== portableSkillDigest
      ) {
        testContext.skip('Exact current protocol 21 semantic evidence has not been recorded.');
        return;
      }
      assert.equal(result.schemaVersion, 6);
      assert.deepEqual(result.confirmationPolicy, {
        requiredPassingConfirmations: 2,
        version: 1,
      });
      assert.equal(result.evaluationProtocolVersion, SEMANTIC_EVALUATION_PROTOCOL_VERSION);
      assert.deepEqual(result.cli, currentCli);
      assert.equal(result.caseSuiteDigest, currentCaseSuiteDigest);
      assert.equal(
        result.coverageDigest,
        createSemanticCoverageDigest(coverage, cases.semanticCases),
      );
      assert.equal(result.artifact.sha256, result.skillDigest);
      assert.equal(result.artifactDigest, result.skillDigest);
      assert.equal(result.artifactSha256, result.skillDigest);
      assert.equal(result.skillDigest, portableSkillDigest);
      assert.equal(result.hostContract.model, 'gpt-5.6-sol');
      assert.equal(result.hostContract.name, 'codex');
      assert.equal(result.hostContract.reasoningEffort, 'medium');
      assert.equal(result.host, undefined);
      assert.equal(result.actorHost, undefined);
      assert.equal(result.judgeHost, undefined);
      assert.match(result.evaluatedAt, /^\d{4}-\d{2}-\d{2}T/);
      assert.deepEqual(
        result.cases.map((evaluationCase) => evaluationCase.id).sort(),
        [...semanticCases.keys()].sort(),
      );

      for (const evaluationCase of result.cases) {
        const conformanceCase = semanticCases.get(evaluationCase.id);
        assert.equal(evaluationCase.passed, true);
        assert.equal(evaluationCase.actorHost.model, result.hostContract.model);
        assert.equal(evaluationCase.actorHost.reasoningEffort, 'medium');
        assert.ok(evaluationCase.actorHost.version.length > 0);
        assert.equal(evaluationCase.judgeHost.model, result.hostContract.model);
        assert.equal(evaluationCase.judgeHost.reasoningEffort, 'medium');
        assert.ok(evaluationCase.judgeHost.version.length > 0);
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
      const maintainedReleaseSkill = skillMaintenanceResult.skillArtifactEvidence[0].files.find(
        ({ path }) => path === 'skills/release-review/SKILL.md',
      ).content;
      const packageManagerReference = skillMaintenanceResult.skillArtifactEvidence[0].files.find(
        ({ path }) => path === 'skills/release-review/references/package-managers.md',
      ).content;
      assert.match(maintainedReleaseSkill, /npm and pnpm/i);
      assert.match(packageManagerReference, /release-policy\.md/i);
      assert.match(packageManagerReference, /verify-release\.mjs/i);
      assert.match(packageManagerReference, /each manager named by the policy/i);

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
      const inspection = spawnSync(process.execPath, [SEMANTIC_CLI_PATH, 'inspect', '--json'], {
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

      const composition = spawnSync(
        process.execPath,
        [SEMANTIC_CLI_PATH, 'composition', '--json'],
        {
          cwd: repositoryPath,
          encoding: 'utf8',
        },
      );
      const compositionEnvelope = JSON.parse(composition.stdout);
      assert.equal(composition.status, 0);
      assert.equal(compositionEnvelope.cliVersion, RELEASE_CLI_VERSION);
      assert.equal(compositionEnvelope.schemaVersion, RELEASE_CLI_JSON_SCHEMA_VERSION);
      assert.equal(compositionEnvelope.status, 'valid');
      assert.deepEqual(
        compositionEnvelope.result.packages,
        Object.entries(SEMANTIC_CLI_MANIFEST.dependencies)
          .filter(([name]) => name.startsWith('@moldea.ai/'))
          .map(([name, version]) => ({ name, version }))
          .sort(({ name: left }, { name: right }) => left.localeCompare(right)),
      );
      assert.deepEqual(
        compositionEnvelope.result.adapters.map(({ id }) => id),
        [
          'custom',
          ...Object.keys(SEMANTIC_CLI_MANIFEST.dependencies)
            .filter((name) => name.startsWith('@moldea.ai/adapter-'))
            .map((name) => name.slice('@moldea.ai/adapter-'.length)),
        ].sort((left, right) => left.localeCompare(right)),
      );
      const customComposition = compositionEnvelope.result.adapters.find(
        ({ id }) => id === 'custom',
      );
      assert.deepEqual(customComposition.repositoryFormatVersions, [1]);
      const googleGenAiComposition = compositionEnvelope.result.adapters.find(
        ({ id }) => id === 'google-genai',
      );
      assert.deepEqual(googleGenAiComposition.repositoryFormatVersions, [1]);
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
    const gitAttributes = readRepositoryFile('.gitattributes');
    const workflow = readRepositoryFile('.github/workflows/conformance.yml');
    const document = parseDocument(workflow, { uniqueKeys: true });
    const conformance = document.toJS();
    const windowsJob = conformance.jobs['windows-portability'];
    const windowsCheckout = windowsJob.steps.find((step) =>
      step.uses?.startsWith('actions/checkout@'),
    );
    const windowsVerification = windowsJob.steps.find(
      (step) => step.name === 'Clone under a realistic deep temporary path',
    )?.run;

    assert.equal(document.errors.length, 0);
    assert.equal(gitAttributes, '* text=auto eol=lf\n');
    assert.match(workflow, /skills@1\.5\.22 add .* -g -a codex -y --copy/);
    assert.match(workflow, /\.agents\/skills\/moldea/);
    assert.match(workflow, /diff --recursive --brief moldea/);
    assert.doesNotMatch(workflow, /add .* --list/);
    assert.equal(windowsJob['runs-on'], 'windows-2025');
    assert.equal(windowsCheckout?.with, undefined);
    assert.match(windowsVerification, /git clone --no-hardlinks --no-checkout/);
    assert.match(windowsVerification, /git -C \$clonePath checkout --detach \$env:GITHUB_SHA/);
    assert.match(windowsVerification, /npm run path:check/);
    assert.match(
      windowsVerification,
      /node --experimental-strip-types --test --test-skip-pattern='\^\(\?:sandbox \|proxy shutdown \)' tooling\/\*\/\*\.test-unit\.mjs tests\/\*\.test-unit\.mjs/,
    );
    assert.match(windowsVerification, /git diff --no-index --exit-code/);
    assert.doesNotMatch(windowsVerification, /core\.longpaths|LongPathsEnabled/i);
  });

  test('runs root source checks across every supported Node.js line', () => {
    for (const scriptName of [
      'eval:semantic',
      'eval:semantic:preflight',
      'eval:semantic:verify',
      'release:check',
      'release:identity:check',
      'test:unit',
      'test:integration',
    ]) {
      assert.match(ROOT_PACKAGE_MANIFEST.scripts[scriptName], /node --experimental-strip-types\b/u);
    }
  });

  test('website CI installs complete source inputs and retains contract history', () => {
    for (const [workflowPath, jobName] of [
      ['.github/workflows/website.yml', 'verify'],
      ['.github/workflows/pages.yml', 'build'],
    ]) {
      const document = parseDocument(readRepositoryFile(workflowPath), {
        uniqueKeys: true,
      });
      const workflow = document.toJS();
      const checkoutStep = workflow.jobs[jobName].steps.find(
        (step) => step.uses === 'actions/checkout@v6',
      );
      const rootInstallStep = workflow.jobs[jobName].steps.find(
        (step) => step.run === 'npm ci --ignore-scripts',
      );
      const setupNodeStep = workflow.jobs[jobName].steps.find(
        (step) => step.uses === 'actions/setup-node@v6',
      );
      const triggerPaths = workflow.on.pull_request?.paths ?? workflow.on.push?.paths;

      assert.equal(
        document.errors.length,
        0,
        document.errors.map((error) => error.message).join('\n'),
      );
      assert.equal(checkoutStep?.with?.['fetch-depth'], 0);
      assert.equal(rootInstallStep?.name, 'Install root verification dependencies');
      assert.equal(
        setupNodeStep?.with?.['cache-dependency-path'],
        'package-lock.json\nwebsite/package-lock.json\n',
      );
      assert.ok(triggerPaths.includes('fixtures/release-evidence/**'));
      assert.ok(triggerPaths.includes('tooling/evidence-identity/**'));
    }
  });

  test('fetches complete Git history only for website evidence consumers', () => {
    const conformance = parseDocument(readRepositoryFile('.github/workflows/conformance.yml'), {
      uniqueKeys: true,
    }).toJS();
    const releaseCandidate = parseDocument(
      readRepositoryFile('.github/workflows/release-candidate.yml'),
      { uniqueKeys: true },
    ).toJS();
    const conformanceCheckouts = Object.values(conformance.jobs).flatMap(({ steps }) =>
      steps.filter((step) => step.uses?.startsWith('actions/checkout@')),
    );
    const releaseCheckouts = Object.values(releaseCandidate.jobs).flatMap(({ steps }) =>
      steps.filter((step) => step.uses?.startsWith('actions/checkout@')),
    );

    assert.ok(conformanceCheckouts.length > 0);
    assert.ok(releaseCheckouts.length > 0);
    assert.ok(conformanceCheckouts.every((step) => step.with?.['fetch-depth'] === undefined));
    assert.ok(releaseCheckouts.every((step) => step.with?.['fetch-depth'] === 1));
  });

  test('CI derives one exact release CLI across every package manager', () => {
    const workflow = readRepositoryFile('.github/workflows/conformance.yml');
    const packageManifest = JSON.parse(readRepositoryFile('package.json'));

    assert.equal(packageManifest.devDependencies['@moldea.ai/cli'], RELEASE_CLI_VERSION);
    assert.doesNotMatch(workflow, /cli_version:|MOLDEA_TEST_CLI_VERSION/);
    assert.match(workflow, /\/ release CLI/);
    assert.equal(workflow.match(/npm ci --ignore-scripts/g)?.length, 3);
    assert.equal(
      workflow.match(
        /sudo apt-get install --yes apparmor-profiles apparmor-utils bubblewrap socat/g,
      )?.length,
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

  test('requires approval before request-intensive semantic evaluation', () => {
    const readme = readRepositoryFile('README.md');

    assertMatchesEvery(readme, [
      /Semantic evaluation is intentionally lengthy/,
      /57 cases/,
      /114 model requests/,
      /bounded confirmation sequence/,
      /up to four requests/,
      /theoretical full-run maximum is 342 requests/,
      /Operational retries are additional/,
      /local CLI composition/,
      /public technical and maturity publication/,
      /significant number of model tokens/,
      /full evaluation or standalone diagnostic/,
      /why fresh semantic evidence is important/,
      /why existing evidence or deterministic verification is insufficient/,
      /estimated model-request count and expected duration/,
      /developer's explicit approval/,
      /includes its automatic bounded confirmations, compatible checkpoint resume, and operational retries/,
      /never authorizes a restart, source correction, changed evidence boundary, or additional evaluation/,
    ]);
  });

  test('pins semantic evaluation to the frontier assurance model with fixed reasoning effort', () => {
    const readme = readRepositoryFile('README.md');

    assertMatchesEvery(readme, [
      /frontier assurance model/,
      /gpt-5\.6-sol/,
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
      /checkpoint schema `6`/,
      /Each trial separately records the exact actor and judge Codex CLI versions/,
      /confirmation policy `1`/,
      /skips completed successful or recovered cases/,
      /failed initial trial is never replaced/,
      /--record --restart/,
      /both must pass/i,
      /Either confirmation failure is terminal/,
      /automatically runs its bounded confirmation sequence/,
      /operational retries require no additional authorization/i,
      /retries the same stage indefinitely with capped exponential backoff and jitter/i,
      /completed actor response is persisted before the judge starts/i,
      /do not change the skill until the evidence establishes that the evaluator is not the cause/i,
      /list every evaluation test the correction can affect/i,
      /run each listed evaluation test three consecutive times/i,
      /repeat the same diagnosis, similar-case audit, impacted-test listing, correction, and three-pass verification recursively/i,
      /do not count toward the three completed runs/i,
      /original failure remains intact/,
      /--record-checkpoint/,
      /eval:semantic:verify/,
      /only after every case passes initially or, for a failed initial trial, both confirmations pass/,
      /stale pass remains in immutable history but cannot replace current release evidence/,
      /hashes and bounded text content for repository-visible changes/,
      /pre-actor sourced evidence/,
      /bounded workspace changes/,
      /independent structural and resource-link evidence/,
      /do not rely on opaque labels, the actor's report alone, or leaked answer criteria/,
      /Codex JSONL events/,
      /bounded completed-command facts/,
      /package-manager policy evidence/,
      /An observed package-manager invocation fails a package-manager non-execution criterion/,
      /Indeterminate commands remain visible warnings and neither prove execution nor establish complete absence/,
      /final response cannot create or replace that evidence/,
      /Every semantic actor receives an evaluator-owned Git boundary and npm probe ahead of immutable system executables on a `PATH` that excludes workspace binary directories/,
      /actor cannot replace those probes/,
      /release CLI's finite read-only Git discovery and inventory commands/,
      /refuses every other bare `git` shape before Git starts/,
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
