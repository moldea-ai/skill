Complete the project task below in the current Git working tree:

# Add billing context safely

The support agent now needs durable guidance for billing disputes. Add `moldea/context/billing.md`, register its relationship to the billing implementation, assign it to `support`, and update the canonical instruction so the context is used for refund and invoice questions.

Preserve unrelated tracked and untracked developer work exactly. Keep the direct Vercel AI SDK wrapper, loader, and structured output intact. Validate the final repository and inspect the complete Git diff.

Execution rules:

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under `.agents/skills/moldea/` or `.moldea-qualification/`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
