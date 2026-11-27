---
title: Create a support agent
navigationTitle: Create a support agent
description: An end-to-end example of project grounding, agent behavior, tool contracts, runtime provenance, tests, and canonical state.
section: examples
order: 110
---

# Create a support agent from repository truth

## Developer and coding agent

This repository is already adopted and its refund policy is mapped.

> **You**
>
> Create a customer-support agent for this application. It should answer order questions and escalate refund requests it cannot safely resolve.

> **Coding agent**
>
> I found the existing order lookup service, refund policy, support queue, and runtime construction. I will use the saved context, define one support-agent responsibility, bind the existing order tool and runtime agent, connect the canonical instruction to the runtime, add focused tests, and preserve refund approval as deterministic application behavior.

## Coding agent and `moldea` under the hood

1. The coding agent selects a write-capable agent-creation workflow and confirms adoption and the requested implementation scope.
2. It reads the Agents reference for the selected operation and follows only the additional boundary reference that the implementation actually reaches.
3. It uses the bundled CLI for bounded structural checks when needed.
4. It gathers the minimum order, refund, authorization, queue, schema, and runtime evidence needed to establish behavior.
5. It creates the support agent's canonical description and instruction and updates the manifest.
6. It registers only real repository-local runtime, schema, and tool relationships.
7. It makes the runtime derive its instruction from the canonical asset and removes any superseded independent instruction source within scope.
8. It adds tests at the real integration boundary, runs project checks, then validates after the last write.

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

`description.md` is the routing description. Report any missing implementation or connection evidence with the smallest resolving check.
