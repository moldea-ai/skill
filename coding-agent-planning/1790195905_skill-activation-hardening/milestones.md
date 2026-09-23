# Skill activation and compatibility hardening milestones

## Basis and execution boundaries

This sequence implements `coding-agent-planning/1790195905_skill-activation-hardening/plan.md`, SHA-256 `9ac728de08e12acf54a584c15b2f3e40b020198caba2f38a09bc69124177e4c4`, against baseline commit `e1ff132ea53b3c15f513fa1ad6a5e886f2ae940c`. The plan is unchanged. All four milestones are pending; implementation has not begun.

The checkpoints separate executable package compatibility, instruction-driven activation, reconciliation authority, and preparation of the combined version. Each milestone includes its required tests and directly affected documentation. Shared files receive only the changes owned by the currently authorized milestone.

Preserve these boundaries throughout:

- Keep the two-byte gate, declared relationships, strict implicit adoption, existing containment controls, and shared task budgets. Introduce no semantic activation bypass, repository-wide discovery, persistent cache, tracking file, or adoption-status format.
- Keep CLI 8.0.0, supported CLI/Core ranges, JSON schema 4, repository format 1, dependency resolutions, and workspace package versions unchanged. Add no dependencies, target-project lockfile parser, test category, package script, or CI expansion.
- Author semantic scenarios and a future native-host checklist, but run no semantic evaluations, qualification trials, or native-host journeys. This includes diagnostic, single-case, recorded, smoke, paid, and free model runs. Their execution is not an implementation-completion requirement.
- Leave release-evidence selection and candidate matching untouched. Do not run evidence preparation/selection, production website generation, or the evidence-dependent full `release:check`. Existing null selections continue to limit tagged publication; do not bypass that requirement.
- Make no platform-repository changes, installed-copy updates, protected coding-instruction edits, commits, tags, publication, or deployment. Do not inspect excluded archive/backup directories.

## Verification and review rules

Before each milestone, inspect the current worktree and confirm that its dependencies are complete and the plan remains applicable. Preserve unrelated changes. A material departure requires a revised plan before implementation continues.

Build local runtime helpers with `npm run runtime:build` before tests that consume them, rebuilding when their inputs change. This does not execute a model. Run focused checks first, then the applicable broader checks. For each milestone affecting executable behavior, tested instructions, fixtures, or public contracts, complete:

```bash
npm test
npm run typecheck
node node_modules/typescript/bin/tsc -p tsconfig.test.json --noEmit
npm run lint
npm run format:check
npm run docs:check
```

Use installed Prettier with the root configuration on exact touched source/documentation files and check those files afterward, preserving Markdown prose wrapping. Do not format unrelated files or independently format generated bundles. The root formatting script does not replace targeted checks of touched Markdown and YAML.

New tests must be co-located, use the existing Vitest categories and Node environment, remain included in test typechecking, and stay out of production artifacts. Confirm category isolation and build exclusion when adding test files. Reuse existing matching and managed-README tests; do not test instruction phrases or trusted-library behavior merely for coverage. Review error propagation and synchronize any affected documented error contracts within the owning milestone.

Reuse successful checks only while their applicable inputs remain unchanged. Triage failures before changing expectations or production behavior. Report actual checks, external blockers, and unrun platform coverage; Linux execution does not prove Windows execution. A material unresolved verification failure prevents claiming that milestone complete.

At every checkpoint, review the scoped diff, generated outputs where applicable, documentation alignment, and remaining scope; report the result and stop. Inspect protected instruction guidance without modifying it, supplying a separate handoff only if completed changes reveal a durable gap.

## Milestone 1: Installed package compatibility and metadata portability

### Objective and dependencies

Finish the executable compatibility contract and portable metadata representation, including release-maintenance consumers and generated artifacts. There are no implementation dependencies on another milestone. Keep the skill version at 5.0.10 until Milestone 4.

### Owned scope

- `src/portable/repository-package.ts`, `src/portable/index.ts`, and `src/portable/generation.ts`.
- Generated resolver and required bundled-license output under `moldea/scripts/`, produced only through the existing generator.
- `src/release/identity.ts`, including `SkillMetadataSchema`, and `src/release/updater.ts`.
- `moldea/SKILL.md`: only string representation of `cliJsonSchemaVersion` in this milestone.
- New `src/portable/repository-package.test-integration.ts` and the metadata assertions in new `src/portable/artifact.test-integration.ts`.
- Existing `src/portable/generation.test-unit.ts`, `src/release/identity.test-integration.ts`, `src/release/updater.test-unit.ts`, and `src/release/updater.test-integration.ts`.
- Compatibility/guarantee sections of `README.md`, `docs/how-it-works.md`, `docs/compatibility-and-local-tooling.md`, and `moldea/references/local-tooling.md`.

### Implementation work

1. Remove `EXPECTED_CLI_CORE_RANGE`, its export, generated comparison, updater substitutions, and superseded tests. Pass the CLI's declared Core range into the existing Core-validation path. Require a nonempty valid semver range and an installed stable Core satisfying both that declaration and `SUPPORTED_CORE_RANGE`.
2. Preserve supported root CLI declaration forms, stable CLI eligibility, installed-version envelope agreement, package identity, owned executable/entrypoints, Core minimum, nested/hoisted resolution, and repository containment. Do not read target-project lockfiles or modify dependencies during resolution.
3. Reuse installed semver and bundle its required implementation into the portable resolver. Extend existing license handling only as needed. Reject unresolved runtime package imports; inspect all generated diffs and retain byte-identical unaffected outputs.
4. In release identity/updater code, reuse `parseCompatibleStableRange` for CLI Core caret declarations with nonzero minor/patch minima. Retain the existing caret-based maintenance contract, supported-Core minimum behavior, and exact development-lock/integrity checks.
5. Change skill frontmatter to `cliJsonSchemaVersion: '4'`. Require a positive-integer string in the skill schema and explicitly convert it for internal numeric comparison. Make future updater output preserve quoted metadata. Keep JSON/CLI/evaluator numeric contracts numeric and reject malformed metadata.
6. Document precisely what the launcher verifies: installed metadata compatibility and layout. Assign lockfile consistency to installation/setup/CI; make no executable-authenticity claim. Retain current version text and installation policy.

### Tests and verification

Exercise actual filesystem package resolution and the generated launcher using harmless fixture executables. Cover eligible CLI patch/minor versions; Core declaration variations including `^4.0.1`; declaration/installed disagreement; malformed, missing, prerelease, unsupported, and below-minimum versions; missing binaries; nested/hoisted Core; and containment failures. Verify rejected closures never execute. Explicitly cover a target lock selecting 8.0.0 with compatible installed 8.0.1 as outside launcher enforcement.

Independently parse raw artifact YAML and assert every metadata value is a string, without using `SkillMetadataSchema`. Cover rejection of numeric/malformed skill schema values, preserved numeric internal identities, quoted updater output, and compatible same-major Core declaration changes. Add the entrypoint byte-size assertion in Milestone 2 alongside the entrypoint reduction.

After source changes, regenerate before checks that consume the portable resolver:

```bash
npm run portable:generate
npm run test:unit -- src/portable/generation.test-unit.ts src/release/updater.test-unit.ts
npm run test:integration -- src/portable src/release
npm run portable:check
npm run release:identity:check
```

Complete the shared verification and review rules. Verify self-contained generated execution, required notices, test discovery, and production exclusion.

### Acceptance and review checkpoint

Eligible installed CLI/Core closures work without an exact Core declaration-string restriction; incompatible or escaping closures fail before execution. Metadata is externally string-valued and internally compared numerically, including through future updater operations. Superseded constant handling is gone, exact development-release lock checks remain, and documentation matches the installed-only guarantee.

Review the compatibility acceptance/rejection boundary, generated dependency/license changes, and release identity/updater preservation before proceeding. The entrypoint size reduction and activation changes remain owned by Milestone 2.

## Milestone 2: Bounded activation, diagnostics, and context maintenance

### Objective and dependencies

Finish the compact entrypoint and its activation/maintenance procedures, with deterministic gate regressions, six scenario definitions, and honest host-verification documentation. Depends on Milestone 1's metadata and artifact-conformance foundation.

### Owned scope

- `moldea/SKILL.md` and `moldea/agents/openai.yaml`.
- `moldea/references/continuous-maintenance.md`, `moldea/references/context-gathering.md`, and `moldea/references/project-repair.md`.
- New `src/portable/relevance-gate.test-integration.ts`; the byte-size assertion in `src/portable/artifact.test-integration.ts`.
- `src/semantic/workspace/setup.ts` and new `src/semantic/workspace/setup.test-integration.ts` for this milestone's fixtures.
- `src/semantic/cases/preinit-explicit-validation/case.ts` and new `case.ts` files under `bound-context-maintenance`, `expanding-task-relevance`, `unrelated-task-expansion`, `unbound-context-discovery`, `damaged-setup-validation`, and `initialize-grounded-relationships` in `src/semantic/cases/`.
- Affected sections of `README.md`, `docs/how-it-works.md`, `docs/continuous-maintenance.md`, `docs/project-state.md`, `docs/evaluate-reconcile-validate.md`, `docs/reference-reading.md`, `docs/coding-agent-compatibility.md`, and `docs/semantic-evaluation.md`.

### Implementation work

1. Reduce the entire entrypoint to at most 8,192 UTF-8 bytes by removing duplication and placing conditional procedures in existing references. Keep all pre-miss requirements in `SKILL.md`. Make project-context maintenance visible in concise descriptions, preserving explicit initialization, direct agent intent, independent skill work, and `allow_implicit_invocation: true`.
2. Replace the task-lifetime miss rule with coverage of normalized, deduplicated host-known paths, including explicitly targeted unchanged paths and both rename endpoints. Initially gate the full known ordinary task scope. Reuse decisions for unchanged routing inputs; do not recheck for reordering, duplicates, or ordinary source edits alone.
3. Batch independently discovered uncovered paths at an existing scope-selection checkpoint before writes to that scope or read-only completion. Gate only that nonempty batch. On a hit, scope exactly that batch once and retain earlier valid owner coverage. On a miss, add no moldea work/commentary for the batch and preserve earlier maintenance obligations. Do not check after every read/tool call.
4. Recheck the full current path set only when independently observed adoption/relationship changes or unavailable/invalid coverage require it. Select new explicit operations and authorization afresh. Add no freshness polling, hashing, discovery, model-side manifest inspection, or canonical-link activation. If relevance cannot be reestablished, stop further canonical work, preserve prior changes, and report outstanding verification for already-active work without more discovery.
5. Keep routing coverage separate from semantic content freshness. Reuse valid owner identities, refresh only needed evidence, discard invalid cursors after writes, never combine snapshots, and never count failed/incomplete scope as coverage or retry an unchanged failure. Preserve the four-call CLI efficiency target, 65,536-byte pages, and 262,144-byte aggregate CLI-output budget across initial work, expansions, recovery, and final validation. No scope expansion resets a budget.
6. During already-authorized initialization, context creation, or relevant maintenance, record narrow `affectedBy` relationships only when inspected implementation evidence governs canonical facts. Keep zero relationships/agents valid. Carry selected-owner obligations through host planning and authorized implementation; update contradicted context and validate after the final write. Keep read-only plans non-mutating and retain only useful state in the host's existing handoff. A compaction summary does not replace complete instructions, authorization, or current evidence.
7. Route explicit setup validation/evaluation/inspection to shared read-only foundation diagnosis in `project-repair.md` when adoption fails or is unavailable. Read only bounded, inert excerpts from root README, `/moldea/moldea.yaml`, and `/moldea/project.md`, respecting containment/link restrictions and a combined 65,536-byte allowance. Explain missing, drifted, malformed, inaccessible, or unavailable evidence when established; otherwise report uncertainty. Do not infer no prior initialization from `0`, invoke the CLI, install, normalize, or repair under read-only authority. Explicit repair retains its prior-initialization and intended-state requirements.
8. Remove superseded one-shot/future-scope wording in the owned instructions and docs. Preserve strict silent implicit abstention, including the damaged-README case and README-linked but unbound context. Generic “use moldea” during an ordinary host task does not request a setup audit. Keep the gate executable/protocol, managed README asset/writer, and loader's automatic discovery unchanged.

### Tests and verification

Run the generated gate against real temporary repositories. Cover adoption, exact relationship hits, empty/unrelated paths, README drift, malformed input, normalization/renames, unsafe paths, bounded-file rejection, exact two-byte stdout, silent fail-closed stderr, and no repository dependency execution.

Include an initial miss followed by a matching new batch; an initial hit followed by an unrelated batch returning `0` while the combined set would return `1`; and changed declarations invalidating earlier coverage. Independently enforce the entrypoint's byte ceiling while retaining Milestone 1's metadata assertion.

Materialize all six new cases through existing setup boundaries and verify their actual evidence and gate outcomes. The expansion fixture must reveal its newly relevant path through normal work rather than initial task evidence. Update explicit pre-initialization validation to bounded diagnosis with zero CLI calls; retain generic host-plan and minimal-initialization negative controls. Definitions describe expected model behavior; fixture tests do not prove adherence.

```bash
npm run test:integration -- src/portable src/semantic/workspace/setup.test-integration.ts src/semantic/cases/loader.test-integration.ts
npm run portable:check
npm run release:identity:check
npm run eval:semantic:preflight
```

Complete shared verification. Review routes manually against the plan, without a live actor, judge, or native-host run.

### Documentation and future checklist

Synchronize activation, owner reuse, grounded relationships, diagnosis, prior-initialization evidence, handoff, and resource limits in the owned documentation. Distinguish format compatibility, installation checks, and observed native-host behavior without claiming unrun verification.

Author the future Codex/Claude Code checklist in existing compatibility/reference-reading documentation. Cover grounded initialization; implicit bound maintenance through planning, approved implementation, and compaction; miss-to-hit expansion and hit-to-unrelated expansion; unrelated/unbound context; explicit damaged-setup diagnosis followed separately by authorized repair; and upgrading a disposable installed copy before repeating relevant/unrelated requests.

Specify future recording of host/model versions and settings, exact skill/fixture identities, gate/reference/CLI traces, outcomes, and available byte/token measurements. Compare unchanged scope and newly relevant/unrelated batches; record unavailable measurements honestly. Do not execute this checklist or equate two-byte output with measured token cost.

### Acceptance and review checkpoint

The entrypoint fits the ceiling, retains essential routing, and preserves metadata conformance. Instructions admit changed task scope only through declared relationships and bounded batches; a new miss neither repeats prior scope queries nor drops obligations. Explicit damaged-setup checks are useful and read-only. Grounded relationship authoring and final context maintenance are explicit without broad backfill or invented bindings.

Review the cost boundary, invalidation/failure behavior, diagnostic authorization, and fixtures together. Missing relationships remain an accepted implicit miss; host discovery and model adherence remain unverified. Scenario definitions and the checklist are complete deliverables even though their model execution is excluded.

## Milestone 3: One identified reconciliation authority

### Objective and dependencies

Permit a specifically identified governing source to resolve a conflict while retaining the stop on unresolved authority. Depends on Milestone 2's synchronized context-gathering guidance and fixture-test foundation.

### Owned scope

- `moldea/references/evaluate-and-reconcile.md` and its reconciliation summary in `moldea/references/context-gathering.md`.
- New `src/semantic/cases/reconcile-identified-authority/case.ts` and `src/semantic/cases/reconcile-inconclusive-authority/case.ts`.
- Their fixtures and deterministic coverage in `src/semantic/workspace/setup.ts` and `src/semantic/workspace/setup.test-integration.ts`.
- Related sections of `docs/evaluate-reconcile-validate.md` and `docs/semantic-evaluation.md`.

### Implementation work

1. Preserve the ordinary comparison of the named implementation and one canonical body. Replace the blanket prohibition only with an exception for one additional bounded read of an independent governing source already identified by the task or encountered evidence before the conflict stop.
2. Require that source to explicitly settle the disputed claims and have an established governing role. Permit an accepted decision record or identified canonical owner; reject authority inferred merely from location, recency, tests, mirror agreement, or repetition.
3. Keep the read within the shared output budget. Allow no post-conflict search, resolver chain, inventory, or general audit. If absent, inaccessible, inconclusive, or disputed, state the claims and ask the focused authority question before semantic writes or further moldea calls. If resolved, make only the authorized coherent correction and final verification.
4. Add both scenario definitions and materialized evidence. Preserve `reconcile-material-ambiguity` as the existing no-resolver control. Synchronize documentation in this milestone without changing evidence formats, discovery, or evaluation protocols.

### Tests and verification

Extend setup integration coverage to confirm the identified source exists, has the intended governing/resolving content, and differs meaningfully between resolving and inconclusive fixtures. Keep discovery/definition validation real, with no model execution or assertions that fixture materialization proves judgment.

```bash
npm run test:integration -- src/semantic/workspace/setup.test-integration.ts src/semantic/cases/loader.test-integration.ts
npm run eval:semantic:preflight
```

Complete shared verification. Inspect the three authority outcomes against the instructions: identified and resolving, identified but inconclusive, and no identified resolver.

### Acceptance and review checkpoint

One established source can resolve the exact conflict without requiring the developer to repeat its decision. Inconclusive authority still stops writes and further exploration. Both definitions/fixtures and directly affected docs are complete; no semantic run is claimed.

Review the authority requirement and one-source budget exception, especially that encountering disagreement cannot initiate a search for supporting evidence.

## Milestone 4: Prepare 5.0.11 and verify the combined change

### Objective and dependencies

Prepare synchronized versioned source and finish deterministic verification of the complete change. Depends on Milestones 1–3 reaching their review checkpoints with required tests and documentation complete. This milestone does not postpone correctness work belonging to those milestones or authorize publication.

### Owned scope and implementation work

1. Set root `package.json` version to `5.0.11` and update only the top-level version and `packages[""].version` in `package-lock.json`.
2. Set `moldea/SKILL.md` metadata version to `'5.0.11'`, preserving all string metadata and the byte ceiling.
3. Synchronize current-version text/pinned examples in `README.md`, `docs/getting-started.md`, and `docs/compatibility-and-local-tooling.md`, plus the authoritative release sentence in `moldea/references/local-tooling.md`. Preserve its artifact-identity format and the existing installation-default policy.
4. Review the combined scoped diff for required removals, documentation alignment, generated imports/notices, error contracts, portable paths, and test/build boundaries. Confirm no dependency graph, integrity, workspace version, historical evidence identity, selection, or CI change slipped in. Do not run `release:update-cli`, reinstall dependencies, or regenerate the lock graph.

### Tests and verification

Check the exact version fields and known documentation references directly. Build current runtime helpers when required, then run the plan's focused final checks on the combined artifact:

```bash
npm run test:unit -- src/portable/generation.test-unit.ts src/release/updater.test-unit.ts
npm run test:integration -- src/portable src/release src/semantic/workspace/setup.test-integration.ts src/semantic/cases/loader.test-integration.ts
npm run portable:check
npm run release:identity:check
```

Complete the shared broader commands and these remaining boundary checks, reusing earlier results only when their applicable inputs are unchanged:

```bash
npm run qualification:test
npm run eval:semantic:preflight
npm run website:check
```

`qualification:test` runs synthetic tooling correctness tests, not qualification trials. `eval:semantic:preflight` loads definitions and computes identities/counts without an actor or judge. Root `npm test` includes website end-to-end checks; `website:check` uses synthetic evidence for build/rendering checks. None authorizes model execution or changes release selections.

Verify the final entrypoint size, all-string metadata, current-version agreement, unchanged dependency resolutions, and absence of test code from runtime artifacts. Report Windows/supported-Node checks only if actually executed; do not expand CI or imply portability evidence from local Linux alone.

### Acceptance and review checkpoint

Version 5.0.11 is synchronized across the exact planned identity fields and documentation. All in-scope implementation, eight new scenario definitions, the updated pre-initialization case, fixture/gate/package regressions, and the future checklist are complete. Applicable deterministic checks pass, with any genuine external blocker reported without a readiness claim.

The completion report identifies changed files/docs, executed checks/results, protected-instruction guidance status, and the absence of migrations. It explicitly states that semantic evaluations, qualification trials, and native-host journeys were not run by design. It claims neither measured token savings, verified host reliability, production certification, publication, nor successful evidence-dependent tagged CI.

Review the final source/version diff and verification evidence. Rollback remains restoring the previous skill source, corresponding generated artifacts, and version/documentation metadata through the normal reviewed workflow; no user-project data migration is involved. Stop after this checkpoint.

## Approval required

Approve this plan and four-milestone sequence: installed package compatibility and metadata; bounded activation, diagnostics, and context maintenance; identified reconciliation authority; and preparation/verification of 5.0.11.

Under the supplied `AGENTS.md` breakdown workflow, approval of the sequence alone does not authorize implementation. Explicitly authorize one milestone by number or name; sequence approval may be combined with authorization for that one milestone. Each milestone ends at its review checkpoint, and starting the next requires separate authorization.

Only the planned implementation, deterministic tests, scenario/checklist authoring, and directly affected documentation are included. Semantic evaluations, qualification trials, native-host journeys, release-evidence changes, platform/installed-copy changes, commits, tags, publication, and deployment remain excluded. Implementation has not begun.
