# Skill website

`@moldea.ai/skill-website` is the private Astro application for the public `moldea` Agent Skill experience. It renders repository-owned Markdown under `/docs/**`, while skill behavior remains authoritative in `/moldea/**`.

## Source model

The build reads strict documentation frontmatter, the current semantic evaluation, transparent qualification profiles, append-only qualification results, and the portable `moldea/SKILL.md` metadata. It generates an ignored deterministic model containing routes, navigation, bounded search records, and `llms.txt`. Do not edit `.generated/model.json`.

The website is fail-closed for evidence integrity. Generation selects an exact current semantic attempt first, then the immutable `4.0.1` carry-forward record, and then the exact `4.0.2` compatibility bridge chained to that record. The displayed model evidence remains attributed to its original immutable `v4.0.0` attempt. The `4.0.2` provenance identifies the current skill, CLI and package mapping, and range decisions as deterministic compatibility inputs, while separately passing hosted package and manager checks remain release outcomes outside the attestation. A qualification profile may appear with an explicit no-attempt state before its first official run, but every recorded profile history must point to a validated terminal latest attempt. The semantic loader accepts carried evidence only when the immutable attempt and evidence hashes, portable-skill behavior, CLI closure, semantic inputs, evaluation protocol, case definitions, case suite, coverage, actor host, and judge host remain compatible with the current release. It derives a bounded public replay from the same digest-verified immutable artifact, including definition-bound developer messages, recorded actor messages, evaluator-validated safe command facts, path-only workspace changes, judge rationale, and verdicts. Historical replays retain their case-definition digest and use recorded developer direction when available; when the corresponding definition is no longer current, the page marks unavailable direction or criteria instead of substituting current text. Raw commands and output, workspace contents, hashes, modes, symlink targets, MCP data, and hidden reasoning never enter that replay. Replay text and facts remain excluded from local search records and `llms.txt`. The qualification loader validates profile identity, catalog coverage, immutable attempt history, latest and last-passing pointers, every referenced case artifact, and all recorded SHA-256 digests. Each attempt is validated against the profile, probes, and scenarios stored at its recorded qualification commit, so later evaluator changes cannot reinterpret immutable evidence. Generation therefore requires the complete repository history rather than a shallow checkout. The loader derives qualification replay from the digest-verified actor prompt, bounded command outcomes, path-only workspace snapshots, recorded actor output, deterministic verification, and judge rationale. Exact command text, command output, workspace contents, hashes, modes, and hidden reasoning remain outside that replay, while the complete technical artifacts stay linked from the attempt. The separate release gate requires compatible passing qualification evidence.

The public `https://skill.moldea.ai/llms.txt` file is generated from this model and is not maintained as a separate root source file.

Reusable website foundations come from the exact public `@moldea.ai/website-ui` dependency. That package owns shared semantic design tokens, global interaction states, base-path and theme utilities, local-search behavior, sanitized Markdown rendering, responsive documentation and site shells, tabs, status badges, inline brand treatment, and evaluation replay presentation. This application owns the `https://skill.moldea.ai` origin, `moldea-skill-theme` storage key, page composition, evidence-domain mapping, generated documentation, navigation copy, SEO identity, and public assets.

In repository-owned Markdown, bold `Supported` labels render as target-maturity badges. Other bold text keeps its ordinary semantic emphasis.

The complete favicon, social image, icon, logo, wordmark, and source artwork set under `public/` mirrors the official brand assets used by the sibling packages website. Keep those copies synchronized intentionally when the source assets change.

The company marks under `public/adapter-companies/` mirror the provider artwork used by the sibling packages website for adapters represented in qualification evidence. Keep the marks unmodified, load them through the app's base-aware paths, preserve their light and dark theme treatment, and do not imply provider endorsement.

The compatibility marks under `public/coding-agents/` use source-owned third-party artwork only to identify supported hosts. The Codex asset preserves the transparent Blossom path geometry from the [official OpenAI brand guidelines](https://openai.com/brand/); the remaining authoritative sources are the [Claude product](https://claude.ai/), [Cursor brand archive](https://cursor.com/brand), [OpenCode repository brand assets](https://github.com/anomalyco/opencode/tree/dev/packages/console/app/src/asset/brand), [GitHub brand archive](https://brand.github.com/foundations/logo), and [Cline repository assets](https://github.com/cline/cline/tree/main/apps/vscode/assets/icons). Keep the mark geometry unmodified and do not imply vendor endorsement.

The favicon URL includes a short content fingerprint in `src/layouts/base-layout.astro` to invalidate browser favicon caches. Update that fingerprint when `public/favicon.ico` changes.

Production builds verify the complete search identity instead of only checking that SEO files exist. Every indexable HTML artifact must have one unique title and description, one self-referencing canonical URL, consistent Open Graph and Twitter metadata, and one level-one heading. The home page publishes one `WebSite` JSON-LD identity, navigable content may publish validated `BreadcrumbList` data, and the sitemap must contain exactly the canonical indexable routes. The client-only search surface and the 404 page use `noindex` and remain outside the sitemap.

## Commands

Run these from the repository root:

| Command                             | Purpose                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `npm run website:dev`               | Generate current evidence content and run Astro locally.                     |
| `npm run docs:generate`             | Regenerate the ignored deterministic content model.                          |
| `npm run docs:check`                | Validate documentation and public routes without writing source.             |
| `npm run website:build`             | Build and validate the complete static artifact.                             |
| `npm run website:check`             | Run documentation, unit, type, lint, formatting, build, and artifact checks. |
| `npm --prefix website run test:e2e` | Run browser accessibility, theme, navigation, search, and responsive checks. |

The default production inputs are `SITE_URL=https://skill.moldea.ai` and `BASE_PATH=/`. Overrides remain available for preview and GitHub Pages verification.

Set `PREVIEW_PORT` when the default Playwright preview port `4322` is already in use.

The repository-root `CNAME` declares `skill.moldea.ai` as the production custom domain. GitHub Pages configuration and DNS must remain aligned with it; the deployment workflow builds from the host and base path returned by GitHub Pages.

## Deployment

Relevant pushes to `main` rebuild from the exact pushed commit, read the configured host and base path from GitHub Pages, build the canonical HTTPS origin from that host, upload `website/dist` with GitHub's official Pages artifact action, and deploy through the `github-pages` environment. After deployment, the workflow submits `https://skill.moldea.ai/sitemap-index.xml` to the `sc-domain:moldea.ai` Google Search Console property.

Search Console submission authenticates with the `GOOGLE_SEARCH_CONSOLE_CREDENTIALS` organization-level Actions secret, with this repository included in its selected-repository policy. The secret contains the JSON key for `moldea-sitemap-submitter@moldea-prod.iam.gserviceaccount.com`, which must remain an owner of the Search Console property and retain `Service Account Token Creator` on itself. Manual workflow dispatches do not submit the sitemap. A submission failure leaves the deployed Pages artifact live and fails only the post-deployment submission job.

## Boundaries

The website dependency closure requires Node.js 24.15.0 and remains isolated from the portable skill's Node.js compatibility boundary. Clean verification installs both the root development dependencies used by repository-owned evidence tooling and the website dependencies. The pinned Website UI release shares the same exact Astro and Tailwind versions as the application. The site is static, uses no hosted search or analytics service, and keeps essential documentation available without JavaScript.
