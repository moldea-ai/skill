import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import {
  parseJourneysEvidenceRecord,
  type IScriptedJourneysWebsiteModel,
} from '../../../../src/scripted-journeys/public-evidence/index.ts';
import { parseSemanticWebsiteModel } from '../../../../src/semantic/public-evidence/index.ts';

import type { IReleaseEvidenceSectionModel, IReleaseEvidenceWebsiteState } from './types.ts';

const SOURCE_REPOSITORY_URL = 'https://github.com/moldea-ai/skill';

const PreparedEvidenceBundleSchema = z.object({
  formatVersion: z.literal(1),
  kind: z.enum(['semantic', 'journeys']),
  classification: z.enum(['fixture', 'official']),
  run: z.object({
    attemptId: z.string().min(1),
    evaluatedAt: z.iso.datetime(),
    status: z.enum(['errored', 'failed', 'incomplete', 'passed']),
    version: z.string().min(1),
    provenance: z.record(z.string(), z.string()),
  }),
  payload: z.unknown(),
  artifacts: z.unknown().optional(),
});

const PreparedEvidenceSectionSchema = z.strictObject({
  assetsPath: z.string().min(1),
  bundleSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  path: z.string().min(1),
  preparedSha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

const PreparedEvidenceManifestSchema = z.strictObject({
  formatVersion: z.literal(1),
  selectionSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  semantic: PreparedEvidenceSectionSchema,
  journeys: PreparedEvidenceSectionSchema.nullable(),
});

const EvidenceSelectionReferenceSchema = z.strictObject({
  assetName: z.string().min(1),
  classification: z.literal('official'),
  repository: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  tag: z.string().min(1),
});

const EvidenceSelectionSchema = z.strictObject({
  formatVersion: z.literal(1),
  semantic: EvidenceSelectionReferenceSchema.nullable(),
  journeys: EvidenceSelectionReferenceSchema.nullable(),
});

type IPreparedEvidenceBundle = z.infer<typeof PreparedEvidenceBundleSchema>;

const readPreparedBundle = (
  preparedDirectory: string,
  kind: 'semantic' | 'journeys',
  section: z.infer<typeof PreparedEvidenceSectionSchema>,
  allowFixture: boolean,
): IPreparedEvidenceBundle => {
  const bundlePath = path.resolve(preparedDirectory, section.path);
  const relativeBundlePath = path.relative(preparedDirectory, bundlePath);
  if (relativeBundlePath.startsWith('..') || path.isAbsolute(relativeBundlePath)) {
    throw new Error(`Prepared ${kind} evidence path escapes its owned directory.`);
  }
  const source = readFileSync(bundlePath, 'utf8');
  const preparedSha256 = createHash('sha256').update(source).digest('hex');
  if (preparedSha256 !== section.preparedSha256) {
    throw new Error(`Prepared ${kind} evidence digest does not match its manifest.`);
  }
  const bundle = PreparedEvidenceBundleSchema.parse(JSON.parse(source) as unknown);

  if (
    bundle.kind !== kind ||
    (bundle.classification !== 'official' && !(allowFixture && bundle.classification === 'fixture'))
  ) {
    throw new Error(`Prepared ${kind} evidence has an unsupported classification or kind.`);
  }

  return bundle;
};

const copyPreparedAssets = (
  repositoryRoot: string,
  preparedDirectory: string,
  manifest: z.infer<typeof PreparedEvidenceManifestSchema>,
): void => {
  const publicAssetsDirectory = path.join(repositoryRoot, 'website', 'public', 'evidence-assets');
  rmSync(publicAssetsDirectory, { force: true, recursive: true });
  mkdirSync(publicAssetsDirectory, { recursive: true });

  for (const kind of ['semantic', 'journeys'] as const) {
    const section = manifest[kind];
    if (section === null) continue;
    const sourceDirectory = path.resolve(preparedDirectory, section.assetsPath);
    const relativeSourcePath = path.relative(preparedDirectory, sourceDirectory);
    if (relativeSourcePath.startsWith('..') || path.isAbsolute(relativeSourcePath)) {
      throw new Error(`Prepared ${kind} asset path escapes its owned directory.`);
    }
    cpSync(sourceDirectory, path.join(publicAssetsDirectory, kind), {
      errorOnExist: true,
      force: false,
      recursive: true,
    });
    if (kind === 'semantic') {
      const internalDirectory = path.join(publicAssetsDirectory, kind, '.evidence');
      if (existsSync(internalDirectory)) {
        const recordsDirectory = path.join(publicAssetsDirectory, kind, 'records');
        if (existsSync(recordsDirectory)) {
          throw new Error('Prepared semantic assets conflict with the public records directory.');
        }
        // Pages omits hidden directories from its uploaded artifact.
        renameSync(internalDirectory, recordsDirectory);
      }
    }
  }
};

const createSectionModel = (bundle: IPreparedEvidenceBundle): IReleaseEvidenceSectionModel => {
  const sourceUrl = bundle.run.provenance['sourceUrl'] ?? SOURCE_REPOSITORY_URL;
  const evaluatedDate = bundle.run.evaluatedAt.slice(0, 10);

  return {
    mode: 'selected',
    recordedAt: bundle.run.evaluatedAt,
    sourceLabel: `${bundle.run.version}, ${evaluatedDate}`,
    sourceUrl,
  };
};

/** Loads selected semantic and optional scripted-journey presentation models. */
export const loadReleaseEvidenceWebsiteState = (
  repositoryRoot: string,
  _targetVersion: string,
  options: {
    allowFixture?: boolean | undefined;
    preparedDirectory?: string | undefined;
    selectionPath?: string | undefined;
  } = {},
): IReleaseEvidenceWebsiteState => {
  const preparedDirectory =
    options.preparedDirectory ?? path.join(repositoryRoot, '.evidence', 'prepared');
  const manifest = PreparedEvidenceManifestSchema.parse(
    JSON.parse(readFileSync(path.join(preparedDirectory, 'manifest.json'), 'utf8')) as unknown,
  );
  const selection = EvidenceSelectionSchema.parse(
    JSON.parse(
      readFileSync(
        options.selectionPath ?? path.join(repositoryRoot, 'evidence', 'selection.json'),
        'utf8',
      ),
    ) as unknown,
  );
  const selectionSha256 = createHash('sha256')
    .update(`${JSON.stringify(selection)}\n`)
    .digest('hex');
  if (manifest.selectionSha256 !== selectionSha256) {
    throw new Error('Prepared evidence does not match the current maintainer selection.');
  }
  const semanticBundle = readPreparedBundle(
    preparedDirectory,
    'semantic',
    manifest.semantic,
    options.allowFixture === true,
  );
  if ((selection.journeys === null) !== (manifest.journeys === null)) {
    throw new Error('Prepared journeys evidence does not match its selection presence.');
  }
  let scriptedJourneys: IScriptedJourneysWebsiteModel | null = null;
  if (manifest.journeys !== null) {
    if (manifest.journeys.bundleSha256 !== selection.journeys?.sha256) {
      throw new Error('Prepared journeys evidence does not match its selected bundle digest.');
    }
    const journeysBundle = readPreparedBundle(
      preparedDirectory,
      'journeys',
      manifest.journeys,
      options.allowFixture === true,
    );
    scriptedJourneys = parseJourneysEvidenceRecord(journeysBundle).model;
  }
  copyPreparedAssets(repositoryRoot, preparedDirectory, manifest);
  const semanticPayload = z.object({ websiteModel: z.unknown() }).parse(semanticBundle.payload);
  const semantic = parseSemanticWebsiteModel(semanticPayload.websiteModel);
  const semanticAttempt = semantic.latest ?? semantic.currentAssurance;

  if (semanticAttempt === null) {
    throw new Error('Selected semantic evidence has no displayable recorded attempt.');
  }

  return {
    scriptedJourneys,
    semantic,
    releaseEvidence: {
      mode: 'recorded',
      semantic: {
        ...createSectionModel(semanticBundle),
        attempt: semanticAttempt.result,
        sourceAttemptUrl: semanticAttempt.rawAttemptUrl,
      },
      targetVersion: semanticBundle.run.version,
    },
  };
};

/** Loads the compact selected-run provenance used by public pages. */
export const loadReleaseEvidenceModel = (
  repositoryRoot: string,
  targetVersion: string,
): IReleaseEvidenceWebsiteState['releaseEvidence'] =>
  loadReleaseEvidenceWebsiteState(repositoryRoot, targetVersion).releaseEvidence;
