---
title: What the skill can do
navigationTitle: Capabilities
description: A complete guide to planning, initialization, agent and skill design, maintenance, evaluation, reconciliation, and validation.
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

## Create and refine Agent Skills

`moldea` can help a coding agent understand, create, and maintain repository-local Agent Skills as complete reusable artifacts:

- a precise activation description and valid portable frontmatter
- a concise universal `SKILL.md` workflow
- focused references loaded only when needed
- safe scripts with explicit inputs, outputs, supported environments, side effects, and verification
- assets used for generated output without placing them in model context unnecessarily
- synchronized host metadata, invocation policy, installed or distributed copies, consumers, and runtime registrations

The coding agent first decides whether the behavior belongs in a skill, protected coding instructions, an agent instruction, a tool, deterministic software, or ordinary documentation. It does not create a parallel `/moldea/skills` store or treat a skill directory as proof that a runtime agent receives the skill.

## Maintain context as understanding evolves

Once a repository adopts `moldea`, sharing potentially durable project knowledge or requesting a behavior-affecting change can activate continuous maintenance even when your request does not mention `moldea`.

The coding agent classifies supplied knowledge by meaning rather than format, traces affected context and behavior, and updates only representations whose truth actually changed. Clear current truth and explicit corrections can be maintained. Proposed, transient, speculative, secret, or materially ambiguous information is omitted or clarified first. Each affected fact stays with its established authoritative owner, so ordinary maintenance does not create parallel current truth. A correct outcome can be no `/moldea/**` edit.

If direct probes do not establish the complete canonical foundation and owned README awareness block, the project is unadopted. Partial or inconsistent artifacts do not create a separate status. The coding agent completes the authorized request, reports the precise gap, preserves existing content, and may recommend `Initialize moldea` as an optional way to give future coding agents durable Git-owned context.

## Compress accumulated project context

A natural request to consolidate, deduplicate, organize, clean up, or compress canonical context selects explicit compression within Maintain. The coding agent can consolidate proven duplicates into their established owner, split mixed-responsibility documents, remove proven superseded wording, and synchronize manifest relationships, references, consumers, and directly affected documentation.

Compression preserves every distinct established fact, accepted rationale, relevant requirement, unresolved boundary, relationship, and consumer. Consequential conflicting claims stop the operation before writes and produce one focused question. This capability reorganizes repository-owned context only. It does not manage host context windows, conversation compaction, prompt caches, token budgets, or model internals, and it does not claim token savings.

## Evaluate alignment

Evaluation is read-only. It first reports whether the project is adopted or unadopted, then combines deterministic inspection with proportional semantic analysis and reports:

- deterministic diagnostics
- confirmed semantic problems
- material ambiguities
- relevant unresolved requirements
- material evidence limitations

Evaluation never repairs tooling, changes dependencies, or writes repository files. These concrete findings remain separate, and project status is only adopted or unadopted.

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
