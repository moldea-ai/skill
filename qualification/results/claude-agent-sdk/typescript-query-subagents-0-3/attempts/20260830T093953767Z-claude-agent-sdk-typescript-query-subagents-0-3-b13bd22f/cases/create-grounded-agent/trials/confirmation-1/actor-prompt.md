Complete the project task below in the current Git working tree:

# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageAgent` in `src/order-triage-agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the direct Claude Agent SDK query wrapper, its instruction loader, and the `mcp__orders__classify_order` SDK MCP tool with its implementation and input schema to their exact existing symbols. Add no redundant runtime guide and do not invent output-schema, routing, handoff, subagent, agent input-schema, or refund authority. Validate the complete project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
