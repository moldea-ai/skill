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
- `@moldea.ai/cli >=3.1.3 <3.2.0`
- CLI JSON schema `1`
- npm `>=10.9.0 <12.0.0`
- pnpm `>=11.20.0 <12.0.0`
- Yarn `>=4.0.0 <5.0.0`

A client repository stores one exact repository-root `@moldea.ai/cli` development-dependency version inside the supported range. Compatible exact pins are preserved rather than upgraded merely because another version exists.

## The coding agent owns the tooling boundary

Write-capable workflows can establish or reconcile compatible tooling when authorized. Planning never installs tooling merely to produce a recommendation. Evaluation and validation remain read-only and report missing or incompatible tooling instead of changing dependencies.

Before deterministic execution, the coding agent verifies:

- package-manager identity and executable version
- exact CLI declaration and installed package identity
- the repository-local executable provider
- CLI version and supported JSON schema
- command, status, payload, and exit-code consistency

The coding agent then uses `inspect --json` for complete deterministic evidence, `validate --json` for structural validation, or `compatibility --json` when runtime support can change the conclusion.

You should not need to perform these checks manually. They are the under-the-hood safety boundary that lets you continue requesting outcomes naturally.
