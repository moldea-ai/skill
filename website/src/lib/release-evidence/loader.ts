import { readReleaseEvidenceEnvelope } from '../../../../tooling/release-identity/release-evidence-envelope.mjs';
import { assertPinnedReleaseEvidenceSection } from '../../../../tooling/release-identity/release-evidence-source.mjs';
import { createDependencyClosureSha256 } from '../../../../tooling/release-identity/release-evidence-current.mjs';
import { createPortableSkillDigest } from '../../../../tooling/semantic-evaluation/index.mjs';

import type {
  IReleaseEvidenceModel,
  IReleaseEvidenceSectionModel,
  ISemanticReleaseEvidenceSectionModel,
} from './types.ts';

const SOURCE_REPOSITORY_URL = 'https://github.com/moldea-ai/skill';

const loadSectionModel = (
  repositoryRoot: string,
  targetVersion: string,
  kind: 'qualification' | 'semantic',
  section: NonNullable<ReturnType<typeof readReleaseEvidenceEnvelope>>[typeof kind],
): IReleaseEvidenceSectionModel => {
  if (section.mode === 'fresh') {
    return {
      mode: 'fresh',
      sourceUrl: `${SOURCE_REPOSITORY_URL}/tree/v${targetVersion}`,
    };
  }
  assertPinnedReleaseEvidenceSection(repositoryRoot, section, kind);
  const sourceLabel = section.source.tag ?? section.source.commit.slice(0, 12);
  return {
    mode: 'pinned',
    reason: section.reason,
    sourceCommit: section.source.commit,
    sourceLabel,
    sourceUrl: `${SOURCE_REPOSITORY_URL}/tree/${section.source.tag ?? section.source.commit}`,
  };
};

const loadSemanticSectionModel = (
  repositoryRoot: string,
  targetVersion: string,
  section: NonNullable<ReturnType<typeof readReleaseEvidenceEnvelope>>['semantic'],
): ISemanticReleaseEvidenceSectionModel => {
  const model = loadSectionModel(repositoryRoot, targetVersion, 'semantic', section);
  if (model.mode === 'fresh') return model;
  if (section.mode !== 'pinned') {
    throw new Error('Pinned semantic release evidence has inconsistent provenance.');
  }
  return {
    ...model,
    sourceAttemptId: section.source.evidence.attemptId,
  };
};

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
  if (envelope.target.dependencyClosureSha256 !== createDependencyClosureSha256(repositoryRoot)) {
    throw new Error('Public release evidence does not match the current dependency closure.');
  }
  return {
    mode: 'recorded',
    qualification: loadSectionModel(
      repositoryRoot,
      targetVersion,
      'qualification',
      envelope.qualification,
    ),
    semantic: loadSemanticSectionModel(repositoryRoot, targetVersion, envelope.semantic),
    targetVersion,
  };
};
