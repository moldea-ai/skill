import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveContainedPath } from '../filesystem/index.ts';
import {
  EVIDENCE_SELECTION_RELATIVE_PATH,
  decodeEvidenceBundle,
  packCompletedEvidenceRun,
  packLatestCompletedEvidenceRun,
  prepareSelectedEvidence,
  verifyPreparedReleaseEvidence,
} from '../evidence/index.ts';
import {
  EVIDENCE_RELEASE_REPOSITORY,
  publishEvidenceBundle,
  pinEvidenceReleaseAsset,
} from '../release/index.ts';
import { parseEvidenceCommand } from './parser.ts';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const runEvidenceCommand = async (): Promise<void> => {
  const commandName = process.argv[2];
  if (commandName === undefined) throw new Error('An evidence command is required.');
  const command = parseEvidenceCommand(commandName, process.argv.slice(3));
  const selectionPath = path.join(REPOSITORY_ROOT, EVIDENCE_SELECTION_RELATIVE_PATH);

  if (command.kind === 'pack') {
    const outputDirectory = path.join(REPOSITORY_ROOT, '.evidence', 'bundles');
    const result =
      command.runId === undefined
        ? await packLatestCompletedEvidenceRun(
            REPOSITORY_ROOT,
            command.evidenceKind,
            outputDirectory,
          )
        : await packCompletedEvidenceRun(
            REPOSITORY_ROOT,
            command.evidenceKind,
            command.runId,
            path.join(outputDirectory, `${command.evidenceKind}-${command.runId}.json.gz`),
          );
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (command.kind === 'publish') {
    const bundle = decodeEvidenceBundle(
      await readFile(resolveContainedPath(REPOSITORY_ROOT, command.bundlePath)),
    );
    const result = await publishEvidenceBundle({
      bundle,
      repository: EVIDENCE_RELEASE_REPOSITORY,
      tag: command.tag,
      temporaryDirectory: path.join(REPOSITORY_ROOT, '.evidence', 'publication'),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (command.kind === 'pin') {
    const result = await pinEvidenceReleaseAsset({
      assetName: command.assetName,
      kind: command.evidenceKind,
      release: command.release,
      selectionPath,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (command.kind === 'prepare') {
    const result = await prepareSelectedEvidence({
      cacheDirectory: path.join(REPOSITORY_ROOT, '.evidence', 'cache'),
      preparedDirectory: path.join(REPOSITORY_ROOT, '.evidence', 'prepared'),
      selectionPath,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  const manifest = await verifyPreparedReleaseEvidence({
    preparedDirectory: path.join(REPOSITORY_ROOT, '.evidence', 'prepared'),
    selectionPath,
  });
  process.stdout.write(`${JSON.stringify(manifest)}\n`);
};

try {
  await runEvidenceCommand();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown evidence command failure.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
