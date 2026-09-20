// @vitest-environment node
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

import { QUALIFICATION_PROFILES_ROOT } from '../constants/index.ts';
import { ensureDirectory } from '../../../src/filesystem/index.ts';
import {
  discoverQualificationProfileCases,
  loadQualificationCaseCatalog,
  loadQualificationProfile,
} from './loader.ts';

let temporaryRoot: string | null = null;

afterEach(async () => {
  if (temporaryRoot !== null) {
    await rm(temporaryRoot, { force: true, recursive: true });
    temporaryRoot = null;
  }
});

test('loads profile cases from their case directories without a profile registry', async () => {
  const profile = await loadQualificationProfile(path.join(QUALIFICATION_PROFILES_ROOT, 't1'));

  expect(profile.cases.map(({ id }) => id)).toStrictEqual([
    'repair-anthropic-tool-registration',
    'preserve-anthropic-static-boundary',
  ]);
});

test('discovers a newly added scenario without another registration change', async () => {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-profile-'));
  const sourceProfileDirectory = path.join(QUALIFICATION_PROFILES_ROOT, 't1');
  const casesDirectory = path.join(temporaryRoot, 'cases');
  await Promise.all([
    ensureDirectory(path.join(casesDirectory, 'c1')),
    ensureDirectory(path.join(casesDirectory, 'c2')),
  ]);
  await copyFile(
    path.join(sourceProfileDirectory, 'cases', 'c9', 'scenario.yaml'),
    path.join(casesDirectory, 'c1', 'scenario.yaml'),
  );
  const scenarioSource = await readFile(
    path.join(sourceProfileDirectory, 'cases', 'c10', 'scenario.yaml'),
    'utf8',
  );
  await writeFile(
    path.join(casesDirectory, 'c2', 'scenario.yaml'),
    scenarioSource.replace(
      'preserve-anthropic-static-boundary',
      'new-anthropic-qualification-case',
    ),
    'utf8',
  );

  const discoveredCases = await discoverQualificationProfileCases(temporaryRoot);

  expect(discoveredCases.map(({ profileCase }) => profileCase.id)).toStrictEqual([
    'repair-anthropic-tool-registration',
    'new-anthropic-qualification-case',
  ]);
});

test('derives the public catalog from scenario-owned presentation metadata', async () => {
  const catalog = await loadQualificationCaseCatalog();
  const catalogCase = catalog.cases.find(({ id }) => id === 'evaluate-aligned-project');

  expect(catalogCase).toStrictEqual({
    id: 'evaluate-aligned-project',
    title: 'Evaluate an aligned project',
    layer: 'universal-baseline',
    description:
      'Inspect a valid project and explain its existing repository relationships without changing it.',
    challenge:
      'Confirms that the skill can recognize a correct project and avoid unnecessary edits.',
  });
});
