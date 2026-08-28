# Qualification retry and confirmation parity milestones

## Milestone 1: Share the operational retry primitive without changing semantic behavior

### Objective

Move the existing semantic operational retry implementation to the shared Codex evaluation host boundary, add cancellation support, and leave semantic evaluation evidence, confirmation behavior, retry classification, timing, and checkpoint semantics unchanged. This milestone ends with one production retry implementation that qualification can consume in Milestone 2.

### Dependencies

- No earlier implementation milestone.
- The underlying plan and this milestone sequence must be approved before work starts.
- No paid model execution is required or authorized.

### In-scope files and contracts

- Add `tooling/codex-evaluation-host/operational-retry.mjs` as the authoritative implementation.
- Add `tooling/codex-evaluation-host/operational-retry.test-unit.mjs` as its focused test owner.
- Update `tooling/codex-evaluation-host/index.mjs` and `tooling/codex-evaluation-host/index.d.mts` to export:
  - `calculateCodexEvaluationOperationalRetryDelay`
  - `runCodexEvaluationOperationalStage`
  - `ICodexEvaluationOperationalRetry`
- Update `tooling/codex-evaluation-host/host.test-unit.mjs` only where shared retry-category ownership or cancellation integration benefits from adjacent coverage.
- Remove `tooling/semantic-evaluation/operational-retry.mjs` and `tooling/semantic-evaluation/operational-retry.test-unit.mjs`.
- Update `tooling/semantic-evaluation/index.mjs`, `tooling/semantic-evaluation/index.d.mts`, and `tests/semantic-evaluation-runner.mjs` to consume the shared host export and remove the superseded semantic-specific public surface.
- Update `qualification/package.json` so its explicit shared-host formatting boundary includes the new implementation and test. Update root `package.json` only if implementation inspection identifies a real script input that must change; the currently inspected root scripts discover the new test through their existing glob.
- Do not change semantic protocol, semantic checkpoint or result schemas, qualification behavior, qualification protocol, committed evidence, or public documentation in this milestone.

### Implementation work

1. Move the existing delay calculation and retry loop into the shared host module with neutral Codex-evaluation names. Preserve the 5-second initial delay, 60-second cap, 75–100 percent jitter, positive and non-negative count validation, safe retry categories, persistence-before-wait ordering, and indefinite retry behavior.
2. Add optional `AbortSignal` support to the shared operation and default retry wait. Cancellation before an operation or during backoff must reject promptly, must not be classified as retryable, and must not append a fabricated retry record.
3. Keep the retry callback payload limited to `category`, `failedAt`, `failureCount`, and `retryDelayMs`; do not expose or persist provider diagnostics.
4. Export the runtime and strongly typed contracts from the shared host entry files using the repository's explicit export conventions.
5. Switch the semantic runner to the shared primitive, preserving its injected test seams and existing actor and judge retry-count resume behavior.
6. Remove the old semantic-owned implementation, tests, and exports so there is no alias, fallback, or parallel retry path.
7. Update only the formatting-script inputs required for the new shared files and review the final milestone diff for unintended changes.

### Focused tests and verification

- Verify exact exponential and capped jitter outputs plus invalid `failureCount` and random inputs.
- Verify every safe retry is persisted before waiting, counts remain contiguous across resume, and eventual success is returned.
- Verify `execution-failed`, `proxy-unavailable`, and `timed-out` retry, while aborted, output-limit, spawn, unknown, and ordinary local errors do not.
- Verify cancellation before execution and during backoff stops without an extra retry callback.
- Verify the semantic runner still persists actor and judge retries, resumes their counts, does not repeat a completed actor for judge failures, and preserves the current confirmation policy.
- Run:

```bash
node --test tooling/codex-evaluation-host/operational-retry.test-unit.mjs tooling/codex-evaluation-host/host.test-unit.mjs
npm run test:unit
npm run test:integration
npm run qualification:typecheck
npm run qualification:format:check
npm run eval:semantic:verify
```

### Acceptance criteria

- One shared operational retry implementation owns the existing policy and exposes the neutral runtime and TypeScript contracts.
- The semantic-specific implementation and exports are removed completely.
- Abortable waits work without changing retry categories or producing false retry evidence.
- Semantic unit, integration, and committed-evidence verification pass without a protocol, schema, or recorded-evidence change.
- Qualification behavior and protocol remain unchanged at this milestone checkpoint.
- No paid model call or committed evidence change occurs.

### Review checkpoint

Review the shared module's ownership, retry-category boundary, exact delay behavior, persistence ordering, cancellation cleanup, type exports, removal of the old semantic path, and proof that semantic evidence remains unchanged. Do not continue to Milestone 2 until this foundation is complete and reviewed.

## Milestone 2: Deliver protocol 6 qualification retries and confirmation recovery end to end

### Objective

Implement the complete protocol 6 qualification reliability contract across checkpoints, trial execution, caches, artifacts, result verification, recording, Custom baselines, release eligibility, CLI presentation, website consumption, documentation, and regression coverage. The finished milestone must retry operational host failures without consuming trials and recover an initial model-dependent failure only after two fresh passing confirmations.

### Dependencies

- Milestone 1 must be completed and reviewed.
- This milestone requires explicit developer authorization naming Milestone 2 after the milestone sequence is approved.
- Existing protocols 3–5 and their committed artifacts are immutable inputs and must remain readable.
- No paid semantic or qualification run is required or authorized. Fresh official protocol 6 evidence is a separate post-implementation operation with separate just-in-time approval.

### In-scope files and contracts

#### Qualification protocol, checkpoints, and execution

- Update `qualification/src/constants/index.ts` for qualification evidence protocol 6 and the fixed confirmation policy `{ version: 1, requiredPassingConfirmations: 2 }`.
- Update `qualification/src/contracts/types.ts`, `qualification/src/contracts/index.ts`, and `qualification/src/contracts/types.test-unit.ts` for:
  - frozen protocol 3, 4, and 5 history schemas
  - protocol 6 operational retry records
  - protocol 6 stage checkpoints
  - initial and confirmation trial results
  - terminal `passed`, `recovered`, and `failed` case histories
  - current attempt and latest-pointer schemas
- Update `qualification/src/checkpoint/checkpoint.ts`, `qualification/src/checkpoint/index.ts`, and `qualification/src/checkpoint/checkpoint.test-integration.ts` for deterministic trial stages, atomic unused-confirmation skips, persisted retry histories, and interruption normalization that preserves retry counts.
- Update `qualification/src/execution/types.ts`, `qualification/src/execution/stages.ts`, `qualification/src/execution/model-stages.ts`, `qualification/src/execution/executor.ts`, `qualification/src/execution/transformers.ts`, and `qualification/src/execution/index.ts` for trial orchestration, pristine actor retries, independent judge retries, confirmation decisions, planned-call calculation, progress notifications, artifact paths, and result derivation.
- Update `qualification/src/execution/stages.test-unit.ts`, `qualification/src/execution/model-stages.test-integration.ts`, `qualification/src/execution/executor.test-integration.ts`, `qualification/src/execution/transformers.test-unit.ts`, and `qualification/src/execution/attempts.test-integration.ts` for the complete current lifecycle and preservation of unsupported older local checkpoints.
- Update `qualification/src/cache/cache.ts`, `qualification/src/cache/types.ts`, and `qualification/src/cache/cache.test-integration.ts` only where protocol 6 trial identity, cache validation, and confirmation cache exclusion require changes.

#### Evidence, baseline, and release eligibility

- Update `qualification/src/result/evidence.ts`, `qualification/src/result/recorder.ts`, `qualification/src/result/types.ts` if its verifier model requires a contract change, and `qualification/src/result/recorder.test-integration.ts` for protocol-specific artifact verification, immutable historical reads, current recording, and current or last-passing pointers.
- Update `qualification/src/baseline/baseline.ts` and `qualification/src/baseline/baseline.test-integration.ts` so only matching protocol 6 Custom evidence, including a correctly recovered pass, can satisfy an adapter baseline.
- Update `tooling/release-identity/constants.mjs`, `tooling/release-identity/constants.d.mts` only if its exported contract changes, `tooling/release-identity/evidence.mjs`, and `tooling/release-identity/evidence.test-integration.mjs` so the independent release gate pins protocol 6 and rederives trial, stage, artifact, package, source, and current Custom-baseline validity.

#### CLI and operator-facing behavior

- Update `qualification/src/interactive/interactive.ts`, `qualification/src/presentation/presentation.ts`, `qualification/src/cli/runner.ts`, and their existing focused tests.
- Replace the ambiguous model-call count with a maximum planned trial-call count of six calls per case: 48 for Custom and 60 for the ten-case Vercel AI SDK profile.
- State in the approval prompt that retryable operational failures can add calls, preserve one just-in-time default-deny approval per process, report safe retry progress to stderr, and show recovered cases, confirmation progress, and retry totals without corrupting JSON stdout.

#### Website and state-bearing documentation

- Update `website/src/lib/qualification/types.ts`, `website/src/lib/qualification/loader.ts`, `website/src/lib/qualification/validations.ts`, `website/src/lib/qualification/index.ts`, and `website/src/lib/qualification/loader.test-integration.ts` for current protocol 6 and frozen protocol 3–5 consumers.
- Update `website/src/components/qualification-case-evidence/qualification-case-evidence.astro` and add `website/src/components/qualification-trial-evidence/qualification-trial-evidence.astro` for accessible ordered trial histories, recovered status, retry counts, cache provenance, skipped judges, and raw artifacts.
- Update `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro`, `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/attempts/[attemptId]/index.astro`, and `website/src/pages/evidence/qualification/_index.test-e2e.ts` for current protocol 6, historical protocol 5 and 4 Sol, protocol 3 Terra, and the temporary no-current-protocol-6 state.
- Update `README.md`, `qualification/README.md`, and `docs/adapter-qualification.md` for retry categories, backoff and cancellation, confirmation eligibility and short-circuiting, resume semantics, cache independence, protocol 6, artifact layout, 48/60 planned calls, immutable history, and fresh-current-evidence requirements.
- Do not edit protected coding-instruction files. Reassess whether a coding-instructions handoff is needed after implementation; the current plan expects none.

### Implementation work

1. Introduce explicit current protocol 6 schemas while freezing protocol 3–5 shapes instead of extending historical schemas from the new contracts. Add independent validation for contiguous retry records, valid trial identities, ordered confirmation sequences, and derived case or attempt status.
2. Generate the exact protocol 6 stage inventory: four attempt stages; `prepare`, `deterministic-before`, `actor`, `deterministic-after`, `assertions`, and `judge` for `initial`, `confirmation-1`, and `confirmation-2`; then one case result stage. Atomically mark never-needed confirmation groups skipped with no cache or retry evidence.
3. Preserve actor or judge retry histories when an interrupted running stage becomes pending. Pass the persisted count into the shared Milestone 1 runner and append each safe retry before waiting.
4. Refactor the case loop into a focused full-trial boundary. Every trial prepares a pristine project, verifies deterministic-before, captures a pre-actor snapshot, executes or restores actor evidence, verifies deterministic-after, evaluates workspace assertions, captures the patch, runs or skips the judge, and persists the trial before deriving case state.
5. Restore the pre-actor snapshot before every operational actor retry. Recreate the read-only judge workspace for every operational judge retry. Persist actor completion before starting the judge so a judge retry or resume cannot repeat the actor.
6. Keep initial cache reuse intact. Disable cross-attempt cache reads and writes for every confirmation, include trial identity in model evidence and key inputs, and require null confirmation cache sources. Within-attempt checkpoint restoration remains available.
7. Apply the fixed decision table: an initial pass skips both confirmations; an initial failure starts confirmation 1; two passing confirmations recover; any failed confirmation ends the case and skips remaining confirmation work. Continue after a recovered case and stop the attempt after a confirmed case failure.
8. Write executed trial artifacts under `cases/<case-id>/trials/<trial-id>/`, mirror trial identity in internal workspaces and snapshots, and create no artifacts for skipped confirmation groups. Retain `cases/<case-id>/case-result.json` as the ordered public history.
9. Add explicit historical-flat and current-trial evidence verification. Recompute digests and independently derive stage, trial, case, confirmation, cache, retry, and attempt validity rather than trusting stored statuses.
10. Record protocol 6 attempts and pointers while retaining protocols 3–5 as read-only history. Require protocol 6 for the Custom baseline and release gate, and independently validate recovered current evidence in release identity.
11. Update planned-cost and retry-progress presentation, then update the website consumer and pages to render every trial without collapsing the original failure.
12. Synchronize all directly affected state-bearing documentation in the same milestone, format only touched files, inspect the final diff, and confirm no committed evidence or protected instruction file changed.

### Focused tests and verification

#### Execution and checkpoint cases

- Initial pass with one trial, normal initial cache behavior, and both confirmation groups skipped.
- Recovered pass with failed initial plus two fresh passing confirmations, including recovery after an initial cache hit.
- Failed confirmation 1 with confirmation 2 and later cases skipped.
- Passing confirmation 1 followed by failed confirmation 2.
- Source-state, coverage, candidate, baseline, preparation, deterministic-before, output/schema, integrity, non-retryable host, cancellation, and input-drift failures that never create confirmation evidence.
- Post-actor deterministic or workspace assertion failure that starts confirmations while correctly skipping the judge for that trial.
- Actor operational failure after a partial workspace mutation, proving pristine restoration before retry.
- Judge operational failure, proving completed actor evidence is retained and only the judge workspace is recreated.
- Cancellation during retry backoff and resume with contiguous counts and no repeated completed actor, judge, or confirmation.
- Dry run through protocol 6 with no model cache, no paid calls, and an initial pass.

#### Evidence, release, and website cases

- Valid initial-pass, recovered, failed-first-confirmation, and failed-second-confirmation protocol 6 attempts.
- Rejection of missing, reordered, duplicate, excessive, or contradictory trials; invalid skipped stages; unsafe or non-contiguous retries; confirmation cache provenance; missing artifacts; path escapes; and digest tampering.
- Complete verification and website loading of committed protocol 3–5 evidence without modifying it.
- Rejection of protocol 5 as a current Custom baseline and acceptance of a matching recovered protocol 6 baseline.
- Independent release-gate acceptance of complete initial and recovered protocol 6 evidence and rejection of malformed confirmation, stage, artifact, source, package, or Custom-baseline relationships.
- Website publication with no current protocol 6 attempt yet, historical Sol and Terra labeling, original failure visibility after recovery, trial ordering, retry counts, skipped judges, cache provenance, and raw links.
- Keyboard-accessible disclosure, accessible names and headings, 320 px through desktop layout, light and dark themes, and no unnecessary animation or render-time duplication.

#### Commands

Run the focused and broader checks in the approved plan's order:

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
npm test
npm run qualification:test
npm --prefix website test
```

Inspect the generated website build to confirm test files are not published. Run `npm run release:check` only as a negative release-gate audit before fresh evidence exists and require that any failure is limited to the intentional absence of current protocol 6 qualification evidence. Do not weaken the gate or run a paid evaluation to make this implementation milestone green.

### Acceptance criteria

- Qualification and semantic evaluation consume the one shared retry primitive, with the same retryable categories and safe backoff semantics.
- Retryable actor and judge failures persist safe evidence, resume contiguously, and do not consume a trial, inherit partial actor writes, or repeat a completed actor.
- A completed initial model-dependent failure recovers only after two fresh passing confirmations; any failed confirmation is terminal and the original failure remains public.
- Pre-model, deterministic-before, non-retryable, cancellation, and input-drift failures never become confirmations.
- Protocol 6 checkpoints, runner, artifacts, result verifier, recorder, Custom baseline, independent release gate, CLI, and website derive the same stage inventory, trial order, retry history, cache provenance, confirmation status, and verdict.
- Protocols 3–5 remain unchanged, verifiable, and visible as history, but cannot satisfy current eligibility.
- The operator sees 48 Custom or 60 Vercel AI SDK maximum planned trial calls plus a clear warning that operational retries are additional.
- All focused and broad deterministic checks pass. The only permitted pre-evidence release-check failure is the explicit absence of fresh current protocol 6 qualification results.
- No paid model call, existing committed evidence mutation, dependency change, migration, compatibility-matrix change, or protected instruction edit occurs.
- State-bearing documentation matches the delivered behavior, and the final diff contains only authorized plan scope.

### Review checkpoint

Review the complete protocol boundary rather than any individual layer in isolation. Confirm the confirmation decision table, pristine retry behavior, checkpoint resume invariants, confirmation cache exclusion, historical schema isolation, independent verifier and release-gate derivation, accurate operator cost language, accessible website history, documentation state, and deterministic verification results. The implementation milestone is not complete if any producer, consumer, release, or documentation surface still assumes one flat trial or protocol 5 current eligibility.

## Plan-to-milestone coverage

- Milestone 1 owns the shared operational retry extraction, cancellation semantics, semantic migration, removal of the superseded path, and proof of no semantic protocol change.
- Milestone 2 owns every qualification behavior change, protocol 6 contract, checkpoint and cache invariant, trial artifact, verifier and recorder rule, Custom baseline, independent release gate, CLI cost and progress surface, website consumer, state-bearing documentation update, regression check, and rollout constraint from the approved plan.
- No paid run, committed evidence replacement, profile change, scoring change, prompt change, dependency, migration, or hidden implementation work exists outside these milestones.

## Approval required

Approve the underlying plan and this complete two-milestone sequence. Approval alone does not authorize implementation. After approval, explicitly authorize either Milestone 1 or, once Milestone 1 is complete and reviewed, Milestone 2. You may combine sequence approval with authorization to implement Milestone 1 in the same instruction. Neither milestone authorizes paid semantic or qualification execution or modification of existing committed evidence.
