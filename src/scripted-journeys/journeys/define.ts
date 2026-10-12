import { JourneyDefinitionSchema, type IJourneyDefinition } from '../index.ts';

/** Validates one complete suite-owned definition, including its private checks. */
export const defineScriptedJourney = (input: unknown): IJourneyDefinition =>
  JourneyDefinitionSchema.parse(input);
