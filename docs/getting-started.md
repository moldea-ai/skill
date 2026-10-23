---
title: Getting started
navigationTitle: Getting started
description: Install moldea, initialize Git-owned project context, and use relevant knowledge through requests to your coding agent.
section: start
order: 10
---

# Install once, then speak naturally

The primary distribution page is [moldea on skills.sh](https://www.skills.sh/moldea-ai/skill/moldea). The portable skill works with [compatible coding agents](/docs/coding-agent-compatibility/), including Codex, Claude Code, Cursor, OpenCode, GitHub Copilot, and Cline.

The development checkout prepares the unpublished 10.0.3 candidate. The current published release and immutable installation example below remain 10.0.2.

Install the latest version from the repository's `main` branch in your current project:

```bash
npx skills add moldea-ai/skill
```

For a reproducible installation, pin an immutable release tag:

```bash
npx skills add "moldea-ai/skill#v10.0.2"
```

Repository installation is required because the selected skill version must travel with the project. A global installation does not establish adoption and is not a supported path.

The project needs Node.js `>=22.17.0` and a root `package.json`. Initialization installs `@moldea.ai/cli` as a root development dependency with npm, pnpm, or Yarn. With another package manager, add `@moldea.ai/cli` to the root `devDependencies` yourself before initializing. The declaration can be an exact 13.x version or a caret range on a 13.x release. A `--copy` installation leaves one copy of the skill in each agent directory. Keep every copy at the same version, because validation checks the copy recorded in AGENTS.md.

## Initialize project context

Open the repository in a compatible coding agent and ask:

> `Initialize moldea`

This request explicitly authorizes adoption. The coding agent:

1. Inspects the Git worktree, repository structure, code, configuration, documentation, and other high-information evidence.
2. Selects the `initialize` operation and confirms that repository and developer authority permit its writes.
3. Determines whether the evidence establishes a sufficient project foundation or requires one focused clarification.
4. After the foundation is sufficient, installs a known missing compatible repository-local `@moldea.ai/cli` development dependency with lifecycle scripts disabled. A failed installation stops canonical and README writes and reports any package-manager changes. An existing compatible CLI needs no reinstall or failing availability probe; a global CLI is never a fallback.
5. Writes the grounded foundation and explanatory README region. `project.md` links to existing architecture, policy, and active decision documents at their current paths; those documents stay in place and are not copied into `/moldea/**`. It also establishes or hands off the managed AGENTS.md bridge as host instructions permit.
6. Uses the bundled read-only initialization inspection helper for a bounded metadata inventory, then lists the existing agents, inline model workflows, documents, decision records, and project-owned Agent Skills it found. It registers the existing agents and workflows through the agent-design procedure in the same initialization. Before registration or the first application-code change, it asks one confirmation listing the agents and workflows to include. `Initialize moldea including my agents` already grants that permission, so it does not ask again.
7. Connects every included responsibility to canonical instructions, preserves established behavior, and runs focused tests of the changed invocation paths. Existing Agent Skills are inventoried; the installed moldea distribution is not a project-owned Skill. Other Skill paths require ownership evidence and are not automatically copied or assigned to agents. The helper batches already-known source files without inferring behavior or writing application code.
8. Checks integration and runs one final initialization-wide structural validation after all writes and native checks. It reports the inventory, registrations, source links, files, tests, validation, diagnostics, and remaining work together.

The minimum canonical foundation is:

```text
/moldea/moldea.yaml
/moldea/project.md
```

`moldea.yaml` starts with schema version `1` and omits empty optional mappings. `project.md` contains only durable identity, purpose, users, goals, values, boundaries, and universally important facts supported by repository evidence.

README receives a short introduction with links to `moldea/project.md` and `moldea/moldea.yaml`. Its deterministic writer preserves outside bytes and rejects ambiguous or unsafe input.

AGENTS.md receives a separate managed block with the verified local installation path. For ordinary planning, implementation, or review, it runs the relevance gate once the files are known and before acting. A relationship hit reads SKILL.md unless its complete unchanged instructions are already available; missing, partial, summarized, or changed instructions require a fresh read. New independently discovered files get one new-batch check; unchanged results are reused. The ordinary precheck performs no repository scan.

If AGENTS.md cannot be safely edited or host instructions prohibit it, the coding agent gives you the exact block to add. When a governing Claude Code instruction file exists without loading AGENTS.md, the coding agent adds the import line when permitted, or gives you the exact line. Shared root `CLAUDE.md` and `.claude/CLAUDE.md` take precedence over the `CLAUDE.local.md` fallback; use the warning's subject even when root `CLAUDE.md` is absent. Adding the integration is important: ordinary work may otherwise miss context maintenance and leave saved knowledge stale. Explicit `moldea` operations remain available. A missing or stale block produces an integration warning, never canonical invalidity. Ask to fix it; acceptance is offered only for eligible shared, Git-tracked instruction subjects and requires your reason. The coding agent never chooses acceptance on your behalf. See [updating the skill](#update-or-remove-the-skill) for bridge refresh.

Local integration and the committed view available to cloud checks can differ. An ignored local AGENTS.md can work locally while remaining absent from a committed revision. Preserve your tracking and ignore choices; committing the bridge is a separate decision. Local validation results do not establish an unexecuted cloud result.

Some coding hosts ask for permission to execute commands. If desired, approve a rule for this specific installed gate command using your host’s controls. Do not grant blanket Node execution or weaken repository trust controls. The small instruction block and bounded Node invocation are the cost of an unrelated precheck; the full skill and workflow references are not loaded on a miss. Host compliance is not guaranteed.

Initialization registers evidenced existing agents and inline model workflows; it does not invent agents, ceremonial empty directories, speculative context, or parallel document authorities. Projects without agents or model workflows keep the same minimal foundation flow. With no evidenced relationships, `moldea.yaml` contains only `version: 1` and its final LF. A successful validation ends the operation without a follow-up inspection. Bounded structural diagnostics permit supported repairs while each correction makes progress within the authorized scope and resource limits. Every repair requires validation of the resulting state; unresolved failures are reported without claiming completion.

If you decline agent inclusion or approve only part of the inventory, initialization finishes integration and final validation for that chosen scope and identifies the responsibilities left without registration.

Initialization uses the larger traversal profile used by repair, without becoming a repair operation or raising its limits. If it cannot finish, it reports completed and pending registrations and verification honestly. Say `continue` to resume that initialization; an unanswered permission or policy question still needs an answer.

In an adopted project, the same request preserves the foundation and existing registrations while completing any unfinished onboarding under the same permission rules. Missing or unsafe canonical foundation files prevent adoption: the coding agent identifies the existing artifacts and missing contract elements, preserves valid content, and does not initialize or repair over them without the required authority and decisions.

## When the repository does not explain itself

Initialization is conversational when evidence is incomplete:

- If no meaningful project context can be established, the coding agent explains that `moldea` keeps durable repository context and asks one focused question about what the project does and whom or what it serves. A name, generic label, placeholder file, empty export, or brief package metadata cannot establish the foundation alone.
- If part of the project is clear but a material purpose, user, goal, authority, or boundary remains uncertain, the coding agent summarizes supported conclusions and asks one question about that boundary. Broad language such as “handles payments” does not establish value movement, authorization, destructive effects, lifecycle changes, or external actions that the evidence does not support.
- If the foundation is sufficient, initialization proceeds without a ceremonial project questionnaire. Existing-agent registration and application changes still require the single confirmation above unless your request already includes them.

You may supply context directly or point to an accessible source. The coding agent evaluates it with repository evidence and carries only durable, relevant truth into the foundation. Insufficient or partial foundations pause with no dependency, canonical-state, or managed README writes. Missing tooling does not erase available project evidence, and developer-answerable ambiguity is not stored as an unresolved requirement.

## Make your first request

After initialization, start with a project-context request for ordinary software work:

> **You**
>
> Use the saved project context to plan the next API change. Identify the relevant rules before proposing the implementation.

When your application needs a runtime agent, describe that outcome naturally:

> **You**
>
> Create a support agent for this application.

To design the system before implementation, ask:

> **You**
>
> Use moldea to plan an agent system for personalized ecommerce promotions. Decide what should remain ordinary software and what genuinely needs model reasoning.

Planning is read-only and may recommend no agents. You do not need to mention `moldea` again or create bindings first. The managed AGENTS.md block checks ordinary paths before loading the entrypoint; clear agent work checks adoption, and a follow-up continues only the active task and its authorization. Unrelated work remains unaffected. See the [workflow reference](/docs/how-it-works/) for the complete activation contract.

You do not need to create `/moldea` directories by hand, invoke the local CLI directly, translate requests into special commands, maintain duplicate instructions, or create a `moldea Cloud` account. The coding agent owns safe interaction with the repository-local skill and tooling.

## Update or remove the skill

An unpinned installation follows `main`; rerun the first installation command to refresh it. A pinned installation never moves automatically; rerun the pinned form with the desired immutable release tag. Updating refreshes portable instructions and references. It does not initialize a project, modify `/moldea/**`, install the CLI globally, or alter canonical state.

Existing repositories also need a bridge that matches the new installation:

1. Update the skill artifact. Installation leaves the current AGENTS.md managed region untouched; validation reports a differing old region as stale without invalidating canonical state.
2. Ask for `Fix moldea`. When host rules permit, the bundled writer refreshes only the managed region, preserves unrelated bytes and line endings, and makes no further change on repeat. When the file is protected, the coding agent provides the current writer's exact printed block for application through an allowed instruction-update workflow.
3. Validate after the region is applied. Integration remains incomplete until the block matches; installing the skill alone does not activate a routing correction in an old repository bridge. Use fresh conversations for manual routing checks after setup.

Remove the project installation with:

```bash
npx skills remove moldea
```
