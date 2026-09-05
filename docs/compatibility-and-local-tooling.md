---
title: Compatibility and local tooling
navigationTitle: Compatibility
description: Supported Git, Node.js, CLI, repository format, and machine-output contracts for the current skill release.
section: reference
order: 180
---

# Compatibility and local tooling

Release `5.0.0` supports exactly:

- Git `>=2.30.0`
- Node.js `>=22.11.0`
- `@moldea.ai/core` 3.0.0
- `@moldea.ai/cli` 7.0.0
- repository format version 1
- CLI JSON schema 4

The exact CLI is a repository-root-local development dependency. Another version belongs to another skill release and is not interchangeable. The skill never selects a global CLI, runs a transient download, or searches unrelated workspaces for a provider.

## Tooling ownership

The local-tooling reference governs only establishment and invocation of the `moldea` CLI. It does not replace Git commands, package-manager commands, planning, review, commit, or publication procedures owned by the host workflow.

A write-capable `moldea` operation may establish the exact dependency through the repository's existing package manager with lifecycle scripts disabled. Read-only work reports missing or mismatched tooling and does not alter dependencies, lockfiles, or configuration.

Before executing the CLI, the coding agent validates the installed package identity, version, binary declaration, and repository-local containment from inert package metadata. It then invokes the resolved binary directly. The skill's pre-activation script separately verifies the exact repository-local CLI/Core closure, invokes Core without the CLI, and emits only `0` or `1`.

## Machine output

CLI 7.0.0 emits schema 4 JSON only. Every machine command uses `--json --max-output-bytes 65536`.

The envelope contains:

- `schemaVersion: 4`
- `cliVersion: "7.0.0"`
- the invoked `command`
- `status`
- `result`
- `error`

Exit code 0 represents `valid`, exit code 1 represents `invalid`, and exit code 2 or 3 represents `error`. A launcher failure, signal, malformed envelope, version mismatch, unsupported schema, stale cursor, or contradictory status provides no deterministic conclusion.

`inspect` and `validate` do not include canonical document bodies. `scope` accepts one logical path or one NUL-delimited path set and returns relationship matches after the two-byte gate establishes relevance. `content` returns chunks only for one explicit canonical `/moldea/**` path.

## Resource limits

Ordinary work uses a 65,536-byte page and stops once the relevant record or diagnostic is available. Aggregate `moldea` output should remain at or below 262,144 bytes. This is an operating target, not a project-size ceiling.

Large repositories remain supported through deterministic metadata pagination. An explicitly required large-context operation may traverse more pages, but each CLI invocation remains at or below 1 MiB and the traversal remains scoped to the task.

Semantic and qualification hosts retain only counts and byte totals after raw tool output is discarded. Each model stage allows up to:

- 32 `moldea` invocations
- 8 MiB of `moldea` command output
- 16 MiB of total model-visible tool output

These host limits are generous failure containment for unusual cases. They are not the ordinary operating target. When a stage crosses a limit, the runner reports the measured value and the applicable limit so the user can distinguish excessive behavior from missing evidence.

## Published runtime compatibility

Installed CLI composition reports available adapter packages and repository-format compatibility. Current target maturity remains owned by the packages website publication at [`packages.moldea.ai/compatibility/runtimes.json`](https://packages.moldea.ai/compatibility/runtimes.json).

An unavailable or invalid publication blocks only claims that depend on current published maturity. It does not prevent local structural validation, content-free metadata inspection, or a negative readiness conclusion supported by independent evidence.
