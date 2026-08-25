# Canonical no-change reporting correction

## Objective

Make the existing relevance-triggered maintenance contract reliable on `gpt-5.6-terra` without broadening behavior or accumulating instructions. A write-capable Moldea operation that reconsiders canonical state must make one final canonical-state outcome explicit: which canonical surfaces changed, why no canonical change was required, or why the operation is blocked.

The narrow source correction and destructive semantic reset are already complete. The remaining work is to review and commit that exact source boundary, prove the corrected case with one bounded non-recording diagnostic, generate the first clean official 48-case semantic result, and only then run documentation and website verification against real attempt-backed evidence.

## Repository evidence

- `moldea/SKILL.md` owns the universal final-report contract. Before correction, its canonical-state requirement was one item inside a long reporting list.
- `moldea/references/continuous-maintenance.md` already requires relevance analysis, preservation of correct canonical state, retention of the no-change reason, and truthful reporting. The public `README.md` already says the coding agent explicitly states when no canonical change was required and explains why.
- `fixtures/conformance-cases.json` defines `adopted-relevance-no-change` with a natural behavior-preserving refactor request. Its expected criteria require canonical reconsideration, no documentation churn, and an explicit no-change conclusion.
- The rejected initial trial and confirmation both performed the refactor, inspected canonical state, ran the repository-local CLI, and avoided canonical edits. Both omitted the explicit no-change conclusion. That repeated omission established a portable-instruction salience defect.
- The semantic case, coverage map, runner fixture, website presentation metadata, and public methodology remain correct. Changing them would hide rather than fix the observed behavior.
- The website semantic loader is intentionally attempt-backed. `website/src/lib/semantic-evaluation/loader.ts` parses a required latest pointer, resolves it to an immutable attempt, validates its current release identity, and builds every case model from that attempt. Its public model requires non-null `latest` and `latestPointer` values.
- With zero semantic attempts, `loadVerifiedSemanticEvaluationAttempts` returns `latest: null`. `npm run docs:check` and `npm run website:check` therefore fail at the required latest-pointer schema. This is the established website contract, not a regression caused by the portable correction.

## Completed implementation

### Portable reporting correction

- `moldea/SKILL.md` now begins `## Report truthfully` with one standalone `Canonical state` outcome covering changed, unchanged, and blocked results.
- The superseded buried list item was removed instead of duplicated.
- The portable file decreased from 1,917 words and 15,363 bytes to 1,916 words and 15,368 bytes.
- Activation, authority, relevance analysis, write behavior, read-only behavior, and deterministic reporting remain unchanged.

### Deterministic contract synchronization

- The single existing assertion in `tests/conformance.test-unit.mjs` was synchronized with the consolidated wording.
- No second wording-only test was added.
- `adopted-relevance-no-change`, its natural developer prompt, expected criteria, forbidden criteria, runner fixture, coverage entry, and website title remain unchanged.

### Preserved prior correction

- The already reviewed `register-material-runtime-relationships` correction in `fixtures/conformance-cases.json` remains byte-identical throughout this implementation.
- Its current complete-file SHA-256 is `0edfc506d2fe5e1f271ea69beec7dd8993ba86bf833f6bf7c1cf50dd4d441d34`.

### Clean semantic reset

- The ignored terminal `fixtures/.semantic-evaluation-candidate.json` was permanently deleted without a backup.
- Every current semantic attempt directory and `fixtures/semantic-evaluation-results/latest.json` was deleted.
- The two older tracked attempt directories remain deleted in the worktree.
- `fixtures/semantic-evaluation-result.json` is absent.
- `fixtures/semantic-evaluation-results/README.md` remains.
- `npm run eval:semantic:verify` accepts the empty history with zero attempts and zero issues.

## Revised verification boundary

The source review checkpoint does not require `npm run docs:check` or `npm run website:check` while semantic history is intentionally empty. Those commands require an immutable latest attempt by design and cannot pass until the official runner records one.

Do not add a temporary semantic empty-state model, nullable public website contract, placeholder pointer, synthetic attempt, or hand-written evidence merely to make the intermediate development state render. That would expand product behavior, weaken evidence ownership, and create code that is unnecessary once the clean official run is recorded.

Documentation and website verification move to the first terminal recorded attempt:

- A failed or incomplete official attempt provides valid inspectable website evidence and must make both checks exercise the current failure state.
- A passing official attempt provides the release-candidate website state and must make both checks pass before semantic evidence is committed.
- The non-recording diagnostic does not create website evidence and therefore does not trigger those checks.

## Desired final behavior

- Every write-capable Moldea operation reports one concise and unmistakable `Canonical state` outcome.
- When canonical state remains correct, the response explicitly says no canonical change was required and gives the evidence-based reason. Reporting only successful inspection or no diagnostics is insufficient.
- The reporting contract does not force canonical edits, documentation churn, exact canned prose, or a verbose checklist.
- Changed-state, blocked-state, read-only evaluation, initialization, ambiguity, and dedicated-repository behavior remain unchanged.
- The portable skill remains vendor-neutral and fixed to release `3.1.0`, CLI `4.0.1`, schema `2`, and the existing file and dependency boundaries.
- The suite remains at 48 cases. The existing failed case is the authoritative behavioral regression proof.
- The next official semantic history begins empty and is populated only by the official runner from committed corrected source.

## Remaining scope

### Source review and publication checkpoint

- `moldea/SKILL.md`
- `tests/conformance.test-unit.mjs`
- the preserved correction in `fixtures/conformance-cases.json`
- deletions under `fixtures/semantic-evaluation-results/`
- the current planning artifact under `coding-agent-planning/1787657003_canonical-no-change-reporting/`

### Paid forward verification after separate authorization

- one non-recording Terra diagnostic for `adopted-relevance-no-change`, exactly two model calls
- one clean recorded 48-case semantic run, up to 96 model calls
- separately authorized confirmation or resume only if the recorded runner stops

### Post-attempt verification

- semantic history verification
- root correctness tests
- documentation generation checks
- website type, lint, format, build, and artifact checks through the existing `website:check` boundary
- raw evidence, pointer, provenance, secret, and path inspection

## Explicit exclusions

- Do not modify the website loader, website schemas, page components, route contracts, or empty-state behavior.
- Do not add a placeholder semantic attempt or pointer.
- Do not restore or preserve the rejected semantic checkpoint or attempt artifacts outside Git history.
- Do not add another semantic case, lead the actor through a changed prompt, weaken criteria, change judge instructions, change confirmation policy, or modify checkpoint schemas.
- Do not add exact phrase matching or make canned prose the semantic pass condition.
- Do not change activation, write authority, canonical routing, CLI behavior, release identity, dependencies, package-manager support, model, reasoning effort, timeout, sandbox, network controls, or qualification profiles.
- Do not run Custom or adapter qualification, publish a release, tag, commit, or push without its explicit command or authorization.
- Do not modify protected coding-instruction files.

## Verification completed

The following checks passed against the exact current source and empty semantic history:

- `python3 /home/jesusgraterol/.codex/skills/.system/skill-creator/scripts/quick_validate.py moldea`
- `npm run eval:semantic:verify`: zero attempts, zero issues
- `node --test tests/conformance.test-unit.mjs`: 39 passed, one expected evidence-dependent skip
- `node --test tests/semantic-evaluation-runner.test-unit.mjs tests/semantic-evaluation-runner.test-integration.mjs`: 50 passed
- `npm run eval:semantic:preflight`: all 48 cases passed
- `npm test`: 114 unit tests and 45 integration tests passed, with one expected skip in each category
- `npm run release:identity:check`: skill `3.1.0` and CLI `4.0.1` synchronized
- `git diff --check`
- word, byte, and preserved-fixture digest checks

The following commands were run and failed only because semantic history is intentionally empty:

- `npm run docs:check`
- `npm run website:check`

Their common failure is `SemanticLatestResultSchema.parse(loadedHistory.latest)` receiving `null`. Under this revised plan, that result is expected at the source-only checkpoint and must not be hidden or fixed with temporary website behavior.

## Remaining execution steps

1. **Review the completed source boundary.**
   - Inspect the full status and diff, including deleted evidence and the planning artifact.
   - Confirm the reporting correction is concise, the prior fixture correction remains intact, no semantic scenario was weakened, and no unrelated source changed.
   - Reuse the successful checks above only while their exact inputs remain unchanged.
   - Treat the two empty-history website failures as explained deferred checks, not readiness evidence for the final release.

2. **Commit and push before model execution.**
   - Require a separate `repo push` command.
   - Stage the complete cohesive worktree according to the repository command contract, create the required signed and signed-off commit, and push only the active branch to its resolved destination.
   - Do not run paid evidence from uncommitted source.

3. **Run one targeted forward diagnostic after separate paid authorization.**
   - Require a clean committed source boundary and authorization for exactly two Terra calls.
   - Run `adopted-relevance-no-change` with `--case` and without `--record` using the fixed Codex host, `gpt-5.6-terra`, medium reasoning, existing Bubblewrap isolation, and five-minute timeout.
   - Inspect the actor response, commands, workspace change, and judge rationale.
   - Require the actor to perform the refactor, reconsider canonical state, avoid canonical churn, and explicitly explain why no canonical change was required.
   - If it fails, stop. Do not add wording, retry, or begin the full run automatically. A new plan must reassess whether the contract is realistically reliable on Terra.

4. **Run the first clean official semantic evaluation after separate paid authorization.**
   - After the diagnostic passes, require authorization for up to 96 model calls.
   - Confirm the exact committed source, portable digest, suite digest, coverage digest, CLI `4.0.1`, fixed host identity, empty attempt history, and absent checkpoint.
   - Run all 48 cases with `--record --restart` using separate Terra actor and judge processes.
   - Preserve atomic per-case checkpointing and stop at the first failed initial case.
   - Do not confirm or resume without the existing separate approvals.
   - Promote only when every case passes initially or through separately authorized bounded recovery.

5. **Verify every terminal official attempt.**
   - Immediately run `npm run eval:semantic:verify`.
   - Inspect the attempt, evidence, latest pointer, actor and judge hosts, digests, token usage, workspace evidence, secrets, and private paths.
   - Run `npm run docs:check` and `npm run website:check` now that a valid latest attempt exists.
   - If the attempt failed or is incomplete, preserve it, report its exact case evidence, and stop under the existing confirmation or correction protocol.

6. **Verify and review a promoted passing result.**
   - Require 48 resolved passing cases and a valid canonical `fixtures/semantic-evaluation-result.json`.
   - Run `npm run eval:semantic:verify`, `npm test`, `npm run docs:check`, `npm run website:check`, `npm run release:identity:check`, and `git diff --check`.
   - Inspect generated website presentation and raw evidence links.
   - Stop for `review` and a separate `repo push` before qualification work.

## Data, persistence, and integrity

- The portable correction changes the artifact digest. Prior semantic and qualification evidence cannot establish freshness for it.
- The developer's explicit clean-run direction authorizes removal of the rejected unreleased history. No backup was created. Previously committed artifacts remain recoverable only through Git history.
- The diagnostic is non-recording and cannot satisfy the release gate.
- The official runner remains the only writer of checkpoints, attempts, pointers, and canonical results.
- A terminal recorded failure remains inspectable and must not be silently deleted, replaced, retried, or confirmed.
- Compatible completed trials may resume only within the same official candidate. Source, suite, coverage, model, reasoning, protocol, or CLI changes invalidate reuse.
- Website generation consumes valid attempt-backed evidence. It does not own or fabricate evaluation state.

## Security and authorization

- No secrets, credentials, private paths, or model output are manually added to evidence.
- Diagnostic, full evaluation, confirmation, and resume each require immediate explicit approval with the maximum call count stated beforehand.
- Actor and judge retain separate Bubblewrap workspaces, restricted HTTPS relay, and the fixed Terra host contract.
- No package installation, dependency change, Git mutation, external publication, qualification, or release occurs without its established authorization.

## Risks and controls

- **Repeated instruction growth:** the correction consolidated one rule and reduced the portable word count.
- **Teaching to the test:** the natural prompt and semantic criteria remain unchanged, and no literal phrase matcher was introduced.
- **Another expensive recurrence:** the separately authorized two-call diagnostic precedes the 96-call run and has a hard stop on failure.
- **Temporary website complexity:** empty-history support is explicitly excluded; website checks are deferred until real evidence exists.
- **Invalid evidence inputs:** source must be committed before model execution, and behavior-bearing inputs must remain unchanged during the run.
- **Over-deletion:** only the explicitly approved semantic checkpoint, attempts, result, and pointers were removed; the results README remains.
- **Premature release claims:** semantic success does not replace Custom and adapter qualification, which remain later work.

## Acceptance criteria

- `moldea/SKILL.md` contains one prominent canonical-state outcome contract and remains at or below its former 1,917-word count.
- Existing activation, authority, maintenance, evaluation, initialization, and reporting semantics remain intact.
- `adopted-relevance-no-change` and its evaluator contract remain unchanged.
- The prior runtime-relationship fixture correction remains intact.
- Semantic history is empty and verifier-valid before the new official run.
- All completed source checks listed above pass; the two website checks are correctly deferred because no attempt exists.
- No website empty-state or placeholder-evidence path is introduced.
- Source is reviewed and committed before paid execution.
- The targeted Terra diagnostic passes without recording evidence.
- A separately authorized official run creates the first valid attempt-backed website state and ultimately a 48/48 passing canonical result.
- Documentation and website checks pass against every terminal official attempt and the promoted result.
- No qualification, publication, release, tag, commit, push, dependency change, or unrelated refactor occurs outside its explicit authorization boundary.

## Approval required

Approval accepts the completed narrow source correction and destructive clean reset, and revises the verification order so `docs:check` and `website:check` are deferred until the official runner creates a valid latest attempt. It explicitly rejects adding temporary website empty-state support or placeholder evidence. Approval does not authorize a commit, push, paid diagnostic, semantic evaluation, confirmation, resume, qualification, publication, or release; those operations retain their separate authorization boundaries.
