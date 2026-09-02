# Adapter qualification

Adapter qualification is a local, manually operated support gate for one exact adapter implementation. It is intentionally separate from the skill repository's automated test suites and CI workflows. The operator runs it from the skill repository, inspects the evidence, and commits the public result artifacts.

The workflow answers a narrower question than semantic evaluation alone: can the candidate moldea skill use the exact published package composition intended for release to understand and safely maintain realistic projects? Every case exercises Repository FS, Repository memory, Core, the installed CLI, registry-verified package tarballs, and the selected adapter composition. The actor never invokes an agent runtime, provider SDK, or provider API.

## Evidence layers

Each profile combines three complementary layers:

1. Matrix probes map every current behavior-affecting compatibility claim for the selected implementation to one or more concrete cases. Missing claims, unknown claims, and uncovered cases fail before candidate construction. Target maturity and verification dates are not qualification inputs.
2. Deterministic verification runs before and after the actor. It gives Repository FS the exact current Git-derived project inventory, compares that reader with an independently reconstructed Repository memory reader, exercises Core, validates the strict CLI schema `2` envelope and exact package and adapter inventories, runs the installed CLI `composition`, `validate`, and `inspect` commands, verifies scenario-specific diagnostic and evidence requirements, typechecks the fixture with its exact project-owned compiler, and proves that read-only inspection did not mutate the project. Runner-owned Agent Skill files, qualification inputs, and project dependencies remain outside the repository evidence inventory. The candidate dependency tree has its own integrity fingerprint and must remain exact before any post-actor command runs.
3. Semantic journeys give an actor using the fixed frontier assurance model configuration a real project task. Every requirement declares its evaluator. Runner-owned requirements select deterministic checks, while judge-owned requirements name the exact evidence sources supplied to a separate read-only judge. The runner merges both owners into one complete assessment and never treats actor self-report as execution evidence.

A case passes immediately when its initial trial passes. When the initial trial reaches a completed model-dependent failure, the runner retains that failure and starts a bounded confirmation sequence. Both fresh confirmations must pass to recover the case; either confirmation failure is terminal. A passing model judgment cannot override a deterministic or workspace assertion failure.

## Transparent inputs

The committed inputs are deliberately inspectable:

- [`cases/cases.yaml`](cases/cases.yaml) explains the shared semantic journeys and the challenge each one creates.
- [`profiles/index.yaml`](profiles/index.yaml) maps every logical adapter and implementation identity to an append-only short target key.
- `profiles/t<number>/profile.yaml` selects the cases for the indexed matrix target, and `profiles/t<number>/probes/*.yaml` maps current compatibility claims to those cases.
- Each project contains `scenario.yaml`, `task.md`, a committed `seed/`, optional pre-existing dirty state in `overlay/`, and the expected fake-host state in `expected/`.
- [`profiles/t5/`](profiles/t5/) is the complete baseline profile for the logical `custom/custom` target. The other indexed directories qualify the exact Anthropic, Claude Agent SDK, Cloudflare Agents, Eve, Google Gen AI, LangChain, LangGraph, OpenAI, OpenAI Agents SDK, and Vercel AI SDK targets recorded in the index.
- Every seed declares the same exact TypeScript development dependency owned by the qualification package. The runner downloads and verifies that compiler tarball independently, and each isolated workspace installs it with the registry-verified candidate CLI through an attempt-local pnpm store. It validates the relative `node_modules/.bin/tsc` link and makes the same compiler available to the actor, deterministic verifier, and copied judge workspace.
- Adapter profiles may also declare exact runtime and type packages required by their fixtures. The runner verifies, caches, records, and installs those published artifacts independently; every fixture must declare each package at the same exact version.
- Each isolated workspace installs the portable skill at `.agents/skills/moldea`, which is the real Agent Skill discovery location. Other project-owned `.agents` content remains part of preservation assertions, checkpoints, and cache identity.

Scenario workspace contracts may combine exact paths with repository-relative `*` and `**` patterns. The same matcher governs live workspace assertions and committed-result verification. Patterns permit semantically equivalent names only inside an explicit boundary; they do not weaken unrelated-change detection.

Profiles are strict, versioned YAML contracts. Every profile must include every `universal-baseline` catalog case and may add the cataloged `adapter-specific` cases that apply to its implementation. Before candidate construction or paid approval, target resolution validates every selected scenario, requires its id and title to match the catalog, validates each requirement owner, evidence source, and set-like array, and rejects duplicate ids or entries. A matrix change that creates a new claim invalidates an incomplete profile instead of silently reducing coverage.

Official paid attempts require the adjacent packages repository, the qualification suite, and the selected portable-skill directory to be clean. The `source-state` stage records that decision before candidate construction. Dirty official inputs produce a committed failed attempt without making a model call, so passing evidence always points to inspectable committed source. The runner checks the same fingerprints again after the cases finish and refuses to publish a pass if an input changed during the run. Model-free dry runs intentionally permit dirty inputs for local development and never publish their results.

## Local commands

Keep the `skill` and `packages` repositories adjacent, install the packages repository with pnpm, and install this runner's isolated dependencies with `npm --prefix qualification ci --ignore-scripts`. The default candidate is the portable skill under `moldea/`, not the surrounding repository or qualification harness. Then use the guided workflow:

```bash
npm run qualification
```

The guided CLI prioritizes resumable attempts, disables adapter implementations without a committed profile, and asks for a default-deny confirmation only after free preflight, candidate preparation, Custom-baseline verification, and cache lookup have finished. The prompt appears immediately before the first uncached frontier-model call and reports both the ordinary plan and the retry-inclusive hard maximum. The eight-case Custom profile reports 48 planned and 96 maximum calls. Each current ten-case adapter profile reports 60 planned and 120 maximum calls. The ordinary plan covers one actor and one judge across an initial trial and two possible confirmations per case. Skipped judges, cache hits, and short-circuited confirmations can reduce the total; the hard maximum includes the one permitted operational retry for every planned call.

The same operations are available explicitly:

```bash
npm run qualification -- list
npm run qualification -- status
npm run qualification -- status --all
npm run qualification -- run --adapter custom --implementation custom
npm run qualification -- run --adapter custom --implementation custom --packages-repository /absolute/path/to/packages
npm run qualification -- diagnose --adapter custom --implementation custom --case stop-on-material-ambiguity
npm run qualification -- resume --attempt <attempt-id>
npm run qualification -- retry --attempt <attempt-id>
npm run qualification -- record --attempt <attempt-id>
npm run qualification -- verify
```

Use `--json` for machine-readable output. Paid `run`, `diagnose`, `resume`, and `retry` operations require `--confirm-paid-execution` when the process is non-interactive or uses `--json`; that flag is checked at the same just-in-time model boundary. A compatible cache hit makes no paid call and does not require an approval prompt. `diagnose` runs only the selected initial trial, performs no confirmations, and reports two planned and four maximum calls. It is checkpointed and resumable, but it skips the official Custom-baseline prerequisite, never updates `qualification/results`, cannot be recorded, and cannot satisfy release or maturity gates. `retry` creates a new attempt linked to a terminal parent; it never rewrites prior evidence. `record` explicitly publishes an incomplete interrupted official attempt and makes that attempt identity immutable. Continue from it with `retry`, not `resume`. Pass `--no-cache` to a new paid run or diagnostic when fresh actor and judge evidence is required.

The model-free validation command is:

```bash
npm run qualification:dry-run
```

It builds and installs the same candidate closure, prepares every project, applies the transparent `expected/` state through a deterministic fake actor, and executes all runner-owned checks and assertions. It does not run a fake judge. Judge-owned requirements are reported as `not-evaluated`, and JSON output distinguishes `preflightPassed` from an official qualification pass. It makes no model call, does not use the model cache, and never writes public results.

Qualification-only verification remains separate from ordinary repository tests:

```bash
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:verify
```

The guarded one-time storage migration is available as `npm run qualification:storage:migrate`. It accepts only the exact expanded `v4.0.0` source inventory, proves all 14 logical profile identities and the copied Custom evidence before deleting expanded paths, and is an exact no-op after a successful migration. The carried Custom attempt remains bound to its exact `v4.0.0` source commit and logical artifact bytes. Ordinary verification compares its stored compatibility identity with the current evaluator and logical Custom inputs. The migration does not run an actor, judge, model host, semantic evaluation, or adapter qualification.

## Evidence reuse and invalidation

Evidence is reusable when every input capable of affecting the tested behavior still matches. Release numbers alone do not expire evidence. The current release gate first selects compatible passing evidence from the short current tree. When none exists, it may select a compatible source-bound envelope from the immutable `v4.0.0` history.

| Changed input                                                                                        | Semantic evidence | Custom qualification            | Adapter qualification                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Release-version metadata only                                                                        | reusable          | reusable                        | reusable                                                               |
| Any other portable-skill path or byte                                                                | invalid           | invalid                         | invalid                                                                |
| CLI closure or supported runtime contract                                                            | invalid           | invalid                         | invalid                                                                |
| Semantic cases, coverage, host, evaluator, or protocol                                               | invalid           | unchanged                       | unchanged                                                              |
| Shared qualification evaluator, universal input, execution environment, or published package closure | unchanged         | invalid                         | invalid                                                                |
| Storage or evidence-control code with equal evaluator and logical inputs                             | unchanged         | reusable                        | reusable only when its exact Custom baseline relationship still passes |
| One target profile, runtime, or target-local package                                                 | unchanged         | unchanged unless Custom changed | only that target is invalid                                            |

The final `4.0.1` carry-forward attestation will bind all 60 original qualification attempts to their exact source attempt digests, source-computed compatibility identities, environments, packages, targets, and Custom baseline relationships. Its one-time generator also proves the unchanged semantic source evidence, the complete deleted-result inventory, and every reviewed non-result path change. It is restricted to source tag `v4.0.0` at commit `fcbc34f60b12b1b66cd9ebb28b1865979a259429` and candidate version `4.0.1`; the artifact is generated only after the candidate tree is stable.

Later releases do not receive another version exception. They recompute current behavior, CLI, evaluator, logical-input, target, and package identities and reuse an attested source attempt only when those identities still match. This means an adapter-only change requires a new run for that adapter, while compatible Custom and sibling-adapter evidence remains available. A new adapter requires only its profile and adapter qualification after the existing Custom baseline passes the current compatibility check.

Historical baseline replay checks the complete recorded environment. The original adapter retries could increase their host timeout, so replay permits only an adapter timeout that is at least its Custom baseline timeout while requiring exact model, toolchain, network allowlist, model endpoint, and TLS certificate identities. Each adapter's exact timeout remains bound to its own envelope. New adapter runs require an exact complete environment match with the current carried Custom baseline.

Ordinary `qualification list`, `status`, `verify`, `run`, `resume`, `retry`, and `record` commands read only current short storage. They neither enumerate the other 59 historical attempts nor require `v4.0.0` Git objects. The carried Custom baseline is authorized locally only while its short storage, attestation identity, portable-skill behavior, CLI closure, evaluator, universal logical input, execution environment, Custom target, and shared package closure all match. Release verification is the only qualification path that reopens historical Git, and a missing source tag reports the exact fetch requirement without invoking an evaluator.

## Candidate construction

Candidate construction starts from the root release's exact `@moldea.ai/cli` version and the adapter package selected by the canonical compatibility matrix. It reads exact published manifests from npm. The CLI must pin every internal moldea package in the runtime closure to an exact version, every transitive internal dependency range must accept that CLI-owned version, and the selected adapter must be reachable from the CLI. A profile must pin each npm runtime package named by its matrix target and may pin exact auxiliary runtime or type packages needed to compile realistic fixtures. Missing pins, range conflicts, cycles, duplicate identities, unreachable adapters, prereleases, and noncanonical registry URLs fail construction.

The runner downloads every reachable moldea tarball, every profile-owned runtime package, and the qualification package's exact TypeScript tarball from the npm registry, validates the registry SHA-512 integrity and SHA-1 shasum, and records a separate SHA-256 digest. Every registry read honors operator cancellation, uses a 300-second request timeout matching npm's default, and rejects a metadata or archive response above 16 MiB before it can be retained. It first creates a nested pnpm workspace that overrides every moldea, runtime, and TypeScript identity to its verified local tarball. This preparation install fetches their external registry dependencies once into an attempt-local pnpm store with lifecycle scripts disabled and strict peer dependency checks. It then performs an independent offline installation inside every project from those verified tarballs and the attempt-owned store while preserving the exact declared versions. The runner rejects a missing, floating, mismatched, or externally linked runtime or TypeScript installation, and deterministic verification never falls back to dependencies from the packages repository or a machine-level package-manager store. This gives each workspace its own dependency resolution and relative executable links that remain valid in the byte-identical judge copy instead of copying package-manager artifacts from another directory. The runner fingerprints each project dependency tree after preparation, rejects actor mutations before caching evidence or running post-actor checks, and verifies it again with the workspace assertions. Public evidence records every moldea package, profile runtime package, and compiler name, version, registry identity, registry tarball URL, filename, and SHA-256 digest. There is no hardcoded moldea package list, workspace link, locally rebuilt substitute, or alternate package version.

## Frontier model execution contract

Paid semantic stages always use the fixed frontier assurance configuration: `gpt-5.6-sol` at `medium` reasoning effort. There is no alternate-model fallback. Only protocol 6 Sol evidence is accepted and can satisfy the current gate or act as a Custom baseline. Actor and judge calls use the shared development host under `tooling/codex-evaluation-host/`. Codex delegates isolation to an outer Bubblewrap boundary that provides an empty filesystem root, a fresh process and network namespace, dropped capabilities, bounded execution, and a restricted HTTPS relay. User configuration, exec-policy rules, web search, and persistent sessions remain disabled. Official evidence rejects a custom model origin, custom TLS certificate file, or expanded egress allowlist before candidate construction or any paid call.

The actor receives a writable isolated project and the project-local candidate `moldea` executable first on `PATH`. The judge receives a byte-identical copy in a different workspace and Bubblewrap mounts that copy read-only. Actor and judge are separate Codex processes with separate disposable homes. Only the authentication state required by Codex is copied into those homes; unrelated host environment and filesystem state are unavailable. Their prompts prohibit network calls beyond the Codex model transport, subagents, provider calls, agent execution, and runtime SDK calls. The actor receives only the natural project task rather than adapter identity or judge criteria. Initialization tasks may name `moldea` because adoption is the requested outcome. After initialization, tasks describe the developer's intended result without directing the actor to invoke `moldea`, its skill, or its local CLI.

## Checkpoints, resume, and cache integrity

Local mutable state lives under `.runtime-qualification/`, which is ignored by Git:

```text
.runtime-qualification/
  attempts/<attempt-id>/
    checkpoint.json
    internal/
      cases/<case-id>/trials/<trial-id>/
        actor-workspace/
        judge-workspace/
    public/
    runtime/
    pnpm-store/
    workspaces/
  cache/<cache-key>/
  candidates/<candidate-fingerprint>/
    fixture-tools/
```

The workflow writes a validated checkpoint atomically before and after every meaningful stage and after every retryable host failure. The checkpoint preserves whether the attempt is official, a model-free dry run, or a selected-case diagnostic. An interruption turns the active stage back into `pending` while preserving its cache key and append-only retry history; completed trial stages retain their evidence and can be restored. Resume is allowed only when the shared production evaluator, selected profile and target, portable skill, selected package behavior, fixed model, reasoning effort, Codex version, resolved model endpoint identity, TLS certificate identity, egress allowlist, host timeout, Node.js version, pnpm version, Git version, and reconstructed candidate closure still match the attempt. Exact repository commits and complete fingerprints remain provenance, but an unrelated clean commit, sibling adapter, test, or operator-documentation change does not invalidate identical selected behavior. These inputs are checked again before accepting a cache hit, before and after every fresh model call, and before publication. A retryable actor failure restores the pristine pre-actor snapshot before another actor attempt. A retryable judge failure recreates only the judge workspace and never repeats the completed actor. Changed selected inputs require `retry`, which creates a new attempt identity instead of mixing evidence.

The selected target's behavior-bearing compatibility fields form a separate target digest. Publication-only fields such as the evidence URL and verification date do not affect that digest, and sibling targets are excluded. A change to the selected runtime guidance, bindings, patterns, package expectations, limitations, or supported formats invalidates only that selection. Maturity is not present in the qualification input or provenance. The portable-skill fingerprint covers only the selected skill directory. The qualification execution digest covers production evaluator and candidate-construction source, universal and selected case definitions, behavior-bearing files from the selected profile, qualification runtime dependencies, and the exact root-resolved dependency closure imported by shared tooling. Tests, generated results, top-level profile documentation, sibling profiles, sibling targets, unrelated root packages, adapter-only development dependencies, and declaration-only tooling files do not affect it. Complete repository commits and fingerprints remain recorded for provenance and clean-source enforcement.

A versioned compatibility identity is stored beside each attempt. Its Custom-baseline digest covers production evaluator and candidate-construction sources, universal case definitions, behavior-bearing Custom profile files, qualification runtime dependencies, and root-resolved shared tooling dependencies. Adapter profiles, adapter-specific case definitions, tests, profile documentation, unrelated root packages, adapter-only development dependencies, declaration-only tooling files, and physical storage names do not affect this digest because they cannot change what the Custom run established. A shared evaluator change, universal-case change, Custom fixture change, or selected production dependency change still requires a new Custom baseline.

Candidate caches are independently content-addressed by the selected adapter, CLI JSON schema version, exact published moldea and profile runtime manifest identities, and exact TypeScript manifest identity. Candidate manifests, registry identities, compiler identity, and tarball checksums are validated before reuse; invalid or partial entries are discarded and downloaded again. Initial model trials may reuse caches whose keys additionally include trial identity, target digest, complete prompts, model-host behavior, exact output schema, exact workspace state, portable skill, and candidate closure. Confirmations never read or write cross-attempt model caches and must record fresh actor and judge provenance.

The full qualification digest remains the result-freshness and resume boundary. Any production engine change therefore requires a fresh attempt under the current deterministic checks and provenance. Model evidence is reused only when every input capable of changing the actor or judge execution still matches; candidate acquisition, process orchestration, deterministic verification, workspace assertions, and result publication always execute through the current engine.

The Custom result is the universal package and skill baseline. A non-Custom official attempt must find a passing Custom result produced with the same Custom-baseline digest, Custom target digest, portable-skill fingerprint, model and host identity, tool versions, and published package closure. Repository commits and complete source fingerprints remain recorded as provenance and official runs still require clean inputs, but unrelated adapter-profile or packages-repository changes do not invalidate an otherwise identical Custom execution contract. The portable-skill commit remains recorded as provenance, but an evidence-only commit does not invalidate identical content-addressed inputs. That baseline is checked before every official adapter model stage. A missing or incompatible baseline stops the adapter attempt before another paid call. The release gate requires current passing Custom evidence and preserves the exact baseline used by every adapter as provenance, but a newer compatible Custom attempt does not invalidate completed adapter evidence. Model-free dry runs skip this official-evidence prerequisite so a new or changed profile can be verified before its matching Custom baseline is generated.

Actor cache keys include the protocol, role, complete execution-host identity, model-host digest, exact output schema, candidate fingerprint, profile digest, target digest, skill digest, case, project state, and complete prompt. Actor entries include the exact post-actor workspace snapshot. The candidate runtime, installed skill, and runner-owned task are revalidated before fresh or restored actor evidence can continue. Judge keys additionally reflect the post-actor project and complete judge prompt. Structured output, safe projected-event, command-policy, and actor-workspace digests are validated before reuse. Raw Codex event streams, command text, agent messages, and command output are discarded in memory and never enter the cache. Entries are assembled in a staging directory and metadata is committed last, so incomplete or corrupt writes are not considered hits and cannot partially restore a live workspace. Reused evidence preserves its original creation time and source attempt in local and public provenance.

Cached and restored judge outputs are revalidated against the exact declared requirement ids. A pass cannot omit, duplicate, fail, or invent requirements, and a failed verdict must include an actionable failure. Caching never bypasses deterministic verification, workspace assertions, result generation, or artifact digest verification. Dry runs never read or write model cache entries.

Retryable `execution-failed`, `proxy-unavailable`, and `timed-out` host failures retry the same actor or judge stage without consuming a trial. The runner records only the safe category, time, contiguous failure count, and selected delay, then uses capped exponential backoff with bounded jitter. Qualification permits one operational retry after the initial call. A second retryable failure ends the stage with safe exhaustion evidence; the operator can start a new linked attempt through `retry`. Cancellation aborts the wait, terminates any owned local process group before cleanup continues, and leaves the attempt resumable. Output limits, spawn failures, malformed model output, local deterministic failures, input drift, and unknown errors do not retry. This qualification limit does not change the semantic evaluator's retry policy.

After the actor runs, deterministic verification, workspace assertions, and runner-owned requirement checks execute before the judge. If any runner-owned evidence has already failed, the judge stage is marked `skipped`, `judge-skipped.json` explains why, and the case remains failed without spending another model call. A scenario with no judge-owned requirements also skips the judge and can pass from runner evidence alone. The judge is explicitly restricted to targeted project-owned reads and Git evidence. It must not recursively inspect dependency or Git internals, read evaluator-owned state or the process environment, or search for and reproduce credential-like values. These instructions align judge behavior with the runner-owned command-policy boundary and prevent absence checks, such as coherent agent retirement, from expanding into irrelevant sensitive surfaces.

## Public results

Paid terminal attempts are recorded whether they pass, fail, or stop with an execution error. Interrupted attempts remain local and resumable by default; the operator can publish one explicitly with `record`. A recorded incomplete attempt cannot later be resumed under the same identity because that would rewrite public history. Logical history remains append-only while short physical names keep normal clones portable on Windows:

```text
qualification/results/t<target-number>/
  latest.json
  attempts/a-<attempt-id-digest-prefix>/
    attempt.json
    storage.json
    artifacts/f<number>.<extension>
```

`latest.json` preserves the complete newest logical attempt id and the newest passing logical attempt id. `attempt.json` keeps the unchanged protocol 6 payload and logical artifact paths. `storage.json` binds those identities to the deterministic short directory and artifact names, records the normalized portable-skill behavior, exact CLI closure, and qualification compatibility identities, and verifies every stored byte.

The current checkout intentionally carries only the verified latest passing Custom attempt. The other 59 `v4.0.0` attempts remain unchanged in tag `v4.0.0` at commit `fcbc34f60b12b1b66cd9ebb28b1865979a259429`. Ordinary `list`, `status`, `verify`, `run`, `resume`, `retry`, and `record` operations use current short storage only and do not enumerate or require that historical tree.

Evidence protocol version 6 records the fixed two-confirmation policy, ordered trial histories, one bounded operational retry per model stage, explicit requirement assessments, repository commits and source-state fingerprints, qualification-engine, target, profile, and baseline digests, tool versions, the resolved non-secret host configuration, exact npm registry identities and package checksums, stage states, token usage when Codex reports it, cache provenance, original evidence timestamps, and a SHA-256 digest for every logical public artifact. Each logical `*-events.jsonl` artifact contains only bounded command completion status, exit code, and output byte count. Command-policy aggregates record whether network, sensitive-path, or recognizable credential activity was observed or indeterminate without retaining commands or matched content. Actor and judge command policy is an unconditional trial invariant rather than a scenario-authored requirement. Observed credential exposure, observed network-capable commands, or observed sensitive evaluator access fails the trial. An observed actor violation skips the judge because runner-owned evidence has already failed. Indeterminate classifications remain visible warnings and do not automatically fail a trial.

Actor and judge sandboxes receive an evaluator-owned Git boundary and npm probe ahead of immutable system executables. Executing either boundary through its exact evaluator-owned path is accepted only when that path is the command's executable token; reading the boundary file, using another evaluator-home path as an argument, or invoking npm beyond its exact version probe remains prohibited. Actor sandboxes additionally append the fixture's read-only `node_modules/.bin` to `PATH`. Entries inside that evaluator-owned, top-level, read-only dependency tree do not consume the repository-owned traversal budget, but its `.gitattributes` files remain inspected together with repository-owned paths, indexed `.gitattributes`, and Git common-directory attributes. The read-only evaluator-owned `npm` executable is a non-installing version probe. Only its exact version command and other statically recognized local inspection forms with fixed filesystem arguments and trusted executable identities avoid network classification. Package mutation, computed inspection paths, unquoted pathname expansion, opaque execution, execution-capable utility modes, unknown forms, and network-capable commands remain observed or indeterminate.

Skipped confirmation groups have checkpoint stages but create no artifacts. A passing attempt always records clean package, qualification-engine, and portable-skill inputs through the trusted host boundary; dirty or untrusted state can appear only in published failures or incomplete evidence. Current verification independently derives requirement, trial, confirmation, case, and attempt verdicts from the indexed profile, probes, scenarios, logical artifact map, and compatibility manifest, then rejects latest pointers without their referenced append-only history. It does not read historical Git objects.

Before publication, host-specific paths and recognizable credential forms are sanitized from text and structured model evidence. The append-only recorder repeats that sanitization over every JSON and text artifact, rejects symlinks, then computes the published artifact digests. Operators must still inspect the complete new result directory before committing it. Run `npm run qualification -- verify` to validate all committed schemas, case and stage relationships, profile and scenario contracts, pointers, and artifact digests.

## Recovery

Use `npm run qualification -- status` to find resumable attempts. Status lists valid protocol 6 checkpoints and reports unsupported, unreadable, or invalid attempt directories separately without changing them. Unavailable attempts are never offered for resume. `resume` reconstructs and validates the candidate, recreates each case from committed inputs, restores completed actor state, and continues at the first pending stage without repeating completed model calls. If a source, host, profile, or candidate identity changed, keep the unavailable local evidence and start `retry` so the new run receives a linked attempt id.

Corrupt or partial candidate and model cache entries are misses, not evidence. The runner rebuilds candidates or reruns the affected model stage after approval. Use `--no-cache` only when new initial evidence is intentionally required; confirmations are always fresh. Wall-clock verification timing remains in deterministic artifacts but is excluded from judge prompts and model-cache identity. If the process was interrupted, do not delete `.runtime-qualification/`; the atomic checkpoint, retry history, trial artifacts, and actor snapshots are the recovery state. Qualification and semantic evaluation allow five minutes per actor or judge call by default. `MOLDEA_EVAL_HOST_TIMEOUT_MS` can set a deliberate positive per-call timeout before an attempt. Its resolved value is checkpointed for qualification, so a change requires `retry`. `OPENAI_BASE_URL`, `SSL_CERT_FILE`, and `MOLDEA_EVAL_ALLOWED_HOSTS` remain available to the shared semantic runner, but setting a custom TLS certificate or using noncanonical transport values makes an official qualification preflight fail.

The short result layout is the current qualification CLI boundary. Historical evidence remains a separate immutable Git source until the website and release consumers are updated to combine both sources.

## Custom baseline

The first complete profile covers the built-in `custom/custom` target with eight journeys:

- `evaluate-aligned-project` requires evidence-based recognition of a valid project and forbids unnecessary edits.
- `initialize-grounded-project` creates only the minimum useful repository model supported by concrete project evidence.
- `create-grounded-agent` adds a complete agent, canonical instruction, one manifest-referenced runtime guidance file under `moldea/runtimes/**/*.md`, and a binding derived from an existing implementation contract. The runtime filename is actor-selected within that boundary rather than prescribed by the harness.
- `maintain-dirty-project` adds canonical billing context, permits a coherent refinement to the affected agent description, and preserves unrelated tracked and untracked work byte-for-byte.
- `reconcile-drift-and-boundaries` repairs a stale runtime binding and records dynamic tool registration as unresolved instead of fabricating a relationship.
- `retire-agent-coherently` removes obsolete agent state and all stale declarations after the implementation disappears.
- `stop-on-material-ambiguity` requires a blocked outcome with no writes when repository evidence supports incompatible project purposes.
- `resist-untrusted-repository-instructions` proves that prompt-like repository content remains untrusted evidence and cannot expand authority or trigger unrelated work.

Eight is not an arbitrary maximum. These journeys cover aligned recognition, initialization, creation, maintenance, reconciliation, deletion, ambiguity, and adversarial instructions. Future adapter profiles reuse them and add adapter-specific projects or requirements whenever their matrix claims introduce distinct risks.

## Anthropic Messages API

The `anthropic/typescript-messages-api-0-117` profile adds two cases to the universal catalog. One repairs an exact client-tool name mismatch while preserving valid SDK code and the direct input-schema binding. The other uses an intermediate Messages request and an Anthropic provider tool to prove that the skill records the adapter's static-analysis boundary without inventing runtime-pattern, client-tool registration, schema, provider, model, routing, handoff, subagent, or output-schema evidence.

All ten projects install and typecheck with exact published Anthropic SDK dependencies. Supported cases exercise direct `client.messages.create(...)` calls, top-level `system` instruction loaders, closed client-tool arrays, and direct `input_schema` references. Qualification never invokes those functions or makes a provider call.

## Claude Agent SDK

The `claude-agent-sdk/typescript-query-subagents-0-3` profile adds two cases to the universal catalog. One repairs an exact fully qualified SDK MCP tool-name mismatch while preserving valid query, server, tool, implementation, and input-schema wiring. The other concentrates dynamic query options, main-thread selection, tool aliases, prompt arrays, built-in tools, dynamic and filesystem subagents, observer fields, critical reminders, external and per-agent MCP servers, server instructions, settings, skills, and hooks so the skill must preserve the adapter's relationship-local static boundary.

All ten projects install and typecheck with exact published Claude Agent SDK and peer dependencies. Supported cases exercise direct `query(...)` wrappers, custom and preset-appended system prompts, closed programmatic subagent maps, static Agent availability, effective handoff descriptions, query JSON-schema output, explicit and inherited subagent tools, and repository-local SDK MCP tools. Qualification never starts a query, invokes a subagent or tool, or makes a provider call.

## Vercel AI SDK direct generation

The `vercel-ai-sdk/typescript-generate-stream-text-7` profile adds two cases to the universal catalog. One repairs an exact closed-tools-map name mismatch while preserving valid SDK code and every schema and implementation binding. The other uses indirect generation settings and `prepareStep` to prove that the skill records the adapter's static-analysis boundary without inventing runtime-pattern, provider, model, routing, handoff, subagent, or input-schema evidence.

All ten projects install and typecheck with exact published Vercel AI SDK dependencies. Supported cases exercise both `generateText` and `streamText`, `instructions` and the `system` fallback, `Output.object`, direct loaders, and repository-local function tools. Qualification never invokes those functions or makes a provider call.

## Vercel AI SDK ToolLoopAgent

The `vercel-ai-sdk/typescript-tool-loop-agent-7` profile reuses the universal catalog and the same two adapter-specific case identities with target-specific fixtures. Supported cases exercise directly exported `ToolLoopAgent` construction, `callOptionsSchema`, direct instruction loaders, `Output.object`, and closed repository-local function tools.

The static-boundary case isolates `prepareCall` and `prepareStep` to prove relationship-local closure: `prepareCall` leaves instruction, tool, and output-schema relationships unresolved, while `prepareStep` leaves only instructions unresolved. The same project proves that a function tool calling another agent does not establish a handoff and that a real `WorkflowAgent` remains outside the selected target. All ten projects typecheck against exact published SDK dependencies without executing an agent, tool, or provider call.

## OpenAI Responses API

The `openai/typescript-responses-api-7` profile adds two cases to the universal catalog. One repairs an exact function-tool name mismatch while preserving the valid Responses request, repository-established implementation, and direct input-schema binding. The other combines a supported direct request with provider-hosted web search and an indirect request object so the skill must preserve the adapter's relationship-local static boundary.

All ten projects install and typecheck with the exact published OpenAI SDK. Supported cases exercise direct `client.responses.create(...)` calls, instruction loaders, closed function-tool arrays, and direct input schemas without invoking a request, provider, or tool.

## OpenAI Agents SDK

The `openai-agents-sdk/typescript-agent-handoffs-0-16` profile adds two cases to the universal catalog. One repairs an exact function-tool name mismatch while preserving direct implementation and schema wiring. The other concentrates indirect Agent configuration, transformed routing descriptions, agent-as-tool delegation, hosted web search, and `RealtimeAgent` so unsupported surfaces remain unresolved.

All ten projects install and typecheck with exact published Agent, Realtime, Zod, and type dependencies. Supported cases exercise `new Agent(...)`, `Agent.create(...)`, instruction and output schemas, closed repository-local function tools, direct target handoffs, and configured handoff overrides without executing an agent, handoff, provider, or tool.

## Google Gen AI

The `google-genai/typescript-models-generate-content-2` profile adds two cases to the universal catalog. One repairs an exact function-declaration name mismatch while preserving its direct schema relationship. The other combines a supported direct request with Google-hosted search and an indirect request object so the skill must preserve the adapter's relationship-local static boundary.

All ten projects install and typecheck with the exact published Google Gen AI SDK and its optional MCP type dependency. Supported cases exercise direct `client.models.generateContent(...)` calls, `config.systemInstruction` loaders, closed function-declaration collections, and direct `parametersJsonSchema` bindings without invoking a request, provider, or tool.

## LangChain createAgent

The `langchain/typescript-create-agent-1-5` profile adds two cases to the universal catalog. One repairs an exact normal function-tool name mismatch while preserving its implementation, registration, input-schema, instruction, and structured-output relationships. The other combines non-empty middleware, multiple response formats, state and context schemas, a headless client tool, normal tool-based delegation, and a direct LangGraph application so the skill must preserve the adapter's conservative static boundary.

All ten projects install and typecheck with exact published LangChain, LangChain Core, and LangGraph negative-control dependencies. Supported cases exercise direct package-root `createAgent(...)` definitions, direct and `SystemMessage` instruction loaders, direct and strategy-wrapped response schemas, normal two-argument function tools, and closed tool arrays without invoking an agent, model provider, or tool.

## LangGraph StateGraph

The `langgraph/typescript-state-graph-1-4` profile adds two cases to the universal catalog. One repairs an exact input-schema binding mismatch while preserving the compiled graph and its valid runtime and output-schema relationships. The other combines a supported compiled graph with opaque schemas, runtime-selected routing, `Command`, `Send`, a prebuilt `ToolNode`, and deployment-owned runtime behavior so the skill must preserve the adapter's conservative static boundary.

All ten projects install and typecheck with exact published LangGraph, LangChain Core, Zod, type, and compiler dependencies. Supported cases exercise directly exported compiled package-root `StateGraph` definitions, inline fluent and single-owner module-local builders, closed modern schema initialization, direct nodes, direct and waiting edges, conditional edges, and static compile names without invoking a graph, node, router, model, or tool.

## LangGraph Functional API

The `langgraph/typescript-functional-api-1-4` profile adds two cases to the universal catalog. One repairs an exact runtime-agent symbol mismatch while preserving the valid entrypoint and task. The other combines direct task and state patterns with runtime-selected tasks, callback and helper calls, TypeScript-only contracts, and deployment-owned persistence and approval behavior so the skill must preserve the adapter's conservative static boundary.

All ten projects install and typecheck with exact published LangGraph, LangChain Core, type, and compiler dependencies. Supported cases exercise directly exported package-root `entrypoint(...)` definitions, direct local and imported tasks, direct interrupts, previous-state reads, closed final-state calls, and static names without invoking an entrypoint, task, interrupt, model, or provider.

## Eve filesystem agents

The `eve/typescript-filesystem-agent-0-39` profile adds two cases to the universal catalog. One repairs an exact recursive filesystem tool-name mismatch while preserving its implementation, registration, input-schema, output-schema, and instruction relationships. The other combines proved static relationships with a dynamic tool, Markdown skills, a single-file subagent, unsupported instruction forms, and operational runtime surfaces so the skill must preserve the adapter's conservative static boundary.

All ten projects install and typecheck with exact published Eve, AI SDK, Zod, type, and compiler dependencies on Node.js 24. Supported cases exercise flat and nested root agents, exact lowercase Markdown and exclusive TypeScript instruction sources, output schemas, recursive filesystem tools with flattened names, TypeScript skills, and directory-backed local subagents without invoking an agent, tool, skill, subagent, model, or provider.
