---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: How the current portable skill is tested for relevance, bounded evidence use, read-only behavior, and concise reporting.
section: reference
order: 172
---

# Semantic evaluation

Deterministic tests prove schemas, files, commands, and byte limits. Semantic evaluation tests whether a coding agent applies those contracts correctly in realistic repository tasks.

The active suite contains 74 cases: all 57 former scenarios, 17 resource-bounded additions, and one shared scenario counted once. `fixtures/semantic-evaluation-dispositions.json` records every former identifier so a smaller suite cannot silently replace established coverage. Current assurance uses semantic protocol 25 and schema-9 evidence.

## Coverage and verdicts

The suite covers:

- silent abstention during unrelated source, documentation, and unmanaged README work
- host planning and review command precedence, with no activation from generic durable-knowledge language
- direct activation for canonical files, the managed README block, and explicit validation
- bounded `scope` activation for exact bindings and `affectedBy` paths
- valid zero-agent projects and large inventories without full-content inspection
- read-only repository and Git controls
- initialization from insufficient, partial, and sufficient evidence
- canonical maintenance, reconciliation, compression, and relationship behavior
- Agent Skill creation, maintenance, distribution, and script-authority boundaries
- grounded agent-system planning, runtime selection, provider capability, and routing ownership
- package-manager, Git-helper, host-command, and related-repository safety

Each case declares a natural request, sourced repository facts, expected and prohibited behavior, and a resource budget. The actor receives the request and portable skill, never the grading criteria. An independent judge receives the criteria and runner-owned evidence; actor prose cannot manufacture command evidence, repository state, or byte counts.

The runner records semantic, resource, command-policy, repository-control, read-only-mount, and operational dimensions separately. Overall pass is their strict conjunction. Only a semantic failure with every other dimension passing may receive confirmation trials. Deterministic, resource, policy, repository, mount, and operational failures are terminal and spend no confirmations. The judge evaluates behavioral clauses and projected command-result facts, not unrelated host-command counts or output.

When pre-adoption abstention consumes the request, the actor reports only a neutral repository outcome such as `No files were changed.` It does not mention `moldea` or recommend initialization. If an independent host review remains, the actor completes and reports that review normally.

Initialization writes the complete foundation before its first CLI call, using exactly `version: 1` when no relationship is evidenced. It then runs one final `validate` and stops on success. Only one diagnostic-driven correction and validation retry is allowed; successful validation is not followed by `inspect`.

## Bounded proof

For every completed actor and judge command, the runner observes command and output in memory, projects only safe facts, and discards raw command text and output bodies. Results retain operation order, `moldea` bytes and per-invocation peak, total model-visible tool output, bounded policy reasons and counts, completed host-command count, input-plus-output tokens, and any attempt by a non-content command to return canonical content.

Abstention requires zero recognized `moldea` commands and bytes. Direct Agent Skill artifact cases also use zero-call budgets when repository validation adds no relevant fact. A direct case may start with `scope` when explicit intent targets ordinary paths. A relationship case always starts with `scope`, never `inspect`.

Semantic call limits are:

- at most 4 `moldea` calls and 262,144 output bytes for ordinary direct, relationship, and discovery-dependent blocked cases
- at most 5 calls for a route-5 direct mutation needing owner discovery or composition before final validation
- exactly the capacity for 1 inventory inspection, 3 selected content reads, and final validation in the three-record compression case
- at most 16 calls and 1,048,576 output bytes for the paginated, purpose-bounded large-context case

Simpler blocked cases keep smaller case-specific limits. The evaluation host also enforces the shared operating profiles and absolute containment ceilings documented in [Compatibility and local tooling](/docs/compatibility-and-local-tooling/). Actor and judge stages use `xhigh` reasoning with a fifteen-minute timeout.

Both roles receive the evaluator-owned closed-host instruction before the task. Skill discovery and caller overrides are disabled. Runtime cases use local installed-adapter, package, and source fixtures. Semantic, qualification, and judge stages have no network exception for compatibility publications or other evidence.

Recognized machine commands must use the installed skill's `scripts/moldea-cli.mjs` launcher with an absolute repository root, `--json`, and the required output boundary. Bare, package-manager, unbounded, escaped, filtered, piped, substituted, looped, parsed, or aggregated forms do not establish proof. Each page repeats the same standalone operation with the immediately preceding raw cursor and the 65,536-byte boundary; traversal is complete only when the final raw envelope returns a null cursor.

Relationship cases start from valid adopted repositories. The first bounded `scope` call is the candidate-owner inventory. The actor selects the smallest affected owner set, preferring exact relationships over broad globs unless both contracts change. It does not follow `scope` with `inspect`; remaining calls read only implicated content and validate when needed. Ordinary Git-style task paths are normalized before matching, then sent to the CLI as leading-slash repository-logical paths.

Direct compression uses at most one content-free `inspect` and one `content` call per distinct in-scope record. It never repeats a path, requests manifest content, or keeps reading after evidence establishes a consequential conflict. Every adopted fixture includes the current managed README bridge so relationship-only relevance remains discoverable while unrelated cases still stop before any CLI or workflow-reference read.

When correctness-test evidence is required, only one static repository-root `node --test` invocation over explicit portable colocated paths is recognized. Success contributes one `node-test-summary` fact and requires exit code 0, a complete native summary, at least one test, every discovered test passing, and no failures, cancellations, skips, or todos. Raw commands, names, assertions, paths, durations, and output are discarded. Package-manager commands cannot supply this evidence. Unrecognized, incomplete, contradictory, failed, or oversized output supplies no result fact.

## Repository and evidence identity

Actors work in isolated writable repositories. The installed skill, evaluator boundaries, and Git control state are read-only. Pre- and post-execution evidence covers ordinary files, Git index and refs, repository and Git configuration, submodule control state, the portable skill, and declared related-repository mounts. Any protected or ordinary repository mutation fails a read-only case regardless of the final response.

Protocol 25 accepts current assurance only when the schema-9 evidence matches the current suite, portable bytes, CLI closure, runner, coverage map, resource profiles, and role-specific host contract. Actor identity also binds the case, prompt, fixtures, scenario evidence, related mount state, protocol, and exact host. Judge identity additionally binds its prompt and complete projected actor evidence. Reuse requires every behavior-bearing input to match byte-for-byte; otherwise it is a cache miss.

A reused stage retains its original time, source attempt and commit, evidence and stage digests, trial identity, and `reused` origin. The current runner rematerializes fixtures, reruns repository and mount controls, and verifies the committed artifact. Independently passing or recovered groups from a valid committed failed attempt may be reused. Failed, incomplete, tampered, or uncommitted groups may not. Reuse is never labeled as a new model call.

Public replay pages support structurally valid protocol-25 attempts matching the 74-case contract, including authenticated pins. Current assurance still requires the latest attempt to match every active identity. Attempt storage is append-only within a release cycle. Failed initial semantic trials remain visible and recover only after two passing confirmations; operational retries do not count as semantic trials.

Fresh evidence is the default. A maintainer may instead pin a passing immutable release tag or full commit while acknowledging that the older run did not test changed behavior. Semantic and qualification evidence are selected independently. See [Release evidence](/docs/release-evidence/) for pinning and integrity requirements.

## Run the free preflight

```bash
npm run eval:semantic:preflight
```

Preflight validates case definitions, source evidence, portable structure, CLI identity, resource budgets, and repository setup without a model call. It reports ordered paid case IDs; total, reusable, and remaining stage counts; confirmation and retry limits; candidate token maximum; next-stage reservation; and absolute containment.

Each tool-using invocation is capped at 2,097,152 input-plus-output tokens. Before a paid stage, the runner reserves that complete amount and launches only when recorded direct consumption plus the reservation is at or below the 32,000,000-token candidate ceiling. Equality passes; one token beyond stops before launch and preserves resumable state. Reused stages add no new consumption. Cached input is reported separately. The larger theoretical protocol envelope is containment, not a forecast or spending estimate.

## Diagnose, record, and verify

Run one non-recording case diagnostic with:

```bash
npm run eval:semantic -- --case <case-id>
```

Its content-free JSON includes the verdict; observed and forbidden criterion IDs; a UTF-8-safe rationale excerpt with truncation state; separate actor and judge policy aggregates; and resource and token evidence. Output is capped at 65,536 UTF-8 bytes. Running `npm run eval:semantic` without `--case` or `--record` fails before host discovery and makes no model call.

For shared failures, collect a complete bounded diagnostic batch before editing:

```bash
npm run eval:semantic:diagnose -- --all
npm run eval:semantic:diagnose -- --cases <comma-separated-case-ids>
npm run eval:semantic:diagnose -- --claims <comma-separated-claim-ids>
npm run eval:semantic:diagnose -- --unresolved-from <attempt-id>
```

Exactly one selector is required. Diagnostics run one initial actor and judge trial per case without confirmations, reuse, or official evidence writes. They accept `--workers 1`, `--workers 2`, or `--workers 4` and default to four isolated workers. Worker count is operational, so resume may use two and then one worker without repeating completed stages. `--resume-stopped-stage` authorizes one additional attempt for the terminal stopped stage; `--restart` discards only the matching diagnostic state.

Each worker has a 2 GiB temporary-storage ceiling. Four may reserve at most 8 GiB while preserving a 2 GiB free-space floor. The coordinator stops new dispatch on operational or capacity failure, drains active siblings, and preserves checkpoints. Each coordinator, content-free ledger, and private worker checkpoint is capped at 1 MiB, producing a 6 MiB maximum for four-worker diagnostic metadata. Explanations are capped at 4,096 UTF-8 bytes and final output at 16,384 bytes. The ledger contains IDs, verdicts, criteria, deterministic explanations, aggregate resources, and operational counts, never prompts, rationale, commands, output bodies, repository content, or workspace paths.

After corrections and deterministic checks pass, rerun only residual cases. Diagnostic passes are never promoted. Record official evidence only after the targeted gate is green:

```bash
npm run eval:semantic -- --record --workers 4
npm run eval:semantic:verify
```

Recording accepts the same worker counts, defaults to four, completes missing initial cases before confirmations, and writes one immutable complete attempt whether it passes or fails. Semantic failures do not stop the suite. Operational exhaustion and pre-launch resource stops preserve resumable state. After the automatic retry is exhausted, the same command refuses to rerun the stage unless `--resume-stopped-stage` explicitly grants one more attempt. Every terminal failure is charged as a complete 2,097,152-token invocation. Only a complete passing candidate becomes current release evidence; verification recalculates every digest and rejects missing, stale, incomplete, over-budget, or mutated evidence.

## Relationship to adapter qualification

Semantic evaluation owns universal skill behavior and runs once. [Adapter qualification](/docs/adapter-qualification/) owns current adapter compatibility and repair behavior. Its Custom profile contains 12 universal qualification journeys, while each published adapter owns only its 2 direct cases.
