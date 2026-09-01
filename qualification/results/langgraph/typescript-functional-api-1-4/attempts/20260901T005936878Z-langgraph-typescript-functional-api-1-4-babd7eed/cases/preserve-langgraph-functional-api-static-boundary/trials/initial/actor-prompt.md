Complete the project task below in the current Git working tree:

# Document the LangGraph Functional API static boundaries

Evaluate the existing support workflows and preserve their working implementation. `supportWorkflow` directly calls a task, reads previous state, interrupts for human input, and separates its returned and saved values. `dynamicSupportWorkflow` chooses tasks from runtime input and reaches task calls through callbacks and a helper. The project also uses TypeScript input and result types while leaving checkpointer, replay, idempotency, interrupt, and approval behavior to runtime configuration.

Update canonical state to record exactly what static inspection cannot prove. Preserve both proved runtime-agent bindings without inventing schema relationships. Keep nested calls, dynamic control flow, task capabilities, routing, and runtime semantics unresolved without adding tools, skills, handoffs, subagents, approval authority, or topology claims. Add one concise project-local runtime guide, preserve all source, and validate the final project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
