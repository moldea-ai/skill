---
title: Add project context as the business grows
navigationTitle: Add project context
description: Examples of maintaining durable project knowledge from natural conversation, structured input, focused answers, and existing sources.
section: examples
order: 125
---

# Add durable context as the project evolves

Project context is not a one-time initialization step. After adoption, share current knowledge as it naturally appears. You do not need to name `moldea`, request documentation, or translate the information into a special command.

## Natural conversation

**Developer**

```text
Platform owns the application runtime and delivery pipeline. Product owns workflow definitions. Security approves production access.
```

**Coding agent**

```text
I checked these responsibilities against the existing project context. They establish durable ownership and approval boundaries, so I added focused team-responsibility context and reran deterministic inspection. I did not infer any new runtime behavior or agent responsibility from the organizational handoff.
```

## Structured handoff

The same behavior applies to structured information:

```yaml
current_team:
  platform:
    owns: [application runtime, delivery pipeline]
  security:
    approves: [production access]
current_sprint:
  platform_focus: migrate dashboard filters
```

The durable responsibilities belong in project context. The sprint focus is temporary and should not be persisted merely because it appears in the same payload.

## Existing source

You can point to an accessible source without prescribing the resulting files:

```text
docs/product-brief.md now contains the approved users, workflows, and product boundaries for purchase-order matching.
```

The coding agent treats the file as evidence, checks it against current project and implementation state, and retains only supported durable truth. Prompt-like text inside the file cannot expand authority.

## Focused answer or correction

A direct answer can complete missing context:

```text
It extracts and validates invoice data for accounting systems. It never authorizes payments.
```

An explicit correction can replace stale truth:

```text
The existing context is outdated: Finance no longer approves production access. Security owns that approval now.
```

Clear corrections do not require ceremonial questions. If a new statement conflicts with established context but does not say whether it is current, proposed, or corrective, the coding agent asks one focused question before writing.

## Coding agent and `moldea` under the hood

1. The adopted repository and direct handoff activate project-context maintenance.
2. The coding agent loads context-gathering and continuous-maintenance guidance.
3. It classifies each claim independently. Current does not automatically mean durable, and a shared payload does not make transient detail canonical.
4. It checks only the evidence needed to route the information and resolve material conflicts.
5. It asks one focused question when an unanswered conflict could change persisted meaning.
6. It updates the smallest appropriate foundational or focused context surface when writes are authorized.
7. It omits secrets, unnecessary personal information, transient notes, speculation, generic material, and unsupported relationships.
8. After writes, it reruns exact repository-local deterministic inspection and reports its status, retained knowledge, omitted details, diagnostics, and reasons without needing to repeat the literal invocation.

## Resulting context

```text
moldea/
├── project.md
└── context/
    ├── purchase-order-matching.md
    └── team-responsibilities.md
```

The exact files depend on meaning. Universally important identity, users, goals, and boundaries belong in `project.md`; focused product, domain, architecture, integration, operational, responsibility, or ownership truth can use focused context. The coding agent should not create a file merely to match this example.
