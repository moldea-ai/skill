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

## Deterministic boundary

Deterministic verification runs before and after the actor. It verifies:

- exact registry package integrity and dependency closure
- repository filesystem and in-memory reader equivalence
- Core behavior and project validity
- CLI 7.0.0 schema 4 envelopes
- content-free `inspect` and `validate` behavior
- project-local typechecking
- scenario-specific diagnostics and assertions
- dependency and repository immutability
- resource accounting

The CLI, runtime packages, auxiliary types, and TypeScript compiler are downloaded at exact versions, checked against registry SHA-512 and SHA-1 metadata, and recorded with downloaded SHA-256 digests. Candidate installation disables lifecycle scripts and uses an attempt-local store. No package is borrowed from the adjacent packages checkout at execution time.

## Model boundary

Official semantic stages use `gpt-5.6-sol` with `medium` reasoning effort. Actors and judges run in separate disposable homes and separate workspaces through the shared isolated host.

The actor receives a natural task and the portable skill. The judge receives declared semantic requirements, deterministic results, workspace assertions, projected execution facts, and the actor response. Neither role receives hidden credentials or unrelated host state.

The host records stage duration and model token usage when Codex reports it. Raw commands and output are discarded after privacy-safe projection.

## Resource budgets

Every actor and judge stage records:

- `completedCommandCount`
- `moldeaCommandCount`
- `moldeaOutputByteCount`
- `modelVisibleToolOutputByteCount`

A stage permits at most 32 `moldea` invocations, 8 MiB of `moldea` command output, and 16 MiB of total model-visible tool output. These are failure-containment ceilings, not recommended operating volumes.

The portable skill still directs ordinary work to 65,536-byte CLI pages and 262,144 bytes of aggregate `moldea` output. Large repositories remain supported through paginated metadata and explicit content chunks. A budget failure states which observed total exceeded which limit; it never silently truncates evidence into an apparently valid result.

## Current-only evidence

Qualification protocol 7 is the sole accepted contract. A passing attempt must match the current skill bytes, CLI closure, evaluator, host, profile, probes, cases, target, execution environment, and package closure.

Results are reusable only while all behavior-bearing identities remain exact.

Adapter qualification requires a current passing Custom baseline. Custom itself requires no baseline. Every target must produce fresh evidence for this release.

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

Use `--json` for machine-readable output. Run-like commands return a compact summary with terminal case states, counts, and the checkpoint directory; complete provenance, trials, prompts, and artifacts remain in attempt storage for explicit inspection. Paid `run`, `diagnose`, `resume`, and `retry` operations require `--confirm-paid-execution` in non-interactive mode. The flag is checked immediately before the first uncached model call. Cache hits and the model-free dry run require no paid confirmation.

## Model-free dry run

```bash
npm run qualification:dry-run
```

The dry run constructs the exact candidate, prepares every Custom project, applies transparent expected state, and executes runner-owned validation. It does not call an actor or judge, publish evidence, or satisfy a release gate.

## Checkpoints and cache integrity

Every stage writes an atomic checkpoint. Resume continues the exact compatible stage. Retry creates a new linked attempt and never rewrites prior evidence.

Cache keys bind the role, protocol, environment, candidate, runner, skill, target, case, trial, project fingerprint, prompt, and output schema. Cached actor evidence includes its exact post-actor workspace. Confirmation trials never use cross-attempt cache entries.

Operational provider, proxy, and timeout failures may retry within the configured retry policy. Deterministic failures, changed identities, cancellation, and exhausted retries stop the attempt clearly.

## Current result storage

`results/<target-key>/attempts/a-<digest>/` contains the current attempt and numbered artifacts. `storage.json` binds logical artifact paths to physical files and verifies every SHA-256 digest. `latest.json` points to the latest attempt and current passing attempt when one exists.

Release verification reads only this current storage. Every indexed target must have one compatible passing attempt. Website generation consumes the same validated current results and has no Git-history reader.

## Verification

Run:

```bash
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:verify
```

The generic test script runs both unit and integration categories. Qualification results are release evidence only after every current identity, resource budget, artifact digest, and target requirement passes.
