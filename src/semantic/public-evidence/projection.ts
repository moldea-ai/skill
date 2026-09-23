import { toTitleCase } from 'web-utils-kit';

import type { IEvaluationReplayModel } from '@moldea.ai/website-ui/evaluation-replay-model';

import {
  createEvidenceBundle,
  type IEvidenceArtifactInput,
  type IEvidenceBundle,
  type IEvidenceClassification,
} from '../../evidence/index.ts';
import { createSemanticCaseSuiteDigest, type ISemanticCase } from '../cases/index.ts';
import { createSemanticCoverage, createSemanticCoverageDigest } from '../coverage/index.ts';
import type {
  ISemanticAttemptModel,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationWebsiteModel,
} from './types.ts';

const SEMANTIC_ROUTE = '/evidence/semantic/';

const createCaseTitle = (caseId: string): string => toTitleCase(caseId.replaceAll('-', ' '));

const createCaseScenario = (definition: ISemanticCase): string =>
  definition.operation.trim() === ''
    ? definition.scenario
    : `${definition.scenario} Requested operation: ${definition.operation}.`;

/** Creates one immutable website case from its recorded result and definition. */
const createCaseModel = (
  definition: ISemanticCase,
  resultCase: ISemanticAttemptModel['result']['cases'][number],
  replay: IEvaluationReplayModel | null,
): ISemanticEvaluationCaseModel => {
  const latestTrial = resultCase.trials.at(-1);
  const title = createCaseTitle(definition.id);

  return {
    confirmationStatus: resultCase.confirmationStatus,
    developerDirection: definition.input.developerDirection,
    evaluatedAt: latestTrial?.evaluatedAt ?? null,
    expectedCriteria: definition.expected,
    forbiddenCriteria: definition.forbidden,
    groupId: definition.coverageClaimIds[0] ?? 'semantic-behavior',
    hasCurrentCaseDefinition: true,
    id: definition.id,
    presentation: { summary: definition.scenario, title },
    rationale: latestTrial?.rationale ?? null,
    replay,
    scenario: createCaseScenario(definition),
    status: resultCase.status,
    summary: definition.scenario,
    title,
    trials: resultCase.trials,
  };
};

/** Creates one current semantic case without implying that it has been evaluated. */
const createPendingCaseModel = (definition: ISemanticCase): ISemanticEvaluationCaseModel => {
  const title = createCaseTitle(definition.id);

  return {
    confirmationStatus: null,
    developerDirection: definition.input.developerDirection,
    evaluatedAt: null,
    expectedCriteria: definition.expected,
    forbiddenCriteria: definition.forbidden,
    groupId: definition.coverageClaimIds[0] ?? 'semantic-behavior',
    hasCurrentCaseDefinition: true,
    id: definition.id,
    presentation: { summary: definition.scenario, title },
    rationale: null,
    replay: null,
    scenario: createCaseScenario(definition),
    status: 'pending',
    summary: definition.scenario,
    title,
    trials: [],
  };
};

const createGroups = (
  cases: readonly ISemanticEvaluationCaseModel[],
  descriptionPrefix: 'Current' | 'Recorded',
): ISemanticEvaluationWebsiteModel['groups'] => {
  const casesByGroup = new Map<string, ISemanticEvaluationCaseModel[]>();
  for (const semanticCase of cases) {
    const groupId = semanticCase.groupId ?? 'semantic-behavior';
    const groupedCases = casesByGroup.get(groupId) ?? [];
    groupedCases.push(semanticCase);
    casesByGroup.set(groupId, groupedCases);
  }

  return [...casesByGroup.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([id, groupedCases]) => ({
      cases: groupedCases,
      description: `${descriptionPrefix} scenarios for the ${id.replaceAll('-', ' ')} coverage claim.`,
      id,
      title: createCaseTitle(id),
    }));
};

/** Projects the current semantic case catalog without creating evaluation results. */
export const createSemanticCatalogWebsiteModel = (
  definitions: readonly ISemanticCase[],
): ISemanticEvaluationWebsiteModel => {
  const cases = [...definitions]
    .sort(({ id: left }, { id: right }) => left.localeCompare(right, 'en'))
    .map(createPendingCaseModel);
  const coverage = createSemanticCoverage(definitions);

  return {
    artifactDigest: null,
    attempts: [],
    caseCount: cases.length,
    caseSuiteDigest: createSemanticCaseSuiteDigest(definitions),
    cli: null,
    coverageDigest: createSemanticCoverageDigest(coverage),
    coverageUrl: null,
    currentAssurance: null,
    evidenceMatch: null,
    evaluatedAt: null,
    evaluationModel: null,
    failedCaseCount: 0,
    groups: createGroups(cases, 'Current'),
    hasAttempt: false,
    lastPassing: null,
    latest: null,
    latestPointer: null,
    methodologyUrl: '/docs/semantic-evaluation/',
    passedCaseCount: 0,
    pendingCaseCount: cases.length,
    recoveredCaseCount: 0,
    route: SEMANTIC_ROUTE,
    status: 'not-recorded',
  };
};

/**
 * Projects one completed semantic attempt and its exact recorded definitions for the website.
 * @returns A self-contained public bundle whose displayed inventory cannot depend on future cases.
 */
export const createSemanticEvidenceBundle = (options: {
  artifacts?: readonly IEvidenceArtifactInput[];
  classification: IEvidenceClassification;
  definitions: readonly ISemanticCase[];
  replays?: ReadonlyMap<string, IEvaluationReplayModel>;
  result: ISemanticAttemptModel['result'];
  version: string;
}): IEvidenceBundle => {
  const definitionsById = new Map(
    options.definitions.map((definition) => [definition.id, definition]),
  );
  if (definitionsById.size !== options.definitions.length) {
    throw new Error('Semantic evidence definitions must have unique case ids.');
  }
  if (
    (options.result.status === 'passed' &&
      options.result.cases.length !== options.definitions.length) ||
    options.result.cases.some(({ id }) => !definitionsById.has(id))
  ) {
    throw new Error('Semantic attempt cases do not match their recorded definitions.');
  }

  const cases = options.result.cases.map((resultCase) => {
    const definition = definitionsById.get(resultCase.id);
    if (definition === undefined) {
      throw new Error(`Semantic attempt references unknown case ${resultCase.id}.`);
    }
    return createCaseModel(definition, resultCase, options.replays?.get(resultCase.id) ?? null);
  });
  const attempt: ISemanticAttemptModel = {
    cases,
    evidenceSource: { kind: 'recorded' },
    rawAttemptUrl: `/evidence-assets/semantic/.evidence/semantic/results/attempts/${options.result.attemptId}/attempt.json`,
    rawEvidenceUrl: `/evidence-assets/semantic/.evidence/semantic/results/attempts/${options.result.attemptId}/evidence.json`,
    result: options.result,
    route: `${SEMANTIC_ROUTE}attempts/${options.result.attemptId}/`,
  };
  const isPassing = options.result.status === 'passed';
  const websiteModel: ISemanticEvaluationWebsiteModel = {
    artifactDigest: options.result.artifactDigest,
    attempts: [attempt],
    caseCount: cases.length,
    caseSuiteDigest: options.result.caseSuiteDigest,
    cli: options.result.cli,
    coverageDigest: options.result.coverageDigest,
    coverageUrl: '/evidence-assets/semantic/.evidence/semantic/results/coverage.json',
    currentAssurance: isPassing ? attempt : null,
    evidenceMatch: isPassing ? 'exact' : null,
    evaluatedAt: options.result.updatedAt,
    evaluationModel: options.result.hostContract.actor.model,
    failedCaseCount: options.result.failedCaseCount,
    groups: createGroups(cases, 'Recorded'),
    hasAttempt: true,
    lastPassing: isPassing ? attempt : null,
    latest: attempt,
    latestPointer: {
      lastPassingAttemptId: isPassing ? options.result.attemptId : null,
      latestAttemptId: options.result.attemptId,
      latestStatus: options.result.status,
      schemaVersion: 1,
      updatedAt: options.result.updatedAt,
    },
    methodologyUrl: '/docs/semantic-evaluation/',
    passedCaseCount: options.result.passedCaseCount,
    pendingCaseCount: options.result.pendingCaseCount,
    recoveredCaseCount: options.result.recoveredCaseCount,
    route: SEMANTIC_ROUTE,
    status: options.result.status,
  };

  return createEvidenceBundle({
    artifacts: options.artifacts ?? [],
    classification: options.classification,
    kind: 'semantic',
    payload: { websiteModel },
    run: {
      attemptId: options.result.attemptId,
      evaluatedAt: options.result.updatedAt,
      provenance: { sourceUrl: 'https://github.com/moldea-ai/skill' },
      status: options.result.status,
      version: options.version,
    },
  });
};
