---
title: Compatibility and local tooling
navigationTitle: Compatibility
description: Supported Git, Node.js, CLI, repository format, and machine-output contracts for the current skill release.
section: reference
order: 180
---

# Compatibility and local tooling

Release `5.0.11` supports exactly:

- Git `>=2.30.0`
- Node.js `>=22.11.0`
- stable `@moldea.ai/core` releases satisfying `^4.0.1`
- stable `@moldea.ai/cli` releases satisfying `^8.0.0`
- repository format version 1
- CLI JSON schema 4

The CLI is a repository-root-local development dependency. Its declaration and installed stable version must satisfy `^8.0.0`; compatible CLI 8 patches and minors do not require a skill release. Installed Core must satisfy both the CLI's declared Core range and moldea's supported `^4.0.1` range. Other CLI majors, prereleases, malformed declarations, incompatible installed versions, and Core versions below 4.0.1 fail closed. The skill never selects a global CLI, runs a transient download, or searches unrelated workspaces for a provider.

## Tooling ownership

This page owns CLI invocation and machine-evidence contracts. The tooling-installation reference owns authorized setup. Neither replaces Git, package management, planning, review, commit, or publication procedures owned by the host workflow.

A write-capable `moldea` operation may establish the compatible dependency through the repository's package manager with lifecycle scripts disabled. Read-only work reports missing or mismatched tooling without changing dependencies, lockfiles, or configuration. Executable package-manager extensions stop automatic setup; the skill reports the obstacle and defers to the repository's trusted workflow instead of weakening host controls.

During initialization, sufficient project context comes before dependency changes. A known missing CLI is installed before canonical or managed README writes and before validation, without a deliberate failing probe. Installation failure stops those writes and validation while preserving and reporting any package-manager changes. An existing compatible CLI needs no reinstall or extra availability check.

Every CLI operation uses the installed portable skill's `scripts/moldea-cli.mjs` launcher. From inert package metadata, the launcher validates package identity, exact installed stable version, the supported root declaration, the CLI's Core dependency range against installed Core, the binary declaration, and repository-local containment. The resolved dependency must remain inside the repository; npm and pnpm layouts within that boundary are supported. It invokes Node with an argument array and no shell. Package management and repository setup or CI own lockfile consistency; the launcher does not read target-project lockfiles. Agents do not reproduce package, executable-link, `PATH`, or parent-workspace probes around the launcher. Metadata and containment do not authenticate executable contents or replace host execution controls.

The pre-activation gate instead uses the Core matcher bundled with the installed skill. It emits only `0` or `1` and does not execute repository dependencies. Foundation reads reject file links and directory symlinks or junctions below the resolved repository root. Repository-contained dependency links remain supported by the launcher.

## Machine output

Compatible stable CLI 8 releases emit schema 4 JSON. Paged commands use `--json --max-output-bytes 65536`; `composition` uses the launcher's fixed 65,536-byte boundary. The envelope contains `schemaVersion`, the exact installed `cliVersion`, `command`, `status`, `result`, and `error`.

Exit codes are:

- `0`: `valid`
- `1`: `invalid`
- `2` or `3`: `error`

The launcher preserves a completed child's status and uses 3 for its own validation, containment, signal, or output-boundary failures. Receiving `SIGINT` or `SIGTERM` makes the invocation unsuccessful even if the child handles the signal and exits with 0; cancelled or signal-terminated invocations forward no stdout. It sends the requested termination signal first and force-terminates a child still active after five seconds. A launcher failure, signal, malformed envelope, version mismatch, unsupported schema, stale cursor, or contradictory status provides no deterministic conclusion.

Command boundaries stay explicit:

- `inspect` and `validate` never include canonical document bodies.
- Each paged `kind: agent` inspection record exposes exact `agentId` and `runtimeId` assignments without the agent body.
- `scope` accepts one logical path or one NUL-delimited path set and returns relationship matches after the two-byte gate establishes relevance.
- `content` returns chunks only for one explicit canonical `/moldea/**` path.

## Resource profiles

Ordinary work uses 65,536-byte pages and stops when the relevant record or diagnostic is available. Aggregate `moldea` output should remain at or below 262,144 bytes. Large repositories use deterministic metadata pagination; an explicitly required large traversal may use more pages, but each CLI invocation remains at or below 1 MiB and stays task-scoped. Page limits bound encoded responses, not repository capacity.

Qualification scenarios select one operating profile:

| Limit                     | `ordinary` | `largeTraversal` |
| ------------------------- | ---------: | ---------------: |
| One completed command     |    128 KiB |          128 KiB |
| Completed commands        |         64 |               64 |
| `moldea` calls            |         16 |               16 |
| `moldea` output           |    256 KiB |            1 MiB |
| Model-visible tool output |      1 MiB |            4 MiB |
| Input plus output tokens  |  1,625,000 |        1,625,000 |

The host retains absolute ceilings of 128 completed commands, 32 `moldea` calls, 8 MiB of `moldea` output, 16 MiB of complete-stage model-visible tool output, 32 KiB of raw command text, and 2,097,152 tokens. These are failure containment, not operating targets. The 128 KiB peak applies to one completed command and is distinct from the 32 KiB raw-command ceiling.

Crossing an operating dimension fails with its profile, dimension, observed value, and limit. A safe cumulative command, `moldea`-call, or token overage may still reach semantic judging for calibration, but the trial remains failed. Missing token usage and output-volume, deterministic, workspace, runner-owned, or command-policy failures skip judging. Duration and peak memory are diagnostics rather than brittle pass/fail thresholds.

`src/resources/profiles.ts` is the numeric authority. `fixtures/resource-calibration.json` contains reproducible measurements for ordinary, 1,024-path, large-Unicode, diagnostic-heavy, and adversarial CLI and repository inputs, with at least 25% cumulative headroom for non-attack cases. `fixtures/model-stage-resource-calibration.json` contains privacy-safe accepted actor and judge aggregates and proves at least 25% cumulative operating headroom; it is neither current qualification assurance nor a pointer to an active result directory.

Use these checks after changing resource behavior:

```bash
npm run resource:calibrate
npm run resource:check
```

`resource:calibrate` refreshes deterministic calibration observations. `resource:check` verifies both calibration sources, internal observation integrity, required headroom, and agreement with the active profiles.

## Runtime compatibility

Use current CLI inspection evidence first. For an unresolved runtime question, read the installed adapter README and only the relevant linked local guide, then the repository's selected package declaration or lockfile entry when version evidence is needed. Inspect adapter implementation only for a material question those sources cannot resolve. Missing documentation is an evidence gap, not proof of incompatibility. Ordinary runtime work does not fetch compatibility websites or open a browser; the [packages catalog](https://packages.moldea.ai/compatibility/runtimes.json) is optional discovery material.

Complete, unchanged instructions may be reused while they remain available in active context and the host permits it. After compaction, missing instructions must be read again; summaries are not substitutes. Repository facts and execution controls still require current checks. See the [reference-reading checks](/docs/reference-reading/).

Package ranges establish eligibility, not blanket compatibility. A later stable version within an adapter's range remains eligible for inspection, but qualification evidence covers only the exact tested versions and source patterns. A genuine version mismatch, unavailable adapter, or unsupported source pattern remains a local limitation. None changes the runtime identity to `custom`; missing online information and website labels do not affect canonical identity or unresolved state. A clean inspection alone does not prove complete application behavior.
