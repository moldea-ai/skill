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

A new project begins with two files. Add focused context, decision records, agent assets, and relationships when project evidence establishes what each one owns.

Adoption requires the bounded regular canonical foundation files `/moldea/moldea.yaml` and `/moldea/project.md`. README explains the project integration; AGENTS.md routes ordinary tasks. Neither document controls adoption or Core validity. Missing routing produces a setup warning, while damaged canonical files receive bounded diagnosis rather than a fresh scaffold.

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

Empty optional mappings are omitted. Guided Initialize confirms existing agents and inline workflows together in the first round unless the request already includes them. It creates no placeholder directories, speculative context, or invented agent responsibilities. Existing architecture, policy, and decision documents remain at their original paths, linked from `project.md` rather than copied into `/moldea`.

## Give each concern one clear home

Add a surface when it protects a distinct kind of durable truth:

| Concern            | Canonical home                            | Use it for                                                                                               |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Project foundation | `/moldea/project.md`                      | Identity, purpose, users, goals, boundaries, and shared facts                                            |
| Focused context    | `/moldea/context/**/*.md`                 | Domain, architecture, security, integration, terminology, or operational truth                           |
| Decisions          | `/moldea/decisions/<timestamp>-<slug>.md` | Active rationale whose alternatives or consequences matter                                               |
| Agent behavior     | `/moldea/agents/<agent-id>/`              | Canonical routing description and instruction                                     |
| Relationships      | `/moldea/moldea.yaml`                     | Impact paths, bindings, tools, skills, and mirrors |

Repository-local Agent Skills stay in their authoritative repository-native directories. They are not copied into a parallel `/moldea/skills` store. Exact instruction mirrors also stay outside `/moldea/**` and are declared only when a runtime requires another path.

Durable product and policy rules that agents or PR Assurance rely on belong in the canonical moldea context for their area. When a rule moves into context, replace its statement in the human doc with a link to the owner within the authorized edit scope. If the doc is outside that scope, report the remaining duplicate. Human docs can explain the circumstances around a rule. The owner links to the docs for supporting detail.

## Example: connect focused context to the code

Suppose the foundation identifies a support-triage service whose scope is defined in `/src/service.ts`, and support policy deserves focused context:

```text
moldea/
├── moldea.yaml
├── project.md
└── context/
    └── support-policy.md
src/
├── service.ts
└── support/
    └── policy.ts
```

Connect the shared service boundary to its governing file and the support policy to its coherent implementation subtree:

```yaml
version: 1

context:
  /moldea/project.md:
    affectedBy:
      - /src/service.ts
  /moldea/context/support-policy.md:
    affectedBy:
      - /src/support/**
```

An **impact path** is an exact path or simple glob under `affectedBy` for code or configuration that implements a fact or enforces a rule the owner states, a project-owned model-facing asset that governs behavior, or the authoritative source of a directly governed authored deliverable. A match calls for checking whether the owner's stated facts still hold or its stated rules are followed. Relevance can end without an edit. Link human docs (guides, procedures, policies, READMEs, records, approvals, receipts) from their owner. Declare none directly. Presentation, build and CI qualify only as the sole enforcement point of a stated rule.

A binding already establishes relevance for its exact file, so an exact `affectedBy` entry need not repeat it. An authored deliverable needs only its impact path. An exact path names a regular file. Use `/<directory>/**` for a proven coherent subtree. Keep coherent code in one glob with incidental human docs. Never list files to exclude docs. Reject globs chiefly covering docs or other ineligible content. A bare directory path is invalid with or without a trailing slash.

When a feature uses shared infrastructure, relate the consuming feature file whose behavior is material to its owner's facts or rules. Relate a shared module to an owner of the module's own contract. Deployment, assets and content-production scripts qualify only when a path is the sole enforcement point of a stated rule. Generated, vendored and installed artifacts are excluded.

## Example: grow into a grounded agent

When the project adds a real support agent, the same foundation grows without changing ownership:

```text
moldea/
├── moldea.yaml
├── project.md
├── context/
│   └── support-policy.md
└── agents/
    └── support-agent/
        ├── description.md
        └── instruction.md
src/
├── service.ts
├── support/
│   └── policy.ts
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
      - /src/service.ts
  /moldea/context/support-policy.md:
    affectedBy:
      - /src/support/**

agents:
  support-agent:
    context:
      - /moldea/context/support-policy.md
    bindings:
      runtimeAgent:
        path: /src/agents/support-agent.ts
        symbol: createSupportAgent
    affectedBy:
      - /src/agents/support-agent.test-integration.ts
```

`description.md` explains what the agent does. `instruction.md` explains how it operates after receiving responsibility. The binding points to the real implementation. The route uses the target agent’s description. An agent with no optional declarations can be registered as `agent-id: {}`.

## Scale by adding evidence, not ceremony

Repository format stays efficient through a few operating principles:

1. **Keep the foundation concise.** Use `project.md` for project-wide facts and routing to one focused owner per area.
2. **Create only supported relationships.** Paths, symbols, capabilities and mirrors must refer to real current artifacts.
3. **Separate truth from rationale.** Context explains what is true. Decisions preserve why a consequential choice remains active.
4. **Keep canonical behavior singular.** Runtime instructions derive from the canonical agent instruction instead of becoming independently maintained copies.
5. **Let impact paths narrow future work.** `affectedBy` relationships guide evidence gathering while preserving a legitimate no-change result.
6. **Compress only with explicit intent.** Ordinary maintenance removes only duplication affected by the authorized change. A broader consolidation request may reorganize canonical context, but it must preserve every unique fact, rationale, decision, unresolved boundary, relationship, and consumer and stop before consequential conflicts.

## What validates the structure

The skill’s bundled CLI reads the Git working tree and delegates Repository format interpretation to `@moldea.ai/core`. Validation checks canonical paths, strict manifest values, referenced files, decisions, agent assets, mirrors, declared files in any language, supported TypeScript or JavaScript ESM exports, and coding-agent integration without executing repository code.

The coding agent invokes that deterministic boundary when a workflow needs structural evidence. A valid structure does not automatically prove semantic quality, and semantic review does not replace structural validation. Consult the [official Repository Format specification](https://packages.moldea.ai/repository-format/) when exact property or conformance requirements matter.

For the exact package-level behavior, see the [`@moldea.ai/core` documentation](https://packages.moldea.ai/packages/core/). To establish the format in a project, follow the [Setup reference](/docs/getting-started/) and say `Initialize moldea` to your coding agent.
