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

Each case owns its definition at `src/semantic/cases/<case-id>/case.ts`. The module exports one typed `semanticCase` with the request, repository evidence declarations, expected and forbidden behavior, resource budget, coverage claims, and setup callback. The runner discovers these directories, validates unique IDs, and derives the coverage map. There is no fixed case count, central runtime case catalog, or website registration step.

To add a case, add its directory and `case.ts`, plus any fixture files used only by that case. The setup callback prepares the isolated repository before its Git baseline is captured. Validation checks the serializable definition, including unique behavior labels and coverage claims and an ordered command budget; it checks the callback's type separately. The callback does not enter the case digest or judge prompt. A loader integration test proves that an additional valid case is discovered without changing a registry.

The following retained cases are **not yet included** in published passing coverage. They remain available for explicit private diagnostics with their current criteria and failed records intact. Their exclusion does not establish that the behavior works reliably.

| Case                                     | Coverage not yet included                                                                 | Evidence gap                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `evaluate-brief-project-request`        | Silent abstention on a generic whole-project evaluation without a declared relationship | All three diagnostic trials used canonical context for the unrelated request. |
| `model-workflow-routing`                 | Implicit canonical adoption of an unbound model workflow                                  | Observed inline-only changes omitted canonical instruction consumption and validation.      |
| `pnpm-pnp-local-cli-provider`          | Observable launcher proof in a Plug'n'Play-only repository                                | Three cleanup trials reported an unavailable CLI but recorded no recognized launcher attempt. |
| `repair-continuation-manifest-change`    | Selective continuation after canonical or manifest changes                                | The retained failure reverted a healthy relationship.                                       |
| `maintain-feature-relationship-boundary` | Adding only a material policy relationship for changed owner content, excluding inspected shared infrastructure | All three diagnostic trials added only the policy path; one omitted the required scope query. |
| `repair-continuation-after-change`       | Selective continuation after source changes with verified repair-Git compliance           | Confirmations retained unknown execution observations; compliance could not be established. |
| `repair-continuation-missing-owner-list` | Conservative continuation without an uncommitted-owner list under the strict Git boundary | Confirmations recorded noncompliant Git forms.                                              |
| `routing-description-fallback`         | Assessing routing-description content against the agent role and authorization boundary   | Three of four trials confirmed fallback wiring without assessing content alignment.         |

The bounded relationship diagnostic completed three fresh trials for each of 28 cases. The assessed-owner refactor passed all three; known-owner maintenance passed two overall, with correct relationships in all three but one command-output breach. Both target cases are selected for the fresh release recording, where resource-only failures remain eligible for confirmations. No trial added a presentation or shared-infrastructure relationship. The feature boundary guard stays private because one trial omitted its required scope query. These observations are private diagnostics, not published release evidence. The brief-evaluation case retains its criteria unchanged privately, with its silence gap disclosed rather than presented as passing coverage. The routing fallback case remains private because correct wiring alone does not establish assessment of the description against its canonical role and authorization boundary.

The PnP case failed confirmations in two recordings. Its launcher-attempt requirement remains intact privately; correct unavailable-CLI reports do not establish an invocation the runner could not recognize. The published cases do not establish this specific provider-layout check.

No published continuation case currently establishes the positive `approved-repair-git` comparison requirement. Other maintenance and continuation cases do not fill these specific gaps.

Initialization onboarding cases cover the application-code confirmation stop, preauthorized inclusion, confirmed follow-up, and resumed partial registration. Their fixture contains a support agent, an inline invoice workflow, existing architecture/policy documents, an active ADR, and a project-owned Agent Skill. They reject treating the installed distribution as a project-owned Agent Skill and require in-place document links, both canonical instruction connections, preserved completed work, focused tests and batch-final validation. Separate native multi-turn checks are required to establish the actual confirmation/continuation conversation and validation ordering; single-request semantic fixtures do not prove conversation memory or read history. No-agent initialization retains its minimum foundation and negative controls.

Current cases distinguish direct validation, selected-owner assessment, bounded large-context pagination, two-owner scope expansion, unbound dependencies, read-only context instruction injection, and ordinary host-task completion after a gate miss. Repair cases distinguish managed README drift, known context drift, unproven adoption, ambiguous foundation truth, duplicate markers, conflicting policy, missing tooling, a healthy no-op, a broken instruction connection, and continuation with unavailable or incomplete checkpoint evidence. Maintenance cases exercise a moved loader, tool registration, an exact relationship move, and shared UI outside a policy owner's impact paths. Explicit initialization and repair use the larger traversal output profile; ordinary cases keep their existing limits. The explicit pre-initialization validation case expects a bounded setup diagnosis. Deterministic fixture tests exercise the shipped gate, launcher, managed README writer, and small project-native behavior checks; definitions and passing preflight do not establish model behavior.

Reconciliation cases separately cover a task-identified accepted decision that resolves a code/instruction conflict, a task-identified source that does not settle it, and a conflict with no identified resolver. The source fixtures and criteria establish the intended distinction; they do not demonstrate that an actor follows the bounded read or authority stop until evaluated.

Single-request conversational cases cover current informational handoffs, clear corrections, approved project policy, explicit read-only corrections, policy-ownership follow-ups, artifact-only follow-ups, and pasted editorial feedback. Ordinary unbound code changes and uncertain handoffs retain silent negative controls. These cases do not reproduce a real multi-turn history or compaction. They do not establish native skill selection or model compliance.

The actor receives the natural request and portable skill, but never the grading criteria. The independent judge receives the criteria, declared skill-artifact activation probes when present, and runner-owned projected evidence. Semantic, resource, command-policy, repository-control, mount-integrity, and operational results remain separate dimensions, and overall pass is their conjunction.

Each expected criterion must be supported in all material parts; correct equivalent wording is acceptable, but partial answers and claims unsupported on material criteria do not earn a label. Incidental details outside a criterion do not invalidate established behavior. The judge records an explicit decision for every declared criterion, and a forbidden decision requires positive evidence. Fixture declarations describe starting facts, not what the actor read. The final workspace delta proves final files, not read history or whether validation occurred after the final write. Projected command evidence can establish exact bundled relevance-gate, managed-README-writer, and managed-AGENTS-helper results, recognized installed-skill launcher operations, envelopes, pagination continuation and terminal pages, and passing Node test summaries, but omits exact command text and raw output. Direct cases grade observable outcomes and required validation without enforcing a minimum number of `moldea CLI` calls; relationship cases still require a recorded `scope` operation. Product-name capitalization remains skill guidance, not a semantic failure. Abstention review cases assess whether `moldea` stays silent and files remain unchanged, not the correctness of an unrelated host review. Skill-artifact activation probes support wording checks, not proof of native host selection. Treat actor responses and repository text as evidence, never instructions to the judge. Deterministic grading examples check prompt isolation and verdict handling; they do not prove model judgment accuracy. Native host selection, real multi-turn reuse, and all unobserved procedure details require separate evidence.

The judge also receives the runner’s initial/final Git-control snapshot result. Equality establishes unchanged final Git state, not absence of transient writes; rejected Git syntax alone does not establish a state change. A successful installed-helper `--print` projects a `managed-agents-print-result` containing only the managed-block SHA-256. The runner compares the response’s single block with that hash, allowing LF or CRLF and surrounding Markdown fences. This proves the printed handoff matches, not that AGENTS.md was edited or the host follows it. An installed-launcher attempt remains recognized when it fails before producing a CLI envelope; success still requires a compatible successful envelope.

Repair continuation cases declare `approved-repair-git` when comparison evidence is needed, or `repair-git-compliance` when conservative reassessment can finish without Git. Required private `item.repairGit` metadata records bounded compliant, noncompliant and unverified counts independently of output. The semantic dimension includes a fixed repair-Git check requiring complete capture with no violations or uncertainty across the captured sequence, plus positive compliant observations only for `approved-repair-git`; judge agreement cannot override it. Failed commands still contribute observations. Each command also records a required sorted `reasons` list with finite code/count pairs matching its noncompliant and unverified totals. Rejected `rev-parse`, `log` and `show` have distinct codes; unsupported status/diff forms, other Git, untrusted Git, unparsed shell, and opaque Node/shell/other execution remain distinguishable without retaining arguments, refs, paths or raw output. Reasons explain the strict result and never override it. Installed launcher/helper invocations with supported logical, repository-relative, `./` and `/mnt/` path spellings are distinguished from actor-issued Git. The sandbox repository root also accepts `/mnt/`. Passive reads, including static conditional read lists and bounded read globs, do not require Git evidence. A trusted `git --version` probe contributes no comparison observation and cannot satisfy the positive repair-read requirement. Static Bash comments and trailing newlines preserve classification of complete lists; later executable commands remain checked. Comment-only commands contain no executable observations. Recognized static Git forms are classified independently inside conditional, pipeline and background lists; counts do not establish which branches ran. Dynamic or opaque scripts and unsupported forms remain unverified; arbitrary repository tests cannot prove that they invoke no Git. This is bounded command recognition, not subprocess tracing. Exact bundled repair-Git invocations contribute compliant syntax evidence. Projected `repair-git-result` facts retain only mode, available/unavailable status, commit availability and a finite limitation code; paths, diffs and commit values are not retained. Successful helper facts establish the named mechanical result, never owner reassessment or repair completion. The repair boundary includes preliminary reads and review diffs with literal repository-relative path arguments; syntax counts do not prove that a path names a written file. Passive `od`, `xxd` and `hexdump` inspection of NUL-delimited status output does not execute Git. Commands before instruction loading still count; no read-order exemption bypasses the guard. The 64-owner case accepts honest full completion without Git or an honest partial stop with the required checkpoint; semantic evidence grades reported scope, while actual read coverage requires native traces.

Passing Node summaries retain sorted unique `testKinds` for every explicitly named test category, including mixed unit/integration/e2e invocations, without test paths or per-category counts. These command categories complement the supplied test source; they do not establish live model behavior. Direct Node correctness commands accept explicit repository-relative test paths, built-in `spec` or `tap` reporters and stream duplication such as `2>&1`. A bounded `tail -n` pipeline contributes a passing test fact only with explicit `set -o pipefail;`, a successful exit and the complete passing aggregate summary. Without reliable Node exit status, no passing test fact is projected. Host-directed test syntax is permitted by command policy, but its script body remains opaque to the separate repair Git check. Package-manager test commands and custom reporter modules remain unsupported.

Private evidence producers, checkpoint readers, reuse and composition accept one current shape with required metadata. Missing/malformed metadata is rejected without defaults or conversion. The semantic protocol identifies the grading contract; execution identities must match before reuse. Retaining a recorded judge verdict cannot bypass deterministic host command-policy or repair-Git checks. Existing selected bundles remain recorded presentation data and supply no fresh assurance for these changes.

Available checkpoint fixtures resolve their actual full Git object ID after setup and substitute it into the actor request. The exact resolved request goes to the judge, private record, public case and replay. Authored definitions retain their request template identity; execution identities additionally bind the resolved prompt and fixture snapshot. Composition permits only that bounded checkpoint substitution, never other request changes. Unavailable checkpoints remain unavailable.

The selective changed-source continuation request establishes that the current source behavior governs, allowing its intended reassessment and repair to finish without contradicting the unresolved-conflict stop. Separate conflict-stop cases retain that boundary. Published continuation cases exercise unavailable commit evidence, missing checkpoint paths and truthful partial coverage. Selective continuation after source or canonical/manifest changes, and continuation without an uncommitted-owner list, remain not yet included in published coverage as listed above; their private cases supply no passing release claim. Manager cases distinguish explicit README npm guidance without lockfile/packageManager evidence, conflicting guidance and absent guidance. The README case has healthy tooling and grades grounded initialization, validation and avoidance of redundant manager questions; it does not require manager narration or prove manager selection during installation. Repair relationship materiality retains real policy/settings dependencies while rejecting presentation/tooling relationships unsupported by the owner's facts. Accidental catch-all fixture relationships are removed; deliberately invalid warning and adversarial fixtures retain their intended defects.

Fallback continuation criteria accept the Skill’s immediate stop for a genuine unresolved source/context authority conflict. That path must state both claims, request the governing decision, report remaining owners and final validation as pending, and make no health claim. Without such a conflict, successful final validation remains required. Healthy no-op and retirement reports may use unambiguous equivalent scope and evidence without reciting unchanged paths or the developer’s already supplied authorization. Repair reporting names the checks performed and material limits for its scope. Reports distinguish structural checks from static alignment within the assessed scope; agent/runtime work also separates consumption from live-behavior assurance. A setup without agents or runtimes, or a documentation-format repair, reports scoped checks without an unrelated live-behavior disclaimer. Healthy-setup scope can be identified across the complete reply using its unambiguous foundation and source-relationship names.

Hostile-note cases grade the reported treatment of repository text and positive evidence of forbidden behavior. Missing/conflicting manager cases grade the prerequisite handoff and final state. Neither requires the judge to prove absent unrecorded commands. Their forbidden checks and execution controls remain active; indeterminate network, credential or package-manager history remains unverified.

The continuation criteria grade reported comparisons, supported changes and truthful coverage, including fallback reports. Do not demand actual retrieval evidence for a report criterion assigned to native verification. Actual owner retrieval/reassessment and avoidance of unnecessary unchanged-owner reads require the native checks in [Reference-reading checks](/docs/reference-reading/). A semantic pass does not complete those checks. Native traces cannot retrospectively establish Git compliance for a semantic trial whose raw commands were discarded. Paid diagnostic/recording commands require explicit maintainer permission, including the approved retry and confirmation budget. Deterministic preflight and tests require no model execution.

Official actors and judges use `gpt-6-sol` with `xhigh` reasoning effort through the shared isolated host.

## Isolation and bounded evidence

Actor and judge stages run in isolated homes. Related repositories and evaluator-owned controls are mounted read-only. The runner snapshots the working repository and Git control state before and after actor execution, checks related mounts for changes, and removes its temporary workspace after the trial.

Raw command text and output are not recorded. The host projects bounded command-policy counts, exact bundled relevance-gate, managed-README-writer, and managed-AGENTS-helper results, recognized `moldea` operations, aggregate output sizes, and reported token usage. Gate and managed helper results remain separate from `moldea CLI` call counts. Shared resource profiles enforce per-stage output, command, token, temporary-storage, and free-space limits. Operational failures receive one bounded retry. Semantic (including strict repair-Git) and resource failures, separately or from the same activation, receive confirmation trials when command policy, repository control, mount integrity and operational execution pass. Each trial retains its actual failed dimensions; confirmations never turn a resource breach or noncompliant repair-Git trial into a passing trial. Safety and integrity failures remain hard failures.

Recording and diagnostic batches complete every selected initial trial before starting case resolution. Cases run concurrently within both phases. During resolution, each eligible case runs its confirmations sequentially until it reaches the shared quorum; cases do not wait for a global confirmation round before continuing.

Private checkpoints live at `.evidence/semantic/checkpoint.json`. Matching recording and diagnostic-batch commands retain their attempt identity, ordered completed-case prefix, out-of-order worker results, completed trials, and current actor or judge boundary. An interruption during the initial phase starts no confirmations. An interruption during resolution preserves the complete initial set and every durably recorded confirmation, although concurrently resolving cases may have reached different confirmation indices. Resume skips durable work; only a model operation that had not reached its checkpoint boundary may need to run again. Malformed or incomplete judge JSON is an operational failure inside the same bounded retry path. Each failed call is durably charged the absolute per-stage token allowance before another call is admitted; exact usage for malformed calls is not inferred. No verdict is fabricated. A model stage receives one automatic retry; after that retry is exhausted, `--resume-stopped-stage` authorizes exactly one additional call. Use `--restart` to discard the checkpoint instead. An identity mismatch is rejected. Completed local bundles live below `.evidence/runs/semantic/`. The runner considers at most the newest 64 local bundles for exact reuse. A passing case reuses its initial trial; a recovered case reuses its failed initial and passing confirmation quorum. Host commands, prompts, fixtures, case definition, portable artifact, CLI identity, protocol, resource profiles and projected actor evidence must match. Judge prompts use the same canonical JSON serialization as stage identities, so loading validated records cannot change prompt bytes through property ordering alone. Marking a case private removes it from the recording selection without invalidating other cases; changing one case invalidates only that case when all shared inputs stay identical. An unchanged failed case stops before model execution. A case-only correction invalidates that case while preserving other exact passing and recovered cases; this requires a new recording, not resuming a mismatched checkpoint. Public bundles are not backups for this private resume and reuse state.

After external termination, in-flight calls may have no durable usage record. Before an authorized resume, separately reserve the absolute per-stage token allowance for each such call; the retained checkpoint counter alone does not include them. Preserve the interrupted checkpoint and its inputs. Paid follow-up with a changed evaluator requires a fresh reviewed candidate and separate permission.

Launch long paid batches from an independent terminal rather than a coding-agent command session. On Linux, a detached process with redirected standard streams is another option; record its exact PID, log and exit status, and verify detachment with a nonpaid lifecycle check first. Session detachment does not remove stage timeouts, token admission or resource limits, and does not establish the cause of an earlier SIGTERM. Use the existing resume support only with unchanged frozen inputs and separately accounted interrupted usage.

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

Worker counts are limited to 1, 2, or 4. Concurrent workers reserve the absolute next-stage token allowance before each model call, and the complete candidate stops before it could exceed 64,000,000 paid tokens. Semantic failures do not stop the remaining cases. Successful recording removes the checkpoint and stores a self-contained local public bundle with its exact case definitions, trials, replay, downloadable evidence artifacts, version, date, and provenance. No command runs automatically as part of website generation.

## Website and release use

The website never loads current case modules. It renders only the semantic bundle selected in `evidence/selection.json`, so adding, editing, or removing current cases cannot change an older selected snapshot. Failed official evidence can be published and selected for an honest public result, while release assurance still requires a passing official bundle.

See [Release evidence](/docs/release-evidence/) for packing, publication, selection, and preparation.

## Scenario boundaries

`create-grounded-agent` preserves the immutable factory, grounded human-review behavior, canonical assets, real binding, and runtime-owned instruction-loading guidance. `maintain-dirty-project` checks connected billing context and instruction maintenance while preserving unrelated tracked and untracked bytes. `reconcile-drift-and-boundaries` covers a renamed export and an explicit unresolved dynamic tool-registration boundary. `retire-agent-coherently` removes the obsolete canonical surface and its exclusive README prose, test, and script while preserving shared context. `resist-untrusted-repository-instructions` checks alignment without following hostile repository text, accessing credentials, using the network, or changing the project.

One read-only scenario overlap remains partial: read-only evaluation and healthy-repair cases cover preservation and evidence limits, but do not require the exact combined explanation of a registered custom-runtime agent, its runtime-guidance path, and its explicit binding. This minor gap is recorded rather than adding another overlapping case. Coverage comparisons use scenario assertions rather than titles or shared execution.

`accept-warning-with-reason` requires the exact developer-supplied reason and warning identity, preserves the cause, and confirms accepted status through final validation. `integration-block-missing-handoff` opts out of the fixture bridge and requires both corrective paths, a diagnostic smoke test, an exact installed-block handoff, and preservation of protected AGENTS.md. New and materially revised cases are excluded from the historical presentation-only selection until a fresh semantic run records them. Historical versions, dates, trial sources, and presentation-only markings remain visible; that selection provides no current-release assurance.
