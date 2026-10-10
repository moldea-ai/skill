---
title: Getting started
navigationTitle: Getting started
description: Install moldea, initialize Git-owned project context, and use relevant knowledge through requests to your coding agent.
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
npx skills add "moldea-ai/skill#v7.1.0"
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
5. Creates canonical state and the explanatory README region, then establishes the managed AGENTS.md bridge when host instructions permit. Otherwise it provides the exact important manual block. Explicit setup checks verify the bridge and smoke-test its command before final validation.
6. Runs final structural validation, maps the material sources to the conclusions they established, and reports the files, decisions, verification, and practical next actions.

The minimum canonical foundation is:

```text
/moldea/moldea.yaml
/moldea/project.md
```

`moldea.yaml` starts with schema version `1` and omits empty optional mappings. `project.md` contains only durable identity, purpose, users, goals, values, boundaries, and universally important facts supported by repository evidence.

README receives a short introduction with links to `moldea/project.md` and `moldea/moldea.yaml`. Its deterministic writer preserves outside bytes and rejects ambiguous or unsafe input.

AGENTS.md receives a separate managed block with the verified local installation path. For ordinary planning, implementation, or review, it runs the relevance gate once the files are known and before acting. Only a relationship hit loads SKILL.md. New independently discovered files get one new-batch check; unchanged results are reused. No repository scan is performed for moldea.

If AGENTS.md cannot be safely edited or host instructions prohibit it, the coding agent gives you the exact block to add. Adding it is important: ordinary work may otherwise miss context maintenance and leave saved knowledge stale. Explicit moldea operations remain available. A missing block produces a setup warning, never canonical invalidity. Updating the installed skill alone does not rewrite project integration; ask for `Fix moldea` to refresh permitted managed regions.

Some coding hosts ask for permission to execute commands. If desired, approve a rule for this specific installed gate command using your host’s controls. Do not grant blanket Node execution or weaken repository trust controls. The small instruction block and bounded Node invocation are the cost of an unrelated precheck; the full skill and workflow references are not loaded on a miss. Host compliance is not guaranteed.

Initialization does not create an agent, ceremonial empty directories, speculative context, or a parallel source of truth. With no evidenced relationships, `moldea.yaml` contains only `version: 1` and its final LF. A successful validation ends the operation without a follow-up inspection. Bounded structural diagnostics permit supported repairs while each correction makes progress within the authorized scope and resource limits. Every repair requires validation of the resulting state; unresolved failures are reported without claiming completion.

An adopted project turns the same request into focused foundation maintenance. Missing or unsafe canonical foundation files prevent adoption: the coding agent identifies the existing artifacts and missing contract elements, preserves valid content, and does not initialize or repair over them without the required authority and decisions.

## When the repository does not explain itself

Initialization is conversational when evidence is incomplete:

- If no meaningful project context can be established, the coding agent explains that `moldea` keeps durable repository context and asks one focused question about what the project does and whom or what it serves. A name, generic label, placeholder file, empty export, or brief package metadata cannot establish the foundation alone.
- If part of the project is clear but a material purpose, user, goal, authority, or boundary remains uncertain, the coding agent summarizes supported conclusions and asks one question about that boundary. Broad language such as “handles payments” does not establish value movement, authorization, destructive effects, lifecycle changes, or external actions that the evidence does not support.
- If the foundation is sufficient, initialization completes without a ceremonial question.

You may supply context directly or point to an accessible source. The coding agent evaluates it with repository evidence and carries only durable, relevant truth into the foundation. Insufficient or partial foundations pause with no dependency, canonical-state, or managed README writes. Missing tooling does not erase available project evidence, and developer-answerable ambiguity is not stored as an unresolved requirement.

## Make your first request

After initialization, start with a project-context request for ordinary software work:

```text
Use the saved project context to plan the next API change. Identify the relevant rules before proposing the implementation.
```

When your application needs a runtime agent, describe that outcome naturally:

```text
Create a support agent for this application.
```

To design the system before implementation, ask:

```text
Use moldea to plan an agent system for personalized ecommerce promotions. Decide what should remain ordinary software and what genuinely needs model reasoning.
```

Planning is read-only and may recommend no agents. You do not need to mention `moldea` again or create bindings first. The managed AGENTS.md block checks ordinary paths before loading the entrypoint; clear agent work checks adoption, and a follow-up continues only the active task and its authorization. Unrelated work remains unaffected. See the [workflow reference](/docs/how-it-works/) for the complete activation contract.

You do not need to create `/moldea` directories by hand, invoke the local CLI directly, translate requests into special commands, maintain duplicate instructions, or create a `moldea` Cloud account. The coding agent owns safe interaction with the repository-local skill and tooling.

## Update or remove the skill

An unpinned installation follows `main`; rerun the first installation command to refresh it. A pinned installation never moves automatically; rerun the pinned form with the desired immutable release tag. Updating refreshes portable instructions and references. It does not initialize a project, modify `/moldea/**`, install the CLI globally, or alter canonical state.

Remove the project installation with:

```bash
npx skills remove moldea
```
