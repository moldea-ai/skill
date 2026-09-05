// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const promptMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@inquirer/prompts', () => promptMocks);

import { confirmPaidQualificationExecution } from './interactive.ts';

describe('paid qualification confirmation', () => {
  beforeEach(() => {
    promptMocks.confirm.mockReset();
    promptMocks.confirm.mockResolvedValue(true);
  });

  test.each([
    [48, 96],
    [60, 120],
  ])(
    'warns about the %d-call paid execution boundary',
    async (plannedCallCount, maximumCallCount) => {
      await expect(
        confirmPaidQualificationExecution(
          plannedCallCount,
          maximumCallCount,
          maximumCallCount * 262_144,
        ),
      ).resolves.toBe(true);
      expect(promptMocks.confirm).toHaveBeenCalledWith({
        message: `This attempt plans up to ${plannedCallCount} paid frontier-model calls and can make at most ${maximumCallCount} calls including bounded operational retries, with at most ${maximumCallCount * 262_144} total tokens across that envelope (gpt-5.6-sol, medium reasoning effort). Continue?`,
        default: false,
      });
    },
  );
});
