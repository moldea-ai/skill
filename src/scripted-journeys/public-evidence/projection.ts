import { z } from 'zod';
import { isEqual } from 'jg-utilities';

import {
  createEvidenceBundle,
  encodeEvidenceBundle,
  type IEvidenceArtifactInput,
  type IEvidenceBundle,
  type IEvidenceClassification,
} from '../../evidence/index.ts';
import { sha256 } from '../harness/index.ts';
import {
  JourneyActivitySchema,
  type IJourneyCampaign,
  type IJourneyDefinition,
  type IJourneysBundle,
} from '../index.ts';

import {
  deriveJourneyCoverage,
  deriveJourneyPublicStatus,
  parseScriptedJourneysWebsiteModel,
} from './validation.ts';
import type { IScriptedJourneysWebsiteModel } from './types.ts';

const ChangesSchema = z.array(
  z.object({ path: z.string(), kind: z.enum(['added', 'modified', 'deleted']) }),
);
const ASSET_ROOT = '/evidence-assets/journeys/';

/** Reads the exact captured files associated with an admitted campaign.
 * @throws When a required capture is missing or differs from its assessed reply/activity.
 */
export const createCampaignCaptures = (
  assessment: IJourneyCampaign,
  read: (name: string) => string,
): Extract<IScriptedJourneysWebsiteModel['sources'][number], { kind: 'campaign' }>['captures'] => {
  const captures: Extract<
    IScriptedJourneysWebsiteModel['sources'][number],
    { kind: 'campaign' }
  >['captures'] = {};
  for (const platform of assessment.platforms)
    for (const trial of platform.trials)
      for (const journey of trial.journeys)
        for (const step of journey.steps) {
          const prefix = `${platform.platform}/${journey.id}/${trial.confirmationIndex === null ? 'initial' : `c${trial.confirmationIndex}`}/${step.id}`;
          if (
            read(`${prefix}/reply.md`) !== step.reply ||
            !step.activity ||
            !isEqual(
              JourneyActivitySchema.parse(JSON.parse(read(`${prefix}/activity.json`))),
              step.activity,
            )
          )
            throw new Error('Captured reply/activity differs from the assessed trial.');
          captures[prefix] = {
            patch: read(`${prefix}/changes.patch`),
            files: ChangesSchema.parse(JSON.parse(read(`${prefix}/changes.json`))).map(
              ({ path, kind }) => ({ path, status: kind === 'added' ? 'created' : kind }),
            ),
          };
        }
  return captures;
};

/** Projects one admitted campaign using its original catalog, retained trials, and complete captures.
 * @throws When definitions, source associations, or required captured artifacts are inconsistent.
 */
export const createJourneysEvidenceBundle = (input: {
  assessment: IJourneyCampaign;
  definitions: IJourneyDefinition[];
  skill: IJourneysBundle['skill'];
  instructions: IJourneysBundle['instructions'];
  artifacts: IEvidenceArtifactInput[];
  classification?: IEvidenceClassification;
}): IEvidenceBundle => {
  const { assessment } = input;
  if (
    !isEqual(input.definitions, assessment.definitions) ||
    !isEqual(input.skill, assessment.bundle.skill) ||
    !isEqual(input.instructions, assessment.bundle.instructions)
  )
    throw new Error('Campaign presentation identity mismatch.');
  const artifacts = new Map(input.artifacts.map((artifact) => [artifact.path, artifact]));
  if (artifacts.size !== input.artifacts.length)
    throw new Error('Duplicate journey artifact path.');
  const read = (name: string): string => {
    const artifact = artifacts.get(name);
    if (!artifact) throw new Error(`Missing journey presentation artifact: ${name}`);
    return Buffer.from(artifact.content).toString('utf8');
  };
  const assessmentBytes = Buffer.from(`${JSON.stringify(assessment, null, 2)}\n`);
  const sourceId = sha256(assessmentBytes);
  const captures = createCampaignCaptures(assessment, read);
  const sources: IScriptedJourneysWebsiteModel['sources'] = [
    {
      id: sourceId,
      kind: 'campaign',
      assessment,
      assessmentUrl: `${ASSET_ROOT}assessment.json`,
      definitionsUrl: `${ASSET_ROOT}definitions.json`,
      artifactRoot: ASSET_ROOT,
      captures,
    },
  ];
  const base = {
    presentationVersion: 2 as const,
    route: '/evidence/journeys/' as const,
    runId: assessment.runId,
    evaluatedAt: assessment.evaluatedAt,
    currentSourceId: sourceId,
    sources,
    cells: assessment.platforms.flatMap((platform) =>
      platform.resolutions.map((resolution) => ({
        platform: platform.platform,
        journeyId: resolution.journeyId,
        sourceId,
      })),
    ),
    journeys: assessment.definitions.map((definition) => ({
      id: definition.id,
      title: definition.title,
      summary: definition.summary,
      route: `/evidence/journeys/${definition.id}/`,
      current: true,
    })),
  };
  const websiteModel = parseScriptedJourneysWebsiteModel({
    ...base,
    coverage: deriveJourneyCoverage(base),
    status: deriveJourneyPublicStatus(base),
  });
  const evidenceBundle = createEvidenceBundle({
    classification: input.classification ?? 'official',
    kind: 'journeys',
    run: {
      attemptId: assessment.runId,
      evaluatedAt: assessment.evaluatedAt,
      status: websiteModel.status,
      version: assessment.bundle.skill.version,
      provenance: {
        skillCommit: assessment.bundle.skill.commit,
        bundleSha256: assessment.bundleSha256,
        assessorCommit: assessment.assessor.commit,
        assessorSourceSha256: assessment.assessor.sourceSha256,
      },
    },
    payload: { websiteModel },
    artifacts: [
      ...input.artifacts,
      { path: 'assessment.json', mediaType: 'application/json', content: assessmentBytes },
      {
        path: 'definitions.json',
        mediaType: 'application/json',
        content: Buffer.from(`${JSON.stringify(assessment.definitions, null, 2)}\n`),
      },
    ],
  });
  // enforce expanded and compressed public limits before local record persistence
  encodeEvidenceBundle(evidenceBundle);
  return evidenceBundle;
};
