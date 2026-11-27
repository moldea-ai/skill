---
title: Compatibility and local tooling
navigationTitle: Compatibility
description: Supported Git, Node.js, CLI, repository format, and machine-output contracts for the current skill release.
section: reference
order: 180
---

# Compatibility and local tooling

The portable skill requires Node.js `>=22.17.0` and Git `>=2.32.0`. It includes the CLI and its dependencies. Adopted repositories use any language and need no package manifest or dependency install to run the skill.

## Tooling ownership

The installed skill owns `scripts/moldea-cli/moldea.mjs` and its checksummed supporting files. Run it with Node in the selected Git worktree. The developer's workflow owns package installation, repository configuration, Git writes, and publication.

The pre-activation gate uses Core's bundled manifest matcher. Ordinary mode emits only `0` or `1` followed by LF. `--diagnose` reports malformed or failed execution. A valid canonical foundation can be adopted without README or AGENTS.md. Missing or stale integration produces a warning without changing canonical validity.

## Machine output

Run `node <installed-skill-root>/scripts/moldea-cli/moldea.mjs composition --json` to inspect the CLI's embedded package versions. Use `validate`, `inspect`, `scope`, and `content` with the required repository and selection flags. Paged commands emit schema 8 JSON with the expected command, status, result, and error. They accept `--json --max-output-bytes 65536` and use the returned opaque `--cursor` with the same selection to continue.

Exit 0 corresponds to `valid`, exit 1 to `invalid`, and exit 2 or 3 to `error`. Treat incomplete or failed output as unverified. Diagnostic totals cover the operation's snapshot, even when only one page is returned. Inspect and validate omit document bodies. Use content for one canonical path and scope for one repository-logical path or one NUL-delimited set up to 2 MiB.

## Resource profiles

Ordinary work uses 65,536-byte pages and stops when the relevant record or diagnostic is available. Aggregate `moldea` output should remain at or below 524,288 bytes per maintenance cycle, as defined in the installed skill's `references/validating.md` Resource limits section. Large repositories use deterministic metadata pagination; an explicitly required large traversal may use more pages, but each CLI invocation remains at or below 1 MiB and stays task-scoped. Page limits bound encoded responses, not source parsing. The isolated Node inspection has fixed memory and elapsed-time safeguards. Verified heap exhaustion (`RESOURCE_LIMIT_EXCEEDED`) and elapsed timeout (`INSPECTION_TIMEOUT`) leave verification incomplete; neither establishes faulty application code. Capacity contention (`INSPECTION_BUSY`) and process failure (`INSPECTION_PROCESS_FAILED`) also provide no inspection conclusion. Preserve earlier changes and report remaining checks; do not retry unchanged failures repeatedly or split healthy source automatically.

Across ordinary work, initialization and repair, moldea limits count only moldea CLI calls and output, bundled helpers (including the repair Git helper), and canonical file reads and writes. In explicit repair and initialization, source reads made for that assessment also count toward completed host commands and model-visible output, but not toward the aggregate moldea-output allowance. Project-required commands, including tests, builds, Git and project checks, never count. The installed skill's Resource limits section owns this counting rule.

When ordinary work reaches a limit, the coding agent completes the developer's task, still performs final validation for canonical writes already made and skips further assessment reads, briefly naming deferred canonical checks. One bounded final validation remains required even if the ordinary aggregate moldea-output allowance is exhausted; it does not permit more assessment, a reset or another correction loop. Explicit moldea operations retain their existing bounds and stop-and-continue behavior.

For practical handling, start with [Limitations](/docs/limitations/). Detailed input and worker defaults belong to the [Core resource reference](https://packages.moldea.ai/packages/core/repository-inspection/#resource-limits) and [CLI budgets](https://packages.moldea.ai/packages/cli/output-and-operations/#resource-budgets).

Semantic evaluation applies these operating limits per developer request. The `ordinary` profile counts bundled CLI and helper work and canonical reads and writes. The `largeTraversal` profile also counts assessment source reads toward its command count and model-visible output. [Resource accounting](/docs/semantic-evaluation/#resource-accounting).

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

`src/resources/profiles.ts` defines the evaluation limits. `fixtures/resource-calibration.json` records reproducible measurements across ordinary, large-path, Unicode, diagnostic-heavy, and adversarial inputs. `fixtures/model-stage-resource-calibration.json` records bounded actor and judge aggregates. The calibration check verifies measurements, operating headroom, and agreement with the configured profiles.

Use these checks after changing resource behavior:

```bash
npm run resource:calibrate
npm run resource:check
```

`resource:calibrate` refreshes deterministic calibration observations. `resource:check` verifies both calibration sources, internal observation integrity, required headroom, and agreement with the active profiles.

## SDK guidance

Use the defining SDK's installed version and its relevant types or official documentation to verify the outgoing instruction, routing text, schema, and tools. Confirm actual consumption with a focused native connection test. The repository can use any language. The CLI checks declared files and supports explicit JavaScript and TypeScript ESM symbols; unsupported symbols remain `not-checked`.

## Managed integration

The bundled `managed-agents.mjs --repository <absolute-root>` writer derives its installation from the executing repository-contained copy. `--print` renders the exact block without writing. It preserves outside bytes, rejects ambiguous targets, and respects host restrictions on instruction files. A linked AGENTS.md is followed exactly as `validate` follows it: when the link leads to a regular file in the repository, that file is updated and the link is kept. Every other link is refused with its reason and next step. The writer asks Git how each visited path is stored, with the same configuration files the CLI reads, so files Git ignores and Git links checked out as plain files behave as they do in validation. `--claude <file>` appends the AGENTS.md import line to the existing Claude Code instruction file that `MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING` names, following the same link rules, and `--claude <file> --print` prints only that line. The helper never creates a Claude Code file. README uses its separate informational writer. Ask for `Fix moldea` to repair permitted integration, or explicitly accept the supported warning with your reason. When AGENTS.md is protected, the coding agent hands off the exact block for a separate instruction update.

## Initialization inspection

Initialization uses the bundled read-only `initialization-inspection.mjs --repository <absolute-root>` helper once for a metadata inventory. It identifies the selected distribution as installed, excludes it from project-owned Skill candidates, and leaves other Skill ownership unverified until project evidence establishes it. Document and decision paths are candidates, not proof of current authority or active status; canonical agent directories do not establish registration or the absence of inline workflows.

Adding repeated `--path <known-relative-file>` arguments selects one source packet instead of repeating inventory traversal. A packet accepts eight paths, reads at most 32 KiB from each bounded regular text file and 64 KiB in total, and reports omissions explicitly. Linked, missing, oversized, non-text and packet-limited sources need existing targeted inspection; they are not checked evidence. The helper rejects escaping and excluded paths, `.env`, `.env.*`, `auth.json`, `credentials.json`, and `.pem`/`.key` selections. Callers select project source, never credentials. Discovery never follows directory links, and the helper writes no repository or Git state.

Inventory stops at 16,384 entries or 64 directory levels and retains at most 128 paths per category. Unreadable directories leave the inventory partial. A partial inventory establishes only what was observed. JSON output is limited to 262,144 bytes. If the helper overflows or fails, use known indexes and targeted reads and report any remaining gaps. Reuse unchanged packets. Source mode reads known paths without walking the tree or writing state. Agents guidance covers discovery, registration, and native connection tests. The parent Initialize operation owns final Validate.

## Repair Git evidence

Fix may use only read-only `git status`, `diff`, `log`, `rev-parse`, and `show` to orient itself. Check and Fix stop before worktree-aware Git reads when evidence shows executable mechanisms such as filters, text conversion, external diff, or fsmonitor. Fix uses `repair-git.mjs` for its checkpoint, comparison on continuation, commit verification, and review of its own writes. The helper pins Git to the supplied worktree, refuses stored attribute-tree configuration, inspects bounded attributes before worktree-aware reads, and uses literal pathspecs. Its reads do not contact a remote or change Git state. The internal index listing is bounded to 4 MiB and 65,536 attribute paths, and each response is bounded to 65,536 bytes. Unavailable evidence leaves the checkpoint unverified.

Attribute inspection conservatively refuses any attribute file containing `filter`, including Git LFS declarations, macros and comments. LFS configuration is disabled as additional protection, not an exception to that refusal. Automatic diff index refresh is disabled even when repository configuration enables it, so timestamp-only worktree changes cannot rewrite Git storage during continuation. These limitations stop Git-dependent repair; they are not evidence of project drift or permission to bypass repository controls. An unborn repository instead returns unavailable commit evidence and uses conservative owner reassessment.

Directory symlinks and Windows junctions are supported during attribute inspection when each resolved target remains within the repository. Absolute targets may use the supplied repository-root spelling or its verified physical root; other aliases are not followed to establish containment. Resolution is iterative and bounded, with operation-local directory observations and deduplicated attribute reads; path bookkeeping is bounded as well as file contents. A missing ordinary directory may establish absence, but a dangling or cyclic link cannot. Attribute files must remain bounded regular files, and an unavailable indexed attribute still causes refusal. Explicit written-file review continues to reject linked parents. No link, index, or ignore-rule changes are needed for a supported overlay. The tree must remain trusted against hostile concurrent replacement.

Failed Git reads, including reads during attribute inspection, return `git-read` with a reason that classifies the failure, such as Git refusing the repository's ownership, without Git's own output, capped at 512 characters. Attribute-safety limitations remain distinct. The helper ignores the system and global Git configuration and attributes on every supported platform, including Windows.

## Repository development

`moldea` is a portable Agent Skill with deterministic conformance, semantic evaluation, evidence tooling, and public documentation. The website renders selected semantic results, recorded scripted journeys, and independently recorded project runs.

### Source ownership

| Area                                   | Responsibility                                                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moldea/`                              | Complete distributed Agent Skill: entrypoint, focused references, host metadata, managed document assets, and bounded generated scripts.                         |
| `src/`                                 | Maintained TypeScript for portable generation, isolated execution, semantic evaluation, recorded journey evidence, release checks, and shared developer tooling. |
| `evidence/selection.json`              | Exact maintainer selections for semantic evidence and optional scripted journeys.                                                                                |
| `website/`                             | Static documentation and evidence presentation, including independently selected mock-project runs, sanitized session replays, and source links.                 |
| `fixtures/`                            | Deterministic source fixtures and calibration records. Recorded evaluation attempts are not committed.                                                           |
| `docs/`                                | Concise public concepts and durable workflows. API and HTTP endpoint documentation does not belong here.                                                         |
| `project-specification`                | Read-only development reference to the canonical product and skill specifications in `../platform/moldea`.                                                       |
| `src/test-suite/`                      | Private essential/full selection and inherited-stdio execution; [testing guide](/docs/testing/) owns membership and cadence.                                     |
| `.github/workflows/conformance.yml`    | Conservative PR selection, root correctness, quality, and portable Linux, Windows and macOS contracts.                                                           |
| `.github/workflows/website-checks.yml` | Pages-only website quality and artifact verification; browser suites run locally.                                                                                |
| `.github/workflows/pages.yml`          | Pages preflight, parallel verification/production build, and gated deployment.                                                                                   |

The distributed artifact is exactly `moldea/`; development-only tooling is not installed with the skill. Portable builds use fixed compiler settings in checkouts and temporary release directories. Run `npm run matcher:generate` after changing the relevance gate's locked inputs and `npm run matcher:check` to verify the committed artifact.

### Product specifications

The sibling `platform` repository owns the canonical `moldea` product and skill specifications. The root `project-specification` symlink targets `../platform/moldea`. Before work that requires those specifications, read the [project foundation](https://github.com/moldea-ai/platform/blob/main/moldea/project.md), then only the relevant focused context. Start with the [Agent Skill specification](https://github.com/moldea-ai/platform/blob/main/moldea/context/agent-skill.md) for skill behavior and follow its references as needed.

Specifications define intended product requirements and design constraints. This repository owns the skill implementation, public documentation, compatibility declarations, and release evidence. The `packages` repository owns the [public Repository Format](https://github.com/moldea-ai/packages/blob/main/specifications/repository-format.md), package implementations, tests, and releases. Specifications alone do not establish shipped behavior or availability. Report conflicts or version drift and establish the affected authority before changing a contract; do not silently regress supported behavior to match an older specification.

This reference is read-only by workflow, not filesystem permissions. Never create, modify, move, or delete files through `project-specification/`. Changes to its authority require separate authorization in the owning platform checkout. A working native symlink and adjacent platform checkout are required to use the reference. If required specifications are missing, inaccessible, or the checkout contains a link-text file instead of a symlink, report the problem and stop the specification-dependent work. Do not copy specifications here or change host settings as a fallback.

The reference is for repository development only. Builds, tests, CI, and installed skill behavior remain independent of the sibling checkout. The link and its target are outside the distributed `moldea/` artifact and must not be bundled or published as skill content.

### Local setup

Repository development requires Node.js `^24.15.0` and npm `>=10.9.0`. The distributed `moldea/` artifact keeps its documented Node.js `>=22.17.0` runtime contract.

Install every workspace dependency from the repository root without lifecycle scripts:

```bash
npm ci --ignore-scripts
```

The root and website manifests pin Website UI. The website manifest also pins its compatible Astro version.

Use the [testing guide](/docs/testing/) for focused and aggregate verification and [release evidence](/docs/release-evidence/#repository-release-preparation) for version and candidate preparation.
