Complete the project task below in the current Git working tree:

# Repair the Cloudflare AIChatAgent output schema

Project validation reports that the support agent's declared output schema is not wired to its direct Cloudflare AIChatAgent structured-output request. Use validation evidence and repository source to reconcile the agent setup.

Change only the stale canonical output-schema binding. Preserve the valid AIChatAgent class, instruction loader, generation request, function tool, implementation, registration, and tool schemas. Do not add an agent input schema, runtime guide, provider claim, or unrelated context. Validate the complete project and report the evidence and outcome.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
