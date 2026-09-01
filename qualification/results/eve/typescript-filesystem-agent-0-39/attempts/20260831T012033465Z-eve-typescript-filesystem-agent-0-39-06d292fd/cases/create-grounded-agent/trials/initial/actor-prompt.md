Complete the project task below in the current Git working tree:

# Create the order-triage agent

Add the order-triage agent implemented by the nested Eve definition in `agent/agent.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the exact filesystem agent, its exclusive TypeScript instruction loader, output schema, `classify_order` tool, and `review_policy` TypeScript skill to their existing source symbols and path-derived registrations. Add no redundant runtime guide and do not invent provider, model, routing, remote-agent, extension, connection, or refund authority. Validate the complete project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
