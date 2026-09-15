---
title: Reference-reading checks
navigationTitle: Reference reading
description: Maintainer checks for instruction reuse, context loss, and focused adapter documentation.
section: reference
order: 179
---

# Reference-reading checks

The skill should spend time on the requested work, not repeatedly loading instructions. `SKILL.md` keeps routing and essential boundaries small; operation-specific procedures stay in their references. A maintainer test limits the entrypoint to 8,192 UTF-8 bytes to catch instruction growth. This is not a user output budget or repository-size limit. Host-required reads take precedence. Reusing instructions never establishes fresh repository evidence or permission to write.

## Behavioral regression checklist

Use these scenarios when observing a host session or preparing a future behavioral evaluation. Retain only the relevant read sequence, outcome, and reason for any reload. Do not create a user-repository tracking file or collect unrelated content.

| Situation                                                                    | Expected behavior                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continue the same authorized task with complete instructions still available | Reuse them without reopening guides or probing packages solely to track reads.                                                                                         |
| Move from planning to authorized implementation                              | Select the agent-design reference if newly required; do not reread the planning guide or infer write permission from the earlier plan.                                 |
| Compact context while required instructions remain complete                  | Reuse them unless the host requires a fresh read. Compaction alone is not a reason to load every guide.                                                                |
| Lose required instructions, retaining only a summary                         | Read the required missing entrypoint or reference completely. Do not treat remembered conclusions as instructions.                                                     |
| Update the installed skill or edit a loaded reference                        | Reload the affected required instructions; do not reuse an obsolete procedure or read unrelated guides.                                                                |
| Change implementation, canonical state, dependencies, or scope               | Refresh affected repository evidence and apply current execution controls without automatically reloading unchanged instructions.                                      |
| Switch to unrelated work                                                     | Reassess relevance and authorization. Previous activation and a loaded guide do not authorize `moldea` work on a non-match.                                            |
| Review, fix, or publish payment code in the `moldea` product                 | Use the full relationship gate over host-known ordinary paths. The product name and test-agent terminology do not justify adoption-only activation.                    |
| Edit README outside its managed block                                        | Treat it as ordinary work; the README path alone never justifies direct activation.                                                                                    |
| Continue with a known repository-installed skill                             | Resolve scripts and references from that selected SKILL.md location. Do not try a global path or rediscover the installation.                                          |
| Read-only work encounters missing CLI tooling                                | Report unavailable evidence after relevance; do not load installation procedures or change dependencies.                                                               |
| Authorized setup encounters an executable package-manager extension          | Stop automatic setup, preserve the extension, and report the exact prerequisite for repository-approved trusted CLI establishment.                                     |
| Resolve adapter eligibility from current diagnostics                         | Stop without documentation or source exploration when no material question remains.                                                                                    |
| Need a documented adapter detail                                             | Read the installed README and its relevant linked local guide. Do not read every guide, enumerate dependencies, or browse compatibility websites.                      |
| Encounter missing or inconclusive adapter documentation                      | Identify the unresolved question; inspect only the smallest relevant implementation when necessary. Do not infer incompatibility or replace the runtime with `custom`. |

## What deterministic checks establish

Conformance checks verify reference routing and the location of retained procedure contracts. Gate, launcher, and managed README integration tests verify their executable boundaries. Release checks authenticate the selected evidence and installation identity. These checks do not establish that a model follows the reuse policy in every conversation or quantify model-token savings.

When publishing with [pinned evidence](/docs/release-evidence/), describe instruction changes and deterministic verification in the pin reason. Earlier model attempts did not evaluate new instructions. Keep this checklist separate from the passing semantic-case and adapter-qualification counts until corresponding behavioral evaluations are actually run.
