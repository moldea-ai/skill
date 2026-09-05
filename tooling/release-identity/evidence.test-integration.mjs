// @vitest-environment node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

import { createQualificationAttemptKey } from '../../qualification/src/storage/index.ts';
import { loadReleaseEvidenceModel } from '../../website/src/lib/release-evidence/index.ts';

import {
  clearPinnedReleaseEvidence,
  inspectReleaseEvidence,
  pinReleaseEvidence,
  recordFreshReleaseEvidence,
} from './evidence.mjs';
import { createFreshReleaseEvidenceEnvelope } from './release-evidence-current.mjs';
import {
  createReleaseEvidenceSha256,
  serializeReleaseEvidenceEnvelope,
} from './release-evidence-envelope.mjs';
import { assertTargetReleaseTagIdentity } from './release-evidence-source.mjs';

const REPOSITORY_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../..');

const writeText = (root, relativePath, source) => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source, 'utf8');
};

const writeJson = (root, relativePath, value) => {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
};

const runGit = (root, ...arguments_) =>
  execFileSync('git', arguments_, { cwd: root, encoding: 'utf8' }).trim();

const createPackageIdentity = (root, version, cliVersion = '7.0.0') => {
  writeJson(root, 'package.json', {
    name: '@moldea.ai/skill-conformance',
    version,
    private: true,
    type: 'module',
    moldeaRelease: { cliJsonSchemaVersion: 4 },
    devDependencies: { '@moldea.ai/cli': cliVersion },
  });
  writeJson(root, 'package-lock.json', {
    name: '@moldea.ai/skill-conformance',
    version,
    lockfileVersion: 3,
    packages: {
      '': {
        name: '@moldea.ai/skill-conformance',
        version,
        devDependencies: { '@moldea.ai/cli': cliVersion },
      },
      'node_modules/@moldea.ai/cli': {
        version: cliVersion,
        integrity: `sha512-${cliVersion}`,
        dependencies: { '@moldea.ai/core': '3.0.0' },
      },
    },
  });
};

const seedFreshEvidence = (
  root,
  {
    isCorrupt = false,
    isFailed = false,
    isInvalidResource = false,
    isMissing = false,
    isOverBudget = false,
    isProfileMismatch = false,
  } = {},
) => {
  createPackageIdentity(root, '5.0.0');
  writeText(root, 'moldea/SKILL.md', '# fixture skill\n');
  const resourceEvidence = {
    commandCount: 1,
    maximumInvocationByteCount: isOverBudget ? 2_000_000 : 1,
    modelVisibleToolOutputByteCount: 1,
    operations: ['inspect'],
    stdoutByteCount: 1,
  };
  writeJson(root, 'fixtures/conformance-cases.json', {
    semanticCases: [
      {
        id: 'semantic-case',
        resourceBudget: {
          activation: 'direct',
          maximumMoldeaCommands: 2,
          maximumMoldeaOutputBytes: 1024,
          minimumMoldeaCommands: 1,
        },
      },
    ],
  });
  const semanticAttemptId = '20260905T000000000Z-semantic-12345678';
  const semanticAttemptRoot = `fixtures/semantic-evaluation-results/attempts/${semanticAttemptId}`;
  const semanticEvidence = `${JSON.stringify({ kind: 'candidate' })}\n`;
  writeText(root, `${semanticAttemptRoot}/evidence.json`, semanticEvidence);
  writeJson(root, `${semanticAttemptRoot}/attempt.json`, {
    attemptId: semanticAttemptId,
    status: 'passed',
    evidence: {
      path: 'evidence.json',
      sha256: createReleaseEvidenceSha256(semanticEvidence),
    },
  });
  writeJson(root, 'fixtures/semantic-evaluation-results/latest.json', {
    latestAttemptId: semanticAttemptId,
    latestStatus: 'passed',
    lastPassingAttemptId: semanticAttemptId,
  });
  writeJson(root, 'fixtures/semantic-evaluation-result.json', {
    evaluationProtocolVersion: 22,
    semanticAttemptId,
    cases: [{ actorResourceEvidence: resourceEvidence, id: 'semantic-case', passed: !isFailed }],
  });

  const qualificationAttemptId = 'qualification-attempt';
  const qualificationAttemptKey = createQualificationAttemptKey(qualificationAttemptId);
  const qualificationAttemptRoot = `qualification/results/t1/attempts/${qualificationAttemptKey}`;
  const actorEvidence = `${JSON.stringify({
    cacheKey: '0'.repeat(64),
    cacheSourceAttemptId: null,
    commandPolicy: {
      completedCommandCount: 1,
      credentialExposure: { observedCount: 0, status: 'not-observed' },
      modelVisibleToolOutputByteCount: 1024,
      moldeaCommandCount: isInvalidResource ? 33 : 1,
      moldeaOutputByteCount: 512,
      networkAccess: { indeterminateCount: 0, observedCount: 0, status: 'not-observed' },
      sensitiveAccess: { indeterminateCount: 0, observedCount: 0, status: 'not-observed' },
    },
    createdAt: '2026-09-05T00:00:00.000Z',
    durationMs: 1,
    role: 'actor',
    sourceAttemptId: qualificationAttemptId,
    trialId: 'initial',
    usage: null,
  })}\n`;
  const actorEvidencePath = 'cases/case-1/trials/initial/actor-evidence.json';
  const actorPhysicalPath = 'artifacts/f1.json';
  writeText(root, `${qualificationAttemptRoot}/${actorPhysicalPath}`, actorEvidence);
  const qualificationAttemptPath = `${qualificationAttemptRoot}/attempt.json`;
  writeJson(root, qualificationAttemptPath, {
    artifactDigests: {
      [actorEvidencePath]: createReleaseEvidenceSha256(actorEvidence),
    },
    attemptId: qualificationAttemptId,
    cases: [{ caseId: 'case-1', status: 'passed' }],
    mode: 'official',
    protocolVersion: 7,
    provenance: {
      packagesRepositoryDirty: false,
      qualificationRepositoryDirty: false,
      skillRepositoryDirty: false,
    },
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status: 'passed',
  });
  const qualificationAttemptSha256 = createReleaseEvidenceSha256(
    readFileSync(join(root, qualificationAttemptPath)),
  );
  writeJson(root, `${qualificationAttemptRoot}/storage.json`, {
    version: 1,
    attemptId: qualificationAttemptId,
    attemptKey: qualificationAttemptKey,
    attemptDigest: qualificationAttemptSha256,
    artifacts: [
      {
        logicalPath: actorEvidencePath,
        physicalPath: actorPhysicalPath,
        sha256: createReleaseEvidenceSha256(actorEvidence),
      },
    ],
  });
  writeJson(root, 'qualification/results/t1/latest.json', {
    adapterId: 'custom',
    implementationId: 'custom',
    latestAttemptId: qualificationAttemptId,
    latestStatus: 'passed',
    lastPassingAttemptId: qualificationAttemptId,
    protocolVersion: 7,
  });
  writeText(
    root,
    'qualification/profiles/index.yaml',
    'version: 1\ntargets:\n  - key: t1\n    adapterId: custom\n    implementationId: custom\n',
  );
  writeText(
    root,
    'qualification/profiles/t1/profile.yaml',
    `version: 2\nadapterId: custom\nimplementationId: custom\ntitle: Custom qualification\ndescription: Test profile.\nprobesFile: probes/claims.yaml\ncases:\n  - id: ${isProfileMismatch ? 'case-2' : 'case-1'}\n    projectDirectory: cases/c1\n    scenarioFile: scenario.yaml\n`,
  );
  const envelope = createFreshReleaseEvidenceEnvelope(root);
  writeText(root, 'fixtures/release-evidence.json', serializeReleaseEvidenceEnvelope(envelope));
  if (isCorrupt) {
    writeText(root, `${qualificationAttemptRoot}/${actorPhysicalPath}`, '{"corrupt":true}\n');
  } else if (isMissing) {
    unlinkSync(join(root, qualificationAttemptRoot, actorPhysicalPath));
  }
};

const createRepository = (options) => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-release-evidence-'));
  runGit(root, 'init', '-b', 'main');
  runGit(root, 'config', 'user.email', 'fixture@example.com');
  runGit(root, 'config', 'user.name', 'Fixture');
  seedFreshEvidence(root, options);
  runGit(root, 'add', '-A');
  runGit(root, 'commit', '-m', 'release 5.0.0');
  runGit(root, 'tag', 'v5.0.0');
  return root;
};

const prepareTarget = (root, version = '6.0.0', cliVersion = '8.0.0') => {
  createPackageIdentity(root, version, cliVersion);
  writeText(root, 'moldea/SKILL.md', `# fixture skill ${version}\n`);
};

test('reports an absent release selection without invoking current evidence readers', async () => {
  const issues = await inspectReleaseEvidence(REPOSITORY_ROOT);
  assert.deepEqual(issues, [
    'Release evidence is not recorded. Record fresh evidence or select an explicit pin.',
  ]);
});

test('records deterministic fresh evidence only after its verifier passes', async () => {
  const root = createRepository();
  try {
    unlinkSync(join(root, 'fixtures/release-evidence.json'));
    let verificationCount = 0;
    const first = await recordFreshReleaseEvidence(root, {
      assertEvidence: async () => {
        verificationCount += 1;
      },
    });
    const firstSource = readFileSync(join(root, 'fixtures/release-evidence.json'), 'utf8');
    assert.throws(() => clearPinnedReleaseEvidence(root), /Only pinned release evidence/);
    const second = await recordFreshReleaseEvidence(root, { assertEvidence: async () => {} });
    assert.equal(verificationCount, 1);
    assert.deepEqual(second, first);
    assert.equal(readFileSync(join(root, 'fixtures/release-evidence.json'), 'utf8'), firstSource);
    await assert.rejects(
      recordFreshReleaseEvidence(root, {
        assertEvidence: async () => {
          throw new Error('verification failed');
        },
      }),
      /verification failed/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('pins directly, bypasses changed current evidence identity, and clears explicitly', async () => {
  const root = createRepository();
  try {
    prepareTarget(root);
    const envelope = pinReleaseEvidence(root, {
      from: 'v5.0.0',
      reason: 'The target changes release tooling without changing evaluated behavior.',
    });
    assert.equal(envelope.mode, 'pinned');
    assert.equal(envelope.source.tag, 'v5.0.0');
    assert.deepEqual(loadReleaseEvidenceModel(root, '6.0.0'), {
      mode: 'pinned',
      reason: 'The target changes release tooling without changing evaluated behavior.',
      sourceCommit: runGit(root, 'rev-parse', 'v5.0.0^{commit}'),
      sourceTag: 'v5.0.0',
      sourceUrl: 'https://github.com/moldea-ai/skill/tree/v5.0.0',
      targetVersion: '6.0.0',
    });
    writeText(root, 'moldea/SKILL.md', '# drifted target skill\n');
    assert.throws(
      () => loadReleaseEvidenceModel(root, '6.0.0'),
      /does not match the current portable skill bytes/,
    );
    writeText(root, 'moldea/SKILL.md', '# fixture skill 6.0.0\n');
    rmSync(join(root, 'fixtures/semantic-evaluation-results'), { force: true, recursive: true });
    rmSync(join(root, 'qualification/results'), { force: true, recursive: true });
    assert.deepEqual(await inspectReleaseEvidence(root), []);
    let currentVerifierCalled = false;
    await assert.rejects(
      recordFreshReleaseEvidence(root, {
        assertEvidence: async () => {
          currentVerifierCalled = true;
        },
      }),
      /Clear pinned release evidence/,
    );
    assert.equal(currentVerifierCalled, false);
    assert.equal(clearPinnedReleaseEvidence(root), true);
    assert.equal(clearPinnedReleaseEvidence(root), false);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('flattens a pinned release to its original fresh source across major versions', () => {
  const root = createRepository();
  try {
    prepareTarget(root, '6.0.0');
    pinReleaseEvidence(root, { from: 'v5.0.0', reason: 'Release tooling only.' });
    runGit(root, 'add', '-A');
    runGit(root, 'commit', '-m', 'release 6.0.0');
    runGit(root, 'tag', 'v6.0.0');
    prepareTarget(root, '9.0.0');
    const envelope = pinReleaseEvidence(root, {
      from: 'v6.0.0',
      reason: 'A later major retains the same evaluated behavior.',
    });
    assert.equal(envelope.source.tag, 'v5.0.0');
    assert.equal(envelope.source.commit, runGit(root, 'rev-parse', 'v5.0.0^{commit}'));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('bounds malformed pin chains even though command-created pins are flattened', () => {
  const root = createRepository();
  try {
    const freshSource = readFileSync(join(root, 'fixtures/release-evidence.json'), 'utf8');
    const freshEnvelope = JSON.parse(freshSource);
    const freshCommit = runGit(root, 'rev-parse', 'v5.0.0^{commit}');
    let previousTag = 'v5.0.0';
    for (let major = 6; major <= 70; major += 1) {
      const version = `${major}.0.0`;
      createPackageIdentity(root, version);
      writeText(
        root,
        'fixtures/release-evidence.json',
        serializeReleaseEvidenceEnvelope({
          mode: 'pinned',
          reason: 'Synthetic malformed chain.',
          schemaVersion: 1,
          source: {
            commit: freshCommit,
            evidenceSha256: createReleaseEvidenceSha256(freshSource),
            qualificationSha256: createReleaseEvidenceSha256(
              JSON.stringify(freshEnvelope.qualification),
            ),
            semanticSha256: createReleaseEvidenceSha256(JSON.stringify(freshEnvelope.semantic)),
            tag: previousTag,
          },
          target: {
            portableSkillSha256: freshEnvelope.target.portableSkillSha256,
            version,
          },
        }),
      );
      runGit(root, 'add', '-A');
      runGit(root, 'commit', '-m', `release ${version}`);
      previousTag = `v${version}`;
      runGit(root, 'tag', previousTag);
    }
    prepareTarget(root, '71.0.0');
    assert.throws(
      () => pinReleaseEvidence(root, { from: previousTag, reason: 'Reject chain.' }),
      /pin chain exceeds 64 tags/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('rejects self-reference, pre-envelope tags, corrupt artifacts, and over-budget evidence', () => {
  const scenarios = [
    [{ isCorrupt: true }, /artifact digest does not match/],
    [{ isFailed: true }, /failed or over budget/],
    [{ isInvalidResource: true }, /invalid or over budget/],
    [{ isMissing: true }, /exists on disk|does not exist/],
    [{ isOverBudget: true }, /failed or over budget/],
    [{ isProfileMismatch: true }, /not self-consistent and passing/],
  ];
  for (const [options, expectedError] of scenarios) {
    const root = createRepository(options);
    try {
      prepareTarget(root);
      assert.throws(
        () => pinReleaseEvidence(root, { from: 'v5.0.0', reason: 'Expected rejection.' }),
        expectedError,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }

  const root = createRepository();
  try {
    prepareTarget(root);
    assert.throws(
      () => pinReleaseEvidence(root, { from: 'v-does-not-exist', reason: '' }),
      /Pinned evidence reason/,
    );
    createPackageIdentity(root, '5.0.0');
    writeText(root, 'moldea/SKILL.md', '# fixture skill\n');
    assert.throws(
      () => pinReleaseEvidence(root, { from: 'v5.0.0', reason: 'Self reference.' }),
      /cannot pin the target release to itself/,
    );
    unlinkSync(join(root, 'fixtures/release-evidence.json'));
    createPackageIdentity(root, '4.0.0');
    writeText(root, 'moldea/SKILL.md', '# pre-envelope fixture skill\n');
    runGit(root, 'add', '-A');
    runGit(root, 'commit', '-m', 'pre-envelope release');
    runGit(root, 'tag', 'v4.0.0');
    prepareTarget(root);
    assert.throws(
      () => pinReleaseEvidence(root, { from: 'v4.0.0', reason: 'Pre-envelope source.' }),
      /release-evidence\.json|exists on disk/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('detects a source tag moved after pinning', async () => {
  const root = createRepository();
  try {
    prepareTarget(root);
    pinReleaseEvidence(root, { from: 'v5.0.0', reason: 'Source binding test.' });
    writeText(root, 'unrelated.txt', `${createHash('sha256').update('moved').digest('hex')}\n`);
    runGit(root, 'add', '-A');
    runGit(root, 'commit', '-m', 'move source');
    runGit(root, 'tag', '--force', 'v5.0.0');
    assert.ok(
      (await inspectReleaseEvidence(root)).some((issue) => /source|tag|target/iu.test(issue)),
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('binds an optional target release tag to the checked-out release commit', () => {
  const root = createRepository();
  try {
    assert.doesNotThrow(() => assertTargetReleaseTagIdentity(root, '5.0.0', undefined));
    assert.doesNotThrow(() => assertTargetReleaseTagIdentity(root, '5.0.0', 'v5.0.0'));
    assert.throws(
      () => assertTargetReleaseTagIdentity(root, '5.0.0', 'v6.0.0'),
      /must be v5\.0\.0/,
    );
    writeText(root, 'later.txt', 'later\n');
    runGit(root, 'add', '-A');
    runGit(root, 'commit', '-m', 'later commit');
    assert.throws(
      () => assertTargetReleaseTagIdentity(root, '5.0.0', 'v5.0.0'),
      /does not identify the checked-out commit/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
