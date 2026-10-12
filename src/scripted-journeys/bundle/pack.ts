import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { writeJsonFileAtomically } from '../../filesystem/index.ts';
import { generateRuntimeArtifacts } from '../../portable/index.ts';
import { RUN_ID_PATTERN } from '../index.ts';
import {
  copyTree,
  runCommand,
  sha256,
  treeDigest,
  treeHashes,
  verifyBundle,
} from '../harness/index.ts';
import { readProjectInstructions, renderStartMessage } from '../instructions/index.ts';
import { createJourneyDefinitionDigest, loadScriptedJourneys } from '../journeys/index.ts';
import { JourneysBundleSchema } from '../index.ts';

import { createArchive, extractArchive } from './archive.ts';
import { materializeFixture } from './fixtures.ts';
import { buildNpmCache } from './npm-cache.ts';

/** Packs one immutable skill tree with local-only criteria digests and a reusable offline closure. */
export const packJourneys = async (input: {
  repositoryRoot: string;
  commit: string;
  outputDirectory: string;
  runId?: string;
}): Promise<{
  archivePath: string;
  sha256: string;
  runId: string;
  startMessages: Record<'chatgpt' | 'claude', string>;
}> => {
  const runId =
    input.runId ??
    `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex')}`;
  if (!RUN_ID_PATTERN.test(runId)) throw new Error('Invalid journeys run id.');
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-pack-'));
  try {
    const commit = (
      await runCommand(
        'git',
        ['rev-parse', '--verify', `${input.commit}^{commit}`],
        input.repositoryRoot,
      )
    ).stdout.trim();
    const root = path.join(scratch, `journeys-${runId}`);
    await mkdir(root);
    const skillZip = path.join(scratch, 'skill.zip');
    await runCommand(
      'git',
      ['archive', '--format=zip', `--output=${skillZip}`, commit, 'moldea'],
      input.repositoryRoot,
    );
    const extracted = await extractArchive(skillZip, path.join(scratch, 'skill-extracted'));
    const skillDirectory = path.join(root, 'skill/moldea');
    await copyTree(extracted, skillDirectory);
    const entrypoint = await readFile(path.join(skillDirectory, 'SKILL.md'), 'utf8');
    const version = /^\s+version:\s*['"]?([\d.]+)/mu.exec(entrypoint)?.[1];
    const cliVersion = /^\s+cliRepairVersion:\s*['"]?([\d.]+)/mu.exec(entrypoint)?.[1];
    if (!version || !cliVersion) throw new Error('Skill commit lacks exact version metadata.');
    const instructions = await readProjectInstructions();
    const cache = path.join(root, 'npm-cache');
    const npmCache = await buildNpmCache(cliVersion, cache);
    const definitions = await loadScriptedJourneys(
      path.join(input.repositoryRoot, 'src/scripted-journeys/journeys'),
    );
    for (const definition of definitions) {
      const destination = path.join(root, 'journeys', definition.id);
      await materializeFixture({
        source: path.join(
          input.repositoryRoot,
          'src/scripted-journeys/journeys',
          definition.id,
          'fixture',
        ),
        destination: path.join(destination, 'fixture'),
        skillDirectory,
        definition,
        cache,
        cliVersion,
        home: path.join(scratch, 'fixture-home'),
      });
      await writeJsonFileAtomically(
        path.join(destination, 'steps.json'),
        definition.steps.map(({ id, request, dependsOn }) => ({ id, request, dependsOn })),
      );
    }
    const runtime = path.join(scratch, 'runtime');
    await generateRuntimeArtifacts({
      rootDirectory: input.repositoryRoot,
      outputDirectory: runtime,
    });
    await copyTree(path.join(runtime, 'journeys'), path.join(root, 'harness'));
    // freeze cache metadata after all fixture installs have finished
    await rm(path.join(cache, '_logs'), { recursive: true, force: true });
    await rm(path.join(cache, '_update-notifier-last-checked'), { force: true });
    npmCache.sha256 = await treeDigest(cache, [], true);
    const files = Object.fromEntries(
      Object.entries(await treeHashes(root, [], true)).filter(
        ([name]) => !name.startsWith('npm-cache/'),
      ),
    );
    await writeJsonFileAtomically(
      path.join(root, 'manifest.json'),
      JourneysBundleSchema.parse({
        bundleFormatVersion: 1,
        runId,
        createdAt: new Date().toISOString(),
        skill: {
          commit,
          version,
          cliRepairVersion: cliVersion,
          treeSha256: await treeDigest(skillDirectory),
        },
        instructions: { version: 1, sha256: sha256(instructions) },
        files,
        npmCache,
        journeys: definitions.map((definition) => ({
          id: definition.id,
          title: definition.title,
          stepCount: definition.steps.length,
          definitionDigest: createJourneyDefinitionDigest(definition),
          fixture: definition.fixture,
        })),
      }),
    );
    await verifyBundle(root);
    const archivePath = path.resolve(input.outputDirectory, `journeys-bundle-${runId}.zip`);
    await createArchive(root, archivePath, true);
    const hash = sha256(await readFile(archivePath));
    const url = `https://github.com/moldea-ai/skill/releases/download/journeys-${runId}/${path.basename(archivePath)}`;
    return {
      archivePath,
      sha256: hash,
      runId,
      startMessages: {
        chatgpt: await renderStartMessage({ runId, sha256: hash, platform: 'chatgpt', url }),
        claude: await renderStartMessage({ runId, sha256: hash, platform: 'claude', url }),
      },
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
};
