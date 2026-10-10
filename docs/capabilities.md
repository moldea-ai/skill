---
title: Capability reference
navigationTitle: Capability reference
description: Technical reference for project-context adoption and maintenance, agent and skill design, evaluation, reconciliation, and validation.
section: start
order: 20
---

# What `moldea` can do

Start with the [visual Capabilities page](/capabilities/) to explore 48 requests with connected artifacts, expected outcomes, and evidence boundaries. This reference explains the exact behavior and boundaries.

`moldea` keeps durable project knowledge in Git and brings relevant context into coding-agent planning and development. You can ask to use saved rules when planning an ordinary API change, maintain approved project facts, or organize accumulated context without creating a runtime agent.

The same foundation supports the agent and skill capabilities below. Direct context requests and declared implementation relationships determine which knowledge is relevant; the skill does not load all project context for every task.

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

Once a repository adopts `moldea`, its managed README block routes repository-aware hosts to the repository-bound skill entrypoint for the two-byte relevance gate. Continuous maintenance activates only when a known task path matches a declared binding or `affectedBy` relationship. Known task paths include exact repository paths explicitly named or targeted by the developer, even when unchanged, plus any complete changed-path set already established by the host. Generic project knowledge and unrelated work stop at the gate without loading workflow references or running the CLI.

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

Validation runs the installed skill’s bounded repository-local boundary. It checks repository format and declared relationships, including supported source patterns for instruction loading, exports, registrations, tools, schemas, and runtime integration. A confirmed mismatch is an error. A relationship that cannot be proved remains explicitly unverified with a warning; a correct custom design does not need to be rewritten to remove that warning.

Validity and inspection completion are separate. `valid: true` means no error diagnostics; `runtimeInspection: incomplete` identifies remaining unverified relationships. An operational or resource-limit failure is not a completed validity result. Static validation does not establish semantic alignment or production readiness.

## Repair a project

When an initialized project has broken, missing, stale, or incomplete `moldea` state, ask the coding agent to `Fix moldea`. The coding agent establishes the current failure from project evidence, repairs the smallest coherent surface, and verifies the result before reporting completion.

Repair may recover necessary repository-local CLI tooling to the installed skill’s exact validated repair target, using the established package manager with scripts disabled. It preserves host restrictions, unrelated dependency locks, and healthy newer compatible tooling. Downgrades and explicit version-policy conflicts need direction. Repair does not silently initialize an unadopted project, invent policy, broadly upgrade dependencies, or hide unresolved ambiguity. See [the evaluation and repair workflow](/docs/evaluate-reconcile-validate/#repair-a-project) for the complete contract.

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
