---
title: Continuous maintenance
navigationTitle: Continuous maintenance
description: Let new project knowledge and behavior changes trigger precise maintenance of adopted project state without documentation churn.
section: workflows
order: 70
---

# Keep behavior aligned while you ship

After a repository adopts `moldea`, you should not need to append “and update `moldea`” to relevant knowledge or implementation requests.

```text
Add manager approval to refunds over $500.
```

The coding agent recognizes that the change may affect the support agent, a repository-local Agent Skill, refund context, authorization rules, capability semantics, schemas, or tests. It traces those relationships and updates only the surfaces whose established truth changed.

## Maintain project knowledge explicitly

You can provide current project knowledge as part of an explicit `moldea` maintenance request:

```text
Update moldea with this current ownership boundary: Platform owns the application runtime and delivery pipeline. Security approves production access.
```

The same explicitly requested handoff can arrive as YAML or JSON, an answer to a focused `moldea` question, a terse ownership or approval table, or an accessible project file. Format does not determine whether a claim becomes canonical and generic knowledge alone does not activate the skill. The coding agent checks `/moldea/moldea.yaml`, `/moldea/project.md`, and the README marker directly before classifying adoption. A project is adopted only when the complete canonical foundation and owned README awareness block are directly established. Partial or inconsistent artifacts remain unadopted: the coding agent names the exact existing artifacts and missing contract elements, preserves existing content, and does not initialize or repair over them without explicit authority and resolved semantics. Once adoption is established, it selects the smallest canonical surface and evaluates the handoff claim by claim, separating durable current truth and explicit corrections from proposals, transient details, speculation, secrets, and unnecessary personal information.

When a new claim materially conflicts with established context, its format or bare assertion does not authorize replacement. The coding agent proceeds only when you clearly identify a correction or reliable evidence resolves the conflict; otherwise it asks one focused question that distinguishes whether the claim replaces current state or describes a proposed or future state. It writes nothing before the answer. After an explicit correction, the completion report states the corrected boundary and resulting current truth without unnecessarily repeating obsolete wording. An explicitly read-only request remains read-only, and incidental knowledge never initializes an unrelated repository.

## Reconsider does not mean rewrite

An impact path, explicit knowledge-maintenance request, or semantic relationship means “inspect this surface,” not “edit this file.” If supplied information is not suitable for persistence or existing project context and declared behavior remain accurate, the right result is no `/moldea/**` change.

The same scope rule applies to unresolved requirements. Discovering a referenced path is not enough: before changing it, the coding agent reads the requirement and every resolution criterion. After the authorized work, it reports which criteria are satisfied or outstanding. It does not complete additional work merely to close the requirement, and the requirement remains until current evidence satisfies every criterion.

The completion report identifies the canonical state reconsidered, explicitly states that no canonical change was required, and explains why it remains correct. This avoids noisy documentation churn while still preventing silent drift.

## What can be synchronized

Depending on the change, maintenance can reconsider:

- project and focused context
- accepted decisions
- runtime guidance
- descriptions, handoff descriptions, and instructions
- Agent Skill authoritative sources, activation, workflows, references, scripts, assets, host metadata, installed or distributed copies, and consumers
- runtime construction and routing metadata
- schemas, tools, skills, and variable providers
- bindings and broader impact paths
- exact instruction mirrors
- unresolved requirements and their resolution criteria
- implementation, tests, and directly affected documentation

## Keep accumulated context organized

Ordinary maintenance keeps each affected fact with its established authoritative owner. It removes only duplication or stale wording directly affected by the authorized change, leaving unrelated accumulated context alone. When broader cleanup would materially help, the coding agent may recommend a separate explicit request without performing it.

You can authorize broader context compression naturally:

```text
Consolidate the duplicated project context so each durable fact has one authoritative owner. Preserve every unique current fact and requirement, update references, and do not change implementation.
```

This remains a Maintain operation. It can consolidate proven duplicates, move facts to established owners, split mixed-responsibility documents, remove proven superseded wording, and update manifest paths, references, consumers, and directly affected documentation. It preserves every distinct current fact, accepted rationale, relevant requirement, unresolved boundary, relationship, and consumer. If two sources make consequential conflicting current claims, the coding agent identifies the conflict, asks one focused question, and changes nothing before the answer.

Compression is limited to repository-owned context. It does not manage host context windows, conversation compaction, prompt caches, token budgets, or model internals, and it does not claim token savings.

## Adoption remains explicit

The skill loads only after an explicit, canonical, managed-README, or declared-relationship activation path is established. Loading does not adopt `moldea` or authorize persistence. Adoption intent is established by explicit developer direction or current authorized work introducing canonical state. Adoption itself is derived only after the complete canonical contract exists.

If the developer prohibits corresponding `moldea` changes, the coding agent respects that scope, completes the authorized implementation, reports likely drift, and does not claim alignment. If an explicit `moldea` request targets an unadopted repository without authorizing initialization, the coding agent does not persist the knowledge and explains that initialization remains a separate explicit operation. Unrelated work receives no adoption recommendation or `moldea` report.

After synchronized writes, each exact repository-local deterministic CLI invocation runs as a separate process from project checks, mirror comparisons, and Git inspection. The completion report names the deterministic operation or proof stage when material, its status, and material diagnostics or mirror findings established by that completed process. It does not need to repeat the literal invocation. A generic success claim, failed aggregate command, or unverified response is not sufficient evidence.

When an Agent Skill copy, consumer, or related application belongs to another Git repository, each repository keeps its own authority and verification boundary. The report names every repository's observed current state as changed, unchanged, uninspected, or blocked and separates related evidence from facts local deterministic inspection cannot observe. It reports actual state, not a promise about what it would preserve later. A scope-only direction with no actual semantic change produces no invented work; the coding agent reports the repository states and asks one focused question. Coordinated changes are non-atomic, and a change on one side never proves the other side is complete.
