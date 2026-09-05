import { readReleaseEvidenceEnvelope } from '../../../../tooling/release-identity/release-evidence-envelope.mjs';
import { assertPinnedReleaseEvidenceSource } from '../../../../tooling/release-identity/release-evidence-source.mjs';
import { createPortableSkillDigest } from '../../../../tooling/semantic-evaluation/index.mjs';

import type { IReleaseEvidenceModel } from './types.ts';

const SOURCE_REPOSITORY_URL = 'https://github.com/moldea-ai/skill';

/** Loads and validates the compact release-evidence provenance used by public pages. */
export const loadReleaseEvidenceModel = (
  repositoryRoot: string,
  targetVersion: string,
): IReleaseEvidenceModel => {
  const envelope = readReleaseEvidenceEnvelope(repositoryRoot);
  if (envelope === null) return { mode: 'not-recorded', targetVersion };
  if (envelope.target.version !== targetVersion) {
    throw new Error('Public release evidence does not match the current skill version.');
  }
  if (envelope.target.portableSkillSha256 !== createPortableSkillDigest(repositoryRoot)) {
    throw new Error('Public release evidence does not match the current portable skill bytes.');
  }
  if (envelope.mode === 'fresh') {
    return {
      mode: 'fresh',
      sourceUrl: `${SOURCE_REPOSITORY_URL}/tree/v${targetVersion}`,
      targetVersion,
    };
  }
  assertPinnedReleaseEvidenceSource(repositoryRoot, envelope);
  return {
    mode: 'pinned',
    reason: envelope.reason,
    sourceCommit: envelope.source.commit,
    sourceTag: envelope.source.tag,
    sourceUrl: `${SOURCE_REPOSITORY_URL}/tree/${envelope.source.tag}`,
    targetVersion,
  };
};
