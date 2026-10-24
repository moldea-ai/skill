import { z } from 'zod';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

const ArgumentsSchema = z.array(z.string().max(65_536)).max(4_096);
const CanonicalDigestSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/u)
  .nullable();
const ExitSchema = z.strictObject({
  kind: z.literal('exit'),
  id: z.uuid(),
  exitCode: z.number().int(),
  outputByteCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  stdout: z.string().max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaInvocationOutputBytes),
  canonicalAfter: CanonicalDigestSchema.optional(),
});

// temporary runner-owned capture, discarded after content-free projection
export const CliInvocationRecordSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('start'),
    id: z.uuid(),
    arguments: ArgumentsSchema,
    canonicalBefore: CanonicalDigestSchema.optional(),
  }),
  ExitSchema,
]);

export const CliInvocationSchema = ExitSchema.omit({ kind: true, id: true }).extend({
  arguments: ArgumentsSchema,
  canonicalBefore: CanonicalDigestSchema.optional(),
});
export const CliInvocationEventSchema = z.strictObject({
  type: z.literal('moldea.cli-invocations'),
  canonicalInitial: CanonicalDigestSchema.optional(),
  canonicalFinal: CanonicalDigestSchema.optional(),
  invocations: z
    .array(CliInvocationSchema)
    .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaCommandCount),
});
export type ICliInvocation = z.infer<typeof CliInvocationSchema>;
export type ICliInvocationEvent = z.infer<typeof CliInvocationEventSchema>;
