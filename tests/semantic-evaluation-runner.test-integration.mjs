// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildCodexEvaluationBwrapArguments } from '../tooling/codex-evaluation-host/index.mjs';

import {
  collectSkillArtifactEvidence,
  createActorRepository,
  prepareSemanticEvaluationHome,
  readSemanticEvaluationCandidate,
  seedSemanticTooling,
  writeSemanticEvaluationCandidate,
} from './semantic-evaluation-runner.mjs';

const ROOT_PACKAGE_MANIFEST = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const RELEASE_CLI_VERSION = ROOT_PACKAGE_MANIFEST.devDependencies['@moldea.ai/cli'];
const SEMANTIC_CASES = JSON.parse(
  readFileSync(join(process.cwd(), 'fixtures', 'conformance-cases.json'), 'utf8'),
).semanticCases;
const HOST_PLAN_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'host-plan-command-precedence',
);
const YARN_CONFLICT_CASE_DEFINITION = SEMANTIC_CASES.find(
  ({ id }) => id === 'yarn-conflicting-cli-provider',
);

test('actor repository materializes host instructions before the clean baseline', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-instructions-test-'));
  assert.ok(HOST_PLAN_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      HOST_PLAN_CASE_DEFINITION,
    );
    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const committedInstructions = spawnSync('git', ['show', 'HEAD:AGENTS.md'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });

    assert.equal(
      readFileSync(join(repositoryPath, 'AGENTS.md'), 'utf8'),
      HOST_PLAN_CASE_DEFINITION.hostInstructions,
    );
    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(committedInstructions.status, 0, committedInstructions.stderr);
    assert.equal(committedInstructions.stdout, HOST_PLAN_CASE_DEFINITION.hostInstructions);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Yarn conflict scenario exposes read-only provider evidence and traps invocation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-yarn-conflict-test-'));
  assert.ok(YARN_CONFLICT_CASE_DEFINITION);

  try {
    const { repositoryPath } = await createActorRepository(
      evaluationRoot,
      YARN_CONFLICT_CASE_DEFINITION,
    );
    const sandboxHome = join(evaluationRoot, 'actor-home');
    const actorToolDirectory = join(evaluationRoot, 'actor-tools');
    const actorToolMounts = await prepareSemanticEvaluationHome(
      sandboxHome,
      YARN_CONFLICT_CASE_DEFINITION,
      actorToolDirectory,
    );

    const status = spawnSync('git', ['status', '--porcelain'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const packageManifest = JSON.parse(
      readFileSync(join(repositoryPath, 'package.json'), 'utf8'),
    );
    const cliManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
        'utf8',
      ),
    );
    const conflictingManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, 'node_modules', 'conflicting-moldea-provider', 'package.json'),
        'utf8',
      ),
    );
    const binaryPath = join(repositoryPath, 'node_modules', '.bin', 'moldea');
    const conflictingBinaryPath = join(
      repositoryPath,
      'node_modules',
      'conflicting-moldea-provider',
      'bin',
      'moldea.cjs',
    );
    const yarnProbePath = join(actorToolDirectory, 'yarn');
    const sentinelPath = join(repositoryPath, 'unexpected-yarn-cli-invocation.txt');
    const runProbe = (argumentsList) =>
      spawnSync(process.execPath, [yarnProbePath, ...argumentsList], {
        cwd: repositoryPath,
        encoding: 'utf8',
      });

    const versionResult = runProbe(['--version']);
    const infoResult = runProbe(['info', '@moldea.ai/cli', '--json']);
    const providerResult = runProbe(['bin', '-v', '--json']);

    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, '');
    assert.equal(packageManifest.packageManager, 'yarn@4.18.0');
    assert.deepEqual(packageManifest.devDependencies, {
      '@moldea.ai/cli': RELEASE_CLI_VERSION,
      'conflicting-moldea-provider': '1.0.0',
    });
    assert.equal(cliManifest.name, '@moldea.ai/cli');
    assert.equal(cliManifest.version, RELEASE_CLI_VERSION);
    assert.deepEqual(cliManifest.bin, { moldea: './dist/moldea.js' });
    assert.deepEqual(conflictingManifest, {
      bin: { moldea: './bin/moldea.cjs' },
      name: 'conflicting-moldea-provider',
      version: '1.0.0',
    });
    assert.equal(readlinkSync(binaryPath), '../conflicting-moldea-provider/bin/moldea.cjs');
    assert.equal(realpathSync(binaryPath), realpathSync(conflictingBinaryPath));
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout, '4.18.0\n');
    assert.equal(infoResult.status, 0, infoResult.stderr);
    assert.deepEqual(JSON.parse(infoResult.stdout), {
      value: `@moldea.ai/cli@npm:${RELEASE_CLI_VERSION}`,
      children: {
        Version: RELEASE_CLI_VERSION,
        'Exported Binaries': ['moldea'],
      },
    });
    assert.equal(providerResult.status, 0, providerResult.stderr);
    assert.deepEqual(JSON.parse(providerResult.stdout), {
      name: 'moldea',
      source: 'conflicting-moldea-provider',
      path: '/mnt/node_modules/conflicting-moldea-provider/bin/moldea.cjs',
    });
    assert.equal(existsSync(sentinelPath), false);

    assert.deepEqual(actorToolMounts, [
      { source: actorToolDirectory, target: '/home/evaluator/bin' },
    ]);
    const isolatedProbeResult = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: [
          'codex',
          '-c',
          [
            'test "$(command -v yarn)" = "/home/evaluator/bin/yarn"',
            'test "$(yarn --version)" = "4.18.0"',
            'if printf tampered > /home/evaluator/bin/yarn; then exit 10; fi',
            'test "$(yarn --version)" = "4.18.0"',
            'yarn bin -v --json',
          ].join(' && '),
        ],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        readOnlyMounts: actorToolMounts,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );

    assert.equal(isolatedProbeResult.status, 0, isolatedProbeResult.stderr);
    assert.deepEqual(JSON.parse(isolatedProbeResult.stdout), {
      name: 'moldea',
      source: 'conflicting-moldea-provider',
      path: '/mnt/node_modules/conflicting-moldea-provider/bin/moldea.cjs',
    });
    assert.match(isolatedProbeResult.stderr, /Read-only file system|Permission denied/);
    assert.equal(readFileSync(yarnProbePath, 'utf8').startsWith('#!/opt/node\n'), true);

    const forbiddenResult = runProbe(['exec', 'moldea', 'validate', '--json']);

    assert.equal(forbiddenResult.status, 2);
    assert.match(forbiddenResult.stderr, /must not be invoked/);
    assert.equal(
      readFileSync(sentinelPath, 'utf8'),
      'yarn exec moldea validate --json\n',
    );

    rmSync(sentinelPath);
    const forbiddenResolutionResult = runProbe(['bin', 'moldea']);

    assert.equal(forbiddenResolutionResult.status, 2);
    assert.match(forbiddenResolutionResult.stderr, /must not be invoked/);
    assert.equal(readFileSync(sentinelPath, 'utf8'), 'yarn bin moldea\n');

    rmSync(sentinelPath);
    const directInvocationResult = spawnSync(
      process.execPath,
      [conflictingBinaryPath, '--version'],
      {
        cwd: repositoryPath,
        encoding: 'utf8',
      },
    );

    assert.equal(directInvocationResult.status, 2);
    assert.match(directInvocationResult.stderr, /must not be invoked/);
    assert.equal(readFileSync(sentinelPath, 'utf8'), 'direct moldea --version\n');
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill artifact evidence exposes bounded content and independent validation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-evidence-test-'));
  const skillRoot = join(evaluationRoot, 'skills', 'release-review');
  mkdirSync(join(skillRoot, 'references'), { recursive: true });
  mkdirSync(join(skillRoot, 'assets'));
  mkdirSync(join(evaluationRoot, 'dist', 'skills', 'release-review'), { recursive: true });
  writeFileSync(
    join(skillRoot, 'SKILL.md'),
    [
      '---',
      'name: release-review',
      'description: Reviews npm and pnpm releases when publication readiness is requested.',
      '---',
      '',
      '# Release review',
      '',
      'Read [the release policy](/docs/release-policy.md).',
      'Read `references/package-managers.md` before verification.',
      'Run `/scripts/verify-release.mjs` after reviewing the policy.',
    ].join('\n'),
  );
  mkdirSync(join(evaluationRoot, 'docs'));
  writeFileSync(join(evaluationRoot, 'docs', 'release-policy.md'), '# Release policy\n');
  mkdirSync(join(evaluationRoot, 'scripts'));
  writeFileSync(
    join(evaluationRoot, 'scripts', 'verify-release.mjs'),
    'export const verifyRelease = () => true;\n',
  );
  writeFileSync(
    join(skillRoot, 'references', 'package-managers.md'),
    '# Package managers\n\nVerify npm and pnpm.\n',
  );
  writeFileSync(join(skillRoot, 'large.txt'), 'x'.repeat(32_769));
  symlinkSync('/outside-evaluation', join(skillRoot, 'linked-resource'));
  writeFileSync(
    join(evaluationRoot, 'dist', 'skills', 'release-review', 'SKILL.md'),
    readFileSync(join(skillRoot, 'SKILL.md')),
  );

  try {
    const evidence = await collectSkillArtifactEvidence(evaluationRoot, {
      id: 'skill-maintain-linked-resources',
      skillEvidence: {
        activationScenarios: [],
        artifacts: [
          {
            role: 'authoritative-source',
            root: 'skills/release-review',
          },
          {
            role: 'distributed-copy',
            root: 'dist/skills/release-review',
          },
        ],
      },
    });

    assert.equal(evidence.length, 2);
    assert.equal(evidence[0].role, 'authoritative-source');
    assert.equal(evidence[0].rootType, 'directory');
    assert.deepEqual(evidence[0].validation, {
      description: 'Reviews npm and pnpm releases when publication readiness is requested.',
      errors: [],
      name: 'release-review',
      valid: true,
    });
    assert.deepEqual(evidence[0].directories, [
      'skills/release-review',
      'skills/release-review/assets',
      'skills/release-review/references',
    ]);
    assert.equal(evidence[0].truncatedDirectoryCount, 0);
    assert.equal(evidence[0].excludedDirectoryCount, 0);
    assert.equal(evidence[0].truncatedFileCount, 0);
    assert.deepEqual(evidence[0].resourceReferences, [
      {
        isSafe: true,
        reference: '/docs/release-policy.md',
        resolvedPath: 'docs/release-policy.md',
        type: 'file',
      },
      {
        isSafe: true,
        reference: '/scripts/verify-release.mjs',
        resolvedPath: 'scripts/verify-release.mjs',
        type: 'file',
      },
      {
        isSafe: true,
        reference: 'references/package-managers.md',
        resolvedPath: 'skills/release-review/references/package-managers.md',
        type: 'file',
      },
    ]);
    assert.deepEqual(
      evidence[0].files.map(({ path }) => path),
      [
        'skills/release-review/SKILL.md',
        'skills/release-review/large.txt',
        'skills/release-review/linked-resource',
        'skills/release-review/references/package-managers.md',
      ],
    );
    assert.match(evidence[0].files[0].content, /Read `references\/package-managers\.md`/);
    assert.equal(evidence[0].files[1].omission, 'file-too-large');
    assert.equal(evidence[0].files[1].sha256, null);
    assert.equal(evidence[0].files[2].omission, 'symlink');
    assert.match(evidence[0].files[3].content, /Verify npm and pnpm/);
    assert.equal(evidence[0].isTraversalTruncated, false);
    assert.equal(evidence[0].truncatedResourceReferenceCount, 0);
    assert.equal(evidence[1].role, 'distributed-copy');
    assert.equal(evidence[1].validation.valid, true);
    assert.equal(evidence[1].files[0].path, 'dist/skills/release-review/SKILL.md');
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill artifact evidence stops traversal and reference inspection at hard limits', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-evidence-limits-test-'));
  const skillRoot = join(evaluationRoot, 'skills', 'bounded-skill');
  mkdirSync(skillRoot, { recursive: true });
  const references = Array.from(
    { length: 40 },
    (_, index) => `Read \`references/resource-${String(index).padStart(2, '0')}.md\`.`,
  );
  writeFileSync(
    join(skillRoot, 'SKILL.md'),
    [
      '---',
      'name: bounded-skill',
      'description: Exercises evaluator evidence limits when skill artifacts are unusually large.',
      '---',
      '',
      '# Bounded skill',
      '',
      ...references,
    ].join('\n'),
  );
  for (let index = 0; index < 40; index += 1) {
    mkdirSync(join(skillRoot, `directory-${String(index).padStart(2, '0')}`));
    writeFileSync(join(skillRoot, `file-${String(index).padStart(2, '0')}.txt`), 'evidence');
  }

  try {
    const [evidence] = await collectSkillArtifactEvidence(evaluationRoot, {
      id: 'skill-evidence-resource-limits',
      skillEvidence: {
        activationScenarios: [],
        artifacts: [{ role: 'authoritative-source', root: 'skills/bounded-skill' }],
      },
    });

    assert.equal(evidence.isTraversalTruncated, true);
    assert.deepEqual(evidence.directories, ['skills/bounded-skill']);
    assert.deepEqual(
      evidence.files.map(({ path }) => path),
      ['skills/bounded-skill/SKILL.md'],
    );
    assert.equal(evidence.resourceReferences.length, 32);
    assert.equal(evidence.truncatedResourceReferenceCount, 8);
    assert.equal(evidence.validation.valid, true);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('skill artifact evidence accepts the exact traversal limit without a false truncation', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-skill-evidence-boundary-test-'));
  const skillRoot = join(evaluationRoot, 'skills', 'boundary-skill');
  mkdirSync(skillRoot, { recursive: true });
  writeFileSync(
    join(skillRoot, 'SKILL.md'),
    [
      '---',
      'name: boundary-skill',
      'description: Exercises the exact semantic evidence traversal boundary.',
      '---',
      '',
      '# Boundary skill',
    ].join('\n'),
  );
  for (let index = 0; index < 63; index += 1) {
    mkdirSync(join(skillRoot, `directory-${String(index).padStart(2, '0')}`));
  }

  try {
    const [evidence] = await collectSkillArtifactEvidence(evaluationRoot, {
      id: 'skill-evidence-exact-traversal-limit',
      skillEvidence: {
        activationScenarios: [],
        artifacts: [{ role: 'authoritative-source', root: 'skills/boundary-skill' }],
      },
    });

    assert.equal(evidence.isTraversalTruncated, false);
    assert.equal(evidence.directories.length, 32);
    assert.equal(evidence.truncatedDirectoryCount, 32);
    assert.equal(evidence.validation.valid, true);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('semantic candidate checkpoints are atomically replaceable', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-candidate-test-'));
  const candidatePath = join(evaluationRoot, '.semantic-evaluation-candidate.json');
  const initialCandidate = {
    artifactDigest: 'a'.repeat(64),
    results: [],
    schemaVersion: 1,
  };
  const updatedCandidate = {
    ...initialCandidate,
    results: [{ id: 'completed-case', passed: true }],
  };

  try {
    await writeSemanticEvaluationCandidate(initialCandidate, candidatePath);
    assert.deepEqual(await readSemanticEvaluationCandidate(candidatePath), initialCandidate);

    await writeSemanticEvaluationCandidate(updatedCandidate, candidatePath);
    assert.deepEqual(await readSemanticEvaluationCandidate(candidatePath), updatedCandidate);
    assert.deepEqual(readdirSync(evaluationRoot), ['.semantic-evaluation-candidate.json']);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('semantic actors execute the copied published CLI closure', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-published-cli-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  mkdirSync(repositoryPath);

  try {
    await seedSemanticTooling(repositoryPath, { id: 'adopted-relevance-no-change' });
    const packageManifest = JSON.parse(readFileSync(join(repositoryPath, 'package.json'), 'utf8'));
    const cliManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
        'utf8',
      ),
    );
    const binaryPath = join(repositoryPath, 'node_modules', '.bin', 'moldea');
    const versionResult = spawnSync(binaryPath, ['--version'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const compatibilityResult = spawnSync(binaryPath, ['compatibility', '--json'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const compatibilityEnvelope = JSON.parse(compatibilityResult.stdout);

    assert.deepEqual(packageManifest.devDependencies, { '@moldea.ai/cli': RELEASE_CLI_VERSION });
    assert.equal(cliManifest.bin.moldea, './dist/moldea.js');
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout.trim(), RELEASE_CLI_VERSION);
    assert.equal(compatibilityResult.status, 0, compatibilityResult.stderr);
    assert.equal(
      compatibilityEnvelope.schemaVersion,
      ROOT_PACKAGE_MANIFEST.moldeaRelease.cliJsonSchemaVersion,
    );
    assert.deepEqual(
      compatibilityEnvelope.result.packages,
      Object.entries(cliManifest.dependencies)
        .filter(([name]) => name.startsWith('@moldea.ai/'))
        .map(([name, version]) => ({ name, version }))
        .sort(({ name: left }, { name: right }) => left.localeCompare(right)),
    );
    for (const adapter of compatibilityEnvelope.result.adapters) {
      assert.deepEqual(Object.keys(adapter).sort(), ['id', 'repositoryFormatVersions']);
    }
    const openAiAdapter = compatibilityEnvelope.result.adapters.find(({ id }) => id === 'openai');
    assert.deepEqual(openAiAdapter.repositoryFormatVersions, [1]);
    const googleGenAiAdapter = compatibilityEnvelope.result.adapters.find(
      ({ id }) => id === 'google-genai',
    );
    assert.deepEqual(googleGenAiAdapter.repositoryFormatVersions, [1]);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
