---
title: Git-owned project state
navigationTitle: Project state
description: Understand the canonical project, context, decision, runtime, agent, relationship, variable, mirror, and unresolved state stored in the repository.
section: concepts
order: 40
---

# Git-owned project state

A project owns its canonical `moldea` state under `/moldea/**`. The state is reviewed, versioned, and changed with the implementation rather than hidden in a hosted memory store.

## Minimum foundation

Initialization creates only:

```text
moldea/
├── moldea.yaml
└── project.md
```

`project.md` captures concise foundational identity, purpose, users, goals, boundaries, and universally important facts. `moldea.yaml` registers versioned relationships and project or agent configuration supported by the repository format.

## Focused context

Durable domain, architecture, security, integration, terminology, or operational truth can live under `/moldea/context/**`. Focused context is created only when it improves understanding or future change analysis; it is not an exhaustive repository inventory.

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

The manifest can register real repository-local relationships for runtime agents, schemas, instruction loaders, variable providers, tools, skills, mirrors, focused context, decisions, and broader impact paths. A relationship is added only when a real current artifact exists and the active format supports it.

## Runtime variables

Runtime-varying values use declared `{{VARIABLE_NAME}}` placeholders. Definitions explain the values and can bind real providers, but actual values remain private and transient.

## Mirrors

A declared mirror is an exact Git-tracked textual copy of a canonical agent instruction for a runtime that requires another path. The canonical instruction changes first and every mirror is synchronized in the same change.

## Unresolved requirements

An unresolved requirement records a material current gap with a stable ID, category, effect, precise current-state description, and explicit resolution criteria. It is not a roadmap or generic issue tracker, and a related file change does not resolve it automatically.
