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

Repository scope is required for supported `moldea` use so the installed skill version can travel with the project through version control. The installer handles host detection; you do not need a different `moldea` package or instruction set for each coding agent.

## What remains consistent

Every compatible host consumes the same portable semantic core:

- AGENTS.md routes ordinary tasks through a bundled gate over already-known paths before SKILL.md is loaded. SKILL.md reuses a successful batch result and selects owners with one scope query. Direct agent, skill, project-context, and explicit moldea operations retain their own routes. New independently discovered paths get one new-batch precheck; misses remain silent and preserve earlier owners. README explains the integration and links to canonical state. Neither managed document establishes adoption.
- The gate accepts repeatable `--path` arguments or a bounded NUL-delimited UTF-8 stdin batch. Paths are relative to the absolute repository root, including from nested working directories. Leading-slash logical paths remain supported. Unsafe or invalid paths fail closed. Ordinary output is exactly `0` or `1` plus LF; opt-in `--diagnose` reports invocation failures separately for setup checks.
- Focused references are loaded only for the workflows that require them.
- The small entrypoint reuses complete instructions when the host permits. Scripts and references resolve from the exact repository installation already selected by the host. Host-required rereads remain possible; operation details are not loaded on a gate miss.
- A product name or host review, fix, or publication command is not AI-agent intent. Ordinary work on the `moldea` product requires the same relationship gate as any other repository.
- Repository-local `@moldea.ai/cli` tooling owns deterministic inspection and validation.
- Canonical project and agent state remains under `/moldea/**`.
- Local work remains filesystem-first and does not require a `moldea` Cloud account.

The optional `agents/openai.yaml` file adds OpenAI-host presentation, default-prompt, dependency, or invocation-policy metadata when needed. It remains consistent with the portable skill, does not become a semantic dependency, and preserves an existing invocation policy unless developer intent or reliable host evidence requires changing it.

## What can differ by host

Coding agents can differ in how they discover and install skills, present them in the interface, apply invocation policies, combine them with project instructions, expose tools, and report work. Those host-level differences do not create separate `moldea` formats or sources of truth, and an installed copy does not prove activation or runtime registration.

Compatibility of the Agent Skills format, successful installation, and observed host behavior are separate claims. The [future native-host checklist](/docs/reference-reading/#behavioral-regression-checklist) describes journeys to run before claiming behavioral verification in a host; it is not a record of completed host tests.

Use a frontier-capability coding model for the strongest results. Official release assurance runs actors and independent judges with `gpt-6-sol` at `xhigh` reasoning effort.

Before installation, confirm that the host supports Agent Skills or is recognized by the current `skills` CLI. A host logo on this site identifies compatibility; it does not imply sponsorship or endorsement by that vendor.

## Make the first request

After installation, use the host normally:

```text
Initialize moldea
```

After initialization, ask naturally for an outcome:

```text
Create a support agent grounded in this application.
```

The coding agent selects the relevant skill workflow, gathers repository evidence, uses deterministic tooling when required, and reports the result.
