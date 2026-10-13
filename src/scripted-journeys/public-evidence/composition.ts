import { isEqual } from 'web-utils-kit';
import { z } from 'zod';

import {
  createEvidenceBundle,
  encodeEvidenceBundle,
  MAXIMUM_EVIDENCE_ARTIFACT_COUNT,
  MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES,
  type IEvidenceArtifactInput,
  type IEvidenceBundle,
} from '../../evidence/index.ts';
import { assertSafePath, selectJourneys } from '../harness/index.ts';
import { JOURNEY_SNAPSHOT_ID_PATTERN, type IJourneyPlatform } from '../index.ts';

import { parseJourneysEvidenceRecord, journeyArtifactPath } from './record.ts';
import {
  deriveJourneyCoverage,
  deriveJourneyPublicStatus,
  parseScriptedJourneysWebsiteModel,
} from './validation.ts';
import type { IJourneyEvidenceSource, IParsedJourneysEvidenceRecord } from './types.ts';

const ASSET_ROOT = '/evidence-assets/journeys/';
const SnapshotIdSchema = z.string().regex(JOURNEY_SNAPSHOT_ID_PATTERN);

/** Copies projected links into one digest namespace without changing raw source bytes.
 * @throws When historical links do not share their original artifact root.
 */
const namespaceSource = (input: IJourneyEvidenceSource): IJourneyEvidenceSource => {
  const source = structuredClone(input);
  const root = `${ASSET_ROOT}sources/${source.id.slice(0, 16)}/`;
  if (source.kind === 'campaign') {
    source.artifactRoot = root;
    source.assessmentUrl = `${root}assessment.json`;
    source.definitionsUrl = `${root}definitions.json`;
  } else {
    const previous = source.model.assessmentUrl.slice(0, -'assessment.json'.length);
    const rewrite = (url: string): string => {
      if (!url.startsWith(previous)) throw new Error('Historical artifact root mismatch.');
      return root + url.slice(previous.length);
    };
    source.model.assessmentUrl = rewrite(source.model.assessmentUrl);
    source.model.definitionsUrl = rewrite(source.model.definitionsUrl);
    for (const journey of source.model.journeys)
      for (const step of journey.steps)
        for (const result of step.results) {
          if (result.patchUrl) result.patchUrl = rewrite(result.patchUrl);
          if (result.replyUrl) result.replyUrl = rewrite(result.replyUrl);
          if (result.activityUrl) result.activityUrl = rewrite(result.activityUrl);
        }
  }
  return source;
};

/** Selects whole provider/journey groups from explicit records, preserving all referenced source evidence.
 * @throws When selectors, source identities, artifact namespaces, or aggregate budgets are invalid.
 */
export const createJourneySnapshotEvidenceBundle = (input: {
  incoming: unknown;
  previous?: unknown;
  runId: string;
  evaluatedAt: string;
  platform?: IJourneyPlatform;
  journeys?: string[];
}): IEvidenceBundle => {
  SnapshotIdSchema.parse(input.runId);
  z.iso.datetime().parse(input.evaluatedAt);
  if (input.platform !== undefined) z.enum(['chatgpt', 'claude']).parse(input.platform);
  const incoming = parseJourneysEvidenceRecord(input.incoming);
  const previous =
    input.previous === undefined ? undefined : parseJourneysEvidenceRecord(input.previous);
  const target = incoming.model.sources.find(({ id }) => id === incoming.model.currentSourceId)!;
  if (
    target.kind !== 'campaign' ||
    incoming.model.sources.length !== 1 ||
    target.assessment.runId !== incoming.model.runId ||
    (incoming.bundle.payload as { snapshotFormatVersion?: unknown }).snapshotFormatVersion !==
      undefined
  )
    throw new Error('Incoming record must be a direct admitted version 2 campaign.');
  const requested =
    input.journeys === undefined
      ? undefined
      : selectJourneys(target.assessment.definitions, input.journeys);
  const selected = incoming.model.cells.filter(
    (cell) =>
      (!input.platform || cell.platform === input.platform) &&
      (!requested || requested.includes(cell.journeyId)),
  );
  if (!selected.length || requested?.some((id) => !selected.some((cell) => cell.journeyId === id)))
    throw new Error('Selected provider/journey evidence is absent from the incoming campaign.');
  const cells = new Map(
    (previous?.model.cells ?? []).map((cell) => [`${cell.platform}/${cell.journeyId}`, cell]),
  );
  for (const cell of selected) cells.set(`${cell.platform}/${cell.journeyId}`, cell);
  const used = new Set([...cells.values()].map(({ sourceId }) => sourceId));
  used.add(target.id);
  const currentIds = new Set(target.assessment.definitions.map(({ id }) => id));
  const earlier = (previous?.model.journeys ?? [])
    .filter(({ id }) => !currentIds.has(id))
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  for (const journey of earlier)
    used.add(journey.catalogSourceId ?? previous!.model.currentSourceId);
  const sources = new Map<string, IJourneyEvidenceSource>();
  const tokens = new Map<string, string>();
  const artifacts = new Map<string, { sha256: string; artifact: IEvidenceArtifactInput }>();
  const decoded = new Map<string, Buffer>();
  let byteCount = 0;
  const addRecord = (record: IParsedJourneysEvidenceRecord): void => {
    const blobs = new Map(record.bundle.artifacts.blobs.map((blob) => [blob.sha256, blob]));
    const filesByRoot = new Map<string, typeof record.bundle.artifacts.files>();
    for (const file of record.bundle.artifacts.files) {
      const parts = file.path.split('/');
      const root = parts[0] === 'sources' ? `${parts.slice(0, 2).join('/')}/` : '';
      const files = filesByRoot.get(root) ?? [];
      files.push(file);
      filesByRoot.set(root, files);
    }
    for (const source of record.model.sources) {
      if (!used.has(source.id)) continue;
      const token = source.id.slice(0, 16);
      if (tokens.has(token) && tokens.get(token) !== source.id)
        throw new Error('Journey source digest prefix collision.');
      tokens.set(token, source.id);
      const projected = namespaceSource(source);
      if (sources.has(source.id) && !isEqual(sources.get(source.id)!, projected))
        throw new Error('Conflicting metadata for the same journey source.');
      sources.set(source.id, projected);
      const assessmentUrl =
        source.kind === 'campaign' ? source.assessmentUrl : source.model.assessmentUrl;
      const oldRoot = journeyArtifactPath(assessmentUrl).slice(0, -'assessment.json'.length);
      for (const file of oldRoot === ''
        ? record.bundle.artifacts.files
        : (filesByRoot.get(oldRoot) ?? [])) {
        const artifactPath = `sources/${token}/${file.path.slice(oldRoot.length)}`;
        assertSafePath(artifactPath);
        const existing = artifacts.get(artifactPath);
        if (existing) {
          if (existing.sha256 !== file.sha256 || existing.artifact.mediaType !== file.mediaType)
            throw new Error('Conflicting artifact bytes for the same journey source.');
          continue;
        }
        if (artifacts.size >= MAXIMUM_EVIDENCE_ARTIFACT_COUNT)
          throw new Error('Composed journey artifact count exceeds limit.');
        const blob = blobs.get(file.sha256)!;
        if (!decoded.has(blob.sha256)) {
          if (byteCount + blob.byteCount > MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES)
            throw new Error('Composed journey decoded artifacts exceed limit.');
          byteCount += blob.byteCount;
          decoded.set(blob.sha256, Buffer.from(blob.contentBase64, 'base64'));
        }
        artifacts.set(artifactPath, {
          sha256: file.sha256,
          artifact: {
            path: artifactPath,
            mediaType: file.mediaType,
            content: decoded.get(blob.sha256)!,
          },
        });
      }
    }
  };
  if (previous) addRecord(previous);
  addRecord(incoming);
  const base = {
    presentationVersion: 2 as const,
    route: '/evidence/journeys/' as const,
    runId: input.runId,
    evaluatedAt: input.evaluatedAt,
    currentSourceId: target.id,
    sources: [
      sources.get(target.id)!,
      ...[...sources.values()].filter(({ id }) => id !== target.id),
    ],
    cells: [...cells.values()],
    journeys: [
      ...target.assessment.definitions.map(({ id, title, summary }) => ({
        id,
        title,
        summary,
        route: `/evidence/journeys/${id}/`,
        current: true,
        catalogSourceId: target.id,
      })),
      ...earlier.map((journey) => ({ ...journey, current: false })),
    ],
  };
  const websiteModel = parseScriptedJourneysWebsiteModel({
    ...base,
    coverage: deriveJourneyCoverage(base),
    status: deriveJourneyPublicStatus(base),
  });
  const bundle = createEvidenceBundle({
    kind: 'journeys',
    classification:
      incoming.bundle.classification === 'fixture' || previous?.bundle.classification === 'fixture'
        ? 'fixture'
        : 'official',
    run: {
      attemptId: input.runId,
      evaluatedAt: input.evaluatedAt,
      status: websiteModel.status,
      version: target.assessment.bundle.skill.version,
      provenance: { currentSourceSha256: target.id },
    },
    payload: { snapshotFormatVersion: 1, websiteModel },
    artifacts: [...artifacts.values()].map(({ artifact }) => artifact),
  });
  encodeEvidenceBundle(bundle);
  parseJourneysEvidenceRecord(bundle);
  return bundle;
};
