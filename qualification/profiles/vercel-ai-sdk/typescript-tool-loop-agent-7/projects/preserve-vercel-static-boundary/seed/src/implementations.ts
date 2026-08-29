import type { ISupportStatusInput, ISupportStatusOutput } from './contracts.js';

/** Returns the current status used by the call-prepared support agent. */
export const getSupportStatus = ({ orderId }: ISupportStatusInput): ISupportStatusOutput => ({
  status: `${orderId}:ready`,
});

/** Returns the current status used by the step-prepared support agent. */
export const getStepSupportStatus = ({ orderId }: ISupportStatusInput): ISupportStatusOutput => ({
  status: `${orderId}:ready`,
});
