# Evidence website redesign and shared reading controls

## Objective and scope

Make the skill website explain why teams adopt `moldea`, beginning with evidence visitors can understand visually. The central message is: **Give your coding agent project knowledge it can keep checking as the code changes.** Show the maintained knowledge, recorded connections, and repeatable checks that the skill supplies. Explain these responsibilities without claiming that an unassisted coding agent cannot perform them or that the evaluations measured comparative superiority.

The implementation covers:

- `/evidence/`, `/evidence/semantic/`, semantic attempt pages, `/evidence/qualification/`, and individual qualification pages.
- Inline-code treatment of visible `moldea` text throughout the skill website, including shared search and documentation navigation.
- Copy buttons for code blocks, enabled by default with an author-controlled per-block opt-out, implemented in the shared Website UI package and adopted by both public Astro websites through their layouts.
- The shared package's release preparation, consumer dependency update, directly affected documentation, and verification.

The landing page's messaging, examples, and composition remain a later project. Its only changes here are brand formatting and shared copy behavior. Platform specifications, the React UI library, and the platform website are reference material, not implementation targets. No evaluation reruns, evaluator changes, recorded-result edits, provider API calls, Cloud features, analytics, new dependencies, or hosting changes are included.

## Repository evidence

Inspection is grounded in the skill README and website README; the requested platform specification, branding, UI, and website references; and the packages README, website, and Website UI sources. The platform's product foundation describes durable project knowledge, explicit relationships, task-relevant context, and deterministic inspection alongside coding-agent judgment.

At inspection, the skill worktree and packages worktree were clean. Their respective HEAD commits were `cf2e17a88ff24eef985a3a098f90acacb00ee4d8` and `0ed4cdb19d30b0a3477407692c52b4ebbaebf9d5`.

Relevant implementation facts:

- The websites use Astro 7.2.2, Tailwind 4.3.3, TypeScript 6.0.3, Vitest 4.1.10, and Playwright 1.62.1. The skill website uses npm; the packages repository uses pnpm.
- The skill website declares Website UI `^1.2.2` but resolves 1.6.1. Sibling source and the npm registry also report 1.6.1.
- Website UI already exports `Accordion`, `ActionButton`, `ActionLink`, `InlineBrandText`, `FilePreview`, `ConnectionLabel`, `ResultSummary`, `StatusBadge`, `TabbedPanels`, and `EvaluationReplay`. It owns the themes, typography, interaction states, Markdown sanitization, and code highlighting.
- The current evidence pages devote substantial initial space to metric panels. The overview includes illustrative success states that are not derived from the displayed attempt.
- Semantic presentation is owned by `website/src/lib/semantic-evaluation/`; qualification models and project comparisons are owned by `website/src/lib/qualification/`. Release-summary helpers distinguish fresh, pinned, and unavailable evidence.
- Qualification pages compose shared foundation cases with adapter-specific cases. Existing `AdapterCompanyLogo` covers the published providers and the custom target; detail headers do not use it.
- Markdown already supports `productNameTreatment: 'code'`. Shared breadcrumbs, documentation navigation, and client-rendered search results still render some product names as ordinary text.
- `renderCodeBlock` and Markdown rendering produce accessible `pre > code` regions. No shared clipboard control exists.
- Existing browser and artifact tests cover evidence routes, provenance, replays, accessibility, responsive layouts, themes, and qualification confirmation fixtures.

## Visitor experience

### Evidence overview

Use a compact introduction with the heading **“Keep the rules connected to the code.”** Follow it with one short explanation: “Your coding agent writes the change. `moldea` supplies saved project rules, connections to affected files, and checks you can run again.”

Remove the Decisions tested, Integrations tested, and Evidence path panels. Present two substantial visual sections with explicit links:

| Section      | Visitor question               | Visible example                                                                                                                                                               | Link                 |
| ------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Decisions    | What else needs to change?     | A refund-policy change affects the implementation, saved agent instructions, and their declared copy. Show the recorded connections and the checks expected after the update. | Explore decisions    |
| Integrations | Can it find what needs fixing? | An Anthropic tool reference disagrees with working source. Show the disagreement, the corrected reference, and the source files preserved.                                    | Explore integrations |

Make the refund example show three short, connected stages: **“Saved rules”**, **“Connected files”**, and **“Checks you can run again.”** Identify the saved refund instructions, their connection to `src/refund-policy.js`, and the declared instruction copy. Show the coding agent maintaining the affected meaning, followed by a software check of the project's structure and declared connections. Keep these responsibilities visibly distinct: a successful structural check does not establish that the refund behavior is correct.

Under the example, use the short explanation: “You can build and maintain these connections and checks yourself. `moldea` gives your team a shared system to reuse across changes.” This is the direct answer to the visitor's coding-agent objection. It must be visible with the example, not hidden in methodology or technical details. Show the maintained system that the skill supplies without inventing a failing coding-agent comparison, implying that a host cannot use project context, or promising automatic background enforcement.

Keep “Semantic evaluation” and “Adapter qualification” as secondary identifying labels. Explain each in ordinary language before presenting evaluation terminology. The invoice-boundary question remains a supporting semantic example rather than the overview's lead proof of differentiation.

Compose these examples from existing file, connection, and result primitives. Use small, readable excerpts and explicit labels such as “Example setup” and “What this checks.” A recorded verdict appears only when a matching published case is available, and comes from that record. Distinguish an expected action from an observed result.

Keep the essential explanation visible without opening anything. Offer a direct case link alongside the full evaluation link. Use separate actions rather than making the entire example an anchor, because code-copy controls must remain independent interactive elements.

### Semantic evaluation and attempts

Use one compact page introduction: **“Does it make the right call?”** Explain that these cases examine how a coding agent uses the skill when information is incomplete, instructions disagree, or a change affects existing project knowledge.

Replace Passed directly, Confirmed on retry, and Failed panels with a compact evidence-status line. Retain the complete breakdown with provenance in an optional details section. Failed, recovered, unavailable, and pinned states remain visible and accurately named.

Remove the extra “Open any decision from request to verdict” heading. Place **“Follow the decisions”** navigation directly before the case groups. Give each group a short explanation of the behavior tested and plain-language labels while preserving its stable ID and case membership.

Use the existing shared Accordion for cases, with one initial example open and compact summaries for the others. Summaries explain the situation and what the case checks. The existing Replay, Evidence, criteria, rationale, workspace changes, and trial provenance remain available.

Lead with the refund-maintenance case `adopted-relevance-changed-behavior`; retain the invoice-boundary case `initialize-partial-context` as a supporting example of focused clarification. The refund example shows an implementation change connected to agent instructions and their declared copy. Do not invent a refund amount or claim that every successful case necessarily ends with a valid project: the actual criterion also accepts accurately reported invalid results. The visual must label expected actions separately from the selected trial's observed actions and outcome.

Apply the same compact presentation to semantic attempt pages. Derive headings and status from that attempt; remove unconditional “verified result” language when its state does not justify it. Preserve attempt URLs, trial order, source revisions, and raw evidence links.

### Qualification directory and adapter pages

Explain an adapter once as **“Checks for the way your project connects to an AI service.”** Make clear that qualification exercises coding-agent maintenance work in fixture repositories and checks the resulting files. It does not demonstrate a live conversation with the provider or prove the project's AI agent ran successfully.

Replace directory metrics with a compact provider directory. Each entry has the existing company mark, recognizable integration name, one sentence describing its checks, and its truthful evidence status. Technical implementation IDs and package versions remain available in details.

On each adapter page:

1. Place its company logo beside the title, with a concise integration-specific introduction.
2. Remove the top metric panels; retain useful status and provenance in a compact line.
3. Keep “Follow the journeys” navigation and make adapter-specific cases the first chapter. Put shared foundation cases in a separate, clearly labelled chapter.
4. Show the problem, requested change, and recorded outcome before deeper replay and project evidence.
5. Preserve the existing Replay, Project, Evidence, and Technical content and all confirmation trials.

For Anthropic, use `repair-anthropic-tool-registration`: the source tool is `lookup_order`, while project context incorrectly names `find_order`. The case expects the context reference to change and working source to remain unchanged. Show an actual recorded result only when available.

Do not hide shared evidence or suggest that it was rerun independently for every adapter. The custom target retains its neutral icon and foundation journeys without an empty adapter-specific chapter.

### Visual and navigation rules

Reuse Website UI tokens, Ubuntu Sans typography, established surfaces, approved provider assets, and Lucide icons. Use a restrained heading scale, shorter introductory spacing, clear alignment, and diagrams that explain one connection at a time.

At 1440 × 900, the first substantive example or directory entry must be visible without scrolling past introductory material. At 320px, flatten outer panels, stack diagrams in reading order, wrap labels and filenames, and keep code overflow within its own region.

Chapter navigation uses ordinary anchor links with a labelled navigation landmark. It wraps on mobile and may sit beside content on large screens. Preserve existing group fragments and add document-unique case anchors. Deep links must reveal the target disclosure through the shared Accordion behavior.

Maintain one H1 per page, logical group headings, keyboard focus, accessible names, and text alongside status colors. Reuse the shared disclosure motion and reduced-motion behavior; add no decorative animation.

## Presentation ownership and evidence integrity

Keep generation, release selection, validation, and recorded artifacts authoritative. Add presentation-only metadata and small pure transformations within the existing semantic and qualification modules.

- Extend semantic group/case presentation metadata with concise summaries. Bind newly authored scenario-specific titles, summaries, and diagrams to the reviewed case-definition digest. Keep original scenarios, requested operations, criteria, and responses accessible as evidence.
- Add qualification presentation metadata keyed by adapter, implementation, and case identity, with a reviewed profile digest. Explain what each case tests without replacing its source task, assertions, or verdict.
- Extract the detail route's existing definition-to-attempt pairing into `qualification/presentation.ts` so overview previews and detail chapters share it. Preserve the existing mismatch failure rather than silently dropping cases.
- Reuse `getSemanticReleaseEvidenceSummary`, `getQualificationReleaseEvidenceSummary`, and `createQualificationProjectEvidence`. Do not introduce a second release selector or file-diff implementation.
- Select featured recorded examples only through the exact compatibility rules below. Use authenticated pinned definitions when evidence is pinned. If a featured case is absent, incompatible, or unrecorded, the overview may show a separately matched, clearly labelled example setup, but must omit an associated recorded verdict and direct replay link. If no available source matches the reviewed setup identity, use source-derived explanatory text instead of that scenario-specific diagram. Its full evaluation link remains available.
- Keep old attempts and unknown source-contract cases readable using their original source text and actual result when current editorial metadata does not apply. A presentation mismatch must never discard evidence, change its result, or make an authenticated record invalid.
- Present adapter-specific cases first without changing underlying evidence order, shared-baseline binding, attempt identities, or trial order.
- Keep changed-file illustrations explicit about their baseline. The existing Project view compares the starting fixture with the final project; do not relabel that as an actor-only patch.
- Reuse presentation summaries in generated search descriptions where relevant. Preserve routes, group anchors, search schemas, sitemap membership, and the exclusion of raw transcripts from search.

### Exact compatibility rules for editorial presentation

Reviewed digests are fixed values stored alongside the authored copy after inspecting the corresponding source. Do not calculate the expected digest from whatever happens to be current during each build, accept an ID match alone, or use `hasCurrentCaseDefinition` as proof that new copy describes a historical record. Generic evaluation/group labels do not need scenario identities; factual case-specific copy does.

For semantic cases, store `reviewedCaseDefinitionDigest` with the authored presentation entry. In `createCaseModel`, reuse the existing case-definition digest calculation and replay projection. A recorded case receives that presentation only when the source definition matches its replay, the case ID matches, and the source definition digest and `replayProjection.caseDefinitionDigest` both equal `reviewedCaseDefinitionDigest`. Current definitions use `createSemanticCaseDefinitionDigest`; authenticated historical definitions retain the loader's existing `createAuthenticatedJsonDigest` path. Do not validate historical definitions against a newer schema solely to render them. An unrecorded setup needs an exact reviewed-definition match but cannot receive a recorded verdict.

For qualification, reuse the existing `calculateCurrentProfileDigest` result already used by `loadProfile`; calculate it once for that loaded source, including an authenticated pinned source. Carry it as `sourceProfileDigest` on that source's case models so it follows shared foundation cases as well as direct cases. A recorded case receives authored presentation only when adapter/implementation/case identities match and both its source profile digest and its owning attempt's `result.provenance.profileDigest` equal the presentation's `reviewedProfileDigest`. Shared cases use the Custom baseline's identity and digest, not the adapter's. This deliberately conservative whole-profile match may require re-reviewing summaries after an unrelated profile-file change; it avoids introducing another fingerprint format or recursive scan. Author scenario claims from profile-owned scenarios, tasks, and fixtures covered by that digest, not unbound catalog or profile-README prose.

Perform these checks in the existing source-loading and presentation path before information reaches page components or search generation. Expose nullable, already-resolved presentation on the private website models; pages must not bypass the resolver with a direct registry lookup. On mismatch, case pages use source-derived text and the actual evidence status. The overview may use a separately labelled setup only when that setup's own available source independently matches its reviewed digest; it cannot attach the mismatching result. Otherwise it uses source-derived explanatory text. Search uses the same resolved copy or source fallback. Do not replace reviewed digests automatically to make tests pass.

Add regression coverage for a reused case ID with a changed scenario, task, or criteria; a mismatching reviewed digest; missing source identity; and a shared baseline paired with the wrong adapter digest. Also verify matching current and pinned evidence, an unrecorded setup, and fallback preservation of the original verdict and links. The generated website model may gain private presentation fields; recorded schemas, evidence identities, and release-selection rules remain unchanged.

All transformations run during the static build. Work is linear in the selected release's cases and profiles. Do not duplicate full replay payloads to create previews, introduce browser-side data loading, or add a separate cache. Existing build-model caching remains sufficient. The published release inventory is finite; this change adds no accumulating collection or pagination contract.

## Shared brand formatting and copying

### Inline product names

Use the existing `InlineBrandText` component for app-owned and shared textual labels, and the existing Markdown option for rendered documents and fragments. Cover headings, descriptions, breadcrumbs, navigation, previous/next links, search results, and search feedback.

In LocalSearch, build text and code nodes with DOM APIs. Never insert search text with `innerHTML`. Preserve search caching, request ordering, failure handling, links, and input focus.

Apply formatting to rendered prose without altering literal source, transcripts, filenames, commands, URLs, metadata, accessible-name attributes, input values, or logo artwork. Existing code elements already satisfy the code treatment and must not be nested.

Outside the evidence pages, changes are limited to missing brand formatting and shared copying. Do not rewrite the homepage or documentation content.

### Copy controls

Add a public `@moldea.ai/website-ui/code-copy-controls` Astro component, mounted once in each Astro website's BaseLayout. It owns enhancement of eligible rendered `pre > code` blocks, including Markdown, CodeBlock, file previews, and collapsed replay content. Inline code and file-tree labels do not receive buttons.

Copying is enabled by default, but page authors can omit the button on individual blocks. Add the optional `copyable?: boolean` prop to CodeBlock, defaulting to `true`. `copyable={false}` marks its wrapper with `data-code-copy="false"`. For rendered Markdown and other composed code regions, document the same opt-out marker on the individual `pre` or an author-owned enclosing element. Any such ancestor disables copying for its contained blocks; inner blocks do not override it. The initializer skips these blocks entirely, leaving no toolbar space, inert button, or extra focus stop. Text remains readable and selectable. Keep this a static authoring choice without adding Markdown fence syntax or a runtime toggle API.

Use the opt-out for illustrative or incomplete excerpts that do not offer useful text to copy. Keep runnable commands, reusable samples, and useful full source blocks copyable. Decide at the owning composition; do not infer the choice from language, length, or code contents.

Compose controls with the package's ActionButton and an approved copy icon. Put the control outside the code text in a compact toolbar so it never covers the first line or enters copied content.

The browser behavior must:

- Initialize on direct loads and Astro client navigation, once per eligible block, without duplicate listeners or controls. Preserve explicit opt-outs across navigation.
- Copy the selected block's complete displayed code using `textContent`, preserving indentation, blank lines, Unicode, and displayed line endings. Exclude toolbar labels, syntax markup, and unrelated panels. Do not trim or reconstruct code from visible line elements.
- Call `navigator.clipboard.writeText` only on activation. Keep the button's accessible name stable, announce “Copied” only after success, and provide concise failure feedback without losing focus.
- Handle unavailable clipboard support and rejected writes honestly. Keep text selectable and explain manual copying when automatic copying is unavailable. With JavaScript disabled, leave readable, selectable code without inert buttons.
- Avoid reading clipboard contents, persistent storage, network calls, deprecated copy fallbacks, or new permissions configuration.
- Remain usable in narrow containers and both themes, with no required animation.

Clipboard writes require a secure context and can be denied. Failure handling is part of the feature, not a successful copy state. See [MDN's Clipboard.writeText documentation](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).

Prefer one package-owned initialization script and one small reusable control template. Do not copy the behavior into either application or add a hydration framework, mutation observer, or polling loop for static page content.

## Files and integration boundaries

Paths below are relative to the skill repository unless prefixed with `../packages/`.

**Evidence routes and components**

- Keep all five route entry files under `website/src/pages/evidence/`, including dynamic semantic-attempt and adapter routes.
- Move each redesigned page's composition into a matching component directory: `evidence-page/evidence-page.astro`, `semantic-page/semantic-page.astro`, `semantic-attempt-page/semantic-attempt-page.astro`, `qualification-page/qualification-page.astro`, and `qualification-profile-page/qualification-profile-page.astro`, under `website/src/components/`. Follow the existing home-page pattern; dynamic routes retain static-path generation and typed props.
- Revise `evidence-option-card/evidence-option-card.astro` into the non-nested-interactive visual section described above, removing obsolete metric and question-list props.
- Revise `semantic-evaluation-case/semantic-evaluation-case.astro` and `qualification-case-evidence/qualification-case-evidence.astro` to compose shared Accordion and retain evidence tabs.
- Adjust `qualification-project-evidence/qualification-project-evidence.astro` only for the visitor summary and visual composition; preserve project comparison semantics.
- Reuse `adapter-company-logo/adapter-company-logo.astro`, `evidence-status/`, and existing technical/trial components. Change them only for required formatting or header sizing.

**Presentation and branding**

- Update `website/src/lib/semantic-evaluation/constants.ts`, `types.ts`, and `loader.ts` to store reviewed presentation identities and resolve nullable presentation using the existing source/replay digest checks. Extend `loader.test-integration.ts` for matching and mismatching current and pinned definitions.
- Add `website/src/lib/qualification/presentation.ts` and `presentation.test-unit.ts` for reviewed metadata, pairing, and compatibility resolution; expose externally consumed functions/types through that module's `index.ts` and `types.ts`. Update `loader.ts` to retain the already-computed source profile digest on case models and extend `loader.test-integration.ts` to verify it survives pinned and shared-baseline composition.
- Adjust `website/src/lib/generation/generation.ts` and relevant existing tests for resolved discovery copy and private presentation fields, without changing evidence selection or recorded evidence schemas.
- Update `website/src/components/documentation-page/documentation-page.astro` for title/description treatment, and audit other app-owned rendered labels. Any additional touched Astro file outside evidence must contain only a missing brand-formatting substitution or an intentional per-block copy opt-out.
- Update `website/src/layouts/base-layout.astro` to mount copy controls.

**Shared package and its existing consumer**

- Update `../packages/projects/website-ui/src/components/breadcrumbs/breadcrumbs.component.astro`, both documentation-shell components, and `local-search/local-search.component.astro` for text treatment. Apply the same component treatment to shared site-header labels where needed.
- Add `../packages/projects/website-ui/src/components/code-copy-controls/code-copy-controls.component.astro`; add its public export to `package.json`. Existing Astro source packing covers this file.
- Update `src/components/code-block/code-block.component.astro` for the optional `copyable` prop and opt-out marker. Change `src/styles.css` only if required to keep toolbar, wrapping, and plain/panel variants consistent. Retain Markdown sanitization and highlighting.
- Update `../packages/projects/website-ui/src/index.test-integration.ts` for the new packed export, isolated consumer build, branding, and version assertions.
- Update `../packages/apps/website/src/layouts/base-layout.astro` and its colocated browser tests for adoption and real-browser shared behavior. Do not redesign packages website pages.
- Update the package manifest, `../packages/pnpm-lock.yaml`, and the skill website's `package.json` and `package-lock.json` as described below.

**Tests and documentation**

- Move the three affected legacy evidence `_index.test-e2e.ts` suites beside their owning new page components; split adapter-detail and semantic-attempt cases beside those owners when necessary. Preserve useful existing coverage.
- Update `website/playwright.qualification-current.config.ts` for the relocated qualification fixture tests. Maintain category isolation and hard archive exclusions in affected test discovery configurations.
- Extend `website/src/layouts/base-layout.test-e2e.ts` for site-wide branding and copying, and `website/scripts/verify-build.test-integration.ts` for the revised artifact.
- Synchronize `README.md`, `website/README.md`, Website UI's README, and the packages website README only for changed ownership, public export, navigation, and setup behavior.
- Check `docs/semantic-evaluation.md`, `docs/adapter-qualification.md`, and `docs/release-evidence.md`; change only directly affected website descriptions if necessary. Evaluation methodology stays unchanged.

Remove superseded metric markup, repeated headings, unused imports, and obsolete assertions from touched paths. Retain useful metrics inside evidence details, not a second competing page design. No compatibility component or temporary local package fork remains in the final implementation.

## Implementation sequence and review checkpoints

1. **Shared reading controls.** Implement and verify brand formatting and copying in Website UI, its packed Astro consumer, and the packages website. Review keyboard behavior, hostile search text, copy fidelity, mobile layout, and themes before proceeding.
2. **Package release preparation and consumer validation.** Prepare Website UI 1.7.0, a compatible minor release for the new public component. Synchronize version assertions and lockfile. Verify the skill website against the exact packed candidate in a disposable checkout/install, without committing a local tarball dependency. Review the exported artifact and release scope.
3. **Evidence presentation.** Add reviewed presentation identities, compatibility resolution, and shared pairing logic. Rebuild the overview around refund maintenance and the Anthropic reference repair. Review the visible distinction between the coding agent's judgment and the saved rules, connections, and repeatable checks supplied by the skill. Verify same-ID definition changes cannot inherit an incompatible summary or diagram.
4. **Decision browsing.** Recompose semantic index and attempt pages, remove metric panels and repeated headings, and implement chapter/case navigation. Review preserved records, pinned evidence, direct links, and failed/recovered/unavailable states.
5. **Integration browsing.** Recompose the qualification directory and adapter detail pages. Put company identity and adapter-specific journeys first; retain shared provenance and complete project evidence. Review Anthropic, a second provider, custom, and the current-confirmation fixture.
6. **Consumer completion and quality review.** After the package is published through its separately authorized workflow, update the skill website's declared minimum to `^1.7.0` and resolve the released artifact in its lockfile. Finish site-wide brand formatting, documentation, full relevant regression checks, and visual review.

These are ordered implementation steps, not independently authorized milestones. A later `breakdown` can turn them into reviewable implementation scopes.

## Release, compatibility, and operational constraints

Website UI publication is a real cross-repository prerequisite. Preparing code and a reviewed tarball does not publish it. The packages repository publishes release-relevant changes when they reach `main`; pushing, merging, publishing, and deploying require subsequent explicit authorization.

Before implementation, confirm that 1.7.0 remains available. If another release occupies it, report the changed dependency state and agree the replacement version before changing manifests. Final consumer verification must use the released package, not workspace resolution, a manually patched installation, or a committed `file:` dependency.

Preserve existing package exports and CodeBlock behavior, adding only the optional `copyable` prop with its enabled default. Copy controls are an additive export with explicit layout adoption; the documented opt-out marker also supports authored Markdown containers. Existing component string props retain their types. Public evidence routes, base-path support, search structure, SEO identity, source links, and raw records remain compatible.

No database, migrations, backend authorization, environment variables, or new infrastructure are involved. Copy failure is local UI feedback; existing generation/validation errors continue to propagate. Do not introduce a new application exception family. If a touched error contract changes, synchronize its documented caller boundary in the same change.

Rollback consists of reverting the presentation/layout adoption and restoring the previous consumer dependency. Published npm versions remain immutable; any package correction requires a new release. Neither direction changes evaluation records.

## Verification and acceptance

No tests, generators, builds, dependency installations, or source edits are performed during this planning workflow.

During implementation, add focused tests only for meaningful behavior:

- Presentation pairing, chapter ordering, exact reviewed/source/record identity matching, and truthful current/pinned/unrecorded status. Cover same-ID changed definitions, wrong or missing digests, shared-baseline ownership, absent featured cases, recovered and failed trials, and the custom target. Confirm mismatches remove only incompatible editorial presentation, preserving original evidence, verdicts, and links.
- Stable group/case links, disclosure opening from a hash, keyboard tabs, no-JavaScript readability, and retained source/confirmation links.
- Safe shared brand rendering in search and navigation, including repeated product names, punctuation, hostile HTML, existing code, and unchanged search request ordering.
- Exact copied text for highlighted and unhighlighted code, blank lines, indentation, Unicode, HTML-looking strings, multiple blocks, long lines, nested disclosures, and client navigation. Verify rejection, unavailable API, repeated activation, focus retention, and absence of duplicate controls. Test the default and explicit `copyable={true}` behavior, `copyable={false}`, Markdown/container opt-outs, unaffected neighboring blocks, no reserved toolbar space or focus stop on omitted controls, and opt-out persistence across navigation. Literal opt-out-looking text inside code must not disable copying.
- Real browser integration through both applications and the packed package's isolated Astro build. Stub only the clipboard boundary for denied/unavailable cases; exercise a successful browser clipboard write where supported.
- Production artifact completeness, unique IDs, base-aware links, unchanged discovery exclusions, no shipped tests, and no accidental source/provenance mutation.

Run the established commands at their owning roots. Start with relevant granular tests while iterating, then complete these boundaries once the inputs are final:

From `../packages/`:

```sh
pnpm --filter @moldea.ai/website-ui test
pnpm --filter @moldea.ai/website-ui typecheck
pnpm --filter @moldea.ai/website-ui lint
pnpm --filter @moldea.ai/packages-website check
pnpm --filter @moldea.ai/packages-website test:e2e
```

From the skill repository:

```sh
npm --prefix website run docs:check
npm --prefix website test
npm --prefix website run typecheck
npm --prefix website run lint
npm --prefix website run format:check
```

The website test boundary includes production builds and artifact verification through its integration/browser scripts; do not repeat unchanged successful builds solely for reassurance. Run targeted Prettier on touched files using each repository's existing configuration before final checks. Inspect any generator-produced diff and retain only task-required changes.

Repeat the relevant browser/build boundary with `BASE_PATH` set to a non-root path through the execution environment. Verify moved test discovery with the specialized qualification fixture suite, preserve unit/integration category separation, and inspect production output for excluded test files.

Manually review the overview, semantic index/attempt, qualification directory, Anthropic detail, another provider, custom target, docs, and search at 320, 375, 768, and 1440px in both themes. Check reduced motion, focus visibility, accessible labels, contrast, content density, and code-copy placement. Run the existing axe checks on affected surfaces.

Acceptance requires:

- A visitor can distinguish decision testing from integration testing and understand one example without opening details.
- The lead refund example visibly identifies saved rules, connected files, and repeatable checks as the system supplied by `moldea`, with the short explanation that teams can otherwise build and maintain that system themselves. It distinguishes software checks from the coding agent's judgment without claiming measured superiority.
- The initial desktop view reaches substantive content; no large metric panels or adjacent competing section introductions remain.
- Each adapter detail has the correct company mark, meaningful first examples, and clear shared-evidence attribution.
- All recorded evidence and negative/qualified states remain reachable and honestly labelled.
- Newly authored scenario-specific summaries and diagrams appear beside recorded results only on exact reviewed/source/record identity matches. Same-ID changed definitions use source fallback; standalone reviewed setups cannot borrow their verdicts.
- Visible product-name prose uses inline code; literal evidence and machine-facing values remain unchanged.
- Copy-enabled code blocks can be copied in supported browser contexts, with accurate feedback and graceful manual selection otherwise. Author-opted-out blocks remain readable and selectable without a button, toolbar space, or extra focus stop.
- Both websites remain responsive, accessible, theme-correct, and functional under client navigation.
- The released dependency, documentation, and required checks match the final implementation.

Review the final diff in both repositories, preserve unrelated changes, and report actual checks and any limitations. Protected coding instructions already cover the relevant durable guidance; do not modify them.

## Approval required

Approval is required for the evidence-page redesign, semantic attempt presentation, site-wide brand formatting, shared code-copy controls with per-block opt-out, minimal packages-website adoption, Website UI 1.7.0 release preparation, subsequent skill dependency update, and the associated tests and documentation described above.

Implementation, package publication, pushing, merging, and deployment have not been authorized by this plan. The landing-page redesign remains separate. Final skill dependency completion depends on a separately authorized package release.
