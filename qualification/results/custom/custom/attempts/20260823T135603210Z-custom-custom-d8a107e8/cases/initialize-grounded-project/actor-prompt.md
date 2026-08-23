Complete the project task below in the current Git working tree:

# Initialize Moldea from repository evidence

Initialize Moldea for this repository. Establish only the project context that the current README and source code support. Do not create an agent, decision, runtime guide, or unresolved requirement unless the repository proves it is needed.

Preserve the existing README content, add the standard Moldea awareness block, validate the resulting project, and report the evidence and commands used.

Execution rules:

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under `.agents/skills/moldea/` or `.moldea-qualification/`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
