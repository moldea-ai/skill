import { createCore } from '@moldea.ai/core';

const core = createCore();

/** Matches format-1 relationships using the Core implementation pinned by the release. */
export const matchManifestScope = (input) => core.matchManifestScope(input);
