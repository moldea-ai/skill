// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { getRepositoryRoot } from '../src/lib/generation/generation.ts';
import { SKILLS_DIRECTORY_URL } from '../src/lib/model/constants.ts';
import { verifyProductionBuild } from './verify-build.ts';

describe('verifyProductionBuild', () => {
  test('accepts the complete generated static artifact', () => {
    expect(() => verifyProductionBuild()).not.toThrow();
  });

  test('publishes canonical machine guidance and the primary distribution link', () => {
    const llmsText = readFileSync(join(getRepositoryRoot(), 'website/dist/llms.txt'), 'utf8');

    expect(llmsText).toContain('# `moldea` Agent Skill');
    expect(llmsText).toContain(SKILLS_DIRECTORY_URL);
    expect(llmsText).toContain('https://skill.moldea.ai/docs/getting-started/');
  });
});
