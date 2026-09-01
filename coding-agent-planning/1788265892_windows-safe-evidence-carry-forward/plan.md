# Windows-safe evidence storage and flexible qualification plan

## Task contract

Fix the Windows clone failure at its source, prepare a release-ready `4.0.1` tree without rerunning any semantic evaluation or adapter qualification, and leave behind a simpler evidence system that reruns only the work invalidated by a real input change. Committing, pushing, running hosted validation against the pushed candidate, tagging, publishing, and deploying remain separately authorized release gates.

The final implementation must provide these guarantees:

- a normal Windows developer can clone, install, test, and contribute without enabling `core.longpaths` or changing Windows policy;
- the current Git tree contains no long qualification profile or result paths;
- `v4.0.0` and its evidence remain immutable and auditable;
- the release-ready `4.0.1` candidate reuses the existing semantic evaluation and all existing qualifications without a model call;
- the carried Custom result may authorize future adapter-only runs while its actual compatibility inputs still match;
- future semantic recording preserves the existing runner interface, rejects source state that cannot be bound to an exact commit before any model call, and can recover identity finalization without another model call;
- release version metadata alone does not invalidate evidence;
- a portable-skill behavior change or CLI identity change invalidates semantic, Custom, and adapter evidence;
- a shared evaluator behavior, evaluated logical input, execution environment, or shared package-closure change invalidates Custom and all adapters but does not invalidate semantic evidence unless a semantic input also changed;
- qualification storage, recording, presentation, release-verification, or baseline-eligibility control-plane changes do not invalidate completed evidence when exact source provenance still verifies, the canonical evaluated input and evaluator identities remain equal, and every required baseline relationship passes the current deterministic policy;
- a target-local profile, package, or provider-runtime change invalidates only that target, provided a compatible Custom baseline exists;
- ordinary qualification commands use only the new short current storage and do not depend on historical Git objects;
- historical Git evidence is read only by release verification and the website build;
- no history rewrite, tag rewrite, repository split, dual executor, trace-equivalence system, generic release changed-file ownership classifier, or exact transitive-import freeze is introduced.

## Current repository evidence

- The skill installer clones the repository before selecting `moldea/`. Tracked qualification result paths reach 264 repository-relative bytes, so the checkout fails after a normal Windows temporary-directory prefix is added.
- The repository currently has 14 logical qualification targets and 60 recorded attempts. Logical adapter, implementation, case, and attempt identifiers are repeated in physical directory names.
- `v4.0.0` and the current `HEAD` resolve to `fcbc34f60b12b1b66cd9ebb28b1865979a259429`. This exact commit is the immutable source for the carried evidence.
- `qualification/src/compatibility/loader.ts`, `qualification/src/execution/fingerprints.ts`, `qualification/src/baseline/baseline.ts`, and `qualification/src/result/recorder.ts` currently couple logical identifiers to physical paths.
- `tooling/release-identity/evidence.mjs` and `website/src/lib/qualification/loader.ts` also read the expanded layout directly.
- `qualification/src/result/contract-reader.ts` and `website/src/lib/qualification/contract-reader.ts` already use Git object reads for historical contracts. They establish the safe pattern for reading an exact commit without checking it out.
- The current semantic result uses an exact portable-skill artifact digest and a CLI identity containing the SHA-256 of the entire root `package-lock.json`. Qualification provenance similarly stores the exact skill repository fingerprint. The root release version changes both the portable artifact and whole-lock digests even when the skill behavior and CLI closure remain identical.
- The current `qualificationDigest` recursively hashes every non-test, non-declaration file under `qualification/src` plus physical profile paths. It is valid exact source provenance, but it cannot serve as the compatibility identity for this migration because the required storage, loader, baseline, recorder, and CLI changes necessarily alter it.
- The abandoned equivalence-gate implementation remains entirely uncommitted. It modified only `package.json` and `qualification/README.md` and added six files under `tooling/release-identity/`. No production qualification source, profile, result, version, commit, or tag was changed, and no evaluation was run.

## Evidence validity model

Evidence validity will be based on the inputs that can affect the tested behavior, not on the release number and not on broad changed-path ownership rules.

| Changed input                                                                                                                 | Semantic      | Custom        | Other adapters                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------- | ---------------------------------------------------------------------------------- |
| Parsed release-version metadata only                                                                                          | remains valid | remains valid | remains valid                                                                      |
| Any other portable-skill byte or path                                                                                         | invalid       | invalid       | invalid                                                                            |
| CLI identity or supported runtime contract                                                                                    | invalid       | invalid       | invalid                                                                            |
| Semantic cases, coverage, host, evaluator, or semantic protocol                                                               | invalid       | unchanged     | unchanged                                                                          |
| Evaluator-bearing qualification source, canonical universal input, execution environment, or shared published package closure | unchanged     | invalid       | invalid                                                                            |
| Storage or control-plane change only, with equal canonical inputs and evaluator identity                                      | unchanged     | remains valid | remains valid only when its baseline relationship replays under the current policy |
| One target's profile, provider runtime, or target-local package                                                               | unchanged     | unchanged     | only that target is invalid                                                        |

Add one shared `portableSkillBehaviorDigest` that hashes every distributed `moldea/` path and byte after structurally normalizing exactly three authoritative release-version occurrences: `metadata.version` and the `Skill release` sentence in `moldea/SKILL.md`, plus the `Release` sentence in `moldea/references/local-tooling.md`. The parser must require exactly one of each occurrence, require all three values to agree, and reject missing, duplicate, or malformed values. No other content is ignored.

Add one `cliClosureDigest` that hashes the exact root `@moldea.ai/cli` declaration, CLI JSON schema version, and the resolved CLI package's complete transitive lockfile closure, including versions, integrity values, and dependency edges. It excludes the root package name/version and every unrelated lockfile package. Changing release metadata or an unrelated development dependency must not change it; changing any CLI closure input must change it.

Keep the existing semantic and qualification attempt schemas, protocol versions, exact artifact digests, exact whole-lock digest, exact `qualificationDigest`, exact profile digest, source commits, and published-package provenance unchanged. They continue proving what produced each attempt. Do not project a current exact source digest or protocol onto historical evidence.

Add evidence-identity envelopes beside newly recorded evidence instead of changing the attempt schemas:

- future semantic recording commands capture an exact clean relevant-source receipt before any model call, and completed semantic attempts receive `identity.json` beside `attempt.json`, binding the exact attempt ID and digest to that pre-run source commit, `portableSkillBehaviorDigest`, and `cliClosureDigest`;
- future qualification attempts receive the same compatibility fields in the versioned `storage.json` that already binds the exact logical attempt ID, attempt digest, artifact mappings, and source commit;
- the `4.0.1` attestation supplies equivalent immutable envelopes for the existing semantic attempt and all 60 legacy qualification attempts without rewriting their attempt files.

Add `qualificationEvaluatorDigest` and `qualificationLogicalInputDigest` as the qualification compatibility identities. The evaluator digest uses one versioned, fail-closed classifier over both the immutable source tree and the candidate tree. Every production qualification path is evaluator-bearing by default. Identity version 1 excludes only the explicitly enumerated storage and evidence-control-plane modules required by this migration: the new `qualification/src/storage/` and `qualification/src/evidence-identity/` modules, baseline eligibility, result storage and verification, compatibility path resolution, CLI result presentation, and new compatibility-identity calculation. The executor, model stages, hosts, prompts, project preparation, deterministic verification, coverage, sanitization, package-candidate behavior, and every unclassified or newly added production path remain evaluator-bearing. Changing the classifier or its exclusions requires an identity-version bump and makes older envelopes incompatible unless a separately reviewed migration is approved.

The logical-input digest is calculated from a canonical bundle rather than physical paths. It includes the ordered logical target and case identities, universal and target cases, scenarios, probes, tasks, runtime packages, actor-visible and deterministic-assertion paths, file kinds, modes, symlink targets, and bytes. It excludes only `t<number>`, `c<number>`, the storage-only `projectDirectory` value, and physical artifact paths. Versioned readers must produce this same bundle from both the expanded `v4.0.0` layout and the new short layout.

Add `qualificationBaselineEvaluatorDigest` for the Custom evaluator identity plus its canonical universal logical input. Baseline policy itself remains control-plane state: a historical adapter is reusable only when its recorded relationship to the exact Custom attempt passes the current deterministic baseline policy.

For every legacy qualification attempt, the `4.0.1` attestation records a strict compatibility envelope. Each envelope binds the exact source attempt ID and attempt digest to the source tree's independently computed evaluator and logical-input digests, portable-skill behavior digest, CLI and shared package identities, target identity, execution environment, and baseline relationship. The bridge records an envelope only after computing the same identity version over the source and candidate trees and proving equality; it never copies the candidate digest into legacy evidence by assertion.

The existing semantic case, coverage, CLI, host, confirmation, and protocol checks remain exact. Qualification exact source provenance remains exact at its recorded commit, while compatibility is decided by the independently equal evaluator, logical-input, target, environment, package, and baseline identities.

## Authoritative implementation

### 1. Remove the abandoned equivalence implementation

Delete only these uncommitted artifacts:

- `tooling/release-identity/qualification-boundary-manifest.json`;
- `tooling/release-identity/qualification-equivalence.mjs`;
- `tooling/release-identity/qualification-equivalence-stubs.mjs`;
- `tooling/release-identity/qualification-equivalence.test-unit.mjs`;
- `tooling/release-identity/qualification-orchestration-equivalence.mjs`;
- `tooling/release-identity/qualification-orchestration-equivalence.test-integration.mjs`;
- the uncommitted `release:equivalence:check` script in `package.json`;
- the corresponding uncommitted equivalence section in `qualification/README.md`.

No committed production behavior is reverted because the abandoned implementation never changed it.

### 2. Add the behavior identity

Add `tooling/evidence-identity/` with:

- `portable-skill.mjs` containing the exact artifact digest and three-occurrence parsed behavior digest;
- `portable-skill.test-unit.mjs` covering version normalization and every rejection case;
- `cli-closure.mjs` containing the exact CLI closure traversal and digest;
- `cli-closure.test-unit.mjs` covering release metadata, unrelated packages, dependency edges, integrity, and malformed closures;
- `semantic-identity.mjs` for binding a completed semantic attempt to its exact source and compatibility identities;
- `semantic-identity.test-integration.mjs` for clean-source, attempt-digest, and sidecar failure cases;
- `semantic-evaluation.mjs` for preflight receipt capture, exact child-process orchestration, and post-recording identity finalization;
- `semantic-evaluation.test-integration.mjs` for argument, standard-stream, signal, exit-status, recording, interruption, and recovery behavior against a fake child boundary;
- `run-semantic-evaluation.mjs` as the thin command entry point;
- `record-semantic-identity.mjs` as the thin no-model recovery/finalization entry point;
- `index.mjs` as the thin runtime public boundary;
- `index.d.mts` for the TypeScript declarations consumed by qualification code.

Add `qualification/src/evidence-identity/` with:

- `types.ts` for the versioned canonical bundle and compatibility identity contracts;
- `identity.ts` for the fail-closed evaluator-source classifier and source/current logical-input readers;
- `identity.test-unit.ts` for classifier ownership and identity-version behavior;
- `identity.test-integration.ts` for expanded-versus-short canonical bundle equality and mutation sensitivity;
- `index.ts` as the thin public boundary.

Qualification identity version 1 excludes exactly these control-plane paths from `qualificationEvaluatorDigest`:

- `qualification/src/storage/`;
- `qualification/src/evidence-identity/`;
- `qualification/src/baseline/`;
- `qualification/src/compatibility/loader.ts`;
- `qualification/src/cli/runner.ts`;
- `qualification/src/result/contract-reader.ts`;
- `qualification/src/result/evidence.ts`;
- `qualification/src/result/recorder.ts`;
- `qualification/src/result/index.ts`.

All other non-test production paths under `qualification/src`, including existing thin entry files, remain included. The implementation may change only the listed control-plane paths for qualification runtime integration. Adding an exclusion or touching another production path requires a plan revision because it would invalidate the historical qualification evidence.

Do not modify the semantic runner, recorder, evidence schemas, or protocol. Point only the root `eval:semantic` script at `run-semantic-evaluation.mjs`; keep `eval:semantic:preflight` and `eval:semantic:verify` invoking the existing runner directly. The wrapper must invoke the runner through an argument array without a shell and forward every incoming argument unchanged, including `--record`, `--record-checkpoint`, `--restart`, and `--case`.

For `--record` and `--record-checkpoint`, the wrapper must complete this lifecycle:

1. before creating a receipt, inspect any existing receipt and never overwrite it: finalize its one exact attributable attempt when present; atomically retire it when no attempt exists and its source plus attempt inventories still match; otherwise reject source drift, multiple candidates, mismatched arguments, or any other ambiguous attribution;
2. before invoking the runner, resolve the exact `HEAD` commit and fail if any semantic input that release validity treats as exact differs from that commit, including the distributed skill artifact, semantic runner, cases, coverage, host/evaluator/protocol inputs, CLI declaration, and CLI lockfile closure;
3. atomically write an ignored `fixtures/.semantic-evaluation-identity-receipt.json` containing a schema version, invocation ID, exact argument digest, source commit, complete relevant-source path/digest inventory, and the before-run immutable-attempt inventory;
4. spawn the unchanged runner with inherited standard streams, forward termination signals, and preserve its exit status;
5. after the child exits, reverify the receipt's relevant-source inventory and inspect immutable attempt history to determine whether the invocation produced or resolved an attempt;
6. when an attempt exists, write `identity.json` atomically only after binding its exact attempt/evidence digests to the pre-run receipt; finalize even when the runner recorded a failed attempt and then returned a nonzero status;
7. remove the receipt only after successful finalization or after proving the runner created no attempt; preserve it when hard interruption or finalization failure prevents either conclusion.

Expose `npm run eval:semantic:identity` as the recovery-only finalizer. It must consume and validate the preserved receipt, finalize one exact recorded attempt when present, or retire the receipt without a sidecar only when the unchanged source and attempt inventories prove that no attempt was created. It must never invoke the semantic runner or a model and must refuse ambiguous, stale, mismatched, overwritten, or already-consumed receipts. A new recording invocation must run this same recovery state machine before creating its own receipt. Commands without a recording flag pass through unchanged and never create a receipt or identity sidecar. Keep `eval:semantic:verify` unchanged for exact attempt verification. Release verification accepts either a sidecar bound to the exact attempt digest or the exact `4.0.1` attestation entry, and verifies the original whole-lock and exact skill digests against the recorded source before applying compatibility identities.

Add `fixtures/.semantic-evaluation-identity-receipt.json*` to `.gitignore`. The receipt contains only hashes, paths, arguments, identifiers, and commit metadata; it must never contain prompts, model responses, credentials, environment values, or other sensitive payloads.

Keep the qualification attempt schema and protocol unchanged. The short-storage writer records qualification compatibility identities in `storage.json`; historical attempts obtain them only from the `4.0.1` attestation. Preserve `calculateQualificationExecutionDigest()` and the existing profile digest as exact source-provenance functions. Do not compare those physical source digests across the migration.

Update `tooling/release-identity/evidence.mjs` to compare the CLI closure rather than the whole root lockfile for semantic compatibility and to compare qualification evaluator/logical identities rather than exact current-tree source digests. Update `qualification/src/baseline/baseline.ts` to use the carried or newly recorded Custom compatibility envelope and deterministic baseline replay. Both paths must still verify every original exact digest against the artifact or source commit that produced it.

### 3. Replace verbose physical storage

Add `qualification/profiles/index.yaml` as a small strict mapping from each logical adapter/implementation pair to an append-only short key. Assign the existing sorted targets `t1` through `t14`; new targets take the next unused key. Move profiles to `qualification/profiles/<target-key>/`.

Within each profile, replace verbose project directories with `cases/c1`, `cases/c2`, and so on in existing profile order. Keep full logical case IDs in `profile.yaml`; change only `projectDirectory`. Existing keys are never renumbered or reused. Preserve every scenario, task, probe, seed, expected file, file mode, symlink target, and byte.

Store new results at:

```text
qualification/results/<target-key>/
  latest.json
  attempts/a-<32-hex-digest>/
    attempt.json
    storage.json
    artifacts/f1.<extension>
    artifacts/f2.<extension>
```

The attempt key is the first 32 hexadecimal characters of SHA-256 over the complete logical attempt ID. The writer verifies the stored logical ID before accepting an existing key and fails on a collision. `storage.json` binds its storage schema version, exact attempt ID and digest, source commit, compatibility identity version and digests, and every logical path in `attempt.json.artifactDigests` to a short physical artifact path and digest. Logical attempt IDs, artifact paths, attempt schemas, CLI output, and website routes remain unchanged.

Add `qualification/src/storage/` with:

- `types.ts` for the strict profile index and artifact-storage manifest contracts;
- `profile-paths.ts` for logical profile/target resolution and validation;
- `result-artifacts.ts` for short artifact mapping, reading, and atomic writes;
- `index.ts` as the thin public boundary.

Update only the version-1 control-plane paths listed above to use this storage boundary: compatibility path resolution, result recording/verification, CLI result discovery, and baseline eligibility. Preserve their existing public interfaces wherever evaluator-bearing callers consume them, and do not modify executor or model-stage source. Ordinary `qualification list`, `status`, `verify`, `run`, `resume`, `retry`, and `record` operations read and write only this current short layout.

Use `qualificationLogicalInputDigest` for relocation compatibility. The existing physical profile digest remains exact source provenance and is expected to change after relocation. Physical relocation must preserve the logical digest; any actor-visible or deterministic-assertion mutation must change it.

Do not modify evaluator-bearing qualification source to complete the storage migration. Keep `calculateQualificationExecutionDigest()` unchanged as the exact full-suite provenance digest; adding storage/control-plane files and moving profiles will intentionally change its future value. Compatibility across the migration comes only from independently equal versioned evaluator and logical-input identities. If implementation requires changing an evaluator-bearing path, stop and revise the plan because the existing qualification evidence would become invalid.

### 4. Perform one deterministic migration

Add `tooling/qualification-storage-migration/` with:

- `migrate.mjs` for the fail-closed migration;
- `migrate.test-integration.mjs` for disposable-repository verification;
- `index.mjs` as the thin command entry point.

Expose `npm run qualification:storage:migrate`. The migration must:

1. require `v4.0.0` to resolve to `fcbc34f60b12b1b66cd9ebb28b1865979a259429`;
2. prove every tracked profile/result source blob matches that immutable commit before deleting or moving anything;
3. create the deterministic profile index and short profile tree;
4. prove every migrated profile has the same logical digest as its source;
5. copy only the latest passing Custom attempt into the short result layout, preserving `attempt.json` and every logical artifact byte/digest while adding its physical mapping and source-computed compatibility envelope to `storage.json`;
6. bind that Custom storage manifest to the exact source release, source commit, source attempt digest, and stable carry-forward attestation identifier;
7. remove the expanded result tree only after the complete source inventory, Custom copy, and all postconditions pass;
8. fail without deleting source paths on any mismatch and become a no-op only for the exact migrated state.

The other 59 attempts remain in the immutable `v4.0.0` Git tree and are not copied into the current checkout.

### 5. Keep historical evidence out of ordinary runtime paths

Release verification reads two evidence locations:

- current short results for newly recorded attempts and the migrated Custom attempt;
- the exact `v4.0.0` Git tree for historical attempts bound by the `4.0.1` attestation.

For each semantic or adapter target, release verification selects a passing attempt whose complete validity inputs match the current release. A current compatible attempt takes precedence; otherwise an attested historical attempt may be reused. A changed target cannot fall back to its incompatible historical attempt. A CLI, skill-behavior, universal-suite, environment, or shared-closure change makes all affected historical attempts ineligible automatically.

Before a legacy adapter attempt becomes eligible, release verification independently recomputes and compares the source and candidate evaluator/logical identities, then replays its baseline decision deterministically against the exact Custom compatibility envelope. The same referenced Custom attempt must pass the current compatibility rules. This replay verifies stored inputs only and does not invoke an actor, judge, model host, or qualification executor.

The carried Custom attempt may authorize an adapter run when its copied attempt/artifacts verify against the short storage manifest and checked-in attestation, and its portable-skill behavior digest, CLI closure, evaluator identity, canonical universal logical input, Custom target identity, execution environment, and complete shared package closure match. This runtime check uses no Git history. Its release metadata and exact physical source digests may differ. A newly recorded compatible Custom attempt supersedes it normally.

The qualification CLI does not enumerate the other historical attempts and never requires full Git history. `qualification verify` validates every result and latest pointer present in current short storage but does not require a current attempt for every profile; release completeness belongs to `release:check`, which may combine current and compatible historical evidence. Status for a target with only historical evidence reports that no current-tree attempt exists. Release verification separately reopens the exact source commit, proves that the checked-in attestation and migrated Custom copy match it, and fails with an explicit fetch instruction when that source is unavailable.

Extend the website's existing qualification Git contract reader rather than adding a second general evidence framework. The build-time loader reads current short results plus the immutable `v4.0.0` attempts, deduplicates the migrated Custom attempt only after proving byte/digest equality, and preserves logical public routes. Historical artifact links are pinned to the exact commit. Browser code receives resolved data only and never receives Git or filesystem access.

### 6. Add the exact `4.0.1` bridge

Add:

- `tooling/release-identity/carry-forward-4-0-1.mjs`;
- `tooling/release-identity/carry-forward-4-0-1.test-integration.mjs`;
- `fixtures/release-evidence/carry-forward-4.0.1.json`.

The bridge applies only when the candidate version is exactly `4.0.1` and the source is exactly `v4.0.0` at `fcbc34f60b12b1b66cd9ebb28b1865979a259429`. It must verify:

- the source semantic result and all 60 qualification attempts, contracts, artifacts, packages, and environments at the source commit;
- an exact match between the source semantic whole-lock identity and its source lockfile, plus an equal CLI closure digest before and after the release metadata change;
- exact byte identity for the CLI closure, semantic host/evaluator/protocol inputs, every evaluator-bearing qualification source path, adapter packages, and candidate runtime inputs;
- the same qualification identity version applied independently to the source and candidate trees, producing equal evaluator and logical-input digests for every target;
- an exact reviewed inventory of every changed control-plane path excluded by qualification identity version 1, with no unclassified production-source change;
- equal logical content for the migrated Custom attempt;
- the parsed portable-skill behavior digest before and after updating all three synchronized release-version occurrences;
- one complete compatibility envelope for each of the 60 source qualification attempts, bound to its exact source attempt digest and independently computed source identities;
- a passing deterministic baseline replay for every historical adapter attempt that was accepted by its recorded Custom baseline;
- the complete deleted-result source-tree count and digest;
- exact source and target blob digests for every added, modified, moved, or deleted non-result path in the reviewed migration, excluding only the attestation's own self-reference.

The attestation is generated after the candidate tree is stable. It records the exact inventories and digests plus `modelRunsPerformed: false` as a release-process assertion. Automated support for that assertion is limited to proving that the release workflow invokes no model executor, no new evidence attempt exists, and all original attempt IDs, timestamps, payloads, and usage remain unchanged. It does not claim that shell history can cryptographically prove a negative.

Later releases do not receive another release-number exception. They reuse or invalidate evidence through the validity model above.

### 7. Enforce Windows portability

Add `tooling/path-portability/` with:

- `path-portability.mjs`;
- `path-portability.test-unit.mjs`;
- `index.mjs` as the thin command entry point.

Expose `npm run path:check`. Check tracked and non-ignored candidate paths without reading `_archive`, `_archives`, `_backup`, or `_backups`. Reject paths over 160 UTF-8 bytes, Windows case-fold collisions, invalid storage keys, traversal, and generated worst-case result paths over the same budget.

Add a `windows-2025` job to `.github/workflows/conformance.yml`. It must use default Git checkout behavior, clone the candidate into a realistically deep user temporary path, run the portable path check and supported tests, install with pinned `skills@1.5.22`, and compare the installed skill with `moldea/`. Bubblewrap-only checks remain on Ubuntu. Release and website jobs fetch full history only because they consume immutable historical evidence.

The hosted Windows job is a required post-push release gate, not in-scope completion evidence for this uncommitted release-ready tree. This plan must add and locally validate the workflow definition; a later explicitly authorized commit and push must obtain the hosted result before tag or publication approval.

### 8. Synchronize release-ready state and documentation

After implementation and deterministic verification:

- update the root package and lockfile to `4.0.1`;
- update all three authoritative release-version occurrences in `moldea/SKILL.md` and `moldea/references/local-tooling.md`;
- update the root `README.md` project blueprint and every release-pinned installation example;
- update `docs/getting-started.md` and other release-identity copies already enforced by `tooling/release-identity/identity.mjs`;
- update the root semantic-evaluation workflow and `fixtures/semantic-evaluation-results/README.md` with preflight receipts, automatic sidecar finalization, interruption recovery, and the unchanged runner/protocol contract;
- update `qualification/README.md` with the short layout, validity matrix, carried-Custom rule, migration command, and current-only CLI behavior;
- update website/release evidence documentation and public provenance copy;
- generate the final carry-forward attestation.

No commit, tag, push, publication, deployment, or remote mutation is included.

## Ordered implementation steps

1. Remove the abandoned equivalence files and restore the two modified files to their pre-gate content. Verify the existing release and qualification tests before proceeding.
2. Add the portable-skill, CLI-closure, qualification-evaluator, and logical-input identities plus the semantic preflight/finalization wrapper, without changing either existing attempt protocol. Verify exact semantic argument forwarding and pre-model source binding, the versioned qualification classifier against both `v4.0.0` and the candidate, that only the three synchronized release occurrences normalize, and that every real skill, CLI, evaluator, or logical-input mutation invalidates the corresponding digest.
3. Add the short storage boundary and migration using only the explicitly excluded control-plane paths, execute it only after its immutable-source preflight passes, and verify the migrated profiles and Custom attempt before accepting deletion of expanded results. Stop if any evaluator-bearing qualification source would need to change.
4. Update baseline selection and release verification to use input compatibility, current short evidence, and attested compatibility envelopes for the exact historical source. Verify independent source/candidate identity equality, deterministic legacy baseline replay, adapter-only reuse, and every invalidation row in the matrix.
5. Update the website loader and Windows portability checks. Verify public route/provenance compatibility and a default deep-path Windows install.
6. Apply `4.0.1` release metadata, synchronize documentation, format every non-generated touched file, and stabilize the complete candidate tree. Generate the exact attestation as the final planned write, then run only check-mode deterministic verification. If any later command changes a file, regenerate the attestation before rerunning verification.

Each step is a review checkpoint. Step 3 must not delete results until the source inventory and migrated Custom copy are independently verified. Step 6 must not proceed if any protected behavior input changed.

## Test and verification strategy

Focused tests must cover:

- exact versus behavior digests, all three synchronized version occurrences, malformed/duplicate version fields, and non-version mutations;
- CLI closure invariance under root version/unrelated-package changes and sensitivity to every closure mutation;
- unchanged semantic and qualification attempt protocols, strict versioned identity sidecars/envelopes, and clean source-commit binding for future semantic records;
- semantic wrapper argument forwarding, inherited standard streams, signal and exit-status preservation, pre-model rejection of dirty relevant inputs, post-recording source revalidation, failed-attempt finalization, no-side-effect pass-through commands, atomic receipts/sidecars, hard interruption before and after attempt creation, safe no-attempt receipt retirement, refusal to overwrite an unresolved receipt, and ambiguous-receipt rejection;
- every invalidation-matrix row;
- fail-closed qualification source classification, exact version-1 exclusions, default inclusion of new production paths, and identity-version bump requirements;
- profile index uniqueness, containment, logical digest invariance, and actor-visible sensitivity;
- storage-manifest traversal, collisions, missing/unlisted artifacts, digest mismatches, atomic recording, and logical round trips;
- migration preflight, source tampering, Custom-copy equality, idempotency, and refusal to delete on failure;
- carried Custom acceptance without Git history only when its local manifest, attestation, and every compatibility identity match;
- exact full-suite digest sensitivity to storage/layout changes, evaluator-digest invariance for listed control-plane-only changes, and evaluator-digest sensitivity for every included production source;
- complete legacy compatibility envelopes, exact source-attempt binding, independently equal source/candidate identities, missing/duplicate envelope rejection, and deterministic baseline replay;
- release selection of current versus historical attempts and rejection of stale evidence;
- current-only qualification verification with missing-current status versus release-level completeness across current and historical evidence;
- exact `4.0.1` inventory mutations and protected-input mutations;
- website deduplication, pinned historical links, provenance, and unchanged logical routes;
- path byte limits, Windows case folding, generated paths, and Windows install parity.

Fake hosts and disposable repositories may exercise orchestration. Tests must never use a networked model provider or write to the real evidence tree.

Run the focused tests after each step, followed by the applicable package suite. Final verification must run:

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

Run Prettier in write mode on non-generated touched files through the repository tooling before generating the final attestation. After attestation generation, run formatting, production-build, and all other verification in check-only mode. If a check unexpectedly changes any file, inspect the change, restabilize the candidate, and regenerate the attestation. Confirm test files are excluded from production output. The later release workflow must require the hosted Windows job to pass after the candidate is committed and pushed and before tag or publication approval.

Do not execute any command that creates or resumes model evidence, including:

```text
npm run eval:semantic
npm run qualification:run
npm run qualification:record
npm run qualification:diagnose
npm run qualification:resume
npm run qualification:retry
```

The `*:verify` commands are allowed only after confirming they cannot invoke a model or record evidence.

## Security, compatibility, and rollback

- Use Git argument arrays with exact object IDs; never interpolate logical identifiers into shell commands.
- Reject absolute paths, traversal, NUL, backslash ambiguity, escaping symlinks, oversized objects, and excessive Git-tree entries.
- Never checkout or extract the historical long result tree during normal verification, website builds, or Windows CI.
- Preserve logical adapter, implementation, case, attempt, and artifact identifiers and all public website routes.
- Keep the existing semantic and qualification attempt protocols and strict readers unchanged; new writers add versioned identity sidecars or storage manifests without rewriting attempt payloads.
- Treat the semantic identity receipt as ignored local recovery state. Bind it to one invocation and source commit, write it atomically, exclude sensitive payloads, never overwrite it, and consume it only after exact attempt finalization or exact proof that the interrupted invocation created no attempt.
- Treat duplicate current/historical attempts as corruption unless they are the explicitly migrated Custom attempt and prove byte/digest equality.
- Before tagging, rollback is a normal revert because `v4.0.0` remains untouched. After tagging, short storage keys are append-only and schema changes use versioned readers.
- The historical `v4.0.0` checkout remains Windows-unsafe; the default branch and `v4.0.1` tree become Windows-safe.

## Acceptance criteria

The in-scope release-ready implementation is complete only when:

- a default Windows clone and skill install succeed without local Git or OS configuration;
- no candidate path exceeds 160 UTF-8 bytes or collides under Windows case folding;
- all 14 profiles preserve their logical digests;
- all 60 historical attempts remain release-verifiable and website-visible;
- the migrated Custom attempt is byte-for-byte equivalent at the logical artifact boundary;
- the carried Custom baseline can authorize an adapter-only run while all compatibility identities match;
- each historical qualification attempt has one exact attested compatibility envelope derived from its source tree, source and candidate evaluator/logical identities compare equal, and every accepted adapter baseline replays successfully;
- the exact qualification source digests may change with storage, but no evaluator-bearing source path changes;
- each invalidation-matrix change rejects exactly the affected evidence;
- ordinary qualification commands work from current short storage without historical Git access;
- future `eval:semantic` recording commands preserve every existing runner option, reject unbindable source state before a model call, finalize identities for recorded passing or failing attempts, and recover an interrupted finalization without another model call;
- an orphaned semantic receipt with no attributable attempt can be retired only after exact unchanged-source and unchanged-attempt proof, while ambiguous receipts block new recording instead of being overwritten;
- `4.0.1` passes release verification with unchanged original evidence and no model execution;
- any unlisted migration change or protected behavior mutation fails the `4.0.1` bridge;
- all deterministic local checks pass and the hosted Windows workflow is configured as a required post-push release gate.

Actual release approval remains outside this implementation scope. It requires a later explicitly authorized commit and push, a passing hosted Windows conformance job for that exact pushed commit, and separately authorized tag and publication operations.

## Explicit exclusions

- semantic, Custom, or adapter model runs for `4.0.1`;
- generic trace comparison or dual-runtime equivalence;
- a generic release changed-file ownership manifest;
- copying all historical results into the new tree;
- exposing historical evidence through ordinary qualification CLI commands;
- changing adapter behavior, evaluation prompts, cases, models, or package contents;
- rewriting Git history or `v4.0.0`;
- splitting the website or evidence into another repository;
- committing, pushing, executing hosted validation against a pushed candidate, tagging, publishing, or deploying.

## Approval required

Approval is required for this simplified revised scope: remove the abandoned equivalence work; preserve existing semantic and qualification attempt protocols and exact source provenance; add versioned portable-skill, CLI-closure, qualification-evaluator, and canonical logical-input identities through sidecars or storage manifests; wrap future semantic recording with exact pre-model source binding, argument-preserving execution, atomic finalization, a fail-closed orphan-receipt state machine, and no-model interruption recovery while keeping the semantic runner byte-identical; apply the same fail-closed qualification identity independently to `v4.0.0` and the candidate; permit changes only in the exact version-1 control-plane paths while keeping evaluator-bearing source byte-identical; migrate profiles and current results to short physical storage; carry only the locally verifiable Custom attempt into that storage; bind every legacy qualification attempt to an exact source-derived compatibility envelope with deterministic baseline replay; keep other historical evidence in the immutable `v4.0.0` tree for release and website use; allow the carried Custom baseline without Git only while all real compatibility inputs match; add the exact one-time `4.0.1` bridge and Windows checks; stabilize code, documentation, formatting, and release metadata before generating the attestation as the final planned write; and produce a locally verified release-ready `4.0.1` tree without running any model evaluation. Committing, pushing, hosted validation, tagging, and publication remain later separately authorized release gates. The previous milestone breakdown remains invalid and must be regenerated with `breakdown` after this plan is approved or otherwise ready for decomposition.
