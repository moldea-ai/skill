export const lookupOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    orderId,
    status: 'processing',
  });
