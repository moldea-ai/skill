# Skill package upgrade and evaluation readiness milestones

## Basis and execution rules

This sequence implements `coding-agent-planning/1790450711_package-upgrade-readiness/plan.md`, SHA-256 `3110530b9ffe517a8592c53f2a5fe8b79f4bbbe312d5a6aa3fbef90e78c97b7c`.

The inspected commits remain packages `5a76d3d6c058bfaa79790f5b0527b817fd65957f` and skill `fccd044ba62bff6be176bdfb3544c73c9ad72554`, both on `development`. Packages is clean; the skill repository has the untracked planning directory. No implementation milestone is complete, and the plan and this sequence still require approval.

The sequence has five milestones. The release-updater repair is independently useful. Website dependency consumption follows the UI publication and precedes the coupled CLI/evaluator migration so the final preparation checks use the settled dependency lockfile. The package/schema migration, semantic consumers, qualification contracts, profiles and examples remain together because they must agree at a completed checkpoint.

Rules for every milestone:

- Complete its production changes, required tests, directly affected documentation and review together. Fix in-scope findings and rerun affected checks before declaring it complete.
- Inspect the current worktree before editing. Preserve unrelated changes, other agents' work, historical evidence and protected instruction files. Exclude `_archive`, `_archives`, `_backup` and `_backups` throughout inspection and verification.
- Keep current public contracts and examples truthful at each checkpoint. Do not introduce temporary dual-schema consumers, unused scaffolding or SDK interpretation outside the packages.
- Use focused checks first, then the owning regression boundary. Reuse successful checks only while their relevant inputs remain unchanged. Format only touched files; verify test discovery and production exclusion when their configuration or filenames change.
- Preserve existing supported-Node, platform, installation and package-manager verification. Use the established portable Node matrix and release-candidate installation harness where applicable. Report unavailable platform execution explicitly.
- Preserve finite output, timeout, concurrency and storage limits. Adjust an insufficient timeout only from cold-build or installation evidence; do not add sleeps, blanket retries or conceal failures by raising resource limits.
- Model-backed evaluations, qualifications and diagnostics, provider calls, evidence publication/selection, skill tagging and skill production deployment remain excluded. No API key is required. The Website UI publication and the packages website's existing deployment workflow are in scope only in Milestone 1.
- Complete only the individually authorized milestone and stop at its review checkpoint. A material deviation from the plan requires a revised plan; completing one milestone does not authorize the next.

## Milestone 1: Publish the corrected Website UI prerequisite

### Objective

Publish and verify Website UI `1.10.2` with the exact Astro `7.2.8` peer contract, with the packages website aligned and all completed work retained in development.

### Dependencies

Approval of the plan and milestone sequence, explicit authorization for Milestone 1, registry access, the established GitHub release infrastructure and local browser prerequisites. Recheck that `1.10.2` is still available as the intended new patch identity; an intervening conflicting publication requires revising that identity before proceeding.

### Owned scope

In `../packages`:

- `projects/website-ui/package.json`.
- `projects/website-ui/src/index.test-integration.ts`.
- `projects/website-ui/README.md`.
- `apps/website/package.json` and `pnpm-lock.yaml`.
- The directly affected current handoff in `docs/launch-readiness.md`.
- The existing packed-consumer, release relevance, CI and trusted publication workflows, without unrelated workflow changes.

### Implementation work

1. Set Website UI to `1.10.2`; set its Astro peer and development dependency, isolated packed consumer, and the packages website to `7.2.8`.
2. Regenerate the lockfile through the existing package-manager workflow. Verify the Astro/Sharp closure and ordinary peer resolution without adding overrides.
3. Synchronize the exact installation/peer documentation and current launch handoff. Preserve historical verification records as historical.
4. Verify the real UI tarball in its isolated Astro consumer and the packages website. No UI API change or adapter republishing belongs here.
5. Complete review and the established signed Git/release workflow. Use the actual base and candidate commits for release relevance; require that only the intended UI package is newly selected for publication.
6. Publish through the established main-branch workflow and trusted npm mechanism. Verify the registry manifest, peer contract, tarball identity and availability before any skill dependency upgrade. Retain the released changes in development through the normal reviewed workflow.

### Verification

From packages:

```bash
pnpm --filter @moldea.ai/website-ui test
pnpm --filter @moldea.ai/website-ui typecheck
pnpm --filter @moldea.ai/website-ui lint
pnpm website:check
pnpm --filter @moldea.ai/packages-website test:e2e
pnpm docs:check
pnpm format:check
pnpm why astro
pnpm why sharp
```

Run the established `release:check-changes` script with the actual captured base and candidate commits and require its existing packed-artifact, CI and publication gates. After publication:

```bash
npm view @moldea.ai/website-ui@1.10.2 version peerDependencies dist.integrity --json
```

The affected website verification includes narrow and desktop layouts, both themes, keyboard/focus behavior and the existing shared interactions. Do not accept visual baseline changes without inspecting the screenshots.

### Acceptance criteria

- The published `1.10.2` manifest and tested tarball agree and use Astro `7.2.8` as planned.
- The isolated consumer and affected packages website checks pass without peer-suppression overrides.
- No unintended package release is selected; required release CI passes.
- Documentation is current, and development retains the reviewed release changes.
- A publication blocker is reported as a dependency blocker rather than claiming completion or installing an unpublished version.

### Review checkpoint

Review the narrow dependency/version diff, packed-consumer evidence, release selector, published artifact identity and development/main reconciliation. Stop before modifying the skill repository for Milestone 2.

## Milestone 2: Repair the source-driven CLI update workflow

### Objective

Make the existing release updater reliably change authoritative TypeScript identity, regenerate shipped helpers and recover from failure before using it for the package migration.

### Dependencies

Milestone 1 completed and explicit authorization for Milestone 2. The skill repository's existing development environment must be available.

### Owned scope

- `src/release/constants.ts`, `updater.ts`, `identity.ts`, `update-cli.ts`, affected types/exports/callers, and the existing updater/identity tests.
- `src/portable/repository-package.ts` as the authoritative identity source; the existing portable generator and its owned artifacts where the updater integration requires them.
- Existing release/update workflow documentation and affected error or `@throws` documentation when their contracts change.

The actual skill/CLI/Core/schema identity upgrade belongs to Milestone 4. This milestone completes the updater defect correction using the current release and disposable update-test inputs.

### Implementation work

1. Replace generated-helper text targets with maintained TypeScript constants and metadata in the updater's replacement lists.
2. Make `updateCliRelease` asynchronous, update its callers and await the existing portable generator before the final identity assertion.
3. Include all generator-owned outputs in captured state, conflict detection and failure recovery. Preserve unrelated edits; a failed update must not leave source and shipped helpers inconsistent.
4. Verify both authoring identity and the shipped resolver. Keep `portable:check` responsible for the complete generated artifact set, including helpers that bundle resolver constants.
5. Remove the superseded direct-edit path for generated identity text. Use one generator and one authoritative update flow.
6. Synchronize directly affected workflow/error documentation in this milestone.

### Verification

Extend integration coverage through update, generation, identity validation and execution of the shipped launcher. Cover successful regeneration, generation/assertion failure, conflict handling and restoration of task-owned outputs. Assert that regeneration cannot silently restore superseded ranges.

Use the existing targeted scripts first:

```bash
npm run test:unit -- src/release/updater.test-unit.ts
npm run test:integration -- src/release/updater.test-integration.ts src/release/identity.test-integration.ts
```

Then run the owning regression and artifact checks:

```bash
npm run portable:generate
npm run runtime:build
npm run portable:check
npm run release:identity:check
npm run path:check
npm test
npm run typecheck
npm run lint
npm run format:check
```

Exercise the changed generator/update path through the existing portable Node and installation/package-manager verification boundaries. Review generated diffs and every reachable changed error contract. Do not run the evidence-dependent `release:check` gate.

### Acceptance criteria

- The updater changes authoritative source and regenerates the distributed artifacts through the existing generator.
- Completion cannot be reported before generation and identity verification finish.
- Failure/conflict tests establish consistent recovery without overwriting unrelated work.
- Source identity, shipped identity and generated-artifact checks agree.
- Current release behavior and its owning regression suite remain valid; no new compatibility implementation is introduced.

### Review checkpoint

Review authoritative ownership, async callers, generated-file coverage, conflict/failure recovery, launcher integration and documentation. Stop before the website dependency upgrade.

## Milestone 3: Consume Website UI and verify website interactions

### Objective

Make the skill website consume the published UI patch through normal dependency resolution and verify the shared interaction fixes in its actual pages.

### Dependencies

Milestones 1 and 2 completed and explicit authorization for Milestone 3. Website UI `1.10.2` must be publicly installable with the verified artifact identity.

### Owned scope

- Root `package.json`, `website/package.json` and `package-lock.json` for Website UI/Astro consumption.
- Affected consumers under `website/src/components/qualification-profile-technical/`, `qualification-profile-page/`, `qualification-case-evidence/`, `semantic-evaluation-case/`, and landing/getting-started components.
- Their existing browser tests and directly affected fixtures.
- Current Website UI/Astro guidance in `README.md`, `website/README.md` and directly affected website documentation.

Schema-5 example migration and evaluator presentation contracts are owned by Milestone 4.

### Implementation work

1. Install exact Website UI `1.10.2` in both consumers, keep website Astro `7.2.8`, regenerate the lockfile and remove the root Astro override after normal resolution succeeds.
2. Reuse the package's public `/accordion`, `/dialog`, `/file-preview`, `/evaluation-replay`, `/evaluation-replay-model`, `/result-summary`, site and theme surfaces. Do not introduce local equivalents or deep imports.
3. Enable independent accordions through the existing optional `group` API by omitting a shared group where appropriate. Do not add a new component prop.
4. Correct only consumer props/composition that prevent the shared dialog, accordion, file-preview or navigation behavior from working.
5. Verify scrollbar preservation without layout shift, reset of dialog scroll on reopening, independent accordion expansion, panel/file-preview borders and hash navigation.
6. Synchronize installation and website guidance. Keep production evidence selection and deployment untouched.

### Verification

From the skill root:

```bash
npm ci --ignore-scripts
npm ls astro sharp
npm run website:check
npm run test:e2e
npm run typecheck
npm run format:check
```

Use the owning browser tests to cover the interactions above in both clean development and synthetic recorded-evidence modes. Verify at 320px and desktop widths, light/dark themes, keyboard operation, visible focus, accessible names, reduced motion, direct navigation and client navigation. Inspect screenshots before changing visual baselines. Run website generators sequentially when they share an output directory.

### Acceptance criteria

- Both consumers resolve UI `1.10.2` with Astro `7.2.8` without the override.
- Dialogs preserve layout and reopen at the intended scroll position; independent accordion expansion does not collapse another section.
- Affected borders, file previews and navigation work in the tested responsive, theme and accessibility states.
- The existing clean and synthetic website checks pass and ordinary installation guidance is current.
- No official evidence or skill production deployment is created.

### Review checkpoint

Review the resolved dependencies, override removal, reuse of public UI exports, browser evidence and screenshots. The dependency lockfile now includes the final UI target before the coupled CLI/evaluator migration.

## Milestone 4: Migrate the skill and prepare both evaluation systems

### Objective

Complete the coherent skill `6.0.0` migration to CLI 9/Core 5/schema 5, including warning behavior, every affected consumer, semantic preparation, all 14 qualification targets, evidence identity and current examples.

### Dependencies

Milestones 1–3 completed and explicit authorization for Milestone 4. The published CLI/package closure and planned exact SDK dependencies must be available. Reconcile a material intervening publication change through the plan workflow before extending scope.

### Owned scope

- Root `package.json` and `package-lock.json`; maintained release identity references; `src/portable/repository-package.ts`; generated portable artifacts through their generator; semantic CLI fixture manifest and executable; `fixtures/conformance-cases.json` and directly affected execution fixtures.
- `moldea/SKILL.md` and affected references: `local-tooling.md`, `runtime-compatibility.md`, `evaluate-and-reconcile.md`, `project-repair.md`, `agent-design.md`, and `continuous-maintenance.md`.
- `src/semantic/execution/types.ts`, `actor-evidence.ts`, affected execution/recording/reuse/replay contracts, `src/semantic/cases/`, and `src/semantic/workspace/setup.ts` with their owning tests.
- `qualification/src/contracts/types.ts`; `qualification/src/deterministic/direct-verifier.ts`, `verifier.ts`, owning types, new `validations.ts`, and their required tests/exports.
- All affected `qualification/profiles/t1` through `t14` profile, claim, scenario, task, seed, expected-project and README files; `qualification/package.json`; `qualification/compatibility/snapshot.json`; the affected tooling publication fixture.
- The semantic and qualification protocol constants, including `src/release/constants.ts` and `qualification/src/constants/index.ts`; affected current producer, checkpoint, reuse and public-evidence contracts and tests.
- `qualification/src/public-evidence/` and affected semantic/public website readers, fixtures and projections; `website/src/lib/landing-example/`, affected visual examples, generated documentation and synthetic replay inputs.
- Affected state-bearing sections of `README.md`, `qualification/README.md`, `website/README.md`, `docs/compatibility-and-local-tooling.md`, `docs/evaluate-reconcile-validate.md`, `docs/getting-started.md`, `docs/semantic-evaluation.md`, `docs/adapter-qualification.md`, `docs/release-evidence.md` and relevant `docs/examples/` files. Synchronize affected errors and reachable `@throws` if their contracts change; protected instruction files remain untouched.

### Implementation work

1. Use the corrected `npm run release:update-cli -- 9.0.0` workflow and synchronize skill candidate `6.0.0`. Record the exact published CLI dependency closure. Set eligible CLI `^9.0.0`, eligible Core `^5.0.0` plus the CLI's own Core declaration, and CLI JSON schema `5`. Keep repository format `1`, portable Git/Node requirements and provider minimum-only eligibility unchanged. Preserve intentional incompatible-version fixtures.
2. Regenerate portable artifacts; do not edit generated helper text. Update identity and launcher tests so compatible stable CLI patches/minors remain accepted and incompatible majors/prereleases fail closed.
3. Teach scoped warning interpretation in the compact entrypoint and existing conditional references. A warning-only valid result remains nonblocking for unrelated authorized work, the affected claim remains unverified, and confirmed errors remain failures. Preserve routing, authority, read-only behavior and relevance budgets. Do not force pinning, manifest rewrites, runtime replacement, online discovery or automatic repair merely to remove warnings.
4. Update command-specific schema-5 consumers and fixtures. `validate` uses aggregate diagnostic/error/warning counts; `inspect` uses its corresponding aggregate `counts`; pages do not redefine totals. Preserve the distinct `scope`, `content` and `composition` contracts. Add nullable error/warning totals to safe semantic facts only where applicable; validate safe integers, totals, validity, envelope status and exit-code agreement. Missing or contradictory output produces no validation conclusion.
5. Add the plan's diagnostic/evidence selectors to qualification before/after expectations. Match all specified fields on one record, including actual references. Required selectors need a match; forbidden selectors require none. Omitted fields impose no condition, while explicit null, missing values and incorrect values remain distinct.
6. Implement the closed metadata allowlist: diagnostic `packageName`, `boundaryVersion`, and nullable `declaredRange`; evidence `declaredDeferredLoading` (`absent`, `enabled`, `disabled`, `unknown`), `patternId`, `interruptForm` (`two-argument`) and `responseSchemaRole` (`resume-value`). Reject unsupported selector keys and invalid known values. Ignore harmless unrelated producer fields. Use direct Core results for these assertions; keep semantic command facts free of declarations, paths, messages and arbitrary metadata.
7. Extend direct filesystem-versus-memory verification with complete totals and the required projected fields. Compare actual CLI aggregates independently of pagination. Move growing pure matching into the deterministic module's `validations.ts`, without introducing a general query language, second SDK analyzer or public API solely for tests. Synchronize scenario loading, public projection and documentation together.
8. Prepare the four semantic behaviors: warning-only unrelated work, requested relationship remaining unresolved without forced pinning, mixed defects requiring actual repair, and a read-only warning assessment. Reuse coherent existing cases; add only distinct cases. Execute setup and deterministic assertions independently of actors/judges and retain later-stable eligibility and incompatible-package negative controls.
9. Reconcile all 14 qualification targets with the finite coverage table below. Preserve Custom's universal journey ownership, exact installed runtime closures and root fixture declarations. Use realistic nested source-owning declarations for range-sensitive cases and verify nearest-manifest resolution. Do not add per-case installation overrides or duplicate historical SDK compiler matrices.
10. Remove obsolete Eve agent output options/bindings from current positive fixtures. For the stale-binding negative case, reference a real exported schema in the manifest while keeping current SDK source type-correct. Tool output schemas remain supported.
11. Assert all deferred-loading states, the functional interrupt form/resume role, absence of a resume-role claim for empty options, and Think's exact `@cloudflare/think` declaration and `0.18.0` boundary. Add known-side and spanning-declaration controls using the exact installed closure. Reuse cases or bounded deterministic variants rather than creating paid actor cases for every metadata value.
12. Reconcile probes before refreshing the compatibility snapshot, review its complete diff and check it. Ordinary qualification continues to use the committed snapshot without a sibling checkout or online discovery.
13. Set semantic protocol `26` and qualification evidence protocol `12`, synchronizing producers, literal types, checkpoints, reuse and synthetic fixtures. Preserve raw historical attempts with their original identities and reject them for current resume/reuse. The independent qualification profile format is not the evidence protocol and is not being independently redesigned.
14. Preserve public bundle format `1`. Separate presentation validation/types from current-run eligibility so supported historical self-contained bundles remain readable without casting old results to current-protocol literals or accepting old raw actor facts as current. Preserve digest, path, privacy, byte-limit and official-versus-fixture checks. Keep `evidence/selection.json` unchanged.
15. Update current docs, website examples and executable fixtures to their real schema-5 contracts. Keep the landing example backed by a real CLI test. Provide valid warning-only and invalid examples; visibly label shortened excerpts and do not offer truncated examples as complete copyable JSON. Remove superseded current schema-4 paths while preserving intentional negative fixtures and historical evidence.

### Qualification coverage and exact dependencies

| Targets               | Required reconciliation                                                                                                  | Planned SDK pins                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| t1 Anthropic          | Direct create/parse/stream, agent output schema, effective options and invalid wiring controls                           | `@anthropic-ai/sdk` `0.128.0`                                                               |
| t2 Claude Agent SDK   | Direct query/system prompt forms, programmatic definitions, delegation/MCP boundaries                                    | `@anthropic-ai/claude-agent-sdk` `0.3.282`                                                  |
| t3–t4 Cloudflare      | Deferred-loading declarations; Think precedence, `configureContext`, exact boundary context and unresolved relationships | Think `0.19.0`, agents `0.24.0`; retain AIChat `0.10.2` unless its actual integration fails |
| t5 Custom             | Schema-5 result interpretation and shared universal journeys                                                             | Current published Moldea closure                                                            |
| t6 Eve                | Workspaces/subagents, workflows, exposure/default namespaces, test-source exclusions, agent output removal at `0.67.0`   | `eve` `0.67.0`                                                                              |
| t7 Google Gen AI      | Direct generation/streaming and unsupported chat/live/interaction boundaries                                             | `@google/genai` `2.24.0`                                                                    |
| t8 LangChain          | Supported strategies/tools and conservative middleware conclusions                                                       | `langchain` `1.5.12`                                                                        |
| t9–t10 LangGraph      | Graph/functional boundaries, current interrupt metadata and absence of unsupported routing claims                        | `@langchain/langgraph` `1.4.18`                                                             |
| t11 OpenAI            | Responses create/parse/stream, output schema and effective options                                                       | `openai` `7.23.0`                                                                           |
| t12 OpenAI Agents SDK | Direct agents, handoffs and routing-description uncertainty                                                              | `@openai/agents` `0.18.0`                                                                   |
| t13–t14 Vercel AI SDK | Deferred-loading metadata and preparation/override boundaries                                                            | `ai` `7.0.116`                                                                              |

Apply the relevant reviewed companion pins, including AI SDK `7.0.116` for its Cloudflare consumers, LangChain Core `1.2.12`, MCP SDK `1.30.1` for Claude, and Zod `4.3.6`. Synchronize directly related fixture-development dependencies without unrelated upgrades. Every changed observable capability claim requires a deterministic assertion; actor judgment/communication criteria cannot substitute for checking reported metadata.

### Verification

Keep focused tests with their owning behavior. Required coverage includes:

- Updater-driven identity, generated launchers, accepted compatible versions and rejected incompatible identities.
- Distinct complete CLI shapes and real-CLI comparisons for all consumed fields.
- Warning-only validity, mixed errors/warnings, independently verified relationships beside warnings, nonterminal-page totals, malformed/contradictory totals and safe semantic projection.
- Metadata mismatches despite correct record kind/identity, missing values, explicit null versus absence, forbidden matches, fields split across records and unsupported selector keys.
- Real Repository FS/Core/CLI integration and filesystem-versus-memory equivalence. Deliberately incorrect expectations against real results must fail without mocking adapter behavior.
- Actual semantic workspace setup and the four prepared behaviors; profile/scenario loading, exact installations, nearest manifests and current SDK typechecking.
- Preservation of metadata assertions through public projection; readable prior presentation bundles, malformed-bundle rejection and rejection of historical raw attempts for current reuse.
- Real CLI-backed landing examples and both clean/synthetic website states.

Add `qualification/src/deterministic/validations.test-unit.ts` and `verifier.test-integration.ts`; extend the existing contract, public-evidence, semantic setup/execution, identity and launcher tests. Preserve existing categories, co-location, test typechecking and production artifact exclusion.

During implementation, run the affected granular scripts first. Refresh the reviewed snapshot after probe reconciliation:

```bash
npm run qualification:compatibility:update
npm run qualification:compatibility:check
```

After the updated manifests and lockfile are established, run the complete planned preparation boundary from the skill root:

```bash
npm ci --ignore-scripts
npm run portable:generate
npm run runtime:build
npm run portable:check
npm run release:identity:check
npm run path:check
npm test
npm run qualification:test
npm run website:check
npm run typecheck
npm run lint
npm run qualification:lint
npm run format:check
npm run qualification:format:check
npm run qualification:compatibility:check
npm run eval:semantic:preflight
npm run qualification:dry-run:all
npm run resource:check
npm ls astro sharp
```

`npm test` covers the root correctness categories and both website browser modes. `website:check` adds its documentation, unit, type, lint, formatting, synthetic build and artifact checks. Format touched YAML and documentation outside existing globs with the existing targeted formatter. Run generators sharing website output sequentially.

If changed CLI output or prepared fixtures require resource-corpus updates, use the existing `npm run resource:calibrate`, inspect measurements and artifact changes, then rerun `resource:check`. Preserve the 65,536-byte ordinary CLI page, 262,144-byte aggregate target, roughly four ordinary CLI calls and final-validation reserve. Use existing bounded caches/workers; add no cache or extra request to obtain already available totals/metadata. Report CPU, disk and registry-cost growth from dry runs without increasing model token ceilings, candidate allowances, confirmation counts or model concurrency.

Recheck affected website examples at 320px and desktop widths, both themes, keyboard/focus/accessibility states and reduced motion when relevant. Preserve the Milestone 3 interaction checks. These are deterministic and synthetic checks, not real evaluation outcomes. Do not run evidence-dependent `release:check`, production `website:build`, recording, publication or selection commands.

### Acceptance criteria

- All maintained/shipped identities consistently describe skill `6.0.0`, CLI 9/Core 5/schema 5, with the original compatible-release eligibility policy.
- Warnings neither block unrelated work nor establish affected wiring as verified; confirmed defects remain failures.
- Every current consumer, fixture and example agrees with its actual command contract; no temporary schema-4 fallback remains.
- Metadata assertions detect the false-positive cases identified in the challenge and survive public projection.
- Semantic setup checks and preflight pass; all 14 targets resolve, typecheck and pass their model-free dry runs with reviewed coverage and snapshot identity.
- Protocol changes reject stale current-run reuse while preserving supported historical presentation and untouched raw historical files.
- Current docs/examples are synchronized, evidence selections remain null and no semantic or adapter qualification success is claimed.
- Required checks pass with reviewed resource results, or a genuine blocker is reported without declaring this milestone complete.

### Review checkpoint

Review the entire package-to-skill-to-evaluator-to-website path, warning decisions, real command evidence, metadata mismatch controls, per-target coverage, historical/current evidence separation, resource measurements and documentation. This checkpoint must be coherent before final consolidation; it must not leave required fixture fixes or tests for Milestone 5.

## Milestone 5: Complete final review, consolidation and operator handoff

### Objective

Establish the exact prepared candidate, retain all work in development and provide the evidence-backed handoff for later model execution and release operations.

### Dependencies

Milestones 1–4 completed and explicit authorization for Milestone 5. Their review findings must be resolved or preserved as genuine completion blockers.

### Owned scope

The plan's final cross-boundary review, verification records, directly affected handoff documentation, normal reviewed Git consolidation and task-owned cleanup. No new feature, framework change, evaluation run or evidence selection is added.

### Implementation work

1. Perform a plan-to-result audit covering all acceptance criteria and the milestone coverage map below. Inspect the final combined change and documentation, including generated outputs, error contracts and protected-instruction guidance. Produce a separate coding-instructions handoff only if a durable uncovered guidance gap is demonstrated; do not edit protected files.
2. Review, fix in-scope findings and rerun affected verification until no material findings remain. A material scope/design change returns to the plan workflow. No required test or documentation work is intentionally deferred here from an earlier milestone.
3. Bind verification records to exact candidate inputs: commits, CLI/package closure, portable artifact digest, compatibility snapshot digest, evaluator protocols and profile inventory. Record executed commands/results and unavailable checks. Reuse unchanged valid results; rerun only checks whose relevant inputs changed or whose required evidence is missing.
4. Confirm the current candidate satisfies the complete Milestone 4 preparation boundary and the published UI identity from Milestone 1. Preserve the existing platform/Node/package-manager gates. Do not use production release gates requiring unselected evidence as substitutes for preparation verification.
5. Consolidate authorized changes in each repository's `development` branch through the established reviewed and signed Git workflow. Preserve unrelated user/agent changes. Before deleting a task worktree or branch, prove its commits and intended file changes are retained in development or the necessary release history. Do not reset, force-push or clean unrelated work.
6. Deliver the later-run sequence: freeze candidate inputs; execute fresh semantic evaluation and Custom qualification; execute adapter qualification against that baseline; inspect real outcomes; then separately publish/select evidence and perform release/website gates. Clearly mark those activities unexecuted and separately authorized.

### Verification

Audit exact input identities against the successful checks from Milestones 1–4. Run missing or invalidated commands from their verification lists at the narrowest sufficient boundary. Confirm current worktree/ref state and retention before task-owned cleanup. Report actual cross-platform/CI execution rather than inferring it from local success.

There is no database or application-data migration. Verify that `evidence/selection.json` and historical attempts were preserved. Published npm versions remain immutable; any defect in the UI release requires a corrective release rather than overwriting its tarball or returning to affected Astro `7.2.2`.

### Acceptance criteria

- No unresolved material review finding or required verification gap remains. Unavailable required evidence is reported as a blocker, and the milestone is not declared complete.
- The exact candidate and deterministic evidence are reproducible from the recorded inputs and commands.
- All intended changes are retained in development or required release history; cleanup loses no work.
- Current documentation is accurate and protected instructions are untouched.
- The final report distinguishes prepared deterministic readiness from unexecuted model-backed assurance and lists the later authorized workflow.
- No skill tag, skill production deployment, official evidence publication/selection or paid evaluation occurred during these milestones.

### Review checkpoint

Review the final candidate identities, verification ledger, branch/worktree retention and operator handoff. Stop; later evaluations and publication require separate authorization.

## Plan coverage

| Plan deliverable                                                                                      | Owning milestone                                            |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Website UI/Astro correction, package tests, docs, publication and packages development retention      | 1                                                           |
| Authoritative release updater, generation, conflict/failure recovery and tests/docs                   | 2                                                           |
| Skill Website UI consumption, override removal, shared interactions and browser verification          | 3                                                           |
| Skill identity, package/schema migration, generated artifacts and version eligibility                 | 4                                                           |
| Warning instructions, current CLI contracts, safe semantic facts and real fixtures                    | 4                                                           |
| Direct Core selectors, metadata controls, public projection and verifier documentation/tests          | 4                                                           |
| Semantic setup/preflight, all qualification targets, exact SDKs and compatibility snapshot            | 4                                                           |
| Evaluator protocols, stale-attempt rejection and historical presentation                              | 4                                                           |
| Schema-5 website/documentation examples and clean/synthetic evidence states                           | 4                                                           |
| Resource checks, conditional calibration and applicable platform/install gates                        | Each affected milestone; complete preparation boundary in 4 |
| Final review, input-bound verification, development consolidation, safe cleanup and later-run handoff | 5                                                           |

## Approval required

Approve the plan and this complete five-milestone sequence: (1) publish the Website UI/Astro correction, (2) repair the release updater, (3) consume and verify Website UI, (4) migrate the skill and prepare both evaluation systems, and (5) complete final review, consolidation and handoff.

Approval of this sequence does not start implementation. Explicitly authorize one numbered milestone to begin; that instruction may also approve the plan and sequence. Each later milestone requires its own authorization after the preceding checkpoint. Model-backed runs, provider calls, evidence publication/selection, skill release tagging and skill production deployment remain excluded.
