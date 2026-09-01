# Cloudflare AIChatAgent static boundaries

`SupportAgent` uses an open generation-request tools map, so the final tool registration remains runtime-dependent. `StepSupportAgent` uses `prepareStep`, so static inspection does not establish one instruction loader. `IndirectSupportAgent` delegates generation to a helper, `UnsupportedOutputAgent` uses a non-object output variant, and `RuntimeInitializedAgent` has executable class initialization; none establishes the corresponding supported static relationship.

Cloudflare bindings, SQLite Durable Object migrations, provider bindings, and Worker deployment configuration remain project-local operational concerns outside these static source relationships.
