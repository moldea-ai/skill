import { z } from 'zod';

import {
  EVIDENCE_CLASSIFICATIONS,
  EVIDENCE_FORMAT_VERSION,
  EVIDENCE_KINDS,
  EVIDENCE_RELEASE_REPOSITORY,
  MAXIMUM_EVIDENCE_ARTIFACT_BYTES,
  MAXIMUM_EVIDENCE_ARTIFACT_COUNT,
  MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES,
} from './constants.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const hasControlCharacter = (source: string): boolean => {
  for (const character of source) {
    if (character.charCodeAt(0) <= 0x1f) return true;
  }
  return false;
};
const PortableArtifactPathSchema = z
  .string()
  .min(1)
  .max(160)
  .refine(
    (artifactPath) =>
      !artifactPath.startsWith('/') &&
      !artifactPath.includes('\\') &&
      artifactPath.split('/').every((component) => {
        return (
          component !== '' &&
          component !== '.' &&
          component !== '..' &&
          component.length <= 64 &&
          !/[<>:"|?*]/u.test(component) &&
          !hasControlCharacter(component) &&
          !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(component) &&
          !component.endsWith('.') &&
          !component.endsWith(' ')
        );
      }),
    'Expected a safe portable relative artifact path.',
  );

const EvidenceArtifactBlobSchema = z.strictObject({
  byteCount: z.number().int().nonnegative().max(MAXIMUM_EVIDENCE_ARTIFACT_BYTES),
  contentBase64: z.string(),
  sha256: Sha256Schema,
});

const EvidenceArtifactFileSchema = z.strictObject({
  mediaType: z
    .string()
    .regex(/^(?:text\/[a-z0-9.+-]+|application\/(?:json|yaml|x-yaml|patch\+text))$/u),
  path: PortableArtifactPathSchema,
  sha256: Sha256Schema,
});

const EvidenceRunSchema = z.looseObject({
  attemptId: z.string().trim().min(1).max(128),
  evaluatedAt: z.iso.datetime(),
  status: z.enum(['errored', 'failed', 'incomplete', 'passed']),
  version: z.string().trim().min(1).max(128),
  provenance: z.record(z.string(), z.string()).default({}),
});

/** Public evidence bundle contract shared by both producers and the website. */
export const EvidenceBundleSchema = z.strictObject({
  formatVersion: z.literal(EVIDENCE_FORMAT_VERSION),
  kind: z.enum(EVIDENCE_KINDS),
  classification: z.enum(EVIDENCE_CLASSIFICATIONS),
  run: EvidenceRunSchema,
  payload: z.unknown(),
  artifacts: z.strictObject({
    blobs: z.array(EvidenceArtifactBlobSchema).max(MAXIMUM_EVIDENCE_ARTIFACT_COUNT),
    files: z.array(EvidenceArtifactFileSchema).max(MAXIMUM_EVIDENCE_ARTIFACT_COUNT),
  }),
});

export const EvidenceSelectionReferenceSchema = z.strictObject({
  assetName: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}\.json\.gz$/u),
  classification: z.literal('official'),
  repository: z.literal(EVIDENCE_RELEASE_REPOSITORY),
  sha256: Sha256Schema,
  tag: z.string().regex(/^evidence-[a-z0-9][a-z0-9._-]{0,119}$/u),
});

/** Independently selected semantic and qualification evidence bundles. */
export const EvidenceSelectionSchema = z.strictObject({
  formatVersion: z.literal(EVIDENCE_FORMAT_VERSION),
  qualification: EvidenceSelectionReferenceSchema.nullable(),
  semantic: EvidenceSelectionReferenceSchema.nullable(),
});

export type IEvidenceArtifactInput = {
  content: Uint8Array;
  mediaType: string;
  path: string;
};

export type IEvidenceBundle = z.infer<typeof EvidenceBundleSchema>;
export type IEvidenceClassification = (typeof EVIDENCE_CLASSIFICATIONS)[number];
export type IEvidenceKind = (typeof EVIDENCE_KINDS)[number];
export type IEvidenceSelection = z.infer<typeof EvidenceSelectionSchema>;
export type IEvidenceSelectionReference = z.infer<typeof EvidenceSelectionReferenceSchema>;

export type ICreateEvidenceBundleOptions = {
  artifacts?: readonly IEvidenceArtifactInput[];
  classification: IEvidenceClassification;
  kind: IEvidenceKind;
  payload: unknown;
  run: IEvidenceBundle['run'];
};

const PreparedEvidenceSectionSchema = z.strictObject({
  assetsPath: PortableArtifactPathSchema,
  bundleSha256: Sha256Schema,
  path: PortableArtifactPathSchema,
  preparedSha256: Sha256Schema,
});

/** Atomic manifest for the two exact bundles prepared for website generation. */
export const EvidencePreparationManifestSchema = z.strictObject({
  formatVersion: z.literal(EVIDENCE_FORMAT_VERSION),
  qualification: PreparedEvidenceSectionSchema,
  selectionSha256: Sha256Schema,
  semantic: PreparedEvidenceSectionSchema,
});

export type IEvidencePreparationManifest = z.infer<typeof EvidencePreparationManifestSchema>;

/** Confirms decoded artifact byte totals remain bounded after schema parsing. */
export const assertEvidenceArtifactLimits = (bundle: IEvidenceBundle): void => {
  const totalByteCount = bundle.artifacts.blobs.reduce(
    (total, artifact) => total + artifact.byteCount,
    0,
  );
  if (totalByteCount > MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES) {
    throw new Error(
      `Evidence artifacts exceed ${MAXIMUM_EVIDENCE_ARTIFACT_TOTAL_BYTES} decoded bytes.`,
    );
  }
};
