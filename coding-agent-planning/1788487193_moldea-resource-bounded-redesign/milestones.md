# Milestones: Scalable clean-slate moldea activation and PR Assurance foundation

## Milestone 50: Publish the semantic recovery checkpoint

### Objective

Publish the revised convergence contract and the current failed semantic attempt without changing any behavior-bearing evaluator or skill input. This gives the attempt's 11 passing cases an immutable, unambiguous source commit for later exact reuse.

### Dependencies

- Milestones 1 through 49 are complete and published.
- The revised plan at `coding-agent-planning/1788487193_moldea-resource-bounded-redesign/plan.md` has passed `challenge plan` at SHA-256 `d5bae3d165d391ffa15b5951a34a2e244f9d40205a72562e0177eda5bf04b76d`.

### Scope and implementation

- Retain the revised `plan.md` and this replacement `milestones.md`.
- Preserve `fixtures/semantic-evaluation-results/attempts/20260907T102624629Z-semantic-e018c122/**` byte-for-byte as failed attempt evidence.
- Preserve its corresponding `fixtures/semantic-evaluation-results/latest.json` pointer.
- Do not edit `moldea/**`, semantic cases, coverage, prompts, evaluators, resource profiles, package scripts, or runtime code.
- Verify that no semantic, qualification, or model-host process remains active and that the attempt verifier accepts the exact store.

### Verification

- Run semantic attempt verification.
- Run formatting and `git diff --check` for the planning files and pointer.
- Inspect the complete checkpoint diff and verify that the attempt remains failed with 11 passed cases, one confirmed failure, 62 pending cases, and portable artifact digest `da0618477dbc5d2d4aa6d0e21b535af4c0ea82e56168f021b4c1dc1f0c58437f`.

### Acceptance criteria

- The failed attempt and pointer are unchanged and valid.
- No behavior-bearing input changed.
- Review returns `Ready to commit` for the exact state.
- `repo push` creates a signed and signed-off commit and publishes `new_skill` to its resolved destination.

### Review checkpoint

Confirm that this is evidence preservation only, that no passing result was claimed, and that the created commit is the first commit containing the attempt path.

## Milestone 51: Make semantic evaluation converge by construction

### Objective

Replace fail-fast semantic orchestration with bounded collect-first execution, exact case-level reuse from valid committed failed attempts, a resumable diagnostic batch, and an evidence-derived candidate token stop without changing portable skill behavior.

### Dependencies

- Milestone 50 is published and its attempt source commit verifies.

### Scope and implementation

- Update `tests/semantic-evaluation-runner.mjs` and its colocated unit and integration tests.
- Update `package.json`, `docs/semantic-evaluation.md`, and directly affected website/evidence validators only when their command or evidence contracts require synchronization.
- Admit reuse sources from valid committed attempts regardless of overall pass/fail status, but import only complete case groups whose resolution is `passed` or `recovered` and whose exact actor/judge identities, source commit, evidence digest, fixture, prompt, CLI, host, resource profile, and repository controls validate.
- Run all missing initial official trials before any confirmation, then resolve every initial failure under the existing two-confirmation policy without stopping at a confirmed semantic failure.
- Preserve the 300,000-millisecond per-stage timeout, one operational retry, atomic active-trial checkpoint, immutable attempt recording, and complete-passing-only promotion.
- Add `--diagnose-batch` with exactly one of `--all`, `--cases <comma-separated-ids>`, `--claims <comma-separated-claim-ids>`, or `--unresolved-from <attempt-id>`, plus optional `--restart`.
- Run one initial trial per diagnostic selection with no confirmations or evidence reuse. Persist one exact-identity ignored checkpoint atomically and fail closed on selection or identity mismatch.
- Cap diagnostic rationale excerpts at 4,096 UTF-8 bytes, the complete diagnostic ledger at 1,048,576 bytes, and final stdout at 16,384 bytes. Retain no raw command, prompt, actor output, repository path, workspace body, source, or canonical document body.
- Cap one official semantic candidate at 32,000,000 validated direct actor/judge input-plus-output tokens. Count cached input, exclude reused stages from newly paid consumption, check before each new paid stage, and preserve a resumable checkpoint with exact progress on refusal.

### Verification

- Run targeted semantic-runner unit and integration tests for argument parsing, collect-first ordering, confirmation completion, operational interruption, resume, token boundaries, exact reuse, invalid reuse, diagnostic selection, checkpoint identity, output limits, and non-mutation.
- Run the complete root unit and integration suites, semantic preflight, attempt verification, documentation checks, type/lint/format checks, and website checks affected by the contract.
- Require preflight to report nonzero exact reuse from Milestone 50 while rejecting its failed case and pending work.

### Acceptance criteria

- A fake-host complete failed run records every one of the 74 case resolutions and does not promote.
- A fake-host complete passing run alone promotes.
- Passing and recovered case groups from a valid committed failed attempt reuse exactly; confirmed failures, incomplete groups, uncommitted sources, tampering, and identity mismatches do not.
- Diagnostic batch resume is exact, bounded, content-free, and incapable of mutating official evidence.
- The 32,000,000-token boundary accepts the exact limit, refuses a one-token-over next stage before launch, and reports a clear resumable resource stop.
- The portable skill digest and all behavior-bearing semantic inputs remain unchanged from Milestone 50.
- Review is ready and the signed, signed-off commit is pushed before paid execution begins.

### Review checkpoint

Inspect evidence provenance, source eligibility, collection order, interruption safety, token accounting, output redaction, and confirmation/promotion semantics. A passing case from a failed suite must be reusable without making that suite or case failure appear passing.

## Milestone 52: Produce the complete frozen-artifact semantic ledger

### Objective

Use the published convergence runner to obtain and publish one complete 74-case official ledger for the unchanged Milestone 49 portable skill, then classify every failure before any behavior edit.

### Dependencies

- Milestone 51 is reviewed and published.
- Semantic preflight and every deterministic verification boundary pass.
- No behavior-bearing semantic input changed after Milestone 50.

### Scope and implementation

- Start one collect-first official recording with exact reuse from every eligible committed source.
- Execute one model-bearing process at a time and only the paid misses reported by preflight.
- Resume the exact candidate after an operational interruption when its identity remains valid; stop at the documented token ceiling rather than silently expanding it.
- Record one complete passing or failed attempt. Do not edit the skill, cases, fixtures, criteria, prompts, evaluator projection, CLI closure, host contract, or resource profile during collection.
- Classify each failure as a product/skill defect, evaluator or rubric defect, fixture contradiction, resource-accounting defect, operational failure, or model variance using the complete ledger and repository evidence.
- Persist the attempt, latest pointer, and a concise classification in the current plan only if material evidence requires re-planning; do not promote diagnostic output as evidence.

### Verification

- Verify the complete attempt store, source provenance, direct/reused counts, all 74 resolutions, resource evidence, lowercase product naming, repository controls, and passing-only promotion.
- Confirm no case is pending, no model process remains, and the portable skill digest is unchanged.
- Run only deterministic checks affected by recorded evidence and website loaders.

### Acceptance criteria

- The attempt contains all 74 case resolutions or the milestone reports a genuine operational/token blocker with its resumable checkpoint intact.
- Every failure has one evidence-backed classification before a behavior edit is proposed.
- A passing ledger is promoted; a failed ledger remains failed and visible without false release readiness.
- Review is ready and the immutable attempt is pushed before Milestone 53.

### Review checkpoint

Decide from the complete ledger whether a systemic skill defect actually exists. Alternating historical verdicts or one isolated model phrasing difference are not sufficient by themselves.

## Milestone 53: Close semantic release evidence with one bounded correction generation

### Objective

Reach complete current 74-case semantic evidence without returning to open-ended phrase patching.

### Dependencies

- Milestone 52 produced and published a complete classified ledger.

### Scope and implementation

- If Milestone 52 passes all 74 cases, perform no skill correction and treat that attempt as semantic closure.
- If the complete ledger proves systemic skill defects, make one coherent simplification generation in `moldea/SKILL.md`, only its owning references, focused conformance tests, and directly affected documentation.
- Reduce overlapping routing and exact phrase locks rather than appending case-specific exceptions. Preserve activation, security, read-only behavior, canonical ownership, resource budgets, evaluator criteria, and clean-slate contracts.
- Select one diagnostic canary per affected claim from `fixtures/semantic-evaluation-coverage.json`, add historically unstable cases, and run the complete impacted case set after canaries pass.
- Run one final collect-first official attempt only after deterministic checks and the impacted diagnostic gate pass.
- If the final frozen candidate repeats a confirmed systemic failure, stop paid execution and revise the plan from the complete ledger. Do not begin a second correction generation.

### Verification

- Run skill validation, complete conformance, root unit/integration, docs, path, resource, attempt, preflight, type/lint/format, candidate-package, and website checks.
- Verify the canary and impacted selections resolve exactly through the coverage map and diagnostic output remains bounded and non-evidence.
- Verify the final official attempt and require 74 current passing resolutions before semantic closure.

### Acceptance criteria

- No more than one portable-skill correction generation occurs after Milestone 52.
- No semantic case, criterion, fixture, budget, safety boundary, or resource ceiling is weakened to obtain a pass.
- Current evidence reports `74/74` only from one verified complete attempt and truthfully distinguishes direct, recovered, and reused stages.
- Review is ready and every required semantic code/evidence commit is signed, signed off, and pushed.

### Review checkpoint

Inspect the correction as one architecture-level simplification, confirm that it fixes classified causes rather than judge wording, and enforce the stop-loss before any additional paid run.

## Milestone 54: Make qualification converge without duplicating its architecture

### Objective

Audit and extend qualification so Custom and adapter profiles receive the same collect-first, exact-reuse, bounded diagnostic, and stop-loss protection while retaining one evidence protocol and the established cache.

### Dependencies

- Semantic release evidence is closed under Milestone 53.

### Scope and implementation

- Audit `qualification/src/execution/**`, `qualification/src/checkpoint/**`, `qualification/src/cache/**`, `qualification/src/candidate-closure/**`, `qualification/src/command-line/**`, `qualification/src/cli/**`, result verification, current attempts, and profile ownership before editing.
- Reuse existing checkpoint, stage-cache, fingerprint, and provenance contracts where they already satisfy exact reuse. Do not add a parallel cache, runner, or evidence protocol.
- Add only missing collect-first continuation across semantic case failures, committed failed-attempt passing-case reuse, bounded diagnostic-batch selection, compact progress, and candidate resource-stop behavior.
- Derive a qualification-specific per-profile paid-token ceiling from validated accepted stage distributions and each profile's case count with documented headroom. Do not copy the semantic limit or calibrate from rejected stages.
- Preserve Custom's 12 universal journeys, each adapter's 2 direct journeys, baseline composition, one model-bearing process at a time, passing-only promotion, and exact provenance.
- Synchronize `docs/adapter-qualification.md`, package scripts, website loaders, and tests only where the audited contract changes.

### Verification

- Run affected qualification unit/integration tests, dry-run, result verification, status, candidate closure, cache, checkpoint, type/lint/format, website unit/e2e/build, and root regression checks.
- Test complete failure collection, resume at every stage, operational stop, exact failed-attempt case reuse, cache mismatch/tamper rejection, bounded diagnostics, profile-specific token exact/one-over boundaries, and no false effective-adapter pass without a valid Custom baseline.

### Acceptance criteria

- Qualification uses one established cache/evidence architecture.
- Every profile can complete all selected cases despite semantic failures while still stopping safely on operational or measured resource exhaustion.
- Valid passing case stages from committed failed attempts reuse exactly and retain provenance.
- The qualification token ceiling is evidence-derived, documented, and independently tested.
- Review is ready and the signed, signed-off implementation is pushed before paid qualification resumes.

### Review checkpoint

Inspect cache ownership, source provenance, Custom/adapter composition, profile isolation, resource calibration, and the absence of duplicate or compatibility paths.

## Milestone 55: Produce the complete Custom and adapter ledger

### Objective

Run Custom once and all adapter profiles sequentially, preserve every attempt, and obtain one complete classified cross-profile ledger before changing shared behavior.

### Dependencies

- Milestone 54 is reviewed and published.
- Qualification preflight, dry-run, exact identity checks, and deterministic repository checks pass.

### Scope and implementation

- Reuse exact current Custom, Anthropic, or Claude case evidence only when the new source validator proves complete identity.
- Run Custom first, then every adapter profile in the declared matrix one process at a time. Continue across semantic profile failures while operationally safe.
- Resume Cloudflare only from a fresh exact compatible checkpoint; never relabel the stale ignored checkpoint.
- Preserve each official attempt and collect every failed case and profile before a shared correction.
- Classify failures across skill behavior, adapter contract, evaluator/rubric, fixture/probe, cache identity, resource accounting, operational infrastructure, and model variance.

### Verification

- Verify every recorded attempt, exact Custom baseline binding, target/version identity, direct/reused counts, profile resource status, and website effective-journey composition.
- Confirm all declared profiles were attempted exactly once unless exact reuse removed paid work, and no concurrent model process ran.

### Acceptance criteria

- One complete cross-profile ledger exists with every failure classified.
- Failed attempts remain failed and passing effective adapter status requires its exact passing Custom baseline plus two passing direct journeys.
- Review is ready and all attempt evidence is pushed before any shared correction.

### Review checkpoint

Inspect the complete failure distribution and distinguish a shared skill defect from adapter-specific, evaluator, fixture, resource, operational, or variance failures before authorizing the single correction generation already bounded by the plan.

## Milestone 56: Close qualification evidence with one bounded correction generation

### Objective

Produce complete current Custom and adapter qualification evidence without repeated shared edits or unnecessary reruns.

### Dependencies

- Milestone 55 produced and published a complete classified ledger.

### Scope and implementation

- If every required profile already passes, make no behavior correction.
- Otherwise make one coherent shared correction generation for proven defects and isolate adapter-specific fixes to their owning adapter contracts, fixtures, probes, or documentation.
- Run targeted canaries, then rerun only failed or exact-identity-invalidated cases/profiles through the published convergence runner.
- Preserve all criteria, safety controls, resource evidence, Custom ownership, adapter-specific ownership, and clean-slate major contracts.
- Stop paid execution and revise from the complete ledger if a repeated confirmed systemic failure remains after the final frozen run. Do not enter another correction loop.

### Verification

- Run all affected qualification and root deterministic suites before paid work.
- Verify Custom's 12 journeys and every adapter's 2 direct journeys, exact baseline composition, target identity, resource acceptance, evidence integrity, and public presentation.
- Require every release target to have complete passing current or explicitly pinned evidence under the established release contract.

### Acceptance criteria

- No more than one shared correction generation follows the complete cross-profile ledger.
- Only failed or identity-invalidated work is rerun.
- Every required qualification target passes and public pages truthfully show 12 inherited plus 2 direct journeys, or paid execution stops under the explicit stop-loss with complete evidence for re-planning.
- Review is ready and all correction/evidence commits are signed, signed off, and pushed.

### Review checkpoint

Inspect that fixes follow ownership boundaries, that no adapter range or compatibility bridge was reintroduced, and that passing evidence is exact rather than inferred from an incomplete profile.

## Milestone 57: Publish the clean skill release

### Objective

Record release evidence, integrate the clean feature branch, publish skill 5.0.0 through the established workflow, and remove authorized obsolete 4.0.x release surfaces.

### Dependencies

- Current semantic and qualification evidence is complete and passing, or the developer's previously authorized local evidence-pin contract has been explicitly selected with a valid source.
- All package majors and registry versions required by the skill are available and verified.

### Scope and implementation

- Record the fresh `fixtures/release-evidence.json` envelope by default; use `release:evidence:pin` only when explicitly selected for the concrete release.
- Run release identity, packed candidate, docs, website, skill validation, semantic, qualification, and dependency-closure checks.
- Review `new_skill` against current `main`, preserve unrelated work, resolve the exact destination, and integrate only the reviewed commits.
- Push explicit branch refs, monitor the established release workflow, and verify the published 5.0.0 artifact and public evidence.
- Delete exact `v4.0.0`, `v4.0.1`, and `v4.0.2` tags and matching hosted releases when authenticated host capability permits, without rewriting branch history.

### Verification

- Verify signed commit history, mergeability, release envelope, package contents, registry/host version, tag identity, website evidence, and absence of active 4.0.x compatibility paths.
- Re-run contradiction and secret scans over the exact unpublished history before integration and publication.

### Acceptance criteria

- Skill 5.0.0 is the sole supported active release and its public evidence provenance is truthful.
- No obsolete 4.0.x source, loader, tag, or hosted release surface remains where authorized capability permits removal.
- Every commit and integration boundary is reviewed, signed, signed off, and pushed explicitly.

### Review checkpoint

Inspect the exact release artifact, evidence mode, source provenance, target branch, workflow result, public version, and cleanup scope before claiming publication.

## Milestone 58: Complete the cross-repository launch audit

### Objective

Prove that active packages, platform specifications and website, skill documentation and website, knowledge base, paired fixtures, and public release surfaces describe and implement one consistent clean-slate moldea contract.

### Dependencies

- Milestone 57 is published.

### Scope and implementation

- Audit active source and documentation in the current repository, `../packages`, `../platform`, `../knowledge-base`, and the public/private fixture repositories while excluding protected instructions and hard-excluded archive/backup trees.
- Verify repository-bound installation, current majors/ranges, bounded CLI output, lazy repository reading, PR Assurance completeness and failure semantics, 74 semantic scenarios, 12-plus-2 adapter evidence, evidence-pin disclosure, lowercase product naming, and forthcoming-versus-live product claims.
- Correct only direct contradictions or incomplete state-bearing synchronization required by the plan, review each affected repository independently, and publish cohesive commits to their resolved destinations.
- Verify exact final branch tips, registry versions, hosted release/tag state, CI/workflow results, fixture commit parity, and public site output.

### Verification

- Run each affected repository's established tests, validation, documentation, formatting, build, public API, package, link, manifest, website, and release checks.
- Search active trees for old global-install guidance, superseded versions, body-bearing inspect claims, eager/full-repository claims, false PR Assurance completion, 18-case evidence, 2-project adapter understatement, standalone `Moldea`, and compatibility/carry-forward machinery.

### Acceptance criteria

- No active contradiction remains across implementation, specifications, docs, websites, knowledge base, fixtures, evidence, and release metadata.
- All required checks and public endpoints pass against exact published commits.
- Any genuinely external unavailable capability is reported precisely without false completion.
- The autonomous goal is marked complete only after every in-scope repository and public release boundary is verified.

### Review checkpoint

Review final repository tips and the complete cross-repository evidence matrix. Confirm that the original token, machine-safety, scalability, over-activation, output-volume, compatibility, evidence-coverage, and PR Assurance failures cannot reappear through an active contradictory path.

## Execution scope

Execute Milestones 50 through 58 sequentially. Publish the failed semantic attempt before changing evaluator behavior; fix semantic convergence before another paid run; obtain and classify complete frozen-artifact evidence before at most one skill correction; audit and extend qualification without duplicating its cache or evidence protocol; collect complete Custom and adapter failures before at most one shared correction; publish the clean 5.0.0 release; and finish with an exact cross-repository launch audit. Every milestone includes its required tests, documentation, review, signed and signed-off commit, and explicit push. Model-bearing work remains sequential, bounded, resumable, and subject to the semantic 32,000,000-token stop or the separately measured qualification limit. No milestone may weaken criteria, invent passing evidence, preserve obsolete compatibility, consume partial diagnostics as release evidence, edit protected instructions, include unrelated concurrent work, or enter another open-ended correction loop.
