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

The guided CLI prioritizes resumable attempts, disables adapter implementations without a committed profile, and asks for a default-deny confirmation immediately before a paid execution.

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

Use `--json` for machine-readable output. Paid `run`, `resume`, and `retry` operations require `--confirm-paid-execution` when the process is non-interactive or uses `--json`. `retry` creates a new attempt linked to a terminal parent; it never rewrites prior evidence. `record` explicitly publishes an incomplete interrupted attempt. Pass `--no-cache` to a new paid run when fresh actor and judge evidence is required.

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

Paid semantic stages always use `gpt-5.6-terra` with `medium` reasoning effort. There is no frontier-model or alternate-model fallback. The actor runs with Codex's `workspace-write` sandbox, while the independent judge runs with `read-only`. Both use non-interactive structured output, ephemeral sessions, disabled web search, ignored user configuration and exec-policy rules, a minimal environment, and approval policy `never` inside the stage.

The only paid boundary is the local Codex host. Actor and judge prompts prohibit network calls, subagents, provider calls, agent execution, and runtime SDK calls. The project-local candidate `moldea` executable is placed first on `PATH`, and the actor receives only the natural project task rather than adapter identity or judge criteria.

## Checkpoints, resume, and cache integrity

Local mutable state lives under `.runtime-qualification/`, which is ignored by Git:

```text
.runtime-qualification/
  attempts/<attempt-id>/
    checkpoint.json
    internal/
    public/
    runtime/
    workspaces/
  cache/<cache-key>/
  candidates/<candidate-fingerprint>/
```

The workflow writes a validated checkpoint atomically before and after every meaningful stage. An interruption turns the active stage back into `pending`; completed stages retain their evidence and can be restored. Resume is allowed only when the exact packages checkout, qualification suite, profile, and portable skill still match the attempt, so resumed evidence cannot claim a different source fingerprint. The selected target maturity is recorded as provenance but does not become a behavioral qualification claim. Existing committed passing evidence therefore remains valid after a maturity promotion. The portable-skill fingerprint covers only the selected skill directory. The qualification-suite fingerprint covers the engine, cases, profiles, fixtures, tests, lockfile, and documentation while excluding installed dependencies and append-only public results. Changed inputs require `retry`, which creates a new attempt identity.

Candidate caches are independently content-addressed by the behavior-sensitive package input digest and resolved runtime closure. This lets a new attempt reuse identical tarballs after a maturity-only matrix change without weakening the exact resume boundary. Candidate manifests and tarball checksums are validated before reuse; invalid or partial entries are discarded and rebuilt.

Actor cache keys include the protocol, role, fixed model and reasoning effort, Codex version, candidate fingerprint, profile digest, skill digest, case, project state, and complete prompt. Actor entries include the exact post-actor workspace snapshot. Judge keys additionally reflect the post-actor project and complete judge prompt. Cache metadata is committed last, so incomplete writes are not considered hits. Reused evidence preserves its original creation time and source attempt in local and public provenance.

Cached and restored judge outputs are revalidated against the exact declared requirement ids. A pass cannot omit, duplicate, fail, or invent requirements, and a failed verdict must include an actionable failure. Caching never bypasses deterministic verification, workspace assertions, result generation, or artifact digest verification. Dry runs never read or write model cache entries.

## Public results

Paid terminal attempts are recorded whether they pass, fail, or stop with an execution error. Interrupted attempts remain local and resumable by default; the operator can publish one explicitly with `record`. Public history is append-only:

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

`latest.json` always identifies the newest recorded attempt and independently preserves the newest passing attempt. Each attempt records repository commits and source-state fingerprints, qualification-suite and profile digests, tool versions, exact package checksums, stage states, per-case summaries, token usage when Codex reports it, cache provenance, original evidence timestamps, and a SHA-256 digest for every public artifact. A passing attempt always records clean package, qualification-suite, and portable-skill inputs; dirty-state fingerprints can appear only in published failures or incomplete evidence.

Before publication, host-specific paths and recognizable credential forms are sanitized from text and structured model evidence. The Codex stage receives only a minimal environment and no provider credentials. Operators must still inspect the complete new result directory before committing it. Run `npm run qualification -- verify` to validate all committed schemas, pointers, and artifact digests.

The stable result layout is intended to be consumed by the packages website so each adapter implementation can link to its complete history, latest result, and last passing evidence without requiring a separate service.

## Custom baseline

The first complete profile covers the built-in `custom/custom` target with three journeys:

- `evaluate-aligned-project` requires evidence-based recognition of a valid project and forbids unnecessary edits.
- `maintain-dirty-project` adds canonical billing context while preserving unrelated tracked and untracked work byte-for-byte.
- `reconcile-drift-and-boundaries` repairs a stale runtime binding and records dynamic tool registration as unresolved instead of fabricating a relationship.

These three journeys are not treated as an arbitrary test count. Their matrix probes, deterministic checks, explicit failure paths, and adversarial workspace states define the coverage. Future adapter profiles reuse the semantic journeys where applicable and add adapter-specific projects or requirements when their matrix claims introduce distinct risks.
