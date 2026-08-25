# Semantic convergence and release-candidate plan

## Objective

End the current refinement loop with one bounded correction to the ordinary deterministic-tooling reporting contract, freeze the exact corrected source and evaluation boundary, produce one final semantic candidate under explicit stopping rules, refresh the required Custom and Vercel AI SDK qualifications, and reach a binary release-candidate decision for skill `3.1.0`.

The goal is not to make every Terra response identical. The goal is to prove material Moldea behavior while assigning each fact to the evidence source that can establish it reliably:

- runner-owned execution evidence proves that an exact supported repository-local CLI operation actually completed and what machine result it returned
- the actor response reports the resulting status, material diagnostics, maintained state, omissions, ambiguity, or limitations concisely
- workspace and repository-control evidence prove what changed and what remained protected
- the independent judge assesses semantic meaning across those sources without treating one source as proof of content owned by another

## Current state and repository evidence

- The committed source is `db634e999c65d49cf27ba18664d50f277578c362` on `qualifications`, synchronized with `origin/qualifications`.
- The portable release remains `3.1.0`, the exact published CLI remains `4.0.1`, semantic protocol remains `14`, and the suite contains 48 cases.
- The latest corrected suite digest is `243d47d368718eda7cae67c38ff0a798903d60f9e1c0dcbce6cdd52444ebd9aa`. The portable digest is `1b81aa56466ba3bad78a737435a45bc34efb9e2ae1452e72746c7fa9890207bb`.
- Two newly recorded attempts are currently uncommitted:
  - `20260825T163303199Z-semantic-f2bb59b6` records five passes followed by the initial `adopted-direct-context-handoff` failure.
  - `20260825T163807925Z-semantic-99389785` records two passing confirmations, marks that case recovered, and leaves 42 cases pending.
- `fixtures/semantic-evaluation-results/latest.json` points to the second attempt. `npm run eval:semantic:verify` accepts all 15 immutable attempts.
- The ignored schema-4 checkpoint contains six initial results and two confirmations under protocol 14. It remains locally resumable only while the current portable and case-suite digests remain unchanged.
- Across the initial trial and both confirmations, the actor consistently performed the material product behavior:
  - it persisted the durable team ownership and production-access approval boundary
  - it omitted the transient sprint focus
  - it made only focused canonical changes
  - it executed a valid exact repository-local `inspect` operation
- The actor's reporting varied:
  - the initial response reported that canonical inspection passed with no diagnostics but did not print a literal CLI command
  - confirmation 1 made the same concise status report
  - confirmation 2 printed `moldea inspect --json`
- The judges treated equivalent evidence inconsistently. The initial judge withheld `rerun-deterministic-inspection` because the response omitted a literal command; confirmation 1 awarded the same label using the projected runner-owned `inspect` fact and the reported status; confirmation 2 also passed.
- This is not evidence that knowledge-triggered maintenance is broken. It is evidence that the current criterion conflates two evidence owners: exact execution and user-facing reporting.
- `tooling/semantic-evaluation/actor-execution-evidence.mjs` already recognizes only exact supported repository-local Moldea invocations, validates their complete release-bound JSON envelopes, and projects only `command`, `status`, schema/version identity, and result/error presence. Raw command text and arbitrary output are deliberately discarded.
- `tests/semantic-evaluation-runner.mjs` already tells the judge that actual execution requires a completed runner event and result-dependent claims require the projected fact. It also says that actor prose cannot replace execution evidence.
- Six semantic criteria currently require the actor to report an exact deterministic command:
  - `initialize-sufficient-context` (`rerun-deterministic-inspection`)
  - `adopted-direct-context-handoff` (`rerun-deterministic-inspection`)
  - `adopted-explicit-context-correction` (`rerun-correction-inspection`)
  - `adopted-relevance-changed-behavior` (`rerun-deterministic-inspection`)
  - `agent-adoption-inline-runtime-instruction` (`rerun-deterministic-inspection`)
  - `routing-description-reconciliation` (`rerun-deterministic-inspection`)
- The portable and public general maintenance contract repeats that literal-command reporting requirement in `moldea/SKILL.md`, `moldea/references/continuous-maintenance.md`, `docs/continuous-maintenance.md`, and `docs/examples/add-project-context.md`.
- Exact command reporting still has a distinct provenance purpose in compatibility-sensitive package-manager and CLI-provider resolution. That specialized contract lives in `references/local-tooling.md` and related cases and must remain unchanged.
- The ready qualification profiles remain:
  - `custom/custom`: 8 cases, up to 16 Terra calls
  - `vercel-ai-sdk/typescript-generate-stream-text-7`: 10 cases, up to 20 Terra calls
- The current Custom public result passes for an older portable digest. The current Vercel public history has no passing attempt. Any portable change requires a new matching Custom baseline and then a new Vercel attempt.

## Decisions

### Ordinary deterministic-reporting contract

For ordinary write-capable Moldea operations, the final response will no longer need to repeat a literal repository-local command. It must still report:

- the deterministic operation or proof stage used when that distinction is material
- the resulting status
- material diagnostics, including an explicit absence when relevant
- maintained canonical state, omissions, limitations, or ambiguity required by the operation

The actor must still execute the exact repository-local CLI in a separate process and validate its exit code and machine envelope before interpreting it. This correction changes reporting verbosity, not execution rigor.

Specialized provider-provenance flows retain their exact provider, version, command, and envelope reporting requirements because the command shape itself proves which provider was accepted. The general correction must not weaken those cases or `references/local-tooling.md`.

### Evaluator evidence ownership

The six affected semantic criteria will explicitly assign:

- exact repository-local invocation and machine result to runner-owned completed-command evidence
- concise status and material diagnostics to the actor response
- resulting repository state to workspace and repository-control evidence

The judge prompt will state the reverse attribution rule as well: runner events cannot prove that the actor response said something, and actor prose cannot prove that a command ran. When a criterion contains clauses owned by different sources, each clause must be established by its named source.

No new evidence schema, deterministic-requirement DSL, command parser, projected fact, transcript capture, or raw command retention will be introduced. The existing safe projector already establishes the deterministic fact. Adding another parallel validation framework would increase complexity without changing the evidence available.

### Freeze and convergence rule

“Freeze” means that after the correction is reviewed, committed, and pushed, the exact portable skill, semantic cases, coverage map, runner, qualification engine, and ready profiles become the fixed release-candidate boundary.

During the final evidence cycle:

- no source change will be made because of one actor miss or one judge disagreement
- an initial semantic failure will be classified from the actor response, workspace, runner facts, repository controls, and judge rationale before any next action
- plausible model variance may use the existing separately authorized two-confirmation policy; it does not trigger a source edit
- a recovered case remains accepted and the same candidate resumes
- a deterministic violation, repeated material product failure, terminal confirmation failure, or genuinely undecidable evaluator contract blocks the release candidate and ends the cycle
- a blocked cycle produces a clear release decision and preserved evidence; it does not automatically start another correction-and-restart loop
- reopening the frozen boundary requires a new explicit developer decision and a new release-candidate cycle, not an automatic response to the failed run

This rule allows the finite checkpoint and confirmation workflow to finish while preventing another series of prompt edits and full-suite invalidations.

## In-scope source changes

### Portable skill

Update only the general final-report wording in:

- `moldea/SKILL.md`
- `moldea/references/continuous-maintenance.md`

Preserve exact execution, separate-process validation, machine-envelope handling, activation, authority, context quality, write boundaries, CLI identity, release version, dependencies, and every specialized local-tooling provenance rule. The entrypoint should not grow beyond its current 1,916 words; the correction should reduce wording where possible.

### Public documentation

Synchronize the ordinary reporting contract and convergence workflow in:

- `README.md`
- `docs/continuous-maintenance.md`
- `docs/examples/add-project-context.md`
- `docs/semantic-evaluation.md`

The documentation must explain that exact execution remains provable in committed runner evidence while the user-facing response remains concise. It must also document the frozen-candidate stopping rules so future maintainers do not treat every stochastic discrepancy as a reason to edit the skill.

No website component, route, schema, style, or dependency change is planned. The existing static documentation and evidence loaders should consume the updated Markdown and result artifacts.

### Semantic cases and judge contract

Update `fixtures/conformance-cases.json` for the six affected criteria while preserving case IDs, natural actor directions, scenarios, fixtures, labels, label order, coverage, website metadata, and the 48-case count.

Each revised criterion must require:

- a matching completed runner-owned `inspect` or `validate` fact with compatible status and result evidence after the actor's writes
- an actor response that states the resulting status and material diagnostics rather than a bare readiness claim
- no literal command repetition in the actor response

Update `tests/semantic-evaluation-runner.mjs` only to clarify evidence-source attribution in the judge prompt. Do not change event projection, persisted result shape, checkpoint schema, confirmation policy, command allowlists, sandboxing, model configuration, or attempt recording.

Semantic protocol remains `14` because no projected fact, event shape, result schema, host contract, or persistence rule changes. The portable and suite digests will change and are sufficient to invalidate the ignored checkpoint.

### Focused tests

Update:

- `tests/conformance.test-unit.mjs`
- `tests/semantic-evaluation-runner.test-unit.mjs`

Coverage must prove:

- all six affected labels retain their existing inventories and case ownership
- each criterion assigns exact execution to runner-owned evidence and status/diagnostics to the actor response
- none of the six criteria requires the actor response to repeat a literal or exact command
- the specialized provider-provenance contracts still require exact provider, version, command, and envelope reporting
- the judge prompt prohibits cross-source substitution in both directions
- actor prose alone cannot satisfy execution and runner evidence alone cannot satisfy response-content requirements
- case count, coverage, protocol, fixed Terra model, and medium reasoning remain unchanged

Avoid full-sentence snapshots. Assert the durable evidence-ownership properties that would have made all three observed trials receive consistent treatment.

### Transparent attempt history

Preserve byte-for-byte and include in the source-correction review boundary:

- `fixtures/semantic-evaluation-results/attempts/20260825T163303199Z-semantic-f2bb59b6/`
- `fixtures/semantic-evaluation-results/attempts/20260825T163807925Z-semantic-99389785/`
- the current `fixtures/semantic-evaluation-results/latest.json`

These artifacts explain why the correction exists. Do not delete, rewrite, rejudge, migrate, or sanitize them again. The ignored checkpoint remains untouched during implementation and is removed only by the future authorized `--record --restart` operation.

## Explicit exclusions

- Do not add more semantic cases, qualification cases, adapter profiles, dependencies, workflows, CI jobs, website components, or release versions.
- Do not change activation paths, context-gathering behavior, knowledge persistence, ambiguity handling, canonical formats, adapter behavior, or package composition.
- Do not weaken the requirement to execute and validate the exact repository-local CLI.
- Do not weaken specialized package-manager or provider-provenance reporting where the exact command establishes the accepted provider.
- Do not retain raw actor command text, arbitrary command output, chain-of-thought, MCP payloads, secrets, or host paths.
- Do not add a deterministic evidence DSL or another result layer.
- Do not reinterpret or overwrite historical attempts under the corrected criteria.
- Do not resume the current checkpoint after source changes; its digests will be incompatible.
- Do not run a diagnostic, semantic evaluation, confirmation, qualification, retry, release, tag, or publication during source implementation.
- Do not commit or push without the separate `repo push` command.
- Do not edit protected coding-instruction files.

## Ordered implementation and release strategy

1. **Fingerprint and preserve the current evidence boundary.**
   - Record SHA-256 hashes for the two new attempts and `latest.json`.
   - Verify all 15 attempts and record the current ignored checkpoint identity and counts.
   - Treat any generated-evidence byte change during source implementation as a blocker.

2. **Simplify ordinary portable reporting without weakening execution.**
   - Replace the general literal-command final-report requirement with concise status and diagnostic reporting in the entrypoint and continuous-maintenance reference.
   - Keep exact CLI execution, provider resolution, envelope validation, and separate-process requirements unchanged.
   - Measure the changed portable files and complete `moldea/` tree before and after; do not increase the entrypoint word count.

3. **Align public documentation and operational convergence.**
   - Update the maintenance guide and example to show concise result reporting.
   - Update semantic methodology to explain evidence ownership, the frozen release-candidate boundary, classification of failures, bounded confirmation, and terminal stop conditions.
   - Update the root README's semantic workflow consistently without expanding unrelated release or deployment documentation.

4. **Clarify all affected semantic criteria and judge attribution.**
   - Rewrite the six criteria around the runner fact plus actor status report.
   - Add the bidirectional source-attribution instruction to the judge prompt.
   - Preserve labels, cases, fixtures, coverage, protocol, and event projection.

5. **Add focused regression coverage and verify the source correction.**
   - Extend the existing conformance and runner unit tests.
   - Run Skill Creator validation, focused tests, the complete root tests, all 48 preflight cases, attempt verification, release identity, formatting, and diff checks.
   - Run both ready qualification profiles in model-free dry-run mode to prove the portable wording change does not break deterministic project journeys.
   - Confirm any documentation or website freshness failure is exclusively the expected stale semantic or qualification evidence boundary.
   - Stop for `review`. After a clean review, require `repo push` so the correction and transparent attempts are committed together.

6. **Freeze the committed release-candidate boundary.**
   - Record the exact source commit, portable digest, suite digest, coverage digest, protocol, CLI identity, profile digests, qualification digest, package checkout commit and fingerprint, model, reasoning effort, Codex version, and tool versions.
   - Do not change behavior-bearing inputs after this point during the cycle.

7. **Run one final semantic candidate.**
   - Obtain fresh explicit authorization for up to 96 Terra calls.
   - Run the official 48-case workflow with `--record --restart`; do not run a diagnostic first.
   - Resume the same compatible checkpoint after interruption.
   - At an initial failure, preserve the attempt and classify it before proceeding.
   - Use a bounded confirmation only with separate authorization and only for plausible variance.
   - Resume the same candidate after recovery.
   - Stop the release cycle on deterministic failure, terminal confirmation failure, repeated material product failure, or a genuine evaluator defect. Do not edit source automatically.
   - Promote only through the runner after every case passes or recovers.
   - Review and commit the passing semantic result before qualification.

8. **Generate the fresh Custom qualification baseline.**
   - Confirm clean committed skill and packages inputs and current published package closure.
   - Obtain fresh authorization for up to 16 Terra calls.
   - Run `custom/custom` through the official qualification CLI.
   - Allow candidate and model cache reuse only when the existing exact digest contracts accept it. The changed portable digest must reject old model evidence automatically.
   - Record pass, failure, or execution error. Do not automatically retry a terminal failure.
   - Verify, inspect, and commit the result. A passing current Custom result is required before Vercel.

9. **Generate the fresh Vercel AI SDK qualification.**
   - Confirm the exact matching passing Custom baseline.
   - Obtain fresh authorization for up to 20 Terra calls.
   - Run `vercel-ai-sdk/typescript-generate-stream-text-7` across all ten cases.
   - Preserve cache, checkpoint, deterministic, workspace, package, and append-only evidence guarantees.
   - Record every terminal outcome and do not automatically retry a failure.
   - Verify, inspect, and commit the result.

10. **Validate the final release candidate.**
    - Run the complete source, semantic, qualification, documentation, website, accessibility, responsive, theme, and release gates against a clean committed tree.
    - Confirm the public website shows the current semantic pass, current Custom pass, current Vercel pass, all failed and incomplete history, exact provenance, and valid latest/last-passing pointers.
    - End with one binary outcome: release-ready or blocked with the exact material failure. Do not start another refinement cycle automatically.
    - Do not publish, tag, or release without separate explicit authorization.

## Verification commands

### Source correction

```bash
python3 /home/jesusgraterol/.codex/skills/.system/skill-creator/scripts/quick_validate.py moldea
node --test --test-name-pattern='deterministic|source attribution|reporting' tests/conformance.test-unit.mjs tests/semantic-evaluation-runner.test-unit.mjs
npm test
npm run eval:semantic:preflight
npm run eval:semantic:verify
npm run release:identity:check
npm run qualification:verify
npm run qualification:dry-run
npm run qualification -- run --adapter vercel-ai-sdk --implementation typescript-generate-stream-text-7 --dry-run --json
npm run docs:check
npm run website:check
git diff --check
```

Use the website's installed Prettier with `website/.prettierrc` for touched Markdown, JSON, and JavaScript files. `docs:check` or `website:check` may fail before fresh evidence only when the loader rejects the stale semantic or qualification identity; any other failure is a source defect.

### After the final semantic result

```bash
npm run eval:semantic:verify
npm test
npm run docs:check
npm run website:check
```

### After each qualification

```bash
npm run qualification:verify
npm run website:check
```

### Final release candidate

```bash
python3 /home/jesusgraterol/.codex/skills/.system/skill-creator/scripts/quick_validate.py moldea
npm test
npm run eval:semantic:verify
npm run qualification:test
npm run qualification:typecheck
npm run qualification:lint
npm run qualification:format:check
npm run qualification:verify
npm run docs:check
npm run website:check
npm --prefix website run test:e2e
npm run release:check
```

No check may be reported as passing unless it actually runs successfully. Expected stale-evidence failures must be distinguished from source regressions and must disappear after the matching evidence is committed.

## Persistence, cache, compatibility, and rollback

- All failed, incomplete, recovered, and passing attempts remain append-only. `latest.json` may advance only through the official recorder.
- The source correction changes both portable and suite digests. The current ignored semantic checkpoint is intentionally incompatible and must be replaced through `--record --restart`; no migration or manual deletion is appropriate.
- Protocol remains 14 because evidence shapes and projection semantics do not change.
- Qualification engine and profile digests remain unchanged. The new portable digest invalidates old model evidence while allowing exact candidate-package caches to remain reusable when their independent integrity contracts match.
- Release `3.1.0` and CLI `4.0.1` remain unchanged because the project is unreleased and this is the intended first public contract.
- Before new paid evidence, rollback is an ordinary Git revert of the focused reporting/evaluator correction. Historical attempts remain history.
- After new evidence exists, rollback must not delete or rewrite it. A reverted source would simply make that evidence non-current.
- No migration, dependency change, package publication, CI change, or deployment is required.

## Risks and controls

- **Another wording loop:** the frozen-boundary rule prohibits automatic source edits during the final candidate. A blocking result ends the cycle with evidence.
- **Weakening verification:** exact CLI execution, envelope validation, status, and result facts remain runner-owned and mandatory.
- **Cross-source judge substitution:** the judge prompt and focused tests require each clause to be proven by its named source.
- **Overengineering deterministic facts:** reuse the existing strict projector rather than creating another evidence schema or parser.
- **Excessive user-facing tokens:** remove ordinary literal-command repetition while retaining status, diagnostics, and material outcomes.
- **Loss of specialized provenance:** preserve exact command reporting in provider-selection paths where it proves the accepted provider.
- **Evidence loss:** fingerprint and preserve every existing attempt and pointer; use only official append-only recorders.
- **Repeated paid work:** use compatible checkpoints and exact caches, skip diagnostics, and require separate authorization before every full run, confirmation, and qualification.
- **False release confidence:** deterministic failure, repeated material behavior failure, terminal confirmation failure, stale evidence, or missing qualification pass blocks the release.
- **Pressure to force a pass:** the final outcome may be “blocked.” Finishing means reaching a trustworthy decision, not manufacturing passing evidence.

## Acceptance criteria

- The ordinary portable contract requires exact deterministic execution but concise status and diagnostic reporting, without requiring literal command repetition.
- Specialized provider-provenance reporting remains unchanged.
- All six affected semantic criteria assign exact execution to runner evidence and response content to actor prose.
- The three observed direct-context-handoff trials would be judged consistently under the corrected contract based on their material behavior and status reporting.
- Case count remains 48, labels and coverage remain stable, semantic protocol remains 14, and no new evidence format exists.
- The entrypoint does not exceed 1,916 words.
- The two current attempts and latest pointer remain byte-identical and verifiable.
- Every source-level model-free check passes except explicitly identified stale-evidence gates.
- The corrected source is reviewed, committed, pushed, and then frozen before paid execution.
- One final semantic candidate reaches either a valid passing promotion or a documented terminal block without another automatic correction cycle.
- A passing current Custom baseline and passing current Vercel result are recorded against the same frozen portable skill and exact package closure.
- The complete release gate passes on the final clean committed tree before any publication decision.
- No release, tag, publication, or deployment occurs under this plan.

## Approval required

Approval authorizes only the source implementation portion of this plan: preserve the current semantic attempts, simplify ordinary literal-command reporting while retaining exact execution, update the six semantic criteria and judge source-attribution wording, synchronize the directly affected public documentation, add focused tests, and run the model-free verification boundary. It does not authorize committing, pushing, deleting or restarting the current checkpoint, running a diagnostic, semantic evaluation, confirmation, qualification, retry, release check that invokes paid models, tag, release, publication, or deployment. Each paid semantic or qualification operation still requires fresh explicit authorization after the corrected source is reviewed and committed.
