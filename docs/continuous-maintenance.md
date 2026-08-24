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

## Share project knowledge naturally

You can also provide current project knowledge directly:

```text
Platform owns the application runtime and delivery pipeline. Security approves production access.
```

The same handoff can arrive as YAML or JSON, an answer to a focused question, a table, or an accessible project file. Format does not determine whether it becomes canonical. The coding agent checks `/moldea/moldea.yaml`, `/moldea/project.md`, and the README marker directly before classifying adoption; omission from search or Git inventory is not proof that the repository is unadopted. It then evaluates the handoff claim by claim, separating durable current truth and explicit corrections from proposals, transient details, speculation, secrets, and unnecessary personal information. Current does not automatically mean durable: short-lived work status or focus remains transient unless it establishes a lasting operating constraint.

When a new claim materially conflicts with established context, its format or bare assertion does not authorize replacement. The coding agent proceeds only when you clearly identify a correction or reliable evidence resolves the conflict; otherwise it asks one focused question before writing. An explicitly read-only request remains read-only, and incidental knowledge never initializes an unrelated repository.

## Reconsider does not mean rewrite

An impact path, knowledge handoff, or semantic relationship means “inspect this surface,” not “edit this file.” If supplied information is not suitable for persistence or existing project context and declared behavior remain accurate, the right result is no `/moldea/**` change.

The same scope rule applies to unresolved requirements. A related implementation change prompts the coding agent to recheck every resolution criterion, but it does not authorize completing additional work merely to close the requirement. The requirement remains until current evidence satisfies every criterion.

The completion report identifies the canonical state that was reconsidered and why it remains correct. This avoids noisy documentation churn while still preventing silent drift.

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

## Adoption remains explicit

The skill may load to determine whether adoption exists. Loading does not adopt `moldea` or authorize persistence. Adoption is established by explicit developer intent or current authorized work introducing canonical state.

If the developer prohibits corresponding `moldea` changes, the coding agent respects that scope, completes the authorized implementation, reports likely drift, and does not claim alignment.

After synchronized writes, each deterministic CLI invocation runs as a separate process from project checks, mirror comparisons, and Git inspection. The completion report names the exact repository-local command, its status, and material diagnostics or mirror findings established by that completed process. A generic success claim, failed aggregate command, or unverified response is not sufficient evidence.

When an Agent Skill copy or consumer belongs to another Git repository, each repository keeps its own authority and verification boundary. Coordinated changes are reported as non-atomic, and a change on one side never proves the other side is complete.
