export type IInvoiceLine = {
  reference: string;
  amountInCents: number;
};

export const findDuplicateInvoiceReferences = (lines: IInvoiceLine[]): string[] => {
  const observedReferences = new Set<string>();
  const duplicateReferences = new Set<string>();

  for (const line of lines) {
    if (observedReferences.has(line.reference)) duplicateReferences.add(line.reference);
    observedReferences.add(line.reference);
  }

  return [...duplicateReferences].sort();
};
