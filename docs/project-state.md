---
title: Git-owned project state
navigationTitle: Project state
description: Understand the foundation, focused context, decisions, agents, and relationships owned by your repository.
section: concepts
order: 40
---

# Git-owned project state

## Derived adoption state

An adopted worktree contains bounded regular files at `/moldea/moldea.yaml` and `/moldea/project.md`. The managed README explains the setup and the AGENTS.md bridge routes coding work. Their status is reported separately from adoption and structural validity.

## Minimum foundation

The manifest starts with `version: 1`. The project entry point describes purpose, users, goals and material boundaries. Its routing section links focused owners with a short explanation of which code areas or decisions they govern. A valid foundation can have zero declared agents or relationships.

## Focused context and decisions

Use one focused owner under `/moldea/context/` per product area, policy domain or subsystem. Each owner holds the facts, governing rules and relationships for that area. Record governing decisions separately under `/moldea/decisions/` when their rationale and consequences matter. Link human documentation from the owner for supporting detail.

## Agents and connections

Each registered agent has one `description.md` and one `instruction.md` in `/moldea/agents/<agent-id>/`. The description names the responsibility and supplies routing text. The instruction governs how the agent behaves. The manifest lists only evidenced bindings, capabilities, relationships and mirrors. An agent with no optional entries can be registered as `agent-id: {}`.

Repository-native Agent Skills stay in their authoritative directories. A real consumer can declare a supported skill relationship. An exact mirror maintains another tracked copy only when the actual model integration needs one.

## Context ownership and compression

A file binding can name an ESM export. An `affectedBy` path connects an owner to the code or configuration implementing its facts or enforcing its rules, a project-owned model-facing asset, or the authoritative source of a directly governed deliverable. Both declarations help select relevant owners. A match may end with the context confirmed and no edit needed.

The coding agent proposes a focused owner and route for an uncovered area. Check and Fix surface mixed responsibilities, misplaced facts and missing routes. After you approve a restructure, Maintain keeps the facts intact and updates routes, relationships and consumers together. See the [repository format](/docs/repository-format/) for examples.
