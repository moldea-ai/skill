# Reconcile drift and boundaries

The committed baseline points to `src/support-agent.ts`. Before the actor starts, that file is removed and two replacement implementation files appear as untracked work.

The expected change updates only the canonical manifest. It binds the proven replacement export and records dynamic tool registration as unresolved. This case catches stale references, implementation rewriting, fabricated relationships, and failure to distinguish a valid unresolved requirement from an invalid repository.
