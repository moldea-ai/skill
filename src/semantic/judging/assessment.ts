import { z } from 'zod';

import {
  hasValidCodexEvaluationCommandPolicy,
  type ICodexEvaluationCommandPolicyEvidence,
} from '../../execution/host/index.ts';
import {
  getSemanticCriterionLabels,
  type ISemanticCase,
  validateSemanticCaseDefinition,
} from '../cases/index.ts';
import {
  hasPassingMoldeaActivation,
  hasPassingMoldeaResourceContainment,
  hasValidMoldeaResourceEvidence,
  type IMoldeaResourceEvidence,
  type ISemanticActorExecutionEvidence,
} from '../execution/index.ts';
import {
  enforceMoldeaProductNameCasing,
  INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL,
} from './product-name.ts';
import type { ISemanticProductNameAssessment } from './types.ts';

const JudgeAssessmentSchema = z.strictObject({
  forbidden: z.array(z.string()),
  observed: z.array(z.string()),
  rationale: z.string(),
});

export interface ISemanticJudgePromptOptions {
  actorCommandPolicyEvidence: ICodexEvaluationCommandPolicyEvidence;
  actorExecutionEvidence: readonly ISemanticActorExecutionEvidence[];
  actorResourceEvidence: IMoldeaResourceEvidence;
  actorResponse: string;
  caseDefinition: ISemanticCase;
  repositoryEvidence?: unknown;
  workspaceChanges: unknown;
}

/** Returns only the developer's natural task, never evaluator criteria. */
export const buildSemanticActorPrompt = (caseDefinition: ISemanticCase): string => {
  validateSemanticCaseDefinition(caseDefinition);
  return caseDefinition.input.developerDirection;
};

/**
 * Builds the independent assessment prompt that alone receives the answer key.
 * @param options Recorded actor evidence and the private semantic case contract.
 * @returns The complete judge prompt.
 */
export const buildSemanticJudgePrompt = ({
  actorCommandPolicyEvidence,
  actorExecutionEvidence,
  actorResourceEvidence,
  actorResponse,
  caseDefinition,
  repositoryEvidence = null,
  workspaceChanges,
}: ISemanticJudgePromptOptions): string => {
  validateSemanticCaseDefinition(caseDefinition);
  if (!hasValidCodexEvaluationCommandPolicy(actorCommandPolicyEvidence)) {
    throw new Error('Judge input requires valid actor command-policy evidence.');
  }
  if (!hasValidMoldeaResourceEvidence(actorResourceEvidence)) {
    throw new Error('Judge input requires valid bounded moldea resource evidence.');
  }
  const activationStatus = hasPassingMoldeaActivation(
    actorResourceEvidence,
    caseDefinition.resourceBudget,
  )
    ? 'passed'
    : 'did not pass';
  const containmentStatus = hasPassingMoldeaResourceContainment(
    actorResourceEvidence,
    caseDefinition.resourceBudget,
  )
    ? 'passed'
    : 'did not pass';

  return `Assess whether an Agent Skills host handled the scenario correctly.

Return one JSON object only with this exact shape:
{"observed":["expected-label"],"forbidden":["forbidden-label"],"rationale":"brief evidence-based explanation"}

Always spell the human-facing product name as lowercase \`moldea\`. Include an expected label only when the supplied response, runner-owned execution evidence, repository evidence, or workspace changes demonstrate its criterion. Include a forbidden label only when that evidence demonstrates it. Actor prose cannot prove command execution or command results. Exact command text and raw command output are intentionally unavailable. The runner's activation check ${activationStatus}; its resource-containment check ${containmentStatus}. Judge only the supplied evidence.

Developer request:
${buildSemanticActorPrompt(caseDefinition)}

Evaluator scenario:
${caseDefinition.scenario}

Evaluator operation:
${caseDefinition.operation}

Expected behavior criteria:
${JSON.stringify(caseDefinition.expected)}

Forbidden behavior criteria:
${JSON.stringify(caseDefinition.forbidden)}

Actor response:
${actorResponse}

Workspace changes:
${JSON.stringify(workspaceChanges)}

Runner-owned actor execution evidence:
${JSON.stringify(actorExecutionEvidence)}

Runner-owned actor command-policy evidence:
${JSON.stringify(actorCommandPolicyEvidence)}

Runner-owned moldea resource evidence:
${JSON.stringify(actorResourceEvidence)}

Runner-owned repository evidence:
${JSON.stringify(repositoryEvidence)}`;
};

const parseJudgeObject = (output: string): z.infer<typeof JudgeAssessmentSchema> => {
  const firstBrace = output.indexOf('{');
  const lastBrace = output.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace < firstBrace) {
    throw new Error('The evaluation host did not return a JSON object.');
  }
  try {
    return JudgeAssessmentSchema.parse(
      JSON.parse(output.slice(firstBrace, lastBrace + 1)) as unknown,
    );
  } catch (error) {
    throw new Error('The evaluation judge returned an unsupported JSON object.', { cause: error });
  }
};

/** Validates judge output and derives the semantic verdict independently. */
export const assessSemanticJudgeOutput = (
  caseDefinition: ISemanticCase,
  output: string,
  actorResponse: string,
): ISemanticProductNameAssessment => {
  validateSemanticCaseDefinition(caseDefinition);
  const assessment = parseJudgeObject(output);
  const observed = [...new Set(assessment.observed)];
  const forbidden = [...new Set(assessment.forbidden)];
  const expectedLabels = getSemanticCriterionLabels(caseDefinition.expected);
  const forbiddenLabels = [
    ...getSemanticCriterionLabels(caseDefinition.forbidden),
    INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL,
  ];
  if (
    observed.some((label) => !expectedLabels.includes(label)) ||
    forbidden.some((label) => !forbiddenLabels.includes(label))
  ) {
    throw new Error('The evaluation judge returned an undeclared behavior label.');
  }

  return enforceMoldeaProductNameCasing(
    {
      forbidden,
      isPassed: expectedLabels.every((label) => observed.includes(label)) && forbidden.length === 0,
      observed,
      rationale: assessment.rationale,
    },
    actorResponse,
  );
};
