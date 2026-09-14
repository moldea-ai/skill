# Landing page: show what `moldea` adds to a coding agent

## Objective

Redesign the skill website landing page so a visitor quickly understands why to add `moldea` to an existing coding-agent workflow. Lead with a concrete agent-building example, make the deterministic software visible, and preserve the strongest existing explanations in a shorter, more cohesive page.

The central message is: **your coding agent interprets the task and writes the changes; `moldea` gives it maintained project context, explicit connections between agent files, and repeatable software checks.** The page must explain both the immediate benefit and why those connections matter when the project changes later.

This plan covers the landing page and its directly required verification and documentation. It does not authorize implementation.

This revision makes the complete hero sequence mandatory in the initial view, replaces the primary naming-mismatch example with disconnected instructions, and restores application code and its test to the maintenance story. No implementation has started. No milestone breakdown exists to invalidate; the previous challenge applies only to the earlier plan version.

## Repository evidence

Repository evidence remains current at HEAD `a9d085427c853d9948aa75df1002b9f66633e6fd`. The only worktree change is this planning file.

- Root `README.md` establishes the current skill workflow, repository ownership, and website boundary. The current skill version is 5.0.8, with CLI 8.0.0 already installed as a development dependency.
- `website/src/components/home-page/home-page.astro` currently leads with an abstract three-row system panel, then presents setup, benefits, maintenance, infrastructure, repository structure, evidence counters, capabilities, compatibility, ownership, and another CTA. Several sections repeat the same claims.
- The existing `why-moldea`, `behavior-alignment`, `open-source-system`, `repository-format`, `getting-started-simulation`, and `coding-agent-compatibility` components contain useful material to retain and reshape.
- `../platform/moldea/context/product-and-operating-model.md`, `agent-skill.md`, and `runtime-adapter-contract.md` establish the distinction between model judgment, declared relationships, deterministic inspection, and runtime behavior. Current skill implementation and documentation take precedence where older platform material differs.
- `../packages/projects/adapter-openai/docs/binding-example.md` and `qualification/profiles/t11/cases/c9/` provide concrete source-inspection examples. The qualification case detects a manifest tool name that differs from the registered source tool, then repairs the declaration while preserving working source.
- `../packages/projects/adapter-openai/src/inspection/inspection.test-integration.ts` verifies `OPENAI_INSTRUCTION_LOADER_NOT_WIRED` when a supported call uses static instructions instead of the declared loader. This grounds the revised primary defect example.
- `docs/examples/maintain-a-refund-policy.md` already connects an ordinary implementation request to application rules, tests, project context, and support instructions while preserving accurate schemas and bindings. The revised maintenance story retains that distinction.
- The public Website UI exports already provide `HeroBackdrop`, `ActionLink`, `Accordion`, `CodeBlock`, `TabbedPanels`, `FilePreview`, `ConnectionLabel`, and `ResultSummary`. `Accordion` supports an initially closed native disclosure, independent groups, and reduced motion. Installed `@moldea.ai/website-ui` 1.7.1 includes optional compact copy controls. No additional package release is needed for this design.
- The platform UI typography code block and website project-file preview provide the reference for compact source presentation. They are design references, not new runtime dependencies.
- The application uses Astro 7.2.2, Tailwind 4.3.3, TypeScript 6.0.3, Vitest 4.1.10, and Playwright 1.62.1. Existing tests cover landing sections, shared layout behavior, generated artifacts, and accessibility.

This inspection establishes the content and implementation boundaries. The redesigned visual result has not yet been built or browser-reviewed.

## Scope and acceptance criteria

The finished page must:

1. Explain the added value without requiring knowledge of manifests, adapters, or evaluation terminology.
2. Make the initial hero show the request, concrete saved context, resulting instruction/code/manifest files, and a specific software-check outcome without requiring a tab change or disclosure.
3. Demonstrate that saved instructions can exist while their loader is disconnected from the agent's source call. Show the supported diagnostic and repair. Explain deterministic checking in plain language and distinguish it from judgment and runtime testing.
4. Answer the coding-agent objection honestly, including the difference between discovering context for a task and maintaining reusable context and explicit relationships.
5. Show maintenance spanning an application rule, its boundary test, saved policy, and agent instructions. Preserve the repository visualization, open-source explanation, compatible coding agents, and easy setup journey while removing repeated presentation.
6. Render visible prose mentions of `moldea` as inline code. Keep code syntax, brand artwork, metadata, and accessible names appropriate to their formats.
7. Work at 320px through large desktop widths, in both themes, with keyboard access and reduced-motion support. Mobile must be deliberately composed with compact insets and minimal nesting.
8. Use optional, compact shared copy controls only for useful, complete commands. Excerpts and diffs must have no copy controls or empty copy toolbar space.
9. Preserve existing evidence calculations, provenance, links, and availability rules. Illustrations must never appear to be recorded evaluation results or live execution.

Excluded: redesigning evidence, semantic, qualification, or documentation routes; changing skill or CLI behavior; changing adapters or shared packages; adding providers, dependencies, telemetry, model calls, authentication, persistence, or deployment infrastructure; rewriting unrelated documentation.

## Final page structure and content

Use six principal sections. Existing components may remain separate implementation units without becoming separate large visual sections.

### 1. Hero: a request becomes a connected agent

Proposed headline:

> Build your agent. Keep its pieces connected.

Supporting copy:

> `moldea` gives your coding agent saved project context and software checks for the connections between instructions, tools, and code.

Primary action: **Install the skill**, retaining `#getting-started-title`. Secondary action: **See what gets checked**, linking to the deterministic explanation below. Keep the release version as a quiet detail, not a competing statistics panel.

The example request is:

> Create a support agent using our refund policy and existing order lookup.

The default hero is a compact illustrated sequence, not a source-code tab. Every stage below is visible without interaction:

| Stage                    | What the visitor sees                                                                                                                                          | Responsibility                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Your request             | The support-agent request above.                                                                                                                               | The visitor states the outcome.                                                                |
| From your project        | The concrete rule “Refunds within 30 days,” the existing application refund rule, and the existing order lookup.                                               | `moldea` provides the coding agent with maintained project context and declared relationships. |
| Your coding agent builds | Three compact file rows: instructions containing the 30-day rule; agent code using the chosen model and order lookup; `moldea.yaml` recording the connections. | The coding agent interprets the context and makes the edits.                                   |
| Software checks          | **Instructions connected.** Supporting text: **The code connects the saved instructions to the agent. Checked without a model call.**                          | `moldea` runs the supported source check. This is not a claim about runtime answers.           |

Use short labels, actual file names, and small source fragments where useful. The named artifacts, model choice, and concrete rule must remain visible in the initial composition, but a visitor must not need to read source syntax to follow the sequence. On mobile, recompose these stages into a compact vertical flow rather than stacking large cards.

Place deeper source inspection after the completed sequence in one shared `Accordion` titled **Inspect the files**, initially closed with a document-unique group. Inside it, reuse three `TabbedPanels` views: **Agent code**, **Instructions**, and **Connections**. The code view shows the model, instruction-loader call, and order-lookup registration together; the other views show the instruction file and a labeled manifest excerpt. These tabs support the explanation and do not replace it. Opening this disclosure must not close another disclosure or hide the hero sequence.

Use a supported OpenAI Responses source pattern from the inspected examples. Keep the model choice in runtime source, not in an invented manifest field. Treat the model identifier as illustrative, not as a current model recommendation.

The coding agent performs the interpretation and edits. Saved context does not automatically become runtime prompt content: the example must explicitly show the resulting instruction text and the source that loads it.

Label the example **Illustrative project**. The successful instruction-connection check is mandatory and must be verified against the same source fixture used by the page. Do not impersonate a terminal run, streamed conversation, measured benchmark, or qualification recording. Link **See what gets checked** to the disconnected-instructions example in section 3; recorded qualification remains separately labeled there.

Directly below the hero, reshape `WhyMoldea` into a short answer to **“Can’t my coding agent do this?”** Explain that a coding agent can inspect a repository, save notes, and build its own checks. `moldea` supplies an existing maintained approach to saving context, declaring relationships, and checking supported connections. A compact paired view uses the same request and the same available repository facts: discovering the refund rule for the current task versus working with the maintained rule, declared file connections, and reusable checks. Do not fabricate different agent answers, deprive one side of repository access, or claim only `moldea` can persist information.

### 2. Maintenance: carry the example into the next change

Preserve the existing heading **One change can affect more than one file.** Replace the long conversation and surrounding card stack with a visual continuation of the hero project.

Request:

> Shorten the application's refund window from 30 days to 14 and update the tests.

The request does not mention `moldea`. In the illustrative project, a pre-existing application function decides whether an order is within the refund window. This is a small local eligibility rule, not a new payment system or a claim that the skill repository contains a refund application.

Show the change in this order:

1. **Application rule:** `src/refund-policy.ts` changes the accepted window from 30 days to 14. This is the implementation change that starts the review.
2. **Application test:** `src/refund-policy.test-unit.ts` confirms that day 14 remains eligible and day 15 becomes ineligible. A compact before/after boundary example communicates the consequence without a second large code panel.
3. **Related agent found:** the manifest's declared relationship from the changed application file identifies the support agent for review.
4. **Policy and instructions updated:** `moldea/context/refund-policy.md` and `moldea/agents/support/instruction.md` now describe the 14-day window.

Show the source that loads the instructions, order lookup, and its schema as **reviewed, unchanged**. The existing connections remain accurate; changing the rule does not require editing every related file. Use short labeled diffs and a compact relationship illustration, with text distinguishing edits from review. Diffs remain selectable and have no copy button.

The application unit test checks the local eligibility rule. Deterministic scope matching identifies declared relationships. The coding agent judges which descriptions need updating, and the adapter checks the supported source connections afterward. Do not present the policy meaning as adapter-verified, claim the manifest discovers undeclared dependencies, or manufacture a documentation edit when a description would remain accurate. In this illustration, the policy and instruction explicitly contain the old window, so their edits are justified.

Retain `#behavior-alignment` so existing inbound links continue to work.

### 3. Deterministic checks and adapters: make the software tangible

Reshape `OpenSourceSystem` around the heading **Software checks the connections.** Explain “deterministic” adjacent to the example: **Repeat the same check with the same files, tool versions, and settings. Get the same result, without asking a model.** This claim applies to the local inspection shown, including its inputs and limits, not to the entire coding workflow or the runtime agent's answers.

Lead with the plain-language problem **The instructions exist. The agent's code does not use them.** Show a labeled defect variant of the same project, without attributing the mistake to a particular coding agent. Use the maintained 14-day snapshot for both broken and repaired states so the page continues the maintenance story:

- The saved instruction file contains the refund policy, and the declared loader exists.
- The supported source call supplies unrelated static instructions instead of calling that loader.
- The adapter reports `OPENAI_INSTRUCTION_LOADER_NOT_WIRED`. The main visual says **Saved instructions are not connected**; the diagnostic identifier belongs in the supporting source detail.
- The coding agent repairs the source to call the existing loader. Repeating the same check confirms the declared instruction connection.

Use a short disconnected/connected illustration and the corresponding source-line change. State the practical source finding: the detected call bypasses the declared loader. Do not claim to have observed the agent ignore a policy at runtime, tested its answers, or proved that the loader itself is semantically correct. Neither state is a live run or a recorded coding-agent attempt.

This defect and its repair are the only primary check demonstration. Remove the planned naming-mismatch illustration and its example variant rather than retaining a second competing story. The existing naming-mismatch qualification remains available through a clearly labeled **See a recorded OpenAI repair** link to the `repair-openai-tool-registration` journey. Its caption must identify the recorded tool-name repair so it cannot be mistaken for evidence of the illustrated instruction-loader repair.

Explain adapters in one sentence: **Adapters check how your agent is connected in the framework you use.** Distinguish them from the coding agents that run the skill. For this example, name the OpenAI adapter and describe only supported source checks: instruction-loader wiring, tool registration, and the declared input-schema connection.

Show small, separate company logos in this order: OpenAI, Anthropic, Vercel. Put them beside the integrations link or below the explanation, with equal optical weight and sufficient spacing. Use the existing `AdapterCompanyLogo` component at a compact supported size. Link **See all integrations** to the existing qualification index; avoid a potentially misleading company count derived from runtime-profile totals.

Retain the strongest open-source explanation as a compact closing paragraph: a team can build and maintain its own context format, relationship tracking, validators, and integration checks; `moldea` provides those foundations together. Keep the packages link. Do not claim every team inevitably needs every part.

State the practical boundary once: **These checks verify supported source connections. Your tests and evaluations still check what the agent actually does.** Unsupported or inconclusive inspection must never be presented as a pass.

### 4. Repository ownership: keep the useful file view

Preserve **Start with two files. Add structure only when it earns a home.** Keep the repository tree, using filenames consistent with the hero example.

Clearly distinguish the minimal initialized repository from the additional policy, instructions, and runtime files introduced by the agent task. Initialization alone must not appear to create a working agent.

Fold the existing repository-ownership and local-first reassurance into this section. Explain that files remain in the project and can be reviewed with ordinary version control. Avoid blanket privacy promises about whichever coding agent or provider the visitor uses. Keep the existing safety/privacy documentation link.

Remove the redundant surrounding explanation cards. On mobile, the tree should use the available width rather than sit inside several padded containers.

### 5. Evidence: a compact route to inspect the claims

Replace the landing page’s large evidence presentation and metric panels with two concise, balanced links:

- **Decision evaluation:** inspect whether the skill chose the right action for a request.
- **Adapter qualification:** inspect the project changes and source checks for supported integrations.

Reuse the current release-evidence summaries and source validation. Any counts remain secondary inline text, preserving their actual meaning, including retry-confirmed results. Preserve existing unavailable-state behavior. Do not manually maintain totals or relabel combined outcomes as first-attempt passes.

Link to the existing evidence pages. Do not duplicate their journey browser or move landing-page comparisons back into evidence.

### 6. Adoption: compatible tools and a short setup journey

Combine the existing coding-agent compatibility presentation with the setup section. Preserve the recognizable coding-agent logos and documented compatibility boundaries.

Use the heading **Install. Initialize. Start building.** Present three concise steps:

1. Install with the existing `INSTALL_COMMAND`.
2. Explicitly ask to initialize `moldea` in the project.
3. Ask for the support agent using the project’s policy and order lookup.

The install command uses shared `CodeBlock` copying. Remove the component’s custom clipboard implementation and its separate status machinery. Scope tests to the shared control within the setup section.

Correct the existing suggestion that an ordinary creation request substitutes for explicit initialization. Keep installation instructions and documentation destinations intact. Absorb the final repeated CTA into this section rather than adding another full-width panel.

## Architecture and file ownership

Keep the site statically rendered in Astro. Reuse shared components through their public package exports and application components through their existing boundaries. Do not add React, a custom tab system, or a new general-purpose UI primitive.

### New files

- `website/src/components/agent-example/agent-example.astro`: feature-specific hero sequence using shared action/typography primitives, with an initially closed shared `Accordion` containing `TabbedPanels` and `CodeBlock` for optional source inspection. It owns the request, concrete context, artifact overview, and visible source-check outcome.
- `website/src/components/agent-example/agent-example.test-e2e.ts`: verifies the example’s user-visible behavior and responsive accessibility through the landing page.
- `website/src/lib/landing-example/fixture.ts`: owns the complete, fixed illustrative project, its disconnected-loader variant, and its maintenance variant. Include the manifest, project description, saved policy, agent description/instruction, runtime source, tool implementation/registration, input schema, and package metadata required for inspection. Also include the illustrative application's `src/refund-policy.ts` and colocated `src/refund-policy.test-unit.ts` as source bodies. Use portable paths and existing supported patterns. Derive displayed source excerpts from these bodies rather than maintaining independent copies of code.
- `website/src/lib/landing-example/fixture.test-integration.ts`: exercises the real installed CLI against the illustrated project and runs its isolated refund-policy test in a disposable local repository.
- `website/src/lib/landing-example/index.ts`: thin, explicit exports needed by the landing components.

The fixture is an authored website example, not a new qualification profile, starter generator, or release artifact. Keep test-only process execution and output parsing out of production exports. No site build or browser request should invoke a CLI or provider. Only intentional example excerpts are rendered; do not ship the fixture as client-side executable code or publish temporary verification files.

The manifest must explicitly associate the support agent with the application rule and saved policy through `affectedBy`. Use exact paths for the rule, its test, and the policy rather than a blanket `/src/**` relationship. Keep supported runtime/tool bindings accurate. Model the refund window as a pure predicate over a non-negative integer number of completed days, with an inclusive final day. Exclude currency calculations, payment effects, date arithmetic, and provider execution from this illustration.

The fixture's unit test uses the existing repository's Node test-runner approach, built-in assertions, and direct TypeScript execution. Its package metadata exposes `test:unit` and a generic `test` composing that category. This is executable sample content within the disposable fixture, not a new website test runner or test category. The website's Vitest integration test owns the orchestration.

### Existing files to modify

- `website/src/components/home-page/home-page.astro` and its `home-page.test-e2e.ts`: page order, hero, metadata, compact evidence, preserved navigation, removal of repeated panels, and updated acceptance checks.
- The `.astro` implementation and colocated `.test-e2e.ts` in `why-moldea`, `behavior-alignment`, `open-source-system`, `repository-format`, and `getting-started-simulation`: implement the corresponding sections above.
- `website/src/components/repository-format/constants.ts`: align the displayed tree with the shared example while retaining the minimal initialization distinction.
- `website/src/components/coding-agent-compatibility/coding-agent-compatibility.astro`: integrate the existing presentation into adoption with only necessary copy and spacing changes.
- `website/src/layouts/base-layout.test-e2e.ts`: update setup-copy assertions that currently target the component’s private clipboard attributes; preserve coverage of shared copy behavior and navigation.
- `website/scripts/verify-build.test-integration.ts`: change landing-only assertions only where the intended markup or copy changes; retain evidence-count and provenance checks.
- `website/README.md`: document ownership of the illustrative project, its test-only CLI verification, and the boundary between illustrations and recorded evidence.

Use existing shared design tokens and `HeroBackdrop` instead of the landing’s duplicate backdrop markup. Keep styling in component markup; no global theme or stylesheet redesign is planned.

### Superseded paths to remove

Remove the unused `capability-card/capability-card.astro` after removing the capability grid. Remove `conversation/conversation.astro`, `conversation/types.ts`, and `conversation/conversation.test-e2e.ts` when replacing their sole remaining caller in `BehaviorAlignment`. Confirm references before deletion; if a current independent caller exists, preserve the still-used component.

Remove the old setup clipboard script and obsolete tests/selectors, the abstract hero panel, repeated ownership and closing CTA panels, and tests that merely enforce their old arrangement. Do not leave hidden duplicate sections or dormant alternative implementations.

## Visual and interaction requirements

- Desktop: use a clear headline/example composition, restrained shared backdrop, readable typography, and generous separation between ideas. Avoid a dashboard appearance and nested card grids.
- Mobile: put the complete request/context/files/check sequence before optional source detail; flatten outer containment and use compact insets. Do not turn the sequence into four large stacked panels. Short tab labels must remain discoverable at 320px when expanded. Confine unavoidable code scrolling to the code region, never the page.
- Keep the example understandable in its initial state. The file disclosure starts closed, and opening it never replaces the visible sequence. Native disclosure and linked tab panels must remain readable without JavaScript. Use a unique disclosure group so it cannot reproduce the earlier mutually exclusive accordion behavior.
- Preserve semantic headings, descriptive links, accessible control names, focus visibility, and shared keyboard behavior. Verify direct navigation and Astro client navigation.
- Use theme tokens for text, borders, code, selection, and status. Source changes need textual labels as well as color.
- No autoplay, typewriter effects, artificial waiting, looping connectors, or animation-dependent explanations. Retain only useful shared state transitions and verify reduced motion.
- Render fixed example content statically. Its file and tab collections are deliberately bounded authored content; pagination is unnecessary. Reuse existing website-model loading and evidence summaries. No new caching layer, background work, or client-side file transformation is justified.

## Implementation sequence and review checkpoints

1. Establish the shared illustrative project, verify the connected and disconnected instruction-loader states against the installed CLI, and execute the isolated application-rule tests. Confirm the real diagnostic and evidence contracts before writing check outcomes. Review source consistency and the distinct roles of application tests, coding-agent judgment, and adapter inspection.
2. Build the hero and concise coding-agent explanation. Review the initial view at desktop and 320px before extending the rest of the page. The request, concrete project context, resulting files, and verified instruction-connection outcome must be visible and understandable with the file disclosure closed.
3. Continue the same project through the application-rule change, related policy/instruction updates, and the source-disconnection explanation. Verify that changed and unchanged files are honest, the negative diagnostic is reproducible, and recorded evidence is labeled separately. Preserve and simplify the repository visualization.
4. Recompose evidence and adoption, remove superseded sections and code, and synchronize the directly affected documentation and tests. Confirm every retained link and integration boundary.
5. Complete regression checks and a deliberate visual/accessibility review. Fix discovered issues and inspect the final diff before reporting readiness. These are ordered implementation steps, not separately authorized milestones.

## Verification

### Example correctness

Use the existing installed CLI executable through its declared `bin`, without importing an unsupported JavaScript API. Run it with argument arrays in a temporary Git working directory. Use the runtime's filesystem/path APIs, bounded process output, the existing test timeout, and cleanup in `finally`. Execute only the sample's pure refund-policy module and its test, separately from provider source. Do not install provider SDKs, call providers, execute the example agent, or alter qualification fixtures.

The integration coverage must establish:

- `validate --json` accepts the coherent example; `inspect --json` supplies the positive instruction-loader evidence used by the hero and the supported tool-registration evidence. A successful exit alone must not produce an instruction-connected label.
- Replacing the source loader call with static instructions, while retaining the declared loader, produces `OPENAI_INSTRUCTION_LOADER_NOT_WIRED`. Restoring the call removes that diagnostic and restores the instruction-loader evidence. Keep the order-lookup connection unchanged in both variants.
- `scope --path /src/refund-policy.ts --json` and `scope --path /moldea/context/refund-policy.md --json` select the support agent through its declared relationships. An unrelated application path does not acquire the same relationship.
- The initial application rule accepts day 30 and rejects day 31. The maintained rule accepts day 14 and rejects day 15. Cover day zero and invalid negative, fractional, or non-finite ages according to the stated example contract, without introducing payment or time-zone behavior.
- Execute the fixture's before and after unit tests against their corresponding actual source. The updated day-15 expectation must fail against the old rule, demonstrating that the test can catch an unchanged implementation. These tests establish only the illustrated application rule.
- The maintained manifest, instruction, and policy remain structurally valid. Assert the intentionally preserved loader/tool/schema source bodies and the explicitly updated rule descriptions without treating prose assertions as semantic evaluation.
- Repeated inspection of unchanged inputs has stable semantic results and does not modify the fixture files.

Validate the CLI response fields needed by these assertions using the existing schema/version conventions. Keep any test-local parser small and tolerate harmless additive response fields. The source fixture and displayed excerpts must remain the same authoritative example.

### Browser and regression coverage

Update existing tests according to the new intended behavior, not merely to whatever markup happens to render. Retain evidence integrity, link resolution, brand formatting, accessibility, and clipboard failure coverage. Replace obsolete assertions about exact panel counts, alternating backgrounds, and removed headings with checks for the new user-facing contract.

Test that the request, concrete context, artifact names, and instruction-connection result are visible with **Inspect the files** closed. Check native disclosure keyboard behavior, independent expansion, persistence of the visible sequence, tab selection and Arrow/Home/End behavior, focus visibility, no-JavaScript readability, installation copying, clipboard failure, and repeat navigation. Confirm that excerpts and diffs have no copy controls. Verify that the disconnected-source illustration and the recorded tool-name repair link cannot be confused by their labels.

Inspect screenshots and actual interaction at 320, 390, 768, 1024, and 1440px, with narrow mobile and desktop checked in both light and dark modes. Check zoom/reflow and reduced motion. Review hierarchy, alignment, spacing, code readability, optical logo balance, and the transition between sections. Automated overflow and axe checks supplement this inspection; they do not establish visual quality by themselves.

From `website/`, run the focused checks:

```bash
npm run test:integration:artifact -- src/lib/landing-example/fixture.test-integration.ts
npm exec -- playwright test src/components/agent-example/agent-example.test-e2e.ts src/components/home-page/home-page.test-e2e.ts --workers=2
```

From the repository root, run the complete established checks:

```bash
npm --prefix website test
npm --prefix website run typecheck
npm --prefix website run lint
npm --prefix website run format:check
npm --prefix website run docs:check
npm run path:check
```

Run focused checks as the affected behavior becomes available. The generic website test command supplies the complete existing unit, integration, and browser regression boundary, including production generation and artifact checks. Format only touched files with the existing website Prettier configuration before final checks. Do not use the broad formatting-write script to reformat unrelated files.

Confirm the new website test is discovered by the existing integration category and that website verification files and temporary fixture test files remain absent from production artifacts. Intentionally rendered sample test excerpts are explanatory website content, not executable test artifacts. No new website test category or configuration change is expected. Report checks actually completed and any environmental limitations separately; do not mark the work complete while required visual or correctness verification remains unresolved.

## Documentation, deployment, and risks

Update the website README in the same implementation change. Check the root README and linked setup documentation for directly affected state; their underlying workflow remains unchanged. Do not use this redesign to fix unrelated platform-document staleness. Protected coding instructions remain untouched, with a handoff only if a durable uncovered guidance gap is found.

No public API changes, persistence, migrations, secrets, or error-contract changes are planned. Shared Website UI 1.7.1 already provides the required components and copy behavior, so this work does not require another package deployment or a lockfile change.

The existing Pages workflow deploys from `main`; a push to a development branch is not deployment. Use the repository’s existing review, signed commit, publication, and deployment workflows when authorized. This planning command performs none of those actions. Rollback is the normal reviewed reversal of the landing change and its owned example/tests, followed by the existing static deployment workflow; no data migration is involved.

The main risks are hiding the added value behind code, overstating determinism, confusing coding agents with runtime adapters, allowing the illustration to drift from actual source checks, and recreating desktop density on mobile. The mandatory visible sequence, real disconnected-loader check, application-rule test, explicit claim boundaries, shared components, and browser review address those risks. If the installed CLI cannot verify the proposed supported example, correct the example or report a blocker; do not silently expand into package development or display invented success.

## Approval required

Approve the revised landing-page redesign: a complete request/context/files/check hero visible without interaction; optional file inspection; the disconnected-instructions defect and verified repair; maintenance spanning application code, its test, policy, and agent instructions; the honest coding-agent comparison; preserved and simplified repository/adoption sections; compact evidence links; and the directly required fixture verification, browser regression coverage, removals, and website documentation update.

The implementation stays within the skill website and its supporting tests/documentation. Evidence routes, shared packages, skill/CLI behavior, dependencies, and deployment infrastructure remain outside this scope. Implementation will begin only after approval of this plan.
