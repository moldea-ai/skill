import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import path from 'node:path';

import { parseRepositoryPath } from '@moldea.ai/repository';
import type { IRepositoryEntry, IRepositoryPath, IRepositoryReader } from '@moldea.ai/repository';
import { createMemoryRepositoryReader } from '@moldea.ai/repository/memory';
import type { IMemoryRepositoryEntry } from '@moldea.ai/repository/memory';
import {
  DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS,
  createFilesystemRepositoryReader,
} from '@moldea.ai/repository-fs';
import { createCore } from '@moldea.ai/core';
import type {
  IDiagnostic,
  IProjectValidationResult,
  IRuntimeAdapterEvidence,
} from '@moldea.ai/core';

type IRuntimeAdapter = NonNullable<
  NonNullable<Parameters<typeof createCore>[0]>['adapters']
>[number];
const EXCLUDED_CONTEXT_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

/** Collects every selected repository entry through bounded continuation pages. */
const collectRepositoryEntries = async (
  repository: IRepositoryReader,
): Promise<IRepositoryEntry[]> => {
  const entries: IRepositoryEntry[] = [];
  let cursor: string | null | undefined;

  while (cursor !== null) {
    const page: Awaited<ReturnType<IRepositoryReader['listEntriesPage']>> =
      await repository.listEntriesPage({
        ...(cursor === undefined ? {} : { cursor }),
        maxEntries: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxPageEntries,
      });
    entries.push(...page.entries);

    if (page.isComplete) {
      return entries;
    }

    if (page.nextCursor === null) {
      throw new TypeError('An incomplete repository entry page requires a continuation cursor.');
    }

    cursor = page.nextCursor;
  }

  return entries;
};

/** Reads one selected regular file through bounded byte pages. */
const readRepositoryFile = async (
  repository: IRepositoryReader,
  repositoryPath: IRepositoryPath,
): Promise<Buffer> => {
  const chunks: Uint8Array[] = [];
  let offset: number | null = 0;

  while (offset !== null) {
    const page = await repository.readFilePage(repositoryPath, {
      maxBytes: DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS.maxReadBytes,
      offset,
    });
    chunks.push(page.bytes);

    if (page.isComplete) {
      return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
    }

    if (page.nextOffset === null) {
      throw new TypeError('An incomplete repository file page requires a continuation offset.');
    }

    offset = page.nextOffset;
  }

  return Buffer.alloc(0);
};

/** Removes source-specific snapshot identity before comparing validation semantics. */
const toComparableValidation = ({
  diagnostics,
  evidence,
  errorCount,
  formatVersion,
  summary,
  valid,
  warningCount,
}: IProjectValidationResult): Pick<
  IProjectValidationResult,
  'diagnostics' | 'evidence' | 'errorCount' | 'formatVersion' | 'summary' | 'valid' | 'warningCount'
> => ({ diagnostics, evidence, errorCount, formatVersion, summary, valid, warningCount });

const projectDetails = (
  source: object,
  allowedFields: readonly string[],
): Record<string, unknown> => {
  const details: Record<string, unknown> = {};
  const fields = source as Record<string, unknown>;
  for (const field of allowedFields) {
    if (Object.hasOwn(source, field)) details[field] = fields[field];
  }
  return details;
};

const projectDiagnostic = (diagnostic: IDiagnostic) => ({
  code: diagnostic.code,
  severity: diagnostic.severity,
  ...(diagnostic.entity?.agentId === undefined ? {} : { agentId: diagnostic.entity.agentId }),
  ...(diagnostic.entity?.capabilityKind === undefined
    ? {}
    : { capabilityKind: diagnostic.entity.capabilityKind }),
  ...(diagnostic.entity?.capabilityId === undefined
    ? {}
    : { capabilityId: diagnostic.entity.capabilityId }),
  ...(diagnostic.severity === 'warning'
    ? {
        relationship: diagnostic.details.relationship,
        reason: diagnostic.details.reason,
        details: projectDetails(diagnostic.details, [
          'packageName',
          'boundaryVersion',
          'declaredRange',
        ]),
      }
    : {}),
});

const projectEvidence = (evidence: IRuntimeAdapterEvidence) => ({
  kind: evidence.kind,
  agentId: evidence.agentId,
  capabilityKind: evidence.capabilityKind,
  capabilityId: evidence.capabilityId,
  references: evidence.references.map(({ path, symbol }) => ({
    path,
    ...(symbol === undefined ? {} : { symbol }),
  })),
  details: projectDetails(evidence.details, [
    'declaredDeferredLoading',
    'patternId',
    'interruptForm',
    'responseSchemaRole',
  ]),
});

const [projectDirectory, adapterId, adapterPackage] = process.argv.slice(2);

if (projectDirectory === undefined || adapterId === undefined || adapterPackage === undefined) {
  throw new TypeError('The direct verifier requires a project, adapter id, and adapter package.');
}

const gitPaths = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  {
    cwd: projectDirectory,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  },
)
  .split('\0')
  .filter((relativePath) => relativePath !== '')
  .filter(
    (relativePath) =>
      !relativePath.split(/[\\/]/).some((name) => EXCLUDED_CONTEXT_DIRECTORY_NAMES.has(name)),
  )
  .filter((relativePath) => {
    try {
      lstatSync(path.join(projectDirectory, relativePath));
      return true;
    } catch (error) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return false;
      }

      throw error;
    }
  });
const selectedPaths = [...new Set(gitPaths)].map((relativePath) =>
  parseRepositoryPath(`/${relativePath}`),
);
const filesystemRepository = await createFilesystemRepositoryReader({
  rootDirectory: projectDirectory,
  selection: { kind: 'paths', paths: selectedPaths },
});
const memoryEntries: IMemoryRepositoryEntry[] = [];

for (const entry of await collectRepositoryEntries(filesystemRepository)) {
  if (entry.type === 'file') {
    memoryEntries.push({
      path: entry.path,
      type: 'file',
      content: await readRepositoryFile(filesystemRepository, entry.path),
    });
  } else {
    memoryEntries.push({ path: entry.path, type: entry.type });
  }
}

const memoryRepository = createMemoryRepositoryReader(memoryEntries);
const adapters: IRuntimeAdapter[] = [];

if (adapterId !== 'custom') {
  const adapterModule: unknown = await import(adapterPackage);
  if (adapterModule === null || typeof adapterModule !== 'object') {
    throw new TypeError(`Adapter package ${adapterPackage} has an invalid module namespace.`);
  }
  const adapterModuleRecord = adapterModule as Record<string, unknown>;
  const adapter = Object.values(adapterModuleRecord).find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === 'object' &&
      'id' in candidate &&
      candidate.id === adapterId,
  );

  if (adapter === undefined) {
    throw new TypeError(`Adapter package ${adapterPackage} does not export ${adapterId}.`);
  }

  adapters.push(adapter as IRuntimeAdapter);
}

const core = createCore({ adapters });
const filesystemResult = await core.validateProject({ repository: filesystemRepository });
const memoryResult = await core.validateProject({ repository: memoryRepository });
const equivalent =
  JSON.stringify(toComparableValidation(filesystemResult)) ===
  JSON.stringify(toComparableValidation(memoryResult));

process.stdout.write(
  `${JSON.stringify({
    equivalent,
    filesystem: {
      valid: filesystemResult.valid,
      errorCount: filesystemResult.errorCount,
      warningCount: filesystemResult.warningCount,
      formatVersion: filesystemResult.formatVersion,
      diagnosticCodes: filesystemResult.diagnostics.map(({ code }) => code),
      diagnostics: filesystemResult.diagnostics.map(projectDiagnostic),
      evidenceKinds: filesystemResult.evidence.map(({ kind }) => kind),
      evidence: filesystemResult.evidence.map(projectEvidence),
      evidenceCount: filesystemResult.evidence.length,
      agentCount: filesystemResult.summary?.counts.agents ?? 0,
    },
    memory: {
      valid: memoryResult.valid,
      errorCount: memoryResult.errorCount,
      warningCount: memoryResult.warningCount,
      formatVersion: memoryResult.formatVersion,
      diagnosticCodes: memoryResult.diagnostics.map(({ code }) => code),
      diagnostics: memoryResult.diagnostics.map(projectDiagnostic),
      evidenceKinds: memoryResult.evidence.map(({ kind }) => kind),
      evidence: memoryResult.evidence.map(projectEvidence),
      evidenceCount: memoryResult.evidence.length,
      agentCount: memoryResult.summary?.counts.agents ?? 0,
    },
  })}\n`,
);
