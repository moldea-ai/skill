# Mock-run findings: focused package and skill fixes

## Objective and boundaries

Correct the two demonstrated package defects and clarify the skill route implicated by Incident Desk. Publish the corrected packages and skill before changing `moldea-mock-project-private`.

Implement one clean final behavior. Add no legacy branches, compatibility shims, alternate output formats, migration scaffolding, or deprecated replacement APIs. The platform has not launched and its database tables do not exist; this task requires no platform or database changes.

Keep the solutions within existing modules and tooling. Preserve silent, inexpensive handling of unrelated work and keep `SKILL.md` small. Do not add dependencies, broaden discovery, redesign adapters, or turn every model call into a separate canonical agent.

Excluded from this plan:

- Model-backed semantic evaluations, adapter qualifications, live provider calls, and platform testing.
- Mock-repository changes, evidence storage, public evidence publication, and a third website evidence category.
- Repairs to completed mock projects, changes to historical run evidence, or unrelated cleanup.
- Protected coding-instruction files and files beneath the excluded archive/backup directories.

The later mock-repository plan must use `gpt-6-sol` at `xhigh` throughout all actor turns and follow-ups, retain deviations explicitly, and exercise focused context creation, use, and maintenance. Those are follow-on requirements, not implementation work in this plan.

## Current evidence

Planning inspected both root READMEs, the affected implementations and tests, package manifests, release tooling, and CI definitions. Both development worktrees were clean at initial inspection. At this revision, their HEAD commits remain unchanged, the skill repository contains only the new planning directory, and the packages worktree remains clean. Implementation has not started:

- Skill repository: `/home/jesusgraterol/Documents/projects/moldea/skill`, commit `3cb8ddcec24b13dc1d71310b6d40b92868b9298f`, skill `6.0.0`.
- Packages repository: `/home/jesusgraterol/Documents/projects/moldea/packages`, commit `9c3355b0385ad43ccb48942952054781a4de3e60`, Core `5.0.0`, CLI `9.0.0`.
- Development runtime: Node.js `24.15.0`; packages use pnpm `11.9.0`, while the skill uses its npm workspace.
- The current public contracts are repository format 1 and CLI JSON schema 5.

The completed audit covered fourteen attempts. All installed skill artifacts matched the distributed release, and fresh validation of all thirteen adopted projects returned zero diagnostics. That structural result did not establish behavioral completeness.

Three findings determine this scope:

1. **Core count defect:** `projects/core/src/project-metadata/index.ts:createProjectSummary` counts only `project.unresolved`. Agent-owned declarations remain available through the index and scope matching but disappear from the aggregate. Harbor Supply has four agent-owned requirements while inspection reports zero.
2. **CLI input defect:** `scope` forwards decoded path strings to Core without checking their logical-path grammar. A relative path causes `RepositoryPathException` and is presented as `INTERNAL_ERROR`. Both stdin and `--path` reproduce this; leading-slash paths succeed.
3. **Observed routing failure:** Incident Desk loaded the skill, treated model-assisted classification and briefing as ordinary implementation, received relationship misses, and left the model responsibilities outside canonical agent ownership. This proves a routing miss, not that wording alone caused it. The existing direct route says “genuine AI-agent work,” while ordinary SDK work is excluded.

The skill entrypoint currently measures 8,182 UTF-8 bytes against its existing 8,192-byte ceiling. Existing agent-design guidance already covers canonical instruction provenance and real runtime relationships.

The CLI updater copies the existing lockfile and installs the requested CLI version; it does not independently request an update of every satisfying transitive dependency. The current lock selects Core `5.0.0`, which remains eligible under the CLI's `^5.0.0` declaration. Installed npm `11.12.1` supports a named transitive update with `--package-lock-only --save=false`: it refreshes the lock without adding a direct dependency or rewriting manifest ranges. The release sequence below explicitly refreshes Core before the updater generates artifacts, then verifies the installed CLI's actual composition.

## Desired behavior and acceptance criteria

### Complete unresolved totals

The existing `unresolved` count includes every project-owned and agent-owned requirement, across all effects. Identical requirement IDs under different owners count separately because their identities are owner-scoped.

The count is identical wherever the shared summary reaches public Core validation, prepared inspection, and CLI inspection. It describes declarations, not validation failures. A structurally valid project may still contain blocking readiness requirements.

No new records, fields, severity policy, or readiness endpoint is introduced.

### Actionable invalid scope input

Both `scope --path` and `scope --paths-stdin` reject invalid repository-logical paths before repository discovery. They return the existing `cli:PATH_INPUT_INVALID` contract, status `error`, exit code `3`, and a null result.

Use this single stable message:

> The scope path input is invalid. Use leading-slash repository-logical paths and NUL-delimited UTF-8 on stdin.

The error contains no rejected input, host path, stack, or underlying cause. Human and JSON presentation use the same registry entry.

Valid leading-slash paths, Unicode paths, empty stdin, existing framing/resource limits, and normal relevance results retain their intended behavior. Relative paths are rejected rather than silently normalized. The skill gate continues accepting Git-relative spellings under its separate established contract.

### Clear model-work routing without broader activation

Replace the ambiguous portion of route 5 with concise wording explicitly including model instructions and responsibilities in one-shot calls and workflows. Preserve established facts, approved policies, clear corrections, context questions, adoption requirements, and write-authority boundaries.

Generic SDK maintenance and ordinary deterministic implementation remain relationship-gated. A miss stays silent and does not justify inspecting unknown canonical context.

Keep the completed entrypoint at or below its current 8,182 bytes, without deleting material safeguards or raising the existing test ceiling. Leave the frontmatter trigger, host metadata, gate implementation, command/output budgets, and reference-loading architecture unchanged. The incident occurred after selection, so this fix targets routing rather than host discovery.

Registration follows existing responsibility and runtime guidance. It does not require a separate agent for each call or force unsupported adapter patterns into verified bindings.

### Release completion

Publish Core `5.0.1`, CLI `9.0.1`, and skill `6.0.1` through the established release paths, subject to checking that those exact versions remain available before preparation. If another release occupies one, stop and reconcile the plan rather than overwrite a tag or silently substitute a version.

The skill's development lockfile and release fixture must resolve the newly published CLI and corrected Core. Verify that exact installed composition; a manifest declaration alone is insufficient.

No new semantic or qualification results are claimed. Both evidence selections remain null, and production evidence requirements are not weakened.

## Implementation ownership

All package paths below are relative to the packages repository; skill paths are relative to the skill repository.

### Core

Modify:

- `projects/core/src/project-metadata/index.ts`: aggregate project-level requirements plus each indexed agent's `declaration.unresolved`, treating an absent mapping as empty.
- `projects/core/src/contracts/index.ts`: document the aggregate meaning on `IProjectSummaryCounts.unresolved`.
- `projects/core/src/project-inspection/index.test-integration.ts`: exercise the real Core validation and prepared-inspection paths with in-memory repositories.
- `projects/core/docs/repository-inspection.md`: state which owners and effects the total includes and distinguish structural validity from readiness.

Keep `IMoldeaProjectIndex.unresolved` project-owned. Do not flatten or duplicate agent declarations in the index. Both validation and inspection already consume `createProjectSummary`; fix that owner once.

The algorithm is linear in the indexed agents and their requirement declarations. It uses already loaded state, adds no repository reads, and needs no cache or persistent intermediate collection.

### CLI

Modify:

- `projects/cli/src/cli-execution/command-executor.ts`: after selecting and decoding either input mode, check every supplied path with the existing public `isRepositoryPath` predicate from `@moldea.ai/repository`. Return the existing owned error before working-tree discovery on failure.
- `projects/cli/src/presentation/constants.ts`: replace the stdin-only error message with the stable message above.
- `projects/cli/src/project-scope/paths.ts`: synchronize its reachable `@throws` message; retain ownership of byte framing and UTF-8 decoding.
- `projects/cli/src/project-scope/exception.ts`: make the exception description cover scope input rather than only stdin.
- `projects/cli/src/cli-execution/command-executor.test-unit.ts`: verify input rejection and absence of downstream discovery, snapshot, adapter, and scope execution.
- `projects/cli/src/operational-error/mapper.test-unit.ts`: synchronize the expected owned message while retaining the unexpected-internal-exception test.
- `projects/cli/src/bin/index.test-e2e.ts`: verify real installed executable behavior for both input modes and corrected inspection totals.
- `projects/cli/README.md`, `projects/cli/docs/commands.md`, and `projects/cli/docs/output-and-operations.md`: synchronize logical-path requirements, aggregate inspection counts, and the canonical error entry.

Do not globally map every `RepositoryPathException` to user input. Existing tests deliberately classify unexpected internal instances as internal failures. Validate at the known user-input boundary instead.

Reuse the existing error code, renderer, exception family, and path predicate. Add no parser abstraction or duplicated grammar. Trace the changed message through stdin decoding, command execution, runner handling, presentation, documentation, and tests; update affected documented boundaries together.

Validation is a linear pass over the already bounded input. It adds no I/O or cache and avoids repository work for malformed paths.

### Skill instructions and regression cases

Modify:

- `moldea/SKILL.md`: replace the route-5 wording within the current byte size.
- `README.md` and `docs/how-it-works.md`: clarify the same model-work boundary in existing activation prose, without creating another workflow.
- `src/semantic/workspace/setup.ts` and `setup.test-integration.ts`: extend the existing fixture setup for the cases below.

Add:

- `src/semantic/cases/model-workflow-routing/case.ts`: an adopted project with unbound model responsibilities, requested naturally as a classifier/briefing workflow without telling the actor to invoke moldea.
- `src/semantic/cases/unrelated-sdk-maintenance/case.ts`: ordinary SDK-adjacent utility maintenance with no declared relationship and no change to model instructions or responsibilities.

Use the existing case loader, claim IDs, disposable setup, and controlled provider boundary. No new evaluation framework or SDK dependency is needed. The positive fixture must supply enough concrete behavior for canonical ownership and instruction provenance; it must not preload the correct route or a preexisting matching relationship. The negative fixture must permit useful ordinary work while canonical state remains untouched.

The positive grading criteria cover canonical instruction consumption, evidenced relationships, bounded reads, and honest unresolved limitations. The negative criteria require silence and no canonical work. Attach them to the existing `agent-and-skill-design`, `bounded-relevance`, and `activation-abstention` claims as applicable.

Deterministic fixture tests must establish adoption, the initial relationship miss, fixture executability, and relevant evidence declarations. These tests validate scenario construction; they cannot prove the host selects the correct route. Do not add phrase-matching tests that purport to establish semantic correctness.

### Release-owned files

In packages:

- Bump `projects/core/package.json` and `projects/cli/package.json`.
- Update assertions that intentionally name the current built package versions, including `projects/core/src/index.test-integration.ts`, `projects/cli/src/bin/index.test-fixtures.ts`, and `projects/cli/src/bin/index.test-e2e.ts`.
- Synchronize `pnpm-lock.yaml` only where release preparation changes its resolved metadata. Do not rewrite unrelated version fixtures or bump unchanged adapters.
- Retain the existing single-major dependency declarations and format/schema identities. These fixes require no parallel behavior for older releases.

After confirming npm publication, perform these steps in order in the skill repository:

1. Run `npm update @moldea.ai/core --package-lock-only --ignore-scripts --save=false`. Require the refreshed lock to select Core `5.0.1`; inspect the diff and confirm that package manifests are unchanged and no direct Core dependency, override, or unrelated dependency upgrade has been introduced. The named update resolves within existing ranges; if it selects a different Core release, stop and reconcile the release identity before proceeding.
2. Run `npm run release:update-cli -- 9.0.1`. The existing updater updates the exact CLI dependency, lockfile, semantic CLI fixture, and conformance identities, then installs that updated lock in its temporary workspace and generates the portable artifacts. Confirm its resulting lock still selects Core `5.0.1` and CLI `9.0.1`.
3. Run `npm ci --ignore-scripts` to install that final lock in the working checkout. This installs the selection; it is not the Core refresh step.
4. Run launcher-backed `composition --json` and require exit `0`, status `valid`, `error: null`, schema `5`, `cliVersion: 9.0.1`, and the `@moldea.ai/core` entry in `result.packages` at `5.0.1`. This checks the Core actually resolved by the CLI, including a nearest nested installation, rather than assuming the root package is the active one. Then run `npm run portable:check` against the installed final closure before conformance testing.
5. Set skill version `6.0.1` consistently in `package.json`, root lock metadata, `moldea/SKILL.md`, `README.md`, `docs/getting-started.md`, `docs/compatibility-and-local-tooling.md`, `moldea/references/local-tooling.md`, and `docs/release-evidence.md`.
6. Refresh and review `qualification/compatibility/snapshot.json` using the existing compatibility updater only when the published catalog identity requires it. This is metadata synchronization, not a qualification run.

The package manager owns the targeted Core lockfile refresh. The existing CLI updater owns changes to `fixtures/tooling/semantic-cli/package.json`, `fixtures/conformance-cases.json`, and generated `moldea/scripts/` files. Inspect the combined diff and retain only changes required by the published package identity. Do not hand-edit generated scripts, add a direct Core dependency or override, redesign the updater, or expand launcher eligibility policy. If installation, composition, or generated-artifact verification fails, stop release preparation and resolve the mismatch before testing or publication; do not certify artifacts generated from another closure.

## Ordered work and review checkpoints

1. **Correct the package behavior and its contracts.** Implement the shared Core total and CLI input guard, add the focused regressions, synchronize documentation, and prepare package versions. Review the public count semantics, error outcome, resource bounds, and absence of repository access for bad input.
2. **Verify and publish packages.** Complete affected-package checks and the existing repository release boundary. Publish reviewed development changes through the established PR/main workflow. Confirm Core publication before dependent CLI publication, immutable package tags, successful workflow completion, and the registry artifacts.
3. **Clarify and prepare the skill.** Apply the bounded routing replacement and scenario coverage. Refresh Core in the lockfile, run the existing CLI updater and its temporary locked generation, install the resulting lock locally, verify the CLI-resolved Core and generated artifacts, and synchronize version/documentation state in the release sequence above. Review the exact installed CLI/Core composition, entrypoint size, negative activation boundary, and generated-artifact diff.
4. **Verify and publish the skill.** Complete deterministic conformance and required website checks, merge the reviewed release through the existing workflow, create immutable `v6.0.1`, and publish release notes accurately describing the fixes and assurance limits. Require tag CI and installed-artifact byte comparisons to pass.
5. **Hand off the next stage.** Report package versions, skill tag/commit, completed verification, and remaining behavioral uncertainty. Stop before changing the private mock repository. Its storage and next-run changes require the subsequent plan.

These are strategic dependencies and review checkpoints, not an independently executable milestone breakdown. Recheck worktree state before edits and preserve unrelated changes. Commits must be signed and signed off under the repository instructions.

## Verification

No tests, dependency installations, generators, or release operations are executed by this planning command.

### Focused correctness

Core integration coverage must include no requirements, project-only requirements, agent-only requirements reproducing Harbor's four-item case, mixed owners, repeated IDs across owners, and all three effects. Verify equal totals through `validateProject` and prepared inspection, stable totals across inspection pages, and unchanged validity/diagnostics for structurally valid declarations.

CLI coverage must include relative paths through both modes, a mixed valid/invalid stdin batch, traversal and Windows spellings, valid Unicode/root-logical paths, malformed UTF-8/NUL framing, existing entry/byte limits, and empty stdin. Assert the exact safe error envelope, exit code, human message, and no partial success. Keep the generic internal-error control. Real installed-package tests must reproduce both the bad-input failure and successful corrected input while preserving repository/Git state, and confirm an agent-owned unresolved count reaches CLI inspection.

Use existing colocated test files and category scripts. Retain current production-test exclusion and avoid creating new test categories.

### Commands

From the packages repository, build the dependency closure before focused checks:

```bash
pnpm exec turbo run build --filter @moldea.ai/cli...
pnpm --filter @moldea.ai/core test:integration -- src/project-inspection/index.test-integration.ts
pnpm --filter @moldea.ai/cli test:unit -- src/cli-execution/command-executor.test-unit.ts src/operational-error/mapper.test-unit.ts src/project-scope/paths.test-unit.ts
pnpm --filter @moldea.ai/cli test:e2e -- src/bin/index.test-e2e.ts
pnpm --filter @moldea.ai/core test
pnpm --filter @moldea.ai/cli test
```

The existing release boundary additionally requires:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm compatibility:check
pnpm docs:check
pnpm upstream:check
```

Use `pnpm release:check-changes <base-commit> <candidate-commit>` with the actual immutable PR base and committed candidate. Require existing CI's supported-Node, Windows/macOS/Linux, packed-consumer, and checksum checks. Reuse successful checks for unchanged exact inputs; do not repeat a completed release boundary merely for extra confidence.

From the skill repository, prepare the published package closure in this order. Inspect the lock and manifest diff after the first two commands as required above. The launcher command uses this checkout's established absolute repository root:

```bash
npm update @moldea.ai/core --package-lock-only --ignore-scripts --save=false
npm run release:update-cli -- 9.0.1
npm ci --ignore-scripts
node moldea/scripts/moldea-cli.mjs --repository /home/jesusgraterol/Documents/projects/moldea/skill -- composition --json
npm run portable:check
```

Require the exact composition facts above before continuing. After completing skill-version and documentation synchronization, run:

```bash
npm run runtime:build
npm run portable:check
npm run test:integration -- src/portable/artifact.test-integration.ts src/semantic/workspace/setup.test-integration.ts src/semantic/cases/loader.test-integration.ts src/release/identity.test-integration.ts
npm test
npm run qualification:test
npm run typecheck
npm run lint
npm run format:check
npm run qualification:lint
npm run qualification:format:check
npm run qualification:compatibility:check
npm run path:check
npm run docs:check
npm run website:check
npm run release:identity:check
```

`qualification:test` runs synthetic deterministic correctness tests. It does not run adapter qualification actors. Do not invoke `eval:semantic`, qualification execution commands, `release:check` requiring selected evidence, or a production website deployment.

Format only task-owned files with the installed Prettier and repository configuration. Audit changed error documentation and `@throws` entries in both directions. All searches and recursive verification must respect the archive/backup exclusions; use supported exclusion options or narrower verified scopes rather than reading excluded content.

Require the existing tagged installation checks to compare the published skill's bytes with the release tree. Report checks that cannot run and their exact limitations; synthetic tests and current-host execution do not substitute for paid behavioral or other-platform evidence.

## Risks, publication, and recovery

The count and input failures have deterministic reproductions. The routing correction remains a hypothesis to test in the next real mock run; model variance and post-compaction behavior remain unproven. Release notes must not describe the skill as behaviorally qualified.

No persistence shape, database schema, API field set, or CLI JSON schema changes. Remove the superseded root-only calculation, stdin-only message, and ambiguous routing wording in place. Retain no alternate implementation or obsolete promise for them.

Package publication and Git tags are immutable. Before publication, normal review can revise the candidate. After publication, correct any newly demonstrated defect with a new patch release; never move a tag or overwrite package contents. Stop dependent publication if an upstream release or required check fails.

Registry propagation, credentials, workflow permissions, or concurrent releases may block publication; these are operational prerequisites to verify at execution time, not reasons to add fallback installers or bypass checks. Routine dependency restoration is permitted during implementation and release preparation.

Use the existing compatible-major dependency contract without widening or tightening it in this fix. The explicit named Core lockfile refresh prevents a satisfying but unfixed `5.0.0` selection from surviving CLI preparation. Verify both the final lock and installed composition at Core `5.0.1` and CLI `9.0.1`; existing client installations receive package updates through their package manager, not through hidden launcher mutation. A different resolved version requires release-identity reconciliation before proceeding, not a silent version substitution.

No protected coding-instruction change is currently justified. The existing instructions already cover the relevant durable guidance.

## Approval required

Approve the two package fixes, the concise skill-routing clarification and focused regression cases, their directly affected documentation and release identity updates, the targeted Core lockfile refresh and installed-composition verification, and publication of Core `5.0.1`, CLI `9.0.1`, then skill `6.0.1` after required deterministic checks. No model-backed evaluations or qualifications will run. Mock-repository, platform, database, and third-evidence website work remain outside this implementation scope.
