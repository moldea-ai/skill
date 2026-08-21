# Skill website

`@moldea.ai/skill-website` is the private Astro application for the public `moldea` Agent Skill experience. It renders repository-owned Markdown under `/docs/**`, while skill behavior remains authoritative in `/moldea/**`.

## Source model

The build reads strict documentation frontmatter, transparent qualification profiles, append-only qualification results, and the portable `moldea/SKILL.md` metadata. It generates an ignored deterministic model containing routes, navigation, bounded search records, and `llms.txt`. Do not edit `.generated/model.json`.

Qualification result consumption is intentionally additive so a harmless producer field does not break an older website build. The loader still validates profile identity, catalog coverage, immutable attempt history, latest and last-passing pointers, every referenced case artifact, and all recorded SHA-256 digests. Full prompts and transcripts remain available through raw committed source links but are not indexed as documentation prose.

The public `https://skill.moldea.ai/llms.txt` file is generated from this model and is not maintained as a separate root source file.

Reusable website foundations come from the exact public `@moldea.ai/website-ui` dependency. That package owns shared semantic design tokens, global interaction states, base-path and theme utilities, local-search behavior, and small Astro components. This application owns the `https://skill.moldea.ai` origin, `moldea-skill-theme` storage key, page composition, generated documentation, navigation copy, SEO identity, and public assets.

The complete favicon, social image, icon, logo, wordmark, and source artwork set under `public/` mirrors the official brand assets used by the sibling packages website. Keep those copies synchronized intentionally when the source assets change.

The compatibility marks under `public/coding-agents/` use source-owned third-party artwork only to identify supported hosts. The Codex asset preserves the transparent Blossom path geometry from the [official OpenAI brand guidelines](https://openai.com/brand/); the remaining authoritative sources are the [Claude product](https://claude.ai/), [Cursor brand archive](https://cursor.com/brand), [OpenCode repository brand assets](https://github.com/anomalyco/opencode/tree/dev/packages/console/app/src/asset/brand), [GitHub brand archive](https://brand.github.com/foundations/logo), and [Cline repository assets](https://github.com/cline/cline/tree/main/apps/vscode/assets/icons). Keep the mark geometry unmodified and do not imply vendor endorsement.

The favicon URL includes a short content fingerprint in `src/layouts/base-layout.astro` to invalidate browser favicon caches. Update that fingerprint when `public/favicon.ico` changes.

## Commands

Run these from the repository root:

| Command                             | Purpose                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `npm run website:dev`               | Generate content and run Astro locally.                                      |
| `npm run docs:generate`             | Regenerate the ignored deterministic content model.                          |
| `npm run docs:check`                | Validate documentation and public routes without writing source.             |
| `npm run website:build`             | Build and validate the complete static artifact.                             |
| `npm run website:check`             | Run documentation, unit, type, lint, formatting, build, and artifact checks. |
| `npm --prefix website run test:e2e` | Run browser accessibility, theme, navigation, search, and responsive checks. |

The default production inputs are `SITE_URL=https://skill.moldea.ai` and `BASE_PATH=/`. Overrides remain available for preview and GitHub Pages verification.

Set `PREVIEW_PORT` when the default Playwright preview port `4322` is already in use.

The repository-root `CNAME` declares `skill.moldea.ai` as the production custom domain. GitHub Pages configuration and DNS must remain aligned with it; the deployment workflow builds from the origin and base path returned by GitHub Pages.

## Boundaries

The website dependency closure requires Node.js 24.15.0 and remains isolated from the portable skill's Node.js compatibility boundary. The pinned Website UI release shares the same exact Astro and Tailwind versions as the application. The site is static, uses no hosted search or analytics service, and keeps essential documentation available without JavaScript.
