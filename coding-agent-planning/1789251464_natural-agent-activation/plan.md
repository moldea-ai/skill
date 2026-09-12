# Natural-language agent-work activation

## Objective and authorization

Restore ordinary conversational use after repository initialization. Users must not name moldea, know its file format, or establish bindings before asking their coding agent to plan, build, review, or maintain AI agents. Continue an authorized agent task from conversational context, never from hard-coded confirmation phrases. The developer authorized autonomous planning, challenge, revision when necessary, breakdown, implementation, review, correction, and publication for this task.

Do not run paid semantic evaluations or adapter qualifications. Publish with an explicit pin to existing passing evidence, preserving its original identity and limitations. Do not modify `skill-mock`, protected coding instructions, or unrelated work in sibling repositories.

## Observed failure and repository evidence

The `eve future prediction 3` session used the released 5.0.4 skill and correctly initialized the repository. Subsequent agent planning and implementation did not select the agent workflow. Ordinary implementation paths returned a relationship-gate miss because the project had no declared agents or bindings yet.

`moldea/SKILL.md` defines direct work as explicitly naming moldea, emphasizes changed-path gating in its discovery description, and omits planning from its direct-agent route. These rules make the intended agent workflow unreachable for ordinary language. The positive planning fixtures in `fixtures/conformance-cases.json` prepend `Use moldea`, masking the failure. The shared qualification creation task also supplies moldea-specific instructions.

The existing `--adoption-only` gate already handles the necessary deterministic prerequisite. No CLI, Core, adapter, matcher, dependency, or package release is required. The fix belongs to skill routing and its coverage, not a natural-language parser inside the gate.

The managed README body is compared exactly by `hasCanonicalManagedReadmeBlock` in `tooling/managed-readme/managed-readme.template.mjs`. Preserve its bytes and the adoption contract. Clarify in the skill and documentation that the README selects the entrypoint; the entrypoint selects the appropriate gate. Do not introduce alternate accepted blocks or force reinitialization.

## Final behavior

- After adoption, clear AI-agent lifecycle intent selects the agent workflow, including responsibility planning, first-agent creation, runtime integration, behavior changes, and agent-specific review or reconciliation.
- Intent comes from the current request and relevant conversation. A continuation inherits only the active task's subject and authorization. A topic change does not inherit relevance; an ambiguous continuation does not manufacture permission or a canonical owner.
- Planning loads the planning reference and remains read-only. Authorized implementation loads agent design and establishes the grounded canonical/runtime relationships. Agent-specific review remains read-only and retains the host's complete requested review scope.
- Independent Agent Skill artifacts keep their separate artifact-local route. General engineering, SDK installation alone, generic documentation, and words such as agent in unrelated contexts do not trigger agent maintenance.
- Direct agent work uses the existing adoption-only gate even with zero agents, no relationships, or no named paths. Other ordinary work retains the existing relationship gate, output budgets, silent abstention, and host workflow ownership.
- Explicit initialization remains the only repository-dependent operation allowed before adoption.

## Implementation and ownership

Update `moldea/SKILL.md` discovery wording, direct activation definition, route precedence, planning dispatch, and contextual continuation boundary. Keep the router compact and preserve existing reconciliation, local eligibility, security, and resource controls. Update `moldea/references/agent-system-planning.md` and directly contradictory reference wording only. Inspect `moldea/agents/openai.yaml`; preserve implicit invocation and its optional explicit UI prompt contract.

Extend the existing activation fixture matrix and its conformance assertions with adopted/unadopted agent intent, first-agent/no-binding work, contextual continuation, changed-topic abstention, and unrelated SDK/documentation negatives. These are deterministic contract tests, not proof of model interpretation. Add a real gate regression exercising an adopted empty project: adoption-only succeeds while unrelated ordinary paths miss. Preserve existing path and security coverage.

Strengthen the existing semantic planning and inline-agent creation scenarios by removing product-name cues; use an ordinary contextual continuation in the creation scenario. Keep all 74 semantic scenarios and their substantive assertions. Strengthen shared Custom qualification `qualification/profiles/t5/cases/c3/task.md` similarly, retaining all 12 shared journeys and adapter-specific coverage. Add deterministic assertions that these regression prompts do not reintroduce magic words. Do not change evaluator semantics or claim that edited scenarios have been run against a model.

Synchronize directly affected root README, `docs/how-it-works.md`, planning/agent-design/getting-started documentation and examples, and generated website documentation. Inspect website-owned activation copy and change only contradictions. No UI redesign or new UI primitive belongs to this correction.

Synchronize the platform's `moldea/context/agent-skill.md` and affected activation claims in `product-and-operating-model.md`, plus directly affected public copy if present. Use an isolated branch/worktree based on current main so concurrent platform work remains untouched. Inspect current main before carrying over any finding from the development checkout.

Update the knowledge-base skill article and agent-system-planning article against the synchronized product specification, preserving article identities and content conventions. Inspect other direct activation claims and correct only contradictions. Packages remain unchanged unless inspection identifies a directly affected documentation claim; no package implementation or dependency change is planned.

## Verification and release

Run focused root conformance tests first, then `npm test`, `npm run managed-readme:check`, `npm run matcher:check`, and `npm run path:check`. Run qualification deterministic tests and typechecking for the touched fixture boundary, without actor execution. Run skill-creator structural validation when its local prerequisites are available.

Use installed Prettier on touched supported files. Regenerate website documentation with `npm run docs:generate`, verify `npm run docs:check`, and run the affected website unit/integration checks, typechecking, linting, and build. Verify pinned evidence still exposes original attempts, replay, and project views. Reuse unchanged successful verification inputs; do not rerun entire suites merely for a publication step. Run knowledge-base validation and tests and platform scoped documentation checks. Report unavailable checks honestly.

Before website generation and verification, prepare the next available patch release, expected 5.0.5. Update the established release identity files and use `release:evidence:pin -- --scope all --from v5.0.4` with an accurate reason describing changed activation and unrerun model coverage. This is required because `website/src/lib/release-evidence/loader.ts` rejects a target portable digest that differs from the edited skill. Finalize portable inputs first, then refresh the pin once. The source evidence must remain labeled reused; do not overwrite outcomes or claim this correction passed fresh semantic testing.

Review each complete publishable change, use signed and signed-off commits, push explicit branches, merge only scoped passing PRs, publish the signed skill tag and GitHub release, and verify the deployed website and release identity. Stop publication for genuine verification failures; correct task-caused defects without bypassing checks. Existing historical release artifacts remain the evidence source, not a legacy implementation path.

## Risks and exclusions

Instructions cannot guarantee every coding host will select a skill. Deterministic tests can protect routing contracts and gate mechanics, but this release will have no fresh model confirmation. Explicitly retain that limitation. Avoid broad activation by testing unrelated negatives and keeping semantic intent separate from path relevance. No persistent intent cache, keyword dictionary, model-call classifier, compatibility shim, protocol redesign, paid run, or resource-budget expansion is needed.

## Current checkpoint and final review

Routing, regression prompts, and directly affected documentation are implemented but not yet committed. Knowledge-base tests and validation and skill structural validation pass. Root unit checks exposed stale wording assertions; correct them without weakening behavior checks. The qualification deterministic suite is running. The requested final review must evaluate the complete skill workflow and reference consistency before publication, not only the changed lines. Publication remains separate from preparing the local version and evidence envelope required for verification.

## Approval required

The implementation scope is the focused activation correction, deterministic and future model regression coverage, directly affected documentation across skill/platform/knowledge-base, and a reviewed evidence-pinned skill release. The developer's current instruction authorizes this scope autonomously, including its review and publication; no further approval pause is requested.
