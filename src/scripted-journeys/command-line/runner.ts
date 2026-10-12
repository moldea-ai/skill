import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { assessJourneys } from '../assessment/index.ts';
import { extractArchive, packJourneys, publishJourneyBundle } from '../bundle/index.ts';
import { getCompletedEvidenceRunPath } from '../../evidence/index.ts';
import { sha256, verifyBundle, readJson } from '../harness/index.ts';
import { JourneyOperatorRecordSchema } from '../index.ts';
import { renderStartMessage } from '../instructions/index.ts';

import { parseJourneysCommand } from './parser.ts';

if (!['linux', 'darwin'].includes(process.platform))
  throw new Error(
    'Scripted journeys packing and assessment require Linux or macOS with zip and unzip.',
  );

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
const input = parseJourneysCommand(process.argv.slice(2));
if (input.command === 'pack') {
  const result = await packJourneys({
    repositoryRoot,
    commit: input.commit,
    outputDirectory: path.join(repositoryRoot, '.evidence/journeys'),
  });
  process.stdout.write(
    `Bundle: ${result.archivePath}\nSHA-256: ${result.sha256}\n\n${result.startMessages.chatgpt}\n${result.startMessages.claude}`,
  );
} else if (input.command === 'publish-bundle') {
  if (sha256(await readFile(input.bundle)) !== input.sha256)
    throw new Error('Bundle zip SHA-256 mismatch.');
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-publish-'));
  try {
    const directory = await extractArchive(path.resolve(input.bundle), scratch, true);
    const bundle = await verifyBundle(directory);
    if (bundle.runId !== input.runId) throw new Error('Publication run id mismatch.');
    const url = await publishJourneyBundle({
      runId: input.runId,
      archivePath: path.resolve(input.bundle),
    });
    process.stdout.write(
      `${url}\n\n${await renderStartMessage({ runId: input.runId, sha256: input.sha256, url, platform: 'claude' })}`,
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
} else {
  const operatorRecord = JourneyOperatorRecordSchema.parse(
    input.operatorRecord ? await readJson(path.resolve(input.operatorRecord)) : {},
  );
  for (const platform of ['chatgpt', 'claude'] as const) {
    const model = input.models[platform];
    if (model)
      operatorRecord[platform] = {
        model,
        settings: operatorRecord[platform]?.settings ?? {},
        interventions: operatorRecord[platform]?.interventions ?? [],
      };
  }
  const assessment = await assessJourneys({
    repositoryRoot,
    bundlePath: path.resolve(input.bundle),
    sha256: input.sha256,
    exportPaths: input.exports.map((exportPath) => path.resolve(exportPath)),
    operatorRecord,
    persist: !input.diagnostic,
  });
  process.stdout.write(`${JSON.stringify(assessment, null, 2)}\n`);
  if (assessment.mode === 'diagnostic')
    process.stdout.write('Non-admitting diagnostic. No campaign record changed.\n');
  else {
    process.stdout.write(
      `Record: ${getCompletedEvidenceRunPath(repositoryRoot, 'journeys', assessment.runId)}\nScoped status: ${assessment.status}\n`,
    );
    for (const platform of assessment.platforms) {
      process.stdout.write(
        `${platform.platform}: ${platform.resolutions.length}/${assessment.definitions.length} journeys recorded\n`,
      );
      for (const resolution of platform.resolutions.filter(
        (resolution) => resolution.status === 'awaiting-confirmation',
      ))
        process.stdout.write(
          `\n${await renderStartMessage({ runId: assessment.runId, platform: platform.platform, sha256: assessment.bundleSha256, url: `https://github.com/moldea-ai/skill/releases/download/journeys-${assessment.runId}/journeys-bundle-${assessment.runId}.zip`, journeys: [resolution.journeyId], confirmationIndex: resolution.confirmationTrialIds.length + 1 })}\n`,
        );
    }
  }
}
