import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { parseDocument } from 'yaml';

import {
  createPortableSkillDigest,
  createPortableSkillSemanticDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
} from './semantic-evaluation-runner.mjs';

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
];
const ALLOWED_FRONTMATTER_KEYS = new Set([
  'allowed-tools',
  'description',
  'license',
  'metadata',
  'name',
]);
const REQUIRED_EVALUATION_CASE_IDS = {
  packageManagerCases: [
    'compatible-cli-missing-required-capability',
    'declared-executable-version-conflict',
    'evaluate-compatible-cli-missing-required-capability',
    'evaluate-missing-cli-read-only',
    'existing-cli-with-executable-manager-config',
    'floating-cli-with-compatible-install',
    'matching-package-manager-and-lockfile',
    'metadata-lockfile-conflict',
    'missing-compatible-cli',
    'multiple-manager-lockfiles',
    'no-evidence-default-npm',
    'out-of-range-executable',
    'plan-missing-cli-without-tooling-change',
    'pnpm-executable-hook-config',
    'unsupported-established-manager',
    'validate-missing-cli-read-only',
    'yarn-third-party-plugin-config',
  ],
  cliEnvelopeCases: [
    'command-mismatch',
    'compatibility-invalid',
    'compatibility-valid',
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
    'canonical-instruction-changed',
    'dedicated-repository-runtime-selection',
    'dedicated-repository-single-side-change',
    'evaluate-clean-working-tree',
    'evaluate-dirty-working-tree',
    'evaluate-unborn-repository',
    'host-plan-command-precedence',
    'plan-existing-project-one-agent',
    'plan-justified-multi-agent',
    'plan-material-ambiguity',
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
    'runtime-adapter-lifecycle',
    'unadopted-relevance-no-initialization',
    'unresolved-related-file-changed',
    'yarn-conflicting-cli-provider',
    'yarn-plugin-install-blocked',
  ],
};

const readRepositoryFile = (path) => readFileSync(join(REPOSITORY_ROOT, path), 'utf8');
const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'SKILL.md must begin with YAML frontmatter.');
  const document = parseDocument(match[1], { uniqueKeys: true });
  assert.equal(
    document.errors.length,
    0,
    document.errors.map((error) => error.message).join('\n'),
  );
  const frontmatter = document.toJS();
  assert.ok(isPlainRecord(frontmatter));

  for (const key of Object.keys(frontmatter)) {
    assert.ok(ALLOWED_FRONTMATTER_KEYS.has(key), `Unsupported frontmatter key: ${key}`);
  }

  assert.match(frontmatter.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(frontmatter.name.length <= 64);
  assert.equal(typeof frontmatter.description, 'string');
  assert.ok(
    frontmatter.description.trim().length >= 1 && frontmatter.description.length <= 1024,
  );
  assert.doesNotMatch(frontmatter.description, /[<>]/);
  assert.equal(typeof frontmatter.license, 'string');
  assert.ok(frontmatter.license.trim().length > 0);
  assert.ok(isPlainRecord(frontmatter.metadata));
  assert.ok(
    Object.entries(frontmatter.metadata).every(
      ([metadataKey, metadataValue]) =>
        metadataKey.length > 0 && typeof metadataValue === 'string',
    ),
  );
  if ('allowed-tools' in frontmatter) {
    assert.equal(typeof frontmatter['allowed-tools'], 'string');
    assert.ok(frontmatter['allowed-tools'].trim().length > 0);
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

const isCompatibleCliVersion = (version) => /^2\.0\.\d+$/.test(version ?? '');

const evaluatePackageManagerCase = ({ operation, input }) => {
  const cli = input.cli;
  const hasCompatibleInstall = isCompatibleCliVersion(cli.installedVersion);
  const isExactDeclaration = isCompatibleCliVersion(cli.declaration);
  const hasExactCompatibleCli =
    isExactDeclaration &&
    cli.declaration === cli.installedVersion &&
    cli.executableResolves;
  const hasRequiredCapability =
    !cli.requiredCapability || cli.installedCapabilities?.includes(cli.requiredCapability);

  if (operation === 'plan' && !hasExactCompatibleCli) {
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
  const requiresDependencyChange = !hasExactCompatibleCli || !hasRequiredCapability;

  if (
    !isReadOnlyOperation &&
    requiresDependencyChange &&
    input.repositoryExecutableConfig?.length > 0
  ) {
    return ['stop-for-executable-package-manager-config'];
  }

  if (isReadOnlyOperation && (!hasExactCompatibleCli || !hasRequiredCapability)) {
    decisions.push('report-read-only-remediation');
  } else if (hasExactCompatibleCli && hasRequiredCapability) {
    decisions.push('preserve-existing-exact-cli');
  } else if (
    hasExactCompatibleCli &&
    !hasRequiredCapability &&
    isCompatibleCliVersion(cli.capableVersion)
  ) {
    decisions.push('replace-with-capable-compatible-cli');
  } else if (hasCompatibleInstall && cli.executableResolves) {
    decisions.push('pin-compatible-installed-version');
  } else if (!hasCompatibleInstall) {
    decisions.push('resolve-highest-compatible-non-prerelease');
  } else {
    decisions.push('stop-for-cli-state-conflict');
  }

  return decisions;
};

const evaluateCliEnvelopeCase = ({ input }) => {
  if (typeof input.output !== 'object' || input.output === null) {
    return 'stop-without-heuristics';
  }

  const envelope = input.output;
  if (
    envelope.schemaVersion !== 1 ||
    !isCompatibleCliVersion(envelope.cliVersion) ||
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
  const starts = lines.flatMap((line, index) => line === '<!-- moldea:start -->' ? [index] : []);
  const ends = lines.flatMap((line, index) => line === '<!-- moldea:end -->' ? [index] : []);

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
    assert.equal(frontmatter.metadata.version, '2.0.0');
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
      parseFrontmatter('---\nname: moldea\ndescription: "   "\nlicense: MIT\nmetadata:\n  version: "1.0.0"\n---\n'),
    );
    assert.throws(() =>
      parseFrontmatter('---\nname: moldea\ndescription: valid\nlicense: MIT\ncompatibility: 1\nmetadata:\n  version: "1.0.0"\n---\n'),
    );
    assert.throws(() =>
      parseFrontmatter('---\nname: moldea\ndescription: valid\nlicense: MIT\nallowed-tools: []\nmetadata:\n  version: "1.0.0"\n---\n'),
    );
  });

  test('declares the exact release compatibility contract', () => {
    assertMatchesEvery(skill, [
      /@moldea\.ai\/cli: >=2\.0\.0 <2\.1\.0/,
      /CLI JSON schema: `1`/,
      /Node\.js: `\^22\.11\.0 \|\| \^24\.11\.0`/,
      /npm: `>=10\.9\.0 <12\.0\.0`/,
      /pnpm: `>=11\.20\.0 <12\.0\.0`/,
      /yarn: `>=4\.0\.0 <5\.0\.0`/,
      /one exact repository-root/,
    ]);
  });

  test('uses explicit progressive-disclosure triggers and resolvable references', () => {
    const referencedPaths = [
      ...skill.matchAll(/Read `references\/([^`]+\.md)` before/g),
    ].map((match) => match[1]);

    assert.deepEqual([...referencedPaths].sort(), REFERENCE_FILES);

    for (const fileName of REFERENCE_FILES) {
      assert.ok(existsSync(join(SKILL_DIRECTORY, 'references', fileName)));
    }
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
      /`schemaVersion` is integer `1`/,
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
      /application-only tools and skills/,
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
      /still-matching `deprecated` adapter/,
      /`runtimeGuidance` expectation/,
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
      }
    }
  });

  test('binds semantic evaluations to exact or release-equivalent portable content', () => {
    const result = JSON.parse(
      readRepositoryFile('fixtures/semantic-evaluation-result.json'),
    );
    const semanticCases = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );

    const portableSkillDigest = createPortableSkillDigest();
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.evaluationProtocolVersion, 3);
    assert.equal(
      result.caseSuiteDigest,
      createSemanticCaseSuiteDigest(cases.semanticCases),
    );
    assert.equal(result.artifact.sha256, result.skillDigest);
    assert.equal(result.artifactDigest, result.skillDigest);
    assert.equal(result.artifactSha256, result.skillDigest);
    if (result.skillDigest === portableSkillDigest) {
      assert.equal(result.releaseEvidenceCarryForward, undefined);
    } else {
      assert.equal(
        result.releaseEvidenceCarryForward.fromArtifactDigest,
        result.skillDigest,
      );
      assert.equal(
        result.releaseEvidenceCarryForward.toArtifactDigest,
        portableSkillDigest,
      );
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
      assert.match(
        result.releaseEvidenceCarryForward.carriedForwardAt,
        /^\d{4}-\d{2}-\d{2}T/,
      );
      assert.equal(
        result.releaseEvidenceCarryForward.reason,
        'Release-version declarations changed without changing semantic skill content.',
      );
    }
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
        [...conformanceCase.expected].sort(),
      );
      assert.deepEqual(evaluationCase.forbiddenTriggered, []);
      assert.ok(evaluationCase.rationale.length > 20);
    }
  });

  test('exercises package-manager selection, conflicts, and CLI pin decisions', () => {
    for (const conformanceCase of cases.packageManagerCases) {
      assert.deepEqual(evaluatePackageManagerCase(conformanceCase), conformanceCase.expected);
    }
  });

  test('keeps the synthetic semantic CLI envelope contract-faithful', () => {
    const repositoryPath = mkdtempSync(join(tmpdir(), 'moldea-semantic-cli-test-'));

    try {
      mkdirSync(join(repositoryPath, 'moldea', 'agents', 'refund-agent'), {
        recursive: true,
      });
      writeFileSync(
        join(repositoryPath, 'moldea', 'moldea.yaml'),
        'version: 1\n\nagents:\n  refund-agent:\n    runtime:\n      id: openai\n',
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
      writeFileSync(
        join(repositoryPath, 'runtime-compatibility-fixture.json'),
        `${JSON.stringify({
          adapters: [
            {
              id: 'openai',
              active: false,
              bundledVersion: null,
              matrix: {
                implementation: {
                  kind: 'package',
                  package: '@moldea.ai/adapter-openai',
                  distribution: 'public',
                },
                implementationStatus: 'planned',
              },
            },
          ],
        })}\n`,
      );

      const inspection = spawnSync(SEMANTIC_CLI_PATH, ['inspect', '--json'], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });
      const inspectionEnvelope = JSON.parse(inspection.stdout);
      assert.equal(inspection.status, 1);
      assert.equal(inspectionEnvelope.cliVersion, '2.0.0');
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
      assert.equal(compatibilityEnvelope.cliVersion, '2.0.0');
      assert.equal(compatibilityEnvelope.status, 'valid');
      assert.deepEqual(
        compatibilityEnvelope.result.packages,
        [
          { name: '@moldea.ai/core', version: '2.0.0' },
          { name: '@moldea.ai/repository', version: '1.0.1' },
          { name: '@moldea.ai/repository-fs', version: '1.0.1' },
        ],
      );
      assert.deepEqual(
        compatibilityEnvelope.result.adapters.map(({ id }) => id),
        [
          'anthropic',
          'claude-agent-sdk',
          'cloudflare-agents',
          'custom',
          'eve',
          'google-genai',
          'langchain',
          'langgraph',
          'openai',
          'openai-agents-sdk',
          'vercel-ai-sdk',
        ],
      );
      const customCompatibility = compatibilityEnvelope.result.adapters.find(
        ({ id }) => id === 'custom',
      );
      assert.equal(customCompatibility.active, true);
      assert.equal(customCompatibility.bundledVersion, '2.0.0');
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

    assert.match(readme, /The current release is `2\.0\.0`\./);
    assert.match(readme, /^npx skills add moldea-ai\/skill$/m);
    assert.match(readme, /^npx skills add "moldea-ai\/skill#v2\.0\.0"$/m);
    assert.match(readme, /^npx skills add moldea-ai\/skill -g$/m);
    assert.ok(projectInstallationIndex >= 0);
    assert.ok(globalInstallationIndex > projectInstallationIndex);
    assert.doesNotMatch(readme, /skills@1\.5\.22/);
    assert.doesNotMatch(readme, /https:\/\/github\.com\/moldea-ai\/skill\/tree\//);
    assert.match(readme, /do not install `@moldea\.ai\/cli` globally/);
    assert.match(readme, /repository-local exact `@moldea\.ai\/cli` development dependency/);
    assert.match(readme, /recommended repository-local CLI version for this release is `2\.0\.0`/);
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

  test('CI exercises every supported published CLI version across every package manager', () => {
    const workflow = readRepositoryFile('.github/workflows/conformance.yml');
    const packageManifest = JSON.parse(readRepositoryFile('package.json'));

    assert.equal(packageManifest.devDependencies['@moldea.ai/cli'], '2.0.0');
    assert.equal(workflow.match(/cli_version: "2\.0\.0"/g)?.length, 6);
    assert.doesNotMatch(workflow, /cli_version: "1\./);
    assert.match(workflow, /MOLDEA_TEST_CLI_VERSION: \$\{\{ matrix\.cli_version \}\}/);
    assert.equal(workflow.match(/npm ci --ignore-scripts/g)?.length, 2);
    assert.equal(
      workflow.match(
        /sudo apt-get install --yes apparmor-profiles apparmor-utils bubblewrap/g,
      )?.length,
      1,
    );
    assert.equal(
      workflow.match(/sudo apparmor_parser -r \/etc\/apparmor\.d\/bwrap-userns-restrict/g)
        ?.length,
      1,
    );
    assert.equal(
      workflow.match(/node --test tests\/package-manager\.test-integration\.mjs/g)?.length,
      1,
    );
    assert.equal(
      existsSync(join(REPOSITORY_ROOT, 'fixtures', 'tooling', 'fake-cli')),
      false,
    );
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
      /projects\/repository pack/,
      /projects\/repository-fs pack/,
      /projects\/core pack/,
      /projects\/adapter-openai pack/,
      /projects\/cli pack/,
      /MOLDEA_CLI_ARTIFACT_DIRECTORY:/,
      /MOLDEA_REQUIRE_REAL_CLI_ARTIFACTS: "1"/,
      /node --test tests\/package-manager\.test-integration\.mjs/,
    ]);
    assert.doesNotMatch(workflow, /npm publish|pnpm publish|git tag|git push/);
  });

  test('requires approval before token-intensive semantic evaluation', () => {
    const readme = readRepositoryFile('README.md');

    assertMatchesEvery(readme, [
      /Semantic evaluation is intentionally lengthy/,
      /significant number of model tokens/,
      /full or targeted semantic evaluation/,
      /why fresh semantic evidence is important/,
      /why existing evidence or deterministic verification is insufficient/,
      /expected time and token cost/,
      /developer's explicit approval/,
    ]);
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
    ]);
    assert.match(gitignore, /fixtures\/\.semantic-evaluation-candidate\.json\*/);
  });

  test('keeps optional OpenAI metadata supplemental and behaviorally complete', () => {
    const openaiMetadata = readRepositoryFile('moldea/agents/openai.yaml');

    assertMatchesEvery(openaiMetadata, [
      /display_name: "moldea"/,
      /plan, initialize, maintain, evaluate, reconcile, or validate/,
    ]);
    assert.doesNotMatch(openaiMetadata, /initialize this repository context and agent instructions/);
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
    assert.ok(
      localTooling.includes(`Release \`${frontmatter.metadata.version}\` supports:`),
    );
    if (process.env.MOLDEA_RELEASE_TAG) {
      assert.equal(process.env.MOLDEA_RELEASE_TAG, `v${frontmatter.metadata.version}`);
    }
  });
});
