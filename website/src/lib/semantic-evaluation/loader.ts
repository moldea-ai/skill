import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  getSemanticCriterionLabels,
  hasValidRepositoryControlEvidence,
  hasValidScenarioEvidence,
  hasValidPortableSkillSemanticCarryForward,
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
  ISemanticCaseDefinition,
  ISemanticEvaluationCaseId,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationGroupId,
  ISemanticEvaluationWebsiteModel,
} from './types.ts';
import { SemanticEvaluationResultSchema, type ISemanticEvaluationResult } from './validations.ts';

const SEMANTIC_RESULT_PATH = 'fixtures/semantic-evaluation-result.json';
const CONFORMANCE_CASES_PATH = 'fixtures/conformance-cases.json';
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

const assertExactIdentity = (
  result: ISemanticEvaluationResult,
  caseDefinitions: ISemanticCaseDefinition[],
  coverage: unknown,
  repositoryRoot: string,
): void => {
  const artifactDigest = createPortableSkillDigest(repositoryRoot);
  const carryForward = result.releaseEvidenceCarryForward;
  const hasExactArtifact = result.skillDigest === artifactDigest;
  const hasValidCarryForward = hasValidPortableSkillSemanticCarryForward(
    carryForward,
    result.skillDigest,
    repositoryRoot,
  );

  if (!hasExactArtifact && !hasValidCarryForward) {
    throw new Error('Semantic evidence does not match the current portable skill artifact.');
  }
  if (hasExactArtifact && carryForward !== undefined) {
    throw new Error('Exact semantic evidence must not declare release-only carry-forward.');
  }
  if (
    result.artifact.sha256 !== result.skillDigest ||
    result.artifactDigest !== result.skillDigest ||
    result.artifactSha256 !== result.skillDigest
  ) {
    throw new Error('Semantic evidence contains contradictory artifact digests.');
  }
  if (result.caseSuiteDigest !== createSemanticCaseSuiteDigest(caseDefinitions)) {
    throw new Error('Semantic evidence does not match the current case suite.');
  }
  if (result.coverageDigest !== createSemanticCoverageDigest(coverage, caseDefinitions)) {
    throw new Error('Semantic evidence does not match the current coverage contract.');
  }
  if (
    result.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION ||
    JSON.stringify(result.cli) !== JSON.stringify(createSemanticCliIdentity(repositoryRoot))
  ) {
    throw new Error('Semantic evidence does not match the current evaluation protocol and CLI.');
  }
  if (
    JSON.stringify(result.host) !== JSON.stringify(result.actorHost) ||
    result.actorHost.model !== 'gpt-5.6-terra' ||
    result.judgeHost.model !== 'gpt-5.6-terra' ||
    result.actorHost.reasoningEffort !== 'medium' ||
    result.judgeHost.reasoningEffort !== 'medium'
  ) {
    throw new Error('Semantic evidence does not use the official actor and judge hosts.');
  }
};

const assertCompletePassingCases = (
  result: ISemanticEvaluationResult,
  caseDefinitions: ISemanticCaseDefinition[],
): void => {
  const caseIds = caseDefinitions.map(({ id }) => id);
  const presentationIds = Object.keys(SEMANTIC_CASE_PRESENTATION);
  if (
    new Set(caseIds).size !== caseIds.length ||
    JSON.stringify([...caseIds].sort()) !== JSON.stringify([...presentationIds].sort())
  ) {
    throw new Error('Semantic case presentation metadata must match the complete current suite.');
  }

  const resultsById = new Map(result.cases.map((caseResult) => [caseResult.id, caseResult]));
  const rawResultsById = new Map(result.results.map((caseResult) => [caseResult.id, caseResult]));
  if (
    resultsById.size !== result.cases.length ||
    rawResultsById.size !== result.results.length ||
    result.cases.length !== caseDefinitions.length ||
    result.results.length !== caseDefinitions.length
  ) {
    throw new Error('Semantic evidence must contain each current case exactly once.');
  }

  for (const caseDefinition of caseDefinitions) {
    const caseResult = resultsById.get(caseDefinition.id);
    const rawResult = rawResultsById.get(caseDefinition.id);
    const expectedLabels = getSemanticCriterionLabels(caseDefinition.expected);
    const expectedDigest = createSemanticCaseDefinitionDigest(caseDefinition);

    if (
      caseResult === undefined ||
      rawResult === undefined ||
      !caseResult.passed ||
      !rawResult.passed ||
      caseResult.caseDefinitionDigest !== expectedDigest ||
      rawResult.caseDefinitionDigest !== expectedDigest ||
      JSON.stringify([...caseResult.expectedSatisfied].sort()) !==
        JSON.stringify([...expectedLabels].sort()) ||
      JSON.stringify([...rawResult.observed].sort()) !==
        JSON.stringify([...expectedLabels].sort()) ||
      caseResult.forbiddenTriggered.length > 0 ||
      rawResult.forbidden.length > 0 ||
      !hasValidScenarioEvidence(rawResult.scenarioEvidence, caseDefinition) ||
      !hasValidRepositoryControlEvidence(rawResult.repositoryControlEvidence) ||
      rawResult.repositoryControlEvidence.violations.length > 0 ||
      JSON.stringify(caseResult.scenarioEvidence) !== JSON.stringify(rawResult.scenarioEvidence) ||
      JSON.stringify(caseResult.repositoryControlEvidence) !==
        JSON.stringify(rawResult.repositoryControlEvidence) ||
      caseResult.evaluatedAt !== rawResult.evaluatedAt ||
      caseResult.rationale !== rawResult.rationale
    ) {
      throw new Error(`Semantic case ${caseDefinition.id} is incomplete, stale, or failing.`);
    }
  }
};

const createCaseModel = (
  caseDefinition: ISemanticCaseDefinition,
  result: ISemanticEvaluationResult,
): ISemanticEvaluationCaseModel => {
  const id = caseDefinition.id as ISemanticEvaluationCaseId;
  const presentation = SEMANTIC_CASE_PRESENTATION[id];
  const caseResult = result.cases.find(({ id: resultId }) => resultId === id);

  if (presentation === undefined || caseResult === undefined) {
    throw new Error(`Semantic case ${id} has no public presentation model.`);
  }

  const operation = caseDefinition.operation.trim();
  const scenario = caseDefinition.scenario;

  return {
    evaluatedAt: caseResult.evaluatedAt,
    expectedCriteria: caseDefinition.expected,
    forbiddenCriteria: caseDefinition.forbidden,
    groupId: presentation.groupId,
    id,
    rationale: caseResult.rationale,
    scenario: operation ? `${scenario} Requested operation: ${operation}.` : scenario,
    title: presentation.title,
  };
};

/** Loads and validates complete passing semantic evidence for static publication. */
export const loadSemanticEvaluationWebsiteModel = (
  repositoryRoot: string,
): ISemanticEvaluationWebsiteModel => {
  const resultPath = join(repositoryRoot, SEMANTIC_RESULT_PATH);
  if (!existsSync(resultPath)) {
    throw new Error(`Required semantic evidence is missing: ${SEMANTIC_RESULT_PATH}`);
  }

  const result = SemanticEvaluationResultSchema.parse(readJson(resultPath));
  const caseDefinitions = loadCaseDefinitions(repositoryRoot);
  const coverage = readJson(join(repositoryRoot, SEMANTIC_COVERAGE_PATH));
  assertExactIdentity(result, caseDefinitions, coverage, repositoryRoot);
  assertCompletePassingCases(result, caseDefinitions);
  const cases = caseDefinitions.map((caseDefinition) => createCaseModel(caseDefinition, result));
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

  return {
    artifactDigest: createPortableSkillDigest(repositoryRoot),
    caseCount: cases.length,
    caseSuiteDigest: result.caseSuiteDigest,
    cli: result.cli,
    coverageDigest: result.coverageDigest,
    coverageUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${SEMANTIC_COVERAGE_PATH}`,
    evaluatedAt: result.evaluatedAt,
    groups,
    methodologyUrl: SEMANTIC_EVALUATION_METHODOLOGY_ROUTE,
    rawResultUrl: `${RAW_SOURCE_REPOSITORY_URL}/main/${SEMANTIC_RESULT_PATH}`,
    route: SEMANTIC_EVALUATION_ROUTE,
  };
};
