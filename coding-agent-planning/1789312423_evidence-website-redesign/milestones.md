# Evidence website implementation milestones

## Basis and execution rules

This sequence implements `plan.md` in this directory, SHA-256 `6f94dcf2110568ac36f023bc8998c41dcd29f2b1790137cfb2f398c88120ac7e`. The plan remains current against the inspected skill and packages commits. It includes the developer's amendment making copy controls optional per block. The earlier draft breakdown was invalidated and regenerated for that revision. No implementation has started.

There are three milestones. Keep the five evidence routes together in Milestone 2 so their shared presentation rules, visual examples, and links reach a complete, reviewable state without temporary components or incomplete destinations.

| Milestone | Finished outcome                                                                                     | Dependency                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1         | Shared brand formatting and code-copy controls, verified and ready for a Website UI release          | Approval and explicit authorization for Milestone 1                                                 |
| 2         | Complete visual evidence experience, including semantic and qualification details                    | Milestone 1 completed; package publication can remain pending                                       |
| 3         | Skill website uses the released shared controls, with complete brand coverage and final verification | Milestones 1 and 2 completed; Website UI release published through a separately authorized workflow |

Publication is an external checkpoint, not an implementation milestone or an implied action. Milestone 1 prepares Website UI 1.7.0. Milestone 2 can use the existing installed 1.6.1 exports required by the evidence redesign; it must not introduce a committed local dependency override. Milestone 3 requires the released package before changing the skill website's dependency and adopting its new export.

All milestones preserve the plan's exclusions: no landing-page redesign, platform changes, evaluator changes or reruns, recorded-result edits, provider calls, new third-party dependencies, backend or database work, migrations, analytics, or hosting changes. Copying and brand formatting are the only changes to otherwise unrelated website surfaces.

## Requirements applied within every milestone

Each milestone owns its required tests, documentation synchronization, formatting, and review before it is complete. Required correctness work cannot be deferred to Milestone 3.

- Inspect current worktree changes before editing and preserve unrelated work. Keep protected coding instructions unchanged, and enforce the four archive-directory exclusions during discovery and verification.
- Reuse public Website UI exports, established tokens, typography, approved assets, and interaction patterns. Local evidence components compose these exports rather than duplicate general-purpose UI.
- Validate affected UI at 320, 375, 768, and 1440px in light and dark themes. Check keyboard navigation, focus visibility, accessible names, contrast, axe results, and reduced motion. Flatten unnecessary mobile panels and contain code overflow.
- Keep Astro rendering static and lightweight. Avoid duplicate replay payloads, unnecessary scans, browser data loading, new caches, or a hydration framework. Preserve existing search request ordering and caching.
- Run focused behavior tests first and the affected broader regression boundary before completion. Use existing scripts and targeted Prettier with each repository's configuration; do not write tests solely for static copy or styling.
- Review production output when tests, discovery, or packaging change. Preserve test-category isolation and exclude test files from shipped artifacts. Use portable paths and the repository's established script conventions.
- Update directly affected documentation in the same milestone. Preserve error contracts; synchronize any necessarily changed caller-facing error documentation without introducing a new exception family.
- Report completed changes, actual checks and limitations, documentation updates, and the review checkpoint. No milestone authorizes commits, pushing, merging, publishing, deployment, or the next milestone.

## Milestone 1: Shared reading controls ready for release

### Objective and dependencies

Deliver safe inline brand rendering and reusable code-copy controls with per-block opt-out in Website UI, adopt them in the packages website, and prepare a verified 1.7.0 release candidate. This milestone does not publish the package or modify the working skill website.

Before changing manifests, confirm that the planned version is still available. If another release occupies it, report the changed dependency state and resolve the version under the plan's revision rules.

### Scope and ownership

In `../packages/projects/website-ui/`:

- Modify `src/components/breadcrumbs/breadcrumbs.component.astro`, both components under `src/components/documentation-shell/`, and `src/components/local-search/local-search.component.astro`.
- Update `src/components/site-header/site-header.component.astro` only where shared labels need brand treatment.
- Add `src/components/code-copy-controls/code-copy-controls.component.astro` and the `./code-copy-controls` public export.
- Update `src/components/code-block/code-block.component.astro` for the optional `copyable` prop and opt-out marker. Modify `src/styles.css` only where toolbar placement, wrapping, or plain/panel composition requires it.
- Update `src/index.test-integration.ts`, `package.json`, and `README.md`.

In `../packages/`:

- Synchronize `pnpm-lock.yaml`.
- Update `apps/website/src/layouts/base-layout.astro`, `base-layout.test-e2e.ts`, and `apps/website/README.md`.
- Use the existing isolated packed-consumer test path; no new test infrastructure or package release workflow is introduced.

### Implementation work

1. Apply `InlineBrandText` to shared rendered labels. Build LocalSearch result and feedback text from safe DOM text/code nodes without `innerHTML`. Preserve string prop contracts, accessible names, input values, and search behavior.
2. Implement one shared copy-control initializer and reusable ActionButton-based template. Mount the component once in the packages website layout. Enhance `pre > code` blocks on direct loads and Astro client navigation, including collapsed content, without duplicate controls or listeners.
3. Enable copying by default and add `copyable?: boolean` to CodeBlock, defaulting to `true`. `copyable={false}` places `data-code-copy="false"` on its wrapper. Honor the same marker on individual `pre` elements or author-owned Markdown/code containers; any opted-out ancestor wins. Skip those blocks entirely, with no toolbar space, inert button, or extra focus stop. Do not infer opt-outs from language, length, or contents, or add fence syntax or a runtime toggle API. For enabled blocks, put a compact toolbar outside code text and copy the complete displayed `textContent` without trimming, excluding controls, highlighting markup, and neighboring content.
4. Write only on user activation. Announce success only after resolution, keep focus and the button's accessible name stable, and handle unavailable or denied clipboard writes with useful manual-copy feedback. Retain selectable code without JavaScript. Do not read the clipboard or add storage, network calls, polling, a mutation observer, deprecated fallbacks, or permissions configuration.
5. Preserve Markdown sanitization, highlighting, existing exports, and existing CodeBlock behavior with the additive optional prop. Document layout adoption, per-block/container opt-outs, defaults, and copying behavior.
6. Bump Website UI to 1.7.0 and synchronize version assertions and the lockfile. Inspect the packed inventory and verify the new public component is included while tests are excluded.
7. Validate the exact packed candidate in the existing isolated Astro consumer and a disposable skill website checkout/install. Any local tarball resolution stays in that disposable environment; the skill working tree keeps its existing dependency.

### Tests and verification

Cover safe rendering of repeated product names, punctuation, hostile HTML, existing code, and unchanged search request ordering. Browser coverage must exercise exact copying for highlighted and unhighlighted code, indentation, blank lines, Unicode, HTML-looking strings, long lines, multiple blocks, nested disclosures, repeated activation, navigation, focus retention, rejection, and unavailable clipboard support.

Use a real successful browser clipboard write where supported; stub only the clipboard boundary for denial/unavailability. Verify no-JavaScript readability and no inert buttons. Cover omitted/default and explicit true values, `copyable={false}`, individual and enclosing Markdown opt-outs, unaffected neighboring blocks, navigation, and absence of reserved toolbar space or focus stops. Literal opt-out-looking text inside code must remain copyable.

From `../packages/`, run:

```sh
pnpm --filter @moldea.ai/website-ui test
pnpm --filter @moldea.ai/website-ui typecheck
pnpm --filter @moldea.ai/website-ui lint
pnpm --filter @moldea.ai/packages-website check
pnpm --filter @moldea.ai/packages-website test:e2e
```

Run targeted Prettier on changed files. Verify the packages website at a non-root `BASE_PATH` as well as its default base. In the disposable skill consumer, verify the packed dependency with its existing website tests and typecheck, including shared documentation, search, and evidence surfaces.

### Acceptance criteria

- Shared prose renders product names as code without changing literal content or machine-facing values.
- Copy controls work across enabled code surfaces and navigation, preserve displayed text, and give truthful success/failure feedback. Explicitly opted-out blocks remain readable and selectable without a button or unused toolbar space.
- The package and its existing consumer pass the required checks, responsive/theme/accessibility review, and packed-artifact verification.
- The 1.7.0 candidate, public export, version assertions, lockfile, and documentation agree.
- No package has been published and no local dependency override has entered the skill working tree.

### Review checkpoint

Review the new public export and optional CodeBlock prop, keyboard/copy behavior and opt-outs, safe search rendering, mobile toolbar density, packed artifact, and compatibility with existing consumers. Confirm the candidate is ready for the separately authorized package-publication workflow.

## Milestone 2: Complete evidence browsing experience

### Objective and dependencies

Deliver the redesigned overview and both evidence branches as one complete visitor journey. Dependencies: Milestone 1 completed and explicit authorization for Milestone 2. Publication may still be pending because this milestone uses already available Website UI primitives.

### Scope and ownership

Under `website/src/pages/evidence/`, retain these route entry files:

- `index.astro`
- `semantic/index.astro`
- `semantic/attempts/[attemptId]/index.astro`
- `qualification/index.astro`
- `qualification/[adapterId]/[implementationId]/index.astro`

Under `website/src/components/`:

- Add `evidence-page/evidence-page.astro`, `semantic-page/semantic-page.astro`, `semantic-attempt-page/semantic-attempt-page.astro`, `qualification-page/qualification-page.astro`, and `qualification-profile-page/qualification-profile-page.astro`.
- Revise `evidence-option-card/evidence-option-card.astro`, `semantic-evaluation-case/semantic-evaluation-case.astro`, `qualification-case-evidence/qualification-case-evidence.astro`, and the visitor summary/composition in `qualification-project-evidence/qualification-project-evidence.astro`.
- Reuse `adapter-company-logo/`, `evidence-status/`, and the existing technical and trial components; change them only for necessary formatting or header sizing.
- Move the three legacy evidence `_index.test-e2e.ts` suites beside their new page owners. Split semantic-attempt and adapter-profile coverage beside those owners as needed, using source-derived `*.test-e2e.ts` names.

Under `website/src/lib/`:

- Update semantic `constants.ts`, `types.ts`, `loader.ts`, and `loader.test-integration.ts`.
- Add qualification `presentation.ts` and `presentation.test-unit.ts`; update `types.ts`, `index.ts`, `loader.ts`, and `loader.test-integration.ts`.
- Update `generation/generation.ts` and its relevant existing tests for resolved presentation and discovery copy.

Also own `website/scripts/verify-build.test-integration.ts`, the relocated-test configuration in `website/playwright.qualification-current.config.ts`, and required archive exclusions/category preservation in affected Playwright and Vitest configurations. Synchronize `README.md` and `website/README.md`; check the semantic, adapter-qualification, and release-evidence documents under `docs/` and update only changed website descriptions.

### Implementation work

1. Implement presentation resolution before composing pages. Store fixed reviewed digests alongside authored copy; never generate the expected digest from current inputs during each build.
2. For semantic cases, require the case ID, reviewed definition digest, loaded source definition digest, and replay definition digest to agree. Reuse current and authenticated historical digest paths; do not apply a newer schema to old definitions merely to render them.
3. For qualification, retain the existing once-computed profile digest as `sourceProfileDigest` on source case models. Require adapter/implementation/case identity plus matching reviewed, source, and owning-attempt profile digests. Shared cases retain the Custom baseline's identity. Use claims covered by the profile digest, not unbound catalog or profile-README prose.
4. Expose nullable resolved presentation to pages and search. Mismatches keep source text, actual verdicts, and evidence links. A standalone setup must independently match its reviewed source and cannot borrow a mismatching result. Preserve existing pairing failures, release selection, authentication, raw schemas, and evidence identities.
5. Rebuild the overview with “Keep the rules connected to the code,” leading with refund maintenance and the Saved rules, Connected files, and Checks you can run again stages. Include the plan's visible explanation that teams can otherwise build and maintain that system themselves. Distinguish coding-agent judgment from software checks.
6. Show the Anthropic reference-repair example beside its integration explanation. Use faithful small excerpts, explicit setup/observed-result labels, and separate evaluation/case links. Remove overview metric panels and obsolete metric/question-list props; avoid whole-card anchors containing interactive code controls.
7. Recompose semantic index and attempt pages with compact status, optional detailed metrics/provenance, “Follow the decisions” navigation, plain-language groups, and shared Accordions. Lead with the refund case and keep invoice clarification as supporting material. Remove the repeated heading and unconditional success language. Preserve every replay, criterion, rationale, workspace change, and confirmation trial.
8. Recompose the qualification directory and adapter pages with company marks, concise descriptions, compact status, and adapter-specific journeys first. Keep shared foundation journeys separately attributed. Preserve Custom's neutral presentation and omit an empty adapter-specific chapter.
9. Preserve Replay, Project, Evidence, and Technical views. Keep fixture-to-final comparisons distinct from actor-only patches. Explain qualification as repository maintenance and file checking, without claiming provider runtime execution.
10. Preserve route URLs and existing group fragments; add unique case anchors that reveal their disclosure through shared Accordion behavior. Keep static-path generation and typed props in routes. Use resolved summaries in search without indexing transcripts or changing discovery contracts.
11. Remove superseded panels, headings, unused imports, and obsolete assertions from touched paths. Complete documentation and tests alongside the new behavior.

### Tests and verification

Test matching current and pinned identities; same-ID changed scenarios/tasks/criteria; wrong or missing digests; wrong baseline ownership; absent featured cases; unrecorded setups; and recovered, failed, and Custom states. Verify presentation mismatch removes only incompatible editorial material.

Browser tests must cover overview-to-case navigation, stable fragments, disclosure opening, keyboard tabs, no-JavaScript reading, trial provenance, raw links, and the existing qualification confirmation fixture. Update its test discovery when moving files, and retain category isolation.

From the skill root, run:

```sh
npm --prefix website run docs:check
npm --prefix website test
npm --prefix website run typecheck
npm --prefix website run lint
npm --prefix website run format:check
```

Use targeted Prettier first. The existing test scripts include production builds and artifact verification. Verify the relevant browser/build boundary at a non-root `BASE_PATH`, relocated fixture discovery, unique IDs, links, SEO/search exclusions, and absence of shipped tests.

Visually review the overview, semantic index and an attempt, qualification directory, Anthropic, another provider, and Custom at every required width and theme. At 1440 × 900 the first substantive example or directory entry must be visible. Check reduced motion, keyboard focus, axe results, density, and 320px overflow.

### Acceptance criteria

- Visitors can distinguish the evaluations, understand a visual example without opening details, and identify the reusable system supplied by `moldea`.
- All five routes form a complete flow with working case links, meaningful headings, compact introductions, and no prominent metric panels.
- Provider identity and adapter-specific journeys are immediately useful; shared evidence remains honestly attributed.
- Scenario-specific editorial claims require exact identity matches. All original records, qualified/negative states, and provenance remain accessible.
- No invented thresholds, unsupported success claims, comparative performance claims, or provider-execution claims appear.
- Required verification and documentation synchronization are complete; no later milestone is needed to make the evidence flow correct.

### Review checkpoint

Review the complete visitor journey from overview through recorded examples. Confirm the differentiation is visible, the design remains compact and polished, and the source/record compatibility rules preserve trustworthy evidence across current, pinned, failed, recovered, and unrecorded states.

## Milestone 3: Released-package adoption and complete site coverage

### Objective and dependencies

Adopt the released Website UI package in the skill website, finish site-wide brand treatment and copying, and verify the final integrated result.

Dependencies: Milestones 1 and 2 completed, explicit authorization for Milestone 3, and Website UI 1.7.0 published through its separately authorized workflow. If publication is unavailable, report the prerequisite and stop before dependent changes; do not substitute a committed tarball, workspace override, or patched installation.

### Scope and ownership

- Update `website/package.json` to require `@moldea.ai/website-ui: ^1.7.0` and resolve the released artifact in `website/package-lock.json`.
- Update `website/src/layouts/base-layout.astro` and `base-layout.test-e2e.ts` to adopt and verify shared copy controls.
- Update `website/src/components/documentation-page/documentation-page.astro` for missing title/description brand treatment.
- Audit remaining app-owned rendered text, including homepage, documentation, examples, search, navigation, and utility pages. Any additional Astro edit is limited to missing brand formatting or an intentional per-block copy opt-out.
- Revisit the evidence compositions from Milestone 2 only where choosing copyable versus illustrative snippets requires the new prop or documented marker.
- Synchronize `website/README.md` and any directly affected root README statement for the completed integration. Keep the packages documentation from Milestone 1 current if its documented consumer behavior is affected.

### Implementation work

1. Confirm the released package identity and install it through the existing npm dependency workflow. Review manifest/lockfile changes and preserve all unrelated dependencies.
2. Mount the shared copy-controls component once in BaseLayout. Verify documentation, highlighted samples, file previews, and replay blocks use the same behavior. Keep useful full source, runnable commands, and reusable samples copyable; opt out illustrative or incomplete excerpts at their owning composition with `copyable={false}` or the documented marker.
3. Complete brand treatment with `InlineBrandText` and the existing Markdown option. Cover headings, descriptions, breadcrumbs, navigation, previous/next links, search results, and feedback. Avoid nested code or changes to literal evidence, commands, filenames, URLs, metadata, input values, accessible-name attributes, or logo artwork.
4. Preserve the homepage's messaging and layout. Recheck evidence diagrams now that code-copy controls are active, including control placement and independent links.
5. Complete final documentation and diff review. Confirm no local package forks, temporary dependency paths, superseded implementations, accidental recorded-artifact changes, or unrelated edits remain.

### Tests and verification

Extend the layout/browser tests for complete brand coverage and copying across direct loads, client navigation, themes, narrow layouts, disclosures, failures, and no-JavaScript reading. Confirm copied content remains exact in the new evidence compositions and deliberate opt-outs do not affect neighboring enabled blocks or reserve toolbar space.

Run the complete skill website command boundary listed in Milestone 2 against the released dependency, with targeted Prettier and the non-root base-path check. Reuse earlier package checks only while their relevant inputs and candidate identity remain unchanged; rerun affected package checks if this milestone changes those inputs.

Perform the plan's final visual review of overview, semantic index/attempt, qualification directory and representative profiles, docs, and search at all four widths in both themes. Check reduced motion, focus, names, contrast, axe results, content density, and code-copy placement.

### Acceptance criteria

- The skill website resolves the released package through its normal lockfile, with no local override.
- Visible product-name prose uses inline code throughout the website.
- Every copy-enabled code block has working copying in supported contexts and truthful manual-selection fallback otherwise. Intentionally opted-out blocks remain readable and selectable without a copy button, toolbar space, or extra focus stop.
- The evidence experience remains correct with shared controls active, including nested content and client navigation.
- Both websites' completed changes satisfy responsive, theme, accessibility, documentation, and verification requirements.
- Final diffs contain only authorized changes. No deployment, migration, or evaluation-record mutation occurred.

### Review checkpoint

Review the skill site's final consumer dependency, representative code-copy interactions, complete brand coverage, and the integrated evidence experience. Confirm release provenance and verification results before any separately authorized publication of the skill website.

## Coverage and rollback

Milestone 1 owns the shared public export, optional CodeBlock prop and opt-out contract, package compatibility, packed consumer, package version/lockfile, packages website adoption, and its documentation/tests. Milestone 2 owns all evidence design, presentation identity checks, case ordering/navigation, provider marks, preserved evidence, search/discovery synchronization, removed UI, moved tests, and evidence documentation. Milestone 3 owns the released skill dependency, global copy adoption, remaining brand coverage, and final integrated verification. No required implementation or verification is reserved for an unstated milestone.

The plan's rollback remains unchanged: revert presentation/layout adoption and restore the previous consumer dependency where needed. Published npm versions are immutable; corrections require a new release. Evaluation records remain unchanged throughout.

## Approval required

Approve the underlying revised plan, including optional per-block copying, and this three-milestone sequence: shared UI release readiness, the complete evidence experience, and released-package adoption with full site coverage.

Approval alone does not authorize implementation. Each milestone requires explicit authorization identifying its number, and completing one never authorizes the next. Approval may be combined with authorization to implement Milestone 1. Package publication, pushing, merging, and deployment remain separately authorized actions.
