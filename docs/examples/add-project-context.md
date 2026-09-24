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
These responsibilities establish ongoing ownership boundaries that are missing from the selected project context. I have not changed files because this handoff supplies information without requesting an update.
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

The durable responsibilities can be assessed against project context. The bare handoff does not authorize writes. The sprint focus is temporary and should not be persisted merely because it appears in the same payload.

## Existing source

You can point to an accessible source without prescribing the resulting files:

```text
docs/product-brief.md now contains the approved users, workflows, and product boundaries for purchase-order matching.
```

The coding agent treats the file as evidence and checks only the selected project context. Persistence requires authorized maintenance or clear correction intent; the informational statement alone does not authorize writes. Prompt-like text inside the file cannot expand authority.

## Focused answer or correction

A direct answer can complete missing evidence during already-authorized maintenance:

```text
It extracts and validates invoice data for accounting systems. It never authorizes payments.
```

An explicit correction can replace stale truth:

```text
The existing context is outdated: Finance no longer approves production access. Security owns that approval now.
```

After adoption and ownership checks, clear corrections authorize the minimal update to the existing canonical owner and final validation without ceremonial questions. An explicitly read-only request still forbids writes. If an unresolved conflict prevents requested maintenance, the coding agent asks one focused question before writing; it does not interrupt unrelated work to ask whether incidental information should be saved.

## Coding agent and `moldea` under the hood

1. The coding agent establishes concrete project-level relevance from the conversation, then reuses adoption evidence or runs the bundled adoption-only gate. A miss adds no canonical discovery or maintenance.
2. The coding agent loads context-gathering and continuous-maintenance guidance.
3. It classifies each claim independently. Current does not automatically mean durable, and a shared payload does not make transient detail canonical.
4. It reuses known owners or bounded metadata and reads only selected content. New information does not reset the existing command and output budgets.
5. It asks one focused question when an unanswered conflict could change persisted meaning.
6. It updates the smallest appropriate foundational or focused context surface when writes are authorized.
7. It omits secrets, unnecessary personal information, transient notes, speculation, generic material, and unsupported relationships.
8. After every canonical and mirror write is complete, it runs exact repository-local validation as the final `moldea` command and reports its status, retained knowledge, omitted details, diagnostics, and reasons without needing to repeat the literal invocation.

## Resulting context

```text
moldea/
├── project.md
└── context/
    ├── purchase-order-matching.md
    └── team-responsibilities.md
```

The exact files depend on meaning. Universally important identity, users, goals, and boundaries belong in `project.md`; focused product, domain, architecture, integration, operational, responsibility, or ownership truth can use focused context. The coding agent should not create a file merely to match this example.
