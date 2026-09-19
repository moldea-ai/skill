# Repository refactor

## Objective and boundaries

Make this repository a coherent, strongly typed project with understandable ownership, reusable evaluation infrastructure, straightforward case authoring, and a small evidence-publication workflow. Preserve the skill's behavior and the website visitors already use.

The implementation scope is:

- Standardize maintained application and tooling code on TypeScript, repository unit/integration tests on Vitest, and existing browser tests on Playwright. Generate JavaScript where standalone execution requires it.
- Separate semantic case setup, execution, recording, publication, and website presentation. Reuse concrete shared infrastructure without inventing a universal evaluation framework.
- Make new semantic and qualification cases discoverable without changing executor branches or a website catalog.
- Start recorded evidence afresh. Store new published evidence in GitHub Release assets and keep only the selection in Git.
- Let the maintainer select earlier semantic and qualification evidence independently. Each section shows only its selected bundle's cases and results, with no run dropdown or additions from today's test catalog.
- Preserve the homepage, Capabilities, How it works, Evidence, Docs, examples, search, navigation, visual design, and existing evidence views. Preserve qualification Replay, Project, Evidence, and Technical tabs and semantic case, trial, replay, and technical detail.
- Apply obvious, best-effort efficiency improvements while doing this work. No benchmarking or separate performance project.

Explicit exclusions: skill-behavior redesign; new adapters or a campaign to fill all behavioral coverage gaps; historical-result migration; Git history rewriting; indefinitely compatible historical evaluators; website redesign or section removal; a database, API server, storage-provider abstraction, plugin framework, or distributed cache; package-manager or framework migration; automatic paid evaluations, release publication, deployment, commits, or pushes during implementation.

Existing behavioral cases and useful correctness tests are retained. The clean slate applies to recorded outputs and superseded machinery, not permission to discard coverage. Protected coding-instruction files remain untouched, including `qualification/profiles/t2/cases/c10/seed/CLAUDE.md`.

## Inspected baseline

Planning starts from commit `22988b4117c292a2e8fb8ef326025180162f874d`, with a clean worktree before this planning directory was created. No tests, builds, evaluations, or benchmarks were run for this plan.

The following repository evidence establishes the change:

- `README.md` defines `moldea/` as the complete distributed artifact, with Node `>=22.11.0`, Git `>=2.30.0`, and the current CLI/Core compatibility contracts. Development tooling is not installed with the skill.
- Root `package.json` runs `.mjs` tests through `node:test`; `qualification/package.json` and `website/package.json` use TypeScript `6.0.3` and Vitest `4.1.10`. Website browser tests use Playwright `1.62.1`. Both development applications require Node `^24.15.0`.
- The three package manifests and lockfiles duplicate development setup. Qualification formatting commands explicitly reach into individual root tooling files. TypeScript declarations are manually maintained beside several JavaScript modules.
- `tests/semantic-evaluation-runner.mjs` combines command parsing, fixture creation, case-ID-specific branches, isolation, actor/judge stages, confirmations, diagnostics, recording, and reuse in roughly 6,000 lines.
- `tooling/semantic-evaluation/dispositions.mjs` hard-codes the former 57-case and current 74-case inventories and the historical `v4.0.2` reference. `fixtures/conformance-cases.json` mixes deterministic fixture inputs with semantic definitions.
- Qualification already has useful modules under `qualification/src/`, but `execution/executor.ts`, `contracts/types.ts`, and `result/evidence.ts` still mix substantial responsibilities. Profile YAML and scenario directories are established authoring inputs.
- Website loaders currently verify evaluator contracts, calculate identities, read result storage, and materialize pinned Git snapshots. `website/src/lib/semantic-evaluation/constants.ts` and `qualification/presentation.ts` maintain separate digest-bound presentation catalogs.
- `website/src/components/qualification-case-evidence/` and `semantic-evaluation-case/` already compose the official Website UI accordion, replay, and tab components. These are preserved.
- `tooling/relevance-gate/generate-matcher.mjs` already uses esbuild `0.28.2` to generate standalone Node-compatible output. The managed README script is also generated. Sandbox proxy and direct-verifier scripts require standalone execution too.
- Existing publication code bounds selected artifacts to 16 MiB each, 8,192 files, and 64 MiB in total. Existing model budgets, isolation, cancellation, retries, confirmation policy, and privacy controls are substantive behavior, not cleanup targets.

The inspected source code takes precedence over stale documentation descriptions. In particular, the new evidence format will be specified from actual producer/consumer behavior, not copied from historical protocol summaries.

## Final project organization

Keep the existing `qualification/`, `website/`, `moldea/`, `docs/`, and source-fixture boundaries. Add a root `src/` for maintained repository tooling. Do not create separately published internal packages.

Use npm workspaces for `qualification` and `website`, one root installation, and one root lockfile. Root tooling remains the root package. Existing npm supports this arrangement without another orchestration tool. [npm workspace documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces/)

The authoritative source ownership becomes:

- `src/portable/`: TypeScript sources for distributed scripts, portable artifact identity, generation, and artifact checks.
- `src/semantic/`: semantic contracts, discovered case definitions, setup, execution, diagnostics, checkpoints, recording, and current-run verification.
- `src/execution/`: the existing shared isolated host, batch coordinator, and confirmation policy.
- `src/resources/`: existing resource profiles and calibration/check logic, without recalibration or benchmark work.
- `src/packages/`: package-candidate preparation, closure identity, and packing.
- `src/compatibility/`: runtime compatibility publication reading.
- `src/filesystem/` and `src/process/`: genuinely shared filesystem and subprocess primitives extracted from their existing owners where both evaluation paths need them.
- `src/paths/`: repository path-portability checks.
- `src/evidence/`: public bundle contracts, producer projections, packing, GitHub publication, maintainer selection, download, and static asset preparation.
- `src/release/`: release identity, dependency updates, and release eligibility checks.
- `qualification/src/`: qualification-specific execution, fixtures, deterministic checks, profiles, and results.
- `website/src/`: Astro pages/components, documentation generation, and presentation of prepared evidence.
- `evidence/selection.json`: the small tracked selection of published semantic and qualification bundles.
- `.evidence/`: ignored local runs, checkpoints, publication output, and downloaded bundle cache. These are never skill-distribution inputs.

The dependency direction is: shared filesystem/process/package/resource/execution modules serve semantic and qualification producers; producers emit recorded results; evidence tooling projects those results into a public bundle; website code consumes the prepared presentation contract. Release orchestration can call the producers and evidence tooling. Shared infrastructure must not import release orchestration or website application code.

External module imports use explicit public `index.ts` boundaries. Each meaningful module owns its implementation files and colocated tests. Do not add pass-through wrappers or generic shared directories merely to rename existing functions.

### Source relocation and removal map

- Move `tooling/codex-evaluation-host/`, `evaluation-batch/`, and `evaluation-confirmation-policy/` into `src/execution/host/`, `batch/`, and `confirmation/` respectively.
- Move `tooling/package-candidate/`, `runtime-compatibility-publication/`, `resource-calibration/`, and `path-portability/` into their root source owners listed above.
- Move semantic-owned code from `tooling/semantic-evaluation/` and `tooling/evidence-identity/` into `src/semantic/`. Move portable identity into `src/portable/artifact.ts` and CLI closure identity into `src/packages/closure.ts`.
- Replace `tests/semantic-evaluation-runner.mjs` with `src/semantic/command-line/runner.ts` and focused case, workspace, stage, batch, diagnostic, and storage modules. Migrate its tests beside those owners.
- Move the implementations currently in `moldea/scripts/moldea-cli.mjs`, `relevance-gate.mjs`, `repository-package.mjs`, and `repository-files.mjs` into matching modules under `src/portable/`. Retain their distributed paths as generated output.
- Move `tooling/managed-readme/` and `tooling/relevance-gate/` into the corresponding `src/portable/` modules, retaining the canonical managed README asset and generated matcher license notice.
- Move the remaining release-identity/updater logic from `tooling/release-identity/` into `src/release/`. Replace its Git-source evidence envelope/materialization implementation with `src/evidence/`.
- Redistribute `tests/conformance.test-unit.mjs` to the portable source owners and artifact checks. Separate pure assertions from filesystem/subprocess integration tests; do not create dummy production modules solely to give tests a filename.
- Convert maintained `.mjs` implementations and tests to `.ts` during these moves. Remove their manually duplicated `.d.mts` declarations when TypeScript becomes authoritative. Remove the emptied legacy `tooling/` and `tests/` trees, not source fixtures they reference.

## TypeScript, builds, and test tooling

Use Node `^24.15.0` for repository development and keep the installed major versions of TypeScript, Vitest, Astro, Playwright, ESLint, Prettier, and esbuild. Preserve workspace-specific package versions where they currently differ rather than introducing incidental upgrades. Root dependencies must directly declare packages imported by root source, including Zod `4.3.6` and the existing Website UI `1.8.0`/`web-utils-kit` `1.3.1` exports used by relocated presentation transformations; do not rely on accidental workspace hoisting.

Add root `tsconfig.json`, `tsconfig.base.json`, `eslint.config.ts`, `.prettierrc`, and `vitest/` configuration. Convert the existing workspace ESLint configuration files to TypeScript and use ESLint 10's inspected `--flag unstable_native_nodejs_ts_config` support on the Node 24.15 development runtime; do not add a separate configuration loader. Retain Astro's own TypeScript base and website formatting plugins. Share compatible strictness, formatting, and test defaults while leaving actual browser/build differences local. Preserve `.ts` import specifiers for development, matching the established TypeScript code.

Update root, qualification, and website manifests; consolidate `qualification/package-lock.json` and `website/package-lock.json` into the root lockfile; update CI dependency installation and cache paths. Remove cross-directory formatting file inventories in favor of scoped configuration and explicit source roots. Every recursive discovery excludes `_archive`, `_archives`, `_backup`, `_backups`, dependency trees, and generated output.

Portable build entries emit the existing `moldea/scripts/` filenames for Node 22.11 using esbuild. No compiler, development dependency, or new runtime loader is required by installed skill users. Keep the matcher size and license checks. Generate the host proxy, Git boundary executable, and qualification direct-verifier helper into ignored `dist/runtime/` where standalone helpers are necessary. Convert `qualification/src/deterministic/direct-verifier.mjs` to maintained TypeScript and update its copier to consume generated output.

Explicit build entry lists exclude all test categories and source-fixture programs from distributable tooling. Typechecking still includes tests and case definition/setup modules. Seed/expected project programs use their scenario-owned compilation checks, not accidental inclusion in the root tooling program. Generated script checks compare regenerated bytes with committed portable output. Behavioral parity, not identical bytes between handwritten and compiled implementations, is the refactor requirement.

Root commands expose `test:unit`, `test:integration`, `test:e2e`, and `test`, with `test` running those categories in that order across their owning boundaries. Keep package-level commands usable. Add root `typecheck`, `lint`, `format:check`, `portable:generate`, `portable:check`, and `runtime:build`. No benchmark script is added.

Test fixtures representing other repositories may intentionally contain JavaScript or `node:test`. The semantic correctness-evidence fixture still uses the supported direct Node invocation. These fixtures are evaluation subjects, not another repository testing standard.

Preserve actual standalone-runtime verification. Vitest runs on the development runtime, while portable integration tests launch generated scripts through a selected Node executable. Document a test-only `MOLDEA_TEST_NODE` override and keep the existing Node 22.11.0, 24.11.0, and 26.8.1 coverage in conformance CI. Preserve Windows deep-path installation checks and isolate Linux-only sandbox tests explicitly.

## Case authoring and evaluator responsibilities

### Semantic evaluation

Create `src/semantic/cases/<case-id>/case.ts` modules exporting a typed `semanticCase` definition. Each definition owns its task, expected/prohibited criteria, resource settings, presentation metadata, and optional trusted setup function. Nearby seed files hold static project content; shared setup routines live in `src/semantic/fixtures/` only when actually reused.

The case loader discovers these modules deterministically. A new case requires a case module and any relevant fixtures, not a switch branch, count constant, website entry, or historical disposition. Preserve every existing semantic case ID and its behavioral intent during the move. Setup runs before the authoritative baseline snapshot and before actor isolation; judges receive criteria separately from actors as today.

Move the semantic portion out of `fixtures/conformance-cases.json`; retain its deterministic activation/envelope inputs. Move current coverage claims into case-owned metadata and derive the coverage index. Remove `fixtures/semantic-evaluation-dispositions.json`, `fixtures/semantic-evaluation-coverage.json`, disposition validation, and tests whose sole purpose is the old migration or fixed case total. Retain checks for duplicate IDs, valid source references, internally coherent budgets, and coverage relationships.

Keep existing preflight, targeted diagnosis, diagnostic batch, official recording, resume, retry, and verification capabilities. Split orchestration into focused modules without changing actor/judge separation, confirmation decisions, execution budgets, sandboxing, privacy, cancellation, or stop-loss behavior. Identity inputs cover the actual case setup, fixtures, evaluator, generated executable helpers, and relevant package inputs after relocation.

### Qualification

Keep the established `qualification/profiles/index.yaml`, short target directories, scenario YAML, tasks, seed projects, expected projects, and probes. Their short physical paths are useful for portability; logical adapter and implementation IDs remain the public identities.

Add `qualification/src/profiles/` to discover each profile's case directories from `cases/*/scenario.yaml`. Remove the handwritten case-path lists from source `profile.yaml` files; construct the resolved profile's case collection from discovery. Reject duplicate logical case IDs and missing task/seed references.

Make the Custom profile's discovered scenarios the authority for shared qualification cases. Remove the duplicated source catalog `qualification/cases/cases.yaml`; derive its useful output shape instead. Keep adapter-specific ownership and the binding to the exact recorded Custom baseline, but derive composition counts rather than fixing them at 12 or 2.

Keep compatibility probes with their profiles. A new case need not be forced into a probe merely to be discoverable. When a case supports a compatibility claim, its author updates that claim's `coveredBy` relationship; referenced cases must exist. This preserves meaningful claim coverage without a second case-registration list.

Split `qualification/src/contracts/types.ts` into `profile/`, `scenario/`, `execution/`, and `result/` contract modules, each owning `types.ts` and a thin `index.ts`, with explicit exports through the existing contracts boundary. Retain existing schema/type names where their meaning is unchanged. Extract the long executor's remaining initial-trial, confirmation, and completion orchestration into focused siblings while reusing the existing stage, attempt, resource, and workspace modules.

Both authoring paths get concise documented examples based on real existing cases. Acceptance includes adding a temporary additional case during an integration test and proving discovery, preflight, recording through a fake external host, bundle generation, and website rendering work without editing a central catalog or executor.

## Recorded evidence and public bundles

Separate three things: editable case sources, local execution state, and published evidence. Local checkpoints and run artifacts live under `.evidence/`; they do not enter Git. Finished runs retain their saved inputs/results and checksums. Current-schema stage reuse continues to require exact behavior-bearing identity and passing reusable stages, but no longer requires result files to have been committed to Git.

Adapt `qualification/src/storage/`, `result/`, `reuse/`, `baseline/`, `status/`, and the corresponding semantic storage/reuse modules to this ownership. Replace committed-attempt/Git-blob lookup with validated local completed-run records. Preserve bounded status listing and exact baseline linkage. No automatic scan or download of all historical releases is introduced, and viewing an old public bundle never executes or reconstructs its evaluator.

Add these evidence modules:

- `src/evidence/contracts/`: additive Zod presentation/bundle schemas, selection schemas, and inferred public types.
- `src/evidence/semantic/` and `qualification/`: producer-to-presentation projections, including replay, project, trial, criteria, and technical data.
- `src/evidence/bundle/`: compression, checksums, artifact deduplication, parsing, and validation.
- `src/evidence/github/`: explicit publishing and bounded asset retrieval.
- `src/evidence/selection/`: read/update the tracked selection atomically.
- `src/evidence/prepare/`: prepare local static presentation documents and downloadable artifacts.
- `src/evidence/command-line/`: thin command parsing and orchestration.

Use a gzip-compressed JSON bundle, implemented with Node's built-in compression. This avoids an archive-extraction dependency or executable content. [Node 24 compression documentation](https://raw.githubusercontent.com/nodejs/node/v24.15.0/doc/api/zlib.md)

The public contract starts at `formatVersion: 1`, independent of internal evaluator protocol numbers. A bundle contains:

- `kind`: `semantic` or `qualification`.
- `mode`: `official` or `fixture`; fixture bundles are accepted only by isolated test preparation, never publication, production selection, or release checks.
- `id`, `createdAt`, and recorded skill version/source commit metadata.
- A validated recorded status, summary counts, and ordered case/profile summaries.
- Saved presentation records: descriptions, grouping, task, expected/prohibited behavior, actual trials, actor response, projected execution facts, judgments, resource information, and provenance shown by the current UI.
- Qualification's exact shared-baseline composition, starting project tree, source snapshots, changed paths, patches, and technical records.
- An artifact index with logical names, media types, byte counts, SHA-256 identities, and blob references. Repeated exact artifact bytes are stored once within the bundle.
- A base64 blob map for allowed public artifacts. Reuse recorded sanitization and allowlists; never include credentials, private checkpoints, raw host commands/output, hidden reasoning, dependency directories, or arbitrary workspace files.

A semantic bundle represents one completed recorded attempt including its trials. A qualification bundle represents the selected completed target runs and their exact bound Custom evidence. It does not require all targets to have executed in one process or at one time. There is no hard-coded case or target count.

The public bundle is a display artifact, not an evaluator backup. It carries the saved information needed by the existing pages and downloads; it does not carry a historical runnable repository. Additive fields are tolerated. No old-format migrator or speculative multi-version reader is added. Bundles and prepared contracts are inert JSON: loading them never imports recorded modules, evaluates scripts, or renders recorded HTML without the established sanitization/escaping boundary.

Keep the existing 16 MiB individual-artifact, 8,192-artifact, and 64 MiB decoded-artifact limits as initial safety envelopes. Bound the complete expanded JSON and compressed transport to 128 MiB each, allowing base64/metadata overhead without unbounded decompression. These are byte/storage safeguards, not fixed suite sizes. Report observed and allowed sizes on failure rather than silently dropping evidence.

Validate blob references and digests before preparing files. Original filenames are metadata; generated download paths use portable digest-derived names beneath an owned output directory. Publish source content as safe text/download artifacts, never as executable HTML or JavaScript pages. Do not create filesystem links from recorded symlink metadata. Reject traversal, absolute/device paths, excluded-directory segments, collisions, and oversized generated paths.

## Publication and maintainer selection

Keep one tracked `evidence/selection.json` with `formatVersion: 1`, `semantic`, and `qualification`. Each section is either unselected during the clean-slate transition or identifies a GitHub release tag, asset name, and exact SHA-256 digest. The repository is fixed to `moldea-ai/skill`; this is not a generic remote-storage configuration.

Provide these commands and document their concrete argument contracts:

- `npm run evidence:pack -- --scope semantic --run <run-id>` packs one verified completed local semantic attempt.
- `npm run evidence:pack -- --scope qualification` packs the verified recorded qualification selection and its bound Custom evidence.
- `npm run evidence:publish -- --bundle <bundle-path> --tag <evidence-tag>` explicitly publishes that prepared bundle through the GitHub CLI.
- `npm run release:evidence:pin -- --scope semantic --release <evidence-tag> --asset <asset-name>` validates the chosen published bundle, calculates its digest, and changes only the semantic selection. The same command accepts `qualification` for that section.
- `npm run evidence:prepare` downloads or reuses only the selected bundles and prepares the website's local inputs.

New bundle filenames and evidence tags use bounded portable IDs. Publishing uses dedicated `evidence-` tags/releases, marked as prereleases and never as the latest skill release. Create a draft, upload, then publish; a retry inspects the existing release/asset and never overwrites different bytes. A matching existing asset is reusable. Conflicts fail with an actionable message. Do not use `--clobber`, move a published tag, or silently replace an asset. GitHub's upload command provides the underlying asset operation. [GitHub CLI upload documentation](https://cli.github.com/manual/gh_release_upload)

GitHub CLI authentication is needed only for explicit publication. Public builds download public assets without publication credentials. Repository immutable-release settings are not changed by this refactor; if enabled, upload must finish before publication because published assets are locked. The selected digest remains mandatory either way. [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)

Pinning does not require a reason essay, comparison against current coverage, a particular release age, or an unchanged skill version. It changes neither the other section nor any recorded result. The website displays the recorded version/date and saved outcomes. It does not claim an earlier run exercised newly added cases.

Preserve the existing distinction between a displayable completed record and passing release assurance. Failed trials/results can be inspected honestly; `release:check` continues to require passing selected release evidence. For an explicitly selected older bundle, it does not rerun current-suite freshness checks or require today's case inventory. This refactor does not silently relax the existing passing-release policy.

`release:check` retains portable identity, dependency compatibility, generated artifact, and deterministic checks. Its evidence check remains read-only; downloading/preparing inputs belongs to the explicit preparation command. Remove the old Git-backed envelope, nested pin resolution, snapshot materialization, and `--from`/`--from-commit` historical authentication paths. Replace `release:evidence:record` with the documented pack/publish/select workflow rather than maintaining two publication systems.

## Website preservation and simplification

Preserve existing route shapes, main sections, navigation, page composition, styling, themes, interactions, and SEO/search behavior. Clean-slate evidence does not preserve historical attempt IDs or migrate old attempt-specific URLs, but the semantic attempt route remains available for newly selected records.

Reuse `@moldea.ai/website-ui` public exports already inspected: `accordion`, `evaluation-replay`, `evaluation-replay-model`, `tabbed-panels`, `file-preview`, `result-summary`, `status-badge`, `markdown`, and the existing layout/theme components. Keep domain components such as `qualification-project-evidence` and `semantic-trial-provenance`. No new general-purpose UI primitives or design-system fork is needed.

Move evidence verification, recorded-input reading, replay preparation, project transformation, baseline composition, and per-case editorial metadata out of website loaders into their producer/evidence owners. Move current reviewed presentation text alongside its authoritative case/profile definitions, retaining the useful wording and grouping without the parallel digest catalog. A case without custom editorial copy uses its source title/purpose; it does not need a website code change.

Replace `website/src/lib/release-evidence/source-materializer.ts` and the evaluator-aware parts of the semantic/qualification loaders with a small prepared-data reader. Replace duplicated execution/retry/evidence schemas with the public presentation contract. Retain ordinary route formatting, Markdown rendering, labels, and component-level presentation logic in the website.

`evidence:prepare` owns download/integrity work and writes ignored prepared files. Stage both selected sections before publishing their prepared manifest; bind that manifest to the exact selection digest and reject a changed selection or stale prepared inputs. A failed preparation must not leave a mixed old/new presentation set. Website generation consumes those files plus current documentation and skill metadata. It does not import execution code, spawn Git, rerun qualification, calculate source compatibility, or fetch evidence in a visitor's browser.

Each evidence section presents its selected bundle as one consistent snapshot: its case list, definitions, summary counts, saved outcomes, tasks, criteria, replays, trials, projects, checks, source/patch downloads, and technical details. Adding, editing, or removing current case sources does not change that displayed snapshot. Newly authored cases remain discoverable by the runners and appear on the website only after selecting newer evidence containing them, without website registration. Do not merge today's test catalog into selected evidence or add missing-test notices for current-only cases. Preserve failures and pending outcomes actually recorded in the selected bundle. The recorded version and date provide context; no visitor run selector, separate historical browser, or current-versus-pinned coverage report is introduced.

Remove repeated preparation/build work from `website/scripts/generate.ts`, `package.json`, both Playwright configurations, and CI. Provide one preparation/build operation followed by integration and browser checks consuming that exact artifact. Standalone test commands must still prepare their prerequisites through the same owner, not a second implementation.

## Resource use and caching

Evidence records and runs can accumulate. Normal website preparation reads only the two selected bundles, not the entire local run history or release list. Existing paginated qualification status behavior remains bounded. The static publication is byte-bounded; oversized input fails before rendering rather than creating unbounded work.

Prepare one bundle at a time. Keep heavy artifact bodies out of the shared site-wide model; emit separate static downloads and per-page presentation inputs. Within a preparation operation, hash/read each unique artifact once and reuse computed maps. Use linear ID/path lookups where current joins repeatedly scan arrays. Do not increase model parallelism or add workers for speculative speed gains.

Cache downloaded compressed bundles under `.evidence/cache/`, keyed by their full selected digest. Verify cached bytes before use; partial downloads use owned temporary files and never replace a valid entry. Keep only the currently selected bundle set after successful preparation. The authoritative data is the published asset, not this replaceable cache. No TTL, database, shared cache, or global in-memory artifact registry is needed.

On a missing/corrupt cache entry, attempt the exact selected download with a documented finite timeout and cancellation. Use the existing process/network timeout conventions when applicable. Fail clearly on unavailable assets, corruption, unsupported format, or invalid references; never substitute latest or unrelated evidence. A failed build does not replace the last deployed static site.

## Ordered implementation strategy

These are ordered strategic steps, not an independently authorized milestone breakdown. Each step includes its directly affected tests and documentation.

1. Establish the shared development setup and portable/runtime build boundaries. Update manifests/configuration, consolidate installation, migrate common infrastructure to TypeScript, and relocate portable sources with colocated tests. Review generated-artifact behavior, dependency closure, excluded build inputs, and supported-runtime execution before proceeding.
2. Modularize the semantic runner and migrate all existing semantic cases to discovered case modules. Replace historical disposition/coverage bookkeeping with derived current metadata. Verify case identities, baseline setup, secrecy of criteria, budgets, diagnostics, confirmations, and fake-host end-to-end recording. Review that no case was dropped or behavior weakened.
3. Simplify qualification case discovery and split competing executor/contract responsibilities. Preserve exact candidate closure, Custom binding, compatibility claims, deterministic checks, and actor/judge controls. Verify an additional discovered case and adapter composition without fixed totals. Review the authoring workflow and domain boundaries.
4. Introduce local recorded-run storage and the shared public bundle contract. Adapt recording, status, resume, and current-schema reuse away from Git-committed result storage. Implement the semantic/qualification projections and round-trip bundle tests. Review data retention, sanitization, resource bounds, and every current evidence-view requirement.
5. Implement explicit publication, atomic independent pinning, verified retrieval, and preparation. Replace the old release envelope/authentication implementation and update release checks. Verify with local HTTP and GitHub-CLI test boundaries, without publishing to GitHub. Review the new operational commands and failure behavior.
6. Connect the existing website to prepared evidence. Preserve pages/components and move their evidence responsibilities to the established owners. Consolidate fixture builds and reuse one built artifact for checks. Review representative semantic and qualification pages in both themes, at mobile/desktop widths, and with keyboard navigation.
7. Complete the clean-slate removal, CI rewiring, documentation synchronization, and cross-boundary regression pass. Remove obsolete code/configuration/tests, old result trees, duplicated declarations/catalogs, and obsolete references. Review the final dependency graph, tracked file inventory, documented commands, and production cutover prerequisites.

Do not leave compatibility wrappers, duplicate loaders, a second fixture catalog, or an old test runner in the final implementation. Preserve unrelated source fixtures, calibration inputs that still justify active limits, public documentation, and protected instruction files.

## Verification and acceptance

Use colocated unit tests for case/selection validation, projections, status calculations, identity inputs, and confirmation decisions. Use integration tests for real filesystems, processes, artifact generation, recording, recovery, bundles, cache behavior, and website output. Stub only impractical external boundaries: paid model execution, GitHub publication, and network responses when needed.

Required focused coverage includes:

- Existing portable behavior and installation, including generated scripts executed without development dependencies; matcher imports/licenses; managed README output; malformed/escaped inputs; Windows/POSIX path semantics; and the supported Node matrix.
- New-case discovery, duplicate IDs, missing fixtures, setup failures, criteria isolation, and a synthetic case passing through each real producer-to-website path.
- Confirmation/retry decisions, interrupted checkpoints, exact stage reuse hits/misses, resource stops, cancellation, failed cases, and Custom/direct qualification composition.
- Bundle round-trip preservation of all tabs/downloads; deduplication; malformed metadata; missing or modified blobs; dangerous paths/content; truncation; decompression limits; and representative large inputs without timing thresholds.
- Independent semantic/qualification pin changes; atomic update failure; an older selected run after current cases change; no fallback to current/latest; saved version/date correctness; and failing release assurance remaining visibly failed.
- Selected-run-only browsing in both evaluation paths: select bundle A, add a case to the current suite, and verify that runner discovery includes it while the website retains A's case list, counts, status, and evidence without a current-only case route or missing-test notice. Record a new run through the fake external host and pack bundle B containing the new case; verify it appears only after B is selected and prepared. Reselect A and verify the new case disappears while A's recorded details remain intact. Editing or removing current case sources must likewise leave A's presentation unchanged. These checks require no website catalog edits.
- Publication retry after partial upload, existing matching/conflicting assets, failed upload/publish, unavailable assets, cache hit/miss/corruption, cancellation, and no secret-bearing diagnostics.
- Website rendering with no evaluator imports or Git history available; working local artifacts and base paths; all existing main routes; replays/projects/technical disclosures; source downloads; search/sitemap/canonical metadata; copy controls; keyboard/focus behavior; widths down to 320px; light/dark themes; and reduced-motion behavior.
- Test category isolation, test typechecking, and exclusion of every test category from distributed scripts and website output.

New tests include `src/semantic/cases/loader.test-integration.ts`, `qualification/src/profiles/loader.test-integration.ts`, and colocated unit/integration files beside the evidence bundle, selection, GitHub, and preparation implementations. Move existing tests with their actual owners. Preserve website component E2E locations and names.

After implementation, the root verification sequence is:

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

Run the granular test commands first while developing the affected boundaries. The final `npm test` verifies the composed correctness command and may replace redundant reruns once category isolation has been established for unchanged inputs. Preflight/dry-run commands must not invoke paid models. Where existing qualification preflight needs package-registry access or sandbox prerequisites, report environmental limitations separately from test failures.

With real new bundles published and selected, additionally run:

```bash
npm run evidence:prepare
npm run website:check
npm run website:build
npm run release:check
```

Before real evidence exists, integration/E2E tests build the unchanged site using explicit synthetic bundles in an isolated output directory. Synthetic mode must never be accepted by the production Pages workflow or release checks. Passing those tests does not establish fresh semantic/qualification assurance.

Acceptance requires all scoped correctness checks to pass, preserved portable/public behavior, no fixed suite totals or website case-registration requirement, reproducible generated artifacts, working independent old-run pins, unchanged website sections/design, and no old implementation remaining beside its replacement. Report unexecuted OS/runtime/network/real-evaluation checks explicitly; do not claim measured performance gains.

## Cleanup, documentation, and cutover

Remove the existing tracked outputs under `qualification/results/` and `fixtures/semantic-evaluation-results/`, `fixtures/semantic-evaluation-result.json`, `fixtures/release-evidence.json`, and obsolete Git-based reuse-source manifests. Inspect exact tracked targets before removal and do not remove protected instructions or excluded-directory contents. Remove abandoned identity receipts/checkpoint expectations tied to the old paths; new active local execution state is not automatically discarded during ordinary operation.

Keep Git history and existing published releases intact. Removing active-tree files will reduce current checkout clutter, but it will not erase their historical Git storage.

Update `.gitignore`, the root README/Project blueprint, `qualification/README.md`, `website/README.md`, `docs/semantic-evaluation.md`, `docs/adapter-qualification.md`, and `docs/release-evidence.md`. Synchronize directly affected compatibility, local-tooling, example, and development-command references. Keep `/docs` reserved for concise durable concepts/workflows, with detailed operator guidance in the owning README where appropriate. Preserve public documentation sections and URLs.

Update `.github/workflows/conformance.yml`, `release-candidate.yml`, `website.yml`, and `pages.yml` for new source paths, one installation, explicit generated helpers, selected bundle preparation, and artifact reuse. Keep existing package-manager candidate checks, Pages destination, custom domain, SEO submission, and non-publishing PR permissions. This plan adds no automatic evidence publication workflow or repository-settings change.

The initial selection is unselected until fresh runs are available. Production evidence preparation/deployment fails clearly in that state. The last deployed website remains available. The maintainer then runs fresh semantic evaluation and qualification, publishes bundles, selects them, and validates the production build before deploying the refactor. Paid runs and external publication/deployment are separate explicit operator actions.

Rollback is a source/deployment rollback before cutover, or selecting a previously published new-format bundle afterward. No destructive remote cleanup or old-format migration is required. Breaking the display format in some future project would be a separate explicit change; this refactor does not build an indefinite compatibility framework.

At completion, inspect protected guidance without editing it. Provide a separate coding-instructions handoff only if the completed architecture reveals a durable gap not already covered. No database migrations are involved.

## Approval required

Approval is required to implement the TypeScript/Vitest/workspace standardization; root tooling/module refactor; semantic and qualification case-discovery improvements; clean-slate local recording and GitHub Release evidence workflow; independent maintainer pinning; prepared-data website integration with its existing sections, design, and evidence functionality preserved; scoped efficiency improvements; and the accompanying removals, tests, documentation, and CI updates.

Approval does not authorize paid model runs, publishing release assets, changing repository settings, deployment, committing, or pushing. No implementation has started. A milestone breakdown, if requested, will be derived from this plan separately.
