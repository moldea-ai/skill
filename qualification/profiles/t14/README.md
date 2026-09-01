# Vercel AI SDK ToolLoopAgent profile

This profile qualifies `@moldea.ai/adapter-vercel-ai-sdk` target `typescript-tool-loop-agent-7` against ten transparent projects. It runs the eight universal moldea journeys plus two adapter-specific cases for closed tool registration and conservative handling of preparation overrides.

Each project pins `ai@7.0.77`, its `zod@4.3.6` peer, `@types/json-schema@7.0.15`, `@types/node@22.20.1`, and `typescript@6.0.3`. The profile also pins `@ai-sdk/workflow@2.0.7` with its required `workflow@5.0.0-beta.42` peer so the negative-control boundary fixture uses the real unsupported API. Qualification downloads and verifies the exact published runtime and type artifacts once, records their checksums with the candidate evidence, primes the attempt-local package store, and installs the projects offline. The deterministic stages typecheck against the real SDK packages but never call a provider, execute an agent, or execute a tool.

The supported fixtures use TypeScript ESM, directly exported `ToolLoopAgent` instances, direct instruction loaders, `callOptionsSchema`, `Output.object`, and repository-local function tools. The boundary fixture isolates `prepareCall` and `prepareStep`, retains output and tool proof for the latter, exercises a function tool that calls another agent without inferring a handoff, and keeps a real `WorkflowAgent` outside the selected target.

Run the model-free profile from the repository root:

```bash
npm run qualification -- run --adapter vercel-ai-sdk --implementation typescript-tool-loop-agent-7 --dry-run --json
```

The dry run executes deterministic verification and transparent expected states only. It creates no public result and performs no model call.
