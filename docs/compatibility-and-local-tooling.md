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
- stable `@moldea.ai/core` releases satisfying `^3.0.0`
- stable `@moldea.ai/cli` releases satisfying `^7.0.0`
- repository format version 1
- CLI JSON schema 4

The CLI is a repository-root-local development dependency. Its declaration and exact lockfile-selected stable version must satisfy `^7.0.0`; compatible CLI 7 patches and minors do not require another skill release. CLI 8, prereleases, malformed ranges, and incompatible installed versions fail closed. The skill never selects a global CLI, runs a transient download, or searches unrelated workspaces for a provider.

## Tooling ownership

The local-tooling reference governs only establishment and invocation of the `moldea` CLI. It does not replace Git commands, package-manager commands, planning, review, commit, or publication procedures owned by the host workflow.

A write-capable `moldea` operation may establish the compatible dependency through the repository's existing package manager with lifecycle scripts disabled. Read-only work reports missing or mismatched tooling and does not alter dependencies, lockfiles, or configuration.

Every CLI operation uses the portable skill's `scripts/moldea-cli.mjs` launcher. The launcher validates the installed package identity, exact stable version, supported declaration, CLI/Core dependency closure, binary declaration, and repository-local containment from inert package metadata. It then invokes Node with an argument array and no shell. The skill's pre-activation script reuses the same resolver, invokes Core without the CLI, and emits only `0` or `1`. Agents do not reproduce package, executable-link, `PATH`, or parent-workspace probes around either script.

## Machine output

Compatible stable CLI 7 releases emit schema 4 JSON only. Every paged machine command uses `--json --max-output-bytes 65536`; `composition` uses the launcher's fixed 65,536-byte boundary.

The envelope contains:

- `schemaVersion: 4`
- `cliVersion` equal to the exact installed stable CLI 7 version
- the invoked `command`
- `status`
- `result`
- `error`

Exit code 0 represents `valid`, exit code 1 represents `invalid`, and exit code 2 or 3 represents `error`. The launcher preserves a completed child's status and uses 3 for its own validation, containment, signal, or output-boundary failures. It sends the requested termination signal first and force-terminates a child that remains active after five seconds. A launcher failure, signal, malformed envelope, version mismatch, unsupported schema, stale cursor, or contradictory status provides no deterministic conclusion.

`inspect` and `validate` do not include canonical document bodies. `scope` accepts one logical path or one NUL-delimited path set and returns relationship matches after the two-byte gate establishes relevance. `content` returns chunks only for one explicit canonical `/moldea/**` path.

## Resource limits

Ordinary work uses a 65,536-byte page and stops once the relevant record or diagnostic is available. Aggregate `moldea` output should remain at or below 262,144 bytes. This is an operating target, not a project-size ceiling.

Large repositories remain supported through deterministic metadata pagination. An explicitly required large-context operation may traverse more pages, but each CLI invocation remains at or below 1 MiB and the traversal remains scoped to the task. The page limit bounds one encoded response, not repository capacity.

Qualification scenarios declare one of two operating profiles:

- `ordinary`: 64 KiB from one completed command, 32 completed commands, 8 `moldea` calls, 256 KiB of `moldea` output, 1 MiB of aggregate model-visible tool output, and 524,288 input-plus-output tokens
- `largeTraversal`: 64 KiB from one completed command, 64 commands, 16 `moldea` calls, 1 MiB of `moldea` output, 4 MiB of aggregate model-visible tool output, and 1,048,576 input-plus-output tokens

The host retains higher absolute ceilings of 128 completed commands, 32 `moldea` calls, 8 MiB of `moldea` output, 16 MiB of complete-stage model-visible tool output, 32 KiB of raw command text, and 2,097,152 tokens. These are failure containment for unusual cases, not operating targets. The 64 KiB operating peak applies to one completed command's output and is distinct from the 32 KiB raw-command-text ceiling. Crossing any operating dimension fails with the profile, dimension, observed value, and limit so users can distinguish excessive behavior from missing evidence. An otherwise safe cumulative completed-command, `moldea`-call, or token overage may reach semantic judging to establish whether it is eligible calibration evidence, but the trial remains failed until the active profile accepts it. Missing token usage and any output-volume, deterministic, workspace, runner-owned, or observed command-policy failure skip the judge. Duration and peak memory remain recorded diagnostics rather than brittle pass/fail thresholds.

`tooling/resource-calibration/profiles.mjs` is the numeric authority for these values. `fixtures/resource-calibration.json` records reproducible deterministic CLI and repository-operation measurements; it is not model-stage evidence. Current qualification attempts record real actor and judge command counts, one-command output peaks, aggregate output, tokens, and duration. Use `npm run resource:check` to verify that current code and committed deterministic evidence agree.

## Published runtime compatibility

Installed CLI composition reports available adapter packages and repository-format compatibility. Current target maturity remains owned by the packages website publication at [`packages.moldea.ai/compatibility/runtimes.json`](https://packages.moldea.ai/compatibility/runtimes.json).

An unavailable or invalid publication blocks only claims that depend on current published maturity. It does not prevent local structural validation, content-free metadata inspection, or a negative readiness conclusion supported by independent evidence.
