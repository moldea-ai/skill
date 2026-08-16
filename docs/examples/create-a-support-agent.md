---
title: Create a support agent
navigationTitle: Create a support agent
description: An end-to-end example of project grounding, agent behavior, tool contracts, runtime provenance, tests, and canonical state.
section: examples
order: 110
---

# Create a support agent from repository truth

## Developer and coding agent

**Developer**

```text
Create a customer-support agent for this application. It should answer order questions and escalate refund requests it cannot safely resolve.
```

**Coding agent**

```text
I found the existing order lookup service, refund policy, support queue, and runtime construction. I will establish the minimum `moldea` foundation, define one support-agent responsibility, bind the existing order tool and runtime agent, connect the canonical instruction to the runtime, add focused tests, and preserve refund approval as deterministic application behavior.
```

## Coding agent and `moldea` under the hood

1. The coding agent selects a write-capable agent-creation workflow and confirms that the request authorizes adoption.
2. It reads local-tooling, context-gathering, continuous-maintenance, and agent-design guidance.
3. It verifies the repository's package manager and exact local CLI provider, then runs deterministic inspection.
4. It gathers the minimum order, refund, authorization, queue, schema, and runtime evidence needed to establish behavior.
5. It creates `/moldea/moldea.yaml` and `/moldea/project.md`, then the support agent's description and instruction.
6. It registers only real repository-local runtime, schema, and tool relationships.
7. It makes the runtime derive its instruction from the canonical asset and removes any superseded independent instruction source within scope.
8. It adds tests at the real integration boundary, runs project checks, and reruns deterministic inspection.

## Representative resulting state

```text
moldea/
├── moldea.yaml
├── project.md
└── agents/
    └── support-agent/
        ├── description.md
        └── instruction.md
```

A handoff description appears only if another runtime participant needs a real routing hint. A missing implementation contract remains an explicit unresolved requirement rather than invented behavior.
