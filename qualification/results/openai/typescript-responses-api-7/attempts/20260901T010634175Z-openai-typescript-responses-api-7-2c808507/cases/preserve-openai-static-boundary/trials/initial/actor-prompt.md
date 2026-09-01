Complete the project task below in the current Git working tree:

# Review the OpenAI static boundary

Review whether the `support` and `dynamic-support` agents represent only the OpenAI relationships that static repository evidence can establish.

Confirm the direct Responses API wrapper and instruction loader. Treat provider-hosted web search and the indirect request object conservatively: do not invent function-tool, schema, runtime-pattern, routing, or handoff relationships that the adapter does not prove. If the project already records the dynamic boundary accurately, leave it unchanged and report the evidence and validation outcome.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
