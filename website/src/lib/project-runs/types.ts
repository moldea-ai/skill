import { z } from 'zod';

import { EXCLUDED_DIRECTORY_NAMES } from '../../../../src/filesystem/index.ts';

const RESERVED_COMPONENT_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const CommitSchema = z.string().regex(/^[a-f0-9]{40}$/u);
const IdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]*$/u)
  .max(64)
  .refine((id) => !RESERVED_COMPONENT_PATTERN.test(id), 'Expected a portable route identifier.');
const UnknownSchema = z.object({ state: z.literal('unknown'), reason: z.string() });
const TextSchema = z.string().min(1);
const AssetPartSchema = TextSchema.refine(
  (part) => part !== '.' && part !== '..' && !/[\p{Cc}]/u.test(part),
);

// existing source paths are preserved, but cannot escape either source transport
export const ProjectRunPathSchema = z
  .string()
  .min(1)
  .refine(
    (candidate) =>
      candidate
        .split('/')
        .every(
          (part) =>
            part !== '' &&
            part !== '.' &&
            part !== '..' &&
            !EXCLUDED_DIRECTORY_NAMES.has(part) &&
            !/[\\:\p{Cc}<>"|?*]/u.test(part) &&
            !/[. ]$/u.test(part) &&
            !RESERVED_COMPONENT_PATTERN.test(part),
        ),
    'Expected a safe repository-relative source path.',
  );

// only fields consumed by this independently deployed reader are described here
export const ProjectRunSelectionSchema = z.strictObject({
  run: z.strictObject({ commit: CommitSchema, runId: IdSchema }).nullable(),
  history: z.array(IdSchema).default([]),
});
export const ProjectRunIndexSchema = z.object({
  formatVersion: z.literal(1),
  runs: z.array(z.object({ runId: IdSchema, manifestPath: ProjectRunPathSchema })),
});
export const ProjectRunRecordSchema = z.object({
  formatVersion: z.literal(1),
  runId: IdSchema,
  date: z.iso.date(),
  summary: TextSchema,
  attempts: z.array(ProjectRunPathSchema),
  review: z.union([ProjectRunPathSchema.nullable(), UnknownSchema]).optional(),
  limitations: z.array(TextSchema).default([]),
});
const RequestSchema = z.object({
  id: IdSchema,
  ordinal: z.int().positive(),
  kind: z.enum(['initial', 'follow-up', 'intervention']),
  text: TextSchema,
  observedResult: TextSchema,
});
export const ProjectAttemptRecordSchema = z.object({
  formatVersion: z.literal(1),
  runId: IdSchema,
  scenarioId: IdSchema,
  attemptId: IdSchema,
  branch: IdSchema.optional(),
  baseCommit: CommitSchema,
  finalCommit: CommitSchema.nullable(),
  lastDurableCommit: CommitSchema,
  scenarioDefinition: z
    .union([z.object({ path: ProjectRunPathSchema, commit: CommitSchema }), UnknownSchema])
    .optional(),
  observedSummary: TextSchema,
  outcomeReason: z.string().nullable().optional(),
  review: z.union([ProjectRunPathSchema.nullable(), UnknownSchema]).optional(),
  requests: z.union([z.array(RequestSchema), UnknownSchema]).optional(),
  skillRelease: z.union([TextSchema, UnknownSchema]).optional(),
  assets: z
    .union([
      z.array(
        z.object({
          kind: TextSchema,
          tag: AssetPartSchema,
          name: AssetPartSchema,
          sizeBytes: z.int().nonnegative().optional(),
          sha256: z
            .string()
            .regex(/^[a-f0-9]{64}$/u)
            .optional(),
          mediaType: TextSchema.optional(),
          sessionId: TextSchema.nullable().optional(),
          firstEventOrdinal: z.int().nonnegative().nullable().optional(),
          lastEventOrdinal: z.int().nonnegative().nullable().optional(),
        }),
      ),
      UnknownSchema,
    ])
    .optional(),
  interventions: z
    .union([
      z.array(z.object({ originalResult: TextSchema, assistedResult: TextSchema })),
      UnknownSchema,
    ])
    .optional(),
  failures: z.union([z.array(z.object({ description: TextSchema })), UnknownSchema]).optional(),
  limitations: z.array(TextSchema).default([]),
});
export type IProjectRunRecord = z.infer<typeof ProjectRunRecordSchema>;
export type IProjectAttemptRecord = z.infer<typeof ProjectAttemptRecordSchema>;
export type IProjectRequest = z.infer<typeof RequestSchema>;

// fixture provenance exists only in test generation; production selects public records
export type IProjectRunSource =
  | { kind: 'public'; commit: string; runId: string }
  | { kind: 'local'; root: string; runId: string }
  | { kind: 'fixture'; root: string; commit: string; runId: string };

export interface IProjectRunLink {
  label: string;
  href: string;
}
// host context preserved at compaction, separate from chronological session messages
interface IProjectCompactionContext {
  message: string;
  encryptedSummaryOmitted: boolean;
  replacementHistory: { role: string; content: string }[];
  retainedUserMessages: { order: number; text: string; complete: boolean }[];
}
export interface IProjectSessionEntry {
  ordinal: number;
  lastOrdinal: number;
  timestamp: string;
  kind: 'session' | 'task_started' | 'turn' | 'message' | 'tool' | 'task_complete' | 'compaction';
  role?: 'developer' | 'user' | 'assistant';
  title: string;
  content: string;
  output?: string;
  status?: string;
  patchTargets?: { action: 'Add' | 'Update' | 'Delete'; path: string }[];
  sessionId?: string;
  compaction?: IProjectCompactionContext;
  isRedacted: boolean;
}
export interface IProjectAttempt {
  id: string;
  projectKey: string;
  title: string;
  route: string;
  summary: string;
  excerpt: string;
  initialRequest: IProjectRequest | null;
  followUps: IProjectRequest[];
  notes: string[];
  links: IProjectRunLink[];
  skillRelease: string | null;
  baseCommit: string;
  reachedCommit: string;
  session: IProjectSessionEntry[] | null;
}
export interface IProjectRunPage {
  number: number;
  route: string;
  previous: string | null;
  next: string | null;
  attempts: IProjectAttempt[];
}
export interface IProjectRunModel {
  id: string;
  date: string;
  dateLabel: string;
  summary: string;
  provenance: IProjectRunSource['kind'];
  notes: string[];
  links: IProjectRunLink[];
  pages: IProjectRunPage[];
}
