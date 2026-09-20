import { z } from 'zod';

const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const SemanticCriterionSchema = z.strictObject({
  criterion: z.string().trim().min(1),
  label: StableIdSchema,
});
const SemanticEvidenceSourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('developer-direction') }),
  z.strictObject({ kind: z.literal('host-instructions') }),
  z.strictObject({
    fact: z.enum([
      'has-deleted-paths',
      'has-renamed-paths',
      'has-staged-changes',
      'has-unstaged-changes',
      'has-untracked-paths',
      'head-exists',
      'head-missing',
      'working-tree-clean',
      'working-tree-dirty',
    ]),
    kind: z.literal('git-state'),
  }),
  z.strictObject({
    expectedType: z.enum(['directory', 'file', 'missing', 'symlink']),
    kind: z.literal('workspace-path'),
    path: z.string().min(1),
  }),
  z.strictObject({
    expectedType: z.enum(['directory', 'file', 'missing', 'symlink']),
    kind: z.literal('related-path'),
    mount: z.string().min(1),
    path: z.string().min(1),
  }),
]);

/** Serializable portion of one discovered semantic case module. */
export const SemanticCaseDefinitionSchema = z.strictObject({
  coverageClaimIds: z.array(StableIdSchema).min(1),
  expected: z.array(SemanticCriterionSchema).min(1),
  forbidden: z.array(SemanticCriterionSchema).min(1),
  hostInstructions: z.string().trim().min(1).optional(),
  id: StableIdSchema,
  input: z.strictObject({
    developerDirection: z.string().trim().min(1),
    repositoryEvidence: z.array(
      z.strictObject({ claim: z.string().trim().min(1), source: SemanticEvidenceSourceSchema }),
    ),
  }),
  operation: StableIdSchema,
  resourceBudget: z.strictObject({
    activation: z.enum(['abstain', 'blocked', 'direct', 'informational', 'relationship']),
    maximumMoldeaCommands: z.number().int().nonnegative(),
    maximumMoldeaOutputBytes: z.number().int().nonnegative(),
    minimumMoldeaCommands: z.number().int().nonnegative(),
  }),
  scenario: z.string().trim().min(1),
  skillEvidence: z
    .strictObject({
      activationScenarios: z.array(
        z.strictObject({ request: z.string().trim().min(1), shouldActivate: z.boolean() }),
      ),
      artifacts: z.array(
        z.strictObject({
          role: z.enum(['authoritative-source', 'distributed-copy', 'installed-copy']),
          root: z.string().trim().min(1),
        }),
      ),
    })
    .optional(),
});
