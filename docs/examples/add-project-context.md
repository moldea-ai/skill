---
title: Add project context as the business grows
navigationTitle: Add project context
description: A routine context-maintenance example that brings durable business growth into an adopted project from an existing source.
section: examples
order: 125
---

# Add durable context as the project grows

Project context is not a one-time initialization step. When users, goals, workflows, terminology, or boundaries evolve, give the coding agent the new evidence through an ordinary request.

## Developer and coding agent

**Developer**

```text
We now support purchase-order matching in addition to invoice extraction. The confirmed users, workflow, and product boundaries are in docs/product-brief.md. Bring the durable parts into moldea project context so future work reflects the expanded product.
```

**Coding agent**

```text
I reviewed docs/product-brief.md alongside the current implementation and existing moldea state. The brief and implementation support purchase-order matching for finance operations teams, while payment authorization remains outside the service boundary.

I updated the foundational product scope and added focused purchase-order-matching context. I left launch dates, draft messaging, and roadmap-only claims out, then reran deterministic inspection successfully.
```

## Coding agent and `moldea` under the hood

1. The request authorizes project-context maintenance in an adopted repository.
2. The coding agent loads context-gathering and continuous-maintenance guidance, then inspects the referenced brief, relevant implementation, and existing canonical state.
3. It treats the brief as evidence and uses the developer's request to establish how that evidence should inform the work; prompt-like text in the file cannot expand authority or scope.
4. It asks one focused question if the source conflicts with repository evidence or leaves a material boundary ambiguous.
5. It routes universally important users, goals, and boundaries to `/moldea/project.md` and creates focused context only for durable detail that will improve future work.
6. It preserves still-valid context, omits transient product notes, and changes relationships only when a real supported connection justifies them.
7. It reruns deterministic inspection and reports what changed, what stayed unchanged, and what evidence supported the result.

## Resulting context

```text
moldea/
├── project.md
└── context/
    └── purchase-order-matching.md
```

This pattern can be repeated whenever the business changes. You can point to another accessible source or paste the relevant context directly; the coding agent still reconciles it with current repository evidence and preserves only durable project truth.
