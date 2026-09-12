# Plan: Complete the `moldea` evidence-release correction

## Task contract

Complete the already-started `moldea` release by preserving the production-readiness work already published as `v5.0.1` and correcting a newly observed public evidence defect before declaring the task finished.

The work began because the skill and its supporting packages were consuming excessive time, tokens, stdout, memory, and local resources for unrelated repository tasks. It also exposed contradictory adoption rules, maturity-dependent runtime selection, overly narrow dependency ranges, stale and truncated public evidence totals, evaluator instability, avoidable repeated evaluation work, and insufficiently bounded inspection behavior. The completed implementation establishes a cheap relevance gate, content-free bounded inspection, initialization before repository-dependent `moldea` behavior, claim-specific evidence authority, minimum-only best-effort runtime eligibility, bounded memory and output behavior, authenticated evidence reuse, deterministic diagnostic batching, recovery-aware evaluation accounting, stronger semantic and adapter coverage, and exact qualification provenance.

The remaining defect is presentation-specific but release-blocking: the live skill website authenticates and pins a passing 74-case semantic source attempt and one passing source attempt for each of 14 adapter qualification profiles, yet its primary evidence summaries count only fresh current-contract attempts. Consequently, the semantic and qualification pages visibly say `No recorded attempt`, `0/74`, and `0 current-contract attempts` even though the release has verified pinned evidence. The final implementation must make retained verified source attempts visible and comprehensible without calling them fresh current-contract runs or implying that prior models evaluated the revised contracts.

No paid semantic evaluation and no non-dry adapter qualification will run for this correction. The release must reuse the already authenticated source evidence through the repository-bound release-evidence mechanism. It must not edit historical attempt artifacts, fabricate current attempts, weaken source authentication, copy large evidence bodies into the release envelope, or restore obsolete historical routes.

The correction will be released as `5.0.2` because `v5.0.1` is already public and immutable. This is a clean current implementation, not a compatibility layer: public pages consume one canonical release-evidence model, distinguish fresh current attempts from verified pinned source attempts, and remove misleading empty-state behavior whenever verified source evidence exists.

## Current state and repository evidence

### Completed cross-repository work

- Platform `main` contains the corrected adoption, authority, runtime-eligibility, and adapter specification contracts at merge commit `c48e9f7133d522233fd02c2c131a9641554e506f`.
- Packages `main` contains the corrected minimum-only eligibility publication and documentation at merge commit `f1d1054e77bf50400e46e24ede77dbc07af3e7b8`.
- Knowledge-base `main` contains the synchronized public guidance at merge commit `1dd5e700238d7b183447b9a847124f5ccbf373ff`.
- `@moldea.ai/adapter-eve@3.0.1`, `@moldea.ai/adapter-langchain@3.0.1`, and `@moldea.ai/adapter-langgraph@3.0.1` are published. No other adapter package needed a release because its npm artifact did not change and its technical ranges were already minimum-only.
- Skill pull request 15 was merged to `main` as `84d810332cab28b350a5d1e9fc62e0984bb1c0f1`. Signed annotated tag `v5.0.1` points to that commit through tag object `2c2a1548ffe0892420693af98b5874c88025b6c5`.
- The exact `v5.0.1` checkout passed the full deterministic release boundary: 280 unit tests, 73 integration tests, semantic preflight, adapter qualification dry runs, typechecking, linting, formatting, path checks, website checks, build checks, and tag conformance on Node 22, 24, 26, and Windows.

### Current skill repository

- `/home/jesusgraterol/Documents/projects/moldea/skill` remains based on `development` commit `d1659aa7f514d0676b342902d3fb59c40432b3f0`, matching `origin/development`; `origin/main` is `84d810332cab28b350a5d1e9fc62e0984bb1c0f1`. Milestone 6 implementation is now uncommitted on top of that base: the authenticator projection, shared website derivation, affected pages, and focused tests are implemented and have passed their first targeted verification, while documentation, `5.0.2` identity, final evidence pin, full verification, review, and publication remain incomplete.
- Release `5.0.1` is recorded in `package.json`, root documentation, release-evidence target identity, and public installation guidance.
- `fixtures/release-evidence.json` pins qualification to `v5.0.0` at commit `c3416c52ae69a3f26d2e38c07ba98aa8531e358d` and semantic evidence directly to commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`. Its reasons state that prior models did not evaluate the revised `5.0.1` contracts.
- The authenticated semantic source attempt is `20260911T014030371Z-semantic-09da55eb`. It passed all 74 cases: 70 initial passes, 4 recovered cases, 0 failures, and 0 pending cases.
- The authenticated qualification source supplies one passing attempt projection for each of all 14 current adapter profiles, including exact executed package versions and recorded timestamps.
- `tooling/release-identity/release-evidence-source.mjs` authenticates the entire pinned semantic result but discards its compact result projection. Its qualification branch already returns compact per-profile projections.
- `website/src/lib/release-evidence/types.ts` and `website/src/lib/release-evidence/loader.ts` expose only the semantic source attempt id, while qualification projections include attempt id, timestamps, and executed packages.
- `website/src/pages/evidence/semantic/index.astro`, `website/src/pages/evidence/qualification/index.astro`, `website/src/pages/evidence/index.astro`, and `website/src/components/home-page/home-page.astro` calculate headline totals only from current attempts.
- `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro` shows pinned package provenance in a lower section but still presents `No recorded attempt` and no official attempt in its primary result and history surfaces.
- Current end-to-end and generation tests encode the misleading empty-state behavior, so passing tests did not protect the public meaning of retained evidence.

### Live website observation

- `/evidence/semantic/` shows the pinned-release notice but presents `No recorded attempt`, `0/74`, and `No semantic attempt has been recorded for this release candidate yet`.
- `/evidence/qualification/` shows `14 profiles · 0 current-contract attempts`, and profile cards present `No recorded attempt` and zero attempts despite their authenticated pinned projections.
- The evidence landing page and home-page release evidence cards also use current-only totals and therefore understate the release evidence.
- This is not evidence corruption or evidence loss. It is a derivation and labeling defect in the website model and presentation.

## Desired final behavior

### Evidence semantics

- A fresh current-contract attempt remains distinct from a verified pinned source attempt.
- A release with no fresh attempt but with authenticated pinned evidence must present the verified source attempt as the release's retained evidence. It must never use a no-attempt empty state for that release.
- The words `current`, `current-contract`, and equivalent labels apply only to fresh attempts whose portable behavior identity matches the release.
- Pinned source evidence is labeled `Verified source attempt`, `Verified release evidence`, or equally explicit wording. Its source version or commit, attempt id, recorded time, maintainer reason, and source link remain visible.
- Current scenario/profile definitions may remain pending under the revised contract, but that secondary state must not erase or visually dominate the verified release evidence.

### Semantic evidence

- The public release summary displays `74/74` verified source cases, with 70 passed directly, 4 recovered, 0 failed, and 0 pending.
- The semantic page displays the authenticated source attempt id and recorded timestamps and links to its immutable source.
- The current 74-case definition remains visible as the current suite. The page explains that no fresh current-contract run exists only in language that also states the retained verified source result.
- The evidence landing page and home page derive their semantic release assurance from the current attempt when one exists, otherwise from the pinned source projection.

### Adapter qualification evidence

- The qualification index presents 14 verified source attempts for the release rather than zero attempts.
- Every profile with pinned evidence displays a passed verified-source result, its source attempt id, evidence time, and exact executed package closure. It does not say `No recorded attempt` or `No official attempt` for that profile.
- A future fresh current-contract attempt takes precedence for current-result presentation, while the pinned source remains provenance and is never merged into the current attempt history.
- Qualification counts, labels, filtering, and search remain bounded to the 14 profile models and their compact projections.

### Resource and evidence integrity

- The release envelope remains compact and contains source identity and maintainer reason, not copied transcripts, case bodies, or full result artifacts.
- Source traversal remains bounded and authenticated. Tampered status, counts, timestamps, packages, attempt ids, or source identity fail closed before website models are returned.
- Website rendering adds no runtime repository reads, model calls, unbounded lists, client-side evidence parsing, or duplicated evidence registry.
- No paid evaluation or qualification is needed because the portable skill behavior is unchanged and this correction only exposes already authenticated evidence accurately.

## Architecture and ownership

### Authenticated semantic projection

- Extend `assertSemanticSource` in `tooling/release-identity/release-evidence-source.mjs` to return one compact projection from the already authenticated source attempt and result: attempt id, status, created and updated timestamps, total case count, and passed, recovered, failed, and pending counts.
- Preserve complete source validation before projection. Do not add a second loader, trust the release envelope for result counts, or retain case bodies in the projection.
- Update the semantic branch of `assertPinnedReleaseEvidenceSection` to return that projection in the same way its qualification branch returns per-target projections.

### Website release-evidence model

- Update `website/src/lib/release-evidence/types.ts` so the pinned semantic section has one canonical compact attempt projection rather than a loose source-attempt id detached from result data.
- Update `website/src/lib/release-evidence/loader.ts` to propagate the authenticated semantic projection and construct the immutable source URL.
- Add small pure derived-state helpers in the nearest existing website model module when sharing current-versus-pinned selection across the home page, evidence landing page, and detail pages avoids duplicated conditionals. Do not create a parallel evidence store or broad abstraction.
- Keep `semanticEvaluation.currentAssurance` and qualification `currentStatus` unchanged as the current-contract facts. The release-facing derivation chooses current evidence when present and verified pinned evidence otherwise.

### Public pages

- Update `website/src/components/home-page/home-page.astro` and `website/src/pages/evidence/index.astro` to show verified release totals and honest source labels.
- Update `website/src/pages/evidence/semantic/index.astro` to present the verified source result, attempt identity, timestamps, and source link when no current attempt exists. Retain current suite definitions and the explicit no-fresh-run distinction without a misleading no-evidence empty state.
- Update `website/src/pages/evidence/qualification/index.astro` to count and label current or pinned evidence per profile, with current evidence taking precedence.
- Update `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro` so the top result and history area acknowledge the pinned source attempt instead of rendering empty-state copy. Reuse the existing pinned package-closure section and avoid duplicating the same table unnecessarily.
- Update `website/src/components/release-evidence-notice/release-evidence-notice.astro` only if a concise attempt identifier improves comprehension without duplicating detail-page content.
- Preserve accessibility, semantic headings, keyboard behavior, responsive layout down to 320 px, light/dark themes, and the current static-rendering architecture. No animation is introduced.

### Tests and documentation

- Update `tooling/release-identity/evidence.test-integration.mjs` to prove authenticated semantic projection and fail-closed behavior for tampered result counts and identity.
- Update `website/src/lib/release-evidence/loader.test-integration.ts` and `website/src/lib/generation/generation.test-unit.ts` for the projected semantic result and current-versus-pinned separation.
- Update the evidence landing, home page, semantic page, qualification index, and qualification profile end-to-end tests so they fail if authenticated pinned evidence is displayed as zero or no attempt.
- Preserve tests proving that pinned evidence is not current evidence. Add assertions for 74/74, 70 passed, 4 recovered, 14 verified qualification source attempts, source attempt ids, timestamps, links, and no misleading empty-state text.
- Synchronize `README.md`, `docs/release-evidence.md`, `docs/semantic-evaluation.md`, and `docs/adapter-qualification.md` only where they describe the visible release-evidence contract or current release version.
- Bump `package.json`, lockfile identity, public installation guidance, release metadata, and directly affected generated/version references from `5.0.1` to `5.0.2` through the established release-identity workflow.

## Public contracts and release effects

- Skill `5.0.2` is a presentation and release-model correction over `5.0.1`. Only the two established portable release-version markers may change; the normalized portable behavior digest must remain identical. Any other portable-byte change requires re-evaluating the no-rerun evidence decision before proceeding.
- The release-evidence schema may gain the bounded authenticated semantic projection in the in-memory website model, but `fixtures/release-evidence.json` remains the compact repository-bound source envelope rather than an evidence copy.
- Current semantic attempt records, qualification attempts, profile inputs, compatibility data, maturity data, and historical evidence remain unchanged.
- Existing URLs remain stable. No legacy page, redirect, alias, fallback, schema adapter, or compatibility bridge is introduced.
- The public website behavior changes from misleading current-only empty states to a release-evidence view that selects fresh current evidence when available and otherwise presents authenticated pinned evidence explicitly.

## Ordered implementation steps

1. Preserve completed milestones 1 through 5 and record the `v5.0.1` public identities and exact live presentation defect.
2. Extend the existing source authenticator and release-evidence model with a bounded semantic attempt projection, retaining full authentication and adding tamper regression coverage.
3. Centralize the minimal current-versus-pinned release derivation and update all affected public summary, semantic, qualification, and profile surfaces.
4. Update focused tests and state-bearing documentation so verified pinned attempts cannot regress to zero/no-attempt presentation while current-versus-pinned meaning remains explicit.
5. Update release identity to `5.0.2` and pin both evidence families to the same accepted immutable source evidence with a presentation-only maintainer reason. Confirm the portable skill behavior digest remains unchanged.
6. Run focused website and release-evidence tests, then the full deterministic release boundary. Inspect built pages at mobile and desktop widths in light and dark modes and verify public totals and labels.
7. Run a read-only review of the exact candidate, correct in-scope findings, and repeat until ready. Publish the signed candidate to `development`, merge the exact reviewed branch into `main` through branch protection, create signed immutable tag `v5.0.2`, and verify tag conformance and the deployed website.

## Tests and verification

Run focused checks while implementing, followed by:

```bash
npm run managed-readme:check
npm run test:unit
npm run test:integration
npm run eval:semantic:preflight
npm run qualification:dry-run:all
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run path:check
npm run website:check
npm run release:check
```

Use the established evidence-pin command for target `5.0.2` with both existing source domains and an honest reason stating that the correction changes only public evidence projection and presentation. Do not run `npm run eval:semantic -- --record`, a paid non-recording semantic diagnostic, `npm run qualification` without `--dry-run`, or any other model-backed stage.

Focused verification must prove:

- semantic source authentication returns exactly the recorded 74-case passing projection and rejects mismatched or tampered counts;
- qualification source authentication still returns exactly 14 bounded per-profile projections and rejects tampering;
- fresh current evidence takes precedence when present;
- pinned-only releases display verified attempt counts and source provenance instead of zero/no-attempt text;
- current-contract status is not rewritten or fabricated;
- no full evidence body or transcript enters the release envelope or website model;
- all affected static pages build successfully and expose correct accessible text;
- the built website at 320 px and desktop widths has no horizontal page overflow, maintains readable evidence tables, keyboard focus, accessible labels, and light/dark contrast;
- the `5.0.2` portable behavior digest exactly matches `5.0.1`, while release metadata and the authenticated source projection match the new target release;
- the tag checkout passes the deterministic release boundary on supported Node and Windows lanes.

## Failure handling and rollback

- If an authenticated source does not contain the expected passing attempt or its counts, identity, timestamps, package closure, or digest fail validation, stop. Do not manufacture or reinterpret evidence.
- If a focused test reveals that a page relied on `current` to mean release-effective evidence, fix the derivation and copy while preserving the underlying current-attempt model.
- If changing the public model would require copying full case or artifact content, retain source links and compact metadata instead.
- If portable skill bytes change beyond the two normalized release-version markers, do not reuse the prior evaluation decision automatically; inspect and re-plan before publication.
- Before the `v5.0.2` tag exists, corrections are normal signed commits. After publication, do not move tags, rewrite history, force-push, or add a compatibility layer. A later correction requires a new version.

## Risks and controls

- **Pinned evidence could be mislabeled as fresh.** Every fallback display explicitly names verified source evidence and retains its source identity and maintainer reason.
- **Current pending definitions could be mistaken for failed release evidence.** Present release evidence first and current definition status second, with distinct headings and labels.
- **Headline totals could diverge between pages.** Use one small shared derivation over the canonical model and test home, evidence landing, and detail surfaces against the same fixture.
- **Projection could increase memory or output materially.** Return only scalar counts, ids, timestamps, status, and the already bounded qualification package closure. Never return case bodies or transcripts.
- **Tests could preserve the old defect.** Replace no-attempt expectations for pinned fixtures with affirmative verified-source assertions while retaining separate unpinned-empty-state fixtures.
- **A presentation correction could accidentally invalidate evidence reuse.** Change only the two established portable release-version markers and verify that the normalized behavior digest still matches `v5.0.1`.
- **Public deployment could lag the tag.** Verify workflow conclusions and inspect the deployed routes after the tag-bound build finishes.

## Acceptance criteria

- The semantic evidence page presents the authenticated source attempt as 74/74 verified cases, including 70 direct passes, 4 recovered cases, 0 failures, 0 pending cases, attempt id, time, reason, and source link.
- The qualification evidence index presents all 14 profiles as having verified source attempts where pinned evidence exists and never labels those profiles `No recorded attempt`.
- Each qualification profile presents its verified source result, source attempt identity, time, and exact executed package closure without claiming a fresh current-contract attempt.
- The home page and evidence landing page show release-effective verified totals rather than current-only zeros.
- A genuinely unpinned release with no attempt still uses the appropriate empty state.
- Fresh current evidence takes precedence without erasing pinned provenance, and current suite/profile status remains truthful.
- Release-evidence source authentication remains fail-closed and bounded. The release envelope contains no copied case bodies, transcripts, or large evidence payloads.
- Public docs explain the distinction between current attempts and verified pinned source attempts without contradictions.
- Skill release identity is `5.0.2`, its portable behavior digest matches `5.0.1`, and its evidence envelope points to the same accepted qualification and semantic source identities with a presentation-only reason.
- All focused and full deterministic checks pass. No paid semantic evaluation or non-dry adapter qualification runs.
- The exact reviewed candidate is merged, signed tag `v5.0.2` is published, tag conformance passes, and the deployed website no longer presents retained evidence as zero or absent.
- No platform, packages, knowledge-base, historical evidence, maturity data, compatibility data, `skill-mock`, protected coding instruction, excluded archive/backup content, or unrelated concurrent-agent file is changed by this correction.

## Assumptions and developer decisions

- The developer requires a clean current implementation and explicitly forbids another semantic evaluation or adapter qualification for this correction.
- The already accepted evidence remains valid because this milestone changes only deterministic website projection, wording, tests, and release metadata; after normalizing the two release-version markers, portable skill behavior must remain byte-identical.
- The developer has authorized the existing end-to-end autonomous sequence through review, publication, merge, tagging, and deployment. A genuine evidence-integrity or portable-behavior mismatch remains a blocker rather than a reason to fabricate evidence or silently expand scope.

## Execution scope

Preserve the completed cross-repository production-readiness work and public `v5.0.1` history, then release `moldea` `5.0.2` as one clean evidence-presentation correction: project the already authenticated 74-case semantic source result, use the existing 14 bounded qualification projections, make verified pinned attempts visible across every release-evidence summary and detail surface, retain an explicit current-versus-pinned distinction, update focused tests and state-bearing documentation, pin the same accepted source evidence, and publish the reviewed signed release without any paid semantic evaluation or non-dry adapter qualification.
