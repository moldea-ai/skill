// @vitest-environment node
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { writeJsonFile } from 'jg-fs';

import { getCompletedEvidenceRunPath, readCompletedEvidenceRun } from '../../evidence/index.ts';

import { createArchive } from '../bundle/index.ts';
import {
  copyTree,
  runCommand,
  sha256,
  exportWorkspace,
  nextRequest,
  readJson,
  recordStep,
  setupWorkspace,
  treeHashes,
} from '../harness/index.ts';
import { loadScriptedJourneys } from '../journeys/index.ts';
import { TEST_JOURNEYS, createHarnessFixture, recordFixturePlatform } from '../testing/index.ts';
import { JourneysExportSchema } from '../index.ts';

import { assessJourneys } from './assess.ts';

test('a missing initialization lockfile fails its criterion without suppressing blocked validation', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-lockfile-'));
  try {
    const definition = (
      await loadScriptedJourneys(path.join(process.cwd(), 'src/scripted-journeys/journeys'))
    ).find((journey) => journey.id === 'new-project')!;
    const fixture = await createHarnessFixture(scratch, process.cwd(), [definition]);
    const workspace = path.join(scratch, 'workspace');
    await setupWorkspace(workspace, {
      runId: '20261012-abcdef',
      sha256: fixture.hash,
      platform: 'chatgpt',
      bundleZip: fixture.bundleZip,
      bundleDirectory: fixture.bundleDirectory,
      homeDirectory: path.join(scratch, 'home'),
    });
    const repository = path.join(workspace, 'work/new-project');
    for (const step of definition.steps) {
      await nextRequest(workspace);
      if (step.id === 'initialize') {
        await mkdir(path.join(repository, 'moldea'));
        await writeFile(path.join(repository, 'moldea/moldea.yaml'), 'formatVersion: 1\n');
        await writeFile(path.join(repository, 'moldea/project.md'), '# Parcel desk\n');
        await writeFile(path.join(repository, 'README.md'), '<!-- moldea:start -->\n');
        await writeFile(path.join(repository, 'AGENTS.md'), '<!-- moldea:start -->\n');
        await writeJsonFile(path.join(repository, 'package.json'), {
          devDependencies: { '@moldea.ai/cli': '11.0.0' },
        });
      }
      const capture = path.join(workspace, 'capture/new-project', step.id);
      await writeFile(path.join(capture, 'reply.md'), 'Check the pickup code.');
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
    const exported = await exportWorkspace(workspace, true);
    const archive = path.join(scratch, 'export.zip');
    await createArchive(exported, archive);
    const closure = path.join(scratch, 'closure');
    await mkdir(closure);
    const assessment = await assessJourneys({
      repositoryRoot: process.cwd(),
      bundlePath: fixture.bundleZip,
      sha256: fixture.hash,
      exportPaths: [archive],
      installedClosure: closure,
      definitions: [definition],
      persist: false,
    });
    const journey = assessment.platforms[0]!.trials[0]!.journeys[0]!;
    const initialization = journey.steps.find((step) => step.id === 'initialize')!;
    expect(initialization.checks.map((check) => check.status)).toStrictEqual([
      'passed',
      'passed',
      'passed',
      'passed',
      'passed',
      'failed',
      'blocked',
    ]);
    expect(initialization.status).toBe('failed');
    expect(journey.status).toBe('failed');
    expect(
      journey.steps.slice(2).map((step) => ({ status: step.status, checks: step.checks })),
    ).toStrictEqual([
      { status: 'blocked', checks: [] },
      { status: 'blocked', checks: [] },
      { status: 'blocked', checks: [] },
    ]);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('assessment reconstructs real harness exports, carries provenance, and rejects tampering and unsafe intermediate patches', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-assessment-'));
  try {
    const fixture = await createHarnessFixture(scratch, process.cwd());
    const chatgpt = await recordFixturePlatform(scratch, fixture, 'chatgpt');
    const claude = await recordFixturePlatform(scratch, fixture, 'claude', true);
    const closure = path.join(scratch, 'installed-closure');
    await mkdir(closure);
    const chatgptZip = path.join(scratch, 'chatgpt.zip');
    const claudeZip = path.join(scratch, 'claude.zip');
    await createArchive(chatgpt, chatgptZip);
    await createArchive(claude, claudeZip);
    const input = {
      repositoryRoot: process.cwd(),
      bundlePath: fixture.bundleZip,
      sha256: fixture.hash,
      exportPaths: [chatgptZip],
      installedClosure: closure,
      definitions: fixture.definitions,
      persist: false,
    };
    const diagnostic = await assessJourneys({
      ...input,
      operatorRecord: {
        chatgpt: {
          model: 'Observed model',
          settings: { memory: 'default' },
          interventions: ['continue'],
        },
      },
    });
    expect(diagnostic.platforms[0]?.trials[0]?.diagnosticConfiguration).toStrictEqual({
      model: 'Observed model',
      settings: { memory: 'default' },
      interventions: ['continue'],
    });
    expect(diagnostic.status).toBe('incomplete');
    expect(diagnostic.platforms[0]?.trials[0]?.journeys[0]?.steps[0]?.unverified).toStrictEqual([
      'The policy was read before writing.',
    ]);
    expect(diagnostic.platforms[0]?.trials[0]?.journeys[0]?.steps[0]?.facts?.cliPresent).toBe(
      false,
    );
    const complete = await assessJourneys({ ...input, exportPaths: [chatgptZip, claudeZip] });
    expect(complete.status).toBe('incomplete');
    expect(complete.platforms[1]?.trials[0]?.journeys[0]?.steps[1]?.status).toBe('failed');
    await expect(assessJourneys({ ...input, sha256: '0'.repeat(64) })).rejects.toThrow(/SHA-256/u);
    await expect(
      assessJourneys({ ...input, exportPaths: [chatgptZip, chatgptZip] }),
    ).rejects.toThrow(/Duplicate export archive/u);
    const changedDefinitions = structuredClone(fixture.definitions);
    changedDefinitions[0]!.steps[0]!.checks = [{ kind: 'path-exists', path: 'invented.md' }];
    await expect(assessJourneys({ ...input, definitions: changedDefinitions })).rejects.toThrow(
      /definition digest/u,
    );
    for (const mutation of [
      'empty-reply',
      'wrong-policy',
      'mode-change',
      'hash-list',
      'harness',
      'transient-symlink',
    ] as const) {
      const directory = path.join(scratch, mutation, 'checkpoint');
      await copyTree(chatgpt, directory);
      const manifestPath = path.join(directory, 'manifest.json');
      if (mutation === 'empty-reply' || mutation === 'wrong-policy')
        await writeFile(
          path.join(directory, 'steps/first/read/reply.md'),
          mutation === 'empty-reply' ? '' : 'Retention is 60 days.',
        );
      if (mutation === 'mode-change') {
        await writeFile(
          path.join(directory, 'steps/first/read/changes.patch'),
          'diff --git a/policy.md b/policy.md\nold mode 100644\nnew mode 100755\n',
        );
        await chmod(path.join(directory, 'journeys/first/final/policy.md'), 0o755);
      }
      if (mutation === 'harness') {
        const manifest = JourneysExportSchema.parse(await readJson(manifestPath));
        manifest.harnessHashes['harness/next.mjs'] = '0'.repeat(64);
        await writeJsonFile(manifestPath, manifest);
      }
      if (mutation === 'transient-symlink')
        await writeFile(
          path.join(directory, 'steps/first/change/changes.patch'),
          'diff --git a/link b/link\nnew file mode 120000\n--- /dev/null\n+++ b/link\n@@ -0,0 +1 @@\n+outside\n',
        );
      if (mutation !== 'hash-list')
        await writeJsonFile(
          path.join(directory, 'files.json'),
          await treeHashes(directory, ['files.json']),
        );
      else
        await writeFile(
          path.join(directory, 'steps/first/read/reply.md'),
          'changed without updating hashes',
        );
      const archive = path.join(scratch, `${mutation}.zip`);
      await createArchive(directory, archive);
      const operation = assessJourneys({ ...input, exportPaths: [archive] });
      if (mutation === 'empty-reply' || mutation === 'wrong-policy' || mutation === 'mode-change')
        expect((await operation).platforms[0]?.trials[0]?.journeys[0]?.steps[1]?.status).toBe(
          'failed',
        );
      else await expect(operation).rejects.toThrow(/hash mismatch|patch mode/u);
    }
    const secondPassing = path.join(scratch, 'second-passing', path.basename(chatgpt));
    await copyTree(chatgpt, secondPassing);
    const passingManifest = JourneysExportSchema.parse(
      await readJson(path.join(secondPassing, 'manifest.json')),
    );
    passingManifest.platform = 'claude';
    passingManifest.trialId = 'd'.repeat(32);
    await writeJsonFile(path.join(secondPassing, 'manifest.json'), passingManifest);
    await writeJsonFile(
      path.join(secondPassing, 'files.json'),
      await treeHashes(secondPassing, ['files.json']),
    );
    const secondPassingZip = path.join(scratch, 'second-passing.zip');
    await createArchive(secondPassing, secondPassingZip);
    expect(
      (await assessJourneys({ ...input, exportPaths: [chatgptZip, secondPassingZip] })).status,
    ).toBe('incomplete');
    expect(
      (await readFile(path.join(chatgpt, 'steps/first/change/changes.patch'), 'utf8')).length,
    ).toBeGreaterThan(0);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test('assessment blocks failed prerequisites and rejects a contradictory validation reply', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-blocked-'));
  try {
    const definitions = [
      {
        id: 'first',
        title: 'Blocked validation',
        summary: 'Negative controls',
        order: 0,
        fixture: { adopted: false, installCli: false },
        steps: [
          {
            id: 'change',
            request: 'Validate the project.',
            dependsOn: [],
            checks: [{ kind: 'validate' as const, result: 'valid' as const }],
            unverified: [],
          },
          {
            id: 'read',
            request: 'Continue after validation.',
            dependsOn: ['change'],
            checks: [{ kind: 'no-changes' as const }],
            unverified: [],
          },
          {
            id: 'report',
            request: 'Report the validation result.',
            dependsOn: [],
            checks: [
              {
                kind: 'reply-matches' as const,
                pattern: '\\bvalid\\b',
                absent: '\\binvalid\\b',
                skillBehavior: false,
              },
            ],
            unverified: [],
          },
        ],
      },
    ];
    const fixture = await createHarnessFixture(scratch, process.cwd(), definitions);
    const exported = await recordFixturePlatform(scratch, fixture, 'chatgpt');
    await writeFile(
      path.join(exported, 'steps/first/report/reply.md'),
      'The result is valid and invalid.',
    );
    await writeJsonFile(
      path.join(exported, 'files.json'),
      await treeHashes(exported, ['files.json']),
    );
    const archive = path.join(scratch, 'export.zip');
    await createArchive(exported, archive);
    const closure = path.join(scratch, 'closure');
    await mkdir(closure);
    const assessment = await assessJourneys({
      repositoryRoot: process.cwd(),
      bundlePath: fixture.bundleZip,
      sha256: fixture.hash,
      exportPaths: [archive],
      installedClosure: closure,
      definitions: fixture.definitions,
      persist: false,
    });
    expect(
      assessment.platforms[0]?.trials[0]?.journeys[0]?.steps.map((step) => step.status),
    ).toStrictEqual(['blocked', 'blocked', 'failed']);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test.each([
  ['recovered', false, false],
  ['confirmed-failure', true, false],
  ['blocked', false, true],
] as const)(
  'selective admission resolves %s independently and preserves rejected batches',
  async (expected, failedConfirmation, blockedConfirmation) => {
    const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-admission-'));
    try {
      const repositoryRoot = path.join(scratch, 'repository');
      for (const name of ['src/scripted-journeys', 'src/execution/confirmation'])
        await copyTree(path.join(process.cwd(), name), path.join(repositoryRoot, name), [
          '_archive',
          '_archives',
          '_backup',
          '_backups',
        ]);
      await runCommand('git', ['init', '--initial-branch=main'], repositoryRoot);
      await runCommand(
        'git',
        [
          '-c',
          'user.name=Fixture',
          '-c',
          'user.email=fixture@example.invalid',
          '-c',
          'commit.gpgsign=false',
          'commit',
          '--allow-empty',
          '-m',
          'fixture',
        ],
        repositoryRoot,
      );
      const definitions = structuredClone(TEST_JOURNEYS);
      if (blockedConfirmation)
        definitions[0]!.steps[1]!.checks.push({ kind: 'validate', result: 'valid' });
      const fixture = await createHarnessFixture(scratch, process.cwd(), definitions);
      const closure = path.join(scratch, 'closure');
      await mkdir(closure);
      const input = {
        repositoryRoot,
        bundlePath: fixture.bundleZip,
        sha256: fixture.hash,
        installedClosure: closure,
        definitions: fixture.definitions,
      };
      const archive = async (
        name: string,
        failed: boolean,
        journeys: string[],
        confirmationIndex?: number,
      ) => {
        const exported = await recordFixturePlatform(scratch, fixture, 'chatgpt', failed, {
          journeys,
          name,
          ...(confirmationIndex ? { confirmationIndex } : {}),
        });
        const archivePath = path.join(scratch, `${name}.zip`);
        await createArchive(exported, archivePath);
        return { archivePath, digest: sha256(await readFile(archivePath)) };
      };
      const baseline = await archive('baseline', true, ['first']);
      const recordPath = getCompletedEvidenceRunPath(repositoryRoot, 'journeys', '20261012-abcdef');
      await expect(
        assessJourneys({ ...input, exportPaths: [baseline.archivePath] }),
      ).rejects.toThrow(baseline.digest);
      await expect(readFile(recordPath)).rejects.toThrow();
      const diagnostic = await assessJourneys({
        ...input,
        exportPaths: [baseline.archivePath],
        persist: false,
      });
      expect(diagnostic.mode).toBe('diagnostic');
      expect(diagnostic).not.toHaveProperty('platforms.0.resolutions');
      await expect(readFile(recordPath)).rejects.toThrow();
      const observation = {
        configuration: { model: null, settings: { mode: 'Chat' }, interventions: [] },
        observedAt: null,
        freshChat: true as const,
      };
      const trials = { [baseline.digest]: observation };
      const first = await assessJourneys({
        ...input,
        exportPaths: [baseline.archivePath],
        operatorRecord: { trials },
      });
      expect(first.mode).toBe('campaign');
      if (first.mode !== 'campaign') throw new Error('Expected campaign.');
      expect(first.platforms[0]!.resolutions.map((entry) => entry.status)).toStrictEqual([
        'awaiting-confirmation',
      ]);
      const original = await readFile(recordPath);
      const extra = await archive('extra', false, ['second']);
      const firstConfirmation = await archive('confirmation-1', failedConfirmation, ['first'], 1);
      const secondConfirmation = blockedConfirmation
        ? null
        : await archive('confirmation-2', failedConfirmation, ['first'], 2);
      Object.assign(trials, {
        [extra.digest]: observation,
        [firstConfirmation.digest]: observation,
        ...(secondConfirmation ? { [secondConfirmation.digest]: observation } : {}),
      });
      const exportPaths = [
        baseline.archivePath,
        extra.archivePath,
        firstConfirmation.archivePath,
        ...(secondConfirmation ? [secondConfirmation.archivePath] : []),
      ];
      const complete = await assessJourneys({ ...input, exportPaths, operatorRecord: { trials } });
      expect(complete.status).toBe(
        expected === 'recovered'
          ? 'passed'
          : expected === 'confirmed-failure'
            ? 'failed'
            : 'incomplete',
      );
      if (complete.mode !== 'campaign') throw new Error('Expected campaign.');
      expect(complete.platforms).toHaveLength(1);
      expect(complete.platforms[0]!.resolutions.map((entry) => entry.status)).toStrictEqual([
        expected,
        'passed-initially',
      ]);
      expect(complete.platforms[0]!.trials[0]).toStrictEqual(first.platforms[0]!.trials[0]);
      const stored = await readCompletedEvidenceRun(repositoryRoot, 'journeys', complete.runId);
      expect(stored.run.status).toBe(expected === 'confirmed-failure' ? 'failed' : 'incomplete');
      expect(await readFile(recordPath)).not.toStrictEqual(original);
      const frozen = await readFile(recordPath);
      for (const rejected of [
        { exportPaths: exportPaths.slice(1), operatorRecord: { trials } },
        {
          exportPaths,
          operatorRecord: {
            trials: {
              ...trials,
              [baseline.digest]: { ...observation, observedAt: '2026-01-01T00:00:00.000Z' },
            },
          },
        },
        { exportPaths: [...exportPaths, baseline.archivePath], operatorRecord: { trials } },
        {
          exportPaths,
          operatorRecord: {
            trials: {
              ...trials,
              [firstConfirmation.digest]: {
                ...observation,
                configuration: { ...observation.configuration, model: 'Changed' },
              },
            },
          },
        },
      ]) {
        await expect(assessJourneys({ ...input, ...rejected })).rejects.toThrow();
        expect(await readFile(recordPath)).toStrictEqual(frozen);
      }
      await expect(
        assessJourneys({ ...input, exportPaths: [firstConfirmation.archivePath], persist: false }),
      ).rejects.toThrow('initial exports only');
      const overlap = await archive('overlap', false, ['first']);
      await expect(
        assessJourneys({
          ...input,
          exportPaths: [...exportPaths, overlap.archivePath],
          operatorRecord: { trials: { ...trials, [overlap.digest]: observation } },
        }),
      ).rejects.toThrow('Overlapping');
      expect(await readFile(recordPath)).toStrictEqual(frozen);
      if (expected === 'recovered') {
        const inconsistent = await readCompletedEvidenceRun(
          repositoryRoot,
          'journeys',
          complete.runId,
        );
        const payload = inconsistent.payload as {
          websiteModel: { sources: { captures: Record<string, { patch: string }> }[] };
        };
        Object.values(payload.websiteModel.sources[0]!.captures)[0]!.patch =
          'forged local presentation';
        await writeJsonFile(recordPath, inconsistent);
        const inconsistentBytes = await readFile(recordPath);
        await expect(
          assessJourneys({ ...input, exportPaths, operatorRecord: { trials } }),
        ).rejects.toThrow('raw source association mismatch');
        expect(await readFile(recordPath)).toStrictEqual(inconsistentBytes);
      }
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  },
);
