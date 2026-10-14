// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

import { evaluateJourneyCheck } from '../../assessment/index.ts';

import { scriptedJourney } from './journey.ts';

test.each([
  ['untouched stale blocks', [], ['README.md', 'AGENTS.md'], [], false],
  ['only README repaired', ['README.md'], ['AGENTS.md'], [], false],
  [
    'both changed but still stale',
    ['README.md', 'AGENTS.md'],
    ['README.md', 'AGENTS.md'],
    [],
    false,
  ],
  ['both repaired', ['README.md', 'AGENTS.md'], [], [], true],
  ['canonical knowledge changed', ['README.md', 'AGENTS.md'], [], ['moldea/project.md'], false],
] as const)(
  'health repair rejects false completion (%s)',
  async (_scenario, stepChanges, stalePaths, fixtureChanges, passing) => {
    const repository = await mkdtemp(join(tmpdir(), 'journeys-health-'));
    try {
      const assetRoot = new URL('../../../../moldea/assets/', import.meta.url);
      for (const [name, asset] of [
        ['README.md', 'managed-readme-block.md'],
        ['AGENTS.md', 'managed-agents-block.md'],
      ] as const) {
        const current = await readFile(new URL(asset, assetRoot), 'utf8');
        const content = stalePaths.some((stale) => stale === name)
          ? current.replace(
              '<!-- moldea:end -->',
              'Fixture integration drift.\n<!-- moldea:end -->',
            )
          : current;
        await writeFile(join(repository, name), content);
      }
      const step = scriptedJourney.steps.find(({ id }) => id === 'repair');
      if (!step) throw new Error('The health journey must include repair.');
      const results = [];
      for (const check of step.checks.filter(({ kind }) => kind !== 'validate')) {
        results.push(
          await evaluateJourneyCheck(check, {
            repository,
            files: { 'README.md': 'snapshot', 'AGENTS.md': 'snapshot' },
            stepChanges: [...stepChanges],
            fixtureChanges: [...fixtureChanges],
            reply: '',
            cliVersion: '11.0.0',
            closure: '',
            environment: {},
          }),
        );
      }
      expect(results.every(({ status }) => status === 'passed')).toBe(passing);
    } finally {
      await rm(repository, { recursive: true, force: true });
    }
  },
);
