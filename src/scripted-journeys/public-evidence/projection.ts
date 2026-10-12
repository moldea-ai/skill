import { z } from 'zod';

import {
  createEvidenceBundle,
  type IEvidenceArtifactInput,
  type IEvidenceBundle,
  type IEvidenceClassification,
} from '../../evidence/index.ts';
import type { IJourneyAssessment, IJourneyDefinition, IJourneysBundle } from '../types.ts';

import { parseScriptedJourneysWebsiteModel } from './validation.ts';

const ChangesSchema = z.array(
  z.object({ path: z.string(), kind: z.enum(['added', 'modified', 'deleted']) }),
);
const ASSET_ROOT = '/evidence-assets/journeys/';

/**
 * Projects one immutable assessment with its exact requests and recorded artifact sources.
 * @throws When an assessed step or required captured artifact is missing or malformed.
 */
export const createJourneysEvidenceBundle = (input: {
  assessment: IJourneyAssessment;
  definitions: IJourneyDefinition[];
  skill: IJourneysBundle['skill'];
  instructions: IJourneysBundle['instructions'];
  artifacts: IEvidenceArtifactInput[];
  classification?: IEvidenceClassification;
}): IEvidenceBundle => {
  const { assessment, definitions, skill, instructions } = input;
  const artifacts = new Map(input.artifacts.map((artifact) => [artifact.path, artifact]));
  const readArtifact = (artifactPath: string): string => {
    const artifact = artifacts.get(artifactPath);
    if (!artifact) throw new Error(`Missing journey presentation artifact: ${artifactPath}`);
    return Buffer.from(artifact.content).toString('utf8');
  };
  const websiteModel = parseScriptedJourneysWebsiteModel({
    ...assessment,
    skill,
    instructions,
    route: '/evidence/journeys/',
    assessmentUrl: `${ASSET_ROOT}assessment.json`,
    definitionsUrl: `${ASSET_ROOT}definitions.json`,
    platforms: assessment.platforms.map((platform) => ({
      platform: platform.platform,
      configuration: platform.configuration,
      environment: platform.environment,
      restartCounts: platform.restartCounts,
    })),
    journeys: definitions.map((definition) => ({
      id: definition.id,
      title: definition.title,
      summary: definition.summary,
      route: `/evidence/journeys/${definition.id}/`,
      steps: definition.steps.map((step) => ({
        id: step.id,
        request: step.request,
        results: assessment.platforms.map((platform) => {
          const recorded = platform.journeys
            .find(({ id }) => id === definition.id)
            ?.steps.find(({ id }) => id === step.id);
          if (!recorded)
            throw new Error(
              `Missing assessed journey step: ${platform.platform}/${definition.id}/${step.id}`,
            );
          const prefix = `${platform.platform}/${definition.id}/${step.id}/`;
          const hasCapture = recorded.facts !== null;
          const changes = hasCapture
            ? ChangesSchema.parse(JSON.parse(readArtifact(`${prefix}changes.json`)))
            : [];
          return {
            ...recorded,
            platform: platform.platform,
            files: changes.map(({ path, kind }) => ({
              path,
              status: kind === 'added' ? 'created' : kind,
            })),
            patch: hasCapture ? readArtifact(`${prefix}changes.patch`) : '',
            patchUrl: hasCapture ? `${ASSET_ROOT}${prefix}changes.patch` : null,
            replyUrl: hasCapture ? `${ASSET_ROOT}${prefix}reply.md` : null,
            activityUrl: hasCapture ? `${ASSET_ROOT}${prefix}activity.json` : null,
          };
        }),
      })),
    })),
  });
  const rawArtifacts = [
    { path: 'assessment.json', content: assessment },
    { path: 'definitions.json', content: definitions },
  ].map(({ path, content }) => ({
    path,
    content: Buffer.from(`${JSON.stringify(content, null, 2)}\n`),
    mediaType: 'application/json',
  }));
  return createEvidenceBundle({
    classification: input.classification ?? 'official',
    kind: 'journeys',
    run: {
      attemptId: assessment.runId,
      evaluatedAt: assessment.evaluatedAt,
      status: assessment.status,
      version: skill.version,
      provenance: {
        skillCommit: skill.commit,
        bundleSha256: assessment.bundleSha256,
        assessorCommit: assessment.assessor.commit,
        assessorSourceSha256: assessment.assessor.sourceSha256,
      },
    },
    payload: { assessment, definitions, skill, instructions, websiteModel },
    artifacts: [...input.artifacts, ...rawArtifacts],
  });
};
