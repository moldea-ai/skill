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
npx skills add "moldea-ai/skill#v3.1.0"
```

Project installation is recommended because the team can share the skill through version control. Add `-g` when you deliberately want a global installation across projects.

## Initialize project context

Open the repository in a compatible coding agent and ask naturally:

> Initialize `moldea` for this repository.

This request explicitly authorizes adoption. The coding agent handles the initialization workflow:

1. Inspect the Git working tree, repository structure, code, configuration, documentation, and other high-information evidence.
2. Select the `initialize` operation and confirm that the repository and developer authority permit the required writes.
3. Determine whether the evidence establishes a sufficient project foundation, requires focused clarification, or provides no meaningful project context yet.
4. Once the foundation is sufficient, establish this skill release's exact repository-local `@moldea.ai/cli` development dependency through the repository's package manager when needed. An already installed exact CLI may provide earlier read-only evidence after direct verification. It never relies on a global CLI fallback.
5. Once the foundation is sufficient, create the minimum canonical state and the owned README awareness block.
6. Run deterministic inspection and relevant project-native checks, then report the established understanding, files, decisions, verification, and practical next actions.

The minimum canonical foundation is:

```text
/moldea/moldea.yaml
/moldea/project.md
```

`moldea.yaml` starts with schema version `1` and omits empty optional mappings. `project.md` records only durable project identity, purpose, users, goals, values, boundaries, and universally important facts supported by repository evidence.

Initialization does not create an agent automatically. It also does not create ceremonial empty directories, speculative context, or a parallel source of truth. When the repository is already partially or fully initialized, the same request preserves valid established content and becomes focused foundation maintenance rather than a destructive fresh scaffold.

## When the repository does not explain itself

Initialization is conversational when the evidence is not yet sufficient:

- When no meaningful project context can be established, the coding agent says what it inspected and asks the highest-value foundational question needed to continue. Brief or generic package metadata can inform that question, but it cannot finalize the foundation by itself. Neither can a repository name, generic label, placeholder file, or empty export.
- When part of the project is clear but a material purpose, user, goal, or boundary remains uncertain, it summarizes the supported conclusions and asks a focused clarification before finalizing affected claims.
- When the foundation is sufficiently clear, it completes initialization without asking a question merely for ceremony.

You can also supply context before the coding agent asks. Include it directly in the request or point to an accessible file where you already maintain the relevant users, goals, boundaries, or other project knowledge. The coding agent evaluates that input alongside repository evidence and carries only durable, relevant truth into the project foundation.

Insufficient and partial foundations pause initialization before dependency changes, canonical project state, or the owned README awareness block. Missing or unverified tooling does not erase available project evidence. The coding agent asks instead of storing developer-answerable foundational ambiguity as an unresolved requirement.

The amount of documentation is not the deciding factor. A concise authoritative README may be sufficient, while extensive contradictory or stale documentation may require clarification. After any required answers, the coding agent resumes initialization and provides a completed handoff with optional next actions.

## Make your first request

Open the project in a compatible coding agent and describe the outcome:

```text
Create a support agent for this application.
```

The coding agent should understand the repository before inventing behavior. If the project has not adopted `moldea` and the request authorizes creating the agent, the agent can establish the minimum useful project foundation as part of the work. You do not have to initialize `moldea` separately unless project context itself is the outcome you want.

To design the system before implementation, ask:

```text
Plan an agent system for personalized ecommerce promotions. Decide what should remain ordinary software and what genuinely needs model reasoning.
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

## Update the skill

An installation from `main` follows the repository's current development branch. Rerun the same command to refresh the project installation:

```bash
npx skills add moldea-ai/skill
```

For a global branch-tracking installation, rerun it with `-g`:

```bash
npx skills add moldea-ai/skill -g
```

A release-pinned installation never moves to another tag automatically. To update it, choose the desired published release and rerun the installation command with that tag. For example, the current release is:

```bash
npx skills add "moldea-ai/skill#v3.1.0"
```

Replace `v3.1.0` with the newer published tag when one becomes available. Add `-g` to the tagged command only when updating a global installation.

Updating the skill refreshes its portable instructions and references. It does not initialize a project, change `/moldea/**`, install the `moldea` CLI globally, or alter a repository's canonical project state.

## Remove the skill

Remove a project installation with:

```bash
npx skills remove moldea
```

Add `-g` only when removing a global installation.
