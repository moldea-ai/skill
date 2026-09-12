# Natural-language activation milestones

## Milestone 1: Complete and verify the release candidate

Status: in progress. Routing, regression tasks, and documentation are edited; nothing is committed. Knowledge-base tests and skill structural validation pass. Qualification deterministic tests are running.

Objective: restore natural conversational agent work and produce one fully verifiable release candidate.

Dependencies: the revised plan and existing adoption-only gate, launcher, and evidence-pin mechanism.

Scope: `moldea/SKILL.md`, affected planning/evaluation references and host metadata; activation and semantic fixtures with owning conformance tests; shared Custom creation task; directly affected README, skill documentation, generated website docs; platform activation specifications including project routing; knowledge-base skill/planning articles; established release version fields and evidence envelope.

Work: finish intent-based routing, contextual continuation and read-only dispatch; preserve the exact README block and ordinary-path abstention; retain all 74 semantic cases and 12 shared qualification journeys while removing product-name cues from relevant tasks; verify empty-project adoption separately from relationships. Keep sibling changes isolated. Finalize portable inputs, prepare the next patch version, then refresh both evidence pins from v5.0.4 with accurate limitations before generating website content.

Verification: focused and complete root correctness tests; managed README, bundled matcher, path, structural skill, and release checks; qualification deterministic tests/typecheck; website documentation generation/check, unit/integration tests, typecheck, lint, formatting, build, and evidence-view verification; platform scoped documentation checks; knowledge-base tests and validation. No paid actor or judge execution.

Acceptance: natural agent work needs no moldea terminology, canonical paths, or existing bindings; unrelated work remains silent and bounded; planning/review cannot write; all existing model scenarios remain; documents agree; historical attempts, replay, and projects remain inspectable through authenticated pins. No package implementation, dependency, protected instruction, or unrelated work is changed.

Review checkpoint: step back and assess the complete skill's discovery, entry-state routing, reference consistency, planning-to-implementation continuity, runtime selection, authority, security, and resource boundaries. Review the scoped final diffs and test limitations. Correct blocking findings, re-review, then create signed, signed-off commits and push only the scoped feature branches. Do not merge before publication readiness is established.

## Milestone 2: Publish and verify deployment

Objective: publish the reviewed skill patch and synchronized specifications and public documentation.

Dependencies: Milestone 1 is complete, reviewed, committed, and pushed.

Scope: scoped PRs, required CI, signed skill tag, GitHub release, deployment verification, and final repository-state checks. No new behavior is introduced here.

Work: merge only the intended passing PRs, verify the merged skill tree matches the reviewed candidate, publish its signed tag and release, and verify the deployed version plus original semantic and qualification attempt/replay/project views. Reuse checks whose inputs remain unchanged. Never bypass CI or signing, publish unrelated work, or rerun paid evaluations.

Acceptance: the signed release and deployed website identify the new patch; evidence remains authentic and labeled reused; public documentation agrees; published commits match reviewed state. Report what deterministic review establishes and what still lacks fresh model testing.

Review checkpoint: confirm exact published commits, tag, release, deployment, evidence source identities, and preservation of unrelated platform work.

## Approval required

The two milestones cover the complete revised plan, moving local evidence preparation into candidate verification while leaving external publication last. The developer has authorized autonomous completion, review, correction, and publication of this scope.
