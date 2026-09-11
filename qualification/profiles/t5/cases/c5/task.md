# Reconcile moldea implementation drift

The support runtime implementation was renamed, but the existing moldea agent setup still points to the removed source. Reconcile the runtime-agent binding with `src/support-assistant.ts`, the implementation that now exists.

The project also assembles tool registrations dynamically in `src/dynamic-tools.ts`. Static inspection cannot prove the final tool relationship. Record that boundary under `agents.support.unresolved` in `/moldea/moldea.yaml`, using the canonical unresolved structure from the applicable moldea agent-design guidance. Include a warning effect, a concrete resolution, and the related source path without inventing field names. The canonical support instruction remains accurate and must not change. Do not invent a tool binding, recreate the removed file, or modify implementation code. Validate the repaired repository and inspect the final diff.
