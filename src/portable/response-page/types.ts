import { z } from 'zod';

// additive CLI response contracts used only to preserve continuation identity
export const ResponsePageSchema = z.object({
  schemaVersion: z.literal(5),
  cliVersion: z.string(),
  command: z.enum(['content', 'inspect', 'scope', 'validate']),
  status: z.enum(['valid', 'invalid']),
  error: z.null(),
  result: z.object({
    cursor: z.string().nullable().optional(),
    page: z.object({ cursor: z.string().nullable() }).optional(),
  }),
});

export type IResponsePage = z.infer<typeof ResponsePageSchema>;

// resolved invocation identity; CLI/Core retain ownership of filters and snapshots
export interface IResponseIdentity {
  command: IResponsePage['command'];
  cliVersion: string;
}

export interface IResponseFiles {
  cursor?: string;
  savePath?: string;
  checkpointPath?: string;
}
