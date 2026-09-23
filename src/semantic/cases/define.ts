import { SemanticCaseDefinitionSchema } from './schema.ts';
import type { ISemanticCase } from './types.ts';

/**
 * Validates one independently owned semantic case while retaining its optional setup callback.
 * @param semanticCase Complete discovered case definition.
 * @returns The same typed case after validating its serializable contract.
 */
export const defineSemanticCase = <TCase extends ISemanticCase>(semanticCase: TCase): TCase => {
  const { setup, ...serializableCase } = semanticCase;
  SemanticCaseDefinitionSchema.parse(serializableCase);
  if (setup !== undefined && typeof setup !== 'function') {
    throw new Error(`${semanticCase.id} setup must be a function when provided.`);
  }
  if (
    semanticCase.resourceBudget.minimumMoldeaCommands >
    semanticCase.resourceBudget.maximumMoldeaCommands
  ) {
    throw new Error(`${semanticCase.id} has an inverted moldea command budget.`);
  }
  return semanticCase;
};
