# Establish missing local tooling

Use only for explicit initialization or another authorized write-capable moldea operation that requires a missing compatible local CLI. Read-only planning, evaluation, validation, and CLI-availability proof never enter this installation procedure. Project repair does not install or upgrade dependencies.

## Preflight before initialization analysis

Before foundation analysis, inspect `package.json`, its relevant exact lockfile entry when needed, and declared root package metadata as inert data. Establish whether the exact compatible repository-local CLI is declared and independently verified installed. Do not execute a package manager, enumerate dependencies, inspect binary links, or deliberately invoke a failing launcher to rediscover known absence.

If a compatible CLI is already present, skip installation and availability probes. Continue with `continuous-maintenance.md`; its final launcher call still verifies the executable closure.

When installation is required, inspect only the exact package-manager configuration needed to identify repository-supplied executable extensions. For pnpm, inspect `.pnpmfile.cjs` when present or configured. For Yarn, inspect `.yarnrc.yml` and the exact repository plugin path it declares as file data, never by importing or executing it. This preflight does not depend on the developer naming the hazard. An executable extension blocks automatic installation and preempts foundation-sufficiency inspection and questioning.

Return one concise blocked-install result containing all four facts:

1. No compatible exact local CLI was independently verified as installed.
2. Name the exact configuration and executable hook or plugin that blocks automatic local CLI installation through the named package manager.
3. State that execution stopped before invoking the package manager.
4. State that CLI establishment must use the repository's approved trusted setup workflow, preserving its controls; retry moldea after that workflow establishes a compatible repository-local CLI.

Do not ask a project-purpose question, execute the extension, change configuration, or prescribe removing or disabling hooks or plugins to unblock moldea. Do not switch package managers or installation providers to bypass the stop. If the approved setup workflow is unknown, report that prerequisite without inventing one. This is a stop in automatic moldea setup, not a claim that the extension is malicious or that the repository must remove it.

## Install only after a sufficient foundation

After preflight permits installation, apply `continuous-maintenance.md` to establish sufficient project purpose and boundaries before any dependency change. Insufficient or partial foundations stop with that reference's evidence and clarification result.

For sufficient foundation evidence and authorized installation, use the repository's established package manager and root development-dependency location. Install `@moldea.ai/cli@^8.0.0` with lifecycle scripts disabled and update the ordinary lockfile. Retain a compatible caret declaration or the exact stable version selected by the lockfile. Never load repository-supplied executable extensions, use global or transient providers, weaken host trust controls, or broaden the task into dependency upgrades.

Complete installation before canonical or managed README writes and the first validation. On failure, preserve and report any package-manager changes and stop before those writes or validation. Do not automatically roll back or claim adoption. An already-present compatible CLI needs no reinstall or extra availability check. For invocation and machine evidence, `local-tooling.md` owns the closed launcher contract.

These rules govern only moldea CLI establishment. Host-owned package management, planning, review, and publication remain under the host workflow. Existing host execution controls apply; this reference adds no per-command approval requirement.
