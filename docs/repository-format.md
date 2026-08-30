---
title: Repository format
navigationTitle: Repository format
description: Organize Git-owned project truth with a small foundation, focused context, explicit relationships, and grounded agent behavior that scales with the repository.
section: concepts
order: 35
---

# Organize project truth so it can grow

Repository format is the open, Git-owned structure that gives people and coding agents one predictable place to understand a project. It keeps durable project truth, agent behavior, and implementation relationships reviewable beside the code they describe.

This page introduces how to adopt the format. The [official Repository Format specification](https://packages.moldea.ai/repository-format/) defines the complete version `1` contract, including every supported file, manifest property, constraint, and conformance rule.

The format is deliberately additive. A new project begins with two files and earns more structure only when real context, rationale, runtime guidance, or agent behavior needs a durable owner.

The project is adopted only when direct probes establish the complete two-file canonical foundation and the owned README awareness block. Otherwise it is unadopted. Partial or inconsistent artifacts are preserved and reported precisely rather than represented through a third status or overwritten as a fresh scaffold.

## Start with two files

The minimum foundation is complete on its own:

```text
moldea/
├── moldea.yaml
└── project.md
```

`project.md` records concise project identity, purpose, users, goals, boundaries, and universally important facts. `moldea.yaml` declares the active format version and explicit relationships that deterministic inspection can verify.

A minimal manifest contains only the version:

```yaml
version: 1
```

Empty optional mappings are omitted. Initialization does not create placeholder directories, speculative context, or an agent the project has not asked for.

## Give each concern one clear home

Add a surface when it protects a distinct kind of durable truth:

| Concern            | Canonical home                            | Use it for                                                                                               |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Project foundation | `/moldea/project.md`                      | Identity, purpose, users, goals, boundaries, and shared facts                                            |
| Focused context    | `/moldea/context/**/*.md`                 | Domain, architecture, security, integration, terminology, or operational truth                           |
| Decisions          | `/moldea/decisions/<timestamp>-<slug>.md` | Active rationale whose alternatives or consequences matter                                               |
| Runtime guidance   | `/moldea/runtimes/**/*.md`                | Project-specific integration behavior that source and adapter evidence cannot establish alone            |
| Agent behavior     | `/moldea/agents/<agent-id>/`              | Canonical description, instruction, and optional routing description                                     |
| Relationships      | `/moldea/moldea.yaml`                     | Impact paths, bindings, capabilities, variables, mirrors, runtime selection, and unresolved requirements |

Repository-local Agent Skills stay in their authoritative repository-native directories. They are not copied into a parallel `/moldea/skills` store. Exact instruction mirrors also stay outside `/moldea/**` and are declared only when a runtime requires another path.

## Example: connect focused context to the code

Suppose support policy is durable enough to deserve focused context:

```text
moldea/
├── moldea.yaml
├── project.md
└── context/
    └── support-policy.md
```

The manifest can connect both foundation and focused context to the implementation surfaces that may affect them:

```yaml
version: 1

context:
  /moldea/project.md:
    affectedBy:
      - /src/**
  /moldea/context/support-policy.md:
    affectedBy:
      - /src/support/**
```

These relationships make future maintenance focused. They identify where relevant evidence may live without claiming that every matching code change must rewrite the context.

## Example: grow into a grounded agent

When the project adds a real support agent, the same foundation grows without changing ownership:

```text
moldea/
├── moldea.yaml
├── project.md
├── context/
│   └── support-policy.md
├── runtimes/
│   └── custom.md
└── agents/
    └── support-agent/
        ├── description.md
        └── instruction.md
src/
└── agents/
    ├── support-agent.ts
    └── support-agent.test-integration.ts
```

The manifest registers only relationships backed by current repository artifacts:

```yaml
version: 1

context:
  /moldea/project.md:
    affectedBy:
      - /src/**
  /moldea/context/support-policy.md:
    affectedBy:
      - /src/support/**

agents:
  support-agent:
    runtime:
      id: custom
      guidance: /moldea/runtimes/custom.md
    context:
      - /moldea/context/support-policy.md
    bindings:
      runtimeAgent:
        path: /src/agents/support-agent.ts
        symbol: createSupportAgent
    affectedBy:
      - /src/agents/support-agent.ts
      - /src/agents/support-agent.test-integration.ts
```

`description.md` explains what the agent does. `instruction.md` explains how it operates after receiving responsibility. The runtime binding points to the real implementation, and project-local guidance explains the custom integration. No file substitutes for another.

## Scale by adding evidence, not ceremony

Repository format stays efficient through a few operating principles:

1. **Keep the foundation concise.** Put universally important truth in `project.md`; move focused detail to the surface that owns it.
2. **Create only supported relationships.** Paths, symbols, capabilities, variables, and mirrors must refer to real current artifacts.
3. **Separate truth from rationale.** Context explains what is true. Decisions preserve why a consequential choice remains active.
4. **Keep canonical behavior singular.** Runtime instructions derive from the canonical agent instruction instead of becoming independently maintained copies.
5. **Let impact paths narrow future work.** `affectedBy` relationships guide evidence gathering while preserving a legitimate no-change result.
6. **Preserve genuine gaps explicitly.** Unresolved requirements record material incomplete state with clear resolution criteria; they are not a roadmap or substitute for asking the developer.
7. **Compress only with explicit intent.** Ordinary maintenance removes only duplication affected by the authorized change. A broader consolidation request may reorganize canonical context, but it must preserve every unique fact, rationale, requirement, unresolved boundary, relationship, and consumer and stop before consequential conflicts.

## What validates the structure

The repository-local `@moldea.ai/cli` reads the Git working tree and delegates Repository format interpretation to `@moldea.ai/core`. Validation checks canonical paths, strict manifest values, referenced files, decisions, agent assets, runtime availability, placeholders, mirrors, and adapter evidence without executing repository code.

The coding agent invokes that deterministic boundary when a workflow needs structural evidence. A valid structure does not automatically prove semantic quality, and semantic review does not replace structural validation. Consult the [official Repository Format specification](https://packages.moldea.ai/repository-format/) when exact property or conformance requirements matter.

For the exact package-level behavior, see the [`@moldea.ai/core` documentation](https://packages.moldea.ai/packages/core/). To establish the format in a project, follow [Getting started](/docs/getting-started/) and say `Initialize moldea` to your coding agent.
