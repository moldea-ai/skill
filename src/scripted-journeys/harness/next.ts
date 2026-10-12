import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeJsonFileAtomically } from '../../filesystem/index.ts';
import { JourneyStepsSchema } from '../index.ts';

import { isolatedEnvironment, readJson, readState, runCommand, verifyBundle } from './shared.ts';

/** Issues exactly one request, preserving pending work and mandatory journey checkpoints. */
export const nextRequest = async (workspace: string): Promise<string> => {
  const state = await readState(workspace);
  const bundle = await verifyBundle(state.bundleDirectory);
  const exportCommand = `node ${JSON.stringify(path.join(state.bundleDirectory, 'harness/export.mjs'))}`;
  if (state.completedJourneys.some((id) => !state.checkpointedJourneys.includes(id)))
    return `CHECKPOINT REQUIRED\n${exportCommand}\n`;
  if (
    state.records.length ===
    bundle.journeys.reduce((count, journey) => count + journey.stepCount, 0)
  )
    return `ALL STEPS COMPLETE\n${exportCommand} --final\n`;
  const journey = bundle.journeys.find(
    (candidate) =>
      state.pending?.journeyId === candidate.id || !state.completedJourneys.includes(candidate.id),
  );
  if (!journey) throw new Error('No pending journey.');
  const steps = JourneyStepsSchema.parse(
    await readJson(path.join(state.bundleDirectory, 'journeys', journey.id, 'steps.json')),
  );
  const step = steps.find(
    (candidate) =>
      state.pending?.stepId === candidate.id ||
      !state.records.some(
        (record) => record.journeyId === journey.id && record.stepId === candidate.id,
      ),
  );
  if (!step) throw new Error('No pending step.');
  const reissued = state.pending !== null;
  const repository = path.join(workspace, 'work', journey.id);
  if (!state.pending) {
    const environment = await isolatedEnvironment(
      state.environment['HOME']!,
      state.environment['npmCache']!,
    );
    state.pending = {
      journeyId: journey.id,
      stepId: step.id,
      issuedAt: new Date().toISOString(),
      previousHead: (
        await runCommand('git', ['rev-parse', 'HEAD'], repository, environment)
      ).stdout.trim(),
    };
    await writeJsonFileAtomically(path.join(workspace, 'state.json'), state);
  }
  const captureDirectory = path.join(workspace, 'capture', journey.id, step.id);
  await mkdir(captureDirectory, { recursive: true });
  return `${reissued ? 'RE-ISSUED\n' : ''}journey: ${journey.id}\nstep: ${step.id}\nrepository: ${repository}\ncapture-directory: ${captureDirectory}\nrequest:\n${step.request}\n`;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('next takes no arguments.');
  process.stdout.write(await nextRequest(process.cwd()));
}
