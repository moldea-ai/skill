// @vitest-environment node
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import {
  evaluateJourneyCheck,
  prepareAssessmentClosure,
  snapshotTree,
} from '../assessment/index.ts';
import {
  assertHashes,
  copyTree,
  isolatedEnvironment,
  readJson,
  runCommand,
  treeHashes,
  verifyBundle,
} from '../harness/index.ts';
import { setupWorkspace, nextRequest } from '../harness/index.ts';
import { JourneyStepsSchema } from '../index.ts';

import { extractArchive } from './archive.ts';
import { installOfflineCli } from './npm-cache.ts';
import { packJourneys } from './pack.ts';

test('pack preserves Git skill bytes, hides criteria, installs offline, and validates the adopted fixture through the real launcher', async (context) => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-pack-test-'));
  try {
    try {
      await runCommand(
        'npm',
        ['view', '@moldea.ai/cli@11.0.0', 'version', '--fetch-retries=0', '--fetch-timeout=10000'],
        scratch,
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|ECONNRESET/u.test(error.message)
      )
        throw error;
      context.skip(
        'npm registry is unreachable; the always-on harness and assessment fixtures remain covered.',
      );
      return;
    }
    const packed = await packJourneys({
      repositoryRoot: process.cwd(),
      commit: 'HEAD',
      outputDirectory: scratch,
    });
    expect((await lstat(packed.archivePath)).size).toBeLessThan(16 * 1_048_576);
    const root = await extractArchive(packed.archivePath, path.join(scratch, 'extracted'), true);
    const bundle = await verifyBundle(root);
    assertHashes(
      await treeHashes(path.join(root, 'skill/moldea')),
      await treeHashes(path.join(process.cwd(), 'moldea')),
      'Git skill bytes',
    );
    for (const journey of bundle.journeys) {
      const steps = JourneyStepsSchema.parse(
        await readJson(path.join(root, 'journeys', journey.id, 'steps.json')),
      );
      expect(Object.keys(steps[0]!)).toStrictEqual(['id', 'request', 'dependsOn']);
      expect(Object.keys(bundle.files).some((name) => name.endsWith('journey.ts'))).toBe(false);
    }
    const workspace = path.join(scratch, 'workspace');
    const home = path.join(scratch, 'home');
    await setupWorkspace(workspace, {
      runId: packed.runId,
      sha256: packed.sha256,
      platform: 'chatgpt',
      bundleZip: packed.archivePath,
      bundleDirectory: root,
      homeDirectory: home,
    });
    const adopted = path.join(workspace, 'work/adopted-unrelated');
    const environment = await isolatedEnvironment(home, path.join(workspace, '.npm-cache'));
    const launcher = path.join(adopted, '.agents/skills/moldea/scripts/moldea-cli.mjs');
    const validation = await runCommand(
      process.execPath,
      [
        launcher,
        '--repository',
        adopted,
        '--',
        'validate',
        '--json',
        '--max-output-bytes',
        '65536',
      ],
      adopted,
      environment,
    );
    expect(JSON.parse(validation.stdout) as unknown).toMatchObject({
      status: 'valid',
      result: { warningCount: 0 },
    });
    expect(await nextRequest(workspace)).toContain('journey: adopted-unrelated');
    await verifyBundle(root); // setup and subsequent npm operations must preserve the original cache
    const fresh = path.join(scratch, 'fresh-project');
    await mkdir(fresh);
    await (
      await import('node:fs/promises')
    ).writeFile(
      path.join(fresh, 'package.json'),
      '{"name":"fresh","version":"1.0.0","private":true}',
    );
    await installOfflineCli(
      fresh,
      bundle.skill.cliRepairVersion,
      path.join(root, 'npm-cache'),
      path.join(scratch, 'offline-home'),
    );
    await rm(path.join(fresh, 'node_modules'), { recursive: true });
    await runCommand(
      'npm',
      ['ci', '--ignore-scripts', '--offline'],
      fresh,
      await isolatedEnvironment(path.join(scratch, 'offline-home'), path.join(root, 'npm-cache')),
    );
    const closure = await prepareAssessmentClosure({
      directory: path.join(scratch, 'closure'),
      skillDirectory: path.join(root, 'skill/moldea'),
      cache: path.join(root, 'npm-cache'),
      cliVersion: bundle.skill.cliRepairVersion,
    });
    expect(await readFile(path.join(closure, '@moldea.ai/cli/package.json'), 'utf8')).toContain(
      '11.0.0',
    );
    const reconstructed = path.join(scratch, 'reconstructed');
    await copyTree(adopted, reconstructed, ['.git', 'node_modules', '.agents']);
    await copyTree(
      path.join(root, 'skill/moldea'),
      path.join(reconstructed, '.agents/skills/moldea'),
    );
    await runCommand('git', ['init', '--initial-branch=main'], reconstructed, environment);
    await runCommand(
      'git',
      [
        'add',
        '--force',
        '--',
        '.agents/skills/moldea/SKILL.md',
        '.agents/skills/moldea/scripts/relevance-gate.mjs',
        '.agents/skills/moldea/assets/managed-agents-block.md',
      ],
      reconstructed,
      environment,
    );
    await writeFile(path.join(reconstructed, '.npmrc'), 'registry=https://unreachable.invalid/\n');
    const project = JSON.parse(
      await readFile(path.join(reconstructed, 'package.json'), 'utf8'),
    ) as Record<string, unknown>;
    project.scripts = {
      preinstall: 'node -e "require(\\"fs\\").writeFileSync(\\"executed.txt\\", \\"unsafe\\")"',
    };
    project.dependencies = { 'untrusted-export': 'https://unreachable.invalid/package.tgz' };
    await writeFile(path.join(reconstructed, 'package.json'), JSON.stringify(project));
    const checkContext = {
      repository: reconstructed,
      files: await snapshotTree(reconstructed),
      stepChanges: [],
      fixtureChanges: [],
      reply: '',
      cliVersion: bundle.skill.cliRepairVersion,
      closure,
      environment,
    };
    expect(
      (await evaluateJourneyCheck({ kind: 'validate', result: 'valid' }, checkContext)).status,
    ).toBe('passed');
    expect(Object.keys(await treeHashes(reconstructed, ['.git', '.agents']))).not.toContain(
      'executed.txt',
    );
    await expect(lstat(path.join(reconstructed, 'node_modules'))).rejects.toThrow();
    // assessment can use a trusted preinstalled closure without inspecting exported dependencies
    const supplied = path.join(scratch, 'supplied');
    await copyTree(closure, supplied, ['.bin']);
    await prepareAssessmentClosure({
      directory: path.join(scratch, 'closure-copy'),
      skillDirectory: path.join(root, 'skill/moldea'),
      cache: path.join(root, 'npm-cache'),
      cliVersion: bundle.skill.cliRepairVersion,
      installedClosure: supplied,
    });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
