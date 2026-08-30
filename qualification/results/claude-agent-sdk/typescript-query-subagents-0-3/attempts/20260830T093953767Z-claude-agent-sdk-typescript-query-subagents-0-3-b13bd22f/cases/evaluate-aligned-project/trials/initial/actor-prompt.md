Complete the project task below in the current Git working tree:

# Review the existing agent setup

Review whether the `support`, `billing`, `orders`, and `summary` agents accurately represent their direct Claude Agent SDK query wrappers, prompt loaders, programmatic subagent registrations, routing descriptions, explicit and inherited subagent tool availability, structured output, and query-mounted SDK MCP tool.

If the project is already valid and aligned, do not edit it. Report the evidence and validation outcome. Do not infer agent input-schema, tool output-schema, provider, model, external MCP, or runtime invocation relationships.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
