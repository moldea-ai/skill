// @vitest-environment node
import { afterEach, describe, expect, test, vi } from 'vitest';

import { QUALIFICATION_EVIDENCE_PROTOCOL_VERSION } from '../constants/index.ts';
import type { IQualificationAttemptResult } from '../contracts/index.ts';
import type { IRunQualificationOptions } from '../execution/index.ts';

const executionMocks = vi.hoisted(() => ({
  runQualification: vi.fn(),
}));
const statusMocks = vi.hoisted(() => ({
  loadQualificationStatusPage: vi.fn(),
}));

vi.mock('../execution/index.ts', async () => {
  const actual = await vi.importActual('../execution/index.ts');
  return { ...actual, runQualification: executionMocks.runQualification };
});
vi.mock('../status/index.ts', async () => {
  const actual = await vi.importActual('../status/index.ts');
  return { ...actual, loadQualificationStatusPage: statusMocks.loadQualificationStatusPage };
});

import { executeQualificationCommand } from './runner.ts';

describe('qualification command runner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    executionMocks.runQualification.mockReset();
    statusMocks.loadQualificationStatusPage.mockReset();
  });

  test('emits the bounded status page and forwards its opaque cursor', async () => {
    const page = {
      formatVersion: 1 as const,
      scope: 'all' as const,
      snapshot: 'a'.repeat(64),
      counts: { attempts: 0, unavailableAttempts: 0, latestResults: 0, total: 0 },
      records: [],
      nextCursor: null,
    };
    statusMocks.loadQualificationStatusPage.mockResolvedValue(page);
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await expect(
      executeQualificationCommand({
        kind: 'status',
        cursor: 'opaque-cursor',
        isAll: true,
        isJson: true,
      }),
    ).resolves.toBe(0);

    expect(statusMocks.loadQualificationStatusPage).toHaveBeenCalledWith({
      cursor: 'opaque-cursor',
      isAll: true,
    });
    expect(
      JSON.parse(stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join('')),
    ).toStrictEqual(page);
  });

  test('keeps retry progress on stderr while emitting parseable JSON on stdout', async () => {
    const retry = {
      category: 'timed-out' as const,
      failedAt: '2026-08-28T12:00:00.000Z',
      failureCount: 1,
      retryDelayMs: 5_000,
    };
    const result = {
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      attemptId: 'attempt-json',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      status: 'passed',
      mode: 'dry-run',
      summary: 'Qualification passed with one recovered case.',
      cases: [
        {
          caseId: 'evaluate-aligned-project',
          status: 'recovered',
          confirmationStatus: 'passed',
          trials: [],
        },
      ],
      stages: [{ operationalRetries: [retry] }],
    } as unknown as IQualificationAttemptResult;
    executionMocks.runQualification.mockImplementation(
      async (options: IRunQualificationOptions) => {
        await expect(
          options.requestPaidExecutionApproval?.({
            candidateTokensConsumed: 0,
            directCaseCount: 10,
            plannedCallCount: 60,
            maximumCallCount: 120,
            maximumTokenCount: 32_000_000,
            maximumTokensPerCall: 2_097_152,
            model: 'gpt-5.6-sol',
            actorReasoningEffort: 'xhigh',
            judgeReasoningEffort: 'xhigh',
            reusedCaseCount: 2,
          }),
        ).resolves.toBe(true);
        await options.onProgress?.({
          kind: 'operational-retry',
          caseId: 'evaluate-aligned-project',
          retry,
          role: 'judge',
          stageId: 'case:evaluate-aligned-project:trial:initial:judge',
          trialId: 'initial',
        });
        return {
          attemptDirectory: '/attempts/attempt-json',
          result,
          wasRecorded: false,
        };
      },
    );
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await expect(
      executeQualificationCommand({
        kind: 'run',
        selection: { adapterId: 'custom', implementationId: 'custom' },
        isDryRun: true,
        reuseEvidence: true,
        hasConfirmedPaidExecution: true,
        isJson: true,
      }),
    ).resolves.toBe(0);

    const stdout = stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join('');
    const stderr = stderrWrite.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(JSON.parse(stdout)).toStrictEqual({
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      attemptId: 'attempt-json',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      status: 'passed',
      mode: 'dry-run',
      summary: 'Qualification passed with one recovered case.',
      attemptDirectory: '/attempts/attempt-json',
      caseResults: [
        {
          caseId: 'evaluate-aligned-project',
          status: 'recovered',
          confirmationStatus: 'passed',
        },
      ],
      counts: {
        cases: 1,
        recoveredCases: 1,
        operationalRetries: 1,
        unevaluatedRequirements: 0,
      },
      preflightPassed: true,
      unevaluatedRequirementIds: [],
      wasRecorded: false,
    });
    expect(stderr).toBe(
      'Qualification paid boundary: 60 planned calls, 120 maximum calls, 2097152 tokens per call, 32000000 candidate tokens; 2 reused cases, 10 direct cases, 0 tokens already consumed.\n' +
        'Qualification evaluate-aligned-project initial judge retry 1: timed-out; waiting 5000 ms.\n',
    );
    expect(stdout).not.toContain('retry 1');
  });

  test('runs a selected diagnostic case with the two-call and four-call approval boundary', async () => {
    const result = {
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      attemptId: 'attempt-diagnostic',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      status: 'passed',
      mode: 'diagnostic',
      summary: 'Diagnostic case passed.',
      cases: [
        {
          caseId: 'stop-on-material-ambiguity',
          status: 'passed',
          confirmationStatus: 'not-required',
          trials: [{ requirementAssessments: [] }],
        },
      ],
      stages: [],
    } as unknown as IQualificationAttemptResult;
    executionMocks.runQualification.mockImplementation(
      async (options: IRunQualificationOptions) => {
        expect(options).toMatchObject({
          caseId: 'stop-on-material-ambiguity',
          mode: 'diagnostic',
          selection: { adapterId: 'custom', implementationId: 'custom' },
          reuseEvidence: false,
        });
        await expect(
          options.requestPaidExecutionApproval?.({
            candidateTokensConsumed: 0,
            directCaseCount: 1,
            plannedCallCount: 2,
            maximumCallCount: 4,
            maximumTokenCount: 8_388_608,
            maximumTokensPerCall: 2_097_152,
            model: 'gpt-5.6-sol',
            actorReasoningEffort: 'xhigh',
            judgeReasoningEffort: 'xhigh',
            reusedCaseCount: 0,
          }),
        ).resolves.toBe(true);
        return {
          attemptDirectory: '/attempts/attempt-diagnostic',
          result,
          wasRecorded: false,
        };
      },
    );
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await expect(
      executeQualificationCommand({
        kind: 'diagnose',
        selection: { adapterId: 'custom', implementationId: 'custom' },
        caseId: 'stop-on-material-ambiguity',
        hasConfirmedPaidExecution: true,
        isJson: true,
      }),
    ).resolves.toBe(0);

    expect(
      JSON.parse(stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join('')),
    ).toStrictEqual({
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      attemptId: 'attempt-diagnostic',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      status: 'passed',
      mode: 'diagnostic',
      summary: 'Diagnostic case passed.',
      attemptDirectory: '/attempts/attempt-diagnostic',
      caseResults: [
        {
          caseId: 'stop-on-material-ambiguity',
          status: 'passed',
          confirmationStatus: 'not-required',
        },
      ],
      counts: {
        cases: 1,
        recoveredCases: 0,
        operationalRetries: 0,
        unevaluatedRequirements: 0,
      },
      wasRecorded: false,
    });
  });
});
