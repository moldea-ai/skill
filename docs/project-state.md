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

Use one focused owner under `/moldea/context/` per product area, policy domain or subsystem. Each owner holds the facts and relationships for that area. Record governing decisions separately under `/moldea/decisions/` when their rationale and consequences matter. Link to facts owned by established documents.

## Agents and connections

Each registered agent has one `description.md` and one `instruction.md` in `/moldea/agents/<agent-id>/`. The description names the responsibility and supplies routing text. The instruction governs how the agent behaves. The manifest lists only evidenced bindings, capabilities, relationships and mirrors. An agent with no optional entries can be registered as `agent-id: {}`.

Repository-native Agent Skills stay in their authoritative directories. A real consumer can declare a supported skill relationship. An exact mirror maintains another tracked copy only when the actual model integration needs one.

## Context ownership and compression

A file binding can name an ESM export. An `affectedBy` path identifies a file or coherent subtree to review against an owner's facts or rules. Prefer the enforcement point, and relate the source of a directly governed deliverable such as a post or report. Both declarations help select relevant owners. A match may end with the context confirmed and no edit needed.

The coding agent proposes a focused owner and route for an uncovered area. Check and Fix surface mixed responsibilities, misplaced facts and missing routes. After you approve a restructure, Maintain keeps the facts intact and updates routes, relationships and consumers together. See the [repository format](/docs/repository-format/) for examples.
