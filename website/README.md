# Skill website

This Astro application renders the public documentation and selected release evidence for [skill.moldea.ai](https://skill.moldea.ai).

## Source model

The site also presents one manually prepared mock-project run as an independent evidence source. It does not contribute to semantic scores.

The site consumes Markdown under `../docs/`, the portable skill under `../moldea/`, and the prepared public semantic and optional scripted-journey bundles selected by `../evidence/selection.json`. Each producer-owned bundle contains its definitions, presentation metadata, recorded outcomes, artifacts, version, date, and technical provenance required by its pages.

The canonical `docs/limitations.md` guide is published at `/docs/limitations/` with route-local outcome badges and distinct accessible table-region names, ordinary documentation navigation, search, and discovery. Package-owned references supply numeric limits; the guide explains consequences and next actions.

Generation is fail-closed. Missing selections, malformed bundles, wrong digests, unsafe artifacts, or a prepared manifest that does not match the selection fail the production build. The website does not import evaluator modules, inspect Git history, calculate compatibility, or compare selected evidence with current cases.

Public semantic replay is bounded and privacy-safe. It may contain developer direction, actor response, deterministic facts, the maximum output byte count from one completed command, aggregate byte counts, token usage, durations, judge rationale, and verdicts. It never includes raw command text, raw command output, hidden reasoning, credentials, or arbitrary workspace contents.

The shared layout adds copy controls to useful code blocks after each direct load or client navigation. Illustrative and incomplete excerpts opt out at their owning component, remain selectable, and reserve no toolbar space. Clipboard failures keep the source readable and explain how to copy it manually.

Secondary navigation uses Website UI's ghost `ActionLink`: transparent in light mode, with the existing outline border and translucent surface in dark mode. `src/lib/site` owns the reused dark-theme classes. Primary calls to action, inverted links on dark emphasis sections, and button controls retain their existing variants.

The homepage hero uses Website UI's `py-14 sm:py-18 lg:py-20` insets, matching the platform and packages homepages. On desktop, the support-agent example aligns with the vertical center of the complete text column. Three compact badges retain the Skill version alongside `Git-owned context` and `Local-first`. The badge row keeps a 28px gap before the muted `Open-source coding agent skill` eyebrow, followed by a 16px gap before the headline. The ghost `See how it works` action ends with a decorative right arrow. A muted row beneath the actions links to the Cloud website in a new tab for pull-request review, with the complete moldea Cloud name in ordinary prose and an external-link indicator.

Homepages follow the [shared homepage alignment rules](../../platform/DESIGN.md#layout): side-by-side content columns align at their vertical centers, split section headers align at the bottom on desktop, and icons, controls, and diagram connectors remain centered. Hero copy includes its badges and actions in the centered block. The rule applies at each composition's column breakpoint; stacked mobile content retains its natural height.

Website UI owns the source overflow policy across code blocks, Markdown fences, diffs, and recorded tool dialogs. Markdown and plain text wrap; code, YAML, JSON, and unlabelled source preserve their lines with horizontal scrolling. Mixed recorded patches choose the default per file. Consumers can select `overflow="wrap"` or `"scroll"` on `CodeBlock` and `CodeDiff`, or `codeOverflow` on Markdown renderers, without local wrapping styles. Diff edge rows include the small leading and trailing inset, so change backgrounds fill it while unchanged comparisons retain the same spacing.

## Project runs

`project-runs.json` is a maintainer setting, with no visitor-facing selector. It selects `run-20260928-02` and includes the original `historical-20260927` records from the public evidence repository. To refresh it, set `run` to `{ "commit": "<full-public-commit-sha>", "runId": "<recorded-run-id>" }`; `history` lists any earlier run IDs to include at that same commit. Setting `{ "run": null }` omits project-run pages and makes no source requests. The generator reads the indexed runs, attempts, and scenario headings from `jesusgraterol/moldea-mock-project-public`, then shows each project once, favoring the selected run for projects it revisits. Code links use recorded project SHAs; manifest and review links use the selected evidence commit. For published runs, the generator also reads each selected sanitized session Release asset, verifies its recorded byte size and SHA-256 digest, and renders the recorded messages, tool calls, results, and turn boundaries in source order. The complete asset remains linked for inspection.

At the current public pin, all 14 distinct projects have a session recording. Ten were recovered from September 27 native sessions; their historical evidence records remain incomplete pending exact request mapping and independent review.

Visitors see the 14 distinct projects directly, with static pages of up to 16 summaries. The evidence landing page presents each evidence source in its own section, previews one project record, and links directly to its recorded session. The evidence landing hero uses the standard background and the same column proportions as the landing and How it works heroes. It shows the recorded support-agent instruction change, with a bounded set of changed files and a workspace-change count derived from its final trial. The project gallery uses the same bordered hero structure as the other evidence pages, highlights a real developer request when one is recorded, and links to every project without assigning an aggregate verdict. Project details show the sanitized conversation and a separate project record with outcomes, review notes, and source links. Conversation event numbers align within their event headers. Tool calls open in the shared medium dialog, with input and result rendered by the shared code component; recorded patch calls display as readable diffs, and attempted patch targets appear on their timeline cards. Compaction events open a separate view of preserved replacement history and retained user messages, keeping that context distinct from chronological conversation turns and marking encrypted summaries as omitted. Tool results do not treat call completion as proof that the operation succeeded. When a session asset is unavailable, the page shows only the recorded requests and observed results and says that the full conversation is unavailable. Individual source statuses do not become project badges. Parsing checks source identity and safe references without certifying behavior or requiring a passing review. All generated project pages enter the static route manifest and Astro sitemap.

To preview one run from the existing private checkout locally, run these commands from the skill repository root:

```bash
node website/scripts/generate-development.ts --project-runs-root ../moldea-mock-project/moldea-mock-project-private --project-run run-20260928-02
npm exec --workspace website -- astro dev --host 127.0.0.1
```

Keep both preview arguments together. Relative paths resolve from the invoking directory. Local preview reads current checkout files, including scenario headings; the public reader uses their recorded definition commits. Local preview suppresses source links and shows a notice. It never exports files, accesses native sessions, or changes the source repository. Stop the foreground server with Ctrl+C when finished.

Website tests and typechecking replace the generated model with synthetic evidence. Stop the preview, regenerate the local model, and restart Astro afterward. Restart after changing runs as well: Astro caches static route lists and their props during development. `npm run website:dev` loads the selected release evidence and public project runs. The separate `npm --workspace website run dev:catalog` command generates the unrecorded development catalog. Production generation always reloads the public setting and cannot inherit a local override.

Development browser tests use `--project-runs-selection scripts/project-run-fixture/unselected.json` to keep the unselected-state checks independent of the published run and network access. This alternative selection cannot be combined with a local preview; it does not modify the maintainer setting.

For a manual refresh, inspect the requested public run, update the commit and run ID, check the site locally, then follow the requested deployment workflow. There is no separate approval record or automated passing threshold. Set `run` to null or restore an earlier selection to undo the update. The existing semantic production requirements remain unchanged.

The reader accepts additive fields and missing optional evidence. It reads selected attempts sequentially, reuses scenario reads within one generation, and limits each metadata file and compressed or expanded session to 8 MiB with a 120-second HTTP timeout. Explicitly selected missing, malformed, or inconsistent records stop generation with their logical source path; they never silently fall back to another run. No project source trees are downloaded, and no persistent source cache is added.

## Scripted journeys

An optional `journeys` entry in `evidence/selection.json` supplies a producer-owned presentation model through the prepared-evidence loader. With a null entry, no journey pages, landing section, search records, or `llms.txt` links are generated. The two existing evidence sections retain their layout. Synthetic checks include both platforms and passing, failing, blocked, and unverified states; clean development leaves the section absent.

The evidence landing page adds “03 Follow scripted journeys”. `/evidence/journeys/` compares each journey in ChatGPT and Claude projects and records the skill commit, models, settings, dates, assessor identity, instructions, restarts, operator interventions, and raw sources. `/evidence/journeys/<id>/` shows the exact requests, file trees, patches, replies, checks, and activity. A single optional Astro catch-all owns both route forms so an absent selection creates neither. The routes, search index, and `llms.txt` are generated together.

Journey rows open Website UI's informational `Dialog`, with overlay dismissal and shared `TabbedPanels` for Claude followed by ChatGPT. A provider with no results does not become the default when the other provider has evidence. The overview retains 16-row pagination, bounded neighboring page links, previous/next controls, and a compact mobile page indicator. It fetches only the selected journey's static page, checking its journey and snapshot identity before inserting the provider conversations. Loaded content is reused for that row until navigation; pending requests abort on close or navigation, and failures offer retry and a direct-page link. Existing detail URLs render the same viewer and remain the no-JavaScript fallback. The shared `Conversation` and `ConversationMessage` components show exact requests and captured replies in order, using the moldea avatar, `RecordedFileTree`, and inline `CodeDiff` disclosures. Each local check groups its criterion, outcome and explanation. One run selector switches the complete conversation between the first run and repeats; the initial failure remains in the visible history. Provider-specific request revisions and raw links retain their original identities. File reads remain agent-reported activity, separate from captured changes. Technical metadata stays in closed run details. Layouts support 320px widths, both themes, keyboard tabs, and the shared dialog's reduced-motion behavior.

Trusted local checks, unverified claims, sandbox-captured facts, agent-reported replies, and agent-reported activity have separate labels. Replies pass through the shared sanitized Markdown renderer. Harness observations come from a model-controlled workspace; reported commands and CLI presence do not prove execution. These scripted results describe the selected run and are not a platform success rate or product endorsement. See [Scripted journeys](../docs/scripted-journeys.md) for the method and limits.

The complete suite contains six journeys and 21 requests per platform. Models know they are being tested, future requests exist in the workspace, and actual instruction consumption and complete consumer cleanup remain unverified where declared. Reported procedural deviations stay in the evidence even when the trusted checks pass. Replies, activity, patches, and operator notes require publication inspection; private chat URLs do not belong in the public operator record. Packing and assessment require a Linux or macOS maintainer host; ChatGPT sandbox resets may restart the unfinished journey and are shown through recorded restart counts.

## Product explanation and SEO

The landing page introduces Git-owned project knowledge for coding-agent planning and development. The existing project-truth capability demonstrates context adoption without a runtime agent; runtime-agent and reusable-skill capabilities build on that foundation. The support-agent and booking demonstrations retain their illustrative status and executable fixtures. Introductory documentation preserves explicit initialization, selective activation, and declared-relationship limits.

The static build verifier audits every generated HTML route for unique indexable titles and descriptions, canonical and social metadata, one level-one heading, WebSite and breadcrumb JSON-LD, sitemap agreement, and robots discovery. The homepage WebSite description must match its page metadata. Local raw-evidence links use the configured deployment prefix, while immutable remote source URLs remain unchanged. Search and 404 remain noindex and omit canonicals; public documentation, examples, and recorded evidence retain their URLs and provenance. `llms.txt` and local search are separate discovery surfaces generated from public sources.

The existing Pages workflow builds the selected recorded evidence, deploys from `main`, and submits `https://skill.moldea.ai/sitemap-index.xml` for the configured Search Console domain property after a push deployment. Local artifact and browser checks do not establish live indexing or field Core Web Vitals.

Local evidence-link rendering propagates Website UI's existing configuration error contract:

- `INVALID_BASE_PATH`: The website base path contains unsupported URL characters.

## Landing example

The landing page contrasts the capable work a coding agent already performs with the project-owned source of truth, explicit connections, deterministic validation, and inspectable evidence the skill adds. Its agent, maintenance, deterministic-check, and Repository format visuals render from the same source snapshots in `src/lib/landing-example/fixture.ts`. The four maintenance previews provide source-derived before/after excerpts to Website UI’s shared unified diff component; no local diff formatter remains. Code and YAML comparisons preserve source lines with horizontal scrolling; Markdown guidance comparisons wrap within their available width. Integration coverage materializes those snapshots in disposable Git repositories, runs the installed `@moldea.ai/cli`, checks deterministic repeatability and repository immutability, verifies declared instruction-loader and tool exports, exercises declared scope relationships, and executes the refund-rule boundary test. It also runs the generated agent with a fake OpenAI boundary to verify a single order lookup and bounded model continuation. The hero uses Website UI’s shared Conversation and ConversationMessage components for the developer request and coding-agent response, followed by a compact file tree for the agent code, description, instructions, order lookup, combined Zod input and output contracts, project context, refund policy, and connections manifest. The tree groups files under `src/` and `moldea/`; each file row is readable from the initial HTML and becomes a keyboard-accessible button opening Website UI's shared dialog after enhancement. Green A markers identify added files, and amber M markers identify modified files. Changed filenames use semibold text with dark green and amber tones in light mode, and medium-weight text with brighter tones in dark mode. Existing project context and refund policy use regular foreground text so they remain visible, without change markers. File statuses compare the visible files with their source snapshot before agent creation. Modified files open unified Website UI diffs of the complete before/after snapshots, with expandable unchanged context. Added and untouched files retain current-state previews. Any A/M marker remains on the right of the file header. Added-file previews use short source-derived excerpts of the model call and the input/output Zod schemas in `src/contracts.ts`. The modified order lookup opens its complete source comparison, including the tool parameters defined inline in `lookupOrderTool`. The connections diff includes the complete `moldea.yaml`, including its bindings, policy context, tools, and affected paths. Added and untouched Markdown files render as prose. `moldea/project.md` describes Trailside, an outdoor gear shop, its backend responsibilities, and its support boundaries; `moldea/context/refund-policy.md` shows the policy used by the support agent. Added-file previews omit imports, inferred types, and unrelated supporting code. Integration coverage verifies that the excerpts remain short and match the current fixture source. The input schema validates the payload before serialization, and the output schema supplies the model's structured response format. These schemas are also included in the fixture's declared impact paths and repository tree. The agent handles one order lookup call, returns its result to the model, and prevents further tool calls on the continuation. Its instruction says customers may request a refund within the window while the application decides eligibility. The displayed examples are illustrative and perform no network or model request. Getting started recommends the exact `Initialize moldea` request once before ordinary work. The landing runtime grid uses Website UI’s shared runtime catalog and links to runtime guidance without claiming SDK compatibility. The square backdrop is confined to the main landing hero; evidence and project-gallery heroes use the standard background surface.

## Visual product pages

`/capabilities/` presents six visual journeys: project truth, system planning, agent creation, Agent Skills, maintenance, and evaluation/repair. Each combines a developer request, coding-agent response, and a focused artifact or relationship diagram. The conversations are illustrative, not recorded evaluations. Static checks name the declared files and exports they checked; runtime wiring requires connection tests, and refund approval belongs to the application. Repair guidance reflects the installed skill’s validated local CLI target and preserves healthy newer compatible tooling. The page has no example catalog, disclosure controller, or per-card hydration. `/how-it-works/` uses a distinct booking-assistant journey to show how one ordinary request selects focused project context, follows declared relationships, updates each authoritative owner, checks customer-visible outcomes, and leaves durable context for a later coding-agent session. Its connected files, code, and outcome table share `src/lib/booking-example/fixture.ts`; integration coverage materializes and executes that illustrative booking project, including unavailable and empty availability, same-day approval, later-day confirmation, and isolation of today’s and tomorrow’s slots. A disposable Git index verifies the illustrated added, modified, and untouched files. The hero uses the landing hero’s column proportions and shared file labels in a compact tree grouped under `src/` and `moldea/`; its four file controls open the shared dialog. Modified files show unified before/after diffs, and untouched files show their complete current source. The executable booking test fixture remains behind the outcome table and is omitted from the hero tree. Git markers derive from the before-and-after snapshots: the booking service and instructions are modified, availability and policy remain untouched, and the test fixture is added outside the visible tree. Owner previews align and share a height on desktop with top-aligned content while retaining natural heights on mobile. The availability summary labels Today: 10:00 and Tomorrow: 14:30, and booking requests identify Today and Tomorrow beside their times. The example performs no provider or model request and does not contribute to recorded skill evidence. The Requested outcome visual uses the moldea mark in its primary badge; Update each owner once retains the assistant robot beneath its coding-agent message. Both routes publish through search, sitemap, canonical metadata, and `llms.txt`, and direct readers to the technical documentation for details.

The primary header links Capabilities, How it works, Evidence, and Docs. Website UI 3.0.1 supplies the mobile menu's close icon and accessible Close navigation label, and keeps the header stationary while the final mobile dialog returns to the page. Its accordions retain the desktop card shape on mobile with compact 12px insets; semantic content does not add a second mobile horizontal gutter. Astro prefetching is explicitly disabled because the public CDN returns 503 for requests carrying `Sec-Purpose: prefetch`. Hovering or focusing a link does not request its destination; activation still uses the client router, page transitions, navigation progress, and browser history. Example routes remain part of Docs and retain their existing sidebar group and URLs. Landing capability cards link to the matching sections on `/capabilities/`, while the footer exposes the complete public journey under Explore.

Documentation and example routes share `createDocumentationBreadcrumbs` from `src/lib/documentation-navigation/`. Each route computes the hierarchy once and passes the same logical, unprefixed links to visible and structured breadcrumb renderers. The existing layout and Website UI components apply the deployment base path at their rendering boundaries. Website UI 3.0.1 names the shared shell's desktop sidebars `Documentation navigation` and `On this page`; the limitations guide's browser checks audit the complete page in both themes. `DocumentationPage` retains the shared responsive section gap below its content so previous/next navigation stays separated from the footer.

## Commands

From the repository root, install every workspace dependency without lifecycle scripts:

```bash
npm ci --ignore-scripts
```

The website pins `cookie` 2.0.1 alongside Astro 7.2.8.

Generate and validate documentation data:

```bash
npm run docs:generate
npm run docs:check
```

Run application checks:

```bash
npm run check
npm run test
npm run build:fixture
```

`npm run test:unit` prepares the existing synthetic website model before running the unit suite, so it also works on a clean checkout without selected release evidence.

Prepare the selected release evidence once, then start the local development server from the repository root:

```bash
npm run evidence:prepare
npm run website:dev
```

The development server shows the selected recorded semantic results. It rereads the generated model when another command changes that cache, so tests can replace the visible evidence until the model is regenerated. For the unrecorded case and profile catalog, run `npm --workspace website run dev:catalog` instead. Browser checks exercise both the catalog and isolated recorded results. Production generation uses `npm run evidence:prepare` followed by `npm run website:build`.

## PR verification

Every pull request runs the complete website quality, artifact, recorded-browser, and clean-development checks. `.github/workflows/website-checks.yml` provides the shared read-only checks for PRs and Pages. Shard 1 runs quality checks, artifact integration, and half the recorded-browser suite. Shard 2 runs the other half, followed sequentially by the complete clean-development browser suite. Each shard installs dependencies and Chromium and builds its own synthetic fixture once; generated models and build output are never shared between runners. The final `Verify Website` job succeeds only when those checks succeed, including website typechecking. Conformance can skip unrelated heavy suites for presentation-only changes, but website verification is never path-filtered. Tag conformance separately retains website typechecking.

Set `MOLDEA_WEBSITE_PREBUILT_FIXTURE=1` only after a successful `build:fixture` in the same job. Recorded-browser startup validates that artifact before preview instead of rebuilding it. Missing or invalid output fails. The default `0` keeps local recorded-browser commands building fresh fixtures; other flag values fail configuration. The independent clean-development suite always prepares its own catalog and build.

## Deployment

`.github/workflows/pages.yml` checks evidence selection and reads Pages configuration in a shared preflight. Empty selections skip production work; partial selections or missing site configuration fail. The reusable website checks and the production build then run independently with the same base path and HTTPS site URL, including empty root base paths. The production branch prepares the selected official semantic bundle, builds and validates the artifact, and uploads it. Deployment requires both branches to succeed. Only deployment receives Pages and OIDC write permissions; preflight has Pages read permission. The `CNAME` file owns the custom domain, and sitemap submission remains after successful deployment.

## Boundaries

The website is a read-only renderer. It does not execute semantic evaluation, invoke models, mutate selections, publish evidence, access provider APIs, or infer missing release state. Release eligibility remains owned by the root release check.

## Evidence presentation

The evidence landing page presents recorded agent decisions and complete coding sessions in separate sections. Its hero previews the recorded `agent-adoption-inline-runtime-instruction` change, and the decisions section shows the selected `bound-context-maintenance` case. The project section shows one recording preview with its request, bounded recorded patch paths, and a link to the complete session. Recorded changes use Website UI’s shared diff component and the website’s shared file-tree component. Missing evidence remains neutral and never implies zero edits or a passing result.

These previews reuse the validated selected models and make no new source or provider requests. Historical presentation-only semantic evidence retains its original versions, dates, and sources and provides no current-release assurance. Product names are ordinary prose. Reserve inline code for complete technical tokens such as commands, paths, identifiers, and package names.

## Authored conversations

Documentation and example routes opt into Website UI’s typed Markdown conversation blocks. Author a top-level blockquote with a standalone `**You**` or `**Coding agent**` paragraph, then a blank quoted line and the message body. `src/components/documentation-content/` renders the ordered sanitized blocks through the shared conversation components; ordinary quotes remain prose. Keep complete technical tokens in inline code and use specific languages for embedded code fences. The same heading IDs, search records, and machine-readable documentation remain available. Recorded sessions and evaluation evidence retain their original renderers and provenance.

The homepage proof section gives decisions and scripted journeys equal columns on desktop, followed by full-width project runs when both optional evidence sources exist. Its compact journey card retains the recorded conversation excerpt and file tree; the two top actions align at the bottom. With only project runs selected, they sit beside decisions; without either optional source, decisions stand alone. All cards stack on mobile. The evidence landing page previews reuse the shared conversation components with recorded request/reply excerpts, file changes, and a separate description of what is tested. Journey previews prefer Claude when available. Authored summaries never become recorded assistant quotes; project recordings do not acquire an automated passing verdict. Capability examples appear before the longer evaluation/repair disclosure; the visible structural-check limitation remains outside it.

Illustrative chats preserve the established avatar column, connecting line, user bubble, and assistant response panel through Website UI’s shared components. Avatar slots supply the bare icon or mark. Runtime catalogs put widely used SDKs and frameworks first. Three responsive rows appear before Load more reveals every remaining entry and disappears; each icon entry opens its official website or repository with an external-link indicator. All runtime entries remain available without JavaScript.

Examples that report a policy or authority conflict show the governing rule beside the change or result. A path alone is not sufficient context. Longer citation and revision details remain in the existing evidence dialogs.
