# Reconcile implementation drift

The support graph definition was renamed, but the existing agent setup points to removed source. Reconcile its direct LangGraph runtime-agent, input-schema, and output-schema bindings with the implementation that exists.

The project also constructs `Command` destinations from runtime input for another workflow. Static inspection cannot prove the final routing relationship. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent destinations, handoffs, subagents, or tools, recreate removed source, or modify implementation code. Validate the result.
