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
  createSemanticCoverageDigest,
  getSemanticCriterionLabels,
} from '../../../../tooling/semantic-evaluation/index.mjs';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../../../tooling/release-identity/constants.mjs';
import { createSemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';

import { loadSemanticEvaluationWebsiteModel } from './loader.ts';
import type { ISemanticCaseDefinition } from './types.ts';

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
  cpSync(
    join(REPOSITORY_ROOT, 'fixtures/semantic-evaluation-coverage.json'),
    join(root, 'fixtures/semantic-evaluation-coverage.json'),
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
    semanticCases: ISemanticCaseDefinition[];
  };
  const coverage = JSON.parse(
    readFileSync(join(root, 'fixtures/semantic-evaluation-coverage.json'), 'utf8'),
  ) as unknown;
  const artifactDigest = createPortableSkillDigest(root);
  const evaluatedAt = '2026-08-22T12:00:00.000Z';
  const host = {
    model: 'gpt-5.6-terra',
    name: 'codex',
    reasoningEffort: 'medium',
    version: 'codex-cli test',
  };
  const controlState = {
    gitDigest: '1'.repeat(64),
    head: { commit: '2'.repeat(40), symbolicRef: 'refs/heads/main' },
    indexDigest: '3'.repeat(64),
    installedSkillDigest: '4'.repeat(64),
    localConfigDigest: '5'.repeat(64),
    refs: [],
  };
  const repositoryControlEvidence = {
    after: controlState,
    before: controlState,
    violations: [],
  };
  const createScenarioEvidence = (caseDefinition: ISemanticCaseDefinition): unknown[] =>
    caseDefinition.input.repositoryEvidence.map(({ claim, source }) => {
      let observation: Record<string, unknown>;
      if (source.kind === 'developer-direction') {
        observation = {
          content: caseDefinition.input.developerDirection,
          type: 'developer-direction',
        };
      } else if (source.kind === 'host-instructions') {
        observation = { content: caseDefinition.hostInstructions, type: 'host-instructions' };
      } else if (source.kind === 'git-state') {
        observation = { fact: source.fact, observed: true, type: 'git-state' };
      } else if (source.expectedType === 'missing') {
        observation = { path: source.path, type: 'missing' };
      } else if (source.expectedType === 'directory') {
        observation = { mode: 16_877, path: source.path, type: 'directory' };
      } else if (source.expectedType === 'symlink') {
        observation = {
          mode: 41_471,
          path: source.path,
          sha256: '6'.repeat(64),
          target: 'fixture-target',
          type: 'symlink',
        };
      } else {
        observation = {
          content: 'fixture evidence\n',
          mode: 33_188,
          omission: null,
          path: source.path,
          sha256: '7'.repeat(64),
          type: 'file',
        };
      }

      return { claim, observation, source };
    });
  const cases = fixture.semanticCases.map((caseDefinition) => ({
    caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
    evaluatedAt,
    expectedSatisfied: getSemanticCriterionLabels(caseDefinition.expected),
    forbiddenTriggered: [],
    id: caseDefinition.id,
    passed: true,
    rationale: 'The recorded response and workspace evidence satisfy every declared criterion.',
    repositoryControlEvidence,
    scenarioEvidence: createScenarioEvidence(caseDefinition),
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
    repositoryControlEvidence: caseResult.repositoryControlEvidence,
    scenarioEvidence: caseResult.scenarioEvidence,
  }));

  writeJson(root, 'fixtures/semantic-evaluation-result.json', {
    actorHost: host,
    artifact: { sha256: artifactDigest },
    artifactDigest,
    artifactSha256: artifactDigest,
    cases,
    caseSuiteDigest: createSemanticCaseSuiteDigest(fixture.semanticCases),
    cli: createSemanticCliIdentity(root),
    coverageDigest: createSemanticCoverageDigest(coverage, fixture.semanticCases),
    evaluatedAt,
    evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
    generatedAt: evaluatedAt,
    host,
    judgeHost: host,
    results,
    schemaVersion: 2,
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

  test('rejects repository-control violations and stale coverage', () => {
    const root = createTemporaryRoot();
    seedPassingResult(root);
    const resultPath = join(root, 'fixtures/semantic-evaluation-result.json');
    const result = JSON.parse(readFileSync(resultPath, 'utf8')) as {
      cases: Array<{ repositoryControlEvidence: { violations: string[] } }>;
      coverageDigest: string;
      results: Array<{ repositoryControlEvidence: { violations: string[] } }>;
    };
    const firstCase = result.cases[0];
    const firstRawResult = result.results[0];
    if (firstCase === undefined || firstRawResult === undefined) throw new Error('Missing case.');
    firstCase.repositoryControlEvidence.violations = ['installed-skill-changed'];
    firstRawResult.repositoryControlEvidence.violations = ['installed-skill-changed'];
    writeJson(root, 'fixtures/semantic-evaluation-result.json', result);
    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(/incomplete, stale, or failing/);

    seedPassingResult(root);
    result.coverageDigest = 'f'.repeat(64);
    writeJson(root, 'fixtures/semantic-evaluation-result.json', result);
    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(/coverage contract/);
  });

  test('rejects missing official evidence', () => {
    const root = createTemporaryRoot();

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(/Required semantic evidence/);
  });
});
