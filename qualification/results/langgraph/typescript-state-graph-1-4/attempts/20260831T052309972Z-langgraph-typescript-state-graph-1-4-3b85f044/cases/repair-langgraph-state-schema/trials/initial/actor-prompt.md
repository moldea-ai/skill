Complete the project task below in the current Git working tree:

# Repair the StateGraph input schema

Project validation reports that the support agent's declared input schema does not match the input schema wired by its closed StateGraph initializer. Use the validation evidence and repository source to reconcile the agent setup.

Preserve the compiled graph, its node and edge operations, and both schema declarations. Do not change working source merely to match stale canonical data, and do not declare graph nodes as tools. Validate that the repaired project emits complete graph and schema evidence with no wiring diagnostic.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
