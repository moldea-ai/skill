// @vitest-environment node
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { FakeCodexHost } from '../codex-host/index.ts';
import type { IQualificationCommandPolicyEvidence } from '../contracts/index.ts';
import { getLocalAttemptDirectory } from '../execution/index.ts';
import * as repositoryState from '../repository-state/index.ts';
import { readQualificationDiagnosticState, runQualificationDiagnosticBatch } from './runner.ts';
import {
  QualificationDiagnosticCheckpointSchema,
  QualificationDiagnosticLedgerSchema,
} from './types.ts';

const emptyCommandPolicy: IQualificationCommandPolicyEvidence = {
  completedCommandCount: 0,
  credentialExposure: { status: 'not-observed', observedCount: 0, reasons: [] },
  maximumCommandOutputByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  moldeaCommandCount: 0,
  moldeaOutputByteCount: 0,
  networkAccess: {
    status: 'not-observed',
    observedCount: 0,
    indeterminateCount: 0,
    reasons: [],
  },
  sensitiveAccess: {
    status: 'not-observed',
    observedCount: 0,
    indeterminateCount: 0,
    reasons: [],
  },
};

describe('qualification diagnostic batch execution', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    vi.restoreAllMocks();

    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('collects selected cases without publishing evidence or retaining terminal attempts', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-batch-'));
    const checkpointPath = path.join(temporaryRoot, 'checkpoint.json');
    const ledgerPath = path.join(temporaryRoot, 'ledger.json');
    const resultsRoot = path.join(temporaryRoot, 'results');
    const caseIds = ['evaluate-aligned-project', 'answer-information-before-adoption'];
    const inspectRepositoryState = repositoryState.inspectGitRepositoryState;
    const repositoryStateSpy = vi
      .spyOn(repositoryState, 'inspectGitRepositoryState')
      .mockImplementation(async (repositoryRoot, options) => ({
        ...(await inspectRepositoryState(repositoryRoot, options)),
        isDirty: false,
      }));
    const host = new FakeCodexHost({
      actor: (input) =>
        Promise.resolve({
          output: {
            outcome: input.scenario.expectedActorOutcome,
            summary: `Completed ${input.caseId}.`,
            changedFiles: input.scenario.workspace.allowedChangePaths,
            observations: [],
            unresolved: [],
          },
          usage: { cachedInputTokens: 0, inputTokens: 1, outputTokens: 1 },
          durationMs: 0,
          commandPolicy: emptyCommandPolicy,
          events: '',
        }),
      judge: (input) =>
        Promise.resolve({
          output: {
            verdict: input.caseId === caseIds[0] ? 'fail' : 'pass',
            summary:
              input.caseId === caseIds[0]
                ? `Rejected ${input.caseId}.`
                : `Accepted ${input.caseId}.`,
            requirements: input.scenario.judgeRequirements
              .filter((requirement) => requirement.evaluation.kind === 'judge')
              .map(({ id }) => ({
                id,
                verdict: input.caseId === caseIds[0] ? ('fail' as const) : ('pass' as const),
                evidence:
                  input.caseId === caseIds[0]
                    ? 'The fixture judge rejected this requirement.'
                    : 'The deterministic fixture evidence passed.',
              })),
            failures: input.caseId === caseIds[0] ? ['The fixture judge rejected this case.'] : [],
          },
          usage: { cachedInputTokens: 0, inputTokens: 1, outputTokens: 1 },
          durationMs: 0,
          commandPolicy: emptyCommandPolicy,
          events: '',
        }),
    });
    const requestPaidExecutionApproval = vi.fn(() => Promise.resolve(true));
    const outcome = await runQualificationDiagnosticBatch({
      host,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      selector: { kind: 'cases', value: caseIds.join(',') },
      checkpointPath,
      ledgerPath,
      resultsRoot,
      requestPaidExecutionApproval,
    });
    repositoryStateSpy.mockRestore();

    expect(outcome).toMatchObject({
      status: 'completed',
      activeAttemptIds: [],
      selector: { kind: 'cases', caseIds },
    });
    expect(outcome.records).toHaveLength(caseIds.length);
    expect(outcome.records.map(({ caseId }) => caseId)).toStrictEqual(caseIds);
    expect(outcome.records.map(({ verdict }) => verdict)).toStrictEqual(['failed', 'passed']);
    expect(requestPaidExecutionApproval).toHaveBeenCalledOnce();
    expect(requestPaidExecutionApproval).toHaveBeenCalledWith({
      actorReasoningEffort: 'xhigh',
      candidateCount: 1,
      candidateTokensConsumed: 0,
      directCaseCount: 2,
      judgeReasoningEffort: 'xhigh',
      maximumCallCount: 8,
      maximumTokenCount: 32_000_000,
      maximumTokensPerCall: 2_097_152,
      model: 'gpt-5.6-sol',
      plannedCallCount: 4,
      reusedCaseCount: 0,
    });
    await expect(access(checkpointPath)).rejects.toThrow();
    await expect(access(resultsRoot)).rejects.toThrow();

    const ledger = await readQualificationDiagnosticState(
      ledgerPath,
      QualificationDiagnosticLedgerSchema,
    );
    expect(ledger?.records).toStrictEqual(outcome.records);
    expect((await readFile(ledgerPath)).byteLength).toBeLessThanOrEqual(1_048_576);

    for (const record of outcome.records) {
      await expect(access(getLocalAttemptDirectory(record.attemptId))).rejects.toThrow();
    }
  }, 120_000);

  test('records a bounded stop when preflight cannot produce a diagnostic case', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-batch-'));
    const checkpointPath = path.join(temporaryRoot, 'checkpoint.json');
    const ledgerPath = path.join(temporaryRoot, 'ledger.json');
    const resultsRoot = path.join(temporaryRoot, 'results');
    const caseId = 'evaluate-aligned-project';
    const inspectRepositoryState = repositoryState.inspectGitRepositoryState;
    const repositoryStateSpy = vi
      .spyOn(repositoryState, 'inspectGitRepositoryState')
      .mockImplementation(async (repositoryRoot, options) => ({
        ...(await inspectRepositoryState(repositoryRoot, options)),
        isDirty: options?.includedRelativePathPrefixes !== undefined,
      }));

    try {
      await expect(
        runQualificationDiagnosticBatch({
          host: new FakeCodexHost(),
          selection: { adapterId: 'custom', implementationId: 'custom' },
          selector: { kind: 'cases', value: caseId },
          checkpointPath,
          ledgerPath,
          resultsRoot,
          requestPaidExecutionApproval: () => Promise.resolve(true),
        }),
      ).rejects.toThrow(
        `Qualification diagnostic case ${caseId} did not produce one matching terminal case`,
      );
    } finally {
      repositoryStateSpy.mockRestore();
    }

    const checkpoint = await readQualificationDiagnosticState(
      checkpointPath,
      QualificationDiagnosticCheckpointSchema,
    );
    expect(checkpoint?.stop).toMatchObject({
      kind: 'execution-error',
      caseId,
      attemptId: checkpoint?.attemptIds[caseId],
    });
    expect(checkpoint?.candidateTokensConsumed).toBe(0);
    await expect(access(resultsRoot)).rejects.toThrow();

    const attemptId = checkpoint?.attemptIds[caseId];
    if (attemptId !== undefined) {
      await rm(getLocalAttemptDirectory(attemptId), {
        force: true,
        recursive: true,
      });
    }
  }, 120_000);
});
