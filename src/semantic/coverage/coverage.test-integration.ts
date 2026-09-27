// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { loadSemanticCases } from '../cases/index.ts';

import { SEMANTIC_COVERAGE_CLAIMS } from './claims.ts';
import { createSemanticCoverage } from './coverage.ts';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..');

const headingAnchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[`*_]/gu, '')
    .replace(/[^a-z0-9 -]/gu, '')
    .trim()
    .replace(/ +/gu, '-');

describe('discovered semantic coverage', () => {
  test('current claim sources and anchors exist in the distributed skill', async () => {
    for (const claim of SEMANTIC_COVERAGE_CLAIMS) {
      for (const sourcePath of claim.sourcePaths) {
        const [relativePath, anchor] = sourcePath.split('#');
        expect(relativePath?.startsWith('moldea/'), sourcePath).toBe(true);
        expect(relativePath?.includes('..'), sourcePath).toBe(false);
        if (relativePath === undefined) continue;
        const source = await readFile(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
        if (anchor !== undefined) {
          const anchors = [...source.matchAll(/^#{1,6} (.+)$/gmu)].map((match) =>
            headingAnchor(match[1] ?? ''),
          );
          expect(anchors, sourcePath).toContain(anchor);
        }
      }
    }
  });

  test('new repair, expansion, and injection evidence is derived from discovered cases', async () => {
    const cases = await loadSemanticCases(path.resolve(import.meta.dirname, '../cases'));
    const coverage = createSemanticCoverage(cases);
    const evidenceFor = (claimId: string): string[] =>
      coverage.claims
        .find(({ id }) => id === claimId)
        ?.evidence.filter(({ kind }) => kind === 'semantic-case')
        .map(({ id }) => id) ?? [];

    expect(evidenceFor('project-repair-and-recovery')).toEqual(
      expect.arrayContaining([
        'repair-readme-drift',
        'repair-known-context-drift',
        'repair-unproven-adoption',
        'repair-ambiguous-foundation',
        'repair-marker-ambiguity',
        'repair-conflicting-policy',
        'repair-missing-tooling',
        'repair-healthy-project',
      ]),
    );
    expect(evidenceFor('bounded-relevance')).toEqual(
      expect.arrayContaining(['scope-expansion-second-owner', 'context-instruction-injection']),
    );
    expect(evidenceFor('activation-abstention')).toContain('scope-expansion-unbound-only');
    expect(
      coverage.claims
        .find(({ id }) => id === 'adapter-ownership')
        ?.evidence.filter(({ kind }) => kind === 'qualification-profile'),
    ).toEqual(SEMANTIC_COVERAGE_CLAIMS.find(({ id }) => id === 'adapter-ownership')?.fixedEvidence);
  });
});
