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

Use `/moldea/context/` for durable domain, architecture, security or operating rules. Record governing decisions separately under `/moldea/decisions/` when their rationale and consequences matter. Link established documents from their current paths and keep one authority for each fact.

## Agents and connections

Each registered agent has one `description.md` and one `instruction.md` in `/moldea/agents/<agent-id>/`. The description names the responsibility and supplies routing text. The instruction governs how the agent behaves. The manifest lists only evidenced bindings, capabilities, relationships and mirrors. An agent with no optional entries can be registered as `agent-id: {}`.

Repository-native Agent Skills stay in their authoritative directories. A real consumer can declare a supported skill relationship. An exact mirror maintains another tracked copy only when the actual model integration needs one.

## Context ownership and compression

A file binding can name an ESM export. `affectedBy` maps a fact or behavior to a related file or coherent subtree. Both help select relevant owners. Correct names and passing static checks describe a narrower result than verified use by a model.

Consolidate context when explicitly requested. Preserve distinct facts, decisions and authority boundaries, and update paths, routing and consumers together. See the [repository format](/docs/repository-format/) for examples.
