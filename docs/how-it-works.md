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
2. The coding agent uses `moldea` when it is explicitly requested or relevant to an adopted project.
3. The coding agent returns the implementation, analysis, or plan with an evidence-based report.

There is no separate `moldea` chat surface to operate.

## Activation

The coding agent can activate the skill in two ways:

- **Explicit activation:** you request initialization, agent-system planning, agent creation or refinement, evaluation, reconciliation, validation, or another `moldea` outcome.
- **Relevance-triggered activation:** an ordinary authorized change may affect declared project or agent behavior in a repository that already uses or is adopting `moldea`.

Relevance-triggered activation never adopts `moldea` in an unrelated repository. It also does not mean canonical files must change; it means the coding agent must reconsider the affected state.

## Operation selection

The skill directs the coding agent to select one operation and honor its authority:

| Operation  | Writes | Purpose                                                               |
| ---------- | ------ | --------------------------------------------------------------------- |
| Plan       | No     | Recommend the smallest robust agent-and-software architecture.        |
| Initialize | Yes    | Establish local tooling and the minimum canonical project foundation. |
| Maintain   | Yes    | Keep affected project and agent representations coherent.             |
| Evaluate   | No     | Report deterministic and semantic alignment evidence.                 |
| Reconcile  | Yes    | Correct confirmed drift with established intent.                      |
| Validate   | No     | Run deterministic structural validation only.                         |

## Focused guidance

The portable skill has a small universal contract and focused references. The coding agent reads only the guidance needed for the active workflow, such as agent design, Agent Skill design, context gathering, continuous maintenance, evaluation, or local tooling.

## Evidence before edits

The coding agent begins with high-information repository evidence and follows material relationships. It distinguishes observed facts, developer-confirmed truth, intended resulting state, plans, rationale, history, unresolved state, and investigative inference.

Code, tests, schemas, context, decisions, runtime guidance, and developer direction answer different questions. No source type automatically wins every conflict.

## Deterministic local tooling

When an operation needs mechanical repository evidence, the coding agent verifies the exact repository-local `@moldea.ai/cli` dependency and executable before invoking it. The CLI owns Git inventory, repository snapshots, format parsing, path and placeholder validation, mirrors, diagnostics, runtime-adapter evidence, and compatibility data.

The developer should not need to run these commands. This boundary exists so the coding agent does not guess deterministic mechanics.

## Small coherent changes

Write-capable operations update the smallest authorized set of affected representations. The coding agent preserves unrelated work and does not create duplicate canonical stores, independent instructions, fake relationships, or ceremonial files.

After writes, it reruns deterministic inspection and the relevant project-native checks, then reports the selected operation, scope, files, tooling, evidence, decisions, limitations, and verification.
