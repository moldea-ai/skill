# Visual product pages: implementation milestones

## Basis and execution boundaries

This sequence implements `coding-agent-planning/1789411571_visual-product-pages/plan.md`, SHA-256 `e7de67bb1305888db8493f87986ff0e29c37a0f0636e41c704619ab6671ca9f0`. Repository `HEAD` remains `308d2c497a6151d47cbb647fa3a364c3697f9e27` on `development`. No implementation has started, and the plan and milestone sequence await approval.

There are two milestones. Both visual pages belong in Milestone 1 because their reciprocal links must resolve to complete experiences. Milestone 2 connects the main navigation and consolidates the documentation journey. Existing navigation remains unchanged until that integration; there is no alternate renderer, feature flag, compatibility mode, or placeholder page.

Each milestone includes its required tests, documentation synchronization, formatting, regression checks, and rendered review. Completing a milestone does not mean the entire project change is complete. There is no later cleanup or verification-only milestone.

## Requirements shared by both milestones

- Preserve the approved landing and Evidence designs. Landing changes are limited to capability destinations and consuming shared refund previews without changing its appearance.
- Use the existing Astro `BaseLayout`, installed Website UI `1.7.4` public exports, design tokens, branding, and application-owned `AdapterCompanyLogo`. Reuse `action-link`, `breadcrumbs`, `inline-brand-text`, `file-preview`, `code-block`, `connection-label`, `result-summary`, and `site` utilities where appropriate. Do not copy platform React components or add general-purpose UI substitutes.
- Keep public explanations brief and visual. Reader-visible `moldea` uses inline code. New external-tab links have the established icon and appropriate `rel` attributes. Illustrative code and diffs opt out of copying.
- Preserve the approved conversational treatment, standard diff appearance, proportionate unstacked logos, and labeled connection states using `Link2` and `Unlink`. Avoid redundant headings, decorative statistics, unnecessary toolbars, and tinted nested containers.
- Verify responsiveness from 320px through large desktops, light and dark themes, text-selection contrast, keyboard access, focus, accessible names, heading order, no-JavaScript readability, and reduced motion. Flatten unnecessary mobile framing and retain readable refund-boundary lines. Do not add decorative animation.
- Keep deterministic checks, project tests, and semantic judgment distinct. Use existing verified snapshots for executable examples. Do not imply live provider verification, automatic host memory, background maintenance, guaranteed model behavior, or invented release evidence.
- Remove superseded implementation when replacing it. Add no compatibility aliases, redirects, legacy switches, optional fallbacks for migrated callers, duplicate fixtures, parallel renderers, or old/new page modes. Preserve meaningful tests at their new ownership boundaries.
- Keep all existing documentation and nine example detail routes active and indexable. They remain current technical content. Do not create another Examples showcase or adapter catalog.
- Keep the website a static renderer. No new dependencies, shared-package release, backend, runtime collection, caching mechanism, configuration contract, database migration, or paid evaluation run is required. Existing evidence validation and build-cache ownership remain unchanged.
- Do not change protected coding instructions or sibling repositories. Inspect only the relevant final diff and documentation; do not turn removal checks into unrelated legacy cleanup.

## Milestone 1: Complete the visual product pages

### Objective

Deliver finished `/capabilities/` and `/how-it-works/` pages, with accurate visual examples, shared refund previews, working documentation links, and complete publication metadata. Both pages must be reviewable through direct links and search before changing primary navigation.

### Dependencies

Approval of the current plan and milestone sequence, plus explicit authorization to implement Milestone 1. Use the existing website dependencies, local fixture verification, and approved design references; no external service or package release is needed.

### Owned files and contracts

Add:

- `website/src/pages/capabilities.astro`
- `website/src/pages/how-it-works.astro`
- `website/src/components/capabilities-page/capabilities-page.astro`
- `website/src/components/capabilities-page/capabilities-page.test-e2e.ts`
- `website/src/components/how-it-works-page/how-it-works-page.astro`
- `website/src/components/how-it-works-page/how-it-works-page.test-e2e.ts`
- `website/src/lib/landing-example/preview.ts`
- `website/src/lib/landing-example/preview.test-unit.ts`

Modify:

- `website/src/lib/landing-example/index.ts`: explicitly export `LANDING_EXAMPLE_PREVIEW`.
- `website/src/components/behavior-alignment/behavior-alignment.astro`: consume shared previews and remove the local derivations.
- `website/src/lib/model/constants.ts`: define `PRODUCT_PAGE_METADATA` for both public routes, titles, descriptions, and search text.
- `website/src/lib/generation/generation.ts`: register both routes, search records, and machine-guidance links through the existing model.
- `website/src/lib/generation/generation.test-unit.ts`: cover the additional public records and retained documentation routes.
- `website/scripts/verify-build.test-integration.ts`: cover both published pages and their discovery artifacts.
- `website/src/components/home-page/home-page.test-e2e.ts`: verify unchanged landing refund previews and boundary outcomes after extraction.
- `docs/capabilities.md`: add the concise project-repair entry and link to the existing repair guide; synchronize its capability description as needed.
- `website/README.md`: document the new page ownership and shared example derivation, accurately reflecting the navigation state at this milestone.

The existing `lib/landing-example/fixture.ts` snapshots and `fixture.test-integration.ts` remain authoritative. No fixture copies, new evidence artifacts, or shared UI package changes belong to this milestone.

### Implementation work

1. Move the refund-preview derivation into `preview.ts`. Derive `policyDiff`, `contextDiff`, `instructionDiff`, and `testDiff` once from the existing initial and maintained snapshots through `getLandingExampleLine`. Keep the small formatter private. Switch the landing consumer and remove its `createLineDiff`, boundary-assertion selections, four diff builders, and unused imports in the same change. Preserve displayed source bytes, markup, copy, and styling.
2. Implement both thin Astro routes and page components with shared metadata. Use static page-owned compositions and the public fixture exports. Extract a child component only when it owns a distinct meaningful responsibility; do not introduce a page engine or diagram framework.
3. Build Capabilities with a concise white opening in light mode, the existing dark-theme background, wrapping anchor navigation, and the six outcomes below. Each outcome has a short explanation, a prominent visual, and contextual technical links. Essential content stays visible without accordions or JavaScript.

| Outcome and anchor                              | Required visual and documentation handoff                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Establish project truth, `#project-truth`       | Platform, Product, and Security ownership becomes saved context, with temporary sprint information distinguished from durable facts. Include a compact project tree and the initialization prerequisite. Link to `/docs/project-state/`, `/examples/initialize-a-project/`, and `/examples/add-project-context/`.                           |
| Plan agent systems, `#plan-agent-systems`       | Promotion planning separates deterministic software, one copy-writing agent, and human approval without implying implementation. Link to `/docs/planning-agent-systems/` and `/examples/plan-an-agent-system/`.                                                                                                                             |
| Create real agents, `#create-agents`            | The existing `support` fixture connects saved instructions, order lookup, and its OpenAI runtime using `gpt-6-astra`. Show the relevant integration logo without implying an exhaustive adapter list. Link to `/docs/designing-agents/`, `/examples/create-a-support-agent/`, and `/evidence/qualification/`.                               |
| Build Agent Skills, `#build-agent-skills`       | The documented `release-review` request produces a recognizable skill structure with focused guidance and an existing verifier. Explain activation and software ownership without inventing `/moldea/skills` or an independently running skill. Link to `/docs/designing-skills/`.                                                          |
| Keep behavior current, `#keep-behavior-current` | Shared refund previews show 30 becoming 14 and the connected instruction and tests. A compact consolidation illustration preserves unique facts while removing duplication. Link to `/docs/continuous-maintenance/`, `/examples/maintain-a-refund-policy/`, `/examples/compress-project-context/`, and `/examples/dedicated-repositories/`. |
| Evaluate and repair, `#evaluate-and-repair`     | Distinguish a read-only finding, requested reconciliation, and deterministic validation. Include the compact Fix `moldea` project-repair illustration and its recovery boundaries. Link to `/docs/evaluate-reconcile-validate/`, its `#repair-a-project` section, `/examples/evaluate-and-reconcile/`, and `/examples/validate-structure/`. |

4. Keep project repair inside the sixth section. Show checking the existing setup, correcting established errors, and verifying changes. Distinguish it from read-only evaluation and named reconciliation. Recovery requires evidence of prior initialization and the intended correction; do not imply silent initialization, guessed policy, dependency upgrades, or complete coverage when checks remain outstanding. The illustration is documented behavior, not a fabricated recorded run.
5. Build How it works around the existing initialized support-agent project. Open with “Shorten the application's refund window from 30 days to 14” and the approved coding-agent response. Include the brief one-time Initialize `moldea` prerequisite, clarifying that initialization alone does not create the support agent. Use these five linked stages:

| Stage and anchor                              | Required visual and documentation handoff                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use the project's context, `#project-context` | Show the saved refund rule and application/agent responsibilities. Link to `/docs/project-state/`.                                                                                                                                                                                                                            |
| Follow the connections, `#connections`        | Connect the changed rule to its declared instruction, runtime, and tests. Link to `/docs/continuous-maintenance/`.                                                                                                                                                                                                            |
| Update the affected work, `#changes`          | Consume the shared rule and instruction diffs; show the 14-day inclusive boundary and 15-day rejection on readable separate lines. Link to `/examples/maintain-a-refund-policy/`.                                                                                                                                             |
| Check the result, `#checks`                   | Distinguish deterministic connection checks, project verification, and semantic assessment. Explain adapters with the existing disconnected/restored instruction example, clearly separated from the refund walkthrough's actual state sequence. Link to `/docs/evaluate-reconcile-validate/` and `/evidence/qualification/`. |
| Carry context forward, `#next-session`        | Show the saved 14-day fact and connected instruction available for a later relevant session, without implying automatic host memory. Link to `/docs/how-it-works/`.                                                                                                                                                           |

6. Give Capabilities a compact continuation to How it works and Docs. Give How it works a compact Evidence handoff and technical workflow link. Do not duplicate full landing sections, install tutorials, metric panels, or adapter directories.
7. Complete route registration, unique search records, canonical metadata, sitemap participation, and `llms.txt` discovery using the existing model and artifact pipeline. Preserve required documentation records, existing example routing, duplicate-route protection, and fail-closed evidence validation. Update the capability-reference repair entry and website ownership documentation with this work.

### Required verification

- Add preview unit coverage for the correct source file and snapshot, removed/added line direction, inclusive boundary, and first excluded day. Preserve and run existing fixture integration coverage for CLI behavior, deterministic repetition, repository immutability, runtime connections, and executable refund tests.
- Add page browser coverage for direct loads, client navigation, anchors, documentation handoffs, page-to-page links, no-JavaScript content, illustrative copy opt-out, and project repair appearing within the correct section.
- Extend generation and artifact coverage for both routes, search records, canonical URLs, sitemap entries, and machine links while retaining the existing docs and examples.
- Verify the landing's rendered diffs and boundary outcomes remain unchanged after extraction.
- Inspect both complete pages and the touched landing section at 320px, a wider phone, tablet, laptop, and large desktop widths in both themes. Check chat direction, typography, selection contrast, logo scale, mobile insets, diff readability, section backgrounds, keyboard/focus behavior, reduced motion, and footer spacing. Use existing accessibility tooling and retain rendered evidence for review.
- Run the milestone verification commands below. Include prefixed deployment checks for both new routes, their anchors and documentation links, and their discovery artifacts under `/preview/`.

### Acceptance criteria

Both pages are finished, understandable visual experiences with all planned outcomes and stages, accurate product boundaries, working links, and complete publication artifacts. Shared refund projections have one owner, and their superseded landing implementations are gone. The approved landing appearance and evidence behavior are preserved. Required automated checks and rendered review pass; no unresolved task-caused defect or unfinished page is deferred to Milestone 2.

### Review checkpoint

Review both complete pages together for distinct purpose, visual quality, mobile density, and factual accuracy. Inspect the shared preview extraction, unchanged landing output, project-repair boundaries, and separation of illustrations from recorded Evidence. Stop at this checkpoint without beginning navigation integration.

## Milestone 2: Connect navigation and the documentation journey

### Objective

Make the two visual pages the primary discovery destinations, place detailed examples clearly within Docs, and complete the final site-wide journey using one breadcrumb implementation.

### Dependencies

Milestone 1 must be complete and verified. Explicit authorization to implement Milestone 2 is required. If an unresolved earlier defect prevents integration, report it rather than expanding this milestone silently.

### Owned files and contracts

Add:

- `website/src/lib/documentation-navigation/utilities.ts`
- `website/src/lib/documentation-navigation/index.ts`
- `website/src/lib/documentation-navigation/utilities.test-unit.ts`

Modify:

- `website/src/components/site-header/site-header.astro`
- `website/src/components/site-footer/site-footer.astro`
- `website/src/components/capabilities-overview/capabilities-overview.astro`
- `website/src/components/documentation-page/documentation-page.astro`
- `website/src/pages/docs/[...path].astro`
- `website/src/pages/examples/[...path].astro`
- `docs/capabilities.md`, `docs/how-it-works.md`, `docs/index.md`, and `docs/examples/index.md`
- `website/README.md`
- `website/src/layouts/base-layout.test-e2e.ts`
- `website/src/components/home-page/home-page.test-e2e.ts`
- `website/scripts/verify-build.test-integration.ts`
- `website/src/lib/generation/generation.test-unit.ts` for reference-title and discovery assertions affected by the integration.
- The two new page test files from Milestone 1 for final navigation and documentation-journey coverage.

`BaseLayout` and Website UI retain their existing rendering contracts. The application-owned `DocumentationPage` receives a required breadcrumb prop, with both callers updated together. No optional compatibility prop or legacy hierarchy remains.

### Implementation work

1. Add and explicitly export `createDocumentationBreadcrumbs`. Accept the required document `route`, `section`, and `title` fields and return the public `IBreadcrumb[]` type from `@moldea.ai/website-ui/breadcrumbs`. Own Docs root, docs detail, Examples index, and example-detail hierarchies in one function. Return logical, unprefixed routes.
2. Have each document route compute the breadcrumb array once and pass the same result to `BaseLayout` and `DocumentationPage`. Make the component prop required. Remove its reconstruction and both route-local builders in the same change. Preserve the Docs root's terminal title. Examples receives Home, Docs, Examples, and the detail title; its index stops at Examples. Leave unrelated page-specific breadcrumbs alone.
3. Change desktop and mobile primary navigation to **Capabilities · How it works · Evidence · Docs**, pointing to `/capabilities/`, `/how-it-works/`, `/evidence/`, and `/docs/`. Remove the primary Examples item. Classify both `/docs/**` and `/examples/**` as Docs while retaining base-path-aware active states and the existing search, theme, and distribution controls.
4. Change the footer's primary group to Explore, with Capabilities, How it works, Evidence, Docs, Getting started, and `llms.txt`. Preserve Cloud, Packages, distribution, source, and other established project links.
5. Point the six landing capability cards to the corresponding Milestone 1 anchors, and point “Explore every capability” to `/capabilities/`. Preserve the section's copy, ordering, spacing, and styling.
6. Label the technical overviews Capability reference and Workflow reference through frontmatter and relevant index links. Preserve their URLs, existing heading anchors, and technical bodies, including the repair entry completed in Milestone 1. Update the docs and examples introductions with concise visual-page handoffs. Keep the examples list, sidebar grouping, previous/next navigation, and all existing example URLs; add no new taxonomy or duplicate reference.
7. Synchronize `website/README.md` with final navigation and shared breadcrumb ownership. Update affected tests to the intended destinations and labels. In clipboard tests previously routed through the Capabilities primary link, visit actual documentation code blocks explicitly and preserve the existing success, failure, and navigation assertions.
8. Complete the final consumer and removal audit: one navigation structure, one breadcrumb builder, one refund-preview owner, no stale local builders/imports, no compatibility branches, no abandoned markup or exports, and no obsolete descriptions of the changed paths.

### Required verification

- Add breadcrumb unit coverage for all four document cases, ancestor order, terminal labels, no duplicate index/root crumbs, and unprefixed links.
- Verify visible breadcrumbs and structured metadata use the same hierarchy on docs and example routes. Exercise the normal root and `/preview/` deployment base paths without double-prefixing.
- Test the four primary destinations, Docs active states for both route families, mobile navigation, search results distinguishing visual pages from references, client transitions, and Back/Forward behavior.
- Verify all six landing cards resolve to the correct anchors and the new pages lead into detailed documentation and examples without dead ends.
- Preserve and run clipboard, accessibility, theme, landing, evidence, and artifact regressions. Update only expectations changed intentionally by this milestone.
- Inspect the integrated header, mobile menu, footer, landing handoffs, both new pages, Docs root, reference pages, Examples index, and a detail page. Check supported widths, both themes, focus/keyboard access, text selection, no-JavaScript readability, reduced motion, visual continuity, and footer spacing.
- Run the milestone verification commands below, including the final `/preview/` navigation and artifact checks. Review final documentation state and the complete scoped diff before declaring the overall change complete.

### Acceptance criteria

The four-item primary navigation works consistently on desktop and mobile. Visual pages and technical references have clear, distinct roles. All existing documentation and example routes remain active, with examples correctly classified under Docs. One required breadcrumb path supplies both visual and structured output. Landing capability links resolve correctly. All planned removals are complete, with no legacy or compatibility layer. Automated checks and full-journey rendered review pass without unresolved task-caused issues.

### Review checkpoint

Review the full visitor journey from landing or primary navigation to a visual page, its specific docs, a detailed example, and Back/Forward navigation. Confirm active states and breadcrumbs agree, the simplified menu does not hide technical content, and the final diff preserves the approved landing and Evidence design. This is the final implementation checkpoint; there is no additional milestone reserved for cleanup, testing, or documentation.

## Verification commands for each milestone

Run focused tests first using the existing installed runners. Format only touched files with the installed Prettier and `website/.prettierrc`; do not use the repository-wide formatting script.

Before completing each milestone, run from `website/`:

```bash
npm run docs:check
npm run test
npm run typecheck
npm run lint
npm run format:check
```

`npm run test` owns the full website correctness boundary: unit tests, the verified production build, artifact integration including the existing fixture checks, and both browser configurations. Do not repeat `npm run check` or a separate normal-root build on unchanged inputs. Repeat affected checks after fixes, and repeat broader checks when their inputs or unresolved risks require it. Reuse successful evidence for identical inputs during a subsequent review rather than rerunning it mechanically.

For the planned `/preview/` verification, supply `BASE_PATH=/preview/` and the existing `SITE_URL` through the invoking process. Run `npm run build` and `npm run test:integration:artifact`, then focused affected tests through the existing Playwright configuration. Introduce no platform-specific repository script or new configuration for this check. Reuse prefixed verification only while all affected inputs remain unchanged.

New tests retain the existing adjacent naming and discovery conventions and remain excluded from production outputs through the established tooling. No test-category or runner configuration change is planned. No paid model, provider, semantic-evaluation, or adapter-qualification execution is part of either milestone.

## Plan coverage and publication boundary

| Plan deliverable                                                                                                         | Milestone ownership                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Both visual pages, six capability outcomes, five workflow stages, project repair, contextual docs and evidence handoffs  | Milestone 1                                                          |
| Shared refund projections, current landing consumer, removal of local diff builders, projection and fixture verification | Milestone 1                                                          |
| New routes, metadata, search, sitemap, machine guidance, and publication-artifact checks                                 | Milestone 1; final reference-label and journey checks in Milestone 2 |
| Four-item navigation, footer, landing capability destinations, reference labels, and docs/examples discovery             | Milestone 2                                                          |
| One breadcrumb builder, required component input, both route consumers, removed local builders, visual/structured parity | Milestone 2                                                          |
| Directly affected documentation, focused tests, broader regressions, mobile, accessibility, themes, and visual evidence  | Both milestones, with their own changes                              |
| Final removal audit and complete visitor-journey review                                                                  | Milestone 2                                                          |

Both milestones preserve the existing release-evidence boundary, public technical URLs, static architecture, and deployment configuration. Neither creates a migration or requires a Website UI release.

Publication remains outside these implementation milestones and follows the separately authorized repository workflow. The existing website verification workflow checks the affected paths; the existing Pages workflow deploys from `main`. A push to `development` alone does not deploy the public site. Rollback uses a reviewed source revert and the existing deployment pipeline, without a retained compatibility implementation.

## Approval required

Approve the current plan and this two-milestone sequence: **Milestone 1, Complete the visual product pages**, followed by **Milestone 2, Connect navigation and the documentation journey**. Approval alone does not start implementation. Explicitly authorize the milestone to begin; approval and authorization for Milestone 1 may be combined in one instruction. After completing each authorized milestone and its verification, stop at its review checkpoint. Completion of Milestone 1 does not authorize Milestone 2. No implementation, commits, pushes, or deployment have started.
