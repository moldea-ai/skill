---
title: Plan an agent-enabled system
navigationTitle: Plan an agent system
description: A read-only example that separates deterministic promotion rules, model reasoning, delivery services, and human approval.
section: examples
order: 100
---

# Plan personalized ecommerce promotions

## Developer and coding agent

**Developer**

```text
Plan an agent system for personalized ecommerce promotions. Decide what should remain ordinary software, and do not implement it yet.
```

**Coding agent**

```text
I recommend one promotion-copy agent, not a multi-agent hierarchy. Eligibility, discount calculation, inventory checks, budget enforcement, delivery, and experiment assignment remain deterministic. The agent receives an approved offer envelope and produces channel-specific copy. A human approves high-risk campaigns before delivery.

I will detail the contracts, permissions, failure paths, and implementation sequence. Planning changed no repository files.
```

## Coding agent and `moldea` under the hood

1. The coding agent recognizes explicit agent-system planning and selects the read-only `plan` operation.
2. The skill directs it to read the planning and context-gathering references.
3. It inspects the current promotion, catalog, pricing, campaign, approval, and delivery paths.
4. It decomposes outcome responsibilities before naming agents.
5. It keeps fixed rules and value-bearing changes deterministic.
6. It justifies the single model-reasoning boundary and makes the human approval boundary explicit.
7. It does not initialize `moldea`, install the CLI, create a plan artifact, or begin implementation.

## Result

The developer receives one actionable architecture grounded in the current repository. Proposed agents remain proposals until a later write-capable request establishes them.
