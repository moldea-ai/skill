# Milestones: Complete the `moldea` Evidence experience and release 5.0.3

## Milestones 1–5: Release-5 behavioral foundation (completed)

### Objective

Establish and publish the clean release-5 skill, packages, specifications, public guidance, evaluation coverage, qualification system, bounded resource behavior, and authenticated evidence reuse that this Evidence release presents.

### Dependencies

- The original release-5 task contract and accepted semantic and qualification evidence.

### Scope

- Previously completed platform, packages, knowledge-base, portable skill, evaluation, qualification, documentation, website-foundation, package-publication, and signed-tag work.

### Implementation work

- Implemented initialization-first selective activation, content-free bounded CLI use, claim-specific authority, minimum-only runtime eligibility, evaluator batching and recovery, shared-plus-adapter qualification, exact package provenance, and repository-bound evidence pins.
- Published the required platform, packages, knowledge-base, npm, skill, and website changes through signed tag `v5.0.2`.

### Verification

- Deterministic unit, integration, release, package, semantic-preflight, qualification-dry-run, supported Node, Windows, and website checks passed without reopening paid evidence.

### Acceptance criteria

- Completed release-5 behavior remains preserved.
- The missing `v5.0.2` GitHub Release and missing human-readable pinned evidence are explicitly assigned to the remaining milestones rather than concealed.

### Review checkpoint

- Behavioral scope, package scope, resource protections, evidence identity, and the observed publication and presentation defects were separated.

## Milestone 6: Synchronize the public evidence specification (completed)

### Objective

Clarify that authenticated pinned evidence may be hydrated during static generation without copying attempt payloads into the release envelope or current tree.

### Dependencies

- The revised plan and an isolated platform branch based on `origin/main`.

### Scope

- Platform `moldea/context/agent-skill.md` only.

### Implementation work

- Added the domain-neutral release-evidence reuse contract for semantic and qualification evidence.
- Preserved compact-envelope, authentication, freshness, build-time-only, no-browser-dependency, and no-compatibility-path requirements.

### Verification

- Prettier, `git diff --check`, and bounded `moldea validate` passed with zero diagnostics.
- The isolated one-file candidate was reviewed with fingerprint `93ed377b26f656d251a34a0dbd63ad6294f660640d58d0e04a666d5df7f23aee`.

### Acceptance criteria

- Signed commit `84063f5dd4cc584737902bebb4fad6936d058bd1` was pushed through platform PR 154 and merged into `main` at `61582f6f9428f28df4c2a9840fee3c31a5043bb2`.
- The temporary feature branch and worktree were removed without touching the shared platform checkout.

### Review checkpoint

- Compact-envelope meaning, immutable-source authentication, build-time scope, freshness terminology, and concurrency isolation passed review.

## Milestone 7: Hydrate and compose selected release evidence (completed)

### Objective

Load complete authenticated pinned attempts within explicit resource budgets and expose one canonical fresh-or-pinned website model with combined qualification journeys.

### Dependencies

- Milestone 6 is merged into platform `main`.
- The authenticated semantic and qualification source identities remain unchanged.

### Scope

- `tooling/release-identity/release-evidence-source.mjs` and declarations plus focused release-identity tests.
- `website/src/lib/release-evidence/**`, required semantic and qualification loader/transformer integration, generation caching, temporary source utilities, and focused model tests.
- UI presentation changes are excluded except for compilation adjustments required by the new model.

### Implementation work

- Enumerate only the exact authenticated source files: semantic package/lock, portable skill, cases, coverage, result, selected latest pointer, and selected attempt; qualification resource calibration, cases, profiles, selected target pointers, and selected attempt directories.
- Read Git blobs in a bounded batch; enforce safe paths, regular modes, deterministic ordering, no duplicates, at most 8,192 files, at most 16 MiB per file, and at most 64 MiB total source bytes.
- Materialize the authenticated selection in operating-system temporary roots and guarantee cleanup on success and failure.
- Reuse the existing semantic and qualification validators and human-readable transformers, caching each source once per website process and rebinding raw/source URLs to the immutable source commit.
- Select fresh passing current evidence when present and pinned evidence otherwise without merging provenance or histories.
- Compose non-Custom qualification evidence from its exact 12-journey bound Custom baseline and 2 direct journeys; Custom retains 12 journeys.

### Verification

- Unit-test path, allowlist, mode, ordering, duplicate, count, byte, missing-object, cleanup, immutable-URL, and body-free diagnostic behavior.
- Integration-test temporary repositories and the real source commits.
- Require one 74-case semantic model, 14 profiles, correct 12/14 journey composition, current-over-pinned selection, and no transcript bodies in search or `llms.txt`.
- Run typecheck, lint, formatting, and complete website builds under 512 MiB and 384 MiB old-space ceilings; record peak RSS separately.

### Acceptance criteria

- Pinned evidence produces complete human-readable models through the same validated transformer path as fresh evidence.
- Hydration occurs once, reads no unselected history, stays within every budget, and leaves no temporary cache.
- Both heap-ceiling builds pass.
- No envelope copy, current-tree attempt copy, client-side fetch, schema adapter, or parallel evidence store is introduced.

### Review checkpoint

- Inspect trust ownership, Git process count, path containment, resource accounting, cleanup, model amplification, immutable links, provenance separation, composition, and test depth.

## Milestone 8: Redesign the complete Evidence experience (completed)

### Objective

Make semantic and qualification proof immediately understandable, visual, concise, and trustworthy for non-technical visitors while preserving technical transparency through progressive disclosure.

### Dependencies

- Milestone 7 supplies complete selected evidence models.
- Existing `@moldea.ai/website-ui` public components remain sufficient.

### Scope

- Evidence landing, semantic index and attempt pages, qualification index and adapter profile pages under `website/src/pages/evidence/**`.
- Evidence-specific components, replay/project presentation, route/search/sitemap generation, focused website tests, and directly affected skill evidence documentation.
- Packages website, website-ui source, platform website, app-ui, unrelated skill pages, and paid evidence are excluded.

### Implementation work

- Redesign Evidence around the value `moldea` adds to coding-agent work and two realistic visual proof paths.
- Remove top provenance panels and move source details into attempt history or lower technical disclosures.
- Shorten semantic and qualification descriptions and explain evaluator concepts in accurate plain language.
- Generate and link local pinned semantic attempt and replay pages.
- Make `/evidence/qualification/[adapterId]/[implementationId]/` the canonical effective result with 12 or 14 journeys.
- Remove the redundant qualification `attempts/[attemptId]` route, separated baseline/direct primary flows, and stale links, route records, breadcrumbs, and tests.
- Reuse `EvaluationReplay`, `TabbedPanels`, `FilePreview`, `CodeBlock`, `ResultSummary`, `StatusBadge`, `Accordion`, and site-shell primitives.
- Replace the broken patch surface with a visible `diff` block and explicit no-change result.
- Keep attempt identities, source, packages, commits, models, retries, digests, reasons, and raw artifacts complete but secondary.
- Synchronize `README.md`, `docs/release-evidence.md`, `docs/semantic-evaluation.md`, and `docs/adapter-qualification.md`.

### Verification

- Pinned/fresh route parity, 74 semantic decisions, 12/14 qualification journeys, replay, visible diff, unchanged results, and secondary provenance passed focused unit, integration, artifact, and browser coverage.
- The complete 43-case default browser suite and recovered protocol-10 fixture passed after the only stale branding assertion was corrected and rerun.
- Visual inspection covered Evidence, semantic, qualification, combined-profile, and expanded Project views at 320 px and desktop widths in light and dark themes.

### Acceptance criteria

- Visitors can understand both evidence families from visible examples and outcomes without opening methodology or provenance.
- Pinned and fresh sources expose the same primary navigation and human-readable capabilities.
- Every adapter card opens one combined effective result, and no redundant attempt page remains.
- Technical evidence remains complete but secondary.
- The site is polished, brand-consistent, accessible, responsive, theme-safe, and statically complete.
- Existing website-ui primitives are sufficient; no package or app-ui release is needed.

### Review checkpoint

- Inspect visitor comprehension, claim accuracy, realistic visuals, density, route ownership, source parity, diff usability, accessibility, mobile composition, themes, technical transparency, and test adequacy.

## Milestone 9: Publish and verify `moldea` skill 5.0.3

### Objective

Publish the exact reviewed implementation as a complete signed skill release with an actual GitHub Release and deployed verified website, without paid model execution.

### Dependencies

- Milestones 6 through 8 are reviewed and published.
- Accepted source evidence remains authenticated and normalized portable behavior matches `v5.0.2`.

### Scope

- Skill release identity, two portable version markers, release evidence pin, directly affected generated/version references, planning artifacts, branch integration, signed tag, GitHub Release, conformance, Pages, and live verification.
- Paid evaluation, non-dry qualification, package releases, behavior changes, and retrospective `v5.0.2` release creation are excluded.

### Implementation work

- Update identity to `5.0.3` and pin both evidence domains to the accepted sources with an accurate presentation-only reason.
- Confirm only normalized release markers change inside the portable artifact.
- Run the complete deterministic release boundary.
- Review and correct until ready, push `development`, and merge the reviewed commit into `main` through the authorized workflow.
- Create and push signed annotated tag `v5.0.3` and create the actual GitHub Release.
- Wait for conformance and Pages, then verify public release, tagged installation, and live Evidence routes.

### Verification

- Run `npm run managed-readme:check`, unit and integration suites, semantic preflight, qualification dry runs and deterministic suites, typecheck, lint, formatting, path, website, and release checks.
- Compare normalized portable digests for `v5.0.2` and `v5.0.3` and verify the original source identities remain pinned.
- Verify tag signature and target, GitHub Release API/page, installation, workflow conclusions, live version, replay, journeys, project tabs, diffs, responsive layouts, accessibility, and themes.

### Acceptance criteria

- All deterministic checks pass and no paid actor or judge runs.
- The reviewed candidate is merged into `main`, signed tag `v5.0.3` identifies it, a public GitHub Release exists, and the tagged installation works.
- Conformance and Pages pass and the live site exposes the complete Evidence experience.
- Completion is declared only after every publication barrier is independently verified.

### Review checkpoint

- Inspect release scope, portable identity, evidence authentication, verification, signatures, GitHub Release existence, deployments, installability, and live experience.

## Execution scope

Milestones 1 through 8 are complete. Execute Milestone 9 to update identity, preserve accepted evidence, review, merge, tag, create the GitHub Release, deploy, and verify `moldea` skill `5.0.3`. Do not run paid evaluations, modify packages or app-ui, copy historical attempt stores, touch unrelated platform work, or introduce legacy evidence paths.
