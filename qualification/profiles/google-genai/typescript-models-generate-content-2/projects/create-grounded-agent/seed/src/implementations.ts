export const classifyOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    category: orderId.startsWith('R-') ? ('refund-review' as const) : ('fulfillment' as const),
  });
