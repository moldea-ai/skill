import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { parseDocument } from 'yaml';

import {
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  validateSemanticCaseDefinition,
  validateSemanticCoverage,
} from '../tooling/semantic-evaluation/index.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKILL_ROOT = join(REPOSITORY_ROOT, 'moldea');
const SKILL_PATH = join(SKILL_ROOT, 'SKILL.md');
const CLI_PATH = join(REPOSITORY_ROOT, 'node_modules', '.bin', 'moldea');
const RELEVANCE_GATE_PATH = join(SKILL_ROOT, 'scripts', 'relevance-gate.mjs');
const FIXTURE = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, 'fixtures', 'conformance-cases.json'), 'utf8'),
);
const COVERAGE = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-coverage.json'), 'utf8'),
);
const REFERENCE_NAMES = [
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

const readSkill = () => readFileSync(SKILL_PATH, 'utf8');

const parseFrontmatter = () => {
  const match = readSkill().match(/^---\n([\s\S]*?)\n---\n/u);
  assert.ok(match);
  const document = parseDocument(match[1], { uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  return document.toJS();
};

const resolveActivationCase = (input) => {
  if (input.informationalRequest === true) return 'informational';
  if (input.initializationRequest === true) return 'initialize';
  if (input.initialized !== true) return 'abstain';
  if (input.explicitMoldeaRequest === true) return 'direct';
  if (input.paths?.some((path) => path === '/moldea' || path.startsWith('/moldea/'))) {
    return 'direct';
  }
  if (input.readmeHunk === 'inside-markers') return 'direct';
  if (input.relationshipMatch === true) return 'relationship-gate';
  return 'abstain';
};

const runCli = (repository, arguments_, input) => {
  const result = spawnSync(CLI_PATH, arguments_, {
    cwd: repository,
    encoding: 'utf8',
    input,
    maxBuffer: 1_048_576,
  });
  if (result.error) throw result.error;
  return result;
};

const runRelevanceGate = (repository, arguments_ = [], input) => {
  const result = spawnSync(
    process.execPath,
    [RELEVANCE_GATE_PATH, '--repository', repository, ...arguments_],
    {
      cwd: repository,
      encoding: 'utf8',
      input,
      maxBuffer: 16,
    },
  );
  if (result.error) throw result.error;
  return result;
};

const installProjectToolingFixture = (root) => {
  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        private: true,
        devDependencies: { '@moldea.ai/cli': '^7.0.0' },
      },
      null,
      2,
    )}\n`,
  );
  symlinkSync(
    join(REPOSITORY_ROOT, 'node_modules'),
    join(root, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
};

const createProject = () => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-v5-conformance-'));
  mkdirSync(join(root, 'moldea'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'README.md'),
    '# Project\n\n<!-- moldea:start -->\nFor every repository task, select the repository-installed `moldea` skill so its two-byte relevance gate can test the host-known paths. If the gate does not match, continue without `moldea`.\nCanonical moldea project state lives under `/moldea/**`; start at `/moldea/project.md`.\n<!-- moldea:end -->\n',
  );
  writeFileSync(
    join(root, 'moldea', 'moldea.yaml'),
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  writeFileSync(join(root, 'moldea', 'project.md'), '# Project\n\nCurrent project truth.\n');
  writeFileSync(join(root, 'src', 'project-state.js'), 'export const state = true;\n');
  const init = spawnSync('git', ['init', '--quiet'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(init.status, 0);
  return root;
};

describe('portable skill contract', () => {
  test('uses lowercase identity, repository-bound initialization, and a narrow description', () => {
    const frontmatter = parseFrontmatter();
    assert.deepEqual(frontmatter.metadata, {
      version: '5.0.0',
      cliVersionRange: '^7.0.0',
      cliJsonSchemaVersion: 4,
    });
    assert.equal(frontmatter.name, 'moldea');
    assert.match(frontmatter.description, /initialize moldea only when explicitly requested/u);
    assert.match(frontmatter.description, /only after adoption and relevance are established/u);
    assert.match(frontmatter.description, /declared binding or affectedBy relationship/u);
    assert.match(frontmatter.description, /Do not use for other uninitialized work/u);
    assert.match(frontmatter.description, /when this skill is installed in the repository/u);
    assert.match(frontmatter.description, /Use for every repository-dependent task/u);
    assert.match(frontmatter.description, /including reviews, plans, and implementation/u);
    assert.match(frontmatter.description, /two-byte relevance gate/u);
    assert.match(frontmatter.description, /A gate miss abstains silently/u);
    assert.doesNotMatch(frontmatter.description, /potentially durable knowledge|Use first/iu);
  });

  test('keeps progressive disclosure bounded to one owning reference', () => {
    const skill = readSkill();
    for (const referenceName of REFERENCE_NAMES) {
      assert.match(skill, new RegExp(`references/${referenceName.replace('.', '\\.')}`, 'u'));
      assert.doesNotThrow(() =>
        readFileSync(join(SKILL_ROOT, 'references', referenceName), 'utf8'),
      );
    }
    assert.match(skill, /Never read every reference by default/u);
    assert.match(skill, /read only what the selected operation needs/u);
    assert.match(skill, /full deterministic gate is the mandatory first moldea action/u);
    assert.match(skill, /Never replace the gate by inspecting canonical state directly/u);
    assert.match(
      skill,
      /Generic requests to verify an agent contract, canonical alignment, durable context, or similar concerns for an ordinary source or documentation path remain relationship-gated/u,
    );
    assert.match(skill, /Do not follow it with `inspect`/u);
    assert.match(skill, /scope call counts toward the ordinary four-command limit/u);
    assert.match(skill, /leaving at most three CLI calls/u);
    assert.match(skill, /For initialization, load only `references\/continuous-maintenance\.md`/u);
    assert.match(
      skill,
      /do not inspect dependency trees, CLI package internals, executable links/u,
    );
    assert.match(
      skill,
      /Load `references\/local-tooling\.md` only when the direct repository-local invocation is unavailable/u,
    );
    assert.match(skill, /Write the complete three-file foundation before the first CLI call/u);
    assert.match(skill, /invoke exactly one repository-local `validate`/u);
    assert.match(skill, /run `validate` at most once more/u);
    const maintenance = readFileSync(
      join(SKILL_ROOT, 'references', 'continuous-maintenance.md'),
      'utf8',
    );
    assert.match(maintenance, /Do not validate a partial foundation/u);
    assert.match(maintenance, /The file ends with one LF/u);
    assert.match(maintenance, /Do not add a project name, schema field, metadata/u);
    assert.match(maintenance, /stop without `inspect` or another moldea command/u);
    assert.match(
      maintenance,
      /For every repository task, select the repository-installed `moldea` skill/u,
    );
    assert.match(maintenance, /If the gate does not match, continue without `moldea`/u);
    assert.match(maintenance, /start at `\/moldea\/project\.md`/u);
  });

  test('defines silent abstention, host ownership, and bounded schema-4 evidence', () => {
    const distributedText = [
      readSkill(),
      ...REFERENCE_NAMES.map((name) => readFileSync(join(SKILL_ROOT, 'references', name), 'utf8')),
    ].join('\n');
    assert.match(distributedText, /abstains silently/u);
    assert.match(
      distributedText,
      /Host planning, review, implementation, package-manager, Git, commit, and publication workflows always retain ownership/u,
    );
    assert.match(distributedText, /65,536-byte output page/u);
    assert.match(distributedText, /262,144 bytes/u);
    assert.match(distributedText, /1 MiB/u);
    assert.match(distributedText, /content-free/u);
    assert.doesNotMatch(distributedText, /Moldea/u);
    assert.doesNotMatch(distributedText, /4\.0\.[0-2]|CLI JSON schema (?:1|2|3)\b|schema-3\b/u);
  });

  test('exposes concise lowercase host metadata', () => {
    const metadata = readFileSync(join(SKILL_ROOT, 'agents', 'openai.yaml'), 'utf8');
    assert.match(metadata, /display_name: ['"]moldea['"]/u);
    assert.match(metadata, /allow_implicit_invocation: true/u);
    assert.doesNotMatch(metadata, /durable knowledge|Use first/iu);
  });
});

describe('activation and semantic protection', () => {
  test('covers and resolves the complete initialization and relevance state machine', () => {
    assert.equal(FIXTURE.activationCases.length, 15);
    for (const { expected, input } of FIXTURE.activationCases) {
      assert.equal(resolveActivationCase(input), expected);
    }
    const outcomes = FIXTURE.activationCases.map(({ expected }) => expected);
    assert.equal(outcomes.filter((value) => value === 'informational').length, 1);
    assert.equal(outcomes.filter((value) => value === 'initialize').length, 1);
    assert.equal(outcomes.filter((value) => value === 'direct').length, 3);
    assert.equal(outcomes.filter((value) => value === 'relationship-gate').length, 2);
    assert.equal(outcomes.filter((value) => value === 'abstain').length, 8);
  });

  test('validates the complete 18-case resource-bounded semantic suite', () => {
    assert.equal(FIXTURE.semanticCases.length, 18);
    for (const caseDefinition of FIXTURE.semanticCases) {
      assert.equal(validateSemanticCaseDefinition(caseDefinition), caseDefinition);
    }
    assert.match(createSemanticCaseSuiteDigest(FIXTURE.semanticCases), /^[a-f0-9]{64}$/u);
    assert.equal(validateSemanticCoverage(COVERAGE, FIXTURE.semanticCases), COVERAGE);
    assert.match(createSemanticCoverageDigest(COVERAGE, FIXTURE.semanticCases), /^[a-f0-9]{64}$/u);
  });

  test('gives every abstention case a literal zero moldea budget', () => {
    const abstentions = FIXTURE.semanticCases.filter(
      ({ resourceBudget }) => resourceBudget.activation === 'abstain',
    );
    assert.equal(abstentions.length, 8);
    for (const { resourceBudget } of abstentions) {
      assert.deepEqual(resourceBudget, {
        activation: 'abstain',
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 0,
        maximumMoldeaOutputBytes: 0,
      });
    }
  });

  test('gives the informational case a literal zero moldea budget', () => {
    const informational = FIXTURE.semanticCases.find(
      ({ resourceBudget }) => resourceBudget.activation === 'informational',
    );
    assert.deepEqual(informational?.resourceBudget, {
      activation: 'informational',
      minimumMoldeaCommands: 0,
      maximumMoldeaCommands: 0,
      maximumMoldeaOutputBytes: 0,
    });
  });

  test('keeps the deterministic adoption gate fail-closed and two bytes', () => {
    const initialized = createProject();
    const uninitialized = mkdtempSync(join(tmpdir(), 'moldea-v5-uninitialized-'));
    try {
      writeFileSync(join(uninitialized, 'README.md'), '# Project\n');
      for (const [repository, expected] of [
        [initialized, '1\n'],
        [uninitialized, '0\n'],
      ]) {
        const result = runRelevanceGate(repository, ['--adoption-only']);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, expected);
        assert.equal(Buffer.byteLength(result.stdout), 2);
      }

      writeFileSync(
        join(initialized, 'README.md'),
        '# Project\n\n<!-- moldea:end -->\n<!-- moldea:start -->\n',
      );
      assert.equal(runRelevanceGate(initialized, ['--adoption-only']).stdout, '0\n');
    } finally {
      rmSync(initialized, { force: true, recursive: true });
      rmSync(uninitialized, { force: true, recursive: true });
    }
  });

  test('matches exact and glob relationships without invoking the CLI', () => {
    const root = createProject();
    try {
      installProjectToolingFixture(root);
      for (const [input, expected] of [
        ['/src/project-state.js\0', '1\n'],
        ['src/project-state.js\0', '1\n'],
        ['/src/unrelated.js\0', '0\n'],
        ['./src/project-state.js\0', '0\n'],
        ['C:src/project-state.js\0', '0\n'],
        ['/src/project-state.js', '0\n'],
        [Buffer.from([0xff, 0]), '0\n'],
      ]) {
        const result = runRelevanceGate(root, [], input);
        assert.equal(result.status, 0);
        assert.equal(result.stderr, '');
        assert.equal(result.stdout, expected);
        assert.equal(Buffer.byteLength(result.stdout), 2);
      }

      writeFileSync(
        join(root, 'moldea', 'moldea.yaml'),
        'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/**\n',
      );
      assert.equal(runRelevanceGate(root, [], '/src/nested/module.js\0').stdout, '1\n');

      const packageManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
      packageManifest.devDependencies['@moldea.ai/cli'] = '^6.0.0';
      writeFileSync(join(root, 'package.json'), `${JSON.stringify(packageManifest, null, 2)}\n`);
      assert.equal(runRelevanceGate(root, [], '/src/nested/module.js\0').stdout, '0\n');
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

describe('CLI 7 bounded machine protocol', () => {
  test('keeps release identity exact across the root manifests', () => {
    const packageManifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(
      readFileSync(join(REPOSITORY_ROOT, 'package-lock.json'), 'utf8'),
    );
    const declaredCliVersion = packageManifest.devDependencies['@moldea.ai/cli'];
    assert.equal(packageManifest.version, '5.0.0');
    assert.match(declaredCliVersion, /^\d+\.\d+\.\d+$/u);
    assert.equal(packageManifest.moldeaRelease.cliJsonSchemaVersion, 4);
    assert.equal(packageLock.packages['node_modules/@moldea.ai/cli'].version, declaredCliVersion);
  });

  test('returns content-free inspect metadata and bounded explicit content', () => {
    const root = createProject();
    try {
      const inspect = runCli(root, ['inspect', '--json', '--max-output-bytes', '65536']);
      assert.equal(inspect.status, 0);
      assert.ok(Buffer.byteLength(inspect.stdout) <= 65_536);
      const inspectEnvelope = JSON.parse(inspect.stdout);
      const packageManifest = JSON.parse(
        readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
      );
      assert.equal(inspectEnvelope.schemaVersion, 4);
      assert.equal(inspectEnvelope.cliVersion, packageManifest.devDependencies['@moldea.ai/cli']);
      assert.equal(inspectEnvelope.command, 'inspect');
      assert.equal(inspect.stdout.includes('Current project truth.'), false);

      const content = runCli(root, [
        'content',
        '--path',
        '/moldea/project.md',
        '--json',
        '--max-output-bytes',
        '65536',
      ]);
      assert.equal(content.status, 0);
      assert.ok(Buffer.byteLength(content.stdout) <= 65_536);
      assert.match(JSON.parse(content.stdout).result.chunk.content, /Current project truth/u);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('gates exact relationships through one bounded scope result', () => {
    const root = createProject();
    try {
      const related = runCli(
        root,
        ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
        '/src/project-state.js\0',
      );
      const unrelated = runCli(
        root,
        ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
        '/src/unrelated.js\0',
      );
      assert.equal(JSON.parse(related.stdout).result.relevant, true);
      assert.equal(JSON.parse(unrelated.stdout).result.relevant, false);
      assert.ok(Buffer.byteLength(related.stdout) <= 65_536);
      assert.ok(Buffer.byteLength(unrelated.stdout) <= 65_536);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('continues large Unicode content through bounded schema-4 chunks', () => {
    const root = createProject();
    try {
      const largeContent = `# Large context\n\n${'bounded🙂content\n'.repeat(2048)}`;
      writeFileSync(join(root, 'moldea', 'project.md'), largeContent);
      const chunks = [];
      let cursor;
      let commandCount = 0;
      let outputByteCount = 0;

      do {
        const arguments_ = [
          'content',
          '--path',
          '/moldea/project.md',
          '--json',
          '--max-output-bytes',
          '4096',
        ];
        if (cursor !== undefined) arguments_.push('--cursor', cursor);
        const content = runCli(root, arguments_);
        assert.equal(content.status, 0);
        const pageByteCount = Buffer.byteLength(content.stdout);
        assert.ok(pageByteCount <= 4_096);
        outputByteCount += pageByteCount;
        const envelope = JSON.parse(content.stdout);
        assert.equal(envelope.schemaVersion, 4);
        assert.equal(envelope.status, 'valid');
        chunks.push(envelope.result.chunk.content);
        cursor = envelope.result.cursor ?? undefined;
        commandCount += 1;
      } while (cursor !== undefined);

      assert.equal(chunks.join(''), largeContent);
      assert.ok(commandCount > 1);
      assert.ok(commandCount <= 32);
      assert.ok(outputByteCount <= 262_144);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('keeps validate, inspect, scope, and content read-only at the Git boundary', () => {
    const root = createProject();
    try {
      const beforeStatus = spawnSync('git', ['status', '--porcelain=v2', '-z'], {
        cwd: root,
        encoding: 'utf8',
      }).stdout;
      const beforeObjects = readdirSync(join(root, '.git', 'objects'), {
        recursive: true,
      }).sort();

      for (const [arguments_, input] of [
        [['validate', '--json', '--max-output-bytes', '65536']],
        [['inspect', '--json', '--max-output-bytes', '65536']],
        [
          ['scope', '--paths-stdin', '--json', '--max-output-bytes', '65536'],
          '/src/project-state.js\0',
        ],
        [['content', '--path', '/moldea/project.md', '--json', '--max-output-bytes', '65536']],
      ]) {
        assert.equal(runCli(root, arguments_, input).status, 0);
      }

      const afterStatus = spawnSync('git', ['status', '--porcelain=v2', '-z'], {
        cwd: root,
        encoding: 'utf8',
      }).stdout;
      const afterObjects = readdirSync(join(root, '.git', 'objects'), {
        recursive: true,
      }).sort();
      assert.equal(afterStatus, beforeStatus);
      assert.deepEqual(afterObjects, beforeObjects);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  test('rejects malformed, mismatched, leaking, and over-budget envelopes in fixtures', () => {
    const expectedById = new Map(
      FIXTURE.cliEnvelopeCases.map(({ id, expected }) => [id, expected]),
    );
    assert.equal(expectedById.get('inspect-valid'), 'interpret-result');
    assert.equal(expectedById.get('scope-valid'), 'interpret-result');
    assert.equal(expectedById.get('content-valid'), 'interpret-result');
    for (const id of [
      'schema-mismatch',
      'version-mismatch',
      'command-mismatch',
      'status-exit-mismatch',
      'inspect-content-leak',
    ]) {
      assert.equal(expectedById.get(id), 'reject-envelope');
    }
    assert.equal(expectedById.get('invocation-too-large'), 'reject-output');
    assert.equal(expectedById.get('ordinary-aggregate-too-large'), 'stop-traversal');
  });
});
