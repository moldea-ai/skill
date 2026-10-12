import { ScriptedJourneysWebsiteModelSchema, type IScriptedJourneysWebsiteModel } from './types.ts';

/**
 * Validates a producer-owned journey presentation at the prepared-evidence boundary.
 * @throws When the input does not satisfy the public journey presentation contract.
 */
export const parseScriptedJourneysWebsiteModel = (input: unknown): IScriptedJourneysWebsiteModel =>
  ScriptedJourneysWebsiteModelSchema.parse(input);
