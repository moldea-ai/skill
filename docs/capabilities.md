---
title: Capability reference
navigationTitle: Capability reference
description: Initialize guided project context, use it in development, maintain knowledge, build project agents, and check saved context.
section: start
order: 30
---

# moldea capabilities

## Initialize project context

Ask **Initialize moldea**. With sufficient evidence, the coding agent writes the grounded foundation and integrates it with your instructions before asking guided questions. When the foundation is unclear, it asks one focused question before writing. A guided round shows established facts, area coverage, agent status, files changed and remaining gaps. It offers up to five numbered, evidence-backed proposals. Answer **yes**, answer by number, or **skip**. Existing agents are one approval item in the first round unless your request includes them.

The agent saves confirmed facts, relationships and decisions in their owners. Choose another round on the named gaps or stop and validate the covered scope. **Continue** resumes an unanswered round in this conversation. See [Initialize a project](/examples/initialize-a-project/).

## Use governing context

In an adopted repository, planning a product change reads `project.md` and selects context by purpose. Ordinary source work looks up only the owners connected to affected paths. Unrelated work continues silently. The [workflow reference](/docs/how-it-works/) explains when each route applies.

## Maintain and consolidate context

Save durable facts in the focused owner for their area. Link to facts owned elsewhere and keep decision records separate. Ask **Help moldea learn the billing area** for one evidence-backed round in the same format as Initialize. The agent proposes an owner and a routing link when the area is uncovered.

## Plan, create, or change project agents

Plan the minimum useful architecture with the right division between application rules, model judgment and human authority. Zero agents is a valid result. Create or change agents and inline model workflows from established project rules, with a canonical description and instruction, real bindings and focused connection tests. Project-owned skills can reuse durable policy and tooling through verified links.

## Check and fix

[Check](/docs/check-fix-validate/) assesses facts, ownership, routes and relationships without writing. Run Fix routinely and after large changes to add missing relationships, remove unjustified paths with reasons and replace copied facts with links. Structure changes require approval. Large whole-project fixes proceed in bounded rounds.

## Validate structure

The bundled validation CLI runs with Node.js in Git repositories written in any language. It checks file bindings in all languages and named exports from supported JavaScript and TypeScript ESM sources. Unsupported symbol checks are `not-checked`. A connection test can verify actual instruction consumption independently of format validation.

## Work across dedicated repositories

Establish which checkout owns the context and which holds implementation. A related repository can supply permitted read-only evidence. Keep bindings and writes in the repository that owns them. See [dedicated repositories](/examples/dedicated-repositories/).
