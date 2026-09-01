# OpenAI Agents SDK profile

This profile qualifies `@moldea.ai/adapter-openai-agents-sdk` target `typescript-agent-handoffs-0-16` against ten transparent projects. It runs the eight universal moldea journeys plus two adapter-specific cases for function-tool registration, handoffs, and conservative handling of unsupported dynamic configuration and SDK surfaces.

Each project pins `@openai/agents@0.16.1`, `@openai/agents-realtime@0.16.1`, `zod@4.3.6`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published runtime and type artifacts once, records their checksums with the candidate evidence, primes the attempt-local package store, and installs the projects offline. The deterministic stages typecheck against the real SDK packages but never call a provider, execute an agent, or execute a tool.

The supported fixtures use TypeScript ESM, direct `new Agent(...)` and `Agent.create(...)` construction, instruction and output-schema bindings, closed repository-local function tools, and direct and configured handoffs. The boundary fixture uses indirect Agent configuration, transformed routing text, agent-as-tool delegation, hosted web search, and `RealtimeAgent`. Its valid outcome preserves the direct Agent evidence while leaving unsupported relationships unresolved.

Run the model-free profile from the repository root:

```bash
npm run qualification -- run --adapter openai-agents-sdk --implementation typescript-agent-handoffs-0-16 --dry-run --json
```

The dry run executes deterministic verification and transparent expected states only. It creates no public result and performs no model call.
