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

The coding agent inspects package-manager configuration as file data before invoking the manager. A repository-supplied executable hook, pnpmfile, Yarn plugin, or equivalent extension blocks package-manager execution. The tooling-dependent workflow stops when dependency state must change or exact CLI provider proof or invocation requires the manager. An existing exact local CLI may continue only when its provider and canonical executable can be independently verified and invoked directly without the package manager. When installation or pinning is authorized in a safe repository, dependency lifecycle scripts remain disabled.

The exact repository-local CLI provider is verified before execution, and the skill never falls back to a global command or transient package download. Every result-dependent provider check runs separately and must be accepted before the next command begins.

Read-only Git inspection uses command-specific controls instead of a bare Git command. Filesystem monitors and pagers are disabled for every supplemental inspection. Patch-producing commands also disable external diff programs and text-conversion drivers, and the coding agent suppresses relevant filters, LFS processing, and unintended submodule recursion. It verifies that inspection created no helper sentinel or workspace change. When these controls cannot make the required inspection safe, it reports the evidence limitation instead of executing repository code.
