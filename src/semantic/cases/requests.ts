import type { ISemanticCase } from './types.ts';

const CHECKPOINT_REF = 'repair-checkpoint';
const CHECKPOINT_CASE_IDS = new Set([
  'repair-continuation-after-change',
  'repair-continuation-manifest-change',
  'repair-continuation-incomplete-checkpoint',
  'repair-continuation-missing-owner-list',
]);

/** Identifies the four fixtures that supply an available prior checkpoint. */
export const hasRepairCheckpointRequest = (caseDefinition: ISemanticCase): boolean =>
  CHECKPOINT_CASE_IDS.has(caseDefinition.id);

/**
 * Supplies the real fixture checkpoint without changing the authored request template.
 * @throws If the checkpoint or its authored request template is invalid.
 */
export const resolveRepairCheckpointRequest = (
  caseDefinition: ISemanticCase,
  checkpointCommit: string,
): string => {
  if (!hasRepairCheckpointRequest(caseDefinition)) return caseDefinition.input.developerDirection;
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(checkpointCommit)) {
    throw new Error('Repair continuation requires the full fixture checkpoint commit.');
  }
  if (caseDefinition.input.developerDirection.split(CHECKPOINT_REF).length !== 2) {
    throw new Error('Repair continuation request must name its fixture checkpoint once.');
  }
  return caseDefinition.input.developerDirection.replaceAll(CHECKPOINT_REF, checkpointCommit);
};

/** Compares recorded requests while allowing only the fixture-owned checkpoint substitution. */
export const hasMatchingSemanticRequest = (
  caseDefinition: ISemanticCase,
  recordedRequest: string,
): boolean => {
  const template = caseDefinition.input.developerDirection;
  if (!hasRepairCheckpointRequest(caseDefinition)) return recordedRequest === template;
  const parts = template.split(CHECKPOINT_REF);
  if (parts.length !== 2) return false;
  const checkpointIndex = parts[0]!.length;
  const length = recordedRequest.length - template.length + CHECKPOINT_REF.length;
  const checkpoint = recordedRequest.slice(checkpointIndex, checkpointIndex + length);
  return (
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(checkpoint) &&
    resolveRepairCheckpointRequest(caseDefinition, checkpoint) === recordedRequest
  );
};

/**
 * Binds displayed case definitions to the actual recorded requests.
 * @throws If a case lacks a matching recorded request.
 */
export const createRecordedSemanticDefinitions = (
  definitions: readonly ISemanticCase[],
  recordedRequests: ReadonlyMap<string, string | undefined>,
): ISemanticCase[] =>
  definitions.map((definition) => {
    const developerDirection = recordedRequests.get(definition.id);
    if (
      developerDirection === undefined ||
      !hasMatchingSemanticRequest(definition, developerDirection)
    ) {
      throw new Error(`Semantic ${definition.id} requires its matching recorded request.`);
    }
    return { ...definition, input: { ...definition.input, developerDirection } };
  });
