import path from 'node:path';

import { createGitHubReleaseClient, type IGitHubReleaseClient } from '../../release/index.ts';
import { RUN_ID_PATTERN } from '../index.ts';

/** Publishes one new bundle release without replacing any existing tag or asset. */
export const publishJourneyBundle = async (input: {
  runId: string;
  archivePath: string;
  client?: IGitHubReleaseClient;
}): Promise<string> => {
  if (
    !RUN_ID_PATTERN.test(input.runId) ||
    path.basename(input.archivePath) !== `journeys-bundle-${input.runId}.zip`
  )
    throw new Error('Bundle publication identity mismatch.');
  const client = input.client ?? createGitHubReleaseClient();
  const repository = 'moldea-ai/skill';
  const tag = `journeys-${input.runId}`;
  if (await client.getRelease(repository, tag))
    throw new Error(`Bundle release already exists: ${tag}`);
  await client.createDraft({
    repository,
    tag,
    title: `Scripted journeys ${input.runId}`,
    notes:
      'Prepared input bundle for scripted journeys in ChatGPT and Claude projects. Results are assessed separately.',
  });
  await client.uploadAsset({ repository, tag, assetPath: input.archivePath });
  await client.publishDraft(repository, tag);
  return `https://github.com/${repository}/releases/download/${tag}/${path.basename(input.archivePath)}`;
};
