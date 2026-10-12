import { createHash } from 'node:crypto';
import { stringifyJSONDeterministically } from 'web-utils-kit';

import type { IJourneyDefinition } from '../index.ts';

/** Binds exported results to every definition field, including local-only criteria. */
export const createJourneyDefinitionDigest = (definition: IJourneyDefinition): string =>
  createHash('sha256').update(stringifyJSONDeterministically(definition)).digest('hex');
