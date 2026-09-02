// canonical instruction path consumed by the custom-runtime factory
const ORDER_TRIAGE_INSTRUCTION_PATH = '/moldea/agents/order-triage/instruction.md' as const;

// runtime-owned boundary for resolving canonical instruction content
type ILoadCanonicalInstruction = (
  instructionPath: typeof ORDER_TRIAGE_INSTRUCTION_PATH,
) => Promise<string>;

/**
 * Creates the deterministic qualification agent from canonical instruction content.
 * @param loadCanonicalInstruction The runtime-owned canonical instruction loader.
 * @returns A promise resolving to the grounded order-triage agent.
 */
export const createOrderTriageAgent = async (
  loadCanonicalInstruction: ILoadCanonicalInstruction,
) => ({
  id: 'order-triage',
  instruction: await loadCanonicalInstruction(ORDER_TRIAGE_INSTRUCTION_PATH),
  canApproveRefunds: false,
  action: 'classify-for-human-review',
});
