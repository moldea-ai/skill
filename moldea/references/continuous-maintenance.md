# Continuous maintenance

Read this reference before initialization, relevance-triggered maintenance, root README awareness work, or coordinated dedicated-repository work.

## Recognize adoption without inventing it

Explicit developer intent is required to adopt `moldea`. Relevance-triggered activation never initializes an unrelated repository automatically.

Evidence that adoption exists or is underway includes canonical `/moldea/**` assets, current changes introducing them, prior developer direction, or the owned README awareness section. The README block alone is a signal to investigate, not authority to recreate missing canonical state; distinguish incomplete initialization, decommissioning, and stale guidance.

## Maintain affected behavior

For every relevant developer-authorized change:

1. Identify the implementation, contract, project, or agent behavior that may change.
2. Map it through exact bindings, `affectedBy` paths, context and decision relationships, unresolved-requirement references, schemas, capabilities, runtime-agent construction, instruction loaders, variable providers, mirrors, runtime guidance, runtime-adapter evidence, imports, tests, configuration, and other material semantic evidence.
3. Inspect the affected project and agent surfaces deeply enough to establish whether truth or declared behavior actually changed.
4. Update all affected representations in the same coherent developer change when the intended state is sufficiently established and writes are authorized.
5. Make no canonical edit when established project truth and declared behavior remain correct.
6. Re-evaluate related unresolved requirements against their explicit resolution criteria; a related file change alone never resolves one.
7. After writes, rerun deterministic inspection and relevant project-native checks.
8. Report the reconsidered surfaces, changes or no-change result, verification, and remaining limitations.

An `affectedBy` or other relevance match means “reconsider this surface,” not “edit this file.” Stop relevance expansion when more investigation is unlikely to change a material conclusion.

If the developer prohibits corresponding `moldea` writes, respect the constraint, complete only authorized work, identify likely drift, and do not claim alignment.

## Maintain project state

Update `project.md` or focused context because durable project truth changed, not because code moved. Create or supersede decisions only when active rationale changed. Update runtime guidance when project-specific integration interpretation changed. Maintain relationships when they materially improve future relevance or deterministic evidence.

Preserve still-valid content and controlled duplication. Do not broadly rewrite mature context or instructions for style. Do not fix unrelated problems unless they are necessary for the authorized change.

## Own one README awareness block

The exact full-line markers are:

```text
<!-- moldea:start -->
<!-- moldea:end -->
```

Handle them as follows:

- **No markers:** a write-capable workflow may add one complete owned block while preserving unrelated README content.
- **One correctly ordered pair:** modify only content inside that pair.
- **Duplicate, missing, reversed, nested, overlapping, or otherwise ambiguous markers:** do not guess ownership. `evaluate` reports the conflict; a write-capable workflow requires developer resolution before claiming README synchronization.

Initialization creates `/README.md` when absent, containing only the owned block rather than an invented general README. Never create a second block.

The block must state that the repository uses `moldea`, canonical state lives under `/moldea/**`, behavior-affecting changes should use this skill to reconsider and when necessary synchronize affected state, and relevance does not require an edit when truth remains correct.

Recommended content:

```markdown
<!-- moldea:start -->
## `moldea`

This repository uses `moldea`. Canonical `moldea` project state lives under `/moldea/**`.

When making a change that may affect project truth or agent behavior, use the `moldea` Agent Skill to inspect the affected system and keep relevant context, decisions, runtime guidance, agent descriptions and instructions, bindings, schemas, capabilities, variables, unresolved requirements, and mirrors aligned with the implementation.

A relevant change requires reconsideration of the affected `moldea` state; it does not require editing `/moldea/**` when established project truth and declared agent behavior remain unchanged.
<!-- moldea:end -->
```

The block is awareness guidance, not canonical project context, a manifest asset, or a runtime instruction. It is distinct from protected developer coding instructions.

## Dedicated repository mode

When canonical `/moldea/**` and application implementation live in separate Git repositories:

- the canonical repository owns `moldea` state, package-manager identity, package metadata and lockfile when required, exact local CLI dependency, and deterministic inspection
- inspect a related application repository only when the developer identifies or makes it available and its evidence is materially necessary
- treat application code and project-native verification as separate semantic evidence, not part of the canonical snapshot
- never search neighboring repositories opportunistically
- never create cross-repository bindings, repository references, impact paths, mirrors, or manifest relationships
- use sufficiently established related-application evidence to select the actual available official `runtime.id`; do not select `custom` merely because implementation is external
- treat absent or partial local adapter evidence for externally implemented agents as an evidence-location limitation, not proof that the runtime or implementation is missing
- keep application-only tools and skills in accurate instruction or runtime-guidance semantics rather than fabricating manifest capabilities
- do not create unresolved requirements solely because version `1` cannot bind an otherwise established cross-repository relationship
- never imply cross-repository Git atomicity or cross-repository PR Assurance
- if the application repository has its own `/moldea/**` state, treat it as an independent project
- coordinate changes only when both repository scopes are authorized, verify each separately, and report completion for each side accurately

A change completed in one repository does not make the other complete.
