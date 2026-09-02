export const transferOperation = (amount: number, execute: boolean) =>
  execute ? { amount, status: 'submitted' } : { amount, status: 'preview' };
