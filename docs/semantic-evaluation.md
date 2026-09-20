---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: How maintainers define, inspect, record, and publish semantic evidence for the portable skill.
section: reference
order: 172
---

# Semantic evaluation

Semantic evaluation tests whether a coding agent applies the portable skill correctly in realistic repository tasks. It complements deterministic tests, which prove schemas, generated files, command contracts, and resource boundaries without model execution.

## Cases and coverage

Each case owns its definition at `src/semantic/cases/<case-id>/case.ts`. The module exports one typed `semanticCase` with the request, repository evidence declarations, expected and forbidden behavior, resource budget, coverage claims, and setup callback. The runner discovers these directories, validates unique IDs, and derives the coverage map. There is no fixed case count, central case catalog, disposition list, or website registration step.

To add a case, add its directory and `case.ts`, plus any fixture files used only by that case. The setup callback prepares the isolated repository before its Git baseline is captured. A loader integration test proves that an additional valid case is discovered without changing a registry.

The actor receives the natural request and portable skill, but never the grading criteria. The independent judge receives the criteria and runner-owned projected evidence. Semantic, resource, command-policy, repository-control, mount-integrity, and operational results remain separate dimensions, and overall pass is their conjunction.

## Isolation and bounded evidence

Actor and judge stages run in isolated homes. Related repositories and evaluator-owned controls are mounted read-only. The runner snapshots the working repository and Git control state before and after actor execution, checks related mounts for changes, and removes its temporary workspace after the trial.

Raw command text and output are not recorded. The host projects bounded command-policy counts, recognized `moldea` operations, aggregate output sizes, and reported token usage. Shared resource profiles enforce per-stage output, command, token, temporary-storage, and free-space limits. Operational failures receive one bounded retry. Only a semantic-only failure is eligible for confirmation trials.

Recording and diagnostic batches complete every selected initial trial before starting case resolution. Cases run concurrently within both phases. During resolution, each eligible case runs its confirmations sequentially until it reaches the shared quorum; cases do not wait for a global confirmation round before continuing.

Private checkpoints live at `.evidence/semantic/checkpoint.json`. Matching recording and diagnostic-batch commands retain their attempt identity, ordered completed-case prefix, out-of-order worker results, completed trials, and current actor or judge boundary. An interruption during the initial phase starts no confirmations. An interruption during resolution preserves the complete initial set and every durably recorded confirmation, although concurrently resolving cases may have reached different confirmation indices. Resume skips durable work; only a model operation that had not reached its checkpoint boundary may need to run again. A model stage receives one automatic retry; after that retry is exhausted, `--resume-stopped-stage` authorizes exactly one additional call. Use `--restart` to discard the checkpoint instead. An identity mismatch is rejected. Completed local bundles live below `.evidence/runs/semantic/`. The runner considers at most the newest 64 local bundles for reuse and reuses only a passing actor-and-judge pair whose host commands, prompts, fixtures, case definition, portable artifact, CLI identity, protocol, resource profiles, and projected actor evidence match exactly. Public bundles are not backups for this private resume and reuse state.

## Deterministic inspection

The preflight inspects current definitions and identities without starting a model host:

```bash
npm run eval:semantic:preflight
```

Local completed bundles can be revalidated without model execution:

```bash
npm run eval:semantic:verify
```

These commands do not establish new behavioral assurance. They only inspect the current suite or previously recorded local data.

## Diagnose and record

One case can be run without recording:

```bash
npm run eval:semantic -- --case <case-id>
```

This targeted command does not create a candidate checkpoint. If it is interrupted, rerun the case from the beginning.

Bounded diagnostic batches accept exactly one selector:

```bash
npm run eval:semantic:diagnose -- --all
npm run eval:semantic:diagnose -- --cases <comma-separated-case-ids>
npm run eval:semantic:diagnose -- --claims <comma-separated-claim-ids>
npm run eval:semantic:diagnose -- --unresolved-from <attempt-id>
```

Diagnostic batches use the same worker and recovery controls as recording:

```bash
npm run eval:semantic:diagnose -- --all --workers 2
npm run eval:semantic:diagnose -- --all --resume-stopped-stage
npm run eval:semantic:diagnose -- --all --restart
```

Recording writes a complete local attempt and preserves actual failed outcomes:

```bash
npm run eval:semantic -- --record --workers 4
npm run eval:semantic -- --record --resume-stopped-stage
npm run eval:semantic -- --record --restart
```

Worker counts are limited to 1, 2, or 4. Concurrent workers reserve the absolute next-stage token allowance before each model call, and the complete candidate stops before it could exceed 32,000,000 paid tokens. Semantic failures do not stop the remaining cases. Successful recording removes the checkpoint and stores a self-contained local public bundle with its exact case definitions, trials, replay, downloadable evidence artifacts, version, date, and provenance. No command runs automatically as part of website generation.

## Website and release use

The website never loads current case modules. It renders only the semantic bundle selected in `evidence/selection.json`, so adding, editing, or removing current cases cannot change an older selected snapshot. Failed official evidence can be published and selected for an honest public result, while release assurance still requires a passing official bundle.

See [Release evidence](/docs/release-evidence/) for packing, publication, selection, and preparation. Adapter-specific compatibility remains owned by [Adapter qualification](/docs/adapter-qualification/).
