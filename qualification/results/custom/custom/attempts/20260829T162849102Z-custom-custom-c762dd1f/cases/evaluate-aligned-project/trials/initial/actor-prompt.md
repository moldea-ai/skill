Complete the project task below in the current Git working tree:

# Review the existing agent setup

Review whether the `support` agent is correctly described by the project, including its custom runtime guidance and connection to the implementation.

If the setup is already valid and agrees with the source, do not edit it. Report the evidence you used, the validation outcome, and any unresolved issue that genuinely remains.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
