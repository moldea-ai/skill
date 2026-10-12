// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import { evaluateJourneyCheck } from '../../assessment/index.ts';

import { scriptedJourney } from './journey.ts';

test.each([
  ['complete cleanup', '{}', 'The runtime agent is retired.', false, []],
  [
    'accurate retirement history',
    '{}',
    'Removed src/triage-agent.js and src/triage-agent.test-unit.js. No runtime agent remains.',
    false,
    [],
  ],
  [
    'unrelated test preserved',
    '{"scripts":{"test":"node --test src/pickup.test-unit.js"}}',
    'The saved triage policy remains available.',
    false,
    [],
  ],
  [
    'obsolete test command',
    '{"scripts":{"test":"node --test src/triage-agent.test-unit.js"}}',
    'The runtime agent is retired.',
    false,
    ['package.json'],
  ],
  [
    'obsolete runtime command',
    '{"scripts":{"start":"node src/triage-agent.js"}}',
    'The runtime agent is retired.',
    false,
    ['package.json'],
  ],
  [
    'stale runtime documentation',
    '{}',
    'src/triage-agent.js contains the current model invocation.',
    false,
    ['README.md'],
  ],
  [
    'stale focused-test documentation',
    '{}',
    'The existing focused test checks the invocation contract.',
    false,
    ['README.md'],
  ],
  [
    'obsolete test remains',
    '{}',
    'The runtime agent is retired.',
    true,
    ['src/triage-agent.test-unit.js'],
  ],
  ['missing manifest', null, 'The runtime agent is retired.', false, ['package.json']],
  ['missing README', '{}', null, false, ['README.md']],
] as const)('retirement checks (%s)', async (_scenario, manifest, readme, hasTest, failures) => {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'journeys-retirement-'));
  try {
    const contents: Record<string, string> = { 'moldea/context/triage.md': 'Shared policy.' };
    if (manifest !== null) contents['package.json'] = manifest;
    if (readme !== null) contents['README.md'] = readme;
    if (hasTest) contents['src/triage-agent.test-unit.js'] = 'export {};';
    for (const [name, content] of Object.entries(contents)) {
      const destination = path.join(repository, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, content);
    }
    const step = scriptedJourney.steps.find((candidate) => candidate.id === 'retire');
    if (!step) throw new Error('The agent journey must include retirement.');
    const failedPaths: string[] = [];
    for (const check of step.checks.filter((criterion) => criterion.kind !== 'validate')) {
      const result = await evaluateJourneyCheck(check, {
        repository,
        files: Object.fromEntries(Object.keys(contents).map((name) => [name, 'hash'])),
        stepChanges: [],
        fixtureChanges: [],
        reply: '',
        cliVersion: '11.0.0',
        closure: '',
        environment: {},
      });
      if (result.status !== 'passed' && 'path' in check) failedPaths.push(check.path);
    }
    expect(failedPaths).toStrictEqual(failures);
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
