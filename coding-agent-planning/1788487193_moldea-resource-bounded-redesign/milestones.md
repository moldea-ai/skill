# Milestones: Scalable clean-slate moldea activation and PR Assurance foundation

## Milestone 1: Clean public package generation (completed)

### Objective

Establish the breaking Repository 2, repository-fs 2, Core 3, CLI 7/schema 4, and official adapter 2/3 generation without compatibility paths.

### Dependencies

- None.

### Scope and implementation

1. Replace whole-file and eager recursive reader contracts with immutable snapshots, pages, ranges, comparisons, cancellation, continuation, completeness, and typed resource failures.
2. Make Core metadata operations content-free, isolate bounded canonical content and adapter composition, publish schema-4-only CLI output, and move every official adapter to the clean contracts.
3. Remove superseded paths and synchronize package tests, artifacts, compatibility data, documentation, and platform specifications.

### Tests and verification

- Package unit, integration, e2e, public API, typecheck, lint, format, build, documentation, compatibility, packed-candidate, release-plan, registry, and platform canonical-document checks.

### Acceptance criteria

- The breaking generation is published and registry-verified without an active old-contract bridge.
- Reader, Core, CLI, and adapter behavior is bounded and cannot map incomplete work to success.

### Review checkpoint

Inspect package boundaries, complete traversal, content allocation, output limits, schema closure, adapter composition, public artifacts, and superseded-contract removal.

## Milestone 2: Paired public and private GitHub fixtures (completed)

### Objective

Provide identical immutable public/private scenario repositories for realistic large-repository, initialization, binding, and PR Assurance tests.

### Dependencies

- Milestone 1.

### Scope and implementation

1. Add deterministic uninitialized, initialized-unbound, relevant, irrelevant, deleted-binding, and bounded large-tree branches with realistic TypeScript behavior and repository-owned fixture metadata.
2. Publish identical commit objects and branch tips to public and private fixtures and create matching closed, unmerged pull requests where host capability permits.

### Tests and verification

- Commit/tree/blob/mode parity, deterministic manifest generation, branch immutability, size envelopes, secret inspection, and hosted PR-state checks.

### Acceptance criteria

- Both fixtures expose the same scenario objects and bounded large-repository corpus without becoming a disk, API, or CI hazard.

### Review checkpoint

Inspect parity, immutability, realism, scenario coverage, credential safety, remote request cost, and the live/synthetic test split.

## Milestone 3: Lazy GitHub repository reader (completed)

### Objective

Replace eager GitHub inventory with lazy immutable snapshots, deterministic pages and ranges, complete tree-pair comparison, bounded caches, and typed provider/resource outcomes.

### Dependencies

- Milestones 1 and 2.

### Scope and implementation

1. Resolve paths through tree segments, range-read blobs only on demand, and compare trees by pruning equal SHAs and descending only changed subtrees.
2. Bind cursors to immutable source state and request parameters; enforce cancellation, concurrency, cache, retry, authorization, and provider-completeness boundaries.
3. Add public/private live parity and synthetic provider-limit coverage and synchronize the package specification and documentation.

### Tests and verification

- Provider-session unit/integration/e2e tests for ordering, paging, ranges, comparisons, truncation, rate limits, retries, authorization loss, caches, cancellation, paths, large blobs, and irrelevant-read avoidance; package and documentation checks.

### Acceptance criteria

- Large repositories traverse with bounded peaks and deterministic continuation; unpageable truncation is non-success and irrelevant blobs remain unread.

### Review checkpoint

Inspect completeness, request amplification, cursor binding, cache accounting, cancellation, typed failures, parity, and on-demand content proof.

## Milestone 4: Resumable PR Assurance kernel (completed)

### Objective

Build and compose a reusable resource-ledgered PR Assurance foundation without claiming the future customer workflow.

### Dependencies

- Milestone 3.

### Scope and implementation

1. Add immutable base/candidate orchestration, dual-manifest scope union, deterministic validation, bounded relevant-content partitions, redaction, typed outcomes, and resumable checkpoints.
2. Bind checkpoints to exact revisions and work identities, make retries idempotent, and compose the kernel into the worker without database, billing, webhook, check, public API, or launch behavior.
3. Synchronize canonical and public foundation status.

### Tests and verification

- Unit/integration tests for scope union, deletion/relocation, paging, ranges, redaction, limits, cancellation, resume/drift, idempotency, partial failure, outcome mapping, worker composition, false-success prevention, and affected platform checks.

### Acceptance criteria

- Only `completed` maps to success and the composed foundation remains dormant until later authorized infrastructure exists.

### Review checkpoint

Inspect base/candidate scope, lazy reads, privacy, checkpoint identity, duplicate accounting, completeness mapping, and availability claims.

## Milestone 5: Repository-bound skill activation and bounded use (completed)

### Objective

Make initialization, adoption, path relevance, host-workflow ownership, progressive disclosure, bounded CLI use, silent abstention, and read-only safety permanent skill behavior.

### Dependencies

- Milestones 1 and 4.

### Scope and implementation

1. Replace broad activation with the repository initialization state machine and two-byte deterministic gate.
2. Recognize only direct moldea work, canonical paths, managed README hunks, and declared relationships; preserve host workflow ownership and load only the relevant reference and bounded canonical evidence.
3. Prove read-only operations preserve worktree, index, refs, configuration, submodules, temporary state, and Git objects.

### Tests and verification

- Deterministic and semantic coverage for over-activation, command capture, large output, empty projects, managed hunks, relationships, progressive disclosure, reporting, and read-only mutation; skill, path, docs, and site checks.

### Acceptance criteria

- Uninitialized and irrelevant work performs zero moldea work; relevant work loads only bounded owners and metadata never emits complete bodies.

### Review checkpoint

Inspect triggers, adoption, gate cost, hunk logic, relationship completeness, host precedence, limits, mutation evidence, and original-failure fidelity.

## Milestone 6: Public documentation and knowledge-base synchronization (completed)

### Objective

Make every public and canonical surface agree on repository-bound installation, clean package generations, bounded behavior, PR Assurance status, resource failures, and product naming.

### Dependencies

- Milestones 1 through 5.

### Scope and implementation

1. Update packages, platform, skill, knowledge-base, websites, generated content, indexes, and links for actual architecture and availability.
2. Document repository-bound installation and its enforcement limitation, use `moldea` in human prose, and preserve required technical identifiers.

### Tests and verification

- Documentation schemas, links, generated output, site tests/builds, formatting, lowercase-brand, version/contract, availability, and contradiction checks.

### Acceptance criteria

- Public instructions contain no supported global-install path or stale version and do not claim the dormant PR Assurance foundation is customer-available.

### Review checkpoint

Inspect installation, versions, resource language, privacy, limitations, launch claims, generated output, naming, links, accessibility, responsiveness, and themes.

## Milestone 7: Realistic resource calibration (completed)

### Objective

Calibrate standard, extended, and absolute profiles from deterministic representative corpora while protecting token, memory, disk, output, request, handle, concurrency, and latency resources.

### Dependencies

- Milestones 1 through 6.

### Scope and implementation

1. Measure fixture shapes, distributions, memory/disk/handle/concurrency peaks, provider requests/bytes, CLI and model-visible output, token estimates, latency, resumptions, and completion.
2. Set cumulative budgets with headroom and invariant peak ceilings, synchronize code/tests/specifications/docs, and keep large-codebase support resumable rather than size-capped.

### Tests and verification

- Calibration reruns, pathological and boundary cases, dimension-specific failures, generated records, and affected documentation checks.

### Acceptance criteria

- Representative repositories finish reliably; every exhausted dimension produces an explicit non-success rather than machine failure or false completion.

### Review checkpoint

Inspect realism, reproducibility, headroom, peak/cumulative separation, resume behavior, output/token accounting, and failure specificity.

## Milestone 8: Native fresh/pinned release evidence (completed)

### Objective

Add one simple local escape hatch that binds a release to valid passing evidence from an immutable earlier clean-envelope release.

### Dependencies

- Milestones 5 through 7.

### Scope and implementation

1. Add the strict fresh/pinned envelope, explicit fresh recording, one pin command and clearing, exact source-tag validation, artifact/digest/passing checks, and original-source flattening.
2. Make checking read-only and mode-aware and disclose pinned provenance without creating administrator workflow or compatibility machinery.

### Tests and verification

- Unit/integration tests for fresh record, pin, clear, tag resolution, flattening, corruption, pre-envelope and failed sources, target identity, bypass limits, no-model pin behavior, release checks, and website rendering.

### Acceptance criteria

- One local command and reason creates compact transparent provenance; fresh remains default and pinned evidence is never represented as fresh.

### Review checkpoint

Inspect simplicity, provenance, validation, self-reference, bypass scope, envelope size, website truth, and separation from carry-forward code.

## Milestone 9: Flexible compatibility and forward package patches (completed)

### Objective

Fix the package-release version failure and remove avoidable provider, first-party, toolchain, supply-chain-policy, and skill release cascades.

### Dependencies

- Milestones 1 through 8.

### Scope and implementation

1. Publish the forward package patches while leaving unchanged Repository 2.0.0.
2. Use compatible-major first-party ranges, lower-bound-only provider targets, compatible CLI 7 skill metadata, minimum-only npm engines, and package-name first-party release-age exclusions while retaining exact lockfile and evidence identities.
3. Synchronize and publish packages, platform specifications, skill docs/site, generated compatibility artifacts, and knowledge-base content.

### Tests and verification

- Package graph, compatibility, discovery, packed candidate, release-plan, registry, lockfile, test/type/lint/format/build/API/docs, skill deterministic, platform, knowledge-base, and contradiction checks.

### Acceptance criteria

- Changed public packages have greater stable published versions; later compatible releases do not force pointless downstream publication; breaking majors still fail closed.

### Review checkpoint

Inspect range taxonomy, tested-version evidence, major boundaries, release graph, registry manifests, downstream locks, and unrelated-change exclusion.

## Milestone 10: Explicit task-path relationship activation (completed)

### Objective

Correct the qualification false negative so an unchanged explicitly named path activates its declared relationship without moldea-owned Git discovery.

### Dependencies

- Milestone 9.

### Scope and implementation

1. Define the gate input as the union of exact developer-named or targeted paths and any complete host-provided changed-path set.
2. Synchronize affected skill/public documentation and add deterministic and semantic coverage for unchanged named `affectedBy` paths, exact owners, bounded CLI use, silent unrelated paths, and no Git discovery.
3. Review and publish the signed correction before new evidence.

### Tests and verification

- Focused and complete conformance, semantic-runner, skill, qualification, website, docs, path, type, lint, format, build, skill-validator, and body-free CLI checks.

### Acceptance criteria

- The unchanged named `src/project-state.ts` case identifies only `/moldea/project.md`, stays within its CLI budget, and preserves the workspace; unrelated tasks still abstain.

### Review checkpoint

Inspect task-path completeness, unchanged-target behavior, owner selection, CLI count, zero-Git discovery, silent misses, documentation, and failed-attempt retention.

## Milestone 11: Diagnosable and resource-bounded qualification execution (completed)

### Objective

Eliminate the paid Custom qualification's ambiguous CLI invocation, opaque/context-insensitive command-policy failure, and excessive ordinary-work resource consumption before another model-backed run.

### Dependencies

- Milestone 10 complete and published at `f27e5c79488f39700e08aae14b9f5526c58f5b96`.
- Preserve semantic attempt `20260905T173526948Z-semantic-6f085d03` and failed Custom attempt `20260905T175520706Z-custom-custom-0891c867` as inactive diagnostics, not release evidence.

### Scope and implementation

1. Add `moldea/scripts/repository-package.mjs` as the shared package/version/containment owner and `moldea/scripts/moldea-cli.mjs` as the closed cross-platform launcher. Refactor `relevance-gate.mjs` to reuse the trust primitives without changing its two-byte result.
2. Update `moldea/SKILL.md`, `references/local-tooling.md`, `references/continuous-maintenance.md`, conformance fixtures, and public skill documentation to use only the launcher. Remove bare `moldea`, package-manager, `PATH`, link, realpath, parent-workspace, and ad hoc output-wrapper paths from normal execution.
3. Contextually classify command operations in `tooling/codex-evaluation-host/execution-evidence.mjs`. Preserve actual evaluator-home, auth, credential, environment, `/proc/*/environ`, network, dynamic, and obfuscated detection while ensuring inert repository-search literals are not observed sensitive access.
4. Advance qualification to protocol 8 only. Update host declarations, qualification contracts, execution/checkpoint/cache/result/storage/evidence identity, public artifacts, website loaders/rendering, release identity, fixtures, and tests with bounded sorted privacy-safe reason codes and counts. Add no protocol-7 reader or converter; keep old attempts outside active loading and release selection.
5. Assign every qualification scenario an `ordinary` or `largeTraversal` resource profile. Enforce completed host commands, moldea calls/output, model-visible output, and total model tokens independently before judging, with profile/dimension/observed/limit failures. Keep absolute ceilings as higher process containment.
6. Select ordinary operating limits from existing diagnostics plus deterministic fixtures and reserve final confirmation for the single required Custom run. Provide at least 25 percent headroom over accepted ordinary observations, use no calibration-only model call, and keep large traversal governed by a separate declared profile.
7. Synchronize `README.md`, `qualification/README.md`, `docs/adapter-qualification.md`, `docs/compatibility-and-local-tooling.md`, `docs/semantic-evaluation.md`, website evidence documentation/rendering, resource fixtures/profiles, and generated/contract artifacts. Preserve `moldea` casing and do not overstate indeterminate evidence as verified safety.

### Tests and verification

- Launcher unit/integration tests for supported invocation, package metadata/ranges, missing and escaped closure, invalid arguments, bounded output, child exits/signals/cancellation, cross-platform path semantics, and one-command accounting.
- Table-driven execution-evidence tests for inert searches and every real/indeterminate policy class, stable reason counts, privacy, resource boundaries, and absent raw commands.
- Qualification protocol/contracts/loaders/cache/checkpoint/storage/result/evidence/website/release tests, profile-coverage validation, exact boundary failures, dry-run/preflight, and proof that source-state sandbox enforcement precedes model execution.
- Full skill unit/integration, qualification unit/integration/typecheck/lint/format, website unit/integration/docs/typecheck/lint/format/build, conformance, resource, path, release-identity, candidate-package, and skill-creator checks. No paid model command belongs to this milestone.

### Acceptance criteria

- Normal direct maintenance uses the adoption gate plus the minimum necessary launcher-backed CLI operation without a bare-command or provenance-probe loop.
- Inert repository searches for security vocabulary do not become observed access; actual violations still fail, indeterminate states remain explicit, and no public evidence exposes commands, paths, patterns, output, or secrets.
- Protocol 8 is the only active qualification contract and every scenario owns a realistic operating profile below the absolute ceiling with dimension-specific failure evidence.
- All deterministic checks pass and the cohesive signed correction is reviewed and published before any paid rerun.

### Review checkpoint

Inspect launcher trust and portability, duplicate resolver removal, exact output/exit behavior, policy false negatives and false positives, sandbox dependence, privacy-safe diagnostics, protocol closure, operating-limit calibration, test adversariality, documentation truth, and absence of model calls.

## Milestone 12: Fresh semantic and adapter qualification evidence

### Objective

Generate complete fresh model evidence once against the final launcher-backed skill, protocol-8 qualification identity, and registry-published package closure.

### Dependencies

- Milestone 11 complete, reviewed, and published.
- Authenticated model evaluation and qualification hosts.

### Scope and implementation

1. Run semantic preflight, record the call/token envelope, execute the complete suite, and verify all immutable attempts against the final portable skill digest.
2. Run universal Custom qualification once. Use its initial and naturally required confirmation trials as the only new model-backed calibration evidence; if accepted observations exceed an operating profile, correct the profile only through the authorized re-planning cycle with evidence and never merely to pass.
3. Require the unchanged named relationship, dirty-project preservation, launcher command accounting, policy reason evidence, and operating budgets to pass before running any adapter-specific profile.
4. Run each of the thirteen adapter-specific profiles once, with universal cases absent and ownership coverage exact.
5. Preserve failed/incomplete attempts as inactive diagnostics, fix genuine product defects through re-planning, and rerun only evidence invalidated by a correction.
6. After exact-current semantic and qualification verification passes, record the deterministic fresh release-evidence envelope. Use a pin only if the developer explicitly names a qualifying source release.

### Tests and verification

- Semantic evaluation/verification with activation, command/output/token/duration budgets and confirmation state.
- Qualification preflight, Custom, thirteen adapter profiles, protocol-8 artifact validation, profile accounting, ownership coverage, source identity, package closure, privacy-safe reasons, website loading, and release-evidence recording.

### Acceptance criteria

- All semantic and Custom universal cases pass within calibrated profiles, including unchanged relationship activation and dirty-project maintenance without ambiguous policy failure or excessive execution.
- All thirteen adapters pass only their adapter-specific contracts and no calibration-only paid call occurs.
- Fresh evidence is complete, immutable, protocol 8, exact-current, resource-valid, and bound to committed skill input and registry packages.

### Review checkpoint

Inspect cost, quality, clean/recovered outcomes, launcher use, policy reasons, ordinary headroom, universal/adapter ownership, exact input identity, failures/reruns, and fresh provenance.

## Milestone 13: Clean skill release and final cross-repository audit

### Objective

Publish skill 5.0.0, remove authorized obsolete 4.0.x release surfaces, and prove the redesign and public state are coherent.

### Dependencies

- Milestone 12 passing fresh evidence or an explicitly selected valid pin.
- Authenticated skill main/release/site publication and hosted release deletion capabilities where required.

### Scope and implementation

1. Remove remaining active 4.0.x, protocol-7, carry-forward, schema-3, global-install, old fixture/loader/script/CI, and unsupported-version paths while keeping the new evidence pin independent and historical diagnostics inactive.
2. Run release identity, evidence, website rendering, complete skill verification, and every package/platform/knowledge-base check invalidated by final evidence.
3. Review and push final `new_skill`; refresh and review current `main`; integrate with signed metadata; push `main`; monitor release/site workflows; create and verify `v5.0.0`; and verify the installed skill/package closure.
4. Record and delete exact local/remote `v4.0.0`, `v4.0.1`, and `v4.0.2` tags and hosted releases/assets where authenticated capability exists, without rewriting shared branches.
5. Audit every active repository and fixture contract against the original problem ledger and acceptance criteria. Publish any cohesive correction through its owning review workflow before completion.

### Tests and verification

- Full skill tests, docs, site, path, release, evidence, skill-creator, invalidated cross-repository checks, and searches for removed contracts, old versions, global installs, body output, eager reads, false success, generic errors, exact pins, protocol 7, casing, and launch overclaims.
- Exact branch tips, signatures, merge parents/trees, tags, releases, workflows, registry closure, website output, and installed-artifact verification.

### Acceptance criteria

- Skill 5.0.0 contains one clean CLI 7/schema 4 and qualification protocol-8 contract, compatible patch/minor support, only new package generations, and valid fresh or explicitly pinned evidence.
- Skill `main`, tag, website, installed artifact, and authorized old-release cleanup are verified; all original failures and plan criteria are proven across active repositories.
- The goal completes only when no required repository, workflow, registry, site, evidence, or hosted-release work remains; unavailable external capability is reported precisely.

### Review checkpoint

Inspect release identity, portable/exact CLI boundaries, evidence provenance, active legacy removal, signed main integration, immutable artifacts, old-release cleanup, public truth, and the complete regression ledger.

## Execution scope

Preserve completed and published Milestones 1 through 10. Execute Milestone 11 first with no paid model calls: add the verified bundled CLI launcher, contextual protocol-8 command-policy diagnostics, scenario-owned operating budgets, deterministic adversarial coverage, directly affected documentation, read-only review/correction, and signed publication. Only after that checkpoint may Milestone 12 regenerate the semantic suite, universal Custom qualification, thirteen adapter-specific profiles, and fresh release evidence, with no calibration-only paid calls and no adapter run before Custom passes. Finish with Milestone 13's clean skill 5.0.0 release, protocol-7 and active legacy removal, authorized 4.0.x release-surface cleanup, and cross-repository audit. Every incomplete milestone includes its implementation, tests, documentation, review loop, signed publication, required main integration, and workflow verification without modifying protected instructions, bundling unrelated work, weakening protections, retaining compatibility code, or allowing incomplete evidence to appear successful.
