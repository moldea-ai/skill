// @vitest-environment node
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import { CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256 } from '../../../../tooling/codex-evaluation-host/index.mjs';
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
const ACTOR_HOST = {
  developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  model: 'gpt-5.6-sol',
  name: 'codex',
  reasoningEffort: 'xhigh',
  role: 'actor',
  version: 'codex-cli test',
} as const;
const JUDGE_HOST = {
  ...ACTOR_HOST,
  reasoningEffort: 'xhigh',
  role: 'judge',
} as const;
const UPDATED_ACTOR_HOST = { ...ACTOR_HOST, version: 'codex-cli updated' } as const;
const UPDATED_JUDGE_HOST = { ...JUDGE_HOST, version: 'codex-cli updated' } as const;
const MODEL_USAGE = {
  cachedInputTokens: 0,
  inputTokens: 1,
  outputTokens: 1,
} as const;
const createCommandPolicyEvidence = (completedCommandCount: number) => ({
  completedCommandCount,
  credentialExposure: { status: 'not-observed' as const, observedCount: 0, reasons: [] },
  maximumCommandOutputByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  moldeaCommandCount: 0,
  moldeaOutputByteCount: 0,
  networkAccess: {
    status: 'not-observed' as const,
    observedCount: 0,
    indeterminateCount: 0,
    reasons: [],
  },
  sensitiveAccess: {
    status: 'not-observed' as const,
    observedCount: 0,
    indeterminateCount: 0,
    reasons: [],
  },
});

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
    actor: {
      developerInstructionsSha256: ACTOR_HOST.developerInstructionsSha256,
      model: ACTOR_HOST.model,
      name: ACTOR_HOST.name,
      reasoningEffort: ACTOR_HOST.reasoningEffort,
      role: ACTOR_HOST.role,
    },
    judge: {
      developerInstructionsSha256: JUDGE_HOST.developerInstructionsSha256,
      model: JUDGE_HOST.model,
      name: JUDGE_HOST.name,
      reasoningEffort: JUDGE_HOST.reasoningEffort,
      role: JUDGE_HOST.role,
    },
  },
  results: evaluatedCaseIds.map((id, index) => {
    const caseDefinition = caseDefinitions.find(({ id: caseId }) => caseId === id);
    if (caseDefinition === undefined) throw new Error(`Unknown test case ${id}.`);
    const passed = id !== failedCaseId;
    const moldeaOperation =
      caseDefinition.resourceBudget.activation === 'abstain' ||
      caseDefinition.resourceBudget.activation === 'informational'
        ? null
        : caseDefinition.resourceBudget.activation === 'relationship'
          ? 'scope'
          : 'inspect';
    const moldeaOutputByteCount = moldeaOperation === null ? 0 : 128;
    return {
      actorCommandPolicyEvidence: createCommandPolicyEvidence(1),
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
                        errorCode: null,
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
      actorHost: index === 0 ? ACTOR_HOST : UPDATED_ACTOR_HOST,
      actorUsage: MODEL_USAGE,
      actorResponse: `Recorded actor replay for ${id}.`,
      caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
      caseId: id,
      confirmationEligible: !passed,
      dimensions: {
        semantic: passed,
        resource: true,
        commandPolicy: true,
        repositoryControl: true,
        mountIntegrity: true,
        operational: true,
      },
      evaluatedAt: updatedAt,
      executionOrigin: 'executed',
      forbidden: [],
      failureClassifications: passed ? [] : ['semantic'],
      id,
      judgeCommandPolicyEvidence: createCommandPolicyEvidence(0),
      judgeHost: index === 0 ? JUDGE_HOST : UPDATED_JUDGE_HOST,
      judgeUsage: MODEL_USAGE,
      observed: passed ? getSemanticCriterionLabels(caseDefinition.expected) : [],
      passed,
      rationale: passed
        ? 'The recorded response satisfies every declared criterion.'
        : 'The recorded response misses one declared criterion.',
      stageReuse: null,
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
  schemaVersion: 9,
  updatedAt,
});

const recordCandidate = async (
  root: string,
  candidate: Record<string, unknown>,
  totalCaseCount: number,
  stopReason: 'case-failure' | 'complete' | 'complete-with-failures' | 'confirmations-passed',
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
  test('publishes the transparent empty state before current 74-case evidence exists', () => {
    const root = createTemporaryRoot();
    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.caseCount).toBe(74);
    expect(model.attempts).toStrictEqual([]);
    expect(model.hasAttempt).toBe(false);
    expect(model.latest).toBeNull();
    expect(model.lastPassing).toBeNull();
    expect(model.latestPointer).toBeNull();
    expect(existsSync(join(root, 'fixtures/semantic-evaluation-result.json'))).toBe(false);
  });

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
    expect(
      model.groups
        .flatMap(({ cases: groupCases }) => groupCases)
        .find(({ id }) => id === cases[0]?.id)?.replay?.trials[0]?.steps,
    ).toContainEqual({
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

    expect(model.latest?.result.schemaVersion).toBe(6);
    expect(
      model.latest?.cases.find(({ id }) => id === cases[0]?.id)?.trials[0]
        ?.actorCommandPolicyEvidence,
    ).toStrictEqual(createCommandPolicyEvidence(1));
    expect(
      model.latest?.cases.find(({ id }) => id === cases[0]?.id)?.trials[0]
        ?.judgeCommandPolicyEvidence,
    ).toStrictEqual(createCommandPolicyEvidence(0));
    expect(
      model.latest?.cases.find(({ id }) => id === cases[0]?.id)?.trials[0]?.actorHost.version,
    ).toBe(ACTOR_HOST.version);
    expect(
      model.latest?.cases.find(({ id }) => id === cases[1]?.id)?.trials[0]?.actorHost.version,
    ).toBe(UPDATED_ACTOR_HOST.version);
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
        confirmationEligible: false,
        confirmationIndex: 1,
        dimensions: {
          semantic: true,
          resource: true,
          commandPolicy: true,
          repositoryControl: true,
          mountIntegrity: true,
          operational: true,
        },
        evaluatedAt: '2026-08-25T13:01:00.000Z',
        failureClassifications: [],
        observed: getSemanticCriterionLabels(caseDefinition.expected),
        passed: true,
        rationale: 'Confirmation one satisfied every criterion.',
      },
      {
        ...initialResult,
        actorResponse: 'Confirmation two passed.',
        confirmationEligible: false,
        confirmationIndex: 2,
        dimensions: {
          semantic: true,
          resource: true,
          commandPolicy: true,
          repositoryControl: true,
          mountIntegrity: true,
          operational: true,
        },
        evaluatedAt: '2026-08-25T13:02:00.000Z',
        failureClassifications: [],
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
            errorCode: null,
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
            errorCode: null,
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
      () => ({ byteCount: 131_073, disposition: 'unrecognized', facts: [] }),
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

  test('excludes recorded replay after its case definition leaves the current suite', async () => {
    const root = createTemporaryRoot();
    const { cases, coverage } = loadInputs(root);
    const originalCaseDefinition = cases[0];
    if (originalCaseDefinition === undefined) throw new Error('Expected one semantic case.');
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
    const currentCase = model.groups
      .flatMap(({ cases: groupCases }) => groupCases)
      .find(({ id }) => id === originalCaseDefinition.id);

    expect(model.attempts).toStrictEqual([]);
    expect(model.hasAttempt).toBe(false);
    expect(model.latest).toBeNull();
    expect(model.latestPointer).toBeNull();
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

  test('retains immutable attempt history when the current skill no longer matches it', async () => {
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
    const skillPath = join(root, 'moldea/SKILL.md');
    writeFileSync(
      skillPath,
      `${readFileSync(skillPath, 'utf8')}\nCurrent release change.\n`,
      'utf8',
    );

    const model = loadSemanticEvaluationWebsiteModel(root);

    expect(model.status).toBe('not-recorded');
    expect(model.hasAttempt).toBe(true);
    expect(model.currentAssurance).toBeNull();
    expect(model.evidenceMatch).toBeNull();
    expect(model.attempts).toHaveLength(1);
    expect(model.latest?.result.status).toBe('passed');
    expect(model.passedCaseCount).toBe(0);
    expect(model.pendingCaseCount).toBe(model.caseCount);
  });
});
