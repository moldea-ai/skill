// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { writeJsonFile } from 'jg-fs';

import { createHarnessFixture } from '../testing/index.ts';

import { exportWorkspace } from './export.ts';
import { nextRequest } from './next.ts';
import { recordStep } from './record.ts';
import { setupWorkspace } from './setup.ts';
import { copyTree, readState, treeHashes, verifyExport } from './shared.ts';

test('harness preserves pending edits, checkpoints every journey, and recovers a reset without overwriting live state', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-harness-'));
  try {
    const fixture = await createHarnessFixture(scratch, process.cwd());
    const workspace = path.join(scratch, 'workspace');
    const options = {
      runId: '20261012-abcdef',
      sha256: fixture.hash,
      platform: 'chatgpt' as const,
      bundleZip: fixture.bundleZip,
      bundleDirectory: fixture.bundleDirectory,
      homeDirectory: path.join(scratch, 'home'),
    };
    await setupWorkspace(workspace, options);
    const issued = await nextRequest(workspace);
    await writeFile(path.join(workspace, 'work/first/policy.md'), 'Retention: 30 days.\n');
    expect(await nextRequest(workspace)).toBe(`RE-ISSUED\n${issued}`);
    await expect(exportWorkspace(workspace)).rejects.toThrow(/unrecorded/u);
    expect(await readFile(path.join(workspace, 'work/first/policy.md'), 'utf8')).toContain('30');
    for (const step of ['change', 'read']) {
      if (step === 'read') await nextRequest(workspace);
      const capture = path.join(workspace, 'capture/first', step);
      await writeFile(path.join(capture, 'reply.md'), 'Retention is 30 days.');
      await writeJsonFile(path.join(capture, 'activity.json'), {
        commands: [],
        reads: [],
        writes: [],
        notes: [],
      });
      await recordStep(
        workspace,
        path.join(capture, 'reply.md'),
        path.join(capture, 'activity.json'),
      );
    }
    expect(await nextRequest(workspace)).toContain('CHECKPOINT REQUIRED');
    const checkpoint = await exportWorkspace(workspace);
    const manifest = await verifyExport(checkpoint);
    expect(manifest.completedJourneys).toStrictEqual(['first']);
    const unordered = path.join(scratch, 'unordered');
    await copyTree(checkpoint, unordered);
    const unorderedManifest = structuredClone(manifest);
    unorderedManifest.steps.reverse();
    await writeJsonFile(path.join(unordered, 'manifest.json'), unorderedManifest);
    await writeJsonFile(
      path.join(unordered, 'files.json'),
      await treeHashes(unordered, ['files.json']),
    );
    await expect(
      setupWorkspace(path.join(scratch, 'rejected-resume'), { ...options, resume: unordered }),
    ).rejects.toThrow(/ordered prefix/u);
    await nextRequest(workspace);
    const restored = path.join(scratch, 'restored');
    await setupWorkspace(restored, { ...options, resume: checkpoint });
    expect((await readState(restored)).restartCounts).toStrictEqual({ first: 0, second: 1 });
    expect(await nextRequest(restored)).toContain('journey: second');
    await expect(setupWorkspace(restored, { ...options, resume: checkpoint })).rejects.toThrow(
      /empty workspace/u,
    );
    await expect(
      setupWorkspace(path.join(scratch, 'wrong-hash'), { ...options, sha256: '0'.repeat(64) }),
    ).rejects.toThrow(/SHA-256/u);
    await mkdir(path.join(scratch, 'unused'), { recursive: true });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
