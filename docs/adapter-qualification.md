---
title: Adapter qualification
navigationTitle: Adapter qualification
description: How current adapter implementations are tested against the portable skill and exact published package closure.
section: reference
order: 175
---

# Adapter qualification

Adapter qualification tests one exact published adapter implementation and package closure in realistic repositories without calling a provider API or running an agent. Website labels are presentation only and do not affect the technical result. Current evidence uses qualification protocol 10.

## Evidence ownership

The Custom profile owns 12 universal journeys covering evaluation, initialization, creation, maintenance, reconciliation, retirement, ambiguity, untrusted repository instructions, informational pre-adoption use, abstention before and after adoption, and relationship activation. Each adapter profile owns only 2 adapter-specific probe and repair journeys.

The index contains 14 targets: Custom plus 13 adapter implementations. The suite executes 38 unique projects, with 12 Custom projects and 2 for each adapter. A public adapter result combines its exact bound passing Custom attempt with its 2 direct projects, yielding 14 effective journeys split into 12 shared and 2 direct. Custom presents its 12 directly. A missing, stale, failed, or mismatched baseline leaves the effective result incomplete or failed.

Each case includes a transparent seed repository and natural task, the registry-verified CLI and adapter closure, deterministic pre- and post-actor validation, an isolated actor, workspace assertions, an independent semantic judge, and resource, privacy, repository-control, and package-provenance evidence. The actor never receives grading criteria; the judge cannot replace deterministic evidence with prose.

Semantic, resource, command-policy, repository-control, mount-integrity, and operational dimensions are recorded separately. Overall pass is their strict conjunction. Only a semantic failure with every other dimension passing may receive confirmations.

Workspaces contain their complete installed dependencies before the actor starts. Actors cannot invoke package managers, transient executables, or installers and must use the closed repository-local launcher. Candidate preparation obtains independently registry-verified artifacts through an attempt-local pnpm metadata cache and content store, an empty attempt-owned user configuration, and the explicit public npm registry. Case workspaces reuse the closure offline. Pnpm does not consult global user caches or configuration, inherit registry credentials, or install local-tarball overrides. Terminal runs remove disposable workspaces, runtime trees, snapshots, stores, and metadata caches; interrupted runs retain only resumable state.

## Resource, host, and privacy controls

Each actor and judge stage records completed commands, recognized `moldea` invocations, `moldea` output and per-command peak, total model-visible tool output, reported input/cached-input/output tokens, and duration. Every scenario declares `ordinary` or `largeTraversal`; their operating and absolute limits are defined in [Compatibility and local tooling](/docs/compatibility-and-local-tooling/).

An actor exceeding only cumulative command, `moldea`-call, or token limits may still receive a semantic verdict within absolute containment, making the accepted behavior useful for calibration without passing the over-budget trial. Missing token usage or output-volume, correctness, or safety failures skip the judge. Duration and memory remain diagnostic observations.

Before a direct model call, the CLI reports candidate, direct and reused case counts, planned and retry-inclusive calls, the 2,097,152-token absolute ceiling per stage, prior candidate consumption, and total candidate-token ceiling. One profile retains its independent 32,000,000-token stop-loss; multi-profile approval reports the sum of independent ceilings. Provider-cached input remains visible but is not counted twice.

Batch execution accepts one, two, or four isolated workers and defaults to four. The coordinator reserves 2 GiB of temporary storage per worker, at most 8 GiB for four, while preserving a 2 GiB free-space floor. Capacity exhaustion stops dispatch and preserves resumable state. Resume the same checkpoint with two workers, then one, before treating the candidate as exhausted or changing a stop-loss. Completed stages do not run again.

The shared source-controlled resource profile governs semantic evaluation, qualification, and host execution. Deterministic boundary tests cover acceptance and over-limit failure. Deterministic fixtures measure CLI and repository operations; accepted qualification trials remain the authority for complete model-stage use. `fixtures/model-stage-resource-calibration.json` is privacy-safe safety calibration, not current assurance. Results retain aggregate identities, digests, pass states, counts, and token categories, never raw commands or output, prompts, repository content, credentials, or hidden reasoning.

Qualification actors and judges use `gpt-5.6-sol` at `xhigh` reasoning with a fifteen-minute stage timeout. They receive the same closed-host instruction used by semantic evaluation. Skill discovery and caller overrides are disabled. Network clients, package-manager and provider calls, model and subagent use, environment and authentication access, evaluator-home access, and outside-workspace access are prohibited. There is no compatibility-publication exception.

Protocol 10 classifies operations, not vocabulary. Repository searches containing words such as `secret`, `authorization`, or `.codex` are inert, and text following `Basic` is not a credential unless it canonically decodes as UTF-8 user-and-password material. Actual credential, environment, network, dynamic-execution, evaluator-home, authentication-file, package-manager-network, or broad-filesystem operations receive stable reason codes and counts. Public evidence exposes none of the command, path, search pattern, output, or secret. `indeterminate` remains visible uncertainty and is acceptable only because official runs independently enforce read-only filesystem and restricted-egress sandboxes.

## Fresh evidence and replay

Current protocol-10 evidence must match portable bytes, CLI and package closure, runner and host, profile, probes and cases, target identity, execution environment, Custom baseline relationship, resource profile, and privacy-safe policy counts. Filesystem identity preserves contents, paths, symlinks, and executability while ignoring host-only permission differences.

Reuse is limited to complete passed or recovered groups from a byte-valid committed failed attempt with the same behavior-bearing identity. Direct and reused work remain distinct. Failed, incomplete, diagnostic, uncommitted, chained, mismatched, or tampered evidence is rejected. Historical protocol-10 evidence is checked against the contracts at its recorded source commit.

Fresh evidence is normal. A qualification-scoped release pin may select original passing evidence from an immutable release tag or full commit when a maintainer establishes that qualification behavior is unchanged. Semantic evidence remains independently fresh or pinned. Both forms use the same project-journey presentation, with source identity, reason, executed closure, and current-contract distinction in technical details. See [Release evidence](/docs/release-evidence/).

Current target keys come from `qualification/profiles/index.yaml`. Each target has an append-only attempt directory and `latest.json`; manifests bind files by SHA-256. The website validates current or authenticated pinned artifacts before rendering bounded replay from projected facts. Replays are not terminal transcripts, and technical attempt identities do not become separate public routes.

An adapter requires a current passing Custom baseline. Custom requires no baseline.

| Changed input                                                      | Required fresh evidence                          |
| ------------------------------------------------------------------ | ------------------------------------------------ |
| Portable skill, semantic activation contract, or CLI closure       | Semantic evaluation, Custom, and every adapter   |
| Shared qualification runner, host, universal cases, or environment | Custom and every adapter                         |
| One adapter package, profile, probes, or case                      | That adapter after current Custom passes         |
| New adapter target                                                 | Its complete profile after current Custom passes |
| Documentation wording outside behavior and evidence identity       | No model rerun unless an owned digest changes    |

## Free checks and status

Run deterministic checks before paid work:

```bash
npm run qualification:dry-run
npm run qualification:dry-run:all
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
```

Machine run output contains terminal case states, counts, and the checkpoint directory. Full evidence stays in bounded attempt storage until explicitly inspected. The isolated host accepts only bounded Git status and path-scoped diff forms supplied in prompts. A compatible resume revalidates identity, removes the superseded interruption marker, and writes a new marker only if interrupted again.

Machine-readable `status` is content-free. By default it covers unrecorded incomplete attempts, unavailable checkpoint summaries, and committed latest pointers; `--all` adds complete local history. Pages contain at most 64 records and 65,536 UTF-8 bytes. The opaque cursor is bound to the exact snapshot and must restart if that snapshot changes. Each checkpoint maintains an 8,192-byte status sidecar. Status reads only sidecars and checkpoint metadata, never bodies, candidates, manifests, stages, prompts, workspace paths, commands, model output, or repository content. Missing or invalid sidecars remain unavailable rather than invoking a legacy reader.

The two universal abstention cases assess activation, resources, reference leakage, actor completion, and repository preservation only. Opinions about unrelated host-owned reviews cannot create a false qualification failure.

## Diagnose and record efficiently

Establish Custom once, then run the 13 adapters. Batch execution continues across semantic failures while safe, keeps isolated attempt and result roots, and commits its compact ledger in profile order. Failed official attempts remain immutable. Collect the complete target and case ledger before editing shared behavior.

For non-recording investigation, use `diagnose --case` for one case or `diagnose-batch --adapter <adapter> --implementation <implementation>` with exactly one of `--all`, `--cases <comma-separated-case-ids>`, `--claims <comma-separated-claim-ids>`, or `--unresolved-from <attempt-id>`. A diagnostic batch runs up to four isolated initial trials without confirmations, reuse, or official evidence changes. After one consolidated correction, rerun only unresolved cases, then create one official attempt.

The diagnostic aggregate checkpoint and content-free ledger are each capped at 1 MiB and atomically replaced. Each private worker checkpoint has the same cap, producing a 6 MiB four-worker metadata ceiling. Entries contain status, requirement IDs, deterministic explanations, aggregate resources, and attempt identity, never model rationale, prompts, commands, outputs, repository content, or workspace paths. Explanations are capped at 4 KiB and final output at 16 KiB. Success deletes aggregate and private diagnostic state after projection. `--resume-stopped-stage` grants one additional attempt for a stopped model stage; `--restart` discards only exact matching diagnostic state.

`run-batch` accepts exactly one of `--all`, `--targets <comma-separated-logical-target-identifiers>`, or `--unresolved-from <batch-id>`. Target IDs use `<adapter>/<implementation>`. The coordinator creates fixed attempts, validates the exact Custom baseline before adapters start, runs at most four profiles, and records summaries in declared order. Its checkpoint, active ledger, and completed ledger are each capped at 1 MiB; each summary at 4 KiB; and final JSON at 16 KiB. Operational or capacity failure stops dispatch, drains active work, and preserves results. Resume may lower worker count without replay.

Run Custom, then the adapter batch, then verify current evidence:

```bash
npm run qualification -- run --adapter custom --implementation custom --workers 4
npm run qualification -- run-batch --all --workers 4
npm run qualification -- run-batch --unresolved-from <batch-id> --workers 4
npm run qualification -- verify
```

The [qualification source](https://github.com/moldea-ai/skill/tree/main/qualification) is the complete operator authority for profiles, probes, scenarios, status, diagnostics, recording, resume, and replay workflows.
