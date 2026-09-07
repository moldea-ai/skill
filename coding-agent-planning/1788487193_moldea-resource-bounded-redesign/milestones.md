# Milestones: Scalable clean-slate moldea activation and PR Assurance foundation

## Milestone 50: Publish the semantic recovery checkpoint

### Status

Complete and published at signed commit `21623d782e3052a980a75930c8b3030862a1ca43` on `origin/new_skill`.

### Objective

Publish the revised convergence contract and failed attempt `20260907T102624629Z-semantic-e018c122` unchanged so its 11 passing case groups have one immutable source commit for later exact reuse.

### Completed evidence

- All nine active 74-case attempts verify.
- The published attempt remains failed with 11 passed cases, one confirmed failure, 62 pending cases, and portable artifact digest `da0618477dbc5d2d4aa6d0e21b535af4c0ea82e56168f021b4c1dc1f0c58437f`.
- No behavior-bearing evaluator or portable-skill input changed.
- The commit is signed, signed off, and published to the resolved feature branch.

## Milestone 51: Make semantic evaluation converge by construction

### Status

Published at signed commit `70e8523cf6f14459cdf762c174baeaaeccac6008`. Its first official run preserved 33 passed and four failed completed initials before exposing the terminal-exhaustion accounting defect now owned by Milestone 52.

### Objective

Replace fail-fast semantic orchestration with bounded collect-first execution, exact case-level reuse from valid committed failed attempts, a resumable two-artifact diagnostic batch, and a non-overshooting candidate token stop without changing portable-skill behavior.

### Dependencies

- Milestone 50 is complete and its attempt source commit verifies.

### Scope and implementation

- Update `tests/semantic-evaluation-runner.mjs` and its colocated unit and integration tests.
- Update `package.json`, `docs/semantic-evaluation.md`, and directly affected website or evidence validators only when their command or evidence contracts require synchronization.
- Admit reuse sources from valid committed attempts regardless of overall status, but import only complete case groups resolved as `passed` or `recovered` whose source commit, artifact, actor/judge identities, fixture, prompts, CLI, host, resource profile, and repository controls validate exactly.
- Run all missing official initial trials before any confirmation, then resolve every initial failure under the existing two-confirmation policy without stopping at a semantic failure.
- Preserve the 300,000-millisecond stage timeout, one operational retry, atomic active-trial checkpoint, immutable attempt recording, and complete-passing-only promotion.
- Add `--diagnose-batch` with exactly one of `--all`, `--cases <comma-separated-ids>`, `--claims <comma-separated-claim-ids>`, or `--unresolved-from <attempt-id>`, plus optional `--restart`.
- Run one initial trial per diagnostic selection without confirmations or evidence reuse. Persist exact identity, selection, progress, and at most one full active trial in an ignored private checkpoint capped at 1,048,576 UTF-8 bytes. Move each completed result immediately to a separate ignored content-free ledger capped at 1,048,576 bytes, replace model-authored rationale with a deterministic content-free explanation capped at 4,096 bytes, cap final stdout at 16,384 bytes, and delete the private checkpoint after successful completion.
- Enforce a 32,000,000-token direct-stage candidate ceiling by reserving the unchanged 2,097,152-token absolute per-invocation maximum before every actor or judge launch. Count direct `inputTokens + outputTokens`, including cached input within input, exclude reused stages from new paid consumption, accept exact equality, and refuse a one-token-over reservation before launch while preserving resumable state.

### Verification

- Run targeted unit and integration tests for argument parsing, exact selection, collect-first ordering, confirmation completion, operational interruption, every resume boundary, token exact and one-over boundaries, exact failed-attempt reuse, invalid reuse, both diagnostic file limits, redaction, cleanup, and non-mutation.
- Prove oversized private state fails closed before a judge stage and cannot weaken either file ceiling.
- Run the complete root unit and integration suites, semantic preflight, attempt verification, documentation checks, type/lint/format checks, and affected website checks.
- Require preflight to report nonzero exact reuse from Milestone 50 while rejecting its failed and pending case groups.

### Acceptance criteria

- A fake-host complete failed run records all 74 case resolutions and does not promote; a complete passing run alone promotes.
- Passed and recovered case groups from valid committed failed attempts reuse exactly; confirmed failures, incomplete groups, uncommitted sources, tampering, and identity mismatches do not.
- Diagnostic resume is exact within its explicit bound, completed output is content-free, and diagnostics cannot mutate official evidence.
- The token reservation accepts exact equality, refuses a one-token-over launch, and reports a clear resumable resource stop.
- The portable-skill digest and all behavior-bearing semantic inputs remain unchanged from Milestone 50.
- Read-only review is ready and the signed, signed-off commit is pushed before model-backed evaluation begins.

### Review checkpoint

Inspect provenance, source eligibility, collection order, interruption safety, token accounting, output redaction, bounded disk state, confirmation semantics, and passing-only promotion.

## Milestone 52: Produce the complete frozen-artifact semantic ledger

### Status

Implementation and evaluation are complete; review and publication of attempt `20260907T175451820Z-semantic-c0c16e40` and its problem-84 classification remain.

### Objective

Use the published convergence runner to obtain and publish one complete 74-case official ledger for the unchanged Milestone 49 portable skill, then classify every failure before any behavior edit.

### Dependencies

- Milestone 51 is reviewed and published.
- Semantic preflight and deterministic verification pass with unchanged behavior identity.

### Scope and implementation

- Preserve the 37 completed results from the stopped run as immutable failed checkpoint attempt `20260907T141616761Z-semantic-3072e27f`; discard only its incomplete active case, and publish the attempt before relying on its 33 independently passed groups for exact reuse.
- Correct shared operational retry handling and semantic orchestration so the terminal failed invocation is persisted before exhaustion escapes, every failed invocation receives the conservative full token charge, and an ordinary rerun launches no model for a stopped stage.
- Add `--resume-stopped-stage` to official and diagnostic commands as a mutually exclusive alternative to `--restart`. It authorizes exactly one additional attempt without clearing accumulated charges; another failure persists and stops again.
- Synchronize the website replay validator and presentation with the evaluator's existing content-free `node-test-summary` fact so the checkpoint remains renderable without exposing raw commands or output.
- Start one collect-first official recording using every eligible exact committed source and execute only paid misses, one model-bearing process at a time.
- Resume the exact candidate after operational interruption and stop at the candidate token boundary without silently expanding it.
- Permit a reused trial to become an exact source for later reuse by rebinding only `executionOrigin` and `stageReuse` to its immediate committed source, comparing every substantive field exactly, and validating each provenance hop independently.
- Record one complete attempt without editing the skill, cases, fixtures, criteria, prompts, evaluator projection, CLI closure, host contract, or resource profile during collection.
- Classify every failure as a product/skill defect, evaluator or rubric defect, fixture contradiction, resource-accounting defect, operational failure, or model variance.

### Verification and acceptance criteria

- Unit-test persistence before the terminal exception, exact failure charging, refusal of ordinary resume, one-attempt explicit resume, repeated-stop behavior, parser exclusivity, first- and second-generation provenance rebinding, substantive-content mismatch rejection, and safe website presentation of repository test summaries. Keep qualification callers compatible with the shared optional exhaustion callback.
- Review and publish the correction plus checkpoint attempt before restarting paid execution. Preflight must then reuse all 33 passing groups from the checkpoint and reject its four failed and 37 pending groups.
- Verify exact source provenance, direct/reused counts, all 74 resolutions, resource evidence, repository controls, lowercase naming, and passing-only promotion.
- No case remains pending, no model process remains, and the portable-skill digest remains unchanged; otherwise a genuine operational/token stop retains an exact resumable checkpoint.
- Every failure is classified before any behavior edit. Review is ready and the attempt is pushed before Milestone 53.
- The complete ledger resolves all 74 cases as 61 direct passes, five recoveries, and eight confirmed failures after 21 confirmation trials and 23,634,239 accounted direct tokens. Two failures are stale zero-call resource budgets, six are skill or evidence-boundary defects, and the five recovered cases require no correction.

### Review checkpoint

Decide from the complete ledger whether a systemic skill defect exists. Alternating verdicts or isolated phrasing differences are not sufficient by themselves.

## Milestone 53: Close semantic release evidence after the high gate

### Status

The first high-reasoning correction is complete and published at signed commit `72c1c9a57e2dc1cee521aac2da7776294ab9ac0d`. Its complete eight-case diagnostic passed six cases and confirmed two residual defects; exact high confirmations reproduced both failures without operational failure.

### Objective

Close the two proven reference-ownership and result-shape defects, pass their exact high-reasoning gate, and produce one complete current 74-case semantic release attempt without returning to open-ended phrase patching.

### Dependencies

- Milestone 52 is complete and published.
- The first Milestone 53 correction, deterministic verification, complete eight-case high diagnostic, and exact two-case confirmations are complete.
- Problem 85 in the revised challenged plan establishes the final correction boundary.

### Scope and implementation

- Preserve the published shared `high` reasoning contract, 600,000-millisecond finite stage timeout, one bounded operational retry, terminal-stop accounting, output bounds, token ceilings, two corrected zero-call budgets, and all six already-corrected behaviors.
- In `moldea/references/evaluate-and-reconcile.md`, make read-only conclusions about agent or runtime description consumers reach the owning consumer-semantic contract in `moldea/references/agent-design.md` before classifying or reporting a mapping. Keep the second-reference load conditional on that exact boundary and retain evaluation's read-only and bounded-evidence contract.
- In `moldea/references/local-tooling.md`, replace prose-form unsafe package-manager reporting with one numbered four-field result contract: independently verified exact local CLI availability, exact executable configuration and mechanism that blocks local CLI installation, the pre-package-manager stop, and the exact removal-or-disable prerequisite. Make the initialization route delegate to that contract instead of maintaining a partial duplicate.
- Remove or compress superseded duplicate wording so `moldea/SKILL.md` remains at or below 2,560 words. Do not add case IDs, judge phrases, evaluator-specific language, or a parallel route.
- Extend focused conformance assertions for the reference handoff and the four-field blocked-result contract without changing semantic cases, criteria, fixtures, budgets, prompts, evaluator behavior, evidence schemas, repository controls, privacy boundaries, or resource ceilings.
- Run the complete deterministic verification boundary, review the exact state, and publish the two-cause correction as a signed and signed-off commit.
- Run exactly `routing-description-property-name` and `yarn-plugin-install-blocked` as non-recording high-reasoning diagnostics. If either remains failed, stop model-backed execution and return to evidence-led planning without another behavior patch.
- If both pass, run one collect-first official 74-case high attempt. Preserve and resume its exact checkpoint across operational or token stops. Do not edit behavior-bearing inputs while it runs.
- When the official attempt passes, atomically replace the active semantic evidence store, validators, and public presentation with that high attempt and remove every obsolete medium attempt and temporary medium reader from active source. Git history remains the audit trail.

### Verification and acceptance criteria

- Run skill validation, complete conformance, root unit/integration, docs, path, resource, attempt, preflight, type/lint/format, candidate-package, qualification regression, and website checks affected by the correction.
- `moldea/SKILL.md` remains within its exact word budget and every independent Agent Skill route, no-change report, runtime evidence boundary, and unrelated semantic behavior remains deterministic.
- The two targeted high diagnostics pass with no forbidden criteria, repository writes, operational failures, or changed resource contract.
- The measured eight-case batch and confirmations remain well below the unchanged 2,097,152-token per-stage reservation and 32,000,000-token candidate ceiling; the 600,000-millisecond timeout remains finite and produced no false timeout.
- Current evidence reports `74/74` only from one verified complete high attempt and distinguishes direct, recovered, and reused work truthfully.
- Active semantic schemas, evidence, and public pages accept only the high release contract after replacement; no obsolete medium attempt or temporary compatibility reader remains in active source.
- Review is ready and every correction/evidence commit is signed, signed off, and pushed.

### Review checkpoint

Confirm the correction centralizes ownership rather than duplicating rules, all two-case criteria pass unchanged, the official attempt is complete and immutable, and the final source contains no medium-evidence compatibility path.

## Milestone 54: Make qualification converge without duplicating its architecture

### Objective

Audit and extend qualification so Custom and adapter profiles receive the same collect-first, exact-reuse, bounded diagnostic, and stop-loss protection while retaining the established cache and one evidence protocol.

### Dependencies

- Semantic release evidence is closed under Milestone 53.

### Scope and implementation

- Audit `qualification/src/execution/**`, `qualification/src/checkpoint/**`, `qualification/src/cache/**`, `qualification/src/candidate-closure/**`, `qualification/src/command-line/**`, result verification, current attempts, and profile ownership before editing.
- Reuse existing checkpoint, cache, fingerprint, and provenance contracts. Add only missing continuation across semantic failures, valid committed failed-attempt passing-case reuse, bounded diagnostic selection, compact progress, and candidate resource-stop behavior.
- Carry the shared `high` reasoning contract through qualification command construction, exact cache and evidence identity, schemas, tests, and documentation. Reject `medium` evidence as a current reuse or release source.
- Derive a qualification-specific per-profile paid-token ceiling from accepted qualification evidence and each profile's case count with documented headroom. Do not copy the semantic ceiling or calibrate from rejected stages.
- Preserve Custom's 12 universal journeys, each adapter's 2 direct journeys, baseline composition, one model-bearing process at a time, passing-only promotion, and exact provenance.
- Synchronize `docs/adapter-qualification.md`, scripts, website loaders, and tests only where the audited contract changes.

### Verification and acceptance criteria

- Run affected qualification unit/integration, dry-run, result, status, candidate-closure, cache, checkpoint, type/lint/format, website unit/e2e/build, and root regression checks.
- Test complete failure collection, every resume boundary, operational stop, exact failed-attempt case reuse, tamper rejection, bounded diagnostics, and profile-specific token exact/one-over boundaries.
- No parallel cache, runner, protocol, or false effective-adapter pass exists. Review is ready and the signed, signed-off implementation is pushed before paid qualification resumes.

### Review checkpoint

Inspect cache ownership, source provenance, Custom/adapter composition, profile isolation, resource calibration, and removal of unnecessary compatibility paths.

## Milestone 55: Produce the complete Custom and adapter ledger

### Objective

Run Custom and all adapter profiles sequentially, preserve every attempt, and obtain one complete classified cross-profile ledger before changing shared behavior.

### Dependencies

- Milestone 54 is reviewed and published; qualification preflight, dry-run, exact identity, and deterministic checks pass.

### Scope and implementation

- Run Custom first, then every declared adapter profile at `high`, one process at a time, reusing only exact current `high` evidence and continuing across semantic failures while operationally safe.
- Resume Cloudflare only from a fresh exact-compatible checkpoint and preserve every official attempt.
- Collect and classify every failed case/profile across skill behavior, adapter contract, evaluator/rubric, fixture/probe, cache identity, resource accounting, infrastructure, and model variance before a shared correction.

### Verification and acceptance criteria

- Verify every attempt, exact Custom baseline binding, target/version identity, direct/reused counts, resource status, and website effective-journey composition.
- Every declared profile is represented exactly once by execution or exact reuse; no concurrent model process runs.
- Review is ready and all attempt evidence is pushed before Milestone 56.

### Review checkpoint

Distinguish shared skill defects from adapter-specific, evaluator, fixture, resource, operational, or variance failures using the complete distribution.

## Milestone 56: Close qualification evidence with one correction generation

### Objective

Produce complete current Custom and adapter evidence without repeated shared edits or unnecessary reruns.

### Dependencies

- Milestone 55 produced and published a complete classified ledger.

### Scope and implementation

- If every required profile passes, make no behavior correction. Otherwise make one coherent shared correction generation for proven shared defects and isolate adapter-specific fixes to their owners.
- Run targeted canaries, then only failed or exact-identity-invalidated cases/profiles through the published runner.
- Preserve every criterion, safety control, resource contract, Custom ownership boundary, adapter-specific boundary, and clean-slate major contract.
- When all required `high` profiles pass, atomically replace the active qualification evidence and public validation with those attempts and remove obsolete `medium` results from active source without a compatibility reader.
- Stop paid execution and re-plan from the ledger if a repeated confirmed systemic defect remains after the final frozen run.

### Verification and acceptance criteria

- Run all affected qualification and root deterministic suites before paid work.
- Verify Custom's 12 journeys and every adapter's 2 direct journeys at `high`, exact baseline composition, target identity, resources, evidence integrity, and public presentation.
- No more than one shared correction generation occurs, only failed or invalidated work reruns, and release targets have complete passing current or explicitly pinned evidence.
- Review is ready and correction/evidence commits are signed, signed off, and pushed.

### Review checkpoint

Confirm fixes follow ownership boundaries, no restrictive adapter range or compatibility bridge returns, and evidence is exact rather than inferred from incomplete profiles.

## Milestone 57: Publish the clean skill 5.0 release

### Objective

Integrate the reviewed feature state, select valid fresh or explicitly pinned evidence through the native release contract, publish skill 5.0.0, and remove authorized obsolete 4.0.x release surfaces.

### Dependencies

- Semantic and qualification closure are published.
- Registry package majors and every release identity input verify.

### Scope and implementation

- Run final release-identity, package, evidence-envelope, provenance, documentation, website, and clean-slate checks.
- Review the complete feature branch against freshly resolved `main`, integrate without losing concurrent work, push explicit refs, and monitor established publication workflows.
- Verify the public skill artifact and website expose only the supported 5.0 contract.
- Delete authorized 4.0.0, 4.0.1, and 4.0.2 tag/release surfaces when host credentials permit; do not rewrite shared history or retain an active compatibility loader.

### Acceptance criteria and review checkpoint

- The exact integrated state is ready against `main`, signed publication metadata verifies, and trusted public artifacts resolve to the intended 5.0.0 release.
- Any unavailable registry, protected-branch, workflow, or release-host prerequisite remains an explicit blocker rather than a false completion.
- Inspect fresh-versus-pinned disclosure, source evidence integrity, version closure, clean-slate removals, and public naming before declaring release completion.

## Milestone 58: Complete the cross-repository contradiction audit

### Objective

Prove that active packages, specifications, websites, knowledge-base content, fixtures, and release surfaces describe one efficient, scalable, clean-slate moldea system.

### Dependencies

- Milestone 57 is complete or has only explicit external publication prerequisites remaining.

### Scope and implementation

- Search the active `skill`, `../packages`, `../platform`, `../knowledge-base`, and paired fixture contracts for superseded versions, global-install guidance, body-bearing default inspection, false completeness, restrictive compatible ranges, stale evaluation counts, direct-CLI paths, legacy evidence loaders, and PR Assurance availability overclaims.
- Ignore concurrent unrelated changes and never read excluded archive or backup trees.
- Correct only contradictions directly caused by this implementation, review each affected repository against its current target, publish cohesive signed changes, and verify exact remote tips and workflows.

### Verification and acceptance criteria

- All repository-owned regression, docs, website, package, evidence, fixture-parity, release-identity, and contradiction checks pass at their established boundaries.
- Public surfaces consistently use `moldea`, repository-bound installation, bounded on-demand reads, honest PR Assurance availability, 74 semantic scenarios, and 12 inherited plus 2 direct adapter journeys.
- No backward-compatible or legacy active path remains for the replaced contracts, and no unrelated agent work is included.

### Review checkpoint

Confirm the launched surface is internally consistent, resource-bounded, production-safe, and supported by exact published evidence rather than historical claims.

## Execution scope

Milestones 50 through 52 are complete and published. Milestone 53's first correction is published; complete its final two-cause correction, exact high-reasoning gate, one official 74-case high attempt, and atomic removal of medium evidence and temporary readers. Then implement and publish Milestones 54 through 58 sequentially: apply the audited collect-first and finite stop-loss architecture to Custom and adapters; replace active qualification evidence without mixed-effort compatibility; finish paired public/private GitHub fixtures and production-scale repository/PR Assurance validation; publish clean skill 5.0.0 and remove obsolete 4.0.x release surfaces; and complete the cross-repository contradiction audit. Preserve every safety, privacy, provenance, resource, signing, review, branch, clean-slate, protected-instruction, and unrelated-concurrent-work constraint from the challenged plan.
