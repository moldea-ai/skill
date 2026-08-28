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

  test.each([48, 60])('warns about the %d-call paid execution boundary', async (callCount) => {
    await expect(confirmPaidQualificationExecution(callCount)).resolves.toBe(true);
    expect(promptMocks.confirm).toHaveBeenCalledWith({
      message: `This attempt can make up to ${callCount} planned paid frontier-model calls (gpt-5.6-sol, medium reasoning effort). Operational retries after transient provider, network, or timeout failures can add calls. Continue?`,
      default: false,
    });
  });
});
