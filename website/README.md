# Skill website

This Astro application renders the public documentation and current release evidence for [skill.moldea.ai](https://skill.moldea.ai).

## Source model

The site consumes:

- Markdown pages under `../docs/`
- the portable skill under `../moldea/`
- the current semantic result and current semantic attempt
- the current qualification profile index and current result storage
- package and compatibility metadata from repository-owned fixtures

Generation is fail-closed. Every semantic and qualification artifact must match the current protocol, current source identity, and recorded SHA-256 digests before it can be rendered.

The website reads only exact current evidence. Missing, stale, malformed, or over-budget evidence fails generation.

Public replay is bounded and privacy-safe. It may contain developer direction, actor response, deterministic facts, byte counts, token usage, durations, judge rationale, and verdicts. It never includes raw command text, raw command output, hidden reasoning, credentials, or arbitrary workspace contents.

## Commands

Install dependencies without lifecycle scripts:

```bash
npm ci --ignore-scripts
```

Generate and validate documentation data:

```bash
npm run docs:generate
npm run docs:check
```

Run application checks:

```bash
npm run check
npm run test
npm run build
```

From the repository root, the equivalent wrappers are `npm run docs:check`, `npm run website:check`, and `npm run website:build`.

## Deployment

`.github/workflows/pages.yml` validates and builds the site before deploying GitHub Pages. The `CNAME` file owns the custom domain.

## Boundaries

The website is a read-only renderer. It does not execute qualification, invoke models, mutate evidence, access provider APIs, or infer missing release state. Release eligibility remains owned by the root release check.
