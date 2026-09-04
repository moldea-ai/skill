import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationGroupId,
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

const isOfficialSemanticHost = (host: {
  model: string;
  name: string;
  reasoningEffort: string;
  version?: string;
}): boolean =>
  host.model === 'gpt-5.6-sol' &&
  host.name === 'codex' &&
  host.reasoningEffort === 'medium' &&
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

const loadCaseDefinitions = (repositoryRoot: string): ISemanticCaseDefinition[] => {
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
    validateSemanticCaseDefinition(caseDefinition as ISemanticCaseDefinition),
  );
};

const hasCurrentAttemptIdentity = (
  attempt: ISemanticAttemptRecord,
  caseDefinitions: ISemanticCaseDefinition[],
  coverage: unknown,
  repositoryRoot: string,
): boolean => {
  const caseIds = caseDefinitions.map(({ id }) => id);
  const presentationIds = Object.keys(SEMANTIC_CASE_PRESENTATION);
  if (
    new Set(caseIds).size !== caseIds.length ||
    JSON.stringify([...caseIds].sort()) !== JSON.stringify([...presentationIds].sort())
  ) {
    throw new Error('Semantic case presentation metadata must match the complete current suite.');
  }

  const attemptCaseIds = attempt.cases.map(({ id }) => id);
  const hasInputMismatch =
    attempt.artifactDigest !== createPortableSkillDigest(repositoryRoot) ||
    attempt.caseSuiteDigest !== createSemanticCaseSuiteDigest(caseDefinitions) ||
    attempt.coverageDigest !== createSemanticCoverageDigest(coverage, caseDefinitions) ||
    attempt.evidence.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION ||
    JSON.stringify(attempt.cli) !== JSON.stringify(createSemanticCliIdentity(repositoryRoot)) ||
    attempt.totalCaseCount !== caseDefinitions.length ||
    new Set(attemptCaseIds).size !== attemptCaseIds.length ||
    attemptCaseIds.some((id) => !caseIds.includes(id));
  const hasOfficialHosts =
    isOfficialSemanticHost(attempt.hostContract) &&
    attempt.cases.every(({ trials }) =>
      trials.every(
        ({ actorHost, judgeHost }) =>
          isOfficialSemanticHost(actorHost) && isOfficialSemanticHost(judgeHost),
      ),
    );
  if (!hasOfficialHosts) {
    throw new Error('Latest semantic attempt does not use its schema-owned host configuration.');
  }

  return !hasInputMismatch;
};

const createCaseModel = (
  caseDefinition: ISemanticCaseDefinition | null,
  attemptCase: ISemanticAttemptRecord['cases'][number] | null,
  replayCandidate: ISemanticReplayCandidate | null,
): ISemanticEvaluationCaseModel => {
  const id = attemptCase?.id ?? caseDefinition?.id;
  if (id === undefined) {
    throw new Error('Semantic case model requires a current definition or an immutable trial.');
  }
  const presentation = SEMANTIC_CASE_PRESENTATION[id as keyof typeof SEMANTIC_CASE_PRESENTATION];
  const latestTrial = attemptCase?.trials.at(-1);
  if (attemptCase === null && presentation === undefined) {
    throw new Error(`Semantic case ${id} has no public presentation model.`);
  }
  if ((attemptCase === null) !== (replayCandidate === null)) {
    throw new Error(`Semantic case ${id} has incomplete replay inputs.`);
  }

  const replayProjection =
    attemptCase === null || replayCandidate === null
      ? null
      : createSemanticEvaluationReplay(caseDefinition, attemptCase, replayCandidate);
  const hasCurrentCaseDefinition =
    caseDefinition !== null &&
    (replayProjection === null ||
      replayProjection.caseDefinitionDigest === createSemanticCaseDefinitionDigest(caseDefinition));
  const activeCaseDefinition = hasCurrentCaseDefinition ? caseDefinition : null;
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
    groupId: hasCurrentCaseDefinition ? (presentation?.groupId ?? null) : null,
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
    title: hasCurrentCaseDefinition ? (presentation?.title ?? id) : id,
    trials: attemptCase?.trials.map((trial) => ({ ...trial })) ?? [],
  };
};

const createAttemptModel = (
  attempt: ISemanticAttemptRecord,
  caseDefinitions: ISemanticCaseDefinition[],
  repositoryRoot: string,
): ISemanticAttemptModel => {
  const attemptPath = `${SEMANTIC_ATTEMPTS_PATH}/attempts/${attempt.attemptId}`;
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
    return createCaseModel(caseDefinition, attemptCase, replayCandidate);
  });

  return {
    cases,
    rawAttemptUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${attemptPath}/attempt.json`,
    rawEvidenceUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${attemptPath}/evidence.json`,
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
): ISemanticEvaluationWebsiteModel => {
  const caseDefinitions = loadCaseDefinitions(repositoryRoot);
  const coverage = readJson(join(repositoryRoot, SEMANTIC_COVERAGE_PATH));
  const loadedHistory = loadVerifiedSemanticEvaluationAttempts(
    join(repositoryRoot, SEMANTIC_ATTEMPTS_PATH),
  );
  const attempts = loadedHistory.attempts.map((attempt) =>
    SemanticAttemptRecordSchema.parse(attempt),
  );
  const latestPointer =
    loadedHistory.latest === null ? null : SemanticLatestResultSchema.parse(loadedHistory.latest);
  const attemptModels = attempts.map((attempt) =>
    createAttemptModel(attempt, caseDefinitions, repositoryRoot),
  );
  const latest =
    latestPointer === null
      ? null
      : (attemptModels.find(({ result }) => result.attemptId === latestPointer.latestAttemptId) ??
        null);
  if (latestPointer !== null && latest === null) {
    throw new Error('Semantic latest pointer does not resolve to an immutable attempt.');
  }
  const hasExactCurrentEvaluation =
    latest !== null &&
    hasCurrentAttemptIdentity(latest.result, caseDefinitions, coverage, repositoryRoot);
  const currentAssurance = hasExactCurrentEvaluation ? latest : null;
  const evidenceMatch = hasExactCurrentEvaluation ? 'exact' : null;

  const lastPassing =
    latestPointer?.lastPassingAttemptId == null
      ? null
      : (attemptModels.find(
          ({ result }) => result.attemptId === latestPointer.lastPassingAttemptId,
        ) ?? null);
  if (latestPointer?.lastPassingAttemptId != null && lastPassing === null) {
    throw new Error('Semantic last-passing pointer does not resolve to an immutable attempt.');
  }

  const cases = caseDefinitions.map((caseDefinition) => {
    if (currentAssurance === null) return createCaseModel(caseDefinition, null, null);

    return (
      currentAssurance.cases.find(({ id }) => id === caseDefinition.id) ??
      createCaseModel(caseDefinition, null, null)
    );
  });
  const groups = (
    Object.entries(SEMANTIC_EVALUATION_GROUPS) as Array<
      [ISemanticEvaluationGroupId, (typeof SEMANTIC_EVALUATION_GROUPS)[ISemanticEvaluationGroupId]]
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
  const currentCoverageDigest = createSemanticCoverageDigest(coverage, caseDefinitions);

  return {
    artifactDigest: createPortableSkillDigest(repositoryRoot),
    attempts: attemptModels,
    caseCount: caseDefinitions.length,
    caseSuiteDigest: createSemanticCaseSuiteDigest(caseDefinitions),
    cli: createSemanticCliIdentity(repositoryRoot),
    coverageDigest: currentCoverageDigest,
    coverageUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${SEMANTIC_COVERAGE_PATH}`,
    currentAssurance,
    evidenceMatch,
    evaluatedAt: currentAssurance?.result.updatedAt ?? null,
    evaluationModel: 'gpt-5.6-sol',
    failedCaseCount: currentAssurance?.result.failedCaseCount ?? 0,
    groups,
    hasAttempt: currentAssurance !== null,
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
