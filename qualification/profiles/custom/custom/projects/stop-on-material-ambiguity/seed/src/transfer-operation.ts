export type ITransferOperation = {
  amount: string;
  destinationId: string;
};

/**
 * Returns the transfer request until the product selects preview or execution semantics.
 * @param operation The unresolved transfer operation.
 * @returns The unchanged operation.
 */
export const processTransferOperation = (operation: ITransferOperation): ITransferOperation =>
  operation;
