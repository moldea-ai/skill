# Google Gen AI profile

This profile qualifies `@moldea.ai/adapter-google-genai` target `typescript-models-generate-content-2` with the shared eight-case `custom/custom` baseline and two adapter-specific projects for function-declaration registration and conservative handling of request indirection and Google-hosted tools. This profile executes only its adapter-specific projects; the universal baseline executes and publishes once under `custom/custom`.

Each project pins `@google/genai@2.17.1`, its optional type-level peer `@modelcontextprotocol/sdk@1.29.0`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published runtime and type artifacts once, records their checksums with the candidate evidence, primes the attempt-local package store, and installs the projects offline. The deterministic stages typecheck against the real SDK package but never call a provider or execute a tool.

The supported fixtures use TypeScript ESM, direct `client.models.generateContent(...)` calls, direct `config.systemInstruction` loaders, statically closed function-declaration collections, and direct `parametersJsonSchema` references. The boundary fixture intentionally uses indirect request construction and Google-hosted search. Its valid outcome preserves explicit uncertainty without fabricated runtime-pattern, function-registration, schema, provider, model, routing, handoff, subagent, or output-schema relationships.

Run the model-free profile from the repository root:

```bash
npm run qualification -- run --adapter google-genai --implementation typescript-models-generate-content-2 --dry-run --json
```

The dry run executes deterministic verification and transparent expected states only. It creates no public result and performs no model call.
