/** Returns the current status used by the call-prepared support agent. */
export const getSupportStatus = ({ orderId }: { orderId: string }): { status: string } => ({
  status: `${orderId}:ready`,
});
