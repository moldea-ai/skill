# Plan: Resource-bounded clean-slate moldea redesign

## Task contract

Redesign moldea across the `packages`, `platform`, and `skill` repositories so it activates only when relevant, never takes control of a host coding workflow, uses bounded content-free inspection output by default, remains useful on large repositories through deterministic continuation, preserves read-only operations without mutating Git state, and proves those properties through deterministic tests, semantic evaluations, and adapter qualifications.

This is a clean replacement of the current behavior. The implementation must not retain schema-2 CLI output, implicit full-content inspection, broad knowledge-triggered activation, host-workflow Git orchestration, compatibility aliases, fallback modes, release bridges, carry-forward scripts, or current-only code that exists solely to support skill releases 4.0.0, 4.0.1, or 4.0.2. Delete the local and remote `v4.0.0`, `v4.0.1`, and `v4.0.2` tag refs and delete matching GitHub Releases and their hosted assets when authenticated repository access exposes them. Do not rewrite shared branch history or rely on server-side object erasure: those operations cannot guarantee complete removal from hosted caches and would conflict with the repository's non-force publication contract. The clean-slate guarantee applies to the active tree, active release metadata, visible release refs, and new implementation.

The product name is `moldea` in human-facing prose. Required technical identifiers retain their syntactic casing, including TypeScript symbols such as `IMoldeaProjectIndex`, environment variables such as `MOLDEA_*`, and package names such as `@moldea.ai/cli`.

The developer has authorized an autonomous sequence covering planning, challenge and revision, breakdown, sequential milestone implementation, review and correction loops, signed commits, explicit branch pushes in all three repositories, and deletion of the exact obsolete skill release refs named above. That authorization does not expand publication beyond the active branches, permit direct npm publication, permit branch merging or force-pushing, authorize shared branch-history rewriting, allow changing protected instruction files, or allow incorporating unrelated worktree changes.

## Why this redesign is required

The plan preserves the concrete failures that motivated the work so later implementation does not drift back toward the current design:

1. An unrelated documentation review activated the moldea skill and made moldea validation a central part of the response even though the reviewed scope did not contain `/moldea/**`, change an owned README block, or match a declared relationship.
2. The skill loaded `SKILL.md`, `local-tooling.md`, `context-gathering.md`, `continuous-maintenance.md`, and `evaluate-and-reconcile.md` before doing the requested review. That consumed roughly 60 KiB of instruction text and caused context compaction before the main task was complete.
3. `moldea inspect --json` returned the complete canonical document bodies. In the observed adopted repository it produced roughly 5,889 to 6,526 transcript lines even though the project contained zero agents, zero relationships, zero requirements, zero runtimes, and only 23 context records.
4. The observed `/moldea/project.md` body alone was 194,885 UTF-8 bytes. The current CLI and package specification intentionally expose that content through `inspect --json`; the excessive output is a contract defect rather than an accidental logging issue.
5. Agents had to write ad hoc Node wrappers to summarize the CLI response. One wrapper assumed the wrong response shape, failed, and caused another command and another full CLI execution.
6. `local-tooling.md` currently requires loading itself before Git, package-manager, or CLI activity and prescribes hardened Git commands plus repeated status checks. This captured host-owned `review` and `repo push` workflows, producing many redundant `git status` calls and unrelated repository checks.
7. Any edit to a shared root README could activate moldea even when the managed `<!-- moldea:start -->` to `<!-- moldea:end -->` block remained byte-identical.
8. A nominally read-only review used a temporary index, `git add`, and `git write-tree`, which created an object in `.git/objects`. Read-only moldea work must not mutate the worktree, index, refs, configuration, object database, or submodule state.
9. Final reports repeatedly mentioned moldea validation when moldea had no bearing on the task, increasing noise and making the product appear to own unrelated engineering work.
10. Unrelated UI and design documentation acquired `docs(moldea)` commit identity because moldea was treated as the workflow owner instead of a bounded source of relevant project evidence.
11. A repository with no declared relationships still incurred full inspection and canonical-content output.
12. The current canonical foundation document is far larger than the repository-format contract's requirement for a concise authoritative foundation, so even intentional context gathering has poor retrieval granularity.
13. The evaluation host records command output and token usage but relies mainly on generous infrastructure ceilings such as 128 completed commands and 16 MiB of host output. It does not enforce the resource behavior needed for unrelated abstention, bounded activation, or model-visible CLI output.
14. The skill release path is coupled to 4.0.1 carry-forward evidence and a 4.0.2 compatibility bridge. Those mechanisms, their fixtures, their website readers, and their CI consumers make the current release architecture harder to reason about and perpetuate mistakes the new major version must not inherit.

## Current repository evidence

### `packages`

- `@moldea.ai/cli` is version 5.0.3 and emits JSON schema version 2.
- The CLI parser currently exposes `validate`, `inspect`, and `composition`. `inspect --json` wraps the full Core `IProjectInspectionResult`, including canonical asset content.
- CLI ownership is already separated into `command-line`, `cli-execution`, `core-composition`, `presentation`, `json-output-contract`, `working-tree-snapshot`, `git-inventory`, and repository-reader modules. The redesign will extend these boundaries instead of introducing a parallel executable.
- `@moldea.ai/core` is version 2.0.2. `ICore.inspectProject` returns the rich project index needed by runtime adapters and programmatic consumers. Core already parses manifest relationships and validates `affectedBy` simple globs, but it has no public operation that matches a supplied changed-path set without inspecting the complete project.
- The working-tree snapshot already probes repository state before and after an operation. It does not expose a reusable snapshot digest suitable for continuation-token validation.
- The root CI, `README.md`, and `docs/npm-releases.md` still contain the temporary skill 4.0.2 compatibility-bridge workflow.
- Package publishing is owned by the trusted main-branch release workflow. A `repo push` of the active feature branch publishes Git commits only.

### `platform`

- `/moldea/moldea.yaml` currently contains only `version: 1`, so the repository declares no relationships that could justify activation for ordinary source or documentation paths.
- `/moldea/project.md` contains about 25,641 words and 194,885 UTF-8 bytes across product, Cloud, Assurance, access, security, billing, partner, and platform-architecture concerns.
- The detailed package contracts live in `/moldea/context`, including `agent-skill.md`, `cli-package.md`, `core-package.md`, `repository-format.md`, `context-gathering.md`, `skill-design-and-quality.md`, `packages.md`, and `runtime-adapter-contract.md`.
- The CLI and Core package specifications currently require full canonical content in inspection results, so the specifications must change with the packages rather than being patched after implementation.
- The root package currently pins `@moldea.ai/cli` 5.0.3.
- The platform worktree is clean on `new_skill` at the revised-plan baseline. Protected instruction files remain outside implementation scope and must not be modified or bundled into moldea implementation commits.

### `skill`

- The skill is version 4.0.2 and pins CLI 5.0.3/schema 2.
- `moldea/SKILL.md` begins with broad language such as “Use first” and activates on “potentially durable” knowledge, making most meaningful engineering work eligible.
- `moldea/references/local-tooling.md` claims Git and package-manager orchestration before relevance has been established and requires repeated Git state checks.
- The skill references total roughly 72 KiB, and the current workflow routes into several large references before it knows whether moldea is relevant.
- The semantic fixture contains 57 skill cases but does not include the observed unrelated-review abstention and bounded-output failures as enforceable resource contracts.
- Fourteen qualification profiles repeat eight universal behavior cases in addition to adapter-specific cases, multiplying model cost without increasing adapter-specific confidence.
- The evaluation host records completed commands, command-output byte counts, model-visible evidence, token usage, and duration, providing the raw signals needed for enforceable per-case resource budgets.
- Active release tooling includes `carry-forward-4-0-1`, `compatibility-bridge-4-0-2`, version-specific compatibility constants, historical semantic readers, migration tooling, fixtures, website compatibility loaders, package scripts, and documentation.
- The private `@moldea.ai/skill-conformance` package is not a public npm artifact. The skill repository has local and remote annotated tags `v4.0.0`, `v4.0.1`, and `v4.0.2`. Their remote tag-object and peeled commit pairs are `8501bc59dd483458e23d4c5f68f9cb9d9323bd6b` / `fcbc34f60b12b1b66cd9ebb28b1865979a259429`, `210c89f05a548e7c2d4c47cf3b581a741dc4531c` / `a2ae5a618e9610dfc169894f462d02954a0f557f`, and `4d4a624ea7252a897437d0da9243736bdf6ca4c7` / `5dda831f2ad31af1fb59f457d6b304dc7b1722fc`. The GitHub CLI is not currently installed, so matching GitHub Release existence must be checked later through an available authenticated GitHub capability before claiming release cleanup complete.

## Desired final behavior

### Activation and host-workflow precedence

The skill uses the following ordered gate before it loads any reference file or runs any full inspection:

| Trigger | Required behavior |
| --- | --- |
| The developer explicitly asks for moldea work or invokes `$moldea` | Activate for the requested moldea scope. |
| The task directly reads or changes `/moldea/**` | Activate and load only the references needed for those canonical assets. |
| A changed hunk intersects the root README managed moldea marker block | Activate for managed-block maintenance. A README change outside the block abstains. |
| The task concerns an agent, runtime adapter, or Agent Skill and the requested behavior is within moldea's documented purpose | Activate for the bounded relevant operation. Merely using an AI coding agent is not sufficient. |
| A changed repository-logical path matches an exact manifest binding or an `affectedBy` declaration | Run bounded validation for only the matched owners and relationships. |
| None of the above | Abstain silently: load no moldea references, run no moldea CLI command, change no moldea state, and make no moldea mention in progress or final reporting. |

Generic host workflows always retain control. The skill may consume a path set, diff, branch, status, verification result, or publication result already established by a host `plan`, `review`, implementation, or commit workflow. It must not redefine those workflows, demand its own Git hardening flags, repeat repository-state discovery without a material reason, choose commit identity, or turn an unrelated task into moldea maintenance.

The pre-activation gate is intentionally asymmetric. Explicit and direct canonical requests activate without a CLI relevance call. An ordinary changed-path task may make one cheap `scope` call against the manifest. An irrelevant result terminates moldea handling immediately. Full inspection is never used to decide whether inspection was relevant.

### Core scope matching

Add a source-neutral Core operation that accepts normalized repository-logical paths plus a parsed version-1 manifest and returns deterministic relationship matches without loading project, context, decision, agent, runtime, mirror, or evidence bodies and without executing adapters.

The operation will:

- accept exact logical paths beginning with `/` and reject native absolute paths, drive-relative paths, UNC paths, traversal segments, empty segments, NUL characters, and values outside existing repository path limits;
- reuse the existing manifest parser, relationship validation, reference ownership, and simple-glob semantics rather than creating a second manifest model;
- match exact binding and reference paths directly and evaluate `affectedBy` globs with stable ordering and deduplication;
- return the input path, owning entity kind and identifier, relationship field, declaration pointer, and matched exact path or glob;
- expose deterministic counts and digests but no canonical content;
- remain pure after manifest parsing so it can be covered thoroughly with unit tests and used by non-filesystem repository implementations;
- handle empty manifests and empty path sets without error and without manufacturing relevance;
- avoid accidental quadratic behavior where practical by indexing exact paths and grouping compiled patterns, with representative large-path and large-relationship tests to catch regressions.

This is an additive Core capability. The rich programmatic project index remains a legitimate Core and adapter capability; it is not a compatibility shim. Core will move to 2.1.0 unless implementation reveals an unavoidable incompatible public change, in which case the autonomous re-planning loop must revise the version and affected adapter scope before editing exports.

### CLI schema 3 and command surface

Release `@moldea.ai/cli` 6.0.0 with JSON schema version 3. Schema 2 will not remain selectable through a flag, alias, environment variable, hidden branch, or alternate serializer.

The authoritative command surface will be:

- `validate`: preserve validation intent while moving its JSON envelope to schema 3 and the shared bounded serializer.
- `inspect`: return content-free project metadata, counts, diagnostics, evidence summaries, paths, sizes, digests, relationships, requirements, and unresolved-reference summaries. It must never serialize canonical document bodies.
- `scope`: accept repository-logical changed paths through repeatable `--path` arguments or `--paths-stdin`. The stdin form consumes NUL-delimited UTF-8 records without shell interpolation and supports large path sets within the repository's existing inventory limits. It reads and parses only `/moldea/moldea.yaml`, executes no runtime adapter, and returns paginated relationship matches plus a `relevant` boolean.
- `content`: require one explicit canonical logical path and return only that asset's text in bounded chunks. It rejects directories, non-canonical paths, traversal, links escaping the repository boundary, and wildcard selection. This is the only CLI JSON operation that returns canonical body text.
- `composition`: preserve its diagnostic purpose, move it to schema 3, and keep its output content-free.

The schema-3 envelope remains strict and machine-readable with `schemaVersion`, `cliVersion`, `command`, `status`, `error`, and `result`. Collection-bearing results expose a `page` containing `records`, `snapshotDigest`, `outputByteLimit`, and `nextCursor`. Records use discriminated `kind` values and stable composite ordering keys. Counts describe the complete inspected result, not merely the current page.

`inspect` internally may use the rich Core inspection needed for adapter execution, but its presentation transformer must construct a new metadata projection explicitly. It must not spread, clone, prune, or serialize the Core result and hope that `content` was removed. Unit tests will walk every schema-3 non-`content` result recursively and fail if a `content` property or known canonical body appears.

### Output budgets and large-repository behavior

The byte budget controls a transport page, not total repository capacity:

- Default maximum stdout size per JSON page: 65,536 UTF-8 bytes.
- Supported caller override: `--max-output-bytes`, from 4,096 through 1,048,576 bytes inclusive.
- Hard maximum stdout size for any single CLI JSON invocation: 1,048,576 UTF-8 bytes.
- `content` uses the same encoded-page budget and chooses a Unicode-safe chunk that leaves room for the envelope and continuation metadata.
- Human-readable output uses concise counts and actionable diagnostics and must remain within the same hard ceiling; large listings direct the user to JSON pagination rather than dumping bodies.

These values are deliberately generous enough for useful diagnostics and metadata while preventing multi-megabyte model-visible accidents. They do not cap repository size or total retrievable records. Large repositories continue through stable cursor pages.

Pagination is keyset-based over deterministic composite record keys. The opaque base64url cursor contains a version, command, normalized filters, snapshot digest, last emitted key, and checksum. A continuation invocation re-establishes the source snapshot and rejects malformed cursors, command or filter mismatches, unsupported cursor versions, and changed snapshots with stable actionable errors. It never restarts silently, skips records, repeats records, or encodes an offset. Empty, first, exact-boundary, final, invalid, tampered, and snapshot-change cases receive focused coverage.

Summary records contain only bounded application-owned fields. Arbitrary adapter evidence detail is represented by safe identifiers, references, digest, and UTF-8 length rather than copied text. Stable CLI diagnostics remain actionable and bounded by their validated inputs. If an envelope cannot fit the requested minimum, the CLI returns a structured `OUTPUT_BUDGET_TOO_SMALL` error with the accepted range; it does not emit malformed or silently truncated JSON.

### Read-only guarantees

`validate`, `inspect`, `scope`, `content`, semantic evaluation, qualification setup, and all review-oriented skill paths must be observational. Tests will snapshot and compare:

- worktree files and modes;
- the real Git index;
- refs and `HEAD`;
- `.git/config` and relevant repository configuration;
- submodule state when present;
- the Git object database path set and file metadata.

No read-only implementation or test may use `git add`, `git update-index`, `git write-tree`, a temporary `GIT_INDEX_FILE`, object-writing plumbing, checkout, stash, reset, or cleanup. Candidate-state fingerprints belong to the host workflow and must be consumed when supplied rather than reimplemented by moldea.

### Skill structure and reporting

Release the skill as 5.0.0. Keep `policy.allow_implicit_invocation` enabled because declared relationship matches and direct canonical work must activate automatically, but narrow the frontmatter description so ordinary engineering, generic knowledge capture, and unrelated adopted-repository work are outside the trigger.

Rewrite `moldea/SKILL.md` as a short dispatcher with this order:

1. classify explicit/direct activation from the developer request and already-known path/hunk evidence;
2. when necessary, establish only the exact root-local CLI needed for one `scope` call;
3. stop silently on no match;
4. only after relevance is proven, load the single reference that owns the requested moldea operation;
5. reuse host workflow evidence and keep all actions bounded to matched owners;
6. report only material moldea changes, diagnostics, or blockers.

Remove “Use first,” “potentially durable,” knowledge-triggered activation, and broad ordinary-development language. `local-tooling.md` will govern only root-local moldea CLI establishment and moldea command invocation after relevance is known. It will not govern general Git, package-manager, review, planning, commit, or publication commands and will not require a status call after every supplemental Git command.

Reporting rules become:

- abstention: no moldea progress message and no final-report entry;
- relevant check with no change or diagnostic: at most one concise line when the result matters to the host task;
- material canonical change, validation failure, unresolved relationship, or blocker: report the relevant paths and actionable result without dumping full inspection data;
- never label an unrelated commit, document, or workflow as moldea-owned merely because the repository has adopted moldea.

### Canonical context redesign

Rewrite `/platform/moldea/project.md` as a concise foundation of at most 16 KiB UTF-8 containing product purpose, audience, core guarantees, repository model, major boundaries, and routing to focused context. Preserve the detailed durable truth by splitting it into these focused context documents, each kept below 64 KiB UTF-8:

- `/moldea/context/product-and-operating-model.md`: market problem, product boundaries, Git-native operating model, adoption, project structure, context, instructions, and agent lifecycle.
- `/moldea/context/cloud-and-assurance.md`: GitHub integration, environments, history, REST API role, Cloud flows, and pull-request Assurance.
- `/moldea/context/access-security-and-billing.md`: access and ownership model, authentication and authorization boundaries, security, billing, plans, partners, and value-bearing rules.
- `/moldea/context/platform-architecture.md`: deployed architecture, package/runtime integration, quality attributes, operations, competitive positioning, and governing consistency rules.

The split is a retrieval boundary, not a content deletion exercise. Remove duplicated prose, preserve every still-current normative rule exactly once, add explicit cross-links, update references that currently treat the oversized foundation as the sole detailed specification, and validate all local links. Do not add these documents to a manifest relationship merely to force skill activation; relationships must describe real implementation impact.

Update the agent-skill, CLI, Core, repository-format, context-gathering, skill-quality, package, and runtime-adapter specifications to define the new activation gate, schema-3 output, bounded pagination, explicit content retrieval, read-only guarantee, host-workflow precedence, evaluation budgets, and clean release identity. Update the platform README routing and the root CLI dependency only when the 6.0.0 registry artifact is available.

### Semantic evaluation and adapter qualification

Add deterministic conformance and semantic cases for at least these contracts:

- unrelated documentation review in an adopted repository abstains;
- unrelated source review in an adopted repository abstains;
- a root README edit outside the managed markers abstains;
- a changed hunk inside the managed markers activates bounded maintenance;
- exact binding and `affectedBy` matches activate only the declared owner;
- direct `/moldea/**` work activates;
- an explicit moldea request activates;
- a generic statement about durable knowledge does not activate;
- host `plan`, `review`, implementation, and publication workflows remain in control;
- an adopted project with zero agents and zero relationships performs no full inspection for an unrelated task;
- a relevant inspection uses metadata pages rather than printing canonical content;
- read-only review and validation leave the Git object database unchanged;
- abstention produces no moldea progress or final-report mention;
- malformed scope input and changed cursors fail clearly without confusing partial output.

Resource assertions are scenario-specific rather than one low global ceiling:

- abstention cases require exactly zero moldea CLI commands, zero moldea CLI stdout bytes, and zero model-visible moldea tool-output bytes;
- relationship-gated cases permit exactly one pre-activation `scope` command before any moldea reference load;
- each CLI JSON event must remain within its requested page limit and the 1 MiB hard maximum;
- ordinary relevant semantic cases default to an aggregate 262,144-byte moldea stdout ceiling unless the fixture explicitly exercises multiple continuation pages;
- every semantic and qualification case declares its allowed moldea command count from the behavior it tests instead of inheriting the host's 128-command fail-safe;
- model input/output tokens and latency are recorded as regression telemetry. Fresh 5.0.0 baselines establish per-case ceilings with 25 percent headroom plus a small fixed allowance for natural model variance. These evaluation ceilings fail CI or qualification with a clear case-specific report; they are not runtime errors shown to product users.

Keep the 16 MiB evaluation-host output ceiling only as an infrastructure crash guard. It is not acceptance evidence.

Run universal skill behavior once in the Custom/shared qualification profile rather than fourteen times. Non-Custom adapter profiles retain only behavior that can differ because of adapter instruction discovery, invocation syntax, file layout, or platform constraints. Runner-level resource, read-only, schema, and evidence assertions apply to every profile, so adapter users remain protected without paying for duplicated universal model cases. Update the coverage matrix to prove that every adapter combines the shared universal qualification with its adapter-specific cases.

### Clean release identity

Create one current 5.0.0 release identity from freshly generated semantic and qualification evidence. Do not copy or translate 4.0.x attempts into the new release.

Remove:

- `tooling/release-identity/carry-forward-4-0-1.{mjs,d.mts,test-integration.mjs}`;
- `tooling/release-identity/compatibility-bridge-4-0-2.{mjs,d.mts,test-integration.mjs}`;
- 4.0.1/4.0.2 constants and branches from `tooling/release-identity/compatibility.*`, `evidence.*`, `historical-semantic.*`, public indexes, declarations, and tests;
- `tooling/qualification-storage-migration` when its remaining purpose is migration of the superseded result format;
- `fixtures/release-evidence/carry-forward-4.0.1.json` and `compatibility-bridge-4.0.2.json`;
- prior semantic attempt directories and qualification result attempts from the current release surface, replacing them only with fresh 5.0.0 evidence;
- website compatibility and historical-result readers that exist solely for 4.0.x, simplifying loaders and generated fixtures to the current contract;
- `release:carry-forward:*`, `release:compatibility-bridge:*`, and obsolete migration scripts from package manifests;
- the temporary packages-repository CI bridge job and its README/npm-release documentation.

Retain only general release identity, candidate verification, current evidence validation, and the new 5.0.0 version metadata. After the active-tree removal is reviewed and published, delete the exact local and `origin` tag refs `v4.0.0`, `v4.0.1`, and `v4.0.2`; inspect for matching GitHub Releases through authenticated repository access, delete any matching releases and hosted assets, and verify that the tags and release listings are absent. Record the resolved tag object identifiers before deletion so the operation is auditable, but do not keep a compatibility manifest or active historical loader in the product tree.

## Repository changes

### `../packages`

1. Add the Core scope-matching contract under `projects/core/src/scope-matching/` with focused `types.ts`, `validations.ts`, matching implementation, thin exports, unit tests, and integration coverage through the public Core entry point. Update `contracts/index.ts`, `src/index.ts`, public API fixtures, repository-inspection documentation, package README, package version, and lockfile.
2. Add CLI modules under `projects/cli/src/project-scope/`, `output-page/`, and `project-content/`. Keep command parsing in `command-line`, orchestration in `cli-execution`, Core calls in `core-composition`, working-tree stability in `working-tree-snapshot`, and presentation in `presentation` and `json-output-contract`.
3. Replace schema-2 types, transformers, formatters, serializer fixtures, and e2e expectations with schema 3. Update command constants, parser and validation contracts, public entry files, operational errors, package metadata, README/examples, version, lockfile, and runtime/testing compatibility fixtures.
4. Add unit tests beside each changed implementation file and integration/e2e tests beside the owning entry points. Cover path normalization, NUL stdin, exact/glob matching, deterministic ordering, pagination, cursor integrity, snapshot mismatch, byte accounting, Unicode chunking, no-content recursion, zero-relationship projects, large projects, and read-only Git-state preservation.
5. Remove the temporary skill compatibility-bridge workflow from `.github/workflows/ci.yml`, root `README.md`, and `docs/npm-releases.md`; update affected release tests and generated compatibility metadata without changing unrelated packages.
6. Use lowercase `moldea` in changed human-facing package prose and CLI messages while retaining required code identifiers and package names.

### `../platform`

1. Rewrite `moldea/project.md` and add the four focused context documents defined above.
2. Update `moldea/context/agent-skill.md`, `cli-package.md`, `core-package.md`, `repository-format.md`, `context-gathering.md`, `skill-design-and-quality.md`, `packages.md`, and `runtime-adapter-contract.md`, plus every directly affected cross-reference discovered through a bounded link/reference search.
3. Update root README routing so developers and agents start with the concise foundation and select focused context instead of loading the entire platform model.
4. Update `package.json` and `pnpm-lock.yaml` from CLI 5.0.3 to the published 6.0.0 artifact after registry publication; do not hand-author lockfile integrity or commit a local-tarball dependency as the final state.
5. Add deterministic documentation checks for local links, foundation/context byte budgets, forbidden duplicate authority headings, lowercase product prose in affected documents, and the absence of schema-2/full-inspection guidance.
6. Preserve all protected instruction files exactly and stop platform review/publication if any later unrelated worktree change prevents a cohesive commit.

### Current `skill` repository

1. Rewrite `moldea/SKILL.md`, `moldea/agents/openai.yaml`, `moldea/references/local-tooling.md`, `context-gathering.md`, `continuous-maintenance.md`, `evaluate-and-reconcile.md`, `skill-design-and-quality.md`, and any directly affected reference routing. Keep frontmatter concise and keep all post-gate detail in references loaded only when needed.
2. Update conformance fixtures, semantic seeds, runner contracts, execution-evidence schemas, model prompts, evidence identity, and tests for activation, output, command-count, token, latency, and read-only guarantees.
3. Reorganize qualification profiles so Custom owns universal skill behavior and adapter profiles own only adapter-specific variance. Update profile manifests, cases, probes, coverage validation, qualification runtime assertions, storage/result schemas, README, and docs.
4. Remove all active 4.0.x bridge, carry-forward, migration, historical-result, fixture, package-script, website-loader, generated-fixture, and documentation paths listed in the clean release section.
5. Set the skill version to 5.0.0, CLI compatibility to exactly 6.0.0/schema 3, regenerate npm lockfiles only from the published package, and generate fresh current semantic and qualification evidence.
6. Update root and website documentation, generated docs, homepage claims, getting-started instructions, adapter-qualification documentation, semantic-evaluation documentation, and release checks to the new current-only contract. Use lowercase `moldea` in human-facing prose.
7. Run the skill-creator validator and independent forward tests after deterministic checks pass. The independent agent receives realistic unrelated-review, relationship-match, direct-canonical, large-context, and host-workflow tasks without being told the expected internal steps; observed behavior is converted into regression evidence before release.

## Ordered implementation strategy

1. Record clean baseline commits and worktree state in each repository, and inventory all active schema-2, 4.0.x, full-content, broad-activation, and uppercase-product-prose references without reading excluded archive or backup trees.
2. Implement and verify the additive Core scope matcher first. This establishes one deterministic relationship interpretation for CLI, skill tests, and future consumers.
3. Implement CLI schema 3, metadata projections, `scope`, `content`, byte-budget enforcement, stable cursors, and read-only snapshot identity. Replace the schema-2 surface rather than layering a compatibility serializer.
4. Update package documentation, versions, lockfile, release metadata, and packages CI; run focused Core/CLI checks and the broader packages regression boundary; build and pack release candidates for cross-repository testing.
5. Update the platform canonical specifications and context split against the verified package behavior. Run link, size, formatting, casing, and candidate-CLI validation, then review and publish the cohesive platform change.
6. Rewrite the skill activation and reference flow against the packed CLI 6.0.0 candidate, then update deterministic conformance and semantic evaluation infrastructure.
7. Redesign qualification ownership and resource assertions, run the Custom universal suite and every adapter-specific suite, and fix product defects rather than weakening evaluations.
8. Delete 4.0.x compatibility and carry-forward machinery, simplify current release identity and website loaders, generate fresh 5.0.0 evidence, and run all skill, qualification, website, documentation, path, identity, and candidate checks.
9. Publish the reviewed clean skill tree, then delete the exact local and remote `v4.0.0`, `v4.0.1`, and `v4.0.2` tag refs and any matching GitHub Releases available through authenticated access. Verify the remote refs and release listing after deletion. Do not force-push or rewrite branches.
10. After the trusted packages workflow publishes CLI 6.0.0 and Core 2.1.0, replace candidate dependencies with registry artifacts, regenerate authentic lockfiles, repeat cross-repository release checks, and publish the remaining feature-branch commits with `repo push`.
11. Perform a final cross-repository audit against every acceptance criterion, including searches for forbidden active legacy paths, schema-2 contracts, broad activation text, canonical content in default CLI output, unintended uppercase product prose, and obsolete visible skill release refs. Keep the goal active until all Git publications and required registry-dependent validations are proven.

## Verification commands

Run commands from the owning repository with its established package manager. Narrow checks run before broader checks, but public-contract changes require the complete affected package or repository boundary before publication.

### `packages`

```bash
pnpm --filter @moldea.ai/core test:unit
pnpm --filter @moldea.ai/core test:integration
pnpm --filter @moldea.ai/cli test:unit
pnpm --filter @moldea.ai/cli test:integration
pnpm --filter @moldea.ai/cli test:e2e
pnpm --filter @moldea.ai/core typecheck
pnpm --filter @moldea.ai/cli typecheck
pnpm --filter @moldea.ai/core lint
pnpm --filter @moldea.ai/cli lint
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

The focused e2e suite must additionally execute packed CLI candidates on Windows-safe and POSIX-safe fixtures, assert exact stdout byte lengths, and compare Git state before and after every read-only command.

### `platform`

```bash
pnpm exec prettier --check README.md moldea/project.md moldea/context
pnpm exec moldea validate --json
pnpm exec moldea inspect --json
```

Run the new repository-owned documentation validator for links, byte budgets, routing, casing, and forbidden legacy wording. Do not run application, browser, database, or full platform tests for documentation-only canonical changes unless an executable package/dependency path also changes. When the CLI dependency changes, run the root package-manager lockfile check and the narrowest established CLI-dependent checks.

### `skill`

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

Also run the skill-creator `quick_validate.py` against `moldea/`, candidate tests for the packed CLI 6.0.0 artifact, and independent forward tests for the new semantic cases. Do not use `pnpm exec` in this npm-managed repository when the requested executable is not already installed; the prior attempt demonstrated that it can trigger an unintended install and workspace rewrite.

## Compatibility, migration, deployment, and rollback

- CLI schema 3 and skill 5.0.0 are intentional breaking releases. No schema-2 or skill-4 compatibility mode remains in active code.
- Core scope matching is additive and targets 2.1.0. Existing rich inspection remains because it is a current programmatic and adapter capability, not because CLI schema 2 is supported.
- Runtime adapter package versions remain unchanged unless implementation proves their public contract must change. Qualification evidence alone does not require publishing new adapter code.
- There is no database or persisted-product-data migration.
- Before registry publication, rollback is a normal commit revert on the feature branch. After an npm release, correction uses a new forward patch or major version because registry behavior may prevent reliable removal. The obsolete skill tags and matching GitHub Releases are explicitly deleted; the new 5.0.0 release is not overwritten after publication.
- Cross-repository candidate testing uses packed artifacts with recorded digests. Final lockfiles must resolve registry releases, not local paths.
- `repo push` publishes only each active branch to its unambiguous configured destination with signed, signed-off commits. It does not merge branches or publish npm packages.
- Obsolete tag and GitHub Release deletion is a separate, explicitly authorized cleanup operation after the clean skill branch commit is published. It is not performed through `repo push` and does not alter the branch ref.
- The trusted packages main-branch workflow is the only registry publication path. If CLI 6.0.0/Core 2.1.0 are not merged and published, registry-dependent skill/platform finalization remains incomplete rather than being disguised with a compatibility bridge.

## Risks and controls

- **Large repositories:** bounded pages prevent output blowups, while stable cursors preserve completeness. Existing inventory caps remain explicit; pagination does not conceal capacity errors.
- **Cursor consistency:** every cursor is bound to command, filters, schema, and snapshot. A changed repository fails clearly instead of mixing states.
- **Unicode and encoded JSON size:** measure the final UTF-8 serialization, not JavaScript string length. Content chunks end at Unicode scalar boundaries.
- **Sensitive or excessive adapter evidence:** default projections contain only allowlisted metadata and digests. Explicit `content` reads only canonical repository assets, never arbitrary adapter payloads.
- **Scope false negatives:** exact and glob matching reuse one Core implementation, direct canonical and explicit requests bypass relationship matching, and fixtures cover all manifest relationship forms.
- **Scope false positives:** an adopted repository, a shared README path, generic AI work, and durable knowledge are insufficient without an owned hunk or declared match.
- **Evaluation cost:** universal model behavior runs once; adapter profiles cover only real variance. Per-case budgets detect regressions without imposing confusing runtime failures on users.
- **Cross-platform input:** `--paths-stdin` is NUL-delimited and shell-free; parser and e2e coverage include Windows path attacks and platform-independent repository-logical paths.
- **Concurrent or unrelated worktree state:** recheck all three repositories before every review and publication step, preserve unrelated changes, and stop rather than bundle a non-cohesive state.
- **Registry ordering:** packed candidates provide development evidence, but final dependency integrity waits for trusted registry publication.

## Acceptance criteria

1. Unrelated adopted-repository tasks demonstrably abstain with zero moldea commands, reference loads, output bytes, and reporting mentions.
2. Direct canonical work, owned README hunks, explicit requests, and declared relationship matches activate deterministically and only for bounded owners.
3. Host workflows retain Git, package-manager, review, commit, and publication control; moldea consumes existing evidence without repetitive state polling.
4. CLI schema 3 is the only active JSON contract. Default `inspect` output is recursively content-free and every CLI output page is bounded to the configured byte limit.
5. Repositories larger than one page can be traversed completely through deterministic keyset cursors, with clear invalid and changed-snapshot errors.
6. Explicit `content` retrieval returns one canonical path in bounded Unicode-safe chunks and cannot escape the repository boundary.
7. Read-only CLI, skill, semantic, and qualification flows leave files, index, refs, config, submodules, and Git object database unchanged.
8. `/platform/moldea/project.md` is at most 16 KiB, focused context files are each below 64 KiB, all current normative information remains reachable, and local links pass.
9. Human-facing changed prose uses `moldea`; required technical identifiers preserve valid casing.
10. Semantic evaluation contains and passes the observed regression cases with scenario-specific command, stdout, model-visible-output, token, and latency evidence.
11. Universal qualification behavior runs once, all fourteen adapter profiles retain appropriate adapter-specific protection, and the coverage matrix plus fresh results pass.
12. Active source, scripts, fixtures, docs, website loaders, and CI contain no 4.0.0/4.0.1/4.0.2 compatibility or carry-forward machinery. Local and remote `v4.0.0`, `v4.0.1`, and `v4.0.2` tag refs are absent, and matching GitHub Releases and hosted assets are absent when the repository host exposes them through authenticated access.
13. Core 2.1.0 and CLI 6.0.0 package checks, the packages repository regression suite, packed-candidate checks, platform canonical validation, skill tests, website checks, semantic evaluation, qualifications, release identity, and final registry-dependent checks all pass.
14. Each repository change receives a read-only ready verdict, a cohesive signed and signed-off commit, and an explicit single-branch push. No unrelated protected-instruction change is bundled.

## Assumptions and current blockers

- The clean-slate requirement includes deleting the exact obsolete skill tags and matching GitHub Releases. It does not include force-rewriting shared branches, deleting unrelated package versions, or claiming that unreachable objects have been erased from provider caches or retention systems.
- The 65,536-byte default and 1,048,576-byte hard page limits are transport limits, not repository limits. They are the selected authoritative design, so no additional developer decision is pending.
- Core remains on the 2.x line because the planned public addition is compatible. Any discovered need to break Core or adapter contracts triggers autonomous plan revision before implementation of that break.
- The existing active branches and configured push destinations are the intended Git publication targets, subject to the normal `repo push` resolution checks.
- All three repository worktrees are clean on `new_skill` at the revised-plan baseline. Any later unrelated change remains outside scope and must be preserved.
- Final skill/platform lockfile validation depends on trusted publication of CLI 6.0.0 and Core 2.1.0. A feature-branch push alone cannot satisfy that external registry prerequisite.

## Execution scope

Execute the complete clean-slate redesign described above across `../packages`, `../platform`, and the current `skill` repository. Replace broad activation and schema-2 full-content output; add Core scope matching, CLI schema 3 with bounded metadata pagination and explicit content chunks, host-workflow precedence, concise canonical routing, resource-aware semantic and adapter qualification coverage, current-only release identity, and fresh evidence; remove all active 4.0.x compatibility and carry-forward machinery; delete the exact obsolete skill tags and matching GitHub Releases; and review, correct, commit, and push each coherent milestone sequentially while preserving protected instructions, unrelated worktree changes, non-force branch publication, and trusted registry publication boundaries.
