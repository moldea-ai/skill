Complete the project task below in the current Git working tree:

# Document the Vercel static boundaries

Evaluate the existing support integrations and preserve their working implementation. `supportAgent` uses `prepareCall`, while `stepSupportAgent` uses only `prepareStep`. `delegatingSupportAgent` registers a function tool whose implementation calls `stepSupportAgent`. The same project also exports a `WorkflowAgent`, which is outside the selected ToolLoopAgent target.

Update the canonical agent setup to state exactly what static inspection cannot prove. For `support`, preserve only the proved agent-definition and input-schema relationships and record why `prepareCall` leaves instruction, output, and tool wiring unresolved. For `step-support`, preserve its proved agent definition, input schema, output schema, and tool relationships, but record its instruction loader as unresolved because `prepareStep` can replace it. Record both working static-inspection gaps as warnings, not blockers. Preserve every proved `delegating-support` relationship without adding a handoff, routing target, or subagent relationship. Do not register `workflowSupportAgent` as a ToolLoopAgent target. Add only useful project-local preparation guidance, preserve all source, and validate the final project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
