# Adapter qualification

Adapter qualification is a local, manually operated release gate for one exact adapter implementation. It exercises the current portable `moldea` skill, exact published package closure, deterministic repository readers, and isolated actor and judge processes. It never invokes a provider API or runs an agent.

## Evidence ownership

The Custom profile owns all 12 universal qualification journeys:

- evaluate an aligned project
- initialize a grounded project
- create a grounded agent
- maintain a dirty project
- reconcile drift and boundaries
- retire an agent coherently
- stop on material ambiguity
- resist untrusted repository instructions
- answer an informational question before adoption
- abstain from unrelated repository work before adoption
- abstain from unrelated repository work after adoption
- activate for a declared relationship

Every non-Custom profile owns only adapter-specific probes and cases. The profile loader rejects universal case ownership outside Custom and rejects a Custom profile that omits a universal case.

The index at `profiles/index.yaml` declares 14 current targets: Custom and 13 published adapter implementations.

This produces 38 unique executions: 12 universal Custom projects and 26 direct adapter projects. Public evidence for an adapter composes its exact bound Custom attempt with its 2 direct projects, showing 12 shared plus 2 direct journeys without claiming that the universal projects ran again. The effective adapter status passes only when the direct attempt and its bound Custom attempt are both current and passing.

## Deterministic boundary

Deterministic verification runs before and after the actor. It verifies:

- exact registry package integrity and dependency closure
- repository filesystem and in-memory reader equivalence
- Core behavior and project validity
- exact evaluated CLI 7/schema 4 envelopes within the skill's supported `^7.0.0` range
- content-free `inspect` and `validate` behavior
- project-local typechecking
- scenario-specific diagnostics and assertions
- dependency and repository immutability
- resource accounting

The CLI, runtime packages, auxiliary types, and TypeScript compiler are downloaded at exact versions, checked against registry SHA-512 and SHA-1 metadata, and recorded with downloaded SHA-256 digests. Candidate installation disables lifecycle scripts and uses an attempt-local store. No package is borrowed from the adjacent packages checkout at execution time.

## Model boundary

Official semantic stages use `gpt-5.6-sol` with `high` reasoning effort. Actors and judges run in separate disposable homes and separate workspaces through the shared isolated host.

The actor receives a natural task and the portable skill. The judge receives declared semantic requirements, deterministic results, workspace assertions, projected execution facts, and the actor response. Neither role receives hidden credentials or unrelated host state.

The host records stage duration and model token usage when Codex reports it. Raw commands and output are discarded after privacy-safe projection.

## Resource budgets

Every scenario declares `ordinary` or `largeTraversal`. Every actor and judge stage records:

- `completedCommandCount`
- `moldeaCommandCount`
- `moldeaOutputByteCount`
- `maximumCommandOutputByteCount`
- `modelVisibleToolOutputByteCount`
- cumulative input-plus-output model tokens

Both profiles permit at most 128 KiB from one completed host command, 64 completed commands, 16 moldea calls, and 1,625,000 model tokens. This is distinct from the portable skill's unchanged 64 KiB limit for one moldea CLI response page. The `ordinary` profile also permits 256 KiB of moldea output and 1 MiB of aggregate model-visible tool output. `largeTraversal` also permits 1 MiB of moldea output and 4 MiB of aggregate model-visible tool output. Every dimension remains an independent final failure. An actor that exceeds only completed-command, moldea-call, or total-token limits may reach the judge while inside absolute containment so a semantic verdict can establish calibration eligibility. The trial still fails the active profile. Missing token usage and maximum-command, aggregate model-visible, or aggregate moldea output overages skip judging, as do deterministic, workspace, runner-owned, and observed command-policy failures. Higher absolute host ceilings remain failure containment, not recommended operating volumes.

Protocol 8 classifies actual operations instead of matching security vocabulary in repository searches. Evidence retains only bounded sorted reason codes and counts for network, sensitive, credential, or indeterminate operations. It never retains raw commands, paths, patterns, outputs, or credentials. Indeterminate evidence is not a safety attestation; official runs accept it only alongside independently established read-only filesystem and restricted-egress sandbox boundaries.

The portable skill still directs ordinary work to 65,536-byte CLI pages and 262,144 bytes of aggregate `moldea` output. It also requires exact or bounded host discovery that excludes dependency, VCS, generated, cache, and package-store trees. Large repositories remain supported through paginated metadata and explicit content chunks. A budget failure states which observed value exceeded which limit; it never silently truncates evidence into an apparently valid result.

`fixtures/model-stage-resource-calibration.json` preserves self-contained safety-calibration inputs without transcripts or an active result-directory dependency. It is not current qualification assurance. Its strict source-controlled shape contains trial and evidence identity, pass states, aggregate counts, and input, cached-input, output, and total token categories. It separately records the 76,312-byte deterministic/workspace-valid command-output observation accepted for calibration and the 449,948-byte dump that remains rejected. `npm run resource:check` verifies their digests, internal arithmetic, output safety, containment, and minimum profile headroom.

## Current-only evidence

Qualification protocol 8 is the sole accepted contract. A passing attempt must match the current skill bytes, CLI closure, evaluator, host, resource profile, probes, cases, target, execution environment, and package closure. Protocol-7 artifacts have no active reader, converter, release selection path, or website surface.

An official run may reuse a passed or recovered case group from a committed failed attempt only while every behavior-bearing identity, source commit, artifact digest, Custom baseline, and package closure remains exact. Failed and incomplete case groups, diagnostic attempts, uncommitted evidence, chained reuse, and tampered artifacts are never eligible.

Adapter qualification requires a current passing Custom baseline. Custom itself requires no baseline. Every target must produce one current passing attempt for this release. That attempt identifies direct and exactly reused case groups separately instead of claiming that reused model work ran again.

## Input layout

- `cases/cases.yaml` catalogs the 12 universal case identities.
- `profiles/index.yaml` maps logical targets to short `t<number>` directories.
- `profiles/t<number>/profile.yaml` selects only the cases owned by that target.
- `profiles/t<number>/probes/*.yaml` maps compatibility claims to the shared Custom cases and the target's adapter-specific cases.
- `profiles/t<number>/cases/c<number>/` contains a transparent task, scenario, seed project, and expected state when applicable.

Scenario paths use repository-relative portable names. Test files remain colocated with the implementation they exercise.

## Local setup

Keep the `skill` and `packages` repositories adjacent. Install dependencies without lifecycle scripts:

```bash
npm ci --ignore-scripts
npm --prefix qualification ci --ignore-scripts
```

The default skill candidate is `moldea/`.

## Commands

Start the guided workflow:

```bash
npm run qualification
```

Inspect targets and current state:

```bash
npm run qualification -- list
npm run qualification -- status
npm run qualification -- status --all
npm run qualification -- status --all --cursor <opaque-cursor>
```

Run Custom first:

```bash
npm run qualification -- run --adapter custom --implementation custom
```

Run or diagnose an adapter:

```bash
npm run qualification -- run --adapter anthropic --implementation typescript-messages-api-0-117
npm run qualification -- diagnose --adapter anthropic --implementation typescript-messages-api-0-117 --case repair-anthropic-tool-registration
```

Collect a complete non-publishing diagnostic ledger with exactly one selector:

```bash
npm run qualification -- diagnose-batch --adapter custom --implementation custom --all
npm run qualification -- diagnose-batch --adapter custom --implementation custom --cases <comma-separated-case-ids>
npm run qualification -- diagnose-batch --adapter anthropic --implementation typescript-messages-api-0-117 --claims <comma-separated-claim-ids>
npm run qualification -- diagnose-batch --adapter custom --implementation custom --unresolved-from <attempt-id>
```

Re-running the exact command resumes its current batch. Use `--restart` to discard only that exact matching diagnostic state. If one model stage exhausts its automatic retry, use `--resume-stopped-stage` to authorize its single additional attempt.

For a correction sweep, use `diagnose-batch` to collect the complete selected failure set before editing behavior. After one consolidated correction, diagnose only the unresolved cases, then create one official evidence-producing run. Across adapter profiles, continue sequentially after semantic failures while the host remains operationally safe. Keep one model-bearing process active at a time unless measured host, provider, memory, disk, quota, and token capacity supports a source-controlled concurrency limit.

Resume or retry:

```bash
npm run qualification -- resume --attempt <attempt-id>
npm run qualification -- retry --attempt <attempt-id>
npm run qualification -- record --attempt <attempt-id>
```

Verify committed evidence:

```bash
npm run qualification -- verify
```

Use `--json` for machine-readable output. `status` returns only content-free attempt and latest-result metadata. Its default scope contains unrecorded incomplete attempts, unavailable checkpoint summaries, and committed latest pointers; `--all` selects complete local history. Each page contains at most 64 records and 65,536 UTF-8 bytes. Continue with the returned opaque cursor and the same scope options. A cursor is bound to the exact summary snapshot and is rejected after the selected status state changes. Complete checkpoints, candidates, package manifests, stages, prompts, workspace paths, commands, model output, and repository content are never included.

Run-like commands return a compact summary with terminal case states, counts, and the checkpoint directory; complete provenance, trials, prompts, and artifacts remain in bounded attempt storage for explicit inspection. Terminal attempts remove disposable workspaces, installed runtime trees, snapshots, and attempt-local package stores. Interrupted attempts preserve internal snapshots only while they remain eligible for explicit resume. Paid `run`, `diagnose`, `diagnose-batch`, `resume`, and `retry` operations require `--confirm-paid-execution` in non-interactive mode. The flag is checked immediately before the first direct model call. Exact evidence reuse and the model-free dry run require no paid confirmation.

Actor and judge prompts provide the exact bounded Git status and path-scoped diff forms accepted by the isolated host. Evaluation agents must use those forms instead of probing evaluator-owned wrappers or home paths.

Immediately before paid execution, the CLI reports direct and reused cases, planned calls, the maximum calls including one bounded operational retry per stage, the 2,097,152-token stage ceiling, prior candidate consumption, and the 32,000,000-token candidate stop-loss. The per-stage ceiling contains a complete tool-using Codex stage and is not a consumption target. It retains more than 25 percent headroom above the observed 1,264,666-token qualification stage that invalidated the earlier ceiling. Token totals count input plus output while reporting provider-cached input separately without adding it twice. The candidate boundary accepts an exact fit and refuses the next stage before one full reservation would exceed it.

## Model-free dry run

```bash
npm run qualification:dry-run
```

The dry run constructs the exact candidate, prepares every Custom project, applies transparent expected state, and executes runner-owned validation. It does not call an actor or judge, publish evidence, or satisfy a release gate.

## Checkpoints and exact evidence reuse

Every stage writes an atomic checkpoint. Resume continues the exact compatible stage. After resume identity is revalidated, the runner removes the superseded interruption marker; a later interruption writes the current marker again. Retry creates a new linked attempt and never rewrites prior evidence. A stage that exhausts its single automatic operational retry is persisted as stopped. Ordinary resume refuses to repeat it; `--resume-stopped-stage` authorizes exactly one additional attempt without resetting token charges. A second exhaustion is terminal.

Every checkpoint write also replaces an 8,192-byte-bounded local status sidecar. Status and the guided resume menu read only these sidecars plus checkpoint file metadata, never checkpoint bodies. A missing, stale, malformed, unreadable, or oversized sidecar is reported as unavailable metadata and is not interpreted through a legacy checkpoint reader.

The runner has no free-floating model-output cache. Model stages always execute directly unless the official runner materializes a complete eligible case group from one verified committed failed attempt. The reused case retains its source attempt, source commit, source attempt digest, stage identities, trial results, and artifacts. Independent result verification reloads that direct source and rejects identity drift, chained reuse, missing files, or changed bytes.

`diagnose-batch` runs one selected case at a time without confirmations or evidence reuse. It keeps one private checkpoint and one separate content-free completed ledger under `.runtime-qualification/diagnostic-batch/`; each file is limited to 1 MiB and replaced atomically. The ledger retains only case status, requirement IDs, deterministic explanation, duration, model and token totals, operational-failure count, and attempt identity. It never retains prompts, model rationale, commands, output bodies, repository content, or workspace paths. Final JSON output is limited to 16 KiB. Successful completion deletes the private checkpoint, terminal diagnostic attempts are deleted after projection, and official results and pointers are never changed.

Each model stage has a finite ten-minute timeout so `high` reasoning can complete without treating an ordinary long response as an operational failure. Operational provider, proxy, and timeout failures may retry within the configured retry policy. Deterministic failures, changed identities, cancellation, and exhausted retries stop the attempt clearly.

The packages repository contributes only the immutable `HEAD:compatibility/runtimes.yaml` artifact. Qualification records its commit and content fingerprint, so live worktree changes cannot alter or interrupt an active run. Qualification-engine source and the portable skill remain independently fingerprinted and must be clean before publication.

## Current result storage

`results/<target-key>/attempts/a-<digest>/` contains the current attempt and numbered artifacts. `storage.json` binds logical artifact paths to physical files and verifies every SHA-256 digest. `latest.json` points to the latest attempt and current passing attempt when one exists.

Current protocol-8 attempts are revalidated against the profile, probes, scenarios, and resource calibration stored at their recorded qualification source commit. Earlier attempts remain available only through Git history; active source and local runtime storage contain no compatibility corpus or reader.

Fresh release verification reads only this current storage. Every indexed target must have one compatible passing attempt. An explicit release evidence pin instead validates the original immutable source tag and its compact artifact manifests without copying source attempts into the new release.

## Verification

Run:

```bash
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:verify
```

The generic test script runs both unit and integration categories. Qualification results become fresh release evidence only after every current identity, resource budget, artifact digest, and target requirement passes. A pinned release remains visibly attributed to the original passing source and does not claim a new qualification run.
