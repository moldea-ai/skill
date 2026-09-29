// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { ICodexEvaluationCommandPolicyEvidence } from '../../execution/host/index.ts';
import type { ISemanticCase } from '../cases/index.ts';
import type {
  ISemanticAttemptRecord,
  ISemanticEvaluationCaseModel,
} from '../public-evidence/index.ts';

import { composeSemanticRecordedCases, type ISemanticSourceRun } from './composition.ts';
import { createSemanticReplay } from './replay.ts';
import type { ISemanticRecordedCase, ISemanticRecordedTrial } from './types.ts';

const SHA256 = 'a'.repeat(64);
const COMMAND_POLICY: ICodexEvaluationCommandPolicyEvidence = {
  completedCommandCount: 0,
  credentialExposure: { observedCount: 0, reasons: [], status: 'not-observed' },
  maximumCommandOutputByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  moldeaCommandCount: 0,
  moldeaOutputByteCount: 0,
  networkAccess: { indeterminateCount: 0, observedCount: 0, reasons: [], status: 'not-observed' },
  sensitiveAccess: { indeterminateCount: 0, observedCount: 0, reasons: [], status: 'not-observed' },
};

const createCase = (id: string, commandLimit = 8): ISemanticCase => ({
  coverageClaimIds: ['bounded-relevance'],
  expected: [{ criterion: 'Report the correct result.', label: 'report-result' }],
  forbidden: [{ criterion: 'Do not invent a result.', label: 'invent-result' }],
  id,
  input: { developerDirection: `Assess ${id}.`, repositoryEvidence: [] },
  operation: 'evaluate',
  resourceBudget: {
    activation: 'direct',
    maximumMoldeaCommands: commandLimit,
    maximumMoldeaOutputBytes: 65_536,
    minimumMoldeaCommands: 0,
  },
  scenario: `Scenario for ${id}.`,
});

const createTrial = (
  definition: ISemanticCase,
  options: { commandCount?: number; passed: boolean },
): ISemanticRecordedTrial => ({
  actorExecutionEvidence: [],
  actorResponse: 'Synthetic actor response.',
  developerDirection: definition.input.developerDirection,
  operationalRetries: { actorFailureCount: 0, judgeFailureCount: 0, lastFailure: null },
  stageIdentities: { actorSha256: SHA256, judgeSha256: SHA256 },
  trial: {
    actorCommandPolicyEvidence: COMMAND_POLICY,
    actorResourceEvidence: {
      commandCount: options.commandCount ?? 0,
      maximumInvocationByteCount: 0,
      modelVisibleToolOutputByteCount: 0,
      operations: Array.from({ length: options.commandCount ?? 0 }, () => 'content' as const),
      stdoutByteCount: 0,
    },
    actorHost: {
      developerInstructionsSha256: SHA256,
      model: 'synthetic-model',
      name: 'synthetic-host',
      reasoningEffort: 'high',
      role: 'actor',
      version: '1.0.0',
    },
    actorUsage: null,
    confirmationEligible: !options.passed,
    confirmationIndex: null,
    dimensions: {
      commandPolicy: true,
      mountIntegrity: true,
      operational: true,
      repositoryControl: true,
      resource: options.passed,
      semantic: options.passed,
    },
    evaluatedAt: '2026-09-29T00:00:00.000Z',
    executionOrigin: 'executed',
    failureClassifications: options.passed ? [] : ['semantic'],
    forbidden: [],
    judgeCommandPolicyEvidence: COMMAND_POLICY,
    judgeHost: {
      developerInstructionsSha256: SHA256,
      model: 'synthetic-model',
      name: 'synthetic-host',
      reasoningEffort: 'high',
      role: 'judge',
      version: '1.0.0',
    },
    judgeUsage: null,
    kind: 'initial',
    observed: options.passed ? ['report-result'] : [],
    passed: options.passed,
    rationale: options.passed ? 'Original passing judgment.' : 'Original failing judgment.',
    stageReuse: null,
  },
  workspaceChanges: { created: [], deleted: [], modified: [] },
});

const createSource = (
  definitions: ISemanticCase[],
  results: Array<{ commandCount?: number; passed: boolean }>,
  attemptId: string,
): ISemanticSourceRun => {
  const cases = definitions.map((definition, index): ISemanticRecordedCase => ({
    confirmationStatus: results[index]?.passed ? 'not-required' : 'not-applicable',
    id: definition.id,
    status: results[index]?.passed ? 'passed' : 'failed',
    trials: [createTrial(definition, results[index] ?? { passed: false })],
  }));
  return {
    attempt: {
      artifactDigest: SHA256,
      attemptId,
      cli: { version: '1.0.0' },
    } as ISemanticAttemptRecord,
    bundle: { run: { version: '1.0.0' } } as ISemanticSourceRun['bundle'],
    caseModels: new Map(
      definitions.map((definition) => [
        definition.id,
        {
          developerDirection: definition.input.developerDirection,
          expectedCriteria: definition.expected,
          forbiddenCriteria: definition.forbidden,
        } as ISemanticEvaluationCaseModel,
      ]),
    ),
    cases: new Map(cases.map((recordedCase) => [recordedCase.id, recordedCase])),
    evidenceSha256: SHA256,
  };
};

describe('semantic composition', () => {
  test('carries reviewed assessment while retaining a changed request as historical evidence', () => {
    const original = [createCase('reviewed'), createCase('replaced')];
    const current = [
      {
        ...original[0]!,
        expected: [{ criterion: 'Report the material result.', label: 'report-result' }],
      },
      {
        ...original[1]!,
        input: { developerDirection: 'Assess the exact changed hunk.', repositoryEvidence: [] },
      },
    ];
    const base = createSource(original, [{ passed: false }, { passed: false }], 'sem-base');
    const review = {
      acceptedCriteria: [],
      caseSources: [],
      formatVersion: 1 as const,
      inputReview: 'The carried actor inputs and fixtures remain unchanged.',
      reassessments: [
        {
          caseId: 'reviewed',
          rationale: 'The recorded response meets the revised outcome criterion.',
        },
      ],
    };
    const preview = composeSemanticRecordedCases({
      definitions: current,
      review,
      sources: [base],
    });
    expect(preview.unresolvedCaseIds).toStrictEqual([]);
    expect(preview.cases.map(({ status }) => status)).toStrictEqual(['passed', 'failed']);
    expect(preview.cases[0]).toMatchObject({
      status: 'passed',
      trials: [{ trial: { executionOrigin: 'carried', passed: true } }],
    });

    const replacement = createSource([current[1]!], [{ passed: true }], 'sem-replacement');
    const composed = composeSemanticRecordedCases({
      definitions: current,
      review,
      sources: [replacement, base],
    });
    expect(composed.unresolvedCaseIds).toStrictEqual([]);
    expect(composed.cases.map(({ status }) => status)).toStrictEqual(['passed', 'passed']);
    expect(composed.cases[0]?.trials[0]?.trial.carriedFrom?.attemptId).toBe('sem-base');
  });

  test('recomputes a former resource-only failure under the current budget', () => {
    const definition = createCase('resource', 8);
    const base = createSource(
      [createCase('resource', 4)],
      [{ commandCount: 5, passed: true }],
      'sem-base',
    );
    const trial = base.cases.get('resource')!.trials[0]!;
    trial.trial.dimensions.resource = false;
    trial.trial.passed = false;
    base.cases.get('resource')!.status = 'failed';

    const composed = composeSemanticRecordedCases({
      definitions: [definition],
      review: {
        acceptedCriteria: [],
        caseSources: [],
        formatVersion: 1,
        inputReview: 'The same actor input remains valid under the new budget.',
        reassessments: [],
      },
      sources: [base],
    });
    expect(composed.unresolvedCaseIds).toStrictEqual([]);
    expect(composed.cases[0]?.trials[0]?.trial).toMatchObject({
      dimensions: { resource: true, semantic: true },
      passed: true,
    });
  });

  test('selects a named source for one case independently of source order', () => {
    const definition = createCase('selected-case');
    const first = createSource([definition], [{ passed: true }], 'sem-first');
    const preferred = createSource([definition], [{ passed: true }], 'sem-preferred');
    const composed = composeSemanticRecordedCases({
      definitions: [definition],
      review: {
        acceptedCriteria: [],
        caseSources: [{ attemptId: 'sem-preferred', caseId: definition.id }],
        formatVersion: 1,
        inputReview: null,
        reassessments: [],
      },
      sources: [first, preferred],
    });

    expect(composed.unresolvedCaseIds).toStrictEqual([]);
    expect(composed.cases[0]?.trials[0]?.trial.carriedFrom).toMatchObject({
      attemptId: 'sem-preferred',
      artifactDigest: SHA256,
      version: '1.0.0',
    });
  });

  test('keeps a passing recorded verdict when current case inputs change', () => {
    const original = createCase('case-one');
    const current = {
      ...original,
      input: { developerDirection: 'A different current request.', repositoryEvidence: [] },
      expected: [{ criterion: 'Changed criterion.', label: 'report-result' }],
    };
    const base = createSource([original], [{ passed: true }], 'sem-base');
    const review = {
      acceptedCriteria: [],
      caseSources: [],
      formatVersion: 1 as const,
      inputReview: 'The carried actor inputs and fixtures remain unchanged.',
      reassessments: [],
    };
    const selected = composeSemanticRecordedCases({
      definitions: [current],
      review,
      sources: [base],
    });
    expect(selected.unresolvedCaseIds).toStrictEqual([]);
    expect(selected.cases[0]?.status).toBe('passed');
    expect(selected.caseModels.get('case-one')?.developerDirection).toBe(
      original.input.developerDirection,
    );
    expect(() =>
      composeSemanticRecordedCases({
        definitions: [original],
        review: {
          ...review,
          acceptedCriteria: [
            { caseId: 'case-one', rationale: 'There is no changed criterion to accept.' },
          ],
        },
        sources: [base],
      }),
    ).toThrow(/no changed criteria/u);
  });

  test('keeps every recorded trial and its original judge verdict after reassessment', () => {
    const definition = createCase('reviewed-history');
    const source = createSource([definition], [{ passed: false }], 'sem-original');
    const recordedCase = source.cases.get(definition.id)!;
    const confirmation = createTrial(definition, { passed: false });
    confirmation.trial.kind = 'confirmation';
    confirmation.trial.confirmationIndex = 1;
    recordedCase.trials.push(confirmation);
    recordedCase.confirmationStatus = 'rejected';

    const selected = composeSemanticRecordedCases({
      definitions: [definition],
      review: {
        acceptedCriteria: [],
        caseSources: [],
        formatVersion: 1,
        inputReview: null,
        reassessments: [
          {
            caseId: definition.id,
            rationale: 'The recorded answer satisfies the reviewed criterion.',
          },
        ],
      },
      sources: [source],
    });
    const selectedCase = selected.cases[0]!;
    const replay = createSemanticReplay(selectedCase);
    const originalVerdict = replay.trials[0]?.steps.find(({ kind }) => kind === 'verdict');

    expect(selectedCase.status).toBe('passed');
    expect(selectedCase.trials).toHaveLength(2);
    expect(replay.trials).toHaveLength(2);
    expect(selectedCase.trials[0]?.trial).toMatchObject({
      carriedFrom: {
        reassessment: 'The recorded answer satisfies the reviewed criterion.',
        recordedVerdict: { passed: false, rationale: 'Original failing judgment.' },
      },
      observed: [],
      passed: true,
      rationale: 'Maintainer reassessment: The recorded answer satisfies the reviewed criterion.',
    });
    expect(originalVerdict).toMatchObject({
      rationale: 'Original failing judgment.',
      role: 'independent-judge',
      status: 'failed',
    });
  });
});
