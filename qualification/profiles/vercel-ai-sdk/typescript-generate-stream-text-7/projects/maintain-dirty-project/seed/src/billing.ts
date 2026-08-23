export const classifyBillingQuestion = (message: string) =>
  message.includes('refund') ? 'refund-review' : 'invoice-question';
