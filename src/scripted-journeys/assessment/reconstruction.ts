import { lstat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { assertSafePath, containedPath, runCommand, treeHashes } from '../harness/index.ts';

/** Captures content and executable mode so read-only checks also detect permission changes. */
export const snapshotTree = async (repository: string): Promise<Record<string, string>> => {
  const files = await treeHashes(repository, ['.git', '.agents', 'node_modules']);
  const entries: [string, string][] = [];
  for (const [name, hash] of Object.entries(files)) {
    const stat = await lstat(containedPath(repository, name));
    entries.push([name, `${hash}:${(stat.mode & 0o111) === 0 ? '100644' : '100755'}`]);
  }
  return Object.fromEntries(entries);
};

/** Rejects escaping paths, repository metadata, links, and submodules before git applies a patch. */
export const inspectPatch = (patch: string): void => {
  for (const rawLine of patch.split('\n')) {
    const line = rawLine.trimEnd();
    if (/^(?:old mode|new mode|new file mode|deleted file mode|index )/u.test(line)) {
      const mode = /(?:mode | )([0-9]{6})$/u.exec(line)?.[1];
      if (mode && mode !== '100644' && mode !== '100755')
        throw new Error(`Non-regular patch mode: ${mode}`);
    }
    let paths: string[] = [];
    if (line.startsWith('diff --git ')) {
      const match = /^diff --git a\/(\S+) b\/(\S+)$/u.exec(line);
      if (!match) throw new Error('Unsupported patch path encoding.');
      paths = [match[1]!, match[2]!];
    } else if (/^(?:---|\+\+\+) /u.test(line)) {
      if (line.slice(4) === '/dev/null') continue;
      const match = /^(?:---|\+\+\+) [ab]\/(\S+)$/u.exec(line);
      if (!match) throw new Error('Unsupported patch header.');
      paths = [match[1]!];
    } else if (/^(?:rename|copy) (?:from|to) /u.test(line))
      paths = [line.replace(/^(?:rename|copy) (?:from|to) /u, '')];
    for (const name of paths) {
      assertSafePath(name);
      if (
        name
          .split('/')
          .some((component) =>
            ['.git', '.agents', 'node_modules'].includes(component.toLowerCase()),
          )
      )
        throw new Error(`Patch targets tooling or Git metadata: ${name}`);
    }
  }
};

/** Applies a screened binary patch and scans the reconstructed tree before any checks. */
export const applyRecordedPatch = async (
  repository: string,
  patch: string,
  environment: NodeJS.ProcessEnv,
): Promise<Record<string, string>> => {
  inspectPatch(patch);
  if (patch.trim()) {
    const patchFile = path.join(path.dirname(repository), 'step.patch');
    await writeFile(patchFile, patch);
    await runCommand(
      'git',
      ['apply', '--binary', '--whitespace=nowarn', patchFile],
      repository,
      environment,
    );
  }
  return await snapshotTree(repository);
};

/** Derives changed logical paths from exact snapshots, including additions and removals. */
export const changedPaths = (
  before: Record<string, string>,
  after: Record<string, string>,
): string[] =>
  [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((name) => before[name] !== after[name])
    .sort();
