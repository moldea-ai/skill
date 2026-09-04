# Milestones: Scalable clean-slate moldea activation and PR Assurance foundation

## Publication protocol

For every incomplete milestone, preserve unrelated concurrent work, implement only the milestone's cohesive scope, run its focused and broader verification, perform the read-only `review` correction loop until the exact state is ready, create signed and signed-off commits, and push only explicit intended refs. Before integrating a feature branch, refresh the exact `origin/main`, run `review main`, require a conflict-free ready verdict, integrate with signed metadata, push only `HEAD:refs/heads/main`, and verify triggered workflows or published artifacts. Platform `new_skill` is synchronized with `main` at the remaining-work baseline. Skill work remains on `new_skill` until the final release milestone. Knowledge-base work remains on `main`.

Fixture scenario branches are immutable publication artifacts rather than feature branches. Each receives one reviewed signed commit and is pushed with an explicit branch refspec to both fixture repositories. The exact same commit object must back each matching public/private branch. Corrections create a new scenario commit and coordinated consumer update; published fixture branch tips are never silently rewritten.

## Milestone 1: Atomic public package generation (complete)

### Objective

Preserve the already completed clean Repository 2, filesystem reader 2, Core 3, CLI 7/schema 4, and official adapter-major generation as the trusted dependency foundation.

### Dependencies

- None remaining.

### Scope and implementation

- `../packages` main commit `7f20acf565e66daaae73107ac41c80c3e57685ee` and its dependency-connected history.
- Published `@moldea.ai/repository` 2.0.0, `@moldea.ai/repository-fs` 2.0.0, `@moldea.ai/core` 3.0.0, `@moldea.ai/cli` 7.0.0, Anthropic/OpenAI adapters 3.0.0, and every other official adapter 2.0.0.
- Matching platform package specifications merged through signed commit `6fb9bbebf6d99f08c3ace81f464a79b4cc0467ca`.
- Do not repeat or change this milestone unless later concrete evidence exposes a public-contract defect and triggers the authorized re-planning loop.

### Tests and verification

- Reuse the completed package review, package/workspace checks, packed-candidate validation, registry-version verification, and published platform-specification evidence.
- Include versions and removed-contract searches in the final cross-repository audit.

### Acceptance criteria

- Complete. The new package generation is on `main`, available from npm, and consumed as the only supported foundation.

### Review checkpoint

No new review is required unless a later milestone invalidates the released contract.

## Milestone 2: Paired GitHub fixture corpus

### Objective

Publish one production-representative, resource-conscious fixture corpus as identical immutable Git objects in the public and private GitHub repositories, including stable closed PR objects for real provider mapping when authenticated host access is available.

### Dependencies

- Milestone 1 contracts and registry artifacts.
- Clean public fixture worktree and authenticated Git access to both repositories.
- Final challenged plan at `plan.md`, SHA-256 `bc765f91bf2c50fb74ead602a615dadcef8af183d14fab6b802e0711951aa4c8`.

### Scope and implementation

1. Preserve existing immutable fixture branches and create deterministic scenario commits for `uninitialized_fixture`, `initialized_unbound_fixture`, `assurance_base_fixture`, `assurance_relevant_change_fixture`, `assurance_irrelevant_change_fixture`, `assurance_binding_deleted_fixture`, and `assurance_large_repository_fixture`.
2. Add realistic TypeScript access/refund behavior, canonical policy and relationships, bound and `affectedBy` paths, unrelated decoys, moved/deleted binding behavior, and source content suitable for on-demand Cloud exploration and PR Assurance findings.
3. Build the large scenario deterministically with exactly 1,024 source files, nested and wide trees, multibyte Unicode content that requires multiple read pages, mostly irrelevant changes, and at least one relevant change. Keep total committed blob content at or below 16 MiB.
4. Create `fixture_manifest` only after scenario commit identities are final. Its machine-readable manifest records scenario branches, base/head SHAs and trees, initialization/binding state, changed paths, relevance, expected reads, and expected deterministic/semantic outcomes while excluding its own commit identity.
5. Establish the private repository locally or as a second remote and push the exact public commit objects to matching private branches. Do not recreate or amend commits per repository.
6. Create matching PRs from the relevant, irrelevant, deleted-binding, and large candidates to `assurance_base_fixture`, then close them without merging. Keep repository-specific PR numbers outside the identical fixture trees.
7. Document fixture immutability, generation, size envelope, scenario meaning, and correction policy in the fixture README/manifest branch without changing protected instructions.

### Tests and verification

- Run deterministic fixture generation twice in disposable worktrees and require identical file bytes, modes, trees, and commit inputs before signing.
- Validate every manifest SHA/tree against Git objects and every expected changed-path set with Git diff-tree plumbing that does not inspect excluded directories.
- Require public/private `git ls-remote` branch tips to match exactly after publication.
- Verify repository blob totals, path portability, symlink behavior, Unicode paths/content, absence of credentials, and the 1,024-file/16-MiB envelope.
- Verify every created PR resolves to the pinned base/head SHAs and is closed without merge; report authenticated PR creation as an exact external prerequisite if no usable host capability exists.

### Acceptance criteria

- Both repositories expose identical immutable scenario and manifest commits; visibility/authentication is their only behavioral difference.
- The corpus covers uninitialized, initialized-unbound, bound base, relevant, irrelevant, deleted/moved binding, lazy large-tree, and on-demand content behavior.
- Extreme GitHub caps remain synthetic-test responsibilities rather than permanent repository bloat.
- Every fixture commit is signed/signed-off, reviewed, and explicitly pushed to both repositories without changing `main` or existing immutable branches.

### Review checkpoint

Inspect scenario realism, manifest truth, exact public/private object parity, branch immutability, PR state, secret safety, path portability, size/resource envelope, and whether expected outcomes can catch false relevance, false irrelevance, eager reads, and incomplete comparison.

## Milestone 3: Lazy GitHub reader and comparison

### Objective

Replace the platform GitHub package's eager inventory with Repository 2 lazy immutable snapshots, deterministic pages and byte ranges, complete pairwise tree comparison, and explicit provider/resource failures.

### Dependencies

- Milestone 2 branch and manifest commits published to both fixture repositories.
- Platform `new_skill` synchronized with `main` at `6fb9bbebf6d99f08c3ace81f464a79b4cc0467ca` or a freshly verified descendant containing no unrelated scoped changes.

### Scope and implementation

1. Replace `../platform/packages/api/repository-github/src/**` eager inventory/session/cache behavior with Repository 2 snapshots based on repository identity, commit SHA, and root-tree SHA.
2. Resolve exact paths lazily through tree segments, page listings in stable bytewise order, range-read blobs, compare tree pairs by pruning equal SHAs, and descend only changed subtrees.
3. Enforce separate request, response-byte, retry, concurrency, memory-cache, disk-spool, open-handle, cancellation, and duration controls; oversized entries bypass caches safely.
4. Treat truncated aggregate trees as an optimization miss and descend through complete child trees. Treat an unpageable truncated individual tree as provider-incomplete and never as a complete result.
5. Remove the eager inventory and full-tree fallback owners made obsolete. Keep public exports thin and exact, update package manifest/lockfile to trusted Repository 2 dependencies, and preserve NestJS module conventions.
6. Add a platform-owned live fixture map containing the single pinned `fixture_manifest` commit, public/private repository identities, and closed PR numbers when available. Load scenario SHAs and outcomes from the repository manifest rather than scattering them across tests.
7. Synchronize `moldea/context/api-repository-github-package.md`, direct repository/package references, and root blueprint statements affected by actual behavior.

### Tests and verification

- Unit coverage for traversal ordering, directory synthesis, pages, ranges, cache bypass/LRU accounting, tree-pair pruning, additions/deletions/type changes, cursors, cancellation, retry policy, rate-limit mapping, authorization loss, and every typed provider/resource failure.
- Integration coverage with deterministic synthetic providers for aggregate truncation above provider limits, unpageable child truncation, more than 3,000 PR-file hints, more than 300 compare-file hints, wide/deep trees, request amplification, large blobs, and resume.
- Table-driven bounded live e2e coverage against public and private scenario commits for snapshot parity, complete comparison, on-demand reads, and PR mapping. Skip only behind the established GitHub App environment gate and never load credentials when skipped.
- Assert that irrelevant comparison does not request blob content and that repository size does not force full inventory allocation.
- Run package `test:unit`, `test:integration`, `test:e2e`, generic `test`, typecheck, lint, format, build, public API, platform affected regression, lockfile, canonical, link, and documentation checks.

### Acceptance criteria

- Snapshot creation materializes no complete inventory; listing/comparison progress through deterministic continuation with bounded peaks.
- Complete provider trees produce complete comparisons across both fixture visibilities; provider-incomplete states cannot approve or claim completion.
- Blob content is fetched only on explicit read or after relevance, in bounded ranges.
- The reviewed platform change is signed, pushed on `new_skill`, ready against current `main`, merged and pushed to `main`, and its workflows are proven. Fast-forward `new_skill` to the integrated commit before continuing.

### Review checkpoint

Inspect provider completeness, ordering, cursor binding, request amplification, range behavior, path validation, caches/spool, cancellation/retries, public/private parity, no-irrelevant-blob evidence, and false-success prevention.

## Milestone 4: PR Assurance kernel and worker composition

### Objective

Create the private bounded/resumable PR Assurance analysis kernel and real worker composition without inventing the still-absent customer workflow, persistence, billing, or provider publication surface.

### Dependencies

- Milestone 3 integrated and verified on platform `main` and synchronized `new_skill`.

### Scope and implementation

1. Create `../platform/packages/api/pr-assurance/**` with focused contracts, strict schemas, resource profiles/ledger, checkpoint validation, base/candidate scope union, deterministic evidence and diff partitioning, redaction boundary, orchestration, semantic evaluator interface, and thin exports.
2. Open immutable base/candidate snapshots, compare lazily, parse both manifests, union old and new ownership, finish irrelevant changes before content reads, validate structurally, fetch only relevant ranges, redact before semantic work, and checkpoint stable units.
3. Implement the closed outcomes `irrelevant`, `readyForSemanticAnalysis`, `completed`, `structuralFailure`, `continuationRequired`, `analysisUnavailableResourceLimit`, and `operationalFailure`. Only `completed` can become success.
4. Bind checkpoints to repository, base/candidate SHAs, contract version, selection, partition identities, and resource ledger. Resume idempotently without duplicate provider or semantic accounting.
5. Compose the kernel into `apps/api-worker-pr-assurance` through existing process/lifecycle conventions and a deterministic internal integration harness with a fake semantic evaluator.
6. Update `cloud-and-assurance.md`, `platform-architecture.md`, `packages.md`, `project.md`, direct references, root README, and `docs/database-analysis.md` to state the implemented foundation and explicit no-persistence/no-launch boundary.
7. Add no migration, queue/webhook, public route, GitHub Check, discussion, billing, notification, production model, or UI behavior.

### Tests and verification

- Unit tests for every contract, schema, ledger dimension, standard/extended/absolute profile relationship, checkpoint, scope union, redaction decision, partition, and outcome map.
- Integration tests for every outcome; base-only/candidate-only/new/deleted/moved relationships; irrelevant no-blob path; stale/tampered revisions; duplicate resume; provider/evaluator failure; partial work; and each resource dimension.
- Real NestJS worker module/lifecycle integration with application-owned wiring and fake external boundaries.
- Assert checkpoints contain no unnecessary source bodies and only `completed` can yield an approving result.
- Run affected package/app unit and integration tests, broader platform tests, typecheck, lint, format, build, public API, canonical, link, and documentation checks.

### Acceptance criteria

- The kernel never invokes the skill or CLI, never hides relevance through candidate-only scope, and never turns partial or resource-failed work into success.
- Resource state and resume are explicit, bounded, revision-bound, and idempotent.
- The worker owns a real internal composition while customer-facing infrastructure remains truthfully absent.
- The reviewed platform change is signed, published on `new_skill`, ready and merged into current `main`, workflow-verified, and synchronized back to `new_skill`.

### Review checkpoint

Inspect comparison completeness, manifest union, redaction, token/resource accounting, checkpoint security/idempotency, outcome-to-success mapping, worker lifecycle, error contracts, and excluded infrastructure.

## Milestone 5: Repository-bound skill activation and deterministic protection

### Objective

Require initialization before repository-dependent moldea behavior, make post-init relevance cheap and silent, preserve host workflow ownership, use CLI 7/schema 4, and establish deterministic regressions before any paid evaluation.

### Dependencies

- Registry-final CLI 7/Core 3 and Milestone 4 platform foundation.
- Skill `new_skill` with only planned scoped changes and current planning artifacts.

### Scope and implementation

1. Rewrite `moldea/SKILL.md`, `moldea/agents/openai.yaml`, and only the references owned by changed operations, following progressive disclosure and the skill-creator guidance.
2. Implement the activation state machine: concise informational answer before adoption; explicit initialization; silent abstention for every other uninitialized task; direct explicit/canonical activation after adoption; one cheap changed-path/manifest gate for ordinary initialized work; and bounded owner validation only after a match.
3. Make README activation hunk-aware. A README change outside the managed block abstains unless another exact relationship matches.
4. Remove moldea ownership of host planning, review, Git, commit, and publication workflows. Local tooling governs only repository-local CLI establishment and moldea-specific commands after relevance.
5. Require repository-local CLI 7.0.0/schema 4 and remove every active CLI 6/schema-3 or global-install path.
6. Add deterministic conformance fixtures/assertions for every observed activation, reference-loading, command-count, output, continuation, read-only, zero-agent, large-file, and resource regression. Update semantic case definitions and qualification ownership metadata without running models.
7. Update directly affected platform skill/activation specifications after verified skill behavior exists; do not publish unsupported website or knowledge-base claims yet.

### Tests and verification

- `npm test` plus focused activation, routing, CLI-candidate, docs, path, site-static, release-structure, formatting, and forbidden-contract checks that do not invoke models.
- Skill-creator `quick_validate.py` against `moldea/` and independent isolated forward tests for pre-init information, pre-init abstention, initialized unrelated work, `affectedBy`, direct canonical changes, README hunks, host commands, zero-agent projects, and bounded content.
- Assert irrelevant cases perform zero moldea reference loads, CLI calls, visible output, mutations, and final-report mentions.
- Compare worktree, index, refs, configuration, submodules, and Git object storage around read-only scenarios without object-writing proof commands.

### Acceptance criteria

- Uninitialized ordinary work and initialized unrelated work are silent; relevant work loads only its owning reference and bounded evidence.
- Host commands remain authoritative and do not acquire moldea Git or package-manager rituals.
- CLI 7/schema 4 and repository-bound installation are the only supported paths.
- The complete deterministic boundary passes and the skill-creator review finds no broad trigger or unnecessary instruction loading.
- Commit and push the reviewed skill work to `new_skill`; do not merge or release skill `main` before final evidence.

### Review checkpoint

Inspect trigger wording, adoption proof, cheap-gate cost, README hunk logic, progressive reference disclosure, host precedence, read-only evidence, version closure, irrelevant silence, and whether tests reproduce every original failure.

## Milestone 6: Public websites, documentation, and knowledge base

### Objective

Make all public and canonical surfaces agree on repository-bound installation, clean package versions, lazy bounded behavior, provider/resource failures, fixture-backed confidence, and the actual pre-launch state of PR Assurance.

### Dependencies

- Milestones 3 through 5 establish the behavior being documented.

### Scope and implementation

1. Update skill root/docs/site/generated content for installation, compatibility, activation, CLI/Core/readers/adapters, bounded output, resumability, semantic testing, and release status, while leaving evidence-pin details to its owning milestone.
2. Update `../platform/apps/website/**`, metadata, pricing/availability statements, previews, generated `llms.txt`, website README, fixtures, and tests for the scalable foundation without claiming customer launch.
3. Update `../knowledge-base/content/**` across installation/quick start, open-source tools, repository format, validation, readers/Core/CLI/adapters, compatibility, local tools, GitHub integration, PR Assurance lifecycle/scope/triage/findings/limitations/merge enforcement, privacy/security, billing boundaries, troubleshooting, FAQs, manifest, indexes, and links.
4. State clearly that installation must be repository-bound even though external installers cannot be technically prevented from installing globally. Publish no global installation command.
5. Explain that response/page limits protect individual outputs, not repository capacity; large work progresses through pages/checkpoints, extended runs raise cumulative work without raising dangerous peaks, and exhaustion yields an unavailable/incomplete result rather than approval.
6. Use `moldea` in human-facing prose and preserve exact technical identifiers.

### Tests and verification

- Skill docs/site/path/link/generated/release-structure/format checks without model calls.
- Platform website unit/e2e/build/API/static-metadata and `llms.txt` checks. For executable UI changes, inspect 320px through desktop, keyboard/focus/accessibility, light/dark themes, reduced motion, visual hierarchy, and React render behavior.
- Knowledge-base `npm test`, `npm run validate`, link, manifest, route, generated, and format checks.
- Cross-repository searches for global installation, old versions/contracts, body-bearing inspection, eager GitHub claims, false completeness, generic resource errors, incorrect casing, and false launch claims.

### Acceptance criteria

- Public and canonical content is mutually consistent and accurately distinguishes implemented foundation from unavailable customer workflow.
- No supported instruction recommends global installation or old contracts.
- Platform website/docs are reviewed and integrated through `new_skill` to `main`; knowledge-base changes are reviewed and pushed on `main`; skill docs are reviewed and pushed only to `new_skill` pending final release.

### Review checkpoint

Inspect installation commands, version tables, scale/resource language, privacy, provider limitations, customer availability, generated output, brand casing, links, visual behavior, and contradictions.

## Milestone 7: Resource calibration

### Objective

Measure realistic and adversarial workloads, then finalize standard, extended, and absolute limits with defensible headroom and clear errors before model-backed evaluation.

### Dependencies

- Final deterministic packages, GitHub reader, PR Assurance kernel, skill behavior, fixture corpus, and public documentation from Milestones 1 through 6.

### Scope and implementation

1. Add or finalize source-controlled resource profiles and ledgers in their owning platform/skill modules plus deterministic calibration tooling and result artifacts.
2. Exercise small, medium, 1,024-file remote, wide/deep synthetic, aggregate-truncated, unpageable, large-Unicode, mostly irrelevant, broadly relevant, binary/large-file, and diagnostic-heavy cases.
3. Record fixture shape, versions, sample counts, distributions, peak memory/disk/handles/concurrency, requests/response bytes, stdout/model-visible bytes, deterministic token estimates, latency, resumptions, and completion state.
4. Select ordinary defaults with meaningful headroom over upper ordinary observations, extended cumulative budgets with identical peak limits, and a finite absolute stop. Do not impose a low repository-size or universal command-count ceiling.
5. Synchronize every changed value and dimension-specific error across code, specifications, skill/docs/sites, knowledge base, tests, and generated artifacts.
6. If evidence requires a public package or material architecture change, stop this milestone only long enough to run the authorized revise/challenge/breakdown loop and publish a clean forward correction before recalibrating.

### Tests and verification

- Run all invalidated platform/skill/knowledge-base deterministic tests, typechecks, lint, formatting, builds, public API, docs, site, canonical, and packed-artifact checks.
- Verify every error names dimension, configured limit, observed use, completion state, and safe next action.
- Verify summaries/pages stay within encoded limits, progress is monotonic, checkpoints resume without raising peak risk, and pathological work terminates predictably.
- Repeat representative samples enough to distinguish normal variation from implementation regressions; avoid brittle wall-clock pass/fail thresholds.

### Acceptance criteria

- Every shipped limit has reproducible evidence and realistic headroom; ordinary and legitimate large cases do not fail confusingly.
- Extended work increases cumulative capacity only, and absolute limits protect memory, disk, handles, output, network, and semantic spend.
- Updated repositories receive ready reviews, signed commits, explicit pushes, required platform/knowledge-base main integration, and verified workflows; skill remains on `new_skill`.

### Review checkpoint

Inspect corpus representativeness, reproducibility, peak/cumulative separation, headroom, machine safety, token and provider cost, dimension-specific errors, and any architecture assumption invalidated by measurement.

## Milestone 8: Native local evidence pin

### Objective

Add the simple local release escape hatch that records fresh evidence normally or pins a new release to valid passing evidence from an earlier clean-envelope release, without a separate administrator system or hidden legacy carry-forward behavior.

### Dependencies

- Milestone 7 final deterministic behavior and resource contracts.
- Existing exact-current semantic/qualification evidence ownership and release-identity tooling.

### Scope and implementation

1. Define one strict stable `fixtures/release-evidence.json` envelope with `fresh` and `pinned` modes, target version/portable identity, and bounded provenance. The target tag supplies the target commit identity, avoiding self-reference.
2. Add `release:evidence:record` to write a fresh envelope only after current semantic and qualification verification succeeds.
3. Add `release:evidence:pin -- --from v<version> --reason "..."` and `--clear`. Resolve exact source tags, require the stable envelope introduced by 5.0.0, validate referenced artifacts/digests/passing resource state, flatten pinned sources to original fresh evidence, and write only compact provenance.
4. Make `release:check` read-only and mode-aware before any model-evidence verifier runs. Fresh mode requires exact-current evidence; pinned mode intentionally bypasses current skill/suite/CLI/target identity and freshness equality while preserving source integrity and passing-state checks.
5. Remove unconditional current-only verifier execution from the root release script. Authority remains the signed target release and its publication credentials; add no local administrator role, remote approval service, age limit, or same-major restriction.
6. Keep the current release envelope absent and release-not-ready until Milestone 9 records fresh evidence or an explicit developer instruction selects a pin. Add no placeholder or pending evidence mode.
7. Update skill release/semantic/qualification documentation, website loaders/pages, generated fixtures, CI tag checkout behavior, and directly affected knowledge-base release guidance.

### Tests and verification

- Unit/integration tests in temporary Git repositories for deterministic fresh recording, read-only checking, direct pin, pinned-source flattening, previous-major/old clean-envelope sources, pre-envelope rejection, missing/corrupt/failed/over-budget evidence, tag/digest tampering, self-reference, absent reason, explicit clear, and changed-current-identity bypass.
- Assert pinned checking invokes no current-only semantic or qualification verifier and no model call.
- Assert fresh checking still rejects stale or mismatched current evidence and a hand-edited envelope.
- Run `npm test`, release-identity, release-script, docs, website, path, format, fixture, and CI static checks; do not run expensive evaluations.

### Acceptance criteria

- A maintainer can direct Codex to pin a release with one local command and reason; the result is deterministic, compact, transparent, and flexible.
- The pin bypasses only current-evidence freshness/identity equality, never source existence, stable-envelope integrity, passing state, target release signing, or publication credentials.
- Public evidence pages identify pinned evidence and its reason without calling it fresh.
- The reviewed implementation is signed and pushed to skill `new_skill`; skill `main` remains unreleased until Milestone 9.

### Review checkpoint

Inspect simplicity, mode selection order, read-only verification, source-tag handling, self-reference avoidance, provenance size, clean-envelope boundary, bypass scope, lack of hidden compatibility, website truth, and tests proving no model work occurs for a pin.

## Milestone 9: Semantic qualification, clean release, and final audit

### Objective

Run the expensive evidence exactly once against the finalized system, select valid release evidence, remove remaining obsolete release surfaces, publish clean skill 5.0.0, and prove cross-repository launch-foundation consistency.

### Dependencies

- Milestones 1 through 8 complete and published at their required boundaries.
- Authenticated model evaluation/qualification hosts, skill main/release publication, and hosted release deletion capabilities where required.

### Scope and implementation

1. Run semantic preflight and record its call/token maximum before model use. Execute universal Custom behavior once and every adapter-specific qualification profile once.
2. Fix genuine product defects and rerun only evidence invalidated by those fixes. Preserve failed attempts and do not weaken assertions or budgets to obtain a pass.
3. Record the final fresh `fixtures/release-evidence.json` after exact-current semantic and qualification evidence passes. Use a pinned envelope only if the developer explicitly names a qualifying prior release; 5.0.0 otherwise establishes the first clean fresh envelope.
4. Remove any remaining active 4.0.x compatibility, hidden carry-forward, old loader/fixture/script/CI, schema-3, global-install, or unsupported-version paths. Keep the new evidence envelope/pin implementation independent of removed machinery.
5. Run release identity/checks, website evidence rendering, full skill verification, and directly invalidated platform/packages/knowledge-base checks.
6. Review and push final skill `new_skill`, refresh and review against current `main`, integrate with signed metadata, push `main`, monitor release/site workflows, create/verify immutable `v5.0.0`, and verify installed skill/package closure.
7. Record exact obsolete `v4.0.0`, `v4.0.1`, and `v4.0.2` refs, delete their local/remote tags and matching hosted Releases/assets when authenticated capability exists, and verify absence without rewriting shared branches.
8. Perform the final active-tree audit across every repository and fixture contract for all original 28 problems and all 29 plan acceptance criteria. Publish any necessary cohesive correction through its owning review workflow before declaring completion.

### Tests and verification

- Full semantic evaluation/verification with commands, stdout bytes, model-visible bytes, input/cached/reasoning/output tokens when reported, duration, and per-scenario budgets.
- Qualification tests, typecheck, lint, format, dry-run/preflight, universal Custom run, every adapter-specific run, coverage ownership, result verification, and release identity.
- Full skill tests/docs/site/path/release checks and skill-creator validation; all invalidated platform/package/knowledge-base tests and cross-repository contradiction searches.
- Exact commit, signature, tag, branch, workflow, registry, hosted release, website, and installed-artifact verification.

### Acceptance criteria

- Semantic and adapter behavior passes calibrated independent resource budgets without duplicated universal work.
- Skill 5.0.0 contains only CLI 7/Core 3/new adapter closure, one clean runtime contract, and a valid fresh or explicitly pinned evidence envelope.
- Skill `main`, tag, website, and installed artifact are verified; obsolete 4.0.x tags/releases are absent when authenticated cleanup is available.
- Every plan acceptance criterion and original failure regression is proven across active code, tests, specifications, sites, knowledge base, fixtures, and published artifacts.
- The active goal is complete only when no required repository, workflow, registry, site, evidence, or hosted-release work remains; unavailable external capability is reported precisely rather than represented as success.

### Review checkpoint

Inspect model cost and quality, universal/adapter ownership, release evidence mode and provenance, active-tree legacy removal, version/lockfile closure, signed main integration, immutable tag/artifacts, old-release cleanup, public truth, and the complete original-problem regression ledger.

## Execution scope

Preserve completed Milestone 1 and execute Milestones 2 through 9 sequentially: publish identical public/private GitHub scenario objects and closed fixture PRs; replace the platform GitHub reader with lazy bounded snapshots, ranges, and comparison; build the resumable PR Assurance kernel and worker composition; rewrite the repository-bound skill activation contract with deterministic regressions; synchronize websites and knowledge base; calibrate realistic resource profiles; add the native local fresh/pinned evidence envelope and one-command pin escape hatch; then run expensive semantic/adapter evidence, release clean skill 5.0.0, remove authorized obsolete 4.0.x release surfaces, and prove the final cross-repository state. Every incomplete milestone includes its production behavior, tests, direct documentation, review/correction loop, signed publication, required main integration, and workflow verification without modifying protected instructions, bundling unrelated work, adding compatibility paths, or allowing partial work to appear complete.
