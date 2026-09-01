# Reconcile implementation drift

The support filesystem definition moved, but the existing agent setup points to removed source. Reconcile its Eve runtime-agent, instruction-loader, and output-schema bindings with the implementation that exists.

The project also defines another tool dynamically at runtime. Static inspection cannot prove its final registration. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent a tool, recreate removed source, add a runtime guide, or modify implementation code. Validate the result.
