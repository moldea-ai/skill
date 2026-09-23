import { z } from 'zod';

const RuntimeGuidanceSchema = z.looseObject({
  expectation: z.enum(['optional', 'recommended', 'required']),
  notes: z.string().optional(),
});

const PackageRequirementSchema = z.looseObject({
  ecosystem: z.literal('npm'),
  name: z.string().trim().min(1),
  role: z.enum(['companion', 'primary']),
  versionRange: z.string().trim().min(1),
});

const CompatibilityTargetSchema = z.looseObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  kind: z.enum(['custom', 'package']),
  language: z.string().trim().min(1),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  packages: z.array(PackageRequirementSchema).optional(),
});

const CompatibilityAdapterSchema = z
  .looseObject({
    implementationStatus: z.enum(['available', 'deprecated', 'in-development', 'planned']),
    implementation: z.looseObject({
      distribution: z.enum(['private', 'public']),
      kind: z.enum(['built-in', 'package']),
      package: z.string().trim().min(1),
    }),
    runtimeGuidance: RuntimeGuidanceSchema.optional(),
    supportedRepositoryFormatVersions: z
      .array(z.number().int().positive())
      .min(1)
      .refine((versions) => new Set(versions).size === versions.length)
      .optional(),
    targets: z.array(CompatibilityTargetSchema).optional(),
  })
  .superRefine((adapter, context) => {
    const targetIds = adapter.targets?.map(({ id }) => id) ?? [];
    if (new Set(targetIds).size !== targetIds.length) {
      context.addIssue({ code: 'custom', message: 'Target ids must be unique.' });
    }
  });

/** Additively extensible runtime compatibility publication contract. */
export const RuntimeCompatibilityPublicationSchema = z.looseObject({
  schemaVersion: z.literal(1),
  matrixVersion: z.literal(2),
  adapters: z.record(z.string(), CompatibilityAdapterSchema),
});

export type IRuntimeCompatibilityPublication = z.infer<
  typeof RuntimeCompatibilityPublicationSchema
>;
