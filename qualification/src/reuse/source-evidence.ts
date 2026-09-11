import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

import {
  QualificationCaseResultSchema,
  QualificationProvenanceSchema,
  QualificationSelectionSchema,
  QualificationStageCheckpointSchema,
  type IQualificationCaseResult,
  type IQualificationProvenance,
  type IQualificationSelection,
  type IQualificationStageCheckpoint,
} from '../contracts/index.ts';
import { calculateSha256 } from '../filesystem/index.ts';
import {
  createQualificationArtifactStorageEntries,
  QualificationAttemptStorageSchema,
  type IQualificationAttemptStorage,
} from '../storage/index.ts';

const executeFile = promisify(execFile);
const MAXIMUM_SOURCE_FILE_BYTES = 16 * 1024 * 1024;
const GitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

// behavior-bearing source projection independent of its aggregation envelope
const QualificationReuseSourceAttemptSchema = z.object({
  attemptId: z.string().trim().min(1),
  selection: QualificationSelectionSchema,
  status: z.enum(['errored', 'failed', 'incomplete', 'passed']),
  createdAt: z.string().datetime(),
  artifactDigests: z.record(z.string().trim().min(1), Sha256Schema),
  mode: z.enum(['diagnostic', 'dry-run', 'official']),
  provenance: QualificationProvenanceSchema,
  stages: z.array(QualificationStageCheckpointSchema),
  cases: z.array(QualificationCaseResultSchema),
});

const QualificationReuseSourceManifestSchema = z.strictObject({
  version: z.literal(1),
  sources: z.array(
    z.strictObject({
      selection: QualificationSelectionSchema,
      attemptId: z.string().trim().min(1),
      evidenceCommit: GitCommitSchema,
      attemptSha256: Sha256Schema,
      storageSha256: Sha256Schema,
    }),
  ),
});

export type IQualificationCommittedSource = {
  attemptId: string;
  cases: IQualificationCaseResult[];
  createdAt: string;
  evidenceCommit: string;
  mode: 'diagnostic' | 'dry-run' | 'official';
  provenance: IQualificationProvenance;
  readArtifact: (logicalPath: string) => Promise<Buffer>;
  selection: IQualificationSelection;
  stages: IQualificationStageCheckpoint[];
  status: 'errored' | 'failed' | 'incomplete' | 'passed';
  storage: IQualificationAttemptStorage;
};

const readGitBlob = async (
  repositoryRoot: string,
  commit: string,
  relativePath: string,
): Promise<Buffer> => {
  const { stdout } = await executeFile('git', ['cat-file', 'blob', `${commit}:${relativePath}`], {
    cwd: repositoryRoot,
    encoding: 'buffer',
    maxBuffer: MAXIMUM_SOURCE_FILE_BYTES,
  });
  const content = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
  if (content.byteLength > MAXIMUM_SOURCE_FILE_BYTES) {
    throw new Error(`Qualification reuse source file is too large: ${relativePath}`);
  }
  return content;
};

/** Loads the explicit immutable qualification sources available to current reuse. */
export const loadQualificationReuseSourceManifest = async (
  repositoryRoot: string,
): Promise<z.infer<typeof QualificationReuseSourceManifestSchema>> => {
  const manifestPath = path.join(repositoryRoot, 'qualification', 'reuse-sources.json');

  try {
    await access(manifestPath);
  } catch {
    return { version: 1, sources: [] };
  }

  return QualificationReuseSourceManifestSchema.parse(
    JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
  );
};

/** Reads and verifies one source-era attempt only through its immutable Git object boundary. */
export const readCommittedQualificationSource = async (options: {
  attemptRelativeDirectory: string;
  attemptSha256: string;
  evidenceCommit: string;
  repositoryRoot: string;
  storageSha256?: string;
}): Promise<IQualificationCommittedSource> => {
  const attemptPath = path.posix.join(options.attemptRelativeDirectory, 'attempt.json');
  const storagePath = path.posix.join(options.attemptRelativeDirectory, 'storage.json');
  const [attemptBytes, storageBytes] = await Promise.all([
    readGitBlob(options.repositoryRoot, options.evidenceCommit, attemptPath),
    readGitBlob(options.repositoryRoot, options.evidenceCommit, storagePath),
  ]);
  if (
    calculateSha256(attemptBytes) !== options.attemptSha256 ||
    (options.storageSha256 !== undefined && calculateSha256(storageBytes) !== options.storageSha256)
  ) {
    throw new Error('Qualification reuse source does not match its recorded Git digests.');
  }
  const attemptInput = JSON.parse(attemptBytes.toString('utf8')) as unknown;
  const attempt = QualificationReuseSourceAttemptSchema.parse(attemptInput);
  const storage = QualificationAttemptStorageSchema.parse(
    JSON.parse(storageBytes.toString('utf8')) as unknown,
  );
  if (
    attempt.attemptId !== storage.attemptId ||
    storage.attemptDigest !== options.attemptSha256 ||
    JSON.stringify(storage.artifacts) !==
      JSON.stringify(createQualificationArtifactStorageEntries(attempt.artifactDigests))
  ) {
    throw new Error(`Qualification reuse source ${attempt.attemptId} has invalid storage.`);
  }
  return {
    attemptId: attempt.attemptId,
    cases: attempt.cases,
    createdAt: attempt.createdAt,
    evidenceCommit: options.evidenceCommit,
    mode: attempt.mode,
    provenance: attempt.provenance,
    readArtifact: async (logicalPath) => {
      const artifact = storage.artifacts.find(
        ({ logicalPath: candidatePath }) => candidatePath === logicalPath,
      );
      if (artifact === undefined) {
        throw new Error(`Qualification reuse source is missing ${logicalPath}.`);
      }
      const content = await readGitBlob(
        options.repositoryRoot,
        options.evidenceCommit,
        path.posix.join(options.attemptRelativeDirectory, artifact.physicalPath),
      );
      if (calculateSha256(content) !== artifact.sha256) {
        throw new Error(`Qualification reuse source artifact changed: ${logicalPath}.`);
      }
      return content;
    },
    selection: attempt.selection,
    stages: attempt.stages,
    status: attempt.status,
    storage,
  };
};
