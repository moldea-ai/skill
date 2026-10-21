import { hashValue } from 'jg-crypto';
import { stringifyJsonDeterministically } from 'jg-utilities';

import type { IJourneyDefinition } from '../index.ts';

/** Binds exported results to every definition field, including local-only criteria. */
export const createJourneyDefinitionDigest = (definition: IJourneyDefinition): string =>
  hashValue(stringifyJsonDeterministically(definition));
