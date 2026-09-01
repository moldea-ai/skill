export const lookupOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    content: [
      {
        text: JSON.stringify({ orderId, status: 'processing' }),
        type: 'text' as const,
      },
    ],
  });
