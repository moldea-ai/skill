Complete the project task below in the current Git working tree:

# Retire the removed support agent

The implementation for the `support` agent was intentionally removed before this task. Reconcile the Moldea repository so it no longer claims that the agent or its custom runtime integration exists.

Preserve the project's remaining implementation and project context. Validate the final repository and report the evidence that established which canonical files were obsolete.

Execution rules:

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under `.agents/skills/moldea/` or `.moldea-qualification/`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
