# Mock-run fixes: implementation milestones

## Basis and execution boundaries

This sequence implements `coding-agent-planning/1790548762_mock-run-fixes/plan.md`, SHA-256 `38bff40d73a8f27435bc9abd7e83aee189c11804a468f63178d8e045a2536371`.

Both development HEADs still match the plan: skill `3cb8ddcec24b13dc1d71310b6d40b92868b9298f` and packages `9c3355b0385ad43ccb48942952054781a4de3e60`. Implementation has not started. All four milestones are pending, and neither the plan nor this sequence has been approved for implementation.

Package paths refer to `/home/jesusgraterol/Documents/projects/moldea/packages`; skill paths refer to `/home/jesusgraterol/Documents/projects/moldea/skill`.

Apply these boundaries throughout:

- Implement one clean final behavior in existing owners. Add no dependencies, legacy branches, compatibility shims, alternate formats, migration scaffolding, or unrelated cleanup. Preserve repository format 1, CLI JSON schema 5, and existing compatible-major dependency ranges.
- Run no model-backed semantic evaluations, adapter qualification actors, live provider calls, or platform tests. Synthetic deterministic qualification tests remain in scope. Keep both evidence selections null and preserve production evidence requirements.
- Make no platform, database, mock-repository, historical-run, evidence-storage, public-mirror, or third-evidence website changes. Do not deploy the production website.
- Preserve unrelated work, protected coding-instruction files, and the archive/backup content exclusions. Use exclusion-capable verification or narrower verified scopes. Routine dependency restoration is permitted during authorized execution.
- Format only task-owned files using installed tooling. Keep required tests and documentation with their implementation. Audit changed error contracts and reachable `@throws` entries in both directions.
- Reuse successful verification only for unchanged applicable inputs. Report blocked checks and assurance limits; never substitute synthetic tests for model behavior or local execution for other-platform evidence.
- Each milestone requires its own explicit implementation authorization. Finish its acceptance criteria and review checkpoint, report the result, and stop before the next milestone.

## Milestone 1: Prepare and verify the package fixes

**Objective:** Produce a complete, locally verified Core `5.0.1` and CLI `9.0.1` release candidate containing both demonstrated fixes.

**Dependencies:** Approval of the plan and milestone sequence, plus explicit authorization for Milestone 1. Confirm the proposed package versions remain unpublished before preparing them; stop for reconciliation if either is occupied.

**Owned files in packages:**

- Core implementation and contract: `projects/core/src/project-metadata/index.ts`, `projects/core/src/contracts/index.ts`.
- Core tests and documentation: `projects/core/src/project-inspection/index.test-integration.ts`, `projects/core/src/index.test-integration.ts`, `projects/core/docs/repository-inspection.md`.
- CLI implementation and error contract: `projects/cli/src/cli-execution/command-executor.ts`, `projects/cli/src/presentation/constants.ts`, `projects/cli/src/project-scope/paths.ts`, `projects/cli/src/project-scope/exception.ts`.
- CLI tests: `projects/cli/src/cli-execution/command-executor.test-unit.ts`, `projects/cli/src/operational-error/mapper.test-unit.ts`, `projects/cli/src/bin/index.test-e2e.ts`, `projects/cli/src/bin/index.test-fixtures.ts`.
- CLI documentation: `projects/cli/README.md`, `projects/cli/docs/commands.md`, `projects/cli/docs/output-and-operations.md`.
- Release manifests: `projects/core/package.json`, `projects/cli/package.json`, and `pnpm-lock.yaml` only where preparation requires resolved-metadata synchronization.

**Implementation:**

1. Change `createProjectSummary` to count project-owned requirements plus every indexed agent's `declaration.unresolved`, treating absent mappings as empty. Count repeated IDs separately across owners and include all effects. Preserve the project-only meaning of `IMoldeaProjectIndex.unresolved` and existing structural validity. Use already loaded state, linear traversal, no new repository reads, and no cache or duplicated index.
2. In CLI command execution, validate every decoded path from either input mode with the public `isRepositoryPath` predicate before repository discovery. Return the existing `cli:PATH_INPUT_INVALID` contract without partial execution. Preserve the framing/UTF-8 decoder and the generic internal-error handling of unexpected `RepositoryPathException` instances.
3. Use this stable error message in human output, JSON presentation, documentation, and affected `@throws` entries: “The scope path input is invalid. Use leading-slash repository-logical paths and NUL-delimited UTF-8 on stdin.” Require exit `3`, status `error`, a null result, and no rejected input, host path, stack, or cause in the public error.
4. Preserve valid leading-slash and Unicode inputs, empty stdin, resource limits, and ordinary relevance behavior. Reject relative paths without normalization; do not change the skill gate's separate Git-relative contract.
5. Add the focused regressions and synchronize current-state documentation. Bump Core and CLI patch versions and only their intentional current-version assertions. Do not bump unchanged adapters or rewrite unrelated version fixtures.

**Verification:**

- Exercise real Core validation and prepared inspection for zero, project-only, agent-only, and mixed requirements; reproduce Harbor's four agent-owned requirements; include repeated IDs across owners and all three effects. Require equal totals across validation, inspection, and inspection pages with unchanged structural validity and diagnostics.
- Cover relative paths in both CLI modes, mixed valid/invalid stdin, traversal and Windows spellings, valid Unicode/root-logical paths, malformed UTF-8/NUL framing, entry/byte limits, and empty stdin. Verify the exact safe error, absence of discovery/snapshot/adapter/scope work, and the existing generic internal-error control.
- Through the real installed executable, verify both rejected and corrected inputs, repository/Git state preservation, and agent-owned totals reaching CLI inspection.
- Keep tests colocated in existing categories and retain production-test exclusion. Format touched files, review the full affected diff, and complete the error/documentation audit.

Run from packages:

```bash
pnpm exec turbo run build --filter @moldea.ai/cli...
pnpm --filter @moldea.ai/core test:integration -- src/project-inspection/index.test-integration.ts
pnpm --filter @moldea.ai/cli test:unit -- src/cli-execution/command-executor.test-unit.ts src/operational-error/mapper.test-unit.ts src/project-scope/paths.test-unit.ts
pnpm --filter @moldea.ai/cli test:e2e -- src/bin/index.test-e2e.ts
pnpm --filter @moldea.ai/core test
pnpm --filter @moldea.ai/cli test
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm compatibility:check
pnpm docs:check
pnpm upstream:check
```

**Acceptance criteria:** Both defects are corrected through their public boundaries, focused and broader local checks pass, contracts and documentation agree, and the complete package candidate is ready for review. No package publication or skill implementation occurs in this milestone.

**Review checkpoint:** Inspect aggregate count semantics, malformed-input ordering and safe errors, real executable coverage, unchanged supported ranges/schema, and the minimal version/documentation diff. Stop for review before publication.

## Milestone 2: Publish the corrected packages

**Objective:** Make verified Core `5.0.1` and CLI `9.0.1` registry artifacts available for skill preparation.

**Dependencies:** Milestone 1 complete, its review findings resolved, and explicit authorization for Milestone 2. Registry access, signing, and release-workflow permissions must be available.

**Owned scope:** Publication of the exact package candidate from Milestone 1 through the existing development/PR/main workflow, package release tags, registry artifacts, and existing CI. No new production implementation or release infrastructure is introduced.

**Execution and verification:**

1. Recheck candidate identity, worktree state, and version availability. Inspect the exact publication scope and use signed, signed-off commits under the repository workflow. Preserve unrelated changes; do not bypass conflicts, unresolved review findings, or required verification.
2. Run `pnpm release:check-changes <base-commit> <candidate-commit>` with the actual immutable PR base and committed candidate. Reuse Milestone 1 checks only while their inputs match; changes require the affected checks again.
3. Complete the established PR/main release path and require the existing supported-Node, Windows/macOS/Linux, packed-consumer, and checksum checks. Confirm Core publication before dependent CLI publication and wait for successful release workflow completion.
4. Verify the published versions and immutable tags against the intended commits and registry artifacts. Stop dependent publication on any upstream or required-check failure. Never move a tag or overwrite a published version; a newly demonstrated post-publication defect requires a new patch and plan reconciliation.

**Acceptance criteria:** Both package releases are available, their identities and required CI results are confirmed, and publication evidence is recorded for the skill milestone. No skill or mock-repository files have been changed.

**Review checkpoint:** Report release commits/tags, package versions, registry verification, CI results, and any limits. Stop before preparing the skill.

## Milestone 3: Prepare and verify the skill release

**Objective:** Produce a complete skill `6.0.1` candidate with concise model-work routing, focused scenario coverage, and the verified corrected CLI/Core installation.

**Dependencies:** Milestone 2 complete and explicit authorization for Milestone 3. Confirm skill version/tag `6.0.1` remains available before preparation; stop for reconciliation if occupied.

**Owned files in skill:**

- Routing and documentation: `moldea/SKILL.md`, `README.md`, `docs/how-it-works.md`.
- Scenario setup and tests: `src/semantic/workspace/setup.ts`, `src/semantic/workspace/setup.test-integration.ts`.
- New scenarios: `src/semantic/cases/model-workflow-routing/case.ts`, `src/semantic/cases/unrelated-sdk-maintenance/case.ts`.
- Release identity: `package.json`, `package-lock.json`, `docs/getting-started.md`, `docs/compatibility-and-local-tooling.md`, `moldea/references/local-tooling.md`, `docs/release-evidence.md`, and the version fields in the already-listed entrypoint and README.
- Updater-owned outputs: `fixtures/tooling/semantic-cli/package.json`, `fixtures/conformance-cases.json`, generated `moldea/scripts/` artifacts, and existing updater-managed release identity references.
- `qualification/compatibility/snapshot.json` only when the published catalog identity requires refreshing it with the existing compatibility updater.

**Implementation:**

1. Replace the ambiguous route-5 wording with concise inclusion of model instructions and responsibilities in one-shot calls and workflows. Keep `SKILL.md` at or below 8,182 UTF-8 bytes without removing material safeguards or raising the 8,192-byte test ceiling. Preserve frontmatter trigger wording, host metadata, gate mechanics, budgets, and focused reference loading.
2. Preserve direct handling of established facts, approved policies, clear corrections, and context questions with existing adoption/write-authority boundaries. Keep ordinary SDK maintenance and deterministic implementation relationship-gated, silent on misses, and without unknown-context discovery. Retain existing responsibility/runtime guidance rather than requiring an agent per model call or unsupported verified bindings.
3. Add the positive model-workflow and negative SDK-maintenance scenarios using the existing loader, claim IDs, disposable setup, and controlled provider boundary. The positive fixture supplies concrete model responsibilities and instruction-provenance evidence without preloading the route or a matching relationship. The negative permits useful ordinary work while canonical state remains untouched. Reuse `agent-and-skill-design`, `bounded-relevance`, and `activation-abstention` claims as applicable.
4. Require positive grading to address canonical instruction consumption, evidenced relationships, bounded reads, and honest unresolved limitations; require negative grading to address silence and no canonical work. Add deterministic fixture checks for adoption, the initial relationship miss, executability, and evidence declarations. Do not use phrase-matching tests as proof of routing reliability.
5. Synchronize the affected activation documentation and prepare the published dependency closure in the exact order below. Preserve the existing dependency ranges, launcher eligibility policy, and generator ownership.

Run from skill, inspecting the lock and manifest diff after each of the first two commands:

```bash
npm update @moldea.ai/core --package-lock-only --ignore-scripts --save=false
npm run release:update-cli -- 9.0.1
npm ci --ignore-scripts
node moldea/scripts/moldea-cli.mjs --repository /home/jesusgraterol/Documents/projects/moldea/skill -- composition --json
npm run portable:check
```

The named update must select Core `5.0.1` without modifying manifests, adding a direct Core dependency/override, or upgrading unrelated dependencies. The existing CLI updater then selects CLI `9.0.1`, retains Core `5.0.1`, synchronizes its fixtures/identities, installs that lock in its temporary workspace, and generates the portable artifacts. Local `npm ci` installs the resulting lock; it is not the refresh step.

Require launcher composition exit `0`, status `valid`, `error: null`, schema `5`, `cliVersion: 9.0.1`, and the CLI-resolved `@moldea.ai/core` entry in `result.packages` at `5.0.1`, including nearest nested resolution. Stop on another resolved version or an installation/composition/artifact mismatch; reconcile it before continuing. Do not hand-edit generated scripts or redesign the updater.

Set skill version `6.0.1` consistently across the owned release identity files. Refresh the compatibility snapshot only when required by the published catalog and inspect its diff; this is metadata synchronization, not an actor qualification.

**Verification:**

Review the complete diff for preserved activation/authorization boundaries, entrypoint bytes, fixture realism, exact lock/installed composition, generated artifacts, version consistency, and documentation state. The deterministic fixtures establish scenario construction only; routing reliability remains for the next mock run.

After release identity synchronization, run:

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

`qualification:test` is synthetic deterministic verification. Do not run `eval:semantic`, qualification execution, `release:check` requiring selected evidence, or production website deployment. Retain existing test categories and production-test exclusion.

**Acceptance criteria:** The complete skill candidate passes the required deterministic checks, contains the exact corrected package installation and consistent release identity, preserves silent unrelated behavior in its instruction contract, and stays within its original entrypoint size. Both evidence selections remain null. No skill publication occurs yet.

**Review checkpoint:** Inspect the routing replacement and paired cases, unchanged relevance/write boundaries, dependency and generated-artifact diff, assurance limits, and release documentation. Stop for review before publication.

## Milestone 4: Publish the skill and hand off the next run

**Objective:** Publish immutable skill `v6.0.1` and close this fix cycle with an accurate verification record.

**Dependencies:** Milestone 3 complete, its review findings resolved, and explicit authorization for Milestone 4. Signing and release-workflow access must be available.

**Owned scope:** Publication of the exact reviewed skill candidate through the established PR/main workflow, release tag and notes, existing tag/installation CI, and the final handoff. No further implementation or mock-repository changes are included.

**Execution and verification:**

1. Recheck worktree/candidate identity, version availability, and required verification. Reuse successful Milestone 3 checks for unchanged inputs. Commit with sign-off and cryptographic signature, complete the existing review/PR workflow, and merge the reviewed candidate.
2. Create immutable `v6.0.1` and publish release notes describing the corrected totals, actionable path errors, and routing clarification. Explicitly distinguish deterministic verification from the untested routing hypothesis; claim no new semantic or adapter qualification evidence.
3. Require tag CI and official installed-artifact byte comparisons to pass against the release tree. Verify the final release/tag commit and distribution identity. Do not weaken evidence checks, publish the production website, move tags, or overwrite artifacts. Stop on failures and report the exact state.
4. Report Core/CLI versions and release identities, the skill tag/commit, relevant links, checks actually completed, and any verification limitations. Carry forward the need to assess routing reliability and post-compaction/model variance in the next mock run.
5. Hand off the subsequent private mock-repository planning stage: Git plus release-asset storage, `gpt-6-sol` at `xhigh` on every actor turn/follow-up, explicit retention of deviations, and natural focused context creation/use/maintenance. Public mirroring and manually refreshed website evidence remain later work. Do not implement or plan those changes during this milestone.

**Acceptance criteria:** Core `5.0.1`, CLI `9.0.1`, and skill `v6.0.1` are published in dependency order; required release verification passes; the final report accurately identifies artifacts and assurance limits; the private mock repository remains untouched. Confirm whether protected instructions still cover the completed durable changes; no instruction update is currently expected.

**Review checkpoint:** Verify the published identities, tag CI, installation byte equality, release claims, and follow-on requirements. This is the final milestone; stop before the mock-repository plan.

## Approval required

Approve the current plan and this complete four-milestone sequence: (1) prepare and verify the package fixes, (2) publish the packages, (3) prepare and verify the skill, and (4) publish the skill and hand off the next run. Approval alone does not start implementation. Explicitly authorize Milestone 1 to begin; each later milestone requires separate authorization after the preceding checkpoint.
