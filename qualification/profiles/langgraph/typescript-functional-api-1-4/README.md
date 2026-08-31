# LangGraph Functional API profile

This profile covers the eight universal qualification journeys plus diagnostic runtime-binding repair and conservative static-boundary cases for the `typescript-functional-api-1-4` target.

Each project pins `@langchain/langgraph@1.4.12`, `@langchain/core@1.2.9`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published artifacts once, records their checksums with candidate evidence, primes the attempt-local package store, and installs projects offline. Deterministic stages typecheck against the real packages but never invoke an entrypoint, task, interrupt, model, or provider.

Supported fixtures use strict TypeScript ESM, directly exported package-root `entrypoint(...)` definitions, inline and directly imported non-generator workflows, direct local and imported tasks, direct interrupts, previous-state reads, closed final-state calls, and evidence-safe static names. The boundary fixture isolates nested and transitive task calls, ordinary control flow, indirect options, TypeScript-only schemas, persistence semantics, human approval, routing, handoffs, subagents, tools, and skills without inventing canonical relationships.
