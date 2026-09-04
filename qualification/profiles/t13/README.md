# Vercel AI SDK direct generation profile

This profile qualifies `@moldea.ai/adapter-vercel-ai-sdk` target `typescript-generate-stream-text-7` with the shared eight-case `custom/custom` baseline and two adapter-specific projects for closed tool registration and conservative handling of unsupported generation indirection. This profile executes only its adapter-specific projects; the universal baseline executes and publishes once under `custom/custom`.

Each project pins `ai@7.0.77`, its `zod@4.3.6` peer, `@types/json-schema@7.0.15`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published runtime and type artifacts once, records their checksums with the candidate evidence, primes the attempt-local package store, and installs the projects offline. The deterministic stages typecheck against the real SDK package but never call a provider, execute an agent, or execute a tool.

The supported fixtures use TypeScript ESM, direct `generateText` or `streamText` calls, direct instruction loaders, `Output.object`, and repository-local function tools. The boundary fixture intentionally uses unsupported indirection and `prepareStep`; its valid outcome is an explicit unresolved warning with no fabricated runtime-pattern, provider, model, routing, handoff, subagent, or input-schema relationship.

Run the model-free profile from the repository root:

```bash
npm run qualification -- run --adapter vercel-ai-sdk --implementation typescript-generate-stream-text-7 --dry-run --json
```

The dry run executes deterministic verification and transparent expected states only. It creates no public result and performs no model call.
