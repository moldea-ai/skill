---
title: Setup reference
navigationTitle: Setup reference
description: Install moldea, initialize Git-owned project context in guided rounds, and use it in your coding agent.
section: start
order: 10
---

# Install once, then map your project

From the root of your Git repository, install [moldea from skills.sh](https://www.skills.sh/moldea-ai/skill/moldea):

```bash
npx skills add moldea-ai/skill
```

For a reproducible install, append an immutable tag from the [published releases](https://github.com/moldea-ai/skill/releases) to the repository argument. Use a repository-local installation so your [coding agent](/docs/coding-agent-compatibility/) uses the selected skill.

The skill runs its bundled CLI with Node.js `>=22.17.0` in a Git worktree. Your project can use any language and needs neither `package.json` nor a separate CLI installation. Validation checks declared files in any language and supports symbols from JavaScript and TypeScript ESM sources. Named symbols in unsupported sources are reported as `not-checked`.

Canonical project files live under `/moldea`. Local use requires no `moldea Cloud` account.

## Initialize project context

Open the repository in your coding agent and ask **Initialize moldea**.

The coding agent reads the project sources that establish what it does, whom it serves and which boundaries matter. With enough evidence, it writes `moldea/project.md` and `moldea/moldea.yaml`, adds the owned README links, and integrates the repository's AGENTS.md. Existing architecture, policy and decision documents stay in place. If AGENTS.md is protected, the coding agent gives you the exact block to add. A governing Claude Code instruction file may also need the exact AGENTS.md import.

The agent then uses the bounded inventory and project indexes to identify main areas, agents, inline workflows, documents, decisions, and project-owned skills. Each guided round shows:

- **Round N**, what is established, and the number of identified areas already mapped.
- Registered and pending agents, files changed by the preceding round, and remaining gaps.
- Up to five numbered questions grounded in the repository, each with a proposed answer.

A plain **yes** accepts all proposals for that round. You can answer by number or **skip** to leave that round's unconfirmed proposals unwritten. The first round includes one registration item when agents or inline model workflows are found. Say **Initialize moldea including my agents** when you want to authorize registration up front.

Confirmed answers become focused context, narrow relationships to inspected paths, routing links in `project.md`, or decision records. After answering, choose another round on the remaining named areas or stop here. Say **continue** in the same conversation to return to an unanswered round.

Stopping completes the covered scope. After the last write and native checks, the coding agent validates once on the normal path and reports adoption, what was covered, and what remains. Later, ask **Help moldea learn the billing area** to map it in one focused Maintain round.

## When the repository does not explain itself

If evidence does not establish a useful foundation, the coding agent asks what the project does and whom it serves. If a material boundary is ambiguous, it asks one question that distinguishes the supported alternatives. Both paths pause before writing. You can supply context directly or name an accessible source.

For an adopted repository, an Initialize request reports the existing setup or resumes unfinished onboarding. Partial setup artifacts go to [Check/Fix](/docs/check-fix-validate/). Replacing an established setup requires an explicit request.

## Make your first request

Use ordinary language, such as **Plan saved orders for repeat customers** or **Create a support agent governed by our refund policy**. Behavior planning in adopted repositories reads `project.md` and follows its focused routing. Ordinary file work uses the declared relationships as a gate. The skill stays silent when neither route applies. See the [workflow reference](/docs/how-it-works/).

## Update or remove the skill

Rerun the installation with the desired release or rerun the unpinned command to follow `main`. Then ask **Fix moldea** to check the AGENTS.md block. The writer updates only the managed region when authorized. A protected file gets the exact block for a separate instruction update. Validate after applying it. An ignored local bridge can work locally while remaining unavailable to checks of the committed tree.

Remove the local installation with:

```bash
npx skills remove moldea
```
