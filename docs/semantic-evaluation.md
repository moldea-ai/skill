---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: How the current portable skill is tested for relevance, bounded evidence use, read-only behavior, and concise reporting.
section: reference
order: 172
---

# Semantic evaluation

Deterministic tests can prove schemas, files, commands, and byte limits. Semantic evaluation tests whether a coding agent applies those contracts correctly inside realistic repository tasks.

The active suite contains 74 cases. It restores all 57 scenarios from the former suite, retains 17 scenarios added by the resource-bounded redesign, and counts the one shared scenario only once. `fixtures/semantic-evaluation-dispositions.json` records the clean-slate disposition of every former identifier so a reduced suite cannot silently replace established coverage again.

## What the suite proves

The cases cover:

- `moldea`-only silent abstention while unrelated documentation and source reviews continue normally
- `moldea`-only silent abstention while README changes outside the managed block continue normally
- host planning and review command precedence
- no activation from generic durable-knowledge language
- direct activation for canonical files and the managed README block
- bounded relationship activation for exact bindings and `affectedBy` paths
- explicit `moldea` validation
- valid zero-agent projects
- large canonical inventories without full-content inspection
- read-only evaluation across repository and Git control state
- initialization from insufficient, partial, and sufficient evidence
- canonical maintenance, reconciliation, compression, and exact relationship behavior
- Agent Skill creation, maintenance, distribution, and script-authority boundaries
- grounded agent-system planning and runtime selection
- provider capability and routing-description ownership
- package-manager, Git-helper, host-command, and related-repository safety

Each case defines a natural developer request, sourced repository facts, expected behavior, prohibited behavior, and a resource budget. The actor receives the request and the portable skill. It does not receive the answer criteria.

A separate judge receives the declared criteria plus runner-owned evidence. No actor response can manufacture command evidence, repository state, or byte counts.

## Resource evidence

For every completed actor and judge command, the runner observes the command and output in memory, projects only safe facts, and discards raw command text and output bodies.

The committed result records:

- number and order of recognized `moldea` operations
- emitted `moldea` bytes
- maximum bytes emitted by one recognized invocation
- total model-visible tool-output bytes
- actor and judge command-policy status with bounded reason codes and counts
- completed host-command count and total input-plus-output model tokens
- whether a non-content command attempted to return canonical content

Abstention cases require zero recognized `moldea` commands and zero `moldea` bytes. Each semantic case owns its exact activation and `moldea` budget. The activation label records how the case became eligible; it does not require a CLI call when independent artifact evidence owns the operation. Direct Agent Skill artifact cases therefore use exact zero-call budgets when repository validation would add no relevant fact. A direct case may begin with `scope` when explicit `moldea` intent targets ordinary repository paths, while a relationship case always begins with `scope` and never uses `inspect`. Other ordinary direct and relationship cases permit at most four `moldea` calls and 262,144 `moldea`-output bytes. The dedicated large-context case permits at most 16 calls and 1,048,576 output bytes while still requiring paginated, purpose-bounded traversal. The evaluation host separately enforces its absolute command, output, and token containment ceilings. Each actor and judge stage has a finite fifteen-minute timeout. Actors use `high` reasoning and independent judges use `xhigh` reasoning.

When pre-adoption abstention consumes the complete request, the actor reports only a neutral repository outcome such as `No files were changed.` It does not name `moldea`, describe an unavailable operation or result, or recommend initialization. When an independent host review remains, the actor completes that review and reports its normal actionable findings without mentioning `moldea`.

Initialization writes its complete foundation before the first CLI call, using the exact minimal `version: 1` manifest when no relationship is evidenced, then uses one final `validate`. It stops on success; one diagnostic-driven correction and validation retry is the only structural retry. It does not follow successful validation with `inspect`.

Case budgets are declared in `fixtures/conformance-cases.json`; their maximum values and the evaluation host's absolute containment ceilings are owned by `tooling/resource-calibration/profiles.mjs`. `fixtures/resource-calibration.json` records deterministic CLI and repository-operation measurements for ordinary, 1,024-path, large-Unicode, diagnostic-heavy, and adversarial inputs, with at least 25 percent cumulative headroom for non-attack cases. It does not stand in for complete model-stage calibration. `fixtures/model-stage-resource-calibration.json` separately preserves a self-contained privacy-safe record of aggregate observations from judged qualification and proves at least 25 percent cumulative operating headroom without retaining commands, output bodies, or an active qualification-result dependency.

Recognized machine commands must use the installed skill's `scripts/moldea-cli.mjs` launcher with an absolute repository root, `--json`, and the required output boundary. Bare, package-manager, unbounded, escaped, or output-filtered forms do not count as valid proof.

Paged proof keeps every page independently attributable. The actor repeats the same standalone launcher operation with the exact cursor from the immediately preceding raw envelope, keeps the 65,536-byte boundary, and may report complete traversal only after the final raw envelope returns a null cursor. Pipelines, command substitutions, scripted loops, parsers, filters, and aggregate wrappers do not establish page-level proof.

Relationship cases begin from structurally valid adopted repositories. Their first CLI operation is one bounded `scope` call, which serves as the complete relevant-owner inventory instead of being followed by `inspect`. That call is included in the four-command ordinary budget; any remaining calls are limited to necessary validation and explicitly selected owner content.

Every adopted semantic repository contains the current managed README discovery bridge. This proves that repository-aware hosts can select the cheap gate even when a relationship is visible only inside the manifest, while unrelated cases must still stop before any CLI call or workflow-reference load.

Relationship cases begin from ordinary Git-style task paths. They cover both a host-provided changed path and an unchanged path explicitly named by the developer. The gate normalizes those repository-relative spellings before Core matching, and the actor must use the corresponding leading-slash repository-logical paths for the CLI query. This prevents false abstention without weakening canonical manifest path validation or adding `moldea`-owned Git discovery.

The runner records semantic, resource, command-policy, repository-control, read-only-mount, and operational results as separate dimensions. Overall pass is their strict conjunction. Only a semantic failure with every other dimension passing is eligible for confirmation; deterministic, resource, policy, repository, mount, and operational failures are terminal and do not spend confirmation calls. The judge evaluates only the behavioral clauses and projected command-result facts. It must not reinterpret the total host command count or output from non-`moldea` commands as `moldea` resource consumption.

When a criterion requires a repository correctness test, the runner recognizes only one static repository-root Node test invocation over portable colocated test paths, `npm test`, or `npm run test:integration`. A successful command contributes one `node-test-summary` fact containing the recognized test level and native aggregate counts. Projection requires a zero exit code, a complete native summary, at least one test, every discovered test passing, and zero failures, cancellations, skips, or todo results. Raw command text, test names, assertions, paths, durations, npm preambles, and output bodies are discarded. Unrecognized, incomplete, contradictory, failed, or oversized output supplies no result fact.

## Repository controls

The actor works in an isolated writable repository. The installed skill, Git control state, and evaluator-owned boundaries are read-only. The runner captures pre- and post-execution evidence for:

- ordinary repository files
- the Git index and refs
- repository and Git configuration
- submodule control state
- the installed portable skill
- any declared related repository mount

The read-only case fails if evaluation changes any protected or ordinary repository state, even when the actor's final message claims otherwise.

## Fresh evidence by default

Semantic protocol 24 accepts only schema-8 evidence produced by the current suite, current portable bytes, current CLI closure, current runner, current coverage map, current resource profiles, and current role-specific host contract. Active routes, pointers, and derived results are generated solely from that contract.

Evidence applies only to exact behavior-bearing actor and judge stage identities. Actor identity binds the portable skill bytes, case definition, natural prompt, deterministic fixture, scenario evidence, complete related-repository mount state, resource-profile file, CLI closure, protocol, and exact host. The source resource profile is read from the immutable commit that contains the reused evidence rather than inferred from the current checkout. Judge identity additionally binds its exact prompt and the complete projected actor evidence it assessed. A verified immutable stage may be reused only when all of those inputs match byte-for-byte. Every mismatch is a cache miss.

Reused stages retain their original evaluation time and carry the source attempt, source commit, evidence digest, trial identity, stage identity, and explicit `reused` origin. The current runner rematerializes deterministic fixtures, reruns repository and read-only-mount controls, and verifies the committed source artifact before accepting reuse. An independently passing or recovered case group may come from a valid committed failed attempt; failed, incomplete, tampered, or uncommitted case groups remain ineligible. The runner never labels reuse as a new model invocation.

The public evidence site generates routes, search records, and visible history only for attempts matching the active evaluation contract.

This is the normal release path. A maintainer may explicitly pin a release to valid passing evidence from an earlier immutable release when the current change cannot affect evaluated behavior. A pin is presented as pinned evidence, never as a fresh run, and must pass the source integrity and resource checks described in [Release evidence](/docs/release-evidence/).

Attempt storage remains append-only during one current release cycle. Failed initial trials remain visible, and a failed case can recover only after two passing confirmations. Operational host retries do not consume semantic trials.

## Run the free preflight

```bash
npm run eval:semantic:preflight
```

Preflight validates all case definitions, source evidence, portable skill structure, CLI identity, resource budgets, and repository setup without making a model call.

It also prints the ordered paid case IDs, total initial stage count, exact reusable case and stage counts, remaining paid initial stage count, confirmation-inclusive paid stage limit, retry-inclusive invocation limit, candidate paid-token maximum, next-stage reservation, and absolute token containment limit. These are deliberately named limits, not forecasts. The paid IDs make source invalidation reviewable before model execution instead of requiring private instrumentation. The confirmation limit assumes that every newly evaluated case needs two confirmation trials after its initial trial, while the invocation limit additionally assumes that every paid actor and judge stage consumes its one bounded operational retry. Each completed tool-using Codex invocation may report at most 2,097,152 cumulative input-plus-output tokens. Before every paid stage, the runner reserves that complete per-invocation maximum and launches only when recorded direct consumption plus the reservation is at or below the 32,000,000-token candidate ceiling. Equality is accepted; one token beyond it stops before launch and preserves the resumable candidate. Reused stages do not count as new work. The larger aggregate containment limit describes the theoretical protocol envelope if every permitted invocation reached its individual ceiling, so it must not be presented as expected consumption or spend. The per-invocation ceiling was selected above an observed 1,264,666-token qualification stage so normal tool-using work retains more than 25 percent headroom. Cached input is reported separately without being added to input a second time.

## Record and verify

Use one explicit case for a non-recording diagnostic:

```bash
npm run eval:semantic -- --case <case-id>
```

The diagnostic emits one content-free JSON result with the verdict, complete observed and forbidden criterion identifiers, a UTF-8-safe rationale excerpt with explicit truncation state, and separate actor and judge command-policy aggregates plus resource and token evidence. Policy aggregates contain only statuses, bounded reason codes, and counts. Output cannot exceed 65,536 UTF-8 bytes. Running `npm run eval:semantic` without `--case` or `--record` fails before host discovery and makes no model call.

## Correct failures efficiently

Do not restart the complete paid suite after each correction. Run one sequential diagnostic batch and collect every failure before editing so one correction can address shared causes:

```bash
npm run eval:semantic:diagnose -- --all
npm run eval:semantic:diagnose -- --cases <comma-separated-case-ids>
npm run eval:semantic:diagnose -- --claims <comma-separated-claim-ids>
npm run eval:semantic:diagnose -- --unresolved-from <attempt-id>
```

Exactly one selector is required. The batch performs one initial actor and judge trial per selected case, without confirmations, evidence reuse, or official evidence writes. It checkpoints after actor and judge boundaries, resumes only when the complete identity and selection match, continues across semantic failures, and stops when an operational failure exhausts its bounded retry. The terminal failed invocation is persisted before exit, and an ordinary rerun refuses to repeat it. Add `--resume-stopped-stage` to the same exact command to authorize one additional attempt; if that attempt fails, the checkpoint stops again. Use `--restart` only to discard the current diagnostic batch intentionally.

The ignored diagnostic state has two independently bounded artifacts. A private in-flight checkpoint retains exact identity, selection, progress, and at most one active full trial under a 1,048,576-byte limit. A separate completed ledger retains only case IDs, verdicts, criteria identifiers, deterministic content-free explanations, aggregate resource counts, and operational-failure counts under its own 1,048,576-byte limit. The model-authored rationale is never copied into the completed ledger. Each content-free explanation is limited to 4,096 UTF-8 bytes. Successful completion deletes the private checkpoint and prints at most 16,384 UTF-8 bytes. These state and transport limits do not cap repository size or cumulative paged analysis.

After the batch correction passes deterministic checks and is published, rerun only the residual failed case IDs. If another residual remains, collect the complete residual set before the next edit. Start one official recording only after the targeted gate is green. Diagnostic passes are never promoted or reused as evidence. Official recording may reuse independently passing or recovered groups from committed attempts only when every behavior-bearing stage identity still matches the final inputs; otherwise it executes them again.

One model-bearing process at a time is the default. Running cases concurrently can multiply memory, temporary disk, provider quota, and token peaks. Concurrency should increase only after measured aggregate capacity is encoded in source-controlled resource limits.

The complete paid suite requires explicit recording:

```bash
npm run eval:semantic -- --record
npm run eval:semantic:verify
```

Recording completes every missing initial case in fixture order before running confirmations, then records one immutable complete attempt whether it passes or fails. It continues across semantic failures; exhausted operational retries and pre-launch resource stops preserve exact resumable state instead of inventing results. After a stage exhausts its one automatic retry, `npm run eval:semantic -- --record` refuses to launch it again. Use `npm run eval:semantic -- --record --resume-stopped-stage` for one explicit additional attempt. Each terminal failure is recorded and conservatively charged as a complete 2,097,152-token invocation, so repeated explicit resumes cannot bypass the candidate ceiling. Only a complete passing candidate is promoted as current release evidence. Verification recalculates every digest and rejects missing, stale, incomplete, over-budget, or mutated evidence.

## Relationship to adapter qualification

Semantic evaluation owns universal skill behavior and runs once. Adapter qualification owns current adapter-specific compatibility and repair behavior.

The Custom qualification profile contains the universal qualification journeys. Every published adapter profile contains only its adapter-specific cases. This separation prevents the same universal work from being multiplied across all adapter targets.
