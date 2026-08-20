import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import path from 'node:path';

import { parseRepositoryPath } from '@moldea.ai/repository';
import { createMemoryRepositoryReader } from '@moldea.ai/repository/memory';
import { createFilesystemRepositoryReader } from '@moldea.ai/repository-fs';
import { createCore } from '@moldea.ai/core';

const [projectDirectory] = process.argv.slice(2);

if (projectDirectory === undefined) {
  throw new TypeError('The direct verifier requires one project directory.');
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

for await (const entry of filesystemRepository.listEntries()) {
  if (entry.type === 'file') {
    memoryEntries.push({
      path: entry.path,
      type: 'file',
      content: await filesystemRepository.readFile(entry.path),
    });
  } else {
    memoryEntries.push({ path: entry.path, type: entry.type });
  }
}

const memoryRepository = createMemoryRepositoryReader(memoryEntries);
const core = createCore();
const filesystemResult = await core.inspectProject({ repository: filesystemRepository });
const memoryResult = await core.inspectProject({ repository: memoryRepository });
const equivalent = JSON.stringify(filesystemResult) === JSON.stringify(memoryResult);

process.stdout.write(
  `${JSON.stringify({
    equivalent,
    filesystem: {
      valid: filesystemResult.valid,
      formatVersion: filesystemResult.formatVersion,
      diagnosticCodes: filesystemResult.diagnostics.map(({ code }) => code),
      evidenceCount: filesystemResult.evidence.length,
      agentCount: filesystemResult.project?.agents.length ?? 0,
    },
    memory: {
      valid: memoryResult.valid,
      formatVersion: memoryResult.formatVersion,
      diagnosticCodes: memoryResult.diagnostics.map(({ code }) => code),
      evidenceCount: memoryResult.evidence.length,
      agentCount: memoryResult.project?.agents.length ?? 0,
    },
  })}\n`,
);
