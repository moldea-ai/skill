# Milestones: local runtime compatibility and safe relevance gating

## Milestone 1: Ship the local matcher and close execution boundaries

Objective: the relevance gate uses the release's bundled Core matcher and never executes repository dependencies; CLI execution rejects escaping dependency roots while supported installations continue.

Dependencies: revised plan db1011d15f86e4ca9e3fde054d711170ed582caad7265cf385f28e13c94597f3.

Scope: tooling/relevance-gate matcher, generator, and colocated tests; moldea/scripts/manifest-scope.cjs and license notices; relevance-gate.mjs; repository-package.mjs; package.json/lockfile build dependency and generation scripts; conformance fixtures/tests; directly affected gate/tooling documentation and platform specification.

Work: bundle the locked public Core API and required libraries with built-in-only external imports; verify deterministic generation and attribution; preserve bounded format/path matching; bound adoption/manifest reads during allocation; reject escaping parent links; remove loadRepositoryCore; move inert Core checks to the CLI resolver; use repository-contained test installations. Preserve supported npm/pnpm layouts and the exact two-byte gate protocol.

Verification: generation check, matcher parity tests, gate/launcher adversarial integration checks, root npm test, path checks, touched-file formatting, relevant documentation checks. Confirm no dependency sentinel runs, no gate mutation occurs, and representative large matching inputs remain bounded.

Acceptance: all focused and broader applicable checks pass; new artifacts are reproducible and licensed; ordinary gate misses require no CLI/dependency execution; correct installations work. Pin interim evidence only if required by current-envelope checks.

Review checkpoint: inspect the complete change, package/build boundaries, precise filesystem containment, resource behavior, test adequacy, and docs. Fix findings and review again until ready, then make a signed/sign-off cohesive commit and push the milestone branch. Use an isolated platform checkout for its documentation commit.

## Milestone 2: Resolve compatibility locally and update regression contracts

Objective: runtime work uses actual repository wiring, local composition, and adapter evidence without compatibility web/browser retrieval.

Dependencies: Milestone 1.

Scope: moldea/SKILL.md; runtime-compatibility.md, agent-design.md, agent-system-planning.md; fixtures/conformance-cases.json and semantic-evaluation-coverage.json; semantic runner, command-policy and case-validation modules with their tests; qualification contracts only where affected; relevant skill docs; platform runtime/skill specifications; contradictory packages documentation and knowledge-base runtime/FAQ/troubleshooting articles.

Work: remove remote lookup prerequisites and browser fallback incentives; preserve best-effort package eligibility, honest runtime identity, recognized source-pattern evidence, and precise unresolved conclusions. Replace obsolete regression expectations without reducing coverage, add the observed Eve case, and remove current publication probes/permissions. Keep build-time publication artifacts and immutable pinned-source authentication where they retain independent responsibilities. Synchronize affected documentation without adding announcements or UI panels.

Verification: targeted semantic-harness, conformance, and command-policy tests; deterministic local adapter evidence cases; npm test; applicable qualification correctness/type/lint checks; docs generation/validation; knowledge-base validation and relevant suites. Inspect the portable artifact and active fixtures for remaining automatic compatibility retrieval. No paid evaluation commands.

Acceptance: supported Eve uses the official local adapter without remote eligibility research; mismatches and missing source evidence produce accurate local limitations; no custom fallback from lookup failures; current scenarios match the new contract; documentation agrees.

Review checkpoint: review changes and complete test coverage, correct findings, repeat review until ready, and publish cohesive signed milestone commits. Keep other agents' changes outside task commits.

## Milestone 3: Verify and publish skill 5.0.4 with pinned evidence

Objective: publish the corrected skill and synchronized documentation with valid, accessible prior evidence and no paid runs.

Dependencies: Milestones 1 and 2.

Scope: skill release versions and identity references; fixtures/release-evidence.json; final generated documentation and artifact checks; branch/tag/release publication and deployment verification.

Work: synchronize 5.0.4 metadata; pin semantic and qualification sections from v5.0.3 with a reason naming the actual changes and completed deterministic checks; verify immutable source authentication, replay/project evidence availability, final skill artifact, and deployment workflows. Review final diff and release state, correct issues, commit/sign/push, merge the intended branches into main, create the signed release tag and GitHub release using established conventions, and monitor deterministic CI/deployment to completion. Publish sibling documentation commits without unrelated changes.

Verification: reuse exact-input successful tests; rerun only checks invalidated by final edits; run release identity/evidence check, website unit/artifact/build and required browser checks, formatter/path checks, and protected-instruction/documentation audit. Confirm main/tag identity, remote publication, and current public evidence routes. Check no paid jobs or semantic/qualification executions were launched.

Acceptance: 5.0.4 is published and available from main/tag; website deployment succeeds; prior evidence remains accessible and accurately pinned; required docs are published; task changes are committed and reviewed.

Review checkpoint: final release/evidence review and publication verification. Report release/tag, commits, checks and limitations, and that no semantic evaluation or adapter qualification was run.

## Approval required

These three milestones cover the revised plan completely. The user's explicit authorization approves autonomous breakdown, sequential implementation, review/fix cycles, signed commits/pushes, merging, and publication. Proceed with Milestone 1 without another approval request.

