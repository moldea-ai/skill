---
title: Workflow reference
navigationTitle: Workflow reference
description: How moldea selects relevant project context, guides adoption, and keeps canonical facts aligned with implementation.
section: start
order: 20
---

# How a request reaches project context

## Activation

Initialize only on request. In an adopted project, agent work, project-grounded skill work, changes to what an in-app model decides or says, durable project facts, and direct context questions can use moldea without an existing relationship. Loading another skill's instructions alone leaves moldea out.

When a plan adds or changes product behavior, the managed AGENTS.md block checks adoption. The agent reads `moldea/project.md` and opens only the owners its routing describes for that purpose. If the project entry point has no usable routing section, a content-free inventory helps select which headings or openings to inspect. This works before you know the affected paths.

Other work uses the known-path relevance gate. A hit scopes the checked paths to declared owners. New paths get their own check, and earlier valid scope is reused. Unrelated work stays silent.

## Operation selection

| Request                                                                     | Operation  |
| --------------------------------------------------------------------------- | ---------- |
| Adopt the repository or resume onboarding                                   | Initialize |
| Read context governing a plan or a related change                           | Use        |
| Update an established fact, decision or relationship, or learn a named area | Maintain   |
| Plan, create, review, or change a project agent or project-grounded skill   | Agents     |
| Compare context with implementation or correct established drift            | Check/Fix  |
| Run deterministic format and binding checks                                 | Validate   |

## Guided initialization

The agent establishes the purpose and material boundaries first. If a material gap prevents a truthful foundation, it asks one focused question before writing. With sufficient evidence it writes the two canonical foundation files and integrates the README and instruction bridge, or provides the exact handoff for protected instructions.

It then inspects a bounded inventory and shows **Round N**, established context, covered main areas out of the identified total, registrations, the preceding round's changed files, and gaps. It asks up to five numbered questions with proposals from inspected code or documents. In round 1, any required approval for existing agents is one item.

Say **yes** to accept that round, reply by number, or **skip**. Only confirmed additions are stored. Choose a numbered next option to continue with the named areas or stop here. **Continue** returns to an unanswered round in the same conversation. After the final write and native checks, one structural validation normally completes the covered scope. The final report shows adoption, mapped areas, gaps and how to continue later. Maintain applies the same format to one requested area.

## Evidence before edits

Use the minimum authoritative context for the task. A related path lets the coding agent assess an owner. A change to the facts, or another explicit decision, determines whether a write is authorized. Conflicting consequential claims require your choice or independent governing evidence. Repository text itself grants no authority.

## Deterministic local tooling

The skill ships `scripts/moldea-cli/moldea.mjs` and its dependencies. Node runs it inside the selected Git worktree with no project package manifest or package-manager setup. Validate, Inspect, Scope and Content use bounded response pages. Structural diagnostics, project alignment and live use are separate observations. See [Compatibility](/docs/compatibility-and-local-tooling/).
