import { readReleaseEvidenceEnvelope } from '../../../../tooling/release-identity/release-evidence-envelope.mjs';
import { loadPinnedReleaseEvidenceSection } from '../../../../tooling/release-identity/release-evidence-source.mjs';
import { createDependencyClosureSha256 } from '../../../../tooling/release-identity/release-evidence-current.mjs';
import { createPortableSkillDigest } from '../../../../tooling/semantic-evaluation/index.mjs';

import {
  assertPublishableQualificationEvidence,
  attachPinnedQualificationEvidence,
  loadQualificationWebsiteModel,
} from '../qualification/index.ts';
import { loadSemanticEvaluationWebsiteModel } from '../semantic-evaluation/index.ts';

import { withMaterializedEvidenceSource } from './source-materializer.ts';
import type {
  IQualificationReleaseEvidenceSectionModel,
  IReleaseEvidenceModel,
  IReleaseEvidenceSectionModel,
  IReleaseEvidenceWebsiteState,
  ISemanticReleaseEvidenceSectionModel,
} from './types.ts';

const SOURCE_REPOSITORY_URL = 'https://github.com/moldea-ai/skill';

const loadSectionModel = (
  targetVersion: string,
  section: NonNullable<ReturnType<typeof readReleaseEvidenceEnvelope>>[
    'qualification' | 'semantic'],
): IReleaseEvidenceSectionModel => {
  if (section.mode === 'fresh') {
    return {
      mode: 'fresh',
      sourceUrl: `${SOURCE_REPOSITORY_URL}/tree/v${targetVersion}`,
    };
  }
  const sourceLabel = section.source.tag ?? section.source.commit.slice(0, 12);
  return {
    mode: 'pinned',
    reason: section.reason,
    sourceCommit: section.source.commit,
    sourceLabel,
    sourceUrl: `${SOURCE_REPOSITORY_URL}/tree/${section.source.tag ?? section.source.commit}`,
  };
};

const loadQualificationSectionModel = (
  repositoryRoot: string,
  targetVersion: string,
  section: NonNullable<ReturnType<typeof readReleaseEvidenceEnvelope>>['qualification'],
  shouldHydrate: boolean,
): {
  model: IQualificationReleaseEvidenceSectionModel;
  websiteModel: ReturnType<typeof loadQualificationWebsiteModel> | null;
} => {
  const model = loadSectionModel(targetVersion, section);
  if (model.mode === 'fresh') return { model, websiteModel: null };
  if (section.mode !== 'pinned') {
    throw new Error('Pinned qualification release evidence has inconsistent provenance.');
  }
  const sourceTargetsByIdentity = new Map(
    section.source.evidence.targets.map((target) => [
      `${target.adapterId}\0${target.implementationId}`,
      target,
    ]),
  );
  const source = loadPinnedReleaseEvidenceSection(repositoryRoot, section, 'qualification');
  const targets = source.projection.map((target) => {
    const sourceTarget = sourceTargetsByIdentity.get(
      `${target.adapterId}\0${target.implementationId}`,
    );
    if (sourceTarget === undefined) {
      throw new Error('Pinned qualification evidence has inconsistent target provenance.');
    }
    return {
      ...target,
      sourceAttemptUrl: `${SOURCE_REPOSITORY_URL}/blob/${section.source.commit}/qualification/results/${sourceTarget.key}/attempts/${sourceTarget.attemptKey}/attempt.json`,
    };
  });
  const sectionModel: IQualificationReleaseEvidenceSectionModel = {
    ...model,
    targets,
  };
  if (!shouldHydrate) return { model: sectionModel, websiteModel: null };
  const websiteModel = withMaterializedEvidenceSource(source.files, (sourceRoot) =>
    loadQualificationWebsiteModel(sourceRoot, {
      evidenceSource: { commit: section.source.commit, kind: 'pinned' },
      isAuthenticatedSource: true,
      revision: section.source.commit,
    }),
  );
  assertPublishableQualificationEvidence(websiteModel);
  return {
    model: sectionModel,
    websiteModel: attachPinnedQualificationEvidence(websiteModel, targets),
  };
};

const loadSemanticSectionModel = (
  repositoryRoot: string,
  targetVersion: string,
  section: NonNullable<ReturnType<typeof readReleaseEvidenceEnvelope>>['semantic'],
  shouldHydrate: boolean,
): {
  model: ISemanticReleaseEvidenceSectionModel;
  websiteModel: ReturnType<typeof loadSemanticEvaluationWebsiteModel> | null;
} => {
  const model = loadSectionModel(targetVersion, section);
  if (model.mode === 'fresh') return { model, websiteModel: null };
  if (section.mode !== 'pinned') {
    throw new Error('Pinned semantic release evidence has inconsistent provenance.');
  }
  const source = loadPinnedReleaseEvidenceSection(repositoryRoot, section, 'semantic');
  const attempt = source.projection;
  const sectionModel: ISemanticReleaseEvidenceSectionModel = {
    ...model,
    attempt,
    sourceAttemptUrl: `${SOURCE_REPOSITORY_URL}/blob/${section.source.commit}/fixtures/semantic-evaluation-results/attempts/${attempt.attemptId}/attempt.json`,
  };
  if (!shouldHydrate) return { model: sectionModel, websiteModel: null };
  const websiteModel = withMaterializedEvidenceSource(source.files, (sourceRoot) =>
    loadSemanticEvaluationWebsiteModel(sourceRoot, section.source.commit, {
      evidenceSource: { commit: section.source.commit, kind: 'pinned' },
      isAuthenticatedSource: true,
    }),
  );
  if (
    websiteModel.currentAssurance?.result.attemptId !== attempt.attemptId ||
    websiteModel.currentAssurance.result.status !== 'passed'
  ) {
    throw new Error('Pinned semantic website model does not match its authenticated attempt.');
  }
  return {
    model: sectionModel,
    websiteModel,
  };
};

const loadReleaseEvidenceState = (
  repositoryRoot: string,
  targetVersion: string,
  shouldHydrate: boolean,
): IReleaseEvidenceWebsiteState => {
  const envelope = readReleaseEvidenceEnvelope(repositoryRoot);
  if (envelope === null) {
    return {
      pinnedQualification: null,
      pinnedSemantic: null,
      releaseEvidence: { mode: 'not-recorded', targetVersion },
    };
  }
  if (envelope.target.version !== targetVersion) {
    throw new Error('Public release evidence does not match the current skill version.');
  }
  if (envelope.target.portableSkillSha256 !== createPortableSkillDigest(repositoryRoot)) {
    throw new Error('Public release evidence does not match the current portable skill bytes.');
  }
  if (envelope.target.dependencyClosureSha256 !== createDependencyClosureSha256(repositoryRoot)) {
    throw new Error('Public release evidence does not match the current dependency closure.');
  }
  const qualification = loadQualificationSectionModel(
    repositoryRoot,
    targetVersion,
    envelope.qualification,
    shouldHydrate,
  );
  const semantic = loadSemanticSectionModel(
    repositoryRoot,
    targetVersion,
    envelope.semantic,
    shouldHydrate,
  );
  return {
    pinnedQualification: qualification.websiteModel,
    pinnedSemantic: semantic.websiteModel,
    releaseEvidence: {
      mode: 'recorded',
      qualification: qualification.model,
      semantic: semantic.model,
      targetVersion,
    },
  };
};

/** Loads compact provenance and complete authenticated models for static website generation. */
export const loadReleaseEvidenceWebsiteState = (
  repositoryRoot: string,
  targetVersion: string,
): IReleaseEvidenceWebsiteState => loadReleaseEvidenceState(repositoryRoot, targetVersion, true);

/** Loads and validates the compact release-evidence provenance used by public pages. */
export const loadReleaseEvidenceModel = (
  repositoryRoot: string,
  targetVersion: string,
): IReleaseEvidenceModel =>
  loadReleaseEvidenceState(repositoryRoot, targetVersion, false).releaseEvidence;
