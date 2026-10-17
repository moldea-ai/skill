// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, opendir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, test } from 'vitest';

import { calculateDirectoryFingerprint } from '../../filesystem/index.ts';

import { collectInitializationInspection } from './index.ts';

const roots: string[] = [];
const script = resolve(
  import.meta.dirname,
  '../../..',
  'moldea/scripts/initialization-inspection.mjs',
);
const node = process.env['MOLDEA_TEST_NODE'] ?? process.execPath;

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-init-inspect-'));
  roots.push(root);
  const installedSkillRoot = join(root, '.agents/skills/moldea');
  for (const [path, text] of Object.entries({
    'README.md': '# Operations\n',
    'docs/architecture.md': '# Architecture\n',
    'docs/decisions/001-human-approval.md': '# Human approval\n',
    'skills/release-review/SKILL.md': '# Project release review\n',
    '.agents/skills/moldea/SKILL.md': '# Installed distribution\n',
    'moldea/agents/support/instruction.md': 'You are the `support` agent.\n',
    'src/agent.js': 'export const runAgent = () => 1;\n',
    'src/loader.js': 'export const loadInstruction = () => "canonical";\n',
  })) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return { repositoryRoot: root, installedSkillRoot };
};

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

test('inventory separates the selected installation and leaves other skill ownership unverified', async () => {
  const options = await fixture();
  const result = await collectInitializationInspection(options);
  expect(result).toStrictEqual({
    kind: 'moldea-initialization-inspection',
    mode: 'inventory',
    status: 'complete',
    installedSkill: {
      repositoryPath: '.agents/skills/moldea',
      ownership: 'installed-distribution',
    },
    inventory: {
      canonicalAgentDirectories: ['moldea/agents/support'],
      documents: ['README.md', 'docs/architecture.md', 'moldea/agents/support/instruction.md'],
      decisionCandidates: ['docs/decisions/001-human-approval.md'],
      skillCandidates: [{ path: 'skills/release-review/SKILL.md', ownership: 'unverified' }],
      visitedEntries: 18,
    },
  });
});

test('source packets batch known files without inventory traversal or repository writes', async () => {
  const options = await fixture();
  const fingerprint = await calculateDirectoryFingerprint(options.repositoryRoot);
  const paths = ['src/agent.js', 'src/loader.js'];
  const before = await Promise.all(
    paths.map((path) => readFile(join(options.repositoryRoot, path), 'utf8')),
  );
  const result = await collectInitializationInspection({ ...options, paths });
  expect(result).toMatchObject({
    mode: 'sources',
    status: 'complete',
    sources: paths.map((path, index) => ({ path, content: before[index], omission: null })),
  });
  expect(result).not.toHaveProperty('inventory');
  expect(
    await Promise.all(paths.map((path) => readFile(join(options.repositoryRoot, path), 'utf8'))),
  ).toStrictEqual(before);
  expect(await calculateDirectoryFingerprint(options.repositoryRoot)).toBe(fingerprint);
});

test('bundled inventory includes archive and backup folders but skips Git and dependencies', async () => {
  const options = await fixture();
  const included = ['_archive', '_archives', '_backup', '_backups'];
  for (const directory of [...included, '.git', 'node_modules']) {
    await mkdir(join(options.repositoryRoot, directory));
    await writeFile(join(options.repositoryRoot, directory, 'guide.md'), '# Existing guide\n');
  }
  const result = spawnSync(node, [script, '--repository', options.repositoryRoot], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    mode: 'inventory',
    status: 'complete',
    inventory: {
      documents: [
        'README.md',
        ...included.map((directory) => `${directory}/guide.md`),
        'docs/architecture.md',
        'moldea/agents/support/instruction.md',
      ].sort(),
    },
  });
  expect(
    await collectInitializationInspection({
      ...options,
      paths: included.map((directory) => `${directory}/guide.md`),
    }),
  ).toMatchObject({
    mode: 'sources',
    status: 'complete',
    sources: included.map((directory) => ({
      path: `${directory}/guide.md`,
      content: '# Existing guide\n',
      omission: null,
    })),
  });
});

test.each([
  'src/file.ts:secret',
  'src/aux.txt',
  'src/file.ts.',
  'src/file.ts ',
  '../outside.md',
  '/etc/passwd',
  'C:/outside.md',
  'C:outside.md',
  '//server/share.md',
  'src/../README.md',
  'src\\agent.js',
  '.git/source.md',
  'node_modules/source.md',
  '.env',
  '.env.local',
  'auth.json',
  'credentials.json',
  'source.pem',
  'source.key',
])('rejects unsupported or excluded selection %s', async (path) => {
  const options = await fixture();
  await expect(collectInitializationInspection({ ...options, paths: [path] })).rejects.toThrow(
    'Inspection requires known repository-relative source paths.',
  );
});

test('reports missing, oversized, and non-text sources as partial without leaking content', async () => {
  const options = await fixture();
  await writeFile(join(options.repositoryRoot, 'oversized.md'), 'a'.repeat(32_769));
  await writeFile(join(options.repositoryRoot, 'binary.md'), Buffer.from([0, 255]));
  const result = await collectInitializationInspection({
    ...options,
    paths: ['missing.md', 'oversized.md', 'binary.md'],
  });
  expect(result).toMatchObject({
    mode: 'sources',
    status: 'partial',
    sources: ['missing.md', 'oversized.md', 'binary.md'].map((path) => ({
      path,
      content: null,
      omission: 'source-unavailable',
    })),
  });
});

test('does not follow directory links in inventory or selected source reads', async (context) => {
  const options = await fixture();
  const outside = await mkdtemp(join(tmpdir(), 'moldea-init-outside-'));
  roots.push(outside);
  await writeFile(join(outside, 'secret.md'), 'DO-NOT-READ');
  try {
    await symlink(
      outside,
      join(options.repositoryRoot, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      !['EPERM', 'EACCES'].includes(String(error.code))
    )
      throw error;
    context.skip();
    return;
  }
  const result = await collectInitializationInspection({
    ...options,
    paths: ['linked/secret.md'],
  });
  expect(result).toMatchObject({
    mode: 'sources',
    status: 'partial',
    sources: ['linked/secret.md'].map((path) => ({
      path,
      content: null,
      omission: 'source-unavailable',
    })),
  });
  expect(JSON.stringify(await collectInitializationInspection(options))).not.toContain('secret.md');
  expect(JSON.stringify(result)).not.toContain('DO-NOT-READ');
});

test('packet and per-category inventory limits preserve explicit partial results', async () => {
  const options = await fixture();
  for (let index = 0; index < 4; index += 1)
    await writeFile(join(options.repositoryRoot, `large-${index}.md`), 'a'.repeat(32_768));
  const packet = await collectInitializationInspection({
    ...options,
    paths: ['large-0.md', 'large-1.md', 'large-2.md', 'large-3.md'],
  });
  expect(packet).toMatchObject({
    mode: 'sources',
    status: 'partial',
    sources: [
      { omission: null },
      { omission: null },
      { omission: 'packet-limit' },
      { omission: 'packet-limit' },
    ],
  });
  await mkdir(join(options.repositoryRoot, 'many-docs'));
  await Promise.all(
    Array.from({ length: 256 }, (_, index) =>
      writeFile(
        join(options.repositoryRoot, 'many-docs', `document-${index}.md`),
        '# Existing doc\n',
      ),
    ),
  );
  const inventory = await collectInitializationInspection(options);
  expect(inventory).toMatchObject({
    mode: 'inventory',
    status: 'partial',
    inventory: {
      canonicalAgentDirectories: ['moldea/agents/support'],
      skillCandidates: [{ path: 'skills/release-review/SKILL.md', ownership: 'unverified' }],
    },
  });
  if (inventory.mode !== 'inventory') throw new Error('Expected inventory.');
  expect(inventory.inventory.documents).toHaveLength(128);
});

test('reports a packet-limited source when the remaining budget is nonzero', async () => {
  const options = await fixture();
  const paths = ['first.js', 'second.js', 'third.js'];
  for (const [index, path] of paths.entries())
    await writeFile(join(options.repositoryRoot, path), 'a'.repeat(index === 1 ? 31_000 : 20_000));
  const result = await collectInitializationInspection({ ...options, paths });
  expect(result).toMatchObject({
    mode: 'sources',
    status: 'partial',
    sources: [
      { omission: null },
      { omission: null },
      { path: 'third.js', content: null, omission: 'packet-limit' },
    ],
  });
});

test('rejected non-text reads consume the packet budget', async () => {
  const options = await fixture();
  for (const path of ['first.bin', 'second.bin'])
    await writeFile(join(options.repositoryRoot, path), Buffer.alloc(32_768));
  expect(
    await collectInitializationInspection({
      ...options,
      paths: ['first.bin', 'second.bin', 'src/agent.js'],
    }),
  ).toMatchObject({
    mode: 'sources',
    status: 'partial',
    sources: [
      { content: null, omission: 'source-unavailable' },
      { content: null, omission: 'source-unavailable' },
      { content: null, omission: 'packet-limit' },
    ],
  });
});

test.skipIf(process.platform === 'win32')(
  'retains useful partial inventory when one directory is unreadable',
  async (context) => {
    const options = await fixture();
    const directory = join(options.repositoryRoot, 'unreadable');
    await mkdir(directory);
    await chmod(directory, 0);
    try {
      const opened = await opendir(directory).catch((error: unknown) => {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'EACCES') throw error;
        return null;
      });
      if (opened !== null) {
        await opened.close();
        context.skip();
        return;
      }
      expect(await collectInitializationInspection(options)).toMatchObject({
        mode: 'inventory',
        status: 'partial',
        inventory: {
          canonicalAgentDirectories: ['moldea/agents/support'],
          skillCandidates: [{ path: 'skills/release-review/SKILL.md', ownership: 'unverified' }],
        },
      });
    } finally {
      await chmod(directory, 0o700);
    }
  },
);

test('rejects too many selected paths and does not mistake an external installation for project source', async () => {
  const options = await fixture();
  await expect(
    collectInitializationInspection({
      ...options,
      paths: Array.from({ length: 9 }, (_, index) => `source-${index}.js`),
    }),
  ).rejects.toThrow('Inspection source batch exceeds its path limit.');
  const outside = await mkdtemp(join(tmpdir(), 'moldea-installed-'));
  roots.push(outside);
  const result = await collectInitializationInspection({ ...options, installedSkillRoot: outside });
  expect(result.installedSkill).toStrictEqual({
    repositoryPath: null,
    ownership: 'installed-distribution',
  });
});

test('stops a growing inventory at its traversal boundary without claiming complete discovery', async () => {
  const options = await fixture();
  const directory = join(options.repositoryRoot, 'many-files');
  await mkdir(directory);
  for (let start = 0; start < 16_512; start += 64) {
    await Promise.all(
      Array.from({ length: 64 }, (_, offset) =>
        writeFile(join(directory, `source-${start + offset}.txt`), ''),
      ),
    );
  }
  const result = await collectInitializationInspection(options);
  expect(result).toMatchObject({
    mode: 'inventory',
    status: 'partial',
    inventory: { visitedEntries: 16_384 },
  });
});

test('generated helper runs directly on the supported Node executable with bounded JSON and strict flags', async () => {
  const options = await fixture();
  const output = execFileSync(
    node,
    [
      script,
      '--repository',
      options.repositoryRoot,
      '--path',
      'src/agent.js',
      '--path',
      'src/loader.js',
    ],
    { cwd: tmpdir(), encoding: 'utf8', timeout: 30_000 },
  );
  expect(JSON.parse(output)).toMatchObject({
    kind: 'moldea-initialization-inspection',
    mode: 'sources',
    status: 'complete',
    installedSkill: { ownership: 'installed-distribution' },
    sources: [{ path: 'src/agent.js' }, { path: 'src/loader.js' }],
  });
  expect(Buffer.byteLength(output)).toBeLessThanOrEqual(262_144);
  const invalid = spawnSync(node, [script, '--repository', options.repositoryRoot, '--write'], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  expect(invalid.status).toBe(1);
  expect(invalid.stdout).toBe('');
  expect(invalid.stderr).toContain('Usage: initialization-inspection');
});
