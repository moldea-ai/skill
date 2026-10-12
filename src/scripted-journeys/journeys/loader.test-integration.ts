// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import { loadScriptedJourneys } from './loader.ts';

test('discovery accepts an additional validated journey without a registry edit', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-discovery-'));
  try {
    await mkdir(path.join(scratch, 'extra'));
    await writeFile(
      path.join(scratch, 'extra/journey.ts'),
      `export const scriptedJourney = ${JSON.stringify({ id: 'extra', title: 'Extra', summary: 'Discovered', order: 0, fixture: { adopted: false, installCli: false }, steps: [{ id: 'read', request: 'Read.', dependsOn: [], checks: [{ kind: 'no-changes' }], unverified: [] }] })};`,
    );
    expect((await loadScriptedJourneys(scratch)).map((journey) => journey.id)).toStrictEqual([
      'extra',
    ]);
    const pilots = await loadScriptedJourneys();
    expect(pilots.map((journey) => journey.id)).toStrictEqual(['adopted-unrelated', 'new-project']);
    expect(pilots[1]?.steps.map((step) => step.id)).toStrictEqual(['initialize', 'validate']);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
