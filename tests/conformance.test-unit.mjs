import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
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

const createProject = () => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-v5-conformance-'));
  mkdirSync(join(root, 'moldea'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'README.md'),
    '# Project\n\n<!-- moldea:start -->\nCanonical state lives in `/moldea/**`.\n<!-- moldea:end -->\n',
  );
  writeFileSync(
    join(root, 'moldea', 'moldea.yaml'),
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  writeFileSync(join(root, 'moldea', 'project.md'), '# Project\n\nCurrent project truth.\n');
  writeFileSync(join(root, 'src', 'project-state.js'), 'export const state = true;\n');
  const init = spawnSync('git', ['init', '--quiet'], { cwd: root, encoding: 'utf8' });
  assert.equal(init.status, 0);
  return root;
};

describe('portable skill contract', () => {
  test('uses the lowercase moldea identity and a narrow activation description', () => {
    const frontmatter = parseFrontmatter();
    assert.deepEqual(frontmatter.metadata, {
      version: '5.0.0',
      cliVersion: '6.0.0',
      cliJsonSchemaVersion: 3,
    });
    assert.equal(frontmatter.name, 'moldea');
    assert.match(frontmatter.description, /explicitly invokes moldea/u);
    assert.match(frontmatter.description, /declared moldea binding or affectedBy relationship/u);
    assert.match(frontmatter.description, /Do not use for unrelated/u);
    assert.doesNotMatch(frontmatter.description, /potentially durable knowledge|Use first/iu);
  });

  test('keeps progressive disclosure bounded to one owning reference', () => {
    const skill = readSkill();
    for (const referenceName of REFERENCE_NAMES) {
      assert.match(skill, new RegExp(`references/${referenceName.replace('.', '\\.')}`, 'u'));
      assert.doesNotThrow(() => readFileSync(join(SKILL_ROOT, 'references', referenceName), 'utf8'));
    }
    assert.match(skill, /Never read every reference by default/u);
    assert.match(skill, /read only what the selected operation needs/u);
  });

  test('defines silent abstention, host ownership, and bounded schema-3 evidence', () => {
    const distributedText = [
      readSkill(),
      ...REFERENCE_NAMES.map((name) =>
        readFileSync(join(SKILL_ROOT, 'references', name), 'utf8'),
      ),
    ].join('\n');
    assert.match(distributedText, /stop silently/u);
    assert.match(distributedText, /Host planning, review, implementation, Git, commit, and publication workflows retain control/u);
    assert.match(distributedText, /65,536-byte page/u);
    assert.match(distributedText, /262,144 bytes/u);
    assert.match(distributedText, /1 MiB/u);
    assert.match(distributedText, /16 MiB host buffer/u);
    assert.match(distributedText, /content-free/u);
    assert.doesNotMatch(distributedText, /Moldea/u);
    assert.doesNotMatch(distributedText, /4\.0\.[0-2]|CLI JSON schema (?:1|2)\b/u);
  });

  test('exposes concise lowercase host metadata', () => {
    const metadata = readFileSync(join(SKILL_ROOT, 'agents', 'openai.yaml'), 'utf8');
    assert.match(metadata, /display_name: "moldea"/u);
    assert.match(metadata, /allow_implicit_invocation: true/u);
    assert.doesNotMatch(metadata, /durable knowledge|Use first/iu);
  });
});

describe('activation and semantic protection', () => {
  test('covers every direct, relationship, and abstention gate', () => {
    const outcomes = new Map(FIXTURE.activationCases.map(({ id, expected }) => [id, expected]));
    assert.deepEqual([...outcomes.values()].filter((value) => value === 'direct').length, 3);
    assert.deepEqual(
      [...outcomes.values()].filter((value) => value === 'relationship-gate').length,
      2,
    );
    assert.deepEqual([...outcomes.values()].filter((value) => value === 'abstain').length, 5);
  });

  test('validates the complete 14-case resource-bounded semantic suite', () => {
    assert.equal(FIXTURE.semanticCases.length, 14);
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
    assert.equal(abstentions.length, 6);
    for (const { resourceBudget } of abstentions) {
      assert.deepEqual(resourceBudget, {
        activation: 'abstain',
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 0,
        maximumMoldeaOutputBytes: 0,
      });
    }
  });
});

describe('CLI 6 bounded machine protocol', () => {
  test('keeps release identity exact across the root manifests', () => {
    const packageManifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package-lock.json'), 'utf8'));
    assert.equal(packageManifest.version, '5.0.0');
    assert.equal(packageManifest.devDependencies['@moldea.ai/cli'], '6.0.0');
    assert.equal(packageManifest.moldeaRelease.cliJsonSchemaVersion, 3);
    assert.equal(packageLock.packages['node_modules/@moldea.ai/cli'].version, '6.0.0');
  });

  test('returns content-free inspect metadata and bounded explicit content', () => {
    const root = createProject();
    try {
      const inspect = runCli(root, ['inspect', '--json', '--max-output-bytes', '65536']);
      assert.equal(inspect.status, 0);
      assert.ok(Buffer.byteLength(inspect.stdout) <= 65_536);
      const inspectEnvelope = JSON.parse(inspect.stdout);
      assert.equal(inspectEnvelope.schemaVersion, 3);
      assert.equal(inspectEnvelope.cliVersion, '6.0.0');
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
