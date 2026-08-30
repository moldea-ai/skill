export const ClassifyOrderInputSchema = {
  additionalProperties: false,
  properties: { orderId: { type: 'string' } },
  required: ['orderId'],
  type: 'object' as const,
};
