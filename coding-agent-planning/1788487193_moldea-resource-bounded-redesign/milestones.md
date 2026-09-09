# Resource-bounded moldea redesign milestones

## Completed milestones 1 through 71

Milestones 1 through 70 are complete, reviewed, signed, and published. They established the clean-slate package generation, repository-bound activation, content-free CLI inspection, lazy repository reading, PR Assurance foundations, paired public/private fixtures, evidence pinning, the 74-case semantic inventory, the 12-plus-2 qualification model, protocol-25 and protocol-10 evidence contracts, collect-first evaluation, xhigh actors and judges, strict resource accounting, and bounded four-worker semantic execution.

Milestone 71 completed official attempt `20260909T160245245Z-semantic-f4435831`. It reached all 74 cases with 60 direct passes, five recoveries, nine terminal failures, 93 trials, 186 model stages, and no operational stop. The failed attempt is immutable audit evidence. Its complete classification identified one repeated package inspection defect, two compact portable route defects, one evaluator criterion defect, and two strict variance/security canaries.

## Milestone 72: Publish the failed attempt and revised execution contract

### Objective

Publish the complete failed Milestone 71 attempt unchanged together with the challenged plan and regenerated breakdown.

### Dependencies

- Attempt `20260909T160245245Z-semantic-f4435831` remains byte-identical to the completed official run and passes integrity verification.
- The revised plan has recommendation `No material concerns` at SHA-256 `7f2b36f2652ffd6c52a68d250b5d164fec079f99ff72d7297e52dcfae5be44fd` before this breakdown is added.

### Scope and implementation

- Verify the attempt identity, source commit, 74 resolutions, result distribution, latest pointer, and failed status without changing evidence.
- Commit only the failed attempt, failed latest pointer, revised `plan.md`, and this `milestones.md` as one planning-and-evidence boundary.
- Preserve ignored diagnostic and candidate state, protected instructions, hard-excluded directories, and unrelated concurrent work.

### Verification and acceptance criteria

- Evidence verification reports protocol 25, evidence schema 9, attempt schema 6, 74 initials, 19 confirmations, 93 trials, 186 model stages, 60 direct passes, five recoveries, nine failures, and no operational stop.
- The attempt remains failed, no passing pointer is created or changed, and no actor, judge, resource, command-policy, or repository result is rewritten.
- Read-only review is ready; the signed and signed-off commit is pushed explicitly from `new_skill` to its resolved destination.

### Review checkpoint

Inspect immutable evidence identity, exact result distribution, pointer behavior, changed-path cohesion, and preservation of ignored and unrelated state.

## Milestone 73: Define the content-free runtime-assignment contract

### Objective

Make the platform specifications the authoritative contract for bounded per-agent runtime assignment in Core 3.1 and CLI 7.1.

### Dependencies

- Milestone 72 is published.
- The four runtime failures remain attributable to the missing Core/CLI projection rather than manifest parsing or adapter behavior.

### Scope and implementation

- Update `../platform/moldea/context/core-package.md` and `../platform/moldea/context/cli-package.md` to define one independently paged content-free agent record per canonical agent.
- Specify the record discriminator and exactly the stable `agentId` and `runtimeId` payload, deterministic ordering, metadata/all view inclusion, snapshot and cursor identity, existing page ceilings, and recursive body exclusion.
- Specify Core 3.1.0 and CLI 7.1.0 as additive stable releases on the existing major and schema-4 lines. Define no manifest-body projection, duplicated per-asset runtime field, unbounded parent array, fallback reader, or legacy record path.
- Synchronize only directly affected platform blueprint or specification links when their current statements would otherwise contradict the new contract.

### Verification and acceptance criteria

- Platform specification, link, format, lowercase-brand, and canonical-state checks pass.
- The specifications distinguish canonical runtime assignment from local composition, behavior evidence, adapter evidence, and runtime publication.
- Unrelated platform work and its untracked planning directory remain untouched and absent from the milestone commit.
- Read-only review is ready; the signed and signed-off platform commit is pushed explicitly from `new_skill` to its resolved destination.

### Review checkpoint

Inspect contract ownership, minimal record shape, bounded pagination, schema compatibility, versioning, body exclusion, and absence of a parallel or legacy path.

## Milestone 74: Release Core 3.1 and CLI 7.1

### Status

Complete and published at signed package commit `6ef074a0ac20e2a0690ae074e92bacc2a414e980`; Core 3.1.0 and CLI 7.1.0 are registry-verified.

### Objective

Implement, test, publish, and registry-verify the content-free per-agent runtime-assignment record in the packages repository.

### Dependencies

- Milestone 73 is published and provides the canonical package contract.
- `../packages/new_skill`, its destination, and current registry versions are resolved again before changes or publication.

### Scope and implementation

- Extend Core inspection contracts, metadata collection, ordering, paging inputs, snapshot identity, and public exports with one agent record per canonical agent containing the stable agent and runtime IDs.
- Include agent records in metadata and all views. Keep diagnostics and adapter evidence behavior unchanged and preserve content-free recursive output.
- Extend CLI schema-4 projection, public types, record formatting, source-cursor handling, human output, recursive body guards, installed-package composition, and output paging for the new record.
- Add focused unit and integration tests for zero, one, exact-page-boundary, multi-page, shared-prefix, and large agent inventories; stable ordering; cursor continuation and tampering; snapshot drift; byte ceilings; multibyte identifiers; body exclusion; and distinct canonical assignment versus composition and adapter evidence.
- Extend packed-consumer and installed-CLI e2e fixtures so the released tarballs prove the exact record and version closure.
- Update package READMEs, CLI/Core command and output documentation, generated API/reference artifacts, compatibility/release data, package versions, dependency ranges, and the workspace lockfile.
- Release Core 3.1.0 and CLI 7.1.0 through the current packages workflow, integrate reviewed changes through the resolved `main` path, monitor publication, and verify both exact versions and tarballs from the registry.

### Verification and acceptance criteria

- Changed package unit, integration, e2e, generic test, type, lint, format, build, public API, documentation, release-plan, packed-candidate, and packed-consumer checks pass.
- Large inventories remain bounded by existing page and memory contracts; no canonical body or arbitrary adapter detail appears in any non-content output.
- Core 3.1.0 and CLI 7.1.0 are registry-visible, mutually compatible, and executable from a clean packed consumer.
- Read-only review is ready at each package repository boundary; every publication commit is signed, signed off, and pushed through an explicit one-branch refspec.

### Review checkpoint

Inspect public types, discriminators, ordering, cursors, snapshot identity, output containment, installed-package behavior, version closure, generated artifacts, registry contents, and absence of legacy code.

## Milestone 75: Correct the residual skill and evaluator routes

### Status

Complete and published at signed skill commit `d59bb17ba8bb32a4cef3ca2c4b4b20bca1413efb` after all deterministic checks and read-only review passed.

### Objective

Update the skill to consume CLI 7.1 runtime-assignment evidence and correct the two proven portable routes plus the context-only evaluator criterion without disturbing unrelated behavior.

### Dependencies

- Core 3.1.0 and CLI 7.1.0 are registry-verified.
- The skill repository is clean apart from explicitly preserved ignored diagnostic state.

### Scope and implementation

- Update the exact development CLI closure to 7.1.0 while retaining the portable compatible-major `^7.0.0` declaration.
- Make the paged agent record the sole canonical content-free source for `agents.<id>.runtime.id` after composition. Remove wording that asks `inspect` to infer assignment from asset or top-level runtime-guidance counts.
- Correct the direct reconcile route so supplied implementation evidence plus at most one canonical body leads to one focused authority question before writes, without an unnecessary inspect or validate call.
- Correct the independent repository-local Agent Skill route so repository placement alone does not activate moldea when the task does not change `/moldea/**` or a declared relationship.
- Correct only `unadopted-direct-context-handoff`'s completion criterion so context-only input accepts a concise acknowledgement or optional focused host question without inventing work.
- Add focused conformance, fixture, projection, stage-identity, and route tests. Keep the compact root skill at or below 2,560 words and preserve exact-binding, credential detection, command ceilings, confirmation eligibility, protocol 25, and every unrelated case.
- Synchronize the directly affected skill README, runtime/evaluation documentation, generated website evidence text, and release identity. Do not claim passing current evidence yet.

### Verification and acceptance criteria

- Deterministic tests prove correct runtime identity when assignment, composition, behavior, and publication differ.
- Reconcile asks exactly one focused question before every write and stays within its existing two-call ceiling; independent Agent Skill maintenance uses zero moldea calls.
- The context-only fixture validates the actual no-action request while all other handoff criteria remain unchanged.
- Root unit and integration suites, skill validation, documentation, website, type, lint, format, build, evidence, release-identity, and packed-candidate checks pass without a paid model call.
- Read-only review is ready; the signed and signed-off skill commit is pushed explicitly from `new_skill` to its resolved destination.

### Review checkpoint

Inspect runtime evidence provenance, activation narrowness, ambiguity-before-write behavior, independent artifact routing, evaluator criterion fidelity, strict canaries, word count, and unchanged protocol contracts.

## Milestone 76: Close the independent-skill zero-call gate

### Objective

Restore explicit first-route consumption of the developer's “Use moldea” direction and prove the one remaining independent-skill case uses zero repository moldea commands.

### Dependencies

- Milestone 75 is complete and published at signed commit `d59bb17ba8bb32a4cef3ca2c4b4b20bca1413efb`.
- The complete nine-case xhigh ledger is classified under SHA-256 `c72fbb4c3a981434e15a8d8d4848df6324a8da3c0c1d7e073875e4a443abcd9e`: eight direct passes and one resource-only failure in `skill-maintain-linked-resources`.
- The failure repeated earlier repository inspection behavior while every semantic and other deterministic dimension passed, establishing root-route precedence as the proven owner.

### Scope and implementation

- Update only the first independent Agent Skill route in `moldea/SKILL.md` so it explicitly consumes even a developer direction to use moldea and cannot create a second repository inspection or validation obligation.
- Add one focused assertion in `tests/conformance.test-unit.mjs` for that precedence.
- Keep `moldea/references/skill-design.md`, `fixtures/conformance-cases.json`, its exact zero-command and zero-output budget, all semantic criteria, protocol 25, evaluator behavior, and the eight passing cases unchanged.
- Keep the root skill at or below 2,560 words, synchronize no unrelated documentation, and preserve the failed official attempt plus passing/latest pointers byte-for-byte.
- Run affected deterministic checks, review the exact change, publish it from `new_skill`, then restart diagnostic state for only `skill-maintain-linked-resources`.

### Verification and acceptance criteria

- Focused conformance and complete affected root regression checks pass; skill structure, resource, identity, formatting, path, website, and evidence integrity remain valid where the changed skill bytes apply.
- The published correction is signed, signed off, and pushed through the explicit `origin/new_skill` refspec.
- The single xhigh diagnostic passes all six semantic criteria and every resource, command-policy, repository-control, mount-integrity, and operational dimension with exactly zero moldea commands and bytes.
- No completed passing case is rerun before the official complete suite, and no budget, criterion, classifier, evaluator, protocol, or unrelated route is weakened.
- A repeated failure stops official execution and returns through evidence-led planning.

### Review checkpoint

Inspect the first-route precedence, word count, focused assertion, unchanged case and reference bytes, evidence-pointer immutability, exact diagnostic command totals, and absence of unrelated changes.

## Milestone 77: Record and publish current 74-case semantic evidence

### Objective

Produce one complete passing protocol-25 attempt under the final packages, skill, evaluator, xhigh, and bounded-worker identity.

### Dependencies

- Milestone 76 is green against the exact behavior and evaluator generation to be recorded.
- Free preflight reports all 74 cases, paid exposure, eligible confirmations, retries, token reservations, output bounds, disk admission, and exact reuse.

### Scope and implementation

- Run one official four-worker collect-first attempt. Complete all missing initials before eligible confirmations and preserve exact progress after interruption.
- Reuse only exact eligible passing or recovered stages. Reduce concurrency only through exact resume when measured provider or host pressure requires it.
- Promote only a complete passing attempt and update latest, passing, compact-result, website, and release identity through validated generators.
- Preserve a complete failure unchanged and return through evidence-led re-planning only if a repeatable deterministic defect remains.

### Verification and acceptance criteria

- All 74 cases pass directly or recover through an eligible semantic confirmation, with no pending, stopped, resource-failed, policy-failed, repository-failed, or mount-failed case.
- Attempt, evidence, release, website, resource, privacy, ordering, reuse, documentation, type, lint, format, build, and regression verification pass.
- An unchanged post-recording preflight reports complete exact-current reuse.
- Read-only review is ready; the signed and signed-off evidence commit is pushed explicitly.

### Review checkpoint

Inspect complete resolution, direct and recovered provenance, package and skill identity, confirmations, resource totals, ordering, passing-only promotion, and public clarity.

## Milestone 78: Add bounded qualification batching

### Objective

Give Custom and adapter qualification the same safe batching, checkpoint, resume, and consolidated-failure workflow before another qualification model call.

### Dependencies

- Milestone 77 is published with current passing semantic evidence.
- Active qualification evidence remains a clean protocol-10 not-recorded state.

### Scope and implementation

- Extend qualification command-line, CLI, execution, and diagnostic-batch modules with `--workers 1|2|4` and a `run-batch` command accepting exactly one of `--all`, `--targets`, or `--unresolved-from`.
- Run Custom cases concurrently only inside one attempt. Refuse every adapter profile until the exact passing Custom baseline exists, then coordinate profiles through isolated attempt directories, result roots, checkpoints, and token accounts.
- Serialize aggregate state, merge in declared order, stop dispatch and drain siblings on operational or capacity failure, and allow exact resume at another accepted worker count without duplicating a completed model stage.
- Apply the shared 4 GiB temporary-storage envelope and derive qualification token admission from measured qualification evidence rather than copying semantic candidate limits.
- Synchronize adapter-qualification documentation, command help, declarations, schemas, website not-recorded behavior, and release verification without adding a legacy reader or inherited-attempt language.

### Verification and acceptance criteria

- Parser, runner, executor, diagnostic, and integration tests cover selectors, conflicts, unknown targets, one-versus-four equivalence, Custom prerequisite races, deterministic order, failure continuation, stop-dispatch, disk and token boundaries, exact resume, cleanup, and result-root isolation.
- Model-free dry-run proves the complete Custom and 13-adapter schedule before paid work.
- Complete qualification and affected root/website suites, types, lint, format, builds, documentation, privacy, storage, and release-identity checks pass.
- No paid model call occurs in this milestone. Read-only review is ready; the signed and signed-off commit is pushed explicitly.

### Review checkpoint

Inspect command contracts, Custom-first enforcement, scheduler isolation, operational versus evidence identity, aggregate capacity, cleanup, public composition, and legacy absence.

## Milestone 79: Establish fresh Custom qualification evidence

### Objective

Close all 12 shared Custom journeys under the final protocol-10 xhigh contract.

### Dependencies

- Milestone 78 is published and model-free preflight passes.

### Scope and implementation

- Run one four-worker collect-first Custom attempt, completing every initial and only eligible semantic confirmations.
- Preserve every complete failed attempt, classify the full failure set once, and correct only proven shared causes through autonomous re-planning.
- Promote only a passing current attempt as the shared Custom baseline. Do not present it as inherited evidence.

### Verification and acceptance criteria

- All 12 journeys pass with exact policy, xhigh efforts, timeout, package, skill, evaluator, resource, repository, and provenance identity.
- Failed evidence remains failed, diagnostics never become release evidence, and terminal workspaces are cleaned safely.
- Qualification, website, release, privacy, storage, type, lint, format, build, documentation, and regression checks pass.
- Read-only review is ready; every cohesive correction or evidence commit is signed, signed off, and pushed.

### Review checkpoint

Inspect the complete Custom ledger, confirmation eligibility, resource and disk use, baseline identity, cleanup, public language, and stop-loss decisions.

## Milestone 80: Produce the complete adapter-specific ledger

### Objective

Run all 13 adapter profiles in bounded batches against the exact Custom baseline and collect every outcome before editing.

### Dependencies

- Milestone 79 is published with a current passing Custom attempt.
- `run-batch --all --workers 4` preflight binds every profile to that exact baseline.

### Scope and implementation

- Run adapter profiles in batches of at most four, retaining two direct adapter projects per profile and the shared 12-case Custom baseline.
- Continue across semantic failures while operationally safe, reduce worker count only through exact resume when needed, and preserve each complete attempt independently.
- Classify the complete cross-profile distribution before changing shared skill, adapter, evaluator, fixture, probe, resource, or package behavior.

### Verification and acceptance criteria

- All 13 profiles reach a complete current result, or one durable containment stop triggers autonomous re-planning.
- Every attempt verifies source, package and adapter versions, policy, xhigh effort, provenance, independent dimensions, resource containment, and privacy.
- Public composition remains 12 shared plus two direct journeys per adapter and 38 unique projects overall.
- Read-only review is ready; the unchanged complete ledger is signed, signed off, and pushed before correction.

### Review checkpoint

Inspect cross-profile failure patterns, Custom binding, isolation, concurrency, resource totals, direct-versus-shared provenance, and honest public counts.

## Milestone 81: Close adapter qualification evidence

### Objective

Correct the consolidated adapter failure set coherently and publish passing current evidence for all profiles.

### Dependencies

- Milestone 80 produced and published the complete classified ledger.

### Scope and implementation

- Make no behavior change when every profile passes. Otherwise revise the plan once from the complete distribution and keep each correction in its owning package, fixture, evaluator, profile, or documentation boundary.
- Run deterministic checks and focused canaries, then rerun only failed or exact-identity-invalidated profiles through `run-batch --unresolved-from`.
- Re-establish semantic or Custom evidence only when a real shared behavior identity change requires it.
- Retain no protocol-9, medium, all-high, inherited-history, dual-reader, or two-project-only compatibility surface.

### Verification and acceptance criteria

- Custom and all 13 adapters have valid current passing evidence under one exact generation.
- A repeated systemic failure returns through re-planning instead of another patch loop.
- Affected package, qualification, website, release, documentation, resource, privacy, type, lint, format, build, and regression checks pass.
- Read-only review is ready; every cohesive correction and evidence commit is signed, signed off, and pushed.

### Review checkpoint

Inspect correction ownership, invalidated identities, targeted rerun scope, baseline integrity, adapter confidence, and legacy absence.

## Milestone 82: Publish the clean skill 5.0 release

### Objective

Integrate and publish one clean 5.0 skill release against verified package versions and complete current evidence.

### Dependencies

- Semantic, Custom, and every adapter attempt are current, passing, and verified.
- Required package versions are registry-visible and release identity validates.

### Scope and implementation

- Select fresh evidence by default. Use the native evidence-pin path only when the developer explicitly names an eligible compatible source release and reason.
- Remove authorized active 4.0.x tags, hosted releases, pages, and release surfaces without adding compatibility readers, routes, fallbacks, or historical-current wording.
- Review each feature branch against freshly resolved `main`, integrate through signed repository workflows, and push explicit single-branch refs.
- Monitor release and website workflows and verify registry versions, tags, hosted releases, evidence routes, and downloadable skill identity.

### Verification and acceptance criteria

- Release verification proves package, CLI, portable skill, 74-case semantic, 12-case Custom, 13-adapter qualification, resource, and evidence-envelope identity.
- Active source, documentation, websites, tags, and hosted releases expose only the clean current contract; immutable registry history is described honestly.
- Current-main review, signed integration, publication workflows, registry checks, and host checks pass or remain explicit external prerequisites.

### Review checkpoint

Inspect release identity, package closure, evidence selection, clean-slate removal, target freshness, signed integration, workflow results, registry state, and hosted state.

## Milestone 83: Complete the cross-repository launch audit

### Objective

Prove that active specifications, packages, platform, skill, fixtures, websites, and knowledge-base content describe the same efficient launch contract.

### Dependencies

- Milestone 82 is complete or has only explicit external publication prerequisites.

### Scope and implementation

- Audit active content in this repository, `../packages`, `../platform`, `../knowledge-base`, and both GitHub fixture repositories while excluding protected instructions, hard-excluded archive and backup directories, and unrelated concurrent work.
- Remove contradictions involving lowercase `moldea`, repository-bound installation, clean package versions, flexible adapter ranges, activation abstention, bounded content-free inspection, lazy repository reading, PR Assurance completeness, resource containment, evidence pinning, 74-case semantics, xhigh roles, 15-minute stages, independent dimensions, shared 12-plus-2 qualification composition, bounded batches, and obsolete releases or compatibility surfaces.
- Run every affected repository's established documentation, link, manifest, test, type, lint, format, build, package, website, release, registry, workflow, and host checks.
- Review and publish only cohesive repository-owned changes to exact destinations while preserving unrelated concurrent work.

### Verification and acceptance criteria

- No active contradiction or unsupported launch claim remains across source, specifications, packages, public documentation, websites, knowledge base, fixtures, registry state, tags, or hosted releases.
- Public and private fixtures remain equivalent at every declared scenario tip, and repository reading and PR Assurance remain bounded and complete.
- Evidence is understandable to non-technical readers without exposing raw content or becoming a repository browser.
- External prerequisites remain explicit until directly proven.

### Review checkpoint

Inspect exact repository tips, public claims, protocol and policy terminology, evidence counts, link integrity, package and registry closure, fixture equivalence, resource-safety claims, legacy absence, and preservation of unrelated work.

## Execution scope

Preserve completed and published Milestones 1 through 75, failed official attempt `20260909T160245245Z-semantic-f4435831`, and the complete Milestone 76 nine-case classification. Complete the revised Milestone 76 by restoring explicit “Use moldea” consumption in the independent Agent Skill route, publishing its focused correction, and rerunning only `skill-maintain-linked-resources`. Then execute Milestones 77 through 83 sequentially: record one passing 74-case attempt; add bounded qualification batching; establish a passing 12-case Custom baseline; collect and close all 13 adapter profiles; publish clean skill 5.0; and complete the cross-repository launch audit. Every paid batch uses at most four isolated workers, deterministic aggregate writes, exact resume, global token and disk admission, content-free status, and stop-dispatch with sibling drain. A repeatable deterministic defect returns through the authorized revise-plan, challenge, and breakdown cycle before another correction. Preserve all safety, privacy, provenance, signing, review, branch, clean-slate, protected-instruction, hard-exclusion, and unrelated-concurrent-work constraints from the challenged plan.
