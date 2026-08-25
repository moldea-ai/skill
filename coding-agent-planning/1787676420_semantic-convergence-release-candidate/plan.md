# Project-scoped evaluation correction and release-candidate restart plan

## Objective

Make one deliberate correction after the terminal `evaluate-clean-working-tree` confirmation failure, then restart the frozen release-candidate cycle from clean committed source.

The correction must ensure that an unscoped request such as `Evaluate moldea.` in an adopted repository evaluates that repository's project-owned Moldea system, beginning with canonical state and following material relationships into implementation. The installed `.agents/skills/moldea` artifact is the operating instruction source. Its presence alone must not turn it into a project-owned Agent Skill or replace the project assessment with an audit of the skill itself.

The semantic case must also judge this behavior from evidence it can actually observe. The runner deliberately discards raw command text and output, so the case will use a concise actor scope report plus independently sourced canonical and implementation evidence instead of attempting to infer an internal inspection sequence from opaque command events.

This is a bounded reopening of the previously frozen boundary. It is not permission to resume iterative prompt refinement after every stochastic miss.

## Current state and repository evidence

- The active branch is `qualifications` at committed source `9d6d1f61d0f1cd86a3b54a64b1338e07b3d25714`, synchronized with `origin/qualifications` before the current generated evidence.
- Release identity remains skill `3.1.0`, exact `@moldea.ai/cli 4.0.1`, CLI JSON schema `2`, semantic protocol `14`, confirmation policy `1`, and 48 semantic cases.
- The current portable digest is `7ba11b73c912750012e5fcb184114b61763a1559293e32fd3f0c76c2510f3f8c`, suite digest is `862fa92957164e23381d2f74398bdc9f6dc4a965273077a6473e8c818262f6c1`, and coverage digest is `d251af7f3fd13337e6f362b9a0c35e9fd605b006894f2f8e17fb3c1da1c2da57`.
- The ignored checkpoint contains 13 initial trials and three confirmations. Its current summary is 11 initial passes, one recovered case, one terminal failed case, and 35 pending cases.
- Four generated attempt directories and the advanced `latest.json` pointer are currently uncommitted:
  - `20260825T180442352Z-semantic-e06a881d` records the initial `agent-adoption-inline-runtime-instruction` reporting failure.
  - `20260825T181123521Z-semantic-d4b54967` records two passing confirmations, marks that case recovered, and leaves 37 cases pending.
  - `20260825T181611710Z-semantic-d28207ea` records the initial `evaluate-clean-working-tree` failure after `evaluate-dirty-working-tree` passed.
  - `20260825T181959873Z-semantic-7d351f4b` records the rejected first confirmation and terminal candidate failure.
- `fixtures/semantic-evaluation-results/latest.json` points to `20260825T181959873Z-semantic-7d351f4b` with status `failed`; no passing attempt exists for the current release identity.
- `npm run eval:semantic:verify` accepts all 23 immutable attempts.
- Both `evaluate-clean-working-tree` trials were read-only, produced valid deterministic inspection evidence, changed no repository or Git state, and triggered no forbidden behavior.
- The initial actor reported the adopted project as coherent, then audited the installed skill's identity, activation, resources, and host metadata. The confirmation actor again emphasized the installed skill's structure and distribution limitation. Neither response established that it followed the manifest's `/src/**` relationship into `src/project-state.js` or considered whether its exported `"active"` state was represented by canonical project truth.
- Both judges withheld only `progressive-whole-system-assessment` because the supplied evidence did not establish the order or materiality of expansion.
- The case definition digest `bc69e3c197af066e416dfe6131a8ba25e961f6dc28a22e8fbf349b909b0aacf6` is unchanged from two earlier passing runs. Those actors followed the project relationship and reported the unresolved meaning of `src/project-state.js`; the current artifact produced the same scope substitution twice.
- `moldea/references/evaluate-and-reconcile.md` already says a clean evaluation begins with the project foundation and progressively inspects relevant implementation. It does not explicitly distinguish the installed operating skill from repository-owned Agent Skills. Its later instruction to assess every scoped Agent Skill leaves room for `Evaluate moldea.` to be misread as an audit of the installed Moldea skill itself.
- The current clean-tree criterion says the actor “performs” progressive assessment but does not assign proof to an observable evidence source. The judge receives no raw command identity and the case currently supplies only HEAD state, clean-tree state, and `moldea/moldea.yaml`, so it cannot reliably distinguish correct project traversal from an unrelated artifact audit.
- `moldea/SKILL.md` currently contains 1,915 words and `moldea/references/evaluate-and-reconcile.md` contains 1,266 words. Concision remains a release constraint.

## Desired behavior

### Project target

Within an adopted repository, an unqualified Moldea evaluation targets the current repository's project-owned Moldea system:

1. establish the Git and adoption state
2. run and verify root-local deterministic inspection
3. begin with `/moldea/**` project foundation, relationships, decisions, agents, capabilities, schemas, runtime guidance, requirements, and adapter evidence
4. follow material registered and semantic relationships into implementation, contracts, tests, runtime integration, and related repositories within authority
5. stop when the evidence supports reliable conclusions

The installed `.agents/skills/moldea` tree remains available as the operating instructions and may be checked for installation integrity by the host or runner. It becomes an evaluation subject only when the developer explicitly scopes that artifact or repository evidence establishes it as a project-owned source, copy, consumer, or declared Agent Skill. Merely being installed for the actor does not satisfy that condition.

This distinction must not remove or narrow explicit Agent Skill evaluation. Requests such as `Evaluate the release-review skill` and repository-declared Agent Skill relationships continue to use the complete `skill-design.md` assessment.

### Observable concise reporting

An unscoped clean evaluation must report enough scope reasoning for a developer and judge to understand what was assessed without reproducing an internal transcript. The response should concisely state:

- that the adopted project-owned Moldea system was the starting scope
- which material canonical relationship caused implementation expansion, or why no expansion was material
- the resulting deterministic and semantic conclusion, including ambiguity or evidence limitation
- that no repository files changed

The actor does not need to list every file read, print command text, or narrate every inspection step. Runner-owned evidence continues to prove recognized deterministic commands and results. The actor response proves its reported scope and semantic conclusion. Independently sourced scenario evidence proves the underlying project facts. Repository controls prove read-only behavior.

### Stronger clean-tree scenario

Keep the existing `evaluate-clean-working-tree` case and natural developer direction. Strengthen it rather than adding another case:

- retain HEAD, clean-tree, and adoption evidence
- add independently sourced `moldea/project.md` and `src/project-state.js` evidence
- require the actor response to identify the project-owned Moldea system as its scope and follow the manifest's `/src/**` relationship into the relevant implementation
- require the actor to report that the exported `"active"` state is not sufficiently established as durable canonical project truth, treating that gap as a material ambiguity or evidence limitation rather than inventing context or declaring complete semantic alignment
- retain the explicit no-write requirement
- forbid substituting an audit of the installed operating skill for the adopted project assessment
- retain the prohibition on unjustified repository-wide traversal and the empty-scope prohibition

This makes the case materially stronger while keeping the suite at 48 scenarios.

## In-scope implementation

### Portable skill

Update:

- `moldea/SKILL.md`
- `moldea/references/evaluate-and-reconcile.md`

Add the project-target boundary at the operation or evidence-scope decision point. Keep the detailed clean-tree sequence in the focused reference and only the shortest durable rule needed for reliable routing in the entrypoint.

Preserve:

- all three activation paths
- adoption and write-authority rules
- read-only evaluation
- exact CLI execution and envelope verification
- context-quality and ambiguity handling
- explicit scoped evaluation of project-owned Agent Skills
- installed-skill discovery and runtime behavior
- release version, dependencies, file structure, and host metadata

The final `moldea/SKILL.md` must not exceed its current 1,915-word count. Prefer consolidation over adding another broad rule.

### Semantic contract and coverage

Update:

- `fixtures/conformance-cases.json`
- `fixtures/semantic-evaluation-coverage.json`

For `evaluate-clean-working-tree`:

- preserve the case ID, operation, natural prompt, fixture, website title, and case ordering
- add `moldea/project.md` and `src/project-state.js` as explicit repository-evidence sources
- revise `progressive-whole-system-assessment` so its clauses identify their proof owners: the actor response reports the project starting scope and material expansion, while sourced scenario evidence establishes the relationship and implementation fact
- add or refine one criterion for the unresolved `"active"` state conclusion if keeping that conclusion separate makes review clearer
- add a forbidden criterion for treating the installed operating Moldea skill as the project evaluation target without explicit or repository-established ownership
- keep `report-no-writes`, `unjustified-exhaustive-repository-read`, and `empty-scope-result`

Update the existing adoption-and-repository-state coverage claim and rationale only as needed to state this target boundary and strengthened clean-tree proof. Do not add a claim, case, protocol, result field, or new coverage mechanism.

### Focused tests

Update:

- `tests/conformance.test-unit.mjs`
- `tests/semantic-evaluation-runner.test-integration.mjs`

Unit coverage must establish that:

- all 48 semantic case IDs remain unchanged
- the clean-tree case keeps the natural `Evaluate moldea.` actor prompt
- its expected criterion names actor-response and scenario-evidence ownership rather than relying on hidden command order
- its evidence declarations include the manifest, project context, and related implementation
- its criteria require the unresolved project-state conclusion and no-write report
- its forbidden criteria reject installed-operating-skill scope substitution, empty scope, and unjustified exhaustive traversal
- scoped project-owned Agent Skill evaluation remains required by the portable contract
- the fixed Terra model, medium reasoning, protocol, and confirmation policy remain unchanged

Integration coverage must materialize the clean-tree repository and prove that the independent evidence collector receives the exact manifest relationship, project-context statement, and `src/project-state.js` content used by the judge. It must also confirm the installed `.agents/skills/moldea` artifact remains separately protected and is not represented as project-owned scenario evidence.

Do not test model wording or simulate a passing judge. The tests should protect the observable contract and evidence boundary.

No change to `tests/semantic-evaluation-runner.mjs`, `tooling/semantic-evaluation/`, event projection, or result schemas is currently planned. The existing judge prompt already enforces named-source attribution. If implementation inspection proves that a runner change is required to supply the newly declared evidence, that would materially change this plan and requires revision before proceeding.

### Public documentation

Synchronize:

- `README.md`
- `docs/evaluate-reconcile-validate.md`
- `docs/semantic-evaluation.md`

Document that unscoped evaluation in an adopted repository starts from the project-owned Moldea system and follows its material relationships. Clarify that the installed operating skill is not automatically a project-owned Agent Skill or the evaluation target. Preserve concise reporting and explicit scoped Agent Skill evaluation.

Update semantic methodology to explain that progressive scope is judged from the actor's concise scope conclusion plus independently sourced project evidence, not from retained raw command text. No website component, route, schema, style, or dependency change is needed because the static documentation and evidence pages already consume these sources and the unchanged case ID.

`docs/examples/evaluate-and-reconcile.md` does not require modification unless implementation changes its scoped support-agent example. Avoid adding another example solely to repeat the workflow page.

### Transparent attempt history

Preserve byte-for-byte:

- the four uncommitted attempt directories listed above
- every previously committed attempt
- `fixtures/semantic-evaluation-results/latest.json`

Before source edits, fingerprint every file and mode in the four attempts plus `latest.json`. Recompute those fingerprints at the review checkpoint. Do not delete, rewrite, rejudge, migrate, compact, or manually sanitize historical evidence.

The ignored terminal checkpoint remains untouched during implementation. Source and suite changes will make it incompatible. A later separately authorized `--record --restart` operation is the only planned removal path.

## Explicit exclusions

- Do not add semantic cases, qualification cases, adapter profiles, dependencies, scripts, workflows, CI jobs, website components, routes, or release versions.
- Do not change knowledge-triggered activation, context persistence, initialization, planning, reconciliation, maintenance, agent design, adapter behavior, or package composition.
- Do not weaken read-only evaluation, exact repository-local CLI execution, machine-envelope validation, repository controls, sandboxing, egress restrictions, or evidence sanitization.
- Do not retain raw command text, command output, actor reasoning, MCP payloads, credentials, private host paths, or another transcript-derived evidence format.
- Do not require verbose process narration, exact command repetition, or exhaustive file lists in actor responses.
- Do not treat the installed operating skill as irrelevant to execution; only prevent its installation from making it project-owned evaluation scope.
- Do not rewrite or remove immutable failed and incomplete attempts.
- Do not resume, confirm, migrate, or manually delete the terminal checkpoint.
- Do not run any paid diagnostic, semantic evaluation, qualification, retry, release, tag, publication, or deployment during implementation.
- Do not commit or push without a separate `repo push` command.
- Do not edit protected coding-instruction files.

## Ordered implementation strategy

1. **Fingerprint the current generated evidence.**
   - Record paths, modes, and SHA-256 digests for the four uncommitted attempts and `latest.json`.
   - Verify all 23 attempts and record the terminal checkpoint's artifact, suite, coverage, case, trial, and confirmation identities.
   - Treat any evidence-byte change during source implementation as a blocker.

2. **Correct the portable evaluation target.**
   - Add the narrow adopted-project default and operating-skill exclusion at the existing operation/scope boundary.
   - Preserve explicit project-owned Agent Skill evaluation and every existing activation and authority route.
   - Consolidate wording so `SKILL.md` remains at or below 1,915 words.
   - Record before-and-after bytes and words for both changed portable files and the complete `moldea/` tree.

3. **Strengthen the existing clean-tree semantic case.**
   - Add independent project-context and source evidence.
   - Make the progressive-scope criterion observable through named evidence owners.
   - Require the unresolved project-state conclusion without prescribing exact prose.
   - Forbid installed operating-skill scope substitution.
   - Update the existing coverage claim without changing the case inventory.

4. **Add focused regression coverage.**
   - Extend conformance assertions for the portable boundary, case evidence, expected outcomes, forbidden outcomes, and unchanged global contracts.
   - Add the clean-tree materialization and evidence-collection integration test.
   - Avoid runner or projector changes unless newly discovered repository evidence proves they are necessary; revise the plan first if so.

5. **Synchronize concise public documentation.**
   - Update the root usage contract and evaluation workflow page.
   - Update semantic methodology for observable scope evidence.
   - Leave unrelated examples and website UI untouched.

6. **Verify and review the correction.**
   - Run Skill Creator validation, targeted unit and integration tests, the complete root suites, all 48 model-free preflight scenarios, attempt verification, documentation and website checks, release identity checks, model-free qualification dry runs, formatting, and diff checks.
   - Confirm that any release-gate failure is only the expected absence of current passing paid evidence.
   - Recompute the generated-evidence fingerprints and inspect the complete source diff.
   - Stop for `review`; after a clean review, require `repo push` before any paid restart.

7. **Freeze and restart one semantic release candidate.**
   - Record the committed source, portable, suite, coverage, CLI, protocol, model, reasoning, host, and qualification identities.
   - Obtain fresh explicit authorization for up to 96 Terra calls.
   - Run the official 48-case workflow with `--record --restart`, without a separate paid diagnostic.
   - Use compatible checkpoints after interruption and separately authorized bounded confirmation only for plausible variance.
   - A deterministic violation, terminal confirmation failure, repeated material product failure, or genuinely undecidable evaluator contract stops the cycle. It does not automatically authorize another source revision.
   - Promote only through the official runner, then review and commit the passing semantic result before qualification.

8. **Refresh qualification and complete release verification.**
   - Obtain separate authorization for the eight-case Custom qualification, up to 16 Terra calls, and require a current passing baseline.
   - Obtain separate authorization for the ten-case Vercel AI SDK qualification, up to 20 Terra calls, and bind it to that Custom baseline.
   - Preserve qualification checkpoints, exact caches, append-only results, package provenance, and terminal outcomes.
   - Run the complete release, documentation, website, accessibility, responsive, theme, semantic, and qualification gates on the final clean committed tree.
   - End with a binary release-ready or blocked result. Do not tag, publish, or deploy without separate authorization.

## Verification commands

### Focused source correction

```bash
python3 /home/jesusgraterol/.codex/skills/.system/skill-creator/scripts/quick_validate.py moldea
node --test --test-name-pattern='evaluate|clean working tree|evidence scope' tests/conformance.test-unit.mjs
node --test --test-name-pattern='clean working tree|scenario evidence' tests/semantic-evaluation-runner.test-integration.mjs
npm run eval:semantic:preflight
npm run eval:semantic:verify
git diff --check
```

### Complete model-free correction boundary

```bash
npm run test:unit
npm run test:integration
npm test
npm run release:identity:check
npm run qualification:verify
npm run qualification:dry-run
npm run qualification -- run --adapter vercel-ai-sdk --implementation typescript-generate-stream-text-7 --dry-run --json
npm run docs:check
npm run website:check
git diff --check
```

Use the repository's installed formatting tools on touched files only. Do not run a write-producing formatter across unrelated files. No check may be reported as passing unless it actually completes successfully.

`npm run release:check` is not a source-correction success criterion before fresh paid evidence because it intentionally requires current passing semantic and qualification results. If run diagnostically, its only acceptable failure is that exact freshness boundary.

### After semantic promotion

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

## Persistence, compatibility, and rollback

- All failed, incomplete, recovered, and passing attempts remain append-only. `latest.json` advances only through the official recorder.
- The portable, suite, and coverage digests will change. The terminal ignored checkpoint must become incompatible and later be replaced only through `--record --restart`.
- Semantic protocol remains `14` because host inputs, command projection, evidence shapes, result schemas, and persistence rules do not change.
- The case count remains 48 and the natural actor prompt remains unchanged.
- Qualification engine and profile digests remain unchanged. The new portable digest invalidates incompatible actor and judge evidence while independent exact candidate-package caches remain reusable when their contracts accept them.
- Skill release `3.1.0` and CLI `4.0.1` remain unchanged because the project is unreleased and this correction belongs to the intended first public contract.
- Before new paid evidence, rollback is an ordinary Git revert of the focused source and case correction. Historical attempts remain history.
- After new evidence exists, rollback must not delete or rewrite it; reverted source simply makes that evidence non-current.
- No migration, dependency installation, package publication, CI change, or deployment is required.

## Risks and controls

- **Another refinement loop:** this reopening is justified by two matching failures under the current artifact. The next frozen candidate retains the terminal stopping rule and does not authorize automatic corrections.
- **Overfitting to one fixture:** the portable rule describes ownership and evaluation targeting generally. The existing fixture is only the adversarial proof that canonical relationships lead to relevant implementation.
- **Weakening Agent Skill evaluation:** explicit or repository-established project-owned Agent Skills retain the complete assessment. Only implicit ownership from the operating installation is rejected.
- **Unobservable process criteria:** the revised criterion assigns response, scenario, execution, and repository-control facts to their actual evidence owners instead of inferring hidden commands.
- **Verbose paid responses:** require only a concise starting scope, material expansion decision, result, and no-write statement.
- **Evidence leakage:** preserve the current safe projector and do not retain command text or arbitrary output.
- **Evidence loss:** fingerprint all generated evidence and compare it before review.
- **Repeated paid work:** skip standalone diagnostics, preserve compatible future checkpoints, and require separate authorization for each paid operation.
- **False release confidence:** stale semantic evidence, missing qualification baselines, terminal failures, or any non-fresh release identity continue to block release.

## Acceptance criteria

- In an adopted repository, unscoped Moldea evaluation targets the project-owned Moldea system and follows material canonical relationships into implementation.
- An installed `.agents/skills/moldea` artifact does not become project-owned evaluation scope merely because it supplies the actor's operating instructions.
- Explicit and repository-established Agent Skill evaluations retain their existing behavior.
- The clean-tree case keeps `Evaluate moldea.`, remains one of 48 cases, and independently supplies the manifest, project context, and related source evidence.
- The clean-tree criteria require observable project-scope progression, the unresolved `"active"` state conclusion, and an explicit no-write report while forbidding scope substitution, empty scope, and unjustified exhaustive traversal.
- The judge can evaluate every clause from a named available evidence source without raw command retention or inferred internal reasoning.
- Semantic protocol, confirmation policy, fixed `gpt-5.6-terra` model, medium reasoning, CLI identity, release version, dependencies, and result schemas remain unchanged.
- `moldea/SKILL.md` remains at or below 1,915 words, and the complete portable tree does not grow without a reviewed necessity.
- All four new attempts, every older attempt, and `latest.json` remain byte-identical and verifiable.
- Every model-free source check passes; release freshness remains blocked until new paid evidence is generated.
- The corrected source is reviewed, committed, and pushed before one newly authorized `--record --restart` cycle.
- A future passing semantic result is followed by current passing Custom and Vercel qualifications and the complete release gate.
- No diagnostic, model run, qualification, commit, push, tag, release, publication, or deployment occurs under source-implementation approval alone.

## Approval required

Approval authorizes only the focused source implementation: preserve the four current attempt directories and `latest.json`; clarify the adopted-project evaluation target in `moldea/SKILL.md` and `moldea/references/evaluate-and-reconcile.md`; strengthen the existing `evaluate-clean-working-tree` evidence, criteria, and coverage without adding a case; add focused unit and integration coverage; synchronize `README.md`, `docs/evaluate-reconcile-validate.md`, and `docs/semantic-evaluation.md`; and run the complete model-free verification boundary. It does not authorize committing, pushing, deleting or restarting the terminal checkpoint, running a diagnostic, semantic evaluation, confirmation, qualification, retry, tag, release, publication, or deployment. Every paid operation still requires fresh explicit authorization after the corrected source is reviewed and committed.
