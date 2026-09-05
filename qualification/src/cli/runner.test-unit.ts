// @vitest-environment node
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { IQualificationAttemptResult } from '../contracts/index.ts';
import type { IRunQualificationOptions } from '../execution/index.ts';

const executionMocks = vi.hoisted(() => ({
  runQualification: vi.fn(),
}));

vi.mock('../execution/index.ts', async () => {
  const actual = await vi.importActual('../execution/index.ts');
  return { ...actual, runQualification: executionMocks.runQualification };
});

import { executeQualificationCommand } from './runner.ts';

describe('qualification command runner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    executionMocks.runQualification.mockReset();
  });

  test('keeps retry progress on stderr while emitting parseable JSON on stdout', async () => {
    const retry = {
      category: 'timed-out' as const,
      failedAt: '2026-08-28T12:00:00.000Z',
      failureCount: 1,
      retryDelayMs: 5_000,
    };
    const result = {
      protocolVersion: 7,
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
            plannedCallCount: 60,
            maximumCallCount: 120,
            maximumTokenCount: 31_457_280,
            maximumTokensPerCall: 262_144,
            model: 'gpt-5.6-sol',
            reasoningEffort: 'medium',
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
        useCache: true,
        hasConfirmedPaidExecution: true,
        isJson: true,
      }),
    ).resolves.toBe(0);

    const stdout = stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join('');
    const stderr = stderrWrite.mock.calls.map(([chunk]) => String(chunk)).join('');
    expect(JSON.parse(stdout)).toStrictEqual({
      protocolVersion: 7,
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
      'Qualification paid boundary: 60 planned calls, 120 maximum calls, 262144 tokens per call, 31457280 maximum tokens.\n' +
        'Qualification evaluate-aligned-project initial judge retry 1: timed-out; waiting 5000 ms.\n',
    );
    expect(stdout).not.toContain('retry 1');
  });

  test('runs a selected diagnostic case with the two-call and four-call approval boundary', async () => {
    const result = {
      protocolVersion: 7,
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
          useCache: false,
        });
        await expect(
          options.requestPaidExecutionApproval?.({
            plannedCallCount: 2,
            maximumCallCount: 4,
            maximumTokenCount: 1_048_576,
            maximumTokensPerCall: 262_144,
            model: 'gpt-5.6-sol',
            reasoningEffort: 'medium',
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
        useCache: false,
        hasConfirmedPaidExecution: true,
        isJson: true,
      }),
    ).resolves.toBe(0);

    expect(
      JSON.parse(stdoutWrite.mock.calls.map(([chunk]) => String(chunk)).join('')),
    ).toStrictEqual({
      protocolVersion: 7,
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
