import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { parseQualificationWebsiteModel } from '../../../../qualification/src/public-evidence/index.ts';
import { parseSemanticWebsiteModel } from '../../../../src/semantic/public-evidence/index.ts';

import type {
  IQualificationReleaseEvidenceSectionModel,
  IReleaseEvidenceSectionModel,
  IReleaseEvidenceWebsiteState,
} from './types.ts';

const SOURCE_REPOSITORY_URL = 'https://github.com/moldea-ai/skill';

const PreparedEvidenceBundleSchema = z.object({
  formatVersion: z.literal(1),
  kind: z.enum(['qualification', 'semantic']),
  classification: z.enum(['fixture', 'official']),
  run: z.object({
    attemptId: z.string().min(1),
    evaluatedAt: z.iso.datetime(),
    status: z.enum(['errored', 'failed', 'incomplete', 'passed']),
    version: z.string().min(1),
    provenance: z.record(z.string(), z.string()),
  }),
  payload: z.object({ websiteModel: z.unknown() }),
});

const PreparedEvidenceSectionSchema = z.strictObject({
  assetsPath: z.string().min(1),
  bundleSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  path: z.string().min(1),
  preparedSha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

const PreparedEvidenceManifestSchema = z.strictObject({
  formatVersion: z.literal(1),
  qualification: PreparedEvidenceSectionSchema,
  selectionSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  semantic: PreparedEvidenceSectionSchema,
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
  qualification: EvidenceSelectionReferenceSchema.nullable(),
  semantic: EvidenceSelectionReferenceSchema.nullable(),
});

type IPreparedEvidenceBundle = z.infer<typeof PreparedEvidenceBundleSchema>;

const readPreparedBundle = (
  preparedDirectory: string,
  kind: 'qualification' | 'semantic',
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

  for (const kind of ['semantic', 'qualification'] as const) {
    const sourceDirectory = path.resolve(preparedDirectory, manifest[kind].assetsPath);
    const relativeSourcePath = path.relative(preparedDirectory, sourceDirectory);
    if (relativeSourcePath.startsWith('..') || path.isAbsolute(relativeSourcePath)) {
      throw new Error(`Prepared ${kind} asset path escapes its owned directory.`);
    }
    cpSync(sourceDirectory, path.join(publicAssetsDirectory, kind), {
      errorOnExist: true,
      force: false,
      recursive: true,
    });
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

/** Loads the two exact evidence bundles prepared from the maintainer selection. */
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
  const qualificationBundle = readPreparedBundle(
    preparedDirectory,
    'qualification',
    manifest.qualification,
    options.allowFixture === true,
  );
  copyPreparedAssets(repositoryRoot, preparedDirectory, manifest);
  const semantic = parseSemanticWebsiteModel(semanticBundle.payload.websiteModel);
  const qualification = parseQualificationWebsiteModel(qualificationBundle.payload.websiteModel);
  const semanticAttempt = semantic.latest ?? semantic.currentAssurance;

  if (semanticAttempt === null) {
    throw new Error('Selected semantic evidence has no displayable recorded attempt.');
  }

  const qualificationSection: IQualificationReleaseEvidenceSectionModel = {
    ...createSectionModel(qualificationBundle),
    targets: qualification.profiles.flatMap((profile) => {
      const attempt = profile.currentLatest ?? profile.currentLastPassing;
      return attempt === null
        ? []
        : [
            {
              adapterId: profile.adapterId,
              attemptId: attempt.result.attemptId,
              implementationId: profile.implementationId,
              sourceAttemptUrl: attempt.rawAttemptUrl,
            },
          ];
    }),
  };

  return {
    qualification,
    semantic,
    releaseEvidence: {
      mode: 'recorded',
      qualification: qualificationSection,
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
