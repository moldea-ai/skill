# ToolLoopAgent preparation boundaries

`supportAgent` is a directly constructed `ToolLoopAgent`, and its `callOptionsSchema` remains statically visible. Its `prepareCall` callback can replace instructions and tools or omit structured output, so those three relationships remain unresolved.

`stepSupportAgent` has no `prepareCall`. Its `prepareStep` callback can replace instructions for each step, so only the instruction-loader relationship remains unresolved. Its construction-time output and closed tool map remain independently provable.

When an unresolved relationship is invariant, keep it in the closed object-literal constructor settings and remove the callback that can replace it. If runtime preparation is required, retain the relationship-specific warning instead of declaring wiring the adapter cannot establish.
