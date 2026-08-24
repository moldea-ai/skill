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

The coding agent inspects package-manager configuration as file data before invoking the manager. A repository-supplied executable hook, pnpmfile, Yarn plugin, or equivalent extension blocks package-manager execution. The report retains that independent blocker even when another clarification also pauses the workflow. It names the exact path, blocked operation, unavailable evidence, and safe developer-controlled prerequisite. Continuing requires removing or disabling the extension, or independently verifying and invoking an already declared and installed exact local CLI without the manager. The skill does not recommend bypassing or executing the extension merely to proceed. When installation or pinning is authorized in a safe repository, dependency lifecycle scripts remain disabled.

The exact repository-local CLI provider is verified before execution, and the skill never falls back to a global command or transient package download. Every result-dependent provider check runs separately and must be accepted before the next command begins.

Before any Git command, including `rev-parse`, `status`, `log`, or `diff`, the coding agent loads the portable local-tooling guidance in a separate step. Read-only Git inspection then uses command-specific controls instead of a bare Git command. Filesystem monitors and pagers are disabled for every supplemental inspection. Patch-producing commands also disable external diff programs and text-conversion drivers, and the coding agent suppresses relevant filters, LFS processing, and unintended submodule recursion. After every command, especially a failure, it checks the workspace and helper sentinels before claiming no writes. When these controls cannot make the required inspection safe, it reports the evidence limitation instead of executing repository code.
