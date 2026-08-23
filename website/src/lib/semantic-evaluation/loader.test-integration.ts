// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  getSemanticCriterionLabels,
} from '../../../../tooling/semantic-evaluation/index.mjs';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../../../tooling/release-identity/constants.mjs';
import { createSemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';

import { loadSemanticEvaluationWebsiteModel } from './loader.ts';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const temporaryRoots: string[] = [];

const createTemporaryRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-semantic-website-'));
  temporaryRoots.push(root);
  cpSync(join(REPOSITORY_ROOT, 'moldea'), join(root, 'moldea'), { recursive: true });
  cpSync(join(REPOSITORY_ROOT, 'package.json'), join(root, 'package.json'));
  cpSync(join(REPOSITORY_ROOT, 'package-lock.json'), join(root, 'package-lock.json'));
  mkdirSync(join(root, 'fixtures'), { recursive: true });
  cpSync(
    join(REPOSITORY_ROOT, 'fixtures/conformance-cases.json'),
    join(root, 'fixtures/conformance-cases.json'),
  );
  return root;
};

const writeJson = (root: string, relativePath: string, value: unknown): void => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const seedPassingResult = (root: string): void => {
  const fixture = JSON.parse(
    readFileSync(join(root, 'fixtures/conformance-cases.json'), 'utf8'),
  ) as {
    semanticCases: Array<{
      expected: Array<{ criterion: string; label: string }>;
      forbidden: Array<{ criterion: string; label: string }>;
      id: string;
    }>;
  };
  const artifactDigest = createPortableSkillDigest(root);
  const evaluatedAt = '2026-08-22T12:00:00.000Z';
  const host = {
    model: 'gpt-5.6-terra',
    name: 'codex',
    reasoningEffort: 'medium',
    version: 'codex-cli test',
  };
  const cases = fixture.semanticCases.map((caseDefinition) => ({
    caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
    evaluatedAt,
    expectedSatisfied: getSemanticCriterionLabels(caseDefinition.expected),
    forbiddenTriggered: [],
    id: caseDefinition.id,
    passed: true,
    rationale: 'The recorded response and workspace evidence satisfy every declared criterion.',
    skillArtifactEvidence: [],
  }));
  const results = cases.map((caseResult) => ({
    caseDefinitionDigest: caseResult.caseDefinitionDigest,
    evaluatedAt,
    forbidden: [],
    id: caseResult.id,
    observed: caseResult.expectedSatisfied,
    passed: true,
    rationale: caseResult.rationale,
  }));

  writeJson(root, 'fixtures/semantic-evaluation-result.json', {
    actorHost: host,
    artifact: { sha256: artifactDigest },
    artifactDigest,
    artifactSha256: artifactDigest,
    cases,
    caseSuiteDigest: createSemanticCaseSuiteDigest(fixture.semanticCases),
    cli: createSemanticCliIdentity(root),
    evaluatedAt,
    evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
    generatedAt: evaluatedAt,
    host,
    judgeHost: host,
    results,
    schemaVersion: 1,
    skillDigest: artifactDigest,
  });
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('loadSemanticEvaluationWebsiteModel', () => {
  test('publishes every current case from complete passing evidence', () => {
    const root = createTemporaryRoot();
    seedPassingResult(root);

    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.route).toBe('/evidence/semantic/');
    expect(model.caseCount).toBe(47);
    expect(model.groups.flatMap(({ cases }) => cases)).toHaveLength(47);
    expect(model.groups.every(({ cases }) => cases.length > 0)).toBe(true);
  });

  test('rejects a failed case even when the artifact is otherwise current', () => {
    const root = createTemporaryRoot();
    seedPassingResult(root);
    const path = join(root, 'fixtures/semantic-evaluation-result.json');
    const result = JSON.parse(readFileSync(path, 'utf8')) as {
      cases: Array<{ passed: boolean }>;
      results: Array<{ passed: boolean }>;
    };
    const firstCase = result.cases[0];
    const firstRawResult = result.results[0];
    if (firstCase === undefined || firstRawResult === undefined) throw new Error('Missing case.');
    firstCase.passed = false;
    firstRawResult.passed = false;
    writeJson(root, 'fixtures/semantic-evaluation-result.json', result);

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(/incomplete, stale, or failing/);
  });

  test('rejects missing official evidence', () => {
    const root = createTemporaryRoot();

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(/Required semantic evidence/);
  });
});
