import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { JourneyDefinitionSchema, type IJourneyDefinition } from '../index.ts';

/** Discovers ordered journey modules without visiting fixture or excluded directories. */
export const loadScriptedJourneys = async (
  directory = import.meta.dirname,
): Promise<IJourneyDefinition[]> => {
  const journeys: IJourneyDefinition[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.name)) continue;
    const module: unknown = await import(
      pathToFileURL(path.join(directory, entry.name, 'journey.ts')).href
    );
    if (typeof module !== 'object' || module === null || !('scriptedJourney' in module))
      throw new Error(`Missing scriptedJourney: ${entry.name}`);
    const journey = JourneyDefinitionSchema.parse(module.scriptedJourney);
    if (journey.id !== entry.name) throw new Error(`Journey directory/id mismatch: ${entry.name}`);
    journeys.push(journey);
  }
  if (
    new Set(journeys.map((journey) => journey.id)).size !== journeys.length ||
    new Set(journeys.map((journey) => journey.order)).size !== journeys.length
  )
    throw new Error('Journey ids and orders must be unique.');
  return journeys.sort((left, right) => left.order - right.order);
};
