import { isEqual } from 'jg-utilities';
import { z } from 'zod';

import { encodeEvidenceBundle, validateEvidenceBundle } from '../../evidence/index.ts';
import { sha256, assertSafePath } from '../harness/index.ts';
import {
  JourneyDefinitionSchema,
  JourneyCampaignSchema,
  JOURNEY_SNAPSHOT_ID_PATTERN,
} from '../index.ts';

import { LegacyAssessmentSchema, type ILegacyWebsiteModel } from './legacy.ts';
import { createCampaignCaptures } from './projection.ts';
import { parseScriptedJourneysWebsiteModel } from './validation.ts';
import type { IParsedJourneysEvidenceRecord } from './types.ts';

const ASSET_ROOT = '/evidence-assets/journeys/';
const PayloadSchema = z.object({
  websiteModel: z.unknown(),
  snapshotFormatVersion: z.literal(1).optional(),
});
const ChangesSchema = z.array(
  z.object({ path: z.string(), kind: z.enum(['added', 'modified', 'deleted']) }),
);

/** Validates a projected URL before resolving its exact bundle artifact.
 * @throws When a URL is outside the journeys asset root or has an unsafe portable path.
 */
export const journeyArtifactPath = (url: string): string => {
  if (!url.startsWith(ASSET_ROOT)) throw new Error('Unsafe journey artifact URL.');
  const relative = url.slice(ASSET_ROOT.length);
  assertSafePath(relative);
  return relative;
};

/** Checks historical raw associations without regrading or inventing confirmation metadata.
 * @throws When historical metadata, requests, provider results, or raw captures disagree.
 */
const validateLegacySource = (model: ILegacyWebsiteModel, read: (url: string) => string): void => {
  const assessment = LegacyAssessmentSchema.parse(JSON.parse(read(model.assessmentUrl)));
  const definitions = z
    .array(JourneyDefinitionSchema)
    .parse(JSON.parse(read(model.definitionsUrl)));
  if (
    !model.assessmentUrl.endsWith('/assessment.json') ||
    model.definitionsUrl !==
      model.assessmentUrl.slice(0, -'assessment.json'.length) + 'definitions.json'
  )
    throw new Error('Historical raw artifact URL mismatch.');
  for (const field of ['runId', 'evaluatedAt', 'status', 'assessor', 'bundleSha256'] as const)
    if (!isEqual([model[field]], [assessment[field]]))
      throw new Error('Historical assessment identity mismatch.');
  if (
    !isEqual(
      model.platforms,
      assessment.platforms.map(({ platform, configuration, environment, restartCounts }) => ({
        platform,
        configuration,
        environment,
        restartCounts,
      })),
    ) ||
    !isEqual(
      model.journeys.map(({ id }) => id),
      definitions.map(({ id }) => id),
    )
  )
    throw new Error('Historical catalog/provider association mismatch.');
  for (const journey of model.journeys) {
    const definition = definitions.find(({ id }) => id === journey.id)!;
    if (
      journey.title !== definition.title ||
      journey.summary !== definition.summary ||
      !isEqual(
        journey.steps.map(({ id, request }) => ({ id, request })),
        definition.steps.map(({ id, request }) => ({ id, request })),
      )
    )
      throw new Error('Historical request association mismatch.');
    for (const step of journey.steps) {
      if (
        !isEqual(
          step.results.map(({ platform }) => platform),
          assessment.platforms
            .filter((provider) =>
              provider.journeys.some(
                (entry) => entry.id === journey.id && entry.steps.some(({ id }) => id === step.id),
              ),
            )
            .map(({ platform }) => platform),
        )
      )
        throw new Error('Historical step provider inventory mismatch.');
      if (new Set(step.results.map(({ platform }) => platform)).size !== step.results.length)
        throw new Error('Duplicate historical provider result.');
      for (const result of step.results) {
        const recorded = assessment.platforms
          .find(({ platform }) => platform === result.platform)
          ?.journeys.find(({ id }) => id === journey.id)
          ?.steps.find(({ id }) => id === step.id);
        if (!recorded) throw new Error('Missing historical assessed step.');
        for (const field of [
          'status',
          'checks',
          'unverified',
          'facts',
          'reply',
          'activity',
        ] as const)
          if (!isEqual([result[field]], [recorded[field]]))
            throw new Error('Historical captured result mismatch.');
        const prefix =
          model.assessmentUrl.slice(0, -'assessment.json'.length) +
          `${result.platform}/${journey.id}/${step.id}/`;
        if (result.facts === null) {
          if (
            result.patchUrl !== null ||
            result.replyUrl !== null ||
            result.activityUrl !== null ||
            result.patch ||
            result.files.length
          )
            throw new Error('Uncaptured historical step has artifact links.');
          continue;
        }
        if (
          result.patchUrl !== `${prefix}changes.patch` ||
          result.replyUrl !== `${prefix}reply.md` ||
          result.activityUrl !== `${prefix}activity.json` ||
          read(result.patchUrl) !== result.patch ||
          read(result.replyUrl) !== result.reply ||
          !isEqual([JSON.parse(read(result.activityUrl))], [result.activity]) ||
          !isEqual(
            ChangesSchema.parse(JSON.parse(read(`${prefix}changes.json`))).map(
              ({ path, kind }) => ({ path, status: kind === 'added' ? 'created' : kind }),
            ),
            result.files,
          )
        )
          throw new Error('Historical artifact association mismatch.');
      }
    }
  }
};

/** Validates one explicit local campaign, snapshot, or supported historical record and its raw sources.
 * @throws When envelope identity, source hashes, definitions, captures, or artifact associations disagree.
 */
export const parseJourneysEvidenceRecord = (input: unknown): IParsedJourneysEvidenceRecord => {
  const bundle = validateEvidenceBundle(input);
  encodeEvidenceBundle(bundle);
  if (bundle.kind !== 'journeys') throw new Error('Expected a journeys evidence record.');
  const payload = PayloadSchema.parse(bundle.payload);
  const model = parseScriptedJourneysWebsiteModel(payload.websiteModel);
  if (payload.snapshotFormatVersion !== undefined && !JOURNEY_SNAPSHOT_ID_PATTERN.test(model.runId))
    throw new Error('Invalid journey snapshot identity.');
  if (
    bundle.run.attemptId !== model.runId ||
    bundle.run.status !== model.status ||
    bundle.run.evaluatedAt !== model.evaluatedAt
  )
    throw new Error('Journey record envelope mismatch.');
  const blobs = new Map(bundle.artifacts.blobs.map((blob) => [blob.sha256, blob]));
  const files = new Map(bundle.artifacts.files.map((file) => [file.path, file]));
  const read = (url: string): string => {
    const file = files.get(journeyArtifactPath(url));
    if (!file) throw new Error(`Missing journey source artifact: ${url}`);
    return Buffer.from(blobs.get(file.sha256)!.contentBase64, 'base64').toString('utf8');
  };
  const ids = new Map<string, string>();
  for (const source of model.sources) {
    const assessmentUrl =
      source.kind === 'campaign' ? source.assessmentUrl : source.model.assessmentUrl;
    const raw = read(assessmentUrl);
    const digest = sha256(Buffer.from(raw));
    if (source.kind === 'campaign') {
      const definitions: unknown = JSON.parse(read(source.definitionsUrl));
      if (
        digest !== source.id ||
        !isEqual(JourneyCampaignSchema.parse(JSON.parse(raw)), source.assessment) ||
        !isEqual([definitions], [source.assessment.definitions]) ||
        !isEqual(
          createCampaignCaptures(source.assessment, (name) =>
            read(`${source.artifactRoot}${name}`),
          ),
          source.captures,
        )
      )
        throw new Error('Campaign raw source association mismatch.');
    } else {
      validateLegacySource(source.model, read);
      if (payload.snapshotFormatVersion !== undefined && digest !== source.id)
        throw new Error('Historical source digest mismatch.');
    }
    if ([...ids.values()].includes(digest)) throw new Error('Duplicate raw journey source.');
    ids.set(source.id, digest);
    if (
      payload.snapshotFormatVersion !== undefined &&
      journeyArtifactPath(assessmentUrl) !== `sources/${digest.slice(0, 16)}/assessment.json`
    )
      throw new Error('Snapshot source namespace mismatch.');
  }
  for (const cell of model.cells) cell.sourceId = ids.get(cell.sourceId)!;
  for (const journey of model.journeys)
    if (journey.catalogSourceId) journey.catalogSourceId = ids.get(journey.catalogSourceId)!;
  model.currentSourceId = ids.get(model.currentSourceId)!;
  for (const source of model.sources) source.id = ids.get(source.id)!;
  const target = model.sources.find(({ id }) => id === model.currentSourceId)!;
  const namespaces = new Set(model.sources.map(({ id }) => `sources/${id.slice(0, 16)}`));
  for (const file of bundle.artifacts.files) {
    const parts = file.path.split('/');
    if (
      payload.snapshotFormatVersion === undefined
        ? parts[0] === 'sources'
        : !namespaces.has(parts.slice(0, 2).join('/')) || parts[2] === 'sources'
    )
      throw new Error('Unreferenced or nested journey artifact namespace.');
  }
  const version =
    target.kind === 'campaign'
      ? target.assessment.bundle.skill.version
      : target.model.skill.version;
  if (bundle.run.version !== version) throw new Error('Journey envelope skill version mismatch.');
  if (
    payload.snapshotFormatVersion === undefined &&
    (model.sources.length !== 1 ||
      (target.kind === 'campaign' && target.assessment.runId !== model.runId))
  )
    throw new Error('Expected a direct admitted journey campaign.');
  return { bundle, model: parseScriptedJourneysWebsiteModel(model) };
};
