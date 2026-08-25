# Plan: Decouple semantic checkpoint compatibility from Codex CLI provenance

## Objective

Allow an in-progress semantic evaluation to resume after an ordinary Codex CLI update when the behavior-bearing evaluation contract is unchanged, while preserving the exact actor and judge CLI version used for every paid trial.

The current six-trial checkpoint must be retained losslessly. The correction must not restart the evaluation, repeat completed trials, weaken the fixed Terra boundary, rewrite immutable public history, or make a paid model call. Qualification host and cache identity remain unchanged.

## Current behavior and evidence

- The repository is on `qualifications` at `d6b7429f17bb8ca6879d30bf2fbeb47203f0eb18`. It was clean before this planning directory was created.
- `tests/semantic-evaluation-runner.mjs` creates checkpoint schema 3 with one top-level `actorHost` and `judgeHost`. `validateSemanticCandidateCompatibility` compares both complete objects with `JSON.stringify`, so the non-behavioral `version` field is treated like the fixed model and reasoning configuration.
- The runner still correctly binds reuse to the exact portable artifact digest, semantic case-suite digest, coverage digest, published `@moldea.ai/cli` identity, and semantic protocol 12. Those boundaries must remain exact.
- `tooling/codex-evaluation-host/host.mjs` fixes the model to `gpt-5.6-terra`, reasoning effort to `medium`, validates the externally sandboxed Codex command, and reports `codex --version` as provenance. The host version is evidence about the process used, not the semantic evaluation contract itself.
- The active ignored checkpoint contains six initial trials, no confirmations, protocol 12, and actor and judge version `codex-cli 0.149.0`. Five cases pass and `adopted-direct-context-handoff` awaits confirmation. The installed CLI is `0.149.1`. The attempted confirmation stopped before any model call because of the exact host-object comparison.
- The active checkpoint has SHA-256 `19937efde46ad67c59197a91f3adbc170a8aab85453f77e40a8649a497752062`. Its latest immutable failed attempt contains the same six case outcomes but an earlier checkpoint representation, so it is valuable history but not an exact byte-for-byte recovery copy of the current local candidate.
- `tooling/semantic-evaluation/attempt-history.mjs` produces summary schema 1 with attempt-wide hosts and trials without host provenance. Its verifier deterministically recreates summaries from raw immutable evidence, so existing schema-1 records cannot be altered without breaking history integrity.
- `tooling/release-identity/evidence.mjs`, `tests/conformance.test-unit.mjs`, and the website semantic loader currently expect one actor and one judge host for the complete result or attempt.
- `README.md` and `docs/semantic-evaluation.md` currently describe checkpoints as bound to actor and judge identities and say the committed result records the actor and judge CLI versions, but they do not distinguish compatibility from per-trial provenance.
- The official [Codex changelog](https://learn.chatgpt.com/docs/changelog) lists `0.149.0` and `0.149.1` as separate CLI releases. OpenAI does not define compatibility rules for this repository's external checkpoint format, so that distinction remains a repository-owned evaluation policy.

## Desired final behavior

Semantic checkpoint reuse will have two deliberately separate concepts:

1. A stable host contract containing `name: "codex"`, model `gpt-5.6-terra`, and reasoning effort `medium`. This participates in compatibility and must match every actor and judge trial.
2. An exact host identity containing the stable contract plus the observed Codex CLI version. This is recorded independently for the actor and judge of every trial but does not invalidate otherwise compatible completed trials when only the version changes.

The existing semantic protocol remains version 12 because this correction changes checkpoint representation and provenance, not actor prompts, judge criteria, sandbox behavior, case semantics, confirmation policy, or pass derivation. Checkpoint and canonical-result schemas move to version 4 so the new representation is explicit rather than silently changing schema 3.

After a model-free, explicit migration, the six existing trials will each identify `codex-cli 0.149.0`. Future confirmations and initial trials will identify the exact version observed immediately before their respective actor and judge executions. A candidate may therefore contain multiple CLI versions, but every trial must satisfy the same stable host contract.

## Architecture and data contracts

### Semantic checkpoint schema 4

`tests/semantic-evaluation-runner.mjs` will own the semantic-specific compatibility contract. It will not change the shared host's qualification semantics.

The checkpoint will:

- replace top-level `actorHost` and `judgeHost` with one `hostContract` containing `name`, `model`, and `reasoningEffort`;
- require `actorHost` and `judgeHost` on every object in `results` and `confirmations`;
- retain the exact artifact, suite, coverage, release CLI, protocol, timestamps, results, and confirmation history;
- use `schemaVersion: 4`;
- include nullable `checkpointMigration` metadata with `fromSchemaVersion`, migration time, and source SHA-256 when an older local checkpoint was converted.

The exact Codex CLI version remains mandatory provenance. `unavailable`, an empty value, a wrong host name, a wrong model, or a wrong reasoning effort will fail before evidence is checkpointed.

### Explicit local checkpoint migration

Add a mutually exclusive, model-free `--migrate-checkpoint` operation to the existing semantic runner. It will:

- require the current ignored checkpoint to use supported schema 3;
- validate its complete case evidence, protocol, artifact, suite, coverage, release CLI, and fixed Terra/medium host configuration before writing;
- copy the old top-level actor and judge identities into every existing initial and confirmation trial;
- preserve every trial timestamp, response, command record, workspace change, criterion outcome, rationale, and digest;
- write the exact original bytes to an ignored, digest-named sibling recovery file before replacement and verify that recovery copy;
- record the source digest and migration time, advance only the checkpoint's `updatedAt`, and atomically replace the candidate with schema 4;
- re-read and compare the source digest immediately before replacement so a concurrently changed candidate is rejected;
- be idempotent for an already-valid schema-4 candidate and make no Codex invocation or public attempt write.

This is a narrow transition for local schema-3 checkpoints, not an alternate evaluation path. Schema 2 and schema 3 public attempt evidence remain readable because immutable transparency requires it, but only schema 4 will be resumable after this change.

### Trial execution and provenance

For each paid actor or judge stage, identify the Codex host immediately before that process starts. Attach the exact role-specific identity to the resulting trial before the candidate is written. This prevents a CLI replacement between stages or trials from being attributed to the earlier version.

Compatibility will compare the candidate's stable `hostContract` with the current validated actor and judge commands after removing only the version field. It will continue to compare every other existing evidence boundary exactly. Trial validation will independently require each recorded identity to satisfy that stable contract.

### Canonical semantic result schema 4

`createSemanticEvaluationRecord` and standalone diagnostic output will emit schema 4. New canonical evidence will:

- carry the stable `hostContract`;
- retain actor and judge identities on every selected result, public case, initial trial, and confirmation;
- remove the misleading singular `host`, top-level `actorHost`, and top-level `judgeHost` aliases from new evidence;
- preserve the complete confirmation history and existing release-binding fields.

No canonical result exists currently, so no committed passing result needs migration or deletion.

### Immutable attempt history

`tooling/semantic-evaluation/attempt-history.mjs` will introduce summary schema 2 for schema-4 evidence. Each summarized trial will include its exact actor and judge identities, and the attempt will include the stable host contract instead of claiming one CLI version for the whole attempt.

The recorder and verifier will remain schema-aware:

- historical raw evidence schemas 2 and 3 continue to deterministically produce the existing summary schema 1 byte-for-byte;
- schema-4 raw evidence produces summary schema 2;
- unsupported combinations, missing role identities, changed host contracts, and tampered versions are rejected;
- existing attempt directories and `latest.json` remain untouched and verifiable.

Update `tooling/semantic-evaluation/attempt-history.d.mts` with explicit host identity, host contract, schema-1 legacy record, schema-2 record, and union types. Keep `tooling/semantic-evaluation/index.mjs` as the existing public boundary without adding unrelated exports.

### Release gate and conformance

Update `tooling/release-identity/evidence.mjs` so a new canonical result must use result schema 4, semantic protocol 12, the fixed host contract, and per-trial actor and judge identities that match the newest immutable passing summary. It must reject missing provenance, a non-Terra model, non-medium reasoning, a non-Codex host, or disagreement between canonical case history and attempt history. It must not require every trial to use the same Codex CLI version.

Update `tests/conformance.test-unit.mjs` to validate schema 4 and all trial-level host evidence when a canonical result exists. Remove assertions for the superseded singular host aliases.

### Website consumption and presentation

Update `website/src/lib/semantic-evaluation/validations.ts` with a discriminated union for immutable summary schemas 1 and 2. Schema 1 remains accepted only for committed history. Schema 2 requires the stable host contract and per-trial actor and judge identities.

Update `loader.ts` and `types.ts` to normalize both generations into a presentation model that always exposes trial provenance. Historical schema-1 attempts may display their recorded attempt-wide hosts as the effective identity for each historical trial; schema-2 attempts use their explicit trial identities. Current-release validation will require the fixed contract through the appropriate schema path.

Update `website/src/pages/evidence/semantic/attempts/[attemptId]/index.astro` so every trial exposes actor and judge CLI versions in technical detail, while the main semantic page continues to describe the stable `gpt-5.6-terra`, medium contract. Keep the page static, keyboard accessible, readable without JavaScript, responsive at 320px, and compatible with the existing light and dark theme tokens. Do not add animation or dependencies.

## Ordered implementation steps

1. Add semantic host-contract and exact-host-identity validators in `tests/semantic-evaluation-runner.mjs`. Reuse the existing shared host constants and identity function; do not change qualification behavior or add a second shared-host abstraction.
2. Add checkpoint schema 4 creation and validation. Require trial-level actor and judge identities, retain all existing exact evidence boundaries, and change compatibility to ignore only the version field after proving the stable contract matches.
3. Extend argument parsing with the exclusive `--migrate-checkpoint` operation and implement the lossless, atomic schema-3 migration plus digest-named ignored recovery copy. Keep migration before host command parsing so it cannot invoke Codex or require paid-run environment variables.
4. Capture actor and judge identity immediately before each role execution, attach it to initial and confirmation trials, and emit schema-4 standalone and canonical results without singular host aliases.
5. Make immutable attempt recording schema-aware in `tooling/semantic-evaluation/attempt-history.mjs` and its declaration file. Preserve exact regeneration of every existing schema-1 attempt while producing schema 2 for new evidence.
6. Update release-evidence validation and conformance assertions for the stable contract and complete per-trial provenance.
7. Update website validation, loader types, attempt models, and the attempt page to consume both immutable history generations and present exact role versions per trial.
8. Synchronize `README.md` and `docs/semantic-evaluation.md`. Document the compatibility/provenance distinction, schema 4, explicit migration and recovery file, mixed-version attempts, exact invalidation boundaries, and the fact that routine Codex CLI updates no longer force a restart. Keep the public explanation concise and do not change the portable `moldea/` skill.
9. Run focused and broad verification, review all changed files, then execute the model-free migration against the active ignored checkpoint. Verify that the recovery copy matches SHA-256 `19937efde46ad67c59197a91f3adbc170a8aab85453f77e40a8649a497752062`, the migrated checkpoint still contains six trials with unchanged semantic evidence, and all six old trial host identities remain `codex-cli 0.149.0`.
10. Stop after the implementation review checkpoint. Do not run the pending confirmation or any other paid semantic stage. Resuming the evaluation will require a separate explicit authorization after the source correction is committed.

## Testing strategy

### Runner unit coverage

Extend `tests/semantic-evaluation-runner.test-unit.mjs` to prove:

- a schema-4 checkpoint resumes from `0.149.0` with current `0.149.1` commands when name, model, reasoning, protocol, artifact, suite, coverage, and release CLI still match;
- name, model, reasoning, protocol, artifact, suite, coverage, and release CLI changes remain incompatible;
- missing, empty, or unavailable trial versions are rejected;
- initial and confirmation trials retain distinct actor and judge versions;
- canonical schema 4 contains complete per-trial provenance and no singular host aliases;
- schema-3 migration is lossless for all semantic trial fields, records its source digest, preserves trial timestamps, updates checkpoint metadata, and is idempotent;
- migration rejects stale inputs, malformed evidence, unofficial host configuration, unsupported schemas, a changed source during replacement, and any command combination that could perform model work;
- checkpoint publication validates migrated schema-4 evidence before any immutable write.

### Attempt-history unit and integration coverage

Extend the colocated attempt-history tests to prove:

- existing schema-2/3 raw evidence still recreates summary schema 1 exactly;
- schema-4 evidence creates summary schema 2 with exact per-trial actor and judge identities;
- mixed Codex CLI versions are retained and accepted under one stable contract;
- tampered, missing, or contract-incompatible trial identity fails verification;
- append-only directories, digest checks, latest status, and last-passing behavior remain unchanged.

### Release and website coverage

Update `tooling/release-identity/evidence.test-integration.mjs` with a passing mixed-version result and attempt pair, plus failures for incomplete or mismatched trial provenance.

Update `website/src/lib/semantic-evaluation/loader.test-integration.ts` to cover historical schema 1, new schema 2, mixed versions, malformed provenance, and current-boundary validation. Update the semantic evidence E2E coverage only where needed to assert visible actor and judge versions and preserve keyboard, no-JavaScript, 320px, light-theme, and dark-theme behavior.

### Verification commands

Run, in order:

```bash
node --test tests/semantic-evaluation-runner.test-unit.mjs tooling/semantic-evaluation/attempt-history.test-unit.mjs
node --test tooling/semantic-evaluation/attempt-history.test-integration.mjs tooling/release-identity/evidence.test-integration.mjs
npm run eval:semantic:preflight
npm run eval:semantic:verify
npm run test:unit
npm run test:integration
npm test
npm run docs:check
npm --prefix website run test:unit
npm --prefix website run test:integration
npm --prefix website run test:e2e -- --grep "semantic"
npm run website:check
```

Run Prettier through the existing configuration on only the touched files before the final check. Do not run `npm run release:check` as a success gate during this correction because the repository intentionally lacks current passing semantic and qualification evidence; the release gate remains expected to reject that state.

## Persistence, integrity, and failure handling

- The migration writes no committed result and makes no network or model call.
- The original local checkpoint bytes are preserved before replacement. A hash mismatch or backup-write failure stops migration without changing the candidate.
- Candidate replacement remains atomic. A last-moment source digest mismatch stops instead of merging concurrent state.
- Completed trial content is never regenerated, re-judged, normalized, or copied from a model response. Only trusted top-level host provenance is moved onto the trials it originally governed.
- Existing immutable attempts, raw evidence, and pointers are never rewritten. Historical schema support exists solely to keep those committed artifacts independently verifiable.
- `--restart` keeps its existing destructive meaning and is not used by this correction.
- No secret-bearing host configuration is added to evidence. Only the existing non-sensitive host name, model, reasoning effort, and CLI version are persisted.
- The workflow remains a single local operator process. This change does not introduce general multi-process checkpoint locking; the migration-specific digest recheck prevents it from overwriting a concurrently modified candidate.

## Documentation and protected instructions

State-bearing documentation changes are limited to `README.md` and `docs/semantic-evaluation.md`. They will describe current behavior, operations, schemas, recovery, and public provenance. No API documentation, dependency, workflow, portable skill file, semantic case, coverage claim, or qualification documentation changes are required.

After implementation, inspect the protected instruction files without modifying them. The current instructions already establish local checkpointing, exact verification, and model-execution authorization; a coding-instructions handoff is needed only if the completed code reveals a durable repository rule not already covered.

## Explicit exclusions

- No paid actor, judge, diagnostic, confirmation, or full semantic run.
- No restart or deletion of the active six-trial checkpoint.
- No rewrite, deletion, or replacement of committed failed attempt history.
- No change to `moldea/`, semantic cases, semantic coverage, actor prompts, judge prompts, pass criteria, confirmation policy, sandbox isolation, egress, timeout, model, or reasoning effort.
- No change to qualification checkpoint, cache, result, or host-version compatibility. Qualification may continue to exact-bind its Codex version because its cache and resumability contracts are separate.
- No dependency, lockfile, CI, workflow, release version, CLI package version, or generated website artifact change.
- No release, commit, push, or model-execution authorization is implied by approval of this plan.

## Acceptance criteria

- The active checkpoint can be migrated without a model call and without losing or changing any of its six completed trial outcomes.
- A routine Codex CLI version update alone no longer invalidates a semantic checkpoint.
- Any change to the fixed Codex host name, Terra model, medium reasoning effort, semantic protocol, portable artifact, suite, coverage, or release CLI still invalidates reuse.
- Every new actor and judge trial records the exact observed Codex CLI version independently.
- New checkpoint, canonical result, immutable attempt, release-gate, and website contracts agree on stable compatibility and per-trial provenance.
- Existing immutable schema-1 attempt summaries and their raw schema-2/3 evidence still verify without modification.
- The website makes mixed-version provenance inspectable without sacrificing static rendering, accessibility, responsiveness, or theme support.
- All listed non-paid checks pass, and the ignored recovery copy is verified before the active candidate changes.
- The repository is ready for review and commit, after which the pending confirmation can be separately authorized using Terra.

## Risks and decisions

- Treating every CLI version as incompatible wastes paid work and makes ordinary tool updates operationally disruptive. Ignoring version everywhere would weaken transparency. The stable-contract plus per-trial-provenance split avoids both failures.
- Schema 4 is preferable to silently broadening schema 3 because validators, release checks, history, and website consumers need an unambiguous contract.
- The semantic protocol remains 12 only because no behavior-bearing evaluator input changes. If implementation inspection reveals that the correction must alter prompts, sandbox execution, evidence supplied to the judge, or pass derivation, stop and revise this plan rather than migrating old trials across that change.
- Historical schema handling is not general backward compatibility for evaluation resumption. It is required to preserve the repository's append-only public evidence contract.
- The current candidate's original bytes are not identical to the latest committed raw attempt, so an exact local recovery copy is required before migration.

## Approval required

Approval authorizes the source, tests, documentation, website consumer, release-gate, and model-free active-checkpoint migration described above. It does not authorize any paid semantic call, checkpoint restart, qualification change, commit, push, release, or later evaluation stage.
