---
title: Coding agent compatibility
navigationTitle: Coding agents
description: Use the portable skill with Codex, Claude Code, Cursor, OpenCode, GitHub Copilot, Cline, and other compatible coding agents.
section: start
order: 15
---

# Use `moldea` with the coding agent you already use

`moldea` is a portable Agent Skill rather than a feature tied to one coding-agent vendor. Install the same repository-owned skill in a compatible host, then continue asking for outcomes in that host’s normal interface.

The current public compatibility set includes:

- Codex
- Claude Code
- Cursor
- OpenCode
- GitHub Copilot
- Cline

The open-source [`skills` CLI](https://github.com/vercel-labs/skills) detects supported hosts and manages their installation locations. Other Agent Skills-compatible hosts can use the same portable artifact when their installation model supports it.

## Install for your current project

Run the normal project installation from the repository root:

```bash
npx skills add moldea-ai/skill
```

Project scope is recommended because the installed skill can travel with the repository through version control. The installer handles host detection; you do not need a different `moldea` package or instruction set for each coding agent.

## What remains consistent

Every compatible host consumes the same portable semantic core:

- `SKILL.md` defines activation, authority, compatibility, operation selection, and reporting.
- Focused references are loaded only for the workflows that require them.
- Repository-local `@moldea.ai/cli` tooling owns deterministic inspection and validation.
- Canonical project and agent state remains under `/moldea/**`.
- Local work remains filesystem-first and does not require a `moldea` Cloud account.

The optional `agents/openai.yaml` file adds OpenAI-host presentation metadata. It does not change the portable skill’s behavior or make OpenAI a semantic dependency.

## What can differ by host

Coding agents can differ in how they discover skills, present them in the interface, combine them with project instructions, expose tools, and report work. Those host-level differences do not create separate `moldea` formats or sources of truth.

Before installation, confirm that the host supports Agent Skills or is recognized by the current `skills` CLI. A host logo on this site identifies compatibility; it does not imply sponsorship or endorsement by that vendor.

## Make the first request

After installation, use the host normally:

```text
Initialize moldea for this repository.
```

Or ask directly for an outcome:

```text
Create a support agent grounded in this application.
```

The coding agent selects the relevant skill workflow, gathers repository evidence, uses deterministic tooling when required, and reports the result.
