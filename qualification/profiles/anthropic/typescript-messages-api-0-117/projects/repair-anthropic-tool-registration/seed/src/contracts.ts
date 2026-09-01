export const LookupOrderInputSchema = {
  additionalProperties: false,
  properties: { orderId: { type: 'string' } },
  required: ['orderId'],
  type: 'object' as const,
};
