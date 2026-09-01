# Reconcile implementation drift

The support entrypoint was renamed, but the existing agent setup points to removed source. Reconcile its direct LangGraph runtime-agent binding with the implementation that exists.

The project also selects a task from runtime input in another workflow. Static inspection cannot prove that dynamic control flow as agent routing. Record that boundary as an agent-level unresolved warning with a concrete resolution and source path. Do not invent destinations, handoffs, subagents, tools, or schema bindings, recreate removed source, or modify implementation code. Validate the result.
