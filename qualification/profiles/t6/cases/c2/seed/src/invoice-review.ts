export const reviewInvoice = (total: number, expectedTotal: number) => ({
  difference: total - expectedTotal,
  requiresOperatorReview: total !== expectedTotal,
});
