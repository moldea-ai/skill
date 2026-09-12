# Plan: Complete the `moldea` Evidence experience and publish the corrected skill release

## Task contract

Complete the already-started `moldea` release work by correcting the evidence-data defect exposed after `v5.0.2`, redesigning the skill website's complete Evidence experience, synchronizing the directly affected specification and documentation contracts, and publishing one fully verified replacement release.

This work remains grounded in the problems that caused the release-5 redesign: unrelated repository work activated `moldea`, the skill and CLI consumed excessive time, tokens, output, memory, and local resources, canonical context overwhelmed agent workflows, maturity metadata incorrectly blocked official runtime selection, evaluation work was repeatedly restarted, and public evidence became difficult to understand. The completed product must preserve the selective, bounded, read-only skill while making its proof understandable to non-technical visitors. The website must show that `moldea` gives coding agents durable context and verification without competing with or replacing them.

The immediate release defects are concrete:

- signed tag `v5.0.2` points to the merged release commit, but no GitHub Release was created;
- the website authenticates pinned semantic and qualification evidence but retains only compact counts and raw GitHub URLs in its release-facing model;
- pinned semantic attempts therefore have no generated replay route, and pinned qualification profiles have no generated human-readable attempt, journey, project, or diff routes;
- adapter cards lead to a technical profile page that separates the direct adapter attempt from the shared Custom baseline instead of showing one effective qualification result;
- the evidence landing, semantic, and qualification pages lead with release provenance and implementation vocabulary rather than value, realistic examples, and visible outcomes;
- the qualification Project tab's custom patch rendering is not a reliable visible proof of the recorded repository change;
- existing tests accepted raw source links as sufficient and did not require pinned and fresh evidence to expose the same human-readable primary experience.

The implementation must remain a clean current design. It must not copy historical attempt stores into the current repository, add client-side GitHub fetching, retain parallel pinned-only pages, fabricate fresh attempts, relabel pinned evidence as fresh, introduce a legacy schema adapter, or rerun paid semantic evaluation or adapter qualification. The previously authenticated semantic and qualification evidence remains the model-derived release evidence because the portable skill behavior is unchanged.

## Current state and repository evidence

### Completed work preserved

- The earlier five cross-repository milestones remain completed and published. Platform, packages, and knowledge-base contracts establish explicit initialization, selective activation, minimum-only best-effort runtime eligibility, content-free bounded CLI inspection, reusable evidence pins, diagnostic batching, recovery-aware evaluation, and shared-plus-adapter qualification.
- Skill `development` is clean at `db887415`, matching `origin/development`. `origin/main` is `cc4f67c8`, the merge commit for pull request 16.
- Signed tag object `d727cba2` provides `v5.0.2` and resolves to `cc4f67c8`. The tag and deployed website exist, but the public GitHub Releases collection does not contain `v5.0.2`; publication was therefore incomplete.
- The authenticated semantic source attempt is `20260911T014030371Z-semantic-09da55eb` at commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`. It contains 74 cases: 70 direct passes, 4 recovered passes, 0 failures, and 0 pending cases.
- The authenticated qualification source is release `v5.0.0` at commit `c3416c52ae69a3f26d2e38c07ba98aa8531e358d`. It contains one passing source attempt for each of 14 profiles. Each non-Custom profile's effective result is the 12-journey shared Custom baseline plus 2 adapter-specific journeys.
- The source semantic attempt and evidence occupy about 1.7 MiB. The complete qualification source results occupy about 13.6 MiB across 2,780 files. These are evidence-store measurements, not repository-size limits.

### Skill website implementation

- `tooling/release-identity/release-evidence-source.mjs` already resolves immutable tags and commits, restricts repository-relative paths, reads Git objects without checking them out, authenticates semantic and qualification descriptors, validates their digests, and enforces individual read limits.
- `website/src/lib/release-evidence/loader.ts` converts authenticated pinned evidence into compact public projections. It exposes counts, timestamps, package versions, and raw GitHub URLs but not full attempt models.
- `website/src/lib/semantic-evaluation/loader.ts` and `website/src/lib/qualification/loader.ts` already validate and transform complete filesystem-backed attempt stores into the human-readable models used by the replay, project, and evidence components.
- Static routes under `website/src/pages/evidence/**` are generated only from current-tree attempts. The current tree intentionally contains no copied source attempts, so pinned replay and project pages cannot exist.
- `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro` presents profile and provenance before journeys. The deeper attempt route renders only one direct attempt, while shared Custom evidence is presented separately.
- `website/src/components/qualification-project-evidence/qualification-project-evidence.astro` uses a custom line-by-line patch surface even though `@moldea.ai/website-ui` already exposes `CodeBlock` and `FilePreview`.
- GitHub Pages checks out full Git history with `fetch-depth: 0`, so authenticated source blobs are available at build time without network requests or persistent duplication.

### Design-system and product evidence

- The packages website demonstrates the desired presentation pattern: concise plain-language promises, recognizable files, visible mismatch or connection, clear outcome, and optional technical detail.
- `@moldea.ai/website-ui` already provides the relevant Astro foundations: `Accordion`, `CodeBlock`, `ConnectionLabel`, `Dialog`, `EvaluationReplay`, `FilePreview`, `ResultSummary`, `StatusBadge`, `TabbedPanels`, navigation, theme, and layout primitives.
- No missing reusable cross-site primitive is currently established. Evidence-domain composition belongs in the skill website. The packages repository therefore requires no implementation or release unless later evidence proves a genuinely reusable primitive is missing; that would require plan revision before expanding scope.
- `@moldea/app-ui` is the React design system for platform applications. It was reviewed for current design direction but must not be imported into or copied by the Astro skill website.
- Platform `DESIGN.md` and `docs/branding.md` require lowercase `moldea`, precise and calm language, realistic evidence, hierarchy before decorative panels, technical detail through progressive disclosure, 320 px support, accessible semantics, both themes, and reduced motion.
- Platform `moldea/context/agent-skill.md` says a pin copies no attempt payload into the compact release envelope and never presents reused evidence as fresh. It does not yet state that a public static build may read the authenticated immutable source bodies to render the same human-readable evidence experience.
- The platform working tree currently contains unrelated uncommitted application work owned by another agent. Any platform specification edit must be isolated from that work and must not stage, commit, reset, clean, or otherwise include it.

## Desired final behavior

### Evidence information architecture

- The Evidence landing page answers one visitor question first: how does `moldea` help a coding agent produce work that stays aligned with the project?
- It presents semantic evaluation and adapter qualification as two complementary, plain-language proof paths:
  - semantic evaluation checks whether the skill guides a coding agent through realistic decisions and repository tasks;
  - adapter qualification checks whether that behavior remains reliable in supported coding environments and real project layouts.
- Each proof path includes a realistic visual sequence with a developer request, the coding agent's work, the repository evidence, and the independently verified outcome. Essential meaning is visible without interaction. Optional methodology and raw artifacts remain accessible deeper in the experience.
- Release provenance never appears as a large panel above the page's primary content.

### Semantic evidence

- The semantic index uses a short description, a clear 74-of-74 result, approachable group summaries, and a visible path to the verified source attempt.
- The attempt card in the history section carries a concise pinned-source note when applicable. The primary page does not require visitors to understand evidence pins before understanding the result.
- Selecting the source attempt opens a local human-readable attempt page with all recorded scenarios and replay data. Raw GitHub JSON is available only as secondary technical provenance.
- Fresh and pinned attempts use the same attempt route, card, replay component, status language, and primary layout. Provenance changes only the compact source note and technical disclosure.

### Adapter qualification evidence

- The qualification index uses a short explanation of the value of qualification, then presents 14 implementation cards with clear journey counts and verified outcomes.
- Selecting an adapter opens its release-effective qualification result directly. The primary page combines the 12 shared Custom journeys and the adapter's 2 direct journeys into one 14-journey result. Custom itself shows its 12 universal journeys.
- The combined page leads with journeys and their visible outcomes. Shared-versus-direct ownership, compatibility claims, package closure, retries, model settings, source commits, and raw artifacts remain available in a secondary technical disclosure.
- There is one canonical effective qualification composition for current and pinned evidence. The primary experience and layout do not change based on freshness.
- Each journey exposes a readable replay and project view. A changed project shows a legible syntax-highlighted diff and affected files; an unchanged project states that no files changed without presenting an empty or broken code panel.

### Source integrity and resource behavior

- Pinned full evidence is loaded only during static generation from its already authenticated immutable Git commit. The visitor's browser performs no GitHub or evidence-data request.
- The compact release envelope remains compact. Historical attempt bodies remain in their original Git commit and are not copied into the current tree, release envelope, generated source fixtures, or another evidence registry.
- Build-time source access is limited to the exact source inputs derived from the authenticated envelope. Semantic hydration may read `package.json`, `package-lock.json`, `moldea/**`, `fixtures/conformance-cases.json`, `fixtures/semantic-evaluation-coverage.json`, `fixtures/semantic-evaluation-result.json`, the selected semantic `latest.json`, and the selected attempt directory. Qualification hydration may read `fixtures/resource-calibration.json`, `qualification/cases/**`, `qualification/profiles/**`, each selected target's `latest.json`, and only the selected attempt directory named by that target descriptor. Paths are normalized and contained; traversal, absolute paths, backslashes, symlinks, gitlinks, submodules, unsupported modes, duplicate paths, missing blobs, unexpected objects, unselected histories, and digest mismatches fail closed.
- One build process hydrates each selected source once and reuses the resulting website model across route generation. It does not execute one Git process per evidence file or reload the source for every page.
- The source reader uses a bounded batched Git-object operation with an 8,192-file ceiling, a 16 MiB individual-file ceiling, and a 64 MiB aggregate source-byte ceiling. These values provide measured headroom over the current 2,780-file, 13.6 MiB qualification source without turning a static-site build into unbounded repository traversal. They limit the selected evidence store, not the size of a user's repository or codebase.
- Any temporary build projection uses the operating system's temporary directory, contains only authenticated regular files, remains within the same budgets, and is removed in a `finally` path. No evidence cache is retained in the repository.
- The complete website build runs successfully under a 512 MiB Node old-space ceiling and records its observed maximum resident set size as separate diagnostic evidence. A second successful build under a 384 MiB old-space ceiling demonstrates 25 percent operational heap headroom without incorrectly comparing process RSS with V8 old-space capacity. The selected source is hydrated once per process. If the unchanged baseline cannot pass these ceilings, measure its smallest stable ceiling before implementation and revise this plan from the observed baseline rather than hiding the failure or weakening source validation.

## Architecture and ownership

### Authenticated immutable source reader

- Extend `tooling/release-identity/release-evidence-source.mjs` and its declarations with one bounded, repository-root-scoped Git evidence reader that enumerates only the exact source files and selected attempt directories listed above and reads their blobs in a batched operation.
- Keep tag resolution, commit identity, release-envelope validation, portable-skill validation, result status, artifact digests, resource limits, and attempt linkage in the existing release-identity authority. Do not create a second trust decision in the website.
- Return or materialize only authenticated files needed by the existing semantic and qualification website loaders. The reader must expose observed file and byte counts for tests and diagnostics but must never print evidence bodies.
- Reuse the current loader and transformer contracts after establishing an isolated source root. Avoid a broad rewrite of the semantic and qualification loaders into parallel Git-specific implementations.
- Rebind source and raw-artifact URLs produced from the isolated root to the authenticated source commit. No pinned human-readable page may point at `main` for an immutable source artifact.

### Selected release evidence model

- Replace the compact-only pinned presentation path in `website/src/lib/release-evidence/**` with one selected release-evidence model that contains:
  - provenance identifying fresh or pinned source;
  - the complete validated semantic attempt model selected for the release;
  - each qualification profile's complete validated direct source attempt and, when applicable, its exact bound Custom baseline;
  - one derived effective qualification attempt whose journey order and counts are deterministic.
- Current attempts remain current facts, and authenticated pinned source attempts remain pinned facts. Selection chooses a source for display without mutating either history or vocabulary.
- Fresh current evidence takes precedence when it exists and passes the existing current-contract checks. Otherwise, the authenticated pinned source supplies the same presentation model.
- Keep public routes and search records derived from the selected model. Do not expose evidence transcripts through `llms.txt` or search-index records.

### Evidence routes and components

- Redesign `website/src/pages/evidence/index.astro`, the semantic index, the qualification index, and their attempt/profile pages around progressive disclosure.
- Remove the top-level `ReleaseEvidenceNotice` panels from the Evidence section. Replace them with a compact source note inside attempt history or a lower technical-details section.
- Refine `EvidenceOptionCard` and add only focused skill-owned visual composition components required to depict the developer request, coding-agent activity, repository evidence, and result.
- Generate semantic attempt routes for the selected pinned attempt as well as current attempts.
- Make the existing adapter profile route `/evidence/qualification/[adapterId]/[implementationId]/` the one canonical release-effective qualification page. Qualification cards link directly to it. The page renders the selected direct attempt plus its bound Custom baseline as one ordered journey collection and lists the contributing attempt identities only in technical provenance.
- Remove the now-redundant qualification `/attempts/[attemptId]/` route, its direct-attempt-only page, baseline-only primary links, stale breadcrumbs, and route-specific tests. Historical attempt identities remain available in the canonical page's technical section and immutable raw source links; no parallel human-readable qualification route remains.
- Reuse `EvaluationReplay`, `TabbedPanels`, `FilePreview`, `CodeBlock`, `ResultSummary`, `StatusBadge`, `Accordion`, and existing site-shell primitives through `@moldea.ai/website-ui` public entry points.
- Replace the custom patch-line renderer with `CodeBlock` using the `diff` grammar inside the existing project/file composition, or keep a local renderer only if focused implementation evidence proves that the shared component cannot present the required accessible diff. Any such exception requires plan revision.

### Documentation and specification ownership

- Update skill `README.md`, `docs/release-evidence.md`, `docs/semantic-evaluation.md`, and `docs/adapter-qualification.md` so public evidence is described as one human-readable experience for fresh or pinned sources, with provenance disclosed secondarily and no copied attempt store.
- Update only the directly affected platform specification in `moldea/context/agent-skill.md`. State that a release website may build human-readable pages from an authenticated immutable source while keeping the release envelope and current tree free of copied attempt payloads. Preserve the best-effort runtime policy and all unrelated platform specifications.
- Make the platform specification change in an isolated branch/worktree based on the intended remote branch so concurrent unrelated changes in the existing platform worktree are neither read as task content nor included in publication.
- Do not change packages website code, `@moldea.ai/website-ui`, platform website code, or `@moldea/app-ui` unless a concrete missing shared contract invalidates the current evidence. Such a discovery requires autonomous re-planning before expanding scope.

## Public contracts and release effects

- The corrected release is `5.0.3`. `v5.0.2` already exists and must not be moved or silently rewritten.
- The portable skill behavior must remain byte-for-byte equivalent after normalizing its two release-version markers. If any other portable byte changes, stop release reuse and re-plan before publishing.
- Semantic and qualification evidence remain independently pinned to their authenticated original passing sources. The new release reason must state that the changes affect website loading and presentation, not evaluated portable behavior.
- Pinned evidence is never called fresh, current-contract, newly evaluated, or equivalent. Freshness appears as provenance, not as a different primary experience.
- No runtime API, CLI schema, repository format, adapter package, compatibility matrix, maturity publication, or packages website contract changes.
- No new npm release is planned. No `website-ui` release is planned because the existing public package surface is sufficient.
- Existing historical Git evidence remains immutable. No current-tree legacy copy, compatibility bridge, fallback reader, hidden administrator path, or duplicate evidence store is introduced.

## Ordered implementation steps

1. Revise the current plan and invalidate its old milestone 6 breakdown because compact projections and raw links no longer satisfy the observed website requirement.
2. Synchronize the platform agent-skill specification in an isolated worktree and publish only that focused change after review.
3. Implement the bounded batched Git evidence reader and source materialization boundary, including path, mode, count, byte, cleanup, authentication, and no-body-output tests.
4. Build a single selected release-evidence model by loading authenticated pinned semantic and qualification attempts through the existing validators and transformers, then derive deterministic effective qualification attempts.
5. Redesign the Evidence landing, semantic, qualification, adapter, attempt, replay, project, and technical-provenance surfaces with concise copy, realistic visuals, progressive disclosure, and shared `website-ui` primitives.
6. Remove superseded top notices and separated baseline/direct primary flows. Repair project diff presentation and make fresh and pinned primary page structures identical.
7. Update unit, integration, artifact, and browser coverage so the exact pinned release requires local replay, project, journey, and diff pages rather than raw-link-only success. Synchronize state-bearing skill documentation.
8. Update release identity to `5.0.3`, pin both evidence domains to the accepted source evidence, verify the normalized portable behavior digest is unchanged, and run the complete deterministic release boundary without paid model execution.
9. Review and publish the exact candidate through `development` and `main`, create and push signed tag `v5.0.3`, create the actual GitHub Release, verify its public API/page and installation path, wait for Pages and conformance workflows, and inspect the deployed Evidence experience on mobile and desktop in both themes.

## Tests and verification

### Focused source and model tests

- Unit-test repository-relative path validation, explicit prefix containment, deterministic ordering, duplicate paths, unsupported Git modes, individual-file limits, aggregate limits, and file-count limits.
- Integration-test batched Git reads from temporary repositories, including missing objects, invalid tags, tampered descriptors, wrong digests, cleanup on success, and cleanup on failure.
- Assert that no test or diagnostic prints evidence bodies and that each selected source is hydrated at most once per website generation.
- Load the real authenticated semantic source and require one complete 74-case human-readable attempt with replay data.
- Load the real authenticated qualification source and require all 14 profiles, the 12-journey Custom result, and a deterministic 14-journey effective result for every non-Custom adapter.
- Test current-over-pinned selection without merging histories or changing provenance.
- Test that search records and `llms.txt` contain routes and summaries but no replay transcript or project-file bodies.

### Website behavior tests

- Require no top release-evidence panel on Evidence, semantic, qualification, adapter, or attempt pages.
- Require concise, plain-language semantic and qualification descriptions and visible explanations of what each proof protects.
- Require the Evidence landing visuals to show a developer request, coding-agent work, repository evidence, and a verified outcome without interaction.
- Require a pinned semantic attempt card to link to a local attempt route with all 74 scenarios and usable replay content.
- Require qualification cards to link directly to a combined effective result. For non-Custom adapters, assert 14 unique journeys with 12 shared and 2 direct; for Custom, assert 12.
- Require a changed project journey to expose non-empty, visible diff content and affected filenames. Require an unchanged journey to render an explicit no-change result.
- Run the same route-structure assertions against the repository's fresh-evidence test fixture so fresh and pinned evidence differ only in provenance labels and technical metadata.
- Preserve keyboard-operable tabs and disclosures, semantic headings and landmarks, accessible names, visible focus, and axe checks.
- Inspect 320 px, tablet, and desktop layouts for horizontal overflow, text density, table and code readability, and touch targets.
- Inspect light and dark themes. Any added motion must be small, optional, and disabled or reduced through the existing reduced-motion path.

### Repository verification

Run focused checks during implementation, then run the complete non-model release boundary:

```bash
npm run managed-readme:check
npm run test:unit
npm run test:integration
npm run eval:semantic:preflight
npm run qualification:dry-run:all
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run path:check
npm run website:check
npm run release:check
```

Do not run `npm run eval:semantic -- --record`, a paid semantic diagnostic batch, `npm run qualification` without `--dry-run`, or any other model-backed actor or judge stage.

For the platform specification milestone, run the platform's focused documentation formatting and canonical-state checks without touching unrelated worktree changes. For the final website, run the browser suite and inspect the built and deployed pages with JavaScript enabled and disabled where the existing static contract requires it.

## Publication and deployment

- Publish the isolated platform specification change through its normal reviewed branch path without including the other agent's uncommitted platform files.
- Publish skill milestones to `origin/development` only after their exact reviewed state is ready. Merge the exact reviewed development commit into `main` through the authorized repository workflow.
- Create signed annotated tag `v5.0.3` only after the merged `main` tree matches the reviewed release candidate and passes release identity checks.
- Push only the exact tag. Confirm the tag signature and target commit.
- Create a GitHub Release for `v5.0.3` with concise release notes describing the restored human-readable evidence and Evidence redesign. Do not declare publication complete based on a tag alone.
- Verify the release through the public GitHub Releases page and API, the reproducible tagged installation command, tag conformance, Pages deployment, live release version, local replay routes, adapter journeys, project tabs, and visible diffs.
- Do not create a retrospective `v5.0.2` GitHub Release merely to conceal the missed publication step. `v5.0.3` is the first release declared complete by this corrected workflow.

## Failure handling and rollback

- If immutable source authentication fails, stop. Do not weaken validation, copy unverified bodies, or substitute current definitions for missing source evidence.
- If the authenticated source exceeds a stated build budget, report the observed count or bytes and revise the limit from measured evidence before changing it. Do not truncate a passing attempt or emit a partial site.
- If temporary source cleanup fails, fail the build with the exact temporary path and error. Do not silently accumulate evidence caches.
- If a current and pinned source disagree, current evidence may take display precedence only when it passes existing current-contract validation. Provenance must remain separate.
- If a shared `website-ui` primitive cannot meet the diff or visual requirement, stop and revise the plan before changing the packages repository or publishing a package.
- If platform concurrent work prevents an isolated clean commit, preserve it and resolve the isolated branch/worktree problem before release publication. The synchronized specification is a release barrier; do not tag `5.0.3` while it remains unpublished, and do not include or discard unrelated files.
- If any non-version portable skill byte changes, the prior evidence reuse decision is invalid. Return to planning before any paid run or release publication.
- Before tag creation, ordinary corrections may be committed normally. After `v5.0.3` is public, do not move the tag, rewrite its commit, or add a compatibility path to hide a release defect.

## Risks and controls

- **Historical evidence becomes a hidden runtime dependency.** Hydration occurs only at static build time from the checked-out full Git history. The deployed site is self-contained.
- **Git traversal becomes slow or unbounded.** Use explicit prefixes, one deterministic listing, batched object reads, one hydration per source, and measured file and byte ceilings.
- **Pinned evidence looks newly evaluated.** Keep a concise pinned-source note and detailed provenance, but never change the primary journey experience or call the evidence fresh.
- **The UI becomes attractive but vague.** Every visual is derived from real recorded requests, repository states, attempts, and verdicts. Avoid invented dashboards and unsupported claims.
- **Technical detail overwhelms non-technical visitors.** Put journeys and outcomes first; place methodology, packages, commits, model settings, retries, digests, and raw files in secondary disclosures.
- **A useful technical route is removed accidentally.** Inventory the qualification attempt route, its inbound links, sitemap/search entries, and tests before removing it; preserve its technical information on the canonical profile page and update all internal consumers atomically.
- **Fresh and pinned rendering diverge again.** Use one selected model and shared page components, then run the same primary-structure tests for both source modes.
- **Concurrent platform work is bundled.** Use an isolated worktree and exact branch state for the specification change. Never run complete-worktree publication in the dirty shared platform checkout.
- **Publication is mistaken for tagging.** Treat a visible GitHub Release, verified tagged install, passing conformance, and deployed website as separate mandatory barriers.

## Acceptance criteria

- A non-technical visitor can understand what semantic evaluation and adapter qualification prove from the first Evidence screen without reading methodology or provenance.
- The Evidence landing and subpages use concise copy, realistic visual examples, clear hierarchy, `moldea` branding, and progressive disclosure.
- No Evidence page begins with a release-provenance panel.
- Pinned semantic evidence opens a local human-readable 74-case attempt and replay experience.
- Every adapter card opens one release-effective qualification result with all applicable journeys combined.
- Pinned and fresh primary pages have the same navigation, information architecture, replay, project, and result capabilities.
- Project changes and diffs are legible, non-empty when changes exist, accessible, responsive, and theme-safe.
- Technical provenance remains complete but secondary, including source release or commit, attempt identity, timestamps, package closure, raw artifacts, and pin reason.
- Pinned evidence is authenticated from immutable Git history within the explicit resource budgets, hydrated once, omitted from client-side network activity, and not copied into the current repository or envelope.
- The complete generated website passes under both the 512 MiB operational old-space ceiling and the 384 MiB headroom probe, source hydration occurs once, and peak RSS is recorded separately without treating it as V8 heap usage.
- Existing `website-ui` public components are reused; packages and app-ui receive no unnecessary implementation or release.
- Platform and skill documentation accurately describe build-time human-readable pinned evidence without contradicting the compact-envelope contract.
- All focused and broader deterministic verification passes. No paid semantic evaluation or adapter qualification runs.
- The normalized portable behavior digest for `5.0.3` matches `5.0.2`.
- The exact reviewed release is merged into `main`, signed tag `v5.0.3` is published, the GitHub Release exists publicly, tagged installation works, conformance passes, Pages deploys, and the live Evidence experience is verified.

## Assumptions and developer decisions

- The implementation scope is the Evidence landing page and every semantic and qualification subpage needed for a coherent evidence journey. It does not redesign unrelated skill website pages.
- The packages website and platform website are design references, not edit targets. `@moldea.ai/website-ui` is the implementation dependency for the skill website; `@moldea/app-ui` remains platform-only.
- The user has authorized the complete autonomous plan, challenge, breakdown, implementation, review, correction, merge, release, and deployment sequence for this exact scope.
- The user has explicitly prohibited another paid semantic evaluation or adapter qualification for these presentation-only changes. Prior evidence reuse is mandatory unless portable behavior changes.
- No developer decision remains open before breakdown.

## Execution scope

Preserve the completed release-5 behavioral and package work; update the platform agent-skill specification in isolation; implement bounded build-time hydration of authenticated pinned evidence; create one fresh-or-pinned selected evidence model; redesign the complete skill Evidence experience around concise, realistic journeys and progressive disclosure; restore local semantic replay and combined adapter qualification/project/diff pages; remove superseded technical-first presentation; update directly affected tests and documentation; preserve normalized portable behavior and prior evidence; and publish and verify `moldea` skill `5.0.3` as a signed tag, actual GitHub Release, passing conformance build, and deployed website. Do not modify or release packages, app-ui, unrelated platform work, historical evidence, runtime contracts, or paid evaluation outputs unless repository evidence forces an explicit autonomous re-plan.
