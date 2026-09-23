import { createCore } from '@moldea.ai/core';

const core = createCore();
export type IManifestScopeInput = Parameters<typeof core.matchManifestScope>[0];

/** Matches format-1 relationships using the Core implementation pinned by the release. */
export const matchManifestScope = (input: IManifestScopeInput) => core.matchManifestScope(input);
