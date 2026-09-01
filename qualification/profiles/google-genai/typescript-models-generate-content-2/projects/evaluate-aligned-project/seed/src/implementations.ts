export const findOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    orderId,
    status: 'processing',
  });
