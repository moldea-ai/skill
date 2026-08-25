# Outcome-based correction reporting and bounded semantic rerun plan

## Status and planning basis

This revision replaces the completed semantic-convergence plan after its fresh run reached the defined evidence-backed stop outcome. The previous plan's source correction was reviewed, committed, and pushed as commit `15ef3a1f559cb4ac678ea1c1cec187dc60d82059`. Its paid run then stopped at the first failed checkpoint, as required.

The repository is on branch `qualifications` at that commit with no tracked or untracked change. The ignored candidate is the only changed local runtime artifact:

- candidate SHA-256: `277d169d9c4a4617bf2f822aff055f86ec286095dba8c278db80e6489b69f266`
- committed result SHA-256: `24776c035f35a99c9a85492d40d2b5354fe02e48eb9d6e467267e0497d413134`
- portable artifact digest: `698a1309b89544d24d8f4188e0ed338c3b460dddf97ac2e88c14ea097c691169`
- semantic case-suite digest: `7e404829632982fe672c6d3b28dfc86912c76261892580bd6fb2a30325d682b7`
- semantic coverage digest: `d251af7f3fd13337e6f362b9a0c35e9fd605b006894f2f8e17fb3c1da1c2da57`
- semantic protocol `12`, result schema `2`, and published `@moldea.ai/cli` `4.0.1`
- actor and judge host identity: Codex CLI `0.149.0`, `gpt-5.6-terra`, `medium`

The candidate contains exactly six passes followed by the first failure. No later case was recorded:

1. `unadopted-direct-context-handoff`: pass
2. `unadopted-relevance-no-initialization`: pass
3. `initialize-insufficient-context`: pass
4. `initialize-partial-context`: pass
5. `initialize-sufficient-context`: pass
6. `adopted-direct-context-handoff`: pass
7. `adopted-explicit-context-correction`: fail

Fourteen model calls were used. The source worktree stayed unchanged, the committed result was not replaced, and the candidate remains local and resumable only while all bound inputs stay unchanged.

## Failure evidence and product decision

The failed actor made the correct substantive change. It replaced the canonical sentence that said the invoice service authorized payment decisions with a sentence establishing extraction, validation, and no payment authority. It changed only `moldea/project.md`, ran the exact repository-local `moldea inspect --json`, received `valid` with no diagnostics, and preserved every protected repository control.

The actor response was:

> Updated `moldea/project.md` to state that the service extracts and validates invoice data, and never authorizes payments. `moldea inspect --json` completed successfully (`valid`, no diagnostics).

The judge accepted correction authority, the canonical workspace change, and deterministic inspection. It failed only `report-corrected-project-truth` because the response did not separately restate the former false payment-authorization sentence.

The current contract requires the completion report to name stale and current truth. That requirement is more literal than the product needs and conflicts with the established goal of concise, useful reports. A report should make the corrected boundary and resulting truth clear, but it should not have to repeat obsolete false content when the correction is already unambiguous and independently visible in the workspace evidence.

The approved product decision is therefore:

- preserve explicit-correction authority and conflict safety unchanged
- continue requiring the smallest correct canonical update
- continue requiring removal of contradictory stale truth
- continue requiring deterministic post-write evidence
- require the actor response to identify the corrected boundary and state the resulting current truth
- do not require verbatim or separately repeated stale wording when the correction is otherwise clear
- continue rejecting a generic statement such as “context updated” that does not communicate the resulting boundary

This is an outcome-based contract correction. It does not excuse an incorrect repository change, hidden stale content, broad rewrite, ceremonial clarification, missing validation evidence, or vague completion report.

## Objective

Align the portable maintenance contract, public documentation, deterministic assertions, and the existing explicit-correction semantic criterion with the approved concise outcome-based behavior. Add a native recorded-run option that stops after the first failed checkpoint so future bounded evaluations do not depend on an ad hoc process wrapper.

Then generate one fresh 48-case semantic result from clean committed source. The previous six passes are diagnostic evidence only and cannot be reused because both the portable artifact and semantic case-suite digest will change.

## Desired final behavior

For an adopted repository receiving an explicit correction, the coding agent must:

1. Treat the correction as sufficient Maintain authority without asking for ceremonial confirmation.
2. Inspect the established canonical truth and classify the handoff as a current replacement.
3. Apply the smallest coherent canonical change.
4. Remove or replace contradictory current truth rather than appending a second incompatible claim.
5. Preserve unrelated canonical state and avoid unrelated agents, runtimes, or relationships.
6. Run the exact repository-local deterministic inspection after writing.
7. Report the corrected project boundary, the resulting current truth, and the exact deterministic outcome.

The response may be concise. It can say that the service now extracts and validates invoices and never authorizes payments without separately quoting the obsolete authorization sentence. It cannot merely say that documentation was updated, omit the resulting truth, or leave payment authorization presented as current behavior.

## In-scope files and ownership

### Portable skill

- `moldea/references/continuous-maintenance.md`
  - Replace the literal “name stale and current truth” sentence with an outcome-based reporting rule.
  - Require the corrected boundary and resulting current truth while allowing obsolete wording to remain omitted when the correction is clear.
  - Preserve adoption, authority, conflict clarification, filtering, canonical routing, deterministic evidence, and no-churn behavior.

`moldea/SKILL.md`, `context-gathering.md`, activation metadata, and other portable references do not need changes. The entrypoint already routes knowledge-triggered maintenance to `continuous-maintenance.md`, and the failure did not expose an activation, authority, persistence, validation, or reference-loading gap.

### Semantic contract

- `fixtures/conformance-cases.json`
  - Keep `adopted-explicit-context-correction` as the same natural request, repository seed, operation, expected labels, and forbidden labels.
  - Change only the `report-corrected-project-truth` criterion so it evaluates whether the response clearly states the corrected boundary and resulting current truth.
  - State that repeating the obsolete claim verbatim is unnecessary when the correction remains unambiguous.
  - Preserve the workspace-owned correction criterion as the authority for actual stale-content removal.

- `tests/conformance.test-unit.mjs`
  - Replace the literal stale-and-current wording assertion with focused assertions for corrected-boundary reporting, resulting current truth, and permission to omit obsolete wording.
  - Add a focused assertion for the revised `report-corrected-project-truth` criterion so future edits cannot weaken it into a generic completion claim.
  - Preserve all activation, authority, ambiguity, canonical-change, validation, and forbidden-behavior assertions.

The semantic coverage map remains unchanged. The same case still covers the same activation/adoption and knowledge-quality claims. The case definition digest and complete suite digest will change because an evaluator criterion changes; the coverage-file digest remains unchanged.

### Public state-bearing documentation

- `README.md`
  - Replace the statement that a report names both the replaced claim and current truth with concise corrected-boundary and resulting-truth language.

- `docs/continuous-maintenance.md`
  - Make the same public contract change.
  - Preserve all examples, format-independent knowledge handling, clarification behavior, and write boundaries.

No website component or metadata change is required. The existing case title “Applies an explicit context correction” remains accurate, and the website derives current criteria from the committed fixture and result.

### Bounded semantic-runner operation

- `tests/semantic-evaluation-runner.mjs`
  - Add `--stop-on-failure` for full recorded runs.
  - Require it to be used with `--record` and reject combinations with `--case` or `--preflight`.
  - After a failed case has been merged into the candidate and written atomically, stop before starting the next case.
  - Preserve the candidate, report the remaining pending or failing count, and exit nonzero.
  - Leave ordinary full runs, targeted diagnostics, targeted recording, restart, resume, promotion, and successful 48-case behavior unchanged.

- `tests/semantic-evaluation-runner.test-unit.mjs`
  - Add focused option-contract tests for accepted and rejected combinations.
  - Test the loop decision through a small exported pure decision boundary used by the runner, proving that pass continues, ordinary failure preserves current behavior, and stop-on-failure halts only after failure.
  - Avoid duplicating candidate persistence tests already owned by integration coverage.

- `README.md` and `docs/semantic-evaluation.md`
  - Document the option as the supported bounded-run mode.
  - State that the checkpoint is written before stopping and a later run requires fresh authorization.
  - Keep ordinary resumable and targeted-run documentation intact.

The option changes orchestration, not evidence meaning. It does not require a result-schema or semantic-protocol change because actor input, judge input, case assessment, recorded artifacts, compatibility binding, and promotion semantics remain identical.

## Explicit exclusions

This plan does not authorize:

- weakening correction authority, conflict handling, canonical truth, validation, or repository-control requirements
- accepting a generic response that does not state the resulting project boundary
- changing the developer direction, scenario seed, operation, evidence sources, expected labels, or forbidden labels
- changing any other semantic criterion or case
- adding a new scenario or changing the 48-case count
- exposing evaluator criteria to actors
- changing judge prompts, assessment logic, model, reasoning effort, timeout, sandbox, relay, host identity, result schema, semantic protocol, cache, or candidate compatibility rules
- changing `@moldea.ai/cli` `4.0.1`, dependencies, package-lock state, release `3.1.0`, `agents/openai.yaml`, activation paths, or portable structure
- changing qualification profiles, qualification evidence, the committed semantic result by hand, or website UI
- reusing any pass from the incompatible 7-result candidate after source or suite changes
- running a targeted retry to replace the observed failure
- committing, pushing, running paid evaluation, publishing, tagging, or releasing without the later explicit commands and approvals

## Implementation strategy

### 1. Preserve the failed evidence baseline

Before editing:

- record branch, `HEAD`, Git operation state, and complete non-excluded worktree status
- record the candidate and committed-result hashes
- record the candidate's exact seven-case sequence, six passes, first failure, actor response, workspace change, repository-control evidence, observed and forbidden labels, and judge rationale
- record the current portable artifact, suite, coverage, CLI, protocol, schema, actor, and judge identities
- record current word and byte counts

Do not edit, delete, or manually migrate the ignored candidate during implementation. It remains the evidence explaining the contract change until the later runner-owned restart replaces it.

### 2. Replace the literal portable reporting rule

Change only the correction-report sentence in `continuous-maintenance.md`. The wording must require the response to make the correction and current truth understandable without prescribing exact headings, a response template, or repetition of known false content.

The rule must remain strong enough to reject:

- “Updated project context” with no resulting truth
- a response that reports only validation status
- a workspace that appends current truth while retaining a contradictory stale claim
- a response that hides an unresolved conflict behind a claimed correction

It must accept a concise response that names the affected boundary and resulting truth, supported by the independently captured workspace change and deterministic inspection.

### 3. Align the existing case rather than adding another one

Update only `report-corrected-project-truth`. The criterion should judge the response and runner-owned evidence together according to their existing ownership:

- the response communicates the corrected boundary and resulting current truth
- `maintain-corrected-product-boundary` continues to prove the actual canonical replacement
- `preserve-stale-payment-authority` continues to fail any workspace retaining the false behavior
- `rerun-correction-inspection` continues to require attributable deterministic evidence

Do not make the criterion match the observed sentence. It must remain format-independent and useful for corrections involving ownership, approval, responsibility, policy, lifecycle, or other durable project boundaries.

### 4. Add a native bounded-run stop

Extend the existing runner argument handling with one explicit option. Keep parsing and the loop decision small and directly testable. The stop must occur only after the completed failed result has been merged and atomically written. It must happen before input validation or actor startup for the next case.

The option must not delete the candidate, promote incomplete evidence, convert failure to success, or silently resume later. A subsequent compatible resume is a separate paid action and still requires developer authorization.

### 5. Preserve prompt economy

Current portable baselines are:

- `moldea/SKILL.md`: 1,917 words and 15,363 bytes
- `moldea/references/continuous-maintenance.md`: 1,450 words and 11,088 bytes
- complete `moldea/` Markdown tree: 13,913 words and 107,211 bytes

After implementation:

- `moldea/SKILL.md` must remain byte-identical
- `continuous-maintenance.md` must not exceed 1,450 words
- the complete portable Markdown tree must not exceed 13,913 words
- no portable file, resource, dependency, metadata field, or activation path may be added
- the implementation report must include before-and-after counts

### 6. Synchronize public documentation and focused tests

Update the root README and continuous-maintenance document in the same change as the portable contract. Update only the directly affected sentences and bounded-run instructions. Preserve the established public voice and avoid requiring one specific completion sentence.

Update unit coverage at the semantic contract rather than snapshotting the complete prose. Existing integration coverage already proves the explicit-correction repository seed and clean Git baseline. Existing candidate integration coverage owns atomic checkpoint persistence; do not duplicate it.

### 7. Verify the source and runner change without model calls

Run formatting only through applicable repository-owned boundaries. The root has no Prettier configuration or formatting script, so do not apply the website or qualification formatter to root files. Use `git diff --check` for the root change.

Run:

```bash
python3 /home/jesusgraterol/.codex/skills/.system/skill-creator/scripts/quick_validate.py moldea
npm run test:unit
npm run test:integration
npm test
npm run eval:semantic:preflight
npm run docs:check
```

Also verify:

- all 48 semantic case IDs remain present and uniquely covered
- the explicit-correction direction, scenario seed, operation, evidence sources, labels, and forbidden criteria remain unchanged
- only `report-corrected-project-truth` changes within that case
- the suite digest changes and coverage-file digest remains unchanged
- the portable digest changes only because `continuous-maintenance.md` changes
- `--stop-on-failure` rejects unsupported combinations and stops after checkpoint persistence
- no test file enters the portable artifact or production website output
- no dependency, lockfile, release identity, protocol, schema, activation, qualification, or website UI change exists
- protected coding instructions remain unchanged and already cover the relevant durable guidance

Before fresh evidence, `npm run test:unit` and `npm run docs:check` are expected to retain only semantic-result freshness failures because the committed result belongs to schema `1`, the old portable artifact, and the old suite. Any independent failure blocks source readiness.

`npm run release:check` remains excluded because both semantic and qualification evidence are stale by design.

### 8. Stop for source review and clean commit

Review the complete source diff, with particular attention to:

- whether the revised criterion still rejects vague completion reporting
- whether actual stale-content removal remains independently enforced
- whether the contract works for project boundaries beyond the invoice example
- whether concise reporting is allowed without losing material truth
- whether native failure stopping occurs after checkpointing and before another case starts
- whether candidate, promotion, and resume behavior remain unchanged
- portable word and byte counts
- exact unchanged scenario surfaces

A separate `review` must establish readiness. A separate `repo push` must commit and push the source before paid execution. The ignored failed candidate remains local until the clean committed source and new suite make it incompatible.

### 9. Start one fresh bounded semantic evaluation

After the corrected source is committed and the developer gives fresh explicit authorization for up to 96 model calls:

- require a clean repository at the exact source commit
- verify the exact portable, suite, coverage, CLI, lockfile, protocol, schema, host executable, companion executable, model, and reasoning identities
- run the free 48-case preflight
- replace the incompatible candidate only through `--record --restart`
- use the pinned absolute Codex CLI `0.149.0`
- enable `--stop-on-failure`

The command will be:

```bash
MOLDEA_EVAL_ACTOR_COMMAND_JSON='["/home/jesusgraterol/.codex/packages/standalone/releases/0.149.0-x86_64-unknown-linux-musl/bin/codex","exec","--ignore-user-config","--ignore-rules","--ephemeral","--skip-git-repo-check","--dangerously-bypass-approvals-and-sandbox","-c","shell_environment_policy.inherit=none","-"]' npm run eval:semantic -- --record --restart --stop-on-failure
```

The run may make at most 96 calls. It uses one actor and one independent judge per completed case, five-minute process timeouts, atomic checkpoints, Bubblewrap isolation, restricted egress, protected Git and skill surfaces, and a read-only judge workspace.

Do not run a standalone diagnostic or targeted retry first. The failed candidate already established the contract problem, and its evidence informed this correction.

### 10. Apply the final stop rule

If any case fails or an identity, infrastructure, or call-budget problem occurs:

- preserve the checkpoint and stop before the next case
- do not retry, resume, edit source, change criteria, switch hosts, or restart
- inspect the complete failed evidence
- report the terminal outcome

Another failure does not authorize another correction loop. Any further change requires a separate developer decision based on the complete evidence.

If the process is interrupted without a completed failure, preserve the compatible checkpoint. Resuming still requires a later explicit instruction and unchanged bound inputs. Already passing cases remain checkpointed, while a partially completed case may consume another actor and judge pair.

### 11. Verify successful promotion

Only if all 48 cases pass, allow atomic promotion and candidate removal. Then verify:

- exactly 48 unique passing cases
- the explicit-correction case passes because the response communicates the corrected boundary and current truth while the workspace removes stale behavior
- the runtime-evidence regression case still passes under the previously strengthened resolver contract
- no forbidden outcome or repository-control violation exists
- schema, protocol, artifact, suite, coverage, CLI, lockfile, actor, judge, model, effort, and host identities are exact
- no secrets, credentials, private host paths, malformed artifacts, or unexpected repository content appear
- the website semantic loader accepts the promoted result

Run:

```bash
npm run test:unit
npm run test:integration
npm test
npm run docs:check
npm run website:check
```

Do not run qualification or `release:check`. The changed portable digest requires fresh Custom and adapter qualification evidence in a later separately planned and authorized phase.

Stop with the generated semantic result uncommitted. A separate `review` and `repo push` are required.

## Data flow and ownership

```text
explicit developer correction
        |
        v
portable maintenance contract
  -> authorizes replacement
  -> requires corrected boundary and current truth
  -> does not require obsolete wording repetition
        |
        v
semantic explicit-correction case
  -> actor sees only natural direction
  -> workspace proves canonical replacement
  -> deterministic event proves inspection
  -> judge checks outcome-based response criterion
        |
        v
recorded runner with --stop-on-failure
  -> writes each checkpoint atomically
  -> stops before the next case after failure
  -> promotes only after 48/48 pass
```

The portable reference owns behavior. The semantic fixture owns the observable evaluation contract. Runner-owned workspace and execution evidence prove the change independently of the actor's prose. The runner owns checkpoint, stop, resume, and promotion behavior. Public documentation explains the same contract. Qualification remains outside this plan.

## Security, integrity, compatibility, and recovery

- The contract correction adds no execution authority, network behavior, dependency, secret handling, or persistence path.
- Explicit corrections still require developer-established replacement meaning.
- Unexplained conflicts still stop writes and require one focused question.
- The actor still cannot modify Git controls or the installed skill.
- The judge remains independent and read-only.
- The native stop option cannot convert failure to passing evidence or promote an incomplete candidate.
- The failed 7-result candidate is never manually edited or partially reused after its bound inputs change.
- The committed passing result remains untouched until a complete fresh run promotes atomically.
- No backwards-compatibility path is needed because this is unreleased development evidence and the user explicitly prefers one clean current contract.
- Rollback before paid execution is the ordinary source revert of this cohesive change. After paid execution, evidence bound to the reverted inputs cannot be reused.

## Risks and edge cases

- Relaxing wording too far could let a generic completion statement pass. The criterion must still require the corrected boundary and resulting current truth.
- Repeating the failed actor sentence in the criterion would overfit one sample. The contract must remain format-independent.
- The workspace can be correct while the response is misleading. The judge must continue assessing both surfaces independently.
- A response can state current truth while the file retains a contradiction. The existing workspace and forbidden criteria must remain authoritative for actual correction.
- A new suite digest invalidates every old candidate result, including six valid passes. Reuse would compromise evidence integrity.
- Adding stop-on-failure after checkpointing is essential. Stopping before the write would lose the failure; stopping after another case starts would exceed the intended boundary.
- A passing fresh run can still take hours and use 96 calls. Checkpointing protects completed work from interruption but does not make repeated paid attempts free.
- Another behavioral failure may reflect model variance, another product-contract mismatch, or a genuine skill gap. The final stop rule prevents automatic interpretation as permission to edit again.

## Acceptance criteria

### Source and runner outcome

- Explicit-correction authority, canonical replacement, ambiguity handling, validation, and repository controls remain unchanged.
- Completion reports must state the corrected boundary and resulting current truth.
- Obsolete false wording need not be quoted or separately repeated when the correction is clear.
- Generic or materially incomplete reports still fail.
- Only `report-corrected-project-truth` changes within the existing semantic case.
- The semantic case count remains 48 and coverage remains complete.
- `--stop-on-failure` writes the failed checkpoint and stops before the next case.
- Ordinary run, restart, resume, targeted case, and promotion behavior remains intact.
- `SKILL.md` is byte-identical, `continuous-maintenance.md` stays at or below 1,450 words, and the complete portable Markdown tree stays at or below 13,913 words.
- Every model-free check passes except explicitly identified stale semantic-result freshness gates.

### Passing evidence outcome

- Corrected source is reviewed and committed before paid execution.
- One fresh bounded run produces exactly 48 passing cases within 96 calls.
- The explicit-correction case passes for substantive correction and concise truthful reporting, not a matched sentence.
- All pre-existing cases pass without forbidden behavior or repository-control violations.
- The promoted result contains complete exact provenance and no sensitive or malformed evidence.
- Post-promotion correctness, documentation, and website checks pass.

### Evidence-backed stop outcome

- The first behavioral, identity, infrastructure, or budget failure is checkpointed and stops the run before another case begins.
- No automatic retry, targeted run, source edit, evaluator change, host change, restart, qualification, release check, commit, or push follows.
- The terminal report identifies the exact failure and preserves evidence for a separate developer decision.

Either evidence outcome completes the paid phase. Only the passing outcome makes fresh qualification planning appropriate.

## Approval required

Approval authorizes only the model-free implementation described here: replace the literal stale-claim repetition requirement with a concise outcome-based correction-report contract, update the one existing semantic criterion and its focused tests and public documentation, add and document native `--stop-on-failure` runner behavior, and complete model-free verification. It does not authorize a commit, push, paid semantic call, candidate replacement, qualification, release check, publication, or tag. After source review and a clean commit, the fresh 48-case Terra run requires separate explicit authorization for up to 96 model calls.
