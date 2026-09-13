# Initialization tooling order

## Objective and cause

Publish a focused skill patch that avoids a knowingly failing CLI invocation during explicit initialization. In the `eve future prediction 5` session, the agent wrote the foundation, tried `validate` without `node_modules`, then installed the CLI and retried. The launcher correctly refused execution. The cause is the fail-first instruction in `moldea/SKILL.md` and `moldea/references/continuous-maintenance.md`, which permits loading installation guidance only after launcher failure despite the earlier inert metadata check establishing absence.

## Current evidence and boundaries

The baseline is skill 5.0.6 at `b75376888e5a502338281910b2c27671e8c9ab37`. The worktree is clean. The root README, initialization and local-tooling references, launcher resolver, conformance tests, release-evidence tooling, website scripts, platform agent-skill specification, and knowledge-base article establish the affected flow.

The existing launcher owns executable provenance and fail-closed behavior. The existing package-manager procedure owns authorized installation, disabled lifecycle scripts, executable-configuration hazards, and lockfile updates. Reuse both unchanged. Do not modify the CLI, Core, adapters, dependency versions, public command surface, README writer, relevance gate, repair workflow, or `skill-mock`. Preserve protected instructions and unrelated work. No new compatibility paths, caches, services, or helpers are needed.

## Final workflow

1. Preserve the early bounded inert metadata and executable-installation hazard check. Unsafe installation configuration still stops before foundation questions, package-manager execution, and adoption writes.
2. Establish sufficient project context before installing dependencies or writing the foundation. Insufficient or partial context still prompts a focused question without writes.
3. When that existing metadata check establishes a missing compatible CLI, load the existing local-tooling procedure directly and complete the authorized installation before canonical files or the managed README block are created. Do not invoke the launcher merely to rediscover known absence. Installation failure stops before foundation writes and validation; preserve and report any package-manager changes instead of claiming adoption or rolling back unrelated work.
4. When compatible tooling is already present, do not reinstall, enumerate dependencies, or add a `composition` probe. The normal final launcher invocation remains the executable-provenance boundary. Unexpected tooling failure remains an actionable failure handled by the existing authorized recovery rules.
5. Write the complete foundation, run the unchanged managed README writer, and issue one final bounded `validate`. Preserve the existing one-repair/one-retry allowance for structural errors and the stop-after-success rule.

## Implementation and documentation

Update the initialization section of `moldea/SKILL.md` and the initialization/local-tooling references, removing the unconditional fail-first requirement rather than layering a conflicting exception. Preserve the portable entrypoint's existing size bound.

Synchronize README initialization wording, `docs/getting-started.md`, `docs/compatibility-and-local-tooling.md`, and `docs/examples/initialize-a-project.md`. Update the directly affected platform `moldea/context/agent-skill.md` specification in the existing isolated platform worktree, and the knowledge-base `content/003_open-source-tools/002_moldea-agent-skill.md` article. No packages-repository implementation change is required.

Update existing conformance assertions that encode the superseded order. Extend the real launcher boundary tests to verify missing-tooling validation fails without installation or foundation changes. Retain existing installed-closure, unsafe-configuration, foundation-sufficiency, writer, and read-only tests. Check all five workflow cases: missing CLI, installed CLI, failed installation, insufficient context, and unsafe install configuration. Documentation assertions and mechanical boundary tests do not prove model compliance; do not represent them as a fresh semantic evaluation.

## Verification and release

Run focused conformance tests, then root `npm test`. Run managed README, matcher, path, and release-identity checks. Run website `npm run check` and `npm run test:e2e`; these verify generated public docs and retained replay/project evidence. Run knowledge-base `npm test` and `npm run validate`. Format only touched files with installed tooling, inspect the final diffs, and audit documentation consistency. Unchanged qualification engines and package implementations do not need another local full qualification-harness run; root and website regressions still cover the selected evidence readers.

Release 5.0.7 by synchronizing the root manifests, portable version, current release documentation, and version-sensitive tests. Use `release:evidence:pin -- --scope all --from v5.0.6` with a reason identifying this workflow change and deterministic verification. Preserve the original authenticated evidence and public journeys. Do not run paid semantic evaluation or adapter qualification commands.

Review and fix the complete cohesive change before signed commits and explicit branch pushes. Merge reviewed PRs into main after applicable CI passes, create and verify signed tag `v5.0.7`, publish the release, wait for website deployment, and verify live version, documentation, and retained evidence. Existing release tags provide rollback installation targets; do not rewrite published history. Keep platform publication isolated from other agents' work.

## Execution checkpoint

This is one coherent implementation scope: guidance, required tests, synchronized documentation, and its patch release. A separate test-only or documentation-only milestone would leave the fix incomplete. Challenge the plan, confirm that breakdown adds no useful intermediate boundary, implement, review, fix if necessary, then publish. The user's task-specific autonomy covers routine execution and publication; no new approval is needed for these bounded steps.

## Approval required

The exact scope is the initialization-order correction, supporting deterministic regression coverage, directly affected documentation, and signed 5.0.7 publication with pinned prior evidence. The user has delegated approval and execution for this task; proceed autonomously without expanding scope or starting paid evaluations.
