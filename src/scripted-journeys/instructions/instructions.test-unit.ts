// @vitest-environment node
import { expect, test } from 'vitest';

import { readProjectInstructions, renderStartMessage } from './instructions.ts';

test('project instructions are bounded, generic, and explain both recovery paths', async () => {
  const instructions = await readProjectInstructions();
  expect(instructions.length).toBeLessThanOrEqual(8000);
  // generic .agents/ and AGENTS.md paths are permitted; journey identifiers in prose are not
  expect(instructions).not.toMatch(
    /moldea|adopted-unrelated|new-project|everyday-work|(?<!\.)\bagents\b(?!\.md\b)|\bhealth\b|\bboundaries\b|expected|criterion/iu,
  );
  expect(instructions).toContain('--resume');
  expect(instructions).toContain('re-issued');
  expect(instructions).toContain('frontmatter description');
});

test('start message binds the platform, run, and independently held zip digest', async () => {
  const message = await renderStartMessage({
    runId: '20261012-abcdef',
    platform: 'claude',
    sha256: 'a'.repeat(64),
    url: 'https://example.com/bundle.zip',
  });
  expect(message).toContain('--platform claude');
  expect(message).toContain(`--sha256 ${'a'.repeat(64)}`);
  expect(message).not.toContain('{{');
});

test('selective baseline and confirmation messages preserve trust anchors without grading details', async () => {
  const input = {
    runId: '20261012-abcdef',
    platform: 'chatgpt' as const,
    sha256: 'b'.repeat(64),
    url: 'https://example.com/bundle.zip',
  };
  const baseline = await renderStartMessage({ ...input, journeys: ['first', 'second'] });
  expect(baseline).toContain('--journey first --journey second');
  const confirmation = await renderStartMessage({
    ...input,
    journeys: ['second'],
    confirmationIndex: 2,
  });
  expect(confirmation).toContain('--journey second --confirmation 2');
  expect(confirmation).toContain(input.sha256);
  expect(confirmation).not.toMatch(/criterion|expected|previous answer/u);
  for (const journeys of [[], ['first', 'first'], ['../escape']])
    await expect(renderStartMessage({ ...input, journeys })).rejects.toThrow();
  await expect(
    renderStartMessage({ ...input, journeys: ['first', 'second'], confirmationIndex: 1 }),
  ).rejects.toThrow();
});
