# Eve filesystem-agent profile

This profile covers the eight universal qualification journeys plus diagnostic repair and conservative static-boundary cases for the `typescript-filesystem-agent-0-39` target.

Each project pins `eve@0.39.1`, `ai@7.0.77`, `zod@4.3.6`, `@types/node@22.20.1`, and `typescript@6.0.3`, and declares Eve's Node.js 24 application prerequisite. Qualification downloads and verifies the exact published artifacts once, records their checksums with candidate evidence, primes the attempt-local package store, and installs projects offline. Deterministic stages typecheck against the real packages but never invoke an agent, tool, skill, subagent, model, or provider.

Supported fixtures use strict TypeScript ESM, flat and nested root agents, exact lowercase Markdown and exclusive TypeScript instruction sources, output schemas, recursive filesystem tools with flattened path-derived names, TypeScript skills, and directory-backed local subagents. The boundary fixture isolates dynamic tools, Markdown skills, single-file subagents, unsupported instruction forms, remote agents, extension and operational surfaces, collisions, and reserved names without inventing unsupported canonical relationships.
