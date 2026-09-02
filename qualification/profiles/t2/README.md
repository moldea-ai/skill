# Claude Agent SDK profile

This profile qualifies `@moldea.ai/adapter-claude-agent-sdk` target `typescript-query-subagents-0-3` against ten transparent projects. It runs the eight universal moldea journeys plus two adapter-specific cases for query-mounted SDK MCP tool registration and conservative handling of unsupported query, subagent, and MCP relationships.

Each project pins `@anthropic-ai/claude-agent-sdk@0.3.234`, its exact peer packages, `@types/node@22.20.1`, and `typescript@6.0.3`. Qualification downloads and verifies the exact published runtime and type artifacts once, records their checksums with the candidate evidence, primes the attempt-local package store, and installs the projects offline. The deterministic stages typecheck against the real SDK packages but never call a provider, execute an agent, or execute a tool.

The supported fixtures use TypeScript ESM, direct `query({ ... })` wrappers, direct custom and preset-appended prompt loaders, immutable programmatic `AgentDefinition` values, closed query `agents` and `mcpServers` maps, explicit Agent availability, canonical routing descriptions, JSON-schema output, and repository-local SDK MCP tools. The boundary fixture combines unsupported query options, dynamic definitions and restrictions, SDK-only subagent fields, external MCP configuration, and filesystem features. Its valid outcome is explicit unresolved guidance with no fabricated instruction, delegation, tool, schema, or routing relationship.

Run the model-free profile from the repository root:

```bash
npm run qualification -- run --adapter claude-agent-sdk --implementation typescript-query-subagents-0-3 --dry-run --json
```

The dry run executes deterministic verification and transparent expected states only. It creates no public result and performs no model call.
