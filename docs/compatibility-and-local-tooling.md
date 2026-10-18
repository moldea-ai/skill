---
title: Compatibility and local tooling
navigationTitle: Compatibility
description: Supported Git, Node.js, CLI, repository format, and machine-output contracts for the current skill release.
section: reference
order: 180
---

# Compatibility and local tooling

Release `8.2.7` supports exactly:

- Git `>=2.30.0`
- Node.js `>=22.17.0`
- stable `@moldea.ai/core` releases satisfying `^7.0.0`
- stable `@moldea.ai/cli` releases satisfying `^11.0.0`
- repository format version 1
- CLI JSON schema 7

The CLI is a repository-root-local development dependency. Its declaration and installed stable version must satisfy `^11.0.0`; compatible CLI 11 patches and minors do not require a skill release. Installed Core must satisfy both the CLI's declared Core range and `moldea`'s supported `^7.0.0` range. Other CLI majors, prereleases, malformed declarations, incompatible installed versions, and incompatible Core versions fail closed. The skill never selects a global CLI, runs a transient download, or searches unrelated workspaces for a provider.

## Tooling ownership

This page owns CLI invocation and machine-evidence contracts. The tooling-installation reference owns authorized setup. Neither replaces Git, package management, planning, review, commit, or publication procedures owned by the host workflow.

Explicit repair reads its exact CLI recovery target from the selected installed skill's `metadata.cliRepairVersion`, maintained from the locked development CLI. This target is distinct from the supported range. Updating the skill alone changes no project. Healthy aligned tooling is a no-op; healthy newer compatible versions are preserved after composition checks. Repair updates a compatible CLI older than the target, or an installed CLI without a supported root declaration, and reports both versions. It installs the exact target as a root development dependency, replacing an unsupported range or a `dependencies` entry, and never lowers a newer declared version. Other explicit operations only report that mismatch; ordinary work stays silent about it. Downgrades, newer unsupported majors, and explicit pin conflicts need direction.

A write-capable `moldea` operation may establish the compatible dependency through the repository's package manager with lifecycle scripts disabled. Read-only work reports missing or mismatched tooling without changing dependencies, lockfiles, or configuration. Executable package-manager extensions stop automatic setup; the skill reports the obstacle and defers to the repository's trusted workflow instead of weakening host controls.

Yarn setup depends on the executing Yarn line. Yarn Classic 1.x installs with `--ignore-scripts`, and Yarn 3 and later install with `--mode=skip-build` in a node-modules layout. Yarn 2.x cannot skip dependency builds while adding, so it stops for the repository's trusted setup workflow. A `.yarnrc.yml` `yarnPath`, a Classic `.yarnrc` `yarn-path`, or a `packageManager` value other than a plain registry version selects repository-supplied or non-registry Yarn code and stops automatic setup like an executable plugin. Just before an installation that will proceed, the coding agent runs `yarn --version` once and requires it to agree with the `packageManager` value, lockfile format and configuration file; any disagreement needs direction.

During initialization, sufficient project context comes before dependency changes. A known missing CLI is installed before canonical or managed README writes and before validation, without a deliberate failing probe. Installation failure stops those writes and validation while preserving and reporting any package-manager changes. An existing compatible CLI needs no reinstall or extra availability check.

Every CLI operation uses the installed portable skill's `scripts/moldea-cli.mjs` launcher. From inert package metadata, the launcher validates package identity, exact installed stable version, the supported root declaration (a root `devDependencies` entry that is the exact installed stable version, or a caret range on a stable 11.x version the installed CLI satisfies), the CLI's Core dependency range against installed Core, the binary declaration, and repository-local containment. The resolved dependency must remain inside the repository; npm and pnpm layouts within that boundary are supported. It invokes Node with an argument array and no shell. Package management and repository setup or CI own lockfile consistency; the launcher does not read target-project lockfiles. Agents do not reproduce package, executable-link, `PATH`, or parent-workspace probes around the launcher. Metadata and containment do not authenticate executable contents or replace host execution controls.

The pre-activation gate instead uses the Core matcher bundled with the installed skill. Ordinary mode emits exactly `0` or `1` plus LF and executes no repository dependencies. AGENTS.md invokes it with repeatable `--path` arguments relative to the absolute repository root, without reading stdin. NUL-delimited batches share the 2 MiB input allowance. Opt-in `--diagnose` keeps healthy hit/miss results but reports malformed or failed execution through nonzero exit and compact stderr. README and AGENTS.md are not adoption prerequisites. Core validation checks the AGENTS.md integration block and the installed skill assets; a diagnostic gate smoke test checks the displayed command separately. Missing or stale integration warns without changing canonical validity. Foundation reads reject file links and directory symlinks or junctions below the resolved repository root. Repository-contained dependency links remain supported by the launcher.

## Machine output

Compatible stable CLI 11 releases emit schema 7 JSON. Paged commands use `--json --max-output-bytes 65536`; `composition` uses the launcher's fixed 65,536-byte boundary. The envelope contains `schemaVersion`, the exact installed `cliVersion`, `command`, `status`, `result`, and `error`.

Exit codes are:

- `0`: `valid`
- `1`: `invalid`
- `2` or `3`: `error`

Before forwarding or saving any completed response, the launcher verifies complete UTF-8 JSON, schema, exact installed CLI version, command, result/error shape, and exit/status agreement. For inspection and validation it also checks nonnegative integer diagnostic totals, their arithmetic, and agreement with validity and status. It accepts additive fields and preserves verified raw bytes. Malformed or contradictory output returns 3 with a short diagnostic and no stdout. The launcher preserves a verified child's status and uses 3 for its own validation, containment, input-delivery, signal, or output-boundary failures. Receiving `SIGINT` or `SIGTERM` makes the invocation unsuccessful even if the child handles the signal and exits with 0; cancelled or signal-terminated invocations forward no stdout. It sends the requested termination signal first and force-terminates a child still active after one second. A launcher failure, signal, malformed envelope, version mismatch, unsupported schema, stale cursor, or contradictory status provides no deterministic conclusion.

Command boundaries stay explicit:

- `inspect` and `validate` never include canonical document bodies.
- Each paged `kind: agent` inspection record exposes exact `agentId` and `runtimeId` assignments without the agent body.
- `scope` accepts one `--path` or one NUL-delimited UTF-8 path set of at most 2 MiB and returns relationship matches after the two-byte gate establishes relevance.
- `content` returns chunks only for one explicit canonical `/moldea/**` path. CLI/Core still reject noncanonical targets.

Release `8.2.7` accepts bare repository-relative and leading-slash repository-logical paths. The development scripts also normalize leading `./` and native absolute paths contained beneath the supplied or physically resolved repository root. The gate's argv and stdin modes and the launcher's `scope` and `content` use the same normalization. Relative paths always start at the repository root, regardless of the working directory. Normalization preserves input order, duplicates, casing, and Unicode, with the same raw 2 MiB batch allowance and no target-file lookup.

On POSIX, contained absolute paths take precedence; other leading-slash paths retain their repository-logical meaning, and backslashes remain errors. Windows paths accept either separator in relative paths and convert contained drive-absolute paths. Traversal, internal dot segments, repeated separators, repository-root-only selections, drive-relative paths, and UNC/device forms remain errors. Normalization does not replace canonical filesystem checks.

Paged commands accept launcher-only `--save-response <absolute-temporary-file>` and `--cursor-from-response <absolute-temporary-file>` options. Create the private task directory with `node <installed-skill-root>/scripts/response-directory.mjs --repository <absolute-repository-root>`. It returns an absolute path beneath the resolved host temporary root, outside the repository, with owner-only POSIX access. Windows uses the host temporary storage permissions. The directory holds one exact raw response. The next call extracts its opaque cursor mechanically and fetches one page with unchanged filters and budget. File and directory links are rejected; new targets must be unused unless replacing the explicitly loaded checkpoint. `composition` does not support these options, and a saved cursor cannot be combined with `--cursor`. Complete valid/invalid pages can be saved; error and interrupted output cannot replace a checkpoint. The coding agent removes owned scratch files when finished. Hosts that prohibit scratch writes retain that constraint.

When the host truncates or loses a response saved with `--save-response`, read the saved file instead of rerunning the command. Cancellation before atomic rename submission preserves the prior checkpoint. A rename already submitted may complete with the new page, but the cancelled invocation still returns 3 with no stdout. Continuation never aggregates pages, automatically fetches more, or resets the shared resource budget within a cycle.

## Resource profiles

Ordinary work uses 65,536-byte pages and stops when the relevant record or diagnostic is available. Aggregate `moldea` output should remain at or below 524,288 bytes per maintenance cycle, as defined in the installed skill's `references/local-tooling.md` Resource limits section. Large repositories use deterministic metadata pagination; an explicitly required large traversal may use more pages, but each CLI invocation remains at or below 1 MiB and stays task-scoped. Page limits bound encoded responses, not source parsing. The isolated Node inspection has fixed memory and elapsed-time safeguards. Verified heap exhaustion (`RESOURCE_LIMIT_EXCEEDED`) and elapsed timeout (`INSPECTION_TIMEOUT`) leave verification incomplete; neither establishes faulty application code. Capacity contention (`INSPECTION_BUSY`) and process failure (`INSPECTION_PROCESS_FAILED`) also provide no inspection conclusion. Preserve earlier changes and report remaining checks; do not retry unchanged failures repeatedly or split healthy source automatically.

Across ordinary work, initialization and repair, moldea limits count only moldea CLI calls and output, bundled helpers (including the repair Git helper), and canonical file reads and writes. In explicit repair and initialization, source reads made for that assessment also count toward completed host commands and model-visible output, but not toward the aggregate moldea-output allowance. Project-required commands, including tests, builds, Git and project checks, never count. The installed skill's Resource limits section owns this counting rule.

When ordinary work reaches a limit, the coding agent completes the developer's task, still performs final validation for canonical writes already made and skips further assessment reads, briefly naming deferred canonical checks. One bounded final validation remains required even if the ordinary aggregate moldea-output allowance is exhausted; it does not permit more assessment, a reset or another correction loop. Explicit moldea operations retain their existing bounds and stop-and-continue behavior.

For practical handling, start with [Limitations](/docs/limitations/). Detailed input and worker defaults belong to the [Core resource reference](https://packages.moldea.ai/packages/core/repository-inspection/#resource-limits) and [CLI budgets](https://packages.moldea.ai/packages/cli/output-and-operations/#resource-budgets).

The following numbers are release-evaluation measurements from the unchanged source-controlled profiles, not universal limits on developer tasks. The recorded 8.2.3 evaluator counts whole-trial host commands and tool output. Skill 8.2.4 and later use the moldea-only counting rule above; initialization and repair retain the numeric `largeTraversal` bounds. The evaluator must adopt that counting rule before the next paid run:

| Limit                     | `ordinary` | `largeTraversal` |
| ------------------------- | ---------: | ---------------: |
| One completed command     |    256 KiB |          256 KiB |
| Completed commands        |         64 |               64 |
| `moldea` calls            |         16 |               16 |
| `moldea` output           |    512 KiB |            1 MiB |
| Model-visible tool output |      1 MiB |            4 MiB |
| Tokens (accounting below) |  1,625,000 |        1,625,000 |

The isolated model-stage runner retains absolute ceilings of 128 completed commands, 32 `moldea` calls, 8 MiB of `moldea` output, 16 MiB of complete-stage model-visible tool output, 32 KiB of raw command text, and 2,097,152 tokens. These are failure containment, not operating targets. The 256 KiB peak applies to one completed command and is distinct from the 32 KiB raw-command ceiling.

Token grading counts input plus output, including cached input, for single-request trials and first cycles. For resumed cycles it counts uncached input plus output against both token limits. Campaign usage accounting still includes cached input. A complete token counter above either limit remains valid evidence and records a resource failure for that trial; it does not abort parsing or the campaign. Safe command and moldea-call overages may also reach semantic judging, but the trial remains failed. Missing cycle usage cannot establish a resource pass. Absolute output and evidence-containment violations still stop parsing. Duration and peak memory are diagnostics rather than brittle pass/fail thresholds.

`src/resources/profiles.ts` is the numeric authority. The ordinary moldea-output allowance is 512 KiB because a real Platform implementation cycle consumed 261,014 bytes, leaving little room under the 256 KiB allowance. The per-host-command cap and every other profile limit remain unchanged. `fixtures/resource-calibration.json` contains reproducible measurements for ordinary, 1,024-path, large-Unicode, diagnostic-heavy, and adversarial CLI and repository inputs, with at least 25% cumulative headroom for non-attack cases. `fixtures/model-stage-resource-calibration.json` contains privacy-safe accepted actor and judge aggregates and proves at least 25% cumulative operating headroom; these recorded observations establish calibration integrity, not current behavioral assurance.

Use these checks after changing resource behavior:

```bash
npm run resource:calibrate
npm run resource:check
```

`resource:calibrate` refreshes deterministic calibration observations. `resource:check` verifies both calibration sources, internal observation integrity, required headroom, and agreement with the active profiles.

## Runtime guidance

Runtime IDs select focused guidance for the SDK used by the project. They are labels, not package compatibility declarations or certifications. Choose the actual highest-level integration, and use `custom` only when no named runtime describes it. Composition lists the CLI/Core packages and available labels; it does not inspect application behavior.

For an unresolved SDK question, start with the matching row in the installed skill's runtime guidance and the installed SDK's type definitions. Use a bounded symbol query, then read only the relevant declaration or source-owned documentation. Do not scan all declarations or infer integration behavior from package names. Stop at a dynamic boundary whose behavior cannot be established and report its smallest reliable resolver.

Core checks declared files and explicit runtime exports in TypeScript and JavaScript ESM. CommonJS, type-only declarations, and inconclusive export inventories remain not checked. Coverage records identify the check performed; no record claims that runtime wiring was checked. SDK compatibility and application behavior still require repository evidence and appropriate integration tests.

Complete, unchanged instructions may be reused while available. After compaction, read missing required instructions again. See [reference-reading checks](/docs/reference-reading/).

The bundled `managed-agents.mjs --repository <absolute-root>` writer derives its installation from the executing repository-contained copy. `--print` renders the exact block without writing. It preserves outside bytes, rejects linked or ambiguous targets, and respects host restrictions on instruction files. README uses its separate informational writer. Ask for `Fix moldea` to repair permitted integration, or explicitly accept the supported warning with your reason. When AGENTS.md is protected, the coding agent hands off the exact block for a separate instruction update.

## Initialization inspection

Initialization uses the bundled read-only `initialization-inspection.mjs --repository <absolute-root>` helper once for a metadata inventory. It identifies the selected distribution as installed, excludes it from project-owned Skill candidates, and leaves other Skill ownership unverified until project evidence establishes it. Document and decision paths are candidates, not proof of current authority or active status; canonical agent directories do not establish registration or the absence of inline workflows.

Adding repeated `--path <known-relative-file>` arguments selects one source packet instead of repeating inventory traversal. A packet accepts eight paths, reads at most 32 KiB from each bounded regular text file and 64 KiB in total, and reports omissions explicitly. Linked, missing, oversized, non-text and packet-limited sources need existing targeted inspection; they are not checked evidence. The helper rejects escaping and excluded paths, `.env`, `.env.*`, `auth.json`, `credentials.json`, and `.pem`/`.key` selections. Callers select project source, never credentials. Discovery never follows directory links, and the helper writes no repository or Git state.

Inventory stops at 16,384 entries or 64 directory levels and retains at most 128 paths per category. Unreadable directories retain partial inventory. Partial results cannot establish complete discovery or absence. JSON output remains bounded to 262,144 bytes; an output overflow or helper error produces no inspection evidence, so use known indexes or bounded targeted tools and report any remaining limit. Reuse unchanged packets; source mode performs no inventory walk and stores no cache or checkpoint. The existing agent-design procedure still owns semantic discovery, runtime interpretation, registration, connection tests and final validation.

## Repair Git evidence

Explicit repair uses the bundled `repair-git.mjs` helper for checkpoint, continuation and written-file review. It pins Git to the supplied worktree, refuses stored attribute-tree configuration, inspects bounded attributes before worktree-aware reads, uses literal pathspecs, and does not write Git state. Its internal index listing is bounded to 4 MiB and 65,536 attribute paths; that listing is never shown to the model. The single response remains bounded to 65,536 bytes. Oversized evidence remains unavailable and cannot establish a current checkpoint. Executable filters, unseen indexed attribute fallbacks, unsafe links and oversized evidence produce explicit limitations.

Attribute inspection conservatively refuses any attribute file containing `filter`, including Git LFS declarations, macros and comments. LFS configuration is disabled as additional protection, not an exception to that refusal. These limitations stop Git-dependent repair; they are not evidence of project drift or permission to bypass repository controls. An unborn repository instead returns unavailable commit evidence and uses conservative owner reassessment.

Failed Git reads, including reads during attribute inspection, return `git-read` with Git's first error line in a reason capped at 512 characters. Attribute-safety limitations remain distinct. The helper uses Git's `/dev/null` spelling for global configuration and attributes on every supported platform, including Windows.
