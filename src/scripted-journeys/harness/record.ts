import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeJsonFileAtomically } from '../../filesystem/index.ts';
import { MAXIMUM_REPLY_BYTES } from '../index.ts';
import { JourneyActivitySchema, JourneyStepsSchema } from '../index.ts';

import {
  isolatedEnvironment,
  parseFlags,
  readJson,
  readState,
  runCommand,
  treeHashes,
} from './shared.ts';

/** Captures one issued step's patch and agent-reported deliverables before advancing. */
export const recordStep = async (
  workspace: string,
  replyPath: string,
  activityPath: string,
): Promise<string> => {
  const state = await readState(workspace);
  const pending = state.pending;
  if (!pending) throw new Error('No issued step to record.');
  const reply = await readFile(replyPath);
  if (!reply.length || reply.length > MAXIMUM_REPLY_BYTES || !reply.toString('utf8').trim())
    throw new Error('Reply must be nonempty and at most 65536 bytes.');
  const activity = JourneyActivitySchema.parse(await readJson(activityPath));
  const repository = path.join(workspace, 'work', pending.journeyId);
  const hashes = await treeHashes(repository, ['.git', '.agents', 'node_modules']);
  const environment = await isolatedEnvironment(
    state.environment['HOME']!,
    state.environment['npmCache']!,
  );
  const tracked = (await runCommand('git', ['ls-files', '-z'], repository, environment)).stdout
    .split('\0')
    .filter(Boolean);
  const files = [...new Set([...tracked, ...Object.keys(hashes)])];
  if (files.length)
    await runCommand('git', ['add', '--force', '--', ...files], repository, environment);
  await runCommand(
    'git',
    [
      '-c',
      'core.hooksPath=' + path.join(state.environment['HOME']!, 'empty-hooks'),
      'commit',
      '--allow-empty',
      '-m',
      `step ${pending.stepId}`,
    ],
    repository,
    environment,
  );
  const patch = (
    await runCommand(
      'git',
      ['diff', '--binary', '--no-ext-diff', '--no-textconv', `${pending.previousHead}..HEAD`],
      repository,
      environment,
    )
  ).stdout;
  const changes = (
    await runCommand(
      'git',
      ['diff', '--name-status', '--no-renames', `${pending.previousHead}..HEAD`],
      repository,
      environment,
    )
  ).stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, name] = line.split('\t');
      return {
        kind: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
        path: name,
      };
    });
  const directory = path.join(workspace, 'steps', pending.journeyId, pending.stepId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'changes.patch'), patch);
  await writeFile(path.join(directory, 'reply.md'), reply);
  await writeJsonFileAtomically(path.join(directory, 'activity.json'), activity);
  await writeJsonFileAtomically(path.join(directory, 'changes.json'), changes);
  let cliPresent = false;
  try {
    await access(path.join(repository, 'node_modules/@moldea.ai/cli/package.json'));
    cliPresent = true;
  } catch {
    /* presence is a sandbox-captured fact, not proof of execution */
  }
  state.records.push({
    journeyId: pending.journeyId,
    stepId: pending.stepId,
    facts: { issuedAt: pending.issuedAt, recordedAt: new Date().toISOString(), cliPresent },
  });
  state.pending = null;
  const steps = JourneyStepsSchema.parse(
    await readJson(path.join(state.bundleDirectory, 'journeys', pending.journeyId, 'steps.json')),
  );
  const complete = steps.every((step) =>
    state.records.some(
      (record) => record.journeyId === pending.journeyId && record.stepId === step.id,
    ),
  );
  if (complete) state.completedJourneys.push(pending.journeyId);
  await writeJsonFileAtomically(path.join(workspace, 'state.json'), state);
  return complete
    ? `CHECKPOINT REQUIRED\nnode ${JSON.stringify(path.join(state.bundleDirectory, 'harness/export.mjs'))}\n`
    : 'Step recorded. Run next.mjs.\n';
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flags = parseFlags(process.argv.slice(2), ['--reply', '--activity']);
  if (!flags['--reply'] || !flags['--activity'])
    throw new Error('record requires --reply and --activity.');
  process.stdout.write(
    await recordStep(
      process.cwd(),
      path.resolve(flags['--reply']),
      path.resolve(flags['--activity']),
    ),
  );
}
