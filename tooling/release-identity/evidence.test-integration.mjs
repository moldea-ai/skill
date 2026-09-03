// @vitest-environment node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from './constants.mjs';
import { inspectReleaseEvidence } from './evidence.mjs';
import {
  COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY,
  resolveCompatibleHistoricalSemanticAttemptId,
} from './historical-semantic.mjs';
import { createSemanticCliIdentity } from './identity.mjs';
import {
  createCliClosureDigest,
  createPortableSkillBehaviorDigest,
  createSemanticCompatibilityDigest,
  readSemanticAttemptIdentity,
} from '../evidence-identity/index.mjs';
import {
  createPortableSkillDigest,
  createRepositoryControlEvidence,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  recordSemanticEvaluationAttempt,
} from '../semantic-evaluation/index.mjs';
import {
  calculateQualificationExecutionDigest,
  calculateQualificationProfileDigest,
  calculateQualificationTargetDigest,
} from '../../qualification/src/execution/fingerprints.ts';
import { calculateDirectoryFingerprint } from '../../qualification/src/filesystem/index.ts';
import { inspectGitRepositoryState } from '../../qualification/src/repository-state/index.ts';
import { recordQualificationResult } from '../../qualification/src/result/index.ts';
import {
  createQualificationAttemptKey,
  QualificationAttemptStorageSchema,
  resolveQualificationArtifactPath,
} from '../../qualification/src/storage/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../qualification/vitest/evidence-fixture.ts';

const PUBLISHED_MOLDEA_MANIFESTS = [
  {
    name: '@moldea.ai/core',
    version: '2.0.1',
    dist: {
      integrity: 'sha512-core-release-integrity',
      shasum: '1'.repeat(40),
      tarball: 'https://registry.npmjs.org/@moldea.ai/core/-/core-2.0.1.tgz',
    },
  },
  {
    name: '@moldea.ai/cli',
    version: '4.0.0',
    dist: {
      integrity: 'sha512-release-integrity',
      shasum: '2'.repeat(40),
      tarball: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-4.0.0.tgz',
    },
  },
];

const TYPESCRIPT_MANIFEST = {
  name: 'typescript',
  version: '6.0.3',
  dist: {
    integrity: 'sha512-typescript-release-integrity',
    shasum: '3'.repeat(40),
    tarball: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
  },
};
const TOOLING_SEMVER_VERSION = '7.8.5';
const QUALIFICATION_TARGET_KEY = 't1';

const PROFILE_RUNTIME_MANIFEST = {
  name: 'external-runtime',
  version: '1.2.3',
  dist: {
    integrity: 'sha512-external-runtime-integrity',
    shasum: '4'.repeat(40),
    tarball: 'https://registry.npmjs.org/external-runtime/-/external-runtime-1.2.3.tgz',
  },
};

const writeFile = (root, relativePath, content) => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
};

const getQualificationAttemptDirectory = (root, attemptId, targetKey = QUALIFICATION_TARGET_KEY) =>
  join(
    root,
    'qualification',
    'results',
    targetKey,
    'attempts',
    createQualificationAttemptKey(attemptId),
  );

const getQualificationArtifactPath = (
  root,
  attemptId,
  logicalPath,
  targetKey = QUALIFICATION_TARGET_KEY,
) => {
  const attemptDirectory = getQualificationAttemptDirectory(root, attemptId, targetKey);
  const storage = QualificationAttemptStorageSchema.parse(
    JSON.parse(readFileSync(join(attemptDirectory, 'storage.json'), 'utf8')),
  );

  return resolveQualificationArtifactPath(attemptDirectory, storage, logicalPath);
};

const synchronizeQualificationStorage = (root, attemptId, targetKey = QUALIFICATION_TARGET_KEY) => {
  const attemptDirectory = getQualificationAttemptDirectory(root, attemptId, targetKey);
  const attemptPath = join(attemptDirectory, 'attempt.json');
  const attemptSource = readFileSync(attemptPath);
  const attempt = JSON.parse(attemptSource.toString('utf8'));
  const storagePath = join(attemptDirectory, 'storage.json');
  const storage = QualificationAttemptStorageSchema.parse(
    JSON.parse(readFileSync(storagePath, 'utf8')),
  );
  writeFileSync(
    storagePath,
    `${JSON.stringify(
      {
        ...storage,
        attemptDigest: createHash('sha256').update(attemptSource).digest('hex'),
        artifacts: storage.artifacts.map((artifact) => ({
          ...artifact,
          sha256: attempt.artifactDigests[artifact.logicalPath],
        })),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
};

const copyQualificationArtifacts = (root, attemptId, destinationDirectory) => {
  const attemptDirectory = getQualificationAttemptDirectory(root, attemptId);
  const storage = QualificationAttemptStorageSchema.parse(
    JSON.parse(readFileSync(join(attemptDirectory, 'storage.json'), 'utf8')),
  );

  for (const artifact of storage.artifacts) {
    const destinationPath = join(destinationDirectory, artifact.logicalPath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    cpSync(
      resolveQualificationArtifactPath(attemptDirectory, storage, artifact.logicalPath),
      destinationPath,
    );
  }
};

const createRecordedPackages = (manifests) =>
  manifests.map((manifest) => ({
    name: manifest.name,
    version: manifest.version,
    registryIntegrity: manifest.dist.integrity,
    registryShasum: manifest.dist.shasum,
    registryTarballUrl: manifest.dist.tarball,
    tarballName: new URL(manifest.dist.tarball).pathname.split('/').at(-1),
    sha256: createHash('sha256').update(`${manifest.name}@${manifest.version}`).digest('hex'),
  }));

const createRecordedQualificationPackages = (publishedManifests, runtimeManifests = []) =>
  createRecordedPackages([...publishedManifests, ...runtimeManifests, TYPESCRIPT_MANIFEST]);

const createSemanticCase = (id) => ({
  expected: [
    {
      criterion: 'The actor satisfies the required release behavior.',
      label: 'satisfy-release-behavior',
    },
  ],
  forbidden: [
    {
      criterion: 'The actor contradicts the required release behavior.',
      label: 'contradict-release-behavior',
    },
  ],
  id,
  input: {
    developerDirection: `Complete the ${id} release scenario.`,
    repositoryEvidence: [
      {
        claim: 'The developer supplied the release scenario directly.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  operation: `evaluate-${id}`,
  scenario: `The ${id} release scenario exercises semantic host provenance.`,
});

const createSemanticTrial = ({ caseDefinition, evaluatedAt, host }) => {
  const repositoryState = {
    gitDigest: '1'.repeat(64),
    head: { commit: null, symbolicRef: 'refs/heads/main' },
    indexDigest: '2'.repeat(64),
    installedSkillDigest: '3'.repeat(64),
    localConfigDigest: '4'.repeat(64),
    refs: [],
  };

  return {
    actorHost: host,
    actorCommandPolicyEvidence: {
      completedCommandCount: 0,
      indeterminateCommandCount: 0,
      packageManagerExecution: 'not-observed',
      packageManagerInvocationCount: 0,
    },
    actorExecutionEvidence: [],
    caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
    evaluatedAt,
    forbidden: [],
    id: caseDefinition.id,
    judgeHost: host,
    observed: ['satisfy-release-behavior'],
    operationalRetries: {
      actorFailureCount: 0,
      judgeFailureCount: 0,
      lastFailure: null,
    },
    passed: true,
    rationale: 'The required release behavior was observed.',
    readOnlyMountControlEvidence: [],
    repositoryControlEvidence: createRepositoryControlEvidence(repositoryState, repositoryState),
    scenarioEvidence: [
      {
        claim: caseDefinition.input.repositoryEvidence[0].claim,
        observation: {
          content: caseDefinition.input.developerDirection,
          type: 'developer-direction',
        },
        source: caseDefinition.input.repositoryEvidence[0].source,
      },
    ],
  };
};

const createPublicSemanticCase = (trial) => ({
  actorHost: trial.actorHost,
  actorCommandPolicyEvidence: trial.actorCommandPolicyEvidence,
  actorExecutionEvidence: trial.actorExecutionEvidence,
  caseDefinitionDigest: trial.caseDefinitionDigest,
  evaluatedAt: trial.evaluatedAt,
  expectedSatisfied: trial.observed,
  forbiddenTriggered: trial.forbidden,
  id: trial.id,
  judgeHost: trial.judgeHost,
  passed: trial.passed,
  rationale: trial.rationale,
  readOnlyMountControlEvidence: trial.readOnlyMountControlEvidence,
  repositoryControlEvidence: trial.repositoryControlEvidence,
  scenarioEvidence: trial.scenarioEvidence,
});

test('binds the 4.0.2 compatibility bridge to the current candidate identities', () => {
  assert.deepEqual(
    {
      cliClosureDigest: createCliClosureDigest(process.cwd()),
      portableSkillBehaviorDigest: createPortableSkillBehaviorDigest(process.cwd()),
      semanticCompatibilityDigest: createSemanticCompatibilityDigest(process.cwd()),
    },
    COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY,
  );
});

test('historical semantic selection requires an exact source or bridged 4.0.2 identity', () => {
  const attemptId = 'semantic-source-attempt';
  const sourceIdentity = {
    cliClosureDigest: '1'.repeat(64),
    portableSkillBehaviorDigest: '2'.repeat(64),
    semanticCompatibilityDigest: '3'.repeat(64),
  };
  const semanticResultSha256 = '4'.repeat(64);
  const attestation = {
    semantic: {
      ...sourceIdentity,
      attemptId,
      resultSha256: semanticResultSha256,
    },
  };

  assert.equal(
    resolveCompatibleHistoricalSemanticAttemptId({
      attestation,
      candidateCliClosureDigest: sourceIdentity.cliClosureDigest,
      candidatePortableSkillBehaviorDigest: sourceIdentity.portableSkillBehaviorDigest,
      candidateSemanticCompatibilityDigest: sourceIdentity.semanticCompatibilityDigest,
      semanticResultSha256,
    }),
    attemptId,
  );
  assert.equal(
    resolveCompatibleHistoricalSemanticAttemptId({
      attestation,
      compatibilityBridge402: {},
      candidateCliClosureDigest: COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.cliClosureDigest,
      candidatePortableSkillBehaviorDigest:
        COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.portableSkillBehaviorDigest,
      candidateSemanticCompatibilityDigest:
        COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.semanticCompatibilityDigest,
      semanticResultSha256,
    }),
    attemptId,
  );

  for (const incompatibleOptions of [
    { compatibilityBridge402: null },
    { candidateCliClosureDigest: '0'.repeat(64) },
    { candidatePortableSkillBehaviorDigest: '0'.repeat(64) },
    { candidateSemanticCompatibilityDigest: '0'.repeat(64) },
    { semanticResultSha256: '0'.repeat(64) },
  ]) {
    assert.equal(
      resolveCompatibleHistoricalSemanticAttemptId({
        attestation,
        compatibilityBridge402: {},
        candidateCliClosureDigest: COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.cliClosureDigest,
        candidatePortableSkillBehaviorDigest:
          COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.portableSkillBehaviorDigest,
        candidateSemanticCompatibilityDigest:
          COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY.semanticCompatibilityDigest,
        semanticResultSha256,
        ...incompatibleOptions,
      }),
      null,
    );
  }
});

/** Creates one committed packages checkout for release-input freshness assertions. */
const seedPackagesRepository = (root) => {
  const packagesRepository = join(root, 'packages-repository');
  const matrix = {
    version: 2,
    adapters: {
      custom: {
        implementationStatus: 'available',
        implementation: {
          distribution: 'built-in',
          kind: 'custom',
          package: '@moldea.ai/core',
        },
        targets: [
          {
            id: 'custom',
            kind: 'custom',
            language: 'typescript',
            lastVerifiedAt: '2026-08-21',
          },
        ],
      },
    },
  };
  writeFile(packagesRepository, 'compatibility/runtimes.yaml', `${JSON.stringify(matrix)}\n`);
  execFileSync('git', ['init', '--quiet'], { cwd: packagesRepository });
  execFileSync('git', ['config', 'user.email', 'qualification@example.com'], {
    cwd: packagesRepository,
  });
  execFileSync('git', ['config', 'user.name', 'Qualification Fixture'], {
    cwd: packagesRepository,
  });
  execFileSync('git', ['add', '.'], { cwd: packagesRepository });
  execFileSync('git', ['commit', '--quiet', '-m', 'test: seed packages fixture'], {
    cwd: packagesRepository,
  });

  return { matrix, packagesRepository };
};

const seedReleaseManifests = (root) => {
  writeFile(
    root,
    'package.json',
    `${JSON.stringify({
      devDependencies: {
        '@moldea.ai/cli': '4.0.0',
        semver: TOOLING_SEMVER_VERSION,
      },
      moldeaRelease: { cliJsonSchemaVersion: 2 },
      version: '3.1.0',
    })}\n`,
  );
  writeFile(
    root,
    'package-lock.json',
    `${JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': {
          devDependencies: {
            '@moldea.ai/cli': '4.0.0',
            semver: TOOLING_SEMVER_VERSION,
          },
          version: '3.1.0',
        },
        'node_modules/@moldea.ai/cli': {
          integrity: 'sha512-release-integrity',
          version: '4.0.0',
        },
        'node_modules/semver': {
          dev: true,
          integrity: 'sha512-tooling-semver-integrity',
          version: TOOLING_SEMVER_VERSION,
        },
      },
    })}\n`,
  );
  writeFile(
    root,
    'qualification/package.json',
    `${JSON.stringify({ devDependencies: { typescript: TYPESCRIPT_MANIFEST.version } })}\n`,
  );
  writeFile(
    root,
    'qualification/package-lock.json',
    `${JSON.stringify({
      name: '@moldea.ai/adapter-qualification',
      version: '0.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': {
          name: '@moldea.ai/adapter-qualification',
          version: '0.0.0',
          devDependencies: { typescript: TYPESCRIPT_MANIFEST.version },
        },
        'node_modules/typescript': {
          version: TYPESCRIPT_MANIFEST.version,
          dev: true,
        },
      },
    })}\n`,
  );
  writeFile(
    root,
    'qualification/profiles/index.yaml',
    [
      'version: 1',
      'targets:',
      '  - key: t1',
      '    adapterId: custom',
      '    implementationId: custom',
      '',
    ].join('\n'),
  );
  writeFile(
    root,
    'qualification/profiles/t1/profile.yaml',
    [
      'version: 2',
      'adapterId: custom',
      'implementationId: custom',
      'title: Custom qualification',
      'description: Release evidence fixture.',
      'probesFile: probes/claims.yaml',
      'cases:',
      '  - id: release-case',
      '    projectDirectory: cases/c1',
      '    scenarioFile: scenario.yaml',
      '',
    ].join('\n'),
  );
  writeFile(
    root,
    'qualification/cases/cases.yaml',
    [
      'version: 2',
      'cases:',
      '  - id: release-case',
      '    title: Release case',
      '    layer: universal-baseline',
      '    description: Release evidence fixture.',
      '    challenge: Reject incomplete passing evidence.',
      '',
    ].join('\n'),
  );
  writeFile(root, 'qualification/src/fixture.ts', 'export const fixture = true;\n');
  writeFile(
    root,
    'tests/semantic-evaluation-runner.mjs',
    'export const semanticRunnerFixture = true;\n',
  );
  writeFile(root, 'tooling/codex-evaluation-host/fixture.mjs', 'export const fixture = true;\n');
  writeFile(root, 'tooling/release-identity/constants.mjs', 'export const protocol = 1;\n');
  writeFile(root, 'tooling/release-identity/identity.mjs', 'export const identity = true;\n');
  writeFile(root, 'tooling/semantic-evaluation/fixture.mjs', 'export const fixture = true;\n');
  writeFile(root, 'tooling/package-candidate/fixture.mjs', 'export const fixture = true;\n');
  writeFile(
    root,
    'moldea/SKILL.md',
    [
      '---',
      'name: moldea-fixture',
      'description: Release evidence fixture.',
      'metadata:',
      '  version: 4.0.0',
      '---',
      '',
      '# moldea fixture',
      '',
      'Skill release `4.0.0` supports exactly:',
      '',
    ].join('\n'),
  );
  writeFile(
    root,
    'moldea/references/local-tooling.md',
    '# Local tooling\n\nRelease `4.0.0` supports:\n',
  );
  writeFile(root, 'fixtures/conformance-cases.json', '{"semanticCases":[]}\n');
  writeFile(
    root,
    'fixtures/semantic-evaluation-coverage.json',
    '{"schemaVersion":1,"claims":[]}\n',
  );
};

test('release evidence inspection requires fresh passing semantic and qualification results', async () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-release-evidence-'));

  try {
    seedReleaseManifests(temporaryRoot);
    const { matrix, packagesRepository } = seedPackagesRepository(temporaryRoot);
    let publishedManifests = PUBLISHED_MOLDEA_MANIFESTS;
    const inspectionOptions = {
      downloadPublishedArtifact: async ({ manifest }) => ({
        ...createRecordedPackages([manifest])[0],
        tarballPath: `/temporary/${new URL(manifest.dist.tarball).pathname.split('/').at(-1)}`,
      }),
      downloadPublishedClosure: async ({ manifests }) =>
        createRecordedPackages(manifests).map((candidatePackage) => ({
          ...candidatePackage,
          tarballPath: `/temporary/${candidatePackage.tarballName}`,
        })),
      packagesRepository,
      resolvePublishedManifest: async ({ packageName, version }) => {
        if (packageName === PROFILE_RUNTIME_MANIFEST.name) {
          assert.equal(version, PROFILE_RUNTIME_MANIFEST.version);
          return PROFILE_RUNTIME_MANIFEST;
        }

        assert.equal(packageName, TYPESCRIPT_MANIFEST.name);
        assert.equal(version, TYPESCRIPT_MANIFEST.version);
        return TYPESCRIPT_MANIFEST;
      },
      resolvePublishedClosure: async () => publishedManifests,
    };
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), [
      'fixtures/semantic-evaluation-result.json is missing fresh semantic evidence.',
      'qualification/results/t1/latest.json is missing qualification evidence.',
    ]);

    const semanticCases = [
      createSemanticCase('release-host-a'),
      createSemanticCase('release-host-b'),
    ];
    const semanticCoverage = {
      schemaVersion: 1,
      claims: [
        {
          description: 'Release evidence retains exact per-trial semantic host provenance.',
          evidence: semanticCases.map(({ id }) => ({
            id,
            kind: 'semantic-case',
          })),
          id: 'release-host-provenance',
          rationale: 'Both release cases exercise one stable host contract across CLI versions.',
          sourcePaths: ['moldea/SKILL.md'],
        },
      ],
    };
    writeFile(
      temporaryRoot,
      'fixtures/conformance-cases.json',
      `${JSON.stringify({ semanticCases })}\n`,
    );
    writeFile(
      temporaryRoot,
      'fixtures/semantic-evaluation-coverage.json',
      `${JSON.stringify(semanticCoverage)}\n`,
    );
    const skillDigest = createPortableSkillDigest(temporaryRoot);
    const semanticGeneratedAt = '2026-08-21T09:00:00.000Z';
    const semanticHost = {
      model: 'gpt-5.6-sol',
      name: 'codex',
      reasoningEffort: 'medium',
      version: 'codex-cli test',
    };
    const updatedSemanticHost = {
      ...semanticHost,
      version: 'codex-cli updated',
    };
    const semanticHostContract = {
      model: semanticHost.model,
      name: semanticHost.name,
      reasoningEffort: semanticHost.reasoningEffort,
    };
    const semanticResults = semanticCases.map((caseDefinition, index) =>
      createSemanticTrial({
        caseDefinition,
        evaluatedAt: `2026-08-21T09:00:0${index}.000Z`,
        host: index === 0 ? semanticHost : updatedSemanticHost,
      }),
    );
    const semanticCandidate = {
      activeTrial: null,
      artifactDigest: skillDigest,
      caseSuiteDigest: createSemanticCaseSuiteDigest(semanticCases),
      cli: createSemanticCliIdentity(temporaryRoot),
      confirmations: [],
      coverageDigest: createSemanticCoverageDigest(semanticCoverage, semanticCases),
      evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
      generatedAt: semanticGeneratedAt,
      hostContract: semanticHostContract,
      results: semanticResults,
      schemaVersion: 6,
      updatedAt: semanticGeneratedAt,
    };
    const semanticCandidateText = `${JSON.stringify(semanticCandidate, null, 2)}\n`;
    const semanticAttempt = await recordSemanticEvaluationAttempt({
      evidenceKind: 'candidate',
      evidenceText: semanticCandidateText,
      recordedAt: '2026-08-21T09:00:01.000Z',
      resultsRoot: join(temporaryRoot, 'fixtures', 'semantic-evaluation-results'),
      stopReason: 'complete',
      totalCaseCount: semanticCases.length,
    });
    writeFile(
      temporaryRoot,
      'fixtures/semantic-evaluation-result.json',
      `${JSON.stringify({
        artifact: { sha256: skillDigest },
        artifactDigest: skillDigest,
        artifactSha256: skillDigest,
        cases: semanticResults.map(createPublicSemanticCase),
        caseHistories: semanticResults.map((result) => ({
          confirmations: [],
          id: result.id,
          initial: result,
          resolution: 'passed',
        })),
        skillDigest,
        caseSuiteDigest: semanticCandidate.caseSuiteDigest,
        cli: semanticCandidate.cli,
        confirmationPolicy: {
          requiredPassingConfirmations: 2,
          version: 1,
        },
        coverageDigest: semanticCandidate.coverageDigest,
        evaluatedAt: semanticGeneratedAt,
        evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
        generatedAt: semanticGeneratedAt,
        hostContract: semanticHostContract,
        results: semanticResults,
        schemaVersion: 6,
        semanticAttemptId: semanticAttempt.attemptId,
      })}\n`,
    );
    const semanticAttemptDirectory = join(
      temporaryRoot,
      'fixtures/semantic-evaluation-results/attempts',
      semanticAttempt.attemptId,
    );
    const semanticAttemptSource = readFileSync(join(semanticAttemptDirectory, 'attempt.json'));
    const semanticEvidenceSource = readFileSync(join(semanticAttemptDirectory, 'evidence.json'));
    writeFile(
      temporaryRoot,
      `fixtures/semantic-evaluation-results/attempts/${semanticAttempt.attemptId}/identity.json`,
      `${JSON.stringify({
        argumentDigest: '1'.repeat(64),
        attemptId: semanticAttempt.attemptId,
        attemptSha256: createHash('sha256').update(semanticAttemptSource).digest('hex'),
        cliClosureDigest: createCliClosureDigest(temporaryRoot),
        evidenceSha256: createHash('sha256').update(semanticEvidenceSource).digest('hex'),
        invocationId: '00000000-0000-4000-8000-000000000000',
        portableSkillBehaviorDigest: createPortableSkillBehaviorDigest(temporaryRoot),
        schemaVersion: 1,
        semanticCompatibilityDigest: createSemanticCompatibilityDigest(temporaryRoot),
        sourceCommit: '1'.repeat(40),
        sourceDigest: '2'.repeat(64),
      })}\n`,
    );
    const packagesState = await inspectGitRepositoryState(packagesRepository);
    const adapter = matrix.adapters.custom;
    const target = adapter.targets[0];
    const attemptId = 'custom-release-baseline';
    const qualificationArtifacts = join(temporaryRoot, '.qualification-artifacts');
    const passingFixture = await seedPassingQualificationEvidenceFixture({
      artifactDirectory: qualificationArtifacts,
      attemptId,
      hasOperationalRetry: true,
      hasSkippedInitialJudge: true,
      isRecovered: true,
      packages: createRecordedQualificationPackages(PUBLISHED_MOLDEA_MANIFESTS),
      packagesRepositoryCommit: packagesState.commit,
      packagesRepositoryFingerprint: packagesState.fingerprint,
      resultsRoot: join(temporaryRoot, 'qualification', 'results'),
      skillRepositoryFingerprint: await calculateDirectoryFingerprint(
        join(temporaryRoot, 'moldea'),
      ),
      targetDigest: calculateQualificationTargetDigest(adapter, target),
    });
    const skippedInitialJudgeStage = passingFixture.stages.find(
      ({ id }) => id === 'case:release-case:trial:initial:judge',
    );
    assert.ok(skippedInitialJudgeStage);
    skippedInitialJudgeStage.durationMs = 2;
    const qualificationDigest = await calculateQualificationExecutionDigest({
      caseIds: ['release-case'],
      profileDirectory: join(temporaryRoot, 'qualification/profiles/t1'),
      roots: {
        evaluationHostRoot: join(temporaryRoot, 'tooling/codex-evaluation-host'),
        packageCandidateRoot: join(temporaryRoot, 'tooling/package-candidate'),
        qualificationRoot: join(temporaryRoot, 'qualification'),
        repositoryRoot: temporaryRoot,
      },
    });
    await recordQualificationResult(
      {
        artifactDirectory: qualificationArtifacts,
        result: {
          ...passingFixture,
          provenance: {
            ...passingFixture.provenance,
            qualificationDigest,
          },
        },
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      join(temporaryRoot, 'qualification', 'results'),
    );
    rmSync(qualificationArtifacts, { force: true, recursive: true });

    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const metadataSources = new Map(
      [
        ['package.json', '3.1.0', '3.1.1'],
        ['package-lock.json', '3.1.0', '3.1.1'],
        ['moldea/SKILL.md', '4.0.0', '4.0.1'],
        ['moldea/references/local-tooling.md', '4.0.0', '4.0.1'],
      ].map(([relativePath, currentVersion, nextVersion]) => {
        const absolutePath = join(temporaryRoot, ...relativePath.split('/'));
        const source = readFileSync(absolutePath, 'utf8');
        writeFileSync(absolutePath, source.replaceAll(currentVersion, nextVersion), 'utf8');
        return [absolutePath, source];
      }),
    );
    const metadataOnlyIssues = await inspectReleaseEvidence(temporaryRoot, inspectionOptions);
    const compatibleSemanticIdentity = readSemanticAttemptIdentity(
      temporaryRoot,
      semanticAttempt.attemptId,
    );
    assert.ok(compatibleSemanticIdentity);
    assert.equal(
      compatibleSemanticIdentity.cliClosureDigest,
      createCliClosureDigest(temporaryRoot),
    );
    assert.equal(
      compatibleSemanticIdentity.portableSkillBehaviorDigest,
      createPortableSkillBehaviorDigest(temporaryRoot),
    );
    assert.equal(
      compatibleSemanticIdentity.semanticCompatibilityDigest,
      createSemanticCompatibilityDigest(temporaryRoot),
    );
    assert.deepEqual(metadataOnlyIssues, []);
    const semanticRunnerPath = join(temporaryRoot, 'tests/semantic-evaluation-runner.mjs');
    const exactSemanticRunner = readFileSync(semanticRunnerPath);
    writeFileSync(
      semanticRunnerPath,
      Buffer.concat([exactSemanticRunner, Buffer.from('\n// changed semantic input\n')]),
    );
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).some((issue) =>
        issue.startsWith('fixtures/'),
      ),
    );
    writeFileSync(semanticRunnerPath, exactSemanticRunner);
    for (const [absolutePath, source] of metadataSources) {
      writeFileSync(absolutePath, source, 'utf8');
    }
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const historicalAttemptDirectory = getQualificationAttemptDirectory(temporaryRoot, attemptId);
    const historicalAttempt = JSON.parse(
      readFileSync(join(historicalAttemptDirectory, 'attempt.json'), 'utf8'),
    );
    const historicalStorage = QualificationAttemptStorageSchema.parse(
      JSON.parse(readFileSync(join(historicalAttemptDirectory, 'storage.json'), 'utf8')),
    );
    const historicalStoragePath = join(historicalAttemptDirectory, 'storage.json');
    writeFileSync(
      historicalStoragePath,
      `${JSON.stringify({
        ...historicalStorage,
        portableSkillBehaviorDigest: '0'.repeat(64),
      })}\n`,
      'utf8',
    );
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t1/latest.json does not match the current release inputs.',
      ),
    );
    writeFileSync(historicalStoragePath, `${JSON.stringify(historicalStorage)}\n`, 'utf8');
    const historicalPackages = [...historicalAttempt.provenance.packages].sort(
      ({ name: left }, { name: right }) => left.localeCompare(right, 'en'),
    );
    const candidateCliClosureDigest = createCliClosureDigest(temporaryRoot);
    const candidatePortableSkillBehaviorDigest = createPortableSkillBehaviorDigest(temporaryRoot);
    const candidateSemanticCompatibilityDigest = createSemanticCompatibilityDigest(temporaryRoot);
    const historicalAttestation = {
      semantic: {
        cliClosureDigest: candidateCliClosureDigest,
        portableSkillBehaviorDigest: candidatePortableSkillBehaviorDigest,
        semanticCompatibilityDigest: candidateSemanticCompatibilityDigest,
      },
      qualification: {
        envelopes: [
          {
            attemptId: historicalAttempt.attemptId,
            status: 'passed',
            selection: historicalAttempt.selection,
            compatibility: historicalStorage.compatibility,
            targetCompatibilityDigest: historicalAttempt.provenance.targetDigest,
            portableSkillBehaviorDigest: candidatePortableSkillBehaviorDigest,
            cliClosureDigest: candidateCliClosureDigest,
            environment: {
              model: historicalAttempt.provenance.model,
              reasoningEffort: historicalAttempt.provenance.reasoningEffort,
            },
            packages: historicalPackages,
            baselineAttemptId: null,
            baselineReplay: 'not-required',
            completedAt: historicalAttempt.completedAt,
            createdAt: historicalAttempt.createdAt,
          },
        ],
      },
    };
    const carryForwardPath = join(
      temporaryRoot,
      'fixtures/release-evidence/carry-forward-4.0.1.json',
    );
    mkdirSync(dirname(carryForwardPath), { recursive: true });
    writeFileSync(carryForwardPath, '{}\n');
    const historicalInspectionOptions = {
      ...inspectionOptions,
      verifyCarryForwardSourceAttestation: async () => historicalAttestation,
    };
    const currentQualificationCopy = join(temporaryRoot, '.current-qualification-result');
    cpSync(join(temporaryRoot, 'qualification/results/t1'), currentQualificationCopy, {
      recursive: true,
    });
    rmSync(join(temporaryRoot, 'qualification/results/t1'), {
      force: true,
      recursive: true,
    });
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, historicalInspectionOptions), []);

    for (const mutateAttestation of [
      (candidate) => {
        candidate.qualification.envelopes[0].portableSkillBehaviorDigest = '0'.repeat(64);
      },
      (candidate) => {
        candidate.qualification.envelopes[0].cliClosureDigest = '0'.repeat(64);
      },
      (candidate) => {
        candidate.qualification.envelopes[0].compatibility.qualificationEvaluatorDigest =
          '0'.repeat(64);
      },
      (candidate) => {
        candidate.qualification.envelopes[0].compatibility.qualificationLogicalInputDigest =
          '0'.repeat(64);
      },
      (candidate) => {
        candidate.qualification.envelopes[0].compatibility.qualificationBaselineEvaluatorDigest =
          '0'.repeat(64);
      },
      (candidate) => {
        candidate.qualification.envelopes[0].targetCompatibilityDigest = '0'.repeat(64);
      },
      (candidate) => {
        candidate.qualification.envelopes[0].environment.model = 'changed-model';
      },
      (candidate) => {
        candidate.qualification.envelopes[0].packages[0].sha256 = '0'.repeat(64);
      },
      (candidate) => {
        candidate.qualification.envelopes[0].baselineReplay = 'passed';
      },
    ]) {
      const incompatibleAttestation = structuredClone(historicalAttestation);
      mutateAttestation(incompatibleAttestation);
      const incompatibleIssues = await inspectReleaseEvidence(temporaryRoot, {
        ...inspectionOptions,
        verifyCarryForwardSourceAttestation: async () => incompatibleAttestation,
      });
      assert.ok(
        incompatibleIssues.includes(
          'qualification/results/t1/latest.json is missing qualification evidence.',
        ),
      );
    }

    cpSync(currentQualificationCopy, join(temporaryRoot, 'qualification/results/t1'), {
      recursive: true,
    });
    rmSync(currentQualificationCopy, { force: true, recursive: true });
    const incompatibleAttestation = structuredClone(historicalAttestation);
    incompatibleAttestation.qualification.envelopes[0].compatibility.qualificationEvaluatorDigest =
      '0'.repeat(64);
    assert.deepEqual(
      await inspectReleaseEvidence(temporaryRoot, {
        ...inspectionOptions,
        verifyCarryForwardSourceAttestation: async () => incompatibleAttestation,
      }),
      [],
    );
    const currentSemanticResultPath = join(
      temporaryRoot,
      'fixtures/semantic-evaluation-result.json',
    );
    const currentSemanticResult = readFileSync(currentSemanticResultPath);
    rmSync(currentSemanticResultPath);
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, historicalInspectionOptions), []);
    writeFileSync(currentSemanticResultPath, '{}\n');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, historicalInspectionOptions)).includes(
        'fixtures/semantic-evaluation-result.json does not use the exact semantic result fields.',
      ),
    );
    rmSync(currentSemanticResultPath);
    const incompatibleSemanticAttestation = structuredClone(historicalAttestation);
    incompatibleSemanticAttestation.semantic.portableSkillBehaviorDigest = '0'.repeat(64);
    assert.ok(
      (
        await inspectReleaseEvidence(temporaryRoot, {
          ...inspectionOptions,
          verifyCarryForwardSourceAttestation: async () => incompatibleSemanticAttestation,
        })
      ).includes('fixtures/semantic-evaluation-result.json is missing fresh semantic evidence.'),
    );
    writeFileSync(
      semanticRunnerPath,
      Buffer.concat([exactSemanticRunner, Buffer.from('\n// changed semantic input\n')]),
    );
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, historicalInspectionOptions)).includes(
        'fixtures/semantic-evaluation-result.json is missing fresh semantic evidence.',
      ),
    );
    writeFileSync(semanticRunnerPath, exactSemanticRunner);
    writeFileSync(currentSemanticResultPath, currentSemanticResult);
    rmSync(carryForwardPath);

    const semanticResultPath = join(temporaryRoot, 'fixtures/semantic-evaluation-result.json');
    const exactSemanticResult = JSON.parse(readFileSync(semanticResultPath, 'utf8'));
    const mismatchedSemanticResult = structuredClone(exactSemanticResult);
    mismatchedSemanticResult.caseHistories[1].initial.actorHost.version = 'codex-cli tampered';
    writeFileSync(semanticResultPath, `${JSON.stringify(mismatchedSemanticResult)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'fixtures/semantic-evaluation-result.json does not match the newest immutable passing semantic attempt.',
      ),
    );
    writeFileSync(semanticResultPath, `${JSON.stringify(exactSemanticResult)}\n`, 'utf8');
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const semanticResultWithUnsupportedField = {
      ...exactSemanticResult,
      unsupportedField: true,
    };
    writeFileSync(
      semanticResultPath,
      `${JSON.stringify(semanticResultWithUnsupportedField)}\n`,
      'utf8',
    );
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'fixtures/semantic-evaluation-result.json does not use the exact semantic result fields.',
      ),
    );
    writeFileSync(semanticResultPath, `${JSON.stringify(exactSemanticResult)}\n`, 'utf8');
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const mismatchedSelectedResult = structuredClone(exactSemanticResult);
    for (const collectionName of ['cases', 'results']) {
      mismatchedSelectedResult[collectionName][1].actorHost.version = 'codex-cli tampered';
      mismatchedSelectedResult[collectionName][1].judgeHost.version = 'codex-cli tampered';
    }
    writeFileSync(semanticResultPath, `${JSON.stringify(mismatchedSelectedResult)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'fixtures/semantic-evaluation-result.json does not contain every current passing case.',
      ),
    );
    writeFileSync(semanticResultPath, `${JSON.stringify(exactSemanticResult)}\n`, 'utf8');
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const mismatchedCommandPolicyResult = structuredClone(exactSemanticResult);
    mismatchedCommandPolicyResult.cases[0].actorCommandPolicyEvidence.packageManagerInvocationCount = 1;
    writeFileSync(semanticResultPath, `${JSON.stringify(mismatchedCommandPolicyResult)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'fixtures/semantic-evaluation-result.json does not contain every current passing case.',
      ),
    );
    writeFileSync(semanticResultPath, `${JSON.stringify(exactSemanticResult)}\n`, 'utf8');
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const laterFailedCandidate = {
      ...semanticCandidate,
      generatedAt: '2026-08-21T09:10:00.000Z',
      results: [
        {
          actorCommandPolicyEvidence: {
            completedCommandCount: 0,
            indeterminateCommandCount: 0,
            packageManagerExecution: 'not-observed',
            packageManagerInvocationCount: 0,
          },
          actorHost: semanticHost,
          evaluatedAt: '2026-08-21T09:10:00.000Z',
          forbidden: [],
          id: 'later-failed-case',
          judgeHost: semanticHost,
          observed: [],
          passed: false,
          rationale: 'The later attempt did not satisfy the required behavior.',
        },
      ],
      updatedAt: '2026-08-21T09:10:00.000Z',
    };
    const laterFailedAttempt = await recordSemanticEvaluationAttempt({
      evidenceKind: 'candidate',
      evidenceText: `${JSON.stringify(laterFailedCandidate, null, 2)}\n`,
      recordedAt: '2026-08-21T09:10:01.000Z',
      resultsRoot: join(temporaryRoot, 'fixtures', 'semantic-evaluation-results'),
      stopReason: 'case-failure',
      totalCaseCount: 1,
    });
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'fixtures/semantic-evaluation-result.json does not match the newest immutable passing semantic attempt.',
      ),
    );
    rmSync(
      join(
        temporaryRoot,
        'fixtures/semantic-evaluation-results/attempts',
        laterFailedAttempt.attemptId,
      ),
      { force: true, recursive: true },
    );
    await recordSemanticEvaluationAttempt({
      evidenceKind: 'candidate',
      evidenceText: semanticCandidateText,
      recordedAt: '2026-08-21T09:00:01.000Z',
      resultsRoot: join(temporaryRoot, 'fixtures', 'semantic-evaluation-results'),
      stopReason: 'complete',
      totalCaseCount: semanticCases.length,
    });
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const attemptPath = join(
      getQualificationAttemptDirectory(temporaryRoot, attemptId),
      'attempt.json',
    );
    const exactAttempt = JSON.parse(readFileSync(attemptPath, 'utf8'));
    const invalidRetryAttempt = structuredClone(exactAttempt);
    const actorRetryStage = invalidRetryAttempt.stages.find(
      ({ id }) => id === 'case:release-case:trial:initial:actor',
    );
    actorRetryStage.operationalRetries[0].retryDelayMs = 0;
    writeFileSync(attemptPath, `${JSON.stringify(invalidRetryAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).some((issue) =>
        issue.includes('Operational retry delay does not match the bounded backoff policy.'),
      ),
    );
    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);

    const actorOutputPath = getQualificationArtifactPath(
      temporaryRoot,
      attemptId,
      'cases/release-case/trials/initial/actor-output.json',
    );
    const exactActorOutput = readFileSync(actorOutputPath, 'utf8');
    const malformedActorOutput = '{}\n';
    const malformedArtifactAttempt = structuredClone(exactAttempt);
    malformedArtifactAttempt.artifactDigests[
      'cases/release-case/trials/initial/actor-output.json'
    ] = createHash('sha256').update(malformedActorOutput).digest('hex');
    writeFileSync(actorOutputPath, malformedActorOutput, 'utf8');
    writeFileSync(attemptPath, `${JSON.stringify(malformedArtifactAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).some((issue) =>
        issue.startsWith('qualification/results/t1/attempts/a-'),
      ),
    );
    writeFileSync(actorOutputPath, exactActorOutput, 'utf8');
    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);

    for (const role of ['actor', 'judge']) {
      const relativeEvidencePath = `cases/release-case/trials/confirmation-1/${role}-evidence.json`;
      const evidencePath = getQualificationArtifactPath(
        temporaryRoot,
        attemptId,
        relativeEvidencePath,
      );
      const exactEvidence = readFileSync(evidencePath, 'utf8');
      const observedEvidence = JSON.parse(exactEvidence);
      observedEvidence.commandPolicy.completedCommandCount = 1;
      observedEvidence.commandPolicy.sensitiveAccess = {
        status: 'observed',
        observedCount: 1,
        indeterminateCount: 0,
      };
      const observedEvidenceContent = `${JSON.stringify(observedEvidence)}\n`;
      const observedPolicyAttempt = structuredClone(exactAttempt);
      observedPolicyAttempt.artifactDigests[relativeEvidencePath] = createHash('sha256')
        .update(observedEvidenceContent)
        .digest('hex');
      writeFileSync(evidencePath, observedEvidenceContent, 'utf8');
      writeFileSync(attemptPath, `${JSON.stringify(observedPolicyAttempt)}\n`, 'utf8');
      synchronizeQualificationStorage(temporaryRoot, attemptId);
      assert.ok(
        (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).some((issue) =>
          issue.startsWith('qualification/results/t1/attempts/a-'),
        ),
      );
      writeFileSync(evidencePath, exactEvidence, 'utf8');
      writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');
      synchronizeQualificationStorage(temporaryRoot, attemptId);
    }

    const deterministicAfterPath = getQualificationArtifactPath(
      temporaryRoot,
      attemptId,
      'cases/release-case/trials/initial/deterministic-after.json',
    );
    const exactDeterministicAfter = readFileSync(deterministicAfterPath, 'utf8');
    const contradictoryDeterministicAfter = JSON.parse(exactDeterministicAfter);
    contradictoryDeterministicAfter.summary.coreValid = false;
    const contradictoryDeterministicContent = `${JSON.stringify(contradictoryDeterministicAfter)}\n`;
    const contradictoryAttempt = structuredClone(exactAttempt);
    contradictoryAttempt.artifactDigests[
      'cases/release-case/trials/initial/deterministic-after.json'
    ] = createHash('sha256').update(contradictoryDeterministicContent).digest('hex');
    writeFileSync(deterministicAfterPath, contradictoryDeterministicContent, 'utf8');
    writeFileSync(attemptPath, `${JSON.stringify(contradictoryAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t1/latest.json does not contain every current passing case artifact.',
      ),
    );
    writeFileSync(deterministicAfterPath, exactDeterministicAfter, 'utf8');
    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);

    const staleTargetAttempt = structuredClone(exactAttempt);
    staleTargetAttempt.provenance.targetDigest = 'f'.repeat(64);
    writeFileSync(attemptPath, `${JSON.stringify(staleTargetAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t1/latest.json does not match the current release inputs.',
      ),
    );

    const incompleteClosureAttempt = structuredClone(exactAttempt);
    incompleteClosureAttempt.provenance.packages =
      incompleteClosureAttempt.provenance.packages.filter(({ name }) => name !== '@moldea.ai/core');
    writeFileSync(attemptPath, `${JSON.stringify(incompleteClosureAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t1/latest.json does not match the current release inputs.',
      ),
    );

    const mismatchedCompilerAttempt = structuredClone(exactAttempt);
    const compilerPackage = mismatchedCompilerAttempt.provenance.packages.find(
      ({ name }) => name === 'typescript',
    );
    assert.ok(compilerPackage);
    compilerPackage.sha256 = 'f'.repeat(64);
    writeFileSync(attemptPath, `${JSON.stringify(mismatchedCompilerAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t1/latest.json does not match the current release inputs.',
      ),
    );

    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, attemptId);
    const toolingManifestPath = join(temporaryRoot, 'package.json');
    const toolingLockPath = join(temporaryRoot, 'package-lock.json');
    const exactToolingManifest = readFileSync(toolingManifestPath, 'utf8');
    const exactToolingLock = readFileSync(toolingLockPath, 'utf8');
    const changedToolingManifest = JSON.parse(exactToolingManifest);
    const changedToolingLock = JSON.parse(exactToolingLock);
    changedToolingManifest.devDependencies.semver = '7.9.0';
    changedToolingLock.packages[''].devDependencies.semver = '7.9.0';
    changedToolingLock.packages['node_modules/semver'] = {
      dev: true,
      integrity: 'sha512-changed-tooling-semver-integrity',
      version: '7.9.0',
    };
    writeFileSync(toolingManifestPath, `${JSON.stringify(changedToolingManifest)}\n`, 'utf8');
    writeFileSync(toolingLockPath, `${JSON.stringify(changedToolingLock)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t1/latest.json does not match the current release inputs.',
      ),
    );
    writeFileSync(toolingManifestPath, exactToolingManifest, 'utf8');
    writeFileSync(toolingLockPath, exactToolingLock, 'utf8');

    const matrixPath = join(packagesRepository, 'compatibility', 'runtimes.yaml');
    const matrixContent = readFileSync(matrixPath, 'utf8');
    writeFileSync(matrixPath, `${matrixContent.trimEnd()}\n\n`, 'utf8');
    const stalePackagesIssues = await inspectReleaseEvidence(temporaryRoot, inspectionOptions);
    assert.ok(
      stalePackagesIssues.includes(
        'The packages repository used for release evidence has uncommitted changes.',
      ),
    );
    assert.ok(
      !stalePackagesIssues.includes(
        'qualification/results/t1/latest.json does not match the current release inputs.',
      ),
    );
    writeFileSync(matrixPath, matrixContent, 'utf8');

    cpSync(
      join(temporaryRoot, 'qualification/profiles/t1'),
      join(temporaryRoot, 'qualification/profiles/t2'),
      { recursive: true },
    );
    writeFile(
      temporaryRoot,
      'qualification/profiles/index.yaml',
      [
        'version: 1',
        'targets:',
        '  - key: t1',
        '    adapterId: custom',
        '    implementationId: custom',
        '  - key: t2',
        '    adapterId: external',
        '    implementationId: external-stream',
        '',
      ].join('\n'),
    );
    writeFile(
      temporaryRoot,
      'qualification/profiles/t2/profile.yaml',
      [
        'version: 2',
        'adapterId: external',
        'implementationId: external-stream',
        'title: External qualification',
        'description: Release evidence baseline fixture.',
        'runtimePackages:',
        `  - name: ${PROFILE_RUNTIME_MANIFEST.name}`,
        `    version: ${PROFILE_RUNTIME_MANIFEST.version}`,
        'probesFile: probes/claims.yaml',
        'cases:',
        '  - id: release-case',
        '    projectDirectory: cases/c1',
        '    scenarioFile: scenario.yaml',
        '',
      ].join('\n'),
    );
    writeFile(
      temporaryRoot,
      'qualification/profiles/t2/probes/claims.yaml',
      [
        'version: 2',
        'adapterId: external',
        'implementationId: external-stream',
        'probes:',
        '  - id: support-gate',
        '    kind: support-gate',
        '    matrixPath: qualification.support-gate',
        '    description: Complete fixture coverage.',
        '    coveredBy:',
        '      - release-case',
        '',
      ].join('\n'),
    );
    matrix.adapters.external = {
      implementationStatus: 'available',
      implementation: {
        distribution: 'package',
        kind: 'adapter',
        package: '@moldea.ai/adapter-external',
      },
      targets: [
        {
          id: 'external-stream',
          kind: 'stream',
          language: 'typescript',
          lastVerifiedAt: '2026-08-21',
        },
      ],
    };
    writeFileSync(matrixPath, `${JSON.stringify(matrix)}\n`, 'utf8');
    execFileSync('git', ['add', '.'], { cwd: packagesRepository });
    execFileSync('git', ['commit', '--quiet', '-m', 'test: add external adapter'], {
      cwd: packagesRepository,
    });
    publishedManifests = [
      ...PUBLISHED_MOLDEA_MANIFESTS,
      {
        name: '@moldea.ai/adapter-external',
        version: '1.0.0',
        dist: {
          integrity: 'sha512-external-release-integrity',
          shasum: '3'.repeat(40),
          tarball:
            'https://registry.npmjs.org/@moldea.ai/adapter-external/-/adapter-external-1.0.0.tgz',
        },
      },
    ];
    const issuesAfterUnrelatedAdapterAddition = await inspectReleaseEvidence(
      temporaryRoot,
      inspectionOptions,
    );
    assert.ok(
      issuesAfterUnrelatedAdapterAddition.includes(
        'qualification/results/t2/latest.json is missing qualification evidence.',
      ),
    );
    assert.ok(
      !issuesAfterUnrelatedAdapterAddition.includes(
        'qualification/results/t1/latest.json does not match the current release inputs.',
      ),
    );

    const externalAttemptId = 'external-release-attempt';
    const externalArtifacts = join(temporaryRoot, '.qualification-external-artifacts');
    copyQualificationArtifacts(temporaryRoot, attemptId, externalArtifacts);
    const externalBaselinePath = join(externalArtifacts, 'baseline.json');
    const externalBaselineContent = `${JSON.stringify({
      required: true,
      passed: true,
      status: 'passed',
      baselineAttemptId: attemptId,
      failures: [],
    })}\n`;
    writeFileSync(externalBaselinePath, externalBaselineContent, 'utf8');
    const externalAttempt = structuredClone(exactAttempt);
    externalAttempt.attemptId = externalAttemptId;
    externalAttempt.selection = {
      adapterId: 'external',
      implementationId: 'external-stream',
    };
    externalAttempt.provenance.profileDigest = await calculateQualificationProfileDigest(
      join(temporaryRoot, 'qualification', 'profiles', 't2'),
    );
    externalAttempt.provenance.qualificationDigest = await calculateQualificationExecutionDigest({
      caseIds: ['release-case'],
      profileDirectory: join(temporaryRoot, 'qualification/profiles/t2'),
      roots: {
        evaluationHostRoot: join(temporaryRoot, 'tooling/codex-evaluation-host'),
        packageCandidateRoot: join(temporaryRoot, 'tooling/package-candidate'),
        qualificationRoot: join(temporaryRoot, 'qualification'),
        repositoryRoot: temporaryRoot,
      },
    });
    externalAttempt.provenance.targetDigest = calculateQualificationTargetDigest(
      matrix.adapters.external,
      matrix.adapters.external.targets[0],
    );
    externalAttempt.provenance.packages = createRecordedQualificationPackages(publishedManifests, [
      PROFILE_RUNTIME_MANIFEST,
    ]);
    externalAttempt.provenance.baselineAttemptId = attemptId;
    externalAttempt.artifactDigests['baseline.json'] = createHash('sha256')
      .update(externalBaselineContent)
      .digest('hex');
    for (const trialId of ['initial', 'confirmation-1', 'confirmation-2']) {
      const roles = trialId === 'initial' ? ['actor'] : ['actor', 'judge'];
      for (const role of roles) {
        const relativeEvidencePath = `cases/release-case/trials/${trialId}/${role}-evidence.json`;
        const evidencePath = join(externalArtifacts, relativeEvidencePath);
        const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
        evidence.sourceAttemptId = externalAttemptId;
        const evidenceContent = `${JSON.stringify(evidence, null, 2)}\n`;
        writeFileSync(evidencePath, evidenceContent, 'utf8');
      }
    }
    await recordQualificationResult(
      {
        artifactDirectory: externalArtifacts,
        result: externalAttempt,
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      join(temporaryRoot, 'qualification', 'results'),
    );
    rmSync(externalArtifacts, { force: true, recursive: true });
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const replacementBaselineArtifacts = join(
      temporaryRoot,
      '.qualification-replacement-baseline-artifacts',
    );
    const replacementBaseline = await seedPassingQualificationEvidenceFixture({
      artifactDirectory: replacementBaselineArtifacts,
      attemptId: 'zz-current-custom-baseline',
      packages: createRecordedQualificationPackages(PUBLISHED_MOLDEA_MANIFESTS),
      packagesRepositoryCommit: (await inspectGitRepositoryState(packagesRepository)).commit,
      qualificationDigest,
      resultsRoot: join(temporaryRoot, 'qualification', 'results'),
      skillRepositoryFingerprint: await calculateDirectoryFingerprint(
        join(temporaryRoot, 'moldea'),
      ),
      targetDigest: calculateQualificationTargetDigest(adapter, target),
    });
    writeFile(
      temporaryRoot,
      'qualification/profiles/index.yaml',
      [
        'version: 1',
        'targets:',
        '  - key: t1',
        '    adapterId: custom',
        '    implementationId: custom',
        '  - key: t2',
        '    adapterId: external',
        '    implementationId: external-stream',
        '',
      ].join('\n'),
    );
    await recordQualificationResult(
      {
        artifactDirectory: replacementBaselineArtifacts,
        result: replacementBaseline,
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      join(temporaryRoot, 'qualification', 'results'),
    );
    rmSync(replacementBaselineArtifacts, { force: true, recursive: true });
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const staleBaselineContent = `${JSON.stringify({
      required: true,
      passed: true,
      status: 'passed',
      baselineAttemptId: 'stale-custom-attempt',
      failures: [],
    })}\n`;
    const recordedExternalBaselinePath = getQualificationArtifactPath(
      temporaryRoot,
      externalAttemptId,
      'baseline.json',
      't2',
    );
    const externalAttemptPath = join(
      getQualificationAttemptDirectory(temporaryRoot, externalAttemptId, 't2'),
      'attempt.json',
    );
    const recordedExternalAttempt = JSON.parse(readFileSync(externalAttemptPath, 'utf8'));
    writeFileSync(recordedExternalBaselinePath, staleBaselineContent, 'utf8');
    recordedExternalAttempt.provenance.baselineAttemptId = 'stale-custom-attempt';
    recordedExternalAttempt.artifactDigests['baseline.json'] = createHash('sha256')
      .update(staleBaselineContent)
      .digest('hex');
    writeFileSync(externalAttemptPath, `${JSON.stringify(recordedExternalAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, externalAttemptId, 't2');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t2/latest.json does not reference a committed passing Custom baseline.',
      ),
    );

    const replacementBaselineAttemptPath = join(
      getQualificationAttemptDirectory(temporaryRoot, 'zz-current-custom-baseline'),
      'attempt.json',
    );
    const incompleteAttempt = JSON.parse(readFileSync(replacementBaselineAttemptPath, 'utf8'));
    incompleteAttempt.cases = [];
    writeFileSync(replacementBaselineAttemptPath, `${JSON.stringify(incompleteAttempt)}\n`, 'utf8');
    synchronizeQualificationStorage(temporaryRoot, 'zz-current-custom-baseline');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/t1/latest.json does not contain every current passing case artifact.',
      ),
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
