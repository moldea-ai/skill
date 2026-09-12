import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { toTitleCase } from 'web-utils-kit';

import { readSemanticAttemptIdentity } from '../../../../tooling/evidence-identity/index.mjs';
import {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  loadVerifiedSemanticEvaluationAttempts,
  validateSemanticCaseDefinition,
} from '../../../../tooling/semantic-evaluation/index.mjs';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../../../tooling/release-identity/constants.mjs';
import { createSemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';
import {
  CODEX_EVALUATION_ACTOR_REASONING_EFFORT,
  CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  CODEX_EVALUATION_JUDGE_REASONING_EFFORT,
  CODEX_EVALUATION_MODEL,
} from '../../../../tooling/codex-evaluation-host/index.mjs';

import { RAW_SOURCE_REPOSITORY_URL } from '../model/constants.ts';

import {
  SEMANTIC_CASE_PRESENTATION,
  SEMANTIC_EVALUATION_GROUPS,
  SEMANTIC_EVALUATION_METHODOLOGY_ROUTE,
  SEMANTIC_EVALUATION_ROUTE,
} from './constants.ts';
import { createSemanticEvaluationReplay } from './replay-transformers.ts';
import type {
  ISemanticAttemptModel,
  ISemanticCaseDefinition,
  ISemanticEvidenceSource,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationWebsiteModel,
} from './types.ts';
import {
  SemanticAttemptRecordSchema,
  SemanticLatestResultSchema,
  SemanticReplayCandidateSchema,
  hasValidSemanticReplayExecutionEvidence,
  type ISemanticAttemptRecord,
  type ISemanticReplayCandidate,
} from './validations.ts';

const CONFORMANCE_CASES_PATH = 'fixtures/conformance-cases.json';
const SEMANTIC_ATTEMPTS_PATH = 'fixtures/semantic-evaluation-results';
const SEMANTIC_COVERAGE_PATH = 'fixtures/semantic-evaluation-coverage.json';

const createAuthenticatedJsonDigest = (input: unknown): string =>
  createHash('sha256').update(JSON.stringify(input)).digest('hex');

const createAuthenticatedSemanticCaseSuiteDigest = (
  caseDefinitions: ISemanticCaseDefinition[],
): string =>
  createAuthenticatedJsonDigest(
    caseDefinitions
      .map((caseDefinition) => ({
        digest: createAuthenticatedJsonDigest(caseDefinition),
        id: caseDefinition.id,
      }))
      .sort(({ id: left }, { id: right }) => left.localeCompare(right, 'en')),
  );

const matchesSemanticHostContract = (
  host: {
    developerInstructionsSha256: string;
    model: string;
    name: string;
    reasoningEffort: string;
    role: string;
    version?: string;
  },
  expected: ISemanticAttemptRecord['hostContract']['actor' | 'judge'],
): boolean =>
  host.developerInstructionsSha256 === expected.developerInstructionsSha256 &&
  host.model === expected.model &&
  host.name === expected.name &&
  host.role === expected.role &&
  host.reasoningEffort === expected.reasoningEffort &&
  (host.version === undefined ||
    (host.version.trim().length > 0 && host.version !== 'unavailable'));

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parsing failure.';
    throw new Error(`Invalid semantic evaluation JSON ${path}: ${message}`, { cause: error });
  }
};

const validateAuthenticatedSemanticPresentationCase = (
  caseDefinition: unknown,
): ISemanticCaseDefinition => {
  if (caseDefinition === null || typeof caseDefinition !== 'object') {
    throw new Error('Authenticated semantic presentation requires an object case definition.');
  }
  const presentationContract = { ...(caseDefinition as Record<string, unknown>) };
  delete presentationContract['localProbe'];
  validateSemanticCaseDefinition(presentationContract as unknown as ISemanticCaseDefinition);
  return caseDefinition as ISemanticCaseDefinition;
};

const loadCaseDefinitions = (
  repositoryRoot: string,
  isAuthenticatedSource: boolean,
): ISemanticCaseDefinition[] => {
  const fixture = readJson(join(repositoryRoot, CONFORMANCE_CASES_PATH));
  if (
    fixture === null ||
    typeof fixture !== 'object' ||
    !('semanticCases' in fixture) ||
    !Array.isArray(fixture.semanticCases) ||
    fixture.semanticCases.length === 0
  ) {
    throw new Error(`${CONFORMANCE_CASES_PATH} must contain semantic cases.`);
  }

  return fixture.semanticCases.map((caseDefinition) =>
    isAuthenticatedSource
      ? validateAuthenticatedSemanticPresentationCase(caseDefinition)
      : validateSemanticCaseDefinition(caseDefinition as ISemanticCaseDefinition),
  );
};

/** Checks whether an attempt belongs to the complete active semantic contract. */
const hasCurrentAttemptContract = (
  attempt: ISemanticAttemptRecord,
  caseDefinitions: ISemanticCaseDefinition[],
  coverage: unknown,
  isAuthenticatedSource: boolean,
): boolean => {
  const caseIds = caseDefinitions.map(({ id }) => id);
  const presentationIds = Object.keys(SEMANTIC_CASE_PRESENTATION);
  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error('Semantic case definitions must have unique identities.');
  }
  if (
    !isAuthenticatedSource &&
    JSON.stringify([...caseIds].sort()) !== JSON.stringify([...presentationIds].sort())
  ) {
    throw new Error('Semantic case presentation metadata must match the complete current suite.');
  }

  const attemptCaseIds = attempt.cases.map(({ id }) => id);
  const caseSuiteDigest = isAuthenticatedSource
    ? createAuthenticatedSemanticCaseSuiteDigest(caseDefinitions)
    : createSemanticCaseSuiteDigest(caseDefinitions);
  const coverageDigest = isAuthenticatedSource
    ? createAuthenticatedJsonDigest(coverage)
    : createSemanticCoverageDigest(coverage, caseDefinitions);
  return (
    attempt.caseSuiteDigest === caseSuiteDigest &&
    attempt.coverageDigest === coverageDigest &&
    attempt.evidence.evaluationProtocolVersion === SEMANTIC_EVALUATION_PROTOCOL_VERSION &&
    attempt.totalCaseCount === caseDefinitions.length &&
    new Set(attemptCaseIds).size === attemptCaseIds.length &&
    attemptCaseIds.every((id) => caseIds.includes(id))
  );
};

const hasCurrentAttemptIdentity = (
  attempt: ISemanticAttemptRecord,
  caseDefinitions: ISemanticCaseDefinition[],
  coverage: unknown,
  repositoryRoot: string,
  isAuthenticatedSource: boolean,
): boolean => {
  const hasInputMismatch =
    !hasCurrentAttemptContract(attempt, caseDefinitions, coverage, isAuthenticatedSource) ||
    attempt.artifactDigest !== createPortableSkillDigest(repositoryRoot) ||
    JSON.stringify(attempt.cli) !== JSON.stringify(createSemanticCliIdentity(repositoryRoot));
  // authenticated pins retain their source host contract, not today's evaluator policy
  const expectedHosts: ISemanticAttemptRecord['hostContract'] = isAuthenticatedSource
    ? attempt.hostContract
    : {
        actor: {
          developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
          model: CODEX_EVALUATION_MODEL,
          name: 'codex',
          reasoningEffort: CODEX_EVALUATION_ACTOR_REASONING_EFFORT,
          role: 'actor',
        },
        judge: {
          developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
          model: CODEX_EVALUATION_MODEL,
          name: 'codex',
          reasoningEffort: CODEX_EVALUATION_JUDGE_REASONING_EFFORT,
          role: 'judge',
        },
      };
  const hasCurrentHosts =
    matchesSemanticHostContract(attempt.hostContract.actor, expectedHosts.actor) &&
    matchesSemanticHostContract(attempt.hostContract.judge, expectedHosts.judge) &&
    attempt.cases.every(({ trials }) =>
      trials.every(
        ({ actorHost, judgeHost }) =>
          matchesSemanticHostContract(actorHost, expectedHosts.actor) &&
          matchesSemanticHostContract(judgeHost, expectedHosts.judge),
      ),
    );
  return !hasInputMismatch && hasCurrentHosts;
};

const createCaseModel = (
  caseDefinition: ISemanticCaseDefinition | null,
  attemptCase: ISemanticAttemptRecord['cases'][number] | null,
  replayCandidate: ISemanticReplayCandidate | null,
  isAuthenticatedSource: boolean,
): ISemanticEvaluationCaseModel => {
  const id = attemptCase?.id ?? caseDefinition?.id;
  if (id === undefined) {
    throw new Error('Semantic case model requires a current definition or an immutable trial.');
  }
  const presentation = SEMANTIC_CASE_PRESENTATION[id as keyof typeof SEMANTIC_CASE_PRESENTATION];
  const latestTrial = attemptCase?.trials.at(-1);
  if (attemptCase === null && presentation === undefined && !isAuthenticatedSource) {
    throw new Error(`Semantic case ${id} has no public presentation model.`);
  }
  if ((attemptCase === null) !== (replayCandidate === null)) {
    throw new Error(`Semantic case ${id} has incomplete replay inputs.`);
  }

  const replayProjection =
    attemptCase === null || replayCandidate === null
      ? null
      : createSemanticEvaluationReplay(caseDefinition, attemptCase, replayCandidate, {
          ...(isAuthenticatedSource && caseDefinition !== null
            ? { authenticatedCaseDefinitionDigest: createAuthenticatedJsonDigest(caseDefinition) }
            : {}),
        });
  const hasMatchingCaseDefinition =
    caseDefinition !== null &&
    (replayProjection === null ||
      replayProjection.caseDefinitionDigest ===
        (isAuthenticatedSource
          ? createAuthenticatedJsonDigest(caseDefinition)
          : createSemanticCaseDefinitionDigest(caseDefinition)));
  const hasCurrentCaseDefinition = hasMatchingCaseDefinition && presentation !== undefined;
  const activeCaseDefinition = hasMatchingCaseDefinition ? caseDefinition : null;
  const operation = activeCaseDefinition?.operation.trim() ?? '';
  const scenario = activeCaseDefinition?.scenario;
  return {
    confirmationStatus: attemptCase?.confirmationStatus ?? null,
    developerDirection:
      replayProjection?.developerDirection ??
      activeCaseDefinition?.input.developerDirection ??
      null,
    evaluatedAt: latestTrial?.evaluatedAt ?? null,
    expectedCriteria: activeCaseDefinition?.expected ?? [],
    forbiddenCriteria: activeCaseDefinition?.forbidden ?? [],
    groupId: hasMatchingCaseDefinition
      ? (presentation?.groupId ?? (isAuthenticatedSource ? 'source-contract' : null))
      : null,
    hasCurrentCaseDefinition,
    id,
    rationale: latestTrial?.rationale ?? null,
    replay: replayProjection?.replay ?? null,
    scenario:
      activeCaseDefinition === null
        ? 'This immutable attempt used a case definition that is no longer current.'
        : operation
          ? `${scenario} Requested operation: ${operation}.`
          : (scenario ?? ''),
    status: attemptCase?.status ?? 'pending',
    title: hasMatchingCaseDefinition
      ? (presentation?.title ?? toTitleCase(id.replaceAll('-', ' ')))
      : id,
    trials: attemptCase?.trials.map((trial) => ({ ...trial })) ?? [],
  };
};

const createAttemptModel = (
  attempt: ISemanticAttemptRecord,
  caseDefinitions: ISemanticCaseDefinition[],
  repositoryRoot: string,
  revision: string,
  isAuthenticatedSource: boolean,
  evidenceSource: ISemanticEvidenceSource,
): ISemanticAttemptModel => {
  const attemptPath = `${SEMANTIC_ATTEMPTS_PATH}/attempts/${attempt.attemptId}`;
  const identity = readSemanticAttemptIdentity(repositoryRoot, attempt.attemptId);
  if (existsSync(join(repositoryRoot, '.git')) && identity === null) {
    throw new Error(`Semantic attempt ${attempt.attemptId} lacks source-bound identity.`);
  }
  const rawReplayCandidate = readJson(join(repositoryRoot, attemptPath, 'evidence.json'));
  if (
    !hasValidSemanticReplayExecutionEvidence(rawReplayCandidate, {
      cliVersion: attempt.cli.version,
      jsonSchemaVersion: attempt.cli.jsonSchemaVersion,
    })
  ) {
    throw new Error(
      `Semantic attempt ${attempt.attemptId} contains unsupported actor execution evidence.`,
    );
  }
  const replayCandidate = SemanticReplayCandidateSchema.parse(rawReplayCandidate);
  const cases = attempt.cases.map((attemptCase) => {
    const caseDefinition = caseDefinitions.find(({ id }) => id === attemptCase.id) ?? null;
    return createCaseModel(caseDefinition, attemptCase, replayCandidate, isAuthenticatedSource);
  });

  return {
    cases,
    evidenceSource,
    rawAttemptUrl: `${RAW_SOURCE_REPOSITORY_URL}/${encodeURIComponent(revision)}/${attemptPath}/attempt.json`,
    rawEvidenceUrl: `${RAW_SOURCE_REPOSITORY_URL}/${encodeURIComponent(revision)}/${attemptPath}/evidence.json`,
    result: attempt,
    route: `${SEMANTIC_EVALUATION_ROUTE}attempts/${attempt.attemptId}/`,
  };
};

/**
 * Loads complete immutable semantic history and validates the latest release-bound attempt.
 * @param repositoryRoot Repository root containing semantic cases and immutable evidence.
 * @returns The complete semantic website model.
 * @throws
 * - If semantic cases, history, replay evidence, or presentation metadata are malformed or inconsistent
 */
export const loadSemanticEvaluationWebsiteModel = (
  repositoryRoot: string,
  revision = 'main',
  options: {
    evidenceSource?: ISemanticEvidenceSource;
    isAuthenticatedSource?: boolean;
  } = {},
): ISemanticEvaluationWebsiteModel => {
  const isAuthenticatedSource = options.isAuthenticatedSource === true;
  const evidenceSource = options.evidenceSource ?? { kind: 'current' };
  const caseDefinitions = loadCaseDefinitions(repositoryRoot, isAuthenticatedSource);
  const coverage = readJson(join(repositoryRoot, SEMANTIC_COVERAGE_PATH));
  const loadedHistory = loadVerifiedSemanticEvaluationAttempts(
    join(repositoryRoot, SEMANTIC_ATTEMPTS_PATH),
  );
  const attempts = loadedHistory.attempts.map((attempt) =>
    SemanticAttemptRecordSchema.parse(attempt),
  );
  const recordedLatestPointer =
    loadedHistory.latest === null ? null : SemanticLatestResultSchema.parse(loadedHistory.latest);
  const recordedLatest =
    recordedLatestPointer === null
      ? null
      : (attempts.find(({ attemptId }) => attemptId === recordedLatestPointer.latestAttemptId) ??
        null);
  if (recordedLatestPointer !== null && recordedLatest === null) {
    throw new Error('Semantic latest pointer does not resolve to an immutable attempt.');
  }

  const currentContractAttempts = attempts.filter((attempt) =>
    hasCurrentAttemptContract(attempt, caseDefinitions, coverage, isAuthenticatedSource),
  );
  const attemptModels = currentContractAttempts.map((attempt) =>
    createAttemptModel(
      attempt,
      caseDefinitions,
      repositoryRoot,
      revision,
      isAuthenticatedSource,
      evidenceSource,
    ),
  );
  const latest =
    recordedLatestPointer === null
      ? null
      : (attemptModels.find(
          ({ result }) => result.attemptId === recordedLatestPointer.latestAttemptId,
        ) ?? null);
  const hasExactCurrentEvaluation =
    latest !== null &&
    hasCurrentAttemptIdentity(
      latest.result,
      caseDefinitions,
      coverage,
      repositoryRoot,
      isAuthenticatedSource,
    );
  const currentAssurance = hasExactCurrentEvaluation ? latest : null;
  const evidenceMatch = hasExactCurrentEvaluation ? 'exact' : null;

  const lastPassing =
    recordedLatestPointer?.lastPassingAttemptId == null
      ? null
      : (attemptModels.find(
          ({ result }) => result.attemptId === recordedLatestPointer.lastPassingAttemptId,
        ) ?? null);
  const latestPointer =
    latest === null || recordedLatestPointer === null
      ? null
      : {
          ...recordedLatestPointer,
          lastPassingAttemptId: lastPassing?.result.attemptId ?? null,
        };

  const cases = caseDefinitions.map((caseDefinition) => {
    if (currentAssurance === null) {
      return createCaseModel(caseDefinition, null, null, isAuthenticatedSource);
    }

    return (
      currentAssurance.cases.find(({ id }) => id === caseDefinition.id) ??
      createCaseModel(caseDefinition, null, null, isAuthenticatedSource)
    );
  });
  const groups: ISemanticEvaluationWebsiteModel['groups'] = (
    Object.entries(SEMANTIC_EVALUATION_GROUPS) as Array<
      [
        keyof typeof SEMANTIC_EVALUATION_GROUPS,
        (typeof SEMANTIC_EVALUATION_GROUPS)[keyof typeof SEMANTIC_EVALUATION_GROUPS],
      ]
    >
  ).map(([id, group]) => ({
    cases: cases.filter(({ groupId }) => groupId === id),
    description: group.description,
    id,
    title: group.title,
  }));
  if (groups.some(({ cases: groupCases }) => groupCases.length === 0)) {
    throw new Error('Every semantic evidence group must contain at least one current case.');
  }
  const sourceContractCases = cases.filter(({ groupId }) => groupId === 'source-contract');
  if (sourceContractCases.length > 0) {
    groups.push({
      cases: sourceContractCases,
      description: 'Scenarios retained exactly as evaluated by the authenticated source release.',
      id: 'source-contract',
      title: 'Source release scenarios',
    });
  }
  const currentCoverageDigest = isAuthenticatedSource
    ? createAuthenticatedJsonDigest(coverage)
    : createSemanticCoverageDigest(coverage, caseDefinitions);

  return {
    artifactDigest: createPortableSkillDigest(repositoryRoot),
    attempts: attemptModels,
    caseCount: caseDefinitions.length,
    caseSuiteDigest: isAuthenticatedSource
      ? createAuthenticatedSemanticCaseSuiteDigest(caseDefinitions)
      : createSemanticCaseSuiteDigest(caseDefinitions),
    cli: createSemanticCliIdentity(repositoryRoot),
    coverageDigest: currentCoverageDigest,
    coverageUrl: `${RAW_SOURCE_REPOSITORY_URL}/${encodeURIComponent(revision)}/${SEMANTIC_COVERAGE_PATH}`,
    currentAssurance,
    evidenceMatch,
    evaluatedAt: currentAssurance?.result.updatedAt ?? null,
    evaluationModel: 'gpt-5.6-sol',
    failedCaseCount: currentAssurance?.result.failedCaseCount ?? 0,
    groups,
    hasAttempt: attemptModels.length > 0,
    lastPassing,
    latest,
    latestPointer,
    methodologyUrl: SEMANTIC_EVALUATION_METHODOLOGY_ROUTE,
    passedCaseCount: currentAssurance?.result.passedCaseCount ?? 0,
    pendingCaseCount: currentAssurance?.result.pendingCaseCount ?? caseDefinitions.length,
    recoveredCaseCount: currentAssurance?.result.recoveredCaseCount ?? 0,
    route: SEMANTIC_EVALUATION_ROUTE,
    status: currentAssurance?.result.status ?? 'not-recorded',
  };
};
