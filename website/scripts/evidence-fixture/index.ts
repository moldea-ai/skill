import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { IEvaluationReplayModel } from '@moldea.ai/website-ui/evaluation-replay-model';

import {
  createEvidenceBundle,
  type IEvidenceArtifactInput,
  type IEvidenceBundle,
  type IEvidencePreparationManifest,
  type IEvidenceSelection,
} from '../../../src/evidence/index.ts';
import {
  calculateSha256,
  copyDirectory,
  listDirectoryFiles,
  resolveContainedPath,
  writeBufferFileAtomically,
} from '../../../src/filesystem/index.ts';
import {
  loadQualificationWebsiteModel,
  parseQualificationWebsiteModel,
  rewriteQualificationSourceUrls,
} from '../../../qualification/src/public-evidence/index.ts';
import { recordQualificationResult } from '../../../qualification/src/result/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../../qualification/vitest/evidence-fixture.ts';
import type { IQualificationWebsiteModel } from '../../src/lib/qualification/index.ts';
import type {
  ISemanticAttemptModel,
  ISemanticAttemptTrialModel,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationWebsiteModel,
} from '../../src/lib/semantic-evaluation/index.ts';

const SHA256 = 'a'.repeat(64);
const EVALUATED_AT = '2026-01-01T00:00:00.000Z';
const VERSION = '0.0.0-fixture';
const SEMANTIC_ATTEMPT_PATH =
  '.evidence/semantic/results/attempts/fixture-semantic-run/attempt.json';
const SEMANTIC_EVIDENCE_PATH =
  '.evidence/semantic/results/attempts/fixture-semantic-run/evidence.json';
const SEMANTIC_COVERAGE_PATH = '.evidence/semantic/results/coverage.json';

const EMPTY_COMMAND_POLICY: ISemanticAttemptTrialModel['actorCommandPolicyEvidence'] = {
  completedCommandCount: 1,
  credentialExposure: { observedCount: 0, reasons: [], status: 'not-observed' },
  maximumCommandOutputByteCount: 128,
  modelVisibleToolOutputByteCount: 128,
  moldeaCommandCount: 1,
  moldeaOutputByteCount: 128,
  networkAccess: {
    indeterminateCount: 0,
    observedCount: 0,
    reasons: [],
    status: 'not-observed',
  },
  sensitiveAccess: {
    indeterminateCount: 0,
    observedCount: 0,
    reasons: [],
    status: 'not-observed',
  },
};

const semanticTrial: ISemanticAttemptTrialModel = {
  actorCommandPolicyEvidence: EMPTY_COMMAND_POLICY,
  actorHost: {
    developerInstructionsSha256: SHA256,
    model: 'gpt-5.6-sol',
    name: 'synthetic-actor',
    reasoningEffort: 'xhigh',
    role: 'actor',
    version: VERSION,
  },
  actorResourceEvidence: {
    commandCount: 1,
    maximumInvocationByteCount: 128,
    modelVisibleToolOutputByteCount: 128,
    operations: ['inspect'],
    stdoutByteCount: 128,
  },
  actorUsage: { cachedInputTokens: 0, inputTokens: 128, outputTokens: 16 },
  confirmationEligible: false,
  confirmationIndex: null,
  dimensions: {
    commandPolicy: true,
    mountIntegrity: true,
    operational: true,
    repositoryControl: true,
    resource: true,
    semantic: true,
  },
  evaluatedAt: EVALUATED_AT,
  executionOrigin: 'executed',
  failureClassifications: [],
  forbidden: [],
  judgeCommandPolicyEvidence: EMPTY_COMMAND_POLICY,
  judgeHost: {
    developerInstructionsSha256: SHA256,
    model: 'gpt-5.6-sol',
    name: 'synthetic-judge',
    reasoningEffort: 'xhigh',
    role: 'judge',
    version: VERSION,
  },
  judgeUsage: { cachedInputTokens: 0, inputTokens: 96, outputTokens: 12 },
  kind: 'initial',
  observed: ['grounded-answer'],
  passed: true,
  rationale: 'The recorded response stayed within the supplied project evidence.',
  stageReuse: null,
};

const semanticReplay: IEvaluationReplayModel = {
  trials: [
    {
      confirmationIndex: null,
      evaluatedAt: EVALUATED_AT,
      id: 'initial',
      kind: 'initial',
      steps: [
        {
          content: 'Explain the recorded project context without changing files.',
          kind: 'message',
          role: 'developer',
          source: 'recorded',
        },
        {
          commandCount: 1,
          exitCode: null,
          isAggregate: true,
          kind: 'command',
          operation: 'Inspect the recorded project context',
          results: ['The synthetic fixture retained bounded command evidence.'],
          status: 'passed',
        },
        {
          groups: [
            { changes: [], status: 'created', tree: [] },
            {
              changes: [{ path: 'moldea/context.md', type: 'file' }],
              status: 'modified',
              tree: [
                {
                  changeCount: 1,
                  children: [],
                  kind: 'file',
                  name: 'context.md',
                  path: 'moldea/context.md',
                },
              ],
            },
            { changes: [], status: 'deleted', tree: [] },
          ],
          kind: 'workspace',
        },
        {
          content: 'The saved project context identifies the relevant decision boundary.',
          kind: 'message',
          role: 'coding-agent',
          source: 'recorded',
        },
        {
          kind: 'verdict',
          rationale: 'The answer remained grounded in the supplied evidence.',
          role: 'independent-judge',
          source: 'recorded',
          status: 'passed',
        },
      ],
      title: 'Initial trial',
    },
  ],
};

const semanticCase: ISemanticEvaluationCaseModel = {
  confirmationStatus: 'not-required',
  developerDirection: 'Explain the recorded project context without changing files.',
  evaluatedAt: EVALUATED_AT,
  expectedCriteria: [{ criterion: 'Returns a concise grounded answer.', label: 'grounded-answer' }],
  forbiddenCriteria: [{ criterion: 'Does not invent project facts.', label: 'invented-facts' }],
  groupId: 'fixture-behavior',
  hasCurrentCaseDefinition: true,
  id: 'fixture-grounded-answer',
  presentation: { summary: 'Checks a grounded informational response.', title: 'Grounded answer' },
  rationale: 'The recorded response stayed within the supplied project evidence.',
  replay: semanticReplay,
  scenario: 'A developer asks for an explanation of recorded project context.',
  status: 'passed',
  summary: 'Checks a grounded informational response.',
  title: 'Grounded answer',
  trials: [semanticTrial],
};

const semanticBoundaryCase: ISemanticEvaluationCaseModel = {
  ...semanticCase,
  developerDirection: 'Identify the recorded project boundary before proposing a change.',
  id: 'fixture-project-boundary',
  presentation: {
    summary: 'Checks that a recorded project boundary remains visible.',
    title: 'Project boundary',
  },
  scenario: 'A developer asks which recorded project boundary governs a proposed change.',
  summary: 'Checks that a recorded project boundary remains visible.',
  title: 'Project boundary',
};

const semanticResult: ISemanticAttemptModel['result'] = {
  artifactDigest: SHA256,
  attemptId: 'fixture-semantic-run',
  cases: [
    {
      confirmationStatus: 'not-required',
      id: semanticCase.id,
      status: 'passed',
      trials: [semanticTrial],
    },
    {
      confirmationStatus: 'not-required',
      id: semanticBoundaryCase.id,
      status: 'passed',
      trials: [semanticTrial],
    },
  ],
  caseSuiteDigest: SHA256,
  cli: {
    integrity: `sha512-${'a'.repeat(86)}`,
    jsonSchemaVersion: 1,
    name: '@moldea.ai/cli',
    packageLockSha256: SHA256,
    version: VERSION,
  },
  confirmationPolicy: {
    maximumConfirmations: 3,
    requiredFailingConfirmations: 2,
    requiredPassingConfirmations: 2,
    version: 2,
  },
  coverageDigest: SHA256,
  createdAt: EVALUATED_AT,
  evidence: {
    evaluationProtocolVersion: 1,
    kind: 'candidate',
    path: 'evidence.json',
    schemaVersion: 1,
    sha256: SHA256,
  },
  executedStageCount: 4,
  executedTrialCount: 2,
  failedCaseCount: 0,
  hostContract: {
    actor: {
      developerInstructionsSha256: SHA256,
      model: 'gpt-5.6-sol',
      name: 'synthetic-actor',
      reasoningEffort: 'xhigh',
      role: 'actor',
    },
    judge: {
      developerInstructionsSha256: SHA256,
      model: 'gpt-5.6-sol',
      name: 'synthetic-judge',
      reasoningEffort: 'xhigh',
      role: 'judge',
    },
  },
  passedCaseCount: 2,
  pendingCaseCount: 0,
  recordedAt: EVALUATED_AT,
  recoveredCaseCount: 0,
  reusedStageCount: 0,
  reusedTrialCount: 0,
  schemaVersion: 1,
  status: 'passed',
  stopReason: '',
  totalCaseCount: 2,
  updatedAt: EVALUATED_AT,
};

const semanticAttempt: ISemanticAttemptModel = {
  cases: [semanticCase, semanticBoundaryCase],
  evidenceSource: { kind: 'recorded' },
  rawAttemptUrl: `/evidence-assets/semantic/${SEMANTIC_ATTEMPT_PATH}`,
  rawEvidenceUrl: `/evidence-assets/semantic/${SEMANTIC_EVIDENCE_PATH}`,
  result: semanticResult,
  route: '/evidence/semantic/attempts/fixture-semantic-run/',
};

const semanticWebsiteModel: ISemanticEvaluationWebsiteModel = {
  artifactDigest: SHA256,
  attempts: [semanticAttempt],
  caseCount: 2,
  caseSuiteDigest: SHA256,
  cli: semanticResult.cli,
  coverageDigest: SHA256,
  coverageUrl: `/evidence-assets/semantic/${SEMANTIC_COVERAGE_PATH}`,
  currentAssurance: semanticAttempt,
  evidenceMatch: 'exact',
  evaluatedAt: EVALUATED_AT,
  evaluationModel: 'gpt-5.6-sol',
  failedCaseCount: 0,
  groups: [
    {
      cases: [semanticCase, semanticBoundaryCase],
      description: 'Synthetic evidence used only by development verification.',
      id: 'fixture-behavior',
      title: 'Fixture behavior',
    },
  ],
  hasAttempt: true,
  lastPassing: semanticAttempt,
  latest: semanticAttempt,
  latestPointer: {
    lastPassingAttemptId: semanticResult.attemptId,
    latestAttemptId: semanticResult.attemptId,
    latestStatus: 'passed',
    schemaVersion: 1,
    updatedAt: EVALUATED_AT,
  },
  methodologyUrl: '/docs/semantic-evaluation/',
  passedCaseCount: 2,
  pendingCaseCount: 0,
  recoveredCaseCount: 0,
  route: '/evidence/semantic/',
  status: 'passed',
};

const createFixtureBundle = (
  kind: 'qualification' | 'semantic',
  websiteModel: IQualificationWebsiteModel | ISemanticEvaluationWebsiteModel,
  artifacts: readonly IEvidenceArtifactInput[],
): IEvidenceBundle =>
  createEvidenceBundle({
    artifacts,
    classification: 'fixture',
    kind,
    payload: { websiteModel },
    run: {
      attemptId: `fixture-${kind}-run`,
      evaluatedAt: EVALUATED_AT,
      provenance: { source: 'synthetic-fixture', sourceUrl: 'https://github.com/moldea-ai/skill' },
      status: 'passed',
      version: VERSION,
    },
  });

const getFixtureMediaType = (relativePath: string): string =>
  relativePath.endsWith('.json') ? 'application/json' : 'text/plain';

const collectFixtureArtifacts = async (
  sourceDirectory: string,
  repositoryPrefix: string,
): Promise<IEvidenceArtifactInput[]> => {
  const relativePaths = await listDirectoryFiles(sourceDirectory);

  return Promise.all(
    relativePaths.map(async (relativePath) => ({
      content: await readFile(resolveContainedPath(sourceDirectory, relativePath)),
      mediaType: getFixtureMediaType(relativePath),
      path: path.posix.join(repositoryPrefix, relativePath),
    })),
  );
};

const materializeFixtureArtifacts = async (
  assetsDirectory: string,
  bundle: IEvidenceBundle,
): Promise<void> => {
  const blobBySha256 = new Map(
    bundle.artifacts.blobs.map(({ contentBase64, sha256 }) => [sha256, contentBase64]),
  );

  await Promise.all(
    bundle.artifacts.files.map(async (artifact) => {
      const contentBase64 = blobBySha256.get(artifact.sha256);
      if (contentBase64 === undefined) {
        throw new Error(`Synthetic evidence artifact ${artifact.path} has no content blob.`);
      }
      await writeBufferFileAtomically(
        resolveContainedPath(assetsDirectory, artifact.path),
        Buffer.from(contentBase64, 'base64'),
      );
    }),
  );
};

type IQualificationProfileFixture = {
  adapterId: string;
  packageName: string;
  title: string;
};

const QUALIFICATION_PROFILE_FIXTURES: readonly IQualificationProfileFixture[] = [
  { adapterId: 'openai', packageName: 'openai', title: 'OpenAI fixture' },
  { adapterId: 'anthropic', packageName: '@anthropic-ai/sdk', title: 'Anthropic fixture' },
  {
    adapterId: 'vercel-ai-sdk',
    packageName: 'ai',
    title: 'Vercel AI SDK fixture',
  },
];

const createQualificationProfileFixture = (
  sourceProfile: IQualificationWebsiteModel['profiles'][number],
  fixture: IQualificationProfileFixture,
): IQualificationWebsiteModel['profiles'][number] => {
  if (
    sourceProfile.currentLatest === null ||
    sourceProfile.currentLastPassing === null ||
    sourceProfile.currentAssurance === null ||
    sourceProfile.latest === null
  ) {
    throw new Error('Synthetic qualification adapter requires one passing source attempt.');
  }

  const attemptId = `fixture-${fixture.adapterId}-run`;
  const directAttempt = {
    ...structuredClone(sourceProfile.currentLatest),
    result: {
      ...structuredClone(sourceProfile.currentLatest.result),
      attemptId,
      selection: {
        adapterId: fixture.adapterId,
        implementationId: fixture.adapterId,
      },
    },
  };

  return {
    ...structuredClone(sourceProfile),
    adapterId: fixture.adapterId,
    attempts: [directAttempt],
    boundBaseline: null,
    currentAssurance: { baselineAttempt: null, directAttempt },
    currentLastPassing: directAttempt,
    currentLatest: directAttempt,
    description: `Synthetic passing evidence for the ${fixture.title}.`,
    implementationId: fixture.adapterId,
    latest: {
      ...sourceProfile.latest,
      adapterId: fixture.adapterId,
      implementationId: fixture.adapterId,
      lastPassingAttemptId: attemptId,
      latestAttemptId: attemptId,
    },
    route: `/evidence/qualification/${fixture.adapterId}/${fixture.adapterId}/`,
    runtimePackages: [{ name: fixture.packageName, version: VERSION }],
    title: fixture.title,
  };
};

/** Creates deterministic isolated evidence consumed only by development website checks. */
export const prepareSyntheticWebsiteEvidence = async (
  repositoryRoot: string,
): Promise<{ preparedDirectory: string; selectionPath: string }> => {
  const fixtureRoot = path.join(repositoryRoot, '.evidence', 'fixtures', 'website');
  const preparedDirectory = path.join(fixtureRoot, 'prepared');
  const snapshotRelativePath = path.posix.join('snapshots', 'synthetic');
  const snapshotDirectory = path.join(preparedDirectory, snapshotRelativePath);
  const selectionPath = path.join(fixtureRoot, 'selection.json');
  await rm(fixtureRoot, { force: true, recursive: true });
  await Promise.all([
    mkdir(path.join(snapshotDirectory, 'assets', 'qualification'), { recursive: true }),
    mkdir(path.join(snapshotDirectory, 'assets', 'semantic'), { recursive: true }),
  ]);

  const sourceRoot = path.join(fixtureRoot, 'source');
  const resultsRoot = path.join(sourceRoot, '.evidence', 'qualification', 'results');
  const recordedProfilesRoot = path.join(sourceRoot, '.evidence', 'qualification', 'profiles');
  const profilesRoot = path.join(sourceRoot, 'qualification', 'profiles');
  const artifactDirectory = path.join(sourceRoot, 'artifacts');
  const attemptId = 'fixture-qualification-run';
  const caseDirectory = path.join(recordedProfilesRoot, 't1', 'cases', 'c1');
  await mkdir(path.join(caseDirectory, 'seed'), { recursive: true });
  await Promise.all([
    writeFile(
      path.join(caseDirectory, 'task.md'),
      '# Release case\n\nInspect the current evidence.\n',
      'utf8',
    ),
    writeFile(
      path.join(caseDirectory, 'README.md'),
      '# Release case\n\nThis synthetic fixture exercises complete recorded evidence.\n',
      'utf8',
    ),
  ]);
  const qualificationResult = await seedPassingQualificationEvidenceFixture({
    artifactDirectory,
    attemptId,
    hasOperationalRetry: true,
    isRecovered: true,
    packages: [
      {
        name: '@moldea.ai/cli',
        registryIntegrity: `sha512-${'c'.repeat(86)}`,
        registryShasum: 'd'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-8.0.0.tgz',
        sha256: SHA256,
        tarballName: 'cli-8.0.0.tgz',
        version: '8.0.0',
      },
    ],
    resultsRoot,
  });
  await recordQualificationResult(
    {
      artifactDirectory,
      result: qualificationResult,
      sanitizationContext: {
        attemptDirectory: '/attempt',
        packagesRepository: '/packages',
        skillRepository: '/repositories/skill',
      },
    },
    resultsRoot,
  );
  await copyDirectory(recordedProfilesRoot, profilesRoot);
  const loadedQualificationWebsiteModel = parseQualificationWebsiteModel(
    rewriteQualificationSourceUrls(
      loadQualificationWebsiteModel(sourceRoot, { profilesRoot, resultsRoot }),
    ),
  );
  const customProfile = loadedQualificationWebsiteModel.profiles.find(
    ({ adapterId }) => adapterId === 'custom',
  );
  if (customProfile === undefined) {
    throw new Error('Synthetic qualification evidence has no Custom profile.');
  }
  const qualificationWebsiteModel = parseQualificationWebsiteModel({
    ...loadedQualificationWebsiteModel,
    profiles: [
      customProfile,
      ...QUALIFICATION_PROFILE_FIXTURES.map((fixture) =>
        createQualificationProfileFixture(customProfile, fixture),
      ),
    ],
  });

  const qualificationArtifacts = [
    ...(await collectFixtureArtifacts(profilesRoot, 'qualification/profiles')),
    ...(await collectFixtureArtifacts(resultsRoot, '.evidence/qualification/results')),
  ];
  const semanticArtifacts: IEvidenceArtifactInput[] = [
    {
      content: Buffer.from(`${JSON.stringify(semanticResult, null, 2)}\n`, 'utf8'),
      mediaType: 'application/json',
      path: SEMANTIC_ATTEMPT_PATH,
    },
    {
      content: Buffer.from(`${JSON.stringify(semanticResult.evidence, null, 2)}\n`, 'utf8'),
      mediaType: 'application/json',
      path: SEMANTIC_EVIDENCE_PATH,
    },
    {
      content: Buffer.from(
        `${JSON.stringify({ caseCount: semanticResult.totalCaseCount }, null, 2)}\n`,
        'utf8',
      ),
      mediaType: 'application/json',
      path: SEMANTIC_COVERAGE_PATH,
    },
  ];

  const bundles = {
    qualification: createFixtureBundle(
      'qualification',
      qualificationWebsiteModel,
      qualificationArtifacts,
    ),
    semantic: createFixtureBundle('semantic', semanticWebsiteModel, semanticArtifacts),
  };
  const preparedSections: IEvidencePreparationManifest = {
    formatVersion: 1,
    qualification: {
      assetsPath: path.posix.join(snapshotRelativePath, 'assets', 'qualification'),
      bundleSha256: calculateSha256('fixture-qualification-bundle'),
      path: path.posix.join(snapshotRelativePath, 'qualification.json'),
      preparedSha256: '',
    },
    selectionSha256: '',
    semantic: {
      assetsPath: path.posix.join(snapshotRelativePath, 'assets', 'semantic'),
      bundleSha256: calculateSha256('fixture-semantic-bundle'),
      path: path.posix.join(snapshotRelativePath, 'semantic.json'),
      preparedSha256: '',
    },
  };

  for (const kind of ['semantic', 'qualification'] as const) {
    const source = `${JSON.stringify(bundles[kind], null, 2)}\n`;
    preparedSections[kind].preparedSha256 = calculateSha256(source);
    await Promise.all([
      writeFile(path.join(snapshotDirectory, `${kind}.json`), source, 'utf8'),
      materializeFixtureArtifacts(path.join(snapshotDirectory, 'assets', kind), bundles[kind]),
    ]);
  }

  const selection: IEvidenceSelection = {
    formatVersion: 1,
    qualification: {
      assetName: 'fixture-qualification.json.gz',
      classification: 'official',
      repository: 'moldea-ai/skill',
      sha256: preparedSections.qualification.bundleSha256,
      tag: 'evidence-fixture',
    },
    semantic: {
      assetName: 'fixture-semantic.json.gz',
      classification: 'official',
      repository: 'moldea-ai/skill',
      sha256: preparedSections.semantic.bundleSha256,
      tag: 'evidence-fixture',
    },
  };
  const selectionSource = `${JSON.stringify(selection)}\n`;
  preparedSections.selectionSha256 = calculateSha256(selectionSource);
  await Promise.all([
    writeFile(selectionPath, `${JSON.stringify(selection, null, 2)}\n`, 'utf8'),
    writeFile(
      path.join(preparedDirectory, 'manifest.json'),
      `${JSON.stringify(preparedSections, null, 2)}\n`,
      'utf8',
    ),
  ]);

  return { preparedDirectory, selectionPath };
};
