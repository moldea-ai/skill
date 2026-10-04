# Skill website

This Astro application renders the public documentation and selected release evidence for [skill.moldea.ai](https://skill.moldea.ai).

## Source model

The site also presents one manually prepared mock-project run as an independent third evidence source. It does not contribute to semantic or qualification scores.

The site consumes Markdown under `../docs/`, the portable skill under `../moldea/`, and the two prepared public bundles selected by `../evidence/selection.json`. The producer-owned bundles already contain the semantic and qualification definitions, presentation metadata, replays, projects, artifacts, version, date, and technical provenance required by the existing pages.

Generation is fail-closed. Missing selections, malformed bundles, wrong digests, unsafe artifacts, or a prepared manifest that does not match the selection fail the production build. The website does not import evaluator modules, inspect Git history, calculate compatibility, or compare selected evidence with current cases.

Public replay is bounded and privacy-safe. It may contain developer direction, actor response, deterministic facts, the maximum output byte count from one completed command, aggregate byte counts, token usage, durations, judge rationale, and verdicts. It never includes raw command text, raw command output, hidden reasoning, credentials, or arbitrary workspace contents.

Qualification journey pages also present a static Project view from the same validated evidence. It explains the starting fixture, recorded task, verified result, complete starting path tree, exact changed paths, and final-workspace patch in one non-technical sequence. The patch is labeled as a comparison with the fixture baseline because fixture setup can precede the coding agent. Complete project source and raw patch artifacts remain linked for deeper inspection.

The shared layout adds copy controls to useful code blocks after each direct load or client navigation. Illustrative and incomplete excerpts opt out at their owning component, remain selectable, and reserve no toolbar space. Clipboard failures keep the source readable and explain how to copy it manually.

Secondary navigation uses Website UI's ghost `ActionLink`: transparent in light mode, with the existing outline border and translucent surface in dark mode. `src/lib/site` owns the reused dark-theme classes. Primary calls to action, inverted links on dark emphasis sections, and button controls retain their existing variants.

Website UI owns the source overflow policy across code blocks, Markdown fences, diffs, and recorded tool dialogs. Markdown and plain text wrap; code, YAML, JSON, and unlabelled source preserve their lines with horizontal scrolling. Mixed recorded patches choose the default per file. Consumers can select `overflow="wrap"` or `"scroll"` on `CodeBlock` and `CodeDiff`, or `codeOverflow` on Markdown renderers, without local wrapping styles. Diff edge rows include the small leading and trailing inset, so change backgrounds fill it while unchanged comparisons retain the same spacing.

## Project runs

`project-runs.json` is a maintainer setting, with no visitor-facing selector. It selects `run-20260928-02` and includes the original `historical-20260927` records from the public evidence repository. To refresh it, set `run` to `{ "commit": "<full-public-commit-sha>", "runId": "<recorded-run-id>" }`; `history` lists any earlier run IDs to include at that same commit. Setting `{ "run": null }` omits project-run pages and makes no source requests. The generator reads the indexed runs, attempts, and scenario headings from `jesusgraterol/moldea-mock-project-public`, then shows each project once, favoring the selected run for projects it revisits. Code links use recorded project SHAs; manifest and review links use the selected evidence commit. For published runs, the generator also reads each selected sanitized session Release asset, verifies its recorded byte size and SHA-256 digest, and renders the recorded messages, tool calls, results, and turn boundaries in source order. The complete asset remains linked for inspection.

At the current public pin, all 14 distinct projects have a session recording. Ten were recovered from September 27 native sessions; their historical evidence records remain incomplete pending exact request mapping and independent review.

Visitors see the 14 distinct projects directly, with static pages of up to 16 summaries. The evidence landing page presents each evidence source in its own section, previews one project record, and links directly to its recorded session. The evidence landing hero uses the standard background and the same column proportions as the landing and How it works heroes. It shows the recorded support-agent instruction change, with a bounded set of changed files and a workspace-change count derived from its final trial. The project gallery uses the same bordered hero structure as the other evidence pages, highlights a real developer request when one is recorded, and links to every project without assigning an aggregate verdict. Project details show the sanitized conversation and a separate project record with outcomes, review notes, and source links. Conversation event numbers align within their event headers. Tool calls open in the shared medium dialog, with input and result rendered by the shared code component; recorded patch calls display as readable diffs, and attempted patch targets appear on their timeline cards. Compaction events open a separate view of preserved replacement history and retained user messages, keeping that context distinct from chronological conversation turns and marking encrypted summaries as omitted. Tool results do not treat call completion as proof that the operation succeeded. When a session asset is unavailable, the page shows only the recorded requests and observed results and says that the full conversation is unavailable. Individual source statuses do not become project badges. Parsing checks source identity and safe references without certifying behavior or requiring a passing review. All generated project pages enter the static route manifest and Astro sitemap.

To preview one run from the existing private checkout locally, run these commands from the skill repository root:

```sh
node website/scripts/generate-development.ts --project-runs-root ../moldea-mock-project/moldea-mock-project-private --project-run run-20260928-02
npm exec --workspace website -- astro dev --host 127.0.0.1
```

Keep both preview arguments together. Relative paths resolve from the invoking directory. Local preview reads current checkout files, including scenario headings; the public reader uses their recorded definition commits. Local preview suppresses source links and shows a notice. It never exports files, accesses native sessions, or changes the source repository. Stop the foreground server with Ctrl+C when finished.

Website tests and typechecking replace the generated model with synthetic evidence. Stop the preview, regenerate the local model, and restart Astro afterward. Restart after changing runs as well: Astro caches static route lists and their props during development. `npm run website:dev` loads the selected release evidence and public project runs. The separate `npm --workspace website run dev:catalog` command generates the unrecorded development catalog. Production generation always reloads the public setting and cannot inherit a local override.

Development browser tests use `--project-runs-selection scripts/project-run-fixture/unselected.json` to keep the unselected-state checks independent of the published run and network access. This alternative selection cannot be combined with a local preview; it does not modify the maintainer setting.

For a manual refresh, inspect the requested public run, update the commit and run ID, check the site locally, then follow the requested deployment workflow. There is no separate approval record or automated passing threshold. Set `run` to null or restore an earlier selection to undo the update. The existing semantic/qualification production requirements remain unchanged.

The reader accepts additive fields and missing optional evidence. It reads selected attempts sequentially, reuses scenario reads within one generation, and limits each metadata file and compressed or expanded session to 8 MiB with a 120-second HTTP timeout. Explicitly selected missing, malformed, or inconsistent records stop generation with their logical source path; they never silently fall back to another run. No project source trees are downloaded, and no persistent source cache is added.

## Product explanation and SEO

The landing page introduces Git-owned project knowledge for coding-agent planning and development. The existing project-truth capability demonstrates context adoption without a runtime agent; runtime-agent and reusable-skill capabilities build on that foundation. The support-agent and booking demonstrations retain their illustrative status and executable fixtures. Introductory documentation preserves explicit initialization, selective activation, and declared-relationship limits.

The static build verifier audits every generated HTML route for unique indexable titles and descriptions, canonical and social metadata, one level-one heading, WebSite and breadcrumb JSON-LD, sitemap agreement, and robots discovery. The homepage WebSite description must match its page metadata. Local raw-evidence links use the configured deployment prefix, while immutable remote source URLs remain unchanged. Search and 404 remain noindex and omit canonicals; public documentation, examples, and recorded evidence retain their URLs and provenance. `llms.txt` and local search are separate discovery surfaces generated from public sources.

The existing Pages workflow builds the selected recorded evidence, deploys from `main`, and submits `https://skill.moldea.ai/sitemap-index.xml` for the configured Search Console domain property after a push deployment. Local artifact and browser checks do not establish live indexing or field Core Web Vitals.

Local evidence-link rendering propagates Website UI's existing configuration error contract:

- `INVALID_BASE_PATH`: The website base path contains unsupported URL characters.

## Landing example

The landing page contrasts the capable work a coding agent already performs with the project-owned source of truth, explicit connections, deterministic validation, and inspectable evidence the skill adds. Its agent, maintenance, deterministic-check, and Repository format visuals render from the same source snapshots in `src/lib/landing-example/fixture.ts`. The four maintenance previews provide source-derived before/after excerpts to Website UI’s shared unified diff component; no local diff formatter remains. Code and YAML comparisons preserve source lines with horizontal scrolling; Markdown guidance comparisons wrap within their available width. Integration coverage materializes those snapshots in disposable Git repositories, runs the installed `@moldea.ai/cli`, checks deterministic repeatability and repository immutability, verifies the supported OpenAI instruction-loader and tool-registration evidence, exercises declared scope relationships, and executes the refund-rule boundary test. It also runs the generated agent with a fake OpenAI boundary to verify a single order lookup and bounded model continuation. The hero presents the developer request followed by the coding agent's response in a bordered card at every viewport width, with compact mobile padding, and a compact file tree for the agent code, description, instructions, order lookup, combined Zod input and output contracts, project context, refund policy, and connections manifest. The tree groups files under `src/` and `moldea/`; each file row is readable from the initial HTML and becomes a keyboard-accessible button opening Website UI's shared dialog after enhancement. Green A markers identify added files, and amber M markers identify modified files. Changed filenames use semibold text with dark green and amber tones in light mode, and medium-weight text with brighter tones in dark mode. Existing project context and refund policy use regular foreground text so they remain visible, without change markers. File statuses compare the visible files with their source snapshot before agent creation. Modified files open unified Website UI diffs of the complete before/after snapshots, with expandable unchanged context. Added and untouched files retain current-state previews. Any A/M marker remains on the right of the file header. Added-file previews use short source-derived excerpts of the model call and the input/output Zod schemas in `src/contracts.ts`. The modified order lookup opens its complete source comparison, including the tool parameters defined inline in `lookupOrderTool`. The connections diff includes the complete `moldea.yaml`, including its bindings, policy context, tools, and affected paths. Added and untouched Markdown files render as prose. `moldea/project.md` describes Trailside, an outdoor gear shop, its backend responsibilities, and its support boundaries; `moldea/context/refund-policy.md` shows the policy used by the support agent. Added-file previews omit imports, inferred types, and unrelated supporting code. Integration coverage verifies that the excerpts remain short and match the current fixture source. The input schema validates the payload before serialization, and the output schema supplies the model's structured response format. These schemas are also included in the fixture's declared impact paths and repository tree. The agent handles one order lookup call, returns its result to the model, and prevents further tool calls on the continuation. Its instruction says customers may request a refund within the window while the application decides eligibility. The displayed examples are illustrative and perform no network or model request. Getting started recommends the exact `Initialize moldea` request once before ordinary work. The landing page also derives its complete supported-adapter count from the validated qualification model rather than maintaining a separate presentation list. The square backdrop is confined to the main landing hero; evidence and project-gallery heroes use the standard background surface.

## Visual product pages

`/capabilities/` presents the six product outcomes through visual examples, including developer and coding-agent conversations grounded in the documented workflows. `/how-it-works/` uses a distinct booking-assistant journey to show how one ordinary request selects focused project context, follows declared relationships, updates each authoritative owner, checks customer-visible outcomes, and leaves durable context for a later coding-agent session. Its connected files, code, and outcome table share `src/lib/booking-example/fixture.ts`; integration coverage materializes and executes that illustrative booking project, including unavailable and empty availability, same-day approval, later-day confirmation, and isolation of today’s and tomorrow’s slots. A disposable Git index verifies the illustrated added, modified, and untouched files. The hero uses the landing hero’s column proportions and shared file labels in a compact tree grouped under `src/` and `moldea/`; its four file controls open the shared dialog. Modified files show unified before/after diffs, and untouched files show their complete current source. The executable booking test fixture remains behind the outcome table and is omitted from the hero tree. Git markers derive from the before-and-after snapshots: the booking service and instructions are modified, availability and policy remain untouched, and the test fixture is added outside the visible tree. Owner previews align and share a height on desktop with top-aligned content while retaining natural heights on mobile. The availability summary labels Today: 10:00 and Tomorrow: 14:30, and booking requests identify Today and Tomorrow beside their times. The example performs no provider or model request and does not contribute to recorded skill evidence. The Requested outcome visual uses the `moldea` mark in its primary badge; Update each owner once retains the assistant robot beneath its coding-agent message. Both routes publish through search, sitemap, canonical metadata, and `llms.txt`, and direct readers to the technical documentation for details.

The primary header links Capabilities, How it works, Evidence, and Docs. Website UI 1.13.0 supplies the mobile menu's close icon and accessible Close navigation label, and keeps the header stationary while the final mobile dialog returns to the page. Its accordions retain the desktop card shape on mobile with compact 12px insets; semantic and qualification content does not add a second mobile horizontal gutter. Astro prefetching is explicitly disabled because the public CDN returns 503 for requests carrying `Sec-Purpose: prefetch`. Hovering or focusing a link does not request its destination; activation still uses the client router, page transitions, navigation progress, and browser history. Example routes remain part of Docs and retain their existing sidebar group and URLs. Landing capability cards link to the matching sections on `/capabilities/`, while the footer exposes the complete public journey under Explore.

Documentation and example routes share `createDocumentationBreadcrumbs` from `src/lib/documentation-navigation/`. Each route computes the hierarchy once and passes the same logical, unprefixed links to visible and structured breadcrumb renderers. The existing layout and Website UI components apply the deployment base path at their rendering boundaries.

## Commands

From the repository root, install every workspace dependency without lifecycle scripts:

```bash
npm ci --ignore-scripts
```

The website pins `cookie` 2.0.1 alongside Astro 7.2.8. Qualification's MCP dependency also installs `cookie` 0.7.2; without the website-local pin, npm can resolve the older copy for Astro's prerendered module and the build fails on its `parseCookie` import.

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

The development server shows the selected recorded semantic and qualification results. It rereads the generated model when another command changes that cache, so tests can replace the visible evidence until the model is regenerated. For the unrecorded case and profile catalog, run `npm --workspace website run dev:catalog` instead. Browser checks exercise both the catalog and isolated recorded results. Production generation uses `npm run evidence:prepare` followed by `npm run website:build`.

## Deployment

`.github/workflows/pages.yml` runs browser checks against both clean current catalogs and synthetic evidence, prepares both selected official bundles, rebuilds the production artifact, validates it, and then deploys GitHub Pages. The `CNAME` file owns the custom domain.

## Boundaries

The website is a read-only renderer. It does not execute semantic evaluation or qualification, invoke models, mutate selections, publish evidence, access provider APIs, or infer missing release state. Release eligibility remains owned by the root release check.

## Evidence presentation

The evidence landing page separates agent decisions, project connections, and complete coding sessions in plain language. Its hero previews the recorded agent-adoption-inline-runtime-instruction change. Successful hero and scheduler examples use a Passed badge, while detailed records retain recovery history. Hero, scheduler, and project file lists reuse the landing and How it works file labels in compact folder trees, with A/M/D markers for recorded additions, modifications, and deletions. Single-child folders are combined, filenames stay on one line, and full paths and change statuses remain in accessible text. Each preview still shows at most four recorded files. The decisions section shows compact bound-context-maintenance file edits and source-backed cleanup intervals, with its result badge on the test example. The connections section shows the recorded OpenAI tool-name repair, side-by-side before/after inspection results, and one centered row of provider logos. Invalid inspection results use the danger tone in either position. Its repair patch and detailed qualification workspace patches use Website UI’s shared diff component, preserving the recorded code changes and line numbers without reconstructing missing source. Rendered previews omit Git paths, hunk-coordinate headings, change totals, and final-newline notices. Detailed evidence retains the original patch in an optional disclosure. The landing connection preview shows the file path and readable repair directly, with no extra label or raw-patch disclosure. Each section has a primary navigation CTA. The project section balances its text with one recording preview, showing the request and a bounded set of recorded patch paths with a simple link to the complete session. The footer supplies the final divider so the last section does not duplicate it. Missing example evidence remains neutral and never implies zero edits or a passing result. These previews reuse the validated selected model and make no new source or provider requests. The detailed evidence pages use compact, visual decision and adapter journeys. Semantic and qualification replays use the `moldea` icon in a secondary badge for coding-agent messages in both themes. The qualification journey overview uses the same mark. Website UI 1.13.0 has no replay-avatar option, so a scoped stylesheet replaces its decorative robot icon using a base-aware logo path; the shared replay component still owns the conversation markup and behavior. Editorial summaries appear only when fixed reviewed digests match the loaded source and recorded evidence. Qualification describes repository fixtures and file checks; it does not claim to run live providers. Reader-facing `moldea` mentions use inline code in application and shared Website UI surfaces.
