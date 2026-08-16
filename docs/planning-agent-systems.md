---
title: Plan agent-enabled systems
navigationTitle: Agent-system planning
description: Start from the objective and decide what belongs to deterministic software, tools, agents, or human control.
section: workflows
order: 50
---

# Plan from the objective, not from an agent count

Ask for `moldea` planning when you want to decide how an AI-enabled objective should be divided among agents, deterministic software, services or tools, and human control.

```text
Plan an agent system for personalized ecommerce promotions. Decide which responsibilities should remain deterministic.
```

The operation is read-only. It does not initialize `moldea`, install tooling, create a canonical plan file, or begin implementation.

## Establish the outcome

The coding agent identifies the recipient, trigger or cadence, deliverables, success criteria, constraints, side effects, permissions, privacy, failure expectations, and prohibited outcomes that shape the system.

It inspects existing workflows, services, rules, data ownership, schemas, APIs, integrations, jobs, queues, approvals, and AI usage before asking the developer to repeat discoverable facts.

## Classify responsibilities

Each cohesive responsibility is assigned to one or more explicit owners:

- deterministic application logic
- deterministic data or transformation logic
- an existing or proposed service or runtime-native tool
- an AI agent
- human control

Fixed calculations, eligibility rules, filtering, persistence, delivery mechanics, and predictable sequencing stay deterministic unless repository evidence proves a real need for model reasoning.

## Justify every agent

A separate agent is warranted when it creates a meaningful boundary for specialized context, permissions, failure isolation, routing, reusable reasoning, independent evaluation, or maintainable ownership.

The recommendation may contain no agents. It avoids fashionable supervisors, critics, autonomous loops, memory systems, or model-based routers unless the objective genuinely requires them.

## Make control explicit

The plan identifies authoritative data, allowed readers and writers, deterministic enforcement, recommendation versus execution authority, human approvals, least-privilege access, state ownership, contracts, and failure boundaries.

It produces one preferred architecture and an implementation sequence that validates risky services, schemas, capabilities, agent boundaries, routing, tests, and runtime integration early.
