// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

import type { IQualificationPaidExecutionRequest } from './types.ts';
import { coalesceQualificationPaidExecutionApproval } from './paid-approval.ts';

const request: IQualificationPaidExecutionRequest = {
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
};

describe('coalesceQualificationPaidExecutionApproval', () => {
  test('shares one pending decision across concurrent workers', async () => {
    const requestApproval = vi.fn(() => Promise.resolve(true));
    const sharedApproval = coalesceQualificationPaidExecutionApproval(requestApproval);

    await expect(
      Promise.all([
        sharedApproval?.(request),
        sharedApproval?.(request),
        sharedApproval?.(request),
      ]),
    ).resolves.toStrictEqual([true, true, true]);
    expect(requestApproval).toHaveBeenCalledTimes(1);
  });

  test('presents one aggregate request for concurrent workers', async () => {
    const requestApproval = vi.fn(() => Promise.resolve(true));
    const aggregateRequest = {
      ...request,
      candidateCount: 4,
      directCaseCount: 8,
      maximumTokenCount: 128_000_000,
    };
    const sharedApproval = coalesceQualificationPaidExecutionApproval(
      requestApproval,
      aggregateRequest,
    );

    await expect(
      Promise.all([sharedApproval?.(request), sharedApproval?.(request)]),
    ).resolves.toStrictEqual([true, true]);
    expect(requestApproval).toHaveBeenCalledOnce();
    expect(requestApproval).toHaveBeenCalledWith(aggregateRequest);
  });

  test('preserves the absent approval boundary', () => {
    expect(coalesceQualificationPaidExecutionApproval(undefined)).toBeUndefined();
  });
});
