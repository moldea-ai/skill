Complete the project task below in the current Git working tree:

# Document the Vercel static boundary

Evaluate the existing `support` integration. The wrapper passes an indirect request object to `generateText`, and `prepareStep` may replace instructions. Preserve the working implementation.

Update the agent setup to state what static inspection cannot prove: add only useful project-local runtime guidance and an agent-level unresolved warning with a concrete path to a supported direct pattern. Do not claim runtime-pattern, instruction-loader, input-schema, provider, model, routing, handoff, or subagent evidence. Validate the final project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
