# Semantic evaluation convergence correction plan

## Status and planning basis

This revision replaces the pinned-diagnostic plan after its Milestone 1 reached the approved evidence-backed stop outcome. The previous milestone sequence is invalid and must be regenerated before milestone-scoped implementation.

The repository is currently on branch `qualifications` at commit `a6cb8d86ead9feccaf4ff9ec6a1e30ce5139432b`. Apart from this planning directory, the worktree has no uncommitted repository change. The ignored semantic candidate remains a valid 42/48 checkpoint for the current source:

- candidate SHA-256: `19dd59e335997ae6d4673c7558f82d232323fe4442164c5be3b8a35d1963ef50`
- committed result SHA-256: `24776c035f35a99c9a85492d40d2b5354fe02e48eb9d6e467267e0497d413134`
- portable artifact digest: `41b4e8d4f42a508b4c0113f274b008db792b4a1ecc63989c833bfcc5fa8b1d9c`
- semantic case-suite digest: `7e404829632982fe672c6d3b28dfc86912c76261892580bd6fb2a30325d682b7`
- semantic coverage digest: `d251af7f3fd13337e6f362b9a0c35e9fd605b006894f2f8e17fb3c1da1c2da57`
- semantic protocol `12`, result schema `2`, and published `@moldea.ai/cli` `4.0.1`
- actor and judge host identity: Codex CLI `0.149.0`, `gpt-5.6-terra`, `medium`

The completed pinned-host diagnostic pass used the retained absolute Codex CLI `0.149.0` executable and produced these admissible results without changing the candidate or committed result:

| Case | Outcome | Evidence |
| --- | --- | --- |
| `adopted-relevance-no-change` | Pass | The actor reconsidered canonical state, changed only the requested implementation, and explicitly reported why no canonical update was needed. |
| `evaluate-dirty-working-tree` | Pass | The actor covered staged, unstaged, renamed, deleted, and untracked scope, preserved the dirty worktree, and made no writes. |
| `skill-create-progressive-disclosure` | Pass | The actor created one valid concise skill, reused authoritative resources, preserved execution authority, and passed independent structural validation. |
| `available-runtime-insufficient-behavioral-evidence` | Fail | The actor correctly preserved `runtime.id: custom` and rejected package-name and inventory inference, but did not state what reliable evidence would resolve the remaining behavioral uncertainty. |

The hard stop prevented the final two diagnostics from running. Eight admissible model calls were used. Complete outputs remain outside the repository at `/tmp/moldea-semantic-pinned-01490-nGDVEiUh` for the lifetime of that temporary directory.

## Root-cause finding

The failing behavior is repeatable under the candidate-compatible host. Both the existing candidate attempt and the fresh pinned diagnostic omitted the same required information. This is not a host-identity, infrastructure, repository-control, or evaluator-input failure.

The repository already owns the correct policy:

- `moldea/SKILL.md` requires material evidence limitations to be paired with reliable resolving documentation, closed wiring, configuration, or tests.
- `moldea/references/evaluate-and-reconcile.md` requires each runtime unknown to name the smallest reliable resolver, its artifact type, and its owner.
- `moldea/references/agent-design.md` applies that rule specifically to invocation, instruction loading, capabilities, schemas, routing, and variables.
- `README.md` and `docs/evaluate-reconcile-validate.md` document the same public behavior.
- `available-runtime-insufficient-behavioral-evidence` already tests the correct contract and previously passed without changing its criterion.

The problem is instruction routing and report salience, not a missing runtime policy. `moldea/SKILL.md` currently routes `agent-design.md` before creating or materially changing a runtime relationship, but it does not explicitly route read-only runtime-relationship evaluation there. The evaluation reference lists evidence-limit categories and then states the resolver rule as surrounding prose. The two repeated actors followed the high-level safety decision but returned a generic missing-evidence statement instead of a complete unknown-to-resolver mapping.

The correction must therefore make the existing rule operational at the point of use. It must not add an OpenAI-specific answer, weaken the judge, modify the scenario, duplicate a large runtime procedure in the entrypoint, or turn one observed wording failure into a rigid response template.

## Objective

Make runtime and agent-relationship evaluations reliably report every material behavioral unknown together with the smallest reliable resolving artifact, the artifact's owner, and the fact that artifact must establish, while preserving the current safe decision to avoid unsupported runtime changes.

Then generate one fresh, checkpointed 48-case semantic evaluation against the corrected portable artifact. This is the final authorized convergence attempt under this plan. It does not create another automatic diagnose-edit-rerun loop.

## Desired final behavior

For a read-only runtime evaluation with insufficient behavioral evidence, the coding agent must:

1. Treat compact CLI compatibility data only as availability evidence.
2. Avoid inferring runtime behavior from package names, inventory, or model knowledge.
3. Preserve the existing runtime declaration when no behaviorally supported replacement is established.
4. Identify each material unknown at the behavior level, such as invocation, instruction loading, capability exposure, schema handling, routing, or variable provision.
5. Name the smallest reliable artifact that could resolve each unknown, identify who owns that artifact, and state what it must establish. The artifact may be source-owned target documentation, closed runtime wiring, provider configuration, or an integration test when appropriate.
6. State that the evaluation is incomplete when a material unknown has no reliable resolver.
7. Keep the evaluation read-only and explicitly report that no repository files changed.

The final report may use natural prose or a concise list. No exact headings, sentence wording, special syntax, or case-specific answer is required.

## In-scope files and ownership

### Portable skill

- `moldea/SKILL.md`
  - Extend the existing focused-reference routing so evaluating an agent or runtime relationship loads `references/agent-design.md`.
  - Rework the existing evidence-limitation reporting bullet in place so the required unknown, resolver, owner, and resolving fact are a direct reporting contract.
  - Consolidate nearby duplicate wording rather than appending another special-case rule.

- `moldea/references/evaluate-and-reconcile.md`
  - Integrate the resolver requirement directly into the `Material evidence limitations` report category.
  - Require the report to distinguish the unknown behavior, the smallest reliable artifact and owner, and what that artifact must prove.
  - Preserve read-only evaluation, conditional conclusions, runtime inventory boundaries, and all five existing report categories.

- `moldea/references/agent-design.md`
  - Inspect after the entrypoint and evaluation-reference edits.
  - Change only the smallest existing runtime-evidence sentence if needed to keep terminology consistent and avoid conflicting or duplicate instructions. Do not add another procedure or example unless the final wording would otherwise be ambiguous.

### Deterministic behavioral contracts

- `tests/conformance.test-unit.mjs`
  - Update the existing focused assertions to prove that runtime-relationship evaluation routes to `agent-design.md`.
  - Verify the report contract retains all three resolver components: the unknown behavior, the smallest reliable artifact and owner, and the fact it must establish.
  - Preserve the existing tests for inventory-only availability, runtime preservation, conditional dynamic-wiring conclusions, and explicit no-write reporting.

No new semantic case is required. `available-runtime-insufficient-behavioral-evidence` is the exact regression case, and changing or duplicating it would weaken comparison with the two observed failures.

### Public state-bearing documentation

- `README.md`
  - Synchronize the concise evaluation behavior description with the strengthened unknown-to-resolver report contract.
  - Do not add operational detail already owned by the semantic-evaluation guide.

- `docs/evaluate-reconcile-validate.md`
  - Explain in public language that a material runtime evidence limitation identifies what remains unknown, the resolving artifact and owner, and what the evidence must establish.
  - Preserve the current short workflow examples and operation boundaries.

No website component, route, layout, styling, metadata, search mapping, or semantic presentation change is needed. The website renders the directly affected documentation and the existing case metadata already describes the correct behavior.

## Explicit exclusions

This plan does not authorize:

- changing `fixtures/conformance-cases.json`, its expected or forbidden criteria, or the natural actor prompt
- changing `fixtures/semantic-evaluation-coverage.json`
- weakening, broadening, or rewording the judge contract to accept the observed incomplete response
- adding an OpenAI-specific response, fixture hint, hidden actor context, or evaluator answer to the portable skill
- changing runtime-selection semantics, supported adapters, compatibility metadata, CLI identity, release version `3.1.0`, `agents/openai.yaml`, activation paths, invocation policy, dependencies, or portable structure
- changing the semantic runner, model, reasoning effort, sandbox, relay, timeout, protocol, result schema, cache, checkpoint, or promotion behavior
- adding another semantic scenario merely to increase case count
- manually editing or deleting the ignored candidate or committed result
- running a paid standalone diagnostic before the fresh full evaluation
- targeted retries, source edits, or a second fresh full evaluation after a behavioral failure
- qualification runs, qualification-result changes, release checks, publication, tagging, or release creation
- commits or pushes except through a later explicit `repo push` command

## Implementation strategy

### 1. Preserve the evidence baseline

Before editing source:

- record branch, `HEAD`, Git operation state, and complete non-excluded worktree status
- record the existing candidate and committed-result hashes
- record current portable word and byte counts
- preserve the diagnostic artifact location and the exact repeated actor responses and judge rationales as review evidence
- confirm no runner-bound source changed since the diagnostic

The ignored candidate remains untouched during source implementation. Its incompatibility after the portable edit is expected and will be handled later only by the runner's explicit full-run restart path.

### 2. Strengthen routing without broadening activation

Edit the existing `Load focused guidance` rule in `moldea/SKILL.md` so read-only evaluation of an agent, its runtime relationship, or its material behavioral contracts loads `agent-design.md`. This changes progressive disclosure after activation; it does not add a new activation path or make generic evaluation activate `moldea`.

The rule must remain discriminating. It should not require loading the full agent-design reference for unrelated project-context evaluation, generic validation, or Agent Skill-only work.

### 3. Make evidence limitations operational at report time

Rewrite the existing reporting guidance rather than adding parallel prose:

- In `moldea/SKILL.md`, make each material runtime limitation report the unknown, resolving artifact and owner, and what the resolver must establish.
- In `moldea/references/evaluate-and-reconcile.md`, make that mapping part of the `Material evidence limitations` category itself, then retain one concise rule explaining acceptable resolver classes and incomplete-evaluation behavior.
- In `moldea/references/agent-design.md`, retain the domain-specific inventory boundary and resolver classes. Align terminology only if the other edits would otherwise leave two subtly different contracts.

The instructions must distinguish a resolver from a generic list of absent inputs. Saying only that documentation, wiring, or tests are missing is insufficient. The report must connect the evidence to the behavioral question it resolves. It must not invent a repository path, provider guarantee, owner identity, or expected test outcome.

### 4. Preserve prompt economy

The correction must replace or consolidate existing wording. Baseline portable size is:

- `moldea/SKILL.md`: 1,917 words and 15,364 bytes
- complete `moldea/` Markdown tree: 13,913 words and 107,165 bytes

After implementation:

- `moldea/SKILL.md` must not exceed 1,917 words
- the complete portable Markdown tree must not exceed 13,913 words
- no new portable file, reference, script, asset, dependency, or metadata field may be added
- the implementation report must include before-and-after word and byte counts for each changed portable file and the complete portable Markdown tree

This constraint prevents a repeated-evaluation fix from increasing paid runtime context. If clarity requires adding a term, remove equivalent duplicated wording in the same affected guidance instead of deleting an unrelated contract.

### 5. Synchronize deterministic assertions and public documentation

Update only the existing focused conformance assertions that own reference routing and evaluation reporting. Do not create wording snapshots or assert an exact sentence. Assertions should prove the durable semantic components and allow later concise rephrasing.

Update `README.md` and `docs/evaluate-reconcile-validate.md` in the same source change. Public prose must remain concise and format-independent. `docs/semantic-evaluation.md`, the coverage map, website case titles, and website code remain unchanged because the suite and presentation contract do not change.

### 6. Verify the source correction without model calls

Run formatting on only the changed Markdown and test files through the repository's existing Prettier boundary when available. Then run, in order:

```bash
python3 /home/jesusgraterol/.codex/skills/.system/skill-creator/scripts/quick_validate.py moldea
npm run test:unit
npm run test:integration
npm test
npm run docs:check
npm run eval:semantic:preflight
```

Also verify:

- all 48 semantic cases still exist and preflight successfully
- `available-runtime-insufficient-behavioral-evidence` retains its exact prompt, expected criteria, and forbidden criteria
- semantic case-suite and coverage digests remain unchanged
- only the portable artifact digest changes among semantic evidence inputs
- no test file enters the portable artifact or production website output
- no new dependency, generated source, activation behavior, release identity, or website UI change exists
- protected coding instructions remain unchanged and already cover the relevant durable guidance

`npm run release:check` is intentionally excluded at this point because the portable change invalidates current semantic and qualification evidence. Weakening freshness checks is forbidden.

### 7. Stop for source review and clean commit

After source verification, inspect the complete diff and stop at a review checkpoint. The developer should inspect:

- whether reference loading is limited to actual agent and runtime evaluation
- whether the resolver contract is useful beyond the OpenAI fixture
- whether the final wording requires an unknown, artifact, owner, and resolving fact without imposing an exact response format
- whether runtime selection and no-write behavior remain unchanged
- portable word and byte counts
- unchanged scenario and judge contracts
- documentation synchronization and complete source diff

A separate `review` command should establish readiness, followed by a separate `repo push` command to commit and push the source. The paid run must not begin until the source commit is clean and its exact commit and artifact digest are recorded.

### 8. Run one fresh checkpointed semantic evaluation

After the corrected source is committed and the developer gives fresh explicit paid authorization, establish:

- clean repository state at the exact source commit
- exact portable artifact, case-suite, coverage, CLI, lockfile, protocol, and schema identities
- retained absolute Codex CLI `0.149.0` and companion paths, versions, executable permissions, and SHA-256 hashes
- actor and judge identity `gpt-5.6-terra` at `medium`
- successful 48-case free preflight

Then start exactly one fresh recorded candidate through the runner's supported restart operation:

```bash
MOLDEA_EVAL_ACTOR_COMMAND_JSON='["/home/jesusgraterol/.codex/packages/standalone/releases/0.149.0-x86_64-unknown-linux-musl/bin/codex","exec","--ignore-user-config","--ignore-rules","--ephemeral","--skip-git-repo-check","--dangerously-bypass-approvals-and-sandbox","-c","shell_environment_policy.inherit=none","-"]' npm run eval:semantic -- --record --restart
```

The fresh execution may make at most 96 new model calls: one actor and one independent judge for each of 48 cases. It uses the existing five-minute per-process timeout, Bubblewrap isolation, restricted relay, read-only judge workspace, protected Git and installed-skill surfaces, and atomic per-case candidate writes.

Do not run a standalone paid diagnostic first. The existing regression case and deterministic contract checks are sufficient to justify the correction, and another diagnostic would add cost without becoming release evidence.

If the process is externally interrupted, preserve the compatible candidate. Do not automatically resume. A later explicit continuation may run the same command without `--restart`, provided all bound inputs and executable hashes remain identical and the remaining approved call budget is sufficient. Already passing cases are skipped. A partially completed case may require another actor and judge pair; those calls count against the 96-call limit.

### 9. Apply a final convergence stop rule

If any completed case fails behaviorally during the fresh run:

- preserve the candidate and stop immediately
- do not rerun the case, continue to later cases, change source, change evaluator criteria, switch Codex versions, or restart
- inspect the exact actor response, execution events, workspace, repository controls, expected and forbidden observations, and judge rationale
- classify whether the failure repeats a proven gap, contradicts a deterministic contract, or indicates evaluator instability
- report the result as the terminal outcome of this plan

An infrastructure or identity failure also stops immediately. Resume requires a later explicit instruction and unchanged compatible inputs; it is not a source-correction opportunity.

This hard stop prevents another open-ended instruction-patching loop. Any decision to redesign the evaluator or attempt another source revision requires a new plan based on the complete final candidate, not an automatic continuation of this plan.

### 10. Verify successful promotion

Only if all 48 cases pass, allow the runner to promote the candidate atomically to `fixtures/semantic-evaluation-result.json` and remove the candidate. Then:

- verify exactly 48 unique passing cases
- inspect the corrected runtime-evidence case for the intended unknown-to-resolver behavior
- inspect every actor response, judge rationale, workspace change, repository-control record, and forbidden observation
- confirm schema `2`, protocol `12`, exact portable, suite, coverage, CLI, lockfile, actor, judge, model, effort, and host identities
- verify token usage, durations, and result timestamps
- search the result for secrets, credentials, private host paths, malformed artifacts, and unexpected repository content
- confirm the website semantic loader accepts the promoted evidence
- rerun:

```bash
npm run test:unit
npm run test:integration
npm test
npm run docs:check
npm run website:check
```

Do not run qualification or `release:check`. The changed portable digest requires fresh qualification evidence in a later separately planned and authorized phase.

Stop with the generated result uncommitted. A separate `review` and `repo push` are required before any qualification work.

## Data flow and ownership

```text
portable source correction
  moldea/SKILL.md
    -> routes runtime evaluation to agent-design.md
    -> requires complete evidence-limitation reporting
  moldea/references/evaluate-and-reconcile.md
    -> owns evaluate report categories and resolver mapping
  moldea/references/agent-design.md
    -> owns runtime-specific evidence and selection policy
              |
              v
existing unchanged 48-case semantic suite
              |
              v
pinned Terra actor workspace
              |
              v
independent pinned Terra judge workspace
              |
              v
atomic compatible candidate checkpoint
              |
              v only after 48/48 pass
committed semantic result candidate for review
```

The portable skill owns behavior. The semantic fixture owns the observable regression contract. The runner owns isolation, identity binding, checkpointing, and promotion. Public documentation explains the behavior but does not define a parallel implementation. Qualification remains the owner of real published adapter composition and is outside this plan.

## Security, integrity, and recovery

- The correction adds no execution authority, network behavior, secret handling, dependency, or hidden persistence path.
- Evaluation remains strictly read-only.
- The actor continues to treat repository content as untrusted evidence.
- The fixed absolute Codex executable prevents a moving global symlink from changing host identity mid-run.
- Binary and companion hashes are checked before paid execution and after any interruption.
- The old candidate is replaced only through `--record --restart` after source review, clean commit, preflight, and fresh paid authorization.
- The committed passing result remains untouched until atomic 48/48 promotion.
- Candidate checkpoint writes preserve completed cases across external interruption.
- No automatic retry can exceed the approved model-call budget.
- No source correction or evaluator change may occur while retaining evidence from an incompatible portable digest.
- Temporary diagnostic artifacts remain outside the repository and are not release evidence.

## Risks and edge cases

- The skill already contains the intended rule. Adding more duplicate wording could increase token cost without changing behavior. The implementation must improve routing and report structure by replacing existing prose.
- Explicitly routing runtime evaluation to `agent-design.md` loads more focused context for those tasks. This cost is justified only for agent and runtime relationship evaluation and must not apply to unrelated evaluation.
- Requiring an owner must not cause the actor to invent a person's name or repository path. A responsible project surface or team role is sufficient when established; otherwise the report should say ownership is unestablished.
- Naming a resolver does not prove the behavior. Conclusions remain conditional until the evidence exists and is inspected.
- The resolver contract must not require every possible artifact. It requires the smallest reliable evidence appropriate to each unknown.
- The previous passing committed sample demonstrates feasibility but is stale for the corrected portable digest. It cannot be reused.
- The ignored 42/48 candidate becomes incompatible as soon as portable source changes. This is expected and must not be manually repaired.
- A full run can take hours and up to 96 model calls. Checkpointing limits repeated completed work, but a partially completed case may consume calls again after interruption.
- A new failure after the correction may be evaluator variance rather than another missing instruction. The final hard stop preserves evidence for that distinction instead of triggering another loop.

## Acceptance criteria

The plan has two valid terminal outcomes.

### Passing terminal outcome

- Runtime-relationship evaluation explicitly loads the existing agent-design guidance.
- Every material runtime evidence limitation must identify the unknown behavior, smallest reliable resolving artifact, its owner, and what it must establish.
- Inventory-only availability, runtime preservation, conditional conclusions, read-only behavior, and all activation paths remain unchanged.
- No semantic fixture, criterion, prompt, coverage mapping, evaluator, runtime policy, dependency, release identity, or website UI changes.
- `moldea/SKILL.md` remains at or below 1,917 words, and the complete portable Markdown tree remains at or below 13,913 words.
- Skill validation, unit tests, integration tests, complete correctness tests, documentation checks, and 48-case semantic preflight pass.
- Corrected source is reviewed and committed before paid execution.
- One fresh pinned-host full run promotes exactly 48 passing cases atomically within the 96-call bound.
- The corrected regression case passes for the intended resolver behavior, and all pre-existing cases pass without forbidden behavior or repository-control violations.
- The result contains complete exact provenance and no secret, credential, private path, or malformed evidence.
- Post-promotion tests, documentation checks, and website checks pass.
- Source and evidence remain uncommitted until their respective explicit review and `repo push` commands.

### Evidence-backed stop outcome

- The first behavioral, identity, infrastructure, or call-budget failure stops the fresh run.
- The compatible candidate and complete failure evidence remain inspectable.
- No automatic retry, targeted run, source edit, evaluator change, host change, restart, qualification, release check, commit, or push follows.
- The final report classifies the failure and identifies the separately planned next decision without starting another correction loop.

Either outcome completes this plan. Only the passing outcome makes fresh Custom qualification planning appropriate.

## Approval required

Approval authorizes only the implementation scope described here: strengthen existing portable reference routing and evidence-limitation reporting, synchronize focused deterministic assertions and public documentation, preserve all 48 semantic contracts and release identity, and complete model-free verification. It does not authorize source edits until approval is given, does not authorize a commit or push, and does not authorize the paid semantic run. After the corrected source is reviewed and committed, the fresh 48-case evaluation requires separate explicit authorization for up to 96 new Terra model calls. No standalone diagnostic, evaluator weakening, repeated correction loop, qualification, release check, publication, or tag is authorized.
