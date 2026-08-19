// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildBwrapArguments,
  collectSkillArtifactEvidence,
  prepareSandboxHome,
  readSemanticEvaluationCandidate,
  seedSemanticTooling,
  writeSemanticEvaluationCandidate,
} from './semantic-evaluation-runner.mjs';

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
      'Read [the release policy](../../docs/release-policy.md).',
      'Treat `docs/release-policy.md` as the policy source.',
      'Read `references/package-managers.md` before verification.',
    ].join('\n'),
  );
  mkdirSync(join(evaluationRoot, 'docs'));
  writeFileSync(join(evaluationRoot, 'docs', 'release-policy.md'), '# Release policy\n');
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
        reference: '../../docs/release-policy.md',
        resolvedPath: 'docs/release-policy.md',
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
    assert.equal(evidence[0].files[2].omission, 'symlink');
    assert.match(evidence[0].files[3].content, /Verify npm and pnpm/);
    assert.equal(evidence[1].role, 'distributed-copy');
    assert.equal(evidence[1].validation.valid, true);
    assert.equal(evidence[1].files[0].path, 'dist/skills/release-review/SKILL.md');
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

    assert.deepEqual(packageManifest.devDependencies, { '@moldea.ai/cli': '3.1.3' });
    assert.equal(cliManifest.bin.moldea, './dist/moldea.js');
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout.trim(), '3.1.3');
    assert.equal(compatibilityResult.status, 0, compatibilityResult.stderr);
    assert.deepEqual(compatibilityEnvelope.result.packages, [
      { name: '@moldea.ai/adapter-anthropic', version: '2.0.1' },
      { name: '@moldea.ai/adapter-google-genai', version: '1.0.3' },
      { name: '@moldea.ai/adapter-openai', version: '2.0.3' },
      { name: '@moldea.ai/core', version: '2.0.0' },
      { name: '@moldea.ai/repository', version: '1.0.1' },
      { name: '@moldea.ai/repository-fs', version: '1.0.2' },
    ]);
    const openAiAdapter = compatibilityEnvelope.result.adapters.find(({ id }) => id === 'openai');
    assert.equal(openAiAdapter.active, true);
    assert.equal(openAiAdapter.bundledVersion, '2.0.3');
    const googleGenAiAdapter = compatibilityEnvelope.result.adapters.find(
      ({ id }) => id === 'google-genai',
    );
    assert.equal(googleGenAiAdapter.active, true);
    assert.equal(googleGenAiAdapter.bundledVersion, '1.0.3');
    assert.equal(googleGenAiAdapter.matrix.implementation.versionRange, '^1.0.3');
    assert.equal(googleGenAiAdapter.matrix.lastVerifiedAt, '2026-08-19');
    assert.equal(googleGenAiAdapter.matrix.targets[0].packages[0].versionRange, '>=2.17.1 <3.0.0');
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('sandbox npm probe reports the fixture version and rejects execution commands', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-npm-probe-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);
  await prepareSandboxHome(sandboxHome);

  try {
    const result = spawnSync(
      'bwrap',
      buildBwrapArguments({
        command: [
          'codex',
          '-c',
          'test "$(npm --version)" = "11.12.1" && ! npm install example-package',
        ],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap exposes the Codex code-mode companion beside the host executable', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-code-mode-host-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);

  try {
    const result = spawnSync(
      'bwrap',
      buildBwrapArguments({
        command: ['codex', '-c', 'test -x /opt/codex-code-mode-host && /opt/codex-code-mode-host'],
        cwd: repositoryPath,
        hostCompanionExecutable: realpathSync('/bin/true'),
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap exposes the exact host Node runtime through its isolated PATH', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-node-runtime-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);

  const probe = `
    const { spawnSync } = require('node:child_process');
    const result = spawnSync('node', [
      '--eval',
      'if (process.execPath !== "/opt/node") process.exit(10)',
    ]);
    if (result.error) process.exit(11);
    process.exit(result.status ?? 12);
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildBwrapArguments({
        command: ['codex', '--eval', probe],
        cwd: repositoryPath,
        hostExecutable: process.execPath,
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap cannot observe host state or connect to host localhost', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-sandbox-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const hostMarkerRoot = mkdtempSync('/var/tmp/moldea-host-marker-');
  const hostMarkerPath = join(hostMarkerRoot, 'marker');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);
  writeFileSync(hostMarkerPath, 'host-only');

  const server = createServer();
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const probe = `
    const { existsSync } = require('node:fs');
    const { connect } = require('node:net');
    if (existsSync(${JSON.stringify(hostMarkerPath)})) process.exit(10);
    const socket = connect({ host: '127.0.0.1', port: ${address.port} });
    socket.setTimeout(500);
    socket.once('connect', () => process.exit(11));
    socket.once('error', () => process.exit(0));
    socket.once('timeout', () => process.exit(0));
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildBwrapArguments({
        command: ['codex', '--eval', probe],
        cwd: repositoryPath,
        hostExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await new Promise((resolvePromise, rejectPromise) =>
      server.close((error) => (error ? rejectPromise(error) : resolvePromise())),
    );
    rmSync(evaluationRoot, { force: true, recursive: true });
    rmSync(hostMarkerRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap exposes related repositories without write authority', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-related-repository-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const relatedRepositoryPath = join(evaluationRoot, 'related-application');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(relatedRepositoryPath);
  mkdirSync(sandboxHome);
  writeFileSync(join(relatedRepositoryPath, 'marker'), 'related');

  const probe = `
    const { readFileSync, writeFileSync } = require('node:fs');
    if (readFileSync('/related-application/marker', 'utf8') !== 'related') process.exit(10);
    try {
      writeFileSync('/related-application/created', 'unexpected');
      process.exit(11);
    } catch (error) {
      if (!['EACCES', 'EROFS'].includes(error.code)) process.exit(12);
    }
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildBwrapArguments({
        command: ['codex', '--eval', probe],
        cwd: repositoryPath,
        hostExecutable: process.execPath,
        readOnlyMounts: [{ source: relatedRepositoryPath, target: '/related-application' }],
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
