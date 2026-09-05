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
2. Recognize only direct moldea work, canonical paths, managed README hunks, and declared relationships; preserve host workflow ownership and load only relevant references and bounded canonical evidence.
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

1. Update packages, platform, skill, knowledge base, websites, generated content, indexes, and links for the actual architecture and availability.
2. Document repository-bound installation and its enforcement limitation, use `moldea` in human prose, and preserve required technical identifiers.

### Tests and verification

- Documentation schemas, links, generated output, site tests/builds, formatting, lowercase-brand, version/contract, availability, and contradiction checks.

### Acceptance criteria

- Public instructions contain no supported global-install path or stale version and do not claim the dormant PR Assurance foundation is customer-available.

### Review checkpoint

Inspect installation, versions, resource language, privacy, limitations, launch claims, generated output, naming, links, accessibility, responsiveness, and themes.

## Milestone 7: Deterministic resource calibration (completed)

### Objective

Calibrate repository, CLI, provider, memory, disk, handle, output, and latency behavior from deterministic representative corpora without treating those measurements as complete Codex-stage evidence.

### Dependencies

- Milestones 1 through 6.

### Scope and implementation

1. Measure fixture shapes, distributions, memory/disk/handle/concurrency peaks, provider requests/bytes, CLI/model-visible output estimates, latency, resumptions, and completion.
2. Set bounded repository and transport profiles with headroom, synchronize code/tests/specifications/docs, and keep large-codebase support resumable rather than size-capped.

### Tests and verification

- Calibration reruns, pathological and boundary cases, dimension-specific failures, generated records, and affected documentation checks.

### Acceptance criteria

- Representative repositories finish reliably; every exhausted dimension produces explicit non-success rather than machine failure or false completion.

### Review checkpoint

Inspect realism, reproducibility, headroom, peak/cumulative separation, resume behavior, output accounting, and the explicit separation from model-stage calibration.

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

Provide the closed repository-local launcher, contextual privacy-safe command-policy evidence, protocol-8-only qualification, and scenario-owned operating profiles before another paid run.

### Dependencies

- Milestone 10.

### Scope and implementation

1. Add the shared package resolver and launcher, remove bare/package-manager/provenance-probe loops, and make the relevance gate reuse its trust primitives.
2. Classify actual access operations rather than search vocabulary and publish only bounded reason codes/counts.
3. Replace protocol 7 with protocol 8 across qualification contracts, checkpoints, cache, results, website, release identity, fixtures, and tests.
4. Assign every scenario an operating profile and enforce commands, moldea output, aggregate model-visible output, and total model tokens independently.

### Tests and verification

- Launcher, command-policy, protocol, cache/checkpoint, result/storage, profile-boundary, qualification, website, skill, docs, path, release, candidate, format, typecheck, lint, and build checks.

### Acceptance criteria

- The launcher is the only normal CLI path, inert searches do not become observed sensitive access, protocol 8 is the only active contract, and deterministic checks pass without a paid call.

### Review checkpoint

Inspect launcher trust/portability, resolver deduplication, policy classification/privacy, protocol closure, profile enforcement, and absence of model execution.

## Milestone 12: Semantic launcher accounting correction (completed)

### Objective

Align semantic actor projection with the published launcher-only command contract so supported moldea work cannot be reported as zero work.

### Dependencies

- Milestone 11.

### Scope and implementation

1. Parse the exact installed launcher command and its operation-specific arguments, including piped `scope --paths-stdin` forms.
2. Count every syntactically valid launcher attempt and project named operations only from matching bounded CLI 7/schema-4 envelopes.
3. Reject direct CLI binaries and obsolete or malformed forms without retaining raw commands or output bodies.

### Tests and verification

- Focused actor/evaluation-host unit and integration tests plus complete skill, qualification, docs, resource, path, release-identity, candidate, formatting, and diff checks.

### Acceptance criteria

- Initialization records one launcher-backed `validate`; malformed launcher output remains counted `unrecognized`; direct CLI remains unsupported.

### Review checkpoint

Inspect parser strictness, pipelines, envelope identity, one-command accounting, privacy, rejected forms, and source-identity invalidation.

## Milestone 13: Model-stage resource calibration and bounded ordinary output

### Objective

Prevent a single ordinary command from flooding model context and calibrate qualification stages from real model-stage evidence instead of synthetic CLI estimates.

### Dependencies

- Milestone 12 complete and published at `b6771da60c4be18be86f1108f91151ddcd111630`.
- Preserve passing semantic attempt `20260905T205846870Z-semantic-34cce0aa` and failed Custom attempt `20260905T205956422Z-custom-custom-62bd2013` byte-for-byte while their active validity is determined by exact input identity.

### Scope and implementation

1. Rename absolute `maxOtherCommandOutputBytes` to `maxCommandTextBytes` across `tooling/resource-calibration/profiles.mjs`, its declaration/tests, generated calibration evidence, and host consumers, leaving no alias or dual contract.
2. Add `maxCommandOutputBytes: 65_536` to both operating profiles and derive `maximumCommandOutputByteCount` from completed Codex command events in `tooling/codex-evaluation-host/execution-evidence.mjs` and `index.d.mts` without retaining command text or output content.
3. Carry the new aggregate through `QualificationCommandPolicyEvidenceSchema`, model-stage evidence, fake host, cache, checkpoints/fingerprints, result recording/reading/sanitization, public artifacts, prompts, qualification tests, and website qualification types/validation/rendering. Enforce exact-boundary acceptance and one-byte-over failure before semantic judging.
4. Update `moldea/SKILL.md` and only its owning resource/context reference when necessary so every recursive search/listing excludes dependency trees, VCS internals, generated output, caches, and package stores; ordinary discovery uses exact paths and bounded output and does not dump complete lockfiles or dependency inventories when package metadata and the trusted launcher suffice.
5. Update deterministic conformance assertions, `README.md`, `qualification/README.md`, `docs/adapter-qualification.md`, `docs/semantic-evaluation.md`, `docs/compatibility-and-local-tooling.md`, and website evidence documentation so CLI/repository calibration and complete model-stage calibration have distinct authorities and every limit has an unambiguous name.
6. Keep ordinary command/token values and the absolute 2,097,152-token, 16 MiB host-output containment ceilings unchanged for this deterministic correction. If the next otherwise accepted output-bounded Custom trial exceeds only commands or tokens, return through the authorized plan/challenge loop and derive only that dimension with at least 25 percent headroom.

### Tests and verification

- Focused resource-profile and execution-evidence unit tests for the renamed raw-command-text limit, maximum command-output derivation, 65,536-byte acceptance, 65,537-byte failure, multiple-command maximum selection, aggregate independence, and privacy.
- Qualification contract, validation, cache, fingerprint, checkpoint, result, storage, sanitizer, prompt, fake-host, website loader/validation/rendering, and protocol-8 artifact tests.
- Conformance tests proving bounded/excluded ordinary discovery plus root and qualification unit/integration suites, typecheck, lint, formatting, docs, path, resource, release-identity, candidate-package, website tests/build, skill-creator validation, and diff checks.
- No model-backed semantic or qualification command in this milestone.

### Acceptance criteria

- Raw command text and completed-command output have separate accurately named limits with no legacy alias.
- Both operating profiles reject one command above 65,536 model-visible bytes even when aggregate and moldea totals remain below their limits.
- Public evidence retains only the maximum byte count, never raw command/output content, and all current loaders reject a missing or malformed protocol-8 aggregate.
- Ordinary skill guidance prevents the dependency/generated-tree discovery pattern that produced the 334,330-byte and 473,692-byte diagnostic dumps.
- All deterministic checks pass and the correction is reviewed and published before another paid run.

### Review checkpoint

Inspect naming clarity, peak versus aggregate enforcement, privacy, schema/identity propagation, output-flood prevention, skill economy, unchanged absolute containment, exact tests, documentation truth, and absence of model calls.

## Milestone 14: Fresh semantic and adapter qualification evidence

### Objective

Generate complete fresh model evidence once against the final bounded skill, protocol-8 qualification identity, and registry-published package closure.

### Dependencies

- Milestone 13 complete, reviewed, and published.
- Authenticated model evaluation and qualification hosts.

### Scope and implementation

1. Determine exact semantic invalidation from the Milestone 13 input digest. Preserve still-valid evidence or rerun semantic preflight and the complete suite only when its behavior identity changed; verify all immutable attempts.
2. Run universal Custom qualification once. Use its initial and naturally required confirmations as the only new model-stage calibration evidence; run no calibration-only paid trial.
3. Require silent abstention, unchanged named relationship activation, dirty-project preservation, launcher accounting, policy reason evidence, 65,536-byte command-output peaks, aggregate limits, and ordinary command/token budgets to pass before adapter work.
4. If a semantically and deterministically accepted, output-bounded trial exceeds only its command or token profile, revise that dimension through the authorized plan/challenge loop with at least 25 percent headroom and rerun only invalidated evidence.
5. Run each of the thirteen adapter-specific profiles once after Custom passes, with universal cases absent and ownership coverage exact.
6. Preserve failed/incomplete attempts as immutable diagnostics. After exact-current semantic and qualification verification passes, record the deterministic fresh release-evidence envelope unless an explicit qualifying pin is selected.

### Tests and verification

- Semantic preflight/evaluation/verification when invalidated, including activation, command/output/token/duration budgets, confirmation state, and immutable attempt integrity.
- Qualification preflight, Custom, thirteen adapter profiles, protocol-8 artifact validation, per-command and aggregate resource accounting, ownership coverage, source identity, package closure, privacy-safe reasons, website loading, and release-evidence recording.

### Acceptance criteria

- All semantic and Custom universal cases pass within calibrated profiles without oversized command output or unnecessary moldea work.
- All thirteen adapters pass only their adapter-specific contracts and no calibration-only paid call occurs.
- Fresh evidence is complete, immutable, protocol 8, exact-current, resource-valid, and bound to committed skill inputs and registry packages.

### Review checkpoint

Inspect cost, clean/recovered outcomes, maximum and aggregate output, command/token headroom, launcher use, policy reasons, universal/adapter ownership, exact input identity, reruns, and fresh provenance.

## Milestone 15: Clean skill release and final cross-repository audit

### Objective

Publish skill 5.0.0, remove authorized obsolete 4.0.x release surfaces, and prove the redesign and public state are coherent.

### Dependencies

- Milestone 14 passing fresh evidence or an explicitly selected valid pin.
- Authenticated skill main/release/site publication and hosted release-deletion capabilities where required.

### Scope and implementation

1. Remove remaining active 4.0.x, protocol-7, carry-forward, schema-3, global-install, old fixture/loader/script/CI, and unsupported-version paths while keeping the new evidence pin independent and historical diagnostics inactive.
2. Run release identity, evidence, website rendering, complete skill verification, and every package/platform/knowledge-base check invalidated by final evidence.
3. Review and push final `new_skill`; refresh and review current `main`; integrate with signed metadata; push `main`; monitor release/site workflows; create and verify `v5.0.0`; and verify the installed skill/package closure.
4. Record and delete exact local/remote `v4.0.0`, `v4.0.1`, and `v4.0.2` tags and hosted releases/assets where authenticated capability exists, without rewriting shared branches.
5. Audit every active repository and fixture contract against all 39 observed problems and the complete acceptance criteria. Publish any cohesive correction through its owning review workflow before completion.

### Tests and verification

- Full skill tests, docs, site, path, release, evidence, skill-creator, invalidated cross-repository checks, and searches for removed contracts, old versions, global installs, body output, eager reads, false success, generic errors, exact pins, protocol 7, casing, and launch overclaims.
- Exact branch tips, signatures, merge parents/trees, tags, releases, workflows, registry closure, website output, and installed-artifact verification.

### Acceptance criteria

- Skill 5.0.0 contains one clean CLI 7/schema 4 and qualification protocol-8 contract, compatible patch/minor support, only new package generations, and valid fresh or explicitly pinned evidence.
- Skill `main`, tag, website, installed artifact, and authorized old-release cleanup are verified; all observed failures and plan criteria are proven across active repositories.
- The goal completes only when no required repository, workflow, registry, site, evidence, or hosted-release work remains; unavailable external capability is reported precisely.

### Review checkpoint

Inspect release identity, portable/exact CLI boundaries, evidence provenance, active legacy removal, signed main integration, immutable artifacts, old-release cleanup, public truth, and the complete regression ledger.

## Execution scope

Milestones 1 through 12 remain complete and published. Implement Milestone 13 as the next isolated deterministic correction: separate raw command-text and command-output limits, enforce a 65,536-byte per-command model-visible peak, propagate its privacy-safe aggregate across protocol-8 qualification and website contracts, prevent recursive dependency/generated-tree inspection in ordinary skill work, and synchronize tests and documentation without running a model. Review and publish that milestone before Milestone 14 generates only invalidated semantic evidence, one Custom universal qualification, and thirteen adapter-specific qualifications. If an otherwise accepted bounded trial proves a command/token operating limit too low, revise only that dimension through the authorized plan/challenge loop with evidence-derived headroom. Milestone 15 then completes release identity, clean 5.0.0 integration/publication, authorized 4.0.x release-surface cleanup, and the final cross-repository audit. Preserve unrelated work, protected instructions, immutable attempts, clean-slate contracts, explicit non-success states, and repository-bound `moldea` naming throughout.
