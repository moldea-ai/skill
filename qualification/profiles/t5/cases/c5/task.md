# Reconcile moldea implementation drift

The support runtime implementation was renamed, but the existing moldea agent setup still points to the removed source. Reconcile the runtime-agent binding with `src/support-assistant.ts`, the implementation that now exists.

The project also assembles tool registrations dynamically in `src/dynamic-tools.ts`. Static inspection cannot prove the final tool relationship. Represent that boundary explicitly as an agent-level unresolved warning with a concrete resolution and the related source path. Do not invent a tool binding, recreate the removed file, or modify implementation code. Validate the repaired repository and inspect the final diff.
