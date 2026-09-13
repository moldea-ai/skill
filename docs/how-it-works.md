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
2. The managed README block points your coding agent to the installed skill. The skill recognizes agent-work intent from your conversation and checks initialization. Other tasks use a small local relationship check.
3. The coding agent returns the implementation, analysis, or plan with an evidence-based report.

There is no separate `moldea` chat surface to operate.

## Activation

The coding agent can activate the skill in four ways:

- **Direct activation:** after initialization, you ask to plan, build, review, or maintain AI agents, or request a specific `moldea` operation. Normal conversation is enough, even before the first agent or binding exists. Initialization itself requires an explicit request.
- **Canonical activation:** the task changes a path under `/moldea/**`.
- **Managed README activation:** a changed README hunk intersects the content between the full-line `moldea` markers.
- **Declared-relationship activation:** in an adopted repository, a known task path exactly matches a binding or `affectedBy` declaration. The task-path set combines exact repository paths explicitly named or targeted by the developer, whether changed or unchanged, with the complete changed-path set already established by the host when applicable.

You do not need special commands or `moldea` terminology. A follow-up continues the active task within its existing authorization; it does not activate from a particular phrase. Changing the subject resets that relevance. Unclear intent does not grant permission to write.

Generic context, documentation, architecture, SDK installation alone, and incidental mentions of agents do not activate agent work. Host command names alone do not activate it either. The README selects the entrypoint, not the workflow: direct agent work uses the adoption-only check; other known paths use relationship matching. A non-match continues the host task silently, without workflow references, CLI calls, or `moldea` reporting. Explicit initialization creates the foundation. An explicit [project-repair request](/docs/evaluate-reconcile-validate/#repair-a-project) may diagnose damaged adoption and restore established prior state, but cannot silently initialize. Other repository-dependent operations require the complete foundation and owned README block. Selection alone grants no write permission.

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

When an operation needs mechanical repository evidence, the coding agent uses the installed skill's closed launcher. The launcher verifies the compatible repository-local `@moldea.ai/cli` declaration, exact lockfile-selected installation, CLI/Core closure, executable, and path containment before invoking Node without a shell. The CLI owns Git inventory, repository snapshots, format parsing, path and placeholder validation, mirrors, diagnostics, and the installed package and adapter composition. The installed adapter contracts and local inspection evidence establish package eligibility, recognized source patterns and limitations for that installed implementation. The packages website remains a discovery catalog, not a required lookup during runtime work. Website presentation labels do not affect the technical decision.

The developer should not need to run these commands. This boundary exists so the coding agent does not guess deterministic mechanics.

## Small coherent changes

Write-capable operations update the smallest authorized set of affected representations. The coding agent preserves unrelated work and does not create duplicate canonical stores, independent instructions, fake relationships, or ceremonial files. Ordinary maintenance removes only duplication or stale wording directly affected by the authorized change. A natural request to consolidate, deduplicate, organize, clean up, or compress canonical context authorizes broader loss-preserving reorganization: every unique current fact, accepted rationale, requirement, unresolved boundary, relationship, and consumer remains accounted for, and consequential conflicts stop before writes.

This context compression applies only to Git-owned project state. It does not manage a coding host's context window, conversation compaction, prompt cache, token budget, or internal model behavior, and it does not claim token savings.

After every canonical and mirror write is complete, it runs one final deterministic validation and the relevant project-native checks. A validation that precedes a later repair does not verify the resulting state. The coding agent then reports the selected operation, scope, files, tooling, evidence, decisions, limitations, and verification.
