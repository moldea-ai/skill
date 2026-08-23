Complete the project task below in the current Git working tree:

# Evaluate the existing Moldea project

Inspect this project with the candidate Moldea skill and CLI. Determine whether the `support` agent is correctly described by the canonical repository, including its custom runtime guidance and runtime-agent binding.

If the project is already valid and its relationships agree with the source, do not edit it. Report the evidence you used, the validation commands you ran, and any unresolved issue that genuinely remains.

Execution rules:

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under `.agents/skills/moldea/` or `.moldea-qualification/`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
