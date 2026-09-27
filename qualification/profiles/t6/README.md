# Eve filesystem-agent profile

This profile qualifies the `typescript-filesystem-agent-0-39` target with the shared `custom/custom` baseline and three adapter-specific projects for diagnostic repair, a removed agent output-schema feature, and conservative static-boundary behavior. This profile executes only its adapter-specific projects; the universal baseline executes and publishes once under `custom/custom`.

Each project pins `eve@0.67.0`, `ai@7.0.116`, `zod@4.3.6`, `@types/node@22.20.1`, and `typescript@6.0.3`, and declares Eve's Node.js 24 application prerequisite. Qualification downloads and verifies the exact published artifacts once, records their checksums with candidate evidence, primes the attempt-local package store, and installs projects offline. Deterministic stages typecheck against the real packages but never invoke an agent, tool, skill, subagent, model, or provider.

Supported fixtures use strict TypeScript ESM, flat and nested root agents, exact lowercase Markdown and exclusive TypeScript instruction sources, tool output schemas, recursive filesystem tools with flattened path-derived names, TypeScript skills, and directory-backed local subagents. The boundary fixture isolates dynamic tools, Markdown skills, single-file subagents, unsupported instruction forms, remote agents, extension and operational surfaces, collisions, and reserved names without inventing unsupported canonical relationships.

The third fixture binds a real exported agent schema while keeping Eve 0.67.0 source type-correct. It requires the confirmed feature error and removes the obsolete binding and unused source in its expected repair. It does not treat the error as a version-range warning.
