# Focused skill activation and compatibility hardening

## Objective and scope

Improve reliable context maintenance and explicit diagnostics without undoing the resource boundaries that make moldea practical for ordinary coding work.

The implementation is confined to this skill repository. It will preserve the two-byte gate, keep the entrypoint small, reconsider relevance when independently discovered task scope changes, improve grounded relationship authoring and maintenance follow-through, diagnose explicit requests against damaged foundations, align installed CLI/Core verification with its documented guarantees, correct frontmatter metadata types, permit one identified reconciliation authority, and prepare skill version `5.0.11`.

No semantic evaluations or qualification trials will run for this version, including diagnostic, single-case, or recorded runs. Definition authoring, deterministic correctness tests, and metadata-only preflight remain in scope.

Release-evidence selection and candidate-to-evidence matching, including all of feedback point 1, are excluded. This plan prepares the versioned source; it does not certify production readiness or authorize tagging, publication, or deployment.

Other exclusions:

- No semantic activation through README links, inferred architecture relationships, repository names, or general documentation work.
- No repository-wide relationship discovery, automatic backfill, default catch-all bindings, new adoption status storage, persistent relevance cache, or tracking files.
- No target-project lockfile parsers, dependency upgrades, package-manager fallback, new dependencies, or weakened containment and host execution controls.
- No platform-repository changes or updates to installed skill copies. The reported platform session supplies a regression example only.
- No evaluator framework redesign, evidence protocol changes, semantic evaluation or qualification execution, native-host smoke execution, tag, publication, deployment, or installation-default change.
- No edits to protected coding-instruction files or unrelated legacy test migrations.

## Evidence and current behavior

The inspected baseline remains commit `e1ff132ea53b3c15f513fa1ad6a5e886f2ae940c` on `development`. The worktree was clean before this planning directory was created; only the planning directory is untracked. No implementation has begun. This revision incorporates the challenge findings and the explicit decision to omit semantic evaluation and qualification execution. The previous challenge is stale for this revised content. No `milestones.md` exists to invalidate.

The root README identifies `moldea/` as the complete distributed artifact, `src/portable/` as the maintained executable source, `src/semantic/` as the semantic evaluation boundary, and `src/release/` as release identity and maintenance tooling. Existing TypeScript, Zod, generation, and co-located Vitest conventions remain authoritative.

Relevant installed tooling includes semver 7.8.5, Zod 4.3.6, esbuild 0.28.2, Vitest 4.1.11, TypeScript 6.0.3, and Prettier 3.9.6. Development uses Node 24; distributed scripts retain Node >=22.11.0 support. Current compatibility remains stable CLI `^8.0.0`, Core `^4.0.1`, repository format 1, and JSON schema 4.

The source and history establish these findings:

- Commit `5918bf1b54edf9a3d67d993ba2aeba67c5de66eb` introduced the two-byte relevance gate after the resource-bounded redesign in `6f0deca7c1577320f7aafbb8f1171f0591caea3c`. Later changes retained declared relationships as the ordinary-work activation boundary. The new behavior must preserve that boundary.
- `moldea/SKILL.md` currently makes a miss final for the task, including after later discoveries. It also silently abstains on explicit read-only checks when adoption fails.
- `src/portable/relevance-gate.ts` requires the canonical foundation and exact managed README region. It deliberately collapses failures into `0\n`; that result does not distinguish an unrelated repository from drift or an operational failure.
- The entrypoint is currently 8,492 UTF-8 bytes. `docs/reference-reading.md` already describes an 8,192-byte ceiling, so the implementation must reduce the entrypoint and enforce that existing constraint.
- In the inspected “Document cleanup interval scaling” session, the agent loaded skill 5.0.9 but omitted the gate/scope procedure and initially missed the architecture-context update. The historical manifest contained only `version: 1`; its task paths did not match a relationship. The omission preceded compaction. This demonstrates both adherence and relationship-coverage problems, not a proven description-only defect.
- `src/portable/repository-package.ts` checks installed packages without reading a lockfile and requires the CLI's Core dependency declaration to equal `^4.0.0`. The public lockfile wording overstates the launcher's verification.
- Frontmatter stores `cliJsonSchemaVersion` as a number, and `src/release/identity.ts` requires that representation. The [Agent Skills specification](https://agentskills.io/specification) requires metadata values to be strings.
- `moldea/references/evaluate-and-reconcile.md` recognizes independent resolving authority but prohibits reading project context or another canonical owner after a conflict, even when a specific governing source is identified.
- Existing semantic evaluation is isolated. Installation byte checks and qualification do not establish native-host discovery or reliable multi-turn maintenance.
- Current-version references are in root package/lock metadata, the skill frontmatter, root README, compatibility/getting-started documentation, and the local-tooling reference. Recent skill fixes use patch releases; `5.0.11` is the next patch after the inspected `5.0.10`. CLI and Core versions need not change.
- Tagged conformance CI prepares selected evidence and runs the complete release check. Both current selections are null. Version preparation does not resolve that existing publication limitation, which remains outside this plan.

Read-only baseline checks completed successfully:

- `npm run portable:check`: committed portable artifacts are current.
- `npm run release:identity:check`: current skill and CLI identity are synchronized.

These checks ran during the original planning inspection. Their source inputs are unchanged, so they were not repeated for this revision. No semantic evaluations, qualification trials, or native-host smoke journeys were run.

## Final behavior and ownership

### 1. Compact entrypoint and relevance reconsideration

Modify `moldea/SKILL.md` and `moldea/agents/openai.yaml`.

Keep the description concise and make project-context maintenance visible alongside AI-agent work. Preserve explicit initialization, direct agent intent, independent Agent Skill work, and silent relationship-gated ordinary work. Preserve `allow_implicit_invocation: true`; description wording is a selection aid, not evidence that a host will activate correctly.

Keep the instructions required before a miss inside the entrypoint. Put conditional procedures in existing references. Remove duplication rather than adding a new always-read reference.

Replace the task-lifetime miss with this rule:

1. Retain the complete host-known, normalized, deduplicated task-path set. Include explicitly targeted unchanged paths and host-established changes, with both rename endpoints. Initially evaluate all known ordinary task paths.
2. Reuse completed routing decisions while the adoption/relationship evidence and covered paths remain valid. Reordering paths, duplicating them, or editing ordinary source without changing routing declarations does not require another gate call. Refresh affected semantic evidence separately.
3. When the host independently adds task paths, collect only paths not yet covered by a reusable decision. Batch them at the next existing scope-selection checkpoint, before writing the newly selected scope or completing a read-only assessment. Do not check after every file read or tool call, and do not call the gate for an empty batch.
4. Run the gate over that new batch only. On `1`, send exactly that batch to one bounded `scope` operation and retain its valid owner matches alongside prior still-valid coverage. Do not include previously covered paths merely to repeat an earlier hit. On `0`, add no moldea work for the new batch and preserve all existing maintenance obligations.
5. If the host independently observes changed adoption or relationship declarations, or prior routing coverage is no longer available or valid, reevaluate the complete current ordinary task-path set. A topic change or new explicit operation selects the appropriate route and authorization afresh. Do not add polling, hashing, or filesystem reads solely to monitor freshness. If the full-set check cannot reestablish relevance, stop further canonical work; preserve any prior changes and report outstanding verification for the already-active task without additional discovery.
6. Reuse existing owner identities when their routing evidence remains valid, and read only newly needed or invalidated content. Never combine snapshot cursors or treat old content/digests as fresh after changes. An incomplete or failed `scope` does not establish new owner coverage. Never retry an unchanged failure.

For example, after `/src/refund.js` has matched and been scoped, adding an unrelated test path evaluates only the test path. Its miss causes no additional `scope` call and does not cancel the refund-context work. If a new implementation path matches another declared owner, that new batch gets one scope query. If the manifest's relationships change, prior coverage must be reconsidered instead.

No moldea-only Git discovery, canonical-link traversal, manifest inspection by the model, or semantic inference may manufacture relevance. If no task paths are available, continue ordinary host work without moldea discovery.

The gate executable and its `0\n`/`1\n` protocol remain unchanged. Strict implicit adoption still requires the managed README contract. No structured status protocol, alternate activation mechanism, or persistent decision store is introduced.

For an entirely unrelated task, a miss means no workflow-reference load, CLI invocation, canonical read/write, or moldea commentary. During an already-active task, a new-batch miss adds no work or commentary for that batch and leaves earlier authorized work active. The gate itself may perform its existing bounded internal file reads; those contents are not exposed to the model.

Rechecks consume tool calls and model overhead even though stdout is two bytes. Batching and checking only uncovered paths avoid repeated positive scope queries; they do not establish a fixed token cost. Keep the existing four-call CLI efficiency target, 65,536-byte pages, and 262,144-byte aggregate CLI-output budget. Initial discovery, new batches, invalidation, recovery, and final validation share the original task budget and host limits.

### 2. Grounded relationships and maintenance follow-through

Modify `moldea/references/continuous-maintenance.md`, `moldea/references/context-gathering.md`, and the entrypoint's concise completion/handoff instructions.

During already-authorized initialization, context creation, or relevant maintenance:

- When inspected evidence establishes that a specific implementation path materially governs a canonical fact, record or correct its narrow `affectedBy` relationship in the same authorized change.
- Prefer exact paths or established subsystem boundaries. Do not add broad globs to compensate for uncertainty or make a project appear complete.
- Keep zero agents and zero relationships valid when the evidence establishes none.
- Do not scan other owners or infer missing relationships after a gate miss.

Once activated, carry the selected canonical owners and outstanding obligations into the host's plan and authorized implementation. A plan should identify the context work required by its proposed behavior without making premature canonical edits. Before completion, compare the final behavior against those owners, update contradictions within authorization, preserve accurate content, and validate after the final canonical write.

Retain only useful task state in the host's existing handoff: selected installation, operation, relevant owners, unresolved obligations, and reusable decision scope when available. Do not copy whole instructions or create tracking artifacts. Missing complete instructions after compaction must still be reloaded; a summary is not authorization or current repository evidence.

Remove contradictory wording that treats one `scope` result as complete for all future task expansions. It covers its evaluated batch and snapshot; still-valid coverage from earlier batches is retained without repeating those queries. Keep routing coverage separate from content freshness, and discard invalid cursors after writes. Host planning, approval, Git, review, and publication remain host-owned.

An existing project with no declared relationships can still miss implicit maintenance. This remains an accepted boundary, addressed through grounded authoring or explicit maintenance, not silent broad discovery.

### 3. Explicit setup diagnostics

Modify `moldea/references/project-repair.md` to own a shared read-only foundation-diagnosis section, and route explicit requests to that section from `moldea/SKILL.md`.

A direct request to validate, evaluate, or inspect the repository's moldea setup must receive a useful diagnosis if adoption cannot be established. Merely saying “use moldea” for an ordinary host task does not select this diagnostic route.

After a failed, missing, or unavailable adoption check:

- Inspect only the exact foundation paths needed to explain the obstacle: root README, `/moldea/moldea.yaml`, and `/moldea/project.md`.
- Use bounded inert reads with the existing containment and link restrictions. Read targeted excerpts, not full large documents. Keep combined model-visible foundation excerpts within one existing 65,536-byte page allowance.
- Distinguish missing artifacts, README conformance drift, malformed or inaccessible evidence, and an unavailable gate. If the cause cannot be established within these bounds, report that uncertainty.
- Do not infer “never initialized” from `0`. Reliable prior-initialization evidence can establish an existing damaged setup without satisfying current activation conformance.
- Report what prevented validation and what remains unverified. Do not run the CLI, install dependencies, normalize the README, or repair canonical content under read-only authority.

Explicit repair reuses the diagnosis and retains its existing prior-initialization and intended-state requirements before writing. Ordinary implicit activation remains strict and silent on the same damaged fixture. Keep the managed README asset and writer semantics unchanged.

### 4. Installed CLI/Core compatibility

Modify `src/portable/repository-package.ts`, its exports in `src/portable/index.ts`, and the generated resolver through `src/portable/generation.ts`.

Keep root CLI declarations limited to the existing supported exact or caret forms. Preserve stable CLI 8 eligibility, exact installed-version envelope agreement, the package-owned executable, repository containment, and supported Core minimum.

Remove `EXPECTED_CLI_CORE_RANGE` and its exact-string comparison. Pass the CLI's declared Core range into the existing Core-validation path and require:

- a nonempty valid semantic-version range;
- an installed stable Core version satisfying both that declaration and `SUPPORTED_CORE_RANGE`;
- the existing package identity, entrypoint, and containment checks.

Use the already-installed semver package for declaration satisfaction. Do not introduce a custom general range parser or add a dependency. Bundle the required implementation into the portable resolver. Extend existing generation/notice handling only as needed to retain the bundled dependency's license, and continue rejecting unresolved runtime package imports.

A CLI declaring `^4.0.1` with an eligible installed Core must work. A supported Core that does not satisfy the CLI's own declaration must fail. Prereleases, unsupported majors, malformed declarations, missing packages, and escaping paths must still fail.

The launcher will not read target-project lockfiles. Reproducible installation remains the responsibility of the package manager and repository setup/CI. Document explicitly that launcher success proves installed metadata compatibility and layout, not lockfile agreement or executable authenticity. A lock selecting CLI 8.0.0 while an otherwise compatible 8.0.1 is installed is intentionally outside launcher enforcement.

In `src/release/identity.ts`, remove only the obsolete generated constant comparison. Retain exact development-release lock and integrity validation. Where release identity and `src/release/updater.ts` currently parse the CLI's Core caret declaration as `^M.0.0`, reuse `parseCompatibleStableRange` so `^M.m.p` declarations work. Preserve the updater's existing caret-based release-maintenance contract and supported-Core minimum behavior; do not turn it into a general dependency-range migration system.

Remove superseded constant exports, updater substitutions, and test expectations. Do not redesign release preparation or evidence verification.

### 5. Metadata portability

Change `moldea/SKILL.md` to `cliJsonSchemaVersion: '4'`.

In `src/release/identity.ts`, require the skill metadata representation to be a positive-integer string and explicitly convert it for comparison with the internal numeric JSON schema version. Keep package JSON, CLI envelopes, evaluator identities, and internal numeric contracts numeric.

Update `src/release/updater.ts` so future CLI updates preserve quoted string frontmatter while updating numeric JSON fields through their existing paths. Reject malformed metadata rather than silently coercing it.

Add an independent artifact-conformance assertion that parses the distributed YAML and checks every metadata value is a string, without relying on `SkillMetadataSchema`. Check the entire entrypoint's UTF-8 byte length against 8,192 bytes. This ceiling is a maximum, not a target.

### 6. Identified reconciliation authority

Modify `moldea/references/evaluate-and-reconcile.md` and its summary in `moldea/references/context-gathering.md`.

After comparing the named implementation and canonical instruction, permit one bounded read of a specifically identified independent governing source when it can settle the exact conflict. The source must already be identified by the task or encountered evidence before the conflict stop; do not search for one afterward.

It may be an accepted decision record or an identified canonical owner. Its content must explicitly resolve the competing claims and have an established governing role. Location, recency, tests, mirror agreement, or repetition of one disputed claim does not confer authority.

Keep the ordinary one-canonical-body comparison. The identified resolver is a narrow exception allowing one additional bounded source read, within the existing shared output budget. Do not follow a chain of speculative resolvers, inventory the project, or expand into a general audit.

If the source is absent, inaccessible, inconclusive, or itself disputed, state the claims and ask the focused authority question before semantic writes or further moldea calls. If it resolves the conflict, perform only the authorized coherent correction and final verification.

### 7. Prepare skill version 5.0.11

Prepare the next patch version using the existing release-identity ownership, without changing dependency versions or adding release tooling:

- Set root `package.json` version to `5.0.11`.
- Update only the top-level version and `packages[""].version` in `package-lock.json`; preserve all dependency resolutions and integrity entries.
- Set `moldea/SKILL.md` metadata version to `'5.0.11'` while retaining string-valued metadata.
- Synchronize current-version text and pinned-install examples in `README.md`, `docs/getting-started.md`, and `docs/compatibility-and-local-tooling.md`.
- Update the authoritative release sentence in `moldea/references/local-tooling.md` to 5.0.11, preserving the format consumed by portable artifact identity.

Keep the exact development CLI at 8.0.0, supported CLI/Core ranges, JSON schema 4, repository format 1, workspace package versions, and historical evidence identities unchanged. Do not run `release:update-cli`, reinstall dependencies, or regenerate the lockfile dependency graph for a skill-only version bump. Do not create a tag or claim that the prepared version is already published.

Verify root and skill identity agreement with the existing identity check, and check the small known set of current-version references directly. This does not authorize a generalized version updater, broader release refactor, evidence selection, or edits to CI. Tagged CI and production website generation retain their existing evidence requirements; their success is not a deliverable of this version-preparation change.

## Ordered implementation work and review checkpoints

These are strategic steps, not independently authorized milestones.

1. **Update routing and compact the entrypoint.** Apply new-path batch routing with full-set invalidation only when needed, the explicit diagnostic route, maintenance handoff, and concise description/host metadata. Keep all miss-path requirements available without another reference. Review every route against unrelated work, direct agent intent, explicit setup checks, independent skill work, and uninitialized repositories.

2. **Synchronize workflow references.** Implement shared foundation diagnosis, grounded relationship authoring, task-scoped owner reuse, and the identified-authority exception in the existing five affected references. Review that no path permits read-only repair, inference-based activation, broad discovery, or budget resets.

3. **Align executable compatibility and metadata tooling.** Implement the installed Core checks and string frontmatter contract. Update release identity/updater consumers and remove obsolete constant handling. Regenerate portable artifacts using the existing generator, not hand edits. Review generated imports, notices, package containment, error propagation, and retained exact development-lock checks.

4. **Add meaningful deterministic regressions and semantic scenario definitions.** Include miss-to-hit expansion and hit-followed-by-unrelated-expansion controls. Keep tests with their owning implementation and use the current Vitest categories. Materialize fixtures through existing setup/discovery facilities without model execution. Preserve unrelated legacy placement; do not introduce another runner or evidence format.

5. **Prepare version 5.0.11 and synchronize documentation.** Update the exact identity fields and current-version references listed above, then align affected behavior and guarantee descriptions. Author the future native-host checklist without executing it. Do not imply that the new version has semantic or qualification results.

6. **Run deterministic verification and review the complete scoped diff.** Inspect generated changes and test/build exclusions, confirm entrypoint size and version synchronization, remove superseded contradictory instructions, and report actual checks. State that semantic evaluations, qualification trials, and native-host journeys were not run by design. Do not publish or begin those excluded runs.

## Files and verification coverage

### Deterministic coverage

Add these co-located integration tests:

- `src/portable/relevance-gate.test-integration.ts`: execute the generated gate against real temporary repositories. Cover adoption success, exact relationship hits, empty relationships, unrelated paths, README drift, malformed input, normalization, rename endpoints, unsafe paths, and bounded-file rejection. Assert exact two-byte stdout, silent stderr on fail-closed results, and no repository dependency execution. Fixtures must demonstrate an initial miss followed by a new matching batch, an initial hit followed by an unrelated new batch returning `0` while the combined set would return `1`, and changed relationship declarations invalidating earlier coverage. These establish gate behavior, not that an agent follows the batching instructions.
- `src/portable/repository-package.test-integration.ts`: exercise actual filesystem resolution with inert package fixtures. Cover compatible CLI patch/minor releases, Core declaration variations, installed-range disagreement, minimum/version failures, nested versus hoisted Core resolution, missing binaries, containment failures, and the intentionally unenforced target lock mismatch. Execute the generated launcher with a harmless fixture executable to prove accepted closure invocation and rejection before execution.
- `src/portable/artifact.test-integration.ts`: independently check string-valued frontmatter metadata and the 8,192-byte distributed entrypoint ceiling.
- `src/semantic/workspace/setup.test-integration.ts`: materialize the added scenarios through existing public setup boundaries. Verify their evidence actually exists and that bound/unbound batches, unrelated expansion after a hit, and damaged-foundation conditions produce the intended gate results. Keep model execution outside these tests.

Extend:

- `src/portable/generation.test-unit.ts` for the resolver's self-contained generation and required bundled notice.
- `src/release/identity.test-integration.ts` for quoted metadata, rejection of numeric/malformed skill values, retained numeric internal identity, and compatible nonzero Core caret minima.
- `src/release/updater.test-unit.ts` and `src/release/updater.test-integration.ts` for quoted metadata updates, removal of obsolete constant handling, and same-major Core declaration changes.

Reuse existing manifest-matching and managed-README coverage. Do not add tests that merely search instruction prose for phrases or duplicate semver/Zod library behavior. New tests must exercise the application contract or a concrete regression.

Existing Vitest category globs already discover these filenames. Keep tests excluded from production generation and included in test typechecking. No new test category, package script, or CI expansion is planned.

### Semantic case definitions only

Update `src/semantic/cases/preinit-explicit-validation/case.ts` to require bounded read-only diagnosis with zero CLI commands, instead of silence. Preserve ordinary pre-initialization and unrelated-work abstention controls, including `host-plan-command-precedence`; “use moldea” does not turn its generic host plan into a setup audit.

Add `case.ts` under each of these `src/semantic/cases/` directories, using existing coverage claims and setup in `src/semantic/workspace/setup.ts`:

| Case directory                      | Required outcome                                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bound-context-maintenance`         | An ordinary implementation change with an exact declared relationship updates contradicted architecture context and validates after writes without a reminder.                                                           |
| `expanding-task-relevance`          | An initially unrelated path reveals another necessary implementation path during normal work; the new path has a declared relationship and its owner is maintained. Do not disclose that path as initial task evidence.  |
| `unrelated-task-expansion`          | After a relevant batch has been scoped, a newly discovered unrelated path receives only a gate check. No repeated `scope` is triggered by the earlier matching path, and existing maintenance obligations are completed. |
| `unbound-context-discovery`         | The equivalent task with README-linked context but no relationship stays outside moldea.                                                                                                                                 |
| `damaged-setup-validation`          | Explicit validation explains README drift while preserving all repository state and avoiding CLI/install/repair operations.                                                                                              |
| `initialize-grounded-relationships` | Initialization records narrow relationships supported by real implementation facts, while existing minimal-initialization cases continue rejecting speculative bindings.                                                 |
| `reconcile-identified-authority`    | One identified governing decision resolves conflicting claims and permits the authorized correction.                                                                                                                     |
| `reconcile-inconclusive-authority`  | An identified but non-resolving source results in a focused question, without further searching or writes.                                                                                                               |

Retain `reconcile-material-ambiguity` as the no-resolver negative control. Reuse automatic case discovery in `src/semantic/cases/loader.ts`; no case registry or protocol bump is required.

Author and deterministically validate these definitions and fixtures, but do not execute their semantic evaluations for 5.0.11. Existing projected semantic evidence does not retain enough command detail to certify every gate call or reference-read sequence. A future separately scoped native-host trace review could verify those resource/adherence properties; it is not a prerequisite for completing this change. Do not claim behavioral results from fixture checks or expand the evidence protocol.

### Documentation

Synchronize these existing files with the final behavior:

- `README.md`: version 5.0.11, activation, explicit diagnosis, instruction reuse, and installed-versus-lockfile guarantees.
- `docs/getting-started.md`: synchronize the pinned skill-version example only; do not change the default installation policy.
- `docs/how-it-works.md`: routing, scope reconsideration, and launcher guarantees.
- `docs/continuous-maintenance.md`: grounded relationships and completion obligations.
- `docs/project-state.md`: distinguish current adoption conformance from evidence of prior initialization, without adding a persisted status.
- `docs/compatibility-and-local-tooling.md` and `moldea/references/local-tooling.md`: version 5.0.11, actual CLI/Core verification, and package-manager-owned reproducibility.
- `docs/evaluate-reconcile-validate.md`: explicit diagnostics and the bounded independent resolver.
- `docs/reference-reading.md`: enforced size ceiling, handoff/reuse, recheck triggers, and actual verification limits.
- `docs/coding-agent-compatibility.md`: distinguish format compatibility, installation checks, and observed native-host behavior; do not present unrun journeys as verified.
- `docs/semantic-evaluation.md`: added scenario definitions and their limitations, without representing them as executed or adding evaluation execution to this change.

Keep the native-host checklist in existing compatibility/reference-reading documentation. No new documentation hierarchy or website feature is needed. Preserve all unrelated release-evidence claims and machinery.

### Future native-host checklist, not executed for this version

Author a small reusable manual checklist for Codex and Claude Code as future observation targets:

1. Initialize from grounded project evidence.
2. Perform implicit relationship-bound maintenance through planning, authorized implementation, and context compaction without a reminder.
3. Expand an initially unrelated task into a declared relevant path, then exercise the control where an already-relevant task gains only an unrelated path and performs no additional scope query.
4. Perform unrelated work, including a README-linked but unbound-context control.
5. Explicitly validate damaged setup, then separately exercise authorized repair while preserving unknown content.
6. Upgrade a disposable installed skill copy and repeat a relevant and unrelated request.

The checklist should specify what a future run records: host and model versions/settings, exact skill identity, fixture identity, observed gate/reference/CLI sequence, outcome, and available byte/token measurements. Report unavailable measurements as unavailable. Compare unchanged-scope, newly relevant, and newly unrelated batch traces; two-byte stdout is not a measurement of total token cost.

Only authoring the checklist and scenario definitions belongs to this implementation. No native-host smoke journeys, semantic diagnostics/evaluations, or qualification trials will run for 5.0.11 under this plan. Report them as not run by design, not unfinished implementation requirements. Do not make verified-host or measured-token-savings claims.

## Verification commands and execution policy

Run narrow deterministic checks after the owning changes, then the existing broader boundary. Use the repository's scripts and installed binaries. Build isolated runtime helpers before tests that consume them with `npm run runtime:build`; this builds local code and does not start an evaluation.

Focused checks:

```bash
npm run test:unit -- src/portable/generation.test-unit.ts src/release/updater.test-unit.ts
npm run test:integration -- src/portable src/release src/semantic/workspace/setup.test-integration.ts src/semantic/cases/loader.test-integration.ts
```

After source changes requiring generated artifacts:

```bash
npm run portable:generate
npm run portable:check
npm run release:identity:check
```

Generation is authorized only during approved implementation. Review every generated diff; unchanged outputs should remain byte-identical.

Broader verification:

```bash
npm test
npm run qualification:test
npm run typecheck
node node_modules/typescript/bin/tsc -p tsconfig.test.json --noEmit
npm run lint
npm run format:check
npm run docs:check
npm run eval:semantic:preflight
npm run website:check
```

`qualification:test` runs synthetic unit/integration correctness tests for the qualification tooling, not qualification trials. `eval:semantic:preflight` loads definitions and computes identities/counts without starting an actor or judge. Both are permitted deterministic checks; neither is evidence of model behavior.

Use installed Prettier with the root configuration on the exact touched TypeScript, Markdown, YAML, and JSON source files, preserving Markdown prose wrapping. Check those same files afterward. Do not format unrelated files or generated bundles independently of their generator.

Confirm new tests are discovered only by their category and are absent from emitted/bundled runtime artifacts. Existing CI remains responsible for its Windows and supported Node checks; report actual platform execution and any unrun portability checks separately. Local Linux results do not prove Windows execution.

Root `npm test` includes website end-to-end checks; `website:check` supplies documentation/rendering and synthetic-evidence build checks without changing release selections. Do not run production website generation, evidence preparation/selection, or the full evidence-dependent `release:check` as part of this change. Existing tagged CI still requires prepared evidence and will remain unresolved with null selections; do not bypass or modify that requirement to make version preparation appear to complete publication.

If a suite fails, establish whether the failure is caused by this change, a stale expectation, or the environment before editing. Do not weaken unrelated assertions or change production behavior merely to clear a failure.

Do not run semantic single-case, diagnostic-batch, recorded, or qualification trial commands for this version. The exclusion covers paid or free model execution in isolated or native hosts, including smoke tests; the deterministic fixture and synthetic correctness tests listed above remain permitted. Future execution requires a separate task and does not belong in the acceptance checklist below.

## Acceptance criteria, risks, and rollback

Implementation is complete when:

- The entrypoint is at most 8,192 UTF-8 bytes and all metadata values are strings.
- Ordinary unrelated work retains the strict silent gate boundary, with no semantic bypass or extra discovery.
- Instructions reuse unchanged routing decisions, gate only uncovered new-path batches while evidence remains valid, and reserve full-set reevaluation for invalidated or unavailable coverage. A new-batch miss neither repeats prior scope work nor cancels existing obligations.
- Explicit setup checks can explain blocked adoption without mutating files or treating failure as proof of no prior adoption.
- Grounded relationship authoring and selected-owner completion obligations are explicit without requiring invented relationships.
- Eligible installed CLI/Core combinations pass semantic compatibility checks; existing containment, stable-version, and execution boundaries remain enforced.
- Documentation accurately limits lockfile and native-host claims.
- A specifically identified authority can resolve a conflict through one bounded read; absent or inconclusive authority still stops writes.
- Focused deterministic tests, generated-artifact checks, applicable broader checks, and documentation synchronization pass, or genuine external blockers are reported without a readiness claim.
- Skill version 5.0.11 is synchronized across the exact package, lock, skill, and current-documentation fields; dependency versions and evidence identities remain unchanged.
- Added semantic definitions and the future native-host checklist are complete, with semantic evaluations, qualification trials, and native-host journeys explicitly reported as not run by design. Their execution is not an implementation-completion requirement.

Residual risks are deliberate and visible: missing relationships still cause implicit misses; model adherence and host discovery remain probabilistic; changed scope adds some tool overhead; scope expansion may exhaust the existing shared budget. Neither instruction edits nor deterministic tests quantify token savings or certify native-host reliability.

No database migration, persisted-format migration, environment-variable change, deployment, or dependency update is required. The only planned lockfile edits are root version metadata. Rollback is restoration of the previous skill source, corresponding generated artifacts, and version/documentation metadata through the normal reviewed workflow. No user-project canonical data is migrated by this change. No publication or successful tagged-CI claim follows from local version preparation.

Before completion, inspect protected instruction guidance without editing it. Provide a separate handoff only if a durable gap is actually uncovered; otherwise state that the existing guidance remains sufficient.

## Approval required

Approve the focused implementation described above: compact routing with new-path batch checks; maintenance follow-through; bounded explicit diagnostics and reconciliation authority; installed CLI/Core compatibility and string metadata; preparation of skill version 5.0.11; generated artifacts, deterministic regressions, semantic scenario definitions, and directly affected documentation.

Approval authorizes that implementation and its deterministic repository verification only. No semantic evaluations, qualification trials, or native-host smoke journeys will run for this version. Release-evidence work, platform-repository edits, installed-copy updates, commits, tags, publication, and deployment remain excluded. Implementation has not begun.
