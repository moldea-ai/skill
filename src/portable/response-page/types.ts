import { z } from 'zod';

// schema 5 identity; payload interpretation remains owned by the CLI
const responseIdentity = {
  schemaVersion: z.literal(5),
  cliVersion: z.string(),
  command: z.enum(['composition', 'content', 'inspect', 'scope', 'validate']),
};

// additive envelopes preserve CLI-owned payloads while checking their mechanical boundary
export const ResponsePageSchema = z.discriminatedUnion('status', [
  z.object({
    ...responseIdentity,
    status: z.enum(['valid', 'invalid']),
    error: z.null(),
    result: z.looseObject({}),
  }),
  z.object({
    ...responseIdentity,
    status: z.literal('error'),
    error: z.object({}),
    result: z.null(),
  }),
]);

// complete snapshot totals, independent of the current diagnostic page
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  diagnosticCount: z.int().nonnegative(),
  errorCount: z.int().nonnegative(),
  warningCount: z.int().nonnegative(),
});

export const InspectionResultSchema = z.object({
  valid: z.boolean(),
  counts: z.object({
    diagnostics: z.int().nonnegative(),
    errors: z.int().nonnegative(),
    warnings: z.int().nonnegative(),
  }),
});

// validated envelopes and normalized diagnostic totals
export type IResponsePage = z.infer<typeof ResponsePageSchema>;
export type IResponseDiagnostics = z.infer<typeof ValidationResultSchema>;

// resolved invocation identity; CLI/Core retain ownership of filters and snapshots
export interface IResponseIdentity {
  command: IResponsePage['command'];
  cliVersion: string;
}

// explicit scratch-file paths and the unchanged saved cursor
export interface IResponseFiles {
  cursor?: string;
  savePath?: string;
  checkpointPath?: string;
}
