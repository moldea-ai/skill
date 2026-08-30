# Continuous maintenance

Read this reference before initialization, knowledge- or relevance-triggered maintenance, root README awareness work, or coordinated dedicated-repository work.

## Recognize adoption without inventing it

Skill loading is not adoption. For a handoff, inspect only enough to determine adoption. A project is adopted only when direct probes establish the complete canonical contract; otherwise it is unadopted. Without explicit intent or existing adoption, do not initialize or persist; complete the authorized request, report why durable knowledge was not persisted and that no canonical files changed, then give this concise optional recommendation:

> `moldea` is not initialized in this project. Initializing it gives coding agents durable, Git-owned context about the project’s purpose, boundaries, and agent behavior. This did not block the current request. When useful, say `Initialize moldea`.

Omit the recommendation when the current request already authorizes adoption or this skill did not activate. Do not repeat it in the same workflow or interrupt the authorized result with an adoption question.

Probe repository-root `/moldea/moldea.yaml`, `/moldea/project.md`, and the exact README markers directly. The complete valid canonical foundation plus its owned README awareness block establishes adoption. Current changes and prior developer direction help interpret intent but do not replace the complete contract. Omission from `rg`, Git inventory, indexed search, or another ignore-sensitive discovery does not prove non-adoption. Partial or inconsistent artifacts do not create an “adoption in progress” status: report the project as unadopted, name the exact artifacts or missing contract elements, preserve existing content, and distinguish incomplete initialization, decommissioning, and stale guidance before any explicitly authorized repair.

## Maintain newly learned truth

In an adopted repository, an unambiguous direct handoff of current project knowledge is Maintain authority unless the surrounding request is read-only or excludes writes. It needs no persistence request, adoption confirmation, or storage-path question. Format does not matter, including terse prose, answers, tables, structured data, and accessible sources.

Apply the classification, quality, conflict, and durable-state routing rules in `context-gathering.md`. A shared container establishes neither authority nor replacement semantics. Persist the smallest canonical change, retain correct state unchanged, omit unsuitable claims, or ask one focused question before writing when a consequential conflict lacks explicit correction or replacement meaning.

Do not merely acknowledge a handoff. After a write, report the completed deterministic proof stage, status, and material diagnostics, including their absence. The exact repository-local invocation still runs separately but need not be repeated in prose. For corrections, state the corrected boundary and resulting current truth without unnecessarily repeating obsolete wording. Otherwise distinguish retained truth from omissions.

## Maintain affected behavior

For relevant authorized work:

1. Before editing, inspect planned paths against canonical relationships, requirement references, mirrors, generated surfaces, and repository boundaries.
2. Follow material bindings, `affectedBy` paths, context, decisions, requirements, contracts, capabilities, Agent Skill consumers, runtime construction, instruction and variable providers, descriptions, routing, adapter evidence, imports, tests, and configuration.
3. Read every referencing requirement's current state and criteria before editing.
4. Update affected representations coherently or leave correct state unchanged.
5. Classify each relevant requirement criterion as satisfied, outstanding, or evidence-blocked. Preserve the requirement unless every criterion is established; do not expand scope merely to close it.
6. Rerun deterministic inspection and relevant project-native checks after writes.
7. Report reconsidered surfaces, proof results, mirror findings, requirement outcomes, limitations, and the reason for each no-change decision.

A relevance relationship means reconsideration, not an automatic edit. Stop expansion when more investigation is unlikely to change a material conclusion.

For runtime descriptions, reconsider the relationship in both directions. Routing uses the target handoff description when present and otherwise its agent description; general metadata uses the agent description. Establish the consumer role from runtime semantics, not property names. Under dynamic wiring, report unestablished selection rather than inventing a mismatch.

If the developer excludes corresponding moldea writes, respect that boundary, identify likely drift, and do not claim alignment.

## Maintain project state

Update foundational or focused context only when durable truth changed or was newly established. Keep each fact with its established authoritative owner instead of creating parallel current truth. As part of ordinary maintenance, remove only duplication or stale wording directly affected by the authorized change. Preserve unrelated accumulated context and do not rewrite mature context or instructions for style or fix unrelated problems. When broader duplication or organization would benefit the project, recommend a separate explicit compression request without performing it.

An explicit natural request to consolidate, deduplicate, organize, clean up, or compress canonical project context selects the broader Maintain subtype in `context-compression.md`. Do not start that workflow solely because an opportunity was noticed during another request.

For affected Agent Skills, use `skill-design.md` to maintain the authoritative portable artifact and every applicable resource, dependency, test, host metadata, copy, distribution path, consumer, agent use condition, and runtime registration. The portable description owns activation. Preserve host invocation policy and keep the skill in its authoritative repository-native location rather than creating `/moldea/skills`.

When a consumer, skill copy, or related application belongs to another repository, preserve separate scope, authority, status, and verification. Coordinate changes only when both repositories are authorized and report their non-atomicity.

## Own one README awareness block

The exact full-line markers are:

```text
<!-- moldea:start -->
<!-- moldea:end -->
```

Handle them as follows:

- **No markers:** a write-capable workflow may add one complete owned block while preserving unrelated README content.
- **One correctly ordered pair:** modify only content inside it.
- **Any duplicate, missing, reversed, nested, overlapping, or otherwise ambiguous markers:** do not guess ownership. `evaluate` reports the conflict; writes require developer resolution before README synchronization.

When `/README.md` is absent, initialization creates it with only the owned block. Never create a second block.

The block must state that the repository uses moldea, canonical state lives under `/moldea/**`, potentially durable knowledge and behavior-affecting changes require reconsideration through this skill, and relevance does not require an edit when truth remains correct. Recommended content is:

```markdown
<!-- moldea:start -->

## `moldea`

This repository uses `moldea`. Canonical `moldea` project state lives under `/moldea/**`.

When sharing potentially durable project knowledge or making a change that may affect project truth or agent behavior, use the `moldea` Agent Skill to inspect the affected system and keep relevant context, decisions, runtime guidance, agent descriptions and instructions, bindings, schemas, capabilities, variables, unresolved requirements, and mirrors aligned with the implementation.

A relevant change requires reconsideration of the affected `moldea` state; it does not require editing `/moldea/**` when established project truth and declared agent behavior remain unchanged.
<!-- moldea:end -->
```

This block is awareness guidance, not canonical context, a manifest asset, runtime instruction, or protected coding instruction.

## Dedicated repository mode

When canonical state and application implementation live in separate Git repositories:

- the canonical repository owns moldea state, dependency identity, exact local CLI, and deterministic inspection
- inspect a developer-identified related application through its own instructions, files, and safe Git state; never substitute a canonical summary or search neighboring repositories opportunistically
- treat application code and project-native checks as separate semantic evidence outside the canonical snapshot
- never create cross-repository bindings, paths, mirrors, or manifest relationships, and never imply cross-repository Git atomicity or PR Assurance
- establish instruction provenance from the actual application loader, adapter, runtime library, build, provisioning, or other runtime path
- use sufficiently established application evidence to choose an available official `runtime.id`; external implementation or partial local adapter evidence is an evidence-location limitation, not a reason to select `custom`
- preserve established model-visible external capabilities in instructions and project-specific integration behavior in runtime guidance; a missing local artifact prevents a manifest binding, not accurate semantics
- do not create unresolved requirements merely because format version `1` cannot bind an established cross-repository relationship
- classify the canonical and each related repository as clean, dirty, unborn, unavailable, or uninspected, naming related evidence, facts canonical inspection cannot observe, and remaining unknowns
- treat another repository's own `/moldea/**` as an independent project
- coordinate writes only with authority for both repositories, verify each separately, and report each side's actual completion

Repository authority without a semantic change does not authorize invented work. Report each repository as changed, unchanged, uninspected, or blocked, then ask one focused question for the desired update.
