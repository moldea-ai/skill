---
title: Agent Skill overview
navigationTitle: Overview
description: Install the skill once, then let your coding agent keep project context and agent behavior aligned while you work naturally.
section: start
order: 0
---

# The invisible operating layer for your coding agent

`moldea` helps a coding agent understand what a project is, design agent-enabled systems carefully, create grounded agents, and keep their declared behavior aligned with the implementation.

You do not need to learn another daily workflow. Install the skill, then ask your coding agent for outcomes in ordinary language:

```text
Create a customer-support agent grounded in this repository.
```

```text
Update the refund flow and keep the support agent aligned.
```

```text
Evaluate the current project context without changing files.
```

The coding agent decides when the skill is relevant, including when you share durable project knowledge without naming `moldea`. It reads the necessary guidance, inspects the repository, uses deterministic local tooling when required, and reports what changed or why no change was necessary.

## Start here

- [Get `moldea` on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea): the primary distribution page.
- [Getting started](/docs/getting-started/): install once and make the first natural request.
- [Coding agent compatibility](/docs/coding-agent-compatibility/): use the same portable skill with Codex, Claude Code, Cursor, OpenCode, GitHub Copilot, Cline, and other compatible hosts.
- [What `moldea` can do](/docs/capabilities/): explore the complete capability surface.
- [How it works](/docs/how-it-works/): see the optional technical layer beneath the coding agent.
- [Repository format](/docs/repository-format/): see how a two-file foundation grows into focused, explicit project organization.
- [Evidence](/evidence/): inspect current behavioral semantic evaluation and real-project adapter qualification evidence, including failed attempts.
- [Semantic evaluation](/docs/semantic-evaluation/): inspect actor blindness, sourced scenarios, protected repository controls, coverage, and release evidence.
- [Examples](/examples/): follow complete developer, coding-agent, and skill interactions.

## What stays yours

Canonical project and agent state lives in the repository under `/moldea/**`. Local work is filesystem-first and private by default. Installing or using the skill does not require a `moldea` Cloud account, and the skill does not send repository content to `moldea` Cloud.

The repository remains the source of truth. The skill helps the coding agent understand, maintain, evaluate, and reconcile that truth without creating a hidden semantic database.
