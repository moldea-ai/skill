Complete the project task below in the current Git working tree:

# Review the existing agent setup

Review whether the `support` and `summary` agents accurately represent their direct OpenAI Agents SDK wrappers and instruction loaders, including the support agent's function tool and input schema.

If the project is already valid and aligned, do not edit it. Report the evidence and validation outcome. Preserve the repository-established tool implementation, but do not claim that OpenAI Agents SDK adapter evidence proves runtime execution, output schemas, routing, handoffs, subagents, or agent input schemas.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
