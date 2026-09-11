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
- exact evaluated CLI 8/schema 4 envelopes within the skill's supported `^8.0.0` range
- content-free `inspect` and `validate` behavior
- project-local typechecking
- scenario-specific diagnostics and assertions
- dependency and repository immutability
- resource accounting

The CLI, runtime packages, auxiliary types, and TypeScript compiler are downloaded at exact versions, checked against registry SHA-512 and SHA-1 metadata, and recorded with downloaded SHA-256 digests. Candidate preparation installs those exact registry versions with lifecycle scripts disabled, strict peer validation, an attempt-local metadata cache and content store, an empty attempt-owned user config, and the explicit public npm registry. Case workspaces reuse the exact closure offline. No package is borrowed from the adjacent packages checkout or installed through a local-tarball override.

## Model boundary

Official actors and independent judges use `gpt-5.6-sol` with `xhigh` reasoning effort. Both roles run in separate disposable homes and separate workspaces through the shared isolated host.

The actor receives a natural task and the portable skill. The judge receives declared semantic requirements, deterministic results, workspace assertions, projected execution facts, and the actor response. Neither role receives hidden credentials or unrelated host state.

The host records stage duration and model token usage when Codex reports it. Raw commands and output are discarded after privacy-safe projection.

Every trial records semantic, resource, command-policy, repository-control, mount-integrity, and operational dimensions. Overall pass is their strict conjunction. Only a semantic failure with every other dimension passing can receive confirmations; all non-semantic failures are terminal for that trial. Confirmations run sequentially until two pass or two fail, with at most three confirmations, and no confirmation runs after either quorum.

## Resource budgets

Every scenario declares `ordinary` or `largeTraversal`. Every actor and judge stage records:

- `completedCommandCount`
- `moldeaCommandCount`
- `moldeaOutputByteCount`
- `maximumCommandOutputByteCount`
- `modelVisibleToolOutputByteCount`
- cumulative input-plus-output model tokens

Both profiles permit at most 128 KiB from one completed host command, 64 completed commands, 16 moldea calls, and 1,625,000 model tokens. This is distinct from the portable skill's unchanged 64 KiB limit for one moldea CLI response page. The `ordinary` profile also permits 256 KiB of moldea output and 1 MiB of aggregate model-visible tool output. `largeTraversal` also permits 1 MiB of moldea output and 4 MiB of aggregate model-visible tool output. Every dimension remains an independent final failure. An actor that exceeds only completed-command, moldea-call, or total-token limits may reach the judge while inside absolute containment so a semantic verdict can establish calibration eligibility. The trial still fails the active profile. Missing token usage and maximum-command, aggregate model-visible, or aggregate moldea output overages skip judging, as do deterministic, workspace, runner-owned, and observed command-policy failures. Higher absolute host ceilings remain failure containment, not recommended operating volumes.

Semantic and qualification stages receive the same evaluator-owned closed-host developer instruction before the natural task. It prohibits package-manager, provider, model, subagent, environment, authentication, evaluator-home, and outside-workspace access, and permits only an evaluator-provided fixed local probe when the owning workflow explicitly grants one. Qualification grants none, so every network client remains prohibited. The host rejects caller overrides, and the qualification model-host digest changes whenever the instruction changes. Scenario prompts retain only qualification-specific task, evidence, workspace, Git, ambiguity, and result-schema guidance.

Qualification mounts `.git`, `.agents/skills/moldea`, and `node_modules` read-only for both roles. The Git command boundary skips those exact immutable subtrees while scanning and budgeting every writable path, including siblings beneath `.agents`. Large evaluator-owned dependency trees therefore cannot cause false failures, repeated disk traversal, or a hiding place for actor-authored repository content.

Protocol 10 classifies actual operations instead of matching security vocabulary in repository searches. Evidence retains only bounded sorted reason codes and counts for network, sensitive, credential, or indeterminate operations. It never retains raw commands, paths, patterns, outputs, or credentials. Indeterminate evidence is not a safety attestation; official runs accept it only alongside independently established read-only filesystem and restricted-egress sandbox boundaries.

The portable skill still directs ordinary work to 65,536-byte CLI pages and 262,144 bytes of aggregate `moldea` output. It also requires exact or bounded host discovery that excludes dependency, VCS, generated, cache, and package-store trees. Large repositories remain supported through paginated metadata and explicit content chunks. A budget failure states which observed value exceeded which limit; it never silently truncates evidence into an apparently valid result.

`fixtures/model-stage-resource-calibration.json` preserves self-contained safety-calibration inputs without transcripts or an active result-directory dependency. It is not current qualification assurance. Its strict source-controlled shape contains trial and evidence identity, pass states, aggregate counts, and input, cached-input, output, and total token categories. It separately records the 76,312-byte deterministic/workspace-valid command-output observation accepted for calibration and the 449,948-byte dump that remains rejected. `npm run resource:check` verifies their digests, internal arithmetic, output safety, containment, and minimum profile headroom.

## Current-only evidence

Qualification protocol 10 is the sole accepted contract. A passing attempt must match the current skill bytes, CLI closure, evaluator, role-specific actor and judge hosts, resource profile, probes, cases, target, execution environment, and package closure.

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
npm run qualification -- run --adapter custom --implementation custom --workers 4
```

Run all adapter profiles, an explicit logical target set, or only unresolved profiles from a completed batch:

```bash
npm run qualification -- run-batch --all --workers 4
npm run qualification -- run-batch --targets anthropic/typescript-messages-api-0-117,openai/typescript-responses-api-7 --workers 4
npm run qualification -- run-batch --unresolved-from <batch-id> --workers 4
```

Run or diagnose one adapter:

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

`run`, `run-batch`, and `diagnose-batch` accept `--workers 1`, `--workers 2`, or `--workers 4` and default to four. Re-running the exact command resumes its current batch even when the worker count changes. Use `--restart` to discard only that exact matching batch state. If one model stage exhausts its automatic retry, use `--resume-stopped-stage` to authorize its single additional attempt.

For a correction sweep, use `diagnose-batch` to collect the complete selected failure set before editing behavior. After one consolidated correction, diagnose only the unresolved cases, then create one official evidence-producing run. After Custom passes, `run-batch` continues across adapter semantic failures while the host remains operationally safe and collects one ordered profile ledger before correction. Each adapter retains an isolated attempt, result root, checkpoint, and 32,000,000-token candidate stop-loss.

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

Run-like commands return a compact summary with terminal case states, counts, and the checkpoint directory; complete provenance, trials, prompts, and artifacts remain in bounded attempt storage for explicit inspection. Every pnpm install uses an attempt-local content store, metadata cache, and empty user config plus the explicit public npm registry. Candidate preparation may populate the package state with bounded `--prefer-offline` exact-version resolution, while case workspaces reuse it with strict `--offline` resolution. Pnpm never consults the user's global cache or home configuration and never inherits its registry credentials. Terminal attempts remove disposable workspaces, installed runtime trees, snapshots, package stores, and metadata caches. Interrupted attempts preserve internal snapshots only while they remain eligible for explicit resume. Paid `run`, `run-batch`, `diagnose`, `diagnose-batch`, `resume`, and `retry` operations require `--confirm-paid-execution` in non-interactive mode. The flag is checked immediately before the first direct model call. One concurrent batch presents one aggregate approval boundary rather than one prompt per worker. Exact evidence reuse and model-free dry runs require no paid confirmation.

Actor and judge prompts provide the exact bounded Git status and path-scoped diff forms accepted by the isolated host. Evaluation agents must use those forms instead of probing evaluator-owned wrappers or home paths.

Immediately before paid execution, the CLI reports the candidate count, direct and reused cases, planned calls, maximum calls including one bounded operational retry per stage, the 2,097,152-token stage ceiling, prior candidate consumption, and the total candidate-token ceiling. One profile has a 32,000,000-token stop-loss; an adapter batch reports the sum of those independent per-profile ceilings without turning it into a shared allowance. The per-stage ceiling contains a complete tool-using Codex stage and is not a consumption target. It retains more than 25 percent headroom above the observed 1,264,666-token qualification stage that invalidated the earlier ceiling. Token totals count input plus output while reporting provider-cached input separately without adding it twice. Each candidate boundary accepts an exact fit and refuses the next stage before one full reservation would exceed it.

## Model-free dry run

```bash
npm run qualification:dry-run
npm run qualification:dry-run:all
```

The first command validates Custom. The second validates Custom and the complete 13-adapter schedule with four isolated workers. Dry runs construct exact candidates, prepare every selected project, apply transparent expected state, and execute runner-owned validation. They do not call an actor or judge, publish evidence, or satisfy a release gate.

## Checkpoints and exact evidence reuse

Every stage writes an atomic checkpoint. Resume continues the exact compatible stage. After resume identity is revalidated, the runner removes the superseded interruption marker; a later interruption writes the current marker again. Retry creates a new linked attempt and never rewrites prior evidence. A stage that exhausts its single automatic operational retry is persisted as stopped. Ordinary resume refuses to repeat it; `--resume-stopped-stage` authorizes exactly one additional attempt without resetting token charges. A second exhaustion is terminal.

Every checkpoint write also replaces an 8,192-byte-bounded local status sidecar. Status and the guided resume menu read only these sidecars plus checkpoint file metadata, never checkpoint bodies. A missing, stale, malformed, unreadable, or oversized sidecar is reported as unavailable metadata and is not interpreted through a legacy checkpoint reader.

The runner has no free-floating model-output cache. Model stages always execute directly unless the official runner materializes a complete eligible case group from verified current committed evidence or from one source declared in `reuse-sources.json`. Manifest sources are read from their exact committed Git objects and must match their recorded attempt and storage digests. Every source case is reused only when its evaluator-stage and case-input digests still match current source. The packages repository may advance only when the exact compatibility fingerprint and candidate package closure remain unchanged; its commit is audit provenance rather than model-stage identity. The reused case retains its source attempt, source commit, source attempt digest, stage identities, trial results, and artifacts. Independent result verification reloads that direct source and rejects identity drift, chained reuse, missing files, changed bytes, or unconfigured manifest sources.

`diagnose-batch` gives each selected case one private attempt and runs up to four initials concurrently without confirmations or evidence reuse. The coordinator alone replaces its content-free checkpoint and completed ledger under `.runtime-qualification/diagnostic-batch/`. Each aggregate file and each private attempt checkpoint is limited to 1 MiB, with a 6 MiB four-worker metadata ceiling. The ledger retains only case status, requirement IDs, deterministic explanation, duration, model and token totals, operational-failure count, and attempt identity. It never retains prompts, model rationale, commands, output bodies, repository content, or workspace paths. Final JSON output is limited to 16 KiB. Successful completion deletes the aggregate checkpoint and terminal diagnostic attempts after projection; official results and pointers are never changed.

`run-batch` gives every selected adapter one fixed private attempt and result root, runs up to four profiles concurrently only after an exact passing Custom baseline is established, and commits terminal summaries in profile-index order. Its aggregate checkpoint, active ledger, and retained completed ledger are each limited to 1 MiB, summaries to 4 KiB, and final JSON to 16 KiB. A semantic failure does not stop safe sibling work. An operational or capacity failure stops new dispatch, drains active siblings, preserves completed attempts for exact resume, and returns the underlying bounded operational summary instead of replacing it with a generic worker error. `--unresolved-from <batch-id>` selects only profiles that did not pass in that completed ledger.

Before dispatch, both batch coordinators reserve 2 GiB of temporary storage per worker, no more than 8 GiB for four workers, while preserving a 2 GiB free-space floor. The per-worker ceiling includes independent candidate snapshots, attempt-local pnpm metadata and package content, and installed dependency workspaces; a measured healthy Claude Agent SDK dry-run worker used about 1.25 GiB. The guard measures complete worker roots before and after each model stage and uses constant-cost free-space checks while a stage is active, avoiding repeated recursive scans of large dependency trees. Crossing the per-worker or aggregate boundary stops new work and retains resumable state instead of allowing uncontrolled disk growth.

Each model stage has a finite fifteen-minute timeout so role-specific reasoning can complete without treating an ordinary long response as an operational failure. Operational provider, proxy, and timeout failures may retry within the configured retry policy. Deterministic failures, changed identities, cancellation, and exhausted retries stop the attempt clearly.

The packages repository contributes only the immutable `HEAD:compatibility/runtimes.yaml` artifact. Qualification records its commit and content fingerprint, so live worktree changes cannot alter or interrupt an active run. Qualification-engine source and the portable skill remain independently fingerprinted and must be clean before publication.

## Current result storage

`results/<target-key>/attempts/a-<digest>/` contains the current attempt and numbered artifacts. `storage.json` binds logical artifact paths to physical files and verifies every SHA-256 digest. `latest.json` points to the latest attempt and current passing attempt when one exists.

Current protocol-10 attempts are revalidated against the profile, probes, scenarios, and resource calibration stored at their recorded qualification source commit. Earlier attempts remain available only through Git history; active source and local runtime storage contain no compatibility corpus or reader.

Fresh qualification release verification reads only this current storage. Every indexed target must have one compatible passing attempt. An explicit qualification-scoped release evidence pin instead validates an immutable source tag or full commit and its compact artifact manifests without copying source attempts into the new release or changing the semantic evidence selection.

## Verification

Run:

```bash
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:verify
```

The generic test script runs both unit and integration categories. Qualification results become fresh release evidence only after every current identity, resource budget, artifact digest, and target requirement passes. Pinned qualification evidence remains visibly attributed to the original passing source and does not claim a new qualification run.
