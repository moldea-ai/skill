---
title: Getting started
navigationTitle: Getting started
description: Install the skill from skills.sh and begin using it through ordinary requests to your coding agent.
section: start
order: 10
---

# Install once, then speak naturally

The primary distribution page is [`moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea). It provides the current public listing and installation path.

The portable skill works with [compatible coding agents](/docs/coding-agent-compatibility/), including Codex, Claude Code, Cursor, OpenCode, GitHub Copilot, and Cline.

Install the latest version from the repository's `main` branch in your current project:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin an immutable release tag:

```bash
npx skills add "moldea-ai/skill#v5.0.0"
```

Repository installation is required for supported `moldea` use because the team must share the selected skill version with the project. A global installation does not establish repository adoption and is not a supported installation path.

## Initialize project context

Open the repository in a compatible coding agent and ask naturally:

> `Initialize moldea`

This request explicitly authorizes adoption. The coding agent handles the initialization workflow:

1. Inspect the Git working tree, repository structure, code, configuration, documentation, and other high-information evidence.
2. Select the `initialize` operation and confirm that the repository and developer authority permit the required writes.
3. Determine whether the evidence establishes a sufficient project foundation, requires focused clarification, or provides no meaningful project context yet.
4. Once the foundation is sufficient, establish this skill release's exact repository-local `@moldea.ai/cli` development dependency through the repository's package manager when needed. An already installed exact CLI may provide earlier read-only evidence after direct verification. It never relies on a global CLI fallback.
5. Once the foundation is sufficient, create the minimum canonical state and the owned README awareness block.
6. Run deterministic inspection and relevant project-native checks, then map the material sources to the foundation conclusions they established and report files, decisions, verification, and practical next actions.

The minimum canonical foundation is:

```text
/moldea/moldea.yaml
/moldea/project.md
```

`moldea.yaml` starts with schema version `1` and omits empty optional mappings. `project.md` records only durable project identity, purpose, users, goals, values, boundaries, and universally important facts supported by repository evidence.

Initialization does not create an agent automatically. It also does not create ceremonial empty directories, speculative context, or a parallel source of truth. An adopted project turns the same request into focused foundation maintenance. Partial or inconsistent artifacts leave the project unadopted: the coding agent identifies the exact existing artifacts and missing contract elements, preserves valid content, and does not initialize or repair over them until the request authorizes that work and any consequential ambiguity is resolved.

## When the repository does not explain itself

Initialization is conversational when the evidence is not yet sufficient:

- When no meaningful project context can be established, the coding agent explains the benefit before asking one focused question: “`moldea` keeps durable project context in the repository so coding agents can understand the project consistently over time. The README and source do not establish what this project is for, so I haven’t initialized it yet. What does the project do, and who or what does it serve?” It adapts the inspected sources when needed, but it does not bundle purpose, users, goals, and boundaries into a questionnaire. Brief or generic package metadata can inform that question, but it cannot finalize the foundation by itself. Neither can a repository name, generic label, placeholder file, or empty export.
- When part of the project is clear but a material purpose, user, goal, authority, or boundary remains uncertain, it summarizes the supported conclusions and asks one question about that consequential boundary before finalizing affected claims. A broad phrase such as “handles payments” does not establish authorization, value movement, destructive effects, lifecycle changes, or external actions when the implementation proves only narrower processing.
- When the foundation is sufficiently clear, it completes initialization without asking a question merely for ceremony.

You can also supply context before the coding agent asks. Include it directly in the request or point to an accessible file where you already maintain the relevant users, goals, boundaries, or other project knowledge. The coding agent evaluates that input alongside repository evidence and carries only durable, relevant truth into the project foundation.

Insufficient and partial foundations pause initialization with no dependency, canonical-state, or owned README writes. Missing or unverified tooling does not erase available project evidence. The coding agent asks instead of storing developer-answerable foundational ambiguity as an unresolved requirement.

The amount of documentation is not the deciding factor. A concise authoritative README may be sufficient, while extensive contradictory or stale documentation may require clarification. After any required answers, the coding agent resumes initialization and provides a completed handoff with optional next actions.

## Make your first request

Open the project in a compatible coding agent and describe the outcome:

```text
Create a support agent for this application.
```

The coding agent should understand the repository before inventing behavior. If the project has not adopted `moldea`, initialize it explicitly first. Other repository-dependent requests abstain until the manifest, project document, and managed README block establish adoption.

To design the system before implementation, ask:

```text
Use moldea to plan an agent system for personalized ecommerce promotions. Decide what should remain ordinary software and what genuinely needs model reasoning.
```

Planning is read-only and may recommend no agents at all.

## What you do not need to do

You do not need to:

- create `/moldea` directories by hand
- invoke the local `moldea` CLI directly
- translate your request into skill-specific commands
- maintain duplicate agent instructions
- create a `moldea` Cloud account for local work

The coding agent owns the safe interaction with the skill and repository-local tooling.

Ordinary requests outside the relevance gate do not activate `moldea`, whether or not the repository is adopted. Initialization remains an explicit operation and never interrupts unrelated work.

## Update the skill

An unpinned installation follows the repository's current `main` branch. Rerun the same command to refresh the project installation:

```bash
npx skills add moldea-ai/skill
```

A release-pinned installation never moves to another tag automatically. To update it, choose the desired published release and rerun the installation command with that tag. For example, the current release is:

```bash
npx skills add "moldea-ai/skill#v5.0.0"
```

Replace `v5.0.0` with the desired newer published tag when one becomes available.

Updating the skill refreshes its portable instructions and references. It does not initialize a project, change `/moldea/**`, install the `moldea` CLI globally, or alter a repository's canonical project state.

## Remove the skill

Remove a project installation with:

```bash
npx skills remove moldea
```
