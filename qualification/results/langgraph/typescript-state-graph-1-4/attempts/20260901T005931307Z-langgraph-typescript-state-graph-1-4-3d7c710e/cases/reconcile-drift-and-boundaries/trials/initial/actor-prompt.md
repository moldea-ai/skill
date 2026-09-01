Complete the project task below in the current Git working tree:

# Reconcile implementation drift

The support graph definition was renamed, but the existing agent setup points to removed source. Reconcile its direct LangGraph runtime-agent, input-schema, and output-schema bindings with the implementation that exists.

The project also constructs `Command` destinations from runtime input for another workflow. Static inspection cannot prove the final routing relationship. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent destinations, handoffs, subagents, or tools, recreate removed source, or modify implementation code. Validate the result.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
