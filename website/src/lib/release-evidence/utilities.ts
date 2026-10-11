import { withBase } from '@moldea.ai/website-ui/site';

import type { ISemanticAttemptModel } from '../semantic-evaluation/index.ts';

import type { IReleaseEvidenceModel, ISemanticReleaseEvidenceSummary } from './types.ts';

/** Selects the release-facing semantic result without changing current-contract evidence. */
export const getSemanticReleaseEvidenceSummary = (
  releaseEvidence: IReleaseEvidenceModel,
  _currentAssurance: ISemanticAttemptModel | null,
): ISemanticReleaseEvidenceSummary => {
  if (releaseEvidence.mode !== 'recorded') {
    return { kind: 'not-recorded', result: null, sourceUrl: null };
  }
  return {
    kind: 'recorded',
    result: releaseEvidence.semantic.attempt,
    sourceUrl: releaseEvidence.semantic.sourceAttemptUrl,
  };
};

/**
 * Prefixes local evidence links while preserving immutable remote source URLs.
 * @param href Validated public evidence link from the selected record.
 * @param basePath Configured deployment base path.
 * @returns The local deployment path or unchanged remote source URL.
 * @throws
 * - INVALID_BASE_PATH: The website base path contains unsupported URL characters.
 */
export const getPublicEvidenceHref = (href: string, basePath: string): string =>
  href.startsWith('/') ? withBase(href, basePath) : href;
