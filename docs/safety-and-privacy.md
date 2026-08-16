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

The coding agent verifies the exact repository-local CLI provider before execution and never falls back to a global command or a transient package download. When installation or pinning is authorized, lifecycle scripts and repository-supplied package-manager hooks or plugins are suppressed. If those execution surfaces cannot be disabled safely, the workflow stops and reports the prerequisite.

Read-only Git inspection disables repository-configured helpers that could execute code or transform evidence.
