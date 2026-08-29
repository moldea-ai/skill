# Reconcile implementation drift

The support wrapper was renamed, but the existing agent setup points to removed source. Reconcile its direct Vercel AI SDK runtime-agent, instruction-loader, and output-schema bindings with the implementation that exists.

The project also assembles another tool registry dynamically. Static inspection cannot prove its final relationship. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent a tool, recreate removed source, or modify implementation code. Validate the result.
