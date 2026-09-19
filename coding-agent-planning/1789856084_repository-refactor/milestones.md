# Repository refactor milestones

## Basis and execution boundaries

This sequence implements `coding-agent-planning/1789856084_repository-refactor/plan.md`, SHA-256 `22329a9a0d78f22cc5ef863a8a88b13f8dd092ecc4b7436a8319c5ad70868078`, against repository commit `22988b4117c292a2e8fb8ef326025180162f874d`. No implementation has started. The plan and this milestone sequence still require approval.

There are two milestones. Consolidating dependency installation has its own usable, testable endpoint. The remaining refactor changes contracts shared directly by the evaluators, release tooling, and website: current website loaders import evaluator modules and read their case definitions and recorded storage. Those changes stay together through the clean-slate cutover. This avoids requiring an additional transitional evidence format, duplicate catalog, or temporary website reader to make intermediate boundaries work.

Milestone 2 is consequently substantial. Its implementation work is ordered internally, but those steps are not separately authorized milestones or permission to stop with broken consumers. Tests, directly affected documentation, configuration, and removal of replaced code belong to the milestone that changes their behavior.

Both milestones preserve unrelated work, protected coding-instruction files, excluded directories, Git history, existing releases, and the website's main sections and design. Neither authorizes paid evaluations, publication, deployment, repository-settings changes, commits, or pushes. No benchmarks, new adapters, historical-result migration, compatibility framework, or coverage-expansion campaign is included.

## Milestone 1: One workspace installation

### Objective

Make one root npm installation provision the existing root tooling, qualification application, and website, while their current executable behavior and evidence system remain in place.

### Dependencies

Requires approval of the plan and this sequence, followed by explicit authorization to implement Milestone 1. No preceding implementation milestone or fresh model evidence is required for this development-setup change.

### Owned scope

- Root `package.json` and `package-lock.json`, `qualification/package.json`, and `website/package.json`; remove the two workspace-local lockfiles after their dependency requirements are represented by the root lockfile.
- Installation, cache-path, runtime-setup, and installed-tool invocation changes in `.github/workflows/conformance.yml`, `release-candidate.yml`, `website.yml`, and `pages.yml`.
- Installation/dependency-resolution call sites and their existing tests only where the single-install layout requires an adjustment. Do not rely on a particular hoisted `node_modules` location.
- Development/setup instructions in `README.md`, `qualification/README.md`, and `website/README.md`, plus directly affected command references.

Source relocation, TypeScript/Vitest conversion, evaluator contracts, evidence storage, publication, and website data loading remain Milestone 2 work. Existing active implementations and test runners remain in use during this milestone; do not add compatibility wrappers or migrate code merely to create an intermediate arrangement.

### Implementation work

1. Declare the `qualification` and `website` npm workspaces and consolidate dependency installation and locking. Preserve current dependency versions and workspace-specific differences; declare dependencies at their actual owning package rather than relying on accidental hoisting.
2. Establish Node `^24.15.0` as the development runtime without raising the distributed skill's Node `>=22.11.0` requirement. Keep workspace commands usable from the root and their owning applications.
3. Replace separate workspace installs and lockfile caches in CI with one root install. Resolve installed tools through package commands rather than assumptions such as `website/node_modules/.bin/playwright`.
4. Keep compatibility-test runtimes distinct from the runtime used to install development dependencies. Preserve the existing Node 22.11.0, 24.11.0, and 26.8.1 conformance coverage, Windows deep-path checks, sandbox prerequisites, package-candidate validation, Pages destination, custom domain, SEO submission, and existing permissions. The final generated-script/Vitest matrix wiring belongs to Milestone 2.
5. Synchronize setup documentation in this change. Do not document Milestone 2 commands or architecture as already implemented.

### Verification

Use the existing test boundaries, without introducing empty scripts or changing test categories solely for this milestone:

```bash
npm ci --ignore-scripts
npm test
npm run qualification:test
npm --workspace website test
npm run qualification:typecheck
npm --workspace website run typecheck
npm run qualification:lint
npm --workspace website run lint
npm run qualification:format:check
npm --workspace website run format:check
npm run path:check
npm run docs:check
npm run website:build
```

Run the narrowest checks for any changed dependency-resolution behavior before these regression checks. Reuse completed equivalent build/test results for unchanged inputs instead of rebuilding solely to repeat evidence. Format only touched files. Inspect the consolidated lockfile, dependency resolution from each owner, and CI commands for references to removed lockfiles or separate installs.

Do not refresh recorded evidence to make development checks pass. Triage any failure against the requested installation change and existing evidence contracts. Report unavailable browser, sandbox, network, or OS checks explicitly; do not claim remote CI execution from configuration inspection.

### Acceptance criteria

- A clean root installation provisions all three existing package boundaries using one lockfile.
- Current entry points and correctness suites still work, and installation does not introduce incidental dependency upgrades or runtime behavior changes.
- CI no longer depends on deleted workspace lockfiles or fixed hoisting locations, while the portable-runtime and Windows coverage remain represented.
- Setup documentation describes the implemented workflow accurately. No evaluator, evidence-format, or website-content changes have been introduced.

### Review checkpoint

Review dependency ownership, the consolidated lockfile, CI runtime separation, and clean-install regression results. Confirm that the skill's installation contract and current application behavior have not changed before authorizing Milestone 2.

## Milestone 2: Typed evaluators and the complete evidence cutover

### Objective

Complete the remaining planned refactor as one working producer-to-website system: maintained TypeScript, consistent tests, straightforward case authoring, local recorded runs, GitHub Release bundles, independent maintainer selections, and the existing website rendering only selected evidence.

### Dependencies

Requires completed Milestone 1 and explicit authorization to implement Milestone 2. Development verification uses synthetic evidence and fake external execution/publication boundaries. Real evaluations, GitHub publication, and deployment remain separate operator actions requiring authorization.

### Owned scope

- Root `src/portable/`, `semantic/`, `execution/`, `resources/`, `packages/`, `compatibility/`, `filesystem/`, `process/`, `paths/`, `evidence/`, and `release/`, including explicit public entry files and colocated tests.
- Replaced sources and tests under `tooling/` and `tests/`; generated `moldea/scripts/` output; the existing managed README asset and matcher license notice; ignored `dist/runtime/` helpers.
- Root `tsconfig.json`, `tsconfig.base.json`, `eslint.config.ts`, `.prettierrc`, and `vitest/`; corresponding workspace configuration, manifests, root lockfile, and `.gitignore` changes required by the remaining implementation.
- Semantic definitions and fixtures, including the semantic portion of `fixtures/conformance-cases.json`, historical disposition/coverage files, and replacement discovered case modules.
- `qualification/src/profiles/`, `contracts/`, `execution/`, `deterministic/`, `storage/`, `result/`, `reuse/`, `baseline/`, and `status/`; profile/scenario/probe inputs and removal of the duplicated `qualification/cases/cases.yaml` catalog.
- `evidence/selection.json`, ignored `.evidence/` execution/publication/cache storage, and all planned pack/publish/pin/prepare and release-check commands.
- Website evidence loaders, projections, schemas, presentation catalogs, `src/lib/generation/`, `scripts/generate.ts`, package scripts, both Playwright configurations, and affected page/component tests. Preserve the existing components, route shapes, sections, and design.
- Remaining source-path, helper-build, preparation, and artifact-reuse changes in the four workflows named in Milestone 1.
- Root README/Project blueprint, both application READMEs, `docs/semantic-evaluation.md`, `docs/adapter-qualification.md`, `docs/release-evidence.md`, and directly affected compatibility, local-tooling, examples, and command documentation.

### Implementation work

1. Complete the TypeScript and test-tooling foundation. Add the planned strict configurations and explicit dependency declarations, retaining installed major versions, established `.ts` development imports, Astro's own base configuration, and website formatting plugins. Use the inspected ESLint native TypeScript-configuration support rather than adding a loader. Standardize maintained repository unit/integration tests on Vitest, retain Playwright for browser tests, and expose isolated category scripts plus ordered generic correctness scripts at their owning boundaries. Keep tests typechecked but excluded from production artifacts. Source-fixture JavaScript and `node:test` programs remain valid evaluation subjects.
2. Move the portable scripts and shared execution infrastructure to their planned owners, updating every caller directly. Preserve the existing public distributed paths and generate their JavaScript with esbuild for Node 22.11. Retain matcher size/license checks and the canonical managed README asset. Generate the isolated host proxy, Git boundary executable, and qualification direct-verifier helper into `dist/runtime/`. Move package-candidate/closure, compatibility-publication, resource, path, portable-identity, and release-updater responsibilities as specified by the plan. Extract filesystem/process primitives only where both producers actually share them. Remove replaced implementations and redundant `.d.mts` files when their TypeScript owners take over.
3. Replace the semantic runner with focused command-line, case, fixture, workspace, stage, batch, diagnostic, checkpoint, recording, and verification modules. Discover typed `semanticCase` exports from `src/semantic/cases/<case-id>/case.ts`. Preserve every existing case ID and behavioral intent. Move semantic definitions out of the mixed conformance fixture, derive coverage from case metadata, and remove historical dispositions, fixed inventories, and their obsolete tests. Preserve setup-before-baseline ordering, actor/judge separation, criteria privacy, exact identities, budgets, confirmations, retries, cancellation, diagnostics, preflight, and stop-loss behavior.
4. Complete qualification discovery and responsibility splits. Retain the profile index and short physical directories; discover `cases/*/scenario.yaml` instead of handwritten profile case lists. Use discovered Custom scenarios as the shared-case authority, derive composition counts, and remove the duplicated source catalog. Preserve probes and validate their actual `coveredBy` relationships without requiring every new case to support a probe. Split contract ownership into profile/scenario/execution/result modules and extract competing executor responsibilities while retaining meaningful public names, exact candidate closure, and exact recorded Custom baseline binding.
5. Move both producers' checkpoints and completed-run storage into `.evidence/`. Replace committed-attempt and Git-blob reuse with validated local completed-run records, preserving identity-matched passing-stage reuse, interrupted-run recovery, bounded qualification status listing, and baseline linkage. Do not add historical-release scanning or evaluator reconstruction. Document that public display bundles are not backups for local resume/reuse state.
6. Implement the public evidence contract and both producer projections. Produce `formatVersion: 1` gzip-compressed JSON bundles containing the recorded summaries, definitions, tasks, criteria, trials, replays, projects, patches, technical details, version/date/provenance, and downloadable artifacts required by the existing UI. Deduplicate exact artifact bytes. Preserve the plan's official/fixture distinction, sanitization, allowlists, additive-field handling, digest/reference validation, safe portable download paths, and rejection of executable content or filesystem-link materialization. Enforce the existing per-artifact/file-count/decoded-byte limits and the planned 128 MiB compressed/expanded JSON limits without silently omitting evidence.
7. Implement `evidence:pack`, `evidence:publish`, `release:evidence:pin`, and `evidence:prepare` with the plan's argument contracts. Use dedicated prerelease evidence tags, draft/upload/publish sequencing, conflict-safe retries, and no asset clobbering. Keep GitHub CLI credentials limited to explicit publication. Atomically update semantic and qualification selections independently, validate selected digests, and never substitute current/latest evidence. Prepare both sections before exposing a manifest tied to the exact selection. Retain only selected compressed bundles in the replaceable digest-keyed cache after successful preparation; handle corruption, cancellation, finite timeouts, failed downloads, and partial writes explicitly.
8. Replace the old release envelope and Git-snapshot authentication/materialization paths. Remove `release:evidence:record`, nested pins, and the old historical `--from`/`--from-commit` behavior. Keep release checking read-only with respect to evidence, preserve deterministic/portable/dependency checks, and require passing selected assurance without imposing today's case inventory, same-version requirements, freshness comparisons, or reason essays on older pins.
9. Connect the existing website to the prepared public contract. Move recorded-input validation, replay/project transformations, baseline composition, and authoritative presentation metadata into the producers/evidence tooling. Remove evaluator-aware loaders, duplicated execution schemas, digest-bound editorial catalogs, and `source-materializer.ts`; retain ordinary rendering and formatting. Reuse the existing Website UI accordion, replay/model, tabbed panels, file preview, result summary, status badge, Markdown, layout/theme components, and application-owned evidence compositions. Preserve all main sections, navigation, search, SEO, route shapes, downloads, and detailed evidence views. No evaluator imports, Git subprocesses, compatibility calculations, or browser-side evidence retrieval remain in website generation/rendering.
10. Enforce selected-run-only browsing. Each section's selected bundle supplies its displayed cases, definitions, counts, outcomes, and details. Current case additions, edits, and removals cannot alter that snapshot; newer cases appear only when evidence containing them is selected. Preserve actually recorded failures/pending outcomes and version/date context, with no visitor selector, current-only missing-test notices, or coverage-comparison feature.
11. Complete the scoped efficiency changes and CI integration. Prepare one bundle at a time, hash/read unique artifacts once per operation, use linear lookup maps where appropriate, and keep artifact bodies out of the site-wide model. Consolidate evidence preparation/build ownership so integration and browser checks reuse the same artifact while standalone commands still arrange their prerequisites. Preserve concurrency/resource limits; add no workers, benchmarking, distributed cache, or new infrastructure. Wire actual generated-script execution through `MOLDEA_TEST_NODE`, preserving the existing Node matrix and Windows checks while keeping Linux-only sandbox tests explicit.
12. Remove superseded tracked results, old reuse manifests, receipts, and checkpoint expectations named by the plan, after resolving exact targets. Remove emptied legacy `tooling/` and `tests/` trees and every obsolete import/export/test/configuration/documentation reference belonging to the replacement. Preserve useful source fixtures, calibration inputs, protected instructions, excluded directories, Git history, and published releases. Synchronize the full affected documentation set before declaring the milestone complete; reserve `/docs` for concise durable concepts and workflows. Inspect protected guidance and supply a separate handoff only if completed changes reveal a durable gap.

### Verification

Keep tests with their actual owners and exercise real internal wiring. Mock only paid execution, publication, and other impractical external boundaries. Required evidence includes:

- Portable behavioral parity, generated-byte reproducibility, standalone execution without development dependencies, matcher size/licenses, managed README output, malformed/escaped inputs, supported runtime execution, and Windows/POSIX path semantics. Check every new/generated path for containment, portable names, collisions, and length limits.
- A synthetic additional case in each evaluator passing discovery, preflight, fake-host recording, bundle generation, preparation, and website rendering without central registration. Cover duplicate IDs, missing fixtures, setup failures, criteria isolation, and preservation of all existing behavioral cases.
- Confirmation/retry logic, cancellation, resource stops, interrupted checkpoints, exact reuse hits/misses, failed outcomes, and Custom/direct qualification composition. Preserve meaningful unit tests and filesystem/process integration tests rather than replacing them with internally mocked tests.
- Bundle round trips preserving every evidence view/download, deduplication, malformed metadata, missing/changed blobs, dangerous paths/content, truncation, decompression/resource limits, and representative large inputs without timing thresholds.
- Independent selection changes, atomic-update failure, exact version/date preservation, no latest/current fallback, and displayable failed evidence remaining ineligible for passing release assurance.
- The selected-snapshot regression in both evaluation paths: select A, add a current case, verify runner discovery but unchanged website inventory/counts/status/details and no current-only route or missing-test notice; record/pack B through the fake host, select/prepare B and observe the added case; reselect A and observe the original snapshot. Editing/removing current cases must not rewrite A. Selection tests must not require website catalog edits.
- Publication retry after partial upload; matching/conflicting existing assets; upload/publish/download failure; cache hit/miss/corruption; temporary-file integrity; timeout/cancellation; no secret-bearing diagnostics; and rejection of fixture bundles by publication, production selection, Pages, and release assurance.
- Site generation without evaluator imports or Git history; working base paths, source downloads, all main routes, replays, projects, technical disclosures, search, sitemap, canonical metadata, and copy controls. Deliberately verify keyboard/focus behavior, accessible names, layout down to 320px, light/dark themes, reduced motion, and preserved branding/design.
- Test co-location/source-derived filenames, category isolation, complete generic correctness execution, test typechecking, and absence of tests in generated scripts and website artifacts. Audit final imports and dependency direction, including absence of superseded implementations beside their replacements.

Include the planned `src/semantic/cases/loader.test-integration.ts`, `qualification/src/profiles/loader.test-integration.ts`, and colocated bundle/selection/GitHub/preparation tests. Preserve useful existing website component E2E placement and coverage.

Run focused unit/integration checks during each logical implementation step, then the plan's cross-boundary verification commands:

```bash
npm ci --ignore-scripts
npm run runtime:build
npm run portable:generate
npm run test:unit
npm run test:integration
npm run test:e2e
npm test
npm run typecheck
npm run lint
npm run format:check
npm run portable:check
npm run path:check
npm run resource:check
npm run eval:semantic:preflight
npm run qualification:dry-run:all
npm run docs:check
```

The final generic suite verifies category composition; avoid redundant reruns for unchanged inputs once category isolation is established. Preflight and dry-run must not invoke paid models. Synthetic bundles may build/test the site only in isolated test output. Run available runtime/OS checks and report unavailable environments or network prerequisites separately; do not infer successful CI or measured performance from local checks.

### Acceptance criteria

- Maintained application/tooling code and correctness tests use the planned authoritative TypeScript/Vitest structure, with standalone generated JavaScript and Playwright retained where required. No obsolete Node repository test runner, duplicated declaration, compatibility wrapper, or replaced implementation remains.
- Adding a semantic or qualification case requires only its owned definition/fixtures and any actual compatibility-claim relationship, without fixed counts, executor branches, or website registration.
- Both producers record locally, support the preserved execution/recovery/reuse behavior, and produce complete, sanitized public bundles through the real application path.
- Publication, independent old-run selection, integrity checking, caching, and preparation are implemented and integration-tested without external publication.
- The website preserves its sections/design and full evidence functionality while showing only selected snapshots. The A/B/A selection regression passes for both evidence kinds.
- Scoped performance improvements, removals, documentation, CI, and the full applicable correctness checks are complete. Verification limitations are explicitly reported, not replaced with claims of fresh behavioral assurance.
- Initial production selections remain unselected until fresh evidence exists, and production preparation/deployment rejects that state clearly. Synthetic test success is sufficient for implementation verification, not for production evidence readiness.

### Review checkpoint and production handoff

Review the complete dependency graph, case-authoring examples, preserved execution safeguards, public bundle/privacy boundaries, publication/pinning failure behavior, and representative website pages. Review the final removal inventory and documentation against the diff before accepting the milestone.

After implementation, separately authorized operator actions must run fresh semantic evaluation and qualification, publish/select their bundles, and execute:

```bash
npm run evidence:prepare
npm run website:check
npm run website:build
npm run release:check
```

These commands must succeed with real selected evidence before production cutover. The previous deployed website remains available until then. Rollback remains source/deployment rollback before cutover or selection of a previously published new-format bundle afterward. This handoff is the plan's explicit external prerequisite, not an undisclosed implementation milestone or permission to publish/deploy. No database migrations are involved.

## Approval required

Approval is required for the complete sequence: Milestone 1 consolidates workspace installation and its CI/documentation integration; Milestone 2 completes the typed tooling/evaluator refactor, clean-slate recording and release-asset publication system, selected-snapshot website integration, removals, documentation, and verification.

Because the plan has not yet been explicitly approved, approval of this sequence also approves the referenced plan unless you limit that approval. Approval alone does not start implementation. Authorize one milestone by number; completing Milestone 1 does not authorize Milestone 2. Paid evaluations, asset publication, deployment, repository-settings changes, commits, and pushes remain outside milestone implementation authorization.
