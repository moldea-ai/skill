import { z } from 'zod';

import type {
  IQualificationCaseCatalog,
  IQualificationProfile,
  IQualificationSelection,
} from '../contracts/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';

const RuntimePackageRequirementSchema = z.object({
  ecosystem: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  versionRange: z.string().min(1),
});

const RuntimeTargetSchema = z.object({
  bindingSupport: z.record(z.string(), z.unknown()).optional(),
  evidenceKinds: z.array(z.string().min(1)).optional(),
  id: z.string().min(1),
  kind: z.string().min(1),
  knownLimitations: z.array(z.string()).optional(),
  language: z.string().min(1),
  packages: z.array(RuntimePackageRequirementSchema).optional(),
  patterns: z
    .array(
      z.object({
        description: z.string(),
        id: z.string().min(1),
        kind: z.string().min(1),
        notes: z.string().optional(),
        support: z.string().min(1),
      }),
    )
    .optional(),
  providerLimits: z
    .array(
      z.object({
        description: z.string(),
        id: z.string().min(1),
        kind: z.string().min(1),
        reference: z.string().optional(),
        subject: z.string().min(1),
        value: z.union([z.boolean(), z.number(), z.string(), z.array(z.string())]),
      }),
    )
    .optional(),
  lastVerifiedAt: z.string().min(1),
  qualificationEvidence: z
    .object({
      url: z.url(),
    })
    .optional(),
});

const RuntimeAdapterEntrySchema = z.object({
  compatibleCoreRange: z.string().min(1).optional(),
  implementation: z.object({
    distribution: z.string().min(1),
    kind: z.string().min(1),
    package: z.string().min(1),
    versionRange: z.string().min(1).optional(),
  }),
  implementationStatus: z.string().min(1),
  lastVerifiedAt: z.string().min(1).optional(),
  runtimeGuidance: z.unknown().optional(),
  supportedRepositoryFormatVersions: z.array(z.number().int().positive()).optional(),
  targets: z.array(RuntimeTargetSchema).optional(),
});

// additive read model for the packages repository's canonical compatibility matrix
export const RuntimeCompatibilityMatrixSchema = z.object({
  adapters: z.record(z.string(), RuntimeAdapterEntrySchema),
  version: z.literal(2),
});

export type IRuntimeAdapterEntry = z.infer<typeof RuntimeAdapterEntrySchema>;
export type IRuntimeCompatibilityMatrix = z.infer<typeof RuntimeCompatibilityMatrixSchema>;
export type IRuntimeTarget = z.infer<typeof RuntimeTargetSchema>;

// immutable compatibility source consumed by one qualification execution
export type IRuntimeCompatibilitySnapshot = {
  matrix: IRuntimeCompatibilityMatrix;
  repositoryState: IGitRepositoryState;
};

// one matrix target enriched with local profile availability for CLI presentation
export type IQualificationImplementation = {
  adapterId: string;
  implementationId: string | null;
  implementationPackage: string;
  implementationStatus: string;
  hasProfile: boolean;
  disabledReason: string | null;
};

// validated selection and transparent local inputs used by execution
export type IResolvedQualificationTarget = {
  selection: IQualificationSelection;
  adapter: IRuntimeAdapterEntry;
  target: IRuntimeTarget;
  matrix: IRuntimeCompatibilityMatrix;
  profile: IQualificationProfile;
  profileDirectory: string;
  profileDigest: string;
  targetDigest: string;
  caseCatalog: IQualificationCaseCatalog;
};
