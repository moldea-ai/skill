# Adapter qualification

Adapter qualification is a local, manually operated support gate for one exact adapter implementation. It is intentionally separate from the skill repository's automated test suites and CI workflows. The operator runs it from the skill repository, inspects the evidence, and commits the public result artifacts.

The workflow answers a narrower question than semantic evaluation alone: can the candidate Moldea skill use an exact local package composition to understand and safely maintain realistic projects? Every case exercises Repository FS, Repository memory, Core, the installed CLI, candidate package tarballs, and the selected adapter composition. The actor never invokes an agent runtime, provider SDK, or provider API.

## Evidence layers

Each profile combines three complementary layers:

1. Matrix probes map every current behavior-affecting compatibility claim for the selected implementation to one or more concrete cases. Missing claims, unknown claims, and uncovered cases fail before candidate construction. Target maturity and verification dates are recorded as context, not treated as behavior the candidate must reproduce.
2. Deterministic verification runs before and after the actor. It gives Repository FS the exact current Git-derived project inventory, compares that reader with an independently reconstructed Repository memory reader, exercises Core, runs the installed CLI `compatibility`, `validate`, and `inspect` commands, typechecks the fixture, and verifies that read-only inspection did not mutate the project. Runner-owned Agent Skill files, qualification inputs, and project dependencies remain outside the repository evidence inventory. The candidate dependency tree has its own integrity fingerprint and must remain exact before any post-actor command runs.
3. Semantic journeys give the fixed Terra actor a real project task and give a separate read-only Terra judge the task, final workspace, Git diff, deterministic evidence, and explicit requirements.

A passing qualification requires every layer and every case to pass. A failed semantic judgment cannot be overridden by deterministic success, and a passing model judgment cannot override a deterministic or workspace assertion failure.

## Transparent inputs

The committed inputs are deliberately inspectable:

- [`cases/cases.yaml`](cases/cases.yaml) explains the shared semantic journeys and the challenge each one creates.
- `profiles/<adapter>/<implementation>/profile.yaml` selects the projects for one exact matrix target.
- `profiles/<adapter>/<implementation>/probes/*.yaml` maps current compatibility claims to those cases.
- Each project contains `scenario.yaml`, `task.md`, a committed `seed/`, optional pre-existing dirty state in `overlay/`, and the expected fake-host state in `expected/`.
- [`profiles/custom/custom/`](profiles/custom/custom/) is the complete baseline profile for the built-in Custom adapter.
- Each isolated workspace installs the portable skill at `.agents/skills/moldea`, which is the real Agent Skill discovery location, and installs the packed candidate CLI as an exact project-local development dependency. Other project-owned `.agents` content remains part of preservation assertions, checkpoints, and cache identity.

Profiles are strict, versioned YAML contracts. Every profile must include every shared catalog case. A matrix change that creates a new claim invalidates an incomplete profile instead of silently reducing coverage.

Official paid attempts require the adjacent packages repository, the qualification suite, and the selected portable-skill directory to be clean. The `source-state` stage records that decision before candidate construction. Dirty official inputs produce a committed failed attempt without making a model call, so passing evidence always points to inspectable committed source. The runner checks the same fingerprints again after the cases finish and refuses to publish a pass if an input changed during the run. Model-free dry runs intentionally permit dirty inputs for local development and never publish their results.

## Local commands

Keep the `skill` and `packages` repositories adjacent, install the packages repository with pnpm, and install this runner's isolated dependencies with `npm --prefix qualification ci --ignore-scripts`. The default candidate is the portable skill under `moldea/`, not the surrounding repository or qualification harness. Then use the guided workflow:

```bash
npm run qualification
```

The guided CLI prioritizes resumable attempts, disables adapter implementations without a committed profile, and asks for a default-deny confirmation only after free preflight, candidate preparation, and cache lookup have finished. The prompt appears immediately before the first uncached Terra call and derives its maximum call count from the selected profile. The three-case Custom profile therefore reports exactly six possible calls.

The same operations are available explicitly:

```bash
npm run qualification -- list
npm run qualification -- status
npm run qualification -- status --all
npm run qualification -- run --adapter custom --implementation custom
npm run qualification -- run --adapter custom --implementation custom --packages-repository /absolute/path/to/packages
npm run qualification -- resume --attempt <attempt-id>
npm run qualification -- retry --attempt <attempt-id>
npm run qualification -- record --attempt <attempt-id>
npm run qualification -- verify
```

Use `--json` for machine-readable output. Paid `run`, `resume`, and `retry` operations require `--confirm-paid-execution` when the process is non-interactive or uses `--json`; that flag is checked at the same just-in-time model boundary. A compatible cache hit makes no paid call and does not require an approval prompt. `retry` creates a new attempt linked to a terminal parent; it never rewrites prior evidence. `record` explicitly publishes an incomplete interrupted attempt and makes that attempt identity immutable. Continue from it with `retry`, not `resume`. Pass `--no-cache` to a new paid run when fresh actor and judge evidence is required.

The model-free validation command is:

```bash
npm run qualification:dry-run
```

It builds and installs the same candidate closure, prepares every project, applies the transparent `expected/` state, executes all deterministic checks and assertions, and uses a deterministic fake actor and judge. It makes no model call, does not use the model cache, and never writes public results.

Qualification-only verification remains separate from ordinary repository tests:

```bash
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:verify
```

## Candidate construction

Candidate construction discovers current immediate package projects from `projects/` and `packages/`. It starts from `@moldea.ai/cli` and the selected adapter implementation package, traverses local runtime dependencies, extends the build order with local development dependencies required to compile those packages, builds them dependency-first, and packs every runtime package.

The attempt creates a nested pnpm workspace that overrides every local package identity to its exact tarball, then installs the closure with offline resolution, lifecycle scripts disabled, and strict peer dependency checks. Every project records the exact CLI version in `devDependencies` and receives that packed runtime under its own `node_modules`, so actor commands and deterministic checks use the project-local candidate. The runner fingerprints that dependency tree after preparation, rejects actor mutations before caching evidence or running post-actor checks, and verifies it again with the workspace assertions. Public evidence records every tarball's package name, version, source project, filename, and SHA-256 digest. There is no hardcoded package list and no fallback to workspace linking or published package versions.

## Terra execution contract

Paid semantic stages always use `gpt-5.6-terra` with `medium` reasoning effort. There is no frontier-model or alternate-model fallback. Actor and judge calls use the shared development host under `tooling/codex-evaluation-host/`. Codex delegates isolation to an outer Bubblewrap boundary that provides an empty filesystem root, a fresh process and network namespace, dropped capabilities, bounded execution, and a restricted HTTPS relay. User configuration, exec-policy rules, web search, and persistent sessions remain disabled. Official evidence rejects a custom model origin, custom TLS certificate file, or expanded egress allowlist before candidate construction or any paid call.

The actor receives a writable isolated project and the project-local candidate `moldea` executable first on `PATH`. The judge receives a byte-identical copy in a different workspace and Bubblewrap mounts that copy read-only. Actor and judge are separate Codex processes with separate disposable homes. Only the authentication state required by Codex is copied into those homes; unrelated host environment and filesystem state are unavailable. Their prompts prohibit network calls beyond the Codex model transport, subagents, provider calls, agent execution, and runtime SDK calls. The actor receives only the natural project task rather than adapter identity or judge criteria.

## Checkpoints, resume, and cache integrity

Local mutable state lives under `.runtime-qualification/`, which is ignored by Git:

```text
.runtime-qualification/
  attempts/<attempt-id>/
    checkpoint.json
    internal/
      cases/<case-id>/
        actor-workspace/
        judge-workspace/
    public/
    runtime/
    workspaces/
  cache/<cache-key>/
  candidates/<candidate-fingerprint>/
```

The workflow writes a validated checkpoint atomically before and after every meaningful stage. An interruption turns the active stage back into `pending`; completed stages retain their evidence and can be restored. Resume is allowed only when the exact packages checkout, qualification engine, profile, portable skill, fixed model, reasoning effort, Codex version, resolved model endpoint identity, TLS certificate identity, egress allowlist, host timeout, Node.js version, pnpm version, Git version, and reconstructed candidate closure still match the attempt. These inputs are checked again before accepting a cache hit, before and after every fresh model call, and before publication. The actor's exact post-stage workspace snapshot is restored before deterministic checks continue. Changed inputs require `retry`, which creates a new attempt identity instead of mixing evidence.

The selected target maturity is recorded as provenance but does not become a behavioral qualification claim. Existing committed passing evidence therefore remains valid after a maturity promotion. The portable-skill fingerprint covers only the selected skill directory. The qualification-engine fingerprint covers `qualification/`, `tooling/codex-evaluation-host/`, and `tooling/package-candidate/`, including their tests, lockfile, and documentation while excluding installed dependencies and append-only public results.

Candidate caches are independently content-addressed by the behavior-sensitive package input digest and resolved runtime closure. This lets a new attempt reuse identical tarballs after a maturity-only matrix change without weakening the exact resume boundary. Candidate manifests and tarball checksums are validated before reuse; invalid or partial entries are discarded and rebuilt.

Actor cache keys include the protocol, role, complete execution-host identity, candidate fingerprint, profile digest, skill digest, case, project state, and complete prompt. Actor entries include the exact post-actor workspace snapshot. The candidate runtime, installed skill, and runner-owned task are revalidated before fresh or restored actor evidence can continue. Judge keys additionally reflect the post-actor project and complete judge prompt. Output, event, and actor-workspace digests are validated before reuse. Entries are assembled in a staging directory and metadata is committed last, so incomplete or corrupt writes are not considered hits and cannot partially restore a live workspace. Reused evidence preserves its original creation time and source attempt in local and public provenance.

Cached and restored judge outputs are revalidated against the exact declared requirement ids. A pass cannot omit, duplicate, fail, or invent requirements, and a failed verdict must include an actionable failure. Caching never bypasses deterministic verification, workspace assertions, result generation, or artifact digest verification. Dry runs never read or write model cache entries.

## Public results

Paid terminal attempts are recorded whether they pass, fail, or stop with an execution error. Interrupted attempts remain local and resumable by default; the operator can publish one explicitly with `record`. A recorded incomplete attempt cannot later be resumed under the same identity because that would rewrite public history. Public history is append-only:

```text
qualification/results/<adapter>/<implementation>/
  latest.json
  attempts/<attempt-id>/
    attempt.json
    coverage.json
    error.json
    source-state.json
    cases/<case-id>/
      actor-evidence.json
      actor-events.jsonl
      actor-output.json
      actor-output.schema.json
      actor-prompt.md
      case-result.json
      deterministic-after.json
      deterministic-before.json
      judge-evidence.json
      judge-events.jsonl
      judge-output.json
      judge-output.schema.json
      judge-prompt.md
      workspace-assertions.json
      workspace.patch
```

`latest.json` always identifies the newest recorded attempt and independently preserves the newest passing attempt. Evidence protocol version 2 records repository commits and source-state fingerprints, qualification-engine and profile digests, tool versions, the resolved non-secret host configuration, exact package checksums, stage states, per-case summaries, token usage when Codex reports it, cache provenance, original evidence timestamps, and a SHA-256 digest for every public artifact. A passing attempt always records clean package, qualification-engine, and portable-skill inputs through the trusted host boundary; dirty or untrusted state can appear only in published failures or incomplete evidence. Verification rejects latest pointers without their referenced append-only history.

Before publication, host-specific paths and recognizable credential forms are sanitized from text and structured model evidence. The append-only recorder repeats that sanitization over every JSON and text artifact, rejects symlinks, then computes the published artifact digests. Operators must still inspect the complete new result directory before committing it. Run `npm run qualification -- verify` to validate all committed schemas, pointers, and artifact digests.

## Recovery

Use `npm run qualification -- status` to find resumable attempts. `resume` reconstructs and validates the candidate, recreates each case from committed inputs, restores completed actor state, and continues at the first pending stage without repeating compatible completed model calls. If a source, host, profile, or candidate identity changed, keep the old local evidence and start `retry` so the new run receives a linked attempt id.

Corrupt or partial candidate and model cache entries are misses, not evidence. The runner rebuilds candidates or reruns the affected model stage after approval. Use `--no-cache` only when new model evidence is intentionally required. If the process was interrupted, do not delete `.runtime-qualification/`; the atomic checkpoint and actor snapshot are the recovery state. `MOLDEA_EVAL_HOST_TIMEOUT_MS` can set a deliberate positive per-call timeout before an attempt. Its resolved value is checkpointed, so a change requires `retry`. `OPENAI_BASE_URL`, `SSL_CERT_FILE`, and `MOLDEA_EVAL_ALLOWED_HOSTS` remain available to the shared semantic runner, but setting a custom TLS certificate or using noncanonical transport values makes an official qualification preflight fail.

The stable result layout is intended to be consumed by the packages website so each adapter implementation can link to its complete history, latest result, and last passing evidence without requiring a separate service.

## Custom baseline

The first complete profile covers the built-in `custom/custom` target with three journeys:

- `evaluate-aligned-project` requires evidence-based recognition of a valid project and forbids unnecessary edits.
- `maintain-dirty-project` adds canonical billing context while preserving unrelated tracked and untracked work byte-for-byte.
- `reconcile-drift-and-boundaries` repairs a stale runtime binding and records dynamic tool registration as unresolved instead of fabricating a relationship.

These three journeys are not treated as an arbitrary test count. Their matrix probes, deterministic checks, explicit failure paths, and adversarial workspace states define the coverage. Future adapter profiles reuse the semantic journeys where applicable and add adapter-specific projects or requirements when their matrix claims introduce distinct risks.
