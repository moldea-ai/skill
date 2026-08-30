# OpenAI Responses API profile

This profile qualifies `@moldea.ai/adapter-openai` target `typescript-responses-api-7` against ten transparent projects. It runs the eight universal moldea journeys plus two adapter-specific cases for function-tool registration and conservative handling of request indirection and provider-hosted configuration.

Each project pins `openai@7.8.0`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published runtime and type artifacts once, records their checksums with the candidate evidence, primes the attempt-local package store, and installs the projects offline. The deterministic stages typecheck against the real SDK package but never call a provider, execute an agent, or execute a tool.

The supported fixtures use TypeScript ESM, direct `client.responses.create(...)` calls, direct instruction loaders, statically closed OpenAI Responses function-tool arrays, and direct `parameters` references. The boundary fixture intentionally uses indirect request construction and provider-hosted web search. Its valid outcome is an explicit unresolved warning with no fabricated runtime-pattern, function-tool registration, schema, provider, model, routing, handoff, subagent, or output-schema relationship.

Run the model-free profile from the repository root:

```bash
npm run qualification -- run --adapter openai --implementation typescript-responses-api-7 --dry-run --json
```

The dry run executes deterministic verification and transparent expected states only. It creates no public result and performs no model call.
