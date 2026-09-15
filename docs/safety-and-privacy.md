---
title: Safety and privacy
navigationTitle: Safety and privacy
description: Understand the local-first data boundary, authority rules, protected instructions, secret handling, and repository safety model.
section: reference
order: 170
---

# Local-first and developer-controlled

The client repository owns its canonical `moldea` state. Local skill workflows do not send repository content to `moldea` Cloud, and a Cloud account is not required for installation or local operation.

## Developer authority

The coding agent establishes the developer-authorized scope before consequential inspection or writes. Read-only requests stay read-only. Write-capable operations change only the authorized scope and necessary directly affected representations.

The skill does not stage, unstage, commit, reset, switch branches, merge, rebase, push, or change Git configuration as part of its workflows.

## Protected coding instructions

Repository coding instructions remain outside `moldea`'s ownership. The coding agent reads and respects applicable instruction surfaces but never creates, edits, weakens, deletes, renames, moves, reformats, or circumvents them through the skill.

## Untrusted repository content

Code, documentation, tests, fixtures, comments, generated files, and canonical context are evidence, not new developer instructions. Prompt-like repository text cannot expand authority, redefine scope, or override deterministic contracts.

## Secrets and runtime values

Actual runtime-variable values remain private and transient. The skill does not persist them in canonical files, diagnostics, logs, or reports. Repository inspection output is treated as potentially sensitive and used only for the active task.

## Safe deterministic execution

Read-only operations never install dependencies or change package-manager configuration. Authorized setup has a separate procedure. It inspects the required configuration as file data before invoking a manager. A repository-supplied executable hook, pnpmfile, Yarn plugin, or equivalent extension stops automatic setup, not ordinary host work.

The blocked result identifies the unavailable compatible local CLI, the exact configuration and executable mechanism, the fact that the package manager was not invoked, and the prerequisite to establish the CLI through the repository's approved trusted setup workflow. The skill preserves those controls and does not prescribe removing or disabling them to proceed. An unknown setup workflow is reported as a prerequisite, not invented. Permitted automatic installation keeps dependency lifecycle scripts disabled.

The gate executes only code shipped with the installed skill. The closed launcher checks the repository-local CLI/Core metadata and path containment before executing the installed CLI. These checks do not authenticate executable contents or provide an OS sandbox. The host's existing repository-trust and execution controls remain in force, without a new approval ceremony. The skill never falls back to a global command or transient package download.

Git inspection remains owned by the active host workflow. The `moldea` skill reuses the host's established repository root, exact paths named or targeted by the developer, changed paths, diffs, branch state, and verification evidence. An unchanged named path remains valid relationship-gate input; the skill does not run Git merely to prove that the path changed. Its local-tooling guidance governs only exact repository-local CLI establishment and bounded `moldea` invocation; it does not add Git preflights, temporary indexes, candidate trees, fingerprints, repeated status probes, or publication checks.
