# Landing page implementation milestones

## Basis and execution boundaries

This sequence implements `coding-agent-planning/1789337505_skill-landing-page/plan.md`, SHA-256 `d77b874e69278e26fc20b4d9a395d59a3143426dba843d04227482fb0ce76011`, against repository HEAD `a9d085427c853d9948aa75df1002b9f66633e6fd`. No implementation has started. The plan and this milestone sequence await approval.

Two milestones provide coherent review boundaries. Milestone 1 completes the connected example and product explanation, including their actual correctness evidence. Milestone 2 completes proof, adoption, and the final page composition. Do not create a fixture-only milestone, placeholder links, temporary duplicate components, or a separate milestone for required testing.

The implementation remains within the skill website and its supporting example, tests, and documentation. Evidence routes, qualification artifacts, shared packages, skill/CLI behavior, dependencies, and deployment infrastructure remain unchanged. Reuse installed Website UI 1.7.1; another package release is not required.

## Requirements applying to both milestones

- Follow the plan's copy and claim boundaries. Visible prose mentions of `moldea` use inline code. Distinguish coding-agent judgment, deterministic source checks, application tests, and recorded evidence. Do not fabricate runtime results, comparisons, or performance claims.
- Reuse public Website UI exports and existing application components. Keep rendering static, examples bounded, and source excerpts derived from the authoritative fixture. Do not add model calls, provider execution, client-side fixture execution, caching, or general-purpose UI abstractions.
- Verify each changed surface at 320, 390, 768, 1024, and 1440px. Check narrow mobile and desktop in both themes, keyboard use, focus visibility, accessible names, zoom/reflow, and reduced motion. Review actual screenshots for hierarchy, density, spacing, alignment, code readability, and optical logo balance. Automated overflow and axe checks supplement visual review.
- Keep mobile content compact and avoid nested cards, unnecessary dividers, and overlapping logos. Code may scroll within its own region; the page must not overflow horizontally.
- Keep illustrative excerpts and diffs selectable without copy controls or empty toolbar space. Useful complete commands use the existing compact shared copy behavior.
- Keep tests, directly affected documentation, removal of superseded code, and verification with the milestone that changes the behavior. Update stale assertions only when the intended new behavior supports the change; preserve meaningful regression coverage.
- Check the root README and directly affected documentation. Update `website/README.md` as described below. Protected coding instructions remain untouched; report a handoff only if completed changes reveal durable guidance that is missing.
- Inspect the final diff and preserve unrelated changes. Report milestone completion separately from completion of the entire landing-page redesign. Do not mark a milestone complete while its required behavior or verification remains unresolved.

After focused checks, run the complete existing website correctness suite and required quality checks from the repository root:

```bash
npm --prefix website test
npm --prefix website run typecheck
npm --prefix website run lint
npm --prefix website run format:check
npm --prefix website run docs:check
npm run path:check
```

Format only the milestone's touched files using the installed website Prettier and its configuration before final checks. The generic website test command includes the existing unit, integration, and browser categories, production generation, and artifact checks. Reuse successful verification only while its applicable inputs remain unchanged; after fixes, rerun affected checks. Record actual results and any environmental limitations.

## Milestone 1: Complete product story and verified example

### Objective and dependencies

Deliver the final hero, honest coding-agent explanation, application-maintenance story, deterministic adapter demonstration, and repository visualization as one coherent public example. Both hero CTAs must lead to working content.

Dependencies: approval of the plan and milestone sequence, explicit authorization to implement Milestone 1, and the existing local website and CLI toolchain. There is no earlier implementation milestone.

### Owned files and boundaries

Create:

- `website/src/components/agent-example/agent-example.astro`
- `website/src/components/agent-example/agent-example.test-e2e.ts`
- `website/src/lib/landing-example/fixture.ts`
- `website/src/lib/landing-example/fixture.test-integration.ts`
- `website/src/lib/landing-example/index.ts`

Modify:

- `website/src/components/home-page/home-page.astro` and `home-page.test-e2e.ts`: the hero, metadata, first four principal sections, CTAs, section order, and removal of replaced benefits/ownership presentation.
- `website/src/components/why-moldea/why-moldea.astro` and `why-moldea.test-e2e.ts`.
- `website/src/components/behavior-alignment/behavior-alignment.astro` and `behavior-alignment.test-e2e.ts`.
- `website/src/components/open-source-system/open-source-system.astro` and `open-source-system.test-e2e.ts`.
- `website/src/components/repository-format/repository-format.astro`, `repository-format.test-e2e.ts`, and `constants.ts`.
- `website/src/components/getting-started-simulation/getting-started-simulation.astro` and its test only for the initialization wording needed to keep the completed product story consistent with the setup destination. The setup redesign and clipboard replacement belong to Milestone 2.
- `website/src/layouts/base-layout.test-e2e.ts` only where its existing landing hero assertions require adjustment; preserve shared-layout coverage.
- `website/README.md`: the illustrative project's ownership, verification, and distinction from recorded evidence.

Remove after confirming there are no independent callers:

- `website/src/components/capability-card/capability-card.astro`
- `website/src/components/conversation/conversation.astro`
- `website/src/components/conversation/types.ts`
- `website/src/components/conversation/conversation.test-e2e.ts`

No shared package, qualification fixture, provider source package, or production CLI code is changed. Existing lower-page evidence and adoption components remain functional until their redesign in Milestone 2.

### Implementation work

**Build the authoritative example and its verification together.** Author the complete illustrative support project, the maintained 14-day version, and the disconnected/repaired loader states. Include the manifest, project description, policy, agent description/instructions, runtime source, order-lookup implementation/registration, schema, package metadata, and the isolated application refund rule with its colocated test. Use the supported OpenAI source pattern already identified by the plan.

Record exact `affectedBy` paths for the application rule, its test, and the saved policy. Keep the model in source code. Model eligibility as a pure predicate over a non-negative integer number of completed days with an inclusive final day. Keep payment effects, date arithmetic, and provider execution outside the example. The fixture's Node test scripts describe its own executable sample; the website retains Vitest as the integration-test owner.

Use the real installed CLI in disposable local Git repositories, with argument arrays, bounded output, the established timeout, and reliable cleanup. Run the isolated sample application test separately from provider source. Production rendering must never invoke these processes. Export only the fixture content and presentation inputs needed by the page through the thin module entry.

**Build the hero and comparison.** Use the plan's headline and request. Show the concrete saved refund rule, existing application rule and order lookup, resulting instruction/code/manifest files, model choice, and the specific instruction-connection result in the initial view. Use `HeroBackdrop` and the existing design system.

Place optional source detail in a closed shared `Accordion`, with a unique group and three shared tabs: Agent code, Instructions, and Connections. Opening it must leave the main sequence visible. Mark excerpts as non-copyable. Keep the install link targeting `#getting-started-title` and connect the secondary CTA to the completed deterministic explanation.

Reshape `WhyMoldea` into the concise coding-agent objection and context comparison. Both sides have the same request and available facts; explain the maintained context, relationships, and checks supplied by `moldea` without inventing different answers or claiming that coding agents cannot save information.

Within this milestone, inspect the completed hero at desktop and 320px before extending the remaining sections. This is an implementation review checkpoint, not permission to leave the rest of this milestone unfinished.

**Complete maintenance and deterministic explanation.** Continue from the 30-day project to the application request changing the window to 14 days. Show the changed rule, boundary test, declared relationship, saved policy, and support instructions. Identify the loader, lookup, and schema as reviewed and unchanged where accurate. Preserve `#behavior-alignment` and remove the old conversation presentation and its unused module.

Use the maintained project for the disconnected-instructions illustration. Show the source bypassing the declared loader, the supported negative diagnostic, the coding-agent repair, and the repeated positive check. Keep technical diagnostic identifiers in supporting detail. Explain what adapters check and the distinction from runtime behavior.

Use compact, separate OpenAI, Anthropic, and Vercel company logos in that order. Preserve the packages link and link to all integrations. Label the existing recorded OpenAI tool-name repair accurately so it cannot be mistaken for the illustrated loader repair. Do not add a competing naming-mismatch illustration or a misleading provider count.

**Complete the repository explanation and assemble the story.** Preserve the two-file initialization explanation and align the tree with the shared project. Distinguish initial files from the later agent task. Merge ownership/local-first reassurance here, keeping the safety/privacy link. Remove the obsolete standalone ownership panel, capability grid, unused capability component, and abstract hero panel in the same milestone.

Place the completed hero/comparison, maintenance, checks, and repository sections in their final relative order. Keep the existing evidence and adoption destinations working after them. Correct the old setup suggestion that an ordinary creation request replaces explicit initialization; do not introduce temporary setup or clipboard implementations. Synchronize the new example documentation and all directly affected assertions.

### Verification

Run the fixture integration and focused hero/browser checks from `website/`:

```bash
npm run test:integration:artifact -- src/lib/landing-example/fixture.test-integration.ts
npm exec -- playwright test src/components/agent-example/agent-example.test-e2e.ts src/components/home-page/home-page.test-e2e.ts src/components/why-moldea/why-moldea.test-e2e.ts src/components/behavior-alignment/behavior-alignment.test-e2e.ts src/components/open-source-system/open-source-system.test-e2e.ts src/components/repository-format/repository-format.test-e2e.ts --workers=2
```

The fixture integration must prove all of the following:

- Validation accepts the coherent project, and inspection supplies positive instruction-loader and tool-registration evidence. A successful exit alone cannot justify the hero's label.
- Bypassing the loader produces `OPENAI_INSTRUCTION_LOADER_NOT_WIRED`; repair removes the diagnostic and restores positive evidence while the lookup remains connected.
- Scope matching finds the support agent from both the application-rule path and policy path, and does not match an unrelated application path.
- The original rule accepts day 30 and rejects day 31; the maintained rule accepts day 14 and rejects day 15. Cover day zero and invalid negative, fractional, or non-finite inputs.
- The sample's before/after tests execute against their corresponding source. The changed day-15 expectation fails against the old implementation.
- Updated descriptions and intentionally unchanged loader/tool/schema bodies match the illustrated changes, without claiming semantic evaluation.
- Repeated checks of unchanged inputs produce stable results and do not modify fixture files.

Validate the needed CLI response fields using the existing schema/version conventions. Verify that the new integration test is discovered in its existing category. Confirm that website test files and temporary fixture tests are absent from production artifacts; intentionally rendered sample excerpts remain explanatory content.

Browser checks must cover the initial complete sequence with source detail closed, disclosure independence, keyboard tabs, focus, no-JavaScript readability, both CTAs, brand formatting, and the distinction between illustration and recorded evidence. Verify that all new excerpts and diffs omit copying. Apply the common viewport, theme, motion, visual, documentation, and full-regression requirements to the finished surfaces.

### Acceptance criteria

- A visitor can identify the request, useful project context, resulting files, and specific software check without opening source detail.
- The initial visual includes the model, instructions, and `moldea.yaml`, with plain-language captions.
- The complete creation, maintenance, and disconnected-loader story uses one consistent project and source of truth.
- Every illustrated positive/negative check and application boundary is backed by the integration evidence above.
- The coding agent's judgment, application test, deterministic relationship matching, and adapter inspection have distinct, accurate meanings.
- The repository tree and setup wording agree with the story; all CTAs and evidence links work.
- Superseded hero, conversation, capability, and standalone ownership paths are removed without deleting independently used code.
- Required browser review and automated checks pass, documentation is synchronized, and no unrelated changes are included.

### Review checkpoint

Review the actual desktop and mobile hero with the source disclosure closed. Confirm that it explains why to adopt `moldea`, rather than merely showing ordinary code generation. Then follow the same project through code/test/policy/instruction maintenance and the disconnected-loader repair. Inspect the source-backed claims, declaration boundaries, logos, and preserved repository view.

Milestone 1 completes the product story, not the entire landing-page redesign. Stop after reporting its result; Milestone 2 requires separate authorization.

## Milestone 2: Complete evidence, adoption, and final page composition

### Objective and dependencies

Deliver the complete six-section landing page with compact evidence links, compatible coding agents, a short install/initialize/build journey, and the final visual and regression review across the entire page.

Dependencies: completed and reviewed Milestone 1, resolution of any blocking findings, and explicit authorization to implement Milestone 2. Reuse Milestone 1's fixture and proven claim boundaries; do not create another example or parallel implementation.

### Owned files and boundaries

Modify:

- `website/src/components/home-page/home-page.astro` and `home-page.test-e2e.ts`: compact evidence, final adoption composition, removal of the repeated closing CTA, and completed page-order/interaction assertions.
- `website/src/components/getting-started-simulation/getting-started-simulation.astro` and `getting-started-simulation.test-e2e.ts`: final setup design and shared copy behavior.
- `website/src/components/coding-agent-compatibility/coding-agent-compatibility.astro`: integrate its existing logos and compatibility information with adoption.
- `website/src/layouts/base-layout.test-e2e.ts`: replace private setup-copy selectors with assertions scoped to the shared code-copy control; retain failure and client-navigation coverage.
- `website/scripts/verify-build.test-integration.ts`: update only affected landing assertions while preserving evidence counts, provenance, canonical metadata, and artifact checks.
- `website/README.md` only if the final setup/copy composition requires a directly affected documentation update; verify that the example ownership documented in Milestone 1 remains accurate.

The milestone also owns scoped fixes in Milestone 1's touched components if final composition testing reveals a regression or prevents the approved acceptance criteria from being met. This does not authorize a new design direction, unrelated cleanup, or changes outside the plan.

### Implementation work

**Make proof concise.** Replace the landing evidence panels with balanced Decision evaluation and Adapter qualification links and their short plain-language explanations. Reuse the current release summaries and validated model. Keep any counts secondary and preserve retry-confirmed result meanings and unavailable states. Do not manually maintain totals, change evidence generation, or duplicate the evidence-page browsers.

**Complete adoption.** Combine the existing coding-agent compatibility presentation with **Install. Initialize. Start building.** Preserve existing logos and compatibility boundaries. Use the existing `INSTALL_COMMAND`, explicit initialization request, and support-agent request, with the initialization and agent-creation outcomes clearly separated.

Replace the setup component's private clipboard code with shared `CodeBlock` copying and the already-installed layout controls. Delete its custom script, obsolete status machinery, and superseded selectors in the same change. Keep useful install copying compact; excerpts and diffs stay non-copyable. Preserve the `#getting-started-title` destination, documentation links, manual fallback when copying fails, and behavior after direct or Astro client navigation.

Absorb the final repeated CTA into adoption and remove the old panel. Keep the completed page in the plan's six principal sections, with the compact coding-agent objection accompanying the hero. Finish spacing and transitions across section boundaries without restoring nested panels or redundant mobile dividers.

**Verify the whole result.** Review every section together in both themes and the planned viewport sizes. Confirm that the top remains convincing without reading code, technical depth is optional, company logos are balanced, and the lower page offers a short path from proof to installation. Fix scoped visual, accessibility, interaction, and test regressions before reporting completion. Complete the documentation and final-diff checks.

### Verification

Run focused browser checks from `website/`:

```bash
npm exec -- playwright test src/components/home-page/home-page.test-e2e.ts src/components/getting-started-simulation/getting-started-simulation.test-e2e.ts src/layouts/base-layout.test-e2e.ts --workers=2
```

Verify:

- Both evidence links, their explanations, inline counts, result meanings, and existing availability behavior match the validated evidence model.
- The recorded tool-name repair remains distinct from the illustrative loader repair, and all navigation destinations still resolve.
- Setup follows installation, explicit initialization, and agent creation in that order, with no claim that initialization creates the working agent.
- The install command copies its exact source through the shared control. Success, clipboard failure, keyboard access, and repeated client navigation remain usable without duplicate handlers or controls.
- Every illustrative excerpt and diff remains free of copying and reserved toolbar space.
- The complete page has the intended section order, responsive layout, visible focus, accessible names, brand formatting, and light/dark/reduced-motion behavior.

Run the common full website suite and quality checks. Its artifact integration verifies the final evidence/metadata presentation and production output. Repeat the fixture checks through that suite; modify their expectations only if an approved example change and its source evidence justify it.

Capture and inspect the complete page at the planned sizes, including the fully composed 320px mobile view. Review both the default closed source disclosure and its expanded interaction. Check section transitions and density rather than inspecting each component only in isolation.

### Acceptance criteria

- The entire landing page satisfies every acceptance criterion in the current plan.
- Evidence remains accurate and easy to reach without large counter panels or a duplicated journey browser.
- Compatible coding agents and the install/initialize/build sequence form one compact adoption section with working shared copying.
- No obsolete clipboard implementation, repeated closing CTA, superseded section, or unused component remains from this redesign.
- The hero and maintenance/check demonstrations retain their verified claims and visual hierarchy after the lower-page integration.
- The complete page is usable at 320px, polished on desktop, and verified in both themes, with keyboard and reduced-motion behavior intact.
- All required checks pass, relevant documentation is current, the final diff is scoped, and any verification limitations are explicitly resolved before claiming completion.

### Review checkpoint

Review the whole landing page as a first-time visitor asking, “Can't my coding agent already do this?” Confirm that the visible example answers that question, the maintenance and source-check examples reinforce it, and proof and setup are easy to reach without excessive reading or scrolling through repeated panels.

Inspect the final diff and verification results before publication. This milestone completes implementation and verification of the approved landing scope. Use the existing review/fix/repo-push and deployment workflows when authorized. A development-branch push is not deployment; Pages deploys through the existing `main` workflow. No shared-package publication or migration is required. Rollback remains a normal reviewed reversal and static redeployment.

## Plan coverage

| Plan deliverable                                                                                                 | Milestone ownership                                                  |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Complete visible hero, optional source inspection, and honest context/coding-agent comparison                    | Milestone 1                                                          |
| Authoritative example, real CLI diagnostics, scope matching, application rule/tests, and sample immutability     | Milestone 1                                                          |
| Connected maintenance story, adapter explanation, company logos, and accurately labeled recorded repair          | Milestone 1                                                          |
| Repository visualization, ownership reassurance, and removal of replaced benefits/conversation paths             | Milestone 1                                                          |
| Explicit initialization truth                                                                                    | Milestone 1 wording correction; Milestone 2 final setup composition  |
| Compact validated evidence, compatibility, shared installation copying, and removal of the repeated final CTA    | Milestone 2                                                          |
| Source/excerpt ownership documentation and verification-artifact boundaries                                      | Milestone 1, preserved and checked in Milestone 2                    |
| Responsive, accessible, themed, efficient rendering; no-copy excerpts/diffs; regression and documentation checks | Both milestones for their changes; Milestone 2 for the complete page |
| Final scope/removal audit and existing publication/rollback boundaries                                           | Milestone 2                                                          |

## Approval required

Approve the current plan and this complete two-milestone sequence: **Milestone 1, Complete product story and verified example**, followed by **Milestone 2, Complete evidence, adoption, and final page composition**.

Approval of the sequence alone does not start implementation. Authorize one milestone explicitly; approval and authorization to implement Milestone 1 may be given together. After completing an authorized milestone and its required review and verification, stop until the next milestone is explicitly authorized. This breakdown does not authorize source edits, commits, pushes, or deployment.
