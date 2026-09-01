---
title: Initialize project context
navigationTitle: Initialize a project
description: Initialization examples for insufficient, partial, and sufficient project context.
section: examples
order: 120
---

# Initialize through a clear context handoff

## No meaningful context yet

**Developer**

> `Initialize moldea`

**Coding agent**

```text
`moldea` keeps durable project context in the repository so coding agents can understand the project consistently over time. The README and source do not establish what this project is for, so I haven’t initialized it yet.

What does the project do, and who or what does it serve?
```

Initialization resumes after the developer answers.

## Some context, but a material gap

**Coding agent**

```text
I found evidence that this is an invoice-processing service, but the repository does not establish whether it only extracts invoice fields or also authorizes payment decisions. That boundary would materially change the project foundation.

Is the service limited to extracting and validating invoice data, or does it also decide whether an invoice should be paid?
```

The supported inference remains separate from the unresolved boundary until the developer clarifies it. No canonical project state, README awareness block, or unresolved requirement is created as a substitute for that answer.

## Context supplied up front

**Developer**

```text
Initialize moldea. I’ve made my current product brief available as product-brief.md. Use it as supporting context and preserve only durable, relevant facts.
```

**Coding agent**

```text
The brief identifies accounting systems as the users and says the service extracts and validates invoice data without authorizing payments. The implementation supports that boundary, so I’ll use it to complete the project foundation.
```

The developer request establishes how the brief should inform the work; the file content remains evidence rather than new authority. The coding agent evaluates it alongside the current repository, distinguishes developer-confirmed direction from observed behavior, and persists only durable project truth.

## Sufficient context

**Coding agent**

```text
Initialization completed. The repository documentation and implementation establish a service that extracts and validates invoice data for accounting systems without authorizing payments.

I created the minimum canonical foundation and owned README awareness block, then verified the project with the repository-local CLI. No agent was created.

Next actions:

- Review the project foundation.
- Continue normal development.
- Optionally plan an agent-enabled workflow or request a specific agent when the project needs one.
```

## Coding agent and `moldea` under the hood

1. The exact `Initialize moldea` request establishes adoption intent.
2. The coding agent verifies local tooling and runs initial `inspect --json`; a missing-project diagnostic is expected evidence.
3. It begins with the root README and other high-information project surfaces.
4. It distinguishes durable foundational truth from temporary, speculative, or easily rediscovered details and determines whether the foundation is insufficient, partial, or sufficient.
5. It asks a focused question when missing context or a material gap prevents a useful and truthful foundation.
6. Once the foundation is sufficient, it writes `version: 1` in `/moldea/moldea.yaml`, omits empty optional mappings, and creates concise `/moldea/project.md` content.
7. It adds exactly one correctly marked README awareness block while preserving unrelated README content.
8. It reruns inspection and reports the established understanding, tooling, files, evidence, limitations, and practical next actions.

## Result

```text
moldea/
├── moldea.yaml
└── project.md
```

No empty agent, context, decision, runtime, or requirements directories are created.

Partial or inconsistent `moldea` artifacts do not create a separate status. Until the complete foundation and owned README awareness block are established, the project is unadopted. The coding agent reports the exact existing artifacts and missing contract elements, preserves valid content, and waits for explicit authority and any needed clarification before repairing them.
