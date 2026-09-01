import { z } from 'zod';

import {
  QualificationCompatibilityIdentitySchema,
  type IQualificationCompatibilityIdentity,
} from '../evidence-identity/types.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const GitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/u);
const TargetKeySchema = z.string().regex(/^t[1-9][0-9]*$/u);
const AttemptKeySchema = z.string().regex(/^a-[a-f0-9]{32}$/u);
const ArtifactStoragePathSchema = z.string().regex(/^artifacts\/f[1-9][0-9]*(?:\.[a-z0-9]+)?$/u);

const QualificationProfileIndexTargetSchema = z.strictObject({
  key: TargetKeySchema,
  adapterId: z.string().trim().min(1),
  implementationId: z.string().trim().min(1),
});

/** Strict append-only mapping from logical qualification targets to short physical keys. */
export const QualificationProfileIndexSchema = z
  .strictObject({
    version: z.literal(1),
    targets: z.array(QualificationProfileIndexTargetSchema).min(1),
  })
  .superRefine((index, context) => {
    const keys = index.targets.map(({ key }) => key);
    const selections = index.targets.map(
      ({ adapterId, implementationId }) => `${adapterId}\0${implementationId}`,
    );

    if (new Set(keys).size !== keys.length) {
      context.addIssue({ code: 'custom', message: 'Qualification target keys must be unique.' });
    }
    if (new Set(selections).size !== selections.length) {
      context.addIssue({
        code: 'custom',
        message: 'Qualification target selections must be unique.',
      });
    }

    index.targets.forEach(({ key }, targetIndex) => {
      if (key !== `t${targetIndex + 1}`) {
        context.addIssue({
          code: 'custom',
          message: 'Qualification target keys must be contiguous and append-only.',
          path: ['targets', targetIndex, 'key'],
        });
      }
    });
  });

export type IQualificationProfileIndex = z.infer<typeof QualificationProfileIndexSchema>;
export type IQualificationProfileIndexTarget = z.infer<
  typeof QualificationProfileIndexTargetSchema
>;

const QualificationArtifactStorageEntrySchema = z.strictObject({
  logicalPath: z.string().trim().min(1),
  physicalPath: ArtifactStoragePathSchema,
  sha256: Sha256Schema,
});

const QualificationCarryForwardSourceSchema = z.strictObject({
  attestationId: z.string().regex(/^v4\.0\.0-custom-[a-f0-9]{64}$/u),
  sourceRelease: z.literal('v4.0.0'),
  sourceCommit: GitCommitSchema,
  sourceAttemptDigest: Sha256Schema,
});

/** Versioned physical-storage manifest for an unchanged logical qualification attempt. */
export const QualificationAttemptStorageSchema = z
  .strictObject({
    version: z.literal(1),
    attemptKey: AttemptKeySchema,
    attemptId: z.string().trim().min(1),
    attemptIdDigest: Sha256Schema,
    attemptDigest: Sha256Schema,
    sourceCommit: GitCommitSchema,
    compatibility: QualificationCompatibilityIdentitySchema,
    artifacts: z.array(QualificationArtifactStorageEntrySchema),
    carryForward: QualificationCarryForwardSourceSchema.optional(),
  })
  .superRefine((manifest, context) => {
    const logicalPaths = manifest.artifacts.map(({ logicalPath }) => logicalPath);
    const physicalPaths = manifest.artifacts.map(({ physicalPath }) => physicalPath);

    if (new Set(logicalPaths).size !== logicalPaths.length) {
      context.addIssue({
        code: 'custom',
        message: 'Qualification logical artifact paths must be unique.',
      });
    }
    if (new Set(physicalPaths).size !== physicalPaths.length) {
      context.addIssue({
        code: 'custom',
        message: 'Qualification physical artifact paths must be unique.',
      });
    }
  });

export type IQualificationAttemptStorage = z.infer<typeof QualificationAttemptStorageSchema>;
export type IQualificationArtifactStorageEntry = z.infer<
  typeof QualificationArtifactStorageEntrySchema
>;
export type IQualificationCarryForwardSource = z.infer<
  typeof QualificationCarryForwardSourceSchema
>;
export type { IQualificationCompatibilityIdentity };
