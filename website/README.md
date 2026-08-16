# Skill website

`@moldea.ai/skill-website` is the private Astro application for the public `moldea` Agent Skill experience. It renders repository-owned Markdown under `/docs/**`, while skill behavior remains authoritative in `/moldea/**`.

## Source model

The build reads strict documentation frontmatter and the portable `moldea/SKILL.md` metadata, then generates an ignored deterministic model containing routes, navigation, search records, and `llms.txt`. Do not edit `.generated/model.json`.

The public `https://skill.moldea.ai/llms.txt` file is generated from this model and is not maintained as a separate root source file.

The complete favicon, social image, icon, logo, wordmark, and source artwork set under `public/` mirrors the official brand assets used by the sibling packages website. Keep those copies synchronized intentionally when the source assets change.

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

The website dependency closure requires Node.js 24.15.0 and remains isolated from the portable skill's Node.js compatibility boundary. The site is static, uses no hosted search or analytics service, and keeps essential documentation available without JavaScript.
