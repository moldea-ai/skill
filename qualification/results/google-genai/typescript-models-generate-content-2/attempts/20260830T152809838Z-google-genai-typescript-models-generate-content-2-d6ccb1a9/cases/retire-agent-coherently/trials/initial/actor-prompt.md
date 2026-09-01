Complete the project task below in the current Git working tree:

# Retire the removed support agent

The direct Google Gen AI implementation for `support` was intentionally removed. Update the existing agent setup so it no longer claims that the wrapper, loader, or agent exists.

Preserve remaining source and project context. Remove obsolete canonical assets, validate the final repository, and report the evidence that established their obsolescence.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
