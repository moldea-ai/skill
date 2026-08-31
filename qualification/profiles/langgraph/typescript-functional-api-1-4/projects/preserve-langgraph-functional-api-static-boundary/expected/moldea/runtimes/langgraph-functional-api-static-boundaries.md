# LangGraph Functional API static boundaries

The adapter can prove directly exported entrypoints and supported task, interrupt, previous-state, and final-state calls made in an entrypoint's own lexical body. Positive patterns do not prove a complete or executable workflow topology.

Runtime-selected tasks, callbacks, helpers, and transitive calls remain ordinary control flow. Tasks do not become manifest tools, skills, handoffs, or subagents, and control flow does not establish agent routing.

TypeScript parameter, return, and saved-state types are not executable schemas. Checkpoint persistence, replay determinism, task idempotency, interrupt safety, and human approval semantics remain runtime-owned and must be verified at the integration boundary.
