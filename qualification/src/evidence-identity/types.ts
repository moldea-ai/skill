import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const LogicalSourceEntrySchema = z.strictObject({
  path: z.string().trim().min(1),
  kind: z.enum(['file', 'symlink']),
  mode: z.enum(['100644', '100755', '120000']),
  sha256: Sha256Schema,
});

/** Canonical target input independent of short or expanded physical profile paths. */
export const QualificationLogicalInputBundleSchema = z.strictObject({
  version: z.literal(1),
  selection: z.strictObject({
    adapterId: z.string().trim().min(1),
    implementationId: z.string().trim().min(1),
  }),
  profile: z.unknown(),
  caseCatalog: z.unknown(),
  files: z.array(LogicalSourceEntrySchema),
});

export type IQualificationLogicalInputBundle = z.infer<
  typeof QualificationLogicalInputBundleSchema
>;
export type IQualificationLogicalSourceEntry = z.infer<typeof LogicalSourceEntrySchema>;

/** Versioned compatibility identities that can be compared across physical storage layouts. */
export const QualificationCompatibilityIdentitySchema = z.strictObject({
  version: z.literal(1),
  qualificationEvaluatorDigest: Sha256Schema,
  qualificationLogicalInputDigest: Sha256Schema,
  qualificationBaselineEvaluatorDigest: Sha256Schema,
});

export type IQualificationCompatibilityIdentity = z.infer<
  typeof QualificationCompatibilityIdentitySchema
>;
