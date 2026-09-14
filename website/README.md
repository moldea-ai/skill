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

Public replay is bounded and privacy-safe. It may contain developer direction, actor response, deterministic facts, the maximum output byte count from one completed command, aggregate byte counts, token usage, durations, judge rationale, and verdicts. It never includes raw command text, raw command output, hidden reasoning, credentials, or arbitrary workspace contents.

Qualification journey pages also present a static Project view from the same validated evidence. It explains the starting fixture, recorded task, verified result, complete starting path tree, exact changed paths, and final-workspace patch in one non-technical sequence. The patch is labeled as a comparison with the fixture baseline because fixture setup can precede the coding agent. Complete project source and raw patch artifacts remain linked for deeper inspection.

The shared layout adds copy controls to useful code blocks after each direct load or client navigation. Illustrative and incomplete excerpts opt out at their owning component, remain selectable, and reserve no toolbar space. Clipboard failures keep the source readable and explain how to copy it manually.

## Landing example

The landing page contrasts an ordinary coding-agent session with the durable project context, explicit connections, and repeatable checks the skill adds. Its agent, maintenance, deterministic-check, and Repository format visuals render from the same source snapshots in `src/lib/landing-example/fixture.ts`. Integration coverage materializes those snapshots in disposable Git repositories, runs the installed `@moldea.ai/cli`, checks deterministic repeatability and repository immutability, verifies the supported OpenAI instruction-loader and tool-registration evidence, exercises declared scope relationships, and executes the refund-rule boundary test. The hero presents the developer request as a message and shows the runtime call immediately, with keyboard-accessible tabs for its saved instructions and manifest. The displayed example is illustrative and performs no network or model request. The landing page also derives its complete supported-adapter count from the validated qualification model rather than maintaining a separate presentation list.

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

## Evidence presentation

The evidence pages use compact, visual decision and adapter journeys. Editorial summaries appear only when fixed reviewed digests match the loaded source and recorded evidence. Qualification describes repository fixtures and file checks; it does not claim to run live providers. Reader-facing `moldea` mentions use inline code in application and shared Website UI surfaces.
