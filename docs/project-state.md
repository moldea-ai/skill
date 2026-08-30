---
title: Git-owned project state
navigationTitle: Project state
description: Understand the canonical project, context, decision, runtime, agent, relationship, variable, mirror, and unresolved state stored in the repository.
section: concepts
order: 40
---

# Git-owned project state

A project owns its canonical `moldea` state under `/moldea/**`. The state is reviewed, versioned, and changed with the implementation rather than hidden in a hosted memory store.

Start with the [Repository format guide](/docs/repository-format/) for the complete structure and progressive examples. This page describes the responsibilities of each canonical state surface in more detail.

## Derived adoption state

A project is adopted when direct inspection establishes the complete canonical foundation and the owned README awareness block. Otherwise it is unadopted. This binary state is derived rather than stored in a status field. Partial or inconsistent artifacts remain unadopted, but the coding agent reports their exact paths and missing contract elements and preserves their contents instead of treating the repository as empty.

Adoption does not describe semantic quality. An adopted project can still have deterministic diagnostics, drift, conflicts, unresolved requirements, or evidence limitations. Those findings are reported concretely and do not alter the binary adoption state.

## Minimum foundation

Initialization creates only:

```text
moldea/
├── moldea.yaml
└── project.md
```

`project.md` captures concise foundational identity, purpose, users, goals, boundaries, and universally important facts. `moldea.yaml` registers versioned relationships and project or agent configuration supported by the repository format.

## Focused context

Durable domain, architecture, security, integration, terminology, team responsibility or ownership, and operational truth can live under `/moldea/context/**`. Focused context is created only when it improves understanding or future change analysis; it is not an exhaustive repository inventory.

## Decisions and runtime guidance

`/moldea/decisions/**` preserves active rationale when meaningful alternatives or consequences make the reason important. `/moldea/runtimes/**` explains project-specific runtime behavior that implementation and adapter evidence cannot establish reliably by themselves.

## Agents

Each registered agent has a stable lowercase kebab-case ID and owns:

```text
moldea/agents/<agent-id>/
├── description.md
├── instruction.md
└── handoff-description.md  # only when routing needs it
```

The description explains what the agent does. The optional handoff description explains when responsibility should transfer to it. The instruction is complete after the runtime gives the agent responsibility.

## Relationships and capabilities

The manifest can register real repository-local relationships for runtime agents, schemas, instruction loaders, variable providers, tools, skills, mirrors, focused context, decisions, and broader impact paths. A relationship is added only when a real current artifact exists and the active format supports it. Reliable evidence may also establish provider-hosted or externally implemented model-visible behavior that has no repository-local binding. Preserve that behavior in the canonical instruction or project-local runtime guidance without fabricating a manifest relationship.

## Repository-local Agent Skills

Reusable Agent Skills remain in their authoritative repository-native skill directories rather than under a canonical `/moldea/skills` store. Their `SKILL.md`, references, scripts, assets, host metadata, installation or distribution configuration, generated or installed copies, and consumers are maintained together when affected.

Authoritative source, installed, generated, cached, mirrored, and distributed copies remain distinct evidence. A manifest skill relationship means a real repository-local implementation is exposed to a runtime agent; the existence of a skill directory or installed coding-agent skill does not prove discovery, activation, consumption, or runtime registration.

## Runtime variables

Runtime-varying values use declared `{{VARIABLE_NAME}}` placeholders. Definitions explain the values and can bind real providers, but actual values remain private and transient.

## Mirrors

A declared mirror is an exact Git-tracked textual copy of a canonical agent instruction for a runtime that requires another path. The canonical instruction changes first and every mirror is synchronized in the same change.

## Unresolved requirements

An unresolved requirement records a material current gap with a stable ID, category, effect, precise current-state description, and explicit resolution criteria. It is not a roadmap or generic issue tracker, and a related file change does not resolve it automatically.

## Context ownership and compression

Each durable fact has one established authoritative owner. References and consumers point to that owner instead of maintaining parallel current truth. Ordinary maintenance removes only duplication or stale wording affected by the authorized change.

When the developer explicitly asks to consolidate, deduplicate, organize, clean up, or compress project context, the coding agent can reorganize the requested canonical scope. It preserves unique facts, accepted rationale, relevant requirements, unresolved boundaries, relationships, and consumers, and synchronizes paths and references when content moves. Consequential conflicting current claims stop writes and require one focused answer. This repository-state capability does not claim host context-window or token savings.
