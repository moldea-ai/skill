Complete the project task below in the current Git working tree:

# Create the order-triage agent

Create and register the Moldea agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Vercel AI SDK wrapper, its instruction loader, structured output, and the `classify_order` function tool to their exact existing symbols. Add no redundant runtime guide and do not invent provider, model, routing, handoff, subagent, input-schema, or refund authority. Validate the complete project.

Execution rules:

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under `.agents/skills/moldea/` or `.moldea-qualification/`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
