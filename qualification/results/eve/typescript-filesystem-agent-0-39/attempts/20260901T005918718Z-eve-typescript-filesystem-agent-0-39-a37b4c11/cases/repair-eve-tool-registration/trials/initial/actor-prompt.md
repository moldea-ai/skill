Complete the project task below in the current Git working tree:

# Repair the Eve tool registration

Project validation reports that the support agent's declared tool name does not match the recursive Eve filesystem tool path. Use the validation evidence and repository source to reconcile the canonical setup.

Preserve the working agent, instruction source, tool implementation, and schemas. Do not rename source merely to match stale canonical data. Validate that the repaired project emits the complete tool evidence and no name-mismatch diagnostic.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
