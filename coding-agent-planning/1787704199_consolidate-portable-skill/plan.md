# Plan: Consolidate the portable `moldea` skill

## Objective

Consolidate the portable `moldea` Agent Skill so its existing behavior is easier for `gpt-5.6-terra` and other non-frontier models to prioritize, without removing an activation path, weakening an authority or safety boundary, adding new product behavior, or changing the release identity.

This is a behavior-preserving instruction refactor. It addresses accumulated duplication and instruction competition rather than treating the latest semantic failure as a missing-rule defect.

## Current state and repository evidence

- `moldea/SKILL.md` owns the portable activation contract, universal authority rules, operation selection, reference routing, shared lifecycle, deterministic boundary, and completion reporting.
- The skill uses seven directly linked references with distinct intended responsibilities:
  - `moldea/references/local-tooling.md`
  - `moldea/references/context-gathering.md`
  - `moldea/references/continuous-maintenance.md`
  - `moldea/references/evaluate-and-reconcile.md`
  - `moldea/references/agent-system-planning.md`
  - `moldea/references/agent-design.md`
  - `moldea/references/skill-design.md`
- `moldea/agents/openai.yaml` is supplemental host metadata. Its current short description and default prompt remain aligned with the portable purpose.
- The portable tree currently contains 14,196 words. `moldea/SKILL.md` contains 1,929 words and 128 lines. Since `v3.0.0`, the portable tree has grown by 2,520 words, approximately 22 percent.
- The current artifact contains repeated formulations of adoption, ambiguity, evidence establishment, deterministic proof, reporting, and non-invention rules across the entrypoint and operation-specific references.
- The latest `evaluate-dirty-working-tree` actor and confirmation both audited the installed skill instead of the adopted project, even though the intended target rule already appears in `moldea/SKILL.md` and `moldea/references/evaluate-and-reconcile.md`. This establishes an instruction-priority problem, not an absent contract.
- `tests/conformance.test-unit.mjs` currently protects many behaviors with exact or near-exact prose matching across the complete portable content. Those assertions preserve important contracts but also couple tests to duplicated wording and must be adjusted carefully during consolidation.
- `fixtures/conformance-cases.json` already contains 49 semantic scenarios, including both `evaluate-dirty-working-tree` and `evaluate-brief-name-only-request`. The first requires complete HEAD-relative scope; the second forbids silently auditing the installed operating skill.
- `fixtures/semantic-evaluation-coverage.json` maps those scenarios to the current activation, adoption, and evaluation-scope claims.
- The Skill Creator validator passes. The current root unit and integration suites pass with 184 tests passed, 2 intentionally skipped, and no failures.
- The worktree also contains pre-existing generated semantic attempt directories and a modified `fixtures/semantic-evaluation-results/latest.json`. They are not source changes for this consolidation and must not be edited, deleted, normalized, or claimed as part of it.

## Desired final behavior

The consolidated skill must retain all current supported outcomes and boundaries:

- explicit, knowledge-triggered, and relevance-triggered activation
- explicit developer intent for initial adoption
- Maintain authority for unambiguous durable knowledge in an adopted repository
- claim-by-claim persistence, clarification, or omission
- read-only behavior for plan, evaluate, inspect, check, review, explain, report, and validate operations unless later write authority is granted
- conflict-first clarification for consequential policy, permission, ownership, approval, value-bearing, destructive, or other materially ambiguous claims
- project-owned evaluation scope by default in an adopted repository, with the installed skill used only as operating guidance unless explicitly or repository-established as the subject
- complete dirty-tree scope across staged, unstaged, untracked, renamed, and deleted paths
- exact repository-local CLI identity and machine-envelope verification
- package-manager extension and executable-provider safety gates
- objective-first agent-system planning, grounded agent design, Agent Skill design, continuous maintenance, dedicated-repository boundaries, mirrors, requirements, runtime evidence, and deterministic responsibility ownership
- truthful, proportional completion reporting

The final structure should make the first decisions unmistakable: activation and adoption, operation and subject, write authority, then focused reference loading. Detailed mechanics should remain in their owning references.

## Explicit exclusions

- Do not add another rule, example, or semantic case for the latest dirty-tree failure.
- Do not remove or weaken any of the three activation paths.
- Do not change release `3.1.0`, `@moldea.ai/cli 4.0.1`, CLI schema `2`, runtime ranges, package dependencies, package scripts, or host invocation policy.
- Do not add, remove, merge, or rename portable references, scripts, assets, or directories.
- Do not change `fixtures/conformance-cases.json`, the 49-case semantic suite, evaluator criteria, `fixtures/semantic-evaluation-coverage.json`, the semantic runner, qualification profiles, qualification engine, website, or public documentation unless implementation evidence proves that behavior changed. Behavior change is outside this plan and would require a revised plan.
- Do not run a paid semantic evaluation or qualification.
- Do not edit, delete, or publish the current generated semantic attempts or `latest.json` pointer.
- Do not introduce a permanent arbitrary word-count threshold or another maintenance framework solely to govern prose size.
- Do not tag, release, commit, or push.

## Instruction architecture and ownership

| Surface                       | Authoritative responsibility after consolidation                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moldea/SKILL.md` frontmatter | Concise, discriminating selection contract covering the three activation paths and the non-adoption boundary                                                                            |
| `moldea/SKILL.md` body        | Universal decision order, operation selection, essential authority and safety invariants, direct reference routing, shared deterministic boundary, and proportional completion contract |
| `local-tooling.md`            | Package-manager identity and safety, exact CLI establishment and invocation, process gates, machine-envelope interpretation, and safe supplemental Git evidence                         |
| `context-gathering.md`        | Evidence classification, question-specific authority, claim quality, progressive investigation, durable-state routing, and initialization sufficiency                                   |
| `continuous-maintenance.md`   | Adoption detection, knowledge and relevance maintenance, README ownership, affected-state synchronization, and dedicated-repository coordination                                        |
| `evaluate-and-reconcile.md`   | Evaluation subject resolution, Git-state scope selection, read-only semantic assessment, result categories, intended-state reconciliation, and validate semantics                       |
| `agent-system-planning.md`    | Objective-first responsibility decomposition, agent minimization, deterministic and human control, contracts, and read-only recommendation output                                       |
| `agent-design.md`             | Agent behavior, model-facing assets, runtime selection, relationships, instruction provenance, capabilities, schemas, variables, mirrors, and unresolved requirements                   |
| `skill-design.md`             | Agent Skill boundary selection, activation design, progressive disclosure, resources, scripts, host metadata, consumers, maintenance, and validation                                    |
| `agents/openai.yaml`          | Supplemental UI metadata only; verification surface, not a second behavioral contract                                                                                                   |

Each material rule should have one detailed owner. `SKILL.md` may retain a short universal gate or routing reminder when the model must know it before deciding which reference to load, but it must not repeat the operation-specific procedure.

## Implementation steps

### 1. Establish a behavior-preservation inventory

- Use the current portable files, `tests/conformance.test-unit.mjs`, `fixtures/conformance-cases.json`, and `fixtures/semantic-evaluation-coverage.json` as the contract inventory.
- Map every existing unit-test contract and semantic coverage claim to one authoritative portable surface.
- Identify repeated rules separately from genuinely different rules that happen to share terms such as evidence, ambiguity, or reporting.
- Preserve current section headings referenced by the coverage map so the coverage source paths remain valid and its digest does not change.
- Record the current word and byte counts for every portable file and the common operation loading combinations before editing.
- Keep the pre-existing generated evidence paths outside the implementation diff.

### 2. Consolidate `moldea/SKILL.md` around the initial decision gate

- Shorten the frontmatter description while retaining natural discovery for explicit Moldea work, durable project-knowledge handoffs, behavior-affecting changes, and the explicit-adoption boundary.
- Reorder the entrypoint so the model resolves, in this order:
  1. why the skill activated and whether the repository is adopted
  2. which operation and subject the developer requested
  3. whether the operation is read-only or write-capable
  4. which focused references must be loaded before evidence or commands
- Keep the adopted-project evaluation default and the prohibition against silently auditing the installed operating skill in that initial gate. Do not add a third formulation elsewhere in the entrypoint.
- Retain only universal authority and safety invariants in the entrypoint. Move or remove duplicated operation-specific mechanics when the owning reference already contains the complete rule.
- Reduce the common lifecycle to the decisions shared by every applicable operation. Leave initialization, planning, agent, skill, maintenance, evaluation, reconciliation, and tooling procedures in their focused references.
- Collapse reporting into a short universal truthfulness contract, with operation-specific report requirements owned by their respective references.
- Prefer direct outcome language. Retain absolute negative wording only where violating it could create unauthorized writes, unsafe execution, invented truth, privacy leakage, corrupted evidence, or a broken deterministic contract.

### 3. Consolidate each focused reference without changing its behavior

- In `local-tooling.md`, retain all exact compatibility, package-manager extension, lifecycle-script, executable-provider, process-separation, machine-envelope, and safe Git requirements. Remove only repeated general authority and reporting prose already owned by the entrypoint or an operation reference.
- In `context-gathering.md`, retain the evidence taxonomy, question-specific authority, claim filtering, focused clarification, progressive investigation, durable-state routing, and Insufficient/Partial/Sufficient initialization model. Remove repeated adoption and maintenance procedure where `continuous-maintenance.md` owns it.
- In `continuous-maintenance.md`, retain direct adoption probes, knowledge-triggered authority, affected-state synchronization, README markers, and dedicated-repository behavior. Reference the context classification contract instead of restating its complete claim taxonomy and conflict model.
- In `evaluate-and-reconcile.md`, keep subject resolution before Git scope, all three Git-state scope branches, the five evaluation result categories, Agent Skill and runtime evidence boundaries, intended-state reconciliation, and validation semantics. Remove universal authority, deterministic-envelope, or reporting detail already complete in the entrypoint or `local-tooling.md`.
- In `agent-system-planning.md`, keep objective-first decomposition, responsibility preservation, agent minimization, deterministic orchestration, authority and data boundaries, runtime evidence limits, and actionable read-only output. Remove generic discovery and reporting detail already owned by context gathering and the entrypoint.
- In `agent-design.md`, preserve all agent-specific runtime, routing, provenance, capability, schema, variable, mirror, requirement, and readiness contracts. Replace repeated evidence and reporting explanations with focused references to their owning rules where the agent-specific distinction remains clear.
- In `skill-design.md`, preserve the Agent Skill boundary, activation precision, progressive disclosure, resource ownership, script quality, host metadata, consumer, registration, maintenance, and validation contracts. Remove generic skill-writing advice that Codex already knows or that duplicates the Skill Creator principles without adding Moldea-specific behavior.
- Keep all seven references directly routed from `SKILL.md`; do not introduce reference-to-reference chains that make loading order harder to understand.

### 4. Refocus deterministic conformance on owned contracts

- Update `tests/conformance.test-unit.mjs` only where consolidation changes prose placement or wording.
- Replace affected assertions that search the entire concatenated portable tree for near-exact sentences with assertions against the file that owns the behavior.
- Keep exact assertions for true deterministic contracts such as release versions, CLI schema, README markers, supported paths, operation names, reference inventory, and required machine-envelope values.
- Keep behavioral assertions focused on the invariant rather than one exact sentence. Do not weaken them into vague keyword presence.
- Retain explicit coverage for all three activation paths, adoption boundaries, conflict clarification, project-owned evaluation targeting, complete dirty-tree scope, read-only operations, tooling safety, runtime evidence boundaries, and proportional reporting.
- Do not change semantic case directions, scenarios, expected criteria, forbidden criteria, case IDs, coverage claims, runner behavior, confirmation policy, or model configuration.
- Do not add a word-count unit test. Size reduction is a review metric for this bounded refactor, not a permanent product constraint.

### 5. Verify metadata and documentation state without creating churn

- Compare the consolidated portable purpose and activation contract with `moldea/agents/openai.yaml`; leave the host metadata unchanged when it remains accurate.
- Compare the final behavior with the root `README.md` and directly affected documents under `docs/`, especially continuous maintenance, evaluation/reconciliation/validation, Agent Skill design, and semantic evaluation.
- Because behavior is intentionally unchanged, documentation should normally remain untouched. Any discovered mismatch that would require changing public behavior or evaluator contracts is a blocker requiring plan revision, not permission for opportunistic edits.
- Confirm that website presentation metadata and qualification profiles continue to describe the same behavior and require no source changes.

### 6. Perform a final consolidation and scope review

- Recompute per-file and complete portable word and byte counts.
- Require both `moldea/SKILL.md` and the complete portable tree to be smaller than their current baselines, while treating preservation of material contracts as more important than maximizing deletion.
- Compare common operation loading combinations before and after and confirm that initialization, maintenance, evaluation, agent planning, agent design, and Agent Skill work each load less repeated guidance.
- Review every removed statement against its retained authoritative owner and applicable deterministic or semantic evidence.
- Confirm no required rule became reachable only through an unloaded reference.
- Review the complete diff and ensure it contains only the portable instruction consolidation and its focused conformance-test synchronization, plus the planning file already authorized by the `plan` command.
- Report the pre-existing generated semantic evidence separately and do not include it in the consolidation scope.

## Verification

Run the following model-free checks after implementation:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" moldea
node --test --test-name-pattern='portable Agent Skill contract|source repository conformance' tests/conformance.test-unit.mjs
npm test
npm run eval:semantic:preflight
npm run eval:semantic:verify
npm run release:identity:check
npm run docs:check
./website/node_modules/.bin/prettier --check --config website/.prettierrc moldea/SKILL.md moldea/references/agent-design.md moldea/references/agent-system-planning.md moldea/references/context-gathering.md moldea/references/continuous-maintenance.md moldea/references/evaluate-and-reconcile.md moldea/references/local-tooling.md moldea/references/skill-design.md tests/conformance.test-unit.mjs
git diff --check
wc -w -c moldea/SKILL.md moldea/agents/openai.yaml moldea/references/*.md
```

Verification interpretation:

- Skill Creator validation proves portable structure only.
- Unit and integration suites prove deterministic contracts and fixture behavior.
- Semantic preflight proves all 49 cases remain sourced, materializable, covered, and prompt-isolated without making model calls.
- Attempt verification proves existing evidence remains internally immutable history; it does not make that evidence current for the changed portable digest.
- Release identity verification proves the consolidation did not accidentally change version or CLI ownership.
- Public documentation checks prove current behavior descriptions remain synchronized.
- A paid semantic run, Custom qualification, Vercel AI SDK qualification, and complete `release:check` remain intentionally deferred because the portable digest will change.

## Evidence and release consequences

- Any edit under `moldea/` changes the portable artifact digest.
- Existing semantic and qualification results remain inspectable history but cannot establish release freshness for the consolidated artifact.
- The semantic case-suite and coverage digests should remain unchanged because no case, criterion, runner, coverage claim, or source anchor is changing.
- After the consolidation is reviewed, committed, and pushed, a new full 49-case Terra semantic evaluation is required.
- After a passing semantic result is committed, fresh Custom and Vercel AI SDK qualifications are required because their evidence must bind to the consolidated portable digest.
- No carry-forward, manual evidence editing, result deletion, or model execution is authorized by this plan.

## Risks and controls

- **Accidental behavior removal:** mitigate by mapping every removed instruction to one retained owner and preserving all existing semantic cases and coverage claims.
- **Reduced salience from over-consolidation:** keep the initial activation, adoption, operation, subject, and authority gate in `SKILL.md`, even when detailed procedure lives elsewhere.
- **Test weakening:** move assertions to authoritative files and behavior-level contracts instead of deleting coverage or accepting generic keywords.
- **Broken progressive disclosure:** keep direct entrypoint links and verify that no required rule depends on an unloaded reference.
- **Coverage-map drift:** preserve referenced headings and paths; do not change the coverage map unless the plan is revised.
- **Evidence contamination:** preserve current generated attempts exactly and keep them out of the implementation claim.
- **Another evaluation-driven loop:** treat future failure as a classification event. Do not change the skill again unless the failure demonstrates a missing or incorrect product contract, rather than variance or failure to follow an already explicit rule.

## Acceptance criteria

- The portable skill retains every current activation path, operation, safety boundary, authority rule, deterministic contract, and supported workflow.
- The first portable decision sequence clearly resolves activation/adoption, operation/subject, authority, and reference loading before detailed evidence gathering.
- The installed skill cannot become the evaluation target merely because it was loaded.
- Every detailed rule has one authoritative owner, with only necessary short entrypoint gates repeated.
- All seven focused references remain present, directly routed, and behaviorally complete.
- `moldea/SKILL.md` and the complete portable tree are both smaller than their current baselines of 1,929 and 14,196 words.
- The 49 semantic cases, coverage map, runner, qualification system, website, release version, CLI version, and public behavior remain unchanged.
- All listed model-free checks pass, except that no release-freshness claim is expected before new semantic and qualification evidence exists.
- No paid model call, result mutation, dependency change, release action, commit, or push occurs.
- The final review can account for every removed instruction through retained behavior, tests, or authoritative ownership.

## Approval required

Approval authorizes one behavior-preserving consolidation of `moldea/SKILL.md` and its seven existing references, together with the narrowly required updates to `tests/conformance.test-unit.mjs` and model-free verification. It does not authorize changing activation behavior, semantic cases, coverage, runner logic, qualification, website or public documentation, release identity, dependencies, generated evidence, or Git publication, and it does not authorize any paid evaluation.
