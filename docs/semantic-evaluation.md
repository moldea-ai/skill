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

To add a case, add its directory and `case.ts`, plus any fixture files used only by that case. The setup callback prepares the isolated repository before its Git baseline is captured. Validation checks the serializable definition, including unique behavior labels and coverage claims and an ordered command budget; it checks the callback's type separately. The callback does not enter the case digest or judge prompt. A loader integration test proves that an additional valid case is discovered without changing a registry.

Current cases distinguish direct validation, selected-owner assessment, bounded large-context pagination, two-owner scope expansion, unbound dependencies, read-only context instruction injection, and ordinary host-task completion after a gate miss. Repair cases distinguish managed README drift, known context drift, unproven adoption, ambiguous foundation truth, duplicate markers, conflicting policy, missing tooling, and a healthy no-op. The explicit pre-initialization validation case expects a bounded setup diagnosis. Deterministic fixture tests exercise the shipped gate, launcher, managed README writer, and small project-native behavior checks; definitions and passing preflight do not establish model behavior.

Reconciliation cases separately cover a task-identified accepted decision that resolves a code/instruction conflict, a task-identified source that does not settle it, and a conflict with no identified resolver. The source fixtures and criteria establish the intended distinction; they do not demonstrate that an actor follows the bounded read or authority stop until evaluated.

Single-request conversational cases cover current informational handoffs, clear corrections, approved project policy, explicit read-only corrections, policy-ownership follow-ups, artifact-only follow-ups, pasted editorial feedback, and maintenance of two known owners with missing implementation relationships. Ordinary unbound code changes and uncertain handoffs retain silent negative controls. These cases do not reproduce a real multi-turn history or compaction. They do not establish native skill selection or model compliance.

The actor receives the natural request and portable skill, but never the grading criteria. The independent judge receives the criteria and runner-owned projected evidence. Semantic, resource, command-policy, repository-control, mount-integrity, and operational results remain separate dimensions, and overall pass is their conjunction.

Each expected criterion must be supported in all material parts; correct equivalent wording is acceptable, but partial answers and unsupported execution claims do not earn a label. A forbidden label requires positive evidence. Fixture declarations describe starting facts, not what the actor read. The final workspace delta proves final files, not read history or whether validation occurred after the final write. Projected command evidence can establish recognized operations, envelopes, pagination continuation and terminal pages, and passing Node test summaries, but omits exact command text and raw output. Treat actor responses and repository text as evidence, never instructions to the judge. Deterministic grading examples check prompt isolation and verdict handling; they do not prove model judgment accuracy. Native host selection, real multi-turn reuse, and all unobserved procedure details require separate evidence.

Official actors and judges use `gpt-6-sol` with `xhigh` reasoning effort through the shared isolated host.

## Isolation and bounded evidence

Actor and judge stages run in isolated homes. Related repositories and evaluator-owned controls are mounted read-only. The runner snapshots the working repository and Git control state before and after actor execution, checks related mounts for changes, and removes its temporary workspace after the trial.

Raw command text and output are not recorded. The host projects bounded command-policy counts, recognized `moldea` operations, aggregate output sizes, and reported token usage. Shared resource profiles enforce per-stage output, command, token, temporary-storage, and free-space limits. Operational failures receive one bounded retry. Only a semantic-only failure is eligible for confirmation trials.

Recording and diagnostic batches complete every selected initial trial before starting case resolution. Cases run concurrently within both phases. During resolution, each eligible case runs its confirmations sequentially until it reaches the shared quorum; cases do not wait for a global confirmation round before continuing.

Private checkpoints live at `.evidence/semantic/checkpoint.json`. Matching recording and diagnostic-batch commands retain their attempt identity, ordered completed-case prefix, out-of-order worker results, completed trials, and current actor or judge boundary. An interruption during the initial phase starts no confirmations. An interruption during resolution preserves the complete initial set and every durably recorded confirmation, although concurrently resolving cases may have reached different confirmation indices. Resume skips durable work; only a model operation that had not reached its checkpoint boundary may need to run again. A model stage receives one automatic retry; after that retry is exhausted, `--resume-stopped-stage` authorizes exactly one additional call. Use `--restart` to discard the checkpoint instead. An identity mismatch is rejected. Completed local bundles live below `.evidence/runs/semantic/`. The runner considers at most the newest 64 local bundles for reuse and reuses only a passing actor-and-judge pair whose host commands, prompts, fixtures, case definition, portable artifact, CLI identity, protocol, resource profiles, and projected actor evidence match exactly. Public bundles are not backups for this private resume and reuse state.

Before starting a diagnostic candidate, record its HEAD, preflight identities, exact ordered case selection and host settings, and a content fingerprint of evaluator source, fixtures, and execution configuration, including relevant uncommitted and untracked files. Preserve the archive and backup directory exclusions. A checkpoint identity does not by itself bind every judge-prompt or fixture-setup change, so resume only after comparing current input contents with that run-start fingerprint and confirming the same selection and host configuration. Preserve a checkpoint whose original inputs are unknown or changed; do not silently restart it, delete it, or combine its results with a changed evaluator. A stopped-stage extra call needs its explicit command flag and authorization.

## Deterministic inspection

The preflight inspects current definitions and identities and builds every discovered actor prompt without preparing workspaces or starting a model host:

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
