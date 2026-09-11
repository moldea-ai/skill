// @vitest-environment node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

import { createQualificationAttemptKey } from '../../qualification/src/storage/index.ts';
import { recordQualificationResult } from '../../qualification/src/result/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../qualification/vitest/evidence-fixture.ts';
import { loadReleaseEvidenceModel } from '../../website/src/lib/release-evidence/index.ts';
import {
  createPortableSkillDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
} from '../semantic-evaluation/index.mjs';

import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from './constants.mjs';
import {
  clearPinnedReleaseEvidence,
  inspectReleaseEvidence,
  pinReleaseEvidence,
  recordFreshReleaseEvidence,
} from './evidence.mjs';
import {
  createCurrentQualificationReleaseEvidence,
  createFreshReleaseEvidenceEnvelope,
} from './release-evidence-current.mjs';
import {
  createReleaseEvidenceSha256,
  serializeReleaseEvidenceEnvelope,
} from './release-evidence-envelope.mjs';
import { assertTargetReleaseTagIdentity } from './release-evidence-source.mjs';
import { createSemanticCliIdentity } from './identity.mjs';

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

const createPackageIdentity = (root, version, cliVersion = '8.0.0') => {
  writeJson(root, 'package.json', {
    name: '@moldea.ai/skill-conformance',
    version,
    private: true,
    type: 'module',
    moldeaRelease: { cliJsonSchemaVersion: 4, coreVersionRange: '^4.0.1' },
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
        dependencies: { '@moldea.ai/core': '^4.0.0' },
      },
      'node_modules/@moldea.ai/core': {
        version: '4.0.1',
        integrity: 'sha512-4.0.1',
      },
    },
  });
};

const seedFreshEvidence = async (
  root,
  {
    isCorrupt = false,
    isFailed = false,
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
  const semanticCase = JSON.parse(
    readFileSync(join(REPOSITORY_ROOT, 'fixtures/conformance-cases.json'), 'utf8'),
  ).semanticCases.find(
    ({ resourceBudget }) =>
      resourceBudget.activation === 'direct' && resourceBudget.minimumMoldeaCommands === 1,
  );
  const semanticCases = [semanticCase];
  const semanticCoverage = {
    claims: [
      {
        description: 'Covers the release evidence fixture.',
        evidence: [{ id: semanticCase.id, kind: 'semantic-case' }],
        id: 'release-evidence',
        rationale: 'The fixture case exercises the selected evidence contract.',
        sourcePaths: ['moldea/SKILL.md#fixture'],
      },
    ],
    schemaVersion: 1,
  };
  writeJson(root, 'fixtures/conformance-cases.json', { semanticCases });
  writeJson(root, 'fixtures/semantic-evaluation-coverage.json', semanticCoverage);
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
    artifactDigest: createPortableSkillDigest(root),
    artifactSha256: createPortableSkillDigest(root),
    caseSuiteDigest: createSemanticCaseSuiteDigest(semanticCases),
    cli: createSemanticCliIdentity(root),
    coverageDigest: createSemanticCoverageDigest(semanticCoverage, semanticCases),
    evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
    semanticAttemptId,
    cases: [
      {
        actorResourceEvidence: resourceEvidence,
        id: semanticCase.id,
        passed: !isFailed,
      },
    ],
  });

  const qualificationAttemptId = 'qualification-attempt';
  const qualificationAttemptKey = createQualificationAttemptKey(qualificationAttemptId);
  const qualificationAttemptRoot = `qualification/results/t1/attempts/${qualificationAttemptKey}`;
  const artifactDirectory = join(root, '.qualification-artifacts');
  const result = await seedPassingQualificationEvidenceFixture({
    artifactDirectory,
    attemptId: qualificationAttemptId,
    resultsRoot: join(root, 'qualification', 'results'),
  });
  await recordQualificationResult(
    {
      artifactDirectory,
      result,
      sanitizationContext: {
        attemptDirectory: '/attempt',
        packagesRepository: '/packages',
        skillRepository: '/skill',
      },
    },
    join(root, 'qualification', 'results'),
  );
  rmSync(artifactDirectory, { force: true, recursive: true });
  if (isProfileMismatch) {
    const profilePath = join(root, 'qualification/profiles/t1/profile.yaml');
    writeFileSync(
      profilePath,
      readFileSync(profilePath, 'utf8').replace('id: release-case', 'id: different-case'),
      'utf8',
    );
  }
  const envelope = createFreshReleaseEvidenceEnvelope(root);
  writeText(root, 'fixtures/release-evidence.json', serializeReleaseEvidenceEnvelope(envelope));
  const storage = JSON.parse(
    readFileSync(join(root, qualificationAttemptRoot, 'storage.json'), 'utf8'),
  );
  const actorEvidence = storage.artifacts.find(({ logicalPath }) =>
    logicalPath.endsWith('/actor-evidence.json'),
  );
  const actorPhysicalPath = join(qualificationAttemptRoot, actorEvidence.physicalPath);
  if (isCorrupt) {
    writeText(root, actorPhysicalPath, '{"corrupt":true}\n');
  } else if (isMissing) {
    unlinkSync(join(root, actorPhysicalPath));
  }
};

const createRepository = async (options) => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-release-evidence-'));
  await seedFreshEvidence(root, options);
  runGit(root, 'init', '-b', 'main');
  runGit(root, 'config', 'user.email', 'fixture@example.com');
  runGit(root, 'config', 'user.name', 'Fixture');
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
  const root = mkdtempSync(join(tmpdir(), 'moldea-release-evidence-absent-'));
  try {
    const issues = await inspectReleaseEvidence(root);
    assert.deepEqual(issues, [
      'Release evidence is not recorded. Record fresh evidence or select an explicit pin.',
    ]);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('records deterministic fresh evidence only after its verifier passes', async () => {
  const root = await createRepository();
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
    const second = await recordFreshReleaseEvidence(root, {
      assertEvidence: async () => {},
    });
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

test('represents commit-pinned semantic evidence beside fresh qualification evidence', async () => {
  const root = await createRepository();
  try {
    const sourceCommit = runGit(root, 'rev-parse', 'HEAD');
    prepareTarget(root);
    await assert.rejects(
      pinReleaseEvidence(root, {
        fromCommit: sourceCommit,
        reason: 'The target changes release tooling without changing evaluated behavior.',
        scope: 'semantic',
      }),
      /Qualification/u,
    );
    const pinnedEnvelope = await pinReleaseEvidence(root, {
      fromCommit: sourceCommit,
      reason: 'The target changes release tooling without changing evaluated behavior.',
      scope: 'all',
    });
    const envelope = {
      ...pinnedEnvelope,
      qualification: {
        evidence: createCurrentQualificationReleaseEvidence(root),
        mode: 'fresh',
      },
    };
    writeText(root, 'fixtures/release-evidence.json', serializeReleaseEvidenceEnvelope(envelope));
    assert.equal(envelope.semantic.mode, 'pinned');
    assert.equal(envelope.semantic.source.commit, sourceCommit);
    assert.equal(envelope.semantic.source.tag, null);
    assert.equal(envelope.qualification.mode, 'fresh');
    assert.deepEqual(loadReleaseEvidenceModel(root, '6.0.0'), {
      mode: 'recorded',
      qualification: {
        mode: 'fresh',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v6.0.0',
      },
      semantic: {
        mode: 'pinned',
        reason: 'The target changes release tooling without changing evaluated behavior.',
        sourceCommit,
        sourceLabel: sourceCommit.slice(0, 12),
        sourceUrl: `https://github.com/moldea-ai/skill/tree/${sourceCommit}`,
      },
      targetVersion: '6.0.0',
    });
    writeText(root, 'moldea/SKILL.md', '# drifted target skill\n');
    assert.throws(
      () => loadReleaseEvidenceModel(root, '6.0.0'),
      /does not match the current portable skill bytes/,
    );
    writeText(root, 'moldea/SKILL.md', '# fixture skill 6.0.0\n');
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

test('flattens tagged pinned sections to their original source', async () => {
  const root = await createRepository();
  try {
    prepareTarget(root, '6.0.0');
    await pinReleaseEvidence(root, {
      from: 'v5.0.0',
      reason: 'Release tooling only.',
      scope: 'all',
    });
    runGit(root, 'add', '-A');
    runGit(root, 'commit', '-m', 'release 6.0.0');
    runGit(root, 'tag', 'v6.0.0');
    prepareTarget(root, '9.0.0');
    const envelope = await pinReleaseEvidence(root, {
      from: 'v6.0.0',
      reason: 'A later major retains the same evaluated behavior.',
      scope: 'all',
    });
    assert.equal(envelope.semantic.source.tag, 'v5.0.0');
    assert.equal(envelope.qualification.source.tag, 'v5.0.0');
    assert.equal(envelope.semantic.source.commit, runGit(root, 'rev-parse', 'v5.0.0^{commit}'));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('rejects self-reference, pre-envelope tags, corrupt artifacts, and over-budget evidence', async () => {
  const scenarios = [
    [{ isCorrupt: true }, /artifact digest does not match/],
    [{ isFailed: true }, /failed or over budget/],
    [{ isMissing: true }, /exists on disk|does not exist/],
    [{ isOverBudget: true }, /failed or over budget/],
    [{ isProfileMismatch: true }, /not self-consistent and passing/],
  ];
  for (const [options, expectedError] of scenarios) {
    const root = await createRepository(options);
    try {
      prepareTarget(root);
      await assert.rejects(
        pinReleaseEvidence(root, {
          from: 'v5.0.0',
          reason: 'Expected rejection.',
          scope: 'all',
        }),
        expectedError,
      );
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }

  const root = await createRepository();
  try {
    prepareTarget(root);
    await assert.rejects(
      pinReleaseEvidence(root, {
        from: 'v-does-not-exist',
        reason: '',
        scope: 'all',
      }),
      /Pinned evidence reason/,
    );
    createPackageIdentity(root, '5.0.0');
    writeText(root, 'moldea/SKILL.md', '# fixture skill\n');
    await assert.rejects(
      pinReleaseEvidence(root, {
        from: 'v5.0.0',
        reason: 'Self reference.',
        scope: 'all',
      }),
      /cannot pin the target release to itself/,
    );
    unlinkSync(join(root, 'fixtures/release-evidence.json'));
    createPackageIdentity(root, '4.0.0');
    writeText(root, 'moldea/SKILL.md', '# pre-envelope fixture skill\n');
    runGit(root, 'add', '-A');
    runGit(root, 'commit', '-m', 'pre-envelope release');
    runGit(root, 'tag', 'v4.0.0');
    prepareTarget(root);
    await assert.rejects(
      pinReleaseEvidence(root, {
        from: 'v4.0.0',
        reason: 'Pre-envelope source.',
        scope: 'all',
      }),
      /release-evidence\.json|exists on disk/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('detects a source tag moved after pinning', async () => {
  const root = await createRepository();
  try {
    prepareTarget(root);
    await pinReleaseEvidence(root, {
      from: 'v5.0.0',
      reason: 'Source binding test.',
      scope: 'all',
    });
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

test('binds an optional target release tag to the checked-out release commit', async () => {
  const root = await createRepository();
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
