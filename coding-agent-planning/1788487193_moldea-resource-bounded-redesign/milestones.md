# Milestones: Resource-bounded clean-slate moldea redesign

## Sequence

Implement four dependency-ordered milestones. Each milestone owns a coherent finished state, its production code or documentation, directly affected tests and public contracts, focused and broader verification, read-only review, correction loop, signed commit, and explicit active-branch push. Do not begin a later milestone until the current milestone is ready and its Git commit has been published.

The trusted packages main-branch workflow must publish `@moldea.ai/core` 2.1.0 and `@moldea.ai/cli` 6.0.0 before Milestone 3 can finalize registry-backed dependency state. A feature-branch `repo push` does not satisfy that prerequisite and no local-tarball, schema-2, version alias, or compatibility bridge may be committed as a substitute.

## Milestone 1: Deterministic Core scope matching

### Objective

Publish the additive `@moldea.ai/core` 2.1.0 source change that determines whether repository-logical changed paths intersect declared manifest relationships without loading canonical bodies or executing runtime adapters. This becomes the single relationship-matching authority used by the CLI and skill.

### Dependencies

- The revised plan with SHA-256 `fd572ea827dfb8faac4c74ac82769479f0015595595f6702cbbdcdb26f9eee8a`.
- A clean `../packages` worktree on `new_skill` and an unambiguous configured push destination.
- Existing Core version-1 manifest, relationship-validation, repository-reference, and simple-glob contracts.

### In-scope files and contracts

- Add `../packages/projects/core/src/scope-matching/` with a thin `index.ts`, focused contract types, boundary validation, deterministic matching implementation, and co-located unit tests.
- Update `../packages/projects/core/src/contracts/index.ts`, the root `src/index.ts`, public API fixtures, and public integration tests to expose the new operation and types without wildcard exports.
- Reuse and, only where required, extend `manifest-relationship-validation`, `repository-reference-validation`, manifest parsing, and existing simple-glob ownership.
- Update `../packages/projects/core/docs/repository-inspection.md`, the Core README/package documentation, `package.json` to 2.1.0, release metadata, and `../packages/pnpm-lock.yaml`.
- Keep `ICore.inspectProject` and the rich project index intact because they remain current programmatic and runtime-adapter capabilities; do not add a schema-2 compatibility branch.

### Implementation work

1. Define strict public input and output types for normalized repository-logical paths, matched owner identity, relationship field, manifest declaration pointer, matched exact path or `affectedBy` glob, stable counts, and manifest/input digests.
2. Validate that every supplied path begins with `/` and reject empty values, duplicate separators, dot and traversal segments, NUL characters, native absolute paths, Windows drive-relative paths, UNC/device paths, and values outside existing repository path limits.
3. Parse the version-1 manifest through the existing parser. Build an exact-path lookup for bindings and reference fields and compile `affectedBy` patterns once per operation using the established simple-glob semantics.
4. Match the normalized path set with stable owner/field/pattern/path ordering and deterministic deduplication. Empty manifests and empty path sets return no matches and do not manufacture relevance.
5. Keep the matching step pure after manifest parsing. It must not read project/context/decision/agent/runtime/mirror/evidence bodies or execute adapters.
6. Add representative large path and relationship fixtures that expose repeated compilation, accidental quadratic copying, unstable ordering, or unbounded output construction without brittle wall-clock assertions.
7. Synchronize public exports, JSDoc, package documentation, version, release planning inputs, and lockfile.

### Tests and verification

- Unit coverage for every supported exact relationship field, `affectedBy` glob behavior, multiple owners, deduplication, empty inputs, stable ordering, malformed logical paths, Windows attack forms, manifest validation failures, and large representative inputs.
- Public integration coverage proving the exported Core operation uses the repository's existing manifest contract and returns content-free match metadata.
- Public API fixture coverage proving intended exports and the absence of accidental private exports.
- Run:

```bash
pnpm --filter @moldea.ai/core test:unit
pnpm --filter @moldea.ai/core test:integration
pnpm --filter @moldea.ai/core typecheck
pnpm --filter @moldea.ai/core lint
pnpm --filter @moldea.ai/core build
pnpm test:root
pnpm typecheck:root
pnpm lint:root
pnpm format:check
pnpm release:check-changes
pnpm release:plan
```

### Acceptance criteria

- One public Core implementation produces deterministic matches for all version-1 relationship forms relevant to changed paths.
- The operation is body-free, adapter-free, source-neutral after manifest parsing, and handles empty/large inputs predictably.
- Existing rich inspection and adapter behavior continue to pass their full Core regression suite.
- Core package state, documentation, exports, version 2.1.0, release plan, and lockfile agree.
- The exact uncommitted state receives `Ready to commit`, is committed with `-s -S`, and is pushed explicitly from `new_skill` without including unrelated changes.

### Review checkpoint

Review path normalization and containment semantics, relationship completeness, stable ordering/deduplication, large-input complexity, public API shape, additive-version justification, and proof that no project bodies or adapters participate. A material need to break Core or adapter contracts requires autonomous plan revision before publication.

## Milestone 2: CLI schema 3, bounded output, and packages cleanup

### Objective

Publish the complete `@moldea.ai/cli` 6.0.0 source contract: schema-3-only JSON, content-free metadata inspection, cheap relationship scope matching, explicit path-scoped content chunks, deterministic byte-bounded keyset pagination, and observational Git behavior. Remove the packages repository's temporary skill-4 compatibility bridge in the same packages release boundary.

### Dependencies

- Milestone 1 committed and pushed.
- Core 2.1.0 workspace source available to CLI builds and tests.
- Existing CLI command-line, execution, Core composition, presentation, JSON contract, Git inventory, repository-reader, and working-tree snapshot boundaries.

### In-scope files and contracts

- Add `../packages/projects/cli/src/project-scope/`, `output-page/`, and `project-content/` with focused types, constants, validations, transformations/utilities, orchestration, thin entry files, and co-located tests.
- Update `projects/cli/src/command-line/` constants, types, parser, validations, tests, and public entry.
- Update `projects/cli/src/cli-execution/` command executor, runner, result contracts, types, tests, and entry.
- Update `projects/cli/src/core-composition/`, `presentation/`, `json-output-contract/`, `working-tree-snapshot/`, `git-inventory/`, `repository-reader/`, `operational-error/`, package metadata, bin entry, fixtures, integration tests, and e2e tests.
- Update CLI README/docs/examples, `package.json` to 6.0.0, Core dependency to 2.1.0, release metadata, runtime/testing compatibility fixtures, and root lockfile.
- Remove the temporary skill 4.0.2 compatibility job from `../packages/.github/workflows/ci.yml` and its active descriptions from root `README.md` and `docs/npm-releases.md`; update directly affected release tests.
- Use lowercase `moldea` in changed human-facing messages and prose while retaining required package and TypeScript identifier casing.

### Implementation work

1. Replace schema 2 with one strict schema-3 envelope containing `schemaVersion`, `cliVersion`, `command`, `status`, `error`, and `result`. Do not retain a legacy flag, environment variable, alias, fallback serializer, or schema-2 test fixture.
2. Implement `inspect` as an explicit metadata projection. Return complete collection counts and a page of discriminated records for agents, context, decisions, relationships, requirements, mirrors, runtimes, unresolved items, diagnostics, and evidence summaries. Include logical paths, digests, UTF-8/scalar lengths, safe identifiers, and references but never canonical bodies or arbitrary adapter evidence detail.
3. Add a recursive contract guard that fails if any non-`content` JSON result contains a `content` property or a seeded canonical body string. Build the projection from allowlisted fields rather than pruning the rich Core result.
4. Add `scope --path <logical-path>` and `scope --paths-stdin`. The stdin form consumes NUL-delimited UTF-8 records with no shell interpolation. Read only `/moldea/moldea.yaml`, invoke the Milestone 1 matcher, execute no adapter, and return `relevant`, complete counts/digests, and paginated matches.
5. Add `content --path <canonical-logical-path>`. Accept exactly one canonical file, reject directories, globs, traversal, non-canonical roots, and links escaping the trusted repository boundary, then return only that asset in Unicode-safe chunks.
6. Add `--max-output-bytes` to collection/content JSON commands with inclusive range 4,096 to 1,048,576, default 65,536, and exact final UTF-8 serialization accounting. Human-readable output remains concise and below the 1 MiB hard ceiling.
7. Implement stable keyset continuation. Encode cursor version, command, normalized filters, source snapshot digest, last composite key, and checksum in opaque base64url. Reject malformed, tampered, cross-command, filter-mismatched, unsupported-version, and changed-snapshot cursors with stable documented errors.
8. Return structured `OUTPUT_BUDGET_TOO_SMALL` when an envelope cannot fit instead of malformed or silently truncated JSON. Prevent oversized evidence fields by projecting identifiers, references, digests, and lengths only.
9. Extend working-tree snapshot identity without writing Git state. Every read-only command must preserve the worktree, real index, refs/HEAD, Git config, submodule state, and Git object-database path/metadata set. Do not use temporary indexes or object-writing plumbing.
10. Keep `validate` and `composition` intent while moving them to schema 3 and the bounded serializer. Establish command-specific composition so `scope` does not load or verify adapters it cannot use.
11. Remove packages-side compatibility-bridge CI/documentation and regenerate current release/compatibility metadata only where it remains part of the packages repository's general release system.

### Tests and verification

- Parser/validation tests for new commands, mutually exclusive path input modes, NUL records, byte-limit range, content-path constraints, and cursor arguments.
- Unit tests for exact byte accounting, Unicode, empty/first/exact/final pages, deterministic record keys, continuation, tampering, filter changes, snapshot changes, too-small budgets, and large record sets.
- Integration tests for Core scope composition, manifest-only reads, explicit canonical content reads, adapter-free `scope`, metadata-only `inspect`, and read-only repository behavior.
- E2E tests for every command in human and JSON form, a zero-agent/zero-relationship adopted repository, the observed many-large-context shape, multi-page traversal without gaps/duplicates, stdout byte ceilings, clear errors, POSIX paths, and Windows attack paths.
- Compare all relevant Git state before and after each read-only command, including the object database.
- Run:

```bash
pnpm --filter @moldea.ai/cli test:unit
pnpm --filter @moldea.ai/cli test:integration
pnpm --filter @moldea.ai/cli test:e2e
pnpm --filter @moldea.ai/cli typecheck
pnpm --filter @moldea.ai/cli lint
pnpm --filter @moldea.ai/cli build
pnpm --filter @moldea.ai/core test
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm compatibility:check
pnpm docs:check
pnpm release:check-changes
pnpm release:plan
```

Build and pack Core 2.1.0 and CLI 6.0.0 release candidates, record their digests, and execute CLI candidate smoke tests from outside the workspace so hoisted dependencies cannot hide packaging failures.

### Acceptance criteria

- Schema 3 is the only active JSON contract and CLI/package documentation contains no schema-2 compatibility path.
- `inspect` is recursively content-free and cannot reproduce the observed multi-thousand-line canonical-body dump.
- Every JSON invocation honors the requested page limit and 1 MiB hard maximum; large repositories remain completely traversable through stable cursors.
- `scope` uses one manifest-only Core path and reports no relevance for an empty relationship manifest.
- `content` is explicit, single-path, repository-contained, and Unicode-safe.
- All read-only commands preserve the complete defined Git and filesystem state.
- CLI version 6.0.0, Core dependency 2.1.0, docs, error contracts, tests, release plan, and lockfile agree.
- Packages CI/docs contain no temporary skill-4 compatibility bridge.
- Focused and complete packages checks pass; the exact state receives `Ready to commit`, is signed/signed-off, and is pushed explicitly.

### Review checkpoint

Review the schema break, allowlisted projection, byte accounting after JSON escaping, cursor correctness, snapshot identity, stdin/path security, command-specific dependency loading, read-only invariants, packaging candidate, error/JSDoc synchronization, and absence of hidden compatibility branches. Ask whether a full-content or oversized-output regression could survive every test; if yes, the milestone is not ready.

## External prerequisite: trusted package publication

After Milestone 2 is pushed, the existing packages release workflow must merge the reviewed package changes to its trusted release branch and publish `@moldea.ai/core` 2.1.0 and `@moldea.ai/cli` 6.0.0. Verify registry versions, package provenance/checksums, packed contents, public exports, and CLI schema 3 from a clean consumer installation.

This prerequisite is not an implementation milestone and does not authorize the agent to merge branches or run `npm publish` directly. If the registry artifacts are unavailable, continue only work that can reach a truthful finished state from packed candidates; do not commit local-path dependencies, fake lockfile integrity, version aliases, or compatibility bridges.

## Milestone 3: Platform canonical context and registry adoption

### Objective

Publish a concise, selectively retrievable platform canonical model aligned with the released Core 2.1.0/CLI 6.0.0 contracts. Replace the 194,885-byte foundation document with a bounded foundation plus focused context, and update all directly affected moldea specifications, routing, dependency state, and deterministic documentation checks.

### Dependencies

- Milestones 1 and 2 committed and pushed.
- Trusted registry publication of Core 2.1.0 and CLI 6.0.0 verified from a clean consumer install.
- A clean `../platform` worktree on `new_skill` with no unrelated protected-instruction or other changes.

### In-scope files and contracts

- Rewrite `../platform/moldea/project.md` to at most 16 KiB UTF-8.
- Add `moldea/context/product-and-operating-model.md`, `cloud-and-assurance.md`, `access-security-and-billing.md`, and `platform-architecture.md`, each below 64 KiB UTF-8.
- Update `moldea/context/agent-skill.md`, `cli-package.md`, `core-package.md`, `repository-format.md`, `context-gathering.md`, `skill-design-and-quality.md`, `packages.md`, `runtime-adapter-contract.md`, and every directly affected non-excluded reference discovered through bounded search.
- Update root `README.md` routing, `package.json` from CLI 5.0.3 to 6.0.0, and `pnpm-lock.yaml` from the real registry artifact.
- Add or extend a repository-owned deterministic documentation validator for local links, size budgets, authority routing, forbidden duplicate headings, lowercase product prose in affected documents, and absence of schema-2/full-default-inspection guidance.
- Do not change `AGENTS.md` or any other protected instruction file.

### Implementation work

1. Inventory every heading and normative rule in the existing project foundation, assign each to exactly one target document, and preserve a coverage manifest during the edit so no product, Cloud, Assurance, access, security, billing, partner, or architecture contract disappears silently.
2. Write the concise foundation with purpose, audience, core guarantees, repository model, major boundaries, and links to focused context. Remove repeated package-level detail.
3. Move and deduplicate detailed rules into the four focused context files. Keep cross-links explicit and avoid creating a new catch-all document.
4. Rewrite package and skill specifications to define narrow activation, host-workflow precedence, Core scope matching, CLI schema 3, bounded keyset pages, explicit content chunks, read-only invariants, semantic resource evidence, qualification ownership, clean release identity, and lowercase product prose.
5. Update every reference that treats `project.md` as the sole detailed product specification. Do not add artificial manifest relationships merely to trigger the skill.
6. Install CLI 6.0.0 through the repository's exact pnpm workflow and regenerate the authentic lockfile. Run metadata-only `validate` and `inspect` checks without custom wrappers or body output.
7. Add deterministic documentation validation using the repository's existing runtime and scripts, with clear path/size/link/casing errors and no application test dependency.

### Tests and verification

- Validate heading-to-target coverage against the pre-edit foundation inventory.
- Validate all local Markdown links, exact size ceilings, unique authority ownership, required sections, marker preservation, lowercase product prose, and forbidden schema-2/full-content wording.
- Verify installed CLI identity/version/schema and run:

```bash
pnpm exec prettier --check README.md moldea/project.md moldea/context
pnpm exec moldea validate --json
pnpm exec moldea inspect --json
```

- Assert `inspect --json` remains at or below its 65,536-byte default and recursively contains no canonical body.
- Do not run application, browser, database, or full platform tests because the milestone changes canonical documentation and a development CLI dependency only. Run any established CLI-dependency or documentation script added by the milestone.

### Acceptance criteria

- The foundation is at most 16 KiB, each focused context is below 64 KiB, and every still-current normative rule is present exactly once or intentionally summarized with an authoritative link.
- All directly affected specs describe actual Core 2.1.0/CLI 6.0.0 behavior and no longer endorse broad activation, host-workflow capture, schema 2, or default body output.
- README routing supports selective context retrieval.
- Package and lockfile resolve the trusted registry CLI 6.0.0 artifact.
- Documentation validation and metadata-only CLI checks pass without excessive output or repository mutation.
- Human-facing changed prose uses `moldea`; technical identifiers retain valid casing.
- The exact state receives `Ready to commit`, is committed with `-s -S`, and is pushed explicitly without protected-instruction changes.

### Review checkpoint

Review content coverage and authority ownership, not only word count. Confirm that the split improves retrieval without losing security, billing, ownership, or platform rules; specifications match executable packages; links and budgets are enforced; no artificial activation relationships were introduced; and the dependency lock is registry-authentic.

## Milestone 4: Skill 5.0.0, evaluations, qualifications, and release reset

### Objective

Publish one internally complete skill 5.0.0 release state that abstains from unrelated work, consumes host workflow evidence, performs one cheap relationship gate when needed, uses bounded CLI schema-3 output, proves resource and read-only guarantees, avoids duplicated universal adapter cost, contains fresh evidence only, and has no active 4.0.x machinery or visible obsolete 4.0.x release refs.

### Dependencies

- Milestones 1 through 3 committed and pushed.
- Registry CLI 6.0.0 installed exactly in the npm-managed skill repository.
- The skill-creator instructions and `agents/openai.yaml` contract already inspected.
- Available model credentials and adapter environments for the required semantic and qualification executions. Missing provider credentials may block only the affected qualification evidence and must not be disguised as success.

### In-scope files and contracts

- Rewrite `moldea/SKILL.md`, `moldea/agents/openai.yaml`, and directly affected reference files, especially `local-tooling.md`, `context-gathering.md`, `continuous-maintenance.md`, `evaluate-and-reconcile.md`, and `skill-design-and-quality.md`.
- Update `fixtures/conformance-cases.json`, semantic seeds/results, semantic runner modules, Codex evaluation-host evidence, execution-evidence schemas, identity tooling, tests, and docs.
- Reorganize all `qualification/profiles/t1` through `t14` case ownership, probes, manifests, coverage, runtime assertions, result/storage schemas, tests, README, and documentation so Custom runs universal behavior once and every non-Custom profile retains only adapter-specific variance.
- Remove all active files and references for `carry-forward-4-0-1`, `compatibility-bridge-4-0-2`, 4.0.1/4.0.2 compatibility constants/branches, historical semantic compatibility, obsolete qualification-storage migration, release-evidence bridge fixtures, old current-surface attempt/result directories, package scripts, website compatibility/history loaders, and generated compatibility fixtures.
- Update root `package.json` to 5.0.0 and exact CLI 6.0.0, root and qualification/website lockfiles, release identity, README/docs, website copy/loaders/tests, generated documentation, homepage claims, path checks, and package-candidate tooling.
- Delete local and remote skill tags `v4.0.0`, `v4.0.1`, and `v4.0.2` plus matching GitHub Releases/assets after the clean branch commit is pushed. Do not rewrite shared branches.
- Do not modify protected instruction files.

### Implementation work

1. Rewrite skill frontmatter and `agents/openai.yaml` with lowercase `moldea`, a narrow implicit-invocation description, and `policy.allow_implicit_invocation: true`. Preserve explicit `$moldea` invocation.
2. Make `SKILL.md` a short dispatcher: classify explicit/direct activation from known task paths and hunks; use at most one root-local `scope` call when a declared relationship is needed; abstain silently on no match; load only the owning reference after relevance; reuse host evidence; report only material results.
3. Remove “Use first,” “potentially durable,” generic knowledge activation, and ordinary-development capture from all active instructions and examples.
4. Restrict `local-tooling.md` to root-local moldea CLI establishment after relevance. Remove general Git/package-manager ownership, repeated hardened status calls, status-after-every-command rules, and review/commit/publication orchestration.
5. Specify exact README hunk ownership: path-only README changes do not activate; only a changed hunk intersecting the managed marker block does.
6. Update all skill paths to parse schema-3 metadata directly, follow cursor pages only when the relevant task requires them, use explicit `content` for one needed canonical asset, and never create custom wrappers to strip full CLI responses.
7. Enforce silent abstention, one-line relevant/no-change reporting, detailed reporting only for material canonical changes or diagnostics, and no moldea-derived commit identity for unrelated work.
8. Add deterministic and semantic cases for unrelated docs/source review, README outside/inside markers, exact bindings, `affectedBy`, direct canonical paths, explicit invocation, generic knowledge, host workflow precedence, zero-agent/zero-relationship projects, metadata pages, Git-object preservation, silent reports, malformed scope input, and cursor snapshot errors.
9. Extend evidence contracts to assert per-case moldea command counts, moldea stdout bytes, model-visible moldea output bytes, tokens, duration, and Git-state preservation. Require exact zero command/output for abstention, exactly one pre-reference `scope` command for relationship gating, 65,536-byte ordinary pages, a 1 MiB invocation ceiling, and a 262,144-byte ordinary relevant-case aggregate unless a fixture intentionally traverses pages.
10. Derive fresh per-case token/latency regression ceilings from measured 5.0.0 baselines with 25 percent headroom plus documented fixed variance allowance. Keep the existing 16 MiB host ceiling only as a crash guard.
11. Move universal qualification cases to the Custom/shared profile once. Keep adapter-specific cases only where discovery, invocation syntax, layout, or platform behavior can differ. Apply deterministic resource/read-only/schema assertions to every attempt and validate the combined shared-plus-specific coverage matrix for all fourteen profiles.
12. Run semantic and qualification attempts from clean seeds. Fix the skill or runner when evidence exposes a product defect; do not weaken assertions to accept wasteful behavior. Store only fresh 5.0.0 current evidence.
13. Delete all active 4.0.x compatibility/carry-forward code, declarations, tests, fixtures, scripts, old result attempts, website historical readers, and documentation. Simplify release identity and website generation to one current contract.
14. Update and generate current docs/website state, validate package candidates, set version 5.0.0 and CLI/schema identity, and run the skill-creator validator.
15. Use an independent subagent for forward tests after deterministic checks pass, as required by the skill-creator workflow. Give it realistic tasks without expected-step hints, capture actual behavior, and turn material failures into regression coverage before release.
16. Review and publish the complete skill tree. Then record the current remote tag objects, delete exact local and `origin` refs `v4.0.0`, `v4.0.1`, and `v4.0.2`, inspect authenticated GitHub Releases, delete matching releases/assets when present, and verify their absence. Do not force-push branches or claim provider-cache erasure.

### Tests and verification

- Run focused unit/integration tests after each module change, then the complete release boundary:

```bash
npm test
npm run eval:semantic:preflight
npm run eval:semantic
npm run eval:semantic:verify
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:dry-run
npm run qualification:verify
npm run docs:check
npm run website:check
npm run website:build
npm run path:check
npm run release:identity:check
npm run release:check
```

- Run skill-creator `quick_validate.py` against `moldea/`.
- Run candidate validation against a clean install of registry CLI 6.0.0 and compare its package digest/provenance with Milestone 2.
- Run independent forward tests for unrelated abstention, relationship match, direct canonical work, large context, host workflow precedence, bounded output, and read-only state.
- Verify active-tree absence of `4.0.0`, `4.0.1`, `4.0.2`, `carry-forward`, `compatibility-bridge`, schema 2, broad activation phrases, and obsolete scripts/readers, allowing only deliberately tested invalid legacy input when essential to a removal test.
- Verify local/remote obsolete tag absence with `git tag --list` and `git ls-remote --tags origin`; verify GitHub Release absence through authenticated repository access when available.
- Do not use `pnpm exec` to discover missing tools in this npm-managed repository.

### Acceptance criteria

- Unrelated adopted-repository tasks produce zero moldea reference loads, CLI calls, CLI/output bytes, and progress/final mentions.
- Direct canonical, owned marker hunk, explicit, exact-binding, and `affectedBy` cases activate once and remain bounded to matched owners.
- Host planning, review, implementation, Git, commit, and publication workflows retain control.
- The skill consumes only schema-3 metadata pages by default and never requests full canonical inspection output.
- Read-only skill/evaluation/qualification paths preserve files, index, refs, config, submodules, and Git object database.
- Resource evidence is enforced per scenario with realistic page and aggregate limits; token/latency ceilings are baseline-derived and diagnostic rather than product runtime errors.
- Universal behavior runs once, all fourteen profiles have complete shared-plus-specific coverage, and adapter-specific qualifications pass.
- Skill/package/docs/website/evidence identity all state 5.0.0 with exact CLI 6.0.0/schema 3.
- Active source, tests, fixtures, results, scripts, docs, website, and release tooling contain no 4.0.x compatibility or carry-forward machinery.
- Fresh semantic and qualification evidence passes without copied historical attempts.
- Obsolete local/remote tags and accessible matching GitHub Releases are absent; shared branch history is not rewritten.
- Complete deterministic, semantic, qualification, website, release, packaging, path, and skill-creator checks pass.
- The exact state receives `Ready to commit`, is signed/signed-off, and is pushed explicitly before release refs are deleted.

### Review checkpoint

Review activation false positives and false negatives, pre-reference command count, reference-loading size, host-workflow ownership, direct schema-3 parsing, report silence, Git read-only evidence, resource-budget clarity, universal-versus-adapter test ownership, result freshness, website/release simplification, lockfile authenticity, and exhaustive active-tree legacy removal. Independently confirm that a wasteful or Moldea-centric response could not pass the semantic and qualification assertions.

## Final completion audit

After Milestone 4 and release-ref cleanup, recheck all three active branches and remote destinations. Map every plan acceptance criterion to current file, package, test, evidence, registry, Git ref, and publication proof. Run targeted searches excluding `_archive`, `_archives`, `_backup`, and `_backups` for schema-2 contracts, full default content output, broad activation language, active 4.0.x machinery, obsolete tag refs, and unintended human-facing `Moldea`. Treat technical identifier casing and deliberately invalid negative-test fixtures separately.

Confirm Core 2.1.0 and CLI 6.0.0 registry artifacts from clean installs; platform dependency integrity and canonical checks; skill 5.0.0 deterministic, semantic, qualification, website, release, and package-candidate evidence; signed/signed-off commit metadata; clean worktrees; exact pushed commits; and remote obsolete release-ref absence. Do not mark the goal complete while registry publication, an adapter qualification, an accessible GitHub Release deletion, a repository push, or any material acceptance criterion remains unverified.

## Execution scope

Execute Milestone 1 in `../packages`, review it to `Ready to commit`, commit and push it, then execute Milestone 2 and publish it the same way. After trusted Core 2.1.0 and CLI 6.0.0 registry publication, execute and publish Milestone 3 in `../platform`. Then execute the complete Skill 5.0.0 reset in the current repository, including deterministic tests, semantic evaluation, all adapter qualifications, fresh evidence, website/release synchronization, active 4.0.x removal, independent skill forward-testing, signed publication, and deletion/verification of the exact obsolete tags and matching GitHub Releases. Continue automatically through correction and re-planning loops unless a genuine safety, credential, registry, or repository-state blocker cannot be resolved from current evidence.
