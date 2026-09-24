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

The coding agent checks known implementation paths against declared relationships and updates selected owners whose established truth changed. A lasting code change alone does not justify searching unknown context. If implementation later reveals a materially new path, it checks that path at an existing scope checkpoint and carries any newly matched owner into completion. It does not repeatedly check unchanged paths or announce moldea on a miss.

## Maintain project knowledge from conversation

Concrete project facts, approved policies, clear corrections, and project-context questions can establish relevance without special wording:

```text
The current ownership boundary is outdated: Platform owns the application runtime and delivery pipeline. Security approves production access.
```

The same information can arrive as YAML or JSON, a focused answer, or an accessible project source. Format alone does not establish relevance or write authority. The project-level meaning must already be clear from the conversation; a task-local code requirement, uncertain table, or pasted suggestion is insufficient. The coding agent reuses current adoption evidence or runs the bundled adoption-only gate. A miss does not authorize discovery, initialization, or repair. Explicit setup checks retain their bounded diagnostic route.

After adoption, the coding agent reuses known owners or bounded content-free inventory and reads only the smallest relevant content. Informational handoffs, feedback reviews, and read-only planning remain read-only. An unambiguous correction to established project truth authorizes the minimal update to its existing canonical owner without another permission request. That authority does not include software changes, new canonical assets, or a wider audit. A selected policy is not proof of implemented behavior. Unchanged facts and owners are reused, and new information does not reset the shared resource limits.

When a new claim materially conflicts with established context, its format or bare assertion does not authorize replacement. The coding agent proceeds only when you clearly identify a correction or reliable evidence resolves the conflict; otherwise it asks one focused question that distinguishes whether the claim replaces current state or describes a proposed or future state. It writes nothing before the answer. After an explicit correction, the completion report states the corrected boundary and resulting current truth without unnecessarily repeating obsolete wording. An explicitly read-only request remains read-only, and incidental knowledge never initializes an unrelated repository.

## Reconsider does not mean rewrite

An impact path, explicit knowledge-maintenance request, or semantic relationship means “inspect this surface,” not “edit this file.” Scope matches are candidate authorities, not a requirement to read every owner or every asset. The coding agent selects the smallest affected owner set and prefers an exact task-specific relationship over an overlapping broad glob unless evidence shows both contracts change. If supplied information is not suitable for persistence or existing project context and declared behavior remain accurate, the right result is no `/moldea/**` change.

During authorized initialization or context maintenance, the coding agent may add a narrow `affectedBy` relationship when an independently established repository path and a real canonical owner justify it. A relationship does not require a new agent or binding, and zero relationships remain valid when none are grounded. The coding agent carries matched owners through planning, implementation, and host context compaction until it has checked the final behavior against them.

The same scope rule applies to unresolved requirements. Discovering a referenced path is not enough: before changing it, the coding agent reads the requirement and every resolution criterion. After the authorized work, it removes each satisfied condition from both the current-state description and resolution text while retaining every outstanding or evidence-blocked condition. It does not complete additional work merely to close the requirement, and the requirement remains until current evidence satisfies every criterion.

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

The README may select the entrypoint before relevance is known. Further moldea work requires direct project or agent relevance, an explicit operation, canonical or managed-README work, or a declared relationship. Selection does not adopt `moldea` or authorize persistence. Initialization requires explicit developer intent, and adoption is established only by the complete canonical contract.

If the developer prohibits corresponding `moldea` changes, the coding agent respects that scope, completes the authorized implementation, reports likely drift, and does not claim alignment. If an explicit `moldea` request targets an unadopted repository without authorizing initialization, the coding agent does not persist the knowledge and explains that initialization remains a separate explicit operation. Unrelated work receives no adoption recommendation or `moldea` report.

After synchronized writes, each launcher-backed deterministic CLI invocation runs as a separate process from project checks, mirror comparisons, and Git inspection. The completion report names the deterministic operation or proof stage when material, its status, and material diagnostics or mirror findings established by that completed process. It does not need to repeat the literal invocation. A generic success claim, failed aggregate command, or unverified response is not sufficient evidence.

When an Agent Skill copy, consumer, or related application belongs to another Git repository, each repository keeps its own authority and verification boundary. The report names every repository's observed current state as changed, unchanged, uninspected, or blocked and separates related evidence from facts local deterministic inspection cannot observe. It reports actual state, not a promise about what it would preserve later. A scope-only direction with no actual semantic change produces no invented work; the coding agent reports the repository states and asks one focused question. Coordinated changes are non-atomic, and a change on one side never proves the other side is complete.
