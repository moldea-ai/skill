# Anthropic Messages API profile

This profile qualifies `@moldea.ai/adapter-anthropic` target `typescript-messages-api-0-117` against ten transparent projects. It runs the eight universal moldea journeys plus two adapter-specific cases for client-tool registration and conservative handling of unsupported request construction and provider tools.

Each project pins `@anthropic-ai/sdk@0.117.1`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published runtime and type artifacts once, records their checksums with the candidate evidence, primes the attempt-local package store, and installs the projects offline. The deterministic stages typecheck against the real SDK package but never call a provider, execute an agent, or execute a tool.

The supported fixtures use TypeScript ESM, direct `client.messages.create(...)` calls, direct system instruction loaders, statically closed Anthropic client-tool arrays, and direct `input_schema` references. The boundary fixture intentionally uses dynamic request construction and an Anthropic provider tool. Its valid outcome is an explicit unresolved warning with no fabricated runtime-pattern, client-tool registration, schema, provider, model, routing, handoff, subagent, or output-schema relationship.

Run the model-free profile from the repository root:

```bash
npm run qualification -- run --adapter anthropic --implementation typescript-messages-api-0-117 --dry-run --json
```

The dry run executes deterministic verification and transparent expected states only. It creates no public result and performs no model call.
