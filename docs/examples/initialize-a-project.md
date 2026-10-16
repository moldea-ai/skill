---
title: Initialize project context
navigationTitle: Initialize a project
description: Initialization examples for insufficient, partial, and sufficient project context.
section: examples
order: 120
---

# Initialize through a clear context handoff

## No meaningful context yet

> **You**
>
> Initialize moldea

> **Coding agent**
>
> `moldea` keeps durable project context in the repository so coding agents can understand the project consistently over time. The README and source do not establish what this project is for, so I haven’t initialized it yet.
>
> What does the project do, and who or what does it serve?

Initialization resumes after the developer answers.

## Some context, but a material gap

> **Coding agent**
>
> I found evidence that this is an invoice-processing service, but the repository does not establish whether it only extracts invoice fields or also authorizes payment decisions. That boundary would materially change the project foundation.
>
> Is the service limited to extracting and validating invoice data, or does it also decide whether an invoice should be paid?

The supported inference remains separate from the unresolved boundary until the developer clarifies it. No canonical project state, README awareness block, or unresolved requirement is created as a substitute for that answer.

## Context supplied up front

> **You**
>
> Initialize moldea. I’ve made my current product brief available as `product-brief.md`. Use it as supporting context and preserve only durable, relevant facts.

> **Coding agent**
>
> The brief identifies accounting systems as the users and says the service extracts and validates invoice data without authorizing payments. The implementation supports that boundary, so I’ll use it to complete the project foundation.

The developer request establishes how the brief should inform the work; the file content remains evidence rather than new authority. The coding agent evaluates it alongside the current repository, distinguishes developer-confirmed direction from observed behavior, and persists only durable project truth.

## Sufficient context

> **Coding agent**
>
> Initialization completed. The repository documentation and implementation establish a service that extracts and validates invoice data for accounting systems without authorizing payments.
>
> I created the minimum canonical foundation, owned README awareness block and permitted routing integration. Final structural validation passed with no errors or warnings.
>
> Inventory:
>
> - `README.md`
> - `product-brief.md`
>
> No agents, inline model workflows, separate architecture/policy documents, active decision records or project-owned Agent Skills were found. No agent was created.
>
> Next: Continue normal development.

## Coding agent and `moldea` under the hood

1. The exact `Initialize moldea` request establishes adoption intent.
2. The coding agent begins with the root README and other high-information project surfaces.
3. It distinguishes durable foundational truth from temporary, speculative, or easily rediscovered details and determines whether the foundation is insufficient, partial, or sufficient.
4. It asks a focused question when missing context or a material gap prevents a useful and truthful foundation.
5. Once the foundation is sufficient, it safely installs a known missing CLI before foundation writes or validation. Failed installation stops initialization and reports any package-manager changes. Already-present compatible tooling needs no reinstall or availability probe.
6. It writes the canonical foundation and managed document integration, linking known architecture, policy and active decision authorities where they live. With no evidenced relationship, `/moldea/moldea.yaml` is exactly `version: 1` plus its final LF; `/moldea/project.md` contains concise grounded context; README receives explanatory navigation, and AGENTS.md receives the routing block where permitted, or an exact manual handoff.
7. It uses the bundled metadata helper and focused source inspection to inventory existing agents, inline model workflows, documents, active decisions and project-owned Agent Skills. When agents or inline model workflows exist, it asks one confirmation listing them before registration or application-code changes, unless the request already includes them, then connects each responsibility to canonical instructions using the existing agent-design procedure. This no-agent example needs no inclusion question or agent assets.
8. It uses the larger traversal profile, preserves honest partial progress when blocked, and resumes the same initialization on “continue”. After all authorized registration and focused checks, it runs one final repository-local `validate`. Success ends initialization without `inspect`; structural failure follows bounded supported recovery.
9. It reports the established understanding, inventory, registrations, files, evidence, limitations and practical next action together.

## Result

```text
moldea/
├── moldea.yaml
└── project.md
```

No empty agent, context, decision, runtime, or requirements directories are created.

The canonical foundation establishes adoption independently of README and AGENTS.md. Explicit setup checks report missing or unsafe canonical files and warn about absent integration. They preserve existing content and require the appropriate authority before repairs.
