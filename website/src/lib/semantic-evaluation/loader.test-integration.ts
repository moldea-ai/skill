// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createPortableSkillDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  getSemanticCriterionLabels,
  recordSemanticEvaluationAttempt,
} from '../../../../tooling/semantic-evaluation/index.mjs';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../../../tooling/release-identity/constants.mjs';
import { createSemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';

import { loadSemanticEvaluationWebsiteModel } from './loader.ts';
import type { ISemanticCaseDefinition } from './types.ts';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const temporaryRoots: string[] = [];
const HOST = {
  model: 'gpt-5.6-terra',
  name: 'codex',
  reasoningEffort: 'medium',
  version: 'codex-cli test',
} as const;
const UPDATED_HOST = { ...HOST, version: 'codex-cli updated' } as const;

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

const loadInputs = (root: string): { cases: ISemanticCaseDefinition[]; coverage: unknown } => ({
  cases: (
    JSON.parse(readFileSync(join(root, 'fixtures/conformance-cases.json'), 'utf8')) as {
      semanticCases: ISemanticCaseDefinition[];
    }
  ).semanticCases,
  coverage: JSON.parse(
    readFileSync(join(root, 'fixtures/semantic-evaluation-coverage.json'), 'utf8'),
  ) as unknown,
});

const createCandidate = (
  root: string,
  caseDefinitions: ISemanticCaseDefinition[],
  coverage: unknown,
  evaluatedCaseIds: string[],
  failedCaseId: string | null,
  updatedAt: string,
): Record<string, unknown> => ({
  actorHost: HOST,
  artifactDigest: createPortableSkillDigest(root),
  caseSuiteDigest: createSemanticCaseSuiteDigest(caseDefinitions),
  cli: createSemanticCliIdentity(root),
  confirmations: [],
  coverageDigest: createSemanticCoverageDigest(coverage, caseDefinitions),
  evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
  generatedAt: updatedAt,
  judgeHost: HOST,
  results: evaluatedCaseIds.map((id) => {
    const caseDefinition = caseDefinitions.find(({ id: caseId }) => caseId === id);
    if (caseDefinition === undefined) throw new Error(`Unknown test case ${id}.`);
    const passed = id !== failedCaseId;
    return {
      evaluatedAt: updatedAt,
      forbidden: [],
      id,
      observed: passed ? getSemanticCriterionLabels(caseDefinition.expected) : [],
      passed,
      rationale: passed
        ? 'The recorded response satisfies every declared criterion.'
        : 'The recorded response misses one declared criterion.',
    };
  }),
  schemaVersion: 3,
  updatedAt,
});

const createCurrentCandidate = (
  root: string,
  caseDefinitions: ISemanticCaseDefinition[],
  coverage: unknown,
  evaluatedCaseIds: string[],
  failedCaseId: string | null,
  updatedAt: string,
): Record<string, unknown> => {
  const legacyCandidate = createCandidate(
    root,
    caseDefinitions,
    coverage,
    evaluatedCaseIds,
    failedCaseId,
    updatedAt,
  );
  return {
    ...legacyCandidate,
    actorHost: undefined,
    hostContract: {
      model: HOST.model,
      name: HOST.name,
      reasoningEffort: HOST.reasoningEffort,
    },
    judgeHost: undefined,
    results: (legacyCandidate['results'] as Array<Record<string, unknown>>).map(
      (result, index) => ({
        actorHost: index === 0 ? HOST : UPDATED_HOST,
        judgeHost: index === 0 ? HOST : UPDATED_HOST,
        ...result,
      }),
    ),
    schemaVersion: 4,
  };
};

const recordCandidate = async (
  root: string,
  candidate: Record<string, unknown>,
  totalCaseCount: number,
  stopReason: 'case-failure' | 'complete',
): Promise<void> => {
  await recordSemanticEvaluationAttempt({
    evidenceKind: 'candidate',
    evidenceText: `${JSON.stringify(candidate, null, 2)}\n`,
    recordedAt: new Date(Date.parse(candidate['updatedAt'] as string) + 1).toISOString(),
    resultsRoot: join(root, 'fixtures/semantic-evaluation-results'),
    stopReason,
    totalCaseCount,
  });
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('loadSemanticEvaluationWebsiteModel', () => {
  test('publishes the complete current passing attempt', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    await recordCandidate(
      root,
      createCandidate(
        root,
        cases,
        coverage,
        cases.map(({ id }) => id),
        null,
        '2026-08-25T12:00:00.000Z',
      ),
      cases.length,
      'complete',
    );

    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.route).toBe('/evidence/semantic/');
    expect(model.status).toBe('passed');
    expect(model.caseCount).toBe(cases.length);
    expect(model.passedCaseCount).toBe(cases.length);
    expect(model.groups.flatMap(({ cases: groupCases }) => groupCases)).toHaveLength(cases.length);
  });

  test('keeps a failed latest attempt separate from the last passing attempt', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    await recordCandidate(
      root,
      createCandidate(
        root,
        cases,
        coverage,
        cases.map(({ id }) => id),
        null,
        '2026-08-25T12:00:00.000Z',
      ),
      cases.length,
      'complete',
    );
    await recordCandidate(
      root,
      createCandidate(
        root,
        cases,
        coverage,
        [cases[0]!.id, cases[1]!.id],
        cases[1]!.id,
        '2026-08-25T13:00:00.000Z',
      ),
      cases.length,
      'case-failure',
    );

    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.status).toBe('failed');
    expect(model.passedCaseCount).toBe(1);
    expect(model.failedCaseCount).toBe(1);
    expect(model.pendingCaseCount).toBe(cases.length - 2);
    expect(model.latest.result.attemptId).not.toBe(model.lastPassing?.result.attemptId);
  });

  test('publishes mixed per-trial Codex versions from current attempt summaries', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    await recordCandidate(
      root,
      createCurrentCandidate(
        root,
        cases,
        coverage,
        [cases[0]!.id, cases[1]!.id],
        cases[1]!.id,
        '2026-08-25T13:00:00.000Z',
      ),
      cases.length,
      'case-failure',
    );

    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.latest.result.schemaVersion).toBe(2);
    expect(model.latest.cases[0]?.trials[0]?.actorHost.version).toBe(HOST.version);
    expect(model.latest.cases[1]?.trials[0]?.actorHost.version).toBe(UPDATED_HOST.version);
  });

  test('rejects malformed current trial host provenance', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    await recordCandidate(
      root,
      createCurrentCandidate(
        root,
        cases,
        coverage,
        [cases[0]!.id],
        cases[0]!.id,
        '2026-08-25T13:00:00.000Z',
      ),
      cases.length,
      'case-failure',
    );
    const latest = JSON.parse(
      readFileSync(join(root, 'fixtures/semantic-evaluation-results/latest.json'), 'utf8'),
    ) as { latestAttemptId: string };
    const evidencePath = join(
      root,
      'fixtures/semantic-evaluation-results/attempts',
      latest.latestAttemptId,
      'evidence.json',
    );
    const evidence = JSON.parse(readFileSync(evidencePath, 'utf8')) as {
      results: Array<Record<string, unknown>>;
    };
    evidence.results[0] = { ...evidence.results[0], judgeHost: undefined };
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(/invalid trial host provenance/);
  });

  test('rejects changed immutable attempt evidence', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    const candidate = createCandidate(
      root,
      cases,
      coverage,
      [cases[0]!.id],
      cases[0]!.id,
      '2026-08-25T13:00:00.000Z',
    );
    await recordCandidate(root, candidate, cases.length, 'case-failure');
    const attemptsRoot = join(root, 'fixtures/semantic-evaluation-results/attempts');
    const attemptId = readFileSync(
      join(root, 'fixtures/semantic-evaluation-results/latest.json'),
      'utf8',
    )
      ? (
          JSON.parse(
            readFileSync(join(root, 'fixtures/semantic-evaluation-results/latest.json'), 'utf8'),
          ) as { latestAttemptId: string }
        ).latestAttemptId
      : '';
    const evidencePath = join(attemptsRoot, attemptId, 'evidence.json');
    writeFileSync(
      evidencePath,
      `${JSON.stringify({ ...candidate, updatedAt: '2026-08-26T00:00:00.000Z' }, null, 2)}\n`,
    );

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(
      /does not match its immutable evidence/,
    );
  });

  test('rejects missing immutable semantic history', () => {
    const root = createTemporaryRoot();

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow();
  });
});
