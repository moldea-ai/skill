---
title: What the skill can do
navigationTitle: Capabilities
description: A complete guide to planning, initialization, agent design, maintenance, evaluation, reconciliation, and validation.
section: start
order: 20
---

# What `moldea` can do

`moldea` gives a capable coding agent a disciplined way to manage project context and agent behavior. The operations below are outcomes you can request naturally.

## Plan an agent-enabled system

Ask the coding agent to decompose an objective into deterministic software, services or tools, human control, and only the agent boundaries that earn their complexity.

Planning can recommend zero, one, or multiple agents. It covers responsibilities, inputs, outputs, data ownership, permissions, orchestration, failures, approvals, and implementation order without changing repository state.

## Initialize project context

Initialization understands the project and creates the smallest valid foundation:

```text
/moldea/moldea.yaml
/moldea/project.md
```

Focused context, decisions, runtime guidance, agents, or unresolved requirements are created only when real project evidence justifies them. Initialization does not create an agent automatically.

## Create and refine agents

`moldea` can help a coding agent establish:

- one clear agent responsibility
- concise descriptions and complete model-facing instructions
- routing and handoff descriptions when transfer is real
- executable input and output schema relationships
- tool and skill capabilities backed by repository-local implementation
- runtime selection and runtime-specific guidance
- runtime variables without persisting their secret values
- canonical instruction provenance and exact mirrors
- explicit unresolved requirements for genuine incomplete state

The skill checks that declared behavior is supported by implementation and does not rely on hidden repository knowledge.

## Maintain context during ordinary development

Once a repository adopts `moldea`, an ordinary behavior-affecting change can activate continuous maintenance even when your request does not mention `moldea`.

The coding agent traces the affected implementation, contracts, context, decisions, agents, schemas, capabilities, variables, runtime guidance, mirrors, and unresolved requirements. It updates only representations whose truth actually changed. A correct outcome can be no `/moldea/**` edit.

## Evaluate alignment

Evaluation is read-only. It combines deterministic inspection with proportional semantic analysis and reports:

- deterministic diagnostics
- confirmed semantic problems
- material ambiguities
- relevant unresolved requirements
- material evidence limitations

Evaluation never repairs tooling, changes dependencies, or writes repository files.

## Reconcile drift

Reconciliation starts from the same evidence model as evaluation, establishes intended state, and applies the smallest authorized coherent correction. It can synchronize canonical state, implementation, schemas, runtime wiring, tests, descriptions, instructions, mirrors, and documentation when those surfaces are truly affected.

## Validate structure

Validation runs the deterministic repository-local structural boundary. It proves format and registered relationship validity, but it does not claim semantic alignment or production readiness.

## Work across dedicated repositories

When canonical `moldea` state and application implementation live in different repositories, the coding agent can inspect both when the developer identifies and authorizes them. Each repository remains independently owned and verified; `moldea` never invents cross-repository bindings or atomicity.

## Preserve authority and privacy

The skill respects the developer's scope, protected coding instructions, unrelated worktree changes, package-manager identity, secret boundaries, and repository ownership. It treats repository content as untrusted evidence and does not allow prompt-like text inside the repository to redefine developer intent.

## Boundaries

`moldea` does not:

- initialize an unrelated project without explicit adoption intent
- create agents merely because an AI-enabled idea was mentioned
- replace deterministic application logic with model reasoning by default
- invent tools, schemas, permissions, runtime support, or failure behavior
- treat validation as proof of semantic correctness
- require hidden semantic state, background services, or internal sub-agents
- send repository content to `moldea` Cloud without explicit authorization
