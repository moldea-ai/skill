# Cloudflare Think profile

This profile covers the eight universal qualification journeys plus diagnostic repair and conservative static-boundary cases for the `typescript-think-0-16-ai-sdk-7` target.

Each project pins `@cloudflare/think@0.16.0`, `agents@0.21.0`, `ai@7.0.85`, `zod@4.3.6`, `@cloudflare/workers-types@5.20260830.1`, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published artifacts once, records their checksums with candidate evidence, primes the attempt-local package store, and installs projects offline. Deterministic stages typecheck against the real packages but never call a model provider, invoke an agent, or execute a tool.

Supported fixtures use strict TypeScript ESM, directly exported classes extending `Think`, direct instruction-loader methods, AI SDK function tools with input and output schemas, closed `getTools()` maps, and `agentTool` handoffs. The boundary fixture isolates a runtime-selected open tool map, helper-built session instructions, ordinary tool-based delegation, and an initialization-sensitive subclass without inventing unsupported canonical relationships.
