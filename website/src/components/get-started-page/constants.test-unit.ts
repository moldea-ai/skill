// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import type { IProjectFileTreeEntry, IProjectFileTreeFile } from '../project-file-tree/index.ts';

import {
  INITIALIZE_EXAMPLE_ENTRIES,
  INITIALIZE_EXAMPLE_FILES,
  MAINTENANCE_EXAMPLE_ENTRIES,
  MAINTENANCE_EXAMPLE_FILES,
} from './constants.ts';

const readSkillFile = (name: string): string =>
  readFileSync(new URL(`../../../../moldea/${name}`, import.meta.url), 'utf8');

// describes each file by its sources alone, independently of the tree's status labels
const getStatuses = (files: readonly IProjectFileTreeFile[]): Record<string, string> =>
  Object.fromEntries(
    files.map(({ before, path, source }) => [
      path,
      before === undefined ? 'Added' : before === source ? 'Unchanged' : 'Modified',
    ]),
  );

const getFileIds = (entries: readonly IProjectFileTreeEntry[]): string[] =>
  entries.flatMap((entry) => (entry.kind === 'file' ? [entry.id] : []));

describe('INITIALIZE_EXAMPLE_FILES', () => {
  test('adds the foundation and updates the root files while existing code stays untouched', () => {
    expect(getStatuses(INITIALIZE_EXAMPLE_FILES)).toStrictEqual({
      '/src/order-lookup.ts': 'Unchanged',
      '/src/refund-policy.ts': 'Unchanged',
      '/src/refund-policy.test-unit.ts': 'Unchanged',
      '/moldea/moldea.yaml': 'Added',
      '/moldea/project.md': 'Added',
      '/AGENTS.md': 'Modified',
      '/package.json': 'Modified',
      '/README.md': 'Modified',
    });
  });

  test('adds the CLI at the exact version the Skill records', () => {
    const cliVersionLine = readSkillFile('SKILL.md')
      .split('\n')
      .find((line) => line.trim().startsWith('cliRepairVersion:'))!;
    const cliVersion = cliVersionLine.split(':')[1]!.trim().replaceAll("'", '');
    const manifest = INITIALIZE_EXAMPLE_FILES.find(({ path }) => path === '/package.json')!;

    expect(JSON.parse(manifest.source)).toStrictEqual({
      ...JSON.parse(manifest.before!),
      devDependencies: { '@moldea.ai/cli': cliVersion },
    });
  });

  test('appends the exact managed blocks the Skill ships', () => {
    const files = new Map(INITIALIZE_EXAMPLE_FILES.map((file) => [file.path, file]));
    const readme = files.get('/README.md')!;
    const agents = files.get('/AGENTS.md')!;

    expect(readme.source).toBe(
      `${readme.before}\n${readSkillFile('assets/managed-readme-block.md')}`,
    );
    expect(agents.source).toBe(
      `${agents.before}\n${readSkillFile('assets/managed-agents-block.md').replaceAll('{{skill-path}}', '.agents/skills/moldea')}`,
    );
    expect(agents.source).not.toContain('{{');
  });
});

describe('MAINTENANCE_EXAMPLE_FILES', () => {
  test('changes the refund code and saves the policy while the order lookup stays untouched', () => {
    expect(getStatuses(MAINTENANCE_EXAMPLE_FILES)).toStrictEqual({
      '/src/order-lookup.ts': 'Unchanged',
      '/src/refund-policy.ts': 'Modified',
      '/src/refund-policy.test-unit.ts': 'Modified',
      '/moldea/moldea.yaml': 'Modified',
      '/moldea/project.md': 'Modified',
      '/moldea/context/refund-policy.md': 'Added',
    });
  });

  test('starts from exactly the repository that initialization left', () => {
    const initialized = new Map(INITIALIZE_EXAMPLE_FILES.map((file) => [file.path, file.source]));

    for (const { before, path } of MAINTENANCE_EXAMPLE_FILES) {
      expect(before, path).toBe(initialized.get(path));
    }
  });
});

test.each([
  ['INITIALIZE_EXAMPLE_ENTRIES', INITIALIZE_EXAMPLE_ENTRIES, INITIALIZE_EXAMPLE_FILES],
  ['MAINTENANCE_EXAMPLE_ENTRIES', MAINTENANCE_EXAMPLE_ENTRIES, MAINTENANCE_EXAMPLE_FILES],
] as const)('%s lists every example file exactly once', (_name, entries, files) => {
  expect(getFileIds(entries).toSorted()).toStrictEqual(files.map(({ id }) => id).toSorted());
});
