Complete the project task below in the current Git working tree:

# Document the LangGraph StateGraph static boundaries

Evaluate the existing support workflows and preserve their working implementation. `supportGraph` uses a closed modern schema initializer and direct graph operations. `dynamicSupportGraph` gets its state schema through a factory and chooses a conditional destination from runtime state. The project also constructs runtime-selected `Command` and `Send` destinations, performs a node-local order lookup, instantiates an unregistered prebuilt `ToolNode`, and leaves reducers, node metadata, subgraphs, checkpointers, stores, caches, runtime context, compiled descriptions, prebuilt agents, and supervisor composition to runtime configuration.

Update canonical state to record exactly what static inspection cannot prove. Preserve all three proved bindings for `support`. For `dynamic-support`, preserve only the runtime-agent binding without inventing schema relationships. Keep dynamic routes and runtime composition unresolved without adding routing targets, handoffs, subagents, tools, or complete-topology claims. Add one concise project-local runtime guide, preserve all source, and validate the final project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
