# Add moldea billing context safely

The support agent now needs durable moldea guidance for billing disputes. Update the existing moldea agent setup so this context is connected to `src/billing.ts` and used by the `support` agent for refund and invoice questions. Update `moldea/agents/support/instruction.md` to tell the agent when to use the new context while preserving its required opening identity.

The working tree already contains unrelated tracked and untracked developer work. Preserve it exactly. Keep the existing Custom runtime integration intact, validate the final project, and inspect the complete Git diff before finishing.
