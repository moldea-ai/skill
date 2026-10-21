import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isMainModule } from 'jg-process';
import { writeJsonFile } from 'jg-fs';

import { JourneyStepsSchema, type IJourneyPlatform } from '../index.ts';

import {
  assertCheckpointIdentity,
  selectJourneys,
  copyTree,
  isolatedEnvironment,
  parseFlags,
  readJson,
  runCommand,
  sha256,
  treeHashes,
  verifyBundle,
  verifyExport,
  type IHarnessState,
} from './shared.ts';

// explicit inputs keep setup testable without modifying the maintainer's HOME
export type ISetupOptions = {
  runId: string;
  sha256: string;
  platform: IJourneyPlatform;
  bundleZip: string;
  bundleDirectory: string;
  resume?: string;
  journeys?: string[];
  confirmationIndex?: number;
  homeDirectory?: string;
};

/** Establishes isolated repositories, or restores completed checkpoints into a fresh workspace. */
export const setupWorkspace = async (workspace: string, options: ISetupOptions): Promise<void> => {
  await mkdir(workspace, { recursive: true });
  if ((await readdir(workspace)).length !== 0)
    throw new Error('Setup requires an empty workspace; run next for a live state.json.');
  if (sha256(await readFile(options.bundleZip)) !== options.sha256)
    throw new Error('Bundle zip SHA-256 mismatch.');
  const bundle = await verifyBundle(options.bundleDirectory);
  if (bundle.runId !== options.runId) throw new Error('Bundle run id mismatch.');
  const confirmationIndex = options.confirmationIndex ?? null;
  const selectedJourneys = selectJourneys(bundle.journeys, options.journeys, confirmationIndex);
  const selectedDefinitions = bundle.journeys.filter((journey) =>
    selectedJourneys.includes(journey.id),
  );
  const home = options.homeDirectory ?? os.homedir();
  const npmCache = path.join(workspace, '.npm-cache');
  await copyTree(path.join(options.bundleDirectory, 'npm-cache'), npmCache, [], true);
  const environment = await isolatedEnvironment(home, npmCache);
  await runCommand(
    'git',
    ['config', '--global', 'user.name', 'Scripted Journeys'],
    workspace,
    environment,
  );
  await runCommand(
    'git',
    ['config', '--global', 'user.email', 'journeys@moldea.invalid'],
    workspace,
    environment,
  );
  await runCommand(
    'git',
    ['config', '--global', 'commit.gpgsign', 'false'],
    workspace,
    environment,
  );
  const state: IHarnessState = {
    bundleDirectory: options.bundleDirectory,
    bundleZip: options.bundleZip,
    bundleSha256: options.sha256,
    platform: options.platform,
    trialId: randomBytes(16).toString('hex'),
    kind: confirmationIndex === null ? 'initial' : 'confirmation',
    selectedJourneys,
    confirmationIndex,
    environment: {
      os: `${os.platform()} ${os.release()}`,
      node: process.version,
      npm: (await runCommand('npm', ['--version'], workspace, environment)).stdout.trim(),
      git: (await runCommand('git', ['--version'], workspace, environment)).stdout.trim(),
      HOME: home,
      npmCache,
    },
    records: [],
    completedJourneys: [],
    checkpointedJourneys: [],
    restartCounts: Object.fromEntries(selectedDefinitions.map((journey) => [journey.id, 0])),
    checkpoint: 0,
    pending: null,
  };
  if (options.resume) {
    const checkpoint = await verifyExport(options.resume);
    const definitions = [];
    for (const journey of selectedDefinitions)
      definitions.push({
        id: journey.id,
        steps: JourneyStepsSchema.parse(
          await readJson(path.join(options.bundleDirectory, 'journeys', journey.id, 'steps.json')),
        ),
      });
    assertCheckpointIdentity(bundle, checkpoint, definitions);
    if (
      JSON.stringify(checkpoint.selectedJourneys) !== JSON.stringify(selectedJourneys) ||
      checkpoint.confirmationIndex !== confirmationIndex
    )
      throw new Error('Resume selection mismatch.');
    state.trialId = checkpoint.trialId;
    if (checkpoint.platform !== options.platform) throw new Error('Resume platform mismatch.');
    state.records = checkpoint.steps.filter((record) =>
      checkpoint.completedJourneys.includes(record.journeyId),
    );
    state.completedJourneys = checkpoint.completedJourneys;
    state.checkpointedJourneys = checkpoint.completedJourneys;
    state.restartCounts = checkpoint.restartCounts;
    state.checkpoint = checkpoint.checkpoint;
    await copyTree(path.join(options.resume, 'steps'), path.join(workspace, 'steps'));
    for (const id of checkpoint.completedJourneys) {
      if (!bundle.journeys.some((journey) => journey.id === id))
        throw new Error(`Unknown completed journey: ${id}`);
      await copyTree(
        path.join(options.resume, 'journeys', id, 'final'),
        path.join(workspace, 'work', id),
      );
    }
    const restarted = selectedDefinitions.find(
      (journey) => !state.completedJourneys.includes(journey.id),
    );
    if (restarted) state.restartCounts[restarted.id] = (state.restartCounts[restarted.id] ?? 0) + 1;
  }
  for (const journey of selectedDefinitions) {
    JourneyStepsSchema.parse(
      await readJson(path.join(options.bundleDirectory, 'journeys', journey.id, 'steps.json')),
    );
    if (state.completedJourneys.includes(journey.id)) continue;
    const repository = path.join(workspace, 'work', journey.id);
    await copyTree(
      path.join(options.bundleDirectory, 'journeys', journey.id, 'fixture'),
      repository,
    );
    await copyTree(
      path.join(options.bundleDirectory, 'skill/moldea'),
      path.join(repository, '.agents/skills/moldea'),
    );
    if (journey.fixture.installCli)
      await runCommand('npm', ['ci', '--ignore-scripts', '--offline'], repository, environment);
    await runCommand('git', ['init', '--initial-branch=main'], repository, environment);
    const files = Object.keys(await treeHashes(repository, ['.git', '.agents', 'node_modules']));
    if (files.length) await runCommand('git', ['add', '--', ...files], repository, environment);
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
      repository,
      environment,
    );
    await runCommand(
      'git',
      [
        '-c',
        'core.hooksPath=' + path.join(home, 'empty-hooks'),
        'commit',
        '--allow-empty',
        '-m',
        'fixture',
      ],
      repository,
      environment,
    );
  }
  await writeJsonFile(path.join(workspace, 'state.json'), state);
};

if (isMainModule(import.meta.url)) {
  const args = process.argv.slice(2);
  const journeys: string[] = [];
  const remaining: string[] = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--journey') {
      const id = args[++index];
      if (!id || id.startsWith('--')) throw new Error('Missing --journey value.');
      journeys.push(id);
    } else remaining.push(args[index]!);
  }
  const flags = parseFlags(remaining, [
    '--run',
    '--sha256',
    '--platform',
    '--bundle-zip',
    '--bundle-dir',
    '--resume',
    '--confirmation',
  ]);
  if (flags['--confirmation'] && !/^[123]$/u.test(flags['--confirmation']))
    throw new Error('Invalid confirmation index.');
  const platform = flags['--platform'];
  if (platform !== 'chatgpt' && platform !== 'claude')
    throw new Error('Platform must be chatgpt or claude.');
  for (const required of ['--run', '--sha256', '--bundle-zip', '--bundle-dir'])
    if (!flags[required]) throw new Error(`Missing ${required}`);
  await setupWorkspace(process.cwd(), {
    runId: flags['--run']!,
    sha256: flags['--sha256']!,
    platform,
    ...(journeys.length ? { journeys } : {}),
    ...(flags['--confirmation'] ? { confirmationIndex: Number(flags['--confirmation']) } : {}),
    bundleZip: path.resolve(flags['--bundle-zip']!),
    bundleDirectory: path.resolve(flags['--bundle-dir']!),
    ...(flags['--resume'] ? { resume: path.resolve(flags['--resume']) } : {}),
  });
  process.stdout.write('Workspace ready. Run next.mjs from this directory.\n');
}
