import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createPortableSkillDigest,
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
import type {
  ISemanticAttemptModel,
  ISemanticCaseDefinition,
  ISemanticEvaluationCaseId,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationGroupId,
  ISemanticEvaluationWebsiteModel,
} from './types.ts';
import {
  SemanticAttemptRecordSchema,
  SemanticLatestResultSchema,
  type ISemanticAttemptRecord,
} from './validations.ts';

const CONFORMANCE_CASES_PATH = 'fixtures/conformance-cases.json';
const SEMANTIC_ATTEMPTS_PATH = 'fixtures/semantic-evaluation-results';
const SEMANTIC_COVERAGE_PATH = 'fixtures/semantic-evaluation-coverage.json';

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

const assertCurrentAttemptIdentity = (
  attempt: ISemanticAttemptRecord,
  caseDefinitions: ISemanticCaseDefinition[],
  coverage: unknown,
  repositoryRoot: string,
): void => {
  const caseIds = caseDefinitions.map(({ id }) => id);
  const presentationIds = Object.keys(SEMANTIC_CASE_PRESENTATION);
  if (
    new Set(caseIds).size !== caseIds.length ||
    JSON.stringify([...caseIds].sort()) !== JSON.stringify([...presentationIds].sort())
  ) {
    throw new Error('Semantic case presentation metadata must match the complete current suite.');
  }

  const attemptCaseIds = attempt.cases.map(({ id }) => id);
  if (
    attempt.artifactDigest !== createPortableSkillDigest(repositoryRoot) ||
    attempt.caseSuiteDigest !== createSemanticCaseSuiteDigest(caseDefinitions) ||
    attempt.coverageDigest !== createSemanticCoverageDigest(coverage, caseDefinitions) ||
    attempt.evidence.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION ||
    JSON.stringify(attempt.cli) !== JSON.stringify(createSemanticCliIdentity(repositoryRoot)) ||
    attempt.totalCaseCount !== caseDefinitions.length ||
    new Set(attemptCaseIds).size !== attemptCaseIds.length ||
    attemptCaseIds.some((id) => !caseIds.includes(id))
  ) {
    throw new Error(
      'Latest semantic attempt does not match the current release evidence boundary.',
    );
  }
  if (
    attempt.actorHost.model !== 'gpt-5.6-terra' ||
    attempt.judgeHost.model !== 'gpt-5.6-terra' ||
    attempt.actorHost.reasoningEffort !== 'medium' ||
    attempt.judgeHost.reasoningEffort !== 'medium'
  ) {
    throw new Error('Latest semantic attempt does not use the official Terra host configuration.');
  }
};

const createAttemptModel = (attempt: ISemanticAttemptRecord): ISemanticAttemptModel => {
  const attemptPath = `${SEMANTIC_ATTEMPTS_PATH}/attempts/${attempt.attemptId}`;
  return {
    rawAttemptUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${attemptPath}/attempt.json`,
    rawEvidenceUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${attemptPath}/evidence.json`,
    result: attempt,
    route: `${SEMANTIC_EVALUATION_ROUTE}attempts/${attempt.attemptId}/`,
  };
};

const createCaseModel = (
  caseDefinition: ISemanticCaseDefinition,
  latestAttempt: ISemanticAttemptRecord,
): ISemanticEvaluationCaseModel => {
  const id = caseDefinition.id as ISemanticEvaluationCaseId;
  const presentation = SEMANTIC_CASE_PRESENTATION[id];
  const attemptCase = latestAttempt.cases.find(({ id: attemptCaseId }) => attemptCaseId === id);
  const latestTrial = attemptCase?.trials.at(-1);
  if (presentation === undefined) {
    throw new Error(`Semantic case ${id} has no public presentation model.`);
  }

  const operation = caseDefinition.operation.trim();
  const scenario = caseDefinition.scenario;
  return {
    confirmationStatus: attemptCase?.confirmationStatus ?? null,
    evaluatedAt: latestTrial?.evaluatedAt ?? null,
    expectedCriteria: caseDefinition.expected,
    forbiddenCriteria: caseDefinition.forbidden,
    groupId: presentation.groupId,
    id,
    rationale: latestTrial?.rationale ?? null,
    scenario: operation ? `${scenario} Requested operation: ${operation}.` : scenario,
    status: attemptCase?.status ?? 'pending',
    title: presentation.title,
    trials: attemptCase?.trials ?? [],
  };
};

/** Loads complete immutable semantic history and validates the latest release-bound attempt. */
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
  const latestPointer = SemanticLatestResultSchema.parse(loadedHistory.latest);
  const attemptModels = attempts.map(createAttemptModel);
  const latest = attemptModels.find(
    ({ result }) => result.attemptId === latestPointer.latestAttemptId,
  );
  if (latest === undefined) {
    throw new Error('Semantic latest pointer does not resolve to an immutable attempt.');
  }
  assertCurrentAttemptIdentity(latest.result, caseDefinitions, coverage, repositoryRoot);

  const lastPassing =
    latestPointer.lastPassingAttemptId === null
      ? null
      : (attemptModels.find(
          ({ result }) => result.attemptId === latestPointer.lastPassingAttemptId,
        ) ?? null);
  if (latestPointer.lastPassingAttemptId !== null && lastPassing === null) {
    throw new Error('Semantic last-passing pointer does not resolve to an immutable attempt.');
  }

  const cases = caseDefinitions.map((caseDefinition) =>
    createCaseModel(caseDefinition, latest.result),
  );
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
  const currentCoverageDigest = latest.result.coverageDigest;
  if (currentCoverageDigest === null) {
    throw new Error('Latest semantic attempt does not record the current coverage digest.');
  }

  return {
    artifactDigest: latest.result.artifactDigest,
    attempts: attemptModels,
    caseCount: caseDefinitions.length,
    caseSuiteDigest: latest.result.caseSuiteDigest,
    cli: latest.result.cli,
    coverageDigest: currentCoverageDigest,
    coverageUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${SEMANTIC_COVERAGE_PATH}`,
    evaluatedAt: latest.result.updatedAt,
    failedCaseCount: latest.result.failedCaseCount,
    groups,
    lastPassing,
    latest,
    latestPointer,
    methodologyUrl: SEMANTIC_EVALUATION_METHODOLOGY_ROUTE,
    passedCaseCount: latest.result.passedCaseCount,
    pendingCaseCount: latest.result.pendingCaseCount,
    recoveredCaseCount: latest.result.recoveredCaseCount,
    route: SEMANTIC_EVALUATION_ROUTE,
    status: latest.result.status,
  };
};
