import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { writeJsonFile } from 'jg-fs';

import { EVALUATION_CONFIRMATION_POLICY } from '../../execution/confirmation/index.ts';
import { createAssessorFingerprint, createFixtureFingerprint } from '../identity/index.ts';

import { generateRuntimeArtifacts } from '../../portable/index.ts';
import { createArchive } from '../bundle/index.ts';
import { copyTree, sha256, treeDigest, treeHashes } from '../harness/index.ts';
import { exportWorkspace, nextRequest, recordStep, setupWorkspace } from '../harness/index.ts';
import { createJourneyDefinitionDigest, defineScriptedJourney } from '../journeys/index.ts';
import type { IJourneyDefinition, IJourneyPlatform } from '../index.ts';

// fixture-only external CLI boundary; real offline CLI coverage lives in the pack tests
export const TEST_JOURNEYS = ['first', 'second'].map((id, order) =>
  defineScriptedJourney({
    id,
    title: id,
    summary: 'Harness integration fixture',
    order,
    fixture: { adopted: false, installCli: false },
    steps: [
      {
        id: 'change',
        request: 'Set policy.md to Retention: 30 days.',
        dependsOn: [],
        checks: [{ kind: 'content-matches', path: 'policy.md', pattern: '30' }],
        unverified: ['The policy was read before writing.'],
      },
      {
        id: 'read',
        request: 'Read the retention policy without editing files.',
        dependsOn: ['change'],
        checks: [{ kind: 'no-changes' }, { kind: 'reply-matches', pattern: '\\b30\\b' }],
        unverified: [],
      },
    ],
  }),
);

/** Creates a network-independent exchange fixture using the real generated harness. */
export const createHarnessFixture = async (
  scratch: string,
  repositoryRoot: string,
  definitions: IJourneyDefinition[] = TEST_JOURNEYS,
): Promise<{
  bundleDirectory: string;
  bundleZip: string;
  hash: string;
  definitions: IJourneyDefinition[];
}> => {
  const bundleDirectory = path.join(scratch, 'journeys-20261012-abcdef');
  await mkdir(path.join(bundleDirectory, 'npm-cache/_cacache'), { recursive: true });
  const skill = path.join(bundleDirectory, 'skill/moldea');
  await mkdir(path.join(skill, 'scripts'), { recursive: true });
  await mkdir(path.join(skill, 'assets'));
  await writeFile(path.join(skill, 'scripts/relevance-gate.mjs'), 'process.stdout.write("0");\n');
  await writeFile(path.join(skill, 'assets/managed-agents-block.md'), 'fixture block\n');
  await writeFile(
    path.join(skill, 'SKILL.md'),
    '---\nname: fixture\ndescription: Test fixture\n---\n',
  );
  await writeFile(
    path.join(skill, 'scripts/moldea-cli.mjs'),
    'process.stdout.write(JSON.stringify({status:"valid",error:null}));\n',
  );
  const runtime = path.join(scratch, 'runtime');
  await generateRuntimeArtifacts({ rootDirectory: repositoryRoot, outputDirectory: runtime });
  await copyTree(path.join(runtime, 'journeys'), path.join(bundleDirectory, 'harness'));
  for (const definition of definitions) {
    const directory = path.join(bundleDirectory, 'journeys', definition.id);
    await mkdir(path.join(directory, 'fixture'), { recursive: true });
    await writeFile(path.join(directory, 'fixture/.gitignore'), '.agents/\nnode_modules/\n');
    await writeFile(path.join(directory, 'fixture/policy.md'), 'Retention: 60 days.\n');
    await writeJsonFile(
      path.join(directory, 'steps.json'),
      definition.steps.map(({ id, request, dependsOn }) => ({ id, request, dependsOn })),
    );
  }
  const files = await treeHashes(bundleDirectory);
  await writeJsonFile(path.join(bundleDirectory, 'manifest.json'), {
    bundleFormatVersion: 2,
    assessorSourceSha256: await createAssessorFingerprint(repositoryRoot),
    policy: EVALUATION_CONFIRMATION_POLICY,
    runId: '20261012-abcdef',
    createdAt: '2026-10-12T00:00:00.000Z',
    skill: {
      commit: 'a'.repeat(40),
      version: '8.0.1',
      cliRepairVersion: '11.0.0',
      treeSha256: await treeDigest(skill),
    },
    instructions: { version: 2, sha256: sha256('fixture instructions') },
    files,
    npmCache: { sha256: await treeDigest(path.join(bundleDirectory, 'npm-cache')), packages: [] },
    journeys: definitions.map((definition) => ({
      id: definition.id,
      title: definition.title,
      stepCount: definition.steps.length,
      definitionDigest: createJourneyDefinitionDigest(definition),
      fixtureSha256: createFixtureFingerprint(files, definition.id),
      fixture: definition.fixture,
    })),
  });
  const bundleZip = path.join(scratch, 'bundle.zip');
  await createArchive(bundleDirectory, bundleZip);
  const { readFile } = await import('node:fs/promises');
  return { bundleDirectory, bundleZip, hash: sha256(await readFile(bundleZip)), definitions };
};

/** Drives real setup/issue/record/export boundaries with deterministic edits and replies. */
export const recordFixturePlatform = async (
  scratch: string,
  fixture: Awaited<ReturnType<typeof createHarnessFixture>>,
  platform: IJourneyPlatform,
  readonlyEdit = false,
  selection: { journeys?: string[]; confirmationIndex?: number; name?: string } = {},
): Promise<string> => {
  const workspace = path.join(
    scratch,
    selection.name ?? `${platform}-${selection.confirmationIndex ?? 'initial'}`,
  );
  await setupWorkspace(workspace, {
    runId: '20261012-abcdef',
    sha256: fixture.hash,
    platform,
    ...(selection.journeys ? { journeys: selection.journeys } : {}),
    ...(selection.confirmationIndex ? { confirmationIndex: selection.confirmationIndex } : {}),
    bundleZip: fixture.bundleZip,
    bundleDirectory: fixture.bundleDirectory,
    homeDirectory: path.join(scratch, `${platform}-home`),
  });
  for (const definition of fixture.definitions.filter(
    (definition) => !selection.journeys || selection.journeys.includes(definition.id),
  )) {
    for (const step of definition.steps) {
      await nextRequest(workspace);
      const capture = path.join(workspace, 'capture', definition.id, step.id);
      if (step.id === 'change')
        await writeFile(
          path.join(workspace, 'work', definition.id, 'policy.md'),
          'Retention: 30 days.\n',
        );
      if (readonlyEdit && step.id === 'read')
        await writeFile(
          path.join(workspace, 'work', definition.id, 'extra.md'),
          'unexpected edit\n',
        );
      await writeFile(path.join(capture, 'reply.md'), 'Retention is 30 days.');
      await writeJsonFile(path.join(capture, 'activity.json'), {
        commands: [],
        reads: ['policy.md'],
        writes: step.id === 'change' ? ['policy.md'] : [],
        notes: [],
      });
      await recordStep(
        workspace,
        path.join(capture, 'reply.md'),
        path.join(capture, 'activity.json'),
      );
    }
    await exportWorkspace(workspace);
  }
  return await exportWorkspace(workspace, true);
};
