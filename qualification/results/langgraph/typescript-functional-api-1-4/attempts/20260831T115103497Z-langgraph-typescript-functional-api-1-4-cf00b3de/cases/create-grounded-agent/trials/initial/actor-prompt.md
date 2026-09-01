Complete the project task below in the current Git working tree:

# Create the order-triage agent

Add the order-triage agent implemented by `orderTriageWorkflow` in `src/order-triage-workflow.ts`. Ground its description and instruction in the implementation: it classifies orders for human review and cannot approve refunds.

Bind the directly exported Functional API entrypoint to its exact existing symbol. Treat its task and interrupt as runtime patterns, not a manifest tool, skill, subagent, handoff, routing target, or approval authority. TypeScript types are not executable schemas. Add no redundant runtime guide and do not invent provider, model, or refund authority. Validate the complete project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
