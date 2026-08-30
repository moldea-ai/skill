Complete the project task below in the current Git working tree:

# Document the LangChain static boundaries

Evaluate the existing support integrations and preserve their working implementation. `supportAgent` uses non-empty middleware. `stepSupportAgent` uses multiple response formats, state and context schemas, and a headless client tool. `delegatingSupportAgent` registers a normal function tool whose implementation invokes `stepSupportAgent`. The same project also exports a direct LangGraph `StateGraph`, which is outside the selected LangChain target.

Update canonical state to record exactly what static inspection cannot prove. For `support`, preserve only the direct runtime-agent binding and explain why middleware leaves instruction, output, and tool registration unresolved. For `step-support`, preserve the runtime-agent and instruction-loader bindings without inventing input, output, or tool relationships. Preserve every proved `delegating-support` relationship without adding a handoff, routing target, or subagent relationship. Do not register `workflowSupportAgent` as a LangChain target. Add one concise project-local runtime guide, preserve all source, and validate the final project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
