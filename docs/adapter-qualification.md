---
title: Adapter qualification
navigationTitle: Adapter qualification
description: How current adapter implementations are tested against the portable skill and exact published package closure.
section: reference
order: 175
---

# Adapter qualification

Adapter qualification verifies one exact published adapter implementation and its current package closure against realistic repositories without invoking a provider API or running an agent. Website presentation labels are separate from qualification evidence and do not affect the technical result.

## Evidence ownership

Universal portable-skill behavior is qualified once through the Custom profile. Its 12 cases cover evaluation, initialization, creation, maintenance, reconciliation, retirement, ambiguity handling, resistance to untrusted repository instructions, informational use before adoption, abstention before and after adoption, and declared-relationship activation.

Each published adapter profile owns only its adapter-specific probes and repair cases. This keeps provider and runtime boundaries visible without multiplying the universal suite across every target.

The profile index contains 14 current targets: Custom plus 13 published adapter implementations.

The suite therefore executes 38 unique projects: 12 universal Custom projects plus 2 direct projects for each adapter. Public evidence composes the exact current passing Custom attempt bound by an adapter attempt with that adapter's 2 direct projects. An adapter page reports 14 effective journeys, split into 12 shared and 2 direct, only while both attempts are current and passing. A missing, stale, failed, or mismatched baseline leaves the effective result incomplete or failed instead of presenting a false pass.

## What one case exercises

Each case combines:

1. a transparent seed repository and natural developer task
2. the exact registry-verified CLI and adapter package closure
3. deterministic pre-actor validation
4. an isolated actor using the installed portable skill
5. deterministic post-actor validation and workspace assertions
6. an independent judge for semantic requirements
7. resource, privacy, repository-control, and package-provenance evidence

The actor never receives grading criteria. The judge cannot replace deterministic package, schema, filesystem, or resource evidence with prose.

Every trial records semantic, resource, command-policy, repository-control, mount-integrity, and operational dimensions. Overall pass is their strict conjunction. Only a semantic failure with every other dimension passing can receive confirmations; all non-semantic failures are terminal for that trial.

Qualification workspaces contain their complete installed dependency set before an actor starts. Actors cannot invoke a package manager, transient executable, or installer and must use the installed skill's closed repository-local CLI launcher. This keeps network isolation mechanically enforceable without preventing project-native validation.

## Resource limits

Each actor or judge stage records:

- completed tool-command count
- recognized `moldea` invocation count
- `moldea` command-output bytes
- maximum output bytes from one completed command
- total model-visible tool-output bytes
- input, cached-input, and output token counts when the host reports them
- stage duration

Every scenario declares `ordinary` or `largeTraversal`. Both profiles permit at most 128 KiB from one completed command, 64 completed commands, 16 `moldea` calls, and 1,625,000 input-plus-output tokens. `ordinary` also permits 256 KiB of `moldea` output and 1 MiB of aggregate model-visible tool output. `largeTraversal` also permits 1 MiB of `moldea` output and 4 MiB of aggregate model-visible tool output. Crossing any dimension remains an explicit stage failure naming the profile, measured value, and limit. An actor that exceeds only cumulative completed-command, `moldea`-call, or token limits may still receive a semantic verdict while inside absolute containment. This makes an otherwise accepted trial usable for calibration without making the over-budget trial pass. Missing token usage and output-volume or existing correctness and safety failures skip the judge.

The profile token limits contain a complete tool-using Codex stage rather than one internal model turn, and they are not consumption targets. Before the first direct model call, the CLI reports candidate count, direct and reused cases, planned calls, maximum calls including one operational retry per stage, the 2,097,152-token absolute ceiling per stage, prior candidate consumption, and the total candidate-token ceiling. One profile retains its independent 32,000,000-token stop-loss; a multi-profile approval reports the sum of those independent ceilings. The selected scenario profile is enforced against every completed actor and judge stage in the final verdict. Provider-cached input remains visible in evidence but is not added to input a second time.

Batch execution accepts one, two, or four isolated workers and defaults to four. Before dispatch, the coordinator reserves 2 GiB of temporary storage per worker, no more than 8 GiB for four workers, while preserving a 2 GiB free-space floor. The per-worker value includes an exact candidate snapshot, attempt-local pnpm metadata and package content, and installed dependency workspaces; a healthy model-free Claude Agent SDK qualification measured about 1.25 GiB. The guard measures complete worker roots at model-stage boundaries and uses constant-cost free-space checks while a stage is active, avoiding repeated recursive scans of large dependency trees. Capacity exhaustion stops new dispatch and preserves bounded resumable state. Because concurrent admission reserves each possible next model stage, resume the exact checkpoint at two workers, then one if needed, before treating the candidate as exhausted or considering a stop-loss change. Completed stages must not run again.

The operating limits and higher absolute ceilings are imported from the same source-controlled profile used by semantic evaluation and host execution. Deterministic boundary tests prove exact acceptance and over-limit failure for every dimension. The deterministic calibration corpus measures CLI and repository-operation behavior. Accepted qualification trials are the authority for complete model-stage consumption; duration and memory remain diagnostic observations. The strict `fixtures/model-stage-resource-calibration.json` artifact is a self-contained safety-calibration record, not current qualification assurance. It retains only trial identity, evidence digests, pass states, aggregate counts, and token categories, without loading an active result directory. It excludes commands, paths, prompts, output bodies, repository content, credentials, and hidden reasoning.

Qualification results retain these numeric aggregates but never raw command text, raw command output, credentials, hidden reasoning, or arbitrary workspace content.

Semantic and qualification stages receive the same evaluator-owned closed-host developer instruction before the natural task. Qualification actors and independent judges use `gpt-5.6-sol` at `xhigh` reasoning effort with a fifteen-minute stage timeout. Host skill discovery is disabled so external skill state cannot alter the closed fixture. The instruction prohibits package-manager, provider, model, subagent, environment, authentication, evaluator-home, and outside-workspace access, and permits only an evaluator-provided fixed local probe when the owning workflow explicitly grants one. Qualification grants none, so every network client remains prohibited. The host rejects caller overrides, and the qualification model-host digest changes whenever the instruction changes. Scenario prompts retain only qualification-specific task, evidence, workspace, Git, ambiguity, and result-schema guidance.

Protocol 10 classifies operations rather than vocabulary. Searching repository text for terms such as `secret`, `authorization`, or `.codex` is inert, and ordinary prose after the word `Basic` is not treated as an authorization credential. A Basic credential must decode as canonical UTF-8 user-and-password material, while actual evaluator-home, authentication-file, credential, environment-value, process-environment, network, package-manager-network, dynamic-execution, or broad-filesystem operations receive stable reason codes and counts. Public evidence never contains the command, path, search pattern, output, or secret. An `indeterminate` classification remains visible diagnostic uncertainty and is acceptable only because official runs independently establish read-only filesystem and restricted-egress sandboxes; it is not presented as proof that access was safe.

## Fresh evidence by default

Qualification protocol 10 accepts only evidence matching the current:

- portable skill bytes
- CLI and package closure
- qualification runner and host
- profile, probes, and selected cases
- target identity
- execution environment
- Custom baseline relationship
- scenario resource profile and privacy-safe command-policy reason counts

Every current target must have a current passing attempt for its exact current inputs. A current attempt may reuse only complete passed or recovered case groups from a byte-valid committed failed attempt with the same behavior-bearing identity. Direct and reused work remain visibly distinct, and failed, incomplete, diagnostic, uncommitted, chained, mismatched, or tampered evidence is rejected. Current protocol-10 history is revalidated against the contracts at each attempt's recorded source commit.

This is the normal release path. An explicit qualification-scoped release evidence pin may reuse original passing qualification evidence from an immutable release tag or full commit when a maintainer has established that qualification behavior is unchanged. Semantic evidence remains independently fresh or pinned. Fresh and pinned qualification results use the same project-journey presentation. Immutable source identity, the maintainer reason, exact executed package closure, and current-contract distinction remain available in technical details. See [Release evidence](/docs/release-evidence/).

Each public adapter profile is the canonical effective result. It combines the 12 journeys from the exact bound Custom foundation with the adapter's 2 direct journeys on one page; Custom presents its 12 journeys directly. Visitors do not have to navigate separate Custom and direct attempt pages. The primary view follows developer requests, coding-agent work, workspace changes, and independent verdicts. Configured package inputs, executed closures, source commits, matrix claims, and raw artifacts remain available through progressive technical disclosure.

An adapter attempt requires a passing current Custom baseline. A Custom attempt does not require another baseline.

## Results and replay

Current results use the target keys declared in `qualification/profiles/index.yaml`. Each target has an append-only current attempt directory and a `latest.json` pointer. Artifact manifests bind every recorded file by SHA-256.

The website validates current or authenticated pinned artifacts before rendering evidence pages. Replays are bounded reconstructions from validated outputs and projected execution facts, not terminal transcripts. Qualification attempt identities are technical source records rather than separate public routes.

## When qualification must run again

| Changed input                                                                | Required fresh evidence                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| Portable skill, semantic activation contract, or CLI closure                 | Semantic evaluation, Custom, and every adapter        |
| Shared qualification runner, host, universal cases, or execution environment | Custom and every adapter                              |
| One adapter package, profile, probes, or adapter case                        | That adapter after the current Custom baseline passes |
| New adapter target                                                           | Its complete profile and fresh run after Custom       |
| Documentation-only wording outside behavior and evidence identity            | No model rerun unless an owned digest changes         |

## Commands

Run free deterministic validation first:

```bash
npm run qualification:dry-run
npm run qualification:dry-run:all
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
```

Machine-readable run output is intentionally compact: it reports terminal case states, counts, and the checkpoint directory. Complete evidence stays in bounded attempt storage and is loaded only when a human or tool explicitly inspects it. Candidate artifacts remain independently downloaded and registry-verified evidence. Candidate preparation installs the exact versions through one attempt-local pnpm metadata cache and content store, an empty attempt-owned user config, and the explicit public npm registry; case workspaces reuse that closure offline. Pnpm never consults the user's global cache or home configuration, never inherits its registry credentials, and never installs candidates through local-tarball overrides. Terminal runs remove disposable workspaces, installed runtime trees, snapshots, package stores, and metadata caches. Interrupted runs preserve only the state required for explicit resume.

The isolated host accepts bounded Git status and path-scoped diff forms that are supplied directly in actor and judge prompts. Agents do not need to inspect evaluator-owned wrappers or home paths. After a compatible resume revalidates its identity, the runner removes the superseded interruption marker and writes a new marker only if execution is interrupted again.

Machine-readable `status` output is a separate content-free contract. The default scope contains unrecorded incomplete attempts, unavailable checkpoint summaries, and committed latest pointers; `--all` selects complete local history. A page contains at most 64 records and 65,536 UTF-8 bytes. Its opaque continuation cursor is bound to the exact summary snapshot and must be restarted when that snapshot changes. Each checkpoint write maintains a separate 8,192-byte-bounded status sidecar. Status reads only that sidecar and checkpoint file metadata, so checkpoint bodies, candidates, manifests, stages, prompts, workspace paths, commands, model output, and repository content never enter status inspection or its output. Missing or invalid sidecars remain unavailable rather than activating a legacy checkpoint reader.

The two universal abstention cases assess only `moldea` activation, resource use, reference leakage, actor completion, and repository preservation. Correctness opinions about the unrelated host-owned source or documentation review are deliberately outside adapter qualification, so disagreement on an ordinary task cannot create a false `moldea` failure.

## Correct profiles efficiently

Run the free deterministic checks before paid work and establish the current Custom baseline once with `run --adapter custom --implementation custom --workers 4`. Then use `run-batch --all --workers 4` to execute the 13 adapter profiles. The batch continues after semantic failures while the host remains operationally safe, retains each profile in an isolated attempt and result root, and commits its compact ledger in profile-index order. Failed official attempts remain immutable evidence. Collect the complete adapter, profile, and case failure ledger before changing shared skill or qualification behavior so one correction can address every affected target.

Use `diagnose-batch --adapter <adapter> --implementation <implementation>` with exactly one of `--all`, `--cases <comma-separated-case-ids>`, `--claims <comma-separated-claim-ids>`, or `--unresolved-from <attempt-id>`. The batch executes up to four isolated initial trials concurrently without confirmations or evidence reuse, continues across semantic failures, and never changes official evidence. After the consolidated correction, rerun a batch for only unresolved cases, then create one official evidence-producing attempt. `diagnose --case` remains available for one focused investigation.

The diagnostic aggregate checkpoint and content-free ledger are independently limited to 1 MiB and atomically replaced. Each private worker checkpoint has the same limit, for a 6 MiB four-worker metadata ceiling. Completed entries contain status, requirement IDs, a deterministic explanation, aggregate resource counts, and attempt identity, never model rationale, prompts, commands, output bodies, repository content, or workspace paths. Final output is limited to 16 KiB. Successful completion deletes the aggregate checkpoint and terminal private attempts after projection. A stopped model stage receives one explicit additional attempt only with `--resume-stopped-stage`; `--restart` discards only exact matching diagnostic state.

`run-batch` accepts exactly one of `--all`, `--targets <comma-separated-logical-target-identifiers>`, or `--unresolved-from <batch-id>`. One logical target identifier has the form `<adapter>/<implementation>`. The coordinator creates fixed target attempts before dispatch, validates the exact passing Custom baseline before any adapter starts, runs at most four profiles concurrently, and records terminal summaries in declared order. Its checkpoint, active ledger, and retained completed ledger are each limited to 1 MiB; each summary is limited to 4 KiB and final JSON to 16 KiB. An operational or capacity failure stops new dispatch, drains active siblings, and preserves completed results. Resume may use a lower accepted worker count without replaying completed stages.

Run the Custom profile before adapters:

```bash
npm run qualification -- run --adapter custom --implementation custom
```

Then run the adapter batch and verify all committed current evidence:

```bash
npm run qualification -- run-batch --all --workers 4
npm run qualification -- run-batch --unresolved-from <batch-id> --workers 4
npm run qualification -- verify
```

See the [qualification source](https://github.com/moldea-ai/skill/tree/main/qualification) for profiles, probes, scenarios, and the complete local operator workflow.
