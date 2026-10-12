import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeJsonFileAtomically } from '../../filesystem/index.ts';
import { JourneysExportSchema } from '../index.ts';

import { copyTree, parseFlags, readState, treeHashes, verifyBundle } from './shared.ts';

/** Writes a bounded checkpoint directory for the model to zip and attach with its own tools. */
export const exportWorkspace = async (workspace: string, final = false): Promise<string> => {
  const state = await readState(workspace);
  if (state.pending) throw new Error('Cannot export an issued, unrecorded step.');
  const bundle = await verifyBundle(state.bundleDirectory);
  if (state.records.some((record) => !state.completedJourneys.includes(record.journeyId)))
    throw new Error('Export requires a completed journey boundary.');
  const complete = state.completedJourneys.length === bundle.journeys.length;
  if (final && !complete) throw new Error('Final export requires all journeys.');
  const checkpoint = state.checkpoint + 1;
  const name = `journeys-${state.platform}-${bundle.runId}-${checkpoint}`;
  const directory = path.join(workspace, 'exports', name);
  await mkdir(path.dirname(directory), { recursive: true });
  await mkdir(directory, { recursive: false });
  await copyTree(path.join(workspace, 'steps'), path.join(directory, 'steps'));
  for (const id of state.completedJourneys)
    await copyTree(
      path.join(workspace, 'work', id),
      path.join(directory, 'journeys', id, 'final'),
      ['.git', '.agents', 'node_modules'],
    );
  const hashes = await treeHashes(path.join(state.bundleDirectory, 'harness'));
  const manifest = JourneysExportSchema.parse({
    exportFormatVersion: 1,
    runId: bundle.runId,
    platform: state.platform,
    skillTreeSha256: bundle.skill.treeSha256,
    instructionsSha256: bundle.instructions.sha256,
    harnessHashes: Object.fromEntries(
      Object.entries(hashes).map(([name, hash]) => [`harness/${name}`, hash]),
    ),
    environment: state.environment,
    steps: state.records,
    restartCounts: state.restartCounts,
    completedJourneys: state.completedJourneys,
    complete,
    checkpoint,
  });
  await writeJsonFileAtomically(path.join(directory, 'manifest.json'), manifest);
  await writeJsonFileAtomically(path.join(directory, 'files.json'), await treeHashes(directory));
  state.checkpoint = checkpoint;
  state.checkpointedJourneys = [...state.completedJourneys];
  await writeJsonFileAtomically(path.join(workspace, 'state.json'), state);
  return directory;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flags = parseFlags(process.argv.slice(2), ['--final'], ['--final']);
  await mkdir(path.join(process.cwd(), 'exports'), { recursive: true });
  const directory = await exportWorkspace(process.cwd(), flags['--final'] === 'true');
  process.stdout.write(
    `directory: ${directory}\nzip-name: ${path.basename(directory)}.zip\nZip this directory, attach the zip, report its SHA-256, then continue.\n`,
  );
}
