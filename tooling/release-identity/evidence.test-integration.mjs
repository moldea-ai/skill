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
import { createSemanticCliIdentity } from './identity.mjs';
import {
  createPortableSkillDigest,
  createRepositoryControlEvidence,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  recordSemanticEvaluationAttempt,
} from '../semantic-evaluation/index.mjs';
import {
  calculateCompatibilityBehaviorDigest,
  calculateQualificationDigest,
} from '../../qualification/src/execution/fingerprints.ts';
import { calculateDirectoryFingerprint } from '../../qualification/src/filesystem/index.ts';
import { inspectGitRepositoryState } from '../../qualification/src/repository-state/index.ts';
import { recordQualificationResult } from '../../qualification/src/result/index.ts';
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

const writeFile = (root, relativePath, content) => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
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

const createRecordedQualificationPackages = (publishedManifests) =>
  createRecordedPackages([...publishedManifests, TYPESCRIPT_MANIFEST]);

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
      devDependencies: { '@moldea.ai/cli': '4.0.0' },
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
          devDependencies: { '@moldea.ai/cli': '4.0.0' },
          version: '3.1.0',
        },
        'node_modules/@moldea.ai/cli': {
          integrity: 'sha512-release-integrity',
          version: '4.0.0',
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
    'qualification/profiles/custom/custom/profile.yaml',
    [
      'version: 1',
      'adapterId: custom',
      'implementationId: custom',
      'title: Custom qualification',
      'description: Release evidence fixture.',
      'probesFile: probes/claims.yaml',
      'cases:',
      '  - id: release-case',
      '    projectDirectory: projects/release-case',
      '    scenarioFile: scenario.yaml',
      '',
    ].join('\n'),
  );
  writeFile(
    root,
    'qualification/cases/cases.yaml',
    [
      'version: 1',
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
  writeFile(root, 'tooling/codex-evaluation-host/fixture.mjs', 'export const fixture = true;\n');
  writeFile(root, 'tooling/package-candidate/fixture.mjs', 'export const fixture = true;\n');
  writeFile(root, 'moldea/SKILL.md', '# Moldea fixture\n');
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
        assert.equal(packageName, TYPESCRIPT_MANIFEST.name);
        assert.equal(version, TYPESCRIPT_MANIFEST.version);
        return TYPESCRIPT_MANIFEST;
      },
      resolvePublishedClosure: async () => publishedManifests,
    };
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), [
      'fixtures/semantic-evaluation-result.json is missing fresh semantic evidence.',
      'qualification/results/custom/custom/latest.json is missing qualification evidence.',
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
        evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
        hostContract: semanticHostContract,
        results: semanticResults,
        schemaVersion: 6,
        semanticAttemptId: semanticAttempt.attemptId,
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
      isRecovered: true,
      packages: createRecordedQualificationPackages(PUBLISHED_MOLDEA_MANIFESTS),
      packagesRepositoryCommit: packagesState.commit,
      packagesRepositoryFingerprint: packagesState.fingerprint,
      resultsRoot: join(temporaryRoot, 'qualification', 'results'),
      skillRepositoryFingerprint: await calculateDirectoryFingerprint(
        join(temporaryRoot, 'moldea'),
      ),
      targetDigest: calculateCompatibilityBehaviorDigest({ adapter, target }),
    });
    const qualificationDigest = await calculateQualificationDigest([
      {
        pathPrefix: 'qualification',
        rootDirectory: join(temporaryRoot, 'qualification'),
        excludedDirectoryNames: new Set(['node_modules']),
        excludedRelativePathPrefixes: ['results'],
      },
      {
        pathPrefix: 'tooling/codex-evaluation-host',
        rootDirectory: join(temporaryRoot, 'tooling', 'codex-evaluation-host'),
      },
      {
        pathPrefix: 'tooling/package-candidate',
        rootDirectory: join(temporaryRoot, 'tooling', 'package-candidate'),
      },
    ]);
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
      temporaryRoot,
      'qualification/results/custom/custom/attempts',
      attemptId,
      'attempt.json',
    );
    const exactAttempt = JSON.parse(readFileSync(attemptPath, 'utf8'));
    const invalidRetryAttempt = structuredClone(exactAttempt);
    const actorRetryStage = invalidRetryAttempt.stages.find(
      ({ id }) => id === 'case:release-case:trial:initial:actor',
    );
    actorRetryStage.operationalRetries[0].retryDelayMs = 0;
    writeFileSync(attemptPath, `${JSON.stringify(invalidRetryAttempt)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).some((issue) =>
        issue.includes('Operational retry delay does not match the bounded backoff policy.'),
      ),
    );
    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');

    const actorOutputPath = join(
      temporaryRoot,
      'qualification/results/custom/custom/attempts',
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
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).some((issue) =>
        issue.startsWith(
          'qualification/results/custom/custom/attempts/custom-release-baseline is invalid:',
        ),
      ),
    );
    writeFileSync(actorOutputPath, exactActorOutput, 'utf8');
    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');

    const deterministicAfterPath = join(
      temporaryRoot,
      'qualification/results/custom/custom/attempts',
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
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/custom/custom/latest.json does not contain every current passing case artifact.',
      ),
    );
    writeFileSync(deterministicAfterPath, exactDeterministicAfter, 'utf8');
    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');

    const staleTargetAttempt = structuredClone(exactAttempt);
    staleTargetAttempt.provenance.targetDigest = 'f'.repeat(64);
    writeFileSync(attemptPath, `${JSON.stringify(staleTargetAttempt)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/custom/custom/latest.json does not match the current release inputs.',
      ),
    );

    const incompleteClosureAttempt = structuredClone(exactAttempt);
    incompleteClosureAttempt.provenance.packages =
      incompleteClosureAttempt.provenance.packages.filter(({ name }) => name !== '@moldea.ai/core');
    writeFileSync(attemptPath, `${JSON.stringify(incompleteClosureAttempt)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/custom/custom/latest.json does not match the current release inputs.',
      ),
    );

    const mismatchedCompilerAttempt = structuredClone(exactAttempt);
    const compilerPackage = mismatchedCompilerAttempt.provenance.packages.find(
      ({ name }) => name === 'typescript',
    );
    assert.ok(compilerPackage);
    compilerPackage.sha256 = 'f'.repeat(64);
    writeFileSync(attemptPath, `${JSON.stringify(mismatchedCompilerAttempt)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/custom/custom/latest.json does not match the current release inputs.',
      ),
    );

    writeFileSync(attemptPath, `${JSON.stringify(exactAttempt)}\n`, 'utf8');
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
      stalePackagesIssues.includes(
        'qualification/results/custom/custom/latest.json does not match the current release inputs.',
      ),
    );
    writeFileSync(matrixPath, matrixContent, 'utf8');

    cpSync(
      join(temporaryRoot, 'qualification/profiles/custom/custom'),
      join(temporaryRoot, 'qualification/profiles/external/external-stream'),
      { recursive: true },
    );
    writeFile(
      temporaryRoot,
      'qualification/profiles/external/external-stream/profile.yaml',
      [
        'version: 1',
        'adapterId: external',
        'implementationId: external-stream',
        'title: External qualification',
        'description: Release evidence baseline fixture.',
        'probesFile: probes/claims.yaml',
        'cases:',
        '  - id: release-case',
        '    projectDirectory: projects/release-case',
        '    scenarioFile: scenario.yaml',
        '',
      ].join('\n'),
    );
    writeFile(
      temporaryRoot,
      'qualification/profiles/external/external-stream/probes/claims.yaml',
      [
        'version: 1',
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
    const updatedQualificationDigest = await calculateQualificationDigest([
      {
        pathPrefix: 'qualification',
        rootDirectory: join(temporaryRoot, 'qualification'),
        excludedDirectoryNames: new Set(['node_modules']),
        excludedRelativePathPrefixes: ['results'],
      },
      {
        pathPrefix: 'tooling/codex-evaluation-host',
        rootDirectory: join(temporaryRoot, 'tooling', 'codex-evaluation-host'),
      },
      {
        pathPrefix: 'tooling/package-candidate',
        rootDirectory: join(temporaryRoot, 'tooling', 'package-candidate'),
      },
    ]);
    const updatedPackagesState = await inspectGitRepositoryState(packagesRepository);
    const updatedCustomAttempt = JSON.parse(readFileSync(attemptPath, 'utf8'));
    updatedCustomAttempt.provenance.qualificationDigest = updatedQualificationDigest;
    updatedCustomAttempt.provenance.packagesRepositoryCommit = updatedPackagesState.commit;
    updatedCustomAttempt.provenance.packagesRepositoryFingerprint =
      updatedPackagesState.fingerprint;
    updatedCustomAttempt.provenance.packages =
      createRecordedQualificationPackages(publishedManifests);
    writeFileSync(attemptPath, `${JSON.stringify(updatedCustomAttempt)}\n`, 'utf8');

    const externalAttemptId = 'external-release-attempt';
    const externalAttemptDirectory = join(
      temporaryRoot,
      'qualification/results/external/external-stream/attempts',
      externalAttemptId,
    );
    cpSync(
      join(temporaryRoot, 'qualification/results/custom/custom/attempts', attemptId),
      externalAttemptDirectory,
      { recursive: true },
    );
    const externalBaselinePath = join(externalAttemptDirectory, 'baseline.json');
    const externalBaselineContent = `${JSON.stringify({
      required: true,
      passed: true,
      status: 'passed',
      baselineAttemptId: attemptId,
      failures: [],
    })}\n`;
    writeFileSync(externalBaselinePath, externalBaselineContent, 'utf8');
    const externalAttemptPath = join(externalAttemptDirectory, 'attempt.json');
    const externalAttempt = JSON.parse(readFileSync(externalAttemptPath, 'utf8'));
    externalAttempt.attemptId = externalAttemptId;
    externalAttempt.selection = {
      adapterId: 'external',
      implementationId: 'external-stream',
    };
    externalAttempt.provenance.profileDigest = await calculateDirectoryFingerprint(
      join(temporaryRoot, 'qualification', 'profiles', 'external', 'external-stream'),
    );
    externalAttempt.provenance.targetDigest = calculateCompatibilityBehaviorDigest({
      adapter: matrix.adapters.external,
      target: matrix.adapters.external.targets[0],
    });
    externalAttempt.provenance.baselineAttemptId = attemptId;
    externalAttempt.artifactDigests['baseline.json'] = createHash('sha256')
      .update(externalBaselineContent)
      .digest('hex');
    for (const trialId of ['initial', 'confirmation-1', 'confirmation-2']) {
      for (const role of ['actor', 'judge']) {
        const relativeEvidencePath = `cases/release-case/trials/${trialId}/${role}-evidence.json`;
        const evidencePath = join(externalAttemptDirectory, relativeEvidencePath);
        const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
        evidence.sourceAttemptId = externalAttemptId;
        const evidenceContent = `${JSON.stringify(evidence, null, 2)}\n`;
        writeFileSync(evidencePath, evidenceContent, 'utf8');
        externalAttempt.artifactDigests[relativeEvidencePath] = createHash('sha256')
          .update(evidenceContent)
          .digest('hex');
      }
    }
    writeFileSync(externalAttemptPath, `${JSON.stringify(externalAttempt)}\n`, 'utf8');
    writeFile(
      temporaryRoot,
      'qualification/results/external/external-stream/latest.json',
      `${JSON.stringify({
        protocolVersion: 6,
        adapterId: 'external',
        implementationId: 'external-stream',
        latestAttemptId: externalAttemptId,
        latestStatus: 'passed',
        lastPassingAttemptId: externalAttemptId,
        updatedAt: '2026-08-21T10:01:00.000Z',
      })}\n`,
    );
    assert.deepEqual(await inspectReleaseEvidence(temporaryRoot, inspectionOptions), []);

    const staleBaselineContent = `${JSON.stringify({
      required: true,
      passed: true,
      status: 'passed',
      baselineAttemptId: 'stale-custom-attempt',
      failures: [],
    })}\n`;
    writeFileSync(externalBaselinePath, staleBaselineContent, 'utf8');
    externalAttempt.provenance.baselineAttemptId = 'stale-custom-attempt';
    externalAttempt.artifactDigests['baseline.json'] = createHash('sha256')
      .update(staleBaselineContent)
      .digest('hex');
    writeFileSync(externalAttemptPath, `${JSON.stringify(externalAttempt)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/external/external-stream/latest.json does not reference the current passing Custom baseline.',
      ),
    );

    const incompleteAttempt = JSON.parse(readFileSync(attemptPath, 'utf8'));
    incompleteAttempt.cases = [];
    writeFileSync(attemptPath, `${JSON.stringify(incompleteAttempt)}\n`, 'utf8');
    assert.ok(
      (await inspectReleaseEvidence(temporaryRoot, inspectionOptions)).includes(
        'qualification/results/custom/custom/latest.json does not contain every current passing case artifact.',
      ),
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
