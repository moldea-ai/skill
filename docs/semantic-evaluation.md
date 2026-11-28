---
title: Semantic evaluation
navigationTitle: Semantic evaluation
description: How maintainers define, inspect, record, and publish semantic evidence for the portable skill.
section: reference
order: 172
---

# Semantic evaluation

Semantic evaluation observes how a coding agent applies the portable skill in repository tasks. Deterministic checks cover the skill files, CLI contracts, fixtures, and evaluator plumbing. The [current release selection](/docs/release-evidence/#current-selection) links to the selected case outcomes and their recorded provenance.

## Cases and coverage

Cases pair a bounded repository fixture and a developer request with explicit criteria. Multi-turn cases preserve the request sequence and compare reported progress with workspace changes and validation events. The catalogue covers guided Initialize, Maintain, context routing, agent work, Check/Fix, validation, and requests outside the skill's scope. The case review in `src/semantic/audit.md` records dispositions and the approved catalogue digest.

An official recording selects eligible public cases. Private diagnostic batches can exercise individual definitions for triage. The commands below inspect the catalogue and validate completed local run bundles without starting model hosts.

```bash
npm run eval:semantic:preflight
npm run eval:semantic:verify
```

Preflight reports the skill artifact, case suite, and coverage digests. Before paid work, record these identities, the source commit, the ordered case selection, the evaluator and fixture inputs, and the effective host settings. The semantic actor and judge both use `gpt-6.2-sol` at `xhigh`. Repo-owned tests cover those command settings without model calls.

## Isolation and bounded evidence

The actor and judge run in isolated homes on Linux. Related repositories and evaluator controls are mounted read-only. The evaluator verifies workspace and Git state, retains bounded evidence, and cleans up its trial workspaces. See [Testing](/docs/testing/) for host dependencies and deterministic qualification.

Public evidence contains structured outcomes, observed skill operations, workspace changes, and usage summaries. Private event and Git sidecars retain bounded, redacted diagnostics for triage under `.evidence/private-semantic/`. A resume requires complete capture and matching inputs. Keep these sidecars with the private attempt and its charge ledger.

The runner counts Git attempts blocked before execution when their private records establish the ledger rejection. Those attempts supply no proof that Git ran. An unexplained capture mismatch records an evaluator error for that trial and leaves it eligible for normal confirmation. Recorded usage and unresolved reservations remain in the charge ledger. Other cases continue under the same admission limits.

The judge receives bounded descriptions of recognized Node assertions that the runner observed, with their verdicts. An unsupported, skipped, or ambiguous assertion establishes no behavior. The judge also sees observed bundled helper results from compound commands, with each child's own exit status. Raw command text, output, and process identities stay in private capture.

Cases compare each turn's workspace and Git controls independently of the actor's report. Case-owned workspace checks can verify specific outcomes from the actual files. The Fix convergence case also checks that the final workspace is byte-identical and runs the bundled relevance gate and Scope against a guide-only path and a governed edition source.

### Resource accounting

The ordinary profile counts bundled CLI calls, bundled helper calls, and reads and writes under `moldea/`. The large-traversal profile also counts other source reads toward its host command and visible output limits. The aggregate skill output limit is 512 KiB for the ordinary profile and 1 MiB for large traversal. Case-specific CLI budgets track calls and output from the bundled CLI.

An ordinary cycle can exempt one final `validate` within a 65,536-byte page. The event stream must place a write under `moldea/` before the validation and establish that validation is the final skill operation, with no later `moldea/` changes. Large-traversal cycles apply the normal limits throughout.

Each developer request starts a grading cycle. The first cycle counts reported input plus output. Resumed cycles subtract cached input from the grading total. The operating token threshold is 1,625,000 per cycle and the absolute ceiling is 2,097,152. Paid accounting always uses reported input plus output, including cached input once.

## Diagnose and record

Use a one-case diagnostic batch to confirm the actor and judge identities and capture mechanics before official qualification. This writes a private diagnostic archive.

```bash
npm run eval:semantic:diagnose -- --cases <case-id> --workers 1 --token-limit <attempt-total>
```

Diagnostic batches accept exactly one selector. Use `--all`, `--cases`, `--claims`, or `--unresolved-from`. To inspect a single case without a checkpoint, use `npm run eval:semantic -- --case <case-id>`.

Use `--record` for the official public selection and `--record --cases` for cases affected by a candidate fix or a change to a request or behavior-relevant fixture.

```bash
npm run eval:semantic -- --record --workers 4 --token-limit <attempt-total>
npm run eval:semantic -- --record --cases <comma-separated-case-ids> --workers 4 --token-limit <attempt-total>
```

The batch commands support 1, 2, or 4 workers. Every selected case completes its initial trial before any confirmations start. Cases resolve concurrently, with confirmations sequential within each case. Eligible semantic and resource failures proceed through the confirmation quorum. Command-policy, integrity, and operational failures retain their own outcomes.

For long campaigns, use an independent operator terminal or a named `systemd-run --user` service. Set the working directory to the repository, pass the active Node executable and required host settings, and retain private append-only stdout and stderr logs. Use `Type=exec`, `Restart=no`, `RemainAfterExit=yes`, and `UMask=0077`. Record the exact command, unit, process identity, and Codex version. Check the terminal status and retained evidence before releasing the unit. SIGTERM requests graceful cancellation and checkpoint drainage.

## Token admission and resume

Set each attempt's `--token-limit` to a positive integer within the 128,000,000-token admission ceiling and the authorized campaign allowance. The default is the admission ceiling. To set a fresh attempt's limit, subtract the verified charges for the other attempts from the campaign allowance. The runner reserves the absolute stage allowance before starting each model call, then replaces it with reported input plus output when available. An interrupted call without usable counts retains the reserved amount.

An active attempt stores its candidate identity, completed trials, in-flight stages, and paid charges in `.evidence/semantic/checkpoint.json`. Run the matching command to resume with the same inputs, selection, worker count, and token limit. Preserve the checkpoint and charges if its inputs cannot be verified or changed. An exhausted model-call retry uses `--resume-stopped-stage` for one additional call with explicit authorization.

When an official attempt stops at token admission, retain its checkpoint and leave the candidate untagged. After developer authorization, ordinary `--record` can resume the same input with a higher attempt total inside both limits. The new total includes charges in its checkpoint. Subtract only charges for other attempts when allocating it. If the remaining allowance cannot cover the work, retain the checkpoint and report the shortfall.

Use `--record --max-public-failures 8` to stop admitting paid stages on the ninth distinct terminal public failure. Confirmation-eligible failures count only once their case reaches a failing quorum. A completed failure counts even while its result waits for an earlier case in the commit order. Calls already running can finish and their charges stay in the checkpoint. The failure limit is part of the attempt identity and the stopped checkpoint refuses further stages on resume.

## Compose selected results

After reviewing a completed official attempt, use an explicit list to select cases with an initial pass or a confirmed recovery. Inspect the preview before writing the composition. Verify that each retained verdict and trial comes from the reviewed attempt on the release artifact.

```bash
npm run eval:semantic:compose -- --sources <attempt-id> --cases <comma-separated-case-ids> --preview
npm run eval:semantic:compose -- --sources <attempt-id> --cases <comma-separated-case-ids>
```

When authorized targeted recordings supply results from multiple official attempts, use `--sources <comma-separated-attempt-ids> --review <review-path>` to specify which source owns each case. Document the reason for any selected trial from different skill bytes and preserve its source and artifact digest.

Completed diagnostics remain private under `.evidence/semantic/diagnostics/` for triage. Completed official recordings and compositions are stored under `.evidence/runs/semantic/` and can be packed through the [release evidence procedure](/docs/release-evidence/).
