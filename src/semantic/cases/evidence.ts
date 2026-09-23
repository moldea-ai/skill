import { createHash } from 'node:crypto';

import { stringifyJSONDeterministically } from 'web-utils-kit';

import { SemanticCaseDefinitionSchema } from './schema.ts';
import type { ISemanticCase, ISemanticCaseDefinition, ISemanticCriterion } from './types.ts';

/** Returns the stable behavior labels declared by evaluator-only criteria. */
export const getSemanticCriterionLabels = (criteria: readonly ISemanticCriterion[]): string[] =>
  criteria.map(({ label }) => label);

/** Hashes one serializable case definition independently of object key insertion order. */
export const createSemanticCaseDefinitionDigest = (caseDefinition: ISemanticCase): string => {
  const serializableCase: Partial<ISemanticCase> = { ...caseDefinition };
  delete serializableCase.setup;
  const parsedCase = SemanticCaseDefinitionSchema.parse(serializableCase);
  return createHash('sha256').update(stringifyJSONDeterministically(parsedCase)).digest('hex');
};

/** Hashes the complete case suite in stable case-id order. */
export const createSemanticCaseSuiteDigest = (
  caseDefinitions: readonly ISemanticCase[],
): string => {
  const definitionsById = caseDefinitions
    .map((caseDefinition) => ({
      digest: createSemanticCaseDefinitionDigest(caseDefinition),
      id: caseDefinition.id,
    }))
    .sort(({ id: left }, { id: right }) => left.localeCompare(right, 'en'));

  if (new Set(definitionsById.map(({ id }) => id)).size !== definitionsById.length) {
    throw new Error('Semantic evaluation case ids must be unique.');
  }

  return createHash('sha256').update(stringifyJSONDeterministically(definitionsById)).digest('hex');
};

/** Validates the serializable case contract while preserving its established type. */
export const validateSemanticCaseDefinition = <TCase extends ISemanticCaseDefinition>(
  caseDefinition: TCase,
): TCase => {
  SemanticCaseDefinitionSchema.parse(caseDefinition);
  return caseDefinition;
};
