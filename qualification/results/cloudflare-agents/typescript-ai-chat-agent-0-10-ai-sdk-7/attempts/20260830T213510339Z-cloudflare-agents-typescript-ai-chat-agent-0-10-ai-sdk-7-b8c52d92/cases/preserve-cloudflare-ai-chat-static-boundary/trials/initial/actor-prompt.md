Complete the project task below in the current Git working tree:

# Preserve Cloudflare AIChatAgent static boundaries

Evaluate the existing support integrations and preserve their working implementation. `SupportAgent` spreads runtime-selected tools into its direct generation request. `StepSupportAgent` allows `prepareStep` to replace its instruction. `DelegatingSupportAgent` registers an ordinary function tool whose implementation references `StepSupportAgent`. The project also exports an indirect-generation agent, an array-output agent, and `RuntimeInitializedAgent`, whose executable field is outside the selected closed class target.

Update canonical state to record exactly what static inspection cannot prove. For `support`, preserve the direct runtime-agent and instruction-loader bindings while leaving the open request tools unresolved. For `step-support`, preserve the runtime-agent binding without inventing an instruction loader through `prepareStep`. Preserve every proved `delegating-support` relationship without adding a handoff or routing target. Do not register the indirect-generation, unsupported-output, or initialization-sensitive agents. Add one concise project-local runtime guide that also records Cloudflare bindings, SQLite Durable Object migration, provider binding, and Worker deployment responsibilities. Preserve all source and validate the final project.

Execution rules:

- Use applicable project-local tooling and follow Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Treat runner-mounted Agent Skill and qualification inputs as read-only.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
