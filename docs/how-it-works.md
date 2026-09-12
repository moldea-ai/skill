---
title: How it works
navigationTitle: How it works
description: Follow the developer-facing experience and the optional evidence, guidance, and deterministic tooling used underneath.
section: concepts
order: 30
---

# Natural on the surface, rigorous underneath

The normal experience has three steps:

1. You describe the outcome to your coding agent.
2. The managed README block routes the repository-aware host to the repository-bound skill, whose two-byte local gate decides whether the task explicitly requests a `moldea` operation or changes canonical state, the managed README block, or a path reached through a declared relationship.
3. The coding agent returns the implementation, analysis, or plan with an evidence-based report.

There is no separate `moldea` chat surface to operate.

## Activation

The coding agent can activate the skill in four ways:

- **Explicit activation:** you request initialization, or you request agent-system planning, agent creation or refinement, evaluation, reconciliation, validation, or another repository-dependent `moldea` outcome in an adopted repository.
- **Canonical activation:** the task changes a path under `/moldea/**`.
- **Managed README activation:** a changed README hunk intersects the content between the full-line `moldea` markers.
- **Declared-relationship activation:** in an adopted repository, a known task path exactly matches a binding or `affectedBy` declaration. The task-path set combines exact repository paths explicitly named or targeted by the developer, whether changed or unchanged, with the complete changed-path set already established by the host when applicable.

Generic references to project context, outdated context, durable knowledge, canonical alignment, documentation, or maintenance do not by themselves activate `moldea` work. Neither does an answer to a question or a host planning, review, Git, commit, or publication command. The managed README block makes entrypoint selection deterministic for repository-aware hosts; it does not make every task relevant. For a repository-dependent task, the repository-bound skill entrypoint runs the deterministic gate first without running Git or searching for a canonical destination solely to discover paths. If no activation path matches, it abstains silently without loading workflow references, running the CLI, recommending adoption, adding a `moldea` status line, or later reactivating from a path discovered during the same request. Before adoption, initialization is the only repository-dependent `moldea` operation; the host can still perform its own generic planning and engineering workflows independently. A generic fact handoff never makes the host workflow search for or edit `/moldea/**` as an invented destination. Loading never establishes adoption or authorizes persistence. A project is adopted only when the complete canonical foundation and owned README awareness block exist.

## Operation selection

After initialization, the skill directs the coding agent to select one operation and honor its authority:

| Operation  | Writes | Purpose                                                                                           |
| ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| Plan       | No     | Recommend the smallest robust agent-and-software architecture.                                    |
| Initialize | Yes    | Establish local tooling and the minimum canonical project foundation.                             |
| Maintain   | Yes    | Keep affected project and agent representations coherent, including explicit context compression. |
| Evaluate   | No     | Report deterministic and semantic alignment evidence.                                             |
| Reconcile  | Yes    | Correct confirmed drift with established intent.                                                  |
| Validate   | No     | Run deterministic structural validation only.                                                     |

## Focused guidance

The portable skill has a small universal contract and focused references. The coding agent reads only the guidance needed for the active workflow, such as agent design, Agent Skill design, context gathering, continuous maintenance, explicit context compression, evaluation, or local tooling.

## Evidence before edits

The coding agent begins with high-information repository evidence and follows material relationships. It distinguishes observed facts, developer-confirmed truth, intended resulting state, plans, rationale, history, unresolved state, and investigative inference. The recommended inspection order reduces discovery cost but does not rank authority. Each material claim is resolved by its actual owner, a current explicit developer selection, or an independent source that establishes the disputed fact. Conflicting sources remain unresolved when no such resolver exists.

Code proves current behavior and instructions declare model-facing behavior, but neither selects intended policy. Tests, schemas, context, decisions, runtime guidance, and developer direction answer other questions. Reconciliation, validation, and mirror synchronization cannot choose truth merely by making surfaces match.

Before a semantic write, the coding agent directly establishes adoption, inspects high-information evidence, classifies the relevant claims, and confirms authority for the exact change. Insufficient foundations and unexplained conflicts stop before dependencies or canonical state change.

## Deterministic local tooling

When an operation needs mechanical repository evidence, the coding agent uses the installed skill's closed launcher. The launcher verifies the compatible repository-local `@moldea.ai/cli` declaration, exact lockfile-selected installation, CLI/Core closure, executable, and path containment before invoking Node without a shell. The CLI owns Git inventory, repository snapshots, format parsing, path and placeholder validation, mirrors, diagnostics, and the installed package and adapter composition. The packages publication owns current technical targets, package eligibility ranges, patterns, provider limits, runtime-guidance expectations, implementation state, repository-format support, and verification dates. Website presentation labels do not affect the technical decision.

The developer should not need to run these commands. This boundary exists so the coding agent does not guess deterministic mechanics.

## Small coherent changes

Write-capable operations update the smallest authorized set of affected representations. The coding agent preserves unrelated work and does not create duplicate canonical stores, independent instructions, fake relationships, or ceremonial files. Ordinary maintenance removes only duplication or stale wording directly affected by the authorized change. A natural request to consolidate, deduplicate, organize, clean up, or compress canonical context authorizes broader loss-preserving reorganization: every unique current fact, accepted rationale, requirement, unresolved boundary, relationship, and consumer remains accounted for, and consequential conflicts stop before writes.

This context compression applies only to Git-owned project state. It does not manage a coding host's context window, conversation compaction, prompt cache, token budget, or internal model behavior, and it does not claim token savings.

After every canonical and mirror write is complete, it runs one final deterministic validation and the relevant project-native checks. A validation that precedes a later repair does not verify the resulting state. The coding agent then reports the selected operation, scope, files, tooling, evidence, decisions, limitations, and verification.
