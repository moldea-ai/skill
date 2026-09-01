# Reconcile implementation drift

The support wrapper was renamed, but the existing agent setup points to removed source. Reconcile its direct Claude Agent SDK runtime-agent and instruction-loader bindings with the implementation that exists.

The project also assembles query tool restrictions dynamically. Static inspection cannot prove the final tool availability. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent a tool, recreate removed source, or modify implementation code. Validate the result.
