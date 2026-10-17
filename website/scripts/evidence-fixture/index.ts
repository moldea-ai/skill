import { mkdir, rm, writeFile } from 'node:fs/promises';
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
  resolveContainedPath,
  writeBufferFileAtomically,
} from '../../../src/filesystem/index.ts';
import type {
  ISemanticAttemptModel,
  ISemanticAttemptTrialModel,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationWebsiteModel,
} from '../../src/lib/semantic-evaluation/index.ts';

import { createSyntheticJourneySnapshot } from './journeys.ts';

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
  moldeaLauncherMissReasons: [],
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
    model: 'gpt-6-sol',
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
    model: 'gpt-6-sol',
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

/** Builds a synthetic conversation and matching workspace tree for the evidence previews. */
const createSemanticReplay = (
  request: string,
  reply: string,
  groups: { status: 'created' | 'modified' | 'deleted'; paths: string[] }[],
  rationale: string,
): IEvaluationReplayModel => ({
  trials: [
    {
      confirmationIndex: null,
      evaluatedAt: EVALUATED_AT,
      id: 'initial',
      kind: 'initial',
      steps: [
        { content: request, kind: 'message', role: 'developer', source: 'recorded' },
        {
          commandCount: 1,
          exitCode: 0,
          isAggregate: true,
          kind: 'command',
          operation: 'Check the affected implementation and project state',
          results: ['The synthetic fixture reports passing correctness checks and validation.'],
          status: 'passed',
        },
        {
          groups: groups.map(({ status, paths }) => ({
            status,
            changes: paths.map((filePath) => ({ path: filePath, type: 'file' as const })),
            tree: paths.map((filePath) => ({
              changeCount: 1,
              children: [],
              kind: 'file' as const,
              name: path.posix.basename(filePath),
              path: filePath,
            })),
          })),
          kind: 'workspace',
        },
        { content: reply, kind: 'message', role: 'coding-agent', source: 'recorded' },
        {
          kind: 'verdict',
          rationale,
          role: 'independent-judge',
          source: 'recorded',
          status: 'passed',
        },
      ],
      title: 'Initial trial',
    },
  ],
});

const agentRequest =
  'Connect the support agent’s maintained instructions to both model calls and verify the existing flow.';
const agentRationale =
  'Both model calls load the maintained instructions, and integration checks preserve the support flow.';
const semanticCase: ISemanticEvaluationCaseModel = {
  confirmationStatus: 'not-required',
  developerDirection: agentRequest,
  evaluatedAt: EVALUATED_AT,
  expectedCriteria: [
    {
      criterion: 'Both model calls load the maintained instructions.',
      label: 'instruction-wiring',
    },
  ],
  forbiddenCriteria: [
    { criterion: 'Does not change the existing support flow.', label: 'unrelated-flow-change' },
  ],
  groupId: 'fixture-behavior',
  hasCurrentCaseDefinition: true,
  id: 'agent-adoption-inline-runtime-instruction',
  presentation: {
    summary: 'Connect maintained instructions to both support-agent model calls.',
    title: 'Support agent instructions',
  },
  rationale: agentRationale,
  replay: createSemanticReplay(
    agentRequest,
    'Both model calls now load the support agent’s maintained instructions. The integration checks pass.',
    [
      {
        status: 'created',
        paths: ['moldea/agents/support/description.md', 'moldea/agents/support/instruction.md'],
      },
      {
        status: 'modified',
        paths: [
          'moldea/moldea.yaml',
          'src/support-agent.js',
          'src/support-agent.test-integration.js',
        ],
      },
      { status: 'deleted', paths: [] },
    ],
    agentRationale,
  ),
  scenario: 'A support agent has two model calls with inline instructions.',
  status: 'passed',
  summary: 'Connect maintained instructions to both support-agent model calls.',
  title: 'Support agent instructions',
  trials: [{ ...semanticTrial, observed: ['instruction-wiring'], rationale: agentRationale }],
};

const changeRequest = 'Run document cleanup more often when the backlog grows.';
const changeRationale =
  'The scheduler, its tests, and the saved cleanup policy agree on the backlog-based schedule.';
const semanticBoundaryCase: ISemanticEvaluationCaseModel = {
  ...semanticCase,
  developerDirection: changeRequest,
  expectedCriteria: [
    {
      criterion: 'Updates the scheduler, its tests, and the saved cleanup policy together.',
      label: 'policy-aligned-schedule',
    },
  ],
  forbiddenCriteria: [
    {
      criterion: 'Does not change unrelated scheduling behavior.',
      label: 'unrelated-schedule-change',
    },
  ],
  id: 'bound-context-maintenance',
  presentation: {
    summary: 'Keep the cleanup schedule and saved policy aligned.',
    title: 'Cleanup schedule and project context',
  },
  rationale: changeRationale,
  replay: createSemanticReplay(
    changeRequest,
    'The cleanup schedule now responds to the backlog. I updated the scheduler, its tests, and the saved cleanup policy. Checks pass.',
    [
      { status: 'created', paths: [] },
      {
        status: 'modified',
        paths: [
          'src/cleanup-scheduler.js',
          'src/cleanup-scheduler.test-unit.js',
          'moldea/context/cleanup-policy.md',
          'moldea/moldea.yaml',
        ],
      },
      { status: 'deleted', paths: [] },
    ],
    changeRationale,
  ),
  scenario: 'A developer changes a cleanup schedule governed by saved project policy.',
  summary: 'Keep the cleanup schedule and saved policy aligned.',
  title: 'Cleanup schedule and project context',
  trials: [{ ...semanticTrial, observed: ['policy-aligned-schedule'], rationale: changeRationale }],
};

const semanticResult: ISemanticAttemptModel['result'] = {
  artifactDigest: SHA256,
  attemptId: 'fixture-semantic-run',
  cases: [
    {
      confirmationStatus: 'not-required',
      id: semanticCase.id,
      status: 'passed',
      trials: semanticCase.trials,
    },
    {
      confirmationStatus: 'not-required',
      id: semanticBoundaryCase.id,
      status: 'passed',
      trials: semanticBoundaryCase.trials,
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
      model: 'gpt-6-sol',
      name: 'synthetic-actor',
      reasoningEffort: 'xhigh',
      role: 'actor',
    },
    judge: {
      developerInstructionsSha256: SHA256,
      model: 'gpt-6-sol',
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
  evaluationModel: 'gpt-6-sol',
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
  kind: 'semantic',
  websiteModel: ISemanticEvaluationWebsiteModel,
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
  await mkdir(path.join(snapshotDirectory, 'assets', 'semantic'), { recursive: true });

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
    semantic: createFixtureBundle('semantic', semanticWebsiteModel, semanticArtifacts),
    journeys: createSyntheticJourneySnapshot(),
  };
  const preparedSections: IEvidencePreparationManifest = {
    formatVersion: 1,
    selectionSha256: '',
    journeys: {
      assetsPath: path.posix.join(snapshotRelativePath, 'assets', 'journeys'),
      bundleSha256: calculateSha256('fixture-journeys-bundle'),
      path: path.posix.join(snapshotRelativePath, 'journeys.json'),
      preparedSha256: '',
    },
    semantic: {
      assetsPath: path.posix.join(snapshotRelativePath, 'assets', 'semantic'),
      bundleSha256: calculateSha256('fixture-semantic-bundle'),
      path: path.posix.join(snapshotRelativePath, 'semantic.json'),
      preparedSha256: '',
    },
  };

  for (const kind of ['semantic', 'journeys'] as const) {
    const source = `${JSON.stringify(bundles[kind], null, 2)}\n`;
    preparedSections[kind]!.preparedSha256 = calculateSha256(source);
    await Promise.all([
      writeFile(path.join(snapshotDirectory, `${kind}.json`), source, 'utf8'),
      materializeFixtureArtifacts(path.join(snapshotDirectory, 'assets', kind), bundles[kind]),
    ]);
  }

  const selection: IEvidenceSelection = {
    formatVersion: 1,
    semantic: {
      assetName: 'fixture-semantic.json.gz',
      classification: 'official',
      repository: 'moldea-ai/skill',
      sha256: preparedSections.semantic.bundleSha256,
      tag: 'evidence-fixture',
    },
    journeys: {
      assetName: 'fixture-journeys.json.gz',
      classification: 'official',
      repository: 'moldea-ai/skill',
      sha256: preparedSections.journeys!.bundleSha256,
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
