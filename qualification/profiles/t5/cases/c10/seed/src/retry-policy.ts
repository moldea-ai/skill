export const shouldRetry = (status: number): boolean => status === 429 || status >= 500;
