Complete the project task below in the current Git working tree:

# Review the Claude Agent SDK static boundary

Review whether the `support` and `dynamic-support` agents represent only the Claude Agent SDK relationships that static repository evidence can establish.

Confirm the direct support query wrapper and prompt loader, including the unsupported normalization-requiring SDK MCP key. Treat factory-built query options, main-thread agent selection, prompt arrays, aliases, preset tools, dynamic subagent definitions and restrictions, observer fields, critical reminders, SDK MCP instructions, external MCP configuration, settings, skills, hooks, and filesystem agents conservatively. Do not invent prompt, delegation, routing, tool, or schema relationships that the adapter cannot prove. If the project already records these boundaries accurately, leave it unchanged and report the evidence and validation outcome.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
