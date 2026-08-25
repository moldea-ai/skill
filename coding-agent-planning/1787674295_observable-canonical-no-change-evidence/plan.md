# Observable canonical no-change evidence correction

## Objective

Correct the `adopted-relevance-no-change` semantic case so the independent Terra judge assesses the observable product contract: the actor must identify the affected canonical state, explain why a behavior-preserving implementation change leaves it accurate, explicitly report that no canonical change was required, and leave canonical files untouched.

This is a focused semantic-case correction. Repository inspection shows that the portable skill already states the intended behavior clearly, so adding more portable instructions would be overfitting one model miss and would increase every user's prompt cost without establishing a new product requirement.

## Current state and repository evidence

- The committed source is `985c5f7e39413156ba9dab485a54cae15a04e63b` on `qualifications`, with skill release `3.1.0`, exact CLI `4.0.1`, semantic protocol `14`, and 48 semantic cases.
- The protocol-14 run recorded immutable failed attempt `20260825T160421599Z-semantic-8eaaae75` after eight initial passes. The terminal confirmation sequence recorded `20260825T160648370Z-semantic-5eed84ee`; confirmation 1 failed, so confirmation 2 was correctly skipped. Both attempts and the updated latest pointer are currently uncommitted, and `npm run eval:semantic:verify` accepts all 13 attempts.
- The initial actor performed the requested behavior-preserving refactor, changed no canonical file, projected a valid `inspect` result, and reported: “Canonical project inspection passed with no diagnostics; `/moldea/**` required no changes.”
- The initial judge accepted `report-no-canonical-change` but rejected `reconsider-affected-state` because no runner-owned command fact demonstrated the actor's internal affected-state evaluation. That demand is unsupported by the criterion's actual semantic purpose. A structural `inspect` fact cannot prove an internal reasoning step, and adding a synthetic command fact would not make that reasoning observable.
- The independent confirmation actor again performed the behavior-preserving refactor and left canonical files untouched, but reported only that project-context validation passed. It did not explicitly state that no canonical change was required or explain the affected-state conclusion. The confirmation judge therefore rejected the result for a legitimate observable omission.
- `moldea/SKILL.md` already requires every write-capable operation to report `Canonical state`, including “no canonical change and why.” Its common lifecycle also says to make no canonical edit when existing state remains correct.
- `moldea/references/continuous-maintenance.md` already requires the actor to report reconsidered surfaces and why unchanged canonical state needed no edit.
- `README.md` and `docs/continuous-maintenance.md` already document the same public behavior: identify the canonical state reconsidered, explicitly state that no canonical change was required, and explain why it remains correct.
- The current `moldea/SKILL.md` is 1,916 words. No portable wording, reference, metadata, version, dependency, activation path, or public documentation change is justified by the observed evidence.
- The problematic case currently splits the outcome between `reconsider-affected-state`, phrased as the unobservable internal action “evaluates,” and `report-no-canonical-change`, which is observable. Its `skip-relevance-analysis` prohibition is likewise framed around an internal action rather than evidence supplied to the judge.

## Desired final behavior

- The case continues to require relevance-triggered maintenance for a path declared through `/src/**`.
- A passing actor must make the observable no-change conclusion explicit and concise:
  - identify the affected canonical state it reconsidered
  - connect the behavior-preserving workspace change to why that state remains accurate
  - state that no canonical change was required
  - leave canonical documentation and manifests unchanged
- The independent judge uses the actor response together with pre-actor scenario evidence and before/after workspace evidence for this semantic conclusion.
- Runner-owned command facts remain authoritative only for the results they can actually prove. A valid `inspect` fact may establish structural validity, but it neither proves nor replaces relevance analysis.
- The initial failed trial remains meaningful evidence of an evaluator false negative. The confirmation remains a meaningful actor failure because its report omitted the no-change conclusion.
- Semantic protocol remains `14`. The evidence schema and command-result semantics do not change; the existing case-suite digest is sufficient to invalidate the terminal checkpoint.
- The portable skill digest remains unchanged, avoiding another instruction refinement and any increase in ordinary paid usage.

## In-scope changes

### Observable case criteria

Update only the `adopted-relevance-no-change` criteria in `fixtures/conformance-cases.json`:

- Preserve the `reconsider-affected-state` label, but define it through evidence the judge actually receives: the actor response identifies the canonical state implicated by the declared affected path and explains, consistently with the behavior-preserving workspace diff, why that state remains accurate.
- Preserve the `report-no-canonical-change` label as the distinct outcome check: the actor response explicitly states that no canonical change was required, while workspace changes show no canonical documentation or manifest edit.
- Preserve `documentation-churn` unchanged.
- Rewrite `skip-relevance-analysis` as an observable prohibition: the actor claims completion without identifying the affected canonical state or explaining why the behavior-preserving change leaves it accurate.

Keep the case ID, scenario, natural developer direction, operation, repository evidence, fixture, expected-label inventory, forbidden-label inventory, website presentation metadata, coverage mapping, and case count unchanged.

### Deterministic contract coverage

Update `tests/conformance.test-unit.mjs` with a focused semantic-case contract assertion that:

- locates `adopted-relevance-no-change` by ID
- confirms both existing expected labels and both existing forbidden labels remain present
- confirms `reconsider-affected-state` is grounded in the actor response plus supplied scenario or workspace evidence
- confirms `report-no-canonical-change` requires an explicit no-change report and absence of canonical workspace edits
- confirms `skip-relevance-analysis` is phrased as an observable reporting omission rather than an unverifiable internal process
- prevents the criterion from requiring a new runner-owned command-result fact for semantic relevance reasoning

Do not add a parallel test file. The existing source-repository conformance suite owns semantic fixture contracts.

### Transparent failed history

Preserve these generated artifacts byte-for-byte throughout implementation and include them in the final review boundary:

- `fixtures/semantic-evaluation-results/attempts/20260825T160421599Z-semantic-8eaaae75/`
- `fixtures/semantic-evaluation-results/attempts/20260825T160648370Z-semantic-5eed84ee/`
- `fixtures/semantic-evaluation-results/latest.json`

They are append-only evidence of the exact defect and confirmation outcome. Do not delete, rewrite, regenerate, sanitize, or replace them. Keep the ignored terminal checkpoint until a separately authorized future `--record --restart` operation removes it through the runner's established workflow.

## Explicit exclusions

- Do not modify `moldea/`, including `SKILL.md`, references, `agents/openai.yaml`, release version, activation, authority, operation, reporting, or tooling rules.
- Do not modify `README.md`, `docs/continuous-maintenance.md`, or website copy because they already describe the desired current behavior accurately.
- Do not change the semantic runner, judge prompt, command-result projector, evidence types, attempt-history code, checkpoint schema, result schema, or semantic protocol.
- Do not add a relevance-analysis command, projected fact, model self-report schema, hidden chain-of-thought requirement, transcript capture, or arbitrary command-output persistence.
- Do not change the case prompt to tell the actor the answer, mention Moldea explicitly, or weaken the natural relevance-triggered activation challenge.
- Do not remove the explicit reporting requirement merely because the initial actor came close to it. The user-visible no-change conclusion remains part of the product contract.
- Do not add, remove, merge, rename, or reorder semantic cases or criteria labels.
- Do not change coverage, website presentation metadata, dependencies, lockfiles, workflows, qualification code, qualification profiles, or result artifacts outside the two existing failed attempts.
- Do not run a standalone paid diagnostic. The approved release workflow requires the next official run to exercise the complete suite.
- Do not run another semantic evaluation, confirmation, qualification, commit, push, release, or publication as part of implementation approval.
- Do not modify protected coding-instruction files.

## Ordered implementation steps

1. **Preserve and fingerprint current evidence.**
   - Record the current hashes of the two attempt directories and `latest.json` before editing source.
   - Confirm the ignored checkpoint is terminal under protocol 14 and that the 13-attempt history verifies.
   - Treat any attempt-byte change during implementation as a blocker rather than regenerating evidence.

2. **Rewrite the one semantic contract around observable evidence.**
   - Update the three affected criterion strings in `fixtures/conformance-cases.json`.
   - Keep the case topology and difficulty unchanged.
   - Make the two expected criteria distinct: one checks the evidence-grounded relevance conclusion, and one checks the explicit no-change outcome plus the absence of canonical edits.
   - Keep deterministic inspection in its real structural role without demanding that it prove semantic reasoning.

3. **Add focused deterministic regression coverage.**
   - Extend `tests/conformance.test-unit.mjs` at the existing semantic-fixture contract boundary.
   - Assert the label inventory, evidence sources, explicit no-change result, and observable failure condition.
   - Avoid a brittle full-sentence snapshot; assert the stable semantic properties that would have caught the current internal-process wording.

4. **Verify the source-only correction.**
   - Run the focused conformance unit test, then the complete root unit and integration suites because the case-suite digest and semantic preflight are shared boundaries.
   - Run all 48 model-free preflight scenarios.
   - Verify all immutable attempts and confirm the two new attempt directories remain byte-identical.
   - Confirm protocol remains 14, the portable skill digest remains `1b81aa56466ba3bad78a737435a45bc34efb9e2ae1452e72746c7fa9890207bb`, the case count remains 48, and only the case-suite digest changes.
   - Run release identity, formatting, JSON parsing, and diff checks.
   - Run `docs:check` only to confirm it fails for the expected stale case-suite boundary. Do not weaken the release gate or treat that expected pre-evidence failure as a source defect.

5. **Review and commit before any paid rerun.**
   - Stop for `review` with the source correction, two immutable attempts, and latest pointer in one transparent review scope.
   - Require a separate `repo push` command to create and publish the signed commit.
   - Require a clean committed source tree before any new model call.

6. **Restart the official semantic run only after fresh authorization.**
   - Explain that the criterion change invalidates the terminal checkpoint through the case-suite digest even though protocol and portable skill are unchanged.
   - Obtain explicit approval for one fresh 48-case Terra run, up to 96 calls.
   - Use the existing `--record --restart` workflow. Restart may remove only the ignored terminal checkpoint and must preserve all committed attempt history.
   - Do not run a separate diagnostic, confirmation, retry, or automatic resume.
   - Stop at the first failure, inspect the exact evidence, and apply the existing bounded confirmation policy only with separate authorization when the evidence supports variance.

## Verification commands

Source correction:

```bash
node --test tests/conformance.test-unit.mjs
npm run test:unit
npm run test:integration
npm test
npm run eval:semantic:preflight
npm run eval:semantic:verify
npm run release:identity:check
website/node_modules/.bin/prettier --check --config website/.prettierrc fixtures/conformance-cases.json tests/conformance.test-unit.mjs
git diff --check
```

Expected freshness boundary before new paid evidence:

```bash
npm run docs:check
```

The command must fail only because the latest semantic attempt does not match the corrected current case-suite digest.

After a separately authorized recorded run:

```bash
npm run eval:semantic:verify
npm run docs:check
```

No paid command belongs to the source implementation scope.

## Persistence, compatibility, and rollback

- Historical attempts retain their original protocol, suite digest, criteria, actor output, judge output, and immutable hashes. The corrected current suite does not reinterpret them.
- The case-suite digest is the compatibility boundary for this correction. The terminal checkpoint cannot resume after the fixture change and must be replaced through `--restart`; no migration is honest or necessary.
- Semantic protocol stays at 14 because no event projection, evidence shape, validation rule, judge transport, or persistence contract changes.
- The portable artifact digest stays unchanged, so this correction does not create another skill revision or change distribution behavior before the evaluator proves the already-documented contract.
- Before a new attempt exists, rollback is an ordinary Git revert of the fixture and focused test. The two failed attempts remain history either way.
- Once new evidence is recorded, rollback must not rewrite or delete that append-only attempt history.

## Risks and controls

- **Weakening the test to force a pass:** retain the explicit no-change report, affected-state explanation, and no-canonical-edit requirements. The confirmation actor's omission must still fail.
- **Another false negative:** remove only the unobservable internal-process wording and tell the judge exactly which supplied evidence establishes each semantic outcome.
- **Overfitting the portable skill:** make no portable change because the desired rule already exists in the entrypoint, focused reference, README, and public guide.
- **Invented deterministic proof:** do not project a fact for semantic relevance analysis. Command evidence proves command results, not reasoning.
- **Prompt leakage:** keep the natural actor request and evaluator-only criteria separation unchanged.
- **Evidence loss:** fingerprint and preserve both failed attempts and the latest pointer byte-for-byte.
- **Unnecessary protocol churn:** rely on the case-suite digest rather than incrementing protocol 14.
- **Repeated paid iteration:** skip a standalone diagnostic and preserve the existing first-failure and bounded-confirmation stopping rules.
- **Misleading website state:** allow the release freshness check to reject the stale latest attempt until a complete current run exists.

## Acceptance criteria

- `adopted-relevance-no-change` still tests natural relevance-triggered maintenance and the same behavior-preserving refactor.
- The expected and forbidden label inventories remain unchanged.
- Every criterion is decidable from the actor response, pre-actor scenario evidence, workspace changes, and legitimate structural command facts supplied to the judge.
- The initial trial's explicit no-change response would satisfy the corrected observable criteria; the confirmation response that omitted the no-change conclusion would still fail.
- No criterion asks a runner-owned command fact to prove internal semantic analysis.
- `moldea/`, its 1,916-word entrypoint, portable digest, release identity, and public behavior remain unchanged.
- Semantic protocol remains 14; case count remains 48; only the intended case-suite digest changes.
- Both failed attempts and `latest.json` remain byte-identical and pass immutable-history verification.
- Focused tests, full root tests, all 48 preflight cases, attempt verification, release identity, formatting, JSON, and diff checks pass.
- `docs:check` fails only at the expected stale semantic-evidence boundary before the new run.
- No paid model execution, qualification, commit, push, release, tag, or publication occurs without its separate authorization.

## Approval required

Approval authorizes only the focused source correction described above: rewrite the three `adopted-relevance-no-change` criterion descriptions around observable actor-response and workspace evidence, add the corresponding deterministic conformance regression assertions, preserve the two failed attempts and latest pointer byte-for-byte, and run the model-free verification boundary. It does not authorize changes to the portable skill, semantic protocol, runner, judge prompt, command-result evidence, other cases, documentation, website, qualifications, dependencies, or workflows. It also does not authorize a commit, push, paid diagnostic, semantic evaluation, confirmation, qualification, release, tag, or publication.
