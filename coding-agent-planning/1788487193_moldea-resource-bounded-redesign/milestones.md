# Milestones: Scalable clean-slate moldea activation and PR Assurance foundation

## Milestone 1: Clean public package generation (completed)

### Objective

Establish the breaking Repository 2, repository-fs 2, Core 3, CLI 7/schema 4, and official adapter 2/3 generation without compatibility paths.

### Dependencies

- None.

### Scope and implementation

1. Replace whole-file and eager recursive reader contracts with immutable snapshots, pages, ranges, comparisons, cancellation, continuation, completeness, and typed resource failures.
2. Make Core metadata operations content-free and isolate bounded canonical content and adapter composition operations.
3. Publish the schema-4-only CLI with bounded UTF-8 output and explicit content paging.
4. Move every official adapter to the new Core/Repository contracts, remove superseded package paths, and synchronize package tests, artifacts, compatibility data, docs, and platform specifications.

### Tests and verification

- Package unit, integration, e2e, public API, typecheck, lint, format, build, documentation, compatibility, packed-candidate, release-plan, registry, and platform canonical-document checks.

### Acceptance criteria

- The breaking package generation is published and registry-verified without an active old-contract bridge.
- Reader, Core, CLI, and adapter behavior is bounded and cannot map incomplete work to success.

### Review checkpoint

Inspect package boundaries, complete traversal, content allocation, output limits, schema closure, adapter composition, public artifacts, and removal of superseded contracts.

## Milestone 2: Paired public and private GitHub fixtures (completed)

### Objective

Provide identical immutable public/private scenario repositories for realistic large-repository, initialization, binding, and PR Assurance tests.

### Dependencies

- Milestone 1.

### Scope and implementation

1. Add deterministic uninitialized, initialized-unbound, relevant, irrelevant, deleted-binding, and bounded large-tree branches with realistic TypeScript behavior and repository-owned fixture metadata.
2. Publish identical commit objects and branch tips to public and private fixtures.
3. Create matching closed, unmerged pull requests where host capability permits, and record repository-specific PR identities outside the shared fixture tree.

### Tests and verification

- Commit/tree/blob/mode parity, deterministic manifest generation, branch immutability, size envelopes, secret inspection, and hosted PR-state checks.

### Acceptance criteria

- Public and private fixtures expose the same scenario objects and bounded large-repository corpus.
- Fixture scale is useful for live integration without becoming a permanent disk, API, or CI hazard.

### Review checkpoint

Inspect parity, immutability, realism, scenario coverage, credential safety, remote request cost, and the separation between live fixtures and synthetic provider-limit tests.

## Milestone 3: Lazy GitHub repository reader (completed)

### Objective

Replace eager GitHub inventory with lazy immutable snapshots, deterministic pages and ranges, complete tree-pair comparison, bounded caches, and typed provider/resource outcomes.

### Dependencies

- Milestones 1 and 2.

### Scope and implementation

1. Resolve paths through tree segments, synthesize directories deterministically, range-read blobs only on demand, and compare trees by pruning equal SHAs and descending only changed subtrees.
2. Bind cursors to immutable source state and request parameters; enforce cancellation, bounded concurrency, bounded caches, retry policy, authorization handling, and explicit incomplete-provider failures.
3. Add live public/private fixture parity coverage and deterministic synthetic provider-limit coverage; synchronize the platform package specification and documentation.

### Tests and verification

- Provider-session unit/integration/e2e tests for ordering, paging, ranges, comparisons, truncation, rate limits, retries, authorization loss, caches, cancellation, path validation, large blobs, and no-irrelevant-content reads; platform package checks and documentation validation.

### Acceptance criteria

- Large repositories are traversed with bounded peaks and deterministic continuation.
- An unpageable provider truncation is non-success, and blob content is fetched only after explicit read or established relevance.

### Review checkpoint

Inspect completeness, request amplification, cursor binding, cache accounting, cancellation, typed failures, public/private parity, and proof that irrelevant blobs remain unread.

## Milestone 4: Resumable PR Assurance kernel (completed)

### Objective

Build and compose a reusable, resource-ledgered PR Assurance analysis foundation without claiming or inventing the future customer workflow.

### Dependencies

- Milestone 3.

### Scope and implementation

1. Add immutable base/candidate snapshot orchestration, dual-manifest scope union, deterministic validation, bounded relevant-content partitions, redaction before semantic work, typed outcomes, and resumable checkpoints.
2. Bind checkpoints to repository, comparison SHAs, contract version, selection, partition identities, and resource ledger; make retries idempotent without duplicate provider or semantic accounting.
3. Compose the kernel into the PR Assurance worker through an internal callable boundary and fake-evaluator integration, without adding database, billing, webhook, check, public API, or launch behavior.
4. Synchronize canonical and public foundation status.

### Tests and verification

- Unit/integration tests for scope union, manifest deletion/relocation, paging, ranges, redaction, limits, cancellation, resume/drift, idempotency, partial failure, outcome mapping, worker composition, and false-success prevention; affected platform tests, types, lint, format, build, and docs.

### Acceptance criteria

- Only `completed` maps to success; resource, provider, cancellation, validation, and stale-state outcomes remain explicit.
- The composed foundation is dormant until later authorized customer-facing infrastructure exists.

### Review checkpoint

Inspect base/candidate scope, lazy evidence reads, privacy boundary, checkpoint identity, duplicate accounting, completeness mapping, and public availability claims.

## Milestone 5: Repository-bound skill activation and bounded use (completed)

### Objective

Make initialization, adoption, path relevance, host-workflow ownership, progressive disclosure, bounded CLI use, silent abstention, and read-only safety permanent skill behavior.

### Dependencies

- Milestones 1 and 4.

### Scope and implementation

1. Replace broad implicit activation with an initialization state machine and a deterministic pre-activation gate whose visible result is only `0` or `1` plus a newline.
2. Require repository-local adoption, recognize only direct moldea work, canonical paths, managed README hunks, and exact binding or `affectedBy` matches, and perform zero further moldea work on a miss.
3. Preserve host plan, review, implementation, Git, commit, and publication ownership; load only the owning reference after relevance; use bounded content-free CLI operations and selected content ranges.
4. Prove evaluation/validation leaves worktree files, index, refs, configuration, submodules, temporary repository state, and Git object storage unchanged.

### Tests and verification

- Deterministic conformance and semantic cases for all original over-activation, command-capture, large-output, empty-project, managed-hunk, relationship, progressive-disclosure, reporting, and read-only mutation failures; skill tests, path checks, docs, and site checks.

### Acceptance criteria

- Uninitialized and irrelevant work performs zero moldea commands, reads, output, mutations, and reporting mentions.
- Relevant work loads only bounded owners and never emits complete canonical bodies through metadata commands.

### Review checkpoint

Inspect trigger language, adoption proof, gate cost, hunk logic, relationship completeness, host precedence, command limits, output budgets, mutation evidence, and regression fidelity to the observed failures.

## Milestone 6: Public documentation and knowledge-base synchronization (completed)

### Objective

Make every public and canonical surface agree on repository-bound installation, clean package generations, bounded behavior, PR Assurance status, resource failures, and product naming.

### Dependencies

- Milestones 1 through 5.

### Scope and implementation

1. Update packages, platform, skill, and knowledge-base documentation, websites, generated content, indexes, and links for the implemented architecture and actual availability.
2. Document that installation must be repository-bound even though an external installer cannot be technically prevented from choosing a global location.
3. Use `moldea` in human-facing prose while preserving exact technical identifiers.

### Tests and verification

- Documentation schemas, links, generated-output checks, site tests/builds, formatting, lowercase-brand searches, version/contract searches, and availability/contradiction audits.

### Acceptance criteria

- Public instructions contain no supported global-install path or stale old-version behavior.
- No site or knowledge-base page claims that the dormant PR Assurance foundation is customer-available.

### Review checkpoint

Inspect installation, versions, scale/resource language, privacy, limitations, launch claims, generated output, naming, links, accessibility, responsiveness, and theme behavior.

## Milestone 7: Realistic resource calibration (completed)

### Objective

Calibrate standard, extended, and absolute resource profiles from deterministic representative corpora while protecting users from token, memory, disk, output, request, handle, concurrency, and latency failures.

### Dependencies

- Milestones 1 through 6.

### Scope and implementation

1. Measure fixture shape, samples, distributions, peak memory/disk/handles/concurrency, provider requests/bytes, CLI stdout, model-visible bytes, token estimates, latency, resumptions, and completion state.
2. Set realistic cumulative budgets with operational headroom and invariant peak ceilings; keep large-codebase support based on bounded peaks and resumability rather than low repository-size caps.
3. Synchronize code, tests, specifications, docs, and public explanations with measured limits.

### Tests and verification

- Deterministic calibration reruns, pathological cases, profile-boundary tests, dimension-specific failure tests, generated records, docs, platform, skill, and knowledge-base checks.

### Acceptance criteria

- Limits are high enough for representative repositories and low enough to prevent machine or model-resource exhaustion.
- Every exhausted dimension reports a clear non-success and continuation or next action where possible.

### Review checkpoint

Inspect corpus realism, reproducibility, percentiles/headroom, peak versus cumulative limits, resume behavior, output/token separation, failure specificity, and public claims.

## Milestone 8: Native fresh/pinned release evidence (completed)

### Objective

Add one simple, transparent local escape hatch that can bind a new skill release to valid passing evidence from an immutable earlier clean-envelope release.

### Dependencies

- Milestones 5 through 7.

### Scope and implementation

1. Add one strict stable fresh/pinned evidence envelope, explicit fresh recording, `release:evidence:pin -- --from v<version> --reason "..."`, and pin clearing.
2. Resolve source tags, validate source envelope/artifacts/digests/passing state, flatten chains to the original fresh evidence, and store only compact provenance.
3. Make release checking mode-aware and read-only. A pin bypasses only current evidence identity/freshness matching, never source integrity, passing status, signing, credentials, or publication controls.
4. Disclose pinned provenance accurately on the website and in release output.

### Tests and verification

- Unit/integration tests for fresh record, pin, clear, tag resolution, chain flattening, corruption, pre-envelope sources, failed/incomplete sources, target identity, bypass limits, no-model-work pin behavior, release checks, and website rendering.

### Acceptance criteria

- One local command and reason creates a deterministic, compact, transparent pin without an administrator workflow or hidden compatibility machinery.
- Fresh evidence remains the default and pinned evidence is never presented as freshly run.

### Review checkpoint

Inspect simplicity, provenance, source validation, self-reference avoidance, bypass scope, envelope size, website truth, and separation from removed carry-forward code.

## Milestone 9: Flexible compatibility and forward package patches (completed)

### Objective

Fix the packages PR version failure and remove avoidable provider, first-party package, toolchain, supply-chain-policy, and skill release cascades before any further paid evaluation.

### Dependencies

- Milestones 1 through 8.

### Scope and implementation

1. Publish repository-fs 2.0.1, Core 3.0.1, Anthropic/OpenAI adapters 3.0.1, every 2.x official adapter 2.0.1, and CLI 7.0.1 while leaving unchanged Repository at 2.0.0.
2. Replace exact first-party package pins with compatible-major ranges while preserving exact resolved lockfile and evidence closure; prove patch/minor acceptance and breaking-major rejection.
3. Replace every upper-bounded provider-library target with its inclusive minimum only while keeping exact tested reference versions and verification dates auditable.
4. Make portable skill metadata accept compatible CLI 7 releases and schema 4 while keeping the exact qualified CLI identity in development and release evidence.
5. Remove the website and qualification npm future-major ceiling, replace exact first-party release-age exclusions with package-name exclusions, retain external supply-chain quarantine, and synchronize packages, platform specifications, skill docs/site, generated compatibility artifacts, and knowledge-base content.
6. Review, sign, publish, merge, monitor, and registry-verify the complete forward package generation before publishing downstream synchronization.

### Tests and verification

- Package compatibility, discovery, composition, manifest, packed-candidate, release-plan, registry, lockfile, unit, integration, e2e, typecheck, lint, format, build, public API, and documentation checks.
- Skill conformance, relevance, release identity, closure, website, and qualification deterministic checks without model calls.
- Platform and knowledge-base tests, builds, documentation checks, and contradiction searches for upper bounds, exact portable patch pins, future-major engine ceilings, release-age version lists, stale versions, and conflicting policy.

### Acceptance criteria

- Every release-relevant changed public package declares and publishes a greater stable version.
- Provider targets accept their tested minimum and later stable versions; compatible first-party patch/minor releases do not force downstream publication, while breaking majors fail closed.
- Skill 5 accepts compatible CLI 7 releases; npm tooling has no artificial future-major ceiling; external quarantine remains active; all exact resolved evidence remains auditable.

### Review checkpoint

Inspect range taxonomy, over-acceptance tradeoffs, first-party major boundaries, CLI closure validation, portable versus exact identities, package version graph, registry manifests, downstream locks, and absence of unrelated changes.

## Milestone 10: Explicit task-path relationship activation

### Objective

Correct the qualification-discovered false negative so an unchanged ordinary repository path explicitly named or targeted by the developer activates its exact declared relationship without moldea-owned Git discovery.

### Dependencies

- Milestone 9 complete, published, registry-propagated, and synchronized.
- Preserve semantic attempt `20260905T160351371Z-semantic-16cb2147` and failed Custom attempt `20260905T160415122Z-custom-custom-43ffbb42` as immutable diagnostics, not release evidence.

### Scope and implementation

1. Update `moldea/SKILL.md` so the mandatory full gate receives the complete bounded host-known task-path set: every repository-logical path explicitly named or targeted in the current request plus the complete changed-path set already established by the host when applicable.
2. State explicitly that an unchanged named review target is task-path evidence and that moldea must not invoke Git solely to discover either source of gate input.
3. Synchronize directly affected skill documentation, including `docs/safety-and-privacy.md`, `docs/capabilities.md`, `docs/coding-agent-compatibility.md`, `docs/how-it-works.md`, and `docs/semantic-evaluation.md`, only where their current changed-path wording would preserve the ambiguity.
4. Add deterministic conformance coverage for an initialized zero-agent project in which an unchanged source path named by the task matches `/moldea/project.md` through `affectedBy`. Require gate activation, only that canonical owner, bounded CLI validation, and no moldea-owned Git commands. Preserve abstention cases for unrelated named paths and host commands.
5. Run focused and full deterministic skill/website checks, perform a read-only review, correct findings until ready, and publish the cohesive correction on `new_skill` before any model-backed rerun.

### Tests and verification

- Focused conformance, relevance-gate, documentation artifact, semantic-fixture, and qualification-case structural tests.
- Full skill unit and integration suites, website unit/artifact integration/docs/typecheck/lint/format/build checks, qualification deterministic unit/integration/typecheck/lint/format checks, path checks, and body-free bounded CLI smoke checks.
- Diff searches proving that “complete changed-path set” is not presented as the only task-path source and that no new Git-discovery instruction exists.

### Acceptance criteria

- The unchanged explicitly named `src/project-state.ts` scenario reaches the full gate, identifies only `/moldea/project.md`, invokes the bounded moldea CLI within the case's 1–4 call allowance, and leaves the workspace unchanged.
- A host-provided changed-path set remains accepted in full; unrelated named paths still abstain silently; moldea does not run Git merely to construct either input.
- All directly affected public and internal documentation uses the same task-path contract, and the reviewed signed correction is published before fresh evidence is regenerated.

### Review checkpoint

Inspect the exact entrypoint wording, path-set completeness, unchanged-target behavior, owner selection, CLI count, zero-Git discovery, silent misses, documentation consistency, preserved budgets, and retained failed evidence.

## Milestone 11: Fresh semantic and adapter qualification evidence

### Objective

Generate complete fresh model evidence once against the corrected portable skill digest and exact registry-published package closure.

### Dependencies

- Milestone 10 complete, reviewed, and published.
- Authenticated model evaluation and qualification hosts.

### Scope and implementation

1. Run semantic preflight and record its maximum call/token budget, then execute the complete semantic suite against the corrected skill identity.
2. Run universal Custom behavior once. Require the previously failing unchanged named `affectedBy` scenario to identify the canonical owner and use bounded CLI validation.
3. Run each of the thirteen adapter-specific qualification profiles once after Custom passes; do not repeat universal cases in adapter profiles.
4. Preserve every failed/incomplete attempt, fix genuine product defects through the authorized re-planning loop, and rerun only evidence invalidated by a correction. Never weaken budgets or assertions merely to pass.
5. After exact-current semantic and qualification verification passes, record the deterministic fresh release-evidence envelope. Use a pin only if the developer explicitly names a qualifying earlier release.

### Tests and verification

- Semantic evaluation and verification with commands, stdout bytes, model-visible bytes, token categories, duration, confirmation state, and per-scenario budgets.
- Qualification preflight, Custom, thirteen adapter profiles, ownership coverage, deterministic verification, resource state, artifact digests, exact committed-source identity, and release-evidence recording.

### Acceptance criteria

- All semantic cases pass against the corrected portable skill digest, including unchanged named relationship activation and existing abstention/resource cases.
- Universal behavior runs only in Custom; all thirteen adapter profiles pass their real adapter-specific contracts within calibrated independent budgets.
- Fresh evidence is complete, deterministic, immutable, and references only committed skill input and registry-published package closure.

### Review checkpoint

Inspect model cost and quality, recovered versus clean passes, unchanged-target regression behavior, universal/adapter ownership, immutable input identity, exact tested closure, failures/reruns, resource accounting, and fresh evidence provenance.

## Milestone 12: Clean skill release and final cross-repository audit

### Objective

Publish skill 5.0.0, remove authorized obsolete 4.0.x release surfaces, and prove the complete redesign and public state are coherent.

### Dependencies

- Milestone 11 passing fresh evidence or an explicitly selected valid pin.
- Authenticated skill main/release/site publication and hosted release deletion capabilities where required.

### Scope and implementation

1. Remove remaining active 4.0.x compatibility, carry-forward, schema-3, global-install, old fixture/loader/script/CI, and unsupported-version paths while keeping the new evidence pin independent.
2. Run release identity, release checks, website evidence rendering, full skill verification, and every package/platform/knowledge-base check invalidated by final evidence.
3. Review and push final skill `new_skill`; refresh and review against current `main`; integrate with signed metadata; push `main`; monitor release and site workflows; create and verify immutable `v5.0.0`; and verify the installed skill/package closure.
4. Record and delete exact local/remote `v4.0.0`, `v4.0.1`, and `v4.0.2` tags and matching hosted releases/assets when authenticated capability exists, without rewriting shared branches.
5. Audit every active repository and fixture contract against all recorded original problems and plan acceptance criteria. Publish any cohesive correction through its owning review workflow before completion.

### Tests and verification

- Full skill tests, docs, site, path, release, evidence, and skill-creator checks; invalidated packages/platform/knowledge-base checks; removed-contract, old-version, global-install, body-output, eager-read, false-success, generic-error, exact-pin, casing, and launch-claim searches.
- Exact branch tips, commit signatures, merge parents/trees, tags, hosted releases, workflows, npm registry closure, website output, and installed-artifact verification.

### Acceptance criteria

- Skill 5.0.0 contains one clean CLI 7/schema 4 contract with compatible patch/minor support, only the new package generations, and valid fresh or explicitly pinned evidence.
- Skill `main`, tag, website, and installed artifact are verified; authorized obsolete 4.0.x tags/releases are absent when authenticated cleanup is available.
- Every original failure and every plan acceptance criterion is proven across active code, tests, specifications, sites, knowledge base, fixtures, and published artifacts.
- The active goal completes only when no required repository, workflow, registry, site, evidence, or hosted-release work remains; unavailable external capability is reported precisely.

### Review checkpoint

Inspect release identity, portable-versus-exact CLI contracts, evidence provenance, active-tree legacy removal, signed main integration, immutable artifacts, old-release cleanup, public truth, and the complete original-problem regression ledger.

## Execution scope

Preserve completed and published Milestones 1 through 9. Execute Milestone 10 first to correct and publish the task-path relationship contract with deterministic protection for unchanged explicitly named review targets and no moldea-owned Git discovery. Only then execute Milestone 11's fresh semantic suite, universal Custom qualification, thirteen adapter-specific profiles, and fresh release-evidence recording against the corrected committed skill digest and registry-published package closure. Finish with Milestone 12's clean skill 5.0.0 release, authorized 4.0.x release-surface cleanup, and complete cross-repository audit. Every incomplete milestone includes its implementation, tests, directly affected documentation, review/correction loop, signed publication, required main integration, and workflow verification without modifying protected instructions, bundling unrelated work, retaining compatibility code, weakening resource protections, or allowing incomplete evidence to appear successful.
