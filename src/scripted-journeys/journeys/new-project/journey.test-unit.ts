// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import { evaluateJourneyCheck } from '../../assessment/index.ts';

import { scriptedJourney } from './journey.ts';

test.each([
  ['11.0.0', 'passed'],
  ['11.0.2', 'passed'],
  ['12.0.0', 'passed'],
  ['^11.0.2', 'failed'],
  ['11.0.2-beta.1', 'failed'],
  ['latest', 'failed'],
  [null, 'failed'],
] as const)('initialization CLI declaration (%s) -> %s', async (declaration, expectedStatus) => {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'journeys-initialization-'));
  try {
    await writeFile(
      path.join(repository, 'package.json'),
      JSON.stringify({ devDependencies: declaration ? { '@moldea.ai/cli': declaration } : {} }),
    );
    const step = scriptedJourney.steps.find((candidate) => candidate.id === 'initialize');
    const declarationCheck = step?.checks.find(
      (check) => check.kind === 'content-matches' && check.path === 'package.json',
    );
    if (!declarationCheck) throw new Error('Initialization must check the CLI declaration.');
    const context = {
      repository,
      files: { 'package.json': 'hash', 'package-lock.json': 'hash' },
      stepChanges: [],
      fixtureChanges: [],
      reply: '',
      cliVersion: '11.0.2',
      closure: '',
      environment: {},
    };
    expect((await evaluateJourneyCheck(declarationCheck, context)).status).toBe(expectedStatus);
    if (declaration !== context.cliVersion) {
      const validationCheck = step?.checks.find((check) => check.kind === 'validate');
      if (!validationCheck) throw new Error('Initialization must validate the pinned CLI.');
      expect((await evaluateJourneyCheck(validationCheck, context)).status).toBe('blocked');
    }
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
