import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { RUN_ID_PATTERN } from '../index.ts';
import type { IJourneyPlatform } from '../index.ts';

/** Loads the bounded, versioned instructions installed in each ordinary chat project. */
export const readProjectInstructions = async (): Promise<string> => {
  const text = await readFile(path.join(import.meta.dirname, 'project-instructions.md'), 'utf8');
  if (!text.startsWith('Scripted journeys instructions v2\n') || text.length > 8000)
    throw new Error('Project instructions version or size is invalid.');
  return text;
};

/** Renders a complete operator-held start message with the independent bundle trust anchor. */
export const renderStartMessage = async (input: {
  runId: string;
  platform: IJourneyPlatform;
  sha256: string;
  url: string;
  journeys?: string[];
  confirmationIndex?: number;
}): Promise<string> => {
  if (!RUN_ID_PATTERN.test(input.runId) || !/^[a-f0-9]{64}$/u.test(input.sha256))
    throw new Error('Invalid start-message identity.');
  if (
    input.journeys &&
    (!input.journeys.length ||
      new Set(input.journeys).size !== input.journeys.length ||
      input.journeys.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id) || id.length > 48))
  )
    throw new Error('Invalid start-message journey selection.');
  if (
    input.confirmationIndex !== undefined &&
    (![1, 2, 3].includes(input.confirmationIndex) || input.journeys?.length !== 1)
  )
    throw new Error('Invalid start-message confirmation.');
  const selection =
    (input.journeys ?? []).map((id) => ` --journey ${id}`).join('') +
    (input.confirmationIndex === undefined ? '' : ` --confirmation ${input.confirmationIndex}`);
  const fields = { ...input, selection };
  const template = await readFile(path.join(import.meta.dirname, 'start-message.md'), 'utf8');
  return template.replace(
    /\{\{(runId|platform|sha256|url|selection)\}\}/gu,
    (_match, key: keyof typeof fields) => String(fields[key]),
  );
};
