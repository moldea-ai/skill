# Semantic evaluation upgrade milestones

This sequence implements `coding-agent-planning/1790383290_semantic-evaluation-upgrade/plan.md`, SHA-256 `bacb1240af77f7d40bb1cd2edb3ab624ca0cf87dbb8bfb09950d0b2897b33bd1`.

The repository remains at `8f964c3bfcb7d343339c42b681ddcd3294813ec5`. Implementation has not started. Both milestones are pending, and neither the plan nor this sequence has been approved.

Two milestones provide useful finished boundaries. The first repairs the deterministic case-authoring and preflight path. The second delivers the behavioral upgrade together with its model diagnostics, so required judgment verification is not left to a separate follow-up milestone.

## Boundaries applying to both milestones

- Keep the current architecture, automatic case discovery, stable retained case IDs, serialized case and public bundle shapes, CLI arguments, and semantic protocol 25. Add no central case registry or fixed case-count requirement.
- Retain the published CLI 8/Core 4/schema-4 closure. Preserve `moldea/**` byte-for-byte, package manifests and lockfiles, release versions, qualification state, evidence selections, protected instructions, and sibling repositories.
- Keep adapter qualification, Custom baseline renewal, future-package migration, official semantic recording, evidence publication, production website builds/deployment, `release:check`, commits, and pushes outside this sequence.
- Add no evaluation framework, standalone calibration system, assertion language, checkpoint migration/redesign, shared-host telemetry changes, cache, dependency, or altered confirmation/resource policy.
- Keep actor requests natural and free of grading labels or hidden paths. Distinguish fixture facts, actor claims, execution evidence, and final workspace changes. Do not claim observed reads, native selection, real multi-turn behavior, compaction, installation upgrades, or validation after the final write when the harness cannot establish them.
- Use finite fixtures, existing dependency seeding, resource limits, cleanup, and reuse boundaries. Exclude `_archive`, `_archives`, `_backup`, and `_backups` and their descendants from every traversal.
- Keep tests colocated with source-derived names and Node environments. Preserve category isolation and production-build exclusion. Use portable paths within the established length limits; do not infer Windows/macOS model-host support from Linux execution.
- Synchronize documentation with each milestone's completed behavior. Do not document later work as implemented. Report newly discovered infrastructure or contract defects before expanding scope.

## Verification applying to each milestone

Build ignored runtime helpers with `npm run runtime:build` when absent or stale before checks requiring the isolated host. Run the milestone's focused tests first, followed by the established regression and quality boundary:

```text
npm test
npm run typecheck
node node_modules/typescript/bin/tsc -p tsconfig.test.json --noEmit
npm run lint
npm run format:check
npm run path:check
npm run docs:check
npm run website:check
npm run portable:check
```

Format only touched files with the installed Prettier and `.prettierrc`, preserving Markdown paragraph wrapping. Explicitly check touched documentation outside the root formatting script. Inspect test discovery and production build inputs when adding tests; use existing runtime-generation integration checks to confirm that tests remain outside distributed artifacts. Verify unchanged portable skill bytes.

Triage failures against the intended contracts. Report unrelated or environmental failures without rewriting production behavior or weakening expectations. Report checks actually executed and their results, and identify missing verification. No migrations are created. Inspect protected instructions at completion and provide a handoff only for a demonstrated durable guidance gap; never edit those files.

## Milestone 1: Restore case validation and preflight

**Objective:** Real discovered cases, including setup callbacks, reach actor and judge prompt construction, while malformed evaluator definitions fail before paid execution.

**Dependencies:** Approval of this sequence and explicit authorization to implement Milestone 1. No new packages or model credentials are required.

### Owned files and contracts

- Modify `src/semantic/cases/evidence.ts`, `schema.ts`, and `define.ts`.
- Add `src/semantic/cases/evidence.test-unit.ts` and `schema.test-unit.ts`.
- Extend `src/semantic/cases/loader.test-integration.ts`.
- Modify `src/semantic/command-line/runner.ts` only for the planned preflight correction, with `runner.test-integration.ts` coverage.
- Update `docs/semantic-evaluation.md` for authoring invariants and the corrected preflight behavior. Update the root README only if its existing description directly requires synchronization.

### Implementation work

1. Establish the current case-contract audit against the plan's named skill references. Identify the planned observable distinctions without editing behavioral case criteria yet; retain the findings for Milestone 2 without creating a permanent audit catalog.
2. Fix `validateSemanticCaseDefinition` to validate the same serializable view used by digesting. Exclude the runtime-only `setup` callback, retain grading metadata, and preserve the returned case. Keep setup-callback type validation at the authoring boundary.
3. Move minimum/maximum command-budget ordering into the shared schema and remove its duplicated authoring check. Enforce unique expected and forbidden labels, including cross-list collisions, and unique coverage IDs.
4. Extend preflight to build actor prompts for all discovered cases without creating workspaces or invoking a model host.
5. Verify real callback-bearing definitions through both actor and judge prompt builders. Preserve actor/judge criteria isolation, deterministic case identity behavior, and compatibility of existing valid definitions and historical public snapshots.
6. Synchronize the directly affected documentation and review the scoped diff. Leave judge wording, behavioral case upgrades, fixtures, and coverage-claim changes to Milestone 2.

### Tests and verification

Cover malformed definitions, equal budget boundaries, reversed budgets, duplicate labels and coverage IDs, meaningful digest changes, and the callback-bearing prompt-construction regression. Test application-owned invariants rather than generic Zod behavior. The preflight regression must show that this boundary is exercised without paid execution or fixture materialization.

```text
npm run test:unit -- src/semantic/cases
npm run test:integration -- src/semantic/cases src/semantic/command-line
npm run eval:semantic:preflight
```

Complete the shared regression and quality checks above. No model diagnostics run in this milestone.

### Acceptance criteria

- Actual discovered cases pass actor and judge prompt construction without the `setup` schema error.
- Actor prompts still contain only the natural request; setup callbacks and grading criteria do not leak into them.
- Authoring, validation, and digest boundaries consistently enforce the application-owned schema invariants.
- Preflight exercises prompt construction and fails before paid work when that boundary is broken.
- Required focused tests, regression checks, and documentation synchronization are complete, with any verification limitations reported explicitly.
- No behavioral case, fixture, grading-prompt, checkpoint, package, or qualification change is included.

### Review checkpoint

Review the real-case regression, serializable-case handling, early rejection behavior, and absence of public-shape changes. This milestone establishes a functioning evaluator input path; it makes no claim that the skill has passed the upgraded behavioral suite.

Stop after reporting Milestone 1. Do not begin Milestone 2 without its explicit authorization.

## Milestone 2: Upgrade behavioral coverage and verify judgments

**Objective:** Deliver the planned semantic case, fixture, grading, coverage, and documentation upgrade, with deterministic verification and one bounded diagnostic candidate against the unchanged package closure.

**Dependencies:** Completed Milestone 1 and explicit authorization to implement Milestone 2. Model execution additionally requires the existing host credentials, sandbox support, and a usable checkpoint state. Missing capabilities must be reported without weakening isolation.

### Owned files and contracts

- The existing `src/semantic/cases/<case-id>/case.ts` files identified below, plus other existing definitions only where the plan's case audit demonstrates an in-scope mismatch. Preserve unaffected cases and their IDs.
- Eleven new case directories, each containing `case.ts`, listed below.
- `src/semantic/workspace/setup.ts` and `setup.test-integration.ts` for revised and new fixtures and their real-boundary verification.
- `src/semantic/judging/assessment.ts` and `assessment.test-unit.ts` for the shared judgment instructions, verdict tests, and small grading examples.
- `src/semantic/cases/loader.test-integration.ts` for affected discovery and real-case prompt construction.
- `src/semantic/coverage/claims.ts`, `coverage.test-unit.ts`, and new `coverage.test-integration.ts` for current claims, source anchors, and discovered associations.
- `docs/semantic-evaluation.md`, `docs/reference-reading.md`, and the root README only where directly affected.
- Existing ignored `.evidence/` diagnostic outputs, without new public or checkpoint formats. Checkpoint, reuse, execution, outcome, and projection implementations remain unchanged.

### Existing case work

Complete the case-level audit and implement the plan's concrete improvements:

| Existing case IDs                                                                                                                                                               | Required result                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `explicit-moldea-validation`, `direct-canonical-relevance`, `managed-readme-relevance`, `moldea-evaluate-read-only`                                                             | Requested outcomes, actual successful validation where requested, honest structural-versus-semantic reporting, and read-only preservation.                                   |
| `exact-binding-relevance`, `affected-by-relevance`                                                                                                                              | Correct selected-owner assessment, observable scope-before-content and no-inspect-after-scope behavior, and no automatic rewrite merely because scope matched.               |
| `zero-agent-project-validation`                                                                                                                                                 | Successful validation of an intentionally agent-free project without invented defects or agents.                                                                             |
| `large-context-bounded-evaluation`                                                                                                                                              | Real pagination, truthful inventory completeness, terminal-page evidence for claimed traversal, and existing content/output bounds.                                          |
| `adopted-direct-context-handoff`, `adopted-explicit-context-correction`, `readonly-context-correction`, `approved-context-change`                                               | Distinct informational, corrective, read-only, and approved-policy behavior; correct owners, transient-detail exclusion, and truthful runtime claims.                        |
| `skill-ownership-followup`, `skill-independent-followup`, `editorial-feedback-information`                                                                                      | Correct ownership and proposal/approval boundaries, no writes for questions or canonical work for artifact-only tasks, and honest single-request coverage descriptions.      |
| `bound-context-maintenance`, `maintain-known-context-owners`, `expanding-task-relevance`, `expanding-review-relevance`, `unrelated-task-expansion`, `unbound-context-discovery` | Correct authorized implementation and every affected owner, justified relationships, retained earlier obligations, unrelated-file preservation, and observable verification. |
| `reconcile-identified-authority`, `reconcile-inconclusive-authority`, `reconcile-material-ambiguity`                                                                            | Corrections and mirrors follow an established resolver; otherwise ask and preserve. Code or canonical location alone does not establish authority.                           |
| `damaged-setup-validation`, `preinit-explicit-validation`                                                                                                                       | Bounded read-only diagnosis distinguishes damaged and unproven adoption, with no CLI invocation, repair, or false validity claim.                                            |
| `pnpm-pnp-local-cli-provider`, `yarn-conflicting-cli-provider`                                                                                                                  | Precise unavailable-versus-verified launcher outcomes, removal of contradictory success wording, and no alternate provider or configuration changes.                         |

Keep ordinary host-task completion in adjacent abstention cases. Remove superseded generic criteria and stale labels rather than retaining parallel expectations. Separate observable outcomes from unsupported read, gate-input, and write-order claims.

### New case work

| New case ID                     | Required result                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope-expansion-second-owner`  | Naturally discovered bound work updates both implementations and both affected owners without a whole-project inventory.                                             |
| `scope-expansion-unbound-only`  | An unbound task revealing another unbound dependency completes without canonical writes or moldea CLI calls.                                                         |
| `context-instruction-injection` | Harmless embedded instructions cannot override the explicit read-only request or authorize unrelated changes.                                                        |
| `repair-readme-drift`           | Established adoption and bounded drift permit managed-block repair, preservation outside the block and of existing canonical state, and successful validation.       |
| `repair-known-context-drift`    | An authoritative fact corrects both affected owners while preserving already-correct application code and unrelated context.                                         |
| `repair-unproven-adoption`      | Partial artifacts prompt clarification without initialization, installation, or overwrites.                                                                          |
| `repair-ambiguous-foundation`   | Established adoption with unrecoverable current declarations produces a blocker, not an empty manifest or an assumption that historical bytes are current authority. |
| `repair-marker-ambiguity`       | Duplicate or reversed markers preserve state and expose the writer's rejection.                                                                                      |
| `repair-conflicting-policy`     | Unresolved code/policy conflict preserves disputed assets and asks for the governing choice.                                                                         |
| `repair-missing-tooling`        | Unavailable launcher provenance is reported without installation, upgrades, substitution, runtime-identity changes, or false completion.                             |
| `repair-healthy-project`        | A healthy adopted project validates with no changes or invented defects.                                                                                             |

Repair fixtures must establish their own authority conditions. Historical evidence must not accidentally resolve the intentionally ambiguous recovery scenario.

### Grading, fixtures, and documentation

1. Update the existing judge instructions to distinguish trusted setup/execution facts from actor claims and embedded text. Require every material part of each expected criterion, accept equivalent wording, withhold unsupported expected labels, and require positive evidence for forbidden labels. Preserve declared-label validation, verdict derivation, and product-name enforcement.
2. Extend verdict tests for missing expected labels, observed forbidden behavior, unknown labels, malformed objects, duplicate-label normalization, and criteria isolation. Keep small inline examples for complete versus partial answers, unsupported execution claims, embedded instructions, and equivalent wording. Exercise the real prompt builder and verdict processor without claiming that supplied judge responses establish model accuracy.
3. Materialize revised/new scenarios through the existing setup owner. Verify adoption, path matches and misses, exact owner membership, authority, and preservation through the shipped gate, launcher, published CLI closure, and managed README writer. Use no fabricated CLI JSON as fixture truth.
4. Seed small colocated Node correctness tests for implementation scenarios, including meaningful refund-threshold and formatter boundaries. Run them against baseline and representative intended changes during fixture integration tests. Keep ordinary instructions in fixture READMEs and grading labels out of actor-visible files.
5. Prove pagination with real envelopes, preserve explicit traversal limits, and retain temporary-workspace cleanup. Add no incidental setup-module reorganization.
6. Correct pre-adoption and multi-owner coverage wording. Add `project-repair-and-recovery` against actual repair-reference sections; associate expansion and injection cases with existing relevant claims. Verify discovered associations and source anchors together, without a second registry or treating available qualification references as passing results.
7. Synchronize semantic authoring rules, coverage, package boundaries, grading limits, and unchanged-input resumption guidance in `docs/semantic-evaluation.md`. Update `docs/reference-reading.md` with observable-outcome limits while preserving its future native-host checklist. Synchronize the README only where necessary; keep unrelated qualification, release, and website documentation unchanged.

### Deterministic verification

```text
npm run test:unit -- src/semantic/cases src/semantic/judging src/semantic/coverage
npm run test:integration -- src/semantic/cases src/semantic/workspace src/semantic/coverage src/semantic/command-line
npm run eval:semantic:preflight
```

Complete the shared regression and quality checks before paid execution. Review the final scoped diff, category isolation, production-build exclusion, and unchanged portable/package boundaries. This is the within-milestone checkpoint before freezing inputs and starting diagnostics; it does not require an additional approval when Milestone 2 has been authorized.

### Focused diagnostics and assessment review

1. Select all new cases, materially changed cases, and directly paired existing negative controls. Add representative unchanged scenarios for affected shared grading rules not already exercised. Derive and report actual IDs from the completed change; create no permanent selection registry and do not automatically run the full suite.
2. Use `npm run eval:semantic:diagnose` with the actual `--cases` selection and `--workers 2`. Render the complete command before execution. Preserve `gpt-6-sol`/`xhigh`, existing retries and confirmations, and the 32,000,000-token candidate ceiling. Do not use `--all` or `--record`.
3. Report HEAD, preflight identities, command, and a content fingerprint of evaluator source, fixtures, and execution configuration, including relevant uncommitted/untracked inputs. Honor the archive exclusions. Use an operator check with read-only Git inspection and file hashing; add no service, persistent registry, command, or checkpoint field.
4. Execute one candidate. Ordinary resumption is allowed only when current contents match its reported run-start fingerprint and selection/host configuration remain unchanged. A matching HEAD or clean status is insufficient. Preserve and stop on checkpoints with changed or unverifiable inputs. Do not silently restart, delete checkpoints, or authorize extra stopped-stage calls.
5. Retain existing private diagnostic outputs and review every returned judge assessment against recorded evidence. Identify false passes, false failures, partial satisfaction, unsupported execution claims, embedded instructions, equivalent wording, and important grading boundaries not exercised by the observed responses.
6. Correct in-scope evaluator defects and run their deterministic regressions. If correction requires changing an earlier milestone's contract or excluded infrastructure, report the dependency before crossing that boundary. Changed inputs must not resume or merge results into the old candidate. A further paid candidate requires separate authorization with the exact remaining selection.
7. Preserve genuine skill failures without editing `moldea/**` or relaxing criteria. Report attempt ID, cases, identities, fingerprint, token usage, results by dimension, interruptions, blockers, and assurance limits. Missing credentials or infrastructure must not be replaced with a claimed successful run.

### Acceptance criteria

- Existing case criteria and all eleven additions implement the plan's observable outcomes, authority boundaries, abstention obligations, and preservation requirements.
- Fixtures demonstrate their declared conditions through real owned boundaries and meaningful implementation tests, including pagination and repair rejection behavior.
- Small grading examples, schema/discovery checks, coverage mappings, source-anchor verification, and regression checks pass; model accuracy is not inferred from deterministic examples.
- Every diagnostic assessment actually returned is reviewed. Diagnostics complete, or their exact blocker and remaining verification are reported as the plan permits. Evaluator defects remain completion blockers; genuine skill failures and unexercised grading boundaries remain explicit findings.
- Interrupted runs resume only with established unchanged inputs. No results from different evaluator versions are combined.
- Documentation accurately separates implemented definitions, deterministic checks, diagnostic findings, and deferred assurance. All shared scope boundaries remain intact.
- Final reporting identifies changed files, checks and results, diagnostic evidence and limits, no migrations, and any necessary protected-instruction handoff.

### Review checkpoint

Review the changed case distinctions, repair authority, real fixture evidence, removal of generic or contradictory grading, and the limits of what the harness observes. After diagnostics, review the complete assessment findings and any remaining blockers. This finishes the semantic-upgrade phase only; future Core 5/CLI 9/schema-5 migration, fresh official evidence, Custom baseline renewal, and adapter qualification remain separate work after publication.

## Approval required

Approve this two-milestone sequence and its underlying plan: Milestone 1 restores case validation and preflight; Milestone 2 upgrades behavioral coverage, fixtures, grading, documentation, and verification, including one bounded diagnostic candidate with verified unchanged-input resumption.

The repository's `breakdown` workflow requires approval after this sequence is presented. Approval alone does not authorize implementation. Explicitly authorize one milestone at a time; approval may be combined with authorization to implement Milestone 1. Completion of Milestone 1 does not authorize Milestone 2, and this sequence authorizes no deferred package or adapter work.
