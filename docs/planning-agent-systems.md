---
title: Plan agent-enabled systems
navigationTitle: Agent-system planning
description: Start from the objective and decide what belongs to deterministic software, tools, skills, agents, or human control.
section: workflows
order: 50
---

# Plan from the objective, not from an agent count

Ask for `moldea` planning when you want to decide how an AI-enabled objective should be divided among agents, reusable Agent Skills, deterministic software, services or tools, and human control.

```text
Plan an agent system for personalized ecommerce promotions. Decide which responsibilities should remain deterministic.
```

The operation is read-only. It does not initialize `moldea`, install tooling, create a canonical plan file, or begin implementation.

Runtime selection remains optional unless you request it or it materially changes the recommendation. When you explicitly request runtime identity and a safe exact repository-local CLI is already available, the coding agent runs `compatibility --json`. Its inventory proves only which adapters are available, so the plan leaves runtime selection open unless source-owned target documentation and repository behavioral evidence establish a fit.

## Establish the outcome

The coding agent identifies the recipient, trigger or cadence, deliverables, success criteria, constraints, side effects, permissions, privacy, failure expectations, and prohibited outcomes that shape the system.

It begins with instructions, README content, manifests, and canonical state. When that high-level view is sparse, it inspects a bounded root inventory and searches objective terms across ordinary source, documentation, configuration, and tests before claiming that project evidence is unavailable. A path listing is navigation, not evidence, so it reads the material files it finds. It then follows the material workflows, services, rules, data ownership, schemas, APIs, integrations, jobs, queues, approvals, and AI usage. The recommendation names the exact paths read and the current components and contracts they establish.

## Classify responsibilities

Each cohesive responsibility is assigned to one or more explicit owners:

- deterministic application logic
- deterministic data or transformation logic
- an existing or proposed service or runtime-native tool
- a reusable Agent Skill for on-demand coding-agent knowledge or workflow
- an AI agent
- human control

Fixed calculations, eligibility rules, filtering, persistence, delivery mechanics, and predictable sequencing stay deterministic unless repository evidence proves a real need for model reasoning.

An Agent Skill is not treated as an independently executing agent or as authority to perform side effects described by its workflow.

## Justify every agent

A separate agent is warranted when it creates a meaningful boundary for specialized context, permissions, failure isolation, routing, reusable reasoning, independent evaluation, or maintainable ownership.

Every material objective responsibility remains represented. Model-reasoning responsibilities with incompatible private context, permissions, trust, or failure boundaries remain separate unless reliable evidence shows that deterministic software can replace one. Public research and privileged project or customer reasoning stay separated when their data boundaries conflict. A smaller count is not useful when it drops a responsibility or creates one overprivileged agent.

The recommendation may contain no agents. It avoids fashionable supervisors, critics, autonomous loops, memory systems, or model-based routers unless the objective genuinely requires them.

## Make control explicit

The plan identifies authoritative data, allowed readers and writers, persistence, deterministic enforcement, model input and output contracts, recommendation versus execution authority, human approvals, least-privilege access, state ownership, and failure boundaries. It preserves the approval scope already established by the repository, including human approval for every publication when required.

It produces one preferred architecture and an implementation sequence that validates risky services, schemas, capabilities, agent boundaries, routing, tests, and runtime integration early. This build order is distinct from the system's runtime control flow and remains part of a zero-agent recommendation.

When one material authority or ownership decision remains unresolved, the coding agent still returns the invariant architecture supported by evidence. It identifies the exact branch that cannot be finalized, asks one focused question, and does not present the partial recommendation as a complete plan.
