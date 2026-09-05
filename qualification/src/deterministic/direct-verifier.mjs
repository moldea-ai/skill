import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import path from 'node:path';

import { parseRepositoryPath } from '@moldea.ai/repository';
import { createMemoryRepositoryReader } from '@moldea.ai/repository/memory';
import {
  DEFAULT_FILESYSTEM_REPOSITORY_RESOURCE_LIMITS,
  createFilesystemRepositoryReader,
} from '@moldea.ai/repository-fs';
import { createCore } from '@moldea.ai/core';

/** Collects every selected repository entry through bounded continuation pages. */
const collectRepositoryEntries = async (repository) => {
  const entries = [];
  let cursor;

  while (cursor !== null) {
    const page = await repository.listEntriesPage({
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
const readRepositoryFile = async (repository, repositoryPath) => {
  const chunks = [];
  let offset = 0;

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
const toComparableValidation = ({ diagnostics, evidence, formatVersion, summary, valid }) => ({
  diagnostics,
  evidence,
  formatVersion,
  summary,
  valid,
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
  .filter((relativePath) => {
    try {
      lstatSync(path.join(projectDirectory, relativePath));
      return true;
    } catch (error) {
      if (error !== null && typeof error === 'object' && error.code === 'ENOENT') {
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
const memoryEntries = [];

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
const adapters = [];

if (adapterId !== 'custom') {
  const adapterModule = await import(adapterPackage);
  const adapter = Object.values(adapterModule).find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === 'object' &&
      'id' in candidate &&
      candidate.id === adapterId,
  );

  if (adapter === undefined) {
    throw new TypeError(`Adapter package ${adapterPackage} does not export ${adapterId}.`);
  }

  adapters.push(adapter);
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
      formatVersion: filesystemResult.formatVersion,
      diagnosticCodes: filesystemResult.diagnostics.map(({ code }) => code),
      evidenceKinds: filesystemResult.evidence.map(({ kind }) => kind),
      evidenceCount: filesystemResult.evidence.length,
      agentCount: filesystemResult.summary?.counts.agents ?? 0,
    },
    memory: {
      valid: memoryResult.valid,
      formatVersion: memoryResult.formatVersion,
      diagnosticCodes: memoryResult.diagnostics.map(({ code }) => code),
      evidenceKinds: memoryResult.evidence.map(({ kind }) => kind),
      evidenceCount: memoryResult.evidence.length,
      agentCount: memoryResult.summary?.counts.agents ?? 0,
    },
  })}\n`,
);
