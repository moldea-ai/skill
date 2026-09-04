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
  recordSemanticEvaluationAttempt,
} from '../../../../tooling/semantic-evaluation/index.mjs';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../../../tooling/release-identity/constants.mjs';
import { createSemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';

import { loadSemanticEvaluationWebsiteModel } from './loader.ts';
import type { ISemanticCaseDefinition } from './types.ts';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const temporaryRoots: string[] = [];
const HOST = {
  model: 'gpt-5.6-sol',
  name: 'codex',
  reasoningEffort: 'medium',
  version: 'codex-cli test',
} as const;
const UPDATED_HOST = { ...HOST, version: 'codex-cli updated' } as const;

interface IMutableReplayCommand {
  item: {
    outputEvidence: Record<string, unknown>;
  };
}

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
  activeTrial: null,
  artifactDigest: createPortableSkillDigest(root),
  caseSuiteDigest: createSemanticCaseSuiteDigest(caseDefinitions),
  cli: createSemanticCliIdentity(root),
  confirmations: [],
  coverageDigest: createSemanticCoverageDigest(coverage, caseDefinitions),
  evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
  generatedAt: updatedAt,
  hostContract: {
    model: HOST.model,
    name: HOST.name,
    reasoningEffort: HOST.reasoningEffort,
  },
  results: evaluatedCaseIds.map((id, index) => {
    const caseDefinition = caseDefinitions.find(({ id: caseId }) => caseId === id);
    if (caseDefinition === undefined) throw new Error(`Unknown test case ${id}.`);
    const passed = id !== failedCaseId;
    const moldeaOperation =
      caseDefinition.resourceBudget.activation === 'abstain'
        ? null
        : caseDefinition.resourceBudget.activation === 'relationship'
          ? 'scope'
          : 'inspect';
    const moldeaOutputByteCount = moldeaOperation === null ? 0 : 128;
    return {
      actorCommandPolicyEvidence: {
        completedCommandCount: 1,
      },
      actorExecutionEvidence: [
        {
          eventType: 'item.completed',
          item: {
            commandKind: moldeaOperation === null ? 'other' : 'moldea',
            exitCode: 0,
            outputEvidence: {
              byteCount: moldeaOutputByteCount,
              disposition: moldeaOperation === null ? 'empty' : 'projected',
              facts:
                moldeaOperation === null
                  ? []
                  : [
                      {
                        cliVersion: createSemanticCliIdentity(root).version,
                        command: moldeaOperation,
                        containsContent: false,
                        errorPresent: false,
                        hasNextPage: false,
                        kind: 'moldea-cli-envelope',
                        pageRecordCount: 1,
                        relevant: moldeaOperation === 'scope' ? true : null,
                        resultPresent: true,
                        schemaVersion: createSemanticCliIdentity(root).jsonSchemaVersion,
                        status: 'valid',
                      },
                    ],
            },
            status: 'completed',
            type: 'command_execution',
          },
        },
      ],
      actorResourceEvidence: {
        commandCount: moldeaOperation === null ? 0 : 1,
        maximumInvocationByteCount: moldeaOutputByteCount,
        modelVisibleToolOutputByteCount: moldeaOutputByteCount,
        operations: moldeaOperation === null ? [] : [moldeaOperation],
        stdoutByteCount: moldeaOutputByteCount,
      },
      actorHost: index === 0 ? HOST : UPDATED_HOST,
      actorResponse: `Recorded actor replay for ${id}.`,
      caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
      caseId: id,
      evaluatedAt: updatedAt,
      forbidden: [],
      id,
      judgeHost: index === 0 ? HOST : UPDATED_HOST,
      observed: passed ? getSemanticCriterionLabels(caseDefinition.expected) : [],
      passed,
      rationale: passed
        ? 'The recorded response satisfies every declared criterion.'
        : 'The recorded response misses one declared criterion.',
      scenarioEvidence: [
        {
          observation: {
            content: caseDefinition.input.developerDirection,
            type: 'developer-direction',
          },
          source: { kind: 'developer-direction' },
        },
      ],
      workspaceChanges: { created: [], deleted: [], modified: [] },
    };
  }),
  schemaVersion: 6,
  updatedAt,
});

const recordCandidate = async (
  root: string,
  candidate: Record<string, unknown>,
  totalCaseCount: number,
  stopReason: 'case-failure' | 'complete' | 'confirmations-passed',
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

const getFirstReplayCommand = (candidate: Record<string, unknown>): IMutableReplayCommand => {
  const [result] = candidate['results'] as Array<{
    actorExecutionEvidence: IMutableReplayCommand[];
  }>;
  const command = result?.actorExecutionEvidence[0];
  if (command === undefined) throw new Error('Expected one replay command.');
  return command;
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
    expect(model.hasAttempt).toBe(true);
    expect(model.evidenceMatch).toBe('exact');
    expect(model.currentAssurance?.result.attemptId).toBe(model.latest?.result.attemptId);
    expect(model.latest?.rawAttemptUrl).toContain(
      `/attempts/${model.latest?.result.attemptId}/attempt.json`,
    );
    expect(model.latest?.rawEvidenceUrl).toContain(
      `/attempts/${model.latest?.result.attemptId}/evidence.json`,
    );
    expect(model.caseCount).toBe(cases.length);
    expect(model.passedCaseCount).toBe(cases.length);
    expect(model.groups.flatMap(({ cases: groupCases }) => groupCases)).toHaveLength(cases.length);
    expect(model.groups[0]?.cases[0]?.replay?.trials[0]?.steps).toContainEqual({
      content: `Recorded actor replay for ${cases[0]?.id}.`,
      kind: 'message',
      role: 'coding-agent',
      source: 'recorded',
    });
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
    expect(model.hasAttempt).toBe(true);
    expect(model.evidenceMatch).toBe('exact');
    expect(model.currentAssurance?.result.attemptId).toBe(model.latest?.result.attemptId);
    expect(model.latest?.result.attemptId).not.toBe(model.lastPassing?.result.attemptId);
  });

  test('publishes mixed per-trial Codex versions from current attempt summaries', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
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

    expect(model.latest?.result.schemaVersion).toBe(4);
    expect(model.latest?.cases[0]?.trials[0]?.actorCommandPolicyEvidence).toStrictEqual({
      completedCommandCount: 1,
    });
    expect(model.latest?.cases[0]?.trials[0]?.actorHost.version).toBe(HOST.version);
    expect(model.latest?.cases[1]?.trials[0]?.actorHost.version).toBe(UPDATED_HOST.version);
  });

  test('publishes confirmation replay in immutable trial order', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    const caseDefinition = cases[0];
    if (caseDefinition === undefined) throw new Error('Expected one semantic case.');
    const candidate = createCandidate(
      root,
      cases,
      coverage,
      [caseDefinition.id],
      caseDefinition.id,
      '2026-08-25T13:00:00.000Z',
    );
    const [initialResult] = candidate['results'] as Array<Record<string, unknown>>;
    if (initialResult === undefined) throw new Error('Expected one initial semantic result.');
    candidate['confirmations'] = [
      {
        ...initialResult,
        actorResponse: 'Confirmation one passed.',
        confirmationIndex: 1,
        evaluatedAt: '2026-08-25T13:01:00.000Z',
        observed: getSemanticCriterionLabels(caseDefinition.expected),
        passed: true,
        rationale: 'Confirmation one satisfied every criterion.',
      },
      {
        ...initialResult,
        actorResponse: 'Confirmation two passed.',
        confirmationIndex: 2,
        evaluatedAt: '2026-08-25T13:02:00.000Z',
        observed: getSemanticCriterionLabels(caseDefinition.expected),
        passed: true,
        rationale: 'Confirmation two satisfied every criterion.',
      },
    ];
    await recordCandidate(root, candidate, cases.length, 'confirmations-passed');

    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.latest?.cases[0]?.status).toBe('recovered');
    expect(model.latest?.cases[0]?.replay?.trials.map(({ id }) => id)).toStrictEqual([
      'initial',
      'confirmation-1',
      'confirmation-2',
    ]);
  });

  test('rejects malformed replay evidence even when summary fields remain valid', async () => {
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
    const [result] = candidate['results'] as Array<Record<string, unknown>>;
    if (result === undefined) throw new Error('Expected one semantic result.');
    result['actorResponse'] = undefined;
    await recordCandidate(root, candidate, cases.length, 'case-failure');

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(/actorResponse/u);
  });

  test.each([
    [
      'a mismatched moldea CLI version',
      (cli: ReturnType<typeof createSemanticCliIdentity>) => ({
        byteCount: 24,
        disposition: 'projected',
        facts: [
          {
            cliVersion: '999.0.0',
            command: 'inspect',
            containsContent: false,
            errorPresent: false,
            hasNextPage: false,
            kind: 'moldea-cli-envelope',
            pageRecordCount: 1,
            relevant: null,
            resultPresent: true,
            schemaVersion: cli.jsonSchemaVersion,
            status: 'valid',
          },
        ],
      }),
    ],
    [
      'an oversized projected result',
      (cli: ReturnType<typeof createSemanticCliIdentity>) => ({
        byteCount: 1_048_577,
        disposition: 'projected',
        facts: [
          {
            cliVersion: cli.version,
            command: 'inspect',
            containsContent: false,
            errorPresent: false,
            hasNextPage: false,
            kind: 'moldea-cli-envelope',
            pageRecordCount: 1,
            relevant: null,
            resultPresent: true,
            schemaVersion: cli.jsonSchemaVersion,
            status: 'valid',
          },
        ],
      }),
    ],
    [
      'an oversized unrecognized result',
      () => ({ byteCount: 32_769, disposition: 'unrecognized', facts: [] }),
    ],
  ] satisfies Array<
    [string, (cli: ReturnType<typeof createSemanticCliIdentity>) => Record<string, unknown>]
  >)('rejects replay command evidence with %s', async (_, createOutputEvidence) => {
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
    getFirstReplayCommand(candidate).item.outputEvidence = createOutputEvidence(
      createSemanticCliIdentity(root),
    );
    await recordCandidate(root, candidate, cases.length, 'case-failure');

    expect(() => loadSemanticEvaluationWebsiteModel(root)).toThrow(
      /unsupported actor execution evidence/u,
    );
  });

  test('accepts bounded whitespace-only command output recorded as empty', async () => {
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
    getFirstReplayCommand(candidate).item.outputEvidence = {
      byteCount: 3,
      disposition: 'empty',
      facts: [],
    };
    await recordCandidate(root, candidate, cases.length, 'case-failure');

    expect(loadSemanticEvaluationWebsiteModel(root).latest?.cases[0]?.replay).not.toBeNull();
  });

  test('keeps recorded replay bound to its recorded case definition', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    const originalCaseDefinition = cases[0];
    if (originalCaseDefinition === undefined) throw new Error('Expected one semantic case.');
    const originalDeveloperDirection = originalCaseDefinition.input.developerDirection;
    await recordCandidate(
      root,
      createCandidate(
        root,
        cases,
        coverage,
        [originalCaseDefinition.id],
        originalCaseDefinition.id,
        '2026-08-25T13:00:00.000Z',
      ),
      cases.length,
      'case-failure',
    );

    const fixturePath = join(root, 'fixtures/conformance-cases.json');
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      semanticCases: ISemanticCaseDefinition[];
    };
    const changedCaseDefinition = fixture.semanticCases.find(
      ({ id }) => id === originalCaseDefinition.id,
    );
    if (changedCaseDefinition === undefined)
      throw new Error('Expected the recorded semantic case.');
    changedCaseDefinition.input.developerDirection =
      'Use the revised developer direction for future evaluations.';
    writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

    const model = loadSemanticEvaluationWebsiteModel(root);
    const recordedCase = model.attempts[0]?.cases.find(
      ({ id }) => id === originalCaseDefinition.id,
    );
    const currentCase = model.groups
      .flatMap(({ cases: groupCases }) => groupCases)
      .find(({ id }) => id === originalCaseDefinition.id);

    expect(recordedCase).toMatchObject({
      developerDirection: originalDeveloperDirection,
      expectedCriteria: [],
      forbiddenCriteria: [],
      hasCurrentCaseDefinition: false,
      status: 'failed',
      title: originalCaseDefinition.id,
    });
    expect(recordedCase?.replay?.trials[0]?.steps[0]).toMatchObject({
      content: originalDeveloperDirection,
      role: 'developer',
    });
    expect(currentCase).toMatchObject({
      developerDirection: changedCaseDefinition.input.developerDirection,
      hasCurrentCaseDefinition: true,
      status: 'pending',
    });
  });

  test('rejects malformed current trial host provenance', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    await recordCandidate(
      root,
      createCandidate(
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

  test('publishes a transparent empty state before the first semantic attempt', () => {
    const root = createTemporaryRoot();

    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.status).toBe('not-recorded');
    expect(model.hasAttempt).toBe(false);
    expect(model.currentAssurance).toBeNull();
    expect(model.evidenceMatch).toBeNull();
    expect(model.attempts).toStrictEqual([]);
    expect(model.latest).toBeNull();
    expect(model.latestPointer).toBeNull();
    expect(model.evaluatedAt).toBeNull();
    expect(model.pendingCaseCount).toBe(model.caseCount);
  });
});
