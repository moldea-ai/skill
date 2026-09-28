# Skill website

This Astro application renders the public documentation and selected release evidence for [skill.moldea.ai](https://skill.moldea.ai).

## Source model

The site also presents one manually prepared mock-project run as an independent third evidence source. It does not contribute to semantic or qualification scores.

The site consumes Markdown under `../docs/`, the portable skill under `../moldea/`, and the two prepared public bundles selected by `../evidence/selection.json`. The producer-owned bundles already contain the semantic and qualification definitions, presentation metadata, replays, projects, artifacts, version, date, and technical provenance required by the existing pages.

Generation is fail-closed. Missing selections, malformed bundles, wrong digests, unsafe artifacts, or a prepared manifest that does not match the selection fail the production build. The website does not import evaluator modules, inspect Git history, calculate compatibility, or compare selected evidence with current cases.

Public replay is bounded and privacy-safe. It may contain developer direction, actor response, deterministic facts, the maximum output byte count from one completed command, aggregate byte counts, token usage, durations, judge rationale, and verdicts. It never includes raw command text, raw command output, hidden reasoning, credentials, or arbitrary workspace contents.

Qualification journey pages also present a static Project view from the same validated evidence. It explains the starting fixture, recorded task, verified result, complete starting path tree, exact changed paths, and final-workspace patch in one non-technical sequence. The patch is labeled as a comparison with the fixture baseline because fixture setup can precede the coding agent. Complete project source and raw patch artifacts remain linked for deeper inspection.

The shared layout adds copy controls to useful code blocks after each direct load or client navigation. Illustrative and incomplete excerpts opt out at their owning component, remain selectable, and reserve no toolbar space. Clipboard failures keep the source readable and explain how to copy it manually.

## Project runs

`project-runs.json` is a maintainer setting, with no visitor-facing selector. It selects `run-20260928-02` and includes the original `historical-20260927` records from the public evidence repository. To refresh it, set `run` to `{ "commit": "<full-public-commit-sha>", "runId": "<recorded-run-id>" }`; `history` lists any earlier run IDs to include at that same commit. Setting `{ "run": null }` omits project-run pages and makes no source requests. The generator reads the indexed runs, attempts, and scenario headings from `jesusgraterol/moldea-mock-project-public`, then shows each project once, favoring the selected run for projects it revisits. Code links use recorded project SHAs; manifest and review links use the selected evidence commit. For published runs, the generator also reads each selected sanitized session Release asset, verifies its recorded byte size and SHA-256 digest, and renders the recorded messages, tool calls, results, and turn boundaries in source order. The complete asset remains linked for inspection.

At the current public pin, all 14 distinct projects have a session recording. Ten were recovered from September 27 native sessions; their historical evidence records remain incomplete pending exact request mapping and independent review.

Visitors see the 14 distinct projects directly, with static pages of up to 16 summaries. The evidence landing page presents each evidence source in its own section, previews three project records, and links to the remaining runs when present. The evidence landing hero uses the standard background and gives Project runs a neutral count badge. The project gallery uses the same bordered hero structure as the other evidence pages, highlights a real developer request when one is recorded, and links to every project without assigning an aggregate verdict. Project details show the sanitized conversation and a separate project record with outcomes, review notes, and source links. Conversation event numbers align within their event headers. Tool calls open in the shared medium dialog, with input and result rendered by the shared code component; recorded patch calls display as readable diffs, and attempted patch targets appear on their timeline cards. Tool results do not treat call completion as proof that the operation succeeded. When a session asset is unavailable, the page shows only the recorded requests and observed results and says that the full conversation is unavailable. Individual source statuses do not become project badges. Parsing checks source identity and safe references without certifying behavior or requiring a passing review. All generated project pages enter the static route manifest and Astro sitemap.

To preview one run from the existing private checkout locally, run these commands from the skill repository root:

```sh
node website/scripts/generate-development.ts --project-runs-root ../moldea-mock-project/moldea-mock-project-private --project-run run-20260928-02
npm exec --workspace website -- astro dev --host 127.0.0.1
```

Keep both preview arguments together. Relative paths resolve from the invoking directory. Local preview reads current checkout files, including scenario headings; the public reader uses their recorded definition commits. Local preview suppresses source links and shows a notice. It never exports files, accesses native sessions, or changes the source repository. Stop the foreground server with Ctrl+C when finished.

Website tests and typechecking replace the generated model with synthetic evidence. Stop the preview, regenerate the local model, and restart Astro afterward. Restart after changing runs as well: Astro caches static route lists and their props during development. `npm run website:dev` always generates the ordinary development model, using the public setting if configured. Production generation always reloads the public setting and cannot inherit a local override.

Development browser tests use `--project-runs-selection scripts/project-run-fixture/unselected.json` to keep the unselected-state checks independent of the published run and network access. This alternative selection cannot be combined with a local preview; it does not modify the maintainer setting.

For a manual refresh, inspect the requested public run, update the commit and run ID, check the site locally, then follow the requested deployment workflow. There is no separate approval record or automated passing threshold. Set `run` to null or restore an earlier selection to undo the update. The existing semantic/qualification production requirements remain unchanged.

The reader accepts additive fields and missing optional evidence. It reads selected attempts sequentially, reuses scenario reads within one generation, and limits each metadata file and compressed or expanded session to 8 MiB with a 120-second HTTP timeout. Explicitly selected missing, malformed, or inconsistent records stop generation with their logical source path; they never silently fall back to another run. No project source trees are downloaded, and no persistent source cache is added.

## Landing example

The landing page contrasts the capable work a coding agent already performs with the project-owned source of truth, explicit connections, deterministic validation, and inspectable evidence the skill adds. Its agent, maintenance, deterministic-check, and Repository format visuals render from the same source snapshots in `src/lib/landing-example/fixture.ts`. Integration coverage materializes those snapshots in disposable Git repositories, runs the installed `@moldea.ai/cli`, checks deterministic repeatability and repository immutability, verifies the supported OpenAI instruction-loader and tool-registration evidence, exercises declared scope relationships, and executes the refund-rule boundary test. It also runs the generated agent with a fake OpenAI boundary to verify a single order lookup and bounded model continuation. The hero presents the developer request followed by the coding agent's response and a compact file tree for the agent code, description, instructions, order lookup, combined Zod input and output contracts, project context, refund policy, and connections manifest. The tree groups files under `src/` and `moldea/`; each file row is readable from the initial HTML and becomes a keyboard-accessible button opening Website UI's shared dialog after enhancement. Green A markers identify added files, and amber M markers identify modified files. Changed filenames use semibold text with dark green and amber tones in light mode, and medium-weight text with brighter tones in dark mode. Existing project context and refund policy use regular foreground text so they remain visible, without change markers. File statuses compare the visible files with their source snapshot before agent creation. Every dialog shows the current state, with any A/M marker on the right of the file header. Code previews use short source-derived excerpts of the model call, the input/output Zod schemas in `src/contracts.ts`, and the order lookup beside its tool registration. The lookup body is abbreviated as `({ ... })`; its tool parameters are defined inline in `lookupOrderTool`. The connections dialog shows the complete `moldea.yaml`, including its bindings, policy context, tools, and affected paths. Markdown files render as prose. `moldea/project.md` describes Trailside, an outdoor gear shop, its backend responsibilities, and its support boundaries; `moldea/context/refund-policy.md` shows the policy used by the support agent. Imports, inferred types, and unrelated supporting code are omitted from the hero. Integration coverage verifies that the excerpts remain short and match the current fixture source. The input schema validates the payload before serialization, and the output schema supplies the model's structured response format. These schemas are also included in the fixture's declared impact paths and repository tree. The agent handles one order lookup call, returns its result to the model, and prevents further tool calls on the continuation. Its instruction says customers may request a refund within the window while the application decides eligibility. The displayed examples are illustrative and perform no network or model request. Getting started recommends the exact `Initialize moldea` request once before ordinary work. The landing page also derives its complete supported-adapter count from the validated qualification model rather than maintaining a separate presentation list. The square backdrop is confined to the main landing hero; evidence and project-gallery heroes use the standard background surface.

## Visual product pages

`/capabilities/` presents the six product outcomes through visual examples, including developer and coding-agent conversations grounded in the documented workflows. `/how-it-works/` uses a distinct booking-assistant journey to show how one ordinary request selects focused project context, follows declared relationships, updates each authoritative owner, applies the appropriate deterministic, project, semantic, and adapter checks, and leaves durable context for a later coding-agent session. Both routes publish through search, sitemap, canonical metadata, and `llms.txt`, and direct readers to the technical documentation for details.

The primary header links Capabilities, How it works, Evidence, and Docs. Example routes remain part of Docs and retain their existing sidebar group and URLs. Landing capability cards link to the matching sections on `/capabilities/`, while the footer exposes the complete public journey under Explore.

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

Start the local development server from the repository root:

```bash
npm run website:dev
```

The development server loads the current semantic cases and qualification profiles without recorded results, so a clean checkout shows the available coverage without invented evidence. It rereads the generated model when another command changes that cache; synthetic test evidence must not remain stuck in a running preview after the clean model is regenerated. Browser checks exercise both this clean state and isolated synthetic results, keeping the empty and complete evidence presentations testable. After both official selections are populated, production generation runs from the repository root with `npm run evidence:prepare` followed by `npm run website:build`.

## Deployment

`.github/workflows/pages.yml` runs browser checks against both clean current catalogs and synthetic evidence, prepares both selected official bundles, rebuilds the production artifact, validates it, and then deploys GitHub Pages. The `CNAME` file owns the custom domain.

## Boundaries

The website is a read-only renderer. It does not execute semantic evaluation or qualification, invoke models, mutate selections, publish evidence, access provider APIs, or infer missing release state. Release eligibility remains owned by the root release check.

## Evidence presentation

The evidence pages use compact, visual decision and adapter journeys. Editorial summaries appear only when fixed reviewed digests match the loaded source and recorded evidence. Qualification describes repository fixtures and file checks; it does not claim to run live providers. Reader-facing `moldea` mentions use inline code in application and shared Website UI surfaces.
