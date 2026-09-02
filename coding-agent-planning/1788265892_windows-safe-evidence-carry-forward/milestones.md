# Windows-safe evidence storage and flexible qualification milestones

## Sequence constraints

- Implement the milestones in order. Approval or completion of one milestone does not authorize the next.
- Do not run semantic, Custom, or adapter model evaluations. In particular, do not run `npm run eval:semantic`, `npm run qualification:run`, `npm run qualification:record`, `npm run qualification:diagnose`, `npm run qualification:resume`, or `npm run qualification:retry`.
- Keep `v4.0.0` and commit `fcbc34f60b12b1b66cd9ebb28b1865979a259429` immutable. Read historical evidence through Git objects without checking out or extracting its long result paths.
- Do not modify evaluator-bearing qualification source outside the exact version-1 control-plane exclusions in the plan. If implementation requires such a change, stop and revise the plan before continuing.
- Do not commit, push, tag, publish, deploy, or run hosted validation against a pushed candidate in this sequence.

## Milestone 1: Establish evidence identities and safe semantic recording

### Objective

Remove the abandoned equivalence experiment and finish a self-contained evidence-identity boundary that makes future semantic recording attributable, recoverable, and compatible with the unchanged semantic runner.

### Dependencies

- The approved plan.
- The current `HEAD` and `v4.0.0` must still resolve to `fcbc34f60b12b1b66cd9ebb28b1865979a259429`.

### In scope

- Delete the six abandoned files named by the plan: `qualification-boundary-manifest.json` and the five `qualification-*equivalence*` files under `tooling/release-identity/`.
- Remove only the abandoned `release:equivalence:check` script from `package.json` and its matching uncommitted section from `qualification/README.md`.
- Add `tooling/evidence-identity/portable-skill.mjs`, `cli-closure.mjs`, `semantic-identity.mjs`, `semantic-evaluation.mjs`, their thin entry points and public boundary, declarations, and focused unit and integration tests.
- Update `package.json` so `eval:semantic` uses the wrapper and add `eval:semantic:identity`; keep `eval:semantic:preflight` and `eval:semantic:verify` pointed directly at the existing runner.
- Add the semantic receipt pattern to `.gitignore`.
- Synchronize `README.md`, `docs/semantic-evaluation.md`, and `fixtures/semantic-evaluation-results/README.md` with the wrapper, receipt, identity sidecar, and recovery workflow.

### Implementation work

- Implement the exact portable-skill digest and the behavior digest that normalizes only the three synchronized release-version occurrences.
- Implement the exact CLI closure digest without including unrelated root metadata or packages.
- Implement semantic identity sidecars without changing semantic attempt payloads, evidence schemas, protocol versions, recorder code, or `tests/semantic-evaluation-runner.mjs`.
- Preserve every current semantic option and argument through a shell-free child-process invocation with inherited standard streams, signal forwarding, and exact exit-status handling.
- Implement the fail-closed receipt state machine: never overwrite a receipt; finalize one attributable recorded attempt; retire a no-attempt receipt only when source and attempt inventories are unchanged; reject every ambiguous or stale state.
- Ensure failed recorded attempts receive identities even when the runner exits nonzero, and ensure recovery never invokes a model.

### Verification

- Run the new evidence-identity unit and integration tests through `npm run test:unit` and `npm run test:integration`.
- Run `npm run eval:semantic:verify` only after confirming it remains verification-only.
- Verify test fixtures use fake child boundaries and disposable repositories and never write to the real evidence history.
- Verify the semantic runner, recorder, attempt payloads, and protocol bytes remain unchanged.

### Acceptance criteria

- Release metadata changes alone preserve the behavior and CLI closure identities; every other protected mutation invalidates the appropriate identity.
- `--record`, `--record-checkpoint`, `--restart`, `--case`, pass-through invocations, failing attempts, signals, and exit statuses behave exactly as specified.
- Hard interruption before attempt creation can retire a receipt safely; interruption after attempt creation can finalize the exact sidecar without another model call.
- An unresolved or ambiguous receipt blocks a new recording instead of being overwritten.
- The abandoned equivalence implementation is fully removed without changing committed evaluator behavior.

### Review checkpoint

Review the semantic runner byte comparison, the exact normalized version fields, CLI closure traversal, receipt state transitions, child-process behavior, sidecar binding, and proof that no test or command invoked a model.

## Milestone 2: Migrate qualification profiles and current evidence to short storage

### Objective

Establish the qualification compatibility identity, replace verbose tracked paths with short deterministic storage, and migrate only the verified Custom baseline while preserving every logical input and artifact byte.

### Dependencies

- Milestone 1 completed and reviewed.
- The expanded profiles and results must still match the immutable `v4.0.0` source inventory.

### In scope

- Add `qualification/src/evidence-identity/` and `qualification/src/storage/` with their explicit public boundaries and focused tests.
- Add `qualification/profiles/index.yaml`, move all 14 profiles to `qualification/profiles/t1` through `t14`, and shorten physical case directories to `cases/c<number>` without changing logical target or case identities.
- Update only the plan's enumerated control-plane paths under `qualification/src/compatibility/`, `baseline/`, `cli/`, and `result/` to resolve short profiles and artifacts.
- Add `tooling/qualification-storage-migration/` and the `qualification:storage:migrate` package script.
- Replace the expanded result tree with the short current layout containing only the latest passing Custom attempt, its unchanged logical `attempt.json` and artifacts, and its new `storage.json`.
- Update the storage and current-CLI portions of `qualification/README.md` and `docs/adapter-qualification.md`.

### Implementation work

- Implement the version-1 fail-closed evaluator-source classifier and canonical logical-input bundle for both expanded Git objects and current short storage.
- Prove the old and new profile layouts have identical logical digests before accepting any deletion.
- Implement append-only target keys, deterministic attempt keys, collision detection, contained short artifact mappings, atomic writes, and strict storage-manifest verification.
- Make current `list`, `status`, `verify`, `run`, `resume`, `retry`, and `record` paths use only the short current layout while preserving public CLI output and logical identifiers.
- Run the migration only after it proves the exact source tag and complete tracked source inventory. Delete the expanded result tree only after the 14 profile identities and migrated Custom attempt pass every postcondition.
- Leave the other 59 attempts only in the immutable `v4.0.0` tree.

### Verification

- Run `npm run test:unit`, `npm run test:integration`, `npm run qualification:test`, `npm run qualification:typecheck`, `npm run qualification:lint`, `npm run qualification:format:check`, and `npm run qualification:verify`.
- Exercise migration success, source tampering, collision, traversal, missing artifact, digest mismatch, idempotency, and refusal-to-delete cases in disposable repositories.
- Compare every profile's canonical logical digest before and after migration and every migrated Custom logical artifact digest and byte.
- Confirm no evaluator-bearing qualification source path changed.

### Acceptance criteria

- All tracked profile and result paths fit the short layout and remain within the planned path budget.
- All 14 profile logical digests are unchanged.
- The migrated Custom attempt is byte-identical at the logical artifact boundary and is fully verifiable from current storage.
- No other historical attempt remains in the current checkout.
- Ordinary qualification commands require no historical Git objects.
- A migration failure leaves the expanded source paths intact.

### Review checkpoint

Review the exact evaluator exclusions, source-versus-candidate logical identity proof, target and attempt key stability, storage-manifest containment, migrated Custom equality, deleted-path inventory, and confirmation that no evaluator-bearing source changed.

## Milestone 3: Implement selective evidence reuse and the `4.0.1` bridge

### Objective

Make baseline selection and release verification reuse only evidence whose real inputs remain compatible, including all historical `v4.0.0` attempts, without invoking an evaluator or requiring historical Git during ordinary adapter work.

### Dependencies

- Milestone 2 completed and reviewed.
- The migrated Custom storage manifest and immutable historical source must verify exactly.

### In scope

- Update `qualification/src/baseline/baseline.ts` and its focused tests to use compatibility envelopes and deterministic baseline replay.
- Update `tooling/release-identity/evidence.mjs`, `check-release.mjs`, their public exports or declarations when required, and focused release-evidence tests.
- Add `tooling/release-identity/carry-forward-4-0-1.mjs` and its integration tests.
- Implement release-only historical Git readers and all 60 source-derived compatibility envelopes.
- Complete the validity-matrix, carried-Custom, historical-release, and baseline-replay documentation in `qualification/README.md` and `docs/adapter-qualification.md`.
- Defer the final `fixtures/release-evidence/carry-forward-4.0.1.json` artifact to Milestone 5 because it must bind the stable final candidate tree.

### Implementation work

- Verify every original exact semantic and qualification digest against the artifact or source commit that produced it before applying compatibility identities.
- Select current compatible evidence first and historical compatible evidence second; never fall back to an incompatible historical target.
- Permit the locally migrated Custom baseline without Git only when its manifest, attestation identity, skill behavior, CLI closure, evaluator, universal logical input, environment, target, and shared package closure all match.
- Apply the same versioned classifier independently to the source and candidate trees; never assert a historical identity from candidate values.
- Replay every historical adapter's relationship to its exact Custom baseline under the current deterministic policy without calling an actor, judge, host, or executor.
- Implement the exact one-time `4.0.1` bridge restrictions and final-attestation generator, including complete changed-path and deleted-result inventories.

### Verification

- Run `npm run test:unit`, `npm run test:integration`, `npm run qualification:test`, `npm run qualification:typecheck`, `npm run qualification:lint`, and `npm run qualification:verify`.
- Test every row of the evidence invalidation matrix, current-versus-historical selection, missing or duplicate envelopes, source-attempt binding, baseline replay, stale evidence rejection, and Git-unavailable failure messages.
- Test the bridge in disposable candidate trees for exact `4.0.1` acceptance and every protected-input or unlisted-change rejection.
- Do not require the final repository `release:identity:check` or `release:check` to pass yet; their exact attestation and final version state belong to Milestone 5.

### Acceptance criteria

- Each of the 60 historical attempts has one source-derived compatibility envelope in bridge output.
- Release verification can combine current short evidence with compatible historical evidence while ordinary qualification commands remain Git-independent.
- The carried Custom baseline authorizes adapter-only work only while every compatibility input matches.
- A target-local change invalidates only that target; shared evaluator, logical input, environment, skill, CLI, and package changes invalidate exactly the evidence defined by the plan.
- No model executor is reachable from bridge generation, baseline replay, or release verification.

### Review checkpoint

Review the source-derived envelope proof, exact versus compatibility identity separation, all invalidation cases, carried-Custom trust boundary, baseline replay, historical Git isolation, and the bridge's one-version restriction.

## Milestone 4: Integrate historical website evidence and Windows portability

### Objective

Preserve the complete public evidence experience while proving the shortened repository can be cloned and installed under normal Windows path behavior.

### Dependencies

- Milestone 3 completed and reviewed.

### In scope

- Update `website/src/lib/qualification/` loaders, contract readers, types, transformations, validations, and focused tests required to combine current short evidence with immutable historical evidence.
- Preserve logical evidence routes and pin historical artifact links to the exact source commit.
- Update website evidence provenance copy and directly affected website documentation.
- Add `tooling/path-portability/` and the root `path:check` script.
- Update `.github/workflows/conformance.yml` with the `windows-2025` deep-path clone and pinned `skills@1.5.22` install check.
- Update release and website workflows, including `.github/workflows/release-candidate.yml`, `.github/workflows/website.yml`, and `.github/workflows/pages.yml` where required, so only historical-evidence consumers fetch full history.

### Implementation work

- Load current short results and historical `v4.0.0` results at website build time without exposing Git or filesystem access to browser code.
- Deduplicate only the migrated Custom attempt and only after byte and digest equality is proven.
- Reject broken historical provenance, duplicate non-Custom attempts, missing source objects, and unsafe artifact paths.
- Check tracked and non-ignored candidate paths for the 160-byte budget, Windows case-fold collisions, invalid keys, traversal, and worst-case generated result paths while respecting excluded-directory boundaries.
- Configure the Windows job to use default checkout behavior, a realistic deep temporary path, supported non-Bubblewrap checks, and installed-skill parity.

### Verification

- Run the focused website unit and integration tests, `npm run path:check`, `npm run website:check`, and the applicable root test suites.
- Verify unchanged logical routes, pinned historical links, migrated-Custom deduplication, and all 60 historical attempts in generated website data.
- Validate workflow syntax and inspect checkout history settings locally. Do not claim the hosted Windows job passed; that is a later post-push release gate.

### Acceptance criteria

- The website remains complete and route-compatible while reading the new current layout and immutable historical evidence.
- Browser output contains resolved evidence only, with no Git or filesystem capability.
- Every current candidate path satisfies the portability policy and no Windows case-fold collision exists.
- The hosted workflow is configured to reproduce the original deep-path clone and install scenario without `core.longpaths` or OS policy changes.
- Only release and website jobs that consume history fetch it.

### Review checkpoint

Review website provenance and deduplication, historical-link pinning, browser/server boundaries, path-budget coverage, Windows clone realism, installer parity, and workflow history scope.

## Milestone 5: Finalize and verify the release-ready `4.0.1` tree

### Objective

Stabilize the complete candidate, generate the one exact carry-forward attestation as the final planned write, and prove locally that `4.0.1` is release-ready without running any model evaluation.

### Dependencies

- Milestones 1 through 4 completed and reviewed.
- No evaluator-bearing or protected behavior input may have changed outside the approved plan.

### In scope

- Update `package.json` and `package-lock.json` to `4.0.1`.
- Update the three authoritative release-version occurrences in `moldea/SKILL.md` and `moldea/references/local-tooling.md`.
- Synchronize `README.md`, `docs/getting-started.md`, release-identity copies enforced by `tooling/release-identity/identity.mjs`, semantic and qualification workflow documentation, website provenance copy, and every directly affected state-bearing document.
- Format every non-generated touched file before attestation generation.
- Generate `fixtures/release-evidence/carry-forward-4.0.1.json` only after the candidate tree is otherwise stable.
- Inspect protected coding-instruction files for handoff needs without editing them.

### Implementation work

- Apply release metadata only after all behavior, storage, release-verification, website, workflow, and documentation work is stable.
- Run write-mode formatting before generating the attestation. Treat the generated attestation as the final planned write.
- Generate the attestation from exact source and candidate inventories, all 60 source-derived qualification envelopes, the existing semantic envelope, baseline replays, deleted-result digest, and `modelRunsPerformed: false` assertion.
- After generation, run only check-mode commands. If any command changes a file, inspect it, restabilize the tree, and regenerate the attestation before verification restarts.
- Confirm the final tree contains no new semantic or qualification attempt, timestamp, usage, or model output.

### Verification

Run the complete local verification suite:

```text
npm run path:check
npm test
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run eval:semantic:verify
npm run qualification:verify
npm run docs:check
npm run website:check
npm run release:identity:check
npm run release:check
```

Also run repository formatting and production-build checks in check-only mode, confirm test artifacts are excluded from production output, review the complete final diff, and verify state-bearing documentation is synchronized.

### Acceptance criteria

- The release-ready tree reports `4.0.1` consistently and passes every deterministic local check.
- Release verification accepts the unchanged semantic evaluation and all 60 historical qualification attempts without a model call.
- The current checkout contains only short qualification storage and the verified migrated Custom attempt.
- All 14 profiles, all logical artifact identities, public website routes, and exact historical provenance remain intact.
- The final attestation rejects any later unlisted path change or protected behavior mutation.
- The hosted Windows workflow is present as a required post-push release gate; no hosted result, commit, push, tag, publication, deployment, or remote mutation is claimed.
- Protected coding instructions are either already sufficient or a separate copy-paste-ready handoff prompt is reported without editing them.

### Review checkpoint

Review the final version identity, complete attestation inventory, no-model proof boundary, final diff and deleted paths, all check results, documentation state, protected-instruction handoff determination, and the explicit separation between this release-ready tree and later commit, hosted validation, tag, and publication operations.

## Approval required

Approval is required for this five-milestone sequence: first establish evidence identities and safe semantic recording; second perform the guarded short-storage migration; third implement selective historical evidence reuse and the exact `4.0.1` bridge; fourth integrate website history and Windows portability; and fifth stabilize, attest, and verify the release-ready `4.0.1` tree. Approval of this sequence does not authorize implementation. After approval, each milestone must be authorized explicitly, beginning with Milestone 1.
