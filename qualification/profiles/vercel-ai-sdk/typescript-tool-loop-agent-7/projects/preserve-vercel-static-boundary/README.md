# ToolLoopAgent static boundaries

The project independently exercises `prepareCall` and `prepareStep` on directly constructed `ToolLoopAgent` instances. It also contains a function tool that calls another agent and a real `WorkflowAgent` negative control. The expected state preserves only relationship-local proof and does not invent handoffs, routing, or a ToolLoopAgent binding for the workflow export.
