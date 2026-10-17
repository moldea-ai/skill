import { withBase } from '@moldea.ai/website-ui/site';

import type { ISemanticAttemptModel } from '../semantic-evaluation/index.ts';

import type { IReleaseEvidenceModel, ISemanticReleaseEvidenceSummary } from './types.ts';

/** Selects the release-facing result and public source URL without changing recorded evidence. */
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
    sourceUrl: getPublicEvidenceHref(releaseEvidence.semantic.sourceAttemptUrl, '/'),
  };
};

/**
 * Maps semantic storage paths to deployable downloads and prefixes local evidence links.
 * Immutable remote source URLs remain unchanged.
 * @param href Validated public evidence link from the selected record.
 * @param basePath Configured deployment base path.
 * @returns The local deployment path or unchanged remote source URL.
 * @throws
 * - INVALID_BASE_PATH: The website base path contains unsupported URL characters.
 */
export const getPublicEvidenceHref = (href: string, basePath: string): string => {
  const internalPrefix = '/evidence-assets/semantic/.evidence/';
  const publicHref = href.startsWith(internalPrefix)
    ? `/evidence-assets/semantic/records/${href.slice(internalPrefix.length)}`
    : href;
  return publicHref.startsWith('/') ? withBase(publicHref, basePath) : publicHref;
};
