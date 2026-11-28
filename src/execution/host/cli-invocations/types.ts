import { z } from 'zod';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

import { NODE_ASSERTION_METHODS } from './runtime-assertion.ts';

const ArgumentsSchema = z.array(z.string().max(65_536)).max(4_096);
const CallerArgumentsSchema = z.array(ArgumentsSchema).max(8);
const ProcessIdentitySchema = z
  .string()
  .regex(/^\d+:\d+$/u)
  .max(64);
const CommandInstanceSchema = z.strictObject({
  identity: ProcessIdentitySchema,
  arguments: ArgumentsSchema,
});
const CanonicalDigestSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/u)
  .nullable();
const EntrypointSchema = z.enum([
  'cli',
  'managed-agents',
  'managed-readme',
  'node-eval',
  'relevance-gate',
  'repair-git',
]);
const AssertionObservationSchema = z.union([
  z.strictObject({ method: z.enum(NODE_ASSERTION_METHODS), passed: z.boolean() }),
  z.literal('ambiguous'),
  z.null(),
]);
const ExitSchema = z.strictObject({
  kind: z.literal('exit'),
  id: z.uuid(),
  exitCode: z.number().int(),
  outputByteCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  stdout: z.string().max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaInvocationOutputBytes),
  canonicalAfter: CanonicalDigestSchema.optional(),
  assertionObservation: AssertionObservationSchema.optional(),
});

// temporary runner-owned capture, discarded after content-free projection
export const CliInvocationRecordSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('start'),
    id: z.uuid(),
    arguments: ArgumentsSchema,
    entrypoint: EntrypointSchema.optional(),
    callers: CallerArgumentsSchema.optional(),
    callerIdentities: z.array(ProcessIdentitySchema).max(8).optional(),
    canonicalBefore: CanonicalDigestSchema.optional(),
  }),
  ExitSchema,
  CommandInstanceSchema.extend({ kind: z.literal('command') }),
]);

export const CliInvocationSchema = ExitSchema.omit({ kind: true, id: true })
  .extend({
    // method provenance survives overlap; ordered-operation proof does not
    overlapping: z.literal(true).optional(),
    arguments: ArgumentsSchema,
    entrypoint: EntrypointSchema.optional(),
    callers: CallerArgumentsSchema.optional(),
    callerIdentities: z.array(ProcessIdentitySchema).max(8).optional(),
    canonicalBefore: CanonicalDigestSchema.optional(),
  })
  .refine(
    (invocation) =>
      invocation.callerIdentities === undefined ||
      invocation.callerIdentities.length === invocation.callers?.length,
    'Caller identities must correspond to the observed arguments.',
  )
  .refine(
    ({ assertionObservation, entrypoint }) =>
      (entrypoint === 'node-eval') === (assertionObservation !== undefined),
    'Only an observed eval can report runtime assertions.',
  );
export const CliInvocationEventSchema = z.strictObject({
  type: z.literal('moldea.cli-invocations'),
  observesManagedAgents: z.literal(true).optional(),
  canonicalInitial: CanonicalDigestSchema.optional(),
  canonicalFinal: CanonicalDigestSchema.optional(),
  commandInstances: z
    .array(CommandInstanceSchema)
    .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxCompletedCommandCount)
    .refine(
      (instances) =>
        new Set(instances.map((instance) => instance.identity)).size === instances.length,
      'Command instance identities must be unique.',
    )
    .optional(),
  invocations: z
    .array(CliInvocationSchema)
    .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxCompletedCommandCount),
});
export type ICliInvocation = z.infer<typeof CliInvocationSchema>;
export type ICliInvocationEvent = z.infer<typeof CliInvocationEventSchema>;
export type ICliCommandInstance = z.infer<typeof CommandInstanceSchema>;
