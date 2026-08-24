# Continuous maintenance

Read this reference before initialization, knowledge- or relevance-triggered maintenance, root README awareness work, or coordinated dedicated-repository work.

## Recognize adoption without inventing it

Skill loading is not adoption. When a knowledge handoff triggers discovery before adoption is known, inspect only enough to determine it. Without explicit adoption intent or existing adoption, do not initialize or persist.

Probe repository-root `/moldea/moldea.yaml`, `/moldea/project.md`, and the exact README markers directly before classifying adoption. Evidence that adoption exists or is underway includes those canonical assets, current changes introducing them, prior developer direction, or the owned README awareness section. Absence from `rg`, Git inventory, indexed search, or other ignore-sensitive discovery does not prove non-adoption. The README block alone is a signal to investigate, not authority to recreate missing canonical state; distinguish incomplete initialization, decommissioning, and stale guidance.

## Maintain newly learned truth

In an adopted repository, treat an unambiguous direct handoff of current project knowledge as Maintain authority unless the surrounding request is read-only or excludes writes. The handoff itself is enough to activate maintenance; it needs no explicit request to persist or document it. This includes terse ownership, responsibility, approval, escalation, policy, and boundary handoffs; prose, an answer, a table, structured data, or an accessible source differ only in format. Use context-gathering guidance to classify, verify, route, and filter the claims. A shared container does not determine authority, truth, durability, or replacement semantics. A conflicting assertion needs explicit correction or replacement meaning, or one focused clarification before any semantic write.

Do not stop at acknowledging or summarizing a handoff. Compare its material durable claims with current canonical state: persist newly established truth through the smallest appropriate surface, replace an explicitly corrected stale claim, or name an unexplained conflict and ask the focused question. After writing, copy the literal repository-local deterministic invocation into the final response with its status and material diagnostics, then distinguish retained or corrected truth from transient or otherwise omitted detail.

## Maintain affected behavior

For every relevant developer-authorized change:

1. Identify the implementation, contract, project, agent, or Agent Skill behavior that may change.
2. Map it through exact bindings, `affectedBy` paths, context and decision relationships, unresolved-requirement references, schemas, capabilities, Agent Skill resources and consumers, runtime-agent construction, instruction loaders, variable providers, canonical descriptions, routing-facing metadata, mirrors, runtime guidance, runtime-adapter evidence, imports, tests, configuration, and other material semantic evidence.
3. Inspect the affected project, agent, and skill surfaces deeply enough to establish whether truth or declared behavior actually changed.
4. Update all affected representations in the same coherent developer change when the intended state is sufficiently established and writes are authorized.
5. Make no canonical edit when established project truth and declared behavior remain correct.
6. Before changing a path referenced by an unresolved requirement, read its complete current-state description and every resolution criterion. After the authorized change, recheck every criterion and report which are satisfied or outstanding. Do not expand scope merely to close the requirement; preserve it unless every criterion is established.
7. After writes, rerun deterministic inspection and relevant project-native checks.
8. Report surfaces reconsidered, result, verification, limitations, and why unchanged canonical state remains correct.

An `affectedBy` or other relevance match means “reconsider this surface,” not “edit this file.” Stop relevance expansion when more investigation is unlikely to change a material conclusion.

When a canonical description or runtime routing surface changes, reconsider the relationship in both directions. Routing-facing metadata uses the target's handoff description when present and otherwise its agent description; general-only metadata uses the agent description. Establish that role from runtime semantics rather than property names, and treat unsupported dynamic wiring as unestablished rather than confirmed wrong.

If the developer prohibits corresponding `moldea` writes, respect the constraint, complete only authorized work, identify likely drift, and do not claim alignment.

## Maintain project state

Update `project.md` or focused context because durable project truth changed or was newly established, not because code moved or information was merely supplied. Create or supersede decisions only when active rationale changed. Update runtime guidance when project-specific integration interpretation changed. Maintain relationships when they materially improve future relevance or deterministic evidence.

Preserve still-valid content and controlled duplication. Do not broadly rewrite mature context or instructions for style. Do not fix unrelated problems unless they are necessary for the authorized change.

When an Agent Skill is affected, establish its authoritative source and maintain its portable `SKILL.md`, linked resources, scripts, assets, dependencies, tests, host metadata, installation or packaging configuration, generated or installed copies, distribution path, coding-agent consumers, agent use conditions, and runtime registration as applicable. The portable frontmatter description owns activation: update it before synchronizing host descriptions or default prompts, which never substitute for the portable change. Preserve an established host invocation policy and unrelated supported host fields unless the developer requests a change or reliable evidence establishes it as intended. Verify representative positive and adjacent non-activation requests. The skill remains in its authoritative repository-native location; do not create a parallel `/moldea/skills` store.

When an affected skill consumer or copy lives in another Git repository, preserve separate repository and authority boundaries. Coordinate corresponding changes only when both scopes are authorized, verify each repository independently, report non-atomicity, and never invent cross-repository bindings.

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

The block must state that the repository uses `moldea`, canonical state lives under `/moldea/**`, relevant new knowledge and behavior-affecting changes should use this skill to reconsider and when necessary synchronize affected state, and relevance does not require an edit when truth remains correct.

Recommended content:

```markdown
<!-- moldea:start -->

## `moldea`

This repository uses `moldea`. Canonical `moldea` project state lives under `/moldea/**`.

When sharing potentially durable project knowledge or making a change that may affect project truth or agent behavior, use the `moldea` Agent Skill to inspect the affected system and keep relevant context, decisions, runtime guidance, agent descriptions and instructions, bindings, schemas, capabilities, variables, unresolved requirements, and mirrors aligned with the implementation.

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
- establish canonical instruction provenance from the actual application loader, adapter, runtime library, build, provisioning, or other runtime path when related-application evidence is available
- treat an established external provenance chain as valid semantic evidence without inventing a version `1` cross-repository relationship; when the implementation is unavailable, report the evidence limitation and do not claim readiness
- use sufficiently established related-application evidence to select the actual available official `runtime.id`; do not select `custom` merely because implementation is external
- treat absent or partial local adapter evidence for externally implemented agents as an evidence-location limitation, not proof that the runtime or implementation is missing
- in the final report, name the canonical repository state and each related repository state as observed, related evidence, and external implementation facts canonical deterministic inspection cannot observe; a future promise is not a status
- preserve established application-only and provider-hosted model-visible capabilities in accurate instruction or runtime-guidance semantics; a missing repository-local artifact prevents a manifest binding, not semantic representation
- do not create unresolved requirements solely because version `1` cannot bind an otherwise established cross-repository relationship
- never imply cross-repository Git atomicity or cross-repository PR Assurance
- if the application repository has its own `/moldea/**` state, treat it as an independent project
- coordinate changes only when both repository scopes are authorized, verify each separately, and report completion for each side accurately

A direction that establishes repository authority but no semantic change does not authorize invented work. Report every repository's actual state as changed, unchanged, uninspected, or blocked, then ask one focused question for the desired update. One repository's change does not complete another.
