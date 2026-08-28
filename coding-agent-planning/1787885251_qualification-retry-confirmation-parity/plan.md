# Qualification retry and confirmation parity

## Current behavior and repository evidence

- `qualification/src/execution/executor.ts` runs each profile case once through preparation, deterministic-before verification, one actor, deterministic-after verification, workspace assertions, one judge when deterministic evidence permits it, and one case result. Any failed completed case is terminal for the attempt; there is no confirmation sequence.
- `qualification/src/codex-host/codex-host.ts` delegates each actor and judge call directly to the shared Codex evaluation host. `qualification/src/execution/executor.ts` records an unexpected host rejection as an errored attempt, so provider, network, proxy, and timeout failures are not retried automatically.
- `qualification/src/checkpoint/checkpoint.ts` and `qualification/src/execution/stages.ts` already atomically persist every meaningful stage and restore completed actor and judge artifacts. A running stage is reset to pending after interruption, but it has no operational-retry history to preserve.
- `tooling/semantic-evaluation/operational-retry.mjs` implements the desired operational policy: `execution-failed`, `proxy-unavailable`, and `timed-out` host failures retry indefinitely with capped exponential backoff and bounded jitter; other host failures and local deterministic failures stop. `tests/semantic-evaluation-runner.mjs` separately implements the desired two-confirmation policy: a failed initial trial is retained, at most two confirmations run, both must pass to recover, and the sequence stops on the first failed confirmation.
- `qualification/src/cache/cache.ts` and `qualification/src/execution/model-stages.ts` currently allow content-addressed actor and judge evidence reuse. Confirmation calls cannot use those same cache entries because replaying the initial result would not provide independent evidence.
- Qualification evidence is a versioned public contract. `qualification/src/contracts/types.ts`, `qualification/src/result/evidence.ts`, `qualification/src/result/recorder.ts`, `qualification/src/baseline/baseline.ts`, and the website qualification loader currently treat protocol 5 as current while retaining protocols 3 and 4 as history. The committed evidence files use one flat actor/judge artifact set per case, so trial histories require a new protocol rather than reinterpreting protocol 5.
- `tooling/release-identity/constants.mjs` and `tooling/release-identity/evidence.mjs` independently pin protocol 5 and rederive the exact current passing stage, case, artifact, package, source, and Custom-baseline requirements. This release boundary must understand recovered protocol 6 histories instead of assuming every passing case has one flat passing trial.
- `qualification/README.md`, `docs/adapter-qualification.md`, and the root `README.md` document one actor and one judge per case, maximums of 16 Custom calls and 20 Vercel AI SDK calls, checkpoint recovery, current protocol 5, and current cache behavior. The website renders the same flat case shape and labels protocol 5 as `Current Sol`.

## Desired final behavior

Qualification will use the same reliability semantics as semantic evaluation while preserving qualification-specific deterministic gates:

1. Retry only retryable Codex host failures (`execution-failed`, `proxy-unavailable`, and `timed-out`) on the same actor or judge stage. Persist safe retry metadata before each delay, use the semantic evaluator's capped exponential backoff and jitter, and continue indefinitely until the stage succeeds, the operator cancels, inputs change, or a non-retryable failure occurs. Operational retries do not consume a trial or confirmation.
2. Treat source-state, coverage, candidate, baseline, project preparation, deterministic-before, schema/output validation, integrity, and other local failures as terminal preconditions or execution errors. They must not trigger confirmations or operational retries.
3. When a completed initial actor-dependent trial fails because of actor output, post-actor deterministic verification, workspace assertions, or judge verdict, retain that initial failure and run up to two complete confirmations from pristine project state. Both confirmations must pass for the case to recover. A failed confirmation is terminal and skips any remaining confirmation.
4. Keep actor and judge stage independence. A retryable judge failure must not repeat a completed actor. An actor retry must restore the pristine pre-actor trial snapshot before another host call so partial writes from a failed host process cannot leak into the retry.
5. Bypass cross-attempt model caches for every confirmation actor and judge call. The initial trial may continue to use a valid existing cache. Checkpoint artifacts, rather than the shared cache, remain the only mechanism for resuming a completed confirmation stage within the same attempt.
6. Persist every initial and confirmation trial, its ordered stage evidence, failures, artifacts, cache provenance, usage, and operational retries. A recovered case and the overall passing attempt must remain auditable as an initial failure followed by exactly two passing confirmations.
7. Preserve interruption-safe resume throughout actor retries, judge retries, and confirmations. Resume must not repeat a completed actor or completed confirmation and must continue operational retry numbering from persisted evidence.

## Scope and explicit exclusions

### In scope

- Shared operational-retry ownership for both semantic evaluation and qualification.
- Qualification protocol 6 checkpoint, attempt, case-history, stage, artifact, verifier, recorder, baseline, CLI, and website contracts.
- Two-confirmation execution and recovery semantics for Custom and adapter-specific profiles.
- Focused and regression tests, documentation synchronization, and deterministic dry-run verification.

### Excluded

- No changes to qualification cases, profiles, probes, scoring requirements, actor prompts, judge requirements, portable skill behavior, candidate package composition, model, reasoning effort, timeout, or trusted network boundary.
- No finite cap on retryable operational failures; this deliberately matches semantic evaluation. Cancellation and evidence-boundary changes remain the safety stops.
- No confirmation for pre-model or deterministic-before failures, and no attempt to turn non-retryable host failures into semantic failures.
- No rewrite, deletion, replacement, or manual override of committed protocol 3, 4, or 5 evidence. Historical artifacts and pointers remain immutable and readable.
- No paid qualification or semantic model run is authorized by implementation approval. Fresh protocol 6 Custom and adapter qualifications require their own just-in-time paid-execution approval after this implementation is reviewed and committed.
- No dependency, database, migration, deployment-infrastructure, or compatibility-matrix change is required.

## Contract and architecture

### Shared operational retry primitive

Move the retry primitive from semantic-specific ownership into `tooling/codex-evaluation-host/operational-retry.mjs`, because retry classification already belongs to the shared host and both evaluation workflows consume it. Expose neutral names such as `calculateCodexEvaluationOperationalRetryDelay` and `runCodexEvaluationOperationalStage`, plus the matching `ICodexEvaluationOperationalRetry` type, from `tooling/codex-evaluation-host/index.mjs` and `index.d.mts`.

The shared runner will retain the existing 5-second exponential start, 60-second cap, and 75–100 percent jitter. It will accept an optional `AbortSignal`; both the operation and retry wait will stop promptly when cancellation occurs. Its `onRetry` callback will run before the delay and receive only the stable category, ISO failure time, contiguous failure count, and selected delay. It will never persist raw provider messages.

Update `tests/semantic-evaluation-runner.mjs` to consume the shared export without changing semantic checkpoint or result contracts. Remove `tooling/semantic-evaluation/operational-retry.mjs`, its unit test, and its semantic index exports so there is one authoritative implementation rather than a compatibility alias.

### Protocol 6 evidence model

Bump `QUALIFICATION_EVIDENCE_PROTOCOL_VERSION` from 5 to 6. Freeze the current protocol 5 schemas as historical schemas alongside protocols 3 and 4. Current checkpoint and release-gate schemas will accept only protocol 6, while recorded-history schemas and website consumers will continue to parse protocols 3–5 with their original flat artifact rules.

Add these protocol 6 concepts to `qualification/src/contracts/types.ts` and export their public contracts explicitly from `qualification/src/contracts/index.ts`:

- A confirmation policy fixed to `{ version: 1, requiredPassingConfirmations: 2 }`, matching semantic evidence.
- An operational retry record containing `category`, `failedAt`, `failureCount`, and `retryDelayMs`.
- A protocol 6 stage checkpoint with an append-only `operationalRetries` array. Counts must be contiguous from one, only actor or judge stages may contain retries, and skipped or cached stages may not claim operational failures.
- A case trial identified as `initial`, `confirmation-1`, or `confirmation-2`, with `kind`, nullable `confirmationIndex`, `passed`, `durationMs`, the existing actor/judge usage and cache provenance, trial-relative deterministic, actor, judge, assertion, and patch paths, and trial-local failures.
- A terminal case history with `status: passed | recovered | failed`, `confirmationStatus: not-required | passed | rejected`, total duration, and one to three ordered trials. Initial passes must have no confirmations; recovered cases must contain a failed initial and two passing confirmations; failed confirmed cases must contain a failed initial followed by the first failed confirmation or one passing and one failed confirmation.
- A protocol 6 attempt result containing the fixed confirmation policy and the new case histories. An attempt may pass when every case is either `passed` or `recovered`; a recovered case must never be flattened into an ordinary pass.

Use protocol-specific schema declarations instead of extending the new shape into historical protocols. This keeps protocol 3–5 stage and case contracts frozen and avoids accidentally requiring new fields in immutable evidence.

### Stage and checkpoint lifecycle

Generate the complete protocol 6 stage inventory deterministically. Keep the four attempt-level stages, then define each case's `initial`, `confirmation-1`, and `confirmation-2` trial stages for `prepare`, `deterministic-before`, `actor`, `deterministic-after`, `assertions`, and `judge`, followed by one case `result` stage. Use stable IDs in the form `case:<case-id>:trial:<trial-id>:<stage>` and `case:<case-id>:result`.

Predeclare all possible confirmation stages in the checkpoint so resume and public verification have one deterministic inventory. Add a checkpoint helper that atomically marks an unused confirmation group skipped with zero-duration, no-cache, no-retry evidence. An initial pass skips both groups; a failed first confirmation skips the second. Result verification will require the exact skip pattern implied by the case history.

When interruption changes a running actor or judge stage back to pending, preserve its operational retry array and cache identity while clearing only incomplete execution timing and terminal error data. Resuming the stage will pass the persisted retry count into the shared runner. Checkpoint validation will reject gaps, duplicate counts, unsafe categories, retries on non-model stages, and contradictory terminal state.

### Trial execution and pristine state

Refactor the case loop in `qualification/src/execution/executor.ts` into a focused trial orchestration boundary without changing project preparation, deterministic verification, workspace assertions, or judge semantics. The orchestration will:

1. Prepare a new workspace from the committed scenario for every initial or confirmation trial.
2. Complete deterministic-before and capture a pristine pre-actor snapshot.
3. Run or restore the actor stage. Before every operational actor retry, restore that pristine snapshot; after a successful actor, persist the existing post-actor snapshot before advancing.
4. Run deterministic-after, workspace assertions, and patch capture.
5. Skip the judge when deterministic-after or assertions already establish failure; otherwise run or restore the independent judge. Recreate the read-only judge workspace for every operational judge retry.
6. Persist the trial artifact and derive its pass solely from the existing deterministic, workspace, actor-outcome, and judge contracts.
7. Append the trial to the case history, apply the fixed confirmation decision, skip unused confirmation stages, and persist the terminal case result.

The attempt will continue to later cases after a recovered case. It will stop after a confirmed case failure, matching the semantic evaluator's blocking-candidate behavior and avoiding paid work that cannot make the attempt pass. Already completed earlier cases remain checkpointed and public. Execution errors and cancellation retain the current errored or incomplete attempt semantics.

`qualification/src/execution/model-stages.ts` will accept trial identity, cache policy, pre-actor restoration, and an operational-retry callback owned by the executor. Initial stages retain current cache reads and writes. Confirmation stages set cache use to false, include trial identity in evidence/cache-key inputs to prevent collisions, and require fresh `cacheSourceAttemptId: null` evidence. Paid approval remains once per process immediately before the first uncached host call.

### Artifact layout and verification

Protocol 6 will retain `cases/<case-id>/case-result.json` and place executed trial artifacts under:

```text
cases/<case-id>/trials/initial/
cases/<case-id>/trials/confirmation-1/
cases/<case-id>/trials/confirmation-2/
```

Each executed trial directory owns the existing deterministic-before, deterministic-after, workspace assertions, workspace patch, actor output/evidence/events/prompt/schema, and either judge output/evidence/events/prompt/schema or judge-skipped artifact. Internal workspaces and snapshots will mirror case and trial identity. Skipped confirmation groups create no trial directory or artifacts.

Refactor `qualification/src/result/evidence.ts` into explicit historical-flat and current-trial verification paths. Protocol 6 verification must parse every executed trial artifact, recompute every digest, validate stage-to-artifact correspondence, derive each trial pass, derive confirmation status and case status, require fresh confirmation model evidence, validate contiguous operational retry records, validate unused-stage skips, and derive the attempt verdict. Protocol 3–5 verification must continue using the unchanged flat paths and invariants.

`qualification/src/result/recorder.ts` will write protocol 6 results and pointers while accepting protocols 3–5 only as read-only history. `qualification/src/baseline/baseline.ts` will require a passing protocol 6 Custom result with identical current inputs; a protocol 5 pass remains historical and cannot satisfy the new adapter baseline.

Update the independent release-evidence verifier in `tooling/release-identity/` to pin protocol 6, use the protocol 6 deterministic stage inventory, accept both initially passing and correctly recovered cases, require all referenced trial artifacts and current digests, and continue requiring the adapter attempt to reference the exact current passing Custom baseline. Keep this verification independent from the qualification recorder so the release gate still catches producer defects rather than merely trusting producer output.

### Cost, progress, and operator UX

Replace `getQualificationModelCallCount` with a name that states it is the maximum planned trial-call count. It will calculate six calls per case: one actor and one judge for the initial trial plus the same pair for each of two possible confirmations. The Custom profile therefore reports 48 planned calls and the ten-case Vercel AI SDK profile reports 60. Judge skips and confirmation short-circuiting reduce actual calls; operational retries are additional and cannot be represented by a finite maximum.

Rename the paid approval request field accordingly and update the prompt to say “planned trial calls” and explicitly state that retryable operational failures can add calls. Add an optional progress callback to the execution options so the CLI can report the stage, safe failure category, retry number, and delay to stderr without contaminating JSON stdout or coupling library code to the terminal. Extend result and status presentation to identify recovered cases, confirmation progress, and aggregate retry counts concisely.

### Website consumption

Update `website/src/lib/qualification/types.ts`, `loader.ts`, and `validations.ts` to treat protocol 6 as current, retain frozen protocol 3–5 consumers, load every protocol 6 trial and artifact, and independently derive the same confirmation and retry invariants enforced by the producer. Existing protocol 5 attempts remain visible as `Historical Sol`; protocol 6 becomes `Current Sol`.

Keep `qualification-case-evidence.astro` as the case-level summary and add a focused `website/src/components/qualification-trial-evidence/qualification-trial-evidence.astro` component for one initial or confirmation trial. The case view will show `passed`, `recovered`, or `failed`, expose the initial failure even after recovery, label confirmation order and outcome, show actor/judge cache provenance and retry counts, and retain raw artifact links. Use semantic headings, unique trial-derived IDs, keyboard-operable native disclosure controls, existing theme tokens, fluid grids, and the established scrollable-table pattern. No new animation is needed. Verify the page at 320 px and larger widths, in light and dark themes, and with keyboard and screen-reader-oriented queries.

Update both qualification route pages so version labels and summaries distinguish current protocol 6, historical protocol 5 and 4 Sol, and protocol 3 Terra without implying that historical evidence satisfies the current gate.

## Files and symbols

### Shared host and semantic evaluator

- Add `tooling/codex-evaluation-host/operational-retry.mjs` and `operational-retry.test-unit.mjs`.
- Update `tooling/codex-evaluation-host/index.mjs`, `index.d.mts`, and `host.test-unit.mjs` for the shared runtime and type exports, cancellation, category boundaries, delay behavior, persistence ordering, and resume counts.
- Remove `tooling/semantic-evaluation/operational-retry.mjs` and `operational-retry.test-unit.mjs`.
- Update `tooling/semantic-evaluation/index.mjs`, `index.d.mts`, and `tests/semantic-evaluation-runner.mjs` to consume the shared primitive and preserve semantic behavior.
- Update root and qualification formatting inputs in `package.json` and `qualification/package.json` only as needed to include the new shared files.

### Qualification producer

- Update `qualification/src/constants/index.ts` for protocol 6 and the confirmation-policy constants.
- Update `qualification/src/contracts/types.ts`, `index.ts`, and `types.test-unit.ts` for current protocol 6 and frozen protocol 3–5 schemas.
- Update `qualification/src/checkpoint/checkpoint.ts`, `index.ts`, and `checkpoint.test-integration.ts` for retry preservation, trial stages, batch skips, and resume normalization.
- Update `qualification/src/execution/types.ts`, `stages.ts`, `model-stages.ts`, `executor.ts`, `transformers.ts`, and `index.ts` for planned call counts, retry notifications, trial orchestration, pristine retries, confirmation decisions, artifact paths, and result derivation.
- Update `qualification/src/execution/stages.test-unit.ts`, `model-stages.test-integration.ts`, `executor.test-integration.ts`, `transformers.test-unit.ts`, and `attempts.test-integration.ts` for the new lifecycle and unsupported older local checkpoints.
- Update `qualification/src/cache/cache.ts`, `types.ts`, and `cache.test-integration.ts` only where protocol 6 trial identity and confirmation cache exclusion affect current cache validation.
- Update `qualification/src/result/evidence.ts`, `recorder.ts`, `types.ts` if the verifier model requires it, and `recorder.test-integration.ts` for protocol-aware artifact verification, publication, pointers, and frozen history.
- Update `qualification/src/baseline/baseline.ts` and `baseline.test-integration.ts` so only current protocol 6 can satisfy the Custom baseline.
- Update `qualification/src/interactive/interactive.ts`, `presentation/presentation.ts`, `cli/runner.ts`, and their existing focused tests for accurate approval cost, retry progress, and recovered-case reporting.
- Update `tooling/release-identity/constants.mjs`, `constants.d.mts` if its exported contract changes, `evidence.mjs`, and `evidence.test-integration.mjs` for protocol 6 current-evidence enforcement, recovered-case derivation, stage skips, trial artifact completeness, and current Custom-baseline linkage.

### Website and documentation

- Update `website/src/lib/qualification/types.ts`, `loader.ts`, `validations.ts`, `index.ts`, and `loader.test-integration.ts` for the protocol 6 model and frozen history.
- Update `website/src/components/qualification-case-evidence/qualification-case-evidence.astro` and add `website/src/components/qualification-trial-evidence/qualification-trial-evidence.astro`.
- Update `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro`, `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/attempts/[attemptId]/index.astro`, and `website/src/pages/evidence/qualification/_index.test-e2e.ts` for current/historical labels and visible trial history.
- Update `README.md`, `qualification/README.md`, and `docs/adapter-qualification.md` for retry categories, backoff/cancellation, confirmation eligibility, short-circuiting, checkpoint resume, cache independence, protocol 6, artifact layout, 48/60 planned call counts, and the requirement for fresh current evidence.

## Test strategy

### Shared retry tests

- Verify exact exponential/capped jitter boundaries and invalid inputs.
- Verify safe metadata is persisted before each wait, failure counts resume contiguously, and eventual success is returned.
- Verify execution-failed, proxy-unavailable, and timed-out errors retry, while aborted, output-limit, spawn, schema, deterministic, and unknown failures do not.
- Verify abort before execution and during backoff stops promptly without appending a fabricated retry.
- Run semantic runner tests to prove moving ownership did not change checkpoint or confirmation behavior.

### Qualification execution tests

- Initial pass: one trial, both confirmation groups skipped, normal cache behavior retained.
- Recovery: failed initial plus two passing confirmations, passing attempt, all original evidence retained, and confirmations fresh despite an initial cache hit.
- Terminal first confirmation: failed initial plus failed confirmation 1, confirmation 2 skipped, attempt failed, no later case or model call executed.
- Terminal second confirmation: failed initial, passing confirmation 1, failed confirmation 2, attempt failed.
- Failure boundaries: source, coverage, candidate, baseline, preparation, deterministic-before, host schema/output, integrity, and non-retryable host failures do not start confirmations.
- Post-actor deterministic and assertion failures do start confirmations while their judge stage remains skipped within each affected trial.
- Actor operational retries restore pristine pre-actor state and do not create extra trials; judge operational retries retain the completed actor and recreate only the judge workspace.
- Cancellation during backoff produces a resumable checkpoint; resume preserves retry numbering and does not repeat completed actor, judge, or confirmation stages.
- Input or host identity drift during retries or confirmations stops with the existing new-attempt requirement.
- Dry run uses the protocol 6 lifecycle without cache or model calls and normally skips confirmations because the deterministic fake path passes initially.

### Evidence and website tests

- Parse and verify valid protocol 6 initial-pass, recovered, first-confirmation-failure, and second-confirmation-failure attempts.
- Reject reordered, duplicate, excessive, missing, or contradictory confirmations; invalid skipped-stage patterns; unsafe or non-contiguous retry metadata; confirmation cache provenance; missing trial artifacts; path escapes; and digest tampering.
- Continue verifying every committed protocol 3–5 attempt and latest pointer unchanged.
- Prove a protocol 5 Custom pass cannot satisfy the protocol 6 baseline, while a matching protocol 6 recovered Custom pass can.
- Prove the release-identity verifier accepts complete initial-pass and recovered protocol 6 evidence, rejects protocol 5 as current, and rejects malformed confirmation, stage-skip, artifact, or Custom-baseline relationships independently of the qualification verifier.
- Verify website loading and publishing for protocol 6 alongside protocol 5 history, including missing current evidence before the first official protocol 6 run.
- Verify the evidence UI exposes initial failure, both confirmations, retry counts, skipped judges, and raw artifacts with accessible names, keyboard operation, responsive layout, and both themes.

## Verification commands

Run the narrowest changed-boundary checks first, followed by full package regression checks:

```bash
npm run test:unit
npm run test:integration
npm run qualification:test:unit
npm run qualification:test:integration
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:dry-run
npm run qualification:verify
npm --prefix website run test:unit
npm --prefix website run test:integration
npm --prefix website run test:e2e -- --grep qualification
npm --prefix website run typecheck
npm --prefix website run lint
npm --prefix website run format:check
npm run docs:check
npm run website:build
npm run eval:semantic:verify
```

Then run `npm test`, `npm run qualification:test`, and `npm --prefix website test` as the complete correctness suites for their established boundaries. Inspect the generated website build to confirm that no test artifacts are published.

`npm run release:check` is expected to remain blocked after the protocol bump until fresh protocol 6 Custom and adapter results exist. Do not weaken that gate and do not treat this expected absence as an implementation regression. Once separately authorized official runs have produced current evidence, rerun `npm run qualification:verify` and `npm run release:check`.

## Documentation, compatibility, and rollout

- This is a high-blast-radius public evidence-contract change. The reversible path is a new protocol with immutable historical readers, not mutation of committed results. No existing attempt directory or `latest.json` is edited during implementation.
- The qualification-engine digest will change, intentionally invalidating protocol 5 as a current baseline. Existing history must continue to pass `qualification:verify` and remain publishable on the website.
- The semantic operational helper moves, but its evidence protocols and behavior do not change. Existing semantic evidence must pass deterministic verification; no paid semantic rerun is part of this work.
- After implementation is reviewed and committed, run Custom qualification first under separate paid approval. Only a passing current Custom result, including a valid recovered result, may become the baseline for a separately approved adapter qualification. If either confirmation sequence ends in failure, start a new attempt only after resolving the underlying source, fixture, evaluator, or product defect; do not replace the failed evidence.
- Rollback before new protocol 6 evidence is published is a normal code revert. After protocol 6 evidence is published, rollback must retain protocol 6 history readers even if protocol 6 stops being current, because published attempt history is append-only.
- No new durable coding guidance is expected; the protected coding instructions already cover retries, idempotency, testing, documentation synchronization, and versioned public-contract changes. Reassess this after implementation and provide a handoff prompt only if the completed design reveals a genuinely missing durable rule.

## Risks and controls

- **Unbounded provider outage:** retries intentionally remain unbounded for parity. Capped backoff, explicit progress, abortable waits, atomic checkpoints, and input revalidation prevent silent spin or evidence drift.
- **Partial actor writes on retry:** restore the pristine pre-actor snapshot before every actor host attempt and test with a host that mutates before throwing.
- **False recovery through cache replay:** disable model cache reads and writes for confirmations, require null cache sources in verifier logic, and include trial identity in model evidence.
- **Evidence contradiction:** derive trial, case, and attempt outcomes independently in both producer and verifier; reject malformed stage and artifact sequences rather than trusting stored statuses.
- **Historical breakage:** keep separate protocol 3–5 schemas, artifact paths, and verifier branches, and run verification against the complete committed history.
- **Cost misunderstanding:** present 48/60 as maximum planned trial calls, state that operational retries are additional, preserve just-in-time default-deny approval, and short-circuit terminal confirmation failures.
- **Resume duplication:** predeclare stage IDs, persist retries before delay, persist actor success before judge, and test interruption at every model and confirmation boundary.
- **Website mislabeling:** version-gate current eligibility, label protocol 5 and 4 as historical Sol, and test the temporary state where no protocol 6 current attempt exists.

## Acceptance criteria

- Qualification and semantic evaluation use one shared, tested operational retry primitive and retain their existing retryable category semantics.
- Retryable actor and judge host failures persist safe evidence and retry without consuming a trial, losing resume state, repeating a completed actor, or inheriting partial actor writes.
- A failed completed initial qualification trial recovers only after two fresh passing confirmations; either confirmation failure is terminal, later confirmation work is skipped, and the initial failure remains visible.
- Pre-model, deterministic-before, non-retryable, cancellation, and input-drift failures never become confirmation evidence.
- Protocol 6 checkpoints, results, artifacts, verifier, baseline, CLI, and website agree on stage inventory, trial order, retry history, cache provenance, confirmation status, and final verdict.
- Protocol 3–5 committed evidence remains unmodified, verifiable, and visible as history, but cannot satisfy the protocol 6 release gate or Custom baseline.
- The approval prompt accurately reports 48 Custom or 60 Vercel AI SDK planned trial calls and states that operational retries are additional.
- All targeted and broader deterministic checks pass, including qualification dry run, complete historical qualification verification, semantic evidence verification, and website accessibility/responsiveness/theme checks.
- No paid evaluation runs or committed evidence changes occur without a separate explicit authorization.

## Approval required

Approve implementation of the complete protocol 6 qualification reliability change described above: shared operational retries, checkpointed two-confirmation recovery, fresh confirmation evidence, versioned producer/verifier/baseline/website contracts, tests, and documentation. Approval does not authorize any paid semantic or qualification run and does not authorize modifying existing committed evidence.
