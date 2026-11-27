---
title: Initialize project context
navigationTitle: Initialize a project
description: Map project context through guided rounds and validate the scope you choose to cover.
section: examples
order: 120
---

# Initialize a project in guided rounds

## When a foundation needs clarification

If the README and source do not establish the project's purpose, the coding agent says it has not adopted the repository and asks what the project does and whom it serves.

## Some context, but a material gap

If the evidence establishes that the project handles invoices but leaves payment authority unclear, the coding agent asks whether the service extracts fields or also authorizes payments. Both clarification paths stop before writing.

You can include a project brief with the request. The coding agent uses it with repository evidence and records only durable facts.

## Map the first area

> **You**
>
> Initialize moldea

Trailside's README and source establish an outdoor gear store backend for customers and support. The coding agent writes the foundation, links it from README and integrates AGENTS.md. It identifies Orders and Refunds from the project index and inspected code.

> **Coding agent**
>
> **Round 1**
>
> Trailside serves customers and support with order and refund workflows.
>
> Coverage: 0 of 2 areas. Agents: none found.
>
> Files changed: `moldea/project.md`, `moldea/moldea.yaml`, `README.md` and `AGENTS.md`.
>
> Gaps: Refunds and Orders.
>
> 1. `src/refund-policy.ts` limits requests to 30 completed days and leaves eligibility to the application. Record that rule under Refunds and link the context to this file?

> **You**
>
> Yes.

> **Coding agent**
>
> Refunds is mapped. I added `moldea/context/refund-policy.md`, its `affectedBy` declaration, and the Refunds link in `project.md`.
>
> 1. Continue with Orders.
> 2. Stop here and validate the covered scope.

An answer by number can confirm or correct one item. **Skip** keeps its proposals unwritten and the gaps visible. If you leave the round unanswered, **continue** returns to it in the same conversation.

> **You**
>
> Stop here.

> **Coding agent**
>
> Trailside is adopted. Structural validation passed with no errors or warnings.
>
> Coverage: 1 of 2 areas. Refunds is linked to `src/refund-policy.ts`. Orders remains unmapped. No agents were found or registered.
>
> Next: Ask “Help moldea learn the Orders area” to map it later.

```text
moldea/
├── moldea.yaml
├── project.md
└── context/
    └── refund-policy.md
```

On this normal path the agent validates once, after the last write and any native checks. With existing agents, round 1 can include one registration proposal. The request **Initialize moldea including my agents** supplies permission for the evidenced responsibilities and needs no registration question.
