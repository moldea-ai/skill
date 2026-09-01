Complete the project task below in the current Git working tree:

# Repair the Functional API runtime binding

Project validation reports that the support agent's declared runtime-agent symbol was not found. Use the validation evidence and repository source to reconcile the agent setup.

Preserve the directly exported entrypoint and its direct task. Do not change working source merely to match stale canonical data, promote the task to a manifest capability, or add schema bindings for TypeScript types. Validate that the repaired project emits complete Functional API evidence with no runtime-symbol diagnostic.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
