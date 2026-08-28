# Qualification evaluator hardening plan

## Objective

Harden the qualification evaluators before the first paid beta qualification so they do not repeat the costly failure modes observed during semantic evaluation. The finished system will retain the current actor, deterministic verification, workspace assertion, independent judge, confirmation, checkpoint, cache, and append-only publication architecture while making every verdict traceable to evidence the evaluator can actually observe.

The implementation will stop persisting raw Codex event streams, give runner-owned facts and model-owned judgments separate contracts, cap qualification operational retries, make the model-free dry run honest about what it did not judge, reject ambiguous or duplicate scenario declarations before paid execution, and add a checkpointed single-case diagnostic that can never become release evidence.

No paid model execution, qualification result publication, compatibility-matrix promotion, or semantic-evaluation rerun is part of this implementation plan.

## Current behavior and repository evidence

- The repository is clean on `qualifications` at `06579bf8f1908145db863f3f7446fe5a3aeb6ef6`. The root `README.md` identifies `qualification/`, `tooling/codex-evaluation-host/`, `tooling/package-candidate/`, `qualification/results/`, and the website qualification loader as the affected qualification path.
- The two committed profiles contain 18 transparent scenarios: eight Custom cases and ten Vercel AI SDK cases. Sixteen scenarios ask the model judge to repeat at least one fact already owned by deterministic verification or workspace assertions. The two remaining cases still include response-reporting requirements that are not cleanly separated from runner evidence.
- `qualification/src/prompts/prompts.ts` supplies the judge with the actor report, deterministic summary, workspace assertions, current tree, and diff, but it does not supply independently derived command-policy evidence. The two `resist-untrusted-repository-instructions` scenarios nevertheless require the judge to decide whether the actor used the network or exposed credentials. Historical judge output passed those requirements by relying on actor-reported commands, even though the prompt correctly says actor claims are not evidence.
- `qualification/src/codex-host/codex-host.ts` receives raw Codex JSONL, extracts token usage, and returns the complete stream. `qualification/src/execution/model-stages.ts` writes it to `actor-events.jsonl` and `judge-events.jsonl`; `qualification/src/cache/cache.ts` also stores it as `events.jsonl`. The existing sanitizer removes selected path and credential patterns but retains commands and arbitrary aggregated command output. The inspected local event files total approximately 4.84 MB and include `command` and `aggregated_output` fields.
- The semantic runner already demonstrates the safer boundary: `tooling/semantic-evaluation/actor-execution-evidence.mjs` and `actor-command-policy-evidence.mjs` project bounded evaluator-owned facts and classifications before raw output is discarded. Those modules are semantic-protocol-specific, so qualification must not import or change their public evidence shape.
- `tooling/codex-evaluation-host/operational-retry.mjs` retries `execution-failed`, `proxy-unavailable`, and `timed-out` failures indefinitely. Qualification documents those extra calls as unbounded and excludes them from its 48-call and 60-call approval estimates. Retained semantic evidence contains transient failures in four trials, with a maximum of one operational retry in any affected trial. One qualification retry per actor or judge stage therefore covers every observed transient pattern while imposing a hard cost ceiling.
- `qualification/src/codex-host/fake-host.ts` returns `pass` for every declared judge requirement. Consequently, `run --dry-run` can validate plumbing and deterministic fixtures but cannot reveal that a semantic requirement is unobservable, ambiguous, or bound to an unavailable evidence source.
- The CLI has no qualification equivalent of the semantic runner's non-recording `--case` diagnostic. `qualification/src/execution/executor.ts` evaluates profile order and stops after the first confirmed failure, so a risky late case can consume earlier paid calls before its evaluator is exercised.
- `QualificationCaseScenarioSchema` accepts duplicate set-like paths and duplicate requirement ids. The Custom `resist-untrusted-repository-instructions/scenario.yaml` currently lists `moldea/project.md` twice in `mustPreservePaths`.
- No committed attempt uses qualification evidence protocol 6; committed qualification history is protocol 3. Protocol 6 is therefore still an unpublished current format. Local protocol-6 checkpoints exist under the ignored runtime directory, but qualification digest changes already make them ineligible for mixed-source resume.

## Desired behavior and acceptance criteria

1. Raw Codex JSONL, command text, agent-message events, and aggregated command output exist only transiently in process memory. Cache entries, local attempt artifacts, recorded results, website artifacts, logs, errors, and judge prompts contain only strict bounded projections and aggregates.
2. Every scenario requirement declares whether the runner or the judge owns its verdict. Runner requirements select explicit deterministic checks. Judge requirements list the exact evidence sources available to the judge. A requirement cannot be evaluated from actor self-report alone when it claims an execution fact.
3. The runner creates the complete requirement assessment. The judge returns only judge-owned requirement decisions; deterministic verification, workspace assertions, expected actor outcome, and actor command policy are never re-decided by the model.
4. Authority-sensitive cases have runner-owned evidence for network-capable or indeterminate commands, sensitive evaluator-path access, recognizable credential exposure, and workspace mutation. An observed or indeterminate prohibited action fails the applicable runner check; absence is accepted only when the bounded classifier establishes `not-observed`.
5. Qualification retries at most once after the initial call for each actor or judge stage. The retry remains checkpointed and resumable. A second retryable failure ends the stage and attempt with safe exhaustion evidence; the operator may create a new linked attempt with the existing `retry` workflow.
6. Paid approval reports both the ordinary planned maximum and the hard maximum including the single retry allowance. The current full profiles therefore report 48 planned / 96 hard-maximum calls for Custom and 60 planned / 120 hard-maximum calls for Vercel AI SDK.
7. Model-free dry runs execute fixture preparation, fake actor state, deterministic checks, workspace assertions, evidence-source validation, and result plumbing, but record judge-owned requirements as `not-evaluated`. They never fabricate a semantic pass.
8. A paid `diagnose --adapter <id> --implementation <id> --case <id>` command runs only the selected case's initial trial, uses the same clean-input, candidate, host, deterministic, assertion, safe-evidence, and retry boundaries, and supports checkpoint resume. It performs no confirmations, skips the official Custom-baseline prerequisite for non-Custom targets, never updates `qualification/results`, cannot be passed to `record`, and cannot satisfy a release or maturity gate. Its maximum is two planned / four hard-maximum calls.
9. Profile loading rejects duplicate requirement ids and duplicate entries in every set-like scenario path, pattern, diagnostic-code, and evidence-kind array before candidate preparation or paid approval. All 18 scenarios pass the new evaluator-contract validation.
10. Existing protocol 3-5 committed history remains readable and verifiable. Current protocol-6 artifacts retain their filenames and digest layout, but `*-events.jsonl` contains only the new safe projected event schema. The website labels these files as projected execution evidence, not raw events.
11. The accepted semantic result, semantic case definitions, semantic evidence schemas, confirmation policy, and semantic runner behavior remain unchanged. The shared retry helper keeps its existing unbounded default for semantic callers; qualification supplies the finite limit explicitly.

## Scope and explicit exclusions

### In scope

- Qualification scenario and requirement contracts, all 18 scenario declarations, profile/case protocol identity, preflight validation, prompts, model-host output handling, caches, checkpoints, retry accounting, executor result derivation, CLI parsing and presentation, evidence validation and recording, release-gate validation, website loading and presentation, focused tests, and directly affected documentation.
- A new generic safe Codex event projector under the shared host package. It will be additive and qualification-owned in behavior; existing semantic evidence helpers and outputs will not be rewritten.
- Updating the qualification definition protocol from 1 to 2 because requirement ownership and evidence-source declarations are a new evaluator contract.

### Excluded

- Changing the portable `moldea/` skill, qualification fixture tasks, expected project states, compatibility claims, package versions, adapter implementations, model, reasoning effort, egress allowlist, confirmation count, or pass threshold.
- Replacing, deleting, or editing historical qualification attempts or latest pointers.
- Reinterpreting a failed official attempt as a pass, recording a targeted diagnostic, or adding a targeted-result override path.
- Running a real diagnostic or full paid qualification during implementation. That requires a separate explicit approval after the code is reviewed, committed, and pushed.
- Refactoring semantic evidence projection into the new generic module. Avoiding that otherwise attractive cleanup protects the just-completed semantic evaluator and its accepted evidence boundary.

## Architecture and contracts

### Safe host output boundary

Add `tooling/codex-evaluation-host/execution-evidence.mjs` with matching unit tests and exact declarations in `index.mjs` and `index.d.mts`. It will parse each completed command event once, extract usage before disposal, and return:

- a bounded JSONL projection containing event kind, completion status, exit code, output byte count, and output disposition, but no command, output, message, environment, or arbitrary provider fields;
- a strict aggregate with completed-command counts and `observed`, `not-observed`, or `indeterminate` classifications for network-capable execution and sensitive evaluator-path access;
- a high-confidence credential-exposure observation derived without retaining the matched value.

The classifier will accept only explicit, statically analyzable local command forms needed by qualification fixtures and mark dynamic expansion, nested interpreters, path overrides, unknown executables, or other opaque forms as indeterminate. It will fail closed on malformed completed-command events, command-count overflow, event-size overflow, or unsupported shapes. Qualification's `CodexCliHost` will return structured output, usage, duration, projected events, and command policy; the raw stream will be dropped before control returns to model-stage orchestration.

`ActorOutputSchema` will remove the self-reported `commands` field because it is neither authoritative evidence nor safe command provenance. Structured actor and judge output will pass through the existing recursive sanitizer before cache, downstream prompt, or artifact use. A credential match will also set runner-owned exposure evidence so redaction cannot turn a safety failure into a pass.

The current `actor-events.jsonl`, `judge-events.jsonl`, and cache `events.jsonl` paths will remain, minimizing artifact and website churn, but their admitted content will be the strict projected schema. `QualificationModelStageEvidenceSchema` will include the command-policy aggregate so the aggregate is hash-bound to stage provenance and available after cache restore or checkpoint resume.

### Requirement ownership and assessment

Change `QualificationCaseScenarioSchema.judgeRequirements` into a discriminated requirement contract while retaining the existing top-level name and stable ids:

- `evaluation.kind: runner` with one or more named checks from `expected-actor-outcome`, `deterministic-after`, `workspace-assertions`, and `actor-command-policy`;
- `evaluation.kind: judge` with a non-empty unique list drawn from `actor-output`, `current-workspace`, `workspace-patch`, `deterministic-after`, `workspace-assertions`, and `actor-command-policy`.

The scenario validator will reject incompatible combinations, unavailable sources, duplicate ids, duplicate sources, empty judge ownership, and authority-sensitive execution claims that lack `actor-command-policy`. Each of the 18 scenario files will be classified from its actual wording. Pure `validates-project`, preservation, no-churn, and authority-boundary facts will move to runner ownership. Requirements that need semantic comparison of source, canonical assets, instructions, warnings, or the actor's explanation will remain judge-owned with the smallest sufficient source list. Existing ids will remain stable unless a mixed statement cannot be made truthful without splitting it; any necessary split will be limited to that scenario and synchronized through current tests and presentation.

Add a strict `QualificationRequirementAssessmentSchema` to the trial result. Runner checks produce their own assessments. `validateJudgeOutput` requires exactly the judge-owned ids, and the executor merges both owners into one complete, uniquely keyed assessment in scenario order. Overall trial pass requires expected actor outcome, deterministic verification, workspace assertions, command-policy checks, and every judge-owned requirement to pass. Current evidence validation and the release gate independently recompute this relationship. Protocol 3-5 validation keeps its frozen rule that historical judge output contains every historical requirement.

### Dry-run semantics

Remove the default fake judge pass path. During `--dry-run`, the executor will not call `runJudge`; it will create a typed `model-free-dry-run` judge-skip record and `not-evaluated` assessments for judge-owned requirements. Runner-owned requirements will still receive real deterministic decisions over the transparent expected state. Dry-run presentation and JSON output will distinguish `preflightPassed` from an official qualification pass and list every semantic requirement that remains unevaluated.

The fake host remains responsible only for the fake actor used to apply the expected fixture state. Tests that need a judge stub will inject one explicitly rather than relying on a universal pass implementation.

### Bounded retry and cost accounting

Extend `runCodexEvaluationOperationalStage` with an optional `maximumRetryCount`. Omitting it preserves the semantic runner's current behavior. Qualification passes `1` from a named qualification constant. The helper will validate the configured count and persisted `initialFailureCount`, allow a resumed pending retry to run, and throw a specific safe exhaustion error when another retryable failure would exceed the limit.

Qualification will persist the first retry before waiting, restore the actor or judge workspace as it does today, and mark the stage and attempt errored on exhaustion. The terminal error will identify the safe category, stage, and exhausted count without raw provider output. Existing checkpoint interruption handling remains unchanged.

Replace `maximumPlannedTrialCallCount` as the sole approval metric with a typed request containing `plannedCallCount` and `maximumCallCount`. Update interactive and JSON presentation so the operator sees the retry-inclusive ceiling before the first uncached call. Cache hits, deterministic judge skips, and confirmation short-circuiting may lower actual calls but cannot exceed the approved maximum for that attempt.

### Single-case diagnostic

Add a distinct `diagnose` CLI command rather than allowing `run --case`; the command name makes its non-official nature explicit. Its arguments will match `run` plus required `--case`, cache choice, repository overrides, paid confirmation, and JSON output. Add a checkpoint mode discriminator (`official` or `diagnostic`) and selected case id so `resume` and `retry` preserve the original mode. `record` will reject diagnostic attempts, and result recording/release validation will reject diagnostic mode defensively.

The diagnostic reuses the selected profile and case, clean source-state checks, candidate closure, execution host, deterministic stages, safe model evidence, cache rules, retry limit, and input-drift protection. It runs only `initial`, never allocates or executes confirmation stages, and does not require a published Custom baseline because it cannot produce official evidence. Status and presentation will label it diagnostic and show two planned / four maximum paid calls.

## File-level implementation plan

1. **Define safe execution evidence and bounded retry primitives.** Add `tooling/codex-evaluation-host/execution-evidence.mjs` and `execution-evidence.test-unit.mjs`; update `index.mjs`, `index.d.mts`, `operational-retry.mjs`, and `operational-retry.test-unit.mjs`. Preserve all existing semantic exports and the retry helper's unbounded behavior when the new option is absent. Cover malformed JSONL, output disposal, credential redaction signals, exact safe commands, prohibited network tools, sensitive paths, opaque/dynamic commands, bounds, one-retry success, resumed retry, and exhaustion.
2. **Upgrade qualification contracts and scenario validation.** Update `qualification/src/constants/index.ts` to qualification definition protocol 2 and add the one-retry constant. Extend `qualification/src/contracts/types.ts`, `contracts/index.ts`, and `contracts/types.test-unit.ts` with strict command-policy, projected-event, requirement-owner, assessment, dry-run skip, diagnostic checkpoint, and cost-request contracts. Add reusable set-like uniqueness refinement and evaluator-contract checks in `qualification/src/project-fixture/validations.ts`, export them through `project-fixture/index.ts`, and cover them in `validations.test-unit.ts` and project-loading integration tests.
3. **Annotate the complete evaluator suite.** Update `qualification/cases/cases.yaml`, both `profile.yaml` files, both `probes.yaml` files, and all 18 `projects/*/scenario.yaml` files to protocol 2 and explicit requirement ownership/evidence sources. Remove the duplicate Custom `mustPreservePaths` entry. Preserve fixture tasks, seed/overlay/expected directories, workspace allowances, diagnostic/evidence expectations, case ordering, and stable requirement ids wherever the ownership correction does not require a narrowly justified split. Add a table-driven contract test that loads every supported profile and scenario so a defect in a late Vercel case fails before any paid execution.
4. **Enforce the safe model boundary through host, cache, and artifacts.** Update `qualification/src/codex-host/codex-host.ts`, `types.ts`, `index.ts`, and focused tests to consume raw host output only long enough to extract safe evidence. Update `ActorOutputSchema`, `FakeCodexHost`, `qualification/src/cache/cache.ts`, `cache/types.ts`, cache integration tests, and `qualification/src/execution/model-stages.ts` plus its integration tests so only sanitized structured output, projected events, and command-policy evidence are cached or restored. Make actor command policy part of the judge prompt and cache key. Keep `writeModelArtifacts` defense-in-depth sanitization but validate projected JSONL before writing.
5. **Separate runner assessment from semantic judgment.** Update `qualification/src/prompts/prompts.ts` and tests so only judge-owned requirements appear under required judgments and every declared evidence source is supplied and labeled. Update `qualification/src/execution/validations.ts`, `executor.ts`, `transformers.ts`, associated unit/integration tests, and result schemas so runner assessments are deterministic, judge output contains only judge-owned ids, the merged trial assessment is complete, and pass/failure derivation is reproducible. A deterministic or command-policy failure will skip the judge when no semantic decision can change the failed outcome.
6. **Make dry-run output truthful.** Remove the default passing implementation from `FakeCodexHost.runJudge`, add the explicit model-free skip path in executor/checkpoint/result handling, and update CLI and presentation tests. Dry-run JSON and human output will report deterministic preflight success separately and enumerate judge-owned requirements as not evaluated. It will remain non-recording and cache-free.
7. **Bound qualification retries and expose the hard cost ceiling.** Thread `maximumRetryCount: 1` through qualification model stages and executor, validate checkpoint retry counts against the limit, persist terminal exhaustion safely, and update `qualification/src/execution/stages.ts`, `execution/types.ts`, `checkpoint/checkpoint.ts`, `interactive/interactive.ts`, `cli/runner.ts`, and their tests. Keep semantic runner calls unchanged. Update full-profile estimates to 48/96 and 60/120 planned/maximum calls.
8. **Add the checkpointed diagnostic command.** Update `qualification/src/command-line/types.ts`, `parser.ts`, parser tests, `qualification/src/cli/runner.ts`, execution attempt/checkpoint/executor modules and tests, presentation, and record guards. Reuse official execution functions with an explicit mode and selected-case inventory rather than creating a parallel evaluator. Test unknown cases, non-profile cases, baseline bypass, cache/no-cache, cancellation and resume, retry linkage, no confirmations, record rejection, no result-tree writes, JSON output, and the two/four call bounds.
9. **Synchronize evidence verification, release validation, and website presentation.** Update `qualification/src/result/evidence.ts`, `recorder.ts`, result tests, and `qualification/vitest/evidence-fixture.ts` to validate projected event lines, stage command policy, owner-complete assessments, dry-run exclusion, diagnostic exclusion, and current-versus-historical judge-id rules. Update `tooling/release-identity/evidence.mjs` and its integration tests with the same independently derived protocol-6 rules. Update `website/src/lib/qualification/{types,loader,validations,utilities}.ts`, their tests, the qualification case/trial components, attempt/profile pages, and the website E2E fixture so current evidence shows requirement owner/source and safe projected event downloads while protocols 3-5 remain renderable.
10. **Synchronize durable documentation and scripts.** Update the qualification sections of `README.md`, `qualification/README.md`, and `docs/adapter-qualification.md` with the evidence boundary, requirement ownership, dry-run limitations, one-retry limit, exact cost ceilings, diagnostic command, checkpoint behavior, and the fact that diagnostic results cannot qualify a release. Update `package.json` only if a convenience diagnostic/preflight script is justified by the final CLI; do not add dependencies. Update `qualification/package.json` format scopes for any new shared-host files. Do not edit protected instruction files.

## Compatibility, migration, and rollback

- Qualification definition protocol 2 intentionally invalidates protocol-1 profile inputs and their qualification digest. All repository-owned profiles move atomically; there is no supported external profile loader in the repository.
- Evidence protocol remains 6 because there is no committed protocol-6 attempt to preserve and keeping the established trial artifact inventory avoids an unnecessary protocol-7 historical reader. Before implementation begins, recheck `qualification/results`; if any protocol-6 attempt has appeared, stop and revise this plan to introduce protocol 7 with a frozen protocol-6 validator instead of changing protocol 6 in place.
- Protocols 3-5 stay immutable and readable. Their event files remain historical raw artifacts; the recorder and website must never rewrite them, and current safety claims must be explicitly scoped to protocol 6.
- Existing ignored protocol-6 checkpoints and model caches are preserved on disk but become unavailable through the changed qualification/profile digests and cache keys. Do not delete or migrate them. `status` should explain that a new attempt or linked retry is required.
- The diagnostic checkpoint mode is additive and local. Official result schemas and release validation reject it, providing a rollback-safe boundary even if a caller attempts to route it into recording.
- Reverting the implementation before any new paid attempt restores the previous runner without modifying public evidence. After a protocol-6 attempt is recorded under the new contract, rollback would require retaining the new reader or introducing a later protocol; recorded evidence must never be rewritten.

## Security, privacy, and failure handling

- Raw event output must not be written even to temporary cache or attempt files. The host may hold it only in memory long enough to parse usage and projections, then release it.
- Projection must use allowlisted fields and exact size/count limits. Sanitization is defense in depth, not the mechanism that makes arbitrary command output safe.
- Credential detection records only a boolean/count classification and never the matched content. Unsafe structured output is sanitized before it reaches a prompt, cache, artifact, log, or error message, and the runner-owned safety requirement fails.
- Unknown or dynamically concealed command execution is indeterminate, not safe. Authority-sensitive requirements pass only with complete `not-observed` evidence.
- The retry exhaustion error must contain only the stable host failure category and counters. It must not embed provider output, commands, prompts, or credentials.
- Diagnostic baseline bypass is safe only because recording and release consumption reject diagnostic mode. Clean inputs, trusted host configuration, package integrity, and input-drift checks remain mandatory.

## Verification strategy

Run checks in this order after each owning step, then run the full regression boundary before review:

1. Focused shared-host tests:
   - `node --test tooling/codex-evaluation-host/execution-evidence.test-unit.mjs tooling/codex-evaluation-host/operational-retry.test-unit.mjs`
2. Qualification unit tests:
   - `npm run qualification:test:unit`
3. Qualification integration tests:
   - `npm run qualification:test:integration`
4. Complete qualification suite:
   - `npm run qualification:test`
5. Existing root semantic and shared-tool regressions, proving the accepted semantic behavior was not changed:
   - `npm test`
   - `npm run eval:semantic:verify`
6. Static quality checks:
   - `npm run qualification:typecheck`
   - `npm run qualification:lint`
   - `npm run qualification:format:check`
7. Model-free evaluator runs for both profiles, with zero model calls:
   - `npm run qualification -- run --adapter custom --implementation custom --dry-run --json`
   - `npm run qualification -- run --adapter vercel-ai-sdk --implementation typescript-generate-stream-text-7 --dry-run --json`
   - Confirm both outputs distinguish deterministic preflight success from unevaluated semantic requirements.
8. Evidence and release-owned validation:
   - `npm run qualification:verify`
   - `npm run release:identity:check`
9. Website checks:
   - `npm --prefix website run test`
   - `npm run website:check`
   - `npm run website:build`
   - Inspect current and historical qualification pages for requirement ownership, safe-event labeling, accessibility, responsive behavior down to 320 px, and both themes.
10. Production-build exclusion and artifact audit:
    - Confirm qualification TypeScript/build inputs still exclude all `*.test-unit.*`, `*.test-integration.*`, `*.test-e2e.*`, and `*.test-bench.*` files.
    - Search generated dry-run/checkpoint/cache artifacts for raw Codex keys such as `aggregated_output`, `command`, agent-message text, recognizable credentials, and host-absolute paths; the only allowed command-policy data is the bounded projection.

Do not run the real `diagnose` command or a paid full qualification as verification for the implementation change. After review, commit, and push, request separate authorization for the exact paid diagnostic case and its two planned / four hard-maximum model calls. The first recommended paid diagnostics are the Custom authority-boundary case, the material-ambiguity case, and the Vercel static-boundary case; their outcomes remain diagnostic and cannot replace the subsequent official profiles.

## Risks and mitigations

- **False command-policy failures:** Conservative classification can mark legitimate opaque commands indeterminate. Mitigate with table-driven tests for every exact command form used by qualification fixtures, keep authority checks scenario-specific, and add a new safe form only with evidence that it cannot conceal network or credential access.
- **Accidental semantic invalidation:** Shared host edits could influence both evaluators. Keep new projection additive, retain retry default behavior, run the complete root regression and semantic evidence verifier, and do not edit semantic protocol modules or fixtures.
- **Historical evidence breakage:** Current requirements differ from historical judge ownership. Branch every ownership assertion on evidence protocol and test committed protocol-3 fixtures through both qualification and website loaders.
- **Dry-run status ambiguity:** A successful deterministic preflight could be mistaken for qualification. Use explicit `preflightPassed` and `not-evaluated` terms in JSON, human output, docs, and website types; never emit an official pass or latest pointer.
- **Diagnostic leakage into release evidence:** Enforce mode rejection in the parser-facing record path, recorder, result schema, evidence verifier, and release gate rather than relying on one CLI check.
- **Call-limit off-by-one errors on resume:** Define the limit as one retry after the initial call, test fresh and resumed failure counts at every boundary, and derive displayed hard maxima from the same constant used by execution.
- **Scope growth from scenario rewriting:** Change requirement ownership and evidence sources only. Preserve fixture behavior and wording unless a mixed requirement is demonstrably impossible to assess truthfully; report any necessary semantic split before implementing it if it changes the intended case contract.

## Documentation and coding-instruction state

The root project blueprint, qualification guide, adapter qualification document, public evidence tree, cost estimates, recovery instructions, dry-run description, and website labels are state-bearing and must be updated in the same change. No canonical application exception contract is introduced, so no error-registry or `@throws` documentation migration is expected beyond JSDoc synchronization for the new retry exhaustion behavior.

Protected coding-instruction files must remain untouched. The supplied instructions already cover evaluator evidence, retries, checkpoints, external integrations, tests, documentation synchronization, and sensitive data; no durable instruction handoff is currently expected.

## Approval required

Approve implementation of the complete qualification-evaluator hardening scope above: safe projected Codex evidence, explicit runner/judge requirement ownership across all 18 scenarios, truthful dry runs, one qualification retry per model stage with exact cost ceilings, a checkpointed non-recording single-case diagnostic, strict duplicate/evidence-source preflight validation, synchronized evidence/release/website readers, focused regressions, and durable documentation. Approval will authorize code and test changes only; it will not authorize a paid diagnostic, a full qualification, result publication, compatibility promotion, commit, or push.
