# LangChain createAgent profile

This profile qualifies the `typescript-create-agent-1-5` target with the shared eight-case `custom/custom` baseline and two adapter-specific projects for diagnostic repair and conservative static-boundary behavior. This profile executes only its adapter-specific projects; the universal baseline executes and publishes once under `custom/custom`.

Each project pins `langchain@1.5.9`, `@langchain/core@1.2.9`, `zod@4.3.6`, `@types/node@22.20.1`, and `typescript@6.0.3`. The boundary fixture also pins `@langchain/langgraph@1.4.12` for a real negative control. Qualification downloads and verifies the exact published artifacts once, records their checksums with candidate evidence, primes the attempt-local package store, and installs projects offline. Deterministic stages typecheck against the real packages but never call a model provider, invoke an agent, or execute a tool.

Supported fixtures use strict TypeScript ESM, directly exported package-root `createAgent` calls, direct system-prompt loaders, direct and strategy-wrapped response schemas, normal two-argument function tools, and closed tool arrays. The boundary fixture isolates non-empty middleware, multiple response formats, state and context schemas, a headless client tool, ordinary tool-based delegation, and a direct LangGraph application without inventing unsupported canonical relationships.
