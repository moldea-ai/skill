import { validateSemanticCaseDefinition } from './evidence.ts';
import type { ISemanticCase } from './types.ts';

/**
 * Validates one independently owned semantic case while retaining its optional setup callback.
 * @param semanticCase Complete discovered case definition.
 * @returns The same typed case after validating its serializable contract.
 */
export const defineSemanticCase = <TCase extends ISemanticCase>(semanticCase: TCase): TCase => {
  validateSemanticCaseDefinition(semanticCase);
  if (semanticCase.setup !== undefined && typeof semanticCase.setup !== 'function') {
    throw new Error(`${semanticCase.id} setup must be a function when provided.`);
  }
  if (
    semanticCase.verifyWorkspace !== undefined &&
    typeof semanticCase.verifyWorkspace !== 'function'
  ) {
    throw new Error('Semantic workspace verification requires a function.');
  }
  return semanticCase;
};
