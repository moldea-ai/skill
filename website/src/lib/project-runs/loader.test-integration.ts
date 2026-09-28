// @vitest-environment node
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import {
  PROJECT_RUN_FIXTURE_COMMIT,
  PROJECT_RUN_FIXTURE_ID,
  writeProjectRunFixture,
} from '../../../scripts/project-run-fixture/index.ts';

import { PROJECT_RUN_MAX_FILE_BYTES, PROJECT_RUN_TIMEOUT_MS } from './constants.ts';
import { loadProjectRun, loadPublicProjectRuns } from './loader.ts';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'project-run-test-'));
  await writeProjectRunFixture(root, 2);
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});
const localSource = () => ({ kind: 'local' as const, root, runId: PROJECT_RUN_FIXTURE_ID });
const publicSource = {
  kind: 'public' as const,
  commit: PROJECT_RUN_FIXTURE_COMMIT,
  runId: PROJECT_RUN_FIXTURE_ID,
};
const changeRecord = async (file: string, update: Record<string, unknown>): Promise<void> => {
  const location = path.join(root, file);
  const record = JSON.parse(await readFile(location, 'utf8')) as Record<string, unknown>;
  await writeFile(location, JSON.stringify({ ...record, ...update }));
};

test('empty public selection makes no requests and does not inherit a local run', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await loadProjectRun(localSource());
  const selection = path.join(root, 'selection.json');
  await writeFile(selection, '{"run":null}');
  expect(await loadPublicProjectRuns(selection)).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('public and local sources retain the same facts, with pinned public links and deduplicated scenario reads', async () => {
  const urls: string[] = [];
  const fetchMock = vi.fn(async (input: string, init: RequestInit) => {
    urls.push(input);
    expect(init.redirect).toBe('error');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const url = new URL(input);
    expect(url.origin).toBe('https://raw.githubusercontent.com');
    const relative = url.pathname.split('/').slice(4).map(decodeURIComponent).join('/');
    return new Response(await readFile(path.join(root, relative), 'utf8'));
  });
  vi.stubGlobal('fetch', fetchMock);
  const local = await loadProjectRun(localSource());
  const published = await loadProjectRun(publicSource);
  const localAttempt = local.pages[0]!.attempts[0]!;
  const publicAttempt = published.pages[0]!.attempts[0]!;
  expect({ ...localAttempt, links: [] }).toStrictEqual({ ...publicAttempt, links: [] });
  expect(publicAttempt.title).toBe('Field Notes');
  expect(publicAttempt.links.find(({ label }) => label === 'Full record')?.href).toContain(
    `${PROJECT_RUN_FIXTURE_COMMIT}/evidence/attempt-1.json`,
  );
  expect(publicAttempt.links.find(({ label }) => label === 'See the changes')?.href).toContain(
    `${'b'.repeat(40)}...${'c'.repeat(40)}`,
  );
  expect(urls.filter((url) => url.endsWith('/scenarios/field-notes.md'))).toStrictEqual([
    `https://raw.githubusercontent.com/moldea-ai/moldea-mock-project-public/${'d'.repeat(40)}/scenarios/field-notes.md`,
  ]);
  expect(urls).toHaveLength(5);
  expect(JSON.stringify(local)).not.toContain('github.com');
  expect(JSON.stringify(local)).not.toContain(root);
});

test('unknown optional evidence and new status values do not block a run', async () => {
  const unknown = { state: 'unknown', reason: 'Not imported.' };
  await changeRecord('evidence/attempt-1.json', {
    requests: unknown,
    assets: unknown,
    review: unknown,
    scenarioDefinition: unknown,
    skillRelease: unknown,
    interventions: unknown,
    failures: unknown,
    evidenceStatus: 'future-state',
    reviewStatus: 'unreviewed',
    extraProperty: true,
  });
  const attempt = (await loadProjectRun(localSource())).pages[0]!.attempts[0]!;
  expect(attempt.title).toBe('Field notes 1');
  expect(attempt.initialRequest).toBeNull();
  expect(attempt.notes).toContain('Not imported.');
  expect(JSON.stringify(attempt)).not.toContain('[object Object]');
});

test.each([
  '/etc/passwd',
  '../outside.json',
  'C:/outside.json',
  'C:outside.json',
  '\\\\server\\file',
  'evidence/../run.json',
  'evidence/_archive/run.json',
  'evidence/_archives/run.json',
  'evidence/_backup/run.json',
  'evidence/_backups/run.json',
  'evidence//run.json',
])('rejects unsafe referenced path %s before reading it', async (reference) => {
  await changeRecord('evidence/run.json', { attempts: [reference] });
  await expect(loadProjectRun(localSource())).rejects.toThrow(
    'Project run source could not be loaded',
  );
});

test('rejects an excluded root before reading its contents', async () => {
  await expect(
    loadProjectRun({ ...localSource(), root: path.join(root, '_archive') }),
  ).rejects.toThrow('source root is excluded');
});

test('rejects a linked ancestor even when it targets another directory inside the source', async () => {
  await symlink(
    path.join(root, 'scenarios'),
    path.join(root, 'linked'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await changeRecord('evidence/attempt-1.json', {
    scenarioDefinition: { path: 'linked/field-notes.md', commit: 'd'.repeat(40) },
  });
  await expect(loadProjectRun(localSource())).rejects.toThrow(
    'Project run source could not be loaded',
  );
});

test('preserves established uppercase source names and dot directories', async () => {
  await writeFile(path.join(root, 'README.md'), '# Uppercase project');
  await changeRecord('evidence/attempt-1.json', {
    scenarioDefinition: { path: 'README.md', commit: 'd'.repeat(40) },
  });
  expect((await loadProjectRun(localSource())).pages[0]!.attempts[0]!.title).toBe(
    'Uppercase project',
  );
});

test.each([
  ['evidence/run.json', { runId: 'wrong-run' }],
  ['evidence/attempt-1.json', { runId: 'wrong-run' }],
  ['evidence/attempt-2.json', { attemptId: 'project-1' }],
  ['evidence/attempt-1.json', { finalCommit: 'main' }],
  ['evidence/attempt-1.json', { attemptId: 'con' }],
])('rejects inconsistent identity in %s', async (file, update) => {
  await changeRecord(file, update);
  await expect(loadProjectRun(localSource())).rejects.toThrow(
    'Project run source could not be loaded',
  );
});

test('rejects malformed JSON without returning a partial model', async () => {
  await writeFile(path.join(root, 'evidence', 'attempt-2.json'), '{');
  await expect(loadProjectRun(localSource())).rejects.toThrow('evidence/attempt-2.json');
});

test.each([404, 503])('rejects HTTP %d without choosing another run', async (status) => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response('', { status })));
  vi.stubGlobal('fetch', fetchMock);
  await expect(loadProjectRun(publicSource)).rejects.toThrow('evidence/index.json');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('passes the bounded abort signal to the HTTP boundary and preserves timeout failure', async () => {
  const timeout = vi
    .spyOn(AbortSignal, 'timeout')
    .mockReturnValue(AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')));
  vi.stubGlobal(
    'fetch',
    vi.fn((_input: string, init: RequestInit) => {
      init.signal!.throwIfAborted();
      return Promise.resolve(new Response('{}'));
    }),
  );
  await expect(loadProjectRun(publicSource)).rejects.toThrow('evidence/index.json');
  expect(timeout).toHaveBeenCalledWith(PROJECT_RUN_TIMEOUT_MS);
});

test.each([0, 1])(
  'enforces the streamed metadata size boundary with %d excess bytes',
  async (excess) => {
    const index = JSON.stringify({ formatVersion: 1, runs: [] });
    const body = index + ' '.repeat(PROJECT_RUN_MAX_FILE_BYTES - Buffer.byteLength(index) + excess);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(body))),
    );
    const failure = await loadProjectRun(publicSource).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).cause).toBeInstanceOf(Error);
    expect(((failure as Error).cause as Error).message).toContain(
      excess === 0 ? 'exactly one index entry' : 'exceeds',
    );
  },
);

test('cancels an oversized declared response before consuming its body', async () => {
  const cancel = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(new ReadableStream({ cancel }), {
          headers: { 'content-length': String(PROJECT_RUN_MAX_FILE_BYTES + 1) },
        }),
      ),
    ),
  );
  await expect(loadProjectRun(publicSource)).rejects.toThrow('evidence/index.json');
  expect(cancel).toHaveBeenCalledTimes(1);
});
