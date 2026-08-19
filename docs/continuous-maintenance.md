---
title: Continuous maintenance
navigationTitle: Continuous maintenance
description: Let ordinary behavior changes trigger precise reconsideration of adopted project state without documentation churn.
section: workflows
order: 70
---

# Keep behavior aligned while you ship

After a repository adopts `moldea`, you should not need to append “and update `moldea`” to every relevant request.

```text
Add manager approval to refunds over $500.
```

The coding agent recognizes that the change may affect the support agent, a repository-local Agent Skill, refund context, authorization rules, capability semantics, schemas, or tests. It traces those relationships and updates only the surfaces whose established truth changed.

## Reconsider does not mean rewrite

An impact path or semantic relationship means “inspect this surface,” not “edit this file.” If the existing project context and declared agent behavior remain accurate, the right result is no `/moldea/**` change.

This avoids noisy documentation churn while still preventing silent drift.

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

Relevance-triggered activation does not initialize `moldea` in an unrelated repository. Adoption is established by explicit developer intent or current authorized work introducing canonical state.

If the developer prohibits corresponding `moldea` changes, the coding agent respects that scope, completes the authorized implementation, reports likely drift, and does not claim alignment.

When an Agent Skill copy or consumer belongs to another Git repository, each repository keeps its own authority and verification boundary. Coordinated changes are reported as non-atomic, and a change on one side never proves the other side is complete.
