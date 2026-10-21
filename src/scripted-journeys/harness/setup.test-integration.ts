// @vitest-environment node
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { writeJsonFile } from 'jg-fs';

import { createHarnessFixture, recordFixturePlatform } from '../testing/index.ts';

import { setupWorkspace } from './setup.ts';
import { nextRequest } from './next.ts';
import { copyTree, readState, selectJourneys, treeHashes, verifyExport } from './shared.ts';

test('selected baselines complete independently, confirmations start pristine and resume preserves trial identity', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-selected-'));
  try {
    const fixture = await createHarnessFixture(scratch, process.cwd());
    const exported = await recordFixturePlatform(scratch, fixture, 'claude', false, {
      journeys: ['second'],
    });
    const initial = await verifyExport(exported);
    expect(initial.complete).toBe(true);
    expect(initial.selectedJourneys).toStrictEqual(['second']);
    expect(initial.steps.map((step) => step.journeyId)).toStrictEqual(['second', 'second']);
    await expect(lstat(path.join(scratch, 'claude-initial/work/first'))).rejects.toThrow();
    const options = {
      runId: initial.runId,
      sha256: fixture.hash,
      platform: 'claude' as const,
      bundleZip: fixture.bundleZip,
      bundleDirectory: fixture.bundleDirectory,
      homeDirectory: path.join(scratch, 'home'),
      journeys: ['second'],
    };
    const confirmation = path.join(scratch, 'confirmation');
    await setupWorkspace(confirmation, { ...options, confirmationIndex: 1 });
    expect(await readFile(path.join(confirmation, 'work/second/policy.md'), 'utf8')).toContain(
      '60',
    );
    expect((await readState(confirmation)).trialId).not.toBe(initial.trialId);
    expect(await nextRequest(confirmation)).toContain('journey: second');
    const restored = path.join(scratch, 'restored');
    await setupWorkspace(restored, { ...options, resume: exported });
    expect((await readState(restored)).trialId).toBe(initial.trialId);
    expect(await nextRequest(restored)).toContain('COMPLETE');
    await expect(
      setupWorkspace(path.join(scratch, 'wrong'), {
        ...options,
        journeys: ['first'],
        resume: exported,
      }),
    ).rejects.toThrow();
    const tampered = path.join(scratch, 'tampered');
    await copyTree(exported, tampered);
    await writeFile(path.join(tampered, 'unselected.md'), 'unexpected');
    await writeJsonFile(
      path.join(tampered, 'files.json'),
      await treeHashes(tampered, ['files.json']),
    );
    await expect(verifyExport(tampered)).rejects.toThrow('Unexpected');
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('selection validates duplicates, whole-journey bounds and canonical bundle ordering', () => {
  const catalog = [{ id: 'first' }, { id: 'second' }];
  expect(selectJourneys(catalog, ['second', 'first'], null)).toStrictEqual(['first', 'second']);
  for (const selected of [[], ['unknown'], ['first', 'first']])
    expect(() => selectJourneys(catalog, selected, null)).toThrow();
  expect(() => selectJourneys(catalog, ['first', 'second'], 1)).toThrow();
  expect(() => selectJourneys(catalog, ['first'], 4)).toThrow();
});
