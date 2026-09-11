# Milestones: Remove runtime maturity coupling and standardize README initialization

## Milestone 1: Separate current evidence from pinned release provenance

### Objective

Make the website model and evidence pages represent current-contract semantic and qualification results independently from a release's verified pinned provenance. This establishes a complete, tested presentation boundary before the later fixture and suite identity changes make the current contracts pending.

### Dependencies

- The challenged plan at `coding-agent-planning/1789153544_runtime-publication-and-readme-block/plan.md`.
- Existing release-evidence envelope and source-resolution behavior remain authoritative; this milestone adds no second pin or evidence mechanism.
- No portable-skill, semantic-suite, qualification-profile, release-version, or historical-evidence change occurs in this milestone.

### Scope

- `website/src/lib/model/types.ts`
- `website/src/lib/generation/generation.ts`
- `website/src/lib/generation/generation.test-unit.ts`
- Directly affected assertions in `website/src/lib/release-evidence/loader.test-unit.ts`
- `website/src/pages/evidence/semantic/index.astro`
- `website/src/pages/evidence/semantic/_index.test-e2e.ts`
- `website/src/pages/evidence/qualification/index.astro`
- `website/src/pages/evidence/qualification/[adapterId]/[implementationId]/index.astro`
- `website/src/pages/evidence/qualification/_index.test-e2e.ts`
- `website/src/pages/evidence/index.astro`
- `website/src/pages/evidence/_index.test-e2e.ts`
- `website/src/components/home-page/home-page.astro`
- `website/src/components/home-page/home-page.test-e2e.ts`
- `website/src/pages/llms.txt.ts`

### Implementation work

1. Rename `semanticReleaseAssurance` to `currentSemanticAssurance` and make the current semantic attempt loader resolve only attempts whose complete identity matches the current suite.
2. Preserve pinned semantic evidence as independently verified release provenance. Do not coerce its source attempt into the current 74-case model, recreate obsolete cases, or derive a current passing count from it.
3. Apply the same separation to qualification: pinned aggregate provenance remains verified while each current profile derives its status, latest attempt, attempt count, and routes only from its current profile identity.
4. Update semantic, qualification, overview, home-page, and generated LLM output so pinned sources are labeled as prior verified evidence and current unmatched contracts are visibly pending. Preserve current results when their complete current identity still matches.
5. Reuse the existing release-evidence notice, design-system components, responsive layout, theme behavior, keyboard navigation, and accessible semantics. Introduce no new UI primitive, motion, or React runtime.
6. Update focused model, loader, and page tests for both conditions: an exact current attempt and verified pinned provenance whose source no longer matches the current contract.

### Verification

- Run the focused website generation and release-evidence unit tests.
- Run the semantic, qualification, evidence-overview, and home-page Playwright tests.
- Run `npm run website:check`.
- Run `npm --prefix website run test:e2e` so keyboard behavior, accessible names, no-JavaScript output, 320 px layouts, both themes, and existing axe assertions execute rather than remaining inspection-only claims.
- Format only the touched website files with the installed website Prettier configuration and review the generated output diff.

### Acceptance criteria

- Pinned semantic and qualification provenance can be rendered without loading an obsolete attempt through current definitions.
- A pinned passing source never fabricates a current semantic case count, current qualification profile status, current attempt count, or current attempt route.
- Exact current evidence remains representable independently when it exists; an identity mismatch produces an explicit pending current state.
- Generated LLM text and every affected public page use the same current-versus-pinned distinction.
- Relevant website unit, build, artifact, and end-to-end checks pass with no serious accessibility violation or 320 px overflow in either theme.
- No portable-skill, fixture, release-envelope, version, historical result, or external-repository file changes in this milestone.

### Review checkpoint

Review the website model first, then trace each semantic and qualification value displayed on the detail pages, overview, home page, and LLM output back to either current-contract evidence or pinned provenance. Confirm that no obsolete attempt is relabeled, no current count is inferred from a pin, existing accessible components remain in use, and the exact current repository state passes the website checks before publication to `development`.

## Milestone 2: Build and verify the complete `moldea` 5.0.1 release candidate

### Objective

Complete the coupled behavioral release slice: introduce deterministic canonical README initialization, enforce exact adoption, remove runtime-maturity coupling, synchronize all live semantic and qualification inputs and documentation, replace obsolete semantic cases while retaining 74 cases, bump to `5.0.1`, pin both evidence domains transparently through `v5.0.0`, and produce one fully verified release candidate.

### Dependencies

- Milestone 1 is complete, reviewed, and published to `development`.
- The website can already distinguish pinned provenance from unmatched current-contract evidence.
- The immutable `v5.0.0` evidence source and flattened semantic source commit `926907e26feac6a55929f68ca134aeaf41a6a4b5` remain resolvable by the existing pin verifier.

### Scope

- New canonical asset: `moldea/assets/managed-readme-block.md`
- New authored implementation and colocated tests under `tooling/managed-readme/`
- Generated runtime artifact: `moldea/scripts/managed-readme.mjs`
- `moldea/scripts/relevance-gate.mjs`
- Portable identity and release-check tooling and tests required to enforce generated-byte freshness and exclude test artifacts from `moldea/`
- `package.json`, `package-lock.json`, `moldea/SKILL.md`, and `moldea/references/local-tooling.md`
- `moldea/references/continuous-maintenance.md`, `moldea/references/runtime-compatibility.md`, `moldea/references/agent-system-planning.md`, and `moldea/references/agent-design.md`
- `tooling/runtime-compatibility-publication/publication.mjs`, its colocated unit test, and `fixtures/tooling/runtime-compatibility-publication.json`
- `tooling/codex-evaluation-host/execution-evidence.mjs` and its colocated unit tests
- `tests/semantic-evaluation-runner.mjs`, its unit and integration tests, and `tests/conformance.test-unit.mjs`
- `fixtures/semantic-evaluation-coverage.json` and `website/src/lib/semantic-evaluation/constants.ts`
- Every live initialized `qualification/profiles/t*/cases/*/seed/README.md`, `qualification/profiles/t5/cases/c2/expected/README.md`, `qualification/src/compatibility/loader.test-integration.ts`, and directly affected current qualification fixture descriptions
- `README.md`, `docs/getting-started.md`, `docs/how-it-works.md`, `docs/planning-agent-systems.md`, `docs/compatibility-and-local-tooling.md`, `docs/adapter-qualification.md`, `docs/designing-agents.md`, `docs/release-evidence.md`, and `qualification/profiles/t5/README.md`
- `fixtures/release-evidence.json`
- Milestone 1 website files only where final `5.0.1` identities, pending-state fixtures, release copy, or generated output require synchronization

### Implementation work

1. Add the canonical managed-block asset with the exact approved text, intentional blank line after the opening marker, and one final newline.
2. Add the authoritative writer source template and its colocated behavior tests. Implement bounded regular-file handling, fatal UTF-8 validation, exact marker parsing, byte-safe prefix and suffix preservation, BOM and multibyte-content safety, deterministic LF or CRLF insertion, file-mode preservation, same-directory atomic replacement, temporary cleanup, compact output, closed absolute-root arguments, and byte-identical repeat execution.
3. Add and test the deterministic generator. It must inject the canonical asset through exactly one reserved literal, produce the self-contained test-free portable script, support atomic write and check-only modes, and fail on malformed inputs or complete-byte drift. Add `managed-readme:generate` and `managed-readme:check`; require the latter at the start of `release:check`.
4. Make the relevance gate consume the generated writer's canonical parser. Require both bounded canonical files and exactly one canonical logical README region while preserving the existing two-byte `1\n` or `0\n` interface. Legacy and malformed blocks miss; explicit initialization normalizes one safe marker pair.
5. Update skill initialization instructions and every live initialized semantic and qualification fixture to use the writer-owned block. Preserve project-specific bytes outside managed markers and leave explicitly uninitialized fixtures without markers. Strengthen semantic and qualification exact-output assertions.
6. Remove maturity from runtime instructions, planning and design guidance, technical publication validation, its repository fixture, current qualification descriptions, and all directly affected current-state documentation. Preserve technical target identity, package ranges, local composition, repository wiring, provider limits, patterns, guidance, implementation state, repository-format support, and verification-date checks.
7. Replace `published-supported-target-not-installed` with `published-target-not-installed` and replace `experimental-target-not-production-ready` with `published-target-version-mismatch`. Update evaluator variants, coverage mappings, titles, conformance assertions, and website constants without aliases, while retaining exactly 74 unique current cases.
8. Update the evaluator host classifier so only the exact generated managed-README command is recognized as a local non-networking skill operation. Reject alternate paths, extra arguments, arbitrary Node programs, near matches, and shell composition. Do not count the writer as a moldea CLI call; continue requiring final launcher-backed validation.
9. Bump every active release identity to `5.0.1`, leaving only intentionally generic parser fixtures unchanged. Update the root portable tree, initialization, runtime compatibility, evidence-pin, installation, and release documentation without retaining maturity aliases or alternate README templates.
10. Run focused source checks, free semantic preflight, and qualification dry runs before changing the release envelope. Then pin `semantic` and `qualification` through `v5.0.0` with a concise maintainer reason that names the maturity-removal and deterministic-initialization changes, identifies the replacement deterministic checks, and does not claim prior models evaluated the new contracts.
11. Verify that the resulting envelope targets `5.0.1` and the current portable-skill and dependency-closure digests, qualification resolves directly to `v5.0.0`, and semantic evidence resolves directly to commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`. Regenerate the pin after any later digest-affecting change.
12. Confirm Milestone 1 now renders every changed current semantic and qualification identity as pending while exposing only honest prior provenance. Do not modify or recreate historical attempts, results, source evidence, or obsolete pages.

### Verification

- Run focused managed-writer, generator, relevance-gate, publication-validator, evaluator-policy, semantic-runner, qualification-loader, release-evidence, and website-model tests during implementation.
- Run `npm run managed-readme:check`.
- Run `npm run test:unit`.
- Run `npm run test:integration`.
- Run `npm run eval:semantic:preflight`.
- Run `npm run qualification:dry-run:all`.
- Run `npm run qualification:test`.
- Run `npm run qualification:typecheck`.
- Run `npm run qualification:lint`.
- Run `npm run qualification:format:check`.
- Run `npm run path:check`.
- Run `npm run release:evidence:pin -- --scope all --from v5.0.0 --reason "<honest release-specific reason>"` only after all pre-pin checks pass.
- Run `npm run website:check` and `npm --prefix website run test:e2e` after the pin exists and every digest-affecting source is final.
- Run `npm run release:check` without a target-tag environment variable.
- Run Prettier on only touched files with the repository's installed configurations, then repeat every check affected by formatter or generator output.
- Do not run `npm run eval:semantic` or any non-dry-run qualification command.

### Acceptance criteria

- Runtime maturity is absent from every active technical input, decision branch, current semantic case, live fixture, and current-state document; its absence cannot force `custom` or erase independently established runtime facts.
- The canonical asset is the sole managed-text authority, the authored template is the sole writer implementation authority, and the generated script is the only shipped execution path.
- Generated-byte drift or any test artifact under `moldea/` fails deterministic release verification.
- Every successful initialization produces the approved logical block, including its blank line and final newline, while preserving every original byte outside the managed region. Unsafe, malformed, linked, invalid, or over-limit inputs fail without corrupting the target or leaving temporary files.
- The relevance gate recognizes only the canonical block and the complete bounded foundation.
- All live initialized semantic and qualification fixtures contain the canonical block; explicitly uninitialized fixtures remain uninitialized.
- The semantic suite contains exactly 74 covered cases, includes the package-version mismatch boundary, and contains no obsolete maturity identifier or alias.
- Current semantic and qualification evidence is pending after identity changes. Public pages expose the pinned source honestly without fabricated current counts, statuses, attempts, or routes.
- The `5.0.1` evidence envelope contains the exact target digests and direct source provenance required by the plan.
- Every deterministic command above passes. No paid model evaluation or qualification runs.
- Historical evidence, external repositories, `skill-mock`, and the Eve adapter remain unchanged.
- The final candidate contains no maturity compatibility shim, alternate README template, deprecated identifier, manual generated-code divergence, or parallel implementation path.

### Review checkpoint

Review the complete candidate as one identity-sensitive release. Trace the canonical block from its Markdown authority through generation, installed execution, adoption, fixtures, and evaluator policy; trace runtime conclusions from canonical assignment through repository evidence, local composition, and technical publication without maturity; verify all 74 semantic mappings; inspect every changed qualification profile identity; and compare website claims with the final pinned envelope. Confirm the exact release version, source commits, digests, changed paths, absence of historical edits, and all deterministic check results before committing and publishing the candidate to `development`.

## Milestone 3: Publish and tag the reviewed `moldea` 5.0.1 release

### Objective

Publish the exact reviewed release candidate through the established branch workflow, merge it into `main`, create immutable tag `v5.0.1` on the exact reviewed release commit, and verify the tag-bound release without changing the approved candidate.

### Dependencies

- Milestone 2 has a matching `Ready to commit` review verdict and complete immutable state evidence.
- All required deterministic checks have passed for the exact candidate tree.
- The push remote, destination branches, merge target, and signing configuration resolve unambiguously.

### Scope

- Git publication of the exact Milestone 2 candidate from `development`.
- Review of the published branch against the refreshed effective `main` target.
- Established development-to-main merge workflow.
- Immutable `v5.0.1` tag and its tag-bound release/conformance verification.
- No source, fixture, documentation, evidence, generated artifact, or version modification unless a failed verification invalidates the candidate and triggers plan revision.

### Implementation work

1. Confirm the current `HEAD`, complete candidate fingerprint, staged tree, branch, signing state, and resolved `development` push destination still match the successful review evidence.
2. Commit the complete cohesive candidate with the repository's conventional message, required sign-off, and cryptographic signature, then push only the explicit `development` ref.
3. Refresh and review the published branch against the exact effective `main` target, including prospective merge state and required verification. Correct no finding inside the publication step; a source or evidence correction returns to Milestone 2 review and invalidates later publication evidence.
4. Merge only the reviewed candidate through the established development-to-main process without force-pushing, rewriting history, bypassing checks, or including unrelated work.
5. Verify the resulting `main` commit represents the exact reviewed candidate. Create `v5.0.1` on that exact commit and publish only that tag.
6. Require the tag-triggered conformance workflow or equivalent established tag-bound `release:check` to pass with `MOLDEA_RELEASE_TAG` resolved to `v5.0.1`. Confirm the website publication observes the intended `main` commit without changing release claims.

### Verification

- Verify the development commit's parent, tree, path set, message, sign-off, cryptographic signature, and clean worktree before pushing.
- Run `review main` against the published development branch and require `Ready to merge into main` for the exact commits.
- Verify the merge result contains the exact candidate tree and no unrelated commit content.
- Verify the immutable `v5.0.1` tag targets the exact reviewed release commit.
- Confirm the tag-bound conformance and release checks pass and that the main-branch website publication succeeds.

### Acceptance criteria

- The exact reviewed candidate is published to the resolved `development` destination with a signed and signed-off commit.
- The candidate is merged into `main` without force, history rewriting, bypassed checks, unrelated files, or post-review source changes.
- Tag `v5.0.1` exists exactly once and targets the reviewed release commit.
- Tag-bound release verification passes for `v5.0.1`.
- The public website represents prior pinned evidence and pending current contracts exactly as reviewed.
- No rollback, compatibility shim, legacy page, duplicate evidence mechanism, historical artifact edit, external-repository change, or Eve adapter change is introduced.

### Review checkpoint

Compare the development commit, reviewed merge input, resulting main tree, and tag target. Require exact candidate-tree equality, valid signature and sign-off evidence, successful branch and tag checks, and correct public evidence presentation. Any mismatch or source change invalidates publication readiness and returns the work to the appropriate earlier milestone rather than being patched during tagging.

## Execution scope

Execute three sequential milestones: first separate current semantic and qualification evidence from pinned release provenance across the website; then build, synchronize, pin, and deterministically verify the complete clean `moldea` 5.0.1 candidate without paid evaluations or external-repository changes; finally publish that exact reviewed candidate through `development`, merge it into `main`, create immutable tag `v5.0.1`, and verify the tag-bound release.
