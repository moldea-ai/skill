# Visual Capabilities and How it works pages

## Objective

Give visitors two clear ways to understand `moldea` before entering the technical documentation:

- **Capabilities:** what the coding agent can accomplish with the skill.
- **How it works:** what happens to a real project after an ordinary request.

Integrate examples into those explanations. Remove Examples from primary navigation while preserving the detailed examples within the documentation experience. Keep the landing page's approved design and the existing Evidence experience.

The central message remains concrete: a coding agent can perform the work, while `moldea` supplies a maintained project record, explicit connections, reusable workflows, and deterministic software checks that the team would otherwise need to establish and maintain. Do not claim that coding agents cannot implement these capabilities themselves.

## Current behavior and repository evidence

Production files remain unchanged on `development` at `308d2c497a6151d47cbb647fa3a364c3697f9e27`. Only the planning directory is untracked. Implementation has not started. This revision incorporates the challenge findings and the requirement for one clean implementation without legacy or backward-compatibility code. No milestone breakdown exists to invalidate.

| Evidence                                                                                                                                             | Implication for this change                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root `README.md`, `docs/capabilities.md`, `docs/how-it-works.md`, and the workflow documents                                                         | Initialization, context maintenance, agent and Agent Skill design, evaluation, reconciliation, and deterministic validation are distinct supported operations. The new pages must preserve their boundaries.                      |
| `website/src/components/site-header/site-header.astro`                                                                                               | Capabilities and How it works currently link directly to `/docs/capabilities/` and `/docs/how-it-works/`. Examples occupies a separate primary-navigation position.                                                               |
| `website/src/pages/docs/[...path].astro`, `website/src/pages/examples/[...path].astro`, and `components/documentation-page/documentation-page.astro` | Both route families already use the same documentation shell and sidebar. Examples can become part of Docs in navigation without moving its source or URLs.                                                                       |
| `components/capabilities-overview/capabilities-overview.astro`                                                                                       | The landing page already establishes six useful outcome groups, with project truth first. Preserve this ordering and terminology.                                                                                                 |
| `components/agent-example/`, `components/behavior-alignment/`, `components/open-source-system/`, and `lib/landing-example/`                          | Approved conversations, file previews, diffs, connected/disconnected states, and verified support-agent snapshots provide the visual and factual foundation.                                                                      |
| `lib/generation/generation.ts`, `lib/model/constants.ts`, and `scripts/verify-build.ts`                                                              | Public routes, search records, machine guidance, generated artifacts, internal links, and SEO form one publication path. Adding Astro pages alone would be incomplete.                                                            |
| `layouts/base-layout.test-e2e.ts`, `components/home-page/home-page.test-e2e.ts`, and `scripts/verify-build.test-integration.ts`                      | Existing regression coverage includes navigation, copy controls, themes, responsive layouts, evidence, and published artifacts. Some tests intentionally depend on the current navigation destinations and must change with them. |

The website uses Astro `7.2.2`, Tailwind CSS `4.3.3`, TypeScript `6.0.3`, and installed `@moldea.ai/website-ui` `1.7.4`. Vitest `4.1.10`, Playwright `1.62.1`, and the existing Prettier configuration provide verification.

The sibling packages website, Website UI documentation and public component APIs, platform website, platform UI guidance, `../platform/DESIGN.md`, and relevant product and adapter specifications establish the shared brand and product boundaries. The skill website consumes the Astro Website UI package; it must not copy React platform components or introduce a second design system.

## Information architecture

Primary navigation becomes **Capabilities · How it works · Evidence · Docs** on desktop and mobile.

| Destination                                | Visitor's question                             | Content ownership                                                         |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                        | Why should I use this with my coding agent?    | Existing landing narrative, preserved.                                    |
| `/capabilities/`                           | What can it help me accomplish?                | Six outcomes, each demonstrated visually and linked to detailed guidance. |
| `/how-it-works/`                           | What happens when I ask for a change?          | One continuous project walkthrough.                                       |
| `/evidence/`                               | What has actually been tested?                 | Existing recorded decisions and adapter qualification.                    |
| `/docs/` and existing documentation routes | How do I use it, and what are the exact rules? | Installation, reference material, detailed workflows, and full examples.  |

Keep `/docs/capabilities/`, `/docs/how-it-works/`, `/examples/`, and all nine existing example detail routes public and indexable because they own actively used technical content in the final experience. They are not compatibility aliases or old versions of the new visual pages. There is no new Examples showcase, route migration, redirect layer, or duplicate technical reference.

Examples remain discoverable through the documentation sidebar, docs index, search, and contextual links from the two new pages. Opening any `/examples/**` page marks **Docs** active in primary navigation. Its visible and structured breadcrumbs become Home, Docs, Examples, and the example title; the index stops at Examples.

Within Docs, label the two technical overviews **Capability reference** and **Workflow reference** through their frontmatter and relevant index links. Preserve their URLs and existing heading anchors. Keep technical body sections intact except for a concise project-repair entry in the capability reference, linked to the existing authoritative repair guide. This differentiates reference material from the new visual pages in the sidebar and search.

## Capabilities page

### Composition

Use a concise white opening in light mode, the existing background token in dark mode, a clear page title, and one short introductory paragraph. Follow it with a compact, wrapping list of six anchor links. Start the first visual outcome immediately below; do not insert a separate card directory repeating the six sections.

Keep the landing page's six names and order. Each section contains an outcome heading, a short explanation, one prominent visual, and specific documentation links. Desktop can pair the explanation with its visual. Mobile presents them in reading order with minimal outer framing. Do not make visitors open accordions to understand the capabilities.

The title and introductory copy should establish the breadth of the page, such as **From project knowledge to working agents.** Each section then answers a different practical need.

### Outcomes and visuals

| Section and stable anchor                          | Visual demonstration                                                                                                                                                                                                                                                                                                                                                                       | Detailed destinations                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Establish project truth** `#project-truth`       | A natural ownership handoff becomes saved project context. Use the documented Platform, Product, and Security responsibilities; visually distinguish durable ownership from a temporary sprint note. Show a compact, correctly indented project tree and one readable saved fact. Initialization appears as the one-time prerequisite, not as automatic adoption from a context handoff.   | `/docs/project-state/`, `/examples/initialize-a-project/`, `/examples/add-project-context/`                                                        |
| **Plan agent systems** `#plan-agent-systems`       | Use the documented promotion-planning example. Show fixed eligibility and discount rules owned by software, promotional copy owned by one agent, and high-risk approval owned by a person. Present the proposed responsibilities without implying that planning created agents or changed files.                                                                                           | `/docs/planning-agent-systems/`, `/examples/plan-an-agent-system/`                                                                                 |
| **Create real agents** `#create-agents`            | Show the `support` agent connected to its saved instruction, existing order lookup, and runtime call. Use the existing initial fixture, including `gpt-6-astra`, and emphasize the relationships rather than displaying a complete manifest. Use the OpenAI logo as the integration in this example, not as an exhaustive support list.                                                    | `/docs/designing-agents/`, `/examples/create-a-support-agent/`, `/evidence/qualification/`                                                         |
| **Build Agent Skills** `#build-agent-skills`       | Use the documented `release-review` request. Show a real skill-shaped tree with `SKILL.md`, focused references, and a link to the existing verifier. Explain visually when the guidance is used and which work stays in software. Do not invent a canonical `/moldea/skills` store or portray an Agent Skill as an independently running agent.                                            | `/docs/designing-skills/`                                                                                                                          |
| **Keep behavior current** `#keep-behavior-current` | Show the refund rule moving from 30 to 14 days and the connected instruction and tests that need attention. Use compact source-derived changes. Add a short consolidation illustration: duplicated context resolves to an established owner while unique facts remain. Keep conflict handling and cross-repository details in linked documentation.                                        | `/docs/continuous-maintenance/`, `/examples/maintain-a-refund-policy/`, `/examples/compress-project-context/`, `/examples/dedicated-repositories/` |
| **Evaluate and repair** `#evaluate-and-repair`     | Visually distinguish a read-only finding from a later requested correction. Pair a broken instruction connection with its restored form, using the existing disconnected and maintained fixtures. Separate deterministic connection checks from the coding agent's assessment of meaning. Include the compact project-repair example specified below; no production-readiness certificate. | `/docs/evaluate-reconcile-validate/`, `/examples/evaluate-and-reconcile/`, `/examples/validate-structure/`                                         |

Within **Evaluate and repair**, also show **Fix `moldea`** as a request to check and correct the existing project setup. A compact request-to-outcome sequence explains checking the setup, correcting established errors, and verifying changes. This covers damaged adoption as well as broader project setup; it is distinct from read-only evaluation and named reconciliation. Recovery requires evidence of prior initialization and the intended correction. It must not imply silent initialization, guessed policy, dependency upgrades, or complete verification when work remains unchecked. Link directly to `/docs/evaluate-reconcile-validate/#repair-a-project`. Present this as a documented workflow illustration, without fabricated execution results or another top-level section.

Use the existing nine example pages as deeper explanations, not additional intermediate destinations. The examples index can retain its current list; update its introduction and add concise links to the new visual pages instead of introducing another taxonomy.

Finish with a compact continuation to How it works and a direct Docs link. Do not append another capabilities grid, installation tutorial, adapter directory, or evidence dashboard.

## How it works page

### One continuous story

Use the existing initialized support-agent project and the exact request:

> Shorten the application's refund window from 30 days to 14

The page opens with this request and the coding agent's response in the established chat treatment. The response can retain the approved wording, **I updated the refund rule and everything connected to it.** A compact overview identifies the affected rule, instruction, and tests. The rest of the page explains that same work rather than introducing disconnected examples.

Show a small prerequisite near the opening: initialize once with **Initialize `moldea`**, then make ordinary requests. Explain that the walkthrough starts with an existing support agent; initialization alone does not create it.

Provide a compact anchor navigator for the following stages:

| Stage and anchor                                 | What the visitor sees                                                                                                                                                                                                                                      | Explanation and deeper link                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use the project's context** `#project-context` | The current refund policy, the application's responsibility for eligibility, and the `support` agent's responsibility for explaining it.                                                                                                                   | The coding agent reads relevant saved context and current project evidence. It does not automatically know every file or an entire conversation history. Link to `/docs/project-state/`.                                                                                                                  |
| **Follow the connections** `#connections`        | A small relationship diagram connects the changed refund rule to the instruction, runtime, and tests declared in the existing fixture.                                                                                                                     | Saved relationships guide which connected behavior needs attention; source inspection establishes what is actually there. Link to `/docs/continuous-maintenance/`.                                                                                                                                        |
| **Update the affected work** `#changes`          | A standard source diff shows 30 becoming 14 in the rule and instruction. Compact test outcomes show the 14-day boundary and the 15-day rejection on separate readable lines.                                                                               | The coding agent updates the coherent affected files. Use the initial and maintained snapshots, not independently authored matching snippets. Link to `/examples/maintain-a-refund-policy/`.                                                                                                              |
| **Check the result** `#checks`                   | A clear software-check lane shows supported connections checked repeatedly. A separate assessment identifies whether the instruction still reflects the refund rule. The existing broken/restored instruction example makes the adapter's purpose visible. | Explicitly call the software checks **deterministic checks**. The same relevant files, installed checker version, and configuration produce the same deterministic result. Model judgment and project tests remain distinct. Link to `/docs/evaluate-reconcile-validate/` and `/evidence/qualification/`. |
| **Carry context forward** `#next-session`        | A new session has the saved 14-day rule and its connected instruction available in the repository. Show the retained files and fact, rather than another long chat.                                                                                        | Relevant project knowledge can be loaded in later work because it was saved. This is not automatic host memory, background monitoring, or a guarantee of identical model responses. Link to `/docs/how-it-works/`.                                                                                        |

The check stage represents project verification and final structural validation after the changes. Any displayed successful result must already be supported by the fixture tests. The supplementary disconnected state must be presented as an explanation of a check, not as a fabricated failure that happened during the refund-change walkthrough.

Explain adapters in one short sentence beside the connection visual: they let the software checks recognize supported ways an agent uses instructions and tools. Show the integration used by the example and link to the full adapter qualification page. Do not add another manually maintained adapter catalog or imply that these checks call live providers.

Finish with a compact link to inspect recorded Evidence and a direct technical workflow link. The walkthrough is an illustration, not a newly recorded evaluation run; it must not borrow release badges, verdict counts, or claims from unrelated evidence.

## Visual and interaction requirements

Reuse the approved landing and Evidence treatments deliberately:

- Conversations have **You** and **Coding agent** inside their respective message surfaces. The response visibly belongs to the coding agent, with the approved dark `moldea` mark on a secondary background and the existing theme treatment. User and response prose use matching readable sizing.
- Keep code, instructions, and linked files subordinate to the message. Do not add redundant Example labels, nested headings, decorative statistics, or a toolbar above every excerpt.
- Use normal `CodeBlock` diff highlighting and `FilePreview` composition. Do not invent a diff design, merge tabs into file headers, or style private package markup. Illustrative code and diffs use `copyable={false}`.
- Use `Link2` and `Unlink` for connection states. Combine semantic status colors with labels and icons; green alone cannot communicate success. Keep company marks proportionate and unstacked.
- Use existing typography, spacing, colors, surfaces, and selection utilities. Keep the chat sections on the background that gives both avatars sufficient contrast. Avoid repeating tinted containers inside tinted sections.
- At 320px, flatten unnecessary outer cards, borders, and gutters. Wrap navigation links and prose, stack related comparisons in a clear reading order, and make paired action links full width where needed. Keep short examples free of avoidable vertical scrollbars.
- Essential explanations and visuals remain available without JavaScript. Use native links and anchors rather than a new tabbed application, carousel, or mutually exclusive accordion collection.
- Preserve heading hierarchy, landmarks, accessible names, keyboard navigation, focus visibility, and meaningful source order. Decorative diagram connectors and avatars do not create redundant announcements.
- New external-tab links include the established external-link icon and appropriate `rel` attributes. Reader-visible `moldea` uses `InlineBrandText` or semantic inline code; metadata and accessible plain-text labels remain plain text where markup is unavailable.
- Add no decorative animation. Preserve the shared client-navigation behavior and verify its reduced-motion path. If a small state transition becomes necessary, use existing package behavior and avoid height animation.

Desktop balance must come from content placement and appropriate widths, not fixed equal-height panels that create large mobile gaps. Review complete pages, including section transitions and the footer, rather than only individual components.

## Implementation architecture and file ownership

Use static Astro composition through `BaseLayout`. Keep narrative and example arrangement application-owned and the generic UI package-owned. There is no new React layer, client-side state store, dependency, data service, or UI-package release.

Inspected public exports to reuse include `action-link`, `breadcrumbs`, `inline-brand-text`, `file-preview`, `code-block`, `connection-label`, `result-summary`, and `site` utilities. Reuse the existing `AdapterCompanyLogo` and approved favicon assets. Feature-specific diagrams may compose semantic HTML and these exports; they are not new general-purpose UI primitives.

| Files                                                                                                                                                            | Required work                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Add** `website/src/pages/capabilities.astro` and `website/src/pages/how-it-works.astro`                                                                        | Thin route entries matching the current home and Evidence page pattern.                                                                                                                                                          |
| **Add** `website/src/components/capabilities-page/capabilities-page.astro`                                                                                       | Own the six outcome sections, stable anchors, curated visuals, and documentation handoffs. Keep static presentation values outside runtime interaction code.                                                                     |
| **Add** `website/src/components/how-it-works-page/how-it-works-page.astro`                                                                                       | Own the continuous walkthrough, chat opening, source-derived comparisons, stage navigation, and explanation of deterministic checks.                                                                                             |
| `website/src/lib/model/constants.ts`                                                                                                                             | Add one `PRODUCT_PAGE_METADATA` definition for the two routes, titles, descriptions, and concise search text. Pages and generation consume the same metadata.                                                                    |
| `website/src/lib/generation/generation.ts`                                                                                                                       | Register both routes in `createRouteManifest`, include distinct search records, and add the visual page links to `createLlmsText`. Preserve documentation discovery, example routing, evidence validation, and existing records. |
| `website/src/components/site-header/site-header.astro`                                                                                                           | Point primary links at the new pages, remove Examples, and classify `/examples/**` under Docs while retaining base-path-aware active-state behavior.                                                                             |
| `website/src/components/site-footer/site-footer.astro`                                                                                                           | Use an Explore group with Capabilities, How it works, Evidence, Docs, Getting started, and `llms.txt`. Preserve the existing Cloud, Packages, distribution, and source links.                                                    |
| `website/src/components/capabilities-overview/capabilities-overview.astro`                                                                                       | Change the six landing-card destinations to their `/capabilities/#...` sections and the overview CTA to `/capabilities/`. Preserve its approved copy, layout, and styling.                                                       |
| `website/src/components/documentation-page/documentation-page.astro`, `website/src/pages/docs/[...path].astro`, and `website/src/pages/examples/[...path].astro` | Use the shared breadcrumb builder described below. Pass the same result into the visible shell and structured metadata; remove the local builders. Preserve sidebar sections, previous/next navigation, and example URLs.        |
| `docs/capabilities.md`, `docs/how-it-works.md`, `docs/index.md`, and `docs/examples/index.md`                                                                    | Distinguish technical reference titles, explain visual entry points, and add a concise capability-reference entry linking to the existing project-repair guide. Preserve direct technical access and unrelated workflow bodies.  |
| `website/README.md`                                                                                                                                              | Document page ownership, navigation, retained example URLs, shared refund-preview derivation, and shared breadcrumb ownership. Preserve the renderer and evidence boundaries.                                                    |

Reuse the public `lib/landing-example/index.ts` exports for source excerpts and facts. The existing fixture, helpers, and verification remain authoritative; do not rename or move that module solely because additional pages consume it. Do not copy snapshots into a new fixture family.

### Shared refund previews

Add `website/src/lib/landing-example/preview.ts` and explicitly export `LANDING_EXAMPLE_PREVIEW` through the existing `index.ts`. It owns `policyDiff`, `contextDiff`, `instructionDiff`, and `testDiff`, derived once from the existing initial and maintained snapshots with `getLandingExampleLine`. Keep the small diff formatter private to this owner; do not build a generic diff engine or expose unused intermediate values.

Update `website/src/components/behavior-alignment/behavior-alignment.astro` and both new pages to consume these shared projections. Remove `createLineDiff`, the local boundary-assertion selections, and the four local diff builders from the landing component. Preserve its displayed source bytes, markup, copy, and styling. This narrow internal change is explicitly in scope alongside the landing link updates; it does not authorize a landing redesign or fixture duplication.

### Shared documentation breadcrumbs

Add `website/src/lib/documentation-navigation/utilities.ts` with `createDocumentationBreadcrumbs`, exported through a thin `index.ts`. Accept the required `route`, `section`, and `title` fields from the validated document model and return the public Website UI `IBreadcrumb[]` type. Reuse the public `@moldea.ai/website-ui/breadcrumbs` type rather than introducing an equivalent local contract.

The function owns the Docs root, ordinary docs, Examples index, and example-detail hierarchy. Return logical routes without applying the deployment base path; existing renderers apply it once. Preserve the Docs root's current terminal title and give example pages their Docs ancestor without duplicate terminal crumbs.

Both document route files compute this array once and pass it to `BaseLayout` and `DocumentationPage`. Make `DocumentationPage`'s breadcrumb prop required and remove its own reconstruction. Remove both route-local array builders. Do not retain an optional prop fallback, a legacy hierarchy option, duplicate builders, or a second document renderer. Other page-specific breadcrumbs remain outside this extraction.

The two page components can own their small static visual compositions directly. Extract a page-owned child component only if it develops a distinct meaningful responsibility; do not introduce a generic marketing-page engine, configurable diagram framework, or pass-through styling wrappers.

Route data continues through the existing model, generated cache, static rendering, search, sitemap, machine guidance, and artifact verifier. The two pages and their section lists are fixed editorial collections, not growing runtime datasets. No pagination or new caching is needed. Existing build-time cache ownership remains unchanged, and visitors trigger no repository inspection, filesystem access, model call, or provider request.

## Ordered implementation and review checkpoints

1. **Establish the two complete public experiences.** Centralize the refund-preview derivation, switch the landing consumer, and remove its superseded builders. Add route metadata, thin routes, both page compositions, the source-derived visuals, and the project-repair illustration. Register routes and discovery records so both pages build as real public destinations. Include focused preview and page tests, the capability-reference repair entry, and README ownership documentation with this work. Review content boundaries, unchanged landing output, and actual mobile and desktop renders before connecting the main navigation.
2. **Connect discovery and consolidate the documentation journey.** Introduce the shared breadcrumb builder, update both document routes and the required component prop, and remove all three local builders in the same change. Update header, footer, landing capability links, reference labels, and docs introductions. Remove the superseded primary Examples item and direct-to-reference promotional destinations. Include focused breadcrumb tests, affected navigation and artifact coverage, and documentation synchronization. Review the complete journey from a visual page into Docs, through an example, and back.
3. **Complete regression and visual verification.** Run the affected website's full existing correctness suite and quality checks. Inspect complete pages in both themes and across the supported width range, resolve task-caused issues, and review the final diff and documentation state. Do not call the work complete based solely on passing tests or the presence of the two routes.

These are strategic implementation steps, not an executable milestone breakdown. A later `breakdown` command can establish milestone boundaries without deferring required correctness evidence or leaving public links pointing at unfinished content.

## Verification plan

### Focused automated coverage

Add `website/src/lib/landing-example/preview.test-unit.ts` to verify the source-to-preview contract: removed and added lines come from their corresponding snapshots, each preview describes the correct file, and test excerpts retain both the inclusive boundary and the first excluded day. Preserve existing fixture integration coverage; do not add tests solely for trivial string concatenation.

Add `website/src/lib/documentation-navigation/utilities.test-unit.ts` for Docs root, docs detail, Examples index, and example detail. Verify ancestor order, terminal labels, no duplicate root/index crumbs, and unprefixed logical links. Artifact and browser tests verify that both rendered breadcrumb representations consume the same hierarchy, including under a deployment base path.

Add adjacent Playwright coverage at:

- `website/src/components/capabilities-page/capabilities-page.test-e2e.ts`
- `website/src/components/how-it-works-page/how-it-works-page.test-e2e.ts`

Cover direct loads, client navigation, section anchors, keyboard access, documentation handoffs, both themes, and narrow layouts. Test the actual visitor path and meaningful layout risks rather than exact prose everywhere or Tailwind class lists. Assert that illustrative excerpts do not acquire copy controls and that content remains readable without JavaScript. Verify that the project-repair illustration appears within the sixth capability section, links to the repair guide, and remains distinct from the read-only evaluation example.

Extend these existing tests:

- `website/src/lib/generation/generation.test-unit.ts`: both visual pages appear once in routes, search, and machine guidance; all required docs and examples remain; duplicate-route protections still apply.
- `website/scripts/verify-build.test-integration.ts`: both HTML artifacts, canonical URLs, sitemap entries, search records, and machine links agree; retained reference and example artifacts remain accessible. Check visible and structured example breadcrumb ownership consistently.
- `website/src/layouts/base-layout.test-e2e.ts`: the four primary destinations, correct Docs activation for reference and example routes, mobile navigation, client transitions, Back/Forward, and search results that distinguish visual pages from references. Update navigation-dependent copy tests to visit actual documentation code blocks explicitly, preserving their existing clipboard assertions.
- `website/src/components/home-page/home-page.test-e2e.ts`: the six capability handoffs resolve to the correct new anchors, shared refund previews preserve the currently displayed diffs and boundary outcomes, and the approved landing presentation remains intact.

Run the existing `lib/landing-example/fixture.test-integration.ts` as part of the integration suite. It already checks source snapshots, installed CLI behavior, read-only deterministic repetition, runtime connections, and refund boundaries. Do not add redundant unit tests for static copy or rerun paid semantic and adapter evaluations for a presentation-only change.

### Commands and execution order

Use the current website scripts and installed tools. During implementation, run the relevant focused tests first. On the finished change, from `website/`, run:

```bash
npm run docs:check
npm run test
npm run typecheck
npm run lint
npm run format:check
```

`npm run test` includes the full unit suite, a verified production build and artifact integration suite, and both existing browser-test configurations. Do not additionally repeat `npm run check` and `npm run build` on unchanged inputs merely to collect more passing commands. Run focused follow-up checks after fixes and repeat broader checks when their inputs or unresolved risks require it.

Format only touched files using the installed Prettier and `website/.prettierrc`, including its Astro and Tailwind plugins. Do not use the broad formatting script to rewrite unrelated files. New tests use existing adjacent Astro/TypeScript test conventions and current discovery configurations; no test scripts, dependencies, or runner changes are expected.

Verify base-path behavior with the same `BASE_PATH` and `SITE_URL` settings consumed by the existing build and browser tooling. In addition to normal-root verification, exercise the new routes, anchor links, navigation classification, and retained examples under `/preview/`. Supply environment variables through the invoking process, not a new platform-specific repository script. Use `npm run build` and `npm run test:integration:artifact` for that prefixed artifact and a focused invocation of the existing Playwright configuration for its affected navigation tests.

### Visual and accessibility acceptance

Inspect 320px, a representative wider phone, tablet, laptop, and large desktop widths. Check both light and dark modes and the intermediate widths where chat text and paired layouts wrap.

Specifically verify:

- no horizontal page overflow, clipped labels, crowded tabs, unnecessarily tall short code blocks, or broken refund-boundary text;
- balanced explanation and visual columns, compact mobile insets, consistent section backgrounds, and no stray footer gap;
- recognizable conversational direction, consistent message typography, proportionate avatars and adapter marks, and standard diff presentation;
- text-selection contrast on every surface used, including inline code and status areas;
- focus visibility, meaningful accessible names, heading order, keyboard and mobile navigation, no-JavaScript readability, and reduced-motion behavior;
- existing accessibility tooling reports no task-caused violations, with manual inspection covering issues automation cannot judge.

Keep screenshots or equivalent rendered evidence available for review. A passing browser suite does not establish that the design is good; the complete rendered pages must also satisfy the visual contract.

## Clean implementation acceptance

- Ship one final navigation structure and one implementation of each shared refund-preview derivation and documentation breadcrumb rule.
- Remove the superseded local builders, imports, old primary-navigation item, and obsolete test expectations in the change that replaces them. Preserve behavioral coverage at the new owner and consumer boundaries.
- Add no compatibility aliases, redirect routes, legacy switches, optional fallbacks for migrated callers, duplicate fixtures, parallel document renderers, or old/new page modes.
- Keep existing technical routes because they own current content, not to preserve an obsolete implementation. Each route has one renderer and one role in the final navigation.
- Review touched paths and their consumers for unused exports, unreachable branches, abandoned markup, and stale documentation. Do not expand this into repository-wide legacy cleanup.

## Publication and rollback

This change adds public routes and changes navigation, search descriptions, and example breadcrumb hierarchy. It does not remove existing URLs, change skill or CLI behavior, alter evidence artifacts, introduce persisted user state, or change schemas and external APIs.

The existing `.github/workflows/website.yml` checks the affected paths, and `.github/workflows/pages.yml` publishes the verified static artifact from `main`. No workflow, dependency, lockfile, environment contract, or shared Website UI package release is required. Publishing to `development` alone does not deploy the public site.

Commit, push, merge, and deployment are separate execution actions after implementation and review under the repository workflow. This planning command performs none of them. Rollback is a normal reviewed source revert followed by the existing deployment pipeline; the original docs and examples remain available throughout. There is no database migration or data backfill.

## Risks and scope boundaries

- **The two new pages could repeat one another.** Capabilities owns breadth and distinct outcomes; How it works owns the single refund-change sequence. Reuse underlying facts without copying full landing sections onto both pages.
- **Visual polish could obscure product limits.** Keep deterministic structure checks, project tests, and semantic judgment distinct. Do not imply guaranteed behavior, live provider verification, automatic host memory, or autonomous background maintenance.
- **The simpler menu could hide useful technical material.** Keep Docs directly reachable, preserve the examples sidebar and URLs, and provide specific links beside relevant visuals.
- **Navigation changes could silently weaken existing tests.** Update destination expectations only where behavior intentionally changes; retain clipboard, accessibility, theme, transition, and evidence assertions.
- **Correct desktop components could produce a bloated mobile page.** Treat mobile composition and full-page visual inspection as completion criteria from the first implementation step.

Out of scope: redesigning the landing or Evidence pages, changing skill instructions or execution, deleting or broadly rewriting documentation, adding a third showcase page, creating a new adapter catalog, adding a live demo backend, running paid evaluations, editing the sibling repositories, changing the shared UI package, or modifying protected coding-instruction files.

The two challenge findings are addressed by explicit shared ownership and project-repair coverage. The prior challenge applies only to the superseded plan version; this revision needs a fresh challenge if requested. No material product or architecture decision remains unresolved for this proposal. The exact phrasing and visual arrangement can be refined during implementation within the page ownership, source accuracy, and acceptance criteria above. A material change to route ownership, page count, preserved URLs, or product claims requires a revised plan.

## Approval required

Approval is requested for two visual pages at `/capabilities/` and `/how-it-works/`; a four-item primary navigation; integrated examples including explicit project repair; retained active technical documentation; shared refund-preview and breadcrumb implementations with superseded code removed; necessary search, SEO, machine-guidance, documentation, and tests; and complete responsive, theme, accessibility, and visual verification. Landing changes are limited to capability destinations and consuming shared refund projections without changing its appearance. No backward-compatibility or legacy layer will be added. Implementation, commits, pushes, and deployment have not started.
