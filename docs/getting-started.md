---
title: Getting started
navigationTitle: Getting started
description: Install the skill from skills.sh and begin using it through ordinary requests to your coding agent.
section: start
order: 10
---

# Install once, then speak naturally

The primary distribution page is [`moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea). The portable skill works with [compatible coding agents](/docs/coding-agent-compatibility/), including Codex, Claude Code, Cursor, OpenCode, GitHub Copilot, and Cline.

Install the latest version from the repository's `main` branch in your current project:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin an immutable release tag:

```bash
npx skills add "moldea-ai/skill#v5.0.13"
```

Repository installation is required because the selected skill version must travel with the project. A global installation does not establish adoption and is not a supported path.

## Initialize project context

Open the repository in a compatible coding agent and ask:

> `Initialize moldea`

This request explicitly authorizes adoption. The coding agent:

1. Inspects the Git worktree, repository structure, code, configuration, documentation, and other high-information evidence.
2. Selects the `initialize` operation and confirms that repository and developer authority permit its writes.
3. Determines whether the evidence establishes a sufficient project foundation or requires one focused clarification.
4. After the foundation is sufficient, installs a known missing compatible repository-local `@moldea.ai/cli` development dependency with lifecycle scripts disabled. A failed installation stops canonical and README writes and reports any package-manager changes. An existing compatible CLI needs no reinstall or failing availability probe; a global CLI is never a fallback.
5. Creates the minimum canonical state and runs the bundled deterministic writer for the owned README awareness block.
6. Runs final structural validation, maps the material sources to the conclusions they established, and reports the files, decisions, verification, and practical next actions.

The minimum canonical foundation is:

```text
/moldea/moldea.yaml
/moldea/project.md
```

`moldea.yaml` starts with schema version `1` and omits empty optional mappings. `project.md` contains only durable identity, purpose, users, goals, values, boundaries, and universally important facts supported by repository evidence.

The root README receives this exact logical block:

```text
<!-- moldea:start -->

For every repository task, select the repository-installed `moldea` skill so its two-byte relevance gate can test the host-known paths. If the gate does not match, continue without `moldea`.
Canonical moldea project state lives under `/moldea/**`; start at `/moldea/project.md`.
<!-- moldea:end -->
```

The blank line after the opening marker separates ownership metadata from the Markdown paragraph. The writer preserves all README bytes outside the managed region, follows a consistent existing CRLF style when applicable, and otherwise writes LF. It rejects duplicate, unpaired, reversed, linked, invalid, or oversized README input instead of guessing.

Initialization does not create an agent, ceremonial empty directories, speculative context, or a parallel source of truth. With no evidenced relationships, `moldea.yaml` contains only `version: 1` and its final LF. A successful validation ends the operation without a follow-up inspection. Bounded structural diagnostics permit supported repairs while each correction makes progress within the authorized scope and resource limits. Every repair requires validation of the resulting state; unresolved failures are reported without claiming completion.

An adopted project turns the same request into focused foundation maintenance. Partial or inconsistent artifacts leave it unadopted: the coding agent identifies the existing artifacts and missing contract elements, preserves valid content, and does not initialize or repair over them without the required authority and decisions.

## When the repository does not explain itself

Initialization is conversational when evidence is incomplete:

- If no meaningful project context can be established, the coding agent explains that `moldea` keeps durable repository context and asks one focused question about what the project does and whom or what it serves. A name, generic label, placeholder file, empty export, or brief package metadata cannot establish the foundation alone.
- If part of the project is clear but a material purpose, user, goal, authority, or boundary remains uncertain, the coding agent summarizes supported conclusions and asks one question about that boundary. Broad language such as “handles payments” does not establish value movement, authorization, destructive effects, lifecycle changes, or external actions that the evidence does not support.
- If the foundation is sufficient, initialization completes without a ceremonial question.

You may supply context directly or point to an accessible source. The coding agent evaluates it with repository evidence and carries only durable, relevant truth into the foundation. Insufficient or partial foundations pause with no dependency, canonical-state, or managed README writes. Missing tooling does not erase available project evidence, and developer-answerable ambiguity is not stored as an unresolved requirement.

## Make your first request

After initialization, describe the outcome naturally:

```text
Create a support agent for this application.
```

To design the system before implementation, ask:

```text
Use moldea to plan an agent system for personalized ecommerce promotions. Decide what should remain ordinary software and what genuinely needs model reasoning.
```

Planning is read-only and may recommend no agents. You do not need to mention `moldea` again or create bindings first. The managed README selects the entrypoint; clear agent work checks adoption, other known paths check declared relationships, and a follow-up continues only the active task and its authorization. Unrelated work remains unaffected. See the [workflow reference](/docs/how-it-works/) for the complete activation contract.

You do not need to create `/moldea` directories by hand, invoke the local CLI directly, translate requests into special commands, maintain duplicate instructions, or create a `moldea` Cloud account. The coding agent owns safe interaction with the repository-local skill and tooling.

## Update or remove the skill

An unpinned installation follows `main`; rerun the first installation command to refresh it. A pinned installation never moves automatically; rerun the pinned form with the desired immutable release tag. Updating refreshes portable instructions and references. It does not initialize a project, modify `/moldea/**`, install the CLI globally, or alter canonical state.

Remove the project installation with:

```bash
npx skills remove moldea
```
