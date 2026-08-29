# Shared website UI and official Repository Format plan

## Objective

Establish one reusable Astro presentation layer for the public `moldea` websites, move the completed evaluation replay and every other genuinely shared website primitive into the public `@moldea.ai/website-ui` package, migrate the packages and skill websites to those package-owned implementations, and publish the complete Repository Format version `1` contract as the official specification at `https://packages.moldea.ai/repository-format/`.

The packages repository will become the sole source owner of the public Repository Format specification. The skill's existing Repository Format page will remain a concise introduction and adoption guide that links prominently to the official specification. The private platform copy will be removed after the public source and route exist. No deprecated aliases, local fallback implementations, compatibility adapters, duplicated specification copies, or transitional rendering paths will remain.

This plan supersedes the completed semantic replay plan for the new work described here. It does not reopen or change the semantic evaluator, its evidence protocol, or its published results.

## Repository evidence and current state

### Shared website foundations

- The packages root `README.md` defines `projects/website-ui/` as the public Astro and Tailwind foundation used by the packages website, permits private applications to depend on public projects, and requires a version increase plus release validation whenever a public project changes.
- `projects/website-ui/package.json` currently publishes `@moldea.ai/website-ui` version `1.1.5`. It exposes shared site, search, theme, token, action, breadcrumb, brand, search, navigation-progress, and theme components, while its integration suite packs the real tarball and builds an Astro consumer that imports every public component.
- `projects/website-ui/src/styles.css` already owns the common `page-shell`, `docs-shell`, card, prose, interaction, theme, responsive, and reduced-motion foundations used by both sites.
- The packages and skill websites both use Astro `7.2.2` and Tailwind CSS `4.3.3`, so the shared package can expose source Astro components without a framework or styling-version split.
- The platform's private React `packages/app/ui` package has established tabs, Markdown, and badge patterns. It is a visual and interaction reference only. The Astro package must not import React code or depend on the private platform repository.

### Duplicated or reusable website behavior

- The packages and skill websites maintain near-duplicate sanitized Markdown pipelines using the same Unified, Remark, Rehype, Shiki, and sanitization versions. The skill adds a fragment renderer, heading HTML, local-link handling, product-name treatment, and a maturity-label presentation transform.
- Both websites maintain structurally similar documentation shells with breadcrumbs, mobile navigation, sticky desktop navigation, a content column, an on-page outline, and previous/next navigation. Their page headers and domain models differ, but the layout and accessibility behavior are shared.
- Both websites maintain structurally similar sticky responsive headers and three-column footers. Navigation data, product actions, logos, URLs, and copy are application-owned, while the responsive shell, active-link treatment, mobile disclosure, theme placement, and grid are reusable.
- The packages website has a local maturity `status-badge.astro`; the skill website has a local evidence-status presentation. Their domain mappings differ, but the badge surface and semantic tone treatment are reusable.
- `InlineBrandText` already owns the common lowercase `moldea` treatment. The skill's `EvidenceText` duplicates this behavior with case-insensitive matching and a more compact code treatment.
- Marketing sections, package cards, adapter cards, qualification evidence, semantic provenance, site logos, navigation data, SEO, and evaluation transformers remain domain-specific and should not move into `website-ui`.

### Replay ownership

- The skill currently owns `website/src/components/evaluation-replay/**`, `website/src/components/evidence-tabs/evidence-tabs.astro`, and `website/src/lib/evaluation-replay/**` even though the replay model, path tree, tab interaction, message timeline, command cards, workspace changes, and verdict presentation were intentionally designed for later qualification reuse.
- The replay renderer consumes a normalized presentation model and does not depend on semantic-evaluation evidence shapes. Only `website/src/lib/semantic-evaluation/replay-transformers.ts` is semantic-specific.
- The current path-tree utility imports `node:path`. Moving it into the environment-neutral Website UI package requires an equivalent string-only repository-relative path validator.
- Qualification replay is the next consumer, but its evidence-to-replay transformer is not yet implemented and is outside this change.

### Repository Format authority

- `platform/moldea/context/repository-format.md` is currently a 1,568-line authoritative version `1` specification covering terminology, canonical paths, Git state, text normalization, path and glob syntax, stable IDs, the complete manifest, decisions, runtime guidance, agents, descriptions, instructions, bindings, tools, skills, variables, unresolved requirements, mirrors, validation, semantic evaluation, diagnostics, security, conformance, and future evolution.
- `projects/core/src/format/index.ts`, `projects/core/src/manifest-validation/index.ts`, the nearby format/path/decision validation modules, and their tests are the implemented deterministic contract. The public specification must be audited against these sources rather than treated as independent marketing copy.
- `docs/repository-format.md` in the skill repository is intentionally an introduction. It explains the two-file starting point, progressive structure, ownership, and validation, but it is not a complete property reference.
- The packages website generator currently discovers package-owned docs only, and its route manifest, search records, `llms.txt`, and build verifier do not model a top-level Repository Format specification. `REPOSITORY_FORMAT_GUIDE_URL` currently points back to the skill site.
- Root `/docs` in the packages repository is reserved for concise durable project concepts and processes. The full public contract therefore belongs under a dedicated `specifications/` source directory rather than being inserted into `/docs` or assigned to the Core package's documentation.
- The platform worktree currently contains unrelated backend changes, including pre-existing edits to `README.md`. The specification file itself is unchanged. Any later platform README edit must preserve those unrelated hunks and stop if the relevant link sections conflict.

## Desired final ownership

| Concern | Authoritative owner | Consumers |
| --- | --- | --- |
| Design tokens, global website primitives, responsive shells, themes | `@moldea.ai/website-ui` | packages website, skill website |
| Sanitized Markdown rendering and headings | `@moldea.ai/website-ui/markdown` | packages website, skill website, replay renderer |
| Generic tab interaction | `@moldea.ai/website-ui/tabbed-panels` | semantic replay now, qualification replay later, other website content |
| Generic status surface | `@moldea.ai/website-ui/status-badge` | package maturity adapter, skill evidence adapter, replay verdicts |
| Replay model, path tree, and renderer | `@moldea.ai/website-ui/evaluation-replay-model` and `/evaluation-replay` | semantic transformer now, qualification transformer later |
| Documentation, header, and footer shells | `@moldea.ai/website-ui` component exports | thin site-owned compositions in both websites |
| Semantic and qualification evidence validation and transformation | skill website domain modules | skill evidence pages only |
| Package, adapter, skill, and marketing content | the owning website | its own routes only |
| Repository Format version `1` specification source | `packages/specifications/repository-format.md` | packages website, Core docs, skill guide, platform references |
| Friendly Repository Format introduction and adoption guidance | `skill/docs/repository-format.md` | skill website |
| Deterministic implementation | `@moldea.ai/core` | CLI, adapters, skill, platform |

## Public Website UI architecture

### New public exports

Increase `@moldea.ai/website-ui` from `1.1.5` to `1.2.0` and add these explicit exports:

- `@moldea.ai/website-ui/documentation-shell`
- `@moldea.ai/website-ui/evaluation-replay`
- `@moldea.ai/website-ui/evaluation-replay-model`
- `@moldea.ai/website-ui/markdown`
- `@moldea.ai/website-ui/site-footer`
- `@moldea.ai/website-ui/site-header`
- `@moldea.ai/website-ui/status-badge`
- `@moldea.ai/website-ui/tabbed-panels`

Keep the existing public exports because they are current supported package contracts, not legacy paths. Do not add alternate names for the new exports or preserve copies in consuming applications.

### Shared component contracts

- `DocumentationShell` owns the responsive grid, optional mobile navigation disclosure, optional sticky desktop navigation, on-page outline, breadcrumb placement, previous/next cards, focus treatment, and empty-outline state. It accepts application-supplied breadcrumbs, navigation groups, current route, sanitized heading text, previous/next destinations, labels, and header/content slots. It does not know about packages, skills, versions, source URLs, or evaluation evidence.
- `SiteHeader` owns the sticky container, desktop/mobile navigation presentation, active-link semantics, mobile disclosure, utility-link placement, theme control, and configurable `md` or `lg` desktop breakpoint variants required by the two current sites. It accepts navigation items, utility destinations, theme storage key, labels, and logo/action slots. Site-specific arrays and copy remain local.
- `SiteFooter` owns the responsive footer grid and spacing. It exposes named slots for the brand area and two site-owned navigation groups so structured links can contain application components without forcing a string-only prop schema.
- `TabbedPanels` accepts an ordered list of stable IDs and labels plus matching named slots. Server-rendered markup keeps every panel readable and linked when JavaScript is disabled. Progressive enhancement applies the WAI-ARIA tab roles, selects the first tab by default, hides only inactive enhanced panels, supports Arrow Left, Arrow Right, Home, and End, and initializes idempotently on initial load and `astro:page-load`.
- `StatusBadge` accepts a visible label, a semantic tone (`neutral`, `info`, `success`, `warning`, or `danger`), and the existing truncation option. Application-owned wrappers map qualification, semantic, and package-maturity statuses to those tones.
- `InlineBrandText` gains one compact code-treatment variant and case-insensitive `moldea` matching. Its current badge-like treatment remains the default public behavior. The skill's duplicate `EvidenceText` is removed.
- `EvaluationReplay` consumes only the normalized replay model. It owns role presentation, sanitized Markdown messages, normalized command cards, concise result rows, created/modified/deleted workspace trees, path labels, empty states, trial headings, collapsible verdicts, and responsive alignment. It must not import semantic or qualification domain types.
- `evaluation-replay-model` exports the existing `I`-prefixed replay contracts and `buildEvaluationReplayPathTree`. The utility is rewritten without Node.js imports so `website-ui` remains environment-neutral and continues to reject empty, absolute, backslash, traversal, duplicate, and structurally contradictory paths.

### Shared Markdown contract

Move the common pipeline into `@moldea.ai/website-ui/markdown` with explicit options rather than application-specific post-processing branches:

- `renderMarkdownDocument(markdown, options)` returns sanitized HTML plus stable level-two and level-three heading records.
- `renderMarkdownFragment(markdown, options)` returns sanitized embedded HTML without document-owned heading IDs.
- Options cover base-path prefixing, first-H1 removal, external-link attributes, local-link behavior (`prefix` or `unwrap`), heading extraction, table wrappers, case-insensitive `moldea` code treatment, and an allowlisted strong-label-to-badge mapping for the skill's current maturity labels.
- Raw HTML remains disabled before sanitization. External links retain `noopener noreferrer`. Table wrappers remain keyboard focusable. Application callbacks that can inject arbitrary HTML are not supported.
- The Markdown dependencies move out of both website manifests and into the Website UI build inputs. They remain bundled into the compiled `markdown` entry rather than becoming consumer peer requirements. Astro, Tailwind, Lucide, and other source-component requirements retain their existing package contract.

## Official Repository Format specification

### Canonical source

Create `packages/specifications/repository-format.md` as the only authoritative public source. Migrate the complete platform specification without losing a rule, then edit it for public clarity and web navigation while preserving version `1` semantics.

The source will include strict frontmatter for website metadata (`title`, `description`, and `formatVersion`) followed by ordinary Markdown. It will remain readable directly in Git and will include:

- status and scope of version `1`;
- a quick-start tree and the minimum valid repository;
- a complete manifest property reference listing every supported property path, whether it is required, its type, purpose, allowed values, and material constraints;
- canonical file and directory locations and rules for every recognized asset;
- terminology, path, glob, stable-ID, Unicode, YAML, and Git-state rules;
- project foundation, focused context, decisions and frontmatter, runtime guidance, agent descriptions, handoff descriptions, instructions, variables, bindings, tools, skills, mirrors, and unresolved requirements;
- deterministic validation versus semantic evaluation;
- diagnostics, privacy, secret handling, conformance, versioning, and intentionally excluded version `1` capabilities;
- a minimal complete valid repository and a complete representative manifest, clearly distinguishing whole examples from partial fragments.

Do not create a second JSON schema, hand-maintained property catalog in application code, or generated prose copy. The Markdown specification is the content authority; Core remains the executable reference implementation.

### Specification validation

Add a packages-website `repository-format-specification` source module that:

- reads only `specifications/repository-format.md`;
- validates its frontmatter with Zod and rejects unknown metadata;
- normalizes line endings and preserves the authored Markdown body;
- extracts deliberately marked complete example fences while leaving ordinary partial snippets untouched;
- verifies the minimal complete example through the real workspace `@moldea.ai/repository` memory reader and `@moldea.ai/core` project inspection path;
- verifies that the manifest property-reference table contains the exact supported version `1` property paths established by `projects/core/src/format/index.ts` and the manifest validator;
- rejects duplicate property paths, missing required sections, unsupported format-version metadata, broken internal anchors, and examples that contradict Core.

The expected property-path set in the focused test is a conformance assertion, not a second production schema. A future format change must update Core, the authoritative specification, and this assertion together.

### Website presentation and generated surfaces

Extend the packages website model with one `IRepositoryFormatSpecification` record and make `/repository-format/` a first-class authored route. The page will use the shared Markdown renderer and documentation shell and add a dedicated specification header with:

- an explicit “Official specification” label;
- Repository Format version `1`;
- a concise purpose statement;
- links to the canonical source and `@moldea.ai/core`;
- a compact repository tree and major-section jump links derived from the rendered headings.

The page must remain static, indexable, and fully readable without JavaScript. Long property tables and code samples use the shared scrollable surfaces without causing page-level overflow. The route must be included in the generated route manifest, search index, `llms.txt`, sitemap/build artifact checks, primary navigation, footer, and relevant packages-home calls to action. The old packages-site constant pointing to the skill guide is removed; internal links use the canonical `/repository-format/` route.

## File and module changes

### Packages repository: `@moldea.ai/website-ui`

Add:

- `projects/website-ui/src/components/documentation-shell/documentation-shell.component.astro`
- `projects/website-ui/src/components/evaluation-replay/evaluation-replay.component.astro`
- `projects/website-ui/src/components/evaluation-replay/evaluation-replay-markdown.component.astro`
- `projects/website-ui/src/components/evaluation-replay/evaluation-replay-path-tree.component.astro`
- `projects/website-ui/src/components/site-footer/site-footer.component.astro`
- `projects/website-ui/src/components/site-header/site-header.component.astro`
- `projects/website-ui/src/components/status-badge/status-badge.component.astro`
- `projects/website-ui/src/components/tabbed-panels/tabbed-panels.component.astro`
- `projects/website-ui/src/evaluation-replay/index.ts`
- `projects/website-ui/src/evaluation-replay/types.ts`
- `projects/website-ui/src/evaluation-replay/utilities.ts`
- `projects/website-ui/src/evaluation-replay/utilities.test-unit.ts`
- `projects/website-ui/src/markdown/index.ts`
- `projects/website-ui/src/markdown/index.test-unit.ts`

Modify:

- `projects/website-ui/src/components/inline-brand-text/inline-brand-text.component.astro` for the compact variant and case-insensitive treatment.
- `projects/website-ui/src/styles.css` only for package-owned reusable component states that are not clear as local Tailwind utilities.
- `projects/website-ui/src/index.test-integration.ts` to assert the `1.2.0` tarball contents and build a real Astro consumer importing every new component and compiled entry.
- `projects/website-ui/vite.config.ts`, `tsconfig*.json`, and `package.json` for compiled entries, exact dependencies, exported source files, test exclusion, and the `1.2.0` release.
- `projects/website-ui/README.md` and `projects/website-ui/docs/index.md` to document ownership, exports, props, accessibility behavior, Markdown safety, and the replay-model boundary.
- `pnpm-lock.yaml` for the public version and dependency graph.

### Packages repository: official specification and packages website

Add:

- `specifications/repository-format.md`
- `apps/website/src/lib/repository-format-specification/index.ts`
- `apps/website/src/lib/repository-format-specification/types.ts`
- `apps/website/src/lib/repository-format-specification/repository-format-specification.ts`
- `apps/website/src/lib/repository-format-specification/repository-format-specification.test-integration.ts`
- `apps/website/src/components/repository-format-specification/index.ts`
- `apps/website/src/components/repository-format-specification/repository-format-specification.astro`
- `apps/website/src/pages/repository-format/index.astro`
- a colocated packages-website browser test for the new page, named from the owning `.astro` implementation according to the repository test convention.

Modify:

- `apps/website/src/lib/model/types.ts` to include the specification in `IWebsiteModel`.
- `apps/website/src/lib/generation/generation.ts` and its unit/integration tests to load the specification, add the route, generate its search record, and publish an internal canonical `llms.txt` reference.
- `apps/website/scripts/verify-build.ts` and its integration coverage to require the rendered route, stable headings, canonical links, and search/LLM inclusion.
- `apps/website/src/pages/index.astro`, `site-header.astro`, `site-footer.astro`, and site constants to make the official specification discoverable and remove the external skill-guide destination as the format authority.
- `apps/website/src/components/documentation-page.astro`, `site-header.astro`, `site-footer.astro`, and `status-badge.astro` to delegate only their reusable structure to Website UI while retaining package-specific composition and mappings.
- `apps/website/src/layouts/base-layout.astro` and the existing base-layout/documentation browser coverage for the shared shells and navigation entry.
- `apps/website/package.json` and `pnpm-lock.yaml` to consume the workspace Website UI package, add test-only Core/Repository workspace dependencies when needed for conformance validation, and remove Markdown dependencies no longer imported by the application.
- `apps/website/README.md` for the new canonical source-model and route ownership.
- the packages root `README.md` project blueprint and Specifications section so `specifications/repository-format.md` is identified as the local public authority while the remaining product/package design specifications continue to point to the platform repository.
- `projects/core/docs/index.md` and any other directly affected Core documentation link so it points to `/repository-format/` as the official contract and describes the skill page as introductory guidance only when that distinction is useful.

Remove:

- `apps/website/src/lib/content/markdown.ts` and `markdown.test-unit.ts` after every consumer uses the package renderer.
- `REPOSITORY_FORMAT_GUIDE_URL` and any external packages-site link that still treats the skill introduction as the canonical specification.

### Skill repository consumer migration

Modify:

- `website/package.json` and `website/package-lock.json` to require exact `@moldea.ai/website-ui` version `1.2.0` and remove Markdown packages now owned by Website UI.
- `website/src/lib/semantic-evaluation/replay-transformers.ts`, its tests, and public module exports to consume the package-owned replay types and path-tree utility without changing semantic evidence selection or transformation behavior.
- `website/src/components/semantic-evaluation-case/semantic-evaluation-case.astro` to import the package-owned replay and tab components directly.
- `website/src/components/evidence-status/**` and `website/src/components/qualification-*/**` only as needed to map domain statuses through the generic shared badge while preserving qualification behavior.
- `website/src/components/documentation-page/documentation-page.astro`, `site-header/site-header.astro`, and `site-footer/site-footer.astro` to compose the shared shells with skill-owned navigation, actions, logos, and copy.
- every documentation and replay Markdown consumer to use `@moldea.ai/website-ui/markdown` with explicit options matching current output.
- `website/src/lib/model/constants.ts` or the closest existing site constant owner to expose `https://packages.moldea.ai/repository-format/` once.
- `docs/repository-format.md` to retain its current introductory scope, label the packages page as the “official Repository Format specification,” and link prominently near the opening and final validation guidance.
- directly affected website tests, generated-route/search expectations, `website/README.md`, and only other state-bearing documentation whose current ownership statements become inaccurate.

Remove after migration:

- `website/src/components/evaluation-replay/**`
- `website/src/components/evidence-tabs/evidence-tabs.astro`
- `website/src/components/evidence-text/evidence-text.astro`
- `website/src/lib/evaluation-replay/**`
- `website/src/lib/content/markdown.ts` and `markdown.test-unit.ts`

Do not keep forwarding files, re-export aliases, copied styles, or local fallback components at these paths.

### Platform repository authority handoff

After the public source and route are ready:

- delete `platform/moldea/context/repository-format.md` rather than retaining a pointer copy;
- update the three current `platform/README.md` references to the public `https://packages.moldea.ai/repository-format/` URL and describe it as the official version `1` contract;
- search the active platform tree for any remaining reference that treats the deleted file as authoritative and update only those direct references;
- preserve all unrelated existing platform worktree changes and do not format or rewrite unaffected README content.

No platform production code, API, database, package, or `moldea.yaml` change is expected. If the pre-existing README edits overlap the exact reference lines, stop that repository phase and ask the developer to resolve the overlap rather than overwriting their work.

## Ordered implementation strategy

1. **Create and verify the shared Website UI contracts in the packages repository.** Move the replay model and string-only path-tree utility first, then the Markdown pipeline, generic tabs and status badge, replay renderer, and layout shells. Extend `InlineBrandText`, exports, package contents, tests, and documentation. Review every component against both current website usages before removing any application code.
2. **Migrate the packages website to the shared package.** Replace duplicated Markdown and structural markup with the new exports while preserving package-specific page headers, navigation arrays, status mappings, URLs, copy, SEO, and content generation. Complete the current website regression checks before adding the specification so extraction defects remain attributable.
3. **Move and publish the Repository Format source.** Copy the complete private specification into `specifications/repository-format.md`, add strict metadata, reorganize it into a web-readable official reference, and conduct a rule-by-rule audit against Core format types, validators, tests, and documented behavior. Add the property-reference and complete examples without changing version `1` semantics.
4. **Integrate and validate the official specification route.** Add the source module, conformance checks, website model field, page, route, search record, `llms.txt` entry, navigation/footer/home links, and build verification. Exercise the marked complete repository example through the real Core/Repository boundary and confirm every supported manifest property appears once in the reference.
5. **Complete the Website UI release boundary.** Bump to `1.2.0`, synchronize `pnpm-lock.yaml`, pack and install the real tarball, run package and packages-website verification, and review the release-relevance diff. Publishing, merging, or pushing remains a separately authorized repository workflow. The next phase cannot update the skill's exact npm dependency until `1.2.0` is available from the configured registry.
6. **Migrate the skill website after `1.2.0` is available.** Update the exact dependency and lockfile, switch semantic replay and both documentation/evidence surfaces to package exports, remove every superseded local implementation, preserve semantic replay output through focused tests, and add the official-specification link to the introductory Repository Format guide.
7. **Retire the private authority after the public route is deployable.** Delete the platform specification and replace its README references with the public URL, taking special care around the pre-existing dirty README. Verify no active repository describes the skill guide or deleted platform file as the official source.
8. **Perform the cross-repository authority and duplication audit.** Search all three active trees, excluding the prohibited archive and backup directories, for removed component paths, duplicate Markdown pipelines, old format-guide constants, private specification links, and stale authority language. Review each final diff separately and verify the deployment order below.

## Testing and verification

### Website UI focused coverage

- Path-tree unit tests retain nested paths, child-only labels, files, symlinks, lexical ordering, counts, duplicates, traversal, absolute paths, backslashes, empty segments, and file/folder conflicts without Node.js APIs.
- Markdown unit tests cover raw-HTML rejection, sanitization, base paths, external links, local-link prefix/unwrap behavior, document-title removal, stable heading extraction, table accessibility, Shiki output, product-name treatment, and allowlisted badge replacement without arbitrary HTML injection.
- The real tarball integration test asserts version `1.2.0`, expected compiled entries and Astro sources, absence of tests and project docs, then typechecks and builds an Astro fixture importing every public component and runtime entry.
- Consumer-level browser tests prove tab keyboard behavior, no-JavaScript panel access, replay Markdown, long paths, collapsible verdicts, header/mobile navigation, and documentation-shell behavior because those interactions are exercised in their real applications.

### Official specification coverage

- strict metadata and one supported format version;
- every expected H2 contract area present and addressable by a stable anchor;
- exact manifest-property-path coverage with no duplicates or omissions;
- minimal complete repository accepted by real `createMemoryRepositoryReader` and `createCore().inspectProject` composition;
- malformed marked examples rejected with actionable source context;
- specification route present in the model, route manifest, production output, search index, and `llms.txt`;
- primary navigation, footer, home, Core documentation, and skill introduction resolve to the official URL;
- no remaining package surface calls the skill introduction the authoritative specification.

### Frontend acceptance checks

- valid semantic landmarks and heading order;
- accessible names, `aria-current`, native disclosure behavior, tab roles after enhancement, visible focus, and keyboard operation;
- all information available without color, icons, JavaScript, animation, or hover;
- no horizontal page overflow at `320px`, tablet, laptop, or large desktop widths;
- long property paths, tables, YAML, commands, and workspace paths remain contained and readable;
- light and dark themes preserve contrast and the existing brand system;
- any existing small transition includes `motion-reduce`; no new decorative or timed replay motion is introduced;
- static Astro rendering adds no React runtime or avoidable client-side re-render work.

### Commands

Run from the packages repository root:

```bash
pnpm --filter @moldea.ai/website-ui test:unit
pnpm --filter @moldea.ai/website-ui test:integration
pnpm --filter @moldea.ai/website-ui typecheck
pnpm --filter @moldea.ai/website-ui lint
pnpm --filter @moldea.ai/website-ui build
pnpm --filter @moldea.ai/packages-website test:unit
pnpm --filter @moldea.ai/packages-website test:integration
pnpm --filter @moldea.ai/packages-website test:e2e
pnpm website:check
pnpm docs:check
git diff --check
```

Format only touched packages-repository files with the local Prettier configuration before the check. After a committed packages change exists, run the required release audit with the actual base and head commits:

```bash
pnpm release:check-changes <base-commit> <head-commit>
```

After `@moldea.ai/website-ui@1.2.0` is published, run from the skill repository root:

```bash
npm --prefix website run test:unit
npm --prefix website run test:integration:artifact
npm --prefix website run typecheck
npm --prefix website run lint
npm --prefix website run format:check
npm --prefix website run build
npm --prefix website run test:e2e
npm run eval:semantic:verify
npm run website:check
git diff --check
```

The platform phase is documentation-only. Verify it with a targeted Markdown format check if it can run without rewriting the pre-existing README changes, an active-tree reference search, and `git diff --check`. Do not claim a platform application test result for this documentation-only deletion.

## Release and deployment order

1. Review and publish the packages-repository change containing Website UI `1.2.0` and the official specification source/route.
2. Confirm the exact `1.2.0` package is available from the registry and the packages website deployment serves `/repository-format/` successfully.
3. Update, verify, review, and deploy the skill website against the published exact package version.
4. Remove the private platform specification and update platform references only after the public route is available, preventing a broken authority link.

If a release or deployment fails, keep the existing consuming skill version and private specification until the failed boundary is corrected. Do not introduce a local tarball, workspace path, fallback component, duplicate specification, or temporary redirect as a workaround.

## Risks, edge cases, and controls

- **Public-package blast radius:** New exports are additive, but changing shared styles or existing `InlineBrandText` behavior can affect both sites and unknown package consumers. Keep the default existing treatment, scope new styles to component markers, test a packed consumer, and visually verify both websites.
- **Markdown security:** Centralization increases reuse of one HTML-producing boundary. Keep raw HTML disabled, sanitize before all deterministic transformations, use only allowlisted transformations, and never accept arbitrary HTML callbacks.
- **Environment neutrality:** Replace `node:path` before moving the replay utility and keep Node-only specification loading in the private packages website, not in Website UI.
- **Specification drift:** The specification is prose while Core is executable. Use the property coverage assertion, executable complete example, direct Core audit, and documentation synchronization rule for every future format change.
- **Source size and readability:** The full contract is necessarily substantial. Use descriptive headings, a complete property reference, concise tables, anchored navigation, realistic examples, and a modern responsive shell without splitting authority across multiple copies.
- **Generated model size:** The specification Markdown is added once to the ignored website model and one search record. Do not duplicate rendered HTML or maintain a second generated source artifact.
- **Cross-repository release dependency:** The skill cannot consume exact `1.2.0` before publication. Treat registry availability as a hard phase boundary rather than weakening dependency integrity.
- **Dirty platform README:** Preserve unrelated changes. If exact link hunks conflict, pause the platform phase for developer resolution while leaving the already completed packages and skill changes intact.
- **No legacy paths:** Thin site components may remain where they own domain composition, but they must delegate shared structure directly. A file that only forwards an old import path is not domain composition and must be removed.

## Acceptance criteria

- `@moldea.ai/website-ui@1.2.0` contains the documented shared Markdown, tabs, status, replay, documentation, header, and footer contracts and passes its real-tarball consumer test.
- Both websites use the shared implementations without duplicate Markdown pipelines, replay components, replay model utilities, tab scripts, or copied layout shells.
- Existing packages and skill pages preserve their content, routes, SEO, search boundaries, responsive behavior, accessibility, light/dark themes, and no-JavaScript behavior.
- Semantic replay output and evidence meaning remain unchanged; the change only moves reusable ownership.
- Qualification replay can consume the public replay model and renderer later without moving these components again, but no qualification replay behavior is added now.
- `https://packages.moldea.ai/repository-format/` is a complete, modern, searchable, static, official version `1` specification covering every supported file, property, purpose, constraint, example, validation boundary, and conformance rule.
- The complete marked example passes the actual Core/Repository inspection path, and the property coverage test matches every supported manifest property exactly once.
- The skill Repository Format page remains an introduction and prominently links to the packages page as the “official Repository Format specification.”
- The packages website, Core docs, skill guide, and platform README all identify the packages route as authoritative.
- `platform/moldea/context/repository-format.md` is removed after the public route exists, with no pointer copy or stale active reference left behind.
- No archive or backup directory is inspected or used as evidence, no protected coding-instruction file is modified, and unrelated worktree changes are preserved.

## Explicit exclusions

- Qualification replay transformation or qualification page redesign.
- Semantic or qualification evaluator behavior, evidence protocols, retries, confirmations, checkpoints, fixtures, results, or release gates.
- Repository Format version `2`, automatic migrations, compatibility parsing, deprecated aliases, or new manifest properties.
- Changes to Core behavior solely to match documentation. If the audit discovers a real implementation/specification contradiction, preserve the signal and revise this plan before choosing an authority-changing fix.
- React component migration between the private platform UI and the public Astro package.
- A new client framework, animation library, design system, theme mechanism, JSON schema, or documentation CMS.
- Publishing, pushing, merging, or deploying repositories as part of plan approval alone.
- Unrelated component cleanup or movement based only on possible future reuse.

## Approval required

Approval authorizes the cross-repository source work described above: add the reusable public Website UI contracts and version `1.2.0` release metadata in the packages repository; migrate the packages website; create and validate the official Repository Format source and route; after that exact package is published, migrate the skill website and remove its superseded local implementations; then delete the private platform specification and update only its direct references. It does not authorize qualification replay, evaluator changes, package publication, repository pushes, merges, deployments, protected instruction edits, or unrelated cleanup.
