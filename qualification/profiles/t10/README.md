# LangGraph StateGraph profile

This profile qualifies the `typescript-state-graph-1-4` target with the shared eight-case `custom/custom` baseline and two adapter-specific projects for diagnostic schema repair and conservative static-boundary behavior. This profile executes only its adapter-specific projects; the universal baseline executes and publishes once under `custom/custom`.

Each project pins `@langchain/langgraph@1.4.12`, `@langchain/core@1.2.9`, `zod@4.3.6`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published artifacts once, records their checksums with candidate evidence, primes the attempt-local package store, and installs projects offline. Deterministic stages typecheck against the real packages but never invoke a graph, node, router, model, or tool.

Supported fixtures use strict TypeScript ESM, directly exported compiled package-root `StateGraph` definitions, inline fluent and single-owner module-local builders, closed modern schema initialization, direct nodes, direct and waiting edges, conditional edges, and static compile names. The boundary fixture isolates opaque schemas, dynamic routing, `Command` and `Send`, node-local behavior, unsupported collections, subgraphs, persistence, runtime context, prebuilt agents, and supervisor semantics without inventing canonical relationships.
