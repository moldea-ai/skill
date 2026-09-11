# Milestones: Remove runtime maturity coupling and standardize README initialization

## Milestone 1: Separate current evidence from pinned release provenance

### Objective

Make the website model and evidence pages represent current-contract semantic and qualification results independently from a release's verified pinned provenance. This establishes a complete, tested presentation boundary before the later fixture and suite identity changes make the current contracts pending.

### Dependencies

- The challenged plan at `coding-agent-planning/1789153544_runtime-publication-and-readme-block/plan.md`.
- Existing release-evidence envelope and source-resolution behavior remain authoritative; this milestone adds no second pin or evidence mechanism.

### Scope

- The website model, release-evidence loader assertions, semantic and qualification evidence pages, evidence overview, home page, and generated LLM output named by the plan.
- No portable-skill, semantic-suite, qualification-profile, release-version, or historical-evidence change.

### Implementation work

1. Separate current-contract semantic and qualification attempts from pinned release provenance throughout the website model and public evidence surfaces.
2. Preserve exact current evidence when its complete identity matches, while showing changed current contracts as pending and retaining only an immutable source link for prior evidence.
3. Reuse existing accessible design-system components without introducing a new UI primitive, motion, or React runtime.

### Verification

- Focused website generation and release-evidence unit tests.
- Semantic, qualification, evidence-overview, and home-page end-to-end tests.
- Complete website check and website end-to-end suite.

### Acceptance criteria

- Pinned passing evidence never fabricates current counts, statuses, attempts, or routes.
- Exact current evidence remains representable independently.
- Public and LLM output use the same current-versus-pinned distinction.
- Website accessibility, responsive, theme, build, and artifact checks pass.

### Review checkpoint

Completed, reviewed, and published as commit `fc49341e30505ee53063302152d731bbdb6d7aed` on `development`.

## Milestone 2: Build and verify the complete `moldea` 5.0.1 release candidate

### Objective

Complete the coupled behavioral release slice: introduce deterministic canonical README initialization, enforce exact adoption, remove runtime-maturity coupling, synchronize all live semantic and qualification inputs and documentation, replace obsolete semantic cases while retaining 74 cases, make immutable semantic source verification independent of the current evaluator schema, bump to `5.0.1`, pin both evidence domains transparently through `v5.0.0`, and produce one fully verified release candidate.

### Dependencies

- Milestone 1 is complete, reviewed, and published to `development`.
- The website can distinguish pinned provenance from unmatched current-contract evidence.
- The immutable `v5.0.0` envelope and flattened semantic source commit `926907e26feac6a55929f68ca134aeaf41a6a4b5` remain the intended sources.
- The current-schema pin failure is resolved at the source-verification boundary without editing historical evidence or executing historical code.

### Scope

- The canonical asset, authored managed-README implementation and tests, generator, generated portable writer, relevance gate, portable identity checks, and package scripts named by the plan.
- Portable runtime, initialization, planning, and design instructions under `moldea/`.
- Runtime-compatibility publication tooling, evaluator command policy, semantic runner, conformance tests, current semantic fixtures, website constants, and qualification initialization fixtures named by the plan.
- `tooling/release-identity/release-evidence-source.mjs` and focused source-schema-drift coverage in `tooling/release-identity/evidence.test-integration.mjs`.
- Release identity files, directly affected current-state documentation, current website identity assertions, and `fixtures/release-evidence.json`.
- No historical result or attempt edits, external-repository changes, `skill-mock` changes, Eve adapter changes, protocol-version compatibility branches, source-code execution, or paid evaluation.

### Implementation work

1. Add the canonical managed-block asset, authoritative writer template, deterministic generator, colocated adversarial tests, and generated portable script. Enforce generation freshness and exclude tests from portable artifacts.
2. Make adoption use the same exact parser and canonical block. Update initialization instructions and every live initialized semantic and qualification fixture while preserving unrelated README bytes and deliberately uninitialized cases.
3. Remove technical runtime maturity from skill guidance, publication validation, semantic cases, live fixtures, website constants, and current documentation. Replace the two obsolete cases and variants without aliases while retaining exactly 74 covered cases.
4. Recognize only the exact portable writer invocation as a local non-networking skill operation. Keep it separate from moldea CLI resource accounting and retain final validation requirements.
5. Refactor immutable semantic source verification to authenticate committed definitions, stable raw suite and coverage digests, unique and complete case inventory, passing results, bounded resource evidence, attempt linkage, artifact hashes, and flattened provenance without applying current case-definition or coverage vocabulary. Preserve strict current-schema validation in the current-evidence path.
6. Add regression coverage proving a valid earlier source with superseded evaluator vocabulary remains pinnable while digest drift, duplicate or incomplete inventory, failed cases, and resource-budget violations fail closed.
7. Bump every active release identity to `5.0.1`, complete focused and free pre-pin checks, and pin both evidence sections through `v5.0.0` with the approved honest maintainer reason.
8. Verify the target digests and direct sources, confirm changed current contracts render as pending, and complete website and release verification. Regenerate the pin after any later digest-affecting change.

### Verification

- Focused managed-writer, generator, relevance-gate, publication-validator, evaluator-policy, semantic-runner, qualification-loader, release-evidence, and website-model tests.
- `npm run managed-readme:check`
- `npm run test:unit`
- `npm run test:integration`
- `npm run eval:semantic:preflight`
- `npm run qualification:dry-run:all`
- `npm run qualification:test`
- `npm run qualification:typecheck`
- `npm run qualification:lint`
- `npm run qualification:format:check`
- `npm run path:check`
- The repository-bound `release:evidence:pin` command from `v5.0.0` after the pre-pin checks pass.
- `npm run website:check` and the complete website end-to-end suite after the pin exists.
- `npm run release:check` without a target-tag environment variable.
- Touched-file formatting and repeat verification only for checks affected by subsequent bytes.
- Do not run paid semantic evaluation or non-dry-run qualification commands.

### Acceptance criteria

- Runtime maturity is absent from active technical inputs and cannot force `custom` or erase independently established facts.
- The canonical asset and authored writer are the sole authorities; the generated script is deterministic, test-free, bounded, byte-preserving, atomic, and the only shipped path.
- Exact adoption, all live initialized fixtures, 74 semantic cases, evaluator command policy, current documentation, and active release identities are synchronized.
- Published semantic evidence is verified independently of current evaluator vocabulary but still fails closed on cryptographic, inventory, passing-result, resource, attempt, or provenance inconsistency.
- Current semantic and qualification contracts render as pending; prior pinned sources remain honest provenance without fabricated current claims.
- The `5.0.1` envelope carries exact target digests, qualification resolves to `v5.0.0`, and semantic evidence resolves to commit `926907e26feac6a55929f68ca134aeaf41a6a4b5`.
- Every deterministic verification passes without paid model work.
- Historical evidence, external repositories, `skill-mock`, and the Eve adapter remain unchanged, with no compatibility shim, alternate block, deprecated identifier, or parallel implementation.

### Review checkpoint

Review the candidate as one identity-sensitive release. Trace the canonical block from authority through generation, execution, adoption, fixtures, and evaluator policy; trace runtime conclusions without maturity; trace source evidence through raw committed digests and complete passing inventory without current-schema reinterpretation; verify all 74 mappings, qualification profile identities, website claims, release version, direct sources, target digests, changed paths, and deterministic check results before publication to `development`.

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
- No candidate modification unless failed verification invalidates it and triggers plan revision.

### Implementation work

1. Confirm the exact candidate fingerprint, branch, signing state, and resolved `development` destination.
2. Commit the complete cohesive candidate with sign-off and cryptographic signature, then push only the explicit `development` ref.
3. Refresh and review the published branch against the exact effective `main` target. Return any source or evidence correction to Milestone 2.
4. Merge only the reviewed candidate through the established development-to-main process without force, history rewriting, bypasses, or unrelated work.
5. Verify the resulting `main` commit represents the exact candidate, create `v5.0.1` on it, and publish only that tag.
6. Require tag-bound release verification and confirm website publication observes the intended `main` commit.

### Verification

- Verify development commit parent, tree, paths, message, sign-off, signature, and clean worktree before pushing.
- Run `review main` and require `Ready to merge into main` for the exact commits.
- Verify the merge result contains the exact candidate tree and no unrelated content.
- Verify `v5.0.1` targets the exact reviewed release commit.
- Confirm tag-bound conformance and release checks plus main-branch website publication.

### Acceptance criteria

- The exact reviewed candidate is published to `development` with a signed and signed-off commit.
- The candidate reaches `main` without force, history rewriting, bypasses, unrelated files, or post-review source changes.
- `v5.0.1` exists exactly once at the reviewed release commit and tag-bound verification passes.
- The public website represents prior pinned evidence and pending current contracts exactly as reviewed.
- No rollback, compatibility shim, legacy page, duplicate evidence mechanism, historical artifact edit, external-repository change, or Eve adapter change is introduced.

### Review checkpoint

Compare the development commit, reviewed merge input, resulting main tree, and tag target. Require exact candidate-tree equality, valid signature and sign-off evidence, successful branch and tag checks, and correct public evidence presentation. Any mismatch or source change returns to the appropriate earlier milestone.

## Execution scope

Execute three sequential milestones: preserve the completed website evidence-boundary milestone; finish the `moldea` 5.0.1 candidate by standardizing README initialization, removing runtime maturity, making immutable source verification protocol-independent, pinning prior evidence honestly, and completing deterministic verification without paid evaluations; then publish the exact candidate through `development`, merge it into `main`, create `v5.0.1`, and verify the tag-bound release.
