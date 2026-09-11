# Landing-page installation flow plan

## Task contract

Rework the landing-page opening so the visitor moves directly from the hero into the existing “One install. One ordinary request.” section, sees initialization presented as the recommended and important foundation for durable project context without being told that it is universally required, and then sees a concrete natural-language request that can either begin outcome-driven work or demonstrate how ordinary work continues after initialization.

The hero’s primary action will become “Install the skill” and will scroll to the “One install. One ordinary request.” section rather than opening skills.sh. The existing navigation and final-page distribution actions will continue to link to skills.sh.

The implementation is limited to landing-page composition, the getting-started simulation, the directly affected styling tokens and browser tests. It will not change skill behavior, installation commands, documentation routes, package dependencies, site-wide navigation, public metadata, or the final skills.sh CTA.

## Current behavior and repository evidence

- `README.md` identifies `website/` as the isolated Astro application for the public skill website and establishes that the website uses the shared `@moldea.ai/website-ui` design foundations.
- `website/package.json` pins Astro 7.2.2, Tailwind CSS 4.3.3, and `@moldea.ai/website-ui` 1.2.2. The existing Astro and Tailwind patterns should be extended without adding a dependency or a new styling mechanism.
- `website/src/components/home-page/home-page.astro` currently renders `WhyMoldea` before `GettingStartedSimulation`. Its hero primary action is “Get moldea on skills.sh” and opens the external skills.sh listing, while the header and final landing-page CTA provide additional external distribution paths.
- `website/src/components/getting-started-simulation/getting-started-simulation.astro` currently places the heading “Describe the outcome naturally.” directly above `Initialize moldea`. The surrounding right-hand panel and completion state specifically describe the initialization workflow.
- `docs/getting-started.md` presents initialization prominently, then separately demonstrates an ordinary outcome request. It also establishes that separate initialization is not universally required when the requested outcome can establish the needed foundation. The landing page should preserve that behavioral contract while making initialization the recommended and visually dominant onboarding story.
- The shared `@moldea.ai/website-ui` stylesheet already provides smooth anchor scrolling and changes it to immediate scrolling under `prefers-reduced-motion: reduce`. The landing page therefore needs only a normal fragment link and the existing Tailwind scroll-margin utility, not custom scrolling JavaScript or animation.
- `website/src/components/home-page/home-page.test-e2e.ts` asserts the current heading order, hero distribution link, alternating opening-section backgrounds, 320px layout, both themes, and material accessibility. `website/src/components/getting-started-simulation/getting-started-simulation.test-e2e.ts` asserts the initialization story and theme-aware selection treatment. `website/src/layouts/base-layout.test-e2e.ts` currently locates the hero’s external CTA as part of its skills.sh distribution-path check.

## Desired experience and acceptance criteria

1. The opening page order is:
   1. Hero
   2. “One install. One ordinary request.”
   3. “Turn coding-agent work into durable project infrastructure.”
   4. “One change can affect more than one file.”
   5. The remaining landing-page sections in their current order
2. The hero primary action reads exactly `Install the skill`.
3. Activating that action with a pointer or keyboard updates the page fragment and scrolls the “One install. One ordinary request.” heading into view with sufficient clearance for the sticky site header.
4. The hero action remains an in-page action. It has no external-link target or relationship attributes. The header and final CTA remain the external skills.sh distribution paths.
5. The getting-started section keeps its existing heading, install command, copy interaction, initialization workflow, agent-process explanation, and initialization completion message.
6. Initialization is emphasized through the recommended visual sequence and the exact step copy:
   - Eyebrow: `Recommended first request`
   - Heading: `Establish the durable project foundation.`
   - Developer request: `Initialize moldea`
7. The section introduction reads: `Add the skill to your project and establish durable, Git-owned context. Initialization is the recommended starting point, and you can still begin with the outcome you want.` This explicitly preserves outcome-first use while giving initialization a strong central position without using universal requirement language such as “must,” “required,” or “prerequisite.”
8. After the initialization completion state, the simulation adds a clearly separated ordinary-work example with:
   - Eyebrow: `Ordinary project work`
   - Heading: `Describe the outcome naturally.`
   - Supporting copy: `This can be your first request or what comes next after initialization.`
   - Developer request: `Create a support agent grounded in our current refund policy.`
9. The ordinary-work example is visually separated from the numbered installation and recommended-initialization path. Its supporting copy prevents the layout order from implying that initialization is a universal prerequisite. This preserves the punch and meaning of “One install. One ordinary request.” while showing both the recommended foundation and a natural outcome request.
10. The reordered opening sections continue alternating established `bg-background` and `bg-sidebar` tokens. No adjacent opening sections visually merge because they share the same section background.
11. The expanded simulation remains usable without horizontal page overflow at 320px, progressively uses the existing desktop layout, supports keyboard interaction and visible focus, and retains accessible names and heading hierarchy.
12. All changed surfaces remain legible in light and dark themes. No hard-coded colors or new theme mechanism are introduced.
13. The change adds no custom motion. Existing smooth scrolling and the existing reduced-motion override remain authoritative.

## Proposed implementation

### 1. Recompose the landing-page opening and hero action

Update `website/src/components/home-page/home-page.astro` to:

- move `<GettingStartedSimulation />` immediately after the hero and move `<WhyMoldea />` immediately after it;
- change only the hero primary action label to `Install the skill`;
- point the hero primary action at the existing `#getting-started-title` heading fragment so the destination is the titled section the visitor sees;
- remove the hero action’s external-only `target`, `rel`, and `data-brand-plain` attributes while retaining the existing primary-action styling and icon;
- preserve the secondary “See the alignment model” action and the final “Get moldea on skills.sh” action unchanged;
- retain the `SKILLS_DIRECTORY_URL` import because the final external distribution CTA still consumes it.

The fragment navigation will use the browser’s native anchor behavior. No click handler, scrolling helper, state, client script, or new animation will be added.

### 2. Preserve the opening visual rhythm after reordering

Update the section-level background classes in:

- `website/src/components/getting-started-simulation/getting-started-simulation.astro`, changing the section background from `bg-background` to `bg-sidebar`;
- `website/src/components/why-moldea/why-moldea.astro`, changing the section background from `bg-sidebar` to `bg-background`.

This produces the established alternating sequence after the reorder: hero background, getting-started sidebar, why-moldea background, behavior-alignment sidebar, and open-source-system background. Existing borders and token-driven light/dark theme behavior remain intact.

Add `scroll-mt-24` to the existing `getting-started-title` heading so the native fragment destination clears the sticky header. Reuse the same spacing value already established by other landing-page anchor targets.

### 3. Expand the getting-started simulation around initialization and continued work

Update `website/src/components/getting-started-simulation/getting-started-simulation.astro` without creating a new general-purpose component:

- replace the section introduction with the approved initialization-forward copy;
- keep step 01, its exact install command, clipboard button, live-region status, and client script unchanged;
- change step 02’s eyebrow and heading to `Recommended first request` and `Establish the durable project foundation.` while preserving the `Initialize moldea` developer message;
- keep the right-hand “Your coding agent handles the rest” initialization panel, its three existing process statements, and its existing completion state, because they remain an accurate explanation of the emphasized initialization request;
- append one unnumbered ordinary-work subsection after the current two-column grid and within the existing simulation card;
- give that subsection its own heading relationship, a top border that clearly follows the initialization completion, token-based surface styling, and a mobile-first stacked layout that can become a balanced two-column row at the existing large breakpoint;
- place the `Ordinary project work` eyebrow, `Describe the outcome naturally.` heading, and `This can be your first request or what comes next after initialization.` supporting copy on one side and a developer message card containing `Create a support agent grounded in our current refund policy.` on the other;
- reuse the existing developer-message visual language locally, including the accessible developer label, avatar treatment, border, typography, and theme tokens. Avoid extracting a pass-through component or changing the broader `Conversation` component because this compact onboarding message has different containment and layout responsibilities.

The added request deliberately connects to the refund-policy narrative in the following behavior-alignment section, creating continuity from agent creation to later behavior maintenance whether the developer initializes first or begins with the outcome.

### 4. Synchronize focused browser coverage

Update `website/src/components/home-page/home-page.test-e2e.ts` to:

- locate the hero action by the exact accessible name `Install the skill`;
- assert that its destination is `#getting-started-title` and that it no longer opens an external browsing context;
- enable reduced-motion mode for deterministic fragment positioning, activate the action through the keyboard, and assert the resulting URL fragment;
- compare the target heading’s bounding rectangle with the sticky banner’s bottom edge and the viewport height, proving that the heading actually scrolled into the visible viewport without being obscured by the header;
- retain a direct visibility assertion for the “One install. One ordinary request.” heading;
- update the expected level-two heading order so getting started precedes why-moldea;
- retain the opening-section background alternation assertion, which will verify the paired component background changes;
- preserve the existing hero typography, complete-page 320px overflow, light/dark theme, and axe accessibility assertions.

Update `website/src/components/getting-started-simulation/getting-started-simulation.test-e2e.ts` to:

- assert the new section introduction and the initialization-forward step heading;
- retain the install command, `Initialize moldea`, agent-process, completion, and surface-selection assertions;
- assert the ordinary-work heading, its explicit first-or-next-request supporting copy, and the exact natural-language support-agent request;
- assert that the ordinary-work example is outside the numbered onboarding list and appears after the initialization completion in document order, preserving the recommended narrative without representing initialization as a universal prerequisite;
- check the expanded simulation for local horizontal overflow at 320px in both light and dark modes, complementing the existing whole-page responsive and accessibility coverage.

Update `website/src/layouts/base-layout.test-e2e.ts` so its desktop skills.sh distribution assertion explicitly targets the header’s `Get the skill` action instead of falling through from the removed hero distribution link to the final CTA. Preserve its mobile header distribution assertion and all other layout coverage.

No unit test is needed because the change adds no application-owned calculation, parsing, validation, state transition, or reusable logic. Browser-level coverage is the correct boundary for section order, fragment navigation, copy, responsive layout, accessibility, theme behavior, and preserved external distribution paths.

## Files to modify

- `website/src/components/home-page/home-page.astro`
- `website/src/components/home-page/home-page.test-e2e.ts`
- `website/src/components/getting-started-simulation/getting-started-simulation.astro`
- `website/src/components/getting-started-simulation/getting-started-simulation.test-e2e.ts`
- `website/src/components/why-moldea/why-moldea.astro`
- `website/src/layouts/base-layout.test-e2e.ts`

No files will be added or removed during implementation. No package, lockfile, configuration, generated model, snapshot, migration, protected coding-instruction file, or ordinary project documentation is expected to change.

## Ordered implementation steps and review checkpoints

1. Update the getting-started section copy and structure while preserving the install and initialization mechanics. Review the rendered semantic hierarchy to confirm that initialization is the dominant recommended foundation, the ordinary-work example can also be understood as an outcome-first entry point, and neither copy nor layout states or implies that initialization is mandatory.
2. Reorder the landing-page components, convert the hero CTA to the heading fragment, and swap the getting-started and why-moldea section backgrounds. Review the opening sequence, sticky-header clearance, remaining external distribution actions, and section alternation before touching tests.
3. Update the three directly affected browser-test files to encode the new navigation, content, order, responsive behavior, and preserved skills.sh paths. Review each changed expectation against the implemented user-visible contract rather than merely replacing stale strings.
4. Format only the touched files, inspect the complete diff, and render the landing page at desktop and 320px in both themes. Review visual hierarchy, spacing, card balance, heading flow, focus visibility, accessible names, absence of overflow, and the reduced-motion anchor behavior.
5. Run the focused and broader verification commands below. If a test fails, triage it against the approved copy and navigation contract before changing production code or expectations.
6. Recheck `README.md`, `website/README.md`, and `docs/getting-started.md` for state alignment. No documentation edit is expected because the change does not alter installation or initialization behavior and the existing guide already presents initialization prominently while preserving its non-mandatory contract.

## Verification commands

Run the following focused browser check from `website/` after formatting:

```bash
npm exec -- playwright test src/components/home-page/home-page.test-e2e.ts src/components/getting-started-simulation/getting-started-simulation.test-e2e.ts src/layouts/base-layout.test-e2e.ts --config playwright.config.ts
```

Format only the touched files from `website/`:

```bash
npm exec -- prettier --write --config .prettierrc src/components/home-page/home-page.astro src/components/home-page/home-page.test-e2e.ts src/components/getting-started-simulation/getting-started-simulation.astro src/components/getting-started-simulation/getting-started-simulation.test-e2e.ts src/components/why-moldea/why-moldea.astro src/layouts/base-layout.test-e2e.ts
```

Run the complete website correctness suite from the repository root:

```bash
npm --prefix website test
```

Run the established website documentation, unit, type, lint, formatting, build, and artifact verification boundary from the repository root:

```bash
npm run website:check
```

The implementation report must distinguish checks actually completed from checks that could not run. It must not claim visual, theme, responsive, accessibility, or reduced-motion verification without performing it.

## Compatibility, safety, and operational considerations

- The hero CTA behavior changes from an external navigation contract to an in-page fragment contract. The external skills.sh destination remains available in the sticky header, mobile navigation, and final CTA, so the change does not remove the public installation path.
- The target uses an existing heading ID and native browser behavior, so it remains functional without client JavaScript and under Astro view transitions.
- The shared stylesheet already respects reduced-motion preferences by disabling smooth scrolling. The implementation must not override that behavior.
- The longer natural-language request must wrap within the message card at 320px. No fixed width, unbounded inline code treatment, or horizontal scrolling should be introduced.
- The background changes use only existing semantic theme tokens. Contrast, selection styling, focus styling, and dark-mode behavior remain owned by the established design system.
- The copy must emphasize initialization through placement and language while explicitly preserving outcome-first use. The `Recommended first request` label and the natural-request supporting sentence are both required to keep the visual sequence from implying a universal prerequisite. The existing documentation remains the authority for the distinction.
- There are no database, persistence, API, authentication, authorization, billing, configuration, dependency, deployment, migration, or rollback implications.
- Rollback is limited to restoring the prior component order, hero external CTA attributes, getting-started copy/layout, section backgrounds, and their matching browser expectations.

## Documentation and coding-instruction state

The implementation will perform a final state-bearing documentation check. No documentation change is currently planned because the landing page is clarifying the presentation of behavior already documented in `docs/getting-started.md`; it is not changing that behavior.

Protected coding-instruction files will not be modified. The current instructions already cover frontend responsiveness, accessibility, themes, reduced motion, UI-package reuse, React performance where applicable, tests, formatting, and documentation synchronization, so no coding-instructions handoff is expected.

## Approval required

Approval authorizes only the six-file landing-page implementation described above: reorder the getting-started and why-moldea sections, make the hero’s “Install the skill” CTA scroll to “One install. One ordinary request.”, present initialization as the recommended first request without making it a universal prerequisite, add the natural support-agent request as an outcome-first-or-later example, preserve visual alternation and external skills.sh paths, prove the CTA’s visible scroll destination in browser coverage, and complete the listed verification and documentation-state checks.
