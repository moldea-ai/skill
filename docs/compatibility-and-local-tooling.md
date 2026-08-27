---
title: Compatibility and local tooling
navigationTitle: Compatibility
description: Supported Git, Node.js, package-manager, CLI, and JSON schema versions for the current skill release.
section: reference
order: 180
---

# Compatibility and local tooling

The current skill release supports:

- Git `>=2.30.0`
- Node.js `^22.11.0 || ^24.11.0`
- `@moldea.ai/cli 5.0.0`
- CLI JSON schema `2`
- npm `>=10.9.0 <12.0.0`
- pnpm `>=11.20.0 <12.0.0`
- Yarn `>=4.0.0 <5.0.0`

A client repository stores the exact release-owned repository-root `@moldea.ai/cli` development dependency. Another CLI version belongs to another skill release and is not treated as interchangeable.

## The coding agent owns the tooling boundary

Write-capable workflows can establish or reconcile the exact release tooling when authorized. Planning never installs tooling merely to produce a recommendation. Evaluation and validation remain read-only and report missing or mismatched tooling instead of changing dependencies.

Before any Git, package-manager, deterministic CLI, or tooling-establishment command, the coding agent loads the portable local-tooling guidance as a separate step. It never combines that loading step with the first governed command. Before deterministic execution, it verifies:

- package-manager identity and executable version
- exact CLI declaration, installed package identity and version, and exported `moldea` binary
- the repository-local executable provider
- CLI version and supported JSON schema
- command, status, payload, and exit-code consistency

In a pnpm Plug'n'Play repository, provider verification does not require `node_modules/.bin`. The coding agent resolves the exact root package through `pnpapi`, validates the package identity, relative binary, and canonical containment, then invokes the accepted binary in a separate `pnpm node` process. It does not use `pnpm exec` or change the linker. When repository evidence is accessible, even a request to explain the proof executes these checks and reports the provider, exact version, command, and accepted envelope. Only a request without accessible repository evidence receives the procedure alone.

In a Yarn 4 repository, declaration, installed identity and exported binary, and effective provider are separate ordered checks. Evidence accepted at an earlier stage remains part of the report when a later provider conflict stops execution. The coding agent never resolves or invokes the binary after that conflict.

The coding agent then uses `inspect --json` for complete deterministic evidence, `validate --json` for structural validation, or `composition --json` when installed package composition, available adapter IDs, repository-format versions, or Node.js and Git requirements can change the conclusion. The CLI does not own target maturity or published behavioral support claims.

When current runtime-target compatibility or maturity matters, the coding agent validates the untrusted publication at [`https://packages.moldea.ai/compatibility/runtimes.json`](https://packages.moldea.ai/compatibility/runtimes.json). The packages website owns that publication, including `experimental` and `supported` target maturity, so those states can change independently of the CLI. An unavailable or invalid publication blocks only claims that depend on current published compatibility; it does not prevent safe local inspection or deterministic validation.

When supplemental Git evidence is necessary, no Git subcommand is presumed harmless. Before worktree-aware Git, the coding agent establishes the candidate repository root through inert filesystem traversal and reads every repository and Git-directory attribute source. Any filter rule or incomplete attribute inspection blocks that Git path because repository clean filters cannot be neutralized universally from the command line. After the preflight passes, command-specific controls disable system and global attributes, filesystem monitors, pagers, external diff programs, text conversion, LFS, and submodule recursion. After every command, especially a failure, the agent checks the workspace and helper sentinels before claiming no writes. If those controls cannot make the inspection safe, it reports the limitation instead of executing repository code.

An executable package-manager extension blocks manager execution. A Yarn `plugins[].path` declaration counts even when the plugin remains unread and unrun. The report names its exact path, blocked operation, unavailable evidence, and safe prerequisite: remove or disable the extension and retry, or independently verify an already declared and installed exact CLI without the manager. It does not recommend bypassing or executing the extension merely to continue.

You should not need to perform these checks manually. They are the under-the-hood safety boundary that lets you continue requesting outcomes naturally.
