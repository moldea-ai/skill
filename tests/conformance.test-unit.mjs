import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { parseDocument } from 'yaml';

import { createPortableSkillDigest } from './semantic-evaluation-runner.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_DIRECTORY = join(REPOSITORY_ROOT, 'moldea');
const SKILL_PATH = join(SKILL_DIRECTORY, 'SKILL.md');
const REFERENCE_FILES = [
  'agent-design.md',
  'context-gathering.md',
  'continuous-maintenance.md',
  'evaluate-and-reconcile.md',
  'local-tooling.md',
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
    'evaluate-missing-cli-read-only',
    'floating-cli-with-compatible-install',
    'matching-package-manager-and-lockfile',
    'metadata-lockfile-conflict',
    'missing-compatible-cli',
    'multiple-manager-lockfiles',
    'no-evidence-default-npm',
    'out-of-range-executable',
    'unsupported-established-manager',
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
    'canonical-instruction-changed',
    'dedicated-repository-single-side-change',
    'evaluate-clean-working-tree',
    'evaluate-dirty-working-tree',
    'evaluate-unborn-repository',
    'pnpm-pnp-local-cli-provider',
    'provider-hosted-capability',
    'reconcile-material-ambiguity',
    'unadopted-relevance-no-initialization',
    'unresolved-related-file-changed',
    'yarn-conflicting-cli-provider',
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
  if ('compatibility' in frontmatter) {
    assert.equal(typeof frontmatter.compatibility, 'string');
    assert.ok(
      frontmatter.compatibility.trim().length >= 1 && frontmatter.compatibility.length <= 500,
    );
  }
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

const isCompatibleCliVersion = (version) => /^1\.0\.\d+$/.test(version ?? '');

const evaluatePackageManagerCase = ({ operation, input }) => {
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
  const cli = input.cli;
  const hasCompatibleInstall = isCompatibleCliVersion(cli.installedVersion);
  const isExactDeclaration = isCompatibleCliVersion(cli.declaration);

  if (operation === 'evaluate' && (!hasCompatibleInstall || !isExactDeclaration)) {
    decisions.push('report-read-only-remediation');
  } else if (isExactDeclaration && cli.declaration === cli.installedVersion && cli.executableResolves) {
    decisions.push('preserve-existing-exact-cli');
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
    assert.equal(frontmatter.metadata.version, '1.0.0');
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
      /@moldea\.ai\/cli: >=1\.0\.0 <1\.1\.0/,
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
      /report completion for each side accurately/,
      /Do not use requirements as a roadmap or backlog/,
      /related file changed/,
      /synchronize every mirror/,
      /Never edit a mirror independently/,
      /Never invent a manifest `handoffs` graph/,
    ]);
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

  test('binds passing host-executed semantic evaluations to the portable artifact', () => {
    const result = JSON.parse(
      readRepositoryFile('fixtures/semantic-evaluation-result.json'),
    );
    const semanticCases = new Map(
      cases.semanticCases.map((conformanceCase) => [conformanceCase.id, conformanceCase]),
    );

    assert.equal(result.schemaVersion, 1);
    assert.equal(result.skillDigest, createPortableSkillDigest());
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

  test('documents an immutable release installation and repository-local CLI model', () => {
    const readme = readRepositoryFile('README.md');

    assert.match(
      readme,
      /npx skills@1\.5\.22 add https:\/\/github\.com\/moldea-ai\/skill\/tree\/v1\.0\.0\/moldea -g/,
    );
    assert.doesNotMatch(readme, /tree\/(?:main|master|1\.0\.0)\/moldea/);
    assert.match(readme, /does not install `@moldea\.ai\/cli` globally/);
    assert.match(readme, /repository-local exact `@moldea\.ai\/cli` development dependency/);
  });

  test('CI installs and compares the complete portable artifact', () => {
    const workflow = readRepositoryFile('.github/workflows/conformance.yml');

    assert.match(workflow, /skills@1\.5\.22 add .* -g -a codex -y --copy/);
    assert.match(workflow, /\.agents\/skills\/moldea/);
    assert.match(workflow, /diff --recursive --brief moldea/);
    assert.doesNotMatch(workflow, /add .* --list/);
  });

  test('keeps optional OpenAI metadata supplemental and behaviorally complete', () => {
    const openaiMetadata = readRepositoryFile('moldea/agents/openai.yaml');

    assertMatchesEvery(openaiMetadata, [
      /display_name: "moldea"/,
      /initialize, maintain, evaluate, reconcile, or validate/,
    ]);
    assert.doesNotMatch(openaiMetadata, /initialize this repository context and agent instructions/);
  });

  test('keeps source and portable release versions synchronized', () => {
    const packageManifest = JSON.parse(readRepositoryFile('package.json'));
    const frontmatter = parseFrontmatter(readRepositoryFile('moldea/SKILL.md'));

    assert.equal(packageManifest.version, frontmatter.metadata.version);
    if (process.env.MOLDEA_RELEASE_TAG) {
      assert.equal(process.env.MOLDEA_RELEASE_TAG, `v${frontmatter.metadata.version}`);
    }
  });
});
