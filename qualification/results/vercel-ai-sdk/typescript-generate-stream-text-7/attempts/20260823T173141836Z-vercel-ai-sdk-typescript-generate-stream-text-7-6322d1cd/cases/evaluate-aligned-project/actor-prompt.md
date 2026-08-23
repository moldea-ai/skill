Complete the project task below in the current Git working tree:

# Evaluate the existing Moldea project

Inspect this project with the candidate Moldea skill and CLI. Determine whether the `support` and `summary` agents accurately represent their direct Vercel AI SDK generation wrappers, instruction loaders, structured output, and function-tool relationships.

If the project is already valid and aligned, do not edit it. Report the evidence and validation commands you used. Do not infer provider, model, routing, handoff, subagent, or agent input-schema relationships.

Execution rules:

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under `.agents/skills/moldea/` or `.moldea-qualification/`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
